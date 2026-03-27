"""
Public sharing service for CVs and job descriptions.

Provides token lifecycle management and view analytics.
"""

import logging
import secrets
from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional

from fastapi import Request
from sqlalchemy import func
from sqlalchemy.orm import Session

from src.middleware.clerk_auth import get_client_ip
from src.models.cv import CV
from src.models.job_description import JobDescription
from src.services.cv.cv_service import get_cv_by_id
from src.services.job_descriptions.job_description_service import (
    get_job_description_owned_by,
)
from src.sharing.models.share_view import ShareView
from src.utils.datetime_utils import format_datetime_utc_iso

logger = logging.getLogger(__name__)

ShareResourceType = Literal["cv", "job_description"]
ShareViewMode = Literal["shell"]


def generate_share_token() -> str:
    """Generate a cryptographically secure sharing token."""
    return secrets.token_urlsafe(16)


def _generate_unique_token(db: Session, model_cls: Any) -> str:
    for attempt in range(1, 6):
        token = generate_share_token()
        existing = (
            db.query(model_cls).filter(model_cls.public_share_token == token).first()
        )
        if not existing:
            return token
    logger.error(
        "Failed to generate unique share token after 5 attempts (model=%s)",
        getattr(model_cls, "__name__", model_cls),
    )
    raise RuntimeError("Failed to generate unique share token")


def enable_cv_sharing(
    db: Session,
    cv_id: str,
    user_id: str,
    view_mode: ShareViewMode = "shell",
) -> Optional[CV]:
    cv = get_cv_by_id(db, cv_id, user_id)
    if not cv:
        return None
    if not cv.public_share_token:
        cv.public_share_token = _generate_unique_token(db, CV)
        cv.public_share_created_at = datetime.now(timezone.utc)
    cv.is_public_shared = True
    cv.public_share_view_mode = view_mode
    db.commit()
    db.refresh(cv)
    return cv


def update_cv_share_settings(
    db: Session,
    cv_id: str,
    user_id: str,
    view_mode: ShareViewMode,
) -> Optional[CV]:
    """Update persisted share settings for an already-managed CV share."""
    cv = get_cv_by_id(db, cv_id, user_id)
    if not cv:
        return None
    cv.public_share_view_mode = view_mode
    db.commit()
    db.refresh(cv)
    return cv


def disable_cv_sharing(db: Session, cv_id: str, user_id: str) -> Optional[CV]:
    cv = get_cv_by_id(db, cv_id, user_id)
    if not cv:
        return None
    cv.is_public_shared = False
    db.commit()
    db.refresh(cv)
    return cv


def regenerate_cv_share_token(db: Session, cv_id: str, user_id: str) -> Optional[CV]:
    cv = get_cv_by_id(db, cv_id, user_id)
    if not cv:
        return None
    cv.public_share_token = _generate_unique_token(db, CV)
    cv.is_public_shared = True
    cv.public_share_created_at = datetime.now(timezone.utc)
    if not cv.public_share_view_mode:
        cv.public_share_view_mode = "shell"
    db.commit()
    db.refresh(cv)
    return cv


def get_cv_by_share_token(db: Session, token: str) -> Optional[CV]:
    return (
        db.query(CV)
        .filter(CV.public_share_token == token, CV.is_public_shared == True)
        .first()
    )


def enable_jd_sharing(
    db: Session, job_description_id: str, user_id: str
) -> Optional[JobDescription]:
    jd = get_job_description_owned_by(db, job_description_id, user_id)
    if not jd:
        return None
    if not jd.public_share_token:
        jd.public_share_token = _generate_unique_token(db, JobDescription)
        jd.public_share_created_at = datetime.now(timezone.utc)
    jd.is_public_shared = True
    db.commit()
    db.refresh(jd)
    return jd


def disable_jd_sharing(
    db: Session, job_description_id: str, user_id: str
) -> Optional[JobDescription]:
    jd = get_job_description_owned_by(db, job_description_id, user_id)
    if not jd:
        return None
    jd.is_public_shared = False
    db.commit()
    db.refresh(jd)
    return jd


def regenerate_jd_share_token(
    db: Session, job_description_id: str, user_id: str
) -> Optional[JobDescription]:
    jd = get_job_description_owned_by(db, job_description_id, user_id)
    if not jd:
        return None
    jd.public_share_token = _generate_unique_token(db, JobDescription)
    jd.is_public_shared = True
    jd.public_share_created_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(jd)
    return jd


def get_jd_by_share_token(db: Session, token: str) -> Optional[JobDescription]:
    return (
        db.query(JobDescription)
        .filter(
            JobDescription.public_share_token == token,
            JobDescription.is_public_shared == True,
            JobDescription.hidden == False,
        )
        .first()
    )


def log_share_view(
    db: Session, resource_type: ShareResourceType, resource_id: str, request: Request
) -> None:
    view = ShareView(
        resource_type=resource_type,
        resource_id=resource_id,
        viewer_ip=get_client_ip(request),
        user_agent=request.headers.get("User-Agent"),
        referer=request.headers.get("Referer"),
    )
    db.add(view)
    db.commit()


def get_share_analytics(
    db: Session, resource_type: ShareResourceType, resource_id: str, user_id: str
) -> Optional[Dict[str, Any]]:
    if resource_type == "cv":
        owner_resource = get_cv_by_id(db, resource_id, user_id)
    else:
        owner_resource = get_job_description_owned_by(db, resource_id, user_id)

    if not owner_resource:
        return None

    total_views = (
        db.query(func.count(ShareView.id))
        .filter(
            ShareView.resource_type == resource_type, ShareView.resource_id == resource_id
        )
        .scalar()
        or 0
    )

    unique_ips = (
        db.query(func.count(func.distinct(ShareView.viewer_ip)))
        .filter(
            ShareView.resource_type == resource_type,
            ShareView.resource_id == resource_id,
            ShareView.viewer_ip.isnot(None),
        )
        .scalar()
        or 0
    )

    recent_rows: List[ShareView] = (
        db.query(ShareView)
        .filter(
            ShareView.resource_type == resource_type, ShareView.resource_id == resource_id
        )
        .order_by(ShareView.viewed_at.desc())
        .limit(50)
        .all()
    )

    recent_views = [
        {
            "viewer_ip": row.viewer_ip,
            "user_agent": row.user_agent,
            "referer": row.referer,
            "viewed_at": format_datetime_utc_iso(row.viewed_at),
        }
        for row in recent_rows
    ]

    return {
        "total_views": int(total_views),
        "unique_ips": int(unique_ips),
        "recent_views": recent_views,
    }
