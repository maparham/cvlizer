"""
CV service for managing CV data and database operations.

This module provides functions for CRUD operations on CV records:
- CV creation, retrieval, updates, and deletion
- User-specific CV filtering and pagination
- Database transaction management
"""

import re
from typing import List, Optional

from sqlalchemy.orm import Session

from src.models.cv import CV
from src.models.user import User


def get_unique_filename_for_user(
    db: Session, user_id: str, proposed_filename: str
) -> str:
    """
    Return a filename unique among the user's CVs by appending an incremental
    index when the proposed name already exists (e.g. "CV.pdf" -> "CV (1).pdf").
    """
    if not proposed_filename or not proposed_filename.strip():
        proposed_filename = "CV.pdf"

    existing = {
        row[0]
        for row in db.query(CV.original_filename).filter(CV.user_id == user_id).all()
    }

    if proposed_filename not in existing:
        return proposed_filename

    # Split stem and extension (e.g. "CV_Mahan_Parham.pdf" -> stem, ".pdf")
    if "." in proposed_filename and not proposed_filename.startswith("."):
        stem, ext = proposed_filename.rsplit(".", 1)
        ext = "." + ext
    else:
        stem = proposed_filename
        ext = ""

    # Strip existing " (n)" suffix to get base stem for incremental naming
    match = re.match(r"^(.+)\s+\((\d+)\)\s*$", stem)
    base_stem = match.group(1) if match else stem

    for i in range(1, 1000):
        candidate = f"{base_stem} ({i}){ext}"
        if candidate not in existing:
            return candidate

    # Fallback (should never hit in practice)
    return f"{base_stem} (copy){ext}"


def create_cv(
    db: Session,
    user_id: str,
    original_filename: str,
    file_path: str,
    file_size: int,
    file_type: str,
    parsed_data: dict,
    is_parsed: bool = True,
) -> CV:
    """Create a new CV record with a unique display name for the user."""
    unique_filename = get_unique_filename_for_user(db, user_id, original_filename.strip())
    cv = CV(
        user_id=user_id,
        original_filename=unique_filename,
        file_path=file_path,
        file_size=file_size,
        file_type=file_type,
        parsed_data=parsed_data,
        is_parsed=is_parsed,
    )
    db.add(cv)
    db.commit()
    db.refresh(cv)
    return cv


def get_cv_by_id(db: Session, cv_id: str, user_id: str) -> Optional[CV]:
    """Get a CV by ID for a specific user"""
    return db.query(CV).filter(CV.id == cv_id, CV.user_id == user_id).first()


def get_cvs_by_user(
    db: Session, user_id: str, skip: int = 0, limit: int = 10
) -> List[CV]:
    """Get all CVs for a user with pagination, ordered by most recently updated first"""
    return (
        db.query(CV)
        .filter(CV.user_id == user_id)
        .order_by(CV.updated_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def update_cv(db: Session, cv_id: str, user_id: str, parsed_data: dict) -> Optional[CV]:
    """Update CV parsed data"""
    cv = get_cv_by_id(db, cv_id, user_id)
    if not cv:
        return None

    cv.parsed_data = parsed_data
    db.commit()
    db.refresh(cv)
    return cv


def delete_cv(db: Session, cv_id: str, user_id: str) -> bool:
    """Delete a CV"""
    cv = get_cv_by_id(db, cv_id, user_id)
    if not cv:
        return False

    db.delete(cv)
    db.commit()
    return True
