"""
Job Description Service - Job Description Management and Ownership Validation

This module provides comprehensive job description management services including
creation, retrieval, deletion, ownership validation, and CV association management.
It ensures proper data isolation between users and maintains referential integrity
with CV records through a many-to-many relationship.

Key responsibilities:
- Validate CV ownership before job description operations
- Create job descriptions with proper UUID handling and data validation
- Retrieve job descriptions scoped to authenticated users
- Delete job descriptions with ownership verification
- Manage many-to-many associations between CVs and job descriptions
- Maintain referential integrity between CVs and job descriptions

Usage context:
- Used by job description API endpoints for CRUD operations
- Ensures data isolation and security through ownership validation
- Handles UUID type conversion for database operations
- Provides consistent error handling and validation

Dependencies:
- SQLAlchemy ORM for database operations
- CV, JobDescription, and CVJobDescription models for data persistence
- UUID handling for proper database type management
"""

from datetime import datetime
from typing import List, Optional, cast

from sqlalchemy.orm import Session, joinedload

from src.models.cv import CV
from src.models.cv_job_description import CVJobDescription
from src.models.job_description import JobDescription
from src.services.cv_service import get_cv_by_id

_UNSET = object()


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
        user_id=cv.user_id,
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
    return (
        db.query(JobDescription)
        .filter(JobDescription.cv_id == cv.id, JobDescription.hidden == False)
        .all()
    )


def get_job_description_owned_by(
    db: Session, jd_id: str, user_id: str
) -> Optional[JobDescription]:
    return (
        db.query(JobDescription)
        .filter(JobDescription.id == jd_id, JobDescription.user_id == user_id)
        .first()
    )


def get_job_description_for_cv(
    db: Session, jd_id: str, cv_id: str
) -> Optional[JobDescription]:
    return (
        db.query(JobDescription)
        .filter(JobDescription.id == jd_id, JobDescription.cv_id == cv_id)
        .first()
    )


def delete_job_description_owned_by(db: Session, jd_id: str, user_id: str) -> bool:
    jd = get_job_description_owned_by(db, jd_id, user_id)
    if not jd:
        return False
    db.delete(jd)
    db.commit()
    return True


def create_job_description_for_user(
    db: Session,
    user_id: str,
    cv_id: str,
    *,
    content: str,
    source_url: Optional[str] = None,
    title: Optional[str] = None,
    company: Optional[str] = None,
    location: Optional[str] = None,
) -> JobDescription:
    """Create a job description for a specific CV"""
    jd = JobDescription(
        user_id=user_id,
        cv_id=cv_id,  # Bind to specific CV
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


def list_job_descriptions_for_user(
    db: Session, user_id: str, cv_id: str
) -> List[JobDescription]:
    """Get all job descriptions for a specific CV"""
    return (
        db.query(JobDescription)
        .filter(
            JobDescription.user_id == user_id,
            JobDescription.cv_id == cv_id,
            JobDescription.hidden == False,
        )
        .all()
    )


def get_job_description_by_id(
    db: Session, jd_id: str, user_id: str
) -> Optional[JobDescription]:
    """Get a job description by ID (for user-scoped operations)"""
    return (
        db.query(JobDescription)
        .filter(JobDescription.id == jd_id, JobDescription.user_id == user_id)
        .first()
    )


def hide_job_description_owned_by(db: Session, jd_id: str, user_id: str) -> bool:
    """Hide a job description (soft delete) for a specific user"""
    jd = get_job_description_owned_by(db, jd_id, user_id)
    if not jd:
        return False
    jd.hidden = True
    db.commit()
    return True


def update_job_description_owned_by(
    db: Session,
    jd_id: str,
    user_id: str,
    *,
    content: Optional[str] = None,
    title: Optional[str] = None,
    company: Optional[str] = None,
    location: Optional[str] = None,
    status: Optional[str] = None,
    application_date: Optional[datetime] | object = _UNSET,
    notes: Optional[str] = None,
) -> Optional[JobDescription]:
    """Update a job description owned by a specific user"""
    jd = get_job_description_owned_by(db, jd_id, user_id)
    if not jd:
        return None

    # Update only provided fields
    if content is not None:
        jd.content = content
    if title is not None:
        jd.title = title
    if company is not None:
        jd.company = company
    if location is not None:
        jd.location = location
    if status is not None:
        jd.status = status
    if application_date is not _UNSET:
        jd.application_date = cast(Optional[datetime], application_date)
    if notes is not None:
        jd.notes = notes

    db.commit()
    db.refresh(jd)
    return jd


# New user-scoped functions for many-to-many relationships


def list_all_job_descriptions_for_user(
    db: Session, user_id: str, include_cv_ids: bool = True
) -> List[JobDescription]:
    """
    Get all job descriptions for a user (not filtered by CV).

    Args:
        db: Database session
        user_id: User ID
        include_cv_ids: If True, eagerly load CV associations

    Returns:
        List of job descriptions owned by the user
    """
    query = db.query(JobDescription).filter(
        JobDescription.user_id == user_id,
        JobDescription.hidden == False,
    )

    if include_cv_ids:
        query = query.options(joinedload(JobDescription.cv_associations))

    return query.all()


def create_job_description_for_user_with_cvs(
    db: Session,
    user_id: str,
    cv_ids: Optional[List[str]] = None,
    *,
    content: str,
    source_url: Optional[str] = None,
    title: Optional[str] = None,
    company: Optional[str] = None,
    location: Optional[str] = None,
    status: Optional[str] = "open",
    application_date: Optional[datetime] = None,
    notes: Optional[str] = None,
) -> JobDescription:
    """
    Create a job description for a user and optionally associate with CVs.

    Args:
        db: Database session
        user_id: User ID
        cv_ids: Optional list of CV IDs to associate with
        content: Job description content
        source_url: Optional source URL
        title: Optional job title
        company: Optional company name
        location: Optional location
        status: Status of the job description (default: "open")
        application_date: Optional application date
        notes: Optional notes

    Returns:
        Created JobDescription instance
    """
    # Set cv_id to the first CV if provided (for tracking original creator)
    original_cv_id = cv_ids[0] if cv_ids and len(cv_ids) > 0 else None

    jd = JobDescription(
        user_id=user_id,
        cv_id=original_cv_id,  # Track which CV originally created this JD
        content=content,
        source_url=source_url,
        title=title,
        company=company,
        location=location,
        status=status or "open",
        application_date=application_date,
        notes=notes,
    )
    db.add(jd)
    db.flush()  # Get the ID without committing

    # Create associations for all specified CVs
    if cv_ids:
        for cv_id in cv_ids:
            # Verify CV belongs to user before creating association
            cv = get_cv_by_id(db, cv_id, user_id)
            if cv:
                association = CVJobDescription(cv_id=cv_id, job_description_id=jd.id)
                db.add(association)

    db.commit()
    db.refresh(jd)
    return jd


def associate_jd_with_cv(db: Session, jd_id: str, cv_id: str, user_id: str) -> bool:
    """
    Associate a job description with a CV.

    Args:
        db: Database session
        jd_id: Job description ID
        cv_id: CV ID
        user_id: User ID (for ownership validation)

    Returns:
        True if association created, False if failed
    """
    # Verify JD belongs to user
    jd = get_job_description_owned_by(db, jd_id, user_id)
    if not jd:
        return False

    # Verify CV belongs to user
    cv = get_cv_by_id(db, cv_id, user_id)
    if not cv:
        return False

    # Check if association already exists
    existing = (
        db.query(CVJobDescription)
        .filter(
            CVJobDescription.cv_id == cv_id, CVJobDescription.job_description_id == jd_id
        )
        .first()
    )

    if existing:
        return True  # Already associated

    # Create association
    association = CVJobDescription(cv_id=cv_id, job_description_id=jd_id)
    db.add(association)
    db.commit()
    return True


def disassociate_jd_from_cv(db: Session, jd_id: str, cv_id: str, user_id: str) -> bool:
    """
    Remove association between a job description and a CV.

    Args:
        db: Database session
        jd_id: Job description ID
        cv_id: CV ID
        user_id: User ID (for ownership validation)

    Returns:
        True if association removed, False if not found
    """
    # Verify JD belongs to user
    jd = get_job_description_owned_by(db, jd_id, user_id)
    if not jd:
        return False

    # Verify CV belongs to user
    cv = get_cv_by_id(db, cv_id, user_id)
    if not cv:
        return False

    # Find and delete association
    association = (
        db.query(CVJobDescription)
        .filter(
            CVJobDescription.cv_id == cv_id, CVJobDescription.job_description_id == jd_id
        )
        .first()
    )

    if not association:
        return False

    db.delete(association)
    db.commit()
    return True


def get_cv_ids_for_job_description(db: Session, jd_id: str, user_id: str) -> List[str]:
    """
    Get list of CV IDs associated with a job description.

    Args:
        db: Database session
        jd_id: Job description ID
        user_id: User ID (for ownership validation)

    Returns:
        List of CV IDs associated with the job description
    """
    # Verify JD belongs to user
    jd = get_job_description_owned_by(db, jd_id, user_id)
    if not jd:
        return []

    associations = (
        db.query(CVJobDescription.cv_id)
        .filter(CVJobDescription.job_description_id == jd_id)
        .all()
    )

    return [str(assoc.cv_id) for assoc in associations]


def get_job_descriptions_for_cv_with_associations(
    db: Session, cv_id: str, user_id: str
) -> List[JobDescription]:
    """
    Get all job descriptions associated with a specific CV.
    This returns JDs that are explicitly associated via the junction table.

    Args:
        db: Database session
        cv_id: CV ID
        user_id: User ID (for ownership validation)

    Returns:
        List of job descriptions associated with the CV
    """
    # Verify CV belongs to user
    cv = get_cv_by_id(db, cv_id, user_id)
    if not cv:
        return []

    # Get JDs through junction table
    jds = (
        db.query(JobDescription)
        .join(CVJobDescription, JobDescription.id == CVJobDescription.job_description_id)
        .filter(
            CVJobDescription.cv_id == cv_id,
            JobDescription.user_id == user_id,
            JobDescription.hidden == False,
        )
        .options(joinedload(JobDescription.cv_associations))
        .all()
    )

    return jds
