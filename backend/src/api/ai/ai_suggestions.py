"""
AI suggestions and enhancement endpoints.

This module provides endpoints for generating AI suggestions and managing AI enhancements.
"""

from datetime import datetime, timezone
import asyncio
import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

from src.config import APIConfig, AIConfig
from src.middleware.clerk_auth import get_effective_user
from src.models.ai_enhancement import AIEnhancement
from src.models.base import get_db
from src.models.user import User
from src.services.cv_service import get_cv_by_id
from src.services.job_description_service import get_job_description_by_id
from src.utils.rate_limit import create_combined_limiter
from src.utils.task_logging import make_task_exception_logger

from .background_tasks import ai_suggestions_background
from .models import (
    AISuggestionAcceptRequest,
    AISuggestionCreate,
    AIEnhancementCreateResponse,
    AIEnhancementRequest,
    AIEnhancementResponse,
    AllSuggestionsResponse,
    GenerateSuggestionsRequest,
    ProfessionalSummarySuggestion,
    SkillSuggestion,
    SkillsSuggestions,
)

router = APIRouter(tags=["ai"])
limiter = create_combined_limiter()


@router.post("/ai-suggestions", response_model=dict)
async def create_ai_suggestion(
    suggestion: AISuggestionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user),
):
    """Create a new AI suggestion"""
    try:
        # Verify CV exists and belongs to user
        cv = get_cv_by_id(db, suggestion.cv_id, str(current_user.id))
        if not cv:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="CV not found"
            )

        # Create AI suggestion record
        from src.models.ai_suggestion import AISuggestion

        ai_suggestion = AISuggestion(
            cv_id=suggestion.cv_id,
            job_description_id=suggestion.job_description_id,
            original_content=suggestion.original_content,
            suggested_content=suggestion.suggested_content,
            content_type=suggestion.content_type,
            improvements=suggestion.improvements,
            confidence_score=suggestion.confidence_score,
            section_path=suggestion.section_path,
            ai_model=suggestion.ai_model,
            tokens_used=suggestion.tokens_used,
            generation_time=suggestion.generation_time,
            is_accepted=None,  # Initially not accepted
        )

        db.add(ai_suggestion)
        db.commit()
        db.refresh(ai_suggestion)

        return {
            "id": str(ai_suggestion.id),
            "message": "AI suggestion created successfully",
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating AI suggestion: {str(e)}",
        )


@router.patch("/ai-suggestions/{suggestion_id}/accept", response_model=dict)
async def accept_ai_suggestion(
    suggestion_id: str,
    request: AISuggestionAcceptRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user),
):
    """Accept or reject an AI suggestion"""
    try:
        from src.models.ai_suggestion import AISuggestion

        # Get the suggestion
        suggestion = (
            db.query(AISuggestion).filter(AISuggestion.id == suggestion_id).first()
        )
        if not suggestion:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="AI suggestion not found"
            )

        # Verify CV belongs to user
        cv = get_cv_by_id(db, suggestion.cv_id, str(current_user.id))
        if not cv:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="CV not found"
            )

        # Update suggestion status, matching model column type
        from sqlalchemy.sql.sqltypes import Boolean as SABoolean

        col = AISuggestion.__table__.columns.get("is_accepted")
        if col and isinstance(col.type, SABoolean):
            suggestion.is_accepted = bool(request.is_accepted)
        else:
            suggestion.is_accepted = "accepted" if request.is_accepted else "rejected"
        db.commit()

        return {
            "message": f"AI suggestion {'accepted' if request.is_accepted else 'rejected'} successfully"
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating AI suggestion: {str(e)}",
        )


@router.post("/cvs/{cv_id}/ai-suggestions", response_model=AIEnhancementCreateResponse)
@limiter.limit(APIConfig.AI_REASONING_RATE_LIMIT)
async def create_ai_suggestions(
    request: Request,
    cv_id: str,
    enhancement_request: AIEnhancementRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user),
):
    """
    Create a background task that generates AI suggestions including job fit
    analysis and optimization recommendations. Reuses AIEnhancement record for
    polling and embeds the created draft_id under enhancement_data.meta.draft_id.
    """
    # Verify CV exists and belongs to user
    cv = get_cv_by_id(db, cv_id, str(current_user.id))
    if not cv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")

    # Verify job description exists
    job_description = get_job_description_by_id(
        db, enhancement_request.job_description_id, str(current_user.id)
    )
    if not job_description:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Job description not found"
        )

    try:
        enhancement_id = str(uuid.uuid4())
        enhancement = AIEnhancement(
            id=enhancement_id,
            user_id=str(current_user.id),
            cv_id=cv_id,
            job_description_id=enhancement_request.job_description_id,
            is_generating=True,
            generation_error=None,
        )
        db.add(enhancement)
        db.commit()

        task = asyncio.create_task(
            ai_suggestions_background(
                enhancement_id,
                cv.parsed_data or {},
                job_description.content,
                str(current_user.id),
                cv_id,
                enhancement_request.job_description_id,
                job_description.company,
            )
        )
        task.add_done_callback(
            make_task_exception_logger(
                logger,
                "AI suggestions background task failed: enhancement_id=%s, error=%s",
                enhancement_id,
            )
        )

        return AIEnhancementCreateResponse(
            enhancement_id=enhancement_id, is_generating=True
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating AI suggestions: {str(e)}",
        )


@router.get(
    "/ai-enhancements/{enhancement_id}/status", response_model=AIEnhancementResponse
)
async def get_ai_enhancement_status(
    enhancement_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user),
):
    """Get the status of an AI enhancement task"""
    enhancement = (
        db.query(AIEnhancement)
        .filter(
            AIEnhancement.id == enhancement_id,
            AIEnhancement.user_id == str(current_user.id),
        )
        .first()
    )

    if not enhancement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="AI enhancement not found"
        )

    return AIEnhancementResponse(
        id=enhancement.id,
        cv_id=enhancement.cv_id,
        job_description_id=enhancement.job_description_id,
        enhancement_data=enhancement.enhancement_data,
        tokens_used=enhancement.tokens_used,
        generation_time=enhancement.generation_time,
        model_used=enhancement.model_used,
        is_generating=enhancement.is_generating,
        generation_error=enhancement.generation_error,
        created_at=enhancement.created_at.isoformat(),
    )


@router.get("/cvs/{cv_id}/ai-enhancements/latest")
async def get_latest_ai_enhancement(
    cv_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user),
):
    """Get the latest AI enhancement for a CV (returns null if none exists)"""
    # Verify CV belongs to user
    cv = get_cv_by_id(db, cv_id, str(current_user.id))
    if not cv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")

    # Get the most recent enhancement for this CV
    enhancement = (
        db.query(AIEnhancement)
        .filter(
            AIEnhancement.cv_id == cv_id, AIEnhancement.user_id == str(current_user.id)
        )
        .order_by(AIEnhancement.created_at.desc())
        .first()
    )

    # Return null instead of 404 when no enhancement exists (expected case)
    if not enhancement:
        return None

    return AIEnhancementResponse(
        id=enhancement.id,
        cv_id=enhancement.cv_id,
        job_description_id=enhancement.job_description_id,
        enhancement_data=enhancement.enhancement_data,
        tokens_used=enhancement.tokens_used,
        generation_time=enhancement.generation_time,
        model_used=enhancement.model_used,
        is_generating=enhancement.is_generating,
        generation_error=enhancement.generation_error,
        created_at=enhancement.created_at.isoformat(),
    )


@router.put("/ai-enhancements/{enhancement_id}")
async def update_ai_enhancement(
    enhancement_id: str,
    update_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user),
):
    """Update an AI enhancement record with new suggestion data"""
    # Get enhancement and verify ownership
    enhancement = (
        db.query(AIEnhancement)
        .filter(
            AIEnhancement.id == enhancement_id,
            AIEnhancement.user_id == str(current_user.id),
        )
        .first()
    )

    if not enhancement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="AI enhancement not found"
        )

    try:
        # Update enhancement_data field with new suggestions
        if "enhancement_data" in update_data:
            enhancement.enhancement_data = update_data["enhancement_data"]
            enhancement.updated_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(enhancement)

        return {"message": "AI enhancement updated successfully", "id": enhancement.id}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating AI enhancement: {str(e)}",
        )


@router.delete("/ai-enhancements/{enhancement_id}")
async def delete_ai_enhancement(
    enhancement_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user),
):
    """Delete an AI enhancement record"""
    # Get enhancement and verify ownership
    enhancement = (
        db.query(AIEnhancement)
        .filter(
            AIEnhancement.id == enhancement_id,
            AIEnhancement.user_id == str(current_user.id),
        )
        .first()
    )

    if not enhancement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="AI enhancement not found"
        )

    try:
        db.delete(enhancement)
        db.commit()
        return {"message": "AI enhancement deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting AI enhancement: {str(e)}",
        )


@router.delete("/cvs/{cv_id}/ai-enhancements/all")
async def delete_all_ai_enhancements_for_cv(
    cv_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user),
):
    """Delete all AI enhancement records for a CV"""
    # Verify CV belongs to user
    cv = get_cv_by_id(db, cv_id, str(current_user.id))
    if not cv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")

    try:
        # Get all enhancements for this CV that belong to the user
        enhancements = (
            db.query(AIEnhancement)
            .filter(
                AIEnhancement.cv_id == cv_id,
                AIEnhancement.user_id == str(current_user.id),
            )
            .all()
        )

        deleted_count = len(enhancements)

        if deleted_count > 0:
            for enhancement in enhancements:
                db.delete(enhancement)
            db.commit()
            logger.info(f"Deleted {deleted_count} AI enhancement(s) for CV {cv_id}")

        return {
            "message": f"Deleted {deleted_count} AI enhancement(s) successfully",
            "deleted_count": deleted_count,
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting AI enhancements for CV {cv_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting AI enhancements: {str(e)}",
        )


__all__ = ["router"]
