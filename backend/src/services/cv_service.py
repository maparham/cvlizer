"""
CV service for managing CV data and database operations.

This module provides functions for CRUD operations on CV records:
- CV creation, retrieval, updates, and deletion
- User-specific CV filtering and pagination
- Database transaction management
"""
from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from src.models.cv import CV
from src.models.user import User
import uuid
import json


def create_cv(db: Session, user_id: str, original_filename: str, file_path: str, 
              file_size: int, file_type: str, parsed_data: dict, is_parsed: bool = True) -> CV:
    """Create a new CV record"""
    cv = CV(
        user_id=user_id,
        original_filename=original_filename,
        file_path=file_path,
        file_size=file_size,
        file_type=file_type,
        parsed_data=parsed_data,
        is_parsed=is_parsed
    )
    db.add(cv)
    db.commit()
    db.refresh(cv)
    return cv


def get_cv_by_id(db: Session, cv_id: str, user_id: str) -> Optional[CV]:
    """Get a CV by ID for a specific user"""
    return db.query(CV).options(joinedload(CV.history)).filter(
        CV.id == cv_id,
        CV.user_id == user_id
    ).first()


def get_cvs_by_user(db: Session, user_id: str, skip: int = 0, limit: int = 10) -> List[CV]:
    """Get all CVs for a user with pagination"""
    return db.query(CV).options(joinedload(CV.history)).filter(
        CV.user_id == user_id
    ).offset(skip).limit(limit).all()


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
