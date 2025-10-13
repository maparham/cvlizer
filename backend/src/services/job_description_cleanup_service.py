"""
Job Description Cleanup Service

This module provides automated cleanup for stuck job description parsing tasks.
It can be run as a background job or scheduled task to periodically check for
and fix job descriptions that are stuck in the parsing state.
"""

import logging
from datetime import datetime, timedelta
from typing import List, Tuple
from sqlalchemy.orm import Session

from src.models.job_description import JobDescription

logger = logging.getLogger(__name__)


def find_stuck_job_descriptions(
    db: Session, timeout_minutes: int = 10
) -> List[JobDescription]:
    """
    Find job descriptions that are stuck in is_parsing=True state.

    Args:
        db: Database session
        timeout_minutes: Number of minutes after which a parsing task is considered stuck

    Returns:
        List of stuck JobDescription records
    """
    cutoff_time = datetime.utcnow() - timedelta(minutes=timeout_minutes)

    stuck_jds = (
        db.query(JobDescription)
        .filter(
            JobDescription.is_parsing == True, JobDescription.created_at < cutoff_time
        )
        .all()
    )

    return stuck_jds


def fix_stuck_job_description(
    db: Session,
    jd_id: str,
    error_message: str = "Parsing timed out. Please try again or enter the job description manually.",
) -> bool:
    """
    Fix a single stuck job description by setting is_parsing=False and adding an error message.

    Args:
        db: Database session
        jd_id: Job description ID
        error_message: Error message to set

    Returns:
        True if fixed successfully, False otherwise
    """
    try:
        jd = db.query(JobDescription).filter(JobDescription.id == jd_id).first()

        if not jd:
            logger.warning(f"Job description {jd_id} not found")
            return False

        if not jd.is_parsing:
            logger.info(f"Job description {jd_id} is not in parsing state")
            return False

        jd.is_parsing = False
        jd.parse_error = error_message
        db.commit()

        logger.info(f"Fixed stuck job description {jd_id}")
        return True

    except Exception as e:
        logger.error(f"Failed to fix job description {jd_id}: {str(e)}")
        db.rollback()
        return False


def cleanup_stuck_job_descriptions(
    db: Session, timeout_minutes: int = 10
) -> Tuple[int, int]:
    """
    Find and fix all stuck job descriptions.

    Args:
        db: Database session
        timeout_minutes: Number of minutes after which a parsing task is considered stuck

    Returns:
        Tuple of (found_count, fixed_count)
    """
    stuck_jds = find_stuck_job_descriptions(db, timeout_minutes)
    found_count = len(stuck_jds)

    if found_count == 0:
        logger.info("No stuck job descriptions found")
        return 0, 0

    logger.info(f"Found {found_count} stuck job description(s)")

    fixed_count = 0
    for jd in stuck_jds:
        if fix_stuck_job_description(
            db,
            jd.id,
            "Parsing timed out or failed. Please try again or enter the job description manually.",
        ):
            fixed_count += 1

    logger.info(f"Fixed {fixed_count} out of {found_count} stuck job description(s)")
    return found_count, fixed_count


def get_parsing_statistics(db: Session) -> dict:
    """
    Get statistics about job description parsing tasks.

    Args:
        db: Database session

    Returns:
        Dictionary with parsing statistics
    """
    total_parsing = (
        db.query(JobDescription).filter(JobDescription.is_parsing == True).count()
    )

    stuck_jds = find_stuck_job_descriptions(db)
    stuck_count = len(stuck_jds)

    active_count = total_parsing - stuck_count

    return {
        "total_parsing": total_parsing,
        "active_parsing": active_count,
        "stuck_parsing": stuck_count,
        "stuck_job_descriptions": [
            {
                "id": jd.id,
                "user_id": jd.user_id,
                "cv_id": jd.cv_id,
                "source_url": jd.source_url,
                "created_at": jd.created_at.isoformat(),
                "age_minutes": (datetime.utcnow() - jd.created_at).total_seconds() / 60,
            }
            for jd in stuck_jds
        ],
    }
