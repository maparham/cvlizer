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
    # Filter out hidden sections before sending to AI
    filtered_cv_data = filter_hidden_sections(cv_data)

    return f"""Analyze CV for ATS keyword optimization.

⚠️ LANGUAGE REQUIREMENT: Write ALL text content (suggestions, content_optimization suggestions) in the SAME LANGUAGE as the job description.
If the job description is in German, write everything in German. If in English, write in English.

CV: {json.dumps(filtered_cv_data, indent=2)}

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
        # Log metadata only (not full content)
        logger.info(
            f"Analyzing ATS optimization - user_id={user_id}, cv_id={cv_id}, operation=analyze_ats"
        )

        # Use unified OpenAI call builder
        analysis, metadata = await call_openai_with_schema(
            system_prompt="You're an ATS expert. CRITICAL: Write suggestions in the SAME LANGUAGE as the job description. Analyze CV vs job description for keywords. Check ALL CV sections before marking keywords missing. Extract ONLY actual JD keywords. Each keyword in ONE array. Valid JSON only.",
            user_prompt=prompt,
            response_schema=ATSOptimizationResponseSchema,
            user_id=user_id,
            cv_id=cv_id,
            operation_type="analyze_ats",
            db_session=db_session,
        )

        # Log response metrics for monitoring
        logger.info(
            f"ATS analysis complete - tokens={metadata['tokens_used']}, time={metadata['generation_time']}ms"
        )

        return {
            "ats_score": analysis.get("ats_score", 50),
            "missing_keywords": analysis.get("missing_keywords", []),
            "keyword_analysis": analysis.get("keyword_analysis", {}),
            "suggestions": analysis.get("suggestions", []),
            "content_optimization": analysis.get("content_optimization", []),
            "strengths": analysis.get("strengths", []),
            "weaknesses": analysis.get("weaknesses", []),
            **metadata,  # Include tokens_used, generation_time, model_used, etc.
        }

    except Exception as e:
        # Error already logged by call_openai_with_schema
        # Return fallback result
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
    work_experience_items: List[Dict[str, Any]],
    education_items: List[Dict[str, Any]],
    job_description: str,
) -> str:
    """
    Build the prompt for optimization suggestions.

    Args:
        current_technical_skills: List of current technical skills
        current_soft_skills: List of current soft skills
        current_summary: Current professional summary text
        work_experience_items: List of work experience items with id and description
        education_items: List of education items with id and description
        job_description: Job description text

    Returns:
        Formatted prompt string
    """
    # Format work experience items for prompt
    work_items_text = json.dumps(
        [
            {
                "id": item.get("id", ""),
                "position": item.get("position", ""),
                "company": item.get("company", ""),
                "description": item.get("description", ""),
            }
            for item in work_experience_items
        ],
        indent=2,
    )

    # Format education items for prompt
    education_items_text = json.dumps(
        [
            {
                "id": item.get("id", ""),
                "degree": item.get("degree", ""),
                "institution": item.get("institution", ""),
                "description": item.get("description", ""),
            }
            for item in education_items
        ],
        indent=2,
    )

    return f"""Suggest CV improvements vs job description.

CV:
Technical Skills: {json.dumps(current_technical_skills)}
Soft Skills: {json.dumps(current_soft_skills)}
Professional Summary: {current_summary}
Work Experience: {work_items_text}
Education: {education_items_text}

Job: {job_description}

⚠️ LANGUAGE REQUIREMENT: Write ALL text content (suggestions, descriptions) in the SAME LANGUAGE as the job description.

TASKS:
1. Missing skills (technical: max 10, soft: max 5) from job description
   - Actual skills/tools only, case-insensitive, no duplicates
   - One-sentence reasoning each
2. Improved professional summary (2-4 sentences)
   - Focus on relevant experience, natural prose
3. For EACH work experience item, suggest an improved description
   - Better align with job requirements
   - Highlight relevant achievements and responsibilities
   - Keep original structure and key points, enhance relevance
4. For EACH education item, suggest an improved description
   - Highlight relevant coursework, projects, or research
   - Emphasize skills/achievements relevant to job
   - Keep original information, enhance relevance

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
  }},
  "work_experience": [
    {{
      "id": "work_item_id",
      "original": "Original description...",
      "suggested": "Improved description...",
      "reasoning": "Why this improves alignment with job requirements"
    }}
  ],
  "education": [
    {{
      "id": "edu_item_id",
      "original": "Original description...",
      "suggested": "Improved description...",
      "reasoning": "Why this better highlights relevant coursework/projects"
    }}
  ]
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
            },
            "work_experience": [
                {"id": "...", "original": "...", "suggested": "...", "reasoning": "..."}
            ],
            "education": [
                {"id": "...", "original": "...", "suggested": "...", "reasoning": "..."}
            ]
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
            "work_experience": [],
            "education": [],
        }

    # Handle None or empty cv_data
    if not cv_data:
        return {
            "skills": {"technical": [], "soft": []},
            "professional_summary": {
                "suggested_text": "",
                "original_text": "",
                "key_changes": [],
            },
            "work_experience": [],
            "education": [],
        }

    # Extract current CV data with defensive null checks
    skills_data = cv_data.get("skills") or {}
    current_technical_skills = skills_data.get("technical") or []
    current_soft_skills = skills_data.get("soft") or []

    # Fix the nested .get() on potentially None value
    summary_data = cv_data.get("professional_summary") or {}
    current_summary = summary_data.get("content") or ""

    # Extract work experience items with IDs
    work_experience = cv_data.get("work_experience", [])
    work_experience_items = [
        {
            "id": item.get("id", ""),
            "position": item.get("position", ""),
            "company": item.get("company", ""),
            "description": item.get("description", ""),
        }
        for item in work_experience
    ]

    # Extract education items with IDs
    education = cv_data.get("education", [])
    education_items = [
        {
            "id": item.get("id", ""),
            "degree": item.get("degree", ""),
            "institution": item.get("institution", ""),
            "description": item.get("description", ""),
        }
        for item in education
    ]

    # Build prompt
    prompt = _build_optimization_prompt(
        current_technical_skills,
        current_soft_skills,
        current_summary,
        work_experience_items,
        education_items,
        job_description,
    )

    try:
        # Log metadata only (not full content)
        logger.info(
            f"Generating AI suggestions - user_id={user_id}, cv_id={cv_id}, operation=generate_suggestions"
        )

        # Use unified OpenAI call builder
        parsed_suggestions, metadata = await call_openai_with_schema(
            system_prompt="You're a CV optimization assistant. Analyze CV vs job description. Extract real, tangible skills. Create natural professional content.",
            user_prompt=prompt,
            response_schema=OptimizationSuggestionsResponseSchema,
            user_id=user_id,
            cv_id=cv_id,
            operation_type="generate_suggestions",
            db_session=db_session,
        )

        # Log response metrics for monitoring
        logger.info(
            f"AI suggestions complete - tokens={metadata['tokens_used']}, time={metadata['generation_time']}ms"
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

        # Process work experience suggestions
        raw_work_suggestions = parsed_suggestions.get("work_experience", [])
        work_suggestions = []
        for suggestion in raw_work_suggestions:
            item_id = suggestion.get("id", "").strip()
            suggested_desc = suggestion.get("suggested", "").strip()
            original_desc = suggestion.get("original", "").strip()
            reasoning = suggestion.get("reasoning", "").strip()

            # Validate suggestion has required fields
            if item_id and suggested_desc and reasoning:
                work_suggestions.append(
                    {
                        "id": item_id,
                        "original": original_desc,
                        "suggested": suggested_desc,
                        "reasoning": reasoning,
                    }
                )

        # Process education suggestions
        raw_education_suggestions = parsed_suggestions.get("education", [])
        education_suggestions = []
        for suggestion in raw_education_suggestions:
            item_id = suggestion.get("id", "").strip()
            suggested_desc = suggestion.get("suggested", "").strip()
            original_desc = suggestion.get("original", "").strip()
            reasoning = suggestion.get("reasoning", "").strip()

            # Validate suggestion has required fields
            if item_id and suggested_desc and reasoning:
                education_suggestions.append(
                    {
                        "id": item_id,
                        "original": original_desc,
                        "suggested": suggested_desc,
                        "reasoning": reasoning,
                    }
                )

        logger.info(
            f"Processed AI suggestions - Technical: {len(technical_suggestions)}, Soft: {len(soft_suggestions)}, "
            f"Work Experience: {len(work_suggestions)}, Education: {len(education_suggestions)}"
        )

        return {
            "skills": {"technical": technical_suggestions, "soft": soft_suggestions},
            "professional_summary": {
                "suggested_text": suggested_text,
                "original_text": current_summary,
                "key_changes": key_changes,
            },
            "work_experience": work_suggestions,
            "education": education_suggestions,
        }

    except Exception as e:
        # Error already logged by call_openai_with_schema
        # Return empty structures (graceful degradation)
        return {
            "skills": {"technical": [], "soft": []},
            "professional_summary": {
                "suggested_text": "",
                "original_text": current_summary,
                "key_changes": [],
            },
            "work_experience": [],
            "education": [],
        }
