"""
CV service for managing CV data and database operations.

This module provides functions for CRUD operations on CV records:
- CV creation, retrieval, updates, and deletion
- User-specific CV filtering and pagination
- Database transaction management
"""

import json
import re
from copy import deepcopy
from typing import List, Optional

from sqlalchemy.orm import Session

from src.constants import DEFAULT_PARSED_CV
from src.models.cv import CV
from src.models.cv_history import CVHistory
from src.models.user import User
from src.utils.feature_flags import is_cv_history_enabled


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


def rename_cv(db: Session, cv_id: str, user_id: str, new_title: str) -> Optional[CV]:
    """
    Update a CV's display name (original_filename). Returns the updated CV or None if not found.
    """
    cv = get_cv_by_id(db, cv_id, user_id)
    if not cv:
        return None
    cv.original_filename = new_title.strip()
    db.commit()
    db.refresh(cv)
    return cv


def duplicate_cv_for_user(db: Session, cv_id: str, user_id: str) -> Optional[CV]:
    """
    Duplicate a CV for the user. Copies parsed data and optionally creates an initial
    history entry. Returns the new CV or None if the original is not found.
    """
    original = get_cv_by_id(db, cv_id, user_id)
    if not original:
        return None

    duplicated_parsed_data = (
        deepcopy(original.parsed_data)
        if original.parsed_data
        else deepcopy(DEFAULT_PARSED_CV)
    )

    original_name = original.original_filename
    if original_name.endswith(".pdf"):
        base_name = original_name[:-4]
        new_filename = f"{base_name} - Copy.pdf"
    else:
        new_filename = f"{original_name} - Copy"

    new_cv = create_cv(
        db=db,
        user_id=user_id,
        original_filename=new_filename,
        file_path="",
        file_size=0,
        file_type=original.file_type,
        parsed_data=duplicated_parsed_data,
        is_parsed=True,
    )

    if is_cv_history_enabled():
        data_size = len(json.dumps(duplicated_parsed_data).encode("utf-8"))
        initial_entry = CVHistory(
            cv_id=str(new_cv.id),
            user_id=user_id,
            cv_data=duplicated_parsed_data,
            change_type="initial_load",
            description="Duplicated from original CV",
            label="Initial CV (Copy)",
            is_automatic=True,
            is_initial=True,
            data_size=data_size,
        )
        db.add(initial_entry)
        db.commit()

    return new_cv
