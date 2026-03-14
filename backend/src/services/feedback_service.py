"""
Feedback service for creating, listing, and updating user feedback.

This module provides business logic for the feedback feature: create feedback
entries, list with pagination and filters (admin), update status and admin notes,
and compute statistics.
"""

from typing import List, Optional, Tuple

from sqlalchemy import desc, func
from sqlalchemy.orm import Session, joinedload

from src.models.feedback import Feedback
from src.schemas.feedback import FeedbackCreate, FeedbackUpdate


def create_feedback(db: Session, user_id: str, data: FeedbackCreate) -> Feedback:
    """
    Create a new feedback entry for the given user.

    Args:
        db: Database session
        user_id: Authenticated user ID
        data: Validated feedback payload

    Returns:
        Created Feedback instance
    """
    feedback = Feedback(
        user_id=user_id,
        type=data.type,
        title=data.title.strip()[:200],
        body=data.body.strip(),
        page_url=data.page_url[:500] if data.page_url else None,
        context=data.context,
        status="open",
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return feedback


def list_all_feedback(
    db: Session,
    page: int = 1,
    page_size: int = 50,
    status_filter: Optional[str] = None,
    type_filter: Optional[str] = None,
) -> Tuple[List[Feedback], int]:
    """
    List all feedback with pagination and optional filters (admin only).

    Args:
        db: Database session
        page: 1-based page number
        page_size: Number of items per page
        status_filter: Filter by status (open, in_progress, resolved, closed)
        type_filter: Filter by type (bug, suggestion, general)

    Returns:
        Tuple of (list of Feedback, total count)
    """
    query = db.query(Feedback).options(joinedload(Feedback.user))
    if status_filter:
        query = query.filter(Feedback.status == status_filter)
    if type_filter:
        query = query.filter(Feedback.type == type_filter)

    total = query.count()
    offset = (page - 1) * page_size
    items = (
        query.order_by(desc(Feedback.created_at)).offset(offset).limit(page_size).all()
    )
    return items, total


def update_feedback(
    db: Session, feedback_id: str, data: FeedbackUpdate
) -> Optional[Feedback]:
    """
    Update feedback status and/or admin notes (admin only).

    Args:
        db: Database session
        feedback_id: Feedback UUID
        data: Fields to update

    Returns:
        Updated Feedback or None if not found
    """
    feedback = db.query(Feedback).filter(Feedback.id == feedback_id).first()
    if not feedback:
        return None
    if data.status is not None:
        feedback.status = data.status
    if data.admin_notes is not None:
        feedback.admin_notes = data.admin_notes
    db.commit()
    db.refresh(feedback)
    return feedback


def get_feedback_stats(db: Session) -> dict:
    """
    Get feedback statistics: counts by type and by status (admin only).

    Args:
        db: Database session

    Returns:
        Dict with keys by_type (dict), by_status (dict), total (int)
    """
    total = db.query(Feedback).count()

    type_counts = (
        db.query(Feedback.type, func.count(Feedback.id)).group_by(Feedback.type).all()
    )
    by_type = {t: c for t, c in type_counts}

    status_counts = (
        db.query(Feedback.status, func.count(Feedback.id)).group_by(Feedback.status).all()
    )
    by_status = {s: c for s, c in status_counts}

    return {"by_type": by_type, "by_status": by_status, "total": total}
