"""
CV parsing service using OpenAI for extracting structured data from CVs.

This module provides functions for parsing raw CV text (extracted from PDFs/DOCX)
into structured data with sections like personal_info, work_experience, education, etc.
"""

import asyncio
import json
import logging
from copy import deepcopy
from typing import Any, Dict, Optional

from openai.types.shared_params import Reasoning
from sqlalchemy.orm import Session

from src.config import AIConfig
from src.constants import DEFAULT_PARSED_CV
from src.schemas.ai_response_schemas import CVParsingResponseSchema

from .common import (
    RETRY_ATTEMPTS,
    RETRY_DELAY,
    extract_cached_tokens,
    extract_response_data,
    get_openai_client,
    is_ai_enabled,
    log_ai_usage_safe,
    validate_with_schema,
    with_retries,
)

logger = logging.getLogger(__name__)


# ============================================================================
# CV Parsing Functions
# ============================================================================


async def parse_cv_text_with_openai(
    text_content: str,
    user_id: Optional[str] = None,
    cv_id: Optional[str] = None,
    db_session: Optional[Session] = None,
) -> dict:
    """
    Parse CV text content using OpenAI to extract structured data.

    Args:
        text_content: Raw text extracted from CV
        user_id: User identifier for logging
        cv_id: CV identifier for logging
        db_session: Database session for logging

    Returns:
        Dictionary containing structured CV data with sections:
        personal_info, professional_summary, work_experience, education,
        skills, certifications, projects, awards, publications, volunteer_experience
    """
    # Check if text content is empty or too short
    if not text_content or len(text_content.strip()) < 10:
        # Return error structure instead of fake data
        return {
            "error": "Unable to extract text from PDF. Please upload a PDF with selectable text.",
            "personal_info": {
                "full_name": "",
                "email": "",
                "phone": "",
                "location": "",
                "linkedin_url": "",
                "website_url": "",
                "github_url": "",
            },
            "professional_summary": {"content": "", "keywords": []},
            "work_experience": [],
            "education": [],
            "skills": {"technical": [], "soft": [], "languages": []},
            "certifications": [],
            "projects": [],
            "awards": [],
            "publications": [],
            "volunteer_experience": [],
        }

    prompt = f"""Parse CV into 10 sections: personal_info, professional_summary, work_experience, education, skills, certifications, projects, awards, publications, volunteer_experience.

CV: {text_content}

Return JSON (omit empty sections):
{{
  "personal_info": {{"full_name": "str", "email": "str", "phone": "str", "location": "str", "linkedin_url": "str", "website_url": "str", "github_url": "str"}},
  "professional_summary": {{"content": "str", "keywords": []}},
  "work_experience": [{{"company": "str", "position": "str", "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD|null", "current": bool, "description": "str", "achievements": [], "technologies": []}}],
  "education": [{{"institution": "str", "degree": "str", "field_of_study": "str", "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD|null", "gpa": "str|null", "description": "str", "achievements": [], "honors": []}}],
  "skills": {{"technical": [], "soft": [], "languages": [{{"language": "str", "proficiency": "str"}}]}},
  "certifications": [{{"name": "str", "issuer": "str", "date": "YYYY-MM-DD", "expiry_date": "YYYY-MM-DD|null", "description": "str"}}],
  "projects": [{{"name": "str", "description": "str", "technologies": [], "url": "str|null"}}],
  "awards": [{{"name": "str", "issuer": "str", "date": "YYYY-MM-DD", "description": "str"}}],
  "publications": [{{"title": "str", "authors": "str", "journal": "str", "date": "YYYY-MM-DD", "url": "str|null"}}],
  "volunteer_experience": [{{"organization": "str", "role": "str", "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD|null", "description": "str"}}]
}}"""

    try:
        if not is_ai_enabled():
            raise RuntimeError("OpenAI disabled")

        client = get_openai_client()

        async def _call():
            return await asyncio.to_thread(
                client.responses.parse,
                model=AIConfig.OPENAI_MODEL,
                input=[
                    {
                        "role": "system",
                        "content": "You are an expert CV parser. Extract structured information from CV text and return valid JSON.",
                    },
                    {"role": "user", "content": prompt},
                ],
                text_format=CVParsingResponseSchema,
                reasoning=Reasoning(effort=AIConfig.PARSING_REASONING_EFFORT),
            )

        response = await with_retries(_call, attempts=RETRY_ATTEMPTS, delay=RETRY_DELAY)

        # Extract parsed data and token usage
        parsed_content = response.output_parsed.model_dump()
        prompt_tokens = response.usage.input_tokens
        completion_tokens = response.usage.output_tokens
        cached_tokens = extract_cached_tokens(response)

        # Log AI usage
        if user_id:
            log_ai_usage_safe(
                db_session=db_session,
                user_id=user_id,
                operation_type="parse_cv",
                model_used=AIConfig.OPENAI_MODEL,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                generation_time=0,  # Not tracked in this function
                success=True,
                cv_id=cv_id,
                cached_tokens=cached_tokens,
            )

        # Add section_config to the parsed content
        parsed_content = _add_section_config(parsed_content)
        return parsed_content

    except Exception as e:
        # Log the error with full details
        logger.error(f"CV parsing failed with error: {str(e)}", exc_info=True)
        logger.error(f"Error type: {type(e).__name__}")
        logger.error(f"Text content length: {len(text_content)} characters")

        # Log failed AI usage
        if user_id:
            log_ai_usage_safe(
                db_session=db_session,
                user_id=user_id,
                operation_type="parse_cv",
                model_used=AIConfig.OPENAI_MODEL,
                prompt_tokens=0,
                completion_tokens=0,
                generation_time=0,
                success=False,
                error_message=str(e),
                cv_id=cv_id,
            )

        # Fallback response in case of API error
        fallback = deepcopy(DEFAULT_PARSED_CV)
        content_preview = (
            text_content[:500] + "..." if len(text_content) > 500 else text_content
        )
        fallback["professional_summary"] = {"content": content_preview, "keywords": []}
        fallback["parse_error"] = f"OpenAI API error: {str(e)}"
        # Add section_config to fallback
        fallback = _add_section_config(fallback)
        return fallback


def _add_section_config(parsed_content: dict) -> dict:
    """
    Add section_config to parsed CV content based on available sections.

    Args:
        parsed_content: Parsed CV data dictionary

    Returns:
        CV data with section_config added
    """
    # Define all possible sections with their metadata
    section_definitions = [
        {
            "id": "personal_info",
            "type": "personal_info",
            "title": "Personal Information",
            "visible": True,
            "order": 1,
        },
        {
            "id": "professional_summary",
            "type": "professional_summary",
            "title": "Professional Summary",
            "visible": True,
            "order": 2,
        },
        {
            "id": "work_experience",
            "type": "work_experience",
            "title": "Work Experience",
            "visible": True,
            "order": 3,
        },
        {
            "id": "education",
            "type": "education",
            "title": "Education",
            "visible": True,
            "order": 4,
        },
        {
            "id": "skills",
            "type": "skills",
            "title": "Skills",
            "visible": True,
            "order": 5,
        },
        {
            "id": "certifications",
            "type": "certifications",
            "title": "Certifications",
            "visible": True,
            "order": 6,
        },
        {
            "id": "projects",
            "type": "projects",
            "title": "Projects",
            "visible": True,
            "order": 7,
        },
        {
            "id": "awards",
            "type": "awards",
            "title": "Awards",
            "visible": True,
            "order": 8,
        },
        {
            "id": "publications",
            "type": "publications",
            "title": "Publications",
            "visible": True,
            "order": 9,
        },
        {
            "id": "volunteer_experience",
            "type": "volunteer_experience",
            "title": "Volunteer Experience",
            "visible": True,
            "order": 10,
        },
    ]

    # Helper function to check if section has data
    def has_section_data(section_type: str) -> bool:
        if section_type not in parsed_content:
            return False

        section_data = parsed_content[section_type]

        if section_type == "personal_info":
            return bool(section_data.get("full_name"))
        elif section_type == "professional_summary":
            return bool(section_data.get("content"))
        elif section_type == "skills":
            return bool(
                section_data.get("technical")
                or section_data.get("soft")
                or section_data.get("languages")
            )
        elif section_type in [
            "work_experience",
            "education",
            "certifications",
            "projects",
            "awards",
            "publications",
            "volunteer_experience",
        ]:
            return bool(section_data and len(section_data) > 0)

        return False

    # Filter sections to only include those with data
    sections_with_data = []
    for section_def in section_definitions:
        section_type = str(section_def["type"])
        if has_section_data(section_type):
            sections_with_data.append(section_def)

    # Add section_config to parsed content
    parsed_content["section_config"] = {"sections": sections_with_data}

    return parsed_content
