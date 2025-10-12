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
        f"Analyze CV vs job description match. Return JSON with honest analysis "
        f"but positive fit_analysis text.\n\n"
        f"CV: {json.dumps(cv_data, indent=2)}\n"
        f"Job: {job_description}\n\n"
        f"Rules:\n"
        f"- confidence_score: honest 1-100 match score\n"
        f'- fit_analysis: "Why I\'m a Good Fit" text in first person (1-2 short '
        f"paragraphs + Job Requirements Analysis)\n"
        f"- Extract ACTUAL job requirements from the job description\n"
        f"- Keep requirements in their original language from the job description\n"
        f"- If job description is very long, summarize requirements but keep them "
        f"specific and real\n"
        f"- Be concise and to the point, don't be overzealous\n"
        f"- Other fields: honest assessment\n\n"
        f"JSON format:\n"
        f"{{\n"
        f'    "confidence_score": 85,\n'
        f'    "fit_analysis": "**Why I\'m a Good Fit**\\n\\n[2-3 paragraphs '
        f'highlighting relevant experience]\\n\\n**Job Requirements Analysis**'
        f'\\n\\n**[ACTUAL REQUIREMENT FROM JD]**\\n[explanation of how CV matches '
        f'this requirement]\\n\\n**[ANOTHER ACTUAL REQUIREMENT FROM JD]**\\n'
        f'[explanation of how CV matches this requirement]",\n'
        f'    "key_matches": ["genuine matches only"],\n'
        f'    "missing_skills": ["skills in JD not in CV"],\n'
        f'    "suggested_improvements": ["constructive recommendations"],\n'
        f'    "strengths": ["candidate strengths"],\n'
        f'    "weaknesses": ["honest gaps"]\n'
        f"}}\n"
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
    # Log content preview for debugging
    logger.info(f"AI Response content preview: {content[:200]}...")
    
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
    
    # Log presence of required fields for observability
    logger.info(f"Job fit analysis: confidence_score={confidence_score}, tokens_used={tokens_used}")
    if "confidence_score" not in analysis:
        logger.warning("confidence_score missing in AI response; using fallback value 50")
    if "generated_at" not in analysis:
        logger.warning(f"generated_at missing in AI response; using fallback timestamp {generated_at}")
    
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
            instructions="Expert CV analyst who can analyze job descriptions in any language. Return only valid JSON. fit_analysis must be positive candidate defense text written in first person. Extract ACTUAL job requirements from the job description text and use them as bold headers (**Actual Requirement Text**), not generic placeholders. Keep requirements in their original language. confidence_score and other fields must be honest/factual.",
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
                instructions="Expert CV analyst who can analyze job descriptions in any language. Return only valid JSON. fit_analysis must be positive candidate defense text written in first person. Extract ACTUAL job requirements from the job description text and use them as bold headers (**Actual Requirement Text**), not generic placeholders. Keep requirements in their original language. confidence_score and other fields must be honest/factual.",
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

