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
