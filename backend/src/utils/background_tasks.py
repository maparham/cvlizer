"""
Background task processing infrastructure for non-blocking operations.

This module provides a reusable ThreadPoolExecutor-based system for running
long-running operations in the background without blocking the main API thread.
Follows the same pattern as CV parsing for consistency.
"""

import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Callable, Dict, Optional, Type

from sqlalchemy.orm import Session

from src.config import BackgroundTaskConfig
from src.models.base import SessionLocal

logger = logging.getLogger(__name__)

# Thread pool for background tasks (configurable via environment)
executor = ThreadPoolExecutor(max_workers=max(1, BackgroundTaskConfig.WORKERS))

# Dedicated executor for CV parsing (avoids blocking other background work)
cv_parse_executor = ThreadPoolExecutor(
    max_workers=max(1, BackgroundTaskConfig.CV_PARSE_WORKERS)
)


async def run_task_in_background(
    task_id: str, task_type: str, processing_function: Callable, *args, **kwargs
) -> None:
    """
    Run a processing function in the background using thread pool executor.

    Args:
        task_id: Unique identifier for the task
        task_type: Type of task for logging/debugging
        processing_function: The function to run in background
        *args: Positional arguments to pass to processing function
        **kwargs: Keyword arguments to pass to processing function

    The processing function should:
    - Accept task_id as first parameter
    - Create its own database session (SessionLocal())
    - Handle all errors internally
    - Update the database record on completion/failure
    - Close the database session in finally block
    """
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(executor, processing_function, task_id, *args, **kwargs)


def finalize_task_failure(
    db: Session,
    model_class: Type[Any],
    record_id: str,
    error_message: str,
    *,
    log_context: str = "",
) -> bool:
    """
    Persist a failure state on a background-task record after an error.

    This is the single correct way for a background worker to record that its
    task failed. It **rolls back first** so that the recovery query runs on a
    clean session: without the rollback, a session left in a failed transaction
    (e.g. after a flush/commit error) raises ``PendingRollbackError`` on the very
    next query, which historically got swallowed and left the record stuck in
    ``is_generating=True`` forever.

    The target model must expose ``id``, ``is_generating`` and
    ``generation_error`` columns (AIEnhancement, CVQualityAnalysis, AIDraft).

    Args:
        db: The worker's database session (may be in a failed transaction).
        model_class: SQLAlchemy model to update.
        record_id: Primary-key id of the record to mark failed.
        error_message: User-facing error string to store.
        log_context: Optional identifier for logs (e.g. cv_id/user_id).

    Returns:
        True if the failure state was persisted; False if the record was
        already gone or the update itself failed (logged as critical).
    """
    try:
        db.rollback()  # Always rollback first so the recovery query is on a clean session.
        record = db.query(model_class).filter(model_class.id == record_id).first()
        if record is None:
            # Record was deleted between task start and failure - expected;
            # the frontend gets a 404 and stops polling.
            logger.info(
                "finalize_task_failure: %s %s not found (likely deleted) %s",
                model_class.__name__,
                record_id,
                log_context,
            )
            return False

        record.is_generating = False
        record.generation_error = error_message
        db.commit()
        return True
    except Exception as commit_error:
        # If we cannot even record the failure, the record stays generating and
        # will only be freed by the periodic stuck-task cleanup. Surface loudly.
        logger.critical(
            "finalize_task_failure: CRITICAL - unable to persist failure for "
            "%s %s %s; record may be stuck generating. Error: %s",
            model_class.__name__,
            record_id,
            log_context,
            str(commit_error),
        )
        try:
            db.rollback()
        except Exception:
            pass
        return False


def create_database_session() -> Session:
    """
    Create a new database session for background tasks.

    Returns:
        New SQLAlchemy session for thread-safe database operations
    """
    return SessionLocal()


def safe_close_session(session: Session) -> None:
    """
    Safely close a database session, handling any errors.

    Args:
        session: SQLAlchemy session to close
    """
    try:
        session.close()
    except Exception:
        # Ignore errors when closing session
        pass
