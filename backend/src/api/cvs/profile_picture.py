"""
Profile picture API for CVs.

Endpoints for uploading, downloading, and deleting the profile picture
stored in a CV's personal info. The picture is included in PDF export.
"""

import copy
import logging
import os

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from src.middleware.clerk_auth import get_effective_user_lightweight
from src.models.base import get_db
from src.models.user import User
from src.services.cv_service import get_cv_by_id, update_cv
from src.services.file_service import (
    delete_file,
    resolve_profile_picture_path,
    save_profile_picture,
    validate_profile_picture_content,
)

from .models import CVResponse
from .responses import build_cv_response

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/{cv_id}/profile-picture", response_model=CVResponse)
async def upload_profile_picture(
    cv_id: str,
    file: UploadFile = File(...),
    profile_picture_shape: str = Form("circle"),
    profile_picture_size: str = Form("standard"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user_lightweight),
):
    """
    Upload or replace the profile picture for a CV.
    Accepts JPG/PNG, max 1MB. Shape must be "circle" or "square".
    Size must be "small", "standard", or "large".
    """
    cv = get_cv_by_id(db, cv_id, str(current_user.id))
    if not cv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")
    if profile_picture_shape not in ("circle", "square"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="profile_picture_shape must be 'circle' or 'square'",
        )
    if profile_picture_size not in ("small", "standard", "large"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="profile_picture_size must be 'small', 'standard', or 'large'",
        )

    content = await file.read()
    valid, err = validate_profile_picture_content(content, file.content_type)
    if not valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err)

    parsed = cv.parsed_data or {}
    personal = (parsed.get("personal_info") or {}).copy()
    old_stored = personal.get("profile_picture")

    try:
        stored_path, _filename, _size = await save_profile_picture(
            file, str(current_user.id), content=content
        )
    except Exception as e:
        logger.exception("Failed to save profile picture: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save profile picture",
        )

    personal["profile_picture"] = stored_path
    personal["profile_picture_shape"] = profile_picture_shape
    personal["profile_picture_size"] = profile_picture_size
    updated_parsed = copy.deepcopy(parsed)
    updated_parsed["personal_info"] = personal
    updated_cv = update_cv(db, cv_id, str(current_user.id), updated_parsed)
    if not updated_cv:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update CV",
        )

    # Delete old file only after new file is saved and DB is updated
    if old_stored:
        old_path = resolve_profile_picture_path(old_stored)
        if old_path:
            delete_file(old_path)

    return build_cv_response(updated_cv)


@router.delete("/{cv_id}/profile-picture")
async def delete_profile_picture(
    cv_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user_lightweight),
):
    """Remove the profile picture from a CV."""
    cv = get_cv_by_id(db, cv_id, str(current_user.id))
    if not cv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")

    parsed = cv.parsed_data or {}
    personal = (parsed.get("personal_info") or {}).copy()
    old_stored = personal.get("profile_picture")
    if old_stored:
        old_path = resolve_profile_picture_path(old_stored)
        if old_path:
            delete_file(old_path)

    personal.pop("profile_picture", None)
    personal.pop("profile_picture_shape", None)
    personal.pop("profile_picture_size", None)
    updated_parsed = copy.deepcopy(parsed)
    updated_parsed["personal_info"] = personal
    update_cv(db, cv_id, str(current_user.id), updated_parsed)
    return {"message": "Profile picture removed"}


@router.get("/{cv_id}/profile-picture")
async def download_profile_picture(
    cv_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user_lightweight),
):
    """Stream the CV's profile picture if set."""
    cv = get_cv_by_id(db, cv_id, str(current_user.id))
    if not cv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")
    parsed = cv.parsed_data or {}
    stored = (parsed.get("personal_info") or {}).get("profile_picture")
    if not stored:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No profile picture set",
        )
    path = resolve_profile_picture_path(stored)
    if not path or not os.path.exists(path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile picture file not found",
        )
    ext = os.path.splitext(path)[1].lower()
    media = "image/jpeg" if ext in (".jpg", ".jpeg") else "image/png"
    return FileResponse(path, media_type=media)
