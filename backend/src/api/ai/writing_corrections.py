"""
Writing Corrections API endpoints.

Provides REST API for applying writing corrections to CV data.
"""

import copy
import logging
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.dependencies.ai_quota import require_ai_quota
from src.middleware.clerk_auth import get_effective_user_lightweight
from src.models.base import SessionLocal, get_db
from src.models.user import User
from src.schemas.cv_quality_schemas import (
    WritingCorrectionApplyRequest,
    WritingCorrectionBatchApplyRequest,
)
from src.api.cvs.models import CVResponse
from src.services.ai_service.writing_corrections_service import apply_writing_correction
from src.models.cv_quality_analysis import CVQualityAnalysis
from src.models.user import User as UserModel
from src.services.users.user_activity_service import append_user_activity_for_commit
from .quality_analysis_helpers import (
    validate_and_load_cv,
    load_quality_analysis,
    parse_quality_data,
    find_correction_by_id_and_draft_index,
    find_corrections_batch,
    update_cv_with_corrections,
    remove_applied_corrections_from_quality_data,
)

logger = logging.getLogger(__name__)
router = APIRouter()


def _persist_analysis_and_activity(
    analysis_id: str,
    updated_quality_data: dict,
    user_id: str,
    activity_type: str,
    action: str,
    description: str,
    details: dict,
) -> None:
    """
    Background task: persist quality analysis update and activity log.
    Runs after the CV response has already been returned to the client.
    Uses its own session so the request session can be closed immediately.
    """
    db = SessionLocal()
    try:
        analysis = db.query(CVQualityAnalysis).filter_by(id=analysis_id).first()
        if analysis:
            analysis.quality_data = updated_quality_data
        user = db.query(UserModel).filter_by(id=user_id).first()
        if user:
            append_user_activity_for_commit(
                db=db,
                user=user,
                activity_type=activity_type,
                action=action,
                description=description,
                details=details,
            )
        db.commit()
    except Exception:
        logger.exception("Background persist failed for analysis %s", analysis_id)
        db.rollback()
    finally:
        db.close()


@router.post("/{correction_id}/apply", response_model=CVResponse)
async def apply_writing_correction_endpoint(
    correction_id: str,
    request: WritingCorrectionApplyRequest,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_effective_user_lightweight),
    db: Session = Depends(get_db),
    _quota: None = Depends(require_ai_quota),
) -> CVResponse:
    """
    Apply a single writing correction to CV data.

    Args:
        correction_id: The correction ID (item_id from the correction)
        request: Request containing cv_id, analysis_id, and draft_index
        background_tasks: FastAPI background task runner
        user: Authenticated user
        db: Database session

    Returns:
        Updated CV response

    Raises:
        HTTPException: 404 if CV, analysis, or correction not found
        HTTPException: 400 if correction cannot be applied
    """
    # Validate and load resources using helpers
    cv = validate_and_load_cv(db, request.cv_id, user.id)
    analysis = load_quality_analysis(db, request.analysis_id, request.cv_id, user.id)
    quality_data = parse_quality_data(analysis)

    # Find the correction for the selected draft index
    correction = find_correction_by_id_and_draft_index(
        quality_data, correction_id, request.draft_index
    )

    # Apply the correction in memory
    try:
        updated_cv_data = apply_writing_correction(
            copy.deepcopy(cv.parsed_data), correction
        )
    except ValueError as e:
        logger.error(f"Failed to apply correction: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error applying correction: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to apply writing correction",
        )

    # Compute updated quality_data in memory (no DB write yet)
    updated_quality_data = remove_applied_corrections_from_quality_data(
        quality_data, [correction_id]
    )

    # Critical path: only persist the CV update, then return immediately.
    # update_cv_with_corrections sets cv.updated_at in Python before commit,
    # so no db.refresh() round-trip is needed.
    update_cv_with_corrections(cv, updated_cv_data)
    db.commit()

    # Defer analysis update and activity log — client doesn't need to wait for these.
    background_tasks.add_task(
        _persist_analysis_and_activity,
        analysis_id=request.analysis_id,
        updated_quality_data=updated_quality_data,
        user_id=user.id,
        activity_type="user_action",
        action="writing_correction_apply",
        description="Applied writing correction to CV",
        details={
            "cv_id": request.cv_id,
            "analysis_id": request.analysis_id,
            "correction_id": correction_id,
        },
    )

    return CVResponse(**cv.to_response_dict())


@router.post("/apply-batch", response_model=CVResponse)
async def apply_writing_corrections_batch_endpoint(
    request: WritingCorrectionBatchApplyRequest,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_effective_user_lightweight),
    db: Session = Depends(get_db),
    _quota: None = Depends(require_ai_quota),
) -> CVResponse:
    """
    Apply multiple writing corrections to CV data in a single operation.

    Args:
        request: Request containing cv_id, analysis_id, and list of correction_ids
        background_tasks: FastAPI background task runner
        user: Authenticated user
        db: Database session

    Returns:
        Updated CV response

    Raises:
        HTTPException: 404 if CV, analysis, or any correction not found
        HTTPException: 400 if any correction cannot be applied
    """
    # Validate and load resources using helpers
    cv = validate_and_load_cv(db, request.cv_id, user.id)
    analysis = load_quality_analysis(db, request.analysis_id, request.cv_id, user.id)
    quality_data = parse_quality_data(analysis)

    # Find all corrections using helper
    corrections_to_apply = find_corrections_batch(quality_data, request.correction_ids)

    # Apply all corrections sequentially in memory
    updated_cv_data = copy.deepcopy(cv.parsed_data)
    for correction in corrections_to_apply:
        try:
            updated_cv_data = apply_writing_correction(updated_cv_data, correction)
        except ValueError as e:
            logger.error(f"Failed to apply correction {correction.item_id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to apply correction {correction.item_id}: {str(e)}",
            )
        except Exception as e:
            logger.error(
                f"Unexpected error applying correction {correction.item_id}: {e}",
                exc_info=True,
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to apply writing correction {correction.item_id}",
            )

    applied_ids = [c.item_id for c in corrections_to_apply]

    # Compute updated quality_data in memory (no DB write yet)
    updated_quality_data = remove_applied_corrections_from_quality_data(
        quality_data, applied_ids
    )

    # Critical path: only persist the CV update, then return immediately.
    # update_cv_with_corrections sets cv.updated_at in Python before commit,
    # so no db.refresh() round-trip is needed.
    update_cv_with_corrections(cv, updated_cv_data)
    db.commit()

    # Defer analysis update and activity log — client doesn't need to wait for these.
    background_tasks.add_task(
        _persist_analysis_and_activity,
        analysis_id=request.analysis_id,
        updated_quality_data=updated_quality_data,
        user_id=user.id,
        activity_type="user_action",
        action="writing_correction_apply_batch",
        description="Applied batch writing corrections to CV",
        details={
            "cv_id": request.cv_id,
            "analysis_id": request.analysis_id,
            "correction_ids": applied_ids,
        },
    )

    return CVResponse(**cv.to_response_dict())
