"""
AI draft management endpoints.

This module provides endpoints for managing AI-generated draft lifecycle including
status checking, listing, approval, and deletion.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from src.config import AIConfig
from src.middleware.clerk_auth import get_effective_user
from src.models.ai_draft import AIDraft
from src.models.base import get_db
from src.models.user import User
from src.schemas.cv_schemas import WhyGoodFitMetadataSchema, WhyGoodFitSchema
from src.services.job_description_service import get_cv_owned_by

from .models import (
    DraftApproveRequest,
    DraftListResponse,
    DraftResponse,
)

router = APIRouter(tags=["ai"])
logger = logging.getLogger(__name__)


@router.get("/drafts/{draft_id}/status", response_model=DraftResponse)
async def get_draft_status(
    draft_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user),
):
    """Get the current status of a draft generation task"""
    # Get draft and verify ownership through CV
    draft = db.query(AIDraft).filter(AIDraft.id == draft_id).first()

    if not draft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Draft not found"
        )

    # Verify CV belongs to user
    cv = get_cv_owned_by(db, draft.cv_id, str(current_user.id))
    if not cv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Draft not found"
        )

    return DraftResponse(
        id=str(draft.id),
        cv_id=str(draft.cv_id),
        job_description_id=str(draft.job_description_id),
        section_type=draft.section_type,
        draft_data=draft.draft_data,
        ai_model=draft.ai_model,
        tokens_used=draft.tokens_used or 0,
        generation_time=draft.generation_time or 0,
        created_at=draft.created_at.isoformat(),
        is_generating=draft.is_generating,
        generation_error=draft.generation_error,
    )


@router.get("/cvs/{cv_id}/drafts", response_model=DraftListResponse)
async def get_cv_drafts(
    cv_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user),
):
    """Get all drafts for a CV"""
    # Verify CV exists and belongs to user
    cv = get_cv_owned_by(db, cv_id, str(current_user.id))

    if not cv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")

    # Get drafts
    drafts = db.query(AIDraft).filter(AIDraft.cv_id == cv_id).all()

    draft_responses = [
        DraftResponse(
            id=str(draft.id),
            cv_id=str(draft.cv_id),
            job_description_id=str(draft.job_description_id),
            section_type=draft.section_type,
            draft_data=draft.draft_data,
            ai_model=draft.ai_model,
            tokens_used=draft.tokens_used or 0,
            generation_time=draft.generation_time or 0,
            created_at=draft.created_at.isoformat(),
            is_generating=draft.is_generating,
            generation_error=draft.generation_error,
        )
        for draft in drafts
    ]

    return DraftListResponse(drafts=draft_responses)


@router.post("/cvs/{cv_id}/why_good_fit/approve")
async def approve_why_good_fit_draft(
    cv_id: str,
    request: DraftApproveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user),
):
    """Approve a why_good_fit draft and move it to parsed_data"""
    # Verify CV exists and belongs to user
    cv = get_cv_owned_by(db, cv_id, str(current_user.id))

    if not cv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")

    # Find the draft
    draft = (
        db.query(AIDraft)
        .filter(
            AIDraft.id == request.draft_id,
            AIDraft.cv_id == cv_id,
            AIDraft.section_type == "why_good_fit",
        )
        .first()
    )

    if not draft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Draft not found"
        )

    try:
        # Update CV parsed_data with the draft content
        if not cv.parsed_data:
            cv.parsed_data = {}

        # Normalize draft data to WhyGoodFitSchema to avoid Pydantic extra/required errors
        raw = draft.draft_data or {}
        logger.info(
            f"approve_why_good_fit_draft: Processing draft {request.draft_id} with keys: {list(raw.keys())}"
        )

        # Build a compliant payload, mapping possible alternative keys
        content_value = (
            raw.get("content")
            or raw.get("fit_analysis")
            or raw.get("cleanedFitAnalysis")
            or raw.get("originalFitAnalysis")
            or ""
        )

        confidence_score = raw.get("confidence_score")
        generated_at = raw.get("generated_at") or (
            draft.updated_at.isoformat() if getattr(draft, "updated_at", None) else None
        )

        # Log presence of required fields before validation
        logger.info(
            f"approve_why_good_fit_draft: confidence_score={confidence_score}, generated_at={generated_at}"
        )

        # Validate confidence_score is present
        if confidence_score is None:
            logger.error(
                f"approve_why_good_fit_draft: confidence_score is missing in draft {request.draft_id}"
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Draft is missing required field: confidence_score. Please regenerate the draft.",
            )

        # Validate confidence_score is in valid range
        if not isinstance(confidence_score, int) or not (0 <= confidence_score <= 100):
            logger.error(
                f"approve_why_good_fit_draft: Invalid confidence_score={confidence_score} in draft {request.draft_id}"
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Draft has invalid confidence_score: {confidence_score}. Must be an integer between 0 and 100.",
            )

        # Get title from draft data
        draft_title = raw.get("title", "Hello!")
        logger.info(
            f"approve_why_good_fit_draft: Draft title from raw data: {draft_title}"
        )

        normalized = {
            "content": content_value,
            # confidence_score must be present; do not default here
            "confidence_score": confidence_score,
            "fit_analysis": content_value,
            "key_matches": raw.get("key_matches", []),
            "missing_skills": raw.get("missing_skills", []),
            "suggested_improvements": raw.get("suggested_improvements", []),
            "strengths": raw.get("strengths", []),
            "weaknesses": raw.get("weaknesses", []),
            "tokens_used": draft.tokens_used or raw.get("tokens_used", 0),
            "generation_time": draft.generation_time or raw.get("generation_time", 0),
            "model_used": draft.ai_model or raw.get("model_used", AIConfig.OPENAI_MODEL),
            "generated_at": generated_at,
            "job_description_id": (
                str(draft.job_description_id)
                if draft.job_description_id
                else raw.get("job_description_id")
            ),
            "title": draft_title,
        }
        # Validate and strip extras strictly via Pydantic
        try:
            validated = WhyGoodFitSchema(**normalized)
            compliant_data = validated.dict()
            logger.info(
                f"approve_why_good_fit_draft: Validation succeeded for draft {request.draft_id}, title={compliant_data.get('title')}"
            )
        except Exception as e:
            logger.error(
                f"approve_why_good_fit_draft: Validation failed for draft {request.draft_id}: {str(e)}"
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Draft data invalid for why_good_fit: {str(e)}",
            )

        # Build metadata (exclude content and title); validate for storage
        metadata_dict = {
            k: v for k, v in compliant_data.items() if k not in ("content", "title")
        }
        compliant_metadata = WhyGoodFitMetadataSchema(**metadata_dict).dict()

        section_title = compliant_data.get("title") or "Why I'm a Good Fit"
        compliant_content = (compliant_data.get("content") or "").strip()

        # Create a copy to ensure SQLAlchemy detects the change
        updated_parsed_data = dict(cv.parsed_data) if cv.parsed_data else {}

        # Upsert custom section: id "why_good_fit", type "cover_letter"
        if "custom_sections" not in updated_parsed_data:
            updated_parsed_data["custom_sections"] = []
        custom_list = list(updated_parsed_data["custom_sections"])
        found = next(
            (
                i
                for i, s in enumerate(custom_list)
                if isinstance(s, dict) and s.get("id") == "why_good_fit"
            ),
            None,
        )
        section_item = {
            "id": "why_good_fit",
            "type": "cover_letter",
            "title": section_title,
            "content": compliant_content,
        }
        if found is not None:
            custom_list[found] = section_item
        else:
            custom_list.append(section_item)
        updated_parsed_data["custom_sections"] = custom_list

        updated_parsed_data["why_good_fit_metadata"] = compliant_metadata

        # Section config: one entry id "why_good_fit", type "custom"
        if "section_config" not in updated_parsed_data:
            updated_parsed_data["section_config"] = {"sections": []}
        sections = [
            s
            for s in updated_parsed_data["section_config"]["sections"]
            if s.get("id") != "why_good_fit" and s.get("type") != "why_good_fit"
        ]
        need_shift = any(s.get("order") == 2 for s in sections)
        why_good_fit_section = {
            "id": "why_good_fit",
            "type": "custom",
            "title": section_title,
            "visible": True,
            "order": 2,
        }
        sections.append(why_good_fit_section)

        # Preserve existing section orders. Insert why_good_fit at 2; only shift others
        # when slot 2 is occupied (first-time add). Never overwrite with fixed order map.
        max_order = max((s.get("order") or 0 for s in sections), default=1)
        next_custom_order = max(max_order + 1, 12)
        for section in sections:
            sid = section.get("id")
            stype = section.get("type")
            if sid == "why_good_fit" and stype == "custom":
                section["order"] = 2
            elif sid == "personal_info" or stype == "personal_info":
                section["order"] = 1
            elif need_shift and (section.get("order") or 0) >= 2:
                section["order"] = (section.get("order") or 0) + 1
            elif stype == "custom" and (
                "order" not in section or section["order"] is None
            ):
                section["order"] = next_custom_order
                next_custom_order += 1
        sections.sort(key=lambda x: x.get("order", 999))
        updated_parsed_data["section_config"]["sections"] = sections

        cv.parsed_data = updated_parsed_data

        # Explicitly mark the field as modified for SQLAlchemy
        flag_modified(cv, "parsed_data")

        # Update CV and delete draft in the same transaction
        db.delete(draft)
        db.commit()
        db.refresh(cv)

        response_data = {
            "message": "Draft approved and committed successfully",
            "cv": cv.to_response_dict(),
        }
        return response_data

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error approving draft: {str(e)}",
        )


@router.delete("/cvs/{cv_id}/why_good_fit/draft")
async def delete_why_good_fit_draft(
    cv_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user),
):
    """Delete the why_good_fit draft for a CV"""
    # Verify CV exists and belongs to user
    cv = get_cv_owned_by(db, cv_id, str(current_user.id))

    if not cv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")

    # Find the draft
    draft = (
        db.query(AIDraft)
        .filter(AIDraft.cv_id == cv_id, AIDraft.section_type == "why_good_fit")
        .first()
    )

    if not draft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="No draft found for this CV"
        )

    try:
        # Delete the draft
        db.delete(draft)
        db.commit()

        return {"message": "Draft deleted successfully"}

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting draft: {str(e)}",
        )


__all__ = ["router"]
