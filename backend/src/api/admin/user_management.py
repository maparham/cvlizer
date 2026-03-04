"""
User management API endpoints for admin operations.

This module provides administrative endpoints for managing users:
- Checking admin access
- Listing and searching users with filters
- Viewing detailed user information
- Toggling user active status
- Viewing user CVs
- Deleting user accounts with safety checks
"""

import logging
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc
from sqlalchemy.orm import Session

from src.middleware.clerk_auth import (
    get_current_user,
    is_admin_user,
    require_admin_not_impersonating,
)
from src.models.ai_section import AISection
from src.models.base import get_db
from src.models.cv import CV
from src.models.job_description import JobDescription
from src.models.user import User
from src.services.user_service import delete_user_and_all_data

from .models import UserDetail, UserSummary

logger = logging.getLogger(__name__)
router = APIRouter(tags=["admin"])


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
        user.updated_at = datetime.now(timezone.utc)
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


@router.delete("/users/{user_id}")
async def delete_user_account_admin(
    user_id: str,
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin_not_impersonating),
):
    """
    Delete a user account and all associated data (admin only).

    This endpoint permanently deletes:
    - User account from local database
    - All CVs and their files from disk
    - All job descriptions
    - All AI enhancements and content
    - All history and activity logs
    - User account from Clerk (authentication provider)

    Safety checks:
    - Admin users cannot be deleted
    - Requires admin authentication without impersonation

    This action cannot be undone.
    """
    try:
        # Verify user exists
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="User not found"
            )

        # Prevent deletion of admin users
        if is_admin_user(user):
            logger.warning(
                f"Admin {admin_user.email} attempted to delete admin user {user.email}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot delete admin users",
            )

        logger.info(
            f"Admin {admin_user.email} initiated deletion of user: {user.email} (ID: {user_id})"
        )

        # Call deletion service
        result = delete_user_and_all_data(
            db=db,
            user_id=user_id,
            clerk_id=user.clerk_id,
            delete_from_clerk=True,
        )

        if not result["success"]:
            logger.error(f"User deletion failed for {user.email}: {result['message']}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result["message"],
            )

        # Log successful deletion
        logger.info(
            f"Admin {admin_user.email} successfully deleted user: {user.email} "
            f"(CVs: {result['deleted_cvs']}, Files: {result['deleted_files']}, "
            f"Clerk: {result['clerk_deleted']})"
        )

        # Return success with details
        response = {
            "message": f"User {user.email} successfully deleted",
            "user_id": user_id,
            "deleted_cvs": result["deleted_cvs"],
            "deleted_files": result["deleted_files"],
            "clerk_deleted": result["clerk_deleted"],
        }

        # Include warnings if Clerk deletion failed
        if result.get("errors"):
            response["warnings"] = result["errors"]

        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error during user deletion by admin: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"User deletion failed: {str(e)}",
        )
