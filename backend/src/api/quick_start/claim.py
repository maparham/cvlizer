"""
Claim endpoint for quick start API.

This module provides the /claim endpoint for authenticated users to save
their quick start preview data to the database. It handles both direct file
uploads and base64 files from session storage.
"""

import base64
import json
import logging
from io import BytesIO
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session
from urllib.parse import urlparse

from src.dependencies.ai_quota import require_ai_quota
from src.middleware.clerk_auth import get_effective_user
from src.models.base import get_db
from src.models.user import User
from src.services.ai_service import extract_job_description_with_ai
from src.services.cv.cv_parsing_service import parse_cv_with_openai
from src.services.cv.cv_service import create_cv
from src.services.platform.file_service import save_uploaded_file, validate_file
from src.services.job_descriptions.job_description_service import (
    create_job_description_for_user_with_cvs,
)
from src.services.job_descriptions.url_parsing_service import (
    _extract_raw_content_with_fallback,
    _is_search_results_page,
)

from .models import QuickStartClaimResponse

logger = logging.getLogger(__name__)

# Create router
router = APIRouter()


@router.post("/claim", response_model=QuickStartClaimResponse)
async def claim_quick_start_data(
    cv_file: Optional[UploadFile] = File(None),
    cv_file_base64: Optional[str] = Form(None),  # Add base64 parameter
    job_url: Optional[str] = Form(None),
    job_text: Optional[str] = Form(None),
    cv_data: Optional[str] = Form(
        None
    ),  # JSON string of CV data from session (includes job preview)
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user),
    _quota: None = Depends(require_ai_quota),
):
    """
    Claim quick start data by creating CV and job description records.

    This endpoint allows authenticated users to save their quick start preview
    data to the database. It creates both a CV record and a job description
    record, linking them together.

    Args:
        cv_file: The CV file to upload and save
        cv_file_base64: Base64 encoded CV file from session
        job_url: Optional job posting URL
        job_text: Optional job description text
        cv_data: JSON string of CV data from session (includes job preview)
        db: Database session
        current_user: Authenticated user

    Returns:
        QuickStartClaimResponse with created CV and job description IDs

    Raises:
        HTTPException: For validation errors or creation failures
    """
    # Validate job text length if provided
    if job_text and len(job_text) > 10000:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Job description text cannot exceed 10,000 characters",
        )

    # Validate that at least one field is provided
    if not cv_file and not cv_file_base64 and not job_url and not job_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one field must be provided: CV file or job description",
        )

    try:
        # Initialize CV variables
        cv = None
        cv_id = None

        # Handle CV file - either direct upload or base64 from session
        if cv_file:
            # Direct file upload (already authenticated user)
            is_valid, error_message = await validate_file(cv_file)
            if not is_valid:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST, detail=error_message
                )

            # Read file content
            file_content = await cv_file.read()

            # Check file size (10MB limit)
            if len(file_content) > 10 * 1024 * 1024:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="CV file size cannot exceed 10MB",
                )

            # Save CV file to storage
            file_path, filename, file_size = await save_uploaded_file(
                cv_file, content=file_content
            )

            # Parse CV content
            logger.info(
                f"Parsing CV for claim: {cv_file.filename} for user {current_user.id}"
            )
            parsed_cv_data = await parse_cv_with_openai(
                file_content,
                cv_file.filename,
                cv_file.content_type,
                user_id=str(current_user.id),
                cv_id=None,  # CV will be created after parsing
                db_session=db,
            )

            # Create CV record
            cv = create_cv(
                db=db,
                user_id=str(current_user.id),
                original_filename=cv_file.filename,
                file_path=file_path,
                file_size=file_size,
                file_type=cv_file.content_type,
                parsed_data=parsed_cv_data,
                is_parsed=True,
            )
            cv_id = str(cv.id)
        elif cv_file_base64:
            # Base64 file from session (user signed up after preview)
            # Decode base64 (format: "data:mime/type;base64,...")
            if "," in cv_file_base64:
                header, encoded = cv_file_base64.split(",", 1)
                file_content = base64.b64decode(encoded)

                # Extract metadata from cv_data
                try:
                    cv_data_dict = json.loads(cv_data or "{}")
                except (json.JSONDecodeError, TypeError):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Invalid cv_data format",
                    )

                filename = cv_data_dict.get("cvFileName", "document.pdf")
                file_type = cv_data_dict.get("cvFileType", "application/pdf")

                # Create a minimal mock UploadFile object for save_uploaded_file
                # We only need the filename attribute since we pass content directly
                class MockUploadFile:
                    def __init__(self, filename):
                        self.filename = filename

                upload_file = MockUploadFile(filename)

                # Save the file properly (content parameter bypasses file reading)
                file_path, saved_filename, file_size = await save_uploaded_file(
                    upload_file, content=file_content
                )

                # Use cached parsed data from session
                full_parsed_data = cv_data_dict.get("full_parsed_data")
                if not full_parsed_data:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Parsed CV data not found in session",
                    )

                logger.info(
                    f"Claiming CV from base64 session data for user {current_user.id}"
                )
                cv = create_cv(
                    db=db,
                    user_id=str(current_user.id),
                    original_filename=filename,
                    file_path=file_path,
                    file_size=file_size,
                    file_type=file_type,
                    parsed_data=full_parsed_data,
                    is_parsed=True,
                )
                cv_id = str(cv.id)
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid base64 file format",
                )

        # Initialize job description variables
        job_description = None
        job_description_id = None

        # Extract job description content
        job_content = ""
        job_title = None
        job_company = None
        job_location = None

        if job_url:
            # Check if we have cached job data from the preview in cv_data (session)
            job_data_from_cache = None
            if cv_data:
                # cv_data is the JSON string from session, parse it to get job data
                try:
                    session_dict = (
                        json.loads(cv_data) if isinstance(cv_data, str) else cv_data
                    )
                    job_data_from_cache = session_dict.get("job_preview", {}).get(
                        "full_parsed_data"
                    )
                except (json.JSONDecodeError, TypeError, AttributeError):
                    pass

            if job_data_from_cache and not job_data_from_cache.get("error"):
                # Use cached job data from preview
                logger.info(f"Using cached job data from preview for claim: {job_url}")
                job_content = job_data_from_cache.get("content", "")
                job_title = job_data_from_cache.get("title")
                job_company = job_data_from_cache.get("company")
                job_location = job_data_from_cache.get("location")
            else:
                # Need to parse the job URL (fallback for direct claims without preview)
                logger.info(f"Parsing job URL for claim: {job_url}")

                # Validate URL format
                parsed_url = urlparse(job_url)
                if not parsed_url.scheme or not parsed_url.netloc:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Invalid URL format. Please check the URL and try again.",
                    )

                # Check if this is a search results page
                if _is_search_results_page(job_url):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="This appears to be a search results page. Please use a specific job URL.",
                    )

                # Extract raw content from URL
                raw_content = _extract_raw_content_with_fallback(job_url)

                if not raw_content:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Unable to extract content from this URL. Please try the text option.",
                    )

                # Use AI service to extract structured data
                job_result = await extract_job_description_with_ai(
                    raw_content, job_url, user_id=current_user.id, db_session=db
                )

                if job_result.get("error"):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Failed to parse job content: {job_result.get('error')}",
                    )

                job_content = job_result.get("content", "")
                job_title = job_result.get("title")
                job_company = job_result.get("company")
                job_location = job_result.get("location")

        elif job_text:
            logger.info("Using job text for claim")
            job_content = job_text

        # Create job description record if job data exists
        if job_url or job_text:
            job_description = create_job_description_for_user_with_cvs(
                db=db,
                user_id=str(current_user.id),
                cv_ids=[cv_id] if cv_id else None,
                content=job_content,
                source_url=job_url,
                title=job_title,
                company=job_company,
                location=job_location,
            )
            job_description_id = str(job_description.id)

        # Explicit commit after all operations succeed
        db.commit()

        logger.info(
            f"Successfully claimed quick start data: CV {cv_id or 'None'}, JD {job_description_id or 'None'} for user {current_user.id}"
        )

        return QuickStartClaimResponse(
            cv_id=cv_id,
            job_description_id=job_description_id,
            message="Data saved successfully",
        )

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error claiming quick start data: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error saving data: {str(e)}",
        )
