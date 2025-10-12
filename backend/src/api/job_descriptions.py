"""
Job description management API endpoints.

This module provides endpoints for creating, retrieving, and deleting
job descriptions associated with CVs for AI-powered optimization.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
import uuid
import asyncio

from src.models.base import get_db
from src.models.user import User
from src.models.cv import CV
from src.models.job_description import JobDescription
from src.services.job_description_service import (
    get_cv_owned_by,
    create_job_description_for_cv,
    list_job_descriptions_for_cv,
    delete_job_description_owned_by,
    hide_job_description_owned_by,
    create_job_description_for_user,
    list_job_descriptions_for_user,
    get_job_description_by_id,
    update_job_description_owned_by,
)
from src.services.url_parsing_service import parse_job_url, _is_search_results_page
from src.middleware.clerk_auth import get_effective_user
from src.utils.background_tasks import run_task_in_background
from src.models.base import SessionLocal
from src.config import BackgroundTaskConfig

router = APIRouter(prefix="/api", tags=["job-descriptions"])


def parse_job_url_sync(task_id: str, url: str, user_id: str):
    """Synchronous job URL parsing function to run in thread pool"""
    import time
    import logging
    logger = logging.getLogger(__name__)

    # Add a small delay to ensure frontend can see is_parsing=True state
    time.sleep(BackgroundTaskConfig.URL_PARSING_DELAY_SECONDS)

    db = SessionLocal()
    try:
        # Parse job URL (it's a synchronous function)
        from src.services.url_parsing_service import parse_job_url
        result = parse_job_url(url, user_id=user_id, db_session=db)

        # Update JobDescription record with parsed data
        jd = db.query(JobDescription).filter(JobDescription.id == task_id).first()
        if jd:
            if result.get("success", False):
                jd.content = result.get("content", "")
                jd.title = result.get("title")
                jd.company = result.get("company")
                jd.location = result.get("location")
                jd.source_url = result.get("source_url", url)
                jd.is_parsing = False
                jd.parse_error = None
            else:
                jd.is_parsing = False
                jd.parse_error = result.get("error", "Failed to parse URL")

            db.commit()
            db.refresh(jd)

    except Exception as e:
        # Update JobDescription record with error
        logger.exception(f"parse_job_url_sync: Exception during parsing: {str(e)}")
        db_error = SessionLocal()
        try:
            jd = db_error.query(JobDescription).filter(JobDescription.id == task_id).first()
            if jd:
                jd.is_parsing = False
                jd.parse_error = f"Background parsing failed: {str(e)}"
                db_error.commit()
                logger.info(f"Successfully updated job description {task_id} with error status")
        except Exception as update_error:
            logger.exception(f"parse_job_url_sync: Failed to update job description with error: {str(update_error)}")
            # Even if commit fails, try one more time with a fresh session
            try:
                db_final = SessionLocal()
                jd = db_final.query(JobDescription).filter(JobDescription.id == task_id).first()
                if jd and jd.is_parsing:
                    jd.is_parsing = False
                    jd.parse_error = "Parsing failed due to system error"
                    db_final.commit()
                    logger.info(f"Successfully updated job description {task_id} on retry")
                db_final.close()
            except Exception as final_error:
                logger.critical(f"CRITICAL: Failed to update job description {task_id} status after multiple attempts: {str(final_error)}")
        finally:
            db_error.close()
    finally:
        # Ensure database session is always closed
        try:
            db.close()
        except Exception:
            pass


async def parse_job_url_background(jd_id: str, url: str, user_id: str):
    """Parse job URL in background using thread pool executor"""
    await run_task_in_background(
        jd_id,
        "job_url_parsing",
        parse_job_url_sync,
        url,
        user_id
    )


class JobDescriptionCreate(BaseModel):
    content: str
    source_url: Optional[str] = None
    title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None


class JobDescriptionUpdate(BaseModel):
    content: Optional[str] = None
    title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None


class JobDescriptionResponse(BaseModel):
    id: str
    user_id: str
    cv_id: Optional[str]
    content: str
    source_url: Optional[str]
    title: Optional[str]
    company: Optional[str]
    location: Optional[str]
    created_at: str
    hidden: bool
    is_parsing: bool = False
    parse_error: Optional[str] = None

    class Config:
        from_attributes = True


class JobDescriptionListResponse(BaseModel):
    job_descriptions: List[JobDescriptionResponse]


class JobDescriptionParseRequest(BaseModel):
    url: str


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


@router.post("/cvs/{cv_id}/job-descriptions", response_model=JobDescriptionResponse)
async def create_job_description(
    cv_id: str,
    job_description: JobDescriptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user)
):
    """Add a job description for a specific CV"""
    # Verify CV exists and belongs to user
    cv = get_cv_owned_by(db, cv_id, str(current_user.id))
    if not cv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CV not found"
        )
    
    # Create job description with CV binding
    jd = create_job_description_for_user(
        db,
        str(current_user.id),
        cv_id,
        content=job_description.content,
        source_url=job_description.source_url,
        title=job_description.title,
        company=job_description.company,
        location=job_description.location,
    )
    
    return JobDescriptionResponse(
        id=str(jd.id),
        user_id=str(jd.user_id),
        cv_id=str(jd.cv_id) if jd.cv_id else None,
        content=jd.content,
        source_url=jd.source_url,
        title=jd.title,
        company=jd.company,
        location=jd.location,
        created_at=jd.created_at.isoformat(),
        hidden=jd.hidden,
        is_parsing=jd.is_parsing,
        parse_error=jd.parse_error
    )


@router.get("/cvs/{cv_id}/job-descriptions", response_model=JobDescriptionListResponse)
async def get_job_descriptions(
    cv_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user)
):
    """Get all job descriptions for a specific CV"""
    # Verify CV exists and belongs to user
    cv = get_cv_owned_by(db, cv_id, str(current_user.id))
    if not cv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CV not found"
        )
    
    # Get job descriptions for this specific CV
    job_descriptions = list_job_descriptions_for_user(db, str(current_user.id), cv_id)
    
    jd_responses = [
        JobDescriptionResponse(
            id=str(jd.id),
            user_id=str(jd.user_id),
            cv_id=str(jd.cv_id) if jd.cv_id else None,
            content=jd.content,
            source_url=jd.source_url,
            title=jd.title,
            company=jd.company,
            location=jd.location,
            created_at=jd.created_at.isoformat(),
            hidden=jd.hidden,
            is_parsing=jd.is_parsing,
            parse_error=jd.parse_error
        )
        for jd in job_descriptions
    ]
    
    return JobDescriptionListResponse(job_descriptions=jd_responses)


@router.put("/job-descriptions/{jd_id}", response_model=JobDescriptionResponse)
async def update_job_description(
    jd_id: str,
    job_description: JobDescriptionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user)
):
    """Update a job description"""
    updated_jd = update_job_description_owned_by(
        db,
        jd_id,
        str(current_user.id),
        content=job_description.content,
        title=job_description.title,
        company=job_description.company,
        location=job_description.location,
    )

    if not updated_jd:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job description not found"
        )

    return JobDescriptionResponse(
        id=str(updated_jd.id),
        user_id=str(updated_jd.user_id),
        cv_id=str(updated_jd.cv_id) if updated_jd.cv_id else None,
        content=updated_jd.content,
        source_url=updated_jd.source_url,
        title=updated_jd.title,
        company=updated_jd.company,
        location=updated_jd.location,
        created_at=updated_jd.created_at.isoformat(),
        hidden=updated_jd.hidden,
        is_parsing=updated_jd.is_parsing,
        parse_error=updated_jd.parse_error
    )


@router.delete("/job-descriptions/{jd_id}")
async def delete_job_description(
    jd_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user)
):
    """Hide a job description (soft delete)"""
    # Hide the job description instead of actually deleting it
    success = hide_job_description_owned_by(db, jd_id, str(current_user.id))
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job description not found"
        )

    return {"message": "Job description hidden successfully"}


@router.post("/cvs/{cv_id}/job-descriptions/parse-url", response_model=JobDescriptionParseResponse)
async def parse_job_description_url(
    cv_id: str,
    request: JobDescriptionParseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user)
):
    """Parse a job description from a URL using background processing"""
    # Verify CV exists and belongs to user
    cv = get_cv_owned_by(db, cv_id, str(current_user.id))
    
    if not cv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CV not found"
        )
    
    # Validate URL before creating job description - check for search results pages
    if _is_search_results_page(request.url):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This appears to be a search results page, not an individual job posting. Please open a specific job listing and use that URL instead, or copy and paste the job description using the 'Text' tab."
        )
    
    # Create JobDescription record immediately with parsing status
    jd = JobDescription(
        user_id=str(current_user.id),
        cv_id=cv_id,
        source_url=request.url,
        is_parsing=True,
        content="",  # Will be populated by background task
        title=None,
        company=None,
        location=None
    )
    
    db.add(jd)
    db.commit()
    db.refresh(jd)
    
    
    # Add small delay to ensure DB commit before starting background task
    await asyncio.sleep(0.1)
    
    # Start background parsing task
    asyncio.create_task(parse_job_url_background(str(jd.id), request.url, str(current_user.id)))
    
    return JobDescriptionParseResponse(
        success=True,
        job_description_id=str(jd.id),
        is_parsing=True,
        content=None,
        title=None,
        company=None,
        location=None,
        source_url=request.url,
        source=None,
        error=None
    )


@router.get("/job-descriptions/{jd_id}/status", response_model=JobDescriptionResponse)
async def get_job_description_status(
    jd_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user)
):
    """Get the current status of a job description parsing task"""
    # Get job description and verify ownership
    jd = get_job_description_by_id(db, jd_id, str(current_user.id))
    
    if not jd:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job description not found"
        )
    
    return JobDescriptionResponse(
        id=str(jd.id),
        user_id=str(jd.user_id),
        cv_id=str(jd.cv_id) if jd.cv_id else None,
        content=jd.content,
        source_url=jd.source_url,
        title=jd.title,
        company=jd.company,
        location=jd.location,
        created_at=jd.created_at.isoformat(),
        hidden=jd.hidden,
        is_parsing=jd.is_parsing,
        parse_error=jd.parse_error
    )
