"""
CV Upload API Endpoints

This module handles CV file upload and background parsing.
"""

import asyncio
from copy import deepcopy
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from sqlalchemy.orm import Session

from src.constants import DEFAULT_PARSED_CV
from src.config import APIConfig
from src.middleware.clerk_auth import get_effective_user_lightweight
from src.models.base import get_db
from src.models.user import User
from src.services.cv_service import create_cv
from src.services.file_service import save_uploaded_file, validate_file

from .common import limiter, parse_cv_background
from .models import CVResponse

router = APIRouter()


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
