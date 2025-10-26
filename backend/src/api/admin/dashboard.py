"""
Dashboard and statistics API endpoints for admin operations.

This module provides administrative endpoints for viewing system-wide
statistics and dashboard data including user counts, CV counts,
and recent activity.
"""

import logging
from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc
from sqlalchemy.orm import Session

from src.middleware.clerk_auth import require_admin_not_impersonating
from src.models.ai_section import AISection
from src.models.base import get_db
from src.models.cv import CV
from src.models.job_description import JobDescription
from src.models.user import User

from .models import DashboardData, SystemStats, UserSummary

logger = logging.getLogger(__name__)
router = APIRouter(tags=["admin"])


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
