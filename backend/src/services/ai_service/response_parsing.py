"""
Response parsing and validation utilities for OpenAI Responses API.

This module is intentionally free of dependencies on ``common.py`` so it can be
shared by multiple AI service helpers without creating circular imports.
"""

import logging
from typing import Any, Optional, Tuple, Type

from pydantic import BaseModel, ValidationError

logger = logging.getLogger(__name__)


def extract_response_data(response: Any) -> Tuple[Optional[str], int, int]:
    """
    Extract content and token usage from an OpenAI Responses API response.

    This helper normalizes the different structures used by various SDK
    versions to provide:
    - The response text/content
    - Prompt/input tokens
    - Completion/output tokens
    """
    # Extract content from Response API format
    content: Optional[str] = None
    if hasattr(response, "output_text"):
        content = response.output_text
    elif hasattr(response, "output"):
        for item in response.output:
            if getattr(item, "type", None) == "message" and getattr(
                item, "content", None
            ):
                if isinstance(item.content, list):
                    # Handle content as array
                    for content_item in item.content:
                        if getattr(content_item, "type", None) == "output_text":
                            content = content_item.text
                            break
                else:
                    # Handle content as string
                    content = item.content
                break

    # Extract token usage - Response API uses input_tokens/output_tokens or
    # prompt_tokens/completion_tokens depending on SDK version.
    prompt_tokens = 0
    completion_tokens = 0
    if hasattr(response, "usage"):
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

    Handles both ```json and generic ``` fenced code blocks, returning the
    inner JSON string without markdown formatting.
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


def validate_with_schema(
    content: str, schema: Type[BaseModel], operation: str
) -> Optional[BaseModel]:
    """
    Validate AI response JSON content against a Pydantic schema.

    Returns the validated model instance on success, or ``None`` if validation
    fails. Validation errors are logged with a short content preview to help
    with debugging while avoiding excessively large log entries.
    """
    try:
        validated_model = schema.model_validate_json(content)
        return validated_model
    except ValidationError as e:
        logger.error(
            "Schema validation failed for %s: %d errors", operation, e.error_count()
        )
        logger.error("Validation errors: %s", e.errors())
        logger.error("Content preview: %s...", content[:500])
        return None
    except Exception as e:  # pragma: no cover - defensive logging
        logger.error("Unexpected error during schema validation for %s: %s", operation, e)
        return None
