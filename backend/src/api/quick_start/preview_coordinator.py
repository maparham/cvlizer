"""
Parallel execution coordinator for quick start preview.

This module orchestrates the parallel parsing of CV and job description
with fail-fast optimization to save API costs when one task fails.
"""

import asyncio
import logging
from typing import Any, Dict, Optional, Tuple

from fastapi import Request, UploadFile

from src.api.quick_start.models import QuickStartPreviewResponse

logger = logging.getLogger(__name__)


def _identify_task_name(task, tasks_dict) -> Optional[str]:
    """
    Identify which task (cv/job) a completed task corresponds to.

    Args:
        task: The completed task
        tasks_dict: Dictionary mapping task names to task objects

    Returns:
        Task name (cv/job) or None if not found
    """
    for name, t in tasks_dict.items():
        if t == task:
            return name
    return None


async def _process_completed_tasks(
    done: set,
    tasks: Dict,
    cv_file: Optional[UploadFile],
    job_url: Optional[str],
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """
    Process completed tasks and extract results.

    Args:
        done: Set of completed tasks
        tasks: Dictionary mapping task names to task objects
        cv_file: CV file for error messages
        job_url: Job URL for error messages

    Returns:
        Tuple of (cv_preview, job_preview) dictionaries
    """
    cv_preview: Dict[str, Any] = {}
    job_preview: Dict[str, Any] = {}

    for task in done:
        try:
            result = await task

            # Determine which task completed by checking the task name
            task_name = _identify_task_name(task, tasks)

            if task_name == "cv":
                cv_preview = result
            elif task_name == "job":
                job_preview = result

        except Exception as e:
            # Handle exceptions from individual tasks
            task_name = _identify_task_name(task, tasks)

            logger.error(f"{task_name} parsing failed: {str(e)}")
            if task_name == "cv":
                cv_preview = {
                    "error": f"Failed to parse CV: {str(e)}",
                    "filename": cv_file.filename if cv_file else "unknown",
                }
            elif task_name == "job":
                job_preview = {
                    "error": f"Failed to parse job: {str(e)}",
                    "source": "url" if job_url else "text",
                }

    return cv_preview, job_preview


def _should_fail_fast(
    cv_preview: Dict[str, Any], job_preview: Dict[str, Any], pending: set
) -> Optional[QuickStartPreviewResponse]:
    """
    Determine if we should fail-fast and cancel remaining tasks.

    Args:
        cv_preview: CV preview result
        job_preview: Job preview result
        pending: Set of pending tasks

    Returns:
        QuickStartPreviewResponse to return immediately, or None to continue
    """
    # IMMEDIATE RETURN: If CV failed, return now without waiting for job
    if cv_preview and cv_preview.get("error"):
        logger.debug(
            f"CV parsing failed - returning immediately without waiting for job parsing"
        )

        # Cancel pending tasks (fire and forget)
        if pending:
            for pending_task in pending:
                pending_task.cancel()

        # Set empty job_preview (cancelled)
        if not job_preview:
            job_preview = {}

        # Return immediately with CV error
        return QuickStartPreviewResponse(
            cv_preview=cv_preview,
            job_preview=job_preview,
            success=False,
            message="CV parsing failed",
        )

    # IMMEDIATE RETURN: If job failed, return now without waiting for CV
    if job_preview and job_preview.get("error"):
        logger.debug(
            f"Job parsing failed - returning immediately without waiting for CV parsing"
        )

        # Cancel pending tasks (fire and forget)
        if pending:
            for pending_task in pending:
                pending_task.cancel()

        # Set empty cv_preview (cancelled)
        if not cv_preview:
            cv_preview = {}

        # Return immediately with job error
        return QuickStartPreviewResponse(
            cv_preview=cv_preview,
            job_preview=job_preview,
            success=False,
            message="Job description parsing failed",
        )

    return None


async def coordinate_parallel_parsing(
    cv_task: Optional[asyncio.Task],
    job_task: Optional[asyncio.Task],
    cv_file: Optional[UploadFile],
    job_url: Optional[str],
    job_text: Optional[str],
) -> QuickStartPreviewResponse:
    """
    Orchestrate parallel CV and job parsing with fail-fast behavior.

    This function creates parallel tasks, waits for first completion,
    and implements fail-fast logic to cancel remaining tasks if one fails.

    Args:
        cv_task: Optional CV parsing task
        job_task: Optional job parsing task
        cv_file: CV file for error messages
        job_url: Job URL for error messages
        job_text: Job text for error messages

    Returns:
        QuickStartPreviewResponse with results or error information
    """
    cv_preview: Dict[str, Any] = {}
    job_preview: Dict[str, Any] = {}

    # Build tasks dictionary
    tasks = {}
    if cv_task:
        tasks["cv"] = cv_task
    if job_task:
        tasks["job"] = job_task

    if not tasks:
        return QuickStartPreviewResponse(
            cv_preview={}, job_preview={}, success=False, message="No tasks provided"
        )

    # Execute tasks with FIRST_COMPLETED strategy
    done, pending = await asyncio.wait(
        tasks.values(), return_when=asyncio.FIRST_COMPLETED
    )

    # Process completed tasks
    cv_preview, job_preview = await _process_completed_tasks(
        done, tasks, cv_file, job_url
    )

    # Check for fail-fast conditions
    fail_fast_response = _should_fail_fast(cv_preview, job_preview, pending)
    if fail_fast_response:
        return fail_fast_response

    # NORMAL FLOW: Wait for remaining tasks to complete
    if pending:
        logger.debug(f"Waiting for {len(pending)} remaining tasks to complete")
        remaining_done, _ = await asyncio.wait(pending, return_when=asyncio.ALL_COMPLETED)

        # Process remaining completed tasks
        for task in remaining_done:
            try:
                result = await task

                # Determine which task completed by checking the task name
                task_name = _identify_task_name(task, tasks)

                if task_name == "cv":
                    cv_preview = result
                elif task_name == "job":
                    job_preview = result

            except Exception as e:
                # Handle exceptions from remaining tasks
                task_name = _identify_task_name(task, tasks)

                logger.error(f"{task_name} parsing failed: {str(e)}")
                if task_name == "cv":
                    cv_preview = {
                        "error": f"Failed to parse CV: {str(e)}",
                        "filename": cv_file.filename if cv_file else "unknown",
                    }
                elif task_name == "job":
                    job_preview = {
                        "error": f"Failed to parse job: {str(e)}",
                        "source": "url" if job_url else "text",
                    }

    # Determine overall success
    cv_success = "error" not in cv_preview
    job_provided = bool(job_url or job_text)

    # Job is successful if: provided and (no error OR empty/cancelled)
    job_actually_ran = job_provided and (job_preview and job_preview != {})
    job_success = job_actually_ran and ("error" not in job_preview)

    # Overall success: CV must succeed, and job (if provided) must succeed
    overall_success = cv_success and (job_success if job_provided else True)

    # Generate appropriate message based on what was provided
    if not job_provided:
        # CV only
        message = "Successfully parsed CV" if cv_success else "CV parsing failed"
    else:
        # CV + Job
        if overall_success:
            message = "Successfully parsed CV and job description"
        elif cv_success and not job_success:
            message = "CV parsed successfully, but job description parsing failed"
        elif not cv_success and job_success:
            message = "Job description parsed successfully, but CV parsing failed"
        else:
            # CV failed - check if job actually ran
            if job_actually_ran and not job_success:
                message = "Failed to parse both CV and job description"
            else:
                # Job was cancelled or never ran
                message = "CV parsing failed"

    return QuickStartPreviewResponse(
        cv_preview=cv_preview,
        job_preview=job_preview,
        success=overall_success,
        message=message,
    )
