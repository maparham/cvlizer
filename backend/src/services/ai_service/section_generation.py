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
    call_openai_with_schema,
    extract_cached_tokens,
    extract_response_data,
    get_openai_client,
    is_ai_enabled,
    log_ai_usage_safe,
    validate_with_schema,
    with_retries,
)
from .cv_filter import filter_hidden_sections
from .job_fit import analyze_job_fit_sync

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
        - low_fit_warning: Optional warning when CV-job fit is below 30% (dict with message, confidence_score, severity)
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

    # Filter out hidden sections before sending to AI
    filtered_cv_data = filter_hidden_sections(cv_data)

    # Create prompt based on section type
    if section_type == "why_good_fit":
        prompt = f"""Generate "Why I'm a Good Fit" section aligning CV with job requirements.

⚠️ LANGUAGE REQUIREMENT: Write ALL content (title, content, key_points) in the SAME LANGUAGE as the job description.
If the job description is in German, write everything in German. If in English, write in English.

CV: {filtered_cv_data}

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

    # Analyze job fit to determine if warning is needed
    low_fit_warning = None
    try:
        job_fit_result = analyze_job_fit_sync(
            cv_data, job_description, user_id, cv_id, db_session
        )
        confidence_score = job_fit_result.get("confidence_score", 0)

        # Set warning if confidence score is below 30%
        if confidence_score < 30:
            low_fit_warning = {
                "message": "Your CV doesn't have sufficient relevant experience for this position. Consider updating your CV or this may not be a good match.",
                "confidence_score": confidence_score,
                "severity": "high",
            }
            logger.info(
                f"Low fit warning triggered - confidence_score={confidence_score}, cv_id={cv_id}"
            )
    except Exception as e:
        # Log but don't fail section generation if job fit analysis fails
        logger.warning(f"Failed to analyze job fit for warning: {str(e)}")

    try:
        # Use unified OpenAI call builder
        parsed_content, metadata = await call_openai_with_schema(
            system_prompt="You're a CV expert. CRITICAL: Generate content in the SAME LANGUAGE as the job description. Generate compelling, tailored content aligning candidates with job requirements.",
            user_prompt=prompt,
            response_schema=CVSectionGenerationResponseSchema,
            user_id=user_id,
            cv_id=cv_id,
            operation_type="generate_section",
            db_session=db_session,
        )

        result = {
            "section_content": parsed_content.get("content", ""),
            "title": parsed_content.get("title", "AI Generated Section"),
            "key_points": parsed_content.get("key_points", []),
            **metadata,  # Include tokens_used, generation_time, model_used, etc.
        }

        # Add low fit warning if present
        if low_fit_warning:
            result["low_fit_warning"] = low_fit_warning

        return result

    except Exception as e:
        # Error already logged by call_openai_with_schema
        # Additional context logging only
        logger.error(f"Section type: {section_type}")

        # Fallback response in case of API error
        result = {
            "section_content": f"I apologize, but I'm unable to generate content at the moment. Please try again later. Error: {str(e)}",
            "title": "AI Generated Section",
            "key_points": [],
            "tokens_used": 0,
            "generation_time": 0,
            "model_used": AIConfig.OPENAI_MODEL,
            "error": str(e),
        }

        # Add low fit warning if present (even in error case)
        if low_fit_warning:
            result["low_fit_warning"] = low_fit_warning

        return result
