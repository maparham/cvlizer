"""
CV Upload API Endpoints

This module handles CV file upload and background parsing.
"""

import asyncio
import logging
from copy import deepcopy
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from sqlalchemy.orm import Session

from src.constants import DEFAULT_PARSED_CV
from src.config import APIConfig
from src.dependencies.ai_quota import require_ai_quota
from src.middleware.clerk_auth import get_effective_user_lightweight
from src.models.base import get_db
from src.models.user import User
from src.services.cv.cv_service import create_cv
from src.services.platform.file_service import save_uploaded_file, validate_file
from src.services.users.user_activity_service import safe_log_user_activity

from src.utils.task_logging import make_task_exception_logger

from .common import limiter, parse_cv_background, parse_cv_from_text_background
from .models import CreateCVFromTextRequest, CVResponse
from .responses import build_cv_response


def _original_filename_for_text_cv(title: Optional[str]) -> str:
    """Build a display filename for a text-import CV; ensures .txt when no extension."""
    t = (title or "").strip()
    if not t:
        return "CV from text.txt"
    if "." not in t:
        return f"{t}.txt"
    return t


logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/", response_model=CVResponse)
@limiter.limit(APIConfig.AI_PARSING_RATE_LIMIT)
async def upload_cv(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user_lightweight),
    _quota: None = Depends(require_ai_quota),
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

        task = asyncio.create_task(
            parse_cv_background(
                str(cv.id), file_content, file.filename, file.content_type
            )
        )
        task.add_done_callback(
            make_task_exception_logger(
                logger,
                "CV background parsing task failed: cv_id=%s, error=%s",
                str(cv.id),
            )
        )

        safe_log_user_activity(
            db=db,
            user=current_user,
            activity_type="user_action",
            action="cv_upload",
            description=f"Uploaded CV file '{cv.original_filename}'",
            details={
                "cv_id": str(cv.id),
                "filename": cv.original_filename,
                "file_size": file_size,
            },
        )

        return build_cv_response(cv)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing CV: {str(e)}",
        )


@router.post("/from-text", response_model=CVResponse)
@limiter.limit(APIConfig.AI_PARSING_RATE_LIMIT)
async def create_cv_from_text(
    request: Request,
    body: CreateCVFromTextRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user_lightweight),
    _quota: None = Depends(require_ai_quota),
):
    """Create a CV from pasted raw text and start the same background parsing as file upload."""
    try:
        empty_parsed_data = deepcopy(DEFAULT_PARSED_CV)
        proposed_name = _original_filename_for_text_cv(body.title)

        cv = create_cv(
            db=db,
            user_id=str(current_user.id),
            original_filename=proposed_name,
            file_path="",
            file_size=0,
            file_type="text/plain",
            parsed_data=empty_parsed_data,
            is_parsed=False,
        )

        text_for_parse = body.text

        await asyncio.sleep(0.1)

        task = asyncio.create_task(
            parse_cv_from_text_background(str(cv.id), text_for_parse)
        )
        task.add_done_callback(
            make_task_exception_logger(
                logger,
                "CV background text parsing task failed: cv_id=%s, error=%s",
                str(cv.id),
            )
        )

        safe_log_user_activity(
            db=db,
            user=current_user,
            activity_type="user_action",
            action="cv_create_from_text",
            description=f"Created CV from pasted text '{cv.original_filename}'",
            details={
                "cv_id": str(cv.id),
                "filename": cv.original_filename,
            },
        )

        return build_cv_response(cv)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating CV from text: {str(e)}",
        )
