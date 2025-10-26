"""
AI section generation endpoints.

This module provides endpoints for generating and retrieving AI-enhanced CV sections.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.config import AIConfig
from src.middleware.clerk_auth import get_effective_user
from src.models.ai_section import AISection
from src.models.base import get_db
from src.models.cv import CV
from src.models.user import User
from src.services.ai_service import generate_cv_section, is_ai_enabled
from src.services.job_description_service import (
    get_cv_owned_by,
    get_job_description_by_id,
)

from .models import AIGenerationRequest, AISectionListResponse, AISectionResponse

router = APIRouter(tags=["ai"])


@router.post("/cvs/{cv_id}/generate-section", response_model=AISectionResponse)
async def generate_ai_section(
    cv_id: str,
    request: AIGenerationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user),
):
    """Generate AI-enhanced section for CV based on job description"""
    # Verify CV exists and belongs to user
    cv = get_cv_owned_by(db, cv_id, str(current_user.id))

    if not cv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")

    # Verify job description exists (global lookup)
    job_description = get_job_description_by_id(
        db, request.job_description_id, str(current_user.id)
    )

    if not job_description:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Job description not found"
        )

    try:
        if not is_ai_enabled():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="AI features are disabled",
            )
        # Generate AI section
        ai_result = await generate_cv_section(
            cv_data=cv.parsed_data,
            job_description=job_description.content,
            section_type=request.section_type,
            user_id=current_user.id,
            cv_id=cv_id,
            db_session=db,
        )

        # Check if AI generation failed
        if ai_result.get("error"):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"AI service error: {ai_result['error']}",
            )

        # Save AI section to database
        ai_section = AISection(
            cv_id=cv_id,
            job_description_id=request.job_description_id,
            section_content=ai_result["section_content"],
            section_type=request.section_type,
            generation_prompt=f"Generate {request.section_type} section",
            ai_model=ai_result.get("model_used", AIConfig.OPENAI_MODEL),
            tokens_used=ai_result.get("tokens_used", 0),
            generation_time=ai_result.get("generation_time", 0),
        )

        db.add(ai_section)
        db.commit()
        db.refresh(ai_section)

        return AISectionResponse(
            id=str(ai_section.id),
            cv_id=str(ai_section.cv_id),
            job_description_id=str(ai_section.job_description_id),
            section_content=ai_section.section_content,
            section_type=ai_section.section_type,
            ai_model=ai_section.ai_model,
            tokens_used=ai_section.tokens_used or 0,
            generation_time=ai_section.generation_time or 0,
            created_at=ai_section.created_at.isoformat(),
            low_fit_warning=ai_result.get("low_fit_warning"),
        )

    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating AI section: {str(e)}",
        )


@router.get("/cvs/{cv_id}/ai-sections", response_model=AISectionListResponse)
async def get_ai_sections(
    cv_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user),
):
    """Get all AI-generated sections for a CV"""
    # Verify CV exists and belongs to user
    cv = db.query(CV).filter(CV.id == cv_id, CV.user_id == current_user.id).first()

    if not cv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")

    # Get AI sections
    ai_sections = (
        db.query(AISection)
        .filter(AISection.cv_id == cv_id, AISection.is_active == True)
        .all()
    )

    ai_responses = [
        AISectionResponse(
            id=str(ai.id),
            cv_id=str(ai.cv_id),
            job_description_id=str(ai.job_description_id),
            section_content=ai.section_content,
            section_type=ai.section_type,
            ai_model=ai.ai_model,
            tokens_used=ai.tokens_used or 0,
            generation_time=ai.generation_time or 0,
            created_at=ai.created_at.isoformat(),
        )
        for ai in ai_sections
    ]

    return AISectionListResponse(ai_sections=ai_responses)


__all__ = ["router"]
