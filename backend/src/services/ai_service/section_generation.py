"""
CV section generation service for creating tailored content.

This module provides functions for generating AI-enhanced CV sections
based on job descriptions, such as "Why I'm a Good Fit" sections.
"""

import asyncio
import json
import logging
import time
from typing import Any, Dict, Optional

from openai.types.shared_params import Reasoning
from sqlalchemy.orm import Session

from src.config import AIConfig
from src.schemas.ai_response_schemas import CVSectionGenerationResponseSchema

from .common import (
    RETRY_ATTEMPTS,
    RETRY_DELAY,
    extract_response_data,
    get_openai_client,
    is_ai_enabled,
    log_ai_usage_safe,
    validate_with_schema,
    with_retries,
)

logger = logging.getLogger(__name__)


# ============================================================================
# CV Section Generation Functions
# ============================================================================


async def generate_cv_section(
    cv_data: Dict[str, Any],
    job_description: str,
    section_type: str = "why_good_fit",
    user_id: Optional[str] = None,
    cv_id: Optional[str] = None,
    db_session: Optional[Session] = None,
) -> Dict[str, Any]:
    """
    Generate AI-enhanced CV section based on job description.

    Args:
        cv_data: Structured CV data
        job_description: Job description text
        section_type: Type of section to generate (default: "why_good_fit")
        user_id: User identifier for logging
        cv_id: CV identifier for logging
        db_session: Database session for logging

    Returns:
        Dictionary containing:
        - section_content: Generated section content
        - title: Section title
        - key_points: List of key points
        - tokens_used: Number of tokens used
        - generation_time: Generation time in milliseconds
        - model_used: AI model identifier
    """
    if not is_ai_enabled():
        return {
            "error": "OpenAI API key not configured. AI features are disabled.",
            "section_content": "",
            "suggestions": [],
        }

    # Create prompt based on section type
    if section_type == "why_good_fit":
        prompt = f"""Generate "Why I'm a Good Fit" section aligning CV with job requirements.

CV: {cv_data}

Job: {job_description}

Structure:
1. 2-3 paragraphs on relevant experience/skills
2. Job Requirements Analysis with bullet points

Return JSON:
{{
  "title": "Hello <company name>!",
  "content": "**Why am I applying?**\\n\\n[1-2 paragraphs]\\n\\n**Job Requirements Analysis**\\n\\n[Requirements list]",
  "key_points": ["Point 1", "Point 2", "Point 3"]
}}

Note: Accept non-English job descriptions. Only flag if truly incomplete (empty/placeholder).
"""
    else:
        raise ValueError(
            f"Unsupported section type: '{section_type}'. Only 'why_good_fit' is currently supported."
        )

    try:
        start_time = time.time()
        client = get_openai_client()

        # Run the synchronous OpenAI call in a thread pool to avoid blocking
        async def _call():
            return await asyncio.to_thread(
                client.responses.parse,
                model=AIConfig.OPENAI_MODEL,
                input=[
                    {
                        "role": "system",
                        "content": "You're a CV expert. Generate compelling, tailored content aligning candidates with job requirements.",
                    },
                    {"role": "user", "content": prompt},
                ],
                text_format=CVSectionGenerationResponseSchema,
                reasoning=Reasoning(effort=AIConfig.REASONING_EFFORT),
            )

        response = await with_retries(_call, attempts=RETRY_ATTEMPTS, delay=RETRY_DELAY)

        generation_time = int(
            (time.time() - start_time) * 1000
        )  # Convert to milliseconds

        # Extract parsed data and token usage
        parsed_content = response.output_parsed.model_dump()
        prompt_tokens = response.usage.input_tokens
        completion_tokens = response.usage.output_tokens
        tokens_used = prompt_tokens + completion_tokens

        # Log AI usage
        if user_id:
            log_ai_usage_safe(
                db_session=db_session,
                user_id=user_id,
                operation_type="generate_section",
                model_used=AIConfig.OPENAI_MODEL,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                generation_time=generation_time,
                success=True,
                cv_id=cv_id,
            )

        return {
            "section_content": parsed_content.get("content", ""),
            "title": parsed_content.get("title", "AI Generated Section"),
            "key_points": parsed_content.get("key_points", []),
            "tokens_used": tokens_used,
            "generation_time": generation_time,
            "model_used": AIConfig.OPENAI_MODEL,
        }

    except Exception as e:
        # Log the error with full details
        logger.error(f"Section generation failed with error: {str(e)}", exc_info=True)
        logger.error(f"Error type: {type(e).__name__}")
        logger.error(f"Section type: {section_type}")

        # Log failed AI usage
        if user_id:
            log_ai_usage_safe(
                db_session=db_session,
                user_id=user_id,
                operation_type="generate_section",
                model_used=AIConfig.OPENAI_MODEL,
                prompt_tokens=0,
                completion_tokens=0,
                generation_time=0,
                success=False,
                error_message=str(e),
                cv_id=cv_id,
            )

        # Fallback response in case of API error
        return {
            "section_content": f"I apologize, but I'm unable to generate content at the moment. Please try again later. Error: {str(e)}",
            "title": "AI Generated Section",
            "key_points": [],
            "tokens_used": 0,
            "generation_time": 0,
            "model_used": AIConfig.OPENAI_MODEL,
            "error": str(e),
        }
