"""
CV Quality Analysis API endpoints.

Provides REST API for triggering and retrieving CV quality analyses.
"""

import asyncio
import logging
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from src.middleware.clerk_auth import get_effective_user
from src.models.base import get_db
from src.models.user import User
from src.models.cv import CV
from src.models.cv_quality_analysis import CVQualityAnalysis
from src.schemas.cv_quality_schemas import (
    CVQualityAnalysisDBSchema,
    CVQualityAnalysisCreateRequestSchema,
    CVQualityAnalysisCreateResponseSchema,
    CVQualityAnalysisUpdateSchema,
)
from src.services.cv_service import get_cv_by_id
from .background_tasks_cv_quality import cv_quality_analysis_background

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/cvs/{cv_id}/quality-analysis", status_code=202)
async def create_cv_quality_analysis(
    cv_id: str,
    request: CVQualityAnalysisCreateRequestSchema = CVQualityAnalysisCreateRequestSchema(),
    user: User = Depends(get_effective_user),
    db: Session = Depends(get_db),
) -> CVQualityAnalysisCreateResponseSchema:
    """
    Trigger CV quality analysis in background.

    Returns analysis_id for polling.

    Args:
        cv_id: CV ID to analyze
        request: Request body with correction_mode (proofread or coaching)
        user: Authenticated user (from dependency)
        db: Database session (from dependency)

    Returns:
        CVQualityAnalysisCreateResponseSchema with analysis_id and status

    Raises:
        HTTPException: 404 if CV not found or not parsed
    """
    # Validate CV ownership and parsed data
    cv = get_cv_by_id(db, cv_id, user.id)
    if not cv or not cv.parsed_data:
        raise HTTPException(status_code=404, detail="CV not found or not parsed")

    # Check if analysis already generating (within transaction to prevent race condition)
    existing = (
        db.query(CVQualityAnalysis)
        .filter(
            CVQualityAnalysis.cv_id == cv_id, CVQualityAnalysis.is_generating.is_(True)
        )
        .first()
    )

    if existing:
        return CVQualityAnalysisCreateResponseSchema(
            analysis_id=existing.id,
            is_generating=True,
            message="Analysis already in progress",
        )

    # Create new analysis record atomically
    analysis_id = str(uuid.uuid4())

    analysis = CVQualityAnalysis(
        id=analysis_id,
        user_id=user.id,
        cv_id=cv_id,
        is_generating=True,
    )
    db.add(analysis)

    try:
        db.commit()
    except IntegrityError:
        # If commit fails due to constraint violation (e.g., another request created analysis), check again
        db.rollback()
        existing = (
            db.query(CVQualityAnalysis)
            .filter(
                CVQualityAnalysis.cv_id == cv_id,
                CVQualityAnalysis.is_generating.is_(True),
            )
            .first()
        )

        if existing:
            return CVQualityAnalysisCreateResponseSchema(
                analysis_id=existing.id,
                is_generating=True,
                message="Analysis already in progress",
            )
        # If no existing analysis found, re-raise as unexpected constraint violation
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create quality analysis due to database constraint violation",
        )
    except Exception as e:
        # Handle unexpected database errors (connection loss, disk full, permissions, etc.)
        db.rollback()
        logger.error(
            f"Unexpected error creating CV quality analysis: cv_id={cv_id}, user_id={user.id}, error={str(e)}",
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create quality analysis",
        )

    # Start background task asynchronously (don't await - let it run in background)
    # Add exception handler to catch task initialization failures
    task = asyncio.create_task(
        cv_quality_analysis_background(
            analysis_id=analysis_id,
            cv_data=cv.parsed_data,
            user_id=user.id,
            cv_id=cv_id,
            correction_mode=request.correction_mode,
        )
    )

    # Add callback to handle task failures
    def task_done_callback(future: asyncio.Task):
        """Handle background task completion/failure."""
        try:
            # This will raise if task failed during initialization or execution
            future.result()
        except Exception as e:
            logger.error(
                f"Background task failed: analysis_id={analysis_id}, cv_id={cv_id}, error={str(e)}",
                exc_info=True,
            )
            # Update database to reflect failure
            # Create new session as this callback runs in a different context
            from src.models.base import SessionLocal

            db_session = SessionLocal()
            try:
                failed_analysis = (
                    db_session.query(CVQualityAnalysis)
                    .filter(CVQualityAnalysis.id == analysis_id)
                    .first()
                )
                if failed_analysis and failed_analysis.is_generating:
                    failed_analysis.is_generating = False
                    failed_analysis.generation_error = (
                        f"Task initialization failed: {str(e)}"
                    )
                    db_session.commit()
            except Exception as db_error:
                logger.critical(
                    f"CRITICAL: Failed to update error state for stuck analysis - "
                    f"analysis_id={analysis_id}. Manual intervention required. Error: {str(db_error)}"
                )
            finally:
                db_session.close()

    task.add_done_callback(task_done_callback)

    return CVQualityAnalysisCreateResponseSchema(
        analysis_id=analysis_id,
        is_generating=True,
    )


@router.get("/cvs/{cv_id}/quality-analysis/latest")
async def get_latest_cv_quality_analysis(
    cv_id: str,
    user: User = Depends(get_effective_user),
    db: Session = Depends(get_db),
) -> CVQualityAnalysisDBSchema | None:
    """
    Get the latest quality analysis for a CV.

    Args:
        cv_id: CV ID
        user: Authenticated user
        db: Database session

    Returns:
        CVQualityAnalysisDBSchema or None if no analysis exists

    Raises:
        HTTPException: 404 if CV not found
    """
    # Validate CV ownership
    cv = get_cv_by_id(db, cv_id, user.id)
    if not cv:
        raise HTTPException(status_code=404, detail="CV not found")

    # Get latest analysis
    analysis = (
        db.query(CVQualityAnalysis)
        .filter(CVQualityAnalysis.cv_id == cv_id, CVQualityAnalysis.user_id == user.id)
        .order_by(CVQualityAnalysis.created_at.desc())
        .first()
    )

    if not analysis:
        return None  # No analysis exists yet

    return CVQualityAnalysisDBSchema.model_validate(analysis)


@router.get("/quality-analysis/{analysis_id}")
async def get_cv_quality_analysis_status(
    analysis_id: str,
    user: User = Depends(get_effective_user),
    db: Session = Depends(get_db),
) -> CVQualityAnalysisDBSchema:
    """
    Get quality analysis status (for polling).

    Args:
        analysis_id: Analysis ID
        user: Authenticated user
        db: Database session

    Returns:
        CVQualityAnalysisDBSchema

    Raises:
        HTTPException: 404 if analysis not found
    """
    analysis = (
        db.query(CVQualityAnalysis)
        .filter(CVQualityAnalysis.id == analysis_id, CVQualityAnalysis.user_id == user.id)
        .first()
    )

    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    return CVQualityAnalysisDBSchema.model_validate(analysis)


@router.patch("/quality-analysis/{analysis_id}")
async def update_cv_quality_analysis(
    analysis_id: str,
    update_data: CVQualityAnalysisUpdateSchema,
    user: User = Depends(get_effective_user),
    db: Session = Depends(get_db),
) -> dict:
    """
    Update quality analysis data (for dismissals).

    Args:
        analysis_id: Analysis ID
        update_data: Updated quality data with validation
        user: Authenticated user
        db: Database session

    Returns:
        Status dict

    Raises:
        HTTPException: 404 if analysis not found
    """
    analysis = (
        db.query(CVQualityAnalysis)
        .filter(CVQualityAnalysis.id == analysis_id, CVQualityAnalysis.user_id == user.id)
        .first()
    )

    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    # Convert validated Pydantic model to dict for storage
    analysis.quality_data = update_data.quality_data.model_dump()

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(
            f"Failed to update CV quality analysis: analysis_id={analysis_id}, error={str(e)}",
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update quality analysis",
        )

    return {"status": "updated"}


@router.delete("/quality-analysis/{analysis_id}")
async def delete_cv_quality_analysis(
    analysis_id: str,
    user: User = Depends(get_effective_user),
    db: Session = Depends(get_db),
) -> dict:
    """
    Delete a quality analysis.

    Args:
        analysis_id: Analysis ID
        user: Authenticated user
        db: Database session

    Returns:
        Status dict

    Raises:
        HTTPException: 404 if analysis not found
    """
    analysis = (
        db.query(CVQualityAnalysis)
        .filter(CVQualityAnalysis.id == analysis_id, CVQualityAnalysis.user_id == user.id)
        .first()
    )

    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    db.delete(analysis)

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(
            f"Failed to delete CV quality analysis: analysis_id={analysis_id}, error={str(e)}",
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete quality analysis",
        )

    return {"status": "deleted"}


@router.delete("/cvs/{cv_id}/quality-analysis/all")
async def delete_all_cv_quality_analyses(
    cv_id: str,
    user: User = Depends(get_effective_user),
    db: Session = Depends(get_db),
) -> dict:
    """
    Delete all quality analyses for a CV.

    Args:
        cv_id: CV ID
        user: Authenticated user
        db: Database session

    Returns:
        Status dict with count
    """
    # Validate CV ownership
    cv = get_cv_by_id(db, cv_id, user.id)
    if not cv:
        raise HTTPException(status_code=404, detail="CV not found")

    # Delete all analyses
    count = (
        db.query(CVQualityAnalysis)
        .filter(CVQualityAnalysis.cv_id == cv_id, CVQualityAnalysis.user_id == user.id)
        .delete()
    )

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(
            f"Failed to delete all CV quality analyses: cv_id={cv_id}, error={str(e)}",
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete quality analyses",
        )

    return {"status": "deleted", "count": count}
