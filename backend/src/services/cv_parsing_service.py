"""
CV parsing service for handling CV content extraction and AI parsing.

This module provides specialized functions for:
- OpenAI-based CV content parsing
- Text extraction from various file formats
- Parsing error handling and fallback responses
"""


async def parse_cv_with_openai(
    file_content: bytes, filename: str, content_type: str
) -> dict:
    """Parse CV content using OpenAI"""
    import uuid

    from .file_service import extract_text_from_file

    try:
        # Extract text from file
        text_content = extract_text_from_file(file_content, content_type)

        # Parse with OpenAI
        from .ai_service import parse_cv_text_with_openai

        parsed_data = await parse_cv_text_with_openai(text_content)

        # Check if parsing resulted in an error
        if parsed_data.get("error"):
            return parsed_data

        # Add UUIDs to all array items immediately after parsing (only if no error)
        parsed_data = _add_uuids_to_cv_data(parsed_data)

        # Normalize "PRESENT" strings to None for end_date fields
        parsed_data = _normalize_present_strings(parsed_data)

        # Date normalization removed - only YYYY-MM-DD format is supported

        return parsed_data
    except Exception as e:
        # Return error structure if parsing fails
        error_message = (
            str(e)
            if str(e)
            else "Unable to extract text from PDF. Please upload a PDF with selectable text."
        )
        return {
            "error": error_message,
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


def _normalize_dates_in_cv_data(cv_data: dict) -> dict:
    """Normalize dates to include default day when missing (e.g., '2023-11' → '2023-11-01')"""
    import re

    def normalize_date_value(date_str):
        """Normalize a single date string"""
        if not date_str or not isinstance(date_str, str):
            return date_str

        date_str = date_str.strip()

        # Pattern: YYYY-MM (missing day) → YYYY-MM-01
        if re.match(r"^\d{4}-\d{1,2}$", date_str):
            return f"{date_str}-01"

        # Pattern: YYYY (missing month and day) → YYYY-01-01
        if re.match(r"^\d{4}$", date_str):
            return f"{date_str}-01-01"

        # Return as-is if already complete or unrecognized format
        return date_str

    # Define sections that contain date fields
    date_sections = {
        "work_experience": ["start_date", "end_date"],
        "education": ["start_date", "end_date"],
        "projects": ["start_date", "end_date"],
        "certifications": ["date", "issue_date", "expiry_date"],
        "awards": ["date"],
        "publications": ["date", "publication_date"],
        "volunteer_experience": ["start_date", "end_date"],
    }

    # Normalize dates in array sections
    for section, date_fields in date_sections.items():
        if section in cv_data and isinstance(cv_data[section], list):
            for item in cv_data[section]:
                if isinstance(item, dict):
                    for date_field in date_fields:
                        if date_field in item:
                            item[date_field] = normalize_date_value(item[date_field])

    return cv_data
