"""
CV management API endpoints for upload, parsing, and CRUD operations.

This module handles CV file uploads, background parsing with OpenAI,
and provides endpoints for managing CV data including listing,
retrieval, updates, and deletion.
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, ValidationError, Field
import uuid
import asyncio
import os
from concurrent.futures import ThreadPoolExecutor

from ..models.base import get_db, SessionLocal
from ..models.user import User
from ..models.cv import CV
from ..services.cv_service import (
    create_cv, get_cv_by_id, get_cvs_by_user, update_cv, delete_cv
)
from ..services.cv_parsing_service import parse_cv_with_openai
from ..services.file_service import validate_file, save_uploaded_file, delete_file
from ..constants import DEFAULT_PARSED_CV
from copy import deepcopy
from ..schemas.cv_schemas import CVUpdateRequestSchema, CVDataSchema
from ..utils.validation import CVDataValidator
from .auth import get_current_user

router = APIRouter(prefix="/api/cvs", tags=["cvs"])

# Thread pool for background parsing
executor = ThreadPoolExecutor(max_workers=2)





def parse_cv_sync(cv_id: str, file_content: bytes, filename: str, content_type: str):
    """Synchronous CV parsing function to run in thread pool"""
    try:
        # Create dedicated database session for background thread
        db = SessionLocal()
        
        # Parse CV content
        parsed_data = parse_cv_with_openai(file_content, filename, content_type)
        
        # Update CV record with parsed data
        cv = db.query(CV).filter(CV.id == cv_id).first()  # Direct query for background task
        if cv:
            cv.parsed_data = parsed_data
            cv.is_parsed = True
            if parsed_data.get('error'):
                cv.parse_error = parsed_data['error']
            db.commit()
            db.refresh(cv)
            
            # Create initial history entry after successful parsing (only if parsing succeeded and no error)
            if not parsed_data.get('error'):
                from ..models.cv_history import CVHistory
                import json
                
                # Check if initial history entry already exists
                existing_initial = db.query(CVHistory).filter(
                    CVHistory.cv_id == cv_id,
                    CVHistory.is_initial == True
                ).first()
                
                if not existing_initial:
                    # Calculate data size
                    data_size = len(json.dumps(parsed_data).encode('utf-8'))
                    
                    # Create initial history entry
                    initial_entry = CVHistory(
                        cv_id=cv_id,
                        user_id=cv.user_id,
                        cv_data=parsed_data,
                        change_type="initial_load",
                        description="Original version",
                        label="Initial CV",
                        is_automatic=True,
                        is_initial=True,
                        data_size=data_size
                    )
                    
                    db.add(initial_entry)
                    db.commit()
        
        db.close()
    except Exception as e:
        # Update CV record with error
        try:
            db = SessionLocal()
            cv = db.query(CV).filter(CV.id == cv_id).first()
            if cv:
                cv.parse_error = f"Background parsing failed: {str(e)}"
                db.commit()
            db.close()
        except Exception as db_error:
            pass

async def parse_cv_background(cv_id: str, file_content: bytes, filename: str, content_type: str):
    """Parse CV in background using thread pool executor"""
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(executor, parse_cv_sync, cv_id, file_content, filename, content_type)


class CVResponse(BaseModel):
    id: str
    user_id: str
    original_filename: str
    file_size: int
    file_type: str
    parsed_data: dict
    is_parsed: bool
    parse_error: Optional[str]
    created_at: str
    updated_at: str
    is_imported: bool
    has_been_edited: bool

    class Config:
        from_attributes = True


class CVListResponse(BaseModel):
    cvs: List[CVResponse]
    total: int
    page: int
    limit: int
    pages: int


# Remove the old CVUpdate class - now using CVUpdateRequestSchema


@router.post("/", response_model=CVResponse)
async def upload_cv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload a CV file and start background parsing"""
    # Validate file
    is_valid, error_message = validate_file(file)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_message
        )
    
    try:
        # Read file content first
        file_content = await file.read()
        
        # Save file using the content we already read (avoid double-read)
        file_path, filename, file_size = await save_uploaded_file(file, content=file_content)
        
        # Create CV record immediately with empty parsed data structure (deep copy)
        empty_parsed_data = deepcopy(DEFAULT_PARSED_CV)
        
        cv = create_cv(
            db=db,
            user_id=str(current_user.id),
            original_filename=file.filename,
            file_path=file_path,
            file_size=file_size,
            file_type=file.content_type,
            parsed_data=empty_parsed_data,
            is_parsed=False  # Not parsed yet
        )
        
        # Start background parsing
        # Small delay to ensure CV is committed to database
        await asyncio.sleep(0.1)
        asyncio.create_task(parse_cv_background(
            str(cv.id), 
            file_content, 
            file.filename, 
            file.content_type
        ))
        
        return CVResponse(**cv.to_response_dict())
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing CV: {str(e)}"
        )


@router.get("/", response_model=CVListResponse)
async def list_cvs(
    page: int = 1,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all CVs for the current user"""
    skip = (page - 1) * limit
    cvs = get_cvs_by_user(db, str(current_user.id), skip=skip, limit=limit)
    
    # Get total count
    total = db.query(CV).filter(CV.user_id == current_user.id).count()
    pages = (total + limit - 1) // limit
    
    cv_responses = [CVResponse(**cv.to_response_dict()) for cv in cvs]
    
    
    return CVListResponse(
        cvs=cv_responses,
        total=total,
        page=page,
        limit=limit,
        pages=pages
    )


@router.get("/{cv_id}", response_model=CVResponse)
async def get_cv(
    cv_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific CV by ID"""
    cv = get_cv_by_id(db, cv_id, str(current_user.id))
    if not cv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CV not found"
        )
    
    
    return CVResponse(**cv.to_response_dict())


@router.put("/{cv_id}", response_model=CVResponse)
async def update_cv_data(
    cv_id: str,
    cv_update: CVUpdateRequestSchema,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
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
                    "message": "CV data validation failed",
                    "errors": validation_errors
                }
            )
        
        cv = update_cv(db, cv_id, str(current_user.id), cleaned_data)
        if not cv:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="CV not found"
            )
        
        return CVResponse(**cv.to_response_dict())
        
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "message": "Invalid CV data format",
                "errors": e.errors()
            }
        )


@router.post("/create-blank", response_model=CVResponse)
async def create_blank_cv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new blank CV from scratch without file upload"""
    try:
        # Create CV record with default parsed data structure (deep copy)
        default_parsed_data = deepcopy(DEFAULT_PARSED_CV)
        
        # Generate a default filename
        cv_count = db.query(CV).filter(CV.user_id == current_user.id).count()
        default_filename = f"New CV {cv_count + 1}.pdf"
        
        cv = create_cv(
            db=db,
            user_id=str(current_user.id),
            original_filename=default_filename,
            file_path="",  # No file path for blank CVs
            file_size=0,   # No file size for blank CVs
            file_type="application/pdf",  # Default to PDF
            parsed_data=default_parsed_data,
            is_parsed=True  # Already "parsed" since we're creating from scratch
        )
        
        return CVResponse(**cv.to_response_dict())
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating blank CV: {str(e)}"
        )


class CVTitleUpdateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255, description="New CV title")


@router.put("/{cv_id}/title", response_model=CVResponse)
async def update_cv_title(
    cv_id: str,
    title_request: CVTitleUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update CV title (original_filename)"""
    # Get CV to verify ownership
    cv = get_cv_by_id(db, cv_id, str(current_user.id))
    if not cv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CV not found"
        )
    
    # Update the original_filename
    cv.original_filename = title_request.title.strip()
    db.commit()
    db.refresh(cv)
    
    return CVResponse(**cv.to_response_dict())


@router.get("/{cv_id}/download")
async def download_cv_file(
    cv_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Download the original CV file"""
    # Get CV to verify ownership and get file path
    cv = get_cv_by_id(db, cv_id, str(current_user.id))
    if not cv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CV not found"
        )
    
    # Check if CV has a file (not created from scratch)
    if not cv.file_path or cv.file_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This CV was created from scratch and has no original file to download"
        )
    
    # Check if file exists on disk
    if not os.path.exists(cv.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Original file not found on server"
        )
    
    # Return the file
    return FileResponse(
        path=cv.file_path,
        filename=cv.original_filename,
        media_type=cv.file_type
    )


@router.post("/{cv_id}/duplicate", response_model=CVResponse)
async def duplicate_cv(
    cv_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Duplicate a CV - copies content but not version history"""
    # Get the original CV
    original_cv = get_cv_by_id(db, cv_id, str(current_user.id))
    if not original_cv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CV not found"
        )
    
    try:
        # Create a deep copy of the parsed data (excluding history)
        duplicated_parsed_data = deepcopy(original_cv.parsed_data) if original_cv.parsed_data else deepcopy(DEFAULT_PARSED_CV)
        
        # Generate a new filename with "Copy" suffix
        original_name = original_cv.original_filename
        if original_name.endswith('.pdf'):
            base_name = original_name[:-4]  # Remove .pdf extension
            new_filename = f"{base_name} - Copy.pdf"
        else:
            new_filename = f"{original_name} - Copy"
        
        # Create the new CV with duplicated content
        new_cv = create_cv(
            db=db,
            user_id=str(current_user.id),
            original_filename=new_filename,
            file_path="",  # No file path for duplicated CVs (they're not file-based)
            file_size=0,   # No file size for duplicated CVs
            file_type=original_cv.file_type,
            parsed_data=duplicated_parsed_data,
            is_parsed=True  # Already "parsed" since we're copying existing data
        )
        
        # Create initial history entry for the duplicated CV
        from ..models.cv_history import CVHistory
        import json
        
        # Calculate data size
        data_size = len(json.dumps(duplicated_parsed_data).encode('utf-8'))
        
        # Create initial history entry
        initial_entry = CVHistory(
            cv_id=str(new_cv.id),
            user_id=str(current_user.id),
            cv_data=duplicated_parsed_data,
            change_type="initial_load",
            description="Duplicated from original CV",
            label="Initial CV (Copy)",
            is_automatic=True,
            is_initial=True,
            data_size=data_size
        )
        
        db.add(initial_entry)
        db.commit()
        
        return CVResponse(**new_cv.to_response_dict())
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error duplicating CV: {str(e)}"
        )


@router.delete("/{cv_id}")
async def delete_cv_data(
    cv_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a CV"""
    # Get CV to find file path
    cv = get_cv_by_id(db, cv_id, str(current_user.id))
    if not cv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CV not found"
        )
    
    # Delete file from disk
    delete_file(cv.file_path)
    
    # Delete from database
    success = delete_cv(db, cv_id, str(current_user.id))
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete CV"
        )
    
    return {"message": "CV deleted successfully"}
