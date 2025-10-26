"""
Content enhancement endpoints.

This module provides endpoints for AI-powered content enhancement with
background processing support.
"""

import asyncio

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from src.config import APIConfig
from src.middleware.clerk_auth import get_effective_user
from src.models.base import get_db
from src.models.content_enhancement import ContentEnhancement
from src.models.user import User
from src.services.ai_service import is_ai_enabled
from src.services.job_description_service import get_cv_owned_by
from src.utils.rate_limit import create_combined_limiter

from .background_tasks import enhance_content_background
from .models import (
    ContentEnhancementCreateResponse,
    ContentEnhancementRequest,
    ContentEnhancementResponse,
    ContentSuggestion,
)

router = APIRouter(tags=["ai"])
limiter = create_combined_limiter()


@router.post(
    "/cvs/{cv_id}/enhance-content", response_model=ContentEnhancementCreateResponse
)
@limiter.limit(APIConfig.AI_REASONING_RATE_LIMIT)
async def enhance_content_endpoint(
    cv_id: str,
    request: ContentEnhancementRequest,
    request_obj: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user),
):
    """Enhance a piece of content with AI suggestions using background processing"""
    # Verify CV exists and belongs to user
    cv = get_cv_owned_by(db, cv_id, str(current_user.id))

    if not cv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")

    if not is_ai_enabled():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI features are disabled",
        )

    # Create ContentEnhancement record immediately with generation status
    enhancement = ContentEnhancement(
        user_id=str(current_user.id),
        cv_id=cv_id,
        original_content=request.original_content,
        content_type=request.content_type,
        is_generating=True,
        suggestions=None,
        overall_improvements=None,
        tokens_used=0,
        generation_time=0,
        model_used=None,
    )

    db.add(enhancement)
    db.commit()
    db.refresh(enhancement)

    # Start background enhancement task
    asyncio.create_task(
        enhance_content_background(
            str(enhancement.id),
            request.original_content,
            request.content_type,
            str(current_user.id),
            cv_id,
        )
    )

    # Add small delay to ensure DB commit
    await asyncio.sleep(0.1)

    return ContentEnhancementCreateResponse(
        enhancement_id=str(enhancement.id), is_generating=True
    )


@router.get(
    "/content-enhancements/{enhancement_id}/status",
    response_model=ContentEnhancementResponse,
)
async def get_content_enhancement_status(
    enhancement_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user),
):
    """Get the current status of a content enhancement task"""
    # Get enhancement and verify ownership
    enhancement = (
        db.query(ContentEnhancement)
        .filter(ContentEnhancement.id == enhancement_id)
        .first()
    )

    if not enhancement or enhancement.user_id != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Content enhancement not found"
        )

    # Convert suggestions to proper format if available
    suggestions = []
    if enhancement.suggestions:
        for suggestion in enhancement.suggestions:
            suggestions.append(
                ContentSuggestion(
                    content=suggestion.get("content", ""),
                    improvements=suggestion.get("improvements", []),
                    confidence_score=suggestion.get("confidence_score", 0),
                )
            )

    return ContentEnhancementResponse(
        suggestions=suggestions,
        overall_improvements=enhancement.overall_improvements or [],
        tokens_used=enhancement.tokens_used,
        generation_time=enhancement.generation_time,
        model_used=enhancement.model_used or "gpt-4o-mini",
        is_generating=enhancement.is_generating,
        generation_error=enhancement.generation_error,
    )


@router.delete("/content-enhancements/{enhancement_id}")
async def delete_content_enhancement(
    enhancement_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user),
):
    """Delete a content enhancement record"""
    # Get enhancement and verify ownership
    enhancement = (
        db.query(ContentEnhancement)
        .filter(ContentEnhancement.id == enhancement_id)
        .first()
    )

    if not enhancement or enhancement.user_id != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Content enhancement not found"
        )

    try:
        db.delete(enhancement)
        db.commit()
        return {"message": "Content enhancement deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting content enhancement: {str(e)}",
        )


__all__ = ["router"]
