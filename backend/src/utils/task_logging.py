"""
Utilities for fire-and-forget asyncio task error logging.

Provides a shared callback so background tasks log exceptions consistently
instead of failing silently.
"""

import asyncio
import logging
from typing import Any


def make_task_exception_logger(
    logger: logging.Logger, message_template: str, *static_args: Any
):
    """
    Return a done_callback for asyncio.Task that logs any exception.

    Use with task.add_done_callback(...). The message_template should
    include one extra %s for the exception (e.g. "Task failed: id=%s, error=%s").
    static_args are the format args known at callback creation time; the
    exception is appended when the callback runs.

    Example:
        task.add_done_callback(
            make_task_exception_logger(
                logger, "CV parsing failed: cv_id=%s, error=%s", str(cv_id)
            )
        )
    """

    def callback(task: asyncio.Task) -> None:
        try:
            exc = task.exception()
        except asyncio.CancelledError:
            # Task was cancelled; no need to log (cancellation is normal).
            return
        if exc is not None:
            logger.error(message_template, *static_args, exc, exc_info=True)

    return callback
