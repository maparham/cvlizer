"""
Job description extraction service using AI.

This module provides functions for extracting structured job description
data from raw HTML/text content scraped from job posting websites.
"""

import json
import logging
import time
from typing import Any, Dict, Optional

from openai.types.shared_params import Reasoning
from sqlalchemy.orm import Session

from src.config import AIConfig
from src.schemas.ai_response_schemas import JobExtractionResponseSchema

from .common import (
    MAX_JOB_CONTENT_LENGTH,
    call_openai_with_schema,
    extract_cached_tokens,
    extract_response_data,
    get_openai_client,
    is_ai_enabled,
    log_ai_usage_safe,
    parse_json_from_markdown,
    validate_with_schema,
)

logger = logging.getLogger(__name__)


# ============================================================================
# Job Description Extraction Functions
# ============================================================================


async def extract_job_description_with_ai(
    raw_content: str,
    source_url: str,
    user_id: Optional[str] = None,
    cv_id: Optional[str] = None,
    db_session: Optional[Session] = None,
) -> Dict[str, Any]:
    """
    Extract structured job description data from raw HTML content using OpenAI.

    Args:
        raw_content: Raw HTML/text content from the job posting URL
        source_url: Original URL of the job posting
        user_id: User identifier for logging
        cv_id: CV identifier for logging
        db_session: Database session for logging

    Returns:
        Dictionary containing extracted job description data:
        - title: Job title
        - company: Company name
        - location: Job location
        - content: Complete job description in markdown format
        - source: Job site type
    """
    if not is_ai_enabled():
        return {"error": "AI service is not enabled", "success": False}

    try:
        # Truncate content if it's too long for the API
        if len(raw_content) > MAX_JOB_CONTENT_LENGTH:
            raw_content = raw_content[:MAX_JOB_CONTENT_LENGTH] + "..."

        prompt = f"""Extract job posting data from web content.

URL: {source_url}

Content: {raw_content}

Return JSON:
{{
  "title": "Job title",
  "company": "Company name",
  "location": "City, state/country",
  "content": "Complete description in MARKDOWN",
  "source": "Job site (linkedin/indeed/company_careers/etc.)"
}}

MARKDOWN FORMAT for content:
• ## for headers (Requirements, Responsibilities)
• ### for subheaders
• - or * for bullets
• **bold** for key terms
• \\n\\n between sections
• 1., 2. for numbered lists
• Consolidate duplicates: If similar requirements (e.g., "Strong programming" + "Solid programming/scripting"), merge into ONE comprehensive requirement
• Keep technical terms exact
• Preserve structure/hierarchy

Missing info: Use "" or "Unknown". Identify source from URL. Valid JSON only.
"""

        # Use unified OpenAI call builder
        extracted_data, metadata = await call_openai_with_schema(
            system_prompt="You're a job posting extraction expert. Return valid JSON. Format 'content' as markdown (##, ###, bullets, **bold**, \\n\\n). Consolidate duplicate requirements (e.g., 'Strong programming' + 'Solid scripting' → one requirement). Keep unique requirements.",
            user_prompt=prompt,
            response_schema=JobExtractionResponseSchema,
            model=AIConfig.OPENAI_PARSING_MODEL,
            reasoning_effort=AIConfig.OPENAI_PARSING_EFFORT,
            user_id=user_id,
            cv_id=cv_id,
            operation_type="extract_job_description",
            db_session=db_session,
        )

        # Data already validated and parsed by responses.parse()
        return {
            "title": extracted_data.get("title", "Unknown Title"),
            "company": extracted_data.get("company", "Unknown Company"),
            "location": extracted_data.get("location", "Unknown Location"),
            "content": extracted_data.get("content", ""),
            "source": extracted_data.get("source", "ai_parsed"),
        }

    except Exception as e:
        # Error already logged by call_openai_with_schema
        # Additional context logging only
        logger.error(f"Error type: {type(e).__name__}")
        logger.error(f"Content length: {len(raw_content)} characters")

        return {"error": f"Failed to extract job description: {str(e)}", "success": False}
