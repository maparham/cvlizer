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
from pydantic import BaseModel, ValidationError
from sqlalchemy.orm import Session

from src.config import AIConfig

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
    _openai_client = openai.OpenAI()
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


class ATSOptimizationResult(TypedDict, total=False):
    """Type definition for ATS optimization results."""

    ats_score: int
    missing_keywords: List[Dict[str, Any]]
    keyword_analysis: Dict[str, Any]
    suggestions: List[str]
    content_optimization: List[Dict[str, Any]]
    strengths: List[str]
    weaknesses: List[str]
    tokens_used: int
    generation_time: int
    model_used: str
    error: str


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


def extract_response_data(response: Any) -> Tuple[Optional[str], int, int]:
    """
    Extract content and token usage from OpenAI Response API response.

    This utility function handles the Response API's format which differs from
    the Chat Completions API format. It extracts:
    - The response text/content
    - Prompt/input tokens
    - Completion/output tokens

    Args:
        response: OpenAI Response API response object

    Returns:
        Tuple of (content, prompt_tokens, completion_tokens)
        - content: The response text, or None if not found
        - prompt_tokens: Number of input tokens used
        - completion_tokens: Number of output tokens generated
    """
    # Extract content from Response API format
    content = None
    if hasattr(response, "output_text"):
        content = response.output_text
    elif hasattr(response, "output"):
        for item in response.output:
            if hasattr(item, "type") and item.type == "message":
                if hasattr(item, "content"):
                    if isinstance(item.content, list):
                        # Handle content as array
                        for content_item in item.content:
                            if (
                                hasattr(content_item, "type")
                                and content_item.type == "output_text"
                            ):
                                content = content_item.text
                                break
                    else:
                        # Handle content as string
                        content = item.content
                    break

    # Extract token usage - Response API uses input_tokens/output_tokens or prompt_tokens/completion_tokens
    prompt_tokens = 0
    completion_tokens = 0
    if hasattr(response, "usage"):
        # Try both naming conventions (SDK versions may vary)
        prompt_tokens = getattr(response.usage, "prompt_tokens", 0) or getattr(
            response.usage, "input_tokens", 0
        )
        completion_tokens = getattr(response.usage, "completion_tokens", 0) or getattr(
            response.usage, "output_tokens", 0
        )

    return content, prompt_tokens, completion_tokens


def parse_json_from_markdown(content: str) -> str:
    """
    Extract JSON content from markdown code blocks.

    Handles both ```json and ``` code block formats.

    Args:
        content: Raw content that may contain markdown code blocks

    Returns:
        Cleaned JSON string without markdown formatting
    """
    if not content:
        return content

    # Extract JSON from ```json code blocks
    if "```json" in content:
        start = content.find("```json") + 7
        end = content.find("```", start)
        if end != -1:
            return content[start:end].strip()
        return content

    # Extract from generic ``` code blocks
    if "```" in content:
        start = content.find("```") + 3
        end = content.find("```", start)
        if end != -1:
            return content[start:end].strip()
        return content

    return content


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


def validate_with_schema(
    content: str, schema: Type[BaseModel], operation: str
) -> Optional[BaseModel]:
    """
    Validate AI response content against Pydantic schema.

    Args:
        content: JSON string content to validate
        schema: Pydantic BaseModel schema class to validate against
        operation: Operation name for logging purposes

    Returns:
        Validated Pydantic model instance, or None if validation fails
    """
    try:
        validated_model = schema.model_validate_json(content)
        return validated_model
    except ValidationError as e:
        logger.error(
            f"Schema validation failed for {operation}: {e.error_count()} errors"
        )
        logger.error(f"Validation errors: {e.errors()}")
        logger.error(f"Content preview: {content[:500]}...")
        return None
    except Exception as e:
        logger.error(f"Unexpected error during schema validation for {operation}: {e}")
        return None


def get_user_friendly_error_message(error: Exception) -> str:
    """
    Convert technical OpenAI errors to user-friendly messages.

    This provides consistent, user-friendly error messages across all AI services
    without exposing technical details or internal error codes.

    Args:
        error: Exception raised by OpenAI API

    Returns:
        User-friendly error message string
    """
    if isinstance(error, openai.RateLimitError):
        return "Our AI service is temporarily at capacity. Please try again in a few minutes."
    elif isinstance(error, openai.APIError):
        return "There was an error connecting to our AI service. Please try again."
    else:
        return "An error occurred while processing your request. Please try again."


async def call_openai_with_schema(
    *,
    system_prompt: str,
    user_prompt: str,
    response_schema: Type[BaseModel],
    model: Optional[str] = None,
    reasoning_effort: Optional[str] = None,
    user_id: Optional[str] = None,
    cv_id: Optional[str] = None,
    operation_type: str,
    db_session: Optional[Session] = None,
    retry_attempts: int = RETRY_ATTEMPTS,
    retry_delay: float = RETRY_DELAY,
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """
    Unified OpenAI API call with schema validation, retry logic, and usage logging.

    This function centralizes all OpenAI API interactions across AI services,
    providing consistent error handling, retry logic, token tracking, and usage logging.

    Handles:
    - AI enabled check with standardized error response
    - Async execution via thread pool (asyncio.to_thread)
    - Automatic retry with exponential backoff
    - Token usage extraction (including cached tokens)
    - AI usage logging (success and failure)
    - Consistent error handling and logging

    Args:
        system_prompt: System message content for OpenAI
        user_prompt: User message content for OpenAI
        response_schema: Pydantic schema for response parsing and validation
        model: OpenAI model to use (defaults to AIConfig.OPENAI_MODEL)
        reasoning_effort: Reasoning effort level (defaults to AIConfig.REASONING_EFFORT)
        user_id: User identifier for logging
        cv_id: CV identifier for logging
        operation_type: Type of operation (for logging, e.g., "parse_cv", "enhance_content")
        db_session: Database session for logging
        retry_attempts: Number of retry attempts (defaults to RETRY_ATTEMPTS)
        retry_delay: Base delay between retries in seconds (defaults to RETRY_DELAY)

    Returns:
        Tuple of (parsed_data, metadata) where:
        - parsed_data: Dictionary with parsed response data
        - metadata: Dictionary containing tokens_used, generation_time, model_used,
                   prompt_tokens, completion_tokens, cached_tokens

    Raises:
        RuntimeError: If OpenAI API is not enabled or call fails after retries
    """
    import time

    from openai.types.shared_params import Reasoning

    if not is_ai_enabled():
        raise RuntimeError("OpenAI API is not enabled")

    model = model or AIConfig.OPENAI_MODEL
    reasoning_effort = reasoning_effort or AIConfig.REASONING_EFFORT
    client = get_openai_client()
    start_time = time.time()

    try:

        async def _call():
            return await asyncio.to_thread(
                client.responses.parse,
                model=model,
                input=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                text_format=response_schema,
                reasoning=Reasoning(effort=reasoning_effort),
            )

        response = await with_retries(_call, attempts=retry_attempts, delay=retry_delay)

        generation_time = int((time.time() - start_time) * 1000)

        # Extract parsed data and token usage
        parsed_data = response.output_parsed.model_dump()
        prompt_tokens = response.usage.input_tokens
        completion_tokens = response.usage.output_tokens
        tokens_used = prompt_tokens + completion_tokens
        cached_tokens = extract_cached_tokens(response)

        # Build metadata dictionary
        metadata = {
            "tokens_used": tokens_used,
            "generation_time": generation_time,
            "model_used": model,
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "cached_tokens": cached_tokens,
        }

        # Log successful AI usage
        if user_id:
            log_ai_usage_safe(
                db_session=db_session,
                user_id=user_id,
                operation_type=operation_type,
                model_used=model,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                generation_time=generation_time,
                success=True,
                cv_id=cv_id,
                cached_tokens=cached_tokens,
            )

        return parsed_data, metadata

    except Exception as e:
        # Convert to user-friendly message
        user_friendly_message = get_user_friendly_error_message(e)

        # Log based on error type - expected errors without stack trace
        if isinstance(e, (openai.RateLimitError, openai.APIError)):
            # Expected operational errors - no stack trace needed
            logger.warning(f"{operation_type} failed: {str(e)}")
            logger.info(f"User-friendly message: {user_friendly_message}")
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
            )

        # Raise with user-friendly message
        raise RuntimeError(user_friendly_message)
