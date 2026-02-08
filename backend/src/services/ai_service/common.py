"""
Shared utilities, types, and constants for AI services.

This module provides common functionality used across all AI service modules,
including type definitions, configuration, OpenAI client initialization,
and utility functions for API interaction and response processing.
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple, Type, TypedDict

import openai
from pydantic import BaseModel
from sqlalchemy.orm import Session

from src.config import AIConfig
from src.services.ai_service.responses_runner import run_openai_call

logger = logging.getLogger(__name__)

# ============================================================================
# Module Constants
# ============================================================================

# API retry configuration
RETRY_ATTEMPTS = 2
RETRY_DELAY = 0.5  # seconds

# API timeout configuration
API_TIMEOUT = 60.0  # seconds

# Content limits
MAX_JOB_CONTENT_LENGTH = 8000  # characters

# Token limits (for logging/monitoring)
MAX_EXPECTED_TOKENS = 4000

# OpenAI client singleton
if AIConfig.is_enabled():
    openai.api_key = AIConfig.OPENAI_API_KEY
    _openai_client = openai.OpenAI(timeout=float(AIConfig.REQUEST_TIMEOUT_SECONDS))
else:
    _openai_client = None


# ============================================================================
# Type Definitions
# ============================================================================


class JobFitResult(TypedDict, total=False):
    """Type definition for job fit analysis results."""

    confidence_score: int
    fit_analysis: str
    generated_at: str
    key_matches: List[str]
    missing_skills: List[str]
    suggested_improvements: List[str]
    strengths: List[str]
    weaknesses: List[str]
    tokens_used: int
    generation_time: int
    model_used: str
    error: str
    low_fit_warning: Dict[str, Any]


# ============================================================================
# Utility Functions
# ============================================================================


def get_openai_client():
    """Get the OpenAI client singleton."""
    return _openai_client


def is_ai_enabled() -> bool:
    """Check if AI features are enabled."""
    return _openai_client is not None


def extract_cached_tokens(response: Any) -> int:
    """
    Extract cached token count from OpenAI Response API response.

    OpenAI's prompt caching feature returns cached token counts in the usage details.
    Cached tokens are billed at 10% of the regular input token price, providing
    significant cost savings for repeated prompts.

    Args:
        response: OpenAI Response API response object

    Returns:
        Number of cached tokens (0 if not available or not using prompt caching)
    """
    if not hasattr(response, "usage"):
        return 0

    # Check for cached tokens in input_tokens_details (newer SDK format)
    if (
        hasattr(response.usage, "input_tokens_details")
        and response.usage.input_tokens_details is not None
    ):
        cached = getattr(response.usage.input_tokens_details, "cached_tokens", None)
        if cached is not None:
            return cached

    # Check for cached tokens in prompt_tokens_details (alternative format)
    if (
        hasattr(response.usage, "prompt_tokens_details")
        and response.usage.prompt_tokens_details is not None
    ):
        cached = getattr(response.usage.prompt_tokens_details, "cached_tokens", None)
        if cached is not None:
            return cached

    return 0


def build_error_response(
    error_message: str, operation_type: str = "ai_operation"
) -> Dict[str, Any]:
    """
    Build a standardized error response for AI operations.

    Args:
        error_message: Error message to include
        operation_type: Type of operation that failed (for logging)

    Returns:
        Standardized error response dictionary
    """
    logger.error(f"{operation_type} failed: {error_message}")

    return {
        "error": error_message,
        "confidence_score": 0,
        "fit_analysis": "",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "key_matches": [],
        "missing_skills": [],
        "suggested_improvements": [],
        "strengths": [],
        "weaknesses": [],
    }


def log_ai_usage_safe(
    db_session: Optional[Session],
    user_id: str,
    operation_type: str,
    model_used: str,
    prompt_tokens: int,
    completion_tokens: int,
    generation_time: int,
    success: bool = True,
    error_message: Optional[str] = None,
    cv_id: Optional[str] = None,
    cached_tokens: int = 0,
    service_tier: Optional[str] = None,
) -> None:
    """
    Safely log AI usage without breaking existing functionality.

    This function wraps the AI usage logging in a try-catch to ensure
    that logging failures don't affect the main AI service functionality.

    Args:
        db_session: Database session (optional)
        user_id: User identifier
        operation_type: Type of AI operation
        model_used: AI model identifier
        prompt_tokens: Number of tokens in prompt
        completion_tokens: Number of tokens in completion
        generation_time: Time taken for generation in milliseconds
        success: Whether operation succeeded
        error_message: Error message if operation failed
        cv_id: CV identifier (optional)
        cached_tokens: Number of cached input tokens (default: 0)
        service_tier: Optional tier (flex, standard, priority) for cost and display.
    """
    try:
        if db_session:
            from src.services.ai_usage_service import log_ai_usage

            log_ai_usage(
                db=db_session,
                user_id=user_id,
                operation_type=operation_type,
                model_used=model_used,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                generation_time=generation_time,
                success=success,
                error_message=error_message,
                cv_id=cv_id,
                cached_tokens=cached_tokens,
                service_tier=service_tier,
            )
    except Exception as e:
        # Log the error but don't raise it to avoid breaking main functionality
        logger.warning(f"Failed to log AI usage: {str(e)}")


async def with_retries(
    coro_factory, attempts: int = RETRY_ATTEMPTS, delay: float = RETRY_DELAY
):
    """
    Execute async operation with retry logic.

    Args:
        coro_factory: Factory function that creates the coroutine to execute
        attempts: Number of retry attempts
        delay: Base delay between retries (exponential backoff)

    Returns:
        Result from successful coroutine execution

    Raises:
        Last exception if all attempts fail
    """
    last_exc = None
    for i in range(attempts):
        try:
            result = await coro_factory()
            return result
        except Exception as e:
            last_exc = e
            if i < attempts - 1:
                await asyncio.sleep(delay * (2**i))
    raise last_exc


def get_user_friendly_error_message(error: Exception) -> str:
    """
    Convert technical OpenAI errors to user-friendly messages.

    This provides consistent, user-friendly error messages across all AI services
    without exposing technical details or internal error codes.

    Args:
        error: Exception raised by OpenAI API or our AI layer (e.g. RuntimeError)

    Returns:
        User-friendly error message string
    """
    if isinstance(error, openai.RateLimitError):
        return "Our AI service is temporarily at capacity. Please try again in a few minutes."
    if isinstance(error, openai.APIError):
        return "There was an error connecting to our AI service. Please try again."
    if hasattr(openai, "APITimeoutError") and isinstance(error, openai.APITimeoutError):
        return "The request took too long. Please try again."
    if hasattr(openai, "APIConnectionError") and isinstance(
        error, openai.APIConnectionError
    ):
        return "We couldn't reach our AI service. Please check your connection and try again."
    if isinstance(error, RuntimeError):
        msg = str(error).strip().lower()
        if "max_output_tokens" in msg or "response incomplete" in msg:
            return (
                "The analysis was too long to complete. "
                "Try a shorter CV or try again later."
            )
        if "refusal" in msg or "refused" in msg:
            return "The request could not be completed. Please try again."
        if "no text output" in msg or "no text" in msg:
            return "We didn't get a valid response. Please try again."
    return "An error occurred while processing your request. Please try again."


async def call_openai_with_schema(
    *,
    system_prompt: Optional[str] = None,
    user_prompt: Optional[str] = None,
    response_schema: Type[BaseModel],
    model: Optional[str] = None,
    reasoning_effort: Optional[str] = None,
    use_reasoning: bool = True,
    user_id: Optional[str] = None,
    cv_id: Optional[str] = None,
    operation_type: str = "ai_operation",
    db_session: Optional[Session] = None,
    retry_attempts: int = RETRY_ATTEMPTS,
    retry_delay: float = RETRY_DELAY,
    text_verbosity: Optional[str] = None,
    prompt_ref: Optional[Dict[str, Any]] = None,
    prompt_variables: Optional[Dict[str, str]] = None,
    text_format_schema: Optional[Dict[str, Any]] = None,
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """
    Unified OpenAI API call with schema validation, retry logic, and usage logging.

    Two branches:
    - Inline input: pass system_prompt and user_prompt; uses client.responses.parse
      with input=[system, user].
    - Prompt-by-ID: pass prompt_ref (id, version?) and prompt_variables; uses
      client.responses.create with prompt=... and no input, then parses and
      validates output with response_schema.

    Handles:
    - AI enabled check with standardized error response
    - Async execution via thread pool (asyncio.to_thread)
    - Automatic retry with exponential backoff
    - Token usage extraction (including cached tokens)
    - AI usage logging (success and failure)
    - Consistent error handling and logging

    Args:
        system_prompt: System message content (required when not using prompt_ref)
        user_prompt: User message content (required when not using prompt_ref)
        response_schema: Pydantic schema for response parsing and validation
        model: OpenAI model to use (defaults to AIConfig.OPENAI_MODEL)
        reasoning_effort: Reasoning effort level (defaults to AIConfig.REASONING_EFFORT)
        use_reasoning: If True, use reasoning model (omit temperature). If False, use temperature.
        user_id: User identifier for logging
        cv_id: CV identifier for logging
        operation_type: Type of operation (for logging, e.g., "parse_cv", "enhance_content")
        db_session: Database session for logging
        retry_attempts: Number of retry attempts (defaults to RETRY_ATTEMPTS)
        retry_delay: Base delay between retries in seconds (defaults to RETRY_DELAY)
        text_verbosity: Text verbosity level (e.g., "low", "medium", "high") for Response API
        prompt_ref: Optional dict with "id" and optionally "version" for reusable prompt
        prompt_variables: Optional map of placeholder names to values (used with prompt_ref)
        text_format_schema: Optional JSON schema format for responses.create when using
            prompt_ref. Enables structured output (e.g. cv_corrections for coaching mode).

    Returns:
        Tuple of (parsed_data, metadata) where:
        - parsed_data: Dictionary with parsed response data
        - metadata: Dictionary containing tokens_used, generation_time, model_used,
                   prompt_tokens, completion_tokens, cached_tokens

    Raises:
        RuntimeError: If OpenAI API is not enabled or call fails after retries
    """
    use_prompt_ref = prompt_ref is not None and prompt_variables is not None
    if use_prompt_ref:
        if not prompt_ref.get("id"):
            raise ValueError("prompt_ref must include 'id'")
    else:
        if system_prompt is None or user_prompt is None:
            raise ValueError(
                "system_prompt and user_prompt are required when not using prompt_ref"
            )

    if not is_ai_enabled():
        raise RuntimeError("OpenAI API is not enabled")

    model = model or AIConfig.OPENAI_MODEL
    reasoning_effort = reasoning_effort or AIConfig.REASONING_EFFORT
    client = get_openai_client()

    try:

        def _get_seed_for_operation(op_type: str) -> Optional[int]:
            """Return deterministic seed for operations that support it."""
            if op_type == "cv_quality_analysis":
                return AIConfig.CV_QUALITY_SEED
            return None

        parsed_data, metadata = await run_openai_call(
            client=client,
            model=model,
            reasoning_effort=reasoning_effort,
            reasoning_summary=AIConfig.REASONING_SUMMARY,
            use_prompt_ref=use_prompt_ref,
            use_reasoning=use_reasoning,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            response_schema=response_schema,
            operation_type=operation_type,
            retry_attempts=retry_attempts,
            retry_delay=retry_delay,
            text_verbosity=text_verbosity,
            prompt_ref=prompt_ref,
            prompt_variables=prompt_variables,
            text_format_schema=text_format_schema,
            get_seed_for_operation=_get_seed_for_operation,
            with_retries_fn=with_retries,
            extract_cached_tokens_fn=extract_cached_tokens,
        )

        # Log successful AI usage
        if user_id:
            log_ai_usage_safe(
                db_session=db_session,
                user_id=user_id,
                operation_type=operation_type,
                model_used=model,
                prompt_tokens=metadata.get("prompt_tokens", 0),
                completion_tokens=metadata.get("completion_tokens", 0),
                generation_time=metadata.get("generation_time", 0),
                success=True,
                cv_id=cv_id,
                cached_tokens=metadata.get("cached_tokens", 0),
                service_tier=AIConfig.AGENT_PROCESSING_TIER or None,
            )

        return parsed_data, metadata

    except Exception as e:
        # Convert to user-friendly message
        user_friendly_message = get_user_friendly_error_message(e)

        # Known/expected errors: log one line, no stack trace
        is_known = (
            isinstance(
                e,
                (
                    openai.RateLimitError,
                    openai.APIError,
                    RuntimeError,
                ),
            )
            or (
                hasattr(openai, "APITimeoutError")
                and isinstance(e, openai.APITimeoutError)
            )
            or (
                hasattr(openai, "APIConnectionError")
                and isinstance(e, openai.APIConnectionError)
            )
        )
        if is_known:
            logger.warning(
                f"{operation_type} failed: {user_friendly_message}",
            )
        else:
            # Unexpected errors - include stack trace for debugging
            logger.error(f"{operation_type} failed: {str(e)}", exc_info=True)
            logger.error(f"User-friendly message: {user_friendly_message}")

        # Log failed AI usage with user-friendly message
        if user_id:
            log_ai_usage_safe(
                db_session=db_session,
                user_id=user_id,
                operation_type=operation_type,
                model_used=model,
                prompt_tokens=0,
                completion_tokens=0,
                generation_time=0,
                success=False,
                error_message=user_friendly_message,
                cv_id=cv_id,
                service_tier=AIConfig.AGENT_PROCESSING_TIER or None,
            )

        # Raise with user-friendly message
        raise RuntimeError(user_friendly_message)
