"""
Admin management API endpoints.

This module provides administrative endpoints for user management,
system statistics, and dashboard functionality.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timedelta
import asyncio
import logging
import os
from dotenv import load_dotenv
from slowapi import Limiter
from slowapi.util import get_remote_address

load_dotenv()

# Configure rate limiter for admin endpoints
limiter = Limiter(key_func=get_remote_address)

from src.models.base import get_db
from src.models.user import User
from src.models.cv import CV
from src.models.ai_section import AISection
from src.models.job_description import JobDescription
from src.models.user_activity import UserActivity
from src.middleware.clerk_auth import get_current_user, require_admin_not_impersonating
from src.services.user_activity_service import (
    get_user_activities,
    get_user_recent_errors,
    clear_user_activities,
)
from src.schemas.diagnostic_schemas import (
    OpenAIDiagnosticRequest,
    OpenAIDiagnosticResponse,
    OpenAIConfigResponse,
    DiagnosticMetrics,
    DiagnosticRequestDetails,
)
from src.config import AIConfig, OpenAIPricing
import openai as openai_module
import time

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["admin"])

# OpenAI Diagnostic endpoints added - v1.0


# Response Models
class UserSummary(BaseModel):
    id: str
    clerk_id: Optional[str]
    email: str
    is_active: bool
    email_verified: bool
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime]
    cv_count: int
    ai_sections_count: int
    is_clerk_user: bool

    class Config:
        from_attributes = True


class SystemStats(BaseModel):
    total_users: int
    active_users: int
    clerk_users: int
    legacy_users: int
    total_cvs: int
    total_ai_sections: int
    total_job_descriptions: int
    users_last_7_days: int
    users_last_30_days: int
    cvs_last_7_days: int
    cvs_last_30_days: int


class UserDetail(BaseModel):
    id: str
    clerk_id: Optional[str]
    email: str
    is_active: bool
    email_verified: bool
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime]
    cvs: List[dict]
    ai_sections: List[dict]
    ai_sections_count: int
    job_descriptions_count: int

    class Config:
        from_attributes = True


class DashboardData(BaseModel):
    stats: SystemStats
    recent_users: List[UserSummary]
    top_users_by_cvs: List[UserSummary]


# Import admin check from middleware
from src.middleware.clerk_auth import is_admin_user


def require_admin(current_user: User = Depends(get_current_user)):
    """Dependency to require admin access (allows during impersonation)"""
    if not is_admin_user(current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required"
        )
    return current_user


@router.get("/check-access")
async def check_admin_access(admin_user: User = Depends(require_admin_not_impersonating)):
    """
    Check if the current user has admin access.
    Returns 200 for admin users, 403 for non-admin users.
    """
    return {
        "message": "Admin access confirmed",
        "user_id": admin_user.id,
        "email": admin_user.email,
        "is_admin": True,
    }


@router.get("/dashboard", response_model=DashboardData)
async def get_dashboard_data(
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin_not_impersonating),
):
    """
    Get comprehensive dashboard data including stats and recent activity.
    """
    try:
        # Calculate date ranges
        now = datetime.utcnow()
        seven_days_ago = now - timedelta(days=7)
        thirty_days_ago = now - timedelta(days=30)

        # Basic counts
        total_users = db.query(User).count()
        active_users = db.query(User).filter(User.is_active == True).count()
        clerk_users = db.query(User).filter(User.clerk_id.isnot(None)).count()
        legacy_users = db.query(User).filter(User.clerk_id.is_(None)).count()

        total_cvs = db.query(CV).count()
        total_ai_sections = db.query(AISection).count()
        total_job_descriptions = db.query(JobDescription).count()

        # Recent activity counts
        users_last_7_days = (
            db.query(User).filter(User.created_at >= seven_days_ago).count()
        )
        users_last_30_days = (
            db.query(User).filter(User.created_at >= thirty_days_ago).count()
        )
        cvs_last_7_days = db.query(CV).filter(CV.created_at >= seven_days_ago).count()
        cvs_last_30_days = db.query(CV).filter(CV.created_at >= thirty_days_ago).count()

        # System stats
        stats = SystemStats(
            total_users=total_users,
            active_users=active_users,
            clerk_users=clerk_users,
            legacy_users=legacy_users,
            total_cvs=total_cvs,
            total_ai_sections=total_ai_sections,
            total_job_descriptions=total_job_descriptions,
            users_last_7_days=users_last_7_days,
            users_last_30_days=users_last_30_days,
            cvs_last_7_days=cvs_last_7_days,
            cvs_last_30_days=cvs_last_30_days,
        )

        # Recent users (last 10) - simplified query
        recent_users_data = db.query(User).order_by(desc(User.created_at)).limit(10).all()

        recent_users = []
        for user in recent_users_data:
            cv_count = db.query(CV).filter(CV.user_id == user.id).count()
            ai_count = db.query(AISection).join(CV).filter(CV.user_id == user.id).count()

            recent_users.append(
                UserSummary(
                    id=user.id,
                    clerk_id=user.clerk_id,
                    email=user.email,
                    is_active=user.is_active,
                    email_verified=user.email_verified,
                    created_at=user.created_at,
                    updated_at=user.updated_at,
                    last_login=user.last_login,
                    cv_count=cv_count,
                    ai_sections_count=ai_count,
                    is_clerk_user=user.clerk_id is not None,
                )
            )

        # Top users by CV count - simplified approach
        all_users = db.query(User).all()
        users_with_cvs = []

        for user in all_users:
            cv_count = db.query(CV).filter(CV.user_id == user.id).count()
            if cv_count > 0:  # Only include users with CVs
                ai_count = (
                    db.query(AISection).join(CV).filter(CV.user_id == user.id).count()
                )
                users_with_cvs.append((user, cv_count, ai_count))

        # Sort by CV count and take top 10
        users_with_cvs.sort(key=lambda x: x[1], reverse=True)
        top_users_by_cvs = []

        for user, cv_count, ai_count in users_with_cvs[:10]:
            top_users_by_cvs.append(
                UserSummary(
                    id=user.id,
                    clerk_id=user.clerk_id,
                    email=user.email,
                    is_active=user.is_active,
                    email_verified=user.email_verified,
                    created_at=user.created_at,
                    updated_at=user.updated_at,
                    last_login=user.last_login,
                    cv_count=cv_count,
                    ai_sections_count=ai_count,
                    is_clerk_user=user.clerk_id is not None,
                )
            )

        return DashboardData(
            stats=stats, recent_users=recent_users, top_users_by_cvs=top_users_by_cvs
        )

    except Exception as e:
        logger.error(f"Error getting dashboard data: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving dashboard data",
        )


@router.get("/users", response_model=List[UserSummary])
async def get_all_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    search: Optional[str] = Query(None),
    clerk_only: Optional[bool] = Query(None),
    active_only: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin_not_impersonating),
):
    """
    Get all users with optional filtering and pagination.
    """
    try:
        # Get all users first
        query = db.query(User)

        # Apply filters
        if search:
            query = query.filter(User.email.contains(search))

        if clerk_only is not None:
            if clerk_only:
                query = query.filter(User.clerk_id.isnot(None))
            else:
                query = query.filter(User.clerk_id.is_(None))

        if active_only is not None:
            query = query.filter(User.is_active == active_only)

        # Apply pagination and ordering
        users_data = query.order_by(desc(User.created_at)).offset(skip).limit(limit).all()

        users = []
        for user in users_data:
            # Count CVs and AI sections separately for each user
            cv_count = db.query(CV).filter(CV.user_id == user.id).count()
            ai_count = db.query(AISection).join(CV).filter(CV.user_id == user.id).count()

            users.append(
                UserSummary(
                    id=user.id,
                    clerk_id=user.clerk_id,
                    email=user.email,
                    is_active=user.is_active,
                    email_verified=user.email_verified,
                    created_at=user.created_at,
                    updated_at=user.updated_at,
                    last_login=user.last_login,
                    cv_count=cv_count,
                    ai_sections_count=ai_count,
                    is_clerk_user=user.clerk_id is not None,
                )
            )

        return users

    except Exception as e:
        logger.error(f"Error getting users: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving users: {str(e)}",
        )


@router.get("/users/{user_id}", response_model=UserDetail)
async def get_user_detail(
    user_id: str,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin_not_impersonating),
):
    """
    Get detailed information about a specific user.
    """
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
            )

        # Get user's CVs with basic info
        cvs = db.query(CV).filter(CV.user_id == user_id).all()
        cvs_data = []
        for cv in cvs:
            cvs_data.append(
                {
                    "id": cv.id,
                    "original_filename": cv.original_filename,
                    "file_size": cv.file_size,
                    "file_type": cv.file_type,
                    "is_parsed": cv.is_parsed,
                    "created_at": cv.created_at.isoformat(),
                    "updated_at": cv.updated_at.isoformat(),
                }
            )

        # Get AI sections for this user
        ai_sections = db.query(AISection).join(CV).filter(CV.user_id == user_id).all()
        ai_sections_data = []
        for section in ai_sections:
            ai_sections_data.append(
                {
                    "id": section.id,
                    "section_type": section.section_type,
                    "section_content": section.section_content,
                    "created_at": section.created_at.isoformat(),
                    "updated_at": section.updated_at.isoformat(),
                }
            )

        # Count job descriptions
        job_descriptions_count = (
            db.query(JobDescription).join(CV).filter(CV.user_id == user_id).count()
        )

        return UserDetail(
            id=user.id,
            clerk_id=user.clerk_id,
            email=user.email,
            is_active=user.is_active,
            email_verified=user.email_verified,
            created_at=user.created_at,
            updated_at=user.updated_at,
            last_login=user.last_login,
            cvs=cvs_data,
            ai_sections=ai_sections_data,
            ai_sections_count=len(ai_sections_data),
            job_descriptions_count=job_descriptions_count,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user detail: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving user details",
        )


@router.put("/users/{user_id}/toggle-active")
async def toggle_user_active(
    user_id: str,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin_not_impersonating),
):
    """
    Toggle a user's active status.
    """
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
            )

        # Don't allow deactivating admin users
        if is_admin_user(user) and user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot deactivate admin users",
            )

        user.is_active = not user.is_active
        user.updated_at = datetime.utcnow()
        db.commit()

        return {
            "message": f"User {'activated' if user.is_active else 'deactivated'} successfully",
            "user_id": user_id,
            "is_active": user.is_active,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error toggling user active status: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating user status",
        )


@router.get("/users/{user_id}/cvs")
async def get_user_cvs(
    user_id: str,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin_not_impersonating),
):
    """
    Get all CVs for a specific user.
    """
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
            )

        cvs = (
            db.query(CV)
            .filter(CV.user_id == user_id)
            .order_by(CV.created_at.desc())
            .all()
        )

        cvs_data = []
        for cv in cvs:
            # Get AI sections count for this CV
            ai_sections_count = (
                db.query(AISection).filter(AISection.cv_id == cv.id).count()
            )
            job_descriptions_count = (
                db.query(JobDescription).filter(JobDescription.cv_id == cv.id).count()
            )

            cvs_data.append(
                {
                    "id": cv.id,
                    "original_filename": cv.original_filename,
                    "file_size": cv.file_size,
                    "file_type": cv.file_type,
                    "is_parsed": cv.is_parsed,
                    "parsing_status": getattr(cv, "parsing_status", "unknown"),
                    "ai_sections_count": ai_sections_count,
                    "job_descriptions_count": job_descriptions_count,
                    "created_at": cv.created_at.isoformat(),
                    "updated_at": cv.updated_at.isoformat(),
                }
            )

        return {
            "user_id": user_id,
            "user_email": user.email,
            "cvs": cvs_data,
            "total_cvs": len(cvs_data),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user CVs: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving user CVs",
        )


@router.get("/stats", response_model=SystemStats)
async def get_system_stats(
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin_not_impersonating),
):
    """
    Get system statistics.
    """
    try:
        now = datetime.utcnow()
        seven_days_ago = now - timedelta(days=7)
        thirty_days_ago = now - timedelta(days=30)

        stats = SystemStats(
            total_users=db.query(User).count(),
            active_users=db.query(User).filter(User.is_active == True).count(),
            clerk_users=db.query(User).filter(User.clerk_id.isnot(None)).count(),
            legacy_users=db.query(User).filter(User.clerk_id.is_(None)).count(),
            total_cvs=db.query(CV).count(),
            total_ai_sections=db.query(AISection).count(),
            total_job_descriptions=db.query(JobDescription).count(),
            users_last_7_days=db.query(User)
            .filter(User.created_at >= seven_days_ago)
            .count(),
            users_last_30_days=db.query(User)
            .filter(User.created_at >= thirty_days_ago)
            .count(),
            cvs_last_7_days=db.query(CV).filter(CV.created_at >= seven_days_ago).count(),
            cvs_last_30_days=db.query(CV)
            .filter(CV.created_at >= thirty_days_ago)
            .count(),
        )

        return stats

    except Exception as e:
        logger.error(f"Error getting system stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving system statistics",
        )


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


# Job Description Cleanup Endpoints
class JobDescriptionCleanupStats(BaseModel):
    """Statistics about stuck job descriptions"""

    total_parsing: int
    active_parsing: int
    stuck_parsing: int
    stuck_job_descriptions: List[dict]


class JobDescriptionCleanupResult(BaseModel):
    """Result of cleanup operation"""

    found_count: int
    fixed_count: int
    message: str


@router.get("/job-descriptions/stuck", response_model=JobDescriptionCleanupStats)
async def get_stuck_job_descriptions_stats(
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin_not_impersonating),
):
    """Get statistics about stuck job descriptions"""
    from src.services.job_description_cleanup_service import get_parsing_statistics

    try:
        stats = get_parsing_statistics(db)
        return JobDescriptionCleanupStats(**stats)
    except Exception as e:
        logger.error(f"Error getting job description statistics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error getting job description statistics",
        )


@router.post("/job-descriptions/cleanup", response_model=JobDescriptionCleanupResult)
async def cleanup_stuck_job_descriptions(
    timeout_minutes: int = Query(
        10, ge=1, le=60, description="Minutes after which parsing is considered stuck"
    ),
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin_not_impersonating),
):
    """
    Find and fix all stuck job descriptions.

    This endpoint identifies job descriptions that have been in is_parsing=True
    state for longer than the specified timeout and sets them to failed status.
    """
    from src.services.job_description_cleanup_service import (
        cleanup_stuck_job_descriptions,
    )

    try:
        found_count, fixed_count = cleanup_stuck_job_descriptions(db, timeout_minutes)

        if found_count == 0:
            message = "No stuck job descriptions found"
        else:
            message = f"Fixed {fixed_count} out of {found_count} stuck job description(s)"

        return JobDescriptionCleanupResult(
            found_count=found_count, fixed_count=fixed_count, message=message
        )
    except Exception as e:
        logger.error(f"Error cleaning up stuck job descriptions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error cleaning up stuck job descriptions",
        )


# OpenAI Diagnostic Endpoints
@router.get("/openai/config", response_model=OpenAIConfigResponse)
async def get_openai_config(admin_user: User = Depends(require_admin_not_impersonating)):
    """
    Get current OpenAI configuration for diagnostic purposes.
    """
    try:
        # Check if API key is configured
        api_key = AIConfig.OPENAI_API_KEY
        api_key_configured = bool(api_key and api_key != "your-openai-key-here")
        # Never expose any actual characters of the API key
        api_key_prefix = "sk-***...***" if api_key_configured else "Not configured"

        # Get SDK version
        sdk_version = getattr(openai_module, "__version__", "unknown")

        return OpenAIConfigResponse(
            is_enabled=AIConfig.is_enabled(),
            model=AIConfig.OPENAI_MODEL or "Not configured",
            agent_model=AIConfig.AGENT_MODEL,
            max_tokens=AIConfig.MAX_TOKENS,
            request_timeout=AIConfig.REQUEST_TIMEOUT_SECONDS,
            max_retries=AIConfig.MAX_RETRIES,
            temperature=AIConfig.DEFAULT_TEMPERATURE,
            api_key_configured=api_key_configured,
            api_key_prefix=api_key_prefix,
            sdk_version=sdk_version,
        )

    except Exception as e:
        logger.error(f"Error getting OpenAI config: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving OpenAI configuration",
        )


@router.post("/openai/test", response_model=OpenAIDiagnosticResponse)
@limiter.limit("10/minute")
async def test_openai_api(
    request_obj: Request,
    request: OpenAIDiagnosticRequest,
    admin_user: User = Depends(require_admin_not_impersonating),
):
    """
    Test the OpenAI Responses API.
    Rate limited to 10 requests per minute per admin user.
    """
    if not AIConfig.is_enabled():
        return OpenAIDiagnosticResponse(
            success=False,
            api_type="responses",
            request_details=DiagnosticRequestDetails(
                prompt=request.prompt,
                system_message=request.system_message or "You are a helpful assistant.",
                max_tokens=request.max_tokens or 500,
                temperature=request.temperature or 0.7,
                model=request.model_override or AIConfig.OPENAI_MODEL or "Not configured",
                timestamp=datetime.utcnow().isoformat(),
                prompt_length=len(request.prompt),
                system_length=len(
                    request.system_message or "You are a helpful assistant."
                ),
            ),
            error="OpenAI API key not configured",
        )

    try:
        # Prepare request parameters
        model = request.model_override or AIConfig.OPENAI_MODEL
        max_tokens = request.max_tokens or 500
        temperature = request.temperature or 0.7
        system_message = request.system_message or "You are a helpful assistant."

        # Create client and track timing
        client = openai_module.OpenAI(api_key=AIConfig.OPENAI_API_KEY)
        request_start = time.time()

        # Call Responses API asynchronously to avoid blocking the event loop
        # Note: Responses API uses 'instructions' for system message and 'input' for prompt
        # It uses max_output_tokens instead of max_tokens
        # Temperature parameter is not supported in Responses API
        response = await asyncio.to_thread(
            client.responses.create,
            model=model,
            instructions=system_message,
            input=request.prompt,
            max_output_tokens=max_tokens,
            reasoning={"effort": "minimal", "summary": "auto"},
        )
        logger.debug(f"OpenAI Response API response: {response}")

        response_time_ms = int((time.time() - request_start) * 1000)

        # Extract response text using output_text helper
        response_text = response.output_text if hasattr(response, "output_text") else None

        # If output_text not available, try to extract from output array
        if not response_text and hasattr(response, "output"):
            for item in response.output:
                if hasattr(item, "type") and item.type == "message":
                    if hasattr(item, "content") and isinstance(item.content, list):
                        for content_item in item.content:
                            if (
                                hasattr(content_item, "type")
                                and content_item.type == "output_text"
                            ):
                                response_text = content_item.text
                                break
                if response_text:
                    break

        # Extract finish status
        finish_reason = "stop"  # Default
        if hasattr(response, "output"):
            for item in response.output:
                if hasattr(item, "status") and item.status:
                    finish_reason = item.status
                    break

        # Extract token usage - Responses API may have different structure
        prompt_tokens = 0
        completion_tokens = 0
        total_tokens = 0
        cache_hit = None

        if hasattr(response, "usage"):
            prompt_tokens = getattr(response.usage, "prompt_tokens", 0) or getattr(
                response.usage, "input_tokens", 0
            )
            completion_tokens = getattr(
                response.usage, "completion_tokens", 0
            ) or getattr(response.usage, "output_tokens", 0)
            total_tokens = getattr(response.usage, "total_tokens", 0) or (
                prompt_tokens + completion_tokens
            )

            # Check for cache hit indicator
            if hasattr(response.usage, "cache_hit"):
                cache_hit = response.usage.cache_hit

        # Calculate metrics
        tokens_per_second = (
            (completion_tokens / (response_time_ms / 1000.0))
            if response_time_ms > 0
            else 0.0
        )

        # Estimate cost using centralized pricing configuration
        estimated_cost = OpenAIPricing.estimate_cost(
            model, prompt_tokens, completion_tokens
        )

        # Log the test
        logger.info(
            f"Admin diagnostic test - Responses API - "
            f"User: {admin_user.email}, Model: {model}, "
            f"Prompt length: {len(request.prompt)}, "
            f"Response time: {response_time_ms}ms, "
            f"Cache hit: {cache_hit}, Success: True"
        )

        return OpenAIDiagnosticResponse(
            success=True,
            response_text=response_text,
            api_type="responses",
            metrics=DiagnosticMetrics(
                response_time_ms=response_time_ms,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=total_tokens,
                estimated_cost=estimated_cost,
                finish_reason=finish_reason,
                model_used=model,
                tokens_per_second=tokens_per_second,
                cache_hit=cache_hit,
            ),
            request_details=DiagnosticRequestDetails(
                prompt=request.prompt,
                system_message=system_message,
                max_tokens=max_tokens,
                temperature=temperature,
                model=model,
                timestamp=datetime.utcnow().isoformat(),
                prompt_length=len(request.prompt),
                system_length=len(system_message),
            ),
        )

    except openai_module.APITimeoutError as e:
        logger.error(f"OpenAI API timeout in responses test: {str(e)}")
        return OpenAIDiagnosticResponse(
            success=False,
            api_type="responses",
            request_details=DiagnosticRequestDetails(
                prompt=request.prompt,
                system_message=request.system_message or "You are a helpful assistant.",
                max_tokens=request.max_tokens or 500,
                temperature=request.temperature or 0.7,
                model=request.model_override or AIConfig.OPENAI_MODEL or "Not configured",
                timestamp=datetime.utcnow().isoformat(),
                prompt_length=len(request.prompt),
                system_length=len(
                    request.system_message or "You are a helpful assistant."
                ),
            ),
            error=f"OpenAI API Timeout: The request took too long to complete. Please try again with a shorter prompt or higher timeout value. Details: {str(e)}",
        )
    except openai_module.RateLimitError as e:
        logger.error(f"OpenAI API rate limit in responses test: {str(e)}")
        return OpenAIDiagnosticResponse(
            success=False,
            api_type="responses",
            request_details=DiagnosticRequestDetails(
                prompt=request.prompt,
                system_message=request.system_message or "You are a helpful assistant.",
                max_tokens=request.max_tokens or 500,
                temperature=request.temperature or 0.7,
                model=request.model_override or AIConfig.OPENAI_MODEL or "Not configured",
                timestamp=datetime.utcnow().isoformat(),
                prompt_length=len(request.prompt),
                system_length=len(
                    request.system_message or "You are a helpful assistant."
                ),
            ),
            error=f"OpenAI API Rate Limit: You've exceeded the API rate limit. Please try again later. Details: {str(e)}",
        )
    except openai_module.APIConnectionError as e:
        logger.error(f"OpenAI API connection error in responses test: {str(e)}")
        return OpenAIDiagnosticResponse(
            success=False,
            api_type="responses",
            request_details=DiagnosticRequestDetails(
                prompt=request.prompt,
                system_message=request.system_message or "You are a helpful assistant.",
                max_tokens=request.max_tokens or 500,
                temperature=request.temperature or 0.7,
                model=request.model_override or AIConfig.OPENAI_MODEL or "Not configured",
                timestamp=datetime.utcnow().isoformat(),
                prompt_length=len(request.prompt),
                system_length=len(
                    request.system_message or "You are a helpful assistant."
                ),
            ),
            error=f"OpenAI API Connection Error: Unable to connect to OpenAI API. Please check your network connection. Details: {str(e)}",
        )
    except openai_module.AuthenticationError as e:
        logger.error(f"OpenAI API authentication error in responses test: {str(e)}")
        return OpenAIDiagnosticResponse(
            success=False,
            api_type="responses",
            request_details=DiagnosticRequestDetails(
                prompt=request.prompt,
                system_message=request.system_message or "You are a helpful assistant.",
                max_tokens=request.max_tokens or 500,
                temperature=request.temperature or 0.7,
                model=request.model_override or AIConfig.OPENAI_MODEL or "Not configured",
                timestamp=datetime.utcnow().isoformat(),
                prompt_length=len(request.prompt),
                system_length=len(
                    request.system_message or "You are a helpful assistant."
                ),
            ),
            error=f"OpenAI API Authentication Error: Invalid API key or credentials. Please verify your API key configuration. Details: {str(e)}",
        )
    except openai_module.APIError as e:
        logger.error(f"OpenAI API error in responses test: {str(e)}")
        return OpenAIDiagnosticResponse(
            success=False,
            api_type="responses",
            request_details=DiagnosticRequestDetails(
                prompt=request.prompt,
                system_message=request.system_message or "You are a helpful assistant.",
                max_tokens=request.max_tokens or 500,
                temperature=request.temperature or 0.7,
                model=request.model_override or AIConfig.OPENAI_MODEL or "Not configured",
                timestamp=datetime.utcnow().isoformat(),
                prompt_length=len(request.prompt),
                system_length=len(
                    request.system_message or "You are a helpful assistant."
                ),
            ),
            error=f"OpenAI API Error: {str(e)}",
        )
    except Exception as e:
        # Log full exception with traceback for debugging
        logger.exception(f"Unexpected error in responses test: {str(e)}")
        return OpenAIDiagnosticResponse(
            success=False,
            api_type="responses",
            request_details=DiagnosticRequestDetails(
                prompt=request.prompt,
                system_message=request.system_message or "You are a helpful assistant.",
                max_tokens=request.max_tokens or 500,
                temperature=request.temperature or 0.7,
                model=request.model_override or AIConfig.OPENAI_MODEL or "Not configured",
                timestamp=datetime.utcnow().isoformat(),
                prompt_length=len(request.prompt),
                system_length=len(
                    request.system_message or "You are a helpful assistant."
                ),
            ),
            error=f"Unexpected Error: {str(e)}",
        )
