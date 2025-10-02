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

from ..models.base import get_db
from ..models.user import User
from ..models.cv import CV
from ..models.job_description import JobDescription
from ..services.job_description_service import (
    get_cv_owned_by,
    create_job_description_for_cv,
    list_job_descriptions_for_cv,
    delete_job_description_owned_by,
    create_job_description_for_user,
    list_job_descriptions_for_user,
    get_job_description_by_id,
)
from ..services.url_parsing_service import parse_job_url
from ..middleware.clerk_auth import get_effective_user

router = APIRouter(prefix="/api", tags=["job-descriptions"])


class JobDescriptionCreate(BaseModel):
    content: str
    source_url: Optional[str] = None
    title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None


class JobDescriptionResponse(BaseModel):
    id: str
    cv_id: Optional[str]
    content: str
    source_url: Optional[str]
    title: Optional[str]
    company: Optional[str]
    location: Optional[str]
    created_at: str

    class Config:
        from_attributes = True


class JobDescriptionListResponse(BaseModel):
    job_descriptions: List[JobDescriptionResponse]


class JobDescriptionParseRequest(BaseModel):
    url: str


class JobDescriptionParseResponse(BaseModel):
    success: bool
    content: Optional[str] = None
    title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    source_url: Optional[str] = None
    source: Optional[str] = None
    error: Optional[str] = None


@router.post("/job-descriptions", response_model=JobDescriptionResponse)
async def create_job_description(
    job_description: JobDescriptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user)
):
    """Add a job description for the user"""
    # Create job description without CV binding
    jd = create_job_description_for_user(
        db,
        str(current_user.id),
        content=job_description.content,
        source_url=job_description.source_url,
        title=job_description.title,
        company=job_description.company,
        location=job_description.location,
    )
    
    return JobDescriptionResponse(
        id=str(jd.id),
        cv_id=str(jd.cv_id) if jd.cv_id else None,
        content=jd.content,
        source_url=jd.source_url,
        title=jd.title,
        company=jd.company,
        location=jd.location,
        created_at=jd.created_at.isoformat()
    )


@router.get("/job-descriptions", response_model=JobDescriptionListResponse)
async def get_job_descriptions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user)
):
    """Get all job descriptions for the user"""
    # Get job descriptions for user
    job_descriptions = list_job_descriptions_for_user(db, str(current_user.id))
    
    jd_responses = [
        JobDescriptionResponse(
            id=str(jd.id),
            cv_id=str(jd.cv_id) if jd.cv_id else None,
            content=jd.content,
            source_url=jd.source_url,
            title=jd.title,
            company=jd.company,
            location=jd.location,
            created_at=jd.created_at.isoformat()
        )
        for jd in job_descriptions
    ]
    
    return JobDescriptionListResponse(job_descriptions=jd_responses)


@router.delete("/job-descriptions/{jd_id}")
async def delete_job_description(
    jd_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user)
):
    """Delete a job description"""
    # Get job description and verify it exists
    jd = get_job_description_by_id(db, jd_id)
    if not jd:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job description not found"
        )
    
    # Delete the job description
    db.delete(jd)
    db.commit()
    
    return {"message": "Job description deleted successfully"}


@router.post("/cvs/{cv_id}/job-descriptions/parse-url", response_model=JobDescriptionParseResponse)
async def parse_job_description_url(
    cv_id: str,
    request: JobDescriptionParseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user)
):
    """Parse a job description from a URL"""
    # Verify CV exists and belongs to user
    cv = get_cv_owned_by(db, cv_id, str(current_user.id))
    
    if not cv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CV not found"
        )
    
    # Parse the URL
    result = parse_job_url(request.url)
    
    if not result.get("success", False):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("error", "Failed to parse URL")
        )
    
    return JobDescriptionParseResponse(
        success=result.get("success", False),
        content=result.get("content"),
        title=result.get("title"),
        company=result.get("company"),
        location=result.get("location"),
        source_url=result.get("source_url"),
        source=result.get("source"),
        error=result.get("error")
    )
