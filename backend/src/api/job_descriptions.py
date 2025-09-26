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
)
from ..middleware.clerk_auth import get_current_user_from_clerk as get_current_user

router = APIRouter(prefix="/api", tags=["job-descriptions"])


class JobDescriptionCreate(BaseModel):
    content: str
    source_url: Optional[str] = None
    title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None


class JobDescriptionResponse(BaseModel):
    id: str
    cv_id: str
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


@router.post("/cvs/{cv_id}/job-descriptions", response_model=JobDescriptionResponse)
async def create_job_description(
    cv_id: str,
    job_description: JobDescriptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Add a job description for a CV"""
    # Verify CV exists and belongs to user
    cv = get_cv_owned_by(db, cv_id, str(current_user.id))
    
    if not cv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CV not found"
        )
    
    # Create job description
    jd = create_job_description_for_cv(
        db,
        cv,
        content=job_description.content,
        source_url=job_description.source_url,
        title=job_description.title,
        company=job_description.company,
        location=job_description.location,
    )
    
    return JobDescriptionResponse(
        id=str(jd.id),
        cv_id=str(jd.cv_id),
        content=jd.content,
        source_url=jd.source_url,
        title=jd.title,
        company=jd.company,
        location=jd.location,
        created_at=jd.created_at.isoformat()
    )


@router.get("/cvs/{cv_id}/job-descriptions", response_model=JobDescriptionListResponse)
async def get_job_descriptions(
    cv_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all job descriptions for a CV"""
    # Verify CV exists and belongs to user
    cv = get_cv_owned_by(db, cv_id, str(current_user.id))
    
    if not cv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CV not found"
        )
    
    # Get job descriptions
    job_descriptions = list_job_descriptions_for_cv(db, cv)
    
    jd_responses = [
        JobDescriptionResponse(
            id=str(jd.id),
            cv_id=str(jd.cv_id),
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
    current_user: User = Depends(get_current_user)
):
    """Delete a job description"""
    # Get job description and verify ownership through CV
    success = delete_job_description_owned_by(db, jd_id, str(current_user.id))
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job description not found"
        )
    
    return {"message": "Job description deleted successfully"}
