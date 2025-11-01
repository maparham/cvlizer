"""
AI suggestions service for job fit analysis and optimization.

This module generates job fit analysis and CV optimization suggestions
in a single AI call with token-optimized prompts.
"""

import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple

from sqlalchemy.orm import Session

from src.schemas.ai_response_schemas import AISuggestionsResponseSchema

from .common import call_openai_with_schema, is_ai_enabled
from .cv_filter import filter_hidden_sections

logger = logging.getLogger(__name__)


def _build_ai_suggestions_prompt(cv_data: Dict[str, Any], job_description: str) -> str:
    """
    Build token-optimized prompt for AI suggestions generation.

    Token optimizations:
    - Filter CV once with filter_hidden_sections()
    - Use compact JSON (no indent)
    - Consolidate instructions
    - Single language requirement
    - Reuse CV data reference

    Args:
        cv_data: Structured CV data
        job_description: Job description text

    Returns:
        Formatted prompt string optimized for token efficiency
    """
    # Filter out hidden sections before sending to AI
    filtered_cv_data = filter_hidden_sections(cv_data)

    # Extract current CV data for optimization (compact format)
    skills_data = cv_data.get("skills") or {}
    current_technical_skills = skills_data.get("technical") or []
    current_soft_skills = skills_data.get("soft") or []

    summary_data = cv_data.get("professional_summary") or {}
    current_summary = summary_data.get("content") or ""

    work_experience = cv_data.get("work_experience", [])
    work_items = [
        {
            "id": item.get("id", ""),
            "position": item.get("position", ""),
            "company": item.get("company", ""),
            "description": item.get("description", ""),
        }
        for item in work_experience
    ]

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

    # Compact JSON formatting (no indent)
    cv_json = json.dumps(filtered_cv_data)
    work_json = json.dumps(work_items)
    education_json = json.dumps(education_items)

    return f"""Analyze CV fit for position and suggest improvements.

⚠️ LANGUAGE: Write ALL content in SAME LANGUAGE as job description.

CV: {cv_json}
Job: {job_description}

TASKS:
1. Job Fit Analysis (write as candidate, first person):
   - Extract company name → title: "Hello [Company]!" or "Hello!"
   - confidence_score: 1-100 match quality
   - fit_analysis: markdown, 1 para intro (40-50 words), then specific requirements with cover paragraphs
   - Format: **"[requirement]"**\\n\\n[experience paragraph]\\n\\n
   - Be honest about gaps: "I don't have X but eager to learn"
   - key_matches: ONLY genuine CV-JD skill overlaps (can be empty)
   - missing_skills: 2-4 skills in JD not in CV
   - suggested_improvements: 3-5 specific CV tips
   - strengths: 3-5 specific strengths for this role
   - weaknesses: 2-4 gaps needing development

2. Optimization Suggestions:
   - skills.technical: missing technical skills (max 10) with reasoning
   - skills.soft: missing soft skills (max 5) with reasoning
   - professional_summary: improved 2-4 sentence summary
   - work_experience: improve EACH item's description
   - education: improve EACH item's description

Current Summary: {current_summary}
Technical Skills: {json.dumps(current_technical_skills)}
Soft Skills: {json.dumps(current_soft_skills)}
Work: {work_json}
Education: {education_json}

OUTPUT JSON:
{{
  "title": "Hello [Company]!",
  "confidence_score": 85,
  "fit_analysis": "markdown",
  "key_matches": ["skill1"],
  "missing_skills": ["skill1"],
  "suggested_improvements": ["tip1"],
  "strengths": ["strength1"],
  "weaknesses": ["gap1"],
  "skills": {{"technical": [{{"skill": "X", "reasoning": "Y"}}], "soft": []}},
  "professional_summary": {{"suggested_text": "...", "original_text": "{current_summary}", "key_changes": ["..."]}},
  "work_experience": [{{"id": "...", "original": "...", "suggested": "...", "reasoning": "..."}}],
  "education": [{{"id": "...", "original": "...", "suggested": "...", "reasoning": "..."}}]
}}

Use 'position' or 'job' not 'role'. missing_skills, suggested_improvements, strengths, weaknesses must have ≥1 value. key_matches can be empty."""


async def generate_ai_suggestions(
    cv_data: Dict[str, Any],
    job_description: str,
    user_id: Optional[str] = None,
    cv_id: Optional[str] = None,
    db_session: Optional[Session] = None,
) -> Tuple[Dict[str, Any], Dict[str, Any], Dict[str, Any]]:
    """
    Generate job fit analysis and optimization suggestions in one AI call.

    Args:
        cv_data: Complete CV data including skills, summary, work experience
        job_description: Job description text to analyze
        user_id: User identifier for logging
        cv_id: CV identifier for logging
        db_session: Database session for logging

    Returns:
        Tuple of (job_fit_data, optimization_data, metadata) where:
        - job_fit_data: Dict with title, confidence_score, fit_analysis, etc.
        - optimization_data: Dict with skills, professional_summary, work_experience, education
        - metadata: Dict with tokens_used, generation_time, model_used, etc.

    Raises:
        RuntimeError: If AI is not enabled or call fails
    """
    if not is_ai_enabled():
        raise RuntimeError("AI features are not enabled")

    # Build token-optimized prompt
    prompt = _build_ai_suggestions_prompt(cv_data, job_description)

    try:
        logger.info(
            f"Generating AI suggestions - user_id={user_id}, cv_id={cv_id}, operation=ai_suggestions"
        )

        # Single unified OpenAI call
        response, metadata = await call_openai_with_schema(
            system_prompt="You're a CV expert. Analyze candidate fit and suggest improvements. Write in job description language. Be honest, specific, professional.",
            user_prompt=prompt,
            response_schema=AISuggestionsResponseSchema,
            user_id=user_id,
            cv_id=cv_id,
            operation_type="ai_suggestions",
            db_session=db_session,
        )

        logger.info(
            f"AI suggestions complete - tokens={metadata['tokens_used']}, time={metadata['generation_time']}ms"
        )

        # Split response into job_fit and optimization parts
        job_fit_data = {
            "title": response.get("title", "Hello!"),
            "confidence_score": response.get("confidence_score", 50),
            "fit_analysis": response.get("fit_analysis", ""),
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "key_matches": response.get("key_matches", []),
            "missing_skills": response.get("missing_skills", []),
            "suggested_improvements": response.get("suggested_improvements", []),
            "strengths": response.get("strengths", []),
            "weaknesses": response.get("weaknesses", []),
        }

        optimization_data = {
            "skills": response.get("skills", {"technical": [], "soft": []}),
            "professional_summary": response.get(
                "professional_summary",
                {"suggested_text": "", "original_text": "", "key_changes": []},
            ),
            "work_experience": response.get("work_experience", []),
            "education": response.get("education", []),
        }

        return job_fit_data, optimization_data, metadata

    except Exception as e:
        logger.error(f"Failed to generate AI suggestions: {str(e)}")
        raise RuntimeError(f"AI suggestions generation failed: {str(e)}")
