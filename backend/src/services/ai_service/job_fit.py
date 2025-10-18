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
    call_openai_with_schema,
    extract_cached_tokens,
    extract_response_data,
    get_openai_client,
    is_ai_enabled,
    log_ai_usage_safe,
    parse_json_from_markdown,
    validate_with_schema,
    with_retries,
)
from .cv_filter import filter_hidden_sections

logger = logging.getLogger(__name__)

# Instructions for OpenAI API job fit analysis
JOB_FIT_INSTRUCTIONS = (
    "Respond as if you are the candidate applying for this job. IMPORTANT: Write in the SAME LANGUAGE as the job description. "
    "Do NOT fabricate experience or skills - use only facts from the provided CV and job description. "
    "Output JSON with fit_analysis AND 5 arrays: key_matches, missing_skills, "
    "suggested_improvements, strengths, weaknesses. "
    "If there are NO genuine skill overlaps between CV and JD, key_matches can be empty. "
    "Other arrays (missing_skills, suggested_improvements, strengths, weaknesses) must have at least one value. "
    "Write in first person. Follow all formatting rules."
)


# ============================================================================
# Job Fit Analysis Functions
# ============================================================================


def _is_cv_data_sufficient(cv_data: Dict[str, Any]) -> tuple[bool, list[str]]:
    """
    Validate if CV has sufficient content for job fit analysis.

    Threshold: At least 1 work experience entry AND 3+ skills

    Args:
        cv_data: Structured CV data from parsed_data field

    Returns:
        Tuple of (is_valid, list_of_missing_items)
    """
    missing_items = []

    # Check work experience
    work_experience = cv_data.get("work_experience", [])
    has_work_exp = len(work_experience) > 0 and any(
        exp.get("description") or exp.get("achievements") for exp in work_experience
    )
    if not has_work_exp:
        missing_items.append(
            "at least 1 work experience entry with description or achievements"
        )

    # Check skills (technical + soft combined)
    skills = cv_data.get("skills", {})
    technical_skills = skills.get("technical", [])
    soft_skills = skills.get("soft", [])
    total_skills = len(technical_skills) + len(soft_skills)

    if total_skills < 3:
        missing_items.append(f"at least 3 skills (currently have {total_skills})")

    is_valid = len(missing_items) == 0
    return is_valid, missing_items


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
    # Filter out hidden sections before sending to AI
    filtered_cv_data = filter_hidden_sections(cv_data)

    return (
        f"Write as the candidate about your fit for this position.\n\n"
        f"LANGUAGE REQUIREMENT: Write ALL content (fit_analysis and all arrays) in the SAME LANGUAGE as the job description below.\n"
        f"OUTPUT JSON:\n"
        f"{{\n"
        f'  "confidence_score": integer 1-100,\n'
        f'  "fit_analysis": "markdown-formatted",\n'
        f'  "key_matches": list of strings (0-5), ONLY skills/technologies FROM YOUR CV that GENUINELY match JD requirements. Empty array [] if no real matches,\n'
        f'  "missing_skills": ["AWS", "Kubernetes"],\n'
        f'  "suggested_improvements": list of strings, 3-5 specific CV improvement tips,\n'
        f'  "strengths": list of strings, 3-5 specific candidate strengths for this role,\n'
        f'  "weaknesses": list of strings, 2-4 specific gaps or areas needing development,\n'
        f"}}\n\n"
        f"RULES:\n"
        f"1. confidence_score: Integer 0-100 showing match quality.\n"
        f"2. fit_analysis (markdown string, first person):\n"
        f"   • Header \\*\\*Why I'm a Good Fit\\*\\*\\n\\n[1 paragraph, 40-50 words: top 2-3 skills + enthusiasm].\n"
        f"   • Then: \\*\\*Your Requirements\\*\\*\\n\\n.\n"
        f"   • List specific technical and role requirements from the job description (skip vague soft skills).\n"
        f"   • Below each requirement, write a short cover paragraph about your experience in the context of the requirement item.\n"
        f'   • Format each requirement as: \\*\\*"[requirement text]"\\*\\*\\n\\n[cover paragraph]\\n\\n\n'
        f"   • CRITICAL: Each requirement MUST be wrapped in \\*\\* (asterisks) for bold formatting.\n"
        f"   • IMPORTANT: If you don't have experience with the requirement item or a key skill is missing, say so. E.g., 'I don't have experience with [requirement item] but I am eager to learn and would be a quick study.'\n"
        f"   • If you have experience with the requirement item, say so and include details from past experiences. E.g., I built/achieved/adapted... Y at Company X.\n"
        f"   • Do NOT refer to the candidate's CV explicitly in the output. Do not use the phrases 'My CV...', 'This CV...' or similar references.\n"
        f"   • Vary sentence starters and avoid overusing 'I' or 'I have'.\n"
        f"   • Be honest about gaps: 'I haven't used X yet.'\n"
        f"   • key_matches: ONLY list skills/technologies FROM YOUR CV that GENUINELY match JD requirements. If there are no real matches, return empty array [].\n"
        f"   • missing_skills: 2-4 skills mentioned in JD but not in your CV.\n"
        f"   • suggested_improvements: 3-5 specific CV improvement tips.\n"
        f"   • strengths: 3-5 specific candidate strengths for this role. Do not fabricate strengths.\n"
        f"   • weaknesses: 2-4 specific gaps or areas needing development.\n"
        f"Use the words 'position' or 'job' instead of 'role'. missing_skills, suggested_improvements, strengths, and weaknesses arrays must have at least one value. key_matches can be empty if no genuine overlaps exist. Output just well-formed JSON, nothing else."
        f"CV: {json.dumps(filtered_cv_data, indent=2)}\n\n"
        f"JOB: {job_description}\n\n"
    )


async def _execute_job_fit_analysis(
    cv_data: Dict[str, Any],
    job_description: str,
    user_id: Optional[str] = None,
    cv_id: Optional[str] = None,
    db_session: Optional[Session] = None,
) -> JobFitResult:
    """
    Core async implementation of job fit analysis.

    This implementation is used by the sync wrapper (analyze_job_fit_sync) which
    calls this async function using asyncio.run().

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

    # Validate CV has sufficient content
    is_valid, missing_items = _is_cv_data_sufficient(cv_data)
    if not is_valid:
        return cast(
            JobFitResult,
            build_error_response(
                f"CV lacks sufficient content for job fit analysis. Please add: {', '.join(missing_items)}",
                "analyze_job_fit",
            ),
        )

    prompt = _build_job_fit_prompt(cv_data, job_description)

    try:
        # Use unified OpenAI call builder
        analysis, metadata = await call_openai_with_schema(
            system_prompt=JOB_FIT_INSTRUCTIONS,
            user_prompt=prompt,
            response_schema=JobFitAnalysisResponseSchema,
            user_id=user_id,
            cv_id=cv_id,
            operation_type="analyze_job_fit",
            db_session=db_session,
        )

        # Add generated_at and return with metadata
        confidence_score = analysis.get("confidence_score", 50)

        # Build result dictionary
        result = {
            "confidence_score": confidence_score,
            "fit_analysis": analysis.get("fit_analysis", ""),
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "key_matches": analysis.get("key_matches", []),
            "missing_skills": analysis.get("missing_skills", []),
            "suggested_improvements": analysis.get("suggested_improvements", []),
            "strengths": analysis.get("strengths", []),
            "weaknesses": analysis.get("weaknesses", []),
            **metadata,  # Include tokens_used, generation_time, model_used, etc.
        }

        # Add low fit warning if confidence score is below 30%
        if confidence_score < 30:
            result["low_fit_warning"] = {
                "message": "Your CV doesn't have sufficient relevant experience for this position. Consider updating your CV or this may not be a good match.",
                "confidence_score": confidence_score,
                "severity": "high",
            }
            logger.info(
                f"Low fit warning triggered in job fit analysis - confidence_score={confidence_score}, cv_id={cv_id}"
            )

        return cast(JobFitResult, result)

    except Exception as e:
        # Error already logged by call_openai_with_schema
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

    Used in background tasks to avoid async/sync issues. This function wraps
    the async implementation and runs it in the current event loop or creates
    a new one if necessary.

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
    import asyncio

    return asyncio.run(
        _execute_job_fit_analysis(cv_data, job_description, user_id, cv_id, db_session)
    )
