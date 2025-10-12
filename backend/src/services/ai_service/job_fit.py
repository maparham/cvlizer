"""
Job fit analysis service for matching CVs against job descriptions.

This module provides functions for analyzing how well a candidate's CV
matches a job description, generating confidence scores and detailed
fit analysis narratives.
"""
import time
import asyncio
import re
import json
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from src.config import AIConfig
from .common import (
    get_openai_client,
    is_ai_enabled,
    extract_response_data,
    parse_json_from_markdown,
    build_error_response,
    log_ai_usage_safe,
    with_retries,
    JobFitResult,
    RETRY_ATTEMPTS,
    RETRY_DELAY,
    API_TIMEOUT
)

logger = logging.getLogger(__name__)


# ============================================================================
# Job Fit Analysis Functions
# ============================================================================

def _build_job_fit_prompt(cv_data: Dict[str, Any], job_description: str) -> str:
    """
    Build the prompt for job fit analysis.
    
    Args:
        cv_data: Structured CV data
        job_description: Job description text
        
    Returns:
        Formatted prompt string
    """
    return (
        f"Analyze CV vs job description. Balanced, evidence-based analysis.\n\n"
        f"CV: {json.dumps(cv_data, indent=2)}\n\n"
        f"JOB: {job_description}\n\n"
        f"RULES:\n"
        f"1. confidence_score: Honest 1-100 match\n"
        f"2. fit_analysis (single string, first person):\n"
        f"   A) 'Why I'm a Good Fit': Max 40-50 words (3-4 sentences). Lead with top 2-3 alignments + 1-2 specific projects/tools + enthusiasm.\n"
        f"   B) 'Job Requirements Analysis': Extract 5-8 TECHNICAL requirements only (years experience, languages, tools, certs). SKIP job duties ('own strategy', 'mentor', 'collaborate'). Per requirement:\n"
        f"      **[Exact JD requirement]**\\n\\n[2-3 sentences first person with specific CV evidence + honest assessment]\\n\\n\n"
        f"   - No duplicates (merge similar)\n"
        f"   - Stop after last requirement (no notes/summaries)\n"
        f"   - Natural language, be honest but constructive\n"
        f"3. OTHER FIELDS: key_matches (3-5), missing_skills, suggested_improvements (3-5 CV tips like 'Add metrics', 'Highlight X project'), strengths (3-5), weaknesses (2-4)\n\n"
        f"EXAMPLE:\n"
        f"{{\n"
        f'  "confidence_score": 75,\n'
        f'  "fit_analysis": "**Why I\'m a Good Fit**\\n\\nI bring Python expertise and test automation experience. My pytest work at IMS Nanofabrication aligns well with this role. Excited to deepen testing leadership here.\\n\\n**Job Requirements Analysis**\\n\\n**5+ years testing with automation**\\n\\nI have 3 years with pytest plus 2 years in QA research. While below 5 years, my automation skills are solid and I\'m eager to grow.\\n\\n**Strong programming in Python or C#**\\n\\nPython is my strongest language - used extensively in FastAPI, ETL, and API work. Very comfortable with scripting.",\n'
        f'  "key_matches": ["Python expertise", "pytest automation", "Docker", "ETL pipelines"],\n'
        f'  "missing_skills": ["Kubernetes", "Performance testing tools"],\n'
        f'  "suggested_improvements": ["Add metrics to achievements", "Highlight ETL optimization", "Emphasize testing methodologies"],\n'
        f'  "strengths": ["Python background", "API expertise", "Automated testing"],\n'
        f'  "weaknesses": ["Limited cloud experience", "Below 5 years testing"]\n'
        f"}}\n\n"
        f"CRITICAL: Write naturally in first person. fit_analysis is ONE string (not nested objects). ONLY two sections. Stop after last requirement.\n"
    )
    

def _parse_job_fit_response(content: str, tokens_used: int, generation_time: int) -> JobFitResult:
    """
    Parse and validate job fit analysis response.
    
    Args:
        content: Raw response content from AI
        tokens_used: Total tokens used in generation
        generation_time: Time taken for generation in milliseconds
        
    Returns:
        Parsed and validated job fit result
    """
    # Parse JSON response - handle markdown code blocks
    try:
        json_content = parse_json_from_markdown(content)
        analysis = json.loads(json_content)
        
        # Clean up the fit_analysis field to ensure it's just the content
        if "fit_analysis" in analysis and isinstance(analysis["fit_analysis"], str):
            fit_analysis = analysis["fit_analysis"]
            # If it contains JSON-like structure, try to extract just the content
            if fit_analysis.strip().startswith('{') and 'confidence_score' in fit_analysis:
                try:
                    match = re.search(r'"fit_analysis":\s*"([^"]*(?:\\.[^"]*)*)"', fit_analysis)
                    if match:
                        analysis["fit_analysis"] = match.group(1).replace('\\n', '\n').replace('\\"', '"')
                except:
                    pass
                    
    except json.JSONDecodeError:
        # Fallback if JSON parsing fails
        logger.warning(f"Job fit analysis JSON parse failed, using fallback. Content preview: {content[:200]}")
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
    
    # Log missing required fields for observability
    if "confidence_score" not in analysis:
        logger.warning("confidence_score missing in AI response; using fallback value 50")
    if "generated_at" not in analysis:
        logger.debug(f"generated_at missing in AI response; using fallback timestamp {generated_at}")
    
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


def _execute_job_fit_analysis_sync(
    cv_data: Dict[str, Any],
    job_description: str,
    user_id: Optional[str] = None,
    cv_id: Optional[str] = None,
    db_session: Optional[Session] = None
) -> JobFitResult:
    """
    Core synchronous implementation of job fit analysis.
    
    This is the shared implementation used by both sync and async wrappers.
    
    Args:
        cv_data: Structured CV data
        job_description: Job description text
        user_id: User identifier for logging
        cv_id: CV identifier for logging
        db_session: Database session for logging
        
    Returns:
        Job fit analysis result
    """
    if not is_ai_enabled():
        return build_error_response(
            "OpenAI API key not configured. AI features are disabled.",
            "analyze_job_fit"
        )
    
    prompt = _build_job_fit_prompt(cv_data, job_description)
    client = get_openai_client()
    
    try:
        start_time = time.time()
        
        # Make synchronous OpenAI API call using Response API
        response = client.responses.create(
            model=AIConfig.OPENAI_MODEL,
            instructions="Write as candidate in first person. Return valid JSON. fit_analysis is ONE string (not nested objects). Write naturally - genuine, conversational, human-like. Extract ONLY technical requirements (years experience, languages, tools). SKIP job duties/soft skills. Be honest but constructive. Populate ALL fields: key_matches (3-5), missing_skills, suggested_improvements (3-5 CV tips), strengths (3-5), weaknesses (2-4). No duplicates. Stop after last requirement.",
            input=prompt,
            reasoning={"effort": "minimal", "summary": "auto"},
        )
        
        generation_time = int((time.time() - start_time) * 1000)
        
        # Extract content and token usage
        content, prompt_tokens, completion_tokens = extract_response_data(response)
        tokens_used = prompt_tokens + completion_tokens
        
        # Log AI usage
        if user_id:
            log_ai_usage_safe(
                db_session=db_session,
                user_id=user_id,
                operation_type="analyze_job_fit",
                model_used=AIConfig.OPENAI_MODEL,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                generation_time=generation_time,
                success=True,
                cv_id=cv_id
            )
        
        return _parse_job_fit_response(content, tokens_used, generation_time)

    except Exception as e:
        # Log failed AI usage
        if user_id:
            log_ai_usage_safe(
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

        result = build_error_response(f"Error analyzing job fit: {str(e)}", "analyze_job_fit")
        result["tokens_used"] = 0
        result["generation_time"] = 0
        result["model_used"] = AIConfig.OPENAI_MODEL
        return result


def analyze_job_fit_sync(
    cv_data: Dict[str, Any],
    job_description: str,
    user_id: Optional[str] = None,
    cv_id: Optional[str] = None,
    db_session: Optional[Session] = None
) -> Dict[str, Any]:
    """
    Synchronous version of job fit analysis.
    
    Used in background tasks to avoid async/sync issues.
    
    Args:
        cv_data: Structured CV data
        job_description: Job description text
        user_id: User identifier for logging
        cv_id: CV identifier for logging
        db_session: Database session for logging
        
    Returns:
        Dictionary containing:
        - confidence_score: 1-100% match confidence (always present)
        - fit_analysis: Detailed analysis of matches
        - generated_at: ISO timestamp (always present)
        - key_matches: List of key matching points
        - missing_skills: Skills mentioned in JD but not in CV
        - suggested_improvements: Areas for improvement
    """
    return _execute_job_fit_analysis_sync(cv_data, job_description, user_id, cv_id, db_session)


async def analyze_job_fit(
    cv_data: Dict[str, Any],
    job_description: str,
    user_id: Optional[str] = None,
    cv_id: Optional[str] = None,
    db_session: Optional[Session] = None
) -> Dict[str, Any]:
    """
    Analyze how well a CV fits a job description and generate a compelling fit narrative.
    
    Args:
        cv_data: Structured CV data
        job_description: Job description text
        user_id: User identifier for logging
        cv_id: CV identifier for logging
        db_session: Database session for logging
        
    Returns:
        Dictionary containing:
        - confidence_score: 1-100% match confidence
        - fit_analysis: Detailed analysis of matches
        - key_matches: List of key matching points
        - missing_skills: Skills mentioned in JD but not in CV
        - suggested_improvements: Areas for improvement
    """
    if not is_ai_enabled():
        return build_error_response(
            "OpenAI API key not configured. AI features are disabled.",
            "analyze_job_fit"
        )
    
    prompt = _build_job_fit_prompt(cv_data, job_description)
    client = get_openai_client()
    
    try:
        start_time = time.time()
        
        async def _call():
            return await asyncio.to_thread(
                client.responses.create,
                model=AIConfig.OPENAI_MODEL,
                instructions="Write as candidate in first person. Return valid JSON. fit_analysis is ONE string (not nested objects). Write naturally - genuine, conversational, human-like. Extract ONLY technical requirements (years experience, languages, tools). SKIP job duties/soft skills. Be honest but constructive. Populate ALL fields: key_matches (3-5), missing_skills, suggested_improvements (3-5 CV tips), strengths (3-5), weaknesses (2-4). No duplicates. Stop after last requirement.",
                input=prompt,
                reasoning={"effort": "minimal", "summary": "auto"},
            )
        
        try:
            response = await asyncio.wait_for(with_retries(_call, attempts=RETRY_ATTEMPTS, delay=RETRY_DELAY), timeout=API_TIMEOUT)
        except asyncio.TimeoutError:
            result = build_error_response(
                f"OpenAI API call timed out after {API_TIMEOUT} seconds",
                "analyze_job_fit"
            )
            result["tokens_used"] = 0
            result["generation_time"] = 0
            result["model_used"] = AIConfig.OPENAI_MODEL
            return result
        
        generation_time = int((time.time() - start_time) * 1000)
        
        # Extract content and token usage
        content, prompt_tokens, completion_tokens = extract_response_data(response)
        tokens_used = prompt_tokens + completion_tokens
        
        # Log AI usage
        if user_id:
            log_ai_usage_safe(
                db_session=db_session,
                user_id=user_id,
                operation_type="analyze_job_fit",
                model_used=AIConfig.OPENAI_MODEL,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                generation_time=generation_time,
                success=True,
                cv_id=cv_id
            )
        
        return _parse_job_fit_response(content, tokens_used, generation_time)
        
    except Exception as e:
        # Log failed AI usage
        if user_id:
            log_ai_usage_safe(
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
        
        result = build_error_response(f"Error analyzing job fit: {str(e)}", "analyze_job_fit")
        result["tokens_used"] = 0
        result["generation_time"] = 0
        result["model_used"] = AIConfig.OPENAI_MODEL
        return result

