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

import asyncio
import logging
import os
import re
from datetime import datetime
from pathlib import Path
import uuid
from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy
from typing import List, Optional

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
    status,
    Request,
    Query,
)
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel, Field, ValidationError
from sqlalchemy.orm import Session

from src.constants import DEFAULT_PARSED_CV
from src.config import APIConfig
from src.utils.rate_limit import create_combined_limiter
from src.middleware.clerk_auth import get_effective_user, get_effective_user_lightweight
from src.middleware.clerk_auth import verify_clerk_token
from src.models.base import SessionLocal, get_db
from src.models.cv import CV
from src.models.user import User
from src.schemas.cv_schemas import CVDataSchema, CVUpdateRequestSchema
from src.services.cv_parsing_service import parse_cv_with_openai
from src.services.cv_service import (
    create_cv,
    delete_cv,
    get_cv_by_id,
    get_cvs_by_user,
    update_cv,
)
from src.services.file_service import delete_file, save_uploaded_file, validate_file
from src.services.latex_export_service import (
    compile_pdf_from_latex,
    generate_cv_latex,
    is_latex_available,
)
from src.services.user_activity_service import log_user_activity, log_api_call
from src.services.template_loader import get_template_metadata, is_template_available
from src.services.preview_service import generate_blurred_preview, is_preview_available
from src.utils.feature_flags import is_cv_history_enabled
from src.utils.validation import CVDataValidator

router = APIRouter(prefix="/api/cvs", tags=["cvs"])
limiter = create_combined_limiter()

# Thread pool for background parsing (configurable)
_workers = int(os.getenv("CV_PARSE_WORKERS", "2"))
executor = ThreadPoolExecutor(max_workers=max(1, _workers))

# Logger for background task monitoring
logger = logging.getLogger(__name__)

# In-memory job storage for preview generation (simple dict for MVP)
# TODO: Replace with Redis or proper queue for production
_preview_jobs: dict[str, dict] = {}


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
        parsed_data = asyncio.run(
            parse_cv_with_openai(file_content, filename, content_type)
        )

        # Update CV record with parsed data
        cv = db.query(CV).filter(CV.id == cv_id).first()
        if cv:
            cv.parsed_data = parsed_data
            cv.is_parsed = True
            if parsed_data.get("error"):
                cv.parse_error = parsed_data["error"]
            db.commit()
            db.refresh(cv)

            # Create initial history entry after successful parsing (if feature is enabled)
            if not parsed_data.get("error") and is_cv_history_enabled():
                import json

                from src.models.cv_history import CVHistory

                # Check if initial history entry already exists
                existing_initial = (
                    db.query(CVHistory)
                    .filter(CVHistory.cv_id == cv_id, CVHistory.is_initial == True)
                    .first()
                )

                if not existing_initial:
                    # Calculate data size
                    data_size = len(json.dumps(parsed_data).encode("utf-8"))

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
                        data_size=data_size,
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
            logger.error(
                f"Failed to update CV error status for CV {cv_id}: {update_error}"
            )

    finally:
        # Always close the session to return connection to pool
        try:
            db.close()
            logger.debug(f"Database session closed for CV {cv_id} background parsing")
        except Exception as close_error:
            logger.error(
                f"Failed to close database session for CV {cv_id}: {close_error}"
            )


async def parse_cv_background(
    cv_id: str, file_content: bytes, filename: str, content_type: str
):
    """Parse CV in background using thread pool executor"""
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(
        executor, parse_cv_sync, cv_id, file_content, filename, content_type
    )


class CVResponse(BaseModel):
    id: str
    user_id: str
    original_filename: str
    file_size: int
    file_type: str
    parsed_data: Optional[dict] = None  # Optional for list views
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
@limiter.limit(APIConfig.AI_PARSING_RATE_LIMIT)
async def upload_cv(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user_lightweight),
):
    """Upload a CV file and start background parsing"""
    # Validate file
    is_valid, error_message = await validate_file(file)
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error_message)

    try:
        # Read file content first
        file_content = await file.read()

        # Save file using the content we already read (avoid double-read)
        file_path, filename, file_size = await save_uploaded_file(
            file, content=file_content
        )

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
            is_parsed=False,  # Not parsed yet
        )

        # Start background parsing
        # Small delay to ensure CV is committed to database
        await asyncio.sleep(0.1)
        asyncio.create_task(
            parse_cv_background(
                str(cv.id), file_content, file.filename, file.content_type
            )
        )

        return CVResponse(**cv.to_response_dict())

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing CV: {str(e)}",
        )


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
                    "message": "CV data validation failed",
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
            detail={"message": "Invalid CV data format", "errors": e.errors()},
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

        # Generate a default filename
        cv_count = db.query(CV).filter(CV.user_id == current_user.id).count()
        default_filename = f"New CV {cv_count + 1}.pdf"

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


class CVTitleUpdateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255, description="New CV title")


@router.put("/{cv_id}/title", response_model=CVResponse)
async def update_cv_title(
    cv_id: str,
    title_request: CVTitleUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user_lightweight),
):
    """Update CV title (original_filename)"""
    # Get CV to verify ownership
    cv = get_cv_by_id(db, cv_id, str(current_user.id))
    if not cv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")

    # Update the original_filename
    cv.original_filename = title_request.title.strip()
    db.commit()
    db.refresh(cv)

    return CVResponse(**cv.to_response_dict())


@router.get("/{cv_id}/download")
async def download_cv_file(
    cv_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user_lightweight),
):
    """Download the original CV file"""
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
    # Get the original CV
    original_cv = get_cv_by_id(db, cv_id, str(current_user.id))
    if not original_cv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")

    try:
        # Create a deep copy of the parsed data (excluding history)
        duplicated_parsed_data = (
            deepcopy(original_cv.parsed_data)
            if original_cv.parsed_data
            else deepcopy(DEFAULT_PARSED_CV)
        )

        # Generate a new filename with "Copy" suffix
        original_name = original_cv.original_filename
        if original_name.endswith(".pdf"):
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
            file_size=0,  # No file size for duplicated CVs
            file_type=original_cv.file_type,
            parsed_data=duplicated_parsed_data,
            is_parsed=True,  # Already "parsed" since we're copying existing data
        )

        # Create initial history entry for the duplicated CV (if feature is enabled)
        if is_cv_history_enabled():
            import json

            from src.models.cv_history import CVHistory

            # Calculate data size
            data_size = len(json.dumps(duplicated_parsed_data).encode("utf-8"))

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
                data_size=data_size,
            )

            db.add(initial_entry)
            db.commit()

        return CVResponse(**new_cv.to_response_dict())

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error duplicating CV: {str(e)}",
        )


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


@router.get("/{cv_id}/export/pdf")
async def export_cv_pdf(
    cv_id: str,
    template: Optional[str] = Query(None, description="Optional template name"),
    request: Request = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user_lightweight),
):
    """Export CV as PDF via LaTeX (pdflatex)."""
    cv = get_cv_by_id(db, cv_id, str(current_user.id))
    if not cv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")

    # Log PDF export
    template_name = (
        template if (template and is_template_available(template)) else "default"
    )
    logger.info(
        f"User {current_user.email} exporting CV {cv_id} ({cv.original_filename}) as PDF with template '{template_name}'"
    )

    # Log user activity
    try:
        log_user_activity(
            db=db,
            user=current_user,
            activity_type="user_action",
            action="export_cv_pdf",
            description=f"Exported CV '{cv.original_filename}' as PDF with template '{template_name}'",
            details={
                "cv_id": cv_id,
                "cv_filename": cv.original_filename,
                "template_name": template_name,
                "export_type": "pdf",
            },
        )
    except Exception as e:
        logger.warning(f"Failed to log user activity for PDF export: {str(e)}")
    if not is_latex_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="LaTeX toolchain (pdflatex) not available on server",
        )
    try:
        # Use specified template or default (None = inline generation)
        template_name = (
            template if (template and is_template_available(template)) else None
        )
        tex_source = generate_cv_latex(
            cv.parsed_data or {},
            cv.original_filename or "My CV",
            template_name=template_name,
        )
        pdf_bytes = compile_pdf_from_latex(tex_source)
        # Build filename: [ownerName]_YYYYMMDD.pdf using parsed full name, fallback to original filename stem
        # Try multiple sources for the name
        personal_info = (cv.parsed_data or {}).get("personal_info") or {}
        full_name = personal_info.get("full_name", "").strip()

        # Check if personal_info exists but full_name is empty
        if personal_info and not full_name:
            # Try alternative field names
            for field in ["name", "fullName", "fullname", "first_name", "last_name"]:
                if field in personal_info and personal_info[field]:
                    full_name = str(personal_info[field]).strip()
                    break

        # If full_name is empty, try to get a meaningful name from other sources
        if not full_name:
            # Try to get name from original filename if it's meaningful
            original_stem = (
                Path(cv.original_filename or "").stem if cv.original_filename else ""
            )
            if original_stem and original_stem.lower() not in [
                "cv",
                "resume",
                "document",
                "new cv",
            ]:
                full_name = original_stem
            else:
                # Try to extract name from CV title if it contains a name
                cv_title = getattr(cv, "title", "") or cv.original_filename or ""
                if cv_title and cv_title.lower() not in [
                    "cv",
                    "resume",
                    "document",
                    "new cv",
                ]:
                    # Try to extract first word as potential name
                    first_word = cv_title.split()[0] if cv_title.split() else ""
                    if first_word and len(first_word) > 2:
                        full_name = first_word
                    else:
                        full_name = "CV"
                else:
                    # Last resort - use a generic name
                    full_name = "CV"

        raw_name = full_name
        safe_name = re.sub(r"[^A-Za-z0-9\-\s]+", " ", raw_name).strip()
        safe_name = re.sub(r"[\s\-]+", "_", safe_name).strip("_") or "CV"
        date_str = datetime.utcnow().strftime("%Y%m%d")
        filename = f"{safe_name}_{date_str}.pdf"

        headers = {
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Type": "application/pdf",
            "Access-Control-Expose-Headers": "Content-Disposition",
        }

        # Log successful API call
        try:
            log_api_call(
                db=db,
                user=current_user,
                endpoint=f"/api/cvs/{cv_id}/export/pdf",
                method="GET",
                status_code=200,
                request_data={"template": template},
                response_data={"filename": filename, "file_size": len(pdf_bytes)},
            )
        except Exception as e:
            logger.warning(f"Failed to log API call for PDF export: {str(e)}")

        return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate PDF: {str(e)}",
        )


@router.get("/{cv_id}/export/latex")
async def export_cv_latex(
    cv_id: str,
    template: Optional[str] = Query(None, description="Optional template name"),
    request: Request = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user_lightweight),
):
    """Export CV as raw LaTeX source code for the selected template."""
    cv = get_cv_by_id(db, cv_id, str(current_user.id))
    if not cv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")

    # Resolve template name; default to an available default template
    try:
        from src.services.template_loader import (
            get_default_template,
            is_template_available,
        )

        # Always resolve to a concrete template name string
        template_name: str
        if template and is_template_available(template):
            template_name = template
        else:
            template_name = get_default_template()

        tex_source = generate_cv_latex(
            cv.parsed_data or {},
            cv.original_filename or "My CV",
            template_name=template_name,  # ensure a valid template is always passed
        )

        # Build filename similar to PDF export
        personal_info = (cv.parsed_data or {}).get("personal_info") or {}
        full_name = (personal_info.get("full_name") or "").strip()

        if personal_info and not full_name:
            for field in ["name", "fullName", "fullname", "first_name", "last_name"]:
                if field in personal_info and personal_info[field]:
                    full_name = str(personal_info[field]).strip()
                    break

        if not full_name:
            original_stem = (
                Path(cv.original_filename or "").stem if cv.original_filename else ""
            )
            if original_stem and original_stem.lower() not in [
                "cv",
                "resume",
                "document",
                "new cv",
            ]:
                full_name = original_stem
            else:
                cv_title = getattr(cv, "title", "") or cv.original_filename or ""
                if cv_title and cv_title.lower() not in [
                    "cv",
                    "resume",
                    "document",
                    "new cv",
                ]:
                    first_word = cv_title.split()[0] if cv_title.split() else ""
                    full_name = first_word if first_word and len(first_word) > 2 else "CV"
                else:
                    full_name = "CV"

        raw_name = full_name
        safe_name = re.sub(r"[^A-Za-z0-9\-\s]+", " ", raw_name).strip()
        safe_name = re.sub(r"[\s\-]+", "_", safe_name).strip("_") or "CV"
        date_str = datetime.utcnow().strftime("%Y%m%d")
        filename = f"{safe_name}_{date_str}.tex"

        headers = {
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Type": "text/plain; charset=utf-8",
            "Access-Control-Expose-Headers": "Content-Disposition",
        }

        # Log API call (best-effort)
        try:
            log_api_call(
                db=db,
                user=current_user,
                endpoint=f"/api/cvs/{cv_id}/export/latex",
                method="GET",
                status_code=200,
                request_data={"template": template},
                response_data={
                    "filename": filename,
                    "size": len(tex_source.encode("utf-8")),
                },
            )
        except Exception:
            pass

        return Response(
            content=tex_source, media_type="text/plain; charset=utf-8", headers=headers
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate LaTeX: {str(e)}",
        )


@router.get("/{cv_id}/export/pdf/public")
async def export_cv_pdf_public(
    cv_id: str,
    request: Request,
    token: str = Query(
        ..., description="Clerk JWT token for auth when opening in new tab"
    ),
    db: Session = Depends(get_db),
):
    """Export CV as PDF via LaTeX (pdflatex) for direct new-tab viewing.

    This endpoint allows opening the PDF directly in a new tab (so the browser
    honors Content-Disposition filename) by accepting a Clerk JWT token via
    query string. The token is verified server-side to authenticate the user.
    """
    # Verify token and resolve user id
    payload = verify_clerk_token(token)
    if not payload or not payload.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized"
        )

    clerk_user_id = str(payload.get("sub"))

    # Sync Clerk user to local database to get local user ID
    from src.services.clerk_sync_service import sync_clerk_user_to_local_db

    local_user = sync_clerk_user_to_local_db(clerk_user_id, payload.get("email", ""), db)
    user_id = str(local_user.id)

    # Fetch CV and verify ownership
    cv = get_cv_by_id(db, cv_id, user_id)
    if not cv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")

    # Log PDF export
    logger.info(
        f"User {local_user.email} exporting CV {cv_id} ({cv.original_filename}) as PDF via public endpoint"
    )

    # Log user activity
    try:
        log_user_activity(
            db=db,
            user=local_user,
            activity_type="user_action",
            action="export_cv_pdf_public",
            description=f"Exported CV '{cv.original_filename}' as PDF via public endpoint",
            details={
                "cv_id": cv_id,
                "cv_filename": cv.original_filename,
                "template_name": "default",
                "export_type": "pdf",
                "endpoint_type": "public",
            },
        )
    except Exception as e:
        logger.warning(f"Failed to log user activity for public PDF export: {str(e)}")

    if not is_latex_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="LaTeX toolchain (pdflatex) not available on server",
        )

    try:
        # Use default template for quick export
        from src.services.template_loader import get_default_template

        default_template = get_default_template()

        tex_source = generate_cv_latex(
            cv.parsed_data or {},
            cv.original_filename or "My CV",
            template_name=default_template,
        )
        pdf_bytes = compile_pdf_from_latex(tex_source)

        # Build filename: [ownerName]_YYYYMMDD.pdf using parsed full name, fallback to original filename stem
        # Try multiple sources for the name
        personal_info = (cv.parsed_data or {}).get("personal_info") or {}
        full_name = personal_info.get("full_name", "").strip()

        # Check if personal_info exists but full_name is empty
        if personal_info and not full_name:
            # Try alternative field names
            for field in ["name", "fullName", "fullname", "first_name", "last_name"]:
                if field in personal_info and personal_info[field]:
                    full_name = str(personal_info[field]).strip()
                    break

        # If full_name is empty, try to get a meaningful name from other sources
        if not full_name:
            # Try to get name from original filename if it's meaningful
            original_stem = (
                Path(cv.original_filename or "").stem if cv.original_filename else ""
            )
            if original_stem and original_stem.lower() not in [
                "cv",
                "resume",
                "document",
                "new cv",
            ]:
                full_name = original_stem
            else:
                # Try to extract name from CV title if it contains a name
                cv_title = getattr(cv, "title", "") or cv.original_filename or ""
                if cv_title and cv_title.lower() not in [
                    "cv",
                    "resume",
                    "document",
                    "new cv",
                ]:
                    # Try to extract first word as potential name
                    first_word = cv_title.split()[0] if cv_title.split() else ""
                    if first_word and len(first_word) > 2:
                        full_name = first_word
                    else:
                        full_name = "CV"
                else:
                    # Last resort - use a generic name
                    full_name = "CV"

        raw_name = full_name
        safe_name = re.sub(r"[^A-Za-z0-9\-\s]+", " ", raw_name).strip()
        safe_name = re.sub(r"[\s\-]+", "_", safe_name).strip("_") or "CV"
        date_str = datetime.utcnow().strftime("%Y%m%d")
        filename = f"{safe_name}_{date_str}.pdf"

        headers = {
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Type": "application/pdf",
            "Access-Control-Expose-Headers": "Content-Disposition",
        }

        # Log successful API call
        try:
            log_api_call(
                db=db,
                user=local_user,
                endpoint=f"/api/cvs/{cv_id}/export/pdf/public",
                method="GET",
                status_code=200,
                request_data={"token": "***"},
                response_data={"filename": filename, "file_size": len(pdf_bytes)},
            )
        except Exception as e:
            logger.warning(f"Failed to log API call for public PDF export: {str(e)}")

        return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate PDF: {str(e)}",
        )


def generate_preview_sync(cv_id: str, template_name: str, user_id: str):
    """Synchronous preview generation function to run in thread pool."""
    db = SessionLocal()
    try:
        cv = get_cv_by_id(db, cv_id, user_id)
        if not cv:
            logger.error(f"CV {cv_id} not found for user {user_id}")
            _preview_jobs[cv_id + "_" + template_name]["status"] = "failed"
            _preview_jobs[cv_id + "_" + template_name]["error"] = "CV not found"
            return

        # Generate LaTeX with selected template
        tex_source = generate_cv_latex(
            cv.parsed_data or {},
            cv.original_filename or "My CV",
            template_name=template_name,
        )

        # Compile LaTeX to PDF
        pdf_bytes = compile_pdf_from_latex(tex_source)

        # Generate blurred preview
        if is_preview_available():
            preview_pages = generate_blurred_preview(pdf_bytes, blur_radius=0)
            if preview_pages:
                _preview_jobs[cv_id + "_" + template_name]["status"] = "completed"
                _preview_jobs[cv_id + "_" + template_name][
                    "preview_images"
                ] = preview_pages  # Store list of images
                _preview_jobs[cv_id + "_" + template_name]["page_count"] = len(
                    preview_pages
                )
            else:
                logger.error("Failed to generate blurred preview - returned None")
                _preview_jobs[cv_id + "_" + template_name]["status"] = "failed"
                _preview_jobs[cv_id + "_" + template_name][
                    "error"
                ] = "Failed to generate preview"
        else:
            logger.warning("Preview service not available, falling back to PDF")
            # Fallback: return PDF if preview service not available
            _preview_jobs[cv_id + "_" + template_name]["status"] = "completed"
            _preview_jobs[cv_id + "_" + template_name]["preview_pdf"] = pdf_bytes
    except Exception as e:
        logger.error(
            f"Preview generation failed for CV {cv_id} template {template_name}: {str(e)}",
            exc_info=True,
        )
        _preview_jobs[cv_id + "_" + template_name]["status"] = "failed"
        _preview_jobs[cv_id + "_" + template_name]["error"] = str(e)
    finally:
        db.close()


@router.post("/{cv_id}/export/preview/start")
async def start_preview_generation(
    cv_id: str,
    template: str = Query(..., description="Template name"),
    request: Request = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user_lightweight),
):
    """Start async preview generation for a template."""

    # Verify CV ownership
    cv = get_cv_by_id(db, cv_id, str(current_user.id))
    if not cv:
        logger.error(f"CV {cv_id} not found for user {current_user.id}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")

    # Verify template exists
    if not is_template_available(template):
        logger.error(f"Template {template} not found")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Template not found"
        )

    # Create job ID
    job_id = f"{cv_id}_{template}"

    # Check if LaTeX is available
    if not is_latex_available():
        logger.error("LaTeX toolchain not available")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="LaTeX toolchain not available",
        )

    # Initialize job status
    _preview_jobs[job_id] = {"status": "pending"}

    # Submit to thread pool
    executor.submit(generate_preview_sync, cv_id, template, str(current_user.id))

    return {"job_id": job_id, "status": "pending"}


@router.get("/{cv_id}/export/preview/status")
async def get_preview_status(
    cv_id: str,
    job_id: str = Query(..., description="Job ID from start endpoint"),
    request: Request = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user_lightweight),
):
    """Get status of preview generation job."""

    # Verify CV ownership
    cv = get_cv_by_id(db, cv_id, str(current_user.id))
    if not cv:
        logger.error(f"CV {cv_id} not found for user {current_user.id}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")

    # Check job status
    if job_id not in _preview_jobs:
        logger.error(f"Job {job_id} not found in _preview_jobs")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    job = _preview_jobs[job_id]

    if job["status"] == "completed":
        has_preview = "preview_images" in job or "preview_pdf" in job
        page_count = job.get("page_count", 1)
        return {
            "status": "completed",
            "has_preview": has_preview,
            "page_count": page_count,
        }
    elif job["status"] == "failed":
        error = job.get("error", "Unknown error")
        logger.error(f"Job {job_id} failed: {error}")
        return {"status": "failed", "error": error}
    else:
        return {"status": "pending"}


@router.get("/{cv_id}/export/preview/image")
async def get_preview_image(
    cv_id: str,
    job_id: str = Query(..., description="Job ID from start endpoint"),
    page: int = Query(1, description="Page number (1-indexed)"),
    request: Request = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user_lightweight),
):
    """Get the blurred preview image for a completed job (specific page)."""

    # Verify CV ownership
    cv = get_cv_by_id(db, cv_id, str(current_user.id))
    if not cv:
        logger.error(f"CV {cv_id} not found for user {current_user.id}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")

    # Check job status
    if job_id not in _preview_jobs:
        logger.error(f"Job {job_id} not found in _preview_jobs")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    job = _preview_jobs[job_id]

    if job["status"] != "completed":
        logger.error(f"Job {job_id} not completed, status: {job['status']}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Job not completed"
        )

    # Return preview image if available
    if "preview_images" in job:
        page_count = len(job["preview_images"])
        if page < 1 or page > page_count:
            logger.error(f"Invalid page number {page}, valid range: 1-{page_count}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid page number, must be 1-{page_count}",
            )

        return Response(content=job["preview_images"][page - 1], media_type="image/png")
    elif "preview_pdf" in job:
        # Fallback to PDF if preview image not available
        return Response(content=job["preview_pdf"], media_type="application/pdf")
    else:
        logger.error(f"No preview available for job {job_id}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No preview available",
        )
