"""
Shared backend constants.

This module centralizes shared constant values to reduce duplication
across API routers and services.
"""

# Default empty parsed CV structure used when creating a CV before parsing
# and as a fallback when parsing fails.
DEFAULT_PARSED_CV = {
    "personal_info": {
        "full_name": "Your Name",
        "email": "your.email@example.com",
        "phone": "",
        "location": "Your Location",
        "linkedin_url": "",
        "website_url": "",
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
    "section_config": {"sections": []},
}
