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
from datetime import datetime, timezone, timedelta
from typing import Optional
from sqlalchemy.orm import Session

from src.models.base import get_db
from src.services.impersonation_service import cleanup_expired_sessions
from src.models.audit_log import AuditLog
from src.models.impersonation_session import ImpersonationSession
import os

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
        logger.info(f"Cleanup service started with {CLEANUP_INTERVAL_MINUTES} minute intervals")
    
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
        logger.debug("Starting cleanup tasks")
        
        try:
            db = next(get_db())
            try:
                # Clean up expired impersonation sessions
                expired_sessions = cleanup_expired_sessions(db)
                if expired_sessions > 0:
                    logger.info(f"Cleaned up {expired_sessions} expired impersonation sessions")
                
                # Clean up old impersonation session records
                old_sessions = self._cleanup_old_sessions(db)
                if old_sessions > 0:
                    logger.info(f"Cleaned up {old_sessions} old impersonation session records")
                
                # Clean up old audit logs
                old_audit_logs = self._cleanup_old_audit_logs(db)
                if old_audit_logs > 0:
                    logger.info(f"Cleaned up {old_audit_logs} old audit log records")
                
                logger.debug("Cleanup tasks completed successfully")
                
            finally:
                db.close()
                
        except Exception as e:
            logger.error(f"Error during cleanup: {str(e)}")
    
    def _cleanup_old_sessions(self, db: Session) -> int:
        """Clean up old impersonation session records."""
        try:
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=DATA_RETENTION_DAYS_SESSIONS)
            
            # Delete old session records
            deleted_count = db.query(ImpersonationSession).filter(
                ImpersonationSession.started_at < cutoff_date
            ).delete()
            
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
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=DATA_RETENTION_DAYS_AUDIT)
            
            # Delete old audit log records
            deleted_count = db.query(AuditLog).filter(
                AuditLog.timestamp < cutoff_date
            ).delete()
            
            if deleted_count > 0:
                db.commit()
            
            return deleted_count
            
        except Exception as e:
            logger.error(f"Error cleaning up old audit logs: {str(e)}")
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


def run_cleanup_once():
    """Run cleanup tasks once (for manual execution or testing)."""
    try:
        db = next(get_db())
        try:
            # Clean up expired impersonation sessions
            expired_sessions = cleanup_expired_sessions(db)
            logger.info(f"Cleaned up {expired_sessions} expired impersonation sessions")
            
            # Clean up old records
            service = CleanupService()
            old_sessions = service._cleanup_old_sessions(db)
            old_audit_logs = service._cleanup_old_audit_logs(db)
            
            logger.info(f"Manual cleanup completed: {old_sessions} old sessions, {old_audit_logs} old audit logs")
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Error during manual cleanup: {str(e)}")
        raise
