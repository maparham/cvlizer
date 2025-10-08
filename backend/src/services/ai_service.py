"""
AI service for CV parsing and content generation using OpenAI.

This module provides functions for parsing CV content with OpenAI
and generating AI-enhanced CV sections tailored to job descriptions.
"""
import openai
import os
import time
import asyncio
import re
import json
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Tuple, Optional
from src.constants import DEFAULT_PARSED_CV
from src.config import AIConfig
from copy import deepcopy

logger = logging.getLogger(__name__)

# Set OpenAI API key and create a singleton client
if AIConfig.is_enabled():
    openai.api_key = AIConfig.OPENAI_API_KEY
    _openai_client = openai.OpenAI()
else:
    _openai_client = None


def is_ai_enabled() -> bool:
    """Check if AI features are enabled"""
    return _openai_client is not None


def analyze_job_fit_sync(cv_data: Dict[str, Any], job_description: str, user_id: Optional[str] = None, cv_id: Optional[str] = None, db_session: Optional[Any] = None) -> Dict[str, Any]:
    """
    Synchronous version of job fit analysis to avoid async/sync issues in background tasks.

    Returns:
        - confidence_score: 1-100% match confidence (always present)
        - fit_analysis: Detailed analysis of matches
        - generated_at: ISO timestamp (always present)
        - key_matches: List of key matching points
        - missing_skills: Skills mentioned in JD but not in CV
        - suggested_improvements: Areas for improvement
    """

    if not is_ai_enabled():
        return {
            "error": "OpenAI API key not configured. AI features are disabled.",
            "confidence_score": 0,
            "fit_analysis": "",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "key_matches": [],
            "missing_skills": [],
            "suggested_improvements": [],
            "strengths": [],
            "weaknesses": []
        }
    
    prompt = f"""Analyze CV vs job description match. Return JSON with honest analysis but positive fit_analysis text.

CV: {json.dumps(cv_data, indent=2)}
Job: {job_description}

Rules:
- confidence_score: honest 1-100 match score
- fit_analysis: "Why I'm a Good Fit" text in first person (2-3 paragraphs + Job Requirements Analysis)
- Extract ACTUAL job requirements from the job description
- Keep requirements in their original language from the job description
- If job description is very long, summarize requirements but keep them specific and real
- Be concise and to the point, don't be overzealous
- Other fields: honest assessment

JSON format:
{{
    "confidence_score": 85,
    "fit_analysis": "**Why I'm a Good Fit**\\n\\n[2-3 paragraphs highlighting relevant experience]\\n\\n**Job Requirements Analysis**\\n\\n**[ACTUAL REQUIREMENT FROM JD]**\\n[explanation of how CV matches this requirement]\\n\\n**[ANOTHER ACTUAL REQUIREMENT FROM JD]**\\n[explanation of how CV matches this requirement]",
    "key_matches": ["genuine matches only"],
    "missing_skills": ["skills in JD not in CV"],
    "suggested_improvements": ["constructive recommendations"],
    "strengths": ["candidate strengths"],
    "weaknesses": ["honest gaps"]
}}
"""
    
    try:
        start_time = time.time()

        # Make synchronous OpenAI API call
        response = _openai_client.chat.completions.create(
            model=AIConfig.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": "Expert CV analyst who can analyze job descriptions in any language. Return only valid JSON. fit_analysis must be positive candidate defense text written in first person. Extract ACTUAL job requirements from the job description text and use them as bold headers (**Actual Requirement Text**), not generic placeholders. Keep requirements in their original language. confidence_score and other fields must be honest/factual."},
                {"role": "user", "content": prompt}
            ],
        )

        generation_time = int((time.time() - start_time) * 1000)
        content = response.choices[0].message.content
        tokens_used = response.usage.total_tokens

        # Log AI usage
        if user_id:
            _log_ai_usage_safe(
                db_session=db_session,
                user_id=user_id,
                operation_type="analyze_job_fit",
                model_used=AIConfig.OPENAI_MODEL,
                prompt_tokens=response.usage.prompt_tokens,
                completion_tokens=response.usage.completion_tokens,
                generation_time=generation_time,
                success=True,
                cv_id=cv_id
            )

        # Debug logging to help identify formatting issues
        logger.info(f"AI Response content preview: {content[:200]}...")

        # Parse JSON response - handle markdown code blocks
        try:
            # Extract JSON from markdown code blocks if present
            if "```json" in content:
                # Find the JSON content between ```json and ```
                start = content.find("```json") + 7
                end = content.find("```", start)
                if end != -1:
                    json_content = content[start:end].strip()
                else:
                    json_content = content
            elif "```" in content:
                # Handle generic code blocks
                start = content.find("```") + 3
                end = content.find("```", start)
                if end != -1:
                    json_content = content[start:end].strip()
                else:
                    json_content = content
            else:
                json_content = content

            analysis = json.loads(json_content)

            # Clean up the fit_analysis field to ensure it's just the content
            if "fit_analysis" in analysis and isinstance(analysis["fit_analysis"], str):
                # Remove any potential JSON structure that might have been included
                fit_analysis = analysis["fit_analysis"]
                # If it contains JSON-like structure, try to extract just the content
                if fit_analysis.strip().startswith('{') and 'confidence_score' in fit_analysis:
                    # This looks like the AI returned the entire JSON in the fit_analysis field
                    # Try to extract just the content part
                    try:
                        # Find the content between quotes after "fit_analysis":
                        import re
                        match = re.search(r'"fit_analysis":\s*"([^"]*(?:\\.[^"]*)*)"', fit_analysis)
                        if match:
                            analysis["fit_analysis"] = match.group(1).replace('\\n', '\n').replace('\\"', '"')
                    except:
                        pass

        except json.JSONDecodeError:
            # Fallback if JSON parsing fails
            logger.warning(f"analyze_job_fit_sync: JSON parse failed, using fallback. Content preview: {content[:200]}")
            analysis = {
                "confidence_score": 50,
                "fit_analysis": content,
                "key_matches": [],
                "missing_skills": [],
                "suggested_improvements": [],
                "strengths": [],
                "weaknesses": []
            }

        # Ensure required fields are always present
        confidence_score = analysis.get("confidence_score", 50)
        generated_at = analysis.get("generated_at") or datetime.now(timezone.utc).isoformat()

        # Log presence of required fields for observability
        logger.info(f"analyze_job_fit_sync: confidence_score={confidence_score}, generated_at={generated_at}, tokens_used={tokens_used}")
        if "confidence_score" not in analysis:
            logger.warning("analyze_job_fit_sync: confidence_score missing in AI response; using fallback value 50")
        if "generated_at" not in analysis:
            logger.warning(f"analyze_job_fit_sync: generated_at missing in AI response; using fallback timestamp {generated_at}")

        return {
            "confidence_score": confidence_score,
            "fit_analysis": analysis.get("fit_analysis", content),
            "generated_at": generated_at,
            "key_matches": analysis.get("key_matches", []),
            "missing_skills": analysis.get("missing_skills", []),
            "suggested_improvements": analysis.get("suggested_improvements", []),
            "strengths": analysis.get("strengths", []),
            "weaknesses": analysis.get("weaknesses", []),
            "tokens_used": tokens_used,
            "generation_time": generation_time,
            "model_used": AIConfig.OPENAI_MODEL
        }

    except Exception as e:
        # Log failed AI usage
        if user_id:
            _log_ai_usage_safe(
                db_session=db_session,
                user_id=user_id,
                operation_type="analyze_job_fit",
                model_used=AIConfig.OPENAI_MODEL,
                prompt_tokens=0,
                completion_tokens=0,
                generation_time=0,
                success=False,
                error_message=str(e),
                cv_id=cv_id
            )

        return {
            "error": f"Error analyzing job fit: {str(e)}",
            "confidence_score": 0,
            "fit_analysis": "",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "key_matches": [],
            "missing_skills": [],
            "suggested_improvements": [],
            "strengths": [],
            "weaknesses": []
        }


def _log_ai_usage_safe(
    db_session: Optional[Any],
    user_id: str,
    operation_type: str,
    model_used: str,
    prompt_tokens: int,
    completion_tokens: int,
    generation_time: int,
    success: bool = True,
    error_message: Optional[str] = None,
    cv_id: Optional[str] = None
) -> None:
    """
    Safely log AI usage without breaking existing functionality.
    
    This function wraps the AI usage logging in a try-catch to ensure
    that logging failures don't affect the main AI service functionality.
    """
    try:
        if db_session:
            from .ai_usage_service import log_ai_usage
            log_ai_usage(
                db=db_session,
                user_id=user_id,
                operation_type=operation_type,
                model_used=model_used,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                generation_time=generation_time,
                success=success,
                error_message=error_message,
                cv_id=cv_id
            )
    except Exception as e:
        # Log the error but don't raise it to avoid breaking main functionality
        logger.warning(f"Failed to log AI usage: {str(e)}")


async def _with_retries(coro_factory, attempts: int = 2, delay: float = 0.5):
    last_exc = None
    for i in range(attempts):
        try:
            result = await coro_factory()
            return result
        except Exception as e:
            last_exc = e
            if i < attempts - 1:
                await asyncio.sleep(delay * (2 ** i))
    raise last_exc


async def generate_cv_section(cv_data: Dict[str, Any], job_description: str, section_type: str = "why_good_fit", user_id: Optional[str] = None, cv_id: Optional[str] = None, db_session: Optional[Any] = None) -> Dict[str, Any]:
    """Generate AI-enhanced CV section based on job description"""
    if not is_ai_enabled():
        return {
            "error": "OpenAI API key not configured. AI features are disabled.",
            "section_content": "",
            "suggestions": []
        }
    
    
    # Create prompt based on section type
    if section_type == "why_good_fit":
        prompt = f"""
        Based on the following CV data and job description, generate a compelling "Why I'm a Good Fit" section that highlights how the candidate's experience and skills align with the job requirements.

        CV Data:
        {cv_data}

        Job Description:
        {job_description}

        IMPORTANT: Only consider a job description incomplete if it is genuinely missing essential information (extremely short, placeholder text, or empty). DO NOT consider it incomplete just because it's in a non-English language or uses different terminology.

        Please generate a professional section with the following structure:
        1. 2-3 paragraphs highlighting relevant experience and skills
        2. End with a "Job Requirements Analysis" section containing job requirements in bullet points with explanations

        Format the response as JSON with the following structure:
        {{
            "title": "Hello <company name>!",
            "content": "**Why am I applying for this job?**\\n\\n[1-2 short paragraphs highlighting experience and skills]\\n\\n**Job Requirements Analysis**\\n\\n[List actual requirements with explanations]",
            "key_points": ["Point 1", "Point 2", "Point 3"]
        }}
        """
    else:
        raise ValueError(f"Unsupported section type: '{section_type}'. Only 'why_good_fit' is currently supported.")
    
    try:
        start_time = time.time()
        
        # Run the synchronous OpenAI call in a thread pool to avoid blocking
        async def _call():
            return await asyncio.to_thread(
                _openai_client.chat.completions.create,
                model=AIConfig.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": "You are a professional CV optimization expert. Generate compelling, tailored content that helps candidates stand out."},
                    {"role": "user", "content": prompt}
                ],
            )

        response = await _with_retries(_call, attempts=2, delay=0.5)
        
        generation_time = int((time.time() - start_time) * 1000)  # Convert to milliseconds
        
        content = response.choices[0].message.content
        tokens_used = response.usage.total_tokens
        
        # Log AI usage
        if user_id:
            _log_ai_usage_safe(
                db_session=db_session,
                user_id=user_id,
                operation_type="generate_section",
                model_used=AIConfig.OPENAI_MODEL,
                prompt_tokens=response.usage.prompt_tokens,
                completion_tokens=response.usage.completion_tokens,
                generation_time=generation_time,
                success=True,
                cv_id=cv_id
            )
        
        # Try to parse as JSON, fallback to plain text
        try:
            import json
            parsed_content = json.loads(content)
        except json.JSONDecodeError:
            parsed_content = {
                "title": "AI Generated Section",
                "content": content,
                "key_points": []
            }
        
        return {
            "section_content": parsed_content.get("content", content),
            "title": parsed_content.get("title", "AI Generated Section"),
            "key_points": parsed_content.get("key_points", []),
            "tokens_used": tokens_used,
            "generation_time": generation_time,
            "model_used": AIConfig.OPENAI_MODEL
        }
        
    except Exception as e:
        # Log failed AI usage
        if user_id:
            _log_ai_usage_safe(
                db_session=db_session,
                user_id=user_id,
                operation_type="generate_section",
                model_used=AIConfig.OPENAI_MODEL,
                prompt_tokens=0,
                completion_tokens=0,
                generation_time=0,
                success=False,
                error_message=str(e),
                cv_id=cv_id
            )
        
        # Fallback response in case of API error
        return {
            "section_content": f"I apologize, but I'm unable to generate content at the moment. Please try again later. Error: {str(e)}",
            "title": "AI Generated Section",
            "key_points": [],
            "tokens_used": 0,
            "generation_time": 0,
            "model_used": AIConfig.OPENAI_MODEL,
            "error": str(e)
        }


async def parse_cv_text_with_openai(text_content: str, user_id: Optional[str] = None, cv_id: Optional[str] = None, db_session: Optional[Any] = None) -> dict:
    """Parse CV text content using OpenAI to extract structured data"""
    
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

        async def _call():
            return await asyncio.to_thread(
                _openai_client.chat.completions.create,
                model=AIConfig.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": "You are an expert CV parser. Extract structured information from CV text and return valid JSON."},
                    {"role": "user", "content": prompt}
                ],
            )
        response = await _with_retries(_call, attempts=2, delay=0.5)
        
        content = response.choices[0].message.content
        
        # Log AI usage
        if user_id:
            _log_ai_usage_safe(
                db_session=db_session,
                user_id=user_id,
                operation_type="parse_cv",
                model_used=AIConfig.OPENAI_MODEL,
                prompt_tokens=response.usage.prompt_tokens,
                completion_tokens=response.usage.completion_tokens,
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
        import json
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
            _log_ai_usage_safe(
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
    """Add section_config to parsed CV content based on available sections"""
    
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
        if has_section_data(section_def["type"]):
            sections_with_data.append(section_def)
    
    # Add section_config to parsed content
    parsed_content["section_config"] = {
        "sections": sections_with_data
    }
    
    return parsed_content


async def analyze_job_fit(cv_data: Dict[str, Any], job_description: str, user_id: Optional[str] = None, cv_id: Optional[str] = None, db_session: Optional[Any] = None) -> Dict[str, Any]:
    """
    Analyze how well a CV fits a job description and generate a compelling fit narrative.
    
    Returns:
        - confidence_score: 1-100% match confidence
        - fit_analysis: Detailed analysis of matches
        - key_matches: List of key matching points
        - missing_skills: Skills mentioned in JD but not in CV
        - suggested_improvements: Areas for improvement
    """
    
    if not is_ai_enabled():
        return {
            "error": "OpenAI API key not configured. AI features are disabled.",
            "confidence_score": 0,
            "fit_analysis": "",
            "key_matches": [],
            "missing_skills": [],
            "suggested_improvements": [],
            "strengths": [],
            "weaknesses": []
        }
    
    
    prompt = f"""Analyze CV vs job description match. Return JSON with honest analysis but positive fit_analysis text.

CV: {json.dumps(cv_data, indent=2)}
Job: {job_description}

Rules:
- confidence_score: honest 1-100 match score
- fit_analysis: "Why I'm a Good Fit" text in first person (2-3 paragraphs + Job Requirements Analysis)
- Extract ACTUAL job requirements from the job description
- Keep requirements in their original language from the job description
- If job description is very long, summarize requirements but keep them specific and real
- Be concise and to the point, don't be overzealous
- Other fields: honest assessment

JSON format:
{{
    "confidence_score": 85,
    "fit_analysis": "**Why I'm a Good Fit**\\n\\n[2-3 paragraphs highlighting relevant experience]\\n\\n**Job Requirements Analysis**\\n\\n**[ACTUAL REQUIREMENT FROM JD]**\\n[explanation of how CV matches this requirement]\\n\\n**[ANOTHER ACTUAL REQUIREMENT FROM JD]**\\n[explanation of how CV matches this requirement]",
    "key_matches": ["genuine matches only"],
    "missing_skills": ["skills in JD not in CV"],
    "suggested_improvements": ["constructive recommendations"],
    "strengths": ["candidate strengths"],
    "weaknesses": ["honest gaps"]
}}
"""
    
    try:
        start_time = time.time()
        
        async def _call():
            return await asyncio.to_thread(
                _openai_client.chat.completions.create,
                model=AIConfig.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": "Expert CV analyst who can analyze job descriptions in any language. Return only valid JSON. fit_analysis must be positive candidate defense text written in first person. Extract ACTUAL job requirements from the job description text and use them as bold headers (**Actual Requirement Text**), not generic placeholders. Keep requirements in their original language. confidence_score and other fields must be honest/factual."},
                    {"role": "user", "content": prompt}
                ],
            )

        try:
            response = await asyncio.wait_for(_with_retries(_call, attempts=2, delay=0.5), timeout=60.0)
        except asyncio.TimeoutError:
            return {
                "error": "OpenAI API call timed out after 60 seconds",
                "confidence_score": 0,
                "fit_analysis": "",
                "key_matches": [],
                "missing_skills": [],
                "suggested_improvements": [],
                "strengths": [],
                "weaknesses": []
            }
        
        generation_time = int((time.time() - start_time) * 1000)
        content = response.choices[0].message.content
        tokens_used = response.usage.total_tokens
        
        # Log AI usage
        if user_id:
            _log_ai_usage_safe(
                db_session=db_session,
                user_id=user_id,
                operation_type="analyze_job_fit",
                model_used=AIConfig.OPENAI_MODEL,
                prompt_tokens=response.usage.prompt_tokens,
                completion_tokens=response.usage.completion_tokens,
                generation_time=generation_time,
                success=True,
                cv_id=cv_id
            )
        
        # Debug logging to help identify formatting issues
        logger.info(f"AI Response content preview: {content[:200]}...")
        
        # Parse JSON response - handle markdown code blocks
        try:
            # Extract JSON from markdown code blocks if present
            if "```json" in content:
                # Find the JSON content between ```json and ```
                start = content.find("```json") + 7
                end = content.find("```", start)
                if end != -1:
                    json_content = content[start:end].strip()
                else:
                    json_content = content
            elif "```" in content:
                # Handle generic code blocks
                start = content.find("```") + 3
                end = content.find("```", start)
                if end != -1:
                    json_content = content[start:end].strip()
                else:
                    json_content = content
            else:
                json_content = content
            
            analysis = json.loads(json_content)
            
            # Clean up the fit_analysis field to ensure it's just the content
            if "fit_analysis" in analysis and isinstance(analysis["fit_analysis"], str):
                # Remove any potential JSON structure that might have been included
                fit_analysis = analysis["fit_analysis"]
                # If it contains JSON-like structure, try to extract just the content
                if fit_analysis.strip().startswith('{') and 'confidence_score' in fit_analysis:
                    # This looks like the AI returned the entire JSON in the fit_analysis field
                    # Try to extract just the content part
                    try:
                        # Find the content between quotes after "fit_analysis":
                        import re
                        match = re.search(r'"fit_analysis":\s*"([^"]*(?:\\.[^"]*)*)"', fit_analysis)
                        if match:
                            analysis["fit_analysis"] = match.group(1).replace('\\n', '\n').replace('\\"', '"')
                    except:
                        pass
                        
        except json.JSONDecodeError:
            # Fallback if JSON parsing fails
            analysis = {
                "confidence_score": 50,
                "fit_analysis": content,
                "key_matches": [],
                "missing_skills": [],
                "suggested_improvements": [],
                "strengths": [],
                "weaknesses": []
            }
        
        return {
            "confidence_score": analysis.get("confidence_score", 50),
            "fit_analysis": analysis.get("fit_analysis", content),
            "key_matches": analysis.get("key_matches", []),
            "missing_skills": analysis.get("missing_skills", []),
            "suggested_improvements": analysis.get("suggested_improvements", []),
            "strengths": analysis.get("strengths", []),
            "weaknesses": analysis.get("weaknesses", []),
            "tokens_used": tokens_used,
            "generation_time": generation_time,
            "model_used": AIConfig.OPENAI_MODEL
        }
        
    except Exception as e:
        # Log failed AI usage
        if user_id:
            _log_ai_usage_safe(
                db_session=db_session,
                user_id=user_id,
                operation_type="analyze_job_fit",
                model_used=AIConfig.OPENAI_MODEL,
                prompt_tokens=0,
                completion_tokens=0,
                generation_time=0,
                success=False,
                error_message=str(e),
                cv_id=cv_id
            )
        
        return {
            "error": f"Error analyzing job fit: {str(e)}",
            "confidence_score": 0,
            "fit_analysis": "",
            "key_matches": [],
            "missing_skills": [],
            "suggested_improvements": [],
            "strengths": [],
            "weaknesses": [],
            "tokens_used": 0,
            "generation_time": 0,
            "model_used": AIConfig.OPENAI_MODEL
        }


async def enhance_content(original_content: str, content_type: str = "bullet_point", user_id: Optional[str] = None, cv_id: Optional[str] = None, db_session: Optional[Any] = None) -> Dict[str, Any]:
    """
    Enhance a piece of content (bullet point, paragraph, etc.) with stronger language and metrics.
    
    Args:
        original_content: The content to enhance
        content_type: Type of content (bullet_point, paragraph, summary, etc.)
    
    Returns:
        - suggestions: List of 3-4 enhanced versions
        - improvements: List of specific improvements made
        - confidence_scores: Confidence scores for each suggestion
    """
    if not is_ai_enabled():
        return {
            "error": "OpenAI API key not configured. AI features are disabled.",
            "suggestions": [],
            "improvements": [],
            "confidence_scores": []
        }
    
    prompt = f"""
    Enhance this {content_type} to make it more impactful and professional. Generate 4 different improved versions.

    Original Content:
    "{original_content}"

    For each suggestion, focus on:
    1. Stronger action verbs (led, implemented, optimized, delivered, etc.)
    2. Quantified results where possible (percentages, numbers, timeframes)
    3. Industry-specific terminology
    4. More compelling impact statements
    5. Professional language and tone

    Return JSON format:
    {{
        "suggestions": [
            {{
                "content": "Enhanced version 1...",
                "improvements": ["Added metrics", "Stronger verb", "Industry terms"],
                "confidence_score": 85
            }},
            {{
                "content": "Enhanced version 2...",
                "improvements": ["Quantified results", "Action-oriented", "Specific impact"],
                "confidence_score": 90
            }},
            {{
                "content": "Enhanced version 3...",
                "improvements": ["Professional tone", "Technical details", "Business impact"],
                "confidence_score": 88
            }},
            {{
                "content": "Enhanced version 4...",
                "improvements": ["Concise format", "Key achievements", "Measurable outcomes"],
                "confidence_score": 82
            }}
        ],
        "overall_improvements": [
            "Added specific metrics and quantifiable results",
            "Used stronger action verbs",
            "Incorporated industry-specific terminology",
            "Improved overall impact and professionalism"
        ]
    }}
    """
    
    try:
        start_time = time.time()
        
        async def _call():
            return await asyncio.to_thread(
                _openai_client.chat.completions.create,
                model=AIConfig.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": "You are a professional CV writer and content optimization expert. Enhance content to be more impactful, specific, and professional."},
                    {"role": "user", "content": prompt}
                ],
            )

        response = await _with_retries(_call, attempts=2, delay=0.5)
        
        generation_time = int((time.time() - start_time) * 1000)
        content = response.choices[0].message.content
        tokens_used = response.usage.total_tokens
        
        # Log AI usage
        if user_id:
            _log_ai_usage_safe(
                db_session=db_session,
                user_id=user_id,
                operation_type="enhance_content",
                model_used=AIConfig.OPENAI_MODEL,
                prompt_tokens=response.usage.prompt_tokens,
                completion_tokens=response.usage.completion_tokens,
                generation_time=generation_time,
                success=True,
                cv_id=cv_id
            )
        
        # Parse JSON response - handle markdown code blocks
        try:
            # Extract JSON from markdown code blocks if present
            if "```json" in content:
                # Find the JSON content between ```json and ```
                start = content.find("```json") + 7
                end = content.find("```", start)
                if end != -1:
                    json_content = content[start:end].strip()
                else:
                    json_content = content
            elif "```" in content:
                # Handle generic code blocks
                start = content.find("```") + 3
                end = content.find("```", start)
                if end != -1:
                    json_content = content[start:end].strip()
                else:
                    json_content = content
            else:
                json_content = content
            
            result = json.loads(json_content)
            suggestions = result.get("suggestions", [])
            overall_improvements = result.get("overall_improvements", [])
        except json.JSONDecodeError:
            # Fallback if JSON parsing fails
            suggestions = [{"content": content, "improvements": ["Enhanced content"], "confidence_score": 75}]
            overall_improvements = ["Content enhanced for better impact"]
        
        return {
            "suggestions": suggestions,
            "overall_improvements": overall_improvements,
            "tokens_used": tokens_used,
            "generation_time": generation_time,
            "model_used": AIConfig.OPENAI_MODEL
        }
        
    except Exception as e:
        # Log failed AI usage
        if user_id:
            _log_ai_usage_safe(
                db_session=db_session,
                user_id=user_id,
                operation_type="enhance_content",
                model_used=AIConfig.OPENAI_MODEL,
                prompt_tokens=0,
                completion_tokens=0,
                generation_time=0,
                success=False,
                error_message=str(e),
                cv_id=cv_id
            )
        
        return {
            "error": f"Error enhancing content: {str(e)}",
            "suggestions": [],
            "overall_improvements": [],
            "tokens_used": 0,
            "generation_time": 0,
            "model_used": AIConfig.OPENAI_MODEL
        }


async def analyze_ats_optimization(cv_data: Dict[str, Any], job_description: str, user_id: Optional[str] = None, cv_id: Optional[str] = None, db_session: Optional[Any] = None) -> Dict[str, Any]:
    """
    Analyze CV content for ATS keyword optimization (not formatting - that happens during PDF export).
    
    ATS Score measures:
    - Keyword matching between CV content and job description
    - Missing important keywords and where to add them
    - Industry-specific terminology usage
    - Content completeness and organization
    - Keyword placement within available sections
    
    Note: This analyzes structured CV data, not final PDF formatting which is determined during export.
    
    Returns:
        - ats_score: 1-100% keyword optimization score
        - missing_keywords: Important keywords from JD not in CV
        - keyword_analysis: Analysis of keyword presence and placement
        - suggestions: Specific content optimization suggestions
        - content_optimization: Section-specific keyword improvements
    """
    
    if not is_ai_enabled():
        return {
            "error": "OpenAI API key not configured. AI features are disabled.",
            "ats_score": 0,
            "missing_keywords": [],
            "keyword_analysis": {},
            "suggestions": [],
            "content_optimization": []
        }
    
    
    prompt = f"""
    Analyze CV content for ATS keyword optimization against job description.

    CV Data:
    {json.dumps(cv_data, indent=2)}

    Job Description:
    {job_description}

    IMPORTANT: If the job description is incomplete, missing, or contains placeholder text (like "Unknown", "N/A", empty, or very short content), you MUST:
    1. Set ats_score to 0
    2. Return empty arrays for missing_keywords and content_optimization
    3. Include a clear warning in suggestions about incomplete job description
    4. Explain that keyword analysis cannot be performed without proper job description

    CRITICAL INSTRUCTIONS:
    - ONLY analyze keywords that actually appear in the job description text above
    - Do NOT invent or assume keywords that are not explicitly mentioned
    - Extract actual words/phrases from the job description, not related concepts
    - If job description is short, only analyze the words that are actually there
    - THOROUGHLY check if each keyword already exists in the CV content before marking it as "missing"
    - Search through ALL CV sections: skills.technical, skills.soft, work_experience descriptions, professional_summary, projects, etc.
    - Pay special attention to skills.technical and skills.soft arrays - these are common places for keywords
    - Only mark keywords as "missing" if they are genuinely not found anywhere in the CV content
    - For each keyword, specify where it was found in CV (if present) or mark as truly missing
    - Be case-insensitive when checking for keywords (Python = python = PYTHON)

    KEYWORD PLACEMENT RULES:
    - For technical skills/tools: suggest adding to skills section
    - For industry/domain keywords: suggest adding to skills section as industry knowledge
    - For job titles/roles: suggest integrating into work experience descriptions naturally
    - For soft skills: suggest adding to skills section
    - For specific technologies: suggest adding to skills section
    - For company names: suggest integrating into work experience descriptions naturally
    - For location keywords: suggest integrating into work experience descriptions naturally

    CRITICAL: AVOID DUPLICATION
    - Each keyword should appear in ONLY ONE of the following: missing_keywords, suggestions, or content_optimization
    - Do NOT create duplicate suggestions for the same keyword
    - missing_keywords array should contain the primary keyword analysis
    - suggestions array should contain general improvement suggestions (not keyword-specific)
    - content_optimization should contain section-specific improvements (not keyword-specific)

    ATS Score measures keyword matching and content optimization (not formatting - that happens during PDF export).

    Return JSON:
    {{
        "ats_score": 75,
        "missing_keywords": [
            {{
                "keyword": "ACTUAL_KEYWORD_FROM_JD",
                "importance": "high",
                "frequency_in_jd": 1,
                "present_in_cv": false,
                "found_in_sections": [],
                "suggested_placement": "skills section" // or "work experience descriptions" based on keyword type
            }}
        ],
        "keyword_analysis": {{
            "ACTUAL_KEYWORD": {{
                "present": false, 
                "found_in_sections": [],
                "suggested_sections": ["skills"] // or ["work_experience"] based on keyword type
            }}
        }},
        "suggestions": [
            "Enhance technical skills section with industry-specific keywords",
            "Improve work experience descriptions with relevant terminology"
        ],
        "content_optimization": [
            {{
                "section": "professional_summary",
                "missing_keywords": ["ACTUAL_KEYWORD"],
                "suggestion": "Add industry-specific keywords to professional summary"
            }}
        ],
        "strengths": [
            "Good technical keywords in work experience",
            "Relevant project descriptions"
        ],
        "weaknesses": [
            "Missing key technical skills from job description",
            "Could benefit from more industry-specific terminology"
        ]
    }}

    Focus on:
    1. Keyword matching between CV content and job description
    2. Missing important keywords and where to add them (ONLY from actual JD text, ONLY if truly missing)
    3. Thoroughly search CV content for each keyword before marking as missing
    4. Industry-specific terminology usage (ONLY if mentioned in JD)
    5. Content completeness and organization
    6. Contextually appropriate keyword placement within available sections
    7. CRITICAL: Avoid duplication - each keyword should appear in only ONE response array
    """
    
    try:
        start_time = time.time()
        
        # Prepare the messages array that will be sent to OpenAI
        messages = [
            {"role": "system", "content": "You are an ATS optimization expert. Analyze CVs for keyword matching, density optimization, and ATS compatibility. CRITICAL: Only analyze keywords that actually appear in the job description text - do not invent or assume keywords that are not explicitly mentioned. Thoroughly check if keywords already exist in CV content before marking as missing. Categorize keywords appropriately: technical skills/tools/technologies go to skills section, industry/domain knowledge goes to skills section, job titles/company names/locations go to work experience descriptions. AVOID DUPLICATION: Each keyword should appear in only ONE response array (missing_keywords, suggestions, or content_optimization) - never duplicate the same keyword across multiple arrays."},
            {"role": "user", "content": prompt}
        ]
        
        # Log the exact raw prompt being sent to OpenAI
        
        # Also log to logger
        logger.info("RAW OPENAI REQUEST:")
        logger.info("=" * 50)
        logger.info(f"Model: {AIConfig.OPENAI_MODEL}")
        logger.info(f"Max Tokens: 1200")
        logger.info(f"Temperature: 0.2")
        logger.info("Messages Array:")
        logger.info(json.dumps(messages, indent=2))
        logger.info("=" * 50)
        
        async def _call():
            return await asyncio.to_thread(
                _openai_client.chat.completions.create,
                model=AIConfig.OPENAI_MODEL,
                messages=messages,
            )

        response = await _with_retries(_call, attempts=2, delay=0.5)
        
        generation_time = int((time.time() - start_time) * 1000)
        content = response.choices[0].message.content
        tokens_used = response.usage.total_tokens
        
        # Log AI usage
        if user_id:
            _log_ai_usage_safe(
                db_session=db_session,
                user_id=user_id,
                operation_type="ats_optimization",
                model_used=AIConfig.OPENAI_MODEL,
                prompt_tokens=response.usage.prompt_tokens,
                completion_tokens=response.usage.completion_tokens,
                generation_time=generation_time,
                success=True,
                cv_id=cv_id
            )
        
        # Log the full response for debugging
        logger.info("ATS Optimization Response:")
        logger.info("=" * 50)
        logger.info(content)
        logger.info("=" * 50)
        
        # Parse JSON response - handle markdown code blocks
        try:
            # Extract JSON from markdown code blocks if present
            if "```json" in content:
                # Find the JSON content between ```json and ```
                start = content.find("```json") + 7
                end = content.find("```", start)
                if end != -1:
                    json_content = content[start:end].strip()
                else:
                    json_content = content
            elif "```" in content:
                # Handle generic code blocks
                start = content.find("```") + 3
                end = content.find("```", start)
                if end != -1:
                    json_content = content[start:end].strip()
                else:
                    json_content = content
            else:
                json_content = content
            
            analysis = json.loads(json_content)
        except json.JSONDecodeError as e:
            # Log the error for debugging
            logger.error(f"Failed to parse ATS analysis JSON: {str(e)}")
            logger.error(f"Raw content: {content[:500]}...")
            # Fallback if JSON parsing fails
            analysis = {
                "ats_score": 50,
                "missing_keywords": [],
                "keyword_analysis": {},
                "suggestions": ["Unable to parse detailed analysis"],
                "content_optimization": [],
                "strengths": [],
                "weaknesses": []
            }
        
        return {
            "ats_score": analysis.get("ats_score", 50),
            "missing_keywords": analysis.get("missing_keywords", []),
            "keyword_analysis": analysis.get("keyword_analysis", {}),
            "suggestions": analysis.get("suggestions", []),
            "content_optimization": analysis.get("content_optimization", []),
            "strengths": analysis.get("strengths", []),
            "weaknesses": analysis.get("weaknesses", []),
            "tokens_used": tokens_used,
            "generation_time": generation_time,
            "model_used": AIConfig.OPENAI_MODEL
        }
        
    except Exception as e:
        # Log failed AI usage
        if user_id:
            _log_ai_usage_safe(
                db_session=db_session,
                user_id=user_id,
                operation_type="ats_optimization",
                model_used=AIConfig.OPENAI_MODEL,
                prompt_tokens=0,
                completion_tokens=0,
                generation_time=0,
                success=False,
                error_message=str(e),
                cv_id=cv_id
            )
        
        return {
            "error": f"Error analyzing ATS optimization: {str(e)}",
            "ats_score": 0,
            "missing_keywords": [],
            "keyword_analysis": {},
            "suggestions": [],
            "content_optimization": [],
            "strengths": [],
            "weaknesses": [],
            "tokens_used": 0,
            "generation_time": 0,
            "model_used": AIConfig.OPENAI_MODEL
        }


async def create_optimization_suggestions(
    cv_data: Dict[str, Any],
    job_description: str,
    user_id: Optional[str] = None,
    cv_id: Optional[str] = None,
    db_session: Optional[Any] = None
) -> Dict[str, Any]:
    """
    Generate ALL AI suggestions for CV optimization in one unified call.
    
    Args:
        cv_data: Complete CV data including skills, professional summary, work experience
        job_description: The job description text to analyze
    
    Returns:
        Dictionary with all suggestions:
        {
            "skills": {
                "technical": [{"skill": "...", "reasoning": "..."}],
                "soft": [{"skill": "...", "reasoning": "..."}]
            },
            "professional_summary": {
                "suggested_text": "...",
                "original_text": "...",
                "key_changes": ["..."]
            }
        }
        Returns empty structures if AI is disabled or on error (graceful degradation).
    """
    if not is_ai_enabled():
        return {
            "skills": {"technical": [], "soft": []},
            "professional_summary": {
                "suggested_text": "",
                "original_text": "",
                "key_changes": []
            }
        }
    
    
    # Extract current CV data
    skills_data = cv_data.get("skills", {})
    current_technical_skills = skills_data.get("technical", [])
    current_soft_skills = skills_data.get("soft", [])
    current_summary = cv_data.get("professional_summary", {}).get("content", "")
    
    # Create brief work experience overview
    work_experience = cv_data.get("work_experience", [])
    work_overview = []
    for job in work_experience[:3]:  # Limit to 3 most recent
        title = job.get("position", "")
        company = job.get("company", "")
        if title and company:
            work_overview.append(f"{title} at {company}")
    
    work_overview_text = "; ".join(work_overview) if work_overview else "No work experience listed"
    
    # Create the unified system prompt
    system_prompt = "You are a CV optimization assistant. Analyze CVs against job descriptions and provide comprehensive improvement suggestions. Extract only real, tangible skills and create natural professional content."
    
    # Create the unified user prompt
    user_prompt = f"""Analyze CV against job description and provide improvement suggestions.

CV DATA:
Technical Skills: {json.dumps(current_technical_skills)}
Soft Skills: {json.dumps(current_soft_skills)}
Professional Summary: {current_summary}
Work Experience: {work_overview_text}

JOB DESCRIPTION:
{job_description}

TASKS:
1. SKILLS: Suggest missing technical (max 10) and soft (max 5) skills from job description
   - Only actual skills/tools/technologies/methodologies
   - Case-insensitive check against current skills (no duplicates)
   - One-sentence reasoning per skill

2. PROFESSIONAL SUMMARY: Provide ONE improved rewrite (2-4 sentences)
   - Focus on candidate's experience relevant to job description
   - Natural professional prose, factual and positive

RETURN JSON:
{{
  "skills": {{
    "technical": [{{"skill": "Python", "reasoning": "Required in job description"}}],
    "soft": [{{"skill": "Leadership", "reasoning": "Key responsibility listed"}}]
  }},
  "professional_summary": {{
    "suggested_text": "Improved summary here...",
    "original_text": "{current_summary}",
    "key_changes": ["Added Python expertise", "Emphasized leadership"]
  }}
}}"""
    
    try:
        start_time = time.time()
        
        # Log the request for monitoring
        logger.info(f"Generating AI suggestions for CV {cv_data.get('id', 'unknown')} with job description: {job_description[:100]}...")
        
        # Call OpenAI API with unified prompt
        async def _call():
            return await asyncio.to_thread(
                _openai_client.chat.completions.create,
                model=AIConfig.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
            )
        
        response = await _with_retries(_call, attempts=2, delay=0.5)
        
        generation_time = int((time.time() - start_time) * 1000)
        raw_response = response.choices[0].message.content
        tokens_used = response.usage.total_tokens
        
        # Log AI usage
        if user_id:
            _log_ai_usage_safe(
                db_session=db_session,
                user_id=user_id,
                operation_type="generate_suggestions",
                model_used=AIConfig.OPENAI_MODEL,
                prompt_tokens=response.usage.prompt_tokens,
                completion_tokens=response.usage.completion_tokens,
                generation_time=generation_time,
                success=True,
                cv_id=cv_id
            )
        
        # Log response metrics for monitoring
        logger.info(f"OpenAI response received: {tokens_used} tokens, {generation_time}ms")
        
        # Parse JSON response - handle markdown code blocks
        try:
            # Extract JSON from markdown code blocks if present
            content = raw_response
            if "```json" in content:
                start = content.find("```json") + 7
                end = content.find("```", start)
                if end != -1:
                    json_content = content[start:end].strip()
                else:
                    json_content = content
            elif "```" in content:
                start = content.find("```") + 3
                end = content.find("```", start)
                if end != -1:
                    json_content = content[start:end].strip()
                else:
                    json_content = content
            else:
                json_content = content
            
            parsed_suggestions = json.loads(json_content)
            
            # Validate and filter skill suggestions
            technical_suggestions = []
            soft_suggestions = []
            
            # Process technical skills
            raw_technical = parsed_suggestions.get("skills", {}).get("technical", [])
            
            for suggestion in raw_technical:
                skill = suggestion.get("skill", "").strip()
                reasoning = suggestion.get("reasoning", "").strip()
                
                # Validate skill
                if not skill or len(skill) < 2 or len(skill) > 50:
                    continue
                
                # Case-insensitive deduplication check
                skill_lower = skill.lower()
                if any(existing.lower() == skill_lower for existing in current_technical_skills):
                    continue
                
                technical_suggestions.append({
                    "skill": skill,
                    "reasoning": reasoning
                })
            
            # Process soft skills
            raw_soft = parsed_suggestions.get("skills", {}).get("soft", [])
            
            for suggestion in raw_soft:
                skill = suggestion.get("skill", "").strip()
                reasoning = suggestion.get("reasoning", "").strip()
                
                # Validate skill
                if not skill or len(skill) < 2 or len(skill) > 50:
                    continue
                
                # Case-insensitive deduplication check
                skill_lower = skill.lower()
                if any(existing.lower() == skill_lower for existing in current_soft_skills):
                    continue
                
                soft_suggestions.append({
                    "skill": skill,
                    "reasoning": reasoning
                })
            
            # Process professional summary suggestion
            summary_data = parsed_suggestions.get("professional_summary", {})
            suggested_text = summary_data.get("suggested_text", "").strip()
            key_changes = summary_data.get("key_changes", [])
            
            logger.info(f"Processed AI suggestions - Technical: {len(technical_suggestions)}, Soft: {len(soft_suggestions)}")
            
            # Validate summary suggestion
            if not suggested_text or len(suggested_text) < 10:
                suggested_text = ""
                key_changes = []
            
            
            return {
                "skills": {
                    "technical": technical_suggestions,
                    "soft": soft_suggestions
                },
                "professional_summary": {
                    "suggested_text": suggested_text,
                    "original_text": current_summary,
                    "key_changes": key_changes
                }
            }
            
        except json.JSONDecodeError as e:
            # JSON parsing failed - return empty structures
            logger.error(f"Failed to parse AI response JSON: {str(e)}")
            return {
                "skills": {"technical": [], "soft": []},
                "professional_summary": {
                    "suggested_text": "",
                    "original_text": current_summary,
                    "key_changes": []
                }
            }
        
    except Exception as e:
        # Log failed AI usage
        if user_id:
            _log_ai_usage_safe(
                db_session=db_session,
                user_id=user_id,
                operation_type="generate_suggestions",
                model_used=AIConfig.OPENAI_MODEL,
                prompt_tokens=0,
                completion_tokens=0,
                generation_time=0,
                success=False,
                error_message=str(e),
                cv_id=cv_id
            )
        
        # Log error and return empty structures (graceful degradation)
        logger.error(f"Error in create_optimization_suggestions: {str(e)}")
        return {
            "skills": {"technical": [], "soft": []},
            "professional_summary": {
                "suggested_text": "",
                "original_text": current_summary,
                "key_changes": []
            }
        }


def extract_job_description_with_ai(raw_content: str, source_url: str, user_id: Optional[str] = None, cv_id: Optional[str] = None, db_session: Optional[Any] = None) -> Dict[str, Any]:
    """
    Extract structured job description data from raw HTML content using OpenAI.
    
    Args:
        raw_content: Raw HTML/text content from the job posting URL
        source_url: Original URL of the job posting
        
    Returns:
        Dictionary containing extracted job description data
    """
    if not is_ai_enabled():
        return {
            "error": "AI service is not enabled",
            "success": False
        }
    
    try:
        # Truncate content if it's too long for the API
        max_content_length = 8000  # Leave room for prompt and response
        if len(raw_content) > max_content_length:
            raw_content = raw_content[:max_content_length] + "..."
        
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
            response = _openai_client.chat.completions.create(
                model=AIConfig.OPENAI_MODEL,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert at extracting structured information from job postings. Always return valid JSON. Format the 'content' field as markdown with proper headers (##, ###), bullet points (-, *), bold text (**bold**), and line breaks."
                    },
                    {
                        "role": "user", 
                        "content": prompt
                    }
                ],
            )
            end_time = time.time()
            
            # Extract token usage information
            usage = response.usage
            prompt_tokens = usage.prompt_tokens if usage else 0
            completion_tokens = usage.completion_tokens if usage else 0
            generation_time = int((end_time - start_time) * 1000)  # Convert to milliseconds
            
            return response.choices[0].message.content.strip(), prompt_tokens, completion_tokens, generation_time

        result, prompt_tokens, completion_tokens, generation_time = _call_openai()
        
        # Log AI usage with actual token counts
        if user_id:
            _log_ai_usage_safe(
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
            cleaned_result = result.strip()
            if cleaned_result.startswith("```json"):
                cleaned_result = cleaned_result[7:]  # Remove ```json
            if cleaned_result.endswith("```"):
                cleaned_result = cleaned_result[:-3]  # Remove ```
            cleaned_result = cleaned_result.strip()
            
            extracted_data = json.loads(cleaned_result)
            
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
        # Log failed AI usage (we can't get actual token counts on error, so use 0)
        if user_id:
            _log_ai_usage_safe(
                db_session=db_session,
                user_id=user_id,
                operation_type="extract_job_description",
                model_used=AIConfig.OPENAI_MODEL,
                prompt_tokens=0,  # Cannot determine on error
                completion_tokens=0,  # Cannot determine on error
                generation_time=0,  # Cannot determine on error
                success=False,
                error_message=str(e),
                cv_id=cv_id
            )
        
        logger.error(f"Error in extract_job_description_with_ai: {str(e)}")
        return {
            "error": f"Failed to extract job description: {str(e)}",
            "success": False
        }


def check_cv_ai_enhancement_status(db_session: Any, cv_id: str) -> bool:
    """
    Check if a CV has been enhanced with AI by looking for accepted AI suggestions.
    
    Args:
        db_session: Database session
        cv_id: CV ID to check
        
    Returns:
        bool: True if CV has accepted AI suggestions, False otherwise
    """
    try:
        from src.models.ai_suggestion import AISuggestion
        from src.models.ai_section import AISection
        
        # Check for accepted AI suggestions
        accepted_suggestions = db_session.query(AISuggestion).filter(
            AISuggestion.cv_id == cv_id,
            AISuggestion.is_accepted == "accepted"
        ).count()
        
        # Check for active AI sections (AI-generated content that's been applied)
        active_ai_sections = db_session.query(AISection).filter(
            AISection.cv_id == cv_id,
            AISection.is_active == True
        ).count()
        
        # CV is considered AI-enhanced if it has any accepted suggestions or active AI sections
        return accepted_suggestions > 0 or active_ai_sections > 0
        
    except Exception as e:
        logger.error(f"Error checking AI enhancement status for CV {cv_id}: {str(e)}")
        return False


def mark_cv_as_ai_enhanced(db_session: Any, cv_id: str) -> bool:
    """
    Mark a CV as AI-enhanced by setting the is_ai_enhanced flag to True.
    
    Args:
        db_session: Database session
        cv_id: CV ID to mark as AI-enhanced
        
    Returns:
        bool: True if successfully marked, False otherwise
    """
    try:
        from src.models.cv import CV
        
        cv = db_session.query(CV).filter(CV.id == cv_id).first()
        if cv:
            cv.is_ai_enhanced = True
            db_session.commit()
            return True
        return False
        
    except Exception as e:
        logger.error(f"Error marking CV {cv_id} as AI-enhanced: {str(e)}")
        db_session.rollback()
        return False
