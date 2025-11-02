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
    # Filter out hidden sections before sending to AI
    filtered_cv_data = filter_hidden_sections(cv_data)

    # Extract current CV data for optimization (compact format)
    # Use filtered_cv_data to ensure hidden sections are excluded
    skills_data = filtered_cv_data.get("skills") or {}
    current_technical_skills = skills_data.get("technical") or []
    current_soft_skills = skills_data.get("soft") or []
    has_skills_section = bool(
        filtered_cv_data.get("skills")
        and (current_technical_skills or current_soft_skills)
    )

    # Check if professional_summary exists and has content (only if not filtered out)
    has_professional_summary = False
    if "professional_summary" in filtered_cv_data:
        summary_data = filtered_cv_data.get("professional_summary") or {}
        current_summary = summary_data.get("content") or ""
        has_professional_summary = bool(current_summary)

    work_experience = filtered_cv_data.get("work_experience", [])
    work_items = [
        {
            "id": item.get("id", ""),
            "position": item.get("position", ""),
            "company": item.get("company", ""),
            "description": item.get("description", ""),
            "technologies": item.get("technologies", []),
        }
        for item in work_experience
    ]
    has_work_experience = bool(work_items)

    education = filtered_cv_data.get("education", [])
    education_items = [
        {
            "id": item.get("id", ""),
            "degree": item.get("degree", ""),
            "institution": item.get("institution", ""),
            "description": item.get("description", ""),
        }
        for item in education
    ]
    has_education = bool(education_items)

    # Compact JSON formatting (no indent)
    cv_json = json.dumps(filtered_cv_data)
    work_json = json.dumps(work_items)
    education_json = json.dumps(education_items)

    # Build conditional optimization instructions
    optimization_tasks = []
    if has_skills_section:
        optimization_tasks.append(
            "   - skills.technical: Suggest technical skills ONLY if naturally connected to candidate's existing experience (max 10) with reasoning"
        )
        optimization_tasks.append(
            "   - skills.soft: Suggest soft skills that would help highlight their authentic strengths (max 5) with reasoning"
        )
    if has_professional_summary:
        optimization_tasks.append(
            "   - professional_summary: Suggest ways to present their story more confidently (2-4 sentences)"
        )
    if has_work_experience:
        optimization_tasks.append(
            "   - work_experience: For EACH item, first evaluate current_content_score (0-100) based on "
            "how well the story is told and confidence of presentation.\n"
            "Only include items with score < 50 in the array (with suggested, reasoning, "
            "current_content_score, importance). Respect the candidate's style—if they don't use metrics, don't push for them. "
            "Focus on clarity, confidence, and authentic storytelling."
        )
    if has_education:
        optimization_tasks.append(
            "   - education: For EACH item, first evaluate current_content_score (0-100) based on "
            "clarity and confidence of presentation.\n"
            "     Only include items with score < 50 in the array (with suggested, reasoning, "
            "current_content_score, importance). Focus on helping them present their education authentically and confidently."
        )
    optimization_tasks_text = (
        "\n".join(optimization_tasks)
        if optimization_tasks
        else "   (No optimization sections available)"
    )

    # Build conditional JSON output example
    # Check if any optimization fields will be included
    has_any_optimization_fields = (
        has_skills_section
        or has_professional_summary
        or has_work_experience
        or has_education
    )

    json_output_parts = [
        '  "title": "Hello [Company]!",',
        '  "confidence_score": 85,',
        '  "fit_analysis": "markdown",',
        '  "key_matches": ["skill1"],',
        '  "missing_skills": ["skill1"],',
        '  "suggested_improvements": ["tip1"],',
        '  "strengths": ["strength1"],',
        f'  "weaknesses": ["gap1"]{"," if has_any_optimization_fields else ""}',
    ]

    # Add optimization fields conditionally (handle trailing commas properly)
    # Determine if there will be fields after each one
    has_any_after_skills = (
        has_professional_summary or has_work_experience or has_education
    )
    has_any_after_summary = has_work_experience or has_education
    has_any_after_work = has_education

    if has_skills_section:
        comma = "," if has_any_after_skills else ""
        json_output_parts.append(
            f'  "skills": {{"technical": [{{"skill": "X", "reasoning": "Y"}}], "soft": []}}{comma}'
        )
    else:
        comma = "," if has_any_after_skills else ""
        json_output_parts.append(f'  "skills": {{"technical": [], "soft": []}}{comma}')

    # Only include professional_summary in JSON output if section is visible
    if has_professional_summary:
        comma = "," if has_any_after_summary else ""
        json_output_parts.append(
            f'  "professional_summary": {{"suggested_text": "...", "original_text": "{current_summary}", "key_changes": ["..."]}}{comma}'
        )

    if has_work_experience:
        comma = "," if has_any_after_work else ""
        json_output_parts.append(
            f'  "work_experience": [{{"id": "...", "original": "...", "suggested": "...", "reasoning": "...", "current_content_score": 65, "importance": "standard"}}]{comma}'
        )
    else:
        comma = "," if has_any_after_work else ""
        json_output_parts.append(f'  "work_experience": []{comma}')

    if has_education:
        json_output_parts.append(
            '  "education": [{"id": "...", "original": "...", "suggested": "...", "reasoning": "...", "current_content_score": 65, "importance": "standard"}]'
        )
    else:
        json_output_parts.append('  "education": []')

    json_output_example = "\n".join(json_output_parts)

    return f"""Analyze CV fit for position and suggest improvements.

⚠️ LANGUAGE: Write ALL content in SAME LANGUAGE as job description.

⚠️ CAREER COACHING APPROACH:
- Focus on TRANSFERABLE SKILLS and authentic experience fit, not just keyword matching
- Respect the candidate's existing writing STYLE: observe their CV—only suggest metrics if they already use them
- Be ENCOURAGING and supportive: help them present their genuine experience confidently
- Avoid keyword stuffing or prescriptive demands for "perfect" CVs
- Emphasize storytelling, clarity, and honest self-representation

⚠️ FACT-BASED ONLY: For work_experience/education suggestions, only reference technologies/skills explicitly in each item's data. Never add technologies not listed in that item's 'technologies' array.

CV: {cv_json}
Job: {job_description}

TASKS:
1. Job Fit Analysis (write as candidate, first person):
   - Extract company name → title: "Hello [Company]!" or "Hello!"
   - confidence_score: 1-100 match quality based on transferable skills and authentic fit
   - fit_analysis: markdown, start with a concise intro paragraph, then specific requirements with cover paragraphs
   - Format: **"[requirement]"**\\n\\n[experience paragraph]\\n\\n
   - Be honest about gaps: "I don't have X but eager to learn" or "I bring Y transferable skills"
   - key_matches: Skills/experiences from CV that genuinely transfer to this role (focus on SUBSTANCE over keywords; can be empty)
   - missing_skills: up to 4 skills worth highlighting from their existing experience that connect to the job
   - suggested_improvements: 1 to 5 coaching tips for presenting their story more confidently (clarity, authenticity, storytelling)
   - strengths: up to 4 specific strengths they bring to this role (transferable skills, authentic qualities)
   - weaknesses: up to 4 honest gaps or areas for growth (frame as development opportunities)

2. Optimization Suggestions:
{optimization_tasks_text}

OUTPUT JSON:
{{
{json_output_example}
}}

Use 'position' or 'job' not 'role'.
suggested_improvements, strengths, weaknesses must have ≥1 value.
key_matches can be empty."""


async def generate_ai_suggestions(
    cv_data: Dict[str, Any],
    job_description: str,
    user_id: Optional[str] = None,
    cv_id: Optional[str] = None,
    db_session: Optional[Session] = None,
) -> Tuple[Dict[str, Any], Dict[str, Any], Dict[str, Any]]:
    """
    Generates job fit analysis and CV optimization suggestions via a single AI call.

    Parameters:
        cv_data (Dict[str, Any]): The parsed CV data as a dictionary.
        job_description (str): The job description text to analyze fit against.
        user_id (Optional[str], optional): The ID of the requesting user, if available.
        cv_id (Optional[str], optional): The ID of the CV being analyzed, if available.
        db_session (Optional[Session], optional): SQLAlchemy session for logging/tracking, if used.

    Returns:
        Tuple[Dict[str, Any], Dict[str, Any], Dict[str, Any]]:
            - Job fit analysis dictionary
            - Optimization suggestions dictionary
            - Raw OpenAI response metadata dictionary

    Raises:
        RuntimeError: If AI features are not enabled.

    This function prepares prompts and calls the AI service to generate both job fit and
    CV optimization insights in a single OpenAI API request for efficiency and consistency.
    """
    if not is_ai_enabled():
        raise RuntimeError("AI features are not enabled")

    # Build token-optimized prompt
    prompt = _build_ai_suggestions_prompt(cv_data, job_description)

    try:
        logger.info(
            f"Generating AI suggestions - user_id={user_id}, cv_id={cv_id}, operation=ai_suggestions"
        )

        system_prompt = "You're a supportive career coach helping candidates present their authentic experience confidently. Focus on transferable skills and genuine fit over keyword matching. Respect the candidate's existing writing style—only suggest metrics if their CV already uses them. Be encouraging, honest, and help them tell their story well."

        # Debug log: Print entire prompts
        logger.info("=" * 80)
        logger.info("AI SUGGESTION GENERATION PROMPTS")
        logger.info("=" * 80)
        logger.info(f"SYSTEM PROMPT:\n{system_prompt}")
        logger.info("-" * 80)
        logger.info(f"USER PROMPT:\n{prompt}")
        logger.info("=" * 80)

        # Single unified OpenAI call
        response, metadata = await call_openai_with_schema(
            system_prompt=system_prompt,
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

        # Check which sections are visible to filter response accordingly
        filtered_cv_data = filter_hidden_sections(cv_data)
        has_professional_summary = "professional_summary" in filtered_cv_data

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

        # Handle professional_summary - only include if visible, otherwise empty defaults
        professional_summary_value = {
            "suggested_text": "",
            "original_text": "",
            "key_changes": [],
        }
        if has_professional_summary:
            professional_summary_response = response.get("professional_summary")
            if professional_summary_response:
                professional_summary_value = professional_summary_response

        optimization_data = {
            "skills": response.get("skills", {"technical": [], "soft": []}),
            "professional_summary": professional_summary_value,
            "work_experience": response.get("work_experience", []),
            "education": response.get("education", []),
        }

        return job_fit_data, optimization_data, metadata

    except Exception as e:
        logger.error(f"Failed to generate AI suggestions: {str(e)}")
        raise RuntimeError(f"AI suggestions generation failed: {str(e)}")
