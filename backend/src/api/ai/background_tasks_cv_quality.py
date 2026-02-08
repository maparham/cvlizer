"""Background task for CV quality analysis."""

import asyncio
import logging
from src.models.base import SessionLocal
from src.models.cv_quality_analysis import CVQualityAnalysis
from src.utils.background_tasks import run_task_in_background

logger = logging.getLogger(__name__)


def cv_quality_analysis_sync(
    analysis_id: str,
    cv_data: dict,
    user_id: str,
    cv_id: str,
    correction_mode: str = "proofread",
):
    """
    Synchronous CV quality analysis task.

    Runs in background thread pool. Creates its own database session.

    Args:
        analysis_id: CVQualityAnalysis record ID
        cv_data: Complete CV data dictionary
        user_id: User ID for logging
        cv_id: CV ID for logging
        correction_mode: 'proofread' or 'coaching'
    """
    from src.services.ai_service.cv_quality_service import (
        generate_cv_corrections_and_feedback,
    )

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    db = SessionLocal()
    try:
        # Generate corrections and feedback via AI
        quality_data, metadata = loop.run_until_complete(
            generate_cv_corrections_and_feedback(
                cv_data, user_id, cv_id, db, correction_mode
            )
        )

        # Update database record
        analysis = (
            db.query(CVQualityAnalysis)
            .filter(CVQualityAnalysis.id == analysis_id)
            .first()
        )

        if analysis:
            analysis.quality_data = quality_data
            analysis.overall_quality_score = quality_data.get("overall_quality_score")
            analysis.tokens_used = metadata.get("tokens_used", 0)
            analysis.generation_time = metadata.get("generation_time", 0)
            analysis.model_used = metadata.get("model_used")
            analysis.is_generating = False
            analysis.generation_error = None
            db.commit()

            logger.debug("CV quality saved %s", analysis_id)
        else:
            # Record was deleted between task creation and completion
            # This is expected behavior - frontend will get 404 and stop polling
            logger.info(
                f"CV quality analysis record not found (likely deleted) - "
                f"analysis_id={analysis_id}, cv_id={cv_id}, user_id={user_id}"
            )

    except Exception as e:
        # Update error state (no stack trace; common.py already logs user-friendly message)
        logger.error(
            f"CV quality analysis failed - analysis_id={analysis_id}: {str(e)}",
        )

        try:
            db.rollback()  # Always rollback first before querying
            analysis = (
                db.query(CVQualityAnalysis)
                .filter(CVQualityAnalysis.id == analysis_id)
                .first()
            )

            if analysis:
                analysis.is_generating = False
                analysis.generation_error = str(e)
                db.commit()
        except Exception as commit_error:
            # Critical: If we can't update error state, log critical error
            logger.critical(
                f"CRITICAL: Unable to update error state - "
                f"analysis_id={analysis_id} stuck in generating state. "
                f"Manual intervention required. Error: {str(commit_error)}"
            )

    finally:
        try:
            loop.close()
        except Exception:
            pass
        db.close()


async def cv_quality_analysis_background(
    analysis_id: str,
    cv_data: dict,
    user_id: str,
    cv_id: str,
    correction_mode: str = "proofread",
):
    """
    Background task wrapper for CV quality analysis.

    Args:
        analysis_id: CVQualityAnalysis record ID
        cv_data: Complete CV data dictionary
        user_id: User ID
        cv_id: CV ID
        correction_mode: 'proofread' or 'coaching'
    """
    await run_task_in_background(
        analysis_id,
        "cv_quality_analysis",
        cv_quality_analysis_sync,
        cv_data,
        user_id,
        cv_id,
        correction_mode,
    )
