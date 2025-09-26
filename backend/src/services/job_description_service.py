"""
Job Description Service - Job Description Management and Ownership Validation

This module provides comprehensive job description management services including
creation, retrieval, deletion, and ownership validation. It ensures proper
data isolation between users and maintains referential integrity with CV records.

Key responsibilities:
- Validate CV ownership before job description operations
- Create job descriptions with proper UUID handling and data validation
- Retrieve job descriptions scoped to authenticated users
- Delete job descriptions with ownership verification
- Maintain referential integrity between CVs and job descriptions

Usage context:
- Used by job description API endpoints for CRUD operations
- Ensures data isolation and security through ownership validation
- Handles UUID type conversion for database operations
- Provides consistent error handling and validation

Dependencies:
- SQLAlchemy ORM for database operations
- CV and JobDescription models for data persistence
- UUID handling for proper database type management
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from ..models.cv import CV
from ..models.job_description import JobDescription


def get_cv_owned_by(db: Session, cv_id: str, user_id: str) -> Optional[CV]:
    return db.query(CV).filter(CV.id == cv_id, CV.user_id == user_id).first()


def create_job_description_for_cv(
    db: Session,
    cv: CV,
    *,
    content: str,
    source_url: Optional[str] = None,
    title: Optional[str] = None,
    company: Optional[str] = None,
    location: Optional[str] = None,
) -> JobDescription:
    jd = JobDescription(
        cv_id=cv.id,
        content=content,
        source_url=source_url,
        title=title,
        company=company,
        location=location,
    )
    db.add(jd)
    db.commit()
    db.refresh(jd)
    return jd


def list_job_descriptions_for_cv(db: Session, cv: CV) -> List[JobDescription]:
    return db.query(JobDescription).filter(JobDescription.cv_id == cv.id).all()


def get_job_description_owned_by(db: Session, jd_id: str, user_id: str) -> Optional[JobDescription]:
    return (
        db.query(JobDescription)
        .join(CV)
        .filter(JobDescription.id == jd_id, CV.user_id == user_id)
        .first()
    )


def get_job_description_for_cv(db: Session, jd_id: str, cv_id: str) -> Optional[JobDescription]:
    return db.query(JobDescription).filter(JobDescription.id == jd_id, JobDescription.cv_id == cv_id).first()


def delete_job_description_owned_by(db: Session, jd_id: str, user_id: str) -> bool:
    jd = get_job_description_owned_by(db, jd_id, user_id)
    if not jd:
        return False
    db.delete(jd)
    db.commit()
    return True

