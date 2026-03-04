"""
Shared backend constants.

This module centralizes shared constant values to reduce duplication
across API routers and services.
"""

# Extraction/parsing error messages (used by file_service, cv_parsing_service, API)
ERROR_INVALID_FILE_OR_EXTRACTION = "Invalid file or unable to extract text."
ERROR_EXTRACT_PDF = (
    "Unable to extract text from PDF. Please upload a PDF with selectable text."
)
ERROR_EXTRACT_DOCX = (
    "Unable to extract text from DOCX. Please upload a DOCX with text content."
)

# Base empty CV structure (no section_config); used by cv_parsing for error returns
# and by DEFAULT_PARSED_CV with section_config added.
_EMPTY_PARSED_CV_BASE = {
    "personal_info": {
        "full_name": "Your Name",
        "email": "your.email@example.com",
        "phone": "",
        "location": "Your Location",
        "linkedin_url": "",
        "website_url": "",
        "github_url": "",
    },
    "custom_sections": [],
    "work_experience": [],
    "education": [],
    "skills": {"technical": [], "soft": [], "languages": []},
    "certifications": [],
    "projects": [],
    "awards": [],
    "publications": [],
    "volunteer_experience": [],
}

# Empty payload for cv_parsing error returns (no section_config)
EMPTY_PARSED_CV_PAYLOAD = dict(_EMPTY_PARSED_CV_BASE)

# Default empty parsed CV structure used when creating a CV before parsing
# and as a fallback when parsing fails.
DEFAULT_PARSED_CV = {
    **_EMPTY_PARSED_CV_BASE,
    "section_config": {"sections": []},
}
