"""
CV section generation service for creating tailored content.

This module provides functions for generating AI-enhanced CV sections
based on job descriptions, such as "Why I'm a Good Fit" sections.
"""

import logging
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from src.config import AIConfig
from src.schemas.ai_response_schemas import CVSectionGenerationResponseSchema
from src.utils.cv_data_optimizer import clean_control_characters

from .common import (
    call_openai_with_schema,
    is_ai_enabled,
)
from .ai_suggestions_service import generate_ai_suggestions
from .cv_filter import filter_hidden_sections

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
    company_name: Optional[str] = None,
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
        company_name: Company name for personalized greeting

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

    # Clean control characters from all text fields
    # This ensures AI doesn't see formatting artifacts like \u000b
    filtered_cv_data = clean_control_characters(filtered_cv_data)

    # Create prompt based on section type
    if section_type == "why_good_fit":
        prompt = f"""Generate "Why I'm a Good Fit" section aligning CV with job requirements.

⚠️ LANGUAGE REQUIREMENT: Write ALL content (title, content, key_points) in the SAME LANGUAGE as the job description.
If the job description is in German, write everything in German. If in English, write in English.

IMPORTANT: Extract the job title from the job description and use it as the section title.
The title should be: "Hello [Company Name]!" or "Hello!" if no company name is available.

CV: {filtered_cv_data}

Job: {job_description}

Structure:
1. Start with 1-2 paragraphs on why you're applying and relevant experience
2. Then provide Job Requirements Analysis covering specific requirements from the job
3. Use the job title from the job description as the section title

IMPORTANT:
- Write the content as flowing paragraphs without section headers
- Use bullet points naturally within the content where appropriate

Return JSON:
{{
  "title": "Hello [Company Name from job description]!" or "Hello!" if no company name,
  "content": "[1-2 paragraphs about your application and relevant experience, flowing directly into analysis of job requirements with specific examples from your experience]",
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
        # Use unified AI suggestions service (returns job_fit_data, optimization_data, metadata)
        job_fit_data, _, _ = await generate_ai_suggestions(
            cv_data, job_description, user_id, cv_id, db_session, company_name
        )
        confidence_score = job_fit_data.get("confidence_score", 0)

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
