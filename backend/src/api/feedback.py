"""
Feedback API endpoints.

This module provides REST endpoints for submitting feedback (authenticated users)
and for listing/updating feedback and viewing stats (admin only).
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from src.middleware.clerk_auth import get_effective_user, require_admin_not_impersonating
from src.models.base import get_db
from src.models.user import User
from src.schemas.feedback import (
    FeedbackCreate,
    FeedbackListResponse,
    FeedbackResponse,
    FeedbackUpdate,
)
from src.services.platform.feedback_service import (
    create_feedback,
    get_feedback_stats,
    list_all_feedback,
    update_feedback,
)

router = APIRouter(prefix="/api", tags=["feedback"])


@router.post(
    "/feedback", response_model=FeedbackResponse, status_code=status.HTTP_201_CREATED
)
async def submit_feedback(
    data: FeedbackCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_effective_user),
):
    """
    Submit feedback (bug report, suggestion, or general). Authenticated users only.
    """
    # Optional: capture page URL from frontend or referer
    page_url = data.page_url
    if not page_url and request.headers.get("Referer"):
        page_url = request.headers.get("Referer", "")[:500]
    if page_url and len(page_url) > 500:
        page_url = page_url[:500]

    create_data = (
        data.model_copy(update={"page_url": page_url})
        if page_url != data.page_url
        else data
    )
    feedback = create_feedback(db, user.id, create_data)
    return FeedbackResponse.model_validate(feedback)


@router.get("/feedback", response_model=FeedbackListResponse)
async def list_feedback_admin(
    page: int = 1,
    page_size: int = 50,
    status: str | None = None,
    type: str | None = None,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin_not_impersonating),
):
    """
    List all feedback with pagination and filters. Admin only.
    """
    if page < 1:
        page = 1
    if page_size < 1 or page_size > 100:
        page_size = 50

    items, total = list_all_feedback(
        db,
        page=page,
        page_size=page_size,
        status_filter=status,
        type_filter=type,
    )
    feedback_responses = []
    for f in items:
        data = FeedbackResponse.model_validate(f)
        if getattr(f, "user", None) and f.user:
            data = data.model_copy(update={"submitter_email": f.user.email})
        feedback_responses.append(data)
    return FeedbackListResponse(
        feedbacks=feedback_responses,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.patch("/feedback/{feedback_id}", response_model=FeedbackResponse)
async def update_feedback_admin(
    feedback_id: str,
    data: FeedbackUpdate,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin_not_impersonating),
):
    """
    Update feedback status and/or admin notes. Admin only.
    """
    feedback = update_feedback(db, feedback_id, data)
    if not feedback:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feedback not found",
        )
    return FeedbackResponse.model_validate(feedback)


@router.get("/feedback/stats")
async def get_feedback_stats_admin(
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin_not_impersonating),
):
    """
    Get feedback statistics (counts by type and status). Admin only.
    """
    return get_feedback_stats(db)
