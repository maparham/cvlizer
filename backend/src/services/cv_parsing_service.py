"""
CV parsing service for handling CV content extraction and AI parsing.

This module provides specialized functions for:
- OpenAI-based CV content parsing
- Text extraction from various file formats
- Parsing error handling and fallback responses
"""


def parse_cv_with_openai(file_content: bytes, filename: str, content_type: str) -> dict:
    """Parse CV content using OpenAI"""
    from .file_service import extract_text_from_file
    from .ai_service import parse_cv_text_with_openai
    import uuid
    
    try:
        # Extract text from file
        text_content = extract_text_from_file(file_content, content_type)
        
        # Parse with OpenAI
        parsed_data = parse_cv_text_with_openai(text_content)
        
        # Check if parsing resulted in an error
        if parsed_data.get('error'):
            return parsed_data
        
        # Add UUIDs to all array items immediately after parsing (only if no error)
        parsed_data = _add_uuids_to_cv_data(parsed_data)
        
        # Date normalization removed - only YYYY-MM-DD format is supported
        
        return parsed_data
    except Exception as e:
        # Return error structure if parsing fails
        error_message = str(e) if str(e) else "Unable to extract text from PDF. Please upload a PDF with selectable text."
        return {
            "error": error_message,
            "personal_info": {"full_name": "", "email": "", "phone": "", "location": "", "linkedin_url": "", "website_url": "", "github_url": ""},
            "professional_summary": {"content": "", "keywords": []},
            "work_experience": [],
            "education": [],
            "skills": {"technical": [], "soft": [], "languages": []},
            "certifications": [],
            "projects": [],
            "awards": [],
            "publications": [],
            "volunteer_experience": []
        }


def _add_uuids_to_cv_data(cv_data: dict) -> dict:
    """Add UUIDs to all array items in CV data"""
    import uuid
    
    # Define array sections with their prefixes (matching frontend)
    section_prefixes = {
        'work_experience': 'work',
        'education': 'edu', 
        'projects': 'proj',
        'certifications': 'cert',
        'awards': 'award',
        'publications': 'pub',
        'volunteer_experience': 'vol'
    }
    
    for section, prefix in section_prefixes.items():
        if section in cv_data and isinstance(cv_data[section], list):
            for item in cv_data[section]:
                if isinstance(item, dict) and 'id' not in item:
                    item['id'] = f"{prefix}_{uuid.uuid4()}"
    
    # Handle languages in skills section
    if 'skills' in cv_data and isinstance(cv_data['skills'], dict):
        if 'languages' in cv_data['skills'] and isinstance(cv_data['skills']['languages'], list):
            for lang in cv_data['skills']['languages']:
                if isinstance(lang, dict) and 'id' not in lang:
                    lang['id'] = f"item_{uuid.uuid4()}"
    
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
        if re.match(r'^\d{4}-\d{1,2}$', date_str):
            return f"{date_str}-01"
        
        # Pattern: YYYY (missing month and day) → YYYY-01-01  
        if re.match(r'^\d{4}$', date_str):
            return f"{date_str}-01-01"
        
        # Return as-is if already complete or unrecognized format
        return date_str
    
    # Define sections that contain date fields
    date_sections = {
        'work_experience': ['start_date', 'end_date'],
        'education': ['start_date', 'end_date'],
        'projects': ['start_date', 'end_date'],
        'certifications': ['date', 'issue_date', 'expiry_date'],
        'awards': ['date'],
        'publications': ['date', 'publication_date'],
        'volunteer_experience': ['start_date', 'end_date']
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


def parse_cv_text_with_openai(text_content: str) -> dict:
    """Parse CV text content using OpenAI - wrapper for ai_service function"""
    from .ai_service import parse_cv_text_with_openai as ai_parse
    return ai_parse(text_content)


def extract_text_from_file(file_content: bytes, content_type: str) -> str:
    """Extract text from file content - wrapper for file_service function"""
    from .file_service import extract_text_from_file as file_extract
    return file_extract(file_content, content_type)
