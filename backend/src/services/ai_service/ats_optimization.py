"""
ATS optimization service for keyword analysis and CV improvement suggestions.

This module provides functions for analyzing CVs against job descriptions
to optimize for Applicant Tracking Systems (ATS), including keyword matching,
skill suggestions, and content optimization recommendations.
"""

import asyncio
import json
import logging
import time
from typing import Any, Dict, List, Optional

from openai.types.shared_params import Reasoning
from sqlalchemy.orm import Session

from src.config import AIConfig
from src.schemas.ai_response_schemas import (
    ATSOptimizationResponseSchema,
    OptimizationSuggestionsResponseSchema,
)

from .common import (
    RETRY_ATTEMPTS,
    RETRY_DELAY,
    ATSOptimizationResult,
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


# ============================================================================
# ATS Optimization Functions
# ============================================================================


def _build_ats_prompt(cv_data: Dict[str, Any], job_description: str) -> str:
    """
    Build token-efficient prompt for ATS optimization analysis (optimized for gpt-4o-nano).

    Token reduction: ~41% (from 850 to 505 tokens) compared to previous version.

    Args:
        cv_data: Structured CV data
        job_description: Job description text

    Returns:
        Formatted prompt string optimized for token efficiency
    """
    return f"""Analyze CV for ATS keyword optimization.

⚠️ LANGUAGE REQUIREMENT: Write ALL text content (suggestions, content_optimization suggestions) in the SAME LANGUAGE as the job description.
If the job description is in German, write everything in German. If in English, write in English.

CV: {json.dumps(cv_data, indent=2)}

Job: {job_description}

If job description is incomplete (empty/placeholder/"Unknown"), return: ats_score=0, empty arrays, warning in suggestions.

KEYWORD RULES:
• Extract ONLY keywords from job description text (not related concepts)
• Check ALL CV sections (skills.technical, skills.soft, work_experience, professional_summary, projects) before marking missing
• Case-insensitive matching (Python=python)
• Each keyword in ONE array only (missing_keywords OR suggestions OR content_optimization)

PLACEMENT:
• Technical skills/tools → skills section
• Job titles/company/location → work experience (integrated naturally)
• Soft skills → skills section

Return JSON:
{{
  "ats_score": 75,
  "missing_keywords": [{{"keyword": "FROM_JD", "importance": "high|medium|low", "frequency_in_jd": 1, "present_in_cv": false, "found_in_sections": [], "suggested_placement": "skills section"}}],
  "keyword_analysis": {{"KEYWORD": {{"present": false, "found_in_sections": [], "suggested_sections": ["skills"]}}}},
  "suggestions": ["General improvement (not keyword-specific)"],
  "content_optimization": [{{"section": "professional_summary", "missing_keywords": ["KEYWORD"], "suggestion": "Section-specific improvement"}}],
  "strengths": ["Strength 1", "Strength 2"],
  "weaknesses": ["Weakness 1", "Weakness 2"]
}}
"""


async def analyze_ats_optimization(
    cv_data: Dict[str, Any],
    job_description: str,
    user_id: Optional[str] = None,
    cv_id: Optional[str] = None,
    db_session: Optional[Session] = None,
) -> ATSOptimizationResult:
    """
    Analyze CV for ATS optimization against job description.

    This function performs comprehensive ATS keyword analysis, identifying
    missing keywords, analyzing keyword density, and providing optimization
    suggestions for improving ATS compatibility.

    Args:
        cv_data: Structured CV data
        job_description: Job description text
        user_id: User identifier for logging
        cv_id: CV identifier for logging
        db_session: Database session for logging

    Returns:
        ATS optimization result containing:
        - ats_score: Overall ATS compatibility score (0-100)
        - missing_keywords: List of important keywords missing from CV
        - keyword_analysis: Detailed keyword presence analysis
        - content_optimization: Section-specific optimization suggestions
        - suggestions: General improvement suggestions
        - strengths: CV strengths for ATS
        - weaknesses: Areas needing improvement
        - tokens_used: AI tokens consumed
        - generation_time: Time taken in milliseconds
        - model_used: AI model identifier
    """
    if not is_ai_enabled():
        return {
            "ats_score": 0,
            "missing_keywords": [],
            "keyword_analysis": {},
            "suggestions": ["AI features are disabled. Cannot perform ATS analysis."],
            "content_optimization": [],
            "strengths": [],
            "weaknesses": [],
            "tokens_used": 0,
            "generation_time": 0,
            "model_used": AIConfig.OPENAI_MODEL,
        }

    prompt = _build_ats_prompt(cv_data, job_description)
    client = get_openai_client()

    try:
        start_time = time.time()

        # Log metadata only (not full content)
        logger.info(
            f"Analyzing ATS optimization - user_id={user_id}, cv_id={cv_id}, operation=analyze_ats"
        )

        # Call OpenAI API with ATS analysis prompt
        async def _call():
            return await asyncio.to_thread(
                client.responses.parse,
                model=AIConfig.OPENAI_MODEL,
                input=[
                    {
                        "role": "system",
                        "content": "You're an ATS expert. CRITICAL: Write suggestions in the SAME LANGUAGE as the job description. Analyze CV vs job description for keywords. Check ALL CV sections before marking keywords missing. Extract ONLY actual JD keywords. Each keyword in ONE array. Valid JSON only.",
                    },
                    {"role": "user", "content": prompt},
                ],
                text_format=ATSOptimizationResponseSchema,
                reasoning=Reasoning(effort=AIConfig.REASONING_EFFORT),
            )

        response = await with_retries(_call, attempts=RETRY_ATTEMPTS, delay=RETRY_DELAY)

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
                operation_type="analyze_ats",
                model_used=AIConfig.OPENAI_MODEL,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                generation_time=generation_time,
                success=True,
                cv_id=cv_id,
                cached_tokens=cached_tokens,
            )

        # Log response metrics for monitoring
        logger.info(
            f"ATS analysis complete - tokens={tokens_used}, time={generation_time}ms"
        )

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
            "model_used": AIConfig.OPENAI_MODEL,
        }

    except Exception as e:
        # Log the error with full details
        logger.error(f"ATS optimization failed with error: {str(e)}", exc_info=True)
        logger.error(f"Error type: {type(e).__name__}")

        # Log failed AI usage
        if user_id:
            log_ai_usage_safe(
                db_session=db_session,
                user_id=user_id,
                operation_type="analyze_ats",
                model_used=AIConfig.OPENAI_MODEL,
                prompt_tokens=0,
                completion_tokens=0,
                generation_time=0,
                success=False,
                error_message=str(e),
                cv_id=cv_id,
            )

        # Log error and return fallback result
        logger.error(f"Error in analyze_ats_optimization: {str(e)}")
        return {
            "ats_score": 0,
            "missing_keywords": [],
            "keyword_analysis": {},
            "suggestions": [f"Error performing ATS analysis: {str(e)}"],
            "content_optimization": [],
            "strengths": [],
            "weaknesses": [],
            "tokens_used": 0,
            "generation_time": 0,
            "model_used": AIConfig.OPENAI_MODEL,
        }


def _build_optimization_prompt(
    current_technical_skills: List[str],
    current_soft_skills: List[str],
    current_summary: str,
    work_overview_text: str,
    job_description: str,
) -> str:
    """
    Build the prompt for optimization suggestions.

    Args:
        current_technical_skills: List of current technical skills
        current_soft_skills: List of current soft skills
        current_summary: Current professional summary text
        work_overview_text: Brief overview of work experience
        job_description: Job description text

    Returns:
        Formatted prompt string
    """
    return f"""Suggest CV improvements vs job description.

CV:
Technical: {json.dumps(current_technical_skills)}
Soft: {json.dumps(current_soft_skills)}
Summary: {current_summary}
Experience: {work_overview_text}

Job: {job_description}

TASKS:
1. Missing skills (technical: max 10, soft: max 5) from job description
   - Actual skills/tools only, case-insensitive, no duplicates
   - One-sentence reasoning each
2. Improved professional summary (2-4 sentences)
   - Focus on relevant experience, natural prose

JSON:
{{
  "skills": {{
    "technical": [{{"skill": "Python", "reasoning": "Required in JD"}}],
    "soft": [{{"skill": "Leadership", "reasoning": "Key responsibility"}}]
  }},
  "professional_summary": {{
    "suggested_text": "Improved...",
    "original_text": "{current_summary}",
    "key_changes": ["change1", "change2"]
  }}
}}"""


def _validate_skill_suggestions(
    raw_suggestions: List[Dict[str, Any]], current_skills: List[str]
) -> List[Dict[str, str]]:
    """
    Validate and filter skill suggestions.

    Args:
        raw_suggestions: Raw skill suggestions from AI
        current_skills: List of current skills (for deduplication)

    Returns:
        Validated list of skill suggestions
    """
    validated = []

    for suggestion in raw_suggestions:
        skill = suggestion.get("skill", "").strip()
        reasoning = suggestion.get("reasoning", "").strip()

        # Validate skill
        if not skill or len(skill) < 2 or len(skill) > 50:
            continue

        # Case-insensitive deduplication check
        skill_lower = skill.lower()
        if any(existing.lower() == skill_lower for existing in current_skills):
            continue

        validated.append({"skill": skill, "reasoning": reasoning})

    return validated


async def create_optimization_suggestions(
    cv_data: Dict[str, Any],
    job_description: str,
    user_id: Optional[str] = None,
    cv_id: Optional[str] = None,
    db_session: Optional[Session] = None,
) -> Dict[str, Any]:
    """
    Generate AI suggestions for CV optimization in one unified call.

    Args:
        cv_data: Complete CV data including skills, professional summary, work experience
        job_description: The job description text to analyze
        user_id: User identifier for logging
        cv_id: CV identifier for logging
        db_session: Database session for logging

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
                "key_changes": [],
            },
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

    work_overview_text = (
        "; ".join(work_overview) if work_overview else "No work experience listed"
    )

    # Build prompt
    prompt = _build_optimization_prompt(
        current_technical_skills,
        current_soft_skills,
        current_summary,
        work_overview_text,
        job_description,
    )

    try:
        start_time = time.time()

        # Log metadata only (not full content)
        logger.info(
            f"Generating AI suggestions - user_id={user_id}, cv_id={cv_id}, operation=generate_suggestions"
        )

        client = get_openai_client()

        # Call OpenAI API with unified prompt
        async def _call():
            return await asyncio.to_thread(
                client.responses.parse,
                model=AIConfig.OPENAI_MODEL,
                input=[
                    {
                        "role": "system",
                        "content": "You're a CV optimization assistant. Analyze CV vs job description. Extract real, tangible skills. Create natural professional content.",
                    },
                    {"role": "user", "content": prompt},
                ],
                text_format=OptimizationSuggestionsResponseSchema,
                reasoning=Reasoning(effort=AIConfig.REASONING_EFFORT),
            )

        response = await with_retries(_call, attempts=RETRY_ATTEMPTS, delay=RETRY_DELAY)

        generation_time = int((time.time() - start_time) * 1000)

        # Extract parsed data and token usage
        parsed_suggestions = response.output_parsed.model_dump()
        prompt_tokens = response.usage.input_tokens
        completion_tokens = response.usage.output_tokens
        tokens_used = prompt_tokens + completion_tokens

        # Extract cached tokens if available (OpenAI prompt caching)
        cached_tokens = 0
        if (
            hasattr(response.usage, "input_tokens_details")
            and response.usage.input_tokens_details
        ):
            cached_tokens = getattr(
                response.usage.input_tokens_details, "cached_tokens", 0
            )
        elif (
            hasattr(response.usage, "prompt_tokens_details")
            and response.usage.prompt_tokens_details
        ):
            cached_tokens = getattr(
                response.usage.prompt_tokens_details, "cached_tokens", 0
            )

        # Log AI usage
        if user_id:
            log_ai_usage_safe(
                db_session=db_session,
                user_id=user_id,
                operation_type="generate_suggestions",
                model_used=AIConfig.OPENAI_MODEL,
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                generation_time=generation_time,
                success=True,
                cv_id=cv_id,
                cached_tokens=cached_tokens,
            )

        # Log response metrics for monitoring
        logger.info(
            f"AI suggestions complete - tokens={tokens_used}, time={generation_time}ms"
        )

        # Validate and filter skill suggestions
        raw_technical = parsed_suggestions.get("skills", {}).get("technical", [])
        raw_soft = parsed_suggestions.get("skills", {}).get("soft", [])

        technical_suggestions = _validate_skill_suggestions(
            raw_technical, current_technical_skills
        )
        soft_suggestions = _validate_skill_suggestions(raw_soft, current_soft_skills)

        # Process professional summary suggestion
        summary_data = parsed_suggestions.get("professional_summary", {})
        suggested_text = summary_data.get("suggested_text", "").strip()
        key_changes = summary_data.get("key_changes", [])

        logger.info(
            f"Processed AI suggestions - Technical: {len(technical_suggestions)}, Soft: {len(soft_suggestions)}"
        )

        # Validate summary suggestion
        if not suggested_text or len(suggested_text) < 10:
            suggested_text = ""
            key_changes = []

        return {
            "skills": {"technical": technical_suggestions, "soft": soft_suggestions},
            "professional_summary": {
                "suggested_text": suggested_text,
                "original_text": current_summary,
                "key_changes": key_changes,
            },
        }

    except Exception as e:
        # Log the error with full details
        logger.error(
            f"Optimization suggestions failed with error: {str(e)}", exc_info=True
        )
        logger.error(f"Error type: {type(e).__name__}")

        # Log failed AI usage
        if user_id:
            log_ai_usage_safe(
                db_session=db_session,
                user_id=user_id,
                operation_type="generate_suggestions",
                model_used=AIConfig.OPENAI_MODEL,
                prompt_tokens=0,
                completion_tokens=0,
                generation_time=0,
                success=False,
                error_message=str(e),
                cv_id=cv_id,
            )

        # Log error and return empty structures (graceful degradation)
        logger.error(f"Error in create_optimization_suggestions: {str(e)}")
        return {
            "skills": {"technical": [], "soft": []},
            "professional_summary": {
                "suggested_text": "",
                "original_text": current_summary,
                "key_changes": [],
            },
        }
