"""
Cleanup service for periodic maintenance tasks.

This module provides background cleanup tasks for maintaining database
hygiene and removing expired or stale data. Includes cleanup for
impersonation sessions, audit logs, and other time-sensitive data.

Key responsibilities:
- Clean up expired impersonation sessions
- Remove old audit logs based on retention policy
- Perform database maintenance tasks
- Log cleanup activities for monitoring
"""

import asyncio
import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy.orm import Session

from src.models.audit_log import AuditLog
from src.models.base import SessionLocal
from src.models.impersonation_session import ImpersonationSession
from src.services.ai_enhancement_cleanup_service import (
    cancel_all_running_ai_tasks,
    cleanup_stuck_ai_enhancements,
)
from src.services.impersonation_service import cleanup_expired_sessions
from src.services.preview_cleanup_service import run_preview_job_cleanup

logger = logging.getLogger(__name__)

# Configuration from environment variables
DATA_RETENTION_DAYS_SESSIONS = int(os.getenv("DATA_RETENTION_DAYS_SESSIONS", "90"))
DATA_RETENTION_DAYS_AUDIT = int(os.getenv("DATA_RETENTION_DAYS_AUDIT", "365"))
CLEANUP_INTERVAL_MINUTES = int(os.getenv("CLEANUP_INTERVAL_MINUTES", "60"))


class CleanupService:
    """Service for running periodic cleanup tasks."""

    def __init__(self):
        self.running = False
        self.cleanup_task: Optional[asyncio.Task] = None

    async def start(self):
        """Start the cleanup service."""
        if self.running:
            logger.warning("Cleanup service is already running")
            return

        self.running = True
        self.cleanup_task = asyncio.create_task(self._cleanup_loop())
        logger.info(
            f"Cleanup service started with {CLEANUP_INTERVAL_MINUTES} minute intervals"
        )

    async def stop(self):
        """Stop the cleanup service."""
        if not self.running:
            return

        self.running = False
        if self.cleanup_task:
            self.cleanup_task.cancel()
            try:
                await self.cleanup_task
            except asyncio.CancelledError:
                pass

        logger.info("Cleanup service stopped")

    async def _cleanup_loop(self):
        """Main cleanup loop that runs periodically."""
        while self.running:
            try:
                await self.run_cleanup()
                await asyncio.sleep(CLEANUP_INTERVAL_MINUTES * 60)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in cleanup loop: {str(e)}")
                # Wait a bit before retrying to avoid tight error loops
                await asyncio.sleep(60)

    async def run_cleanup(self):
        """Run all cleanup tasks."""
        db = SessionLocal()
        try:
            try:
                # Clean up expired impersonation sessions
                expired_sessions = cleanup_expired_sessions(db)
                if expired_sessions > 0:
                    logger.info(
                        f"Cleaned up {expired_sessions} expired impersonation sessions"
                    )

                # Clean up old impersonation session records
                old_sessions = self._cleanup_old_sessions(db)
                if old_sessions > 0:
                    logger.info(
                        f"Cleaned up {old_sessions} old impersonation session records"
                    )

                # Clean up old audit logs
                old_audit_logs = self._cleanup_old_audit_logs(db)
                if old_audit_logs > 0:
                    logger.info(f"Cleaned up {old_audit_logs} old audit log records")

                # Clean up stuck AI enhancements
                stuck_enhancements = self._cleanup_stuck_ai_enhancements(db)
                if stuck_enhancements > 0:
                    logger.info(
                        f"Cleaned up {stuck_enhancements} stuck AI enhancement(s)"
                    )

                expired_previews, stale_previews = run_preview_job_cleanup(db)
                if expired_previews > 0 or stale_previews > 0:
                    logger.info(
                        "Cleaned up %s expired and %s stale export preview job(s)",
                        expired_previews,
                        stale_previews,
                    )

            finally:
                db.close()

        except Exception as e:
            logger.error(f"Error during cleanup: {str(e)}")

    def _cleanup_old_sessions(self, db: Session) -> int:
        """Clean up old impersonation session records."""
        try:
            cutoff_date = datetime.now(timezone.utc) - timedelta(
                days=DATA_RETENTION_DAYS_SESSIONS
            )

            # Delete old session records
            deleted_count = (
                db.query(ImpersonationSession)
                .filter(ImpersonationSession.started_at < cutoff_date)
                .delete()
            )

            if deleted_count > 0:
                db.commit()

            return deleted_count

        except Exception as e:
            logger.error(f"Error cleaning up old sessions: {str(e)}")
            db.rollback()
            return 0

    def _cleanup_old_audit_logs(self, db: Session) -> int:
        """Clean up old audit log records."""
        try:
            cutoff_date = datetime.now(timezone.utc) - timedelta(
                days=DATA_RETENTION_DAYS_AUDIT
            )

            # Delete old audit log records
            deleted_count = (
                db.query(AuditLog).filter(AuditLog.timestamp < cutoff_date).delete()
            )

            if deleted_count > 0:
                db.commit()

            return deleted_count

        except Exception as e:
            logger.error(f"Error cleaning up old audit logs: {str(e)}")
            db.rollback()
            return 0

    def _cleanup_stuck_ai_enhancements(self, db: Session) -> int:
        """Clean up stuck AI enhancements."""
        try:
            found_count, fixed_count = cleanup_stuck_ai_enhancements(db)
            return fixed_count
        except Exception as e:
            logger.error(f"Error cleaning up stuck AI enhancements: {str(e)}")
            db.rollback()
            return 0


# Global cleanup service instance
cleanup_service = CleanupService()


async def start_cleanup_service():
    """Start the global cleanup service."""
    await cleanup_service.start()


async def stop_cleanup_service():
    """Stop the global cleanup service."""
    await cleanup_service.stop()


def cancel_running_ai_tasks_on_startup():
    """
    Cancel all running AI tasks on backend startup.

    This should be called once during application startup to cancel any
    in-flight AI tasks since the AI API connections are lost during restart.

    Returns:
        Tuple of (enhancements_cancelled, drafts_cancelled, quality_analyses_cancelled)
    """
    db = SessionLocal()
    try:
        try:
            (
                enhancements_cancelled,
                drafts_cancelled,
                quality_analyses_cancelled,
            ) = cancel_all_running_ai_tasks(db)
            if (
                enhancements_cancelled > 0
                or drafts_cancelled > 0
                or quality_analyses_cancelled > 0
            ):
                logger.info(
                    f"Cancelled {enhancements_cancelled} AI enhancement(s), "
                    f"{drafts_cancelled} AI draft(s), and "
                    f"{quality_analyses_cancelled} CV quality analysis/analyses on startup"
                )
            return enhancements_cancelled, drafts_cancelled, quality_analyses_cancelled
        finally:
            db.close()
    except Exception as e:
        logger.error(f"Failed to cancel running AI tasks on startup: {e}")
        return 0, 0, 0


def run_cleanup_once():
    """Run cleanup tasks once (for manual execution or testing)."""
    db = SessionLocal()
    try:
        try:
            # Clean up expired impersonation sessions
            expired_sessions = cleanup_expired_sessions(db)
            logger.info(f"Cleaned up {expired_sessions} expired impersonation sessions")

            # Clean up old records
            service = CleanupService()
            old_sessions = service._cleanup_old_sessions(db)
            old_audit_logs = service._cleanup_old_audit_logs(db)
            stuck_enhancements = service._cleanup_stuck_ai_enhancements(db)

            expired_previews, stale_previews = run_preview_job_cleanup(db)

            logger.info(
                f"Manual cleanup completed: {old_sessions} old sessions, "
                f"{old_audit_logs} old audit logs, {stuck_enhancements} stuck AI enhancements, "
                f"{expired_previews} expired preview jobs, {stale_previews} stale preview jobs"
            )

        finally:
            db.close()

    except Exception as e:
        logger.error(f"Error during manual cleanup: {str(e)}")
        raise
