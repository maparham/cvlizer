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
from typing import Dict, Any, Optional, cast
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
    API_TIMEOUT,
)

logger = logging.getLogger(__name__)

# Instructions for OpenAI API job fit analysis
JOB_FIT_INSTRUCTIONS = (
    "You're the candidate. Output JSON with fit_analysis (markdown: Why I'm a Good Fit "
    "paragraph + Your Requirements list) and 5 REQUIRED arrays (key_matches, missing_skills, "
    "suggested_improvements, strengths, weaknesses). ALL arrays must have values. First person. "
    "Stop after last requirement."
)


# ============================================================================
# Job Fit Analysis Functions
# ============================================================================


def _build_job_fit_prompt(cv_data: Dict[str, Any], job_description: str) -> str:
    """
    Build token-efficient prompt for job fit analysis (optimized for gpt-4o-nano).

    Token reduction: ~59% (from 1,850 to 750 tokens) compared to previous version.

    Args:
        cv_data: Structured CV data
        job_description: Job description text

    Returns:
        Formatted prompt string optimized for token efficiency
    """
    return (
        f"Write as the candidate about your fit for this position.\n\n"
        f"CV: {json.dumps(cv_data, indent=2)}\n\n"
        f"JOB: {job_description}\n\n"
        f"OUTPUT JSON:\n"
        f"{{\n"
        f'  "confidence_score": 75,\n'
        f'  "fit_analysis": "**Why I\'m a Good Fit**\\n\\nMy 5+ years...\\n\\n**Your Requirements**\\n\\n**\\"5+ years Python\\"**\\n\\nBuilt 3 production APIs...",\n'
        f'  "key_matches": ["Python", "REST APIs", "Pytest"],\n'
        f'  "missing_skills": ["AWS", "Kubernetes"],\n'
        f'  "suggested_improvements": ["Add metrics", "Quantify coverage"],\n'
        f'  "strengths": ["Strong Python", "API testing"],\n'
        f'  "weaknesses": ["Limited cloud experience"]\n'
        f"}}\n\n"
        f"RULES:\n"
        f"1. confidence_score: Integer 1-100 showing match quality\n"
        f"2. fit_analysis (markdown string, first person):\n"
        f"   • Start: **Why I'm a Good Fit**\\n\\n[1 paragraph, 40-50 words: top 2-3 skills + enthusiasm]\n"
        f"   • Then: **Your Requirements**\\n\\n\n"
        f"   • List 5-8 TECHNICAL requirements ONLY (skip soft skills/mindsets)\n"
        f"   • Format: **\"Exact JD text\"**\\n\\n[2-3 sentences about your experience]\\n\\n\n"
        f"   • Vary sentence starters: Use 'My', 'Built', 'Over X years', not all 'I'\n"
        f"   • Be honest about gaps: 'I haven't used X yet'\n"
        f"   • STOP after last requirement - NO summary/extra paragraphs\n"
        f"3. Separate arrays (NOT in fit_analysis):\n"
        f"   • key_matches: 3-5 specific skills/technologies FROM YOUR CV that match JD requirements\n"
        f"   • missing_skills: 2-4 skills mentioned in JD but not in your CV\n"
        f"   • suggested_improvements: 3-5 specific CV improvement tips\n"
        f"   • strengths: 3-5 specific candidate strengths for this role\n"
        f"   • weaknesses: 2-4 specific gaps or areas needing development\n"
        f"Note: Write 'position/job' not 'role'. ALL arrays must be populated. Output complete valid JSON only."
    )

    # Ultra-compact alternative (70% reduction to ~550 tokens):
    # Uncomment below for maximum token savings with slight quality trade-off
    # return (
    #     f"As the candidate, analyze fit for this position.\n\n"
    #     f"CV: {json.dumps(cv_data, indent=2)}\n"
    #     f"JOB: {job_description}\n\n"
    #     f"Return JSON:\n"
    #     f'{{"confidence_score": 75, "fit_analysis": "markdown", "key_matches": [], '
    #     f'"missing_skills": [], "suggested_improvements": [], "strengths": [], "weaknesses": []}}\n\n'
    #     f"fit_analysis format:\n"
    #     f"**Why I'm a Good Fit**\\n\\n[40-50 words: 2-3 top alignments + enthusiasm]\\n\\n"
    #     f"**Your Requirements**\\n\\n"
    #     f'[5-8 technical requirements as: **"Exact JD quote"**\\n\\n2-3 sentences about your experience\\n\\n]\n\n'
    #     f"Rules: First person. Vary starters (My/Built/Over). Honest about gaps. "
    #     f"Technical requirements only (no soft skills). Stop after last requirement. "
    #     f"Arrays separate from markdown. Use position/job not role."
    # )


def _parse_job_fit_response(
    content: str, tokens_used: int, generation_time: int
) -> JobFitResult:
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
            if (
                fit_analysis.strip().startswith("{")
                and "confidence_score" in fit_analysis
            ):
                try:
                    match = re.search(
                        r'"fit_analysis":\s*"([^"]*(?:\\.[^"]*)*)"', fit_analysis
                    )
                    if match:
                        analysis["fit_analysis"] = (
                            match.group(1).replace("\\n", "\n").replace('\\"', '"')
                        )
                except:
                    pass
                    
    except json.JSONDecodeError:
        # Fallback if JSON parsing fails
        logger.warning(
            f"Job fit analysis JSON parse failed, using fallback. "
            f"Content preview: {content[:200]}"
        )
        analysis = {
            "confidence_score": 50,
            "fit_analysis": content,
            "key_matches": [],
            "missing_skills": [],
            "suggested_improvements": [],
            "strengths": [],
            "weaknesses": [],
        }
    
    # Ensure required fields are always present
    confidence_score = analysis.get("confidence_score", 50)
    generated_at = analysis.get("generated_at") or datetime.now(timezone.utc).isoformat()
    
    # Log missing required fields for observability
    if "confidence_score" not in analysis:
        logger.warning("confidence_score missing in AI response; using fallback value 50")
    if "generated_at" not in analysis:
        logger.debug(
            f"generated_at missing in AI response; using fallback "
            f"timestamp {generated_at}"
        )
    
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
        "model_used": AIConfig.OPENAI_MODEL,
    }


def _execute_job_fit_analysis_sync(
    cv_data: Dict[str, Any],
    job_description: str,
    user_id: Optional[str] = None,
    cv_id: Optional[str] = None,
    db_session: Optional[Session] = None,
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
        return cast(
            JobFitResult,
            build_error_response(
            "OpenAI API key not configured. AI features are disabled.",
                "analyze_job_fit",
            ),
        )
    
    prompt = _build_job_fit_prompt(cv_data, job_description)
    client = get_openai_client()
    
    try:
        start_time = time.time()
        
        # Make synchronous OpenAI API call using Response API
        response = client.responses.create(
            model=AIConfig.OPENAI_MODEL,
            instructions=JOB_FIT_INSTRUCTIONS,
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
                cv_id=cv_id,
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
                cv_id=cv_id,
            )

        result = build_error_response(
            f"Error analyzing job fit: {str(e)}", "analyze_job_fit"
        )
        result["tokens_used"] = 0
        result["generation_time"] = 0
        result["model_used"] = AIConfig.OPENAI_MODEL
        return cast(JobFitResult, result)


def analyze_job_fit_sync(
    cv_data: Dict[str, Any],
    job_description: str,
    user_id: Optional[str] = None,
    cv_id: Optional[str] = None,
    db_session: Optional[Session] = None,
) -> JobFitResult:
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
    return _execute_job_fit_analysis_sync(
        cv_data, job_description, user_id, cv_id, db_session
    )
