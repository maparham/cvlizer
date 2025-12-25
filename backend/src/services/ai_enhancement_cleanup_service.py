"""
AI Enhancement Cleanup Service

This module provides automated cleanup for stuck AI enhancement generation tasks.
It can be run as a background job or scheduled task to periodically check for
and fix AI enhancements that are stuck in the generating state.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import List, Tuple

from sqlalchemy.orm import Session

from src.models.ai_draft import AIDraft
from src.models.ai_enhancement import AIEnhancement
from src.models.cv_quality_analysis import CVQualityAnalysis

logger = logging.getLogger(__name__)


def find_stuck_ai_enhancements(
    db: Session, timeout_seconds: int = 100
) -> List[AIEnhancement]:
    """
    Find AI enhancements that are stuck in is_generating=True state.

    Args:
        db: Database session
        timeout_seconds: Number of seconds after which a generation task is considered stuck

    Returns:
        List of stuck AIEnhancement records
    """
    cutoff_time = datetime.now(timezone.utc) - timedelta(seconds=timeout_seconds)

    stuck_enhancements = (
        db.query(AIEnhancement)
        .filter(
            AIEnhancement.is_generating.is_(True),
            AIEnhancement.created_at < cutoff_time,
        )
        .all()
    )

    return stuck_enhancements


def fix_stuck_ai_enhancement(
    db: Session,
    enhancement_id: str,
    error_message: str = "AI suggestion generation timed out or was interrupted. Please try generating suggestions again.",
) -> bool:
    """
    Fix a single stuck AI enhancement by setting is_generating=False and adding an error message.

    Args:
        db: Database session
        enhancement_id: AI enhancement ID
        error_message: Error message to set

    Returns:
        True if fixed successfully, False otherwise
    """
    try:
        enhancement = (
            db.query(AIEnhancement).filter(AIEnhancement.id == enhancement_id).first()
        )

        if not enhancement:
            logger.warning(f"AI enhancement {enhancement_id} not found")
            return False

        if not enhancement.is_generating:
            logger.info(f"AI enhancement {enhancement_id} is not in generating state")
            return False

        enhancement.is_generating = False
        enhancement.generation_error = error_message
        db.commit()

        logger.info(f"Fixed stuck AI enhancement {enhancement_id}")
        return True

    except Exception as e:
        logger.error(f"Failed to fix AI enhancement {enhancement_id}: {str(e)}")
        db.rollback()
        return False


def cleanup_stuck_ai_enhancements(
    db: Session, timeout_seconds: int = 100
) -> Tuple[int, int]:
    """
    Find and fix all stuck AI enhancements.

    Args:
        db: Database session
        timeout_seconds: Number of seconds after which a generation task is considered stuck

    Returns:
        Tuple of (found_count, fixed_count)
    """
    stuck_enhancements = find_stuck_ai_enhancements(db, timeout_seconds)
    found_count = len(stuck_enhancements)

    if found_count == 0:
        logger.info("No stuck AI enhancements found")
        return 0, 0

    logger.info(f"Found {found_count} stuck AI enhancement(s)")

    fixed_count = 0
    for enhancement in stuck_enhancements:
        if fix_stuck_ai_enhancement(
            db,
            enhancement.id,
            "AI suggestion generation timed out or was interrupted. Please try generating suggestions again.",
        ):
            fixed_count += 1

    logger.info(f"Fixed {fixed_count} out of {found_count} stuck AI enhancement(s)")
    return found_count, fixed_count


def get_enhancement_statistics(db: Session) -> dict:
    """
    Get statistics about AI enhancement generation tasks.

    Args:
        db: Database session

    Returns:
        Dictionary with enhancement statistics
    """
    total_generating = (
        db.query(AIEnhancement).filter(AIEnhancement.is_generating.is_(True)).count()
    )

    stuck_enhancements = find_stuck_ai_enhancements(db)
    stuck_count = len(stuck_enhancements)

    active_count = total_generating - stuck_count

    return {
        "total_generating": total_generating,
        "active_generating": active_count,
        "stuck_generating": stuck_count,
        "stuck_enhancements": [
            {
                "id": enhancement.id,
                "user_id": enhancement.user_id,
                "cv_id": enhancement.cv_id,
                "job_description_id": enhancement.job_description_id,
                "created_at": enhancement.created_at.isoformat(),
                "age_seconds": (
                    datetime.now(timezone.utc) - enhancement.created_at
                ).total_seconds(),
            }
            for enhancement in stuck_enhancements
        ],
    }


def cancel_all_running_ai_tasks(db: Session) -> Tuple[int, int, int]:
    """
    Cancel all running AI tasks by marking them as failed.

    This function is called on backend startup to cancel any in-flight AI tasks
    since the AI API connections are lost during restart.

    Args:
        db: Database session

    Returns:
        Tuple of (enhancements_cancelled, drafts_cancelled, quality_analyses_cancelled)
    """
    error_message = "AI task was cancelled due to server restart. Please try again."

    enhancements_cancelled = 0
    drafts_cancelled = 0
    quality_analyses_cancelled = 0

    try:
        # Cancel all running AI enhancements
        running_enhancements = (
            db.query(AIEnhancement).filter(AIEnhancement.is_generating.is_(True)).all()
        )

        for enhancement in running_enhancements:
            enhancement.is_generating = False
            enhancement.generation_error = error_message
            enhancements_cancelled += 1

        # Cancel all running AI drafts
        running_drafts = db.query(AIDraft).filter(AIDraft.is_generating.is_(True)).all()

        for draft in running_drafts:
            draft.is_generating = False
            draft.generation_error = error_message
            drafts_cancelled += 1

        # Cancel all running CV quality analyses
        running_quality_analyses = (
            db.query(CVQualityAnalysis)
            .filter(CVQualityAnalysis.is_generating.is_(True))
            .all()
        )

        for analysis in running_quality_analyses:
            analysis.is_generating = False
            analysis.generation_error = error_message
            quality_analyses_cancelled += 1

        # Commit all changes
        if (
            enhancements_cancelled > 0
            or drafts_cancelled > 0
            or quality_analyses_cancelled > 0
        ):
            db.commit()
            logger.info(
                f"Cancelled {enhancements_cancelled} AI enhancement(s), "
                f"{drafts_cancelled} AI draft(s), and "
                f"{quality_analyses_cancelled} CV quality analysis/analyses on startup"
            )
        else:
            logger.info("No running AI tasks found to cancel on startup")

        return enhancements_cancelled, drafts_cancelled, quality_analyses_cancelled

    except Exception as e:
        logger.error(f"Failed to cancel running AI tasks: {str(e)}")
        db.rollback()
        return enhancements_cancelled, drafts_cancelled, quality_analyses_cancelled
