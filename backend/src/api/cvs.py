"""
CV Management API - File Upload, Parsing, and Data Management

This module provides comprehensive API endpoints for CV file management including
upload, background parsing, CRUD operations, and data export. It handles file
processing workflows, AI-powered content extraction, and secure data management
with proper HTML escaping and user isolation.

Key responsibilities:
- Handle CV file uploads with validation and storage
- Manage background parsing workflows with OpenAI integration
- Provide CRUD operations for CV data with user ownership validation
- Support PDF export via LaTeX compilation for CV documents
- Handle CV history tracking and version management
- Manage temporary CV creation and validation workflows

Usage context:
- Used by frontend CV management interfaces
- Integrates with AI services for content parsing
- Provides secure data access with user authentication
- Handles complex file processing and export workflows

Dependencies:
- FastAPI for REST endpoint management
- SQLAlchemy for database operations
- OpenAI API for AI-powered content parsing
- File management utilities for upload handling
- LaTeX export services for PDF document generation
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, ValidationError, Field
import uuid
import asyncio
import os
import logging
from concurrent.futures import ThreadPoolExecutor

from src.models.base import get_db, SessionLocal
from src.models.user import User
from src.models.cv import CV
from src.services.cv_service import (
    create_cv, get_cv_by_id, get_cvs_by_user, update_cv, delete_cv
)
from src.services.cv_parsing_service import parse_cv_with_openai
from src.services.file_service import validate_file, save_uploaded_file, delete_file
from src.constants import DEFAULT_PARSED_CV
from copy import deepcopy
from src.schemas.cv_schemas import CVUpdateRequestSchema, CVDataSchema
from src.utils.validation import CVDataValidator
from src.middleware.clerk_auth import get_effective_user
from src.services.latex_export_service import generate_cv_latex, compile_pdf_from_latex, is_latex_available

router = APIRouter(prefix="/api/cvs", tags=["cvs"])

# Thread pool for background parsing (configurable)
_workers = int(os.getenv("CV_PARSE_WORKERS", "2"))
executor = ThreadPoolExecutor(max_workers=max(1, _workers))

# Logger for background task monitoring
logger = logging.getLogger(__name__)





def parse_cv_sync(cv_id: str, file_content: bytes, filename: str, content_type: str):
    """
    Synchronous CV parsing function to run in thread pool.
    
    CRITICAL: This runs in a background thread, so it must manage its own
    database session and ensure cleanup to prevent connection pool exhaustion.
    The session must be closed in a finally block to guarantee the connection
    is returned to the pool even if exceptions occur.
    """
    db = SessionLocal()
    try:
        # Parse CV content (run async function in sync context)
        parsed_data = asyncio.run(parse_cv_with_openai(file_content, filename, content_type))
        
        # Update CV record with parsed data
        cv = db.query(CV).filter(CV.id == cv_id).first()
        if cv:
            cv.parsed_data = parsed_data
            cv.is_parsed = True
            if parsed_data.get('error'):
                cv.parse_error = parsed_data['error']
            db.commit()
            db.refresh(cv)
            
            # Create initial history entry after successful parsing
            if not parsed_data.get('error'):
                from src.models.cv_history import CVHistory
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
        
    except Exception as e:
        # Rollback failed transaction to prevent connection issues
        db.rollback()
        logger.error(f"Background parsing failed for CV {cv_id}: {str(e)}")
        
        # Try to update CV with error message (using same session after rollback)
        try:
            cv = db.query(CV).filter(CV.id == cv_id).first()
            if cv:
                cv.parse_error = f"Background parsing failed: {str(e)}"
                db.commit()
        except Exception as update_error:
            logger.error(f"Failed to update CV error status for CV {cv_id}: {update_error}")
    
    finally:
        # Always close the session to return connection to pool
        try:
            db.close()
            logger.debug(f"Database session closed for CV {cv_id} background parsing")
        except Exception as close_error:
            logger.error(f"Failed to close database session for CV {cv_id}: {close_error}")

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
    current_user: User = Depends(get_effective_user)
):
    """Upload a CV file and start background parsing"""
    # Validate file
    is_valid, error_message = await validate_file(file)
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
    limit: int = 100,  # Increased default limit to show more CVs
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user)
):
    """Get all CVs for the current user with pagination support"""
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
    current_user: User = Depends(get_effective_user)
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
    current_user: User = Depends(get_effective_user)
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
    current_user: User = Depends(get_effective_user)
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
    current_user: User = Depends(get_effective_user)
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
    current_user: User = Depends(get_effective_user)
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
    current_user: User = Depends(get_effective_user)
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
        from src.models.cv_history import CVHistory
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
    current_user: User = Depends(get_effective_user)
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




@router.get("/{cv_id}/export/pdf")
async def export_cv_pdf(
    cv_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user)
):
    """Export CV as PDF via LaTeX (pdflatex)."""
    cv = get_cv_by_id(db, cv_id, str(current_user.id))
    if not cv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")
    if not is_latex_available():
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="LaTeX toolchain (pdflatex) not available on server")
    try:
        tex_source = generate_cv_latex(cv.parsed_data or {}, cv.original_filename or "My CV")
        pdf_bytes = compile_pdf_from_latex(tex_source)
        filename = (cv.original_filename or "cv").rsplit(".", 1)[0] + ".pdf"
        headers = {"Content-Disposition": f"inline; filename=\"{filename}\""}
        return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to generate PDF: {str(e)}")
