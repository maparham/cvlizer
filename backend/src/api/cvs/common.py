"""
CV API Common Utilities

This module provides shared utilities and constants used across CV API endpoints,
including background task execution, logging, rate limiting, and preview job storage.
"""

import asyncio
import logging

from src.constants import ERROR_INVALID_FILE_OR_EXTRACTION
from src.exceptions import ExtractionError, InvalidFileException
from src.utils.background_tasks import cv_parse_executor
from src.utils.rate_limit import create_combined_limiter
from src.utils.feature_flags import is_cv_history_enabled
from src.models.base import SessionLocal
from src.models.cv import CV
from src.models.cv_history import CVHistory
from src.services.cv.cv_parsing_service import (
    parse_cv_text_pipeline,
    parse_cv_with_openai,
)

# Rate limiter for CV operations
limiter = create_combined_limiter()

# Logger for background task monitoring
logger = logging.getLogger(__name__)


def _handle_parse_error(
    db, cv_id: str, log: logging.Logger, parse_error_message: str
) -> None:
    """Update CV record with parse error; log if update fails."""
    try:
        cv = db.query(CV).filter(CV.id == cv_id).first()
        if cv:
            cv.is_parsed = False
            cv.parse_error = parse_error_message
            db.commit()
    except Exception as update_error:
        log.error(
            "Failed to update CV error status for CV %s: %s",
            cv_id,
            update_error,
        )


def parse_cv_sync(cv_id: str, file_content: bytes, filename: str, content_type: str):
    """
    Synchronous CV parsing function to run in thread pool.

    CRITICAL: This runs in a background thread, so it must manage its own
    database session and ensure cleanup to prevent connection pool exhaustion.
    The session must be closed in a finally block to guarantee the connection
    is returned to the pool even if exceptions occur.
    """
    logger.debug(
        "CV parse (file) start cv_id=%s filename=%s content_type=%s bytes=%s",
        cv_id,
        filename,
        content_type,
        len(file_content),
    )
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
            logger.debug(
                "CV parse (file) finished cv_id=%s ok=%s",
                cv_id,
                not bool(parsed_data.get("error")),
            )
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

    except (InvalidFileException, ExtractionError):
        db.rollback()
        logger.error(
            "Background parsing failed for CV %s: invalid file or extraction error",
            cv_id,
        )
        _handle_parse_error(db, cv_id, logger, ERROR_INVALID_FILE_OR_EXTRACTION)
    except Exception as e:
        db.rollback()
        logger.error("Background parsing failed for CV %s: %s", cv_id, e)
        _handle_parse_error(db, cv_id, logger, f"Background parsing failed: {str(e)}")

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
    logger.debug(
        "CV parse (file) executor submit cv_id=%s filename=%s",
        cv_id,
        filename,
    )
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(
        cv_parse_executor, parse_cv_sync, cv_id, file_content, filename, content_type
    )


def parse_cv_from_text_sync(cv_id: str, raw_text: str):
    """
    Synchronous parse of pasted CV text (same DB updates as parse_cv_sync).

    Runs in a background thread; manages its own DB session and closes it in finally.
    """
    logger.debug(
        "CV parse (text) start cv_id=%s chars=%s",
        cv_id,
        len(raw_text) if raw_text else 0,
    )
    db = SessionLocal()
    try:
        cv = db.query(CV).filter(CV.id == cv_id).first()
        user_id = str(cv.user_id) if cv else None

        parsed_data = asyncio.run(
            parse_cv_text_pipeline(
                raw_text,
                user_id=user_id,
                cv_id=cv_id,
                db_session=db,
            )
        )

        if cv:
            cv.parsed_data = parsed_data
            if parsed_data.get("error"):
                cv.is_parsed = False
                cv.parse_error = parsed_data["error"]
            else:
                cv.is_parsed = True
                cv.parse_error = None
            logger.debug(
                "CV parse (text) finished cv_id=%s ok=%s",
                cv_id,
                not bool(parsed_data.get("error")),
            )
            db.commit()
            db.refresh(cv)

            if not parsed_data.get("error") and is_cv_history_enabled():
                import json

                existing_initial = (
                    db.query(CVHistory)
                    .filter(CVHistory.cv_id == cv_id, CVHistory.is_initial == True)
                    .first()
                )

                if not existing_initial:
                    data_size = len(json.dumps(parsed_data).encode("utf-8"))

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
        db.rollback()
        logger.error("Background text parsing failed for CV %s: %s", cv_id, e)
        _handle_parse_error(db, cv_id, logger, f"Background parsing failed: {str(e)}")

    finally:
        try:
            db.close()
            logger.debug(
                "Database session closed for CV %s background text parsing", cv_id
            )
        except Exception as close_error:
            logger.error(
                "Failed to close database session for CV %s: %s",
                cv_id,
                close_error,
            )


async def parse_cv_from_text_background(cv_id: str, raw_text: str):
    """Parse pasted CV text in background using thread pool executor."""
    logger.debug("CV parse (text) executor submit cv_id=%s", cv_id)
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(
        cv_parse_executor, parse_cv_from_text_sync, cv_id, raw_text
    )
