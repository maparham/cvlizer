"""
CV CRUD API Endpoints

This module handles all CRUD operations for CVs including:

API error conventions: use HTTPException with detail as a string for simple errors,
or detail as a dict with key "detail" (summary message) and optional "errors" (list)
for validation/compound errors.
- Listing CVs with pagination
- Getting template metadata
- Getting individual CVs
- Updating CV data
- Creating blank CVs
- Updating CV titles
- Downloading original CV files
- Duplicating CVs
- Deleting CVs
"""

from copy import deepcopy
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from fastapi.responses import FileResponse
from pydantic import BaseModel, ValidationError
from sqlalchemy.orm import Session

from src.constants import DEFAULT_PARSED_CV
from src.middleware.clerk_auth import get_effective_user_lightweight
from src.models.base import get_db
from src.models.cv import CV
from src.models.user import User
from src.schemas.cv_schemas import CVUpdateRequestSchema
from src.services.cv_service import (
    create_cv,
    delete_cv,
    duplicate_cv_for_user,
    get_cv_by_id,
    get_cvs_by_user,
    rename_cv,
    update_cv,
)
from src.services.file_service import delete_file
from src.services.template_loader import get_template_metadata
from src.utils.validation import CVDataValidator

from .models import CVListResponse, CVResponse, CVTitleUpdateRequest

router = APIRouter()


@router.get("/", response_model=CVListResponse)
async def list_cvs(
    request: Request,
    page: int = 1,
    limit: int = 100,  # Increased default limit to show more CVs
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user_lightweight),
):
    """Get all CVs for the current user with pagination support"""
    skip = (page - 1) * limit
    cvs = get_cvs_by_user(db, str(current_user.id), skip=skip, limit=limit)

    # Get total count
    total = db.query(CV).filter(CV.user_id == current_user.id).count()
    pages = (total + limit - 1) // limit

    # Don't include parsed_data in list view for performance
    cv_responses = [
        CVResponse(**cv.to_response_dict(include_parsed_data=False)) for cv in cvs
    ]

    return CVListResponse(
        cvs=cv_responses, total=total, page=page, limit=limit, pages=pages
    )


@router.get("/templates")
async def get_templates(
    request: Request = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user_lightweight),
):
    """Get list of available CV templates with metadata."""
    templates = get_template_metadata()
    return {"templates": templates}


@router.get("/{cv_id}", response_model=CVResponse)
async def get_cv(
    cv_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user_lightweight),
):
    """Get a specific CV by ID"""
    cv = get_cv_by_id(db, cv_id, str(current_user.id))
    if not cv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")

    return CVResponse(**cv.to_response_dict())


@router.put("/{cv_id}", response_model=CVResponse)
async def update_cv_data(
    cv_id: str,
    cv_update: CVUpdateRequestSchema,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user_lightweight),
):
    """Update CV parsed data with comprehensive validation"""
    try:
        # Validate the data using our schema
        validated_data = cv_update.parsed_data.dict()

        # Clean empty entries before validation
        cleaned_data = CVDataValidator.clean_empty_entries(validated_data)

        # Additional business logic validation
        validation_errors = CVDataValidator.validate_business_rules(cleaned_data)
        if validation_errors:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "detail": "CV data validation failed",
                    "errors": validation_errors,
                },
            )

        cv = update_cv(db, cv_id, str(current_user.id), cleaned_data)
        if not cv:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="CV not found"
            )

        return CVResponse(**cv.to_response_dict())

    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"detail": "Invalid CV data format", "errors": e.errors()},
        )


@router.post("/create-blank", response_model=CVResponse)
async def create_blank_cv(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user_lightweight),
):
    """Create a new blank CV from scratch without file upload"""
    try:
        # Create CV record with default parsed data structure (deep copy)
        default_parsed_data = deepcopy(DEFAULT_PARSED_CV)

        # Use fixed base name; get_unique_filename_for_user (in create_cv) appends
        # (1), (2), ... only when "New CV.pdf" already exists.
        default_filename = "New CV.pdf"

        cv = create_cv(
            db=db,
            user_id=str(current_user.id),
            original_filename=default_filename,
            file_path="",  # No file path for blank CVs
            file_size=0,  # No file size for blank CVs
            file_type="application/pdf",  # Default to PDF
            parsed_data=default_parsed_data,
            is_parsed=True,  # Already "parsed" since we're creating from scratch
        )

        return CVResponse(**cv.to_response_dict())

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating blank CV: {str(e)}",
        )


@router.put("/{cv_id}/title", response_model=CVResponse)
async def update_cv_title(
    cv_id: str,
    title_request: CVTitleUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user_lightweight),
):
    """Update CV title (original_filename)"""
    cv = get_cv_by_id(db, cv_id, str(current_user.id))
    if not cv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")
    try:
        cv = rename_cv(db, cv_id, str(current_user.id), title_request.title)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error updating CV title",
        )
    return CVResponse(**cv.to_response_dict())


@router.get("/{cv_id}/download")
async def download_cv_file(
    cv_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user_lightweight),
):
    """Download the original CV file"""
    import os

    # Get CV to verify ownership and get file path
    cv = get_cv_by_id(db, cv_id, str(current_user.id))
    if not cv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")

    # Check if CV has a file (not created from scratch)
    if not cv.file_path or cv.file_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This CV was created from scratch and has no original file to download",
        )

    # Check if file exists on disk
    if not os.path.exists(cv.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Original file not found on server",
        )

    # Return the file
    return FileResponse(
        path=cv.file_path, filename=cv.original_filename, media_type=cv.file_type
    )


@router.post("/{cv_id}/duplicate", response_model=CVResponse)
async def duplicate_cv(
    cv_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user_lightweight),
):
    """Duplicate a CV - copies content but not version history"""
    if not get_cv_by_id(db, cv_id, str(current_user.id)):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")
    try:
        new_cv = duplicate_cv_for_user(db, cv_id, str(current_user.id))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error duplicating CV",
        )
    if not new_cv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")
    return CVResponse(**new_cv.to_response_dict())


@router.delete("/{cv_id}")
async def delete_cv_data(
    cv_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user_lightweight),
):
    """Delete a CV"""
    # Get CV to find file path
    cv = get_cv_by_id(db, cv_id, str(current_user.id))
    if not cv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")

    # Delete file from disk
    delete_file(cv.file_path)

    # Delete from database
    success = delete_cv(db, cv_id, str(current_user.id))
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete CV",
        )

    return {"message": "CV deleted successfully"}
