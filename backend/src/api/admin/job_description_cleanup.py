"""
Job description cleanup API endpoints for admin operations.

This module provides administrative endpoints for detecting and cleaning
up stuck job descriptions that have been in parsing state for too long.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from src.middleware.clerk_auth import require_admin_not_impersonating
from src.models.base import get_db
from src.models.user import User
from src.services.job_description_cleanup_service import (
    cleanup_stuck_job_descriptions,
    get_parsing_statistics,
)

from .models import JobDescriptionCleanupResult, JobDescriptionCleanupStats

logger = logging.getLogger(__name__)
router = APIRouter(tags=["admin"])


@router.get("/job-descriptions/stuck", response_model=JobDescriptionCleanupStats)
async def get_stuck_job_descriptions_stats(
    db: Session = Depends(get_db),
    admin_user: User = Depends(require_admin_not_impersonating),
):
    """Get statistics about stuck job descriptions"""
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
async def cleanup_stuck_job_descriptions_endpoint(
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
