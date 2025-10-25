"""
Quick Start API - Unauthenticated CV and Job Description Preview

This module provides an endpoint for unauthenticated users to quickly try
the CV optimization service by uploading a CV and providing a job description
(URL or text). The data is parsed and returned as a preview without being
saved to the database.

Key responsibilities:
- Accept CV file upload and job description (URL or text) without authentication
- Parse both CV and job description using existing AI services
- Return preview data without persisting to database
- Apply IP-based rate limiting to prevent abuse
- Handle errors gracefully with detailed messages

Usage:
- Used by Quick Start wizard for first-time users
- Enables "try before you buy" experience
- Requires sign-in to save and use AI optimization features
"""

import asyncio
import logging
from typing import Any, Dict, Optional

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Request,
    UploadFile,
    status,
)
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address
from urllib.parse import urlparse
from sqlalchemy.orm import Session

from src.middleware.clerk_auth import get_effective_user
from src.models.base import get_db
from src.models.user import User
from src.services.ai_service import extract_job_description_with_ai
from src.services.cv_parsing_service import parse_cv_with_openai
from src.services.cv_service import create_cv
from src.services.job_description_service import create_job_description_for_user
from src.services.file_service import validate_file, save_uploaded_file
from src.services.cv_preview_service import (
    generate_cv_preview_image,
    is_preview_generation_available,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/quick-start", tags=["quick-start"])
limiter = Limiter(key_func=get_remote_address)

# Timeout for AI parsing operations (in seconds)
QUICK_START_TIMEOUT = 30


def _is_obviously_not_cv(text_content: str) -> bool:
    """
    Quick validation to detect obviously non-CV documents before AI parsing.

    Args:
        text_content: Extracted text from the document

    Returns:
        True if the document is obviously not a CV
    """
    if not text_content or len(text_content.strip()) < 50:
        return True

    text_lower = text_content.lower()

    # Check for academic/research paper indicators
    academic_indicators = [
        "abstract",
        "introduction",
        "methodology",
        "conclusion",
        "references",
        "bibliography",
        "doi:",
        "issn:",
        "volume",
        "issue",
        "journal",
        "proceedings",
        "conference",
        "research",
        "study",
        "experiment",
        "hypothesis",
        "data analysis",
        "statistical",
        "peer review",
    ]

    # Check for book/manual indicators
    book_indicators = [
        "chapter",
        "table of contents",
        "index",
        "glossary",
        "appendix",
        "copyright",
        "publisher",
        "isbn:",
        "edition",
        "pages",
    ]

    # Check for form/document indicators
    form_indicators = [
        "form",
        "application",
        "registration",
        "signature",
        "date signed",
        "please complete",
        "fill out",
        "submit by",
        "deadline",
    ]

    # Count matches for each category
    academic_matches = sum(
        1 for indicator in academic_indicators if indicator in text_lower
    )
    book_matches = sum(1 for indicator in book_indicators if indicator in text_lower)
    form_matches = sum(1 for indicator in form_indicators if indicator in text_lower)

    # If we have multiple indicators from non-CV categories, it's probably not a CV
    if academic_matches >= 3 or book_matches >= 3 or form_matches >= 2:
        return True

    # Check for CV-specific indicators (if present, it might be a CV)
    cv_indicators = [
        "curriculum vitae",
        "resume",
        "personal information",
        "contact information",
        "work experience",
        "employment history",
        "education",
        "skills",
        "professional summary",
        "objective",
        "career",
        "position",
        "company",
    ]

    cv_matches = sum(1 for indicator in cv_indicators if indicator in text_lower)

    # If it has CV indicators, it's probably a CV
    if cv_matches >= 2:
        return False

    # If it's very long (>10k chars) and has no CV indicators, probably not a CV
    if len(text_content) > 10000 and cv_matches == 0:
        return True

    return False


async def _parse_cv_for_preview(
    cv_file: UploadFile, file_content: bytes, request: Request
) -> Dict[str, Any]:
    """
    Parse CV file for quick start preview.

    Args:
        cv_file: Uploaded CV file
        file_content: File content bytes
        request: FastAPI request object for logging

    Returns:
        Dictionary containing CV preview data or error information
    """
    cv_preview: Dict[str, Any] = {}

    try:
        logger.info(
            f"Parsing CV for quick start preview: {cv_file.filename} from IP {request.client.host if request.client else 'unknown'}"
        )

        # Quick preliminary validation before AI call
        from src.services.file_service import extract_text_from_file

        try:
            text_content = extract_text_from_file(file_content, cv_file.content_type)

            # Quick check for obviously non-CV content
            if _is_obviously_not_cv(text_content):
                return {
                    "error": "This document does not appear to be a CV. Please upload a resume or curriculum vitae with your professional information.",
                    "filename": cv_file.filename,
                }
        except Exception as e:
            logger.warning(f"Quick text extraction failed, proceeding with AI: {e}")

        # Wrap CV parsing with timeout
        try:
            parsed_cv = await asyncio.wait_for(
                parse_cv_with_openai(
                    file_content, cv_file.filename, cv_file.content_type
                ),
                timeout=QUICK_START_TIMEOUT,
            )
        except asyncio.TimeoutError:
            logger.error(f"CV parsing timeout in quick start for {cv_file.filename}")
            cv_preview = {
                "error": "Parsing took too long. Please try a simpler CV or contact support.",
                "filename": cv_file.filename,
            }
            parsed_cv = {"error": "timeout"}

        # Check for parsing errors
        if parsed_cv.get("error"):
            if parsed_cv.get("error") != "timeout":  # Don't overwrite timeout error
                cv_preview = {
                    "error": parsed_cv["error"],
                    "filename": cv_file.filename,
                }
        else:
            # Extract key information for preview
            personal_info = parsed_cv.get("personal_info", {})
            cv_preview = {
                "filename": cv_file.filename,
                "full_name": personal_info.get("full_name", ""),
                "email": personal_info.get("email", ""),
                "phone": personal_info.get("phone", ""),
                "location": personal_info.get("location", ""),
                "section_count": sum(
                    [
                        len(parsed_cv.get("work_experience", [])),
                        len(parsed_cv.get("education", [])),
                        len(parsed_cv.get("skills", [])),
                        len(parsed_cv.get("certifications", [])),
                        len(parsed_cv.get("projects", [])),
                    ]
                ),
                "has_summary": bool(parsed_cv.get("summary")),
                "work_experience_count": len(parsed_cv.get("work_experience", [])),
                "education_count": len(parsed_cv.get("education", [])),
                # Include full parsed data for later claiming
                "full_parsed_data": parsed_cv,
            }

            # Generate preview image if possible
            if is_preview_generation_available():
                try:
                    logger.info(f"Generating CV preview image for {cv_file.filename}")
                    preview_image = await generate_cv_preview_image(
                        parsed_cv,
                        max_width=1000,  # Increased for better quality
                        title=personal_info.get("full_name", "CV Preview"),
                    )
                    cv_preview["preview_image_base64"] = preview_image
                    logger.info(
                        f"Successfully generated CV preview image for {cv_file.filename}"
                    )
                except Exception as e:
                    logger.warning(
                        f"Failed to generate CV preview image for {cv_file.filename}: {e}"
                    )
                    # Continue without image - not critical for preview
            else:
                logger.info(
                    "CV preview image generation not available (missing dependencies)"
                )

    except Exception as e:
        logger.error(f"CV parsing error in quick start: {str(e)}")
        cv_preview = {
            "error": f"Failed to parse CV: {str(e)}",
            "filename": cv_file.filename if cv_file else "unknown",
        }

    return cv_preview


async def _parse_job_for_preview(
    job_url: Optional[str], job_text: Optional[str], request: Request
) -> Dict[str, Any]:
    """
    Parse job description for quick start preview.

    Args:
        job_url: Optional job posting URL
        job_text: Optional job description text
        request: FastAPI request object for logging

    Returns:
        Dictionary containing job preview data or error information
    """
    job_preview: Dict[str, Any] = {}

    try:
        if job_url:
            logger.info(
                f"Parsing job URL for quick start preview: {job_url} from IP {request.client.host if request.client else 'unknown'}"
            )

            # Validate URL format
            parsed_url = urlparse(job_url)
            if not parsed_url.scheme or not parsed_url.netloc:
                job_preview = {
                    "error": "Invalid URL format. Please check the URL and try again.",
                    "source": "url",
                }
            else:
                # Import here to avoid circular imports and use the extraction function
                from src.services.url_parsing_service import (
                    _extract_raw_content_with_fallback,
                    _is_search_results_page,
                )

                # Check if this is a search results page
                if _is_search_results_page(job_url):
                    job_preview = {
                        "error": "This appears to be a search results page. Please use a specific job URL.",
                        "source": "url",
                    }
                else:
                    # Extract raw content from URL
                    raw_content = _extract_raw_content_with_fallback(job_url)

                    if raw_content:
                        # Use AI service to extract structured data with timeout
                        try:
                            job_result = await asyncio.wait_for(
                                extract_job_description_with_ai(
                                    raw_content, job_url, user_id=None, db_session=None
                                ),
                                timeout=QUICK_START_TIMEOUT,
                            )
                        except asyncio.TimeoutError:
                            logger.error(
                                f"Job description parsing timeout in quick start for {job_url}"
                            )
                            job_result = {
                                "error": "Parsing took too long. Please try a simpler URL or use the text option."
                            }

                        if not job_result.get("error"):
                            job_preview = {
                                "source": "url",
                                "title": job_result.get("title", ""),
                                "company": job_result.get("company", ""),
                                "location": job_result.get("location", ""),
                                "content_preview": (
                                    job_result.get("content", "")[:200] + "..."
                                    if len(job_result.get("content", "")) > 200
                                    else job_result.get("content", "")
                                ),
                                "content": job_result.get(
                                    "content", ""
                                ),  # Full content for markdown rendering
                                "has_content": bool(job_result.get("content")),
                                # Include full parsed data for later claiming
                                "full_parsed_data": job_result,
                            }
                        else:
                            job_preview = {
                                "error": job_result.get(
                                    "error", "Failed to parse job content"
                                ),
                                "source": "url",
                            }
                    else:
                        job_preview = {
                            "error": "Unable to extract content from this URL. Please try the text option.",
                            "source": "url",
                        }

        elif job_text:
            logger.info(
                f"Processing job text for quick start preview from IP {request.client.host if request.client else 'unknown'}"
            )
            # For text input, we don't need to parse a URL, just use the text
            job_preview = {
                "source": "text",
                "content_preview": (
                    job_text[:200] + "..." if len(job_text) > 200 else job_text
                ),
                "content": job_text,  # Full content for markdown rendering
                "has_content": bool(job_text.strip()),
                "content_length": len(job_text),
            }

    except Exception as e:
        logger.error(f"Job description parsing error in quick start: {str(e)}")
        job_preview = {
            "error": f"Failed to parse job description: {str(e)}",
            "source": "url" if job_url else "text",
        }

    return job_preview


class QuickStartPreviewResponse(BaseModel):
    """Response model for quick start preview"""

    cv_preview: dict
    job_preview: dict
    success: bool
    message: str


class QuickStartClaimResponse(BaseModel):
    """Response model for quick start claim"""

    cv_id: Optional[str] = None
    job_description_id: Optional[str] = None
    message: str = "Data saved successfully"


@router.post("/preview", response_model=QuickStartPreviewResponse)
@limiter.limit("5/15minutes")
async def quick_start_preview(
    request: Request,
    cv_file: Optional[UploadFile] = File(None),
    job_url: Optional[str] = Form(None),
    job_text: Optional[str] = Form(None),
):
    """
    Parse CV and job description for preview without authentication.

    This endpoint allows unauthenticated users to try the service by:
    1. Uploading a CV file (PDF, DOC, DOCX)
    2. Providing a job description via URL or text
    3. Receiving parsed previews of both

    Rate limited to 5 requests per 15 minutes per IP address.

    Args:
        request: FastAPI request object (for rate limiting)
        cv_file: Uploaded CV file
        job_url: Optional job posting URL
        job_text: Optional job description text

    Returns:
        QuickStartPreviewResponse with parsed CV and job data

    Raises:
        HTTPException: For validation errors or parsing failures
    """
    # CV file is mandatory
    if not cv_file:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CV file is required",
        )

    # Validate job text length if provided
    if job_text and len(job_text) > 10000:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Job description text cannot exceed 10,000 characters",
        )

    # Validate CV file if provided
    file_content = None
    if cv_file:
        try:
            file_content = await cv_file.read()
            await cv_file.seek(0)  # Reset file pointer for potential re-read

            # Use existing file validation
            is_valid, error_message = await validate_file(cv_file)
            if not is_valid:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST, detail=error_message
                )

            # Check file size - 3MB limit for unauthenticated previews to fit in sessionStorage
            # (base64 encoding increases size by ~33%, so 3MB becomes ~4MB)
            MAX_PREVIEW_SIZE = 3 * 1024 * 1024  # 3MB
            if len(file_content) > MAX_PREVIEW_SIZE:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="CV file size cannot exceed 3MB for quick preview. Please sign in to upload larger files (up to 10MB).",
                )

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"CV file validation error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid CV file: {str(e)}",
            )

    # Parse CV and job description in parallel
    cv_preview: Dict[str, Any] = {}
    job_preview: Dict[str, Any] = {}

    # Create tasks for parallel execution
    tasks = {}

    if cv_file and file_content:
        tasks["cv"] = asyncio.create_task(
            _parse_cv_for_preview(cv_file, file_content, request)
        )

    if job_url or job_text:
        tasks["job"] = asyncio.create_task(
            _parse_job_for_preview(job_url, job_text, request)
        )

    # Execute tasks and return results as they complete
    if tasks:
        # Use asyncio.wait with return_when=asyncio.FIRST_COMPLETED to get immediate results
        done, pending = await asyncio.wait(
            tasks.values(), return_when=asyncio.FIRST_COMPLETED
        )

        # Process completed tasks
        for task in done:
            try:
                result = await task

                # Determine which task completed by checking the task name
                task_name = None
                for name, t in tasks.items():
                    if t == task:
                        task_name = name
                        break

                if task_name == "cv":
                    cv_preview = result
                elif task_name == "job":
                    job_preview = result

            except Exception as e:
                # Handle exceptions from individual tasks
                task_name = None
                for name, t in tasks.items():
                    if t == task:
                        task_name = name
                        break

                logger.error(f"{task_name} parsing failed: {str(e)}")
                if task_name == "cv":
                    cv_preview = {
                        "error": f"Failed to parse CV: {str(e)}",
                        "filename": cv_file.filename if cv_file else "unknown",
                    }
                elif task_name == "job":
                    job_preview = {
                        "error": f"Failed to parse job: {str(e)}",
                        "source": "url" if job_url else "text",
                    }

        # Cancel remaining tasks since we're returning immediately
        if pending:
            for task in pending:
                task.cancel()

            # Set empty results for cancelled tasks
            for task in pending:
                task_name = None
                for name, t in tasks.items():
                    if t == task:
                        task_name = name
                        break

                if task_name == "cv" and not cv_preview:
                    cv_preview = {"error": "Task cancelled - CV parsing incomplete"}
                elif task_name == "job" and not job_preview:
                    job_preview = {"error": "Task cancelled - Job parsing incomplete"}

    # Determine overall success
    cv_success = "error" not in cv_preview
    job_provided = bool(job_url or job_text)
    job_success = job_provided and ("error" not in job_preview)

    # Overall success: CV must succeed, and job (if provided) must succeed
    overall_success = cv_success and (job_success if job_provided else True)

    # Generate appropriate message based on what was provided
    if not job_provided:
        # CV only
        message = "Successfully parsed CV" if cv_success else "CV parsing failed"
    else:
        # CV + Job
        if overall_success:
            message = "Successfully parsed CV and job description"
        elif cv_success and not job_success:
            message = "CV parsed successfully, but job description parsing failed"
        elif not cv_success and job_success:
            message = "Job description parsed successfully, but CV parsing failed"
        else:
            message = "Failed to parse both CV and job description"

    return QuickStartPreviewResponse(
        cv_preview=cv_preview,
        job_preview=job_preview,
        success=overall_success,
        message=message,
    )


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
):
    """
    Claim quick start data by creating CV and job description records.

    This endpoint allows authenticated users to save their quick start preview
    data to the database. It creates both a CV record and a job description
    record, linking them together.

    Args:
        cv_file: The CV file to upload and save
        job_url: Optional job posting URL
        job_text: Optional job description text
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

    import json

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
                file_content, cv_file.filename, cv_file.content_type
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
            import base64
            from io import BytesIO

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

                # Import here to avoid circular imports
                from src.services.url_parsing_service import (
                    _extract_raw_content_with_fallback,
                    _is_search_results_page,
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
            from src.services.job_description_service import (
                create_job_description_for_user_with_cvs,
            )

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
