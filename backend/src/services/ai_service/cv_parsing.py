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
    call_openai_with_schema,
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
                "full_name": "Your Name",
                "email": "your.email@example.com",
                "phone": "",
                "location": "Your Location",
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

    # Check if text content is too long to be a CV
    if len(text_content.strip()) > 15000:
        return {
            "error": "Document is too long to be a CV. Please upload a CV document (typically 500-10,000 characters).",
            "personal_info": {
                "full_name": "Your Name",
                "email": "your.email@example.com",
                "phone": "",
                "location": "Your Location",
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

IMPORTANT: First validate if this document is actually a CV/resume. If the content is NOT a CV (e.g., research paper, article, book, manual, academic paper, or any other non-CV document), set is_valid_cv to false and validation_error to: "This document does not appear to be a CV. Please upload a resume or curriculum vitae with your professional information."

Extraction and Preservation RULES:
- Extract ALL text content
- Preserve original wording, spelling, grammar, punctuation, and phrasing
- DO NOT correct spelling errors, grammar mistakes, or improve wording
- DO NOT change the meaning or content of the text
- DO NOT add, infer, or extract keywords, tags, or any content not explicitly present in the original CV
- EXCEPTION: Missing work_experience.position and education.degree fields MUST be inferred (see TITLE INFERENCE RULES below)
- Keep original capitalization and formatting style

DESCRIPTION FORMATTING RULES:
- All description fields MUST be formatted in markdown
- For descriptions with MULTIPLE items (2 or more), format as bullet lists using markdown syntax (e.g., "- Item 1\\n- Item 2")
    - CRITICAL RULE, avoid using bullets for SINGLE ITEMS: If a description has only ONE item, you MUST write it as a plain text WITHOUT any bullet formatting
  - CORRECT single item: "Item description"
  - WRONG single item: "- Item description"
  - CORRECT multiple items: "- Item 1\\n- Item 2"
- Use proper markdown formatting: **bold** for emphasis, *italic* for emphasis, \\n\\n for paragraph breaks
- Short descriptions (<50 characters) can remain as plain text
- professional_summary.content should follow markdown formatting with bullet points ONLY if there are multiple items (2+), otherwise use plain text

EMPTY SECTIONS: If a section has no data (e.g., no projects found), return an empty array [] for that section. DO NOT create placeholder entries with "N/A" or similar text.

TITLE INFERENCE RULES (REQUIRED):
- work_experience.position: If missing, MUST infer from company, description, responsibilities, and context. DO NOT leave empty.
- education.degree: If missing, MUST infer from institution level, field_of_study, and context. DO NOT leave empty.

PUBLICATIONS RULES (CRITICAL):
- ONLY include publications explicitly listed in a dedicated "Publications" section
- DO NOT infer publications from thesis/dissertation titles in education sections
- If no Publications section exists, return empty array []

SKILLS FORMATTING RULES (CRITICAL):
- technical: Each item must be ONE atomic skill/technology only (e.g., "Python", "FastAPI", "React", "Docker")
  - DO NOT include category labels like "Programming Languages:" or "Web Technologies:"
  - DO NOT combine multiple skills with commas or colons in one item (e.g., NOT "Python, JavaScript, TypeScript")
  - Split grouped skills into separate atomic items: "Python", "JavaScript", "TypeScript"
  - Example: ["Python", "FastAPI", "React", "Docker", "MongoDB"] NOT ["Programming Languages: Python, JavaScript"]
  - IMPORTANT: Preserve the original wording of each skill exactly as written
- soft: Each item must be ONE atomic soft skill only (e.g., "Problem Solving", "Team Leadership", "Communication")
  - DO NOT combine multiple skills in one item
  - Example: ["Problem Solving", "Team Leadership", "Communication"] NOT ["Problem Solving, Team Leadership"]
- languages: Each item must be an object with "language" and "proficiency" fields
  - Example: [{{"language": "English", "proficiency": "Fluent"}}, {{"language": "German", "proficiency": "B1"}}]

CV: {text_content}

Return JSON (omit empty sections):
{{
  "personal_info": {{"full_name": "str", "email": "str", "phone": "str", "location": "str", "linkedin_url": "str", "website_url": "str", "github_url": "str"}},
  "professional_summary": {{"content": "str (markdown bullets/paragraphs, NO headers, plain text if single item)", "keywords": []}},
  "work_experience": [{{"company": "str", "position": "str", "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD|null", "current": bool, "description": "str (markdown bullets/paragraphs, NO headers)", "achievements": [], "technologies": []}}],
  "education": [{{"institution": "str", "degree": "str", "field_of_study": "str", "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD|null", "gpa": "str|null", "description": "str (markdown bullets/paragraphs, NO headers)", "achievements": [], "honors": []}}],
  "skills": {{"technical": ["Python", "FastAPI", "React"], "soft": ["Problem Solving", "Communication"], "languages": [{{"language": "English", "proficiency": "Fluent"}}]}},
  "certifications": [{{"name": "str", "issuer": "str", "date": "YYYY-MM-DD", "expiry_date": "YYYY-MM-DD|null", "description": "str (markdown bullets/paragraphs, NO headers)"}}],
  "projects": [{{"name": "str", "description": "str (markdown bullets/paragraphs, NO headers)", "technologies": [], "url": "str|null"}}],
  "awards": [{{"name": "str", "issuer": "str", "date": "YYYY-MM-DD", "description": "str (markdown bullets/paragraphs, NO headers)"}}],
  "publications": [{{"title": "str", "authors": "str", "journal": "str", "date": "YYYY-MM-DD", "url": "str|null"}}] (ONLY if explicitly in Publications section),
  "volunteer_experience": [{{"organization": "str", "role": "str", "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD|null", "description": "str (markdown bullets/paragraphs, NO headers)"}}],
  "is_valid_cv": true,
  "validation_error": null
}}"""

    try:
        if not is_ai_enabled():
            raise RuntimeError("OpenAI disabled")

        # Use unified OpenAI call builder
        parsed_content, metadata = await call_openai_with_schema(
            system_prompt="You are an expert CV parser. Extract structured information from CVs and return valid JSON.",
            user_prompt=prompt,
            response_schema=CVParsingResponseSchema,
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
            return {
                "error": validation_error,
                "personal_info": {
                    "full_name": "Your Name",
                    "email": "your.email@example.com",
                    "phone": "",
                    "location": "Your Location",
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
        return {
            "error": error_message,
            "personal_info": {
                "full_name": "Your Name",
                "email": "your.email@example.com",
                "phone": "",
                "location": "Your Location",
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
            return _has_meaningful_array_items(section_data, section_type)

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
