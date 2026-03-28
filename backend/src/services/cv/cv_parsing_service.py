"""
CV parsing service for handling CV content extraction and AI parsing.

This module provides specialized functions for:
- OpenAI-based CV content parsing
- Text extraction from various file formats
- Parsing error handling and fallback responses
"""

from typing import Optional

from sqlalchemy.orm import Session


async def parse_cv_text_pipeline(
    text_content: str,
    user_id: Optional[str] = None,
    cv_id: Optional[str] = None,
    db_session: Optional[Session] = None,
) -> dict:
    """
    Parse already-extracted or pasted CV text: OpenAI structured parse, then UUID
    assignment and end_date normalization. Same post-extraction path as file uploads.

    Returns a dict (possibly with an "error" key) consistent with parse_cv_with_openai.
    """
    from src.services.ai_service import parse_cv_text_with_openai

    parsed_data = await parse_cv_text_with_openai(
        text_content, user_id=user_id, cv_id=cv_id, db_session=db_session
    )

    if parsed_data.get("error"):
        return parsed_data

    parsed_data = _add_uuids_to_cv_data(parsed_data)
    parsed_data = _normalize_present_strings(parsed_data)

    return parsed_data


async def parse_cv_with_openai(
    file_content: bytes,
    filename: str,
    content_type: str,
    user_id: Optional[str] = None,
    cv_id: Optional[str] = None,
    db_session: Optional[Session] = None,
) -> dict:
    """
    Parse CV content using OpenAI.

    Returns a dict (never raises) so callers can update DB state consistently:
    on invalid file or extraction failure we return a structure with an "error"
    key and a valid parsed-data shape, allowing the caller to set is_parsed=False
    and parse_error in one place without exception handling.

    Args:
        file_content: CV file content bytes
        filename: Original filename
        content_type: MIME type of the file
        user_id: User identifier for AI usage logging (optional)
        cv_id: CV identifier for AI usage logging (optional)
        db_session: Database session for AI usage logging (optional)

    Returns:
        Dictionary containing parsed CV data, or same shape with "error" key set.
    """
    from src.constants import (
        EMPTY_PARSED_CV_PAYLOAD,
        ERROR_EXTRACT_PDF,
        ERROR_INVALID_FILE_OR_EXTRACTION,
    )
    from src.exceptions import ExtractionError, InvalidFileException

    from src.services.platform.file_service import extract_text_from_file

    try:
        # Extract text from file
        text_content = extract_text_from_file(file_content, content_type)

        return await parse_cv_text_pipeline(
            text_content,
            user_id=user_id,
            cv_id=cv_id,
            db_session=db_session,
        )
    except (InvalidFileException, ExtractionError):
        return {"error": ERROR_INVALID_FILE_OR_EXTRACTION, **EMPTY_PARSED_CV_PAYLOAD}
    except Exception as e:
        # Return error structure if parsing fails
        error_message = str(e) if str(e) else ERROR_EXTRACT_PDF
        return {"error": error_message, **EMPTY_PARSED_CV_PAYLOAD}


def _add_uuids_to_cv_data(cv_data: dict) -> dict:
    """Add UUIDs to all array items in CV data"""
    import uuid

    # Define array sections with their prefixes (matching frontend)
    section_prefixes = {
        "work_experience": "work",
        "education": "edu",
        "projects": "proj",
        "certifications": "cert",
        "awards": "award",
        "publications": "pub",
        "volunteer_experience": "vol",
    }

    for section, prefix in section_prefixes.items():
        if section in cv_data and isinstance(cv_data[section], list):
            for item in cv_data[section]:
                if isinstance(item, dict) and "id" not in item:
                    item["id"] = f"{prefix}_{uuid.uuid4()}"

    # Handle languages in skills section
    if "skills" in cv_data and isinstance(cv_data["skills"], dict):
        if "languages" in cv_data["skills"] and isinstance(
            cv_data["skills"]["languages"], list
        ):
            for lang in cv_data["skills"]["languages"]:
                if isinstance(lang, dict) and "id" not in lang:
                    lang["id"] = f"item_{uuid.uuid4()}"

    return cv_data


def _normalize_present_strings(cv_data: dict) -> dict:
    """
    Normalize "PRESENT" strings to None for end_date fields.

    Converts any "PRESENT" (case-insensitive) strings in end_date fields
    to None for work_experience, education, and volunteer_experience sections.
    This ensures the parser always returns null for ongoing positions instead
    of the string "PRESENT".
    """
    # Sections that have end_date fields
    sections_with_end_date = ["work_experience", "education", "volunteer_experience"]

    for section in sections_with_end_date:
        if section in cv_data and isinstance(cv_data[section], list):
            for item in cv_data[section]:
                if isinstance(item, dict) and "end_date" in item:
                    end_date = item["end_date"]
                    # Check if end_date is a string equal to "PRESENT" (case-insensitive)
                    if (
                        isinstance(end_date, str)
                        and end_date.strip().lower() == "present"
                    ):
                        item["end_date"] = None

    return cv_data
