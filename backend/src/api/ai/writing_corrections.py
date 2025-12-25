"""
Writing Corrections API endpoints.

Provides REST API for applying writing corrections to CV data.
"""

import copy
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.middleware.clerk_auth import get_effective_user
from src.models.base import get_db
from src.models.user import User
from src.schemas.cv_quality_schemas import (
    WritingCorrectionApplyRequest,
    WritingCorrectionBatchApplyRequest,
)
from src.api.cvs.models import CVResponse
from src.services.ai_service.writing_corrections_service import apply_writing_correction
from .quality_analysis_helpers import (
    validate_and_load_cv,
    load_quality_analysis,
    parse_quality_data,
    find_correction_by_id,
    find_corrections_batch,
    update_cv_with_corrections,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/{correction_id}/apply", response_model=CVResponse)
async def apply_writing_correction_endpoint(
    correction_id: str,
    request: WritingCorrectionApplyRequest,
    user: User = Depends(get_effective_user),
    db: Session = Depends(get_db),
) -> CVResponse:
    """
    Apply a single writing correction to CV data.

    Args:
        correction_id: The correction ID (item_id from the correction)
        request: Request containing cv_id and analysis_id
        user: Authenticated user
        db: Database session

    Returns:
        Updated CV response

    Raises:
        HTTPException: 404 if CV, analysis, or correction not found
        HTTPException: 400 if correction cannot be applied
    """
    logger.info(
        f"Applying writing correction: correction_id={correction_id}, "
        f"cv_id={request.cv_id}, analysis_id={request.analysis_id}, user_id={user.id}"
    )

    # Validate and load resources using helpers
    cv = validate_and_load_cv(db, request.cv_id, user.id)
    analysis = load_quality_analysis(db, request.analysis_id, request.cv_id, user.id)
    quality_data = parse_quality_data(analysis)

    # Find the correction
    correction = find_correction_by_id(quality_data, correction_id)

    # Apply the correction
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

    # Update CV using helper
    updated_cv = update_cv_with_corrections(db, request.cv_id, user.id, updated_cv_data)

    logger.info(
        f"Successfully applied writing correction {correction_id} to CV {request.cv_id}"
    )

    return CVResponse(**updated_cv.to_response_dict())


@router.post("/apply-batch", response_model=CVResponse)
async def apply_writing_corrections_batch_endpoint(
    request: WritingCorrectionBatchApplyRequest,
    user: User = Depends(get_effective_user),
    db: Session = Depends(get_db),
) -> CVResponse:
    """
    Apply multiple writing corrections to CV data in a single operation.

    Args:
        request: Request containing cv_id, analysis_id, and list of correction_ids
        user: Authenticated user
        db: Database session

    Returns:
        Updated CV response

    Raises:
        HTTPException: 404 if CV, analysis, or any correction not found
        HTTPException: 400 if any correction cannot be applied
    """
    logger.info(
        f"Applying batch writing corrections: cv_id={request.cv_id}, "
        f"analysis_id={request.analysis_id}, count={len(request.correction_ids)}, user_id={user.id}"
    )

    # Validate and load resources using helpers
    cv = validate_and_load_cv(db, request.cv_id, user.id)
    analysis = load_quality_analysis(db, request.analysis_id, request.cv_id, user.id)
    quality_data = parse_quality_data(analysis)

    # Find all corrections using helper
    corrections_to_apply = find_corrections_batch(quality_data, request.correction_ids)

    # Apply all corrections sequentially
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

    # Update CV using helper
    updated_cv = update_cv_with_corrections(db, request.cv_id, user.id, updated_cv_data)

    logger.info(
        f"Successfully applied {len(corrections_to_apply)} writing corrections to CV {request.cv_id}"
    )

    return CVResponse(**updated_cv.to_response_dict())
