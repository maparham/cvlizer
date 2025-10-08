"""
CV parsing service using OpenAI for extracting structured data from CVs.

This module provides functions for parsing raw CV text (extracted from PDFs/DOCX)
into structured data with sections like personal_info, work_experience, education, etc.
"""
import asyncio
import json
import logging
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from copy import deepcopy
from src.constants import DEFAULT_PARSED_CV
from src.config import AIConfig
from .common import (
    get_openai_client,
    is_ai_enabled,
    extract_response_data,
    log_ai_usage_safe,
    with_retries,
    RETRY_ATTEMPTS,
    RETRY_DELAY
)

logger = logging.getLogger(__name__)


# ============================================================================
# CV Parsing Functions
# ============================================================================

async def parse_cv_text_with_openai(
    text_content: str,
    user_id: Optional[str] = None,
    cv_id: Optional[str] = None,
    db_session: Optional[Session] = None
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
    
    prompt = f"""Parse CV text and map to predefined sections. Use only these 10 sections: personal_info, professional_summary, work_experience, education, skills, certifications, projects, awards, publications, volunteer_experience.

CV Text:
{text_content}

Return JSON with this structure (omit empty sections):
{{
    "personal_info": {{"full_name": "string", "email": "string", "phone": "string", "location": "string", "linkedin_url": "string", "website_url": "string", "github_url": "string"}},
    "professional_summary": {{"content": "string", "keywords": ["string1", "string2"]}},
    "work_experience": [{{"company": "string", "position": "string", "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD or null", "current": boolean, "description": "string", "achievements": ["string1", "string2"], "technologies": ["string1", "string2"]}}],
    "education": [{{"institution": "string", "degree": "string", "field_of_study": "string", "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD or null", "gpa": "string or null", "description": "string", "achievements": ["string1", "string2"], "honors": ["string1", "string2"]}}],
    "skills": {{"technical": ["string1", "string2"], "soft": ["string1", "string2"], "languages": [{{"language": "string", "proficiency": "string"}}]}},
    "certifications": [{{"name": "string", "issuer": "string", "date": "YYYY-MM-DD", "expiry_date": "YYYY-MM-DD or null", "description": "string"}}],
    "projects": [{{"name": "string", "description": "string", "technologies": ["string1", "string2"], "url": "string or null"}}],
    "awards": [{{"name": "string", "issuer": "string", "date": "YYYY-MM-DD", "description": "string"}}],
    "publications": [{{"title": "string", "authors": "string", "journal": "string", "date": "YYYY-MM-DD", "url": "string or null"}}],
    "volunteer_experience": [{{"organization": "string", "role": "string", "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD or null", "description": "string"}}]
}}"""
    
    try:
        if not is_ai_enabled():
            raise RuntimeError("OpenAI disabled")

        client = get_openai_client()
        
        async def _call():
            return await asyncio.to_thread(
                client.responses.create,
                model=AIConfig.OPENAI_MODEL,
                instructions="You are an expert CV parser. Extract structured information from CV text and return valid JSON.",
                input=prompt,
                reasoning={"effort": "minimal", "summary": "auto"},
            )
        response = await with_retries(_call, attempts=RETRY_ATTEMPTS, delay=RETRY_DELAY)
        
        # Extract content and token usage
        content, prompt_tokens, completion_tokens = extract_response_data(response)
        
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
                cv_id=cv_id
            )
        
        # Clean up markdown code blocks if present
        if content.startswith('```json'):
            content = content[7:]  # Remove ```json
        if content.startswith('```'):
            content = content[3:]   # Remove ```
        if content.endswith('```'):
            content = content[:-3]  # Remove trailing ```
        content = content.strip()
        
        # Try to parse as JSON
        try:
            parsed_content = json.loads(content)
            # Add section_config to the parsed content
            parsed_content = _add_section_config(parsed_content)
            return parsed_content
        except json.JSONDecodeError:
            # If JSON parsing fails, return a basic structure
            fallback = deepcopy(DEFAULT_PARSED_CV)
            # Inject a summary with raw text if available
            content_preview = text_content[:500] + "..." if len(text_content) > 500 else text_content
            fallback["professional_summary"] = {"content": content_preview, "keywords": []}
            fallback["parse_error"] = "Failed to parse as JSON, using raw text"
            # Add section_config to fallback
            fallback = _add_section_config(fallback)
            return fallback
        
    except Exception as e:
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
                cv_id=cv_id
            )
        
        # Fallback response in case of API error
        fallback = deepcopy(DEFAULT_PARSED_CV)
        content_preview = text_content[:500] + "..." if len(text_content) > 500 else text_content
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
        {"id": "personal_info", "type": "personal_info", "title": "Personal Information", "visible": True, "order": 1},
        {"id": "professional_summary", "type": "professional_summary", "title": "Professional Summary", "visible": True, "order": 2},
        {"id": "work_experience", "type": "work_experience", "title": "Work Experience", "visible": True, "order": 3},
        {"id": "education", "type": "education", "title": "Education", "visible": True, "order": 4},
        {"id": "skills", "type": "skills", "title": "Skills", "visible": True, "order": 5},
        {"id": "certifications", "type": "certifications", "title": "Certifications", "visible": True, "order": 6},
        {"id": "projects", "type": "projects", "title": "Projects", "visible": True, "order": 7},
        {"id": "awards", "type": "awards", "title": "Awards", "visible": True, "order": 8},
        {"id": "publications", "type": "publications", "title": "Publications", "visible": True, "order": 9},
        {"id": "volunteer_experience", "type": "volunteer_experience", "title": "Volunteer Experience", "visible": True, "order": 10}
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
            return bool(section_data.get("technical") or section_data.get("soft") or section_data.get("languages"))
        elif section_type in ["work_experience", "education", "certifications", "projects", "awards", "publications", "volunteer_experience"]:
            return bool(section_data and len(section_data) > 0)
        
        return False
    
    # Filter sections to only include those with data
    sections_with_data = []
    for section_def in section_definitions:
        section_type = str(section_def["type"])
        if has_section_data(section_type):
            sections_with_data.append(section_def)
    
    # Add section_config to parsed content
    parsed_content["section_config"] = {
        "sections": sections_with_data
    }
    
    return parsed_content

