"""
CV API Common Utilities

This module provides shared utilities and constants used across CV API endpoints,
including background task execution, logging, rate limiting, and preview job storage.
"""

import asyncio
import logging
import os
from concurrent.futures import ThreadPoolExecutor

from src.utils.rate_limit import create_combined_limiter
from src.utils.feature_flags import is_cv_history_enabled
from src.models.base import SessionLocal
from src.models.cv import CV
from src.models.cv_history import CVHistory
from src.services.cv_parsing_service import parse_cv_with_openai

# Rate limiter for CV operations
limiter = create_combined_limiter()

# Thread pool for background parsing (configurable)
_workers = int(os.getenv("CV_PARSE_WORKERS", "2"))
executor = ThreadPoolExecutor(max_workers=max(1, _workers))

# Logger for background task monitoring
logger = logging.getLogger(__name__)

# In-memory job storage for preview generation (simple dict for MVP)
# TODO: Replace with Redis or proper queue for production
_preview_jobs: dict[str, dict] = {}


def parse_cv_sync(cv_id: str, file_content: bytes, filename: str, content_type: str):
    """
    Synchronous CV parsing function to run in thread pool.

    CRITICAL: This runs in a background thread, so it must manage its own
    database session and ensure cleanup to prevent connection pool exhaustion.
    The session must be closed in a finally block to guarantee the connection
    is returned to the pool even if exceptions occur.
    """
    db = SessionLocal()
    try:
        # Get CV record to retrieve user_id for AI usage logging
        cv = db.query(CV).filter(CV.id == cv_id).first()
        user_id = str(cv.user_id) if cv else None

        # Parse CV content (run async function in sync context)
        parsed_data = asyncio.run(
            parse_cv_with_openai(
                file_content,
                filename,
                content_type,
                user_id=user_id,
                cv_id=cv_id,
                db_session=db,
            )
        )

        # Update CV record with parsed data
        if cv:
            cv.parsed_data = parsed_data
            # Check for errors before setting is_parsed
            if parsed_data.get("error"):
                cv.is_parsed = False
                cv.parse_error = parsed_data["error"]
            else:
                cv.is_parsed = True
                cv.parse_error = None
            db.commit()
            db.refresh(cv)

            # Create initial history entry after successful parsing (if feature is enabled)
            if not parsed_data.get("error") and is_cv_history_enabled():
                import json

                # Check if initial history entry already exists
                existing_initial = (
                    db.query(CVHistory)
                    .filter(CVHistory.cv_id == cv_id, CVHistory.is_initial == True)
                    .first()
                )

                if not existing_initial:
                    # Calculate data size
                    data_size = len(json.dumps(parsed_data).encode("utf-8"))

                    # Create initial history entry
                    initial_entry = CVHistory(
                        cv_id=cv_id,
                        user_id=cv.user_id,
                        cv_data=parsed_data,
                        change_type="initial_load",
                        description="Original version",
                        label="Initial CV",
                        is_automatic=True,
                        is_initial=True,
                        data_size=data_size,
                    )

                    db.add(initial_entry)
                    db.commit()

    except Exception as e:
        # Rollback failed transaction to prevent connection issues
        db.rollback()
        logger.error(f"Background parsing failed for CV {cv_id}: {str(e)}")

        # Try to update CV with error message (using same session after rollback)
        try:
            cv = db.query(CV).filter(CV.id == cv_id).first()
            if cv:
                cv.is_parsed = False
                cv.parse_error = f"Background parsing failed: {str(e)}"
                db.commit()
        except Exception as update_error:
            logger.error(
                f"Failed to update CV error status for CV {cv_id}: {update_error}"
            )

    finally:
        # Always close the session to return connection to pool
        try:
            db.close()
            logger.debug(f"Database session closed for CV {cv_id} background parsing")
        except Exception as close_error:
            logger.error(
                f"Failed to close database session for CV {cv_id}: {close_error}"
            )


async def parse_cv_background(
    cv_id: str, file_content: bytes, filename: str, content_type: str
):
    """Parse CV in background using thread pool executor"""
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(
        executor, parse_cv_sync, cv_id, file_content, filename, content_type
    )


def get_preview_jobs():
    """Get the preview jobs dictionary (for internal use in preview module)."""
    return _preview_jobs
