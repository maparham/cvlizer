"""
Content enhancement service for improving CV text quality.

This module provides functions for enhancing CV content with stronger
language, action verbs, metrics, and professional terminology.
"""

import asyncio
import json
import logging
import time
from typing import Any, Dict, Optional

from openai.types.shared_params import Reasoning
from sqlalchemy.orm import Session

from src.config import AIConfig
from src.schemas.ai_response_schemas import ContentEnhancementResponseSchema

from .common import (
    RETRY_ATTEMPTS,
    RETRY_DELAY,
    call_openai_with_schema,
    extract_cached_tokens,
    extract_response_data,
    get_openai_client,
    is_ai_enabled,
    log_ai_usage_safe,
    parse_json_from_markdown,
    validate_with_schema,
    with_retries,
)

logger = logging.getLogger(__name__)


# ============================================================================
# Content Enhancement Functions
# ============================================================================


async def enhance_content(
    original_content: str,
    content_type: str = "bullet_point",
    user_id: Optional[str] = None,
    cv_id: Optional[str] = None,
    db_session: Optional[Session] = None,
) -> Dict[str, Any]:
    """
    Enhance a piece of content with stronger language and metrics.

    Args:
        original_content: The content to enhance
        content_type: Type of content (bullet_point, paragraph, summary, etc.)
        user_id: User identifier for logging
        cv_id: CV identifier for logging
        db_session: Database session for logging

    Returns:
        Dictionary containing:
        - suggestions: List of 3-4 enhanced versions
        - overall_improvements: List of specific improvements made
        - tokens_used: Number of tokens used
        - generation_time: Generation time in milliseconds
        - model_used: AI model identifier
    """
    if not is_ai_enabled():
        return {
            "error": "OpenAI API key not configured. AI features are disabled.",
            "suggestions": [],
            "improvements": [],
            "confidence_scores": [],
        }

    prompt = f"""Enhance this {content_type} with 3 improved versions.

LANGUAGE REQUIREMENT: Write ALL enhanced content in the SAME LANGUAGE as the original content.
Original: "{original_content}"

Focus: Strong action verbs, metrics (%, numbers, time), industry terms, impact, professional tone

Return JSON:
{{
  "suggestions": [
    {{"content": "Enhanced v1", "improvements": ["change1", "change2"], "confidence_score": 90}},
    {{"content": "Enhanced v2", "improvements": ["change1", "change2"], "confidence_score": 88}},
    {{"content": "Enhanced v3", "improvements": ["change1", "change2"], "confidence_score": 85}}
  ],
  "overall_improvements": ["improvement1", "improvement2", "improvement3"]
}}
"""

    try:
        # Use unified OpenAI call builder
        result, metadata = await call_openai_with_schema(
            system_prompt="You're a CV content expert. Enhance text to be impactful, specific, professional. Add metrics, strong verbs, industry terms.",
            user_prompt=prompt,
            response_schema=ContentEnhancementResponseSchema,
            user_id=user_id,
            cv_id=cv_id,
            operation_type="enhance_content",
            db_session=db_session,
        )

        # Extract data from validated response
        suggestions = result.get("suggestions", [])
        overall_improvements = result.get("overall_improvements", [])

        return {
            "suggestions": suggestions,
            "overall_improvements": overall_improvements,
            **metadata,  # Include tokens_used, generation_time, model_used, etc.
        }

    except Exception as e:
        # Error already logged by call_openai_with_schema
        # Additional context logging only
        logger.error(f"Error type: {type(e).__name__}")
        logger.error(
            f"Content type: {content_type}, Original content length: {len(original_content)}"
        )

        return {
            "error": f"Error enhancing content: {str(e)}",
            "suggestions": [],
            "overall_improvements": [],
            "tokens_used": 0,
            "generation_time": 0,
            "model_used": AIConfig.OPENAI_MODEL,
        }
