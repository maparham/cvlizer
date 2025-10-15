"""
Job fit analysis service for matching CVs against job descriptions.

This module provides functions for analyzing how well a candidate's CV
matches a job description, generating confidence scores and detailed
fit analysis narratives.
"""

import json
import logging
import time
from datetime import datetime, timezone
from typing import Any, Dict, Optional, cast

from openai.types.shared_params import Reasoning
from sqlalchemy.orm import Session

from src.config import AIConfig
from src.schemas.ai_response_schemas import JobFitAnalysisResponseSchema

from .common import (
    API_TIMEOUT,
    RETRY_ATTEMPTS,
    RETRY_DELAY,
    JobFitResult,
    build_error_response,
    extract_cached_tokens,
    extract_response_data,
    get_openai_client,
    is_ai_enabled,
    log_ai_usage_safe,
    parse_json_from_markdown,
    validate_with_schema,
    with_retries,
)

logger = logging.getLogger(__name__)

# Instructions for OpenAI API job fit analysis
JOB_FIT_INSTRUCTIONS = (
    "You're the candidate. CRITICAL: Write in the SAME LANGUAGE as the job description. "
    "If job is in German, write in German. If in English, write in English. "
    "Output JSON with fit_analysis and 5 REQUIRED arrays (key_matches, missing_skills, "
    "suggested_improvements, strengths, weaknesses). ALL arrays must have values. First person. "
    "follow formatting instructions."
    "Stop after last requirement."
)


# ============================================================================
# Job Fit Analysis Functions
# ============================================================================


def _build_job_fit_prompt(cv_data: Dict[str, Any], job_description: str) -> str:
    """
    Build token-efficient prompt for job fit analysis (optimized for gpt-4o-nano).

    Token reduction: ~65-70% (from 1,850 to 550-650 tokens) with compact JSON formatting.
    This optimization reduces API costs by ~$0.0001-0.0002 per analysis.

    Args:
        cv_data: Structured CV data
        job_description: Job description text

    Returns:
        Formatted prompt string optimized for token efficiency
    """
    return (
        f"Write as the candidate about your fit for this position.\n\n"
        f"LANGUAGE REQUIREMENT: Write ALL content (fit_analysis and all arrays) in the SAME LANGUAGE as the job description below.\n"
        f"OUTPUT JSON:\n"
        f"{{\n"
        f'  "confidence_score": 75,\n'
        f'  "fit_analysis": "markdown-formatted",\n'
        f'  "key_matches": ["Python", "REST APIs", "Pytest"],\n'
        f'  "missing_skills": ["AWS", "Kubernetes"],\n'
        f'  "suggested_improvements": ["Add metrics", "Quantify coverage"],\n'
        f'  "strengths": ["Strong Python", "API testing"],\n'
        f'  "weaknesses": ["Limited cloud experience"]\n'
        f"}}\n\n"
        f"RULES:\n"
        f"1. confidence_score: Integer 1-100 showing match quality.\n"
        f"2. fit_analysis (markdown string, first person):\n"
        f"   • Header \\*\\*Why I'm a Good Fit\\*\\*\\n\\n[1 paragraph, 40-50 words: top 2-3 skills + enthusiasm].\n"
        f"   • Then: \\*\\*Your Requirements\\*\\*\\n\\n.\n"
        f"   • List specific technical and role requirements from the job description (skip vague soft skills).\n"
        f"   • Below each requirement, write a short cover paragraph about your experience in the context of the requirement item.\n"
        f'   • Format each requirement as: \\*\\*"[requirement text]"\\*\\*\\n\\n[cover paragraph]\\n\\n\n'
        f"   • CRITICAL: Each requirement MUST be wrapped in \\*\\* (asterisks) for bold formatting.\n"
        f"   • If you don't have experience with the requirement item, be honest about it and explain how you could learn it.\n"
        f"   • If you have experience with the requirement item, say so and include details from past experiences. E.g., I built/achieved/adapted... Y at Company X.\n"
        f"   • Vary sentence starters and avoid overusing 'I' or 'I have'.\n"
        f"   • Be honest about gaps: 'I haven't used X yet.'\n"
        f"3. Separate arrays (NOT in fit_analysis):\n"
        f"   • key_matches: 3-5 specific skills/technologies FROM YOUR CV that match JD requirements.\n"
        f"   • missing_skills: 2-4 skills mentioned in JD but not in your CV.\n"
        f"   • suggested_improvements: 3-5 specific CV improvement tips.\n"
        f"   • strengths: 3-5 specific candidate strengths for this role.\n"
        f"   • weaknesses: 2-4 specific gaps or areas needing development.\n"
        f"Use the words 'position' or 'job' instead of 'role'. Make sure every array has values. Output just well-formed JSON, nothing else."
        f"CV: {json.dumps(cv_data, indent=2)}\n\n"
        f"JOB: {job_description}\n\n"
    )


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
        response = client.responses.parse(
            model=AIConfig.OPENAI_MODEL,
            input=[
                {"role": "system", "content": JOB_FIT_INSTRUCTIONS},
                {"role": "user", "content": prompt},
            ],
            text_format=JobFitAnalysisResponseSchema,
            reasoning=Reasoning(effort=AIConfig.REASONING_EFFORT),
        )

        generation_time = int((time.time() - start_time) * 1000)

        # Extract parsed data and token usage
        analysis = response.output_parsed.model_dump()
        prompt_tokens = response.usage.input_tokens
        completion_tokens = response.usage.output_tokens
        tokens_used = prompt_tokens + completion_tokens
        cached_tokens = extract_cached_tokens(response)

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
                cached_tokens=cached_tokens,
            )

        # Add generated_at and return
        return {
            "confidence_score": analysis.get("confidence_score", 50),
            "fit_analysis": analysis.get("fit_analysis", ""),
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "key_matches": analysis.get("key_matches", []),
            "missing_skills": analysis.get("missing_skills", []),
            "suggested_improvements": analysis.get("suggested_improvements", []),
            "strengths": analysis.get("strengths", []),
            "weaknesses": analysis.get("weaknesses", []),
            "tokens_used": tokens_used,
            "generation_time": generation_time,
            "model_used": AIConfig.OPENAI_MODEL,
        }

    except Exception as e:
        # Log the error with full details
        logger.error(f"Job fit analysis failed with error: {str(e)}", exc_info=True)
        logger.error(f"Error type: {type(e).__name__}")

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
