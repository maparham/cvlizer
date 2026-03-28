"""
User activity logging service for tracking user interactions and system events.

This module provides functions for logging user activities, errors, and system events
to enable effective problem recreation and debugging by administrators.
"""

import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from src.models.user import User
from src.models.user_activity import UserActivity, UserSession

logger = logging.getLogger(__name__)


def log_user_activity(
    db: Session,
    user: User,
    activity_type: str,
    action: str,
    description: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    page_url: Optional[str] = None,
    session_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> UserActivity:
    """
    Log a user activity to the activity trail.

    Args:
        db: Database session
        user: The user performing the action
        activity_type: Type of activity (e.g., 'page_view', 'api_call', 'error', 'user_action')
        action: The specific action (e.g., 'upload_cv', 'generate_ai_section')
        description: Human-readable description of the activity
        details: Additional context data as a dictionary
        page_url: URL of the page where the activity occurred
        session_id: Frontend session identifier
        ip_address: IP address of the user
        user_agent: User agent string of the user

    Returns:
        UserActivity: The created activity log entry
    """
    try:
        activity = UserActivity(
            user_id=user.id,
            activity_type=activity_type,
            action=action,
            description=description,
            details=details,
            page_url=page_url,
            session_id=session_id,
            ip_address=ip_address,
            user_agent=user_agent,
            timestamp=datetime.now(timezone.utc),
        )

        db.add(activity)
        db.commit()
        db.refresh(activity)

        return activity

    except Exception as e:
        logger.error(f"Failed to log user activity: {str(e)}")
        db.rollback()
        raise


def safe_log_user_activity(
    db: Session,
    user: User,
    activity_type: str,
    action: str,
    description: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    page_url: Optional[str] = None,
    session_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> None:
    """
    Best-effort user activity log: failures are logged and never propagated.
    """
    try:
        log_user_activity(
            db=db,
            user=user,
            activity_type=activity_type,
            action=action,
            description=description,
            details=details,
            page_url=page_url,
            session_id=session_id,
            ip_address=ip_address,
            user_agent=user_agent,
        )
    except Exception as e:
        logger.warning("Failed to log user activity (action=%s): %s", action, str(e))


def append_user_activity_for_commit(
    db: Session,
    user: User,
    activity_type: str,
    action: str,
    description: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    page_url: Optional[str] = None,
    session_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> UserActivity:
    """
    Queue a UserActivity row on the current session only.

    Use with other ORM changes (e.g. deletes) so one db.commit() persists both
    the data change and the audit row together.
    """
    activity = UserActivity(
        user_id=user.id,
        activity_type=activity_type,
        action=action,
        description=description,
        details=details,
        page_url=page_url,
        session_id=session_id,
        ip_address=ip_address,
        user_agent=user_agent,
        timestamp=datetime.now(timezone.utc),
    )
    db.add(activity)
    return activity


def log_user_error(
    db: Session,
    user: User,
    error_message: str,
    error_type: str,
    stack_trace: Optional[str] = None,
    page_url: Optional[str] = None,
    session_id: Optional[str] = None,
    additional_context: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> UserActivity:
    """
    Log a user error for debugging purposes.

    Args:
        db: Database session
        user: The user who encountered the error
        error_message: The error message
        error_type: Type/category of the error
        stack_trace: Stack trace if available
        page_url: URL where the error occurred
        session_id: Frontend session identifier
        additional_context: Additional context about the error
        ip_address: IP address of the user
        user_agent: User agent string of the user

    Returns:
        UserActivity: The created activity log entry
    """
    details = {
        "error_message": error_message,
        "error_type": error_type,
        "stack_trace": stack_trace,
        "context": additional_context or {},
    }

    return log_user_activity(
        db=db,
        user=user,
        activity_type="error",
        action=f"error_{error_type}",
        description=f"Error: {error_message}",
        details=details,
        page_url=page_url,
        session_id=session_id,
        ip_address=ip_address,
        user_agent=user_agent,
    )


def log_api_call(
    db: Session,
    user: User,
    endpoint: str,
    method: str,
    status_code: int,
    response_time_ms: Optional[int] = None,
    request_data: Optional[Dict[str, Any]] = None,
    response_data: Optional[Dict[str, Any]] = None,
    session_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> UserActivity:
    """
    Log an API call for monitoring and debugging.

    Args:
        db: Database session
        user: The user making the API call
        endpoint: API endpoint path
        method: HTTP method (GET, POST, etc.)
        status_code: HTTP status code
        response_time_ms: Response time in milliseconds
        request_data: Request data (sanitized)
        response_data: Response data (sanitized)
        session_id: Frontend session identifier
        ip_address: IP address of the user
        user_agent: User agent string of the user

    Returns:
        UserActivity: The created activity log entry
    """
    details = {
        "endpoint": endpoint,
        "method": method,
        "status_code": status_code,
        "response_time_ms": response_time_ms,
        "request_data": request_data,
        "response_data": response_data,
    }

    return log_user_activity(
        db=db,
        user=user,
        activity_type="api_call",
        action=f"{method.lower()}_{endpoint.replace('/', '_').strip('_')}",
        description=f"{method} {endpoint} - {status_code}",
        details=details,
        session_id=session_id,
        ip_address=ip_address,
        user_agent=user_agent,
    )


def safe_log_api_call(
    db: Session,
    user: User,
    endpoint: str,
    method: str,
    status_code: int,
    response_time_ms: Optional[int] = None,
    request_data: Optional[Dict[str, Any]] = None,
    response_data: Optional[Dict[str, Any]] = None,
    session_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> None:
    """Best-effort API call log; failures are logged and never propagated."""
    try:
        log_api_call(
            db=db,
            user=user,
            endpoint=endpoint,
            method=method,
            status_code=status_code,
            response_time_ms=response_time_ms,
            request_data=request_data,
            response_data=response_data,
            session_id=session_id,
            ip_address=ip_address,
            user_agent=user_agent,
        )
    except Exception as e:
        logger.warning("Failed to log API call (%s %s): %s", method, endpoint, str(e))


def create_user_session(
    db: Session,
    user: User,
    session_id: str,
    browser_info: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> UserSession:
    """
    Create a new user session for tracking.

    Args:
        db: Database session
        user: The user starting the session
        session_id: Unique session identifier
        browser_info: Browser and device information
        ip_address: IP address of the user
        user_agent: User agent string of the user

    Returns:
        UserSession: The created session
    """
    try:
        # End any existing active sessions for this user
        db.query(UserSession).filter(UserSession.user_id == user.id).filter(
            UserSession.is_active == "true"
        ).update({"is_active": "false", "ended_at": datetime.now(timezone.utc)})

        session = UserSession(
            user_id=user.id,
            session_id=session_id,
            browser_info=browser_info,
            ip_address=ip_address,
            user_agent=user_agent,
            started_at=datetime.now(timezone.utc),
        )

        db.add(session)
        db.commit()
        db.refresh(session)

        logger.info(f"User session created: {session_id} for user {user.id}")
        return session

    except Exception as e:
        logger.error(f"Failed to create user session: {str(e)}")
        db.rollback()
        raise


def end_user_session(db: Session, session_id: str) -> Optional[UserSession]:
    """
    End a user session.

    Args:
        db: Database session
        session_id: Session identifier to end

    Returns:
        UserSession: The ended session if found, None otherwise
    """
    try:
        session = (
            db.query(UserSession)
            .filter(UserSession.session_id == session_id)
            .filter(UserSession.is_active == "true")
            .first()
        )

        if session:
            session.is_active = "false"
            session.ended_at = datetime.now(timezone.utc)
            db.commit()
            db.refresh(session)

            logger.info(f"User session ended: {session_id}")
            return session

        return None

    except Exception as e:
        logger.error(f"Failed to end user session: {str(e)}")
        db.rollback()
        raise


def get_user_activities(
    db: Session,
    user_id: str,
    activity_type: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
) -> tuple[list[UserActivity], int]:
    """
    Get user activities with optional filtering.

    Args:
        db: Database session
        user_id: ID of the user
        activity_type: Filter by activity type
        limit: Maximum number of results
        offset: Number of results to skip

    Returns:
        tuple: (List of user activities, total count)
    """
    query = db.query(UserActivity).filter(UserActivity.user_id == user_id)

    if activity_type:
        query = query.filter(UserActivity.activity_type == activity_type)

    # Get total count
    total_count = query.count()

    # Get paginated results
    activities = (
        query.order_by(UserActivity.timestamp.desc()).offset(offset).limit(limit).all()
    )

    return activities, total_count


def get_user_recent_errors(
    db: Session, user_id: str, limit: int = 20
) -> list[UserActivity]:
    """
    Get recent errors for a user.

    Args:
        db: Database session
        user_id: ID of the user
        limit: Maximum number of results

    Returns:
        list[UserActivity]: List of recent error activities
    """
    return (
        db.query(UserActivity)
        .filter(UserActivity.user_id == user_id)
        .filter(UserActivity.activity_type == "error")
        .order_by(UserActivity.timestamp.desc())
        .limit(limit)
        .all()
    )


def cleanup_old_activities(db: Session, days_to_keep: int = 90) -> int:
    """
    Clean up old user activities to manage database size.

    Args:
        db: Database session
        days_to_keep: Number of days of activities to keep (default: 90)

    Returns:
        int: Number of activities deleted
    """
    try:
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days_to_keep)

        # Delete old activities
        deleted_count = (
            db.query(UserActivity).filter(UserActivity.timestamp < cutoff_date).delete()
        )

        # Delete old sessions
        session_deleted_count = (
            db.query(UserSession).filter(UserSession.started_at < cutoff_date).delete()
        )

        db.commit()

        logger.info(
            f"Cleaned up {deleted_count} old activities and {session_deleted_count} old sessions"
        )
        return deleted_count

    except Exception as e:
        logger.error(f"Failed to cleanup old activities: {str(e)}")
        db.rollback()
        raise


def clear_user_activities(db: Session, user_id: str) -> int:
    """
    Clear all activities and sessions for a specific user.

    Args:
        db: Database session
        user_id: ID of the user whose activities and sessions should be cleared

    Returns:
        int: Number of activities deleted
    """
    try:
        # Delete all activities for the user
        deleted_count = (
            db.query(UserActivity).filter(UserActivity.user_id == user_id).delete()
        )

        # Delete all sessions for the user
        sessions_deleted_count = (
            db.query(UserSession).filter(UserSession.user_id == user_id).delete()
        )

        db.commit()

        logger.info(
            f"Cleared {deleted_count} activities and {sessions_deleted_count} sessions for user {user_id}"
        )
        return deleted_count

    except Exception as e:
        logger.error(f"Failed to clear user activities: {str(e)}")
        db.rollback()
        raise


def get_activity_stats(db: Session) -> Dict[str, Any]:
    """
    Get statistics about user activities.

    Args:
        db: Database session

    Returns:
        dict: Activity statistics
    """
    try:
        total_activities = db.query(UserActivity).count()

        # Activities by type
        activity_types = (
            db.query(
                UserActivity.activity_type, db.func.count(UserActivity.id).label("count")
            )
            .group_by(UserActivity.activity_type)
            .all()
        )

        # Recent activity count (last 24 hours)
        recent_cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
        recent_activities = (
            db.query(UserActivity).filter(UserActivity.timestamp >= recent_cutoff).count()
        )

        return {
            "total_activities": total_activities,
            "recent_activities_24h": recent_activities,
            "activity_types": {at.activity_type: at.count for at in activity_types},
        }

    except Exception as e:
        logger.error(f"Failed to get activity stats: {str(e)}")
        return {"total_activities": 0, "recent_activities_24h": 0, "activity_types": {}}
