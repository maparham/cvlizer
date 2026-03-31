"""
Job description management API endpoints.

This module provides endpoints for creating, retrieving, and deleting
job descriptions associated with CVs for AI-powered optimization.
"""

import asyncio
from contextlib import contextmanager
from datetime import datetime
import logging
import time
import uuid
from typing import Any, Callable, Dict, List, Optional

logger = logging.getLogger(__name__)

from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from src.config import BackgroundTaskConfig, APIConfig
from src.dependencies.ai_quota import require_ai_quota
from src.utils.rate_limit import create_combined_limiter
from src.middleware.clerk_auth import get_effective_user_lightweight
from src.models.base import SessionLocal, get_db
from src.models.cv import CV
from src.models.job_description import JobDescription
from src.models.user import User
from src.services.cv.cv_service import get_cv_by_id
from src.services.job_descriptions.job_description_service import (
    associate_jd_with_cv,
    create_job_description_for_cv,
    create_job_description_for_user,
    create_job_description_for_user_with_cvs,
    delete_job_description_owned_by,
    disassociate_jd_from_cv,
    get_cv_ids_for_job_description,
    get_job_description_by_id,
    get_job_descriptions_for_cv_with_associations,
    hide_job_description_owned_by,
    list_all_job_descriptions_for_user,
    list_job_descriptions_for_cv,
    list_job_descriptions_for_user,
    update_job_description_owned_by,
)
from src.services.job_descriptions.url_parsing_service import (
    MIN_PASTED_JOB_TEXT_CHARS,
    PASTED_JOB_SOURCE_MARKER,
    _is_search_results_page,
    parse_pasted_job_text,
)
from src.utils.background_tasks import run_task_in_background
from src.utils.task_logging import make_task_exception_logger

router = APIRouter(prefix="/api", tags=["job-descriptions"])
limiter = create_combined_limiter()


def _persist_background_parse_exception(
    task_id: str, exc: BaseException, log_prefix: str
) -> None:
    """
    Mark a job description as no longer parsing after an unexpected exception.

    Uses at most two DB sessions: first attempt stores the real error; on failure,
    one retry sets a generic message (same behavior as the previous inline handlers).
    """

    def _store_parse_error(message: str, *, only_if_parsing: bool = False) -> bool:
        with _db_session() as db:
            jd = db.query(JobDescription).filter(JobDescription.id == task_id).first()
            if not jd:
                return False
            if only_if_parsing and not jd.is_parsing:
                return False

            jd.is_parsing = False
            jd.parse_error = message
            try:
                db.commit()
            except Exception:
                db.rollback()
                raise
            return True

    try:
        if _store_parse_error(f"Background parsing failed: {str(exc)}"):
            logger.info(
                "%s: updated job description %s with error status", log_prefix, task_id
            )
    except Exception as update_error:
        logger.exception(
            "%s: failed to update job description with error: %s",
            log_prefix,
            str(update_error),
        )
        try:
            if _store_parse_error(
                "Parsing failed due to system error", only_if_parsing=True
            ):
                logger.info(
                    "%s: updated job description %s on retry", log_prefix, task_id
                )
        except Exception as final_error:
            logger.critical(
                "%s: CRITICAL: failed to update job description after retry: %s",
                log_prefix,
                str(final_error),
            )


@contextmanager
def _db_session():
    """Yield a database session and always close it."""
    db = SessionLocal()
    try:
        yield db
    finally:
        try:
            db.close()
        except Exception:
            pass


def _parse_job_background_sync(
    task_id: str,
    user_id: str,
    parse_with_session: Callable[[Session], Dict[str, Any]],
    *,
    default_source_url: str,
    parse_failure_message: str,
    log_prefix: str,
) -> None:
    """
    Shared thread-pool worker: run a parser that uses the main session, then commit JD state.

    ``parse_with_session`` receives the active SQLAlchemy session and must return the
    same result shape as ``parse_job_url`` / ``parse_pasted_job_text``.
    """
    time.sleep(BackgroundTaskConfig.URL_PARSING_DELAY_SECONDS)

    db = SessionLocal()
    try:
        result = parse_with_session(db)

        jd = db.query(JobDescription).filter(JobDescription.id == task_id).first()
        if not jd:
            return

        # User may cancel/hide parsing while the background thread is still running.
        # In that case, skip writing any late results.
        if jd.hidden or not jd.is_parsing:
            logger.info(
                "%s: skipping final write for cancelled/hidden job description %s",
                log_prefix,
                task_id,
            )
            return

        if result.get("success", False):
            jd.content = result.get("content", "")
            jd.title = result.get("title")
            jd.company = result.get("company")
            jd.location = result.get("location")
            jd.source_url = result.get("source_url", default_source_url)
            jd.is_parsing = False
            jd.parse_error = None
        else:
            jd.is_parsing = False
            jd.parse_error = result.get("error", parse_failure_message)

        db.commit()
        db.refresh(jd)

    except Exception as e:
        logger.exception("%s: Exception during parsing: %s", log_prefix, str(e))
        _persist_background_parse_exception(task_id, e, log_prefix)
    finally:
        try:
            db.close()
        except Exception:
            pass


def parse_job_url_sync(task_id: str, user_id: str, url: str):
    """Synchronous job URL parsing function to run in thread pool."""

    def parse_with_session(db: Session) -> Dict[str, Any]:
        from src.services.job_descriptions.url_parsing_service import parse_job_url

        return parse_job_url(url, user_id=user_id, db_session=db)

    _parse_job_background_sync(
        task_id,
        user_id,
        parse_with_session,
        default_source_url=url,
        parse_failure_message="Failed to parse URL",
        log_prefix="parse_job_url_sync",
    )


async def parse_job_url_background(jd_id: str, url: str, user_id: str):
    """Parse job URL in background using thread pool executor"""
    await run_task_in_background(
        jd_id, "job_url_parsing", parse_job_url_sync, user_id, url
    )


def parse_job_text_sync(task_id: str, user_id: str, pasted_text: str):
    """Synchronous pasted-text parsing for thread pool."""

    def parse_with_session(db: Session) -> Dict[str, Any]:
        return parse_pasted_job_text(pasted_text, user_id=user_id, db_session=db)

    _parse_job_background_sync(
        task_id,
        user_id,
        parse_with_session,
        default_source_url=PASTED_JOB_SOURCE_MARKER,
        parse_failure_message="Failed to parse pasted text",
        log_prefix="parse_job_text_sync",
    )


async def parse_job_text_background(jd_id: str, pasted_text: str, user_id: str):
    """Parse pasted job description text in background using thread pool executor."""
    await run_task_in_background(
        jd_id, "job_text_parsing", parse_job_text_sync, user_id, pasted_text
    )


class JobDescriptionCreate(BaseModel):
    content: str
    source_url: Optional[str] = None
    title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    status: Optional[str] = "open"
    application_date: Optional[datetime] = None
    notes: Optional[str] = None


class JobDescriptionUpdate(BaseModel):
    content: Optional[str] = None
    title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    status: Optional[str] = None
    application_date: Optional[datetime] = None
    notes: Optional[str] = None


class JobDescriptionResponse(BaseModel):
    id: str
    user_id: str
    cv_id: Optional[str]  # Original CV that created this JD
    cv_ids: List[str] = []  # All CVs associated with this JD
    content: str
    source_url: Optional[str]
    title: Optional[str]
    company: Optional[str]
    location: Optional[str]
    created_at: str
    hidden: bool
    is_parsing: bool = False
    parse_error: Optional[str] = None
    status: str = "open"
    application_date: Optional[str] = None
    notes: Optional[str] = None
    is_public_shared: bool = Field(
        False,
        description=(
            "True when this job description has public sharing enabled (active share token)."
        ),
    )

    class Config:
        from_attributes = True


class JobDescriptionListResponse(BaseModel):
    job_descriptions: List[JobDescriptionResponse]


class JobDescriptionParseRequest(BaseModel):
    url: str


class JobDescriptionParseTextRequest(BaseModel):
    """Pasted job posting text to parse with the same AI pipeline as parse-url."""

    text: str = Field(..., min_length=MIN_PASTED_JOB_TEXT_CHARS)


class JobDescriptionParseResponse(BaseModel):
    success: bool
    job_description_id: Optional[str] = None
    is_parsing: bool = False
    content: Optional[str] = None
    title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    source_url: Optional[str] = None
    source: Optional[str] = None
    error: Optional[str] = None


def _prepare_update_kwargs(job_description: JobDescriptionUpdate) -> Dict[str, Any]:
    """
    Prepare update kwargs from request payload.

    Includes `application_date` only when explicitly provided so the service
    can distinguish omitted fields (no-op) from explicit null (clear value).
    """
    model_fields_set: set[str] = getattr(
        job_description,
        "model_fields_set",
        getattr(job_description, "__fields_set__", set()),
    )
    update_kwargs: Dict[str, Any] = {
        "content": job_description.content,
        "title": job_description.title,
        "company": job_description.company,
        "location": job_description.location,
        "status": job_description.status,
        "notes": job_description.notes,
    }
    if "application_date" in model_fields_set:
        update_kwargs["application_date"] = job_description.application_date
    return update_kwargs


# Helper function to convert JobDescription to response with cv_ids
def _jd_to_response(jd: JobDescription, db: Session) -> JobDescriptionResponse:
    """Helper function to convert JobDescription to response with cv_ids."""
    # Get associated CV IDs from the cv_associations relationship
    cv_ids = [str(assoc.cv_id) for assoc in jd.cv_associations]

    return JobDescriptionResponse(
        id=str(jd.id),
        user_id=str(jd.user_id),
        cv_id=str(jd.cv_id) if jd.cv_id else None,
        cv_ids=cv_ids,
        content=jd.content or "",
        source_url=jd.source_url,
        title=jd.title,
        company=jd.company,
        location=jd.location,
        created_at=jd.created_at.isoformat(),
        hidden=jd.hidden,
        is_parsing=jd.is_parsing,
        parse_error=jd.parse_error,
        status=jd.status or "open",
        application_date=jd.application_date.isoformat() if jd.application_date else None,
        notes=jd.notes,
        is_public_shared=bool(jd.is_public_shared),
    )


@router.post("/cvs/{cv_id}/job-descriptions", response_model=JobDescriptionResponse)
async def create_job_description(
    cv_id: str,
    job_description: JobDescriptionCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user_lightweight),
):
    """Add a job description for a specific CV"""
    # Verify CV exists and belongs to user
    cv = get_cv_by_id(db, cv_id, str(current_user.id))
    if not cv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")

    # Create job description with CV binding (backward compatibility)
    # Use new function that supports CV associations
    jd = create_job_description_for_user_with_cvs(
        db,
        str(current_user.id),
        [cv_id],  # Associate with this CV
        content=job_description.content,
        source_url=job_description.source_url,
        title=job_description.title,
        company=job_description.company,
        location=job_description.location,
        status=job_description.status,
        application_date=job_description.application_date,
        notes=job_description.notes,
    )

    return _jd_to_response(jd, db)


@router.get("/cvs/{cv_id}/job-descriptions", response_model=JobDescriptionListResponse)
async def get_job_descriptions(
    cv_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user_lightweight),
):
    """
    Get all job descriptions for the user (backward compatibility endpoint).
    NOTE: This now returns ALL user job descriptions, not just CV-specific ones.
    This allows job descriptions to be shared across all CVs.
    """
    # Verify CV exists and belongs to user
    cv = get_cv_by_id(db, cv_id, str(current_user.id))
    if not cv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")

    # Return all user job descriptions (new behavior for sharing across CVs)
    job_descriptions = list_all_job_descriptions_for_user(
        db, str(current_user.id), include_cv_ids=True
    )

    jd_responses = [_jd_to_response(jd, db) for jd in job_descriptions]

    return JobDescriptionListResponse(job_descriptions=jd_responses)


@router.put("/job-descriptions/{jd_id}", response_model=JobDescriptionResponse)
async def update_job_description(
    jd_id: str,
    job_description: JobDescriptionUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user_lightweight),
):
    """Update a job description"""
    update_kwargs = _prepare_update_kwargs(job_description)

    updated_jd = update_job_description_owned_by(
        db,
        jd_id,
        str(current_user.id),
        **update_kwargs,
    )

    if not updated_jd:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Job description not found"
        )

    return _jd_to_response(updated_jd, db)


@router.delete("/job-descriptions/{jd_id}")
async def delete_job_description(
    jd_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user_lightweight),
):
    """Hide a job description (soft delete)"""
    # Hide the job description instead of actually deleting it
    success = hide_job_description_owned_by(db, jd_id, str(current_user.id))
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Job description not found"
        )

    return {"message": "Job description hidden successfully"}


@router.post("/job-descriptions/{jd_id}/cancel")
async def cancel_job_description_parsing(
    request: Request,
    jd_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user_lightweight),
):
    """Cancel an in-progress parsing task and hide it immediately from the user."""
    jd = get_job_description_by_id(db, jd_id, str(current_user.id))
    if not jd:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Job description not found"
        )

    if jd.hidden:
        return {"message": "Job description already hidden"}

    if jd.is_parsing:
        jd.is_parsing = False
        jd.parse_error = "cancelled_by_user"

    jd.hidden = True
    db.commit()

    return {"message": "Job description parsing cancelled"}


@router.get("/job-descriptions/{jd_id}/status", response_model=JobDescriptionResponse)
async def get_job_description_status(
    jd_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user_lightweight),
):
    """Get the current status of a job description parsing task"""
    # Get job description and verify ownership
    jd = get_job_description_by_id(db, jd_id, str(current_user.id))

    if not jd:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Job description not found"
        )

    return _jd_to_response(jd, db)


# ============================================================================
# NEW USER-SCOPED ENDPOINTS
# ============================================================================


@router.get("/job-descriptions", response_model=JobDescriptionListResponse)
async def list_user_job_descriptions(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user_lightweight),
):
    """Get all job descriptions for the current user (not filtered by CV)"""
    job_descriptions = list_all_job_descriptions_for_user(
        db, str(current_user.id), include_cv_ids=True
    )

    jd_responses = [_jd_to_response(jd, db) for jd in job_descriptions]

    return JobDescriptionListResponse(job_descriptions=jd_responses)


@router.post("/job-descriptions", response_model=JobDescriptionResponse)
async def create_user_job_description(
    request: Request,
    job_description: JobDescriptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user_lightweight),
    cv_id: Optional[str] = None,
):
    """
    Create a new job description for the user.
    Optionally associate it with a CV using the cv_id query parameter.
    """
    cv_ids = [cv_id] if cv_id else None

    # Create job description with CV associations
    jd = create_job_description_for_user_with_cvs(
        db,
        str(current_user.id),
        cv_ids,
        content=job_description.content,
        source_url=job_description.source_url,
        title=job_description.title,
        company=job_description.company,
        location=job_description.location,
        status=job_description.status,
        application_date=job_description.application_date,
        notes=job_description.notes,
    )

    return _jd_to_response(jd, db)


@router.post("/job-descriptions/parse-url", response_model=JobDescriptionParseResponse)
@limiter.limit(APIConfig.AI_PARSING_RATE_LIMIT)
async def parse_user_job_description_url(
    request: Request,
    parse_request: JobDescriptionParseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user_lightweight),
    cv_id: Optional[str] = None,
    _quota: None = Depends(require_ai_quota),
):
    """
    Parse a job description from a URL using background processing.
    Optionally associate it with a CV using the cv_id query parameter.
    """
    # Validate URL before creating job description - check for search results pages
    if _is_search_results_page(parse_request.url):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This appears to be a search results page, not an individual job posting. Please open a specific job listing and use that URL instead, or copy and paste the job description using the 'Text' tab.",
        )

    # Create JobDescription record immediately with parsing status
    jd = JobDescription(
        user_id=str(current_user.id),
        cv_id=cv_id,  # Track original CV if provided
        source_url=parse_request.url,
        is_parsing=True,
        content="",  # Will be populated by background task
        title=None,
        company=None,
        location=None,
    )

    db.add(jd)
    db.flush()  # Get the ID

    # Create association if cv_id provided
    if cv_id:
        from src.models.cv_job_description import CVJobDescription

        # Verify CV ownership
        cv = get_cv_by_id(db, cv_id, str(current_user.id))
        if not cv:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="CV not found"
            )

        association = CVJobDescription(cv_id=cv_id, job_description_id=jd.id)
        db.add(association)

    db.commit()
    db.refresh(jd)

    logger.debug(
        "JD parse (URL) start jd_id=%s cv_id=%s url=%s",
        str(jd.id),
        cv_id,
        parse_request.url or "",
    )

    # Add small delay to ensure DB commit before starting background task
    await asyncio.sleep(0.1)

    task = asyncio.create_task(
        parse_job_url_background(str(jd.id), parse_request.url, str(current_user.id))
    )
    task.add_done_callback(
        make_task_exception_logger(
            logger,
            "Job description URL parsing task failed: jd_id=%s, error=%s",
            str(jd.id),
        )
    )

    return JobDescriptionParseResponse(
        success=True,
        job_description_id=str(jd.id),
        is_parsing=True,
        content=None,
        title=None,
        company=None,
        location=None,
        source_url=parse_request.url,
        source=None,
        error=None,
    )


@router.post("/job-descriptions/parse-text", response_model=JobDescriptionParseResponse)
@limiter.limit(APIConfig.AI_PARSING_RATE_LIMIT)
async def parse_user_job_description_text(
    request: Request,
    parse_request: JobDescriptionParseTextRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user_lightweight),
    cv_id: Optional[str] = None,
    _quota: None = Depends(require_ai_quota),
):
    """
    Parse pasted job description text using background processing (same AI as URL flow).
    Optionally associate it with a CV using the cv_id query parameter.
    """
    jd = JobDescription(
        user_id=str(current_user.id),
        cv_id=cv_id,
        source_url=PASTED_JOB_SOURCE_MARKER,
        is_parsing=True,
        content="",
        title=None,
        company=None,
        location=None,
    )

    db.add(jd)
    db.flush()

    if cv_id:
        from src.models.cv_job_description import CVJobDescription

        cv = get_cv_by_id(db, cv_id, str(current_user.id))
        if not cv:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="CV not found"
            )

        association = CVJobDescription(cv_id=cv_id, job_description_id=jd.id)
        db.add(association)

    db.commit()
    db.refresh(jd)

    await asyncio.sleep(0.1)

    task = asyncio.create_task(
        parse_job_text_background(str(jd.id), parse_request.text, str(current_user.id))
    )
    task.add_done_callback(
        make_task_exception_logger(
            logger,
            "Job description text parsing task failed: jd_id=%s, error=%s",
            str(jd.id),
        )
    )

    return JobDescriptionParseResponse(
        success=True,
        job_description_id=str(jd.id),
        is_parsing=True,
        content=None,
        title=None,
        company=None,
        location=None,
        source_url=PASTED_JOB_SOURCE_MARKER,
        source=None,
        error=None,
    )


@router.post("/job-descriptions/{jd_id}/cvs/{cv_id}")
async def associate_job_description_with_cv(
    jd_id: str,
    cv_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user_lightweight),
):
    """Associate a job description with a CV"""
    success = associate_jd_with_cv(db, jd_id, cv_id, str(current_user.id))

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job description or CV not found",
        )

    return {"message": "Association created successfully"}


@router.delete("/job-descriptions/{jd_id}/cvs/{cv_id}")
async def disassociate_job_description_from_cv(
    jd_id: str,
    cv_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user_lightweight),
):
    """Remove association between a job description and a CV"""
    success = disassociate_jd_from_cv(db, jd_id, cv_id, str(current_user.id))

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Association not found"
        )

    return {"message": "Association removed successfully"}
