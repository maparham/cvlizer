"""
Authenticated CV and job description share settings CRUD and analytics.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from src.middleware.clerk_auth import get_effective_user_lightweight
from src.models.base import get_db
from src.models.user import User
from src.services.cv.cv_service import get_cv_by_id
from src.services.job_descriptions.job_description_service import (
    get_job_description_owned_by,
)
from src.sharing.api.share_urls import public_frontend_url
from src.sharing.schemas import CVShareUpdateRequest, ShareAnalytics, ShareResponse
from src.sharing.share_service import (
    disable_cv_sharing,
    disable_jd_sharing,
    enable_cv_sharing,
    enable_jd_sharing,
    get_share_analytics,
    regenerate_cv_share_token,
    regenerate_jd_share_token,
    update_cv_share_settings,
)
from src.services.users.user_activity_service import safe_log_user_activity
from src.utils.datetime_utils import format_datetime_utc_iso

router = APIRouter()


@router.post("/cvs/{cv_id}/share", response_model=ShareResponse)
async def enable_cv_public_share(
    cv_id: str,
    request: Request,
    payload: CVShareUpdateRequest | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user_lightweight),
):
    view_mode = payload.view_mode if payload else "shell"
    cv = enable_cv_sharing(db, cv_id, str(current_user.id), view_mode)
    if not cv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")
    safe_log_user_activity(
        db=db,
        user=current_user,
        activity_type="user_action",
        action="cv_share_enable",
        description="Enabled public CV sharing",
        details={"cv_id": cv_id, "view_mode": view_mode},
    )
    return ShareResponse(
        public_url=public_frontend_url(request, "cv", cv.public_share_token or ""),
        token=cv.public_share_token,
        is_shared=cv.is_public_shared,
        created_at=format_datetime_utc_iso(cv.public_share_created_at),
        view_mode=(cv.public_share_view_mode or "shell"),
    )


@router.get("/cvs/{cv_id}/share", response_model=ShareResponse)
async def get_cv_public_share(
    cv_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user_lightweight),
):
    cv = get_cv_by_id(db, cv_id, str(current_user.id))
    if not cv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")
    token = cv.public_share_token or ""
    return ShareResponse(
        public_url=public_frontend_url(request, "cv", token) if token else "",
        token=cv.public_share_token,
        is_shared=cv.is_public_shared,
        created_at=format_datetime_utc_iso(cv.public_share_created_at),
        view_mode=(cv.public_share_view_mode or "shell"),
    )


@router.put("/cvs/{cv_id}/share", response_model=ShareResponse)
async def update_cv_public_share(
    cv_id: str,
    payload: CVShareUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user_lightweight),
):
    cv = update_cv_share_settings(db, cv_id, str(current_user.id), payload.view_mode)
    if not cv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")
    safe_log_user_activity(
        db=db,
        user=current_user,
        activity_type="user_action",
        action="cv_share_update",
        description="Updated public CV share settings",
        details={"cv_id": cv_id, "view_mode": payload.view_mode},
    )
    token = cv.public_share_token or ""
    return ShareResponse(
        public_url=public_frontend_url(request, "cv", token) if token else "",
        token=cv.public_share_token,
        is_shared=cv.is_public_shared,
        created_at=format_datetime_utc_iso(cv.public_share_created_at),
        view_mode=(cv.public_share_view_mode or "shell"),
    )


@router.delete("/cvs/{cv_id}/share", response_model=ShareResponse)
async def disable_cv_public_share(
    cv_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user_lightweight),
):
    cv = disable_cv_sharing(db, cv_id, str(current_user.id))
    if not cv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")
    safe_log_user_activity(
        db=db,
        user=current_user,
        activity_type="user_action",
        action="cv_share_disable",
        description="Disabled public CV sharing",
        details={"cv_id": cv_id},
    )
    token = cv.public_share_token or ""
    return ShareResponse(
        public_url=public_frontend_url(request, "cv", token) if token else "",
        token=cv.public_share_token,
        is_shared=cv.is_public_shared,
        created_at=format_datetime_utc_iso(cv.public_share_created_at),
        view_mode=(cv.public_share_view_mode or "shell"),
    )


@router.put("/cvs/{cv_id}/share/regenerate", response_model=ShareResponse)
async def regenerate_cv_public_share(
    cv_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user_lightweight),
):
    cv = regenerate_cv_share_token(db, cv_id, str(current_user.id))
    if not cv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")
    safe_log_user_activity(
        db=db,
        user=current_user,
        activity_type="user_action",
        action="cv_share_regenerate",
        description="Regenerated public CV share link",
        details={"cv_id": cv_id},
    )
    return ShareResponse(
        public_url=public_frontend_url(request, "cv", cv.public_share_token or ""),
        token=cv.public_share_token,
        is_shared=cv.is_public_shared,
        created_at=format_datetime_utc_iso(cv.public_share_created_at),
        view_mode=(cv.public_share_view_mode or "shell"),
    )


@router.get("/cvs/{cv_id}/share/analytics", response_model=ShareAnalytics)
async def get_cv_share_analytics(
    cv_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user_lightweight),
):
    analytics = get_share_analytics(db, "cv", cv_id, str(current_user.id))
    if analytics is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")
    return ShareAnalytics(**analytics)


@router.post("/job-descriptions/{job_description_id}/share", response_model=ShareResponse)
async def enable_jd_public_share(
    job_description_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user_lightweight),
):
    jd = enable_jd_sharing(db, job_description_id, str(current_user.id))
    if not jd:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Job description not found"
        )
    return ShareResponse(
        public_url=public_frontend_url(
            request, "job_description", jd.public_share_token or ""
        ),
        token=jd.public_share_token,
        is_shared=jd.is_public_shared,
        created_at=format_datetime_utc_iso(jd.public_share_created_at),
    )


@router.get("/job-descriptions/{job_description_id}/share", response_model=ShareResponse)
async def get_jd_public_share(
    job_description_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user_lightweight),
):
    jd = get_job_description_owned_by(db, job_description_id, str(current_user.id))
    if not jd:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Job description not found"
        )
    token = jd.public_share_token or ""
    return ShareResponse(
        public_url=(
            public_frontend_url(request, "job_description", token) if token else ""
        ),
        token=jd.public_share_token,
        is_shared=jd.is_public_shared,
        created_at=format_datetime_utc_iso(jd.public_share_created_at),
    )


@router.delete(
    "/job-descriptions/{job_description_id}/share", response_model=ShareResponse
)
async def disable_jd_public_share(
    job_description_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user_lightweight),
):
    jd = disable_jd_sharing(db, job_description_id, str(current_user.id))
    if not jd:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Job description not found"
        )
    token = jd.public_share_token or ""
    return ShareResponse(
        public_url=(
            public_frontend_url(request, "job_description", token) if token else ""
        ),
        token=jd.public_share_token,
        is_shared=jd.is_public_shared,
        created_at=format_datetime_utc_iso(jd.public_share_created_at),
    )


@router.put(
    "/job-descriptions/{job_description_id}/share/regenerate",
    response_model=ShareResponse,
)
async def regenerate_jd_public_share(
    job_description_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user_lightweight),
):
    jd = regenerate_jd_share_token(db, job_description_id, str(current_user.id))
    if not jd:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Job description not found"
        )
    return ShareResponse(
        public_url=public_frontend_url(
            request, "job_description", jd.public_share_token or ""
        ),
        token=jd.public_share_token,
        is_shared=jd.is_public_shared,
        created_at=format_datetime_utc_iso(jd.public_share_created_at),
    )


@router.get(
    "/job-descriptions/{job_description_id}/share/analytics",
    response_model=ShareAnalytics,
)
async def get_jd_share_analytics(
    job_description_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user_lightweight),
):
    analytics = get_share_analytics(
        db, "job_description", job_description_id, str(current_user.id)
    )
    if analytics is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Job description not found"
        )
    return ShareAnalytics(**analytics)
