"""
Unauthenticated public job description share endpoint.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from src.models.base import get_db
from src.sharing.api.share_limiter import limiter
from src.sharing.schemas import PublicJobDescriptionResponse
from src.sharing.share_service import get_jd_by_share_token, log_share_view
from src.utils.datetime_utils import format_datetime_utc_iso

router = APIRouter()


@router.get(
    "/public/job-description/{token}", response_model=PublicJobDescriptionResponse
)
@limiter.limit("100/hour")
async def get_public_job_description(
    token: str, request: Request, db: Session = Depends(get_db)
):
    jd = get_jd_by_share_token(db, token)
    if not jd:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Job description not found"
        )

    log_share_view(db, "job_description", str(jd.id), request)

    return PublicJobDescriptionResponse(
        id=str(jd.id),
        title=jd.title,
        company=jd.company,
        location=jd.location,
        content=jd.content or "",
        source_url=jd.source_url,
        requirements=jd.requirements,
        created_at=format_datetime_utc_iso(jd.created_at),
        updated_at=format_datetime_utc_iso(jd.updated_at),
    )
