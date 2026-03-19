"""
Cleanup expired and stale CV export preview jobs (database rows + disk files).
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from src.config import PreviewJobConfig
from src.models.preview_job import PreviewJob
from src.utils.preview_storage import delete_preview_files

logger = logging.getLogger(__name__)


def cleanup_expired_preview_jobs(db: Session) -> int:
    """
    Delete preview jobs past expires_at and remove their files.

    Returns:
        Number of jobs removed.
    """
    now = datetime.now(timezone.utc)
    expired = db.query(PreviewJob).filter(PreviewJob.expires_at < now).all()
    count = 0
    for job in expired:
        delete_preview_files(job.job_id)
        db.delete(job)
        count += 1
    if count:
        db.commit()
        logger.info("Removed %s expired preview job(s)", count)
    return count


def cleanup_stale_preview_jobs(db: Session) -> int:
    """
    Remove jobs stuck in pending/processing (e.g. worker crash) after STALE_MINUTES.

    Returns:
        Number of jobs removed.
    """
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(minutes=PreviewJobConfig.STALE_MINUTES)
    stale = (
        db.query(PreviewJob)
        .filter(
            PreviewJob.status.in_(("pending", "processing")),
            PreviewJob.created_at < cutoff,
        )
        .all()
    )
    count = 0
    for job in stale:
        delete_preview_files(job.job_id)
        db.delete(job)
        count += 1
    if count:
        db.commit()
        logger.info("Removed %s stale preview job(s)", count)
    return count


def run_preview_job_cleanup(db: Session) -> tuple[int, int]:
    """Run both expired and stale cleanup. Returns (expired_count, stale_count)."""
    e = cleanup_expired_preview_jobs(db)
    s = cleanup_stale_preview_jobs(db)
    return e, s
