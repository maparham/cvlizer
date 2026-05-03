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
from src.schemas.ai_response_schemas.cv_parsing import SkillsResponseSchema
from src.services.ai_service.openai_schema_utils import CV_PARSING_RESPONSE_FORMAT

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
        logger.debug(
            "CV parse OpenAI skipped: text too short cv_id=%s len=%s",
            cv_id,
            len(text_content or ""),
        )
        return {"error": ERROR_EXTRACT_PDF, **EMPTY_PARSED_CV_PAYLOAD}

    # Check if text content is too long to be a CV
    stripped_len = len(text_content.strip())
    if stripped_len > 15000:
        logger.debug(
            "CV parse OpenAI skipped: text too long cv_id=%s len=%s",
            cv_id,
            stripped_len,
        )
        return {
            "error": "Document is too long to be a CV. Please upload a CV document (typically 500-10,000 characters).",
            **EMPTY_PARSED_CV_PAYLOAD,
        }

    cv_parsing_system_prompt = """You are an expert CV parser. Extract structured information from the user-provided document and return a single valid JSON object.

Parse the document into these sections: personal_info, work_experience, education, skills, certifications, projects, awards, publications, volunteer_experience, and custom_sections (only as specified below).

1. CV Validity
- Determine if the document is actually a CV or resume.
- If it is NOT a CV (e.g., article, book, manual, generic text), set:
  - is_valid_cv = false
  - validation_error = "This document does not appear to be a CV. Please upload a resume or curriculum vitae with your professional information."

2. Extraction Rules
- Extract all explicit content from the CV.
- Preserve all original text exactly as written, without changing spelling, grammar, punctuation, capitalization, or rephrasing any content.
- Format all long-form descriptions as valid markdown.
- Remove redundant line breaks (not needed mid-sentence, mid-list item, or mid-paragraph).
- For markdown, separate paragraphs with a blank line and use "- " for list-like blocks. Insert two spaces at the end of a line for a single line break within blocks.
- EXCEPTIONS:
  - work_experience.position: If missing, infer a reasonable title from context, otherwise preserve exactly (set as null if not inferable).
  - education.degree: If missing, infer a reasonable degree from context, otherwise preserve exactly (set as null if not inferable).

3. Description Formatting (Markdown)
- For long-form description fields, use markdown.
  - If 2+ distinct items, format as a bullet list ("-").
  - If only 1 item, use plain text (no bullet).
  - Short descriptions (~50 characters or less) may remain as plain text.

4. Custom Sections (custom_sections array)
- Each entry in custom_sections must include a "type": "professional_summary" or "cover_letter" only.
  - professional_summary: Contains introductory summary sections ("Professional Summary", "Profile", etc.); add one item if present, using exact section heading and content from the CV. If missing, you may synthesize a summary (2–4 sentences) from the CV with title "Professional Summary"; omit or leave empty if the CV is too sparse.
  - cover_letter: Contains letter-style sections addressed to an employer or job; use section heading and content from the CV.
- Exclude hobbies or highly personal sections from custom_sections; assign short, relevant info to personal_info.description if appropriate; otherwise, omit.
- Do not add custom_sections for content that does not fit "professional_summary" or "cover_letter". Omit anything that does not fit specified fields.

All CV content must be assigned to one of these fields:
- Structured: personal_info, work_experience, education, skills, certifications, projects, awards, publications, volunteer_experience
- Narrative: custom_sections (professional_summary, cover_letter only)

Omit any content that cannot fit an allowed field.

5. Skills
- skills.technical MUST be a dictionary/object.
- Include ALL skills (technical, soft, and spoken languages) inside skills.technical.
- Each key is a category name chosen from CV context; each value is an array of atomic skill strings.
- The category names must be descriptive and non-empty.
- Each category must contain at least one skill; omit empty categories.
- Do not include category labels inside skill strings (e.g., avoid "Programming: Python").

6. Publications
- Only include from an explicit "Publications" section.
- Do not infer from thesis/dissertation titles in education.

7. Empty Sections
- Use [] for empty array sections and null/empty for missing subfields as appropriate.
- For custom_sections, return [] if none exist. Do not use placeholders.

8. Section Order
- Preserve the original section order from the CV. Do not reorder unless the source order is ambiguous.

9. Error and Ambiguity Handling
- Assign data only to specified fields. If subfields like title, organization, degree, or date are missing or cannot be inferred, set to null.
- Omit any section/content that cannot be clearly mapped.
- If errors are detected (not a CV), set is_valid_cv = false and provide the validation_error; other fields may be omitted or set null/empty to maintain structure."""

    user_prompt = text_content

    try:
        if not is_ai_enabled():
            raise RuntimeError("OpenAI disabled")

        logger.debug(
            "CV parse OpenAI request cv_id=%s chars=%s",
            cv_id,
            stripped_len,
        )
        # Use unified OpenAI call builder (schema attached to API call, not in prompt)
        parsed_content, metadata = await call_openai_with_schema(
            system_prompt=cv_parsing_system_prompt,
            user_prompt=user_prompt,
            response_schema=CVParsingResponseSchema,
            text_format_schema=CV_PARSING_RESPONSE_FORMAT,
            model=AIConfig.OPENAI_PARSING_MODEL,
            reasoning_effort=AIConfig.OPENAI_PARSING_EFFORT,
            user_id=user_id,
            cv_id=cv_id,
            operation_type="parse_cv",
            db_session=db_session,
        )

        # Check if AI determined this is not a valid CV
        if not parsed_content.get("is_valid_cv", True):
            validation_error = parsed_content.get(
                "validation_error", "This document does not appear to be a CV."
            )
            logger.debug("CV parse OpenAI: invalid document cv_id=%s", cv_id)
            return {"error": validation_error, **EMPTY_PARSED_CV_PAYLOAD}

        skills = parsed_content.get("skills")
        if isinstance(skills, dict) and "technical" in skills:
            normalized_skills = SkillsResponseSchema.model_validate(skills)
            skills["technical"] = normalized_skills.technical

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

        logger.debug(
            "CV parse OpenAI success cv_id=%s work=%s edu=%s custom=%s",
            cv_id,
            len(parsed_content.get("work_experience") or []),
            len(parsed_content.get("education") or []),
            len(parsed_content.get("custom_sections") or []),
        )
        return parsed_content

    except Exception as e:
        # Error already logged by call_openai_with_schema
        # Additional context logging only
        logger.debug(
            "CV parse OpenAI failed cv_id=%s chars=%s err=%s",
            cv_id,
            len(text_content or ""),
            e,
        )
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
            return bool(data.get("technical"))
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
