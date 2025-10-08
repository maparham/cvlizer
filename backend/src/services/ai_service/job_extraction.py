"""
Job description extraction service using AI.

This module provides functions for extracting structured job description
data from raw HTML/text content scraped from job posting websites.
"""
import time
import json
import logging
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from src.config import AIConfig
from .common import (
    get_openai_client,
    is_ai_enabled,
    extract_response_data,
    parse_json_from_markdown,
    log_ai_usage_safe,
    MAX_JOB_CONTENT_LENGTH
)

logger = logging.getLogger(__name__)


# ============================================================================
# Job Description Extraction Functions
# ============================================================================

def extract_job_description_with_ai(
    raw_content: str,
    source_url: str,
    user_id: Optional[str] = None,
    cv_id: Optional[str] = None,
    db_session: Optional[Session] = None
) -> Dict[str, Any]:
    """
    Extract structured job description data from raw HTML content using OpenAI.
    
    Args:
        raw_content: Raw HTML/text content from the job posting URL
        source_url: Original URL of the job posting
        user_id: User identifier for logging
        cv_id: CV identifier for logging
        db_session: Database session for logging
        
    Returns:
        Dictionary containing extracted job description data:
        - title: Job title
        - company: Company name
        - location: Job location
        - content: Complete job description in markdown format
        - source: Job site type
    """
    if not is_ai_enabled():
        return {
            "error": "AI service is not enabled",
            "success": False
        }
    
    try:
        # Truncate content if it's too long for the API
        if len(raw_content) > MAX_JOB_CONTENT_LENGTH:
            raw_content = raw_content[:MAX_JOB_CONTENT_LENGTH] + "..."
        
        prompt = f"""
You are an expert at extracting job description information from web content. 

Please analyze the following content from a job posting and extract the key information in JSON format.

Source URL: {source_url}

Content to analyze:
{raw_content}

Please extract and return ONLY a JSON object with the following structure:
{{
    "title": "Job title (e.g., 'Senior Software Engineer')",
    "company": "Company name",
    "location": "Job location (city, state/country)",
    "content": "Complete job description in MARKDOWN format with proper formatting",
    "source": "Job site type (e.g., 'linkedin', 'indeed', 'company_careers', etc.)"
}}

Guidelines:
- Extract the most specific and accurate information available
- For the content field, format as MARKDOWN:
  * Use ## for main section headers (e.g., ## Requirements, ## Responsibilities)
  * Use ### for subsection headers
  * Use - or * for bullet points in lists
  * Use **bold** for emphasis on key terms or requirements
  * Use proper line breaks (\\n\\n) between sections
  * Preserve all structure and hierarchy from the original
  * Convert any numbered lists to markdown format (1., 2., etc.)
  * Keep technical terms and requirements exactly as stated
- If information is not available, use empty string or "Unknown"
- For source, try to identify the job site type from the URL or content
- Ensure the JSON is valid and properly formatted
- Do not include any text outside the JSON object

Return only the JSON object:
"""

        def _call_openai():
            start_time = time.time()
            client = get_openai_client()
            response = client.responses.create(
                model=AIConfig.OPENAI_MODEL,
                instructions="You are an expert at extracting structured information from job postings. Always return valid JSON. Format the 'content' field as markdown with proper headers (##, ###), bullet points (-, *), bold text (**bold**), and line breaks.",
                input=prompt,
                reasoning={"effort": "minimal", "summary": "auto"},
            )
            end_time = time.time()
            
            # Extract content and token usage
            content, prompt_tokens, completion_tokens = extract_response_data(response)
            generation_time = int((end_time - start_time) * 1000)  # Convert to milliseconds
            
            return content.strip() if content else "", prompt_tokens, completion_tokens, generation_time

        result, prompt_tokens, completion_tokens, generation_time = _call_openai()
        
        # Log AI usage with actual token counts
        if user_id:
            log_ai_usage_safe(
                db_session=db_session,
                user_id=user_id,
                operation_type="extract_job_description",
                model_used=AIConfig.OPENAI_MODEL,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                generation_time=generation_time,
                success=True,
                cv_id=cv_id
            )
        
        # Parse the JSON response
        try:
            # Clean the response - remove markdown code blocks if present
            # Parse JSON using centralized utility (handles markdown code blocks)
            json_content = parse_json_from_markdown(result)
            extracted_data = json.loads(json_content)
            
            # Validate required fields
            if not isinstance(extracted_data, dict):
                raise ValueError("Response is not a valid JSON object")
            
            # Ensure we have the required fields
            return {
                "title": extracted_data.get("title", "Unknown Title"),
                "company": extracted_data.get("company", "Unknown Company"), 
                "location": extracted_data.get("location", "Unknown Location"),
                "content": extracted_data.get("content", ""),
                "source": extracted_data.get("source", "ai_parsed")
            }
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response from OpenAI: {result}")
            # Fallback: try to extract basic info manually
            return {
                "title": "Job Posting",
                "company": "Unknown Company",
                "location": "Unknown Location", 
                "content": raw_content[:1000] + "..." if len(raw_content) > 1000 else raw_content,
                "source": "ai_parsed_fallback"
            }
        
    except Exception as e:
        # Log failed AI usage
        if user_id:
            log_ai_usage_safe(
                db_session=db_session,
                user_id=user_id,
                operation_type="extract_job_description",
                model_used=AIConfig.OPENAI_MODEL,
                prompt_tokens=0,
                completion_tokens=0,
                generation_time=0,
                success=False,
                error_message=str(e),
                cv_id=cv_id
            )
        
        logger.error(f"Error in extract_job_description_with_ai: {str(e)}")
        return {
            "error": f"Failed to extract job description: {str(e)}",
            "success": False
        }

