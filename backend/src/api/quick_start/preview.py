"""
Preview endpoint for quick start API.

This module provides the /preview endpoint for unauthenticated CV and job
description parsing. It validates inputs, creates parallel parsing tasks,
and uses the preview coordinator for fail-fast execution.
"""

import asyncio
import logging
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile, status

from src.config import APIConfig
from src.services.platform.file_service import validate_file
from src.utils.rate_limit import create_combined_limiter

from .cv_parser import parse_cv_for_preview
from .job_parser import parse_job_for_preview
from .models import QuickStartPreviewResponse
from .preview_coordinator import coordinate_parallel_parsing

logger = logging.getLogger(__name__)

# Create router and limiter (shared across endpoints)
router = APIRouter()
limiter = create_combined_limiter()


@router.post("/preview", response_model=QuickStartPreviewResponse)
@limiter.limit(APIConfig.AI_PARSING_RATE_LIMIT)
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

    Rate limited to 5 requests per 15 minutes (tracks both IP address and user ID independently).

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

    # Validate CV file
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

    # Create tasks for parallel execution
    cv_task = None
    job_task = None

    if cv_file and file_content:
        cv_task = asyncio.create_task(
            parse_cv_for_preview(cv_file, file_content, request)
        )

    if job_url or job_text:
        job_task = asyncio.create_task(parse_job_for_preview(job_url, job_text, request))

    # Use coordinator to orchestrate parallel parsing with fail-fast behavior
    return await coordinate_parallel_parsing(
        cv_task=cv_task,
        job_task=job_task,
        cv_file=cv_file,
        job_url=job_url,
        job_text=job_text,
    )
