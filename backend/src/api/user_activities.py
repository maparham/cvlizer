"""
User activity logging API endpoints.

This module provides endpoints for logging user activities and retrieving
activity logs for admin debugging and support purposes.
"""

import logging
import os
import time
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from src.middleware.clerk_auth import get_current_user
from src.models.base import get_db
from src.models.user import User
from src.services.users.user_activity_service import (
    create_user_session,
    end_user_session,
    log_api_call,
    log_user_activity,
    log_user_error,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/user-activities", tags=["user-activities"])


class ActivityLogRequest(BaseModel):
    activityType: str
    action: str
    description: str = None
    details: Dict[str, Any] = None
    pageUrl: str = None
    sessionId: str = None

    class Config:
        populate_by_name = True


class ErrorLogRequest(BaseModel):
    error_message: str
    error_type: str
    stack_trace: str = None
    page_url: str = None
    session_id: str = None
    additional_context: Dict[str, Any] = None


class BatchActivityRequest(BaseModel):
    activities: List[ActivityLogRequest]


class SessionCreateRequest(BaseModel):
    session_id: str
    browser_info: Dict[str, Any] = None


@router.post("/batch")
async def log_batch_activities(
    request: BatchActivityRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Log multiple user activities in batch.
    """
    started_at = time.perf_counter()
    db_debug_enabled = str(os.getenv("DB_TIMING_DEBUG", "false")).lower() in {
        "1",
        "true",
        "yes",
        "on",
    }
    try:
        logged_activities = []

        for activity_data in request.activities:
            activity_started = time.perf_counter()
            activity = log_user_activity(
                db=db,
                user=current_user,
                activity_type=activity_data.activityType,
                action=activity_data.action,
                description=activity_data.description,
                details=activity_data.details,
                page_url=activity_data.pageUrl,
                session_id=activity_data.sessionId,
            )
            logged_activities.append(
                {
                    "id": activity.id,
                    "action": activity.action,
                    "timestamp": activity.timestamp.isoformat(),
                }
            )
            if db_debug_enabled:
                logger.info(
                    "user_activities.batch item timing user_id=%s action=%s elapsed_ms=%.1f",
                    current_user.id,
                    activity_data.action,
                    (time.perf_counter() - activity_started) * 1000.0,
                )

        if db_debug_enabled:
            logger.info(
                "user_activities.batch total timing user_id=%s count=%s total_ms=%.1f",
                current_user.id,
                len(request.activities),
                (time.perf_counter() - started_at) * 1000.0,
            )

        return {
            "message": f"Successfully logged {len(logged_activities)} activities",
            "logged_activities": logged_activities,
        }

    except Exception as e:
        logger.error(f"Error logging batch activities: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error logging activities",
        )


@router.post("/error")
async def log_user_error_endpoint(
    request: ErrorLogRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Log a user error.
    """
    try:
        activity = log_user_error(
            db=db,
            user=current_user,
            error_message=request.error_message,
            error_type=request.error_type,
            stack_trace=request.stack_trace,
            page_url=request.page_url,
            session_id=request.session_id,
            additional_context=request.additional_context,
        )

        logger.info(f"Logged error for user {current_user.email}: {request.error_type}")

        return {
            "message": "Error logged successfully",
            "activity_id": activity.id,
            "timestamp": activity.timestamp.isoformat(),
        }

    except Exception as e:
        logger.error(f"Error logging user error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error logging error",
        )


@router.post("/session")
async def create_session(
    request: SessionCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new user session.
    """
    try:
        session = create_user_session(
            db=db,
            user=current_user,
            session_id=request.session_id,
            browser_info=request.browser_info,
        )

        logger.info(
            f"Created session for user {current_user.email}: {request.session_id}"
        )

        return {
            "message": "Session created successfully",
            "session_id": session.session_id,
            "started_at": session.started_at.isoformat(),
        }

    except Exception as e:
        logger.error(f"Error creating session: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error creating session",
        )


@router.post("/session/{session_id}/end")
async def end_session(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    End a user session.
    """
    try:
        session = end_user_session(db=db, session_id=session_id)

        if session:
            logger.info(f"Ended session for user {current_user.email}: {session_id}")
            return {
                "message": "Session ended successfully",
                "session_id": session_id,
                "ended_at": session.ended_at.isoformat(),
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Session not found"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error ending session: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error ending session",
        )
