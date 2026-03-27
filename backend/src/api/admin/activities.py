"""
User activity logging API endpoints for admin operations.

This module provides administrative endpoints for viewing and managing
user activity logs and error logs for debugging and support purposes.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from src.middleware.clerk_auth import require_admin_not_impersonating
from src.models.base import get_db
from src.models.user import User
from src.services.users.user_activity_service import (
    clear_user_activities,
    get_user_activities,
    get_user_recent_errors,
)

logger = logging.getLogger(__name__)
router = APIRouter(tags=["admin"])


@router.get("/users/{user_id}/activities")
async def get_user_activities_admin(
    user_id: str,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    activity_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin_not_impersonating),
):
    """
    Get user activities for admin debugging and support.
    """
    try:
        # Verify user exists
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
            )

        # Get activities using the service
        activities, total_count = get_user_activities(
            db=db,
            user_id=user_id,
            activity_type=activity_type,
            limit=limit,
            offset=offset,
        )

        # Convert to response format
        activities_data = []
        for activity in activities:
            activities_data.append(
                {
                    "id": activity.id,
                    "activity_type": activity.activity_type,
                    "action": activity.action,
                    "description": activity.description,
                    "details": activity.details,
                    "page_url": activity.page_url,
                    "ip_address": activity.ip_address,
                    "user_agent": activity.user_agent,
                    "session_id": activity.session_id,
                    "timestamp": activity.timestamp.isoformat(),
                }
            )

        return {
            "activities": activities_data,
            "total": total_count,
            "limit": limit,
            "offset": offset,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user activities: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving user activities",
        )


@router.get("/users/{user_id}/errors")
async def get_user_errors_admin(
    user_id: str,
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin_not_impersonating),
):
    """
    Get user errors for admin debugging and support.
    """
    try:
        # Verify user exists
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
            )

        # Get recent errors using the service
        errors = get_user_recent_errors(db=db, user_id=user_id, limit=limit)

        # Convert to response format
        errors_data = []
        for error in errors:
            errors_data.append(
                {
                    "id": error.id,
                    "action": error.action,
                    "description": error.description,
                    "details": error.details,
                    "page_url": error.page_url,
                    "ip_address": error.ip_address,
                    "user_agent": error.user_agent,
                    "session_id": error.session_id,
                    "timestamp": error.timestamp.isoformat(),
                }
            )

        return {"errors": errors_data, "total": len(errors_data)}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user errors: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving user errors",
        )


@router.delete("/users/{user_id}/activities")
async def clear_user_activities_admin(
    user_id: str,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin_not_impersonating),
):
    """
    Clear all activities for a specific user.
    """
    try:
        # Verify user exists
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
            )

        # Clear activities using the service
        deleted_count = clear_user_activities(db=db, user_id=user_id)

        return {
            "message": f"Successfully cleared {deleted_count} activities for user {user.email}",
            "user_id": user_id,
            "deleted_count": deleted_count,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error clearing user activities: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error clearing user activities",
        )
