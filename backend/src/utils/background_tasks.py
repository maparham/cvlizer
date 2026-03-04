"""
Background task processing infrastructure for non-blocking operations.

This module provides a reusable ThreadPoolExecutor-based system for running
long-running operations in the background without blocking the main API thread.
Follows the same pattern as CV parsing for consistency.
"""

import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Callable, Dict, Optional

from sqlalchemy.orm import Session

from src.config import BackgroundTaskConfig
from src.models.base import SessionLocal

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
