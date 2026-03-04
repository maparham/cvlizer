"""
CV parsing service using OpenAI for extracting structured data from CVs.

This module provides functions for parsing raw CV text (extracted from PDFs/DOCX)
into structured data with sections like personal_info, work_experience, education,
custom_sections, etc.
"""

import logging
import uuid
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from src.config import AIConfig
from src.constants import EMPTY_PARSED_CV_PAYLOAD, ERROR_EXTRACT_PDF
from src.schemas.ai_response_schemas import CVParsingResponseSchema

from .common import (
    RETRY_ATTEMPTS,
    RETRY_DELAY,
    call_openai_with_schema,
    extract_cached_tokens,
    get_openai_client,
    is_ai_enabled,
    log_ai_usage_safe,
    with_retries,
)
from .openai_schema_utils import CV_PARSING_RESPONSE_FORMAT
from .response_parsing import extract_response_data, validate_with_schema

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
        personal_info, custom_sections, work_experience, education,
        skills, certifications, projects, awards, publications, volunteer_experience
    """
    # Check if text content is empty or too short
    if not text_content or len(text_content.strip()) < 10:
        return {"error": ERROR_EXTRACT_PDF, **EMPTY_PARSED_CV_PAYLOAD}

    # Check if text content is too long to be a CV
    if len(text_content.strip()) > 15000:
        return {
            "error": "Document is too long to be a CV. Please upload a CV document (typically 500-10,000 characters).",
            **EMPTY_PARSED_CV_PAYLOAD,
        }

    cv_parsing_system_prompt = """You are an expert CV parser. Extract structured information from CVs and return valid JSON.

Parse the user-provided document into CV sections:
personal_info, work_experience, education, skills,
certifications, projects, awards, publications, volunteer_experience,
and custom_sections (for any section that does not match the above).

1) CV validity
- First decide if this is actually a CV/resume.
- If it is not a CV (e.g. paper, article, book, manual, generic text), set
  is_valid_cv = false and validation_error =
  "This document does not appear to be a CV. Please upload a resume or curriculum vitae with your professional information."

2) Extraction rules
- Extract ALL explicit content from the CV.
- CRITICAL: Preserve ALL original text exactly as written - do not correct spelling, grammar, punctuation, capitalization, or rephrase any content.
- Correct formatting so that it is valid markdown.
- Remove redundant linebreaks. E.g., linebreaks in the middle of a sentence or phrase.
- Preserve formatting linebreaks. E.g., linebreaks between paragraphs, bullet points, between text blocks that are semantically separated, etc.
- EXCEPTIONS:
  - work_experience.position: if completely missing/empty, infer a reasonable title from context; otherwise preserve exactly.
  - education.degree: if completely missing/empty, infer a reasonable degree from context; otherwise preserve exactly.

3) Description formatting (markdown)
- All long-form description fields (work_experience.description, education.description,
  certifications.description, projects.description, awards.description,
  publications.description, volunteer_experience.description, and each
  custom_sections[].content) must be markdown.
- If there are 2+ distinct items, format as a bullet list with "-". If only 1 item, plain text (no bullet).
- Short descriptions (roughly <50 characters) may remain plain text.

4) Custom sections (custom_sections array)
- Each item MUST include "type", and it MUST be either "professional_summary" or "cover_letter". No other values are allowed.
- professional_summary:
  - Sections like "Professional Summary", "Profile", "Objective", "About Me", or similar headings that introduce the candidate
    and are NOT written as a letter to a specific employer or job.
  - If the CV has such a section, add ONE item to custom_sections with:
      title = the exact section heading from the CV,
      content = the section body,
      type = "professional_summary".
  - If no such section exists, you MAY synthesize a brief 2-4 sentence professional summary from the CV content and add ONE item
    with title "Professional Summary", that content, and type = "professional_summary". Do not invent facts beyond what the CV implies.
    If the CV is too sparse, omit or leave content empty.
- cover_letter:
  - Sections that read like a letter or directly address a company or job (e.g. "Dear Hiring Manager", "I am applying for...", or
    content clearly targeted to a specific role/employer) must be mapped to type = "cover_letter".
  - Use the heading from the CV as title (e.g. "Cover Letter", "Application Letter", etc.) and the section body as content.
- Hobbies / very personal sections (e.g. "Hobbies", "Interests", "Personal Background") that are NOT job-targeted:
  - Do NOT create a custom_sections item for these.
  - Instead, fold relevant short information into personal_info.description when appropriate; otherwise you may omit it.

All relevant CV text must be assigned to one of the predefined fields:
- Structured fields: personal_info, work_experience, education, skills, certifications, projects, awards, publications, volunteer_experience.
- Narrative fields: custom_sections items with type "professional_summary" or "cover_letter".

5) Skills
- skills.technical: each item is a single atomic technology/skill
  (e.g. "Python", "FastAPI", "React", "Docker").
  - Do NOT include category labels like "Programming Languages:".
  - Do NOT group multiple skills with commas/colons in one item; split into
    separate items.
- skills.soft: each item is a single atomic soft skill
  (e.g. "Problem Solving", "Team Leadership").
- skills.languages: each item is an object with "language" and "proficiency"
  (e.g. {"language": "English", "proficiency": "Fluent"}).

6) Publications
- Only include items that appear in an explicit “Publications” section.
- Do NOT infer publications from thesis/dissertation titles in education.

7) Empty sections
- If a section has no data, return an empty array [] (or default object for personal_info).
- custom_sections: return [] if there are no summary/other custom sections. Do NOT use "N/A" or placeholders."""

    user_prompt = text_content

    try:
        if not is_ai_enabled():
            raise RuntimeError("OpenAI disabled")

        # Use unified OpenAI call builder (schema attached to API call, not in prompt)
        parsed_content, metadata = await call_openai_with_schema(
            system_prompt=cv_parsing_system_prompt,
            user_prompt=user_prompt,
            response_schema=CVParsingResponseSchema,
            model=AIConfig.OPENAI_PARSING_MODEL,
            reasoning_effort=AIConfig.OPENAI_PARSING_EFFORT,
            user_id=user_id,
            cv_id=cv_id,
            operation_type="parse_cv",
            db_session=db_session,
            text_format_schema=CV_PARSING_RESPONSE_FORMAT,
        )

        # Check if AI determined this is not a valid CV
        if not parsed_content.get("is_valid_cv", True):
            validation_error = parsed_content.get(
                "validation_error", "This document does not appear to be a CV."
            )
            return {"error": validation_error, **EMPTY_PARSED_CV_PAYLOAD}

        # Assign UUIDs to custom_sections; preserve type from AI (professional_summary or cover_letter)
        raw_custom = parsed_content.get("custom_sections") or []
        parsed_content["custom_sections"] = []
        for item in raw_custom:
            section_type = item.get("type") or "professional_summary"
            if section_type not in ("professional_summary", "cover_letter"):
                section_type = "professional_summary"
            parsed_content["custom_sections"].append(
                {
                    "id": str(uuid.uuid4()),
                    "title": (item.get("title") or "").strip() or "Section",
                    "content": (item.get("content") or "").strip(),
                    "type": section_type,
                }
            )

        # Add section_config to the parsed content
        parsed_content = _add_section_config(parsed_content)

        # Strip AI-only fields that shouldn't be part of editable CV data
        parsed_content.pop("is_valid_cv", None)
        parsed_content.pop("validation_error", None)

        return parsed_content

    except Exception as e:
        # Error already logged by call_openai_with_schema
        # Additional context logging only
        logger.error(f"Text content length: {len(text_content)} characters")

        # Get user-friendly error message from the exception
        error_message = (
            str(e)
            if str(e)
            else "Our AI service is temporarily at capacity. Please try again in a few minutes."
        )

        # Return error structure (not fallback with raw text)
        return {"error": error_message, **EMPTY_PARSED_CV_PAYLOAD}


def _has_meaningful_array_items(section_data: list, section_type: str) -> bool:
    """Check if array section has at least one item with meaningful content."""
    if not section_data or len(section_data) == 0:
        return False

    for item in section_data:
        if not isinstance(item, dict):
            continue

        # Define required fields for each section type
        if section_type == "projects":
            name = item.get("name", "").strip()
            description = item.get("description", "").strip()
            if name or description:
                return True
        elif section_type == "publications":
            title = item.get("title", "").strip()
            authors = item.get("authors", "").strip()
            if title or authors:
                return True
        elif section_type == "work_experience":
            company = item.get("company", "").strip()
            position = item.get("position", "").strip()
            if company or position:
                return True
        elif section_type == "education":
            institution = item.get("institution", "").strip()
            degree = item.get("degree", "").strip()
            if institution or degree:
                return True
        elif section_type == "certifications":
            name = item.get("name", "").strip()
            issuer = item.get("issuer", "").strip()
            if name or issuer:
                return True
        elif section_type == "awards":
            name = item.get("name", "").strip()
            issuer = item.get("issuer", "").strip()
            if name or issuer:
                return True
        elif section_type == "volunteer_experience":
            organization = item.get("organization", "").strip()
            role = item.get("role", "").strip()
            if organization or role:
                return True

    return False


# Keys that are not section data (skip when iterating parsed_content)
_NON_SECTION_KEYS = frozenset({"is_valid_cv", "validation_error"})


# Metadata for predefined sections (used when iterating in response order)
_PREDEFINED_SECTION_META: Dict[str, Dict[str, Any]] = {
    "personal_info": {
        "id": "personal_info",
        "type": "personal_info",
        "title": "Personal Information",
    },
    "work_experience": {
        "id": "work_experience",
        "type": "work_experience",
        "title": "Work Experience",
    },
    "education": {"id": "education", "type": "education", "title": "Education"},
    "skills": {"id": "skills", "type": "skills", "title": "Skills"},
    "certifications": {
        "id": "certifications",
        "type": "certifications",
        "title": "Certifications",
    },
    "projects": {"id": "projects", "type": "projects", "title": "Projects"},
    "awards": {"id": "awards", "type": "awards", "title": "Awards"},
    "publications": {
        "id": "publications",
        "type": "publications",
        "title": "Publications",
    },
    "volunteer_experience": {
        "id": "volunteer_experience",
        "type": "volunteer_experience",
        "title": "Volunteer Experience",
    },
}


def _add_section_config(parsed_content: dict) -> dict:
    """
    Add section_config to parsed CV content, preserving the order of sections
    as returned by the AI (insertion order in parsed_content).

    Section order follows the AI response's key order so custom sections (e.g.
    cover letter) can appear in their natural position; standard sections remain
    stable in practice because the model follows the schema field order.
    """

    def has_section_data(key: str) -> bool:
        if key not in parsed_content:
            return False
        data = parsed_content[key]
        if key == "personal_info":
            return bool(data.get("full_name"))
        if key == "skills":
            return bool(
                data.get("technical") or data.get("soft") or data.get("languages")
            )
        if key in (
            "work_experience",
            "education",
            "certifications",
            "projects",
            "awards",
            "publications",
            "volunteer_experience",
        ):
            return _has_meaningful_array_items(data, key)
        return False

    sections_with_data: List[Dict[str, Any]] = []
    order = 1

    # Iterate in insertion order (Python 3.7+ dict preserves order)
    for key in parsed_content:
        if key in _NON_SECTION_KEYS:
            continue
        if key == "custom_sections":
            for item in parsed_content.get("custom_sections") or []:
                sections_with_data.append(
                    {
                        "id": item.get("id", ""),
                        "type": "custom",
                        "title": (item.get("title") or "").strip() or "Section",
                        "visible": True,
                        "order": order,
                    }
                )
                order += 1
        elif key in _PREDEFINED_SECTION_META and has_section_data(key):
            meta = _PREDEFINED_SECTION_META[key]
            sections_with_data.append(
                {
                    "id": meta["id"],
                    "type": meta["type"],
                    "title": meta["title"],
                    "visible": True,
                    "order": order,
                }
            )
            order += 1

    parsed_content["section_config"] = {"sections": sections_with_data}
    return parsed_content
