"""
AI suggestions service for job fit analysis and optimization.

This module generates job fit analysis and CV optimization suggestions
in a single AI call with token-optimized prompts.
"""

import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from src.schemas.ai_response_schemas import AISuggestionsResponseSchema
from src.utils.cv_data_optimizer import clean_control_characters

from .common import call_openai_with_schema, is_ai_enabled
from .cv_filter import filter_hidden_sections
from .cv_section_utils import get_summary_custom_section

logger = logging.getLogger(__name__)

AI_SUGGESTIONS_SYSTEM_PROMPT = """You are an expert CV and job-fit evaluator. Your task is to analyze a candidate against a specific job description and provide honest, high-quality recommendations that improve the application only where there is clear value.

CORE OBJECTIVE
Help the candidate present their real strengths clearly and credibly. Prioritize judgment, relevance, and truthfulness over keyword matching.

NON-NEGOTIABLE RULES
1. Never invent experience, skills, achievements, metrics, responsibilities, certifications, or tools.
2. Never imply the candidate has done work not supported by the CV.
3. Use transferable skills when direct experience is missing.
4. Preserve the candidate’s natural voice whenever suggesting edits.
5. Prefer minimal necessary changes over rewriting.
6. If existing content is already strong, keep it unchanged.
7. Be accurate, specific, and concise.

LANGUAGE
Write all content in the same language as the job description unless explicitly instructed otherwise.

EVALUATION PRINCIPLES
Judge fit based on substance, not generosity. Prioritize:
- Relevant hands-on experience
- Technical depth
- Ownership and delivery
- Similarity to job responsibilities
- Complexity of past work
- Communication and collaboration evidence
- Growth potential where gaps are reasonable

Do NOT overweight:
- Buzzwords
- Exact keyword matches
- Inflated titles
- Minor tool mismatches
- Missing nice-to-have items

SCORING GUIDELINES
90-100 = Excellent fit
75-89 = Good fit
60-74 = Moderate fit
40-59 = Weak to partial fit
1-39 = Poor fit

WRITING STYLE
Clear, direct, natural language. No hype, no filler, no empty praise.

EDITING RULES
Only suggest edits with clear benefit:
- clarity
- grammar
- stronger relevance
- removal of weak phrasing
- better evidence already present

Do not suggest cosmetic rewrites.

FINAL STANDARD
Every recommendation must materially improve clarity, credibility, relevance, or hiring chances."""

AI_SUGGESTIONS_DEVELOPER_PROMPT = """Follow the provided structured output schema exactly.
- Never output fields outside schema.
- Respect required vs nullable fields.
- Arrays should be concise and high-signal.
- Avoid repetitive suggestions.
- If evidence is weak, lower confidence.
- Use realistic scoring, not inflated scoring.
- Do not lower scores merely because content is brief.
- Preserve original candidate wording whenever possible.
- Only produce low-score suggestions when there is a concrete problem: grammar, unclear impact, weak relevance, confusing wording, factual issue.

html_diff rules:
- Generate html_diff whenever a suggestion field changes text.
- Output complete suggested text with inline change markers.
- Use only <del>removed</del> and <ins>added</ins>.
- Keep unchanged text plain.
- Mark minimal changed spans only.
- Ensure balanced valid tags.
- If no changes, return empty string.

Schema contract rules:
- suggested_improvements, strengths, weaknesses must have >=1 value.
- key_matches can be empty.
- For professional_summary: if no changes needed, return null.
- For work_experience and education: include ALL items with current_content_score.
- Use item_type=\"high_score\" for score >= 50 with only id/current_content_score fields.
- Use item_type=\"low_score\" for score < 50 and include all required suggestion fields.
- For 'suggested' fields, always return ready-to-use rewritten text, not instructions.
- Keep reasoning concise and specific (maximum 30 words for item-level reasoning)."""


def _normalize_skill_name(skill: str) -> str:
    """
    Normalize a skill name for comparison (lowercase, trim whitespace).

    Args:
        skill: Skill name to normalize

    Returns:
        Normalized skill name
    """
    return skill.strip().lower()


def _filter_existing_skills(
    suggested_skills: List[Dict[str, Any]],
    existing_skills: List[str],
    category: str,
) -> List[Dict[str, Any]]:
    """
    Filter out suggested skills that already exist in the CV.

    Args:
        suggested_skills: List of skill suggestion dicts with 'skill' key
        existing_skills: List of existing skill names from CV
        category: Category name for logging

    Returns:
        Filtered list of skill suggestions without duplicates
    """
    if not suggested_skills:
        return []

    # Normalize existing skills for comparison
    existing_normalized = {_normalize_skill_name(skill) for skill in existing_skills}

    filtered = []
    filtered_out = []

    for suggestion in suggested_skills:
        skill_name = suggestion.get("skill", "")
        if not skill_name:
            # Keep suggestions without skill name (shouldn't happen, but be safe)
            filtered.append(suggestion)
            continue

        normalized_suggested = _normalize_skill_name(skill_name)
        if normalized_suggested in existing_normalized:
            filtered_out.append(skill_name)
        else:
            filtered.append(suggestion)

    if filtered_out:
        logger.info(
            f"Filtered out {len(filtered_out)} duplicate skills in '{category}': {filtered_out}"
        )

    return filtered


def _build_ai_suggestions_prompt(
    cv_data: Dict[str, Any], job_description: str, company_name: Optional[str] = None
) -> str:
    # Filter out hidden sections before sending to AI
    filtered_cv_data = filter_hidden_sections(cv_data)

    # Clean control characters from all text fields
    filtered_cv_data = clean_control_characters(filtered_cv_data)

    # Summary = first custom section with title "Professional Summary", or first custom section
    summary_section = get_summary_custom_section(filtered_cv_data)
    if summary_section:
        filtered_cv_data["professional_summary"] = {
            "content": summary_section.get("content") or "",
        }
    has_professional_summary = bool(summary_section)

    # Extract current CV data for optimization (compact format)
    skills_data = filtered_cv_data.get("skills") or {}
    current_technical_skills = (
        skills_data.get("technical")
        if isinstance(skills_data.get("technical"), dict)
        else {}
    )
    has_skills_section = bool(filtered_cv_data.get("skills") and current_technical_skills)

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
        # Format current skills for prompt
        current_technical_str = json.dumps(current_technical_skills)
        optimization_tasks.append(
            f"   - skills: Return a dictionary of dynamic categories, each value an array of suggestions in this shape: "
            f'{{"skill": "...", "reasoning": "..."}}. '
            f"CRITICAL: Do NOT suggest skills that already exist anywhere in the candidate's current skills dictionary: {current_technical_str}. "
            f"Only suggest NEW, evidence-backed skills from the CV that are relevant to the job (max 12 total across all categories)."
        )
    if has_professional_summary:
        optimization_tasks.append(
            f"   - professional_summary: If original_text is empty, generate a new professional summary (2-4 sentences) based on the CV and job description. "
            "If original_text exists, only suggest changes when there are clear issues: unclear messaging, weak impact, grammar errors, or factual problems. "
            "Preserve original structure and key phrases. Avoid unnecessary rephrasing. "
            "Stay close to original wording—only modify when the change addresses a concrete problem that significantly improves clarity or impact. "
            "If no changes needed, set professional_summary field to null."
        )

    # Shared instructions for item-based sections (work_experience and education)
    item_based_sections = []
    if has_work_experience:
        item_based_sections.append("work_experience")
    if has_education:
        item_based_sections.append("education")

    if item_based_sections:
        sections_list = " and ".join(item_based_sections)
        optimization_tasks.append(
            f"   - {sections_list}: Evaluate current_content_score (0-100) for EACH item.\n"
            f"   \n"
            f"   Output format based on score:\n"
            f'   - Score >= 50: {{"item_type": "high_score", "id": "...", "current_content_score": XX}}\n'
            f'   - Score < 50: {{"item_type": "low_score", "id": "...", "current_content_score": XX, "original": "...", "suggested": "...", "reasoning": "...", "importance": "standard", "html_diff": "..."}}\n'
            f"   \n"
            f"   Schema enforces this structure - you CANNOT include extra fields for high scores.\n"
            f"   Only suggest changes for score < 50 when there are clear issues: grammar errors, unclear messaging, missing impact, or factual errors. "
            f"Avoid scoring items low just because they are 'generic'—only mark as low_score when there are concrete problems that need fixing.\n"
            f"   \n"
            f"   CRITICAL: The 'suggested' field must contain the ACTUAL rewritten content written as the candidate's own text. "
            f"Write the complete improved version directly. DO NOT include meta-instructions like 'Clarify X' or 'Add Y'. "
            f"The 'suggested' field is ready-to-use content, not instructions.\n"
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

    # Determine title example based on whether company_name is provided
    json_output_parts = [
        '  "title": "Hello [Company Name]!",',
        '  "confidence_score": 85,',
        '  "fit_analysis": "markdown-formatted",',
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

    if has_skills_section:
        comma = "," if has_any_after_skills else ""
        json_output_parts.append(
            f'  "skills": {{"Programming Languages": [{{"skill": "X", "reasoning": "Y"}}], "Soft Skills": []}}{comma}'
        )
    else:
        comma = "," if has_any_after_skills else ""
        json_output_parts.append(f'  "skills": {{}}{comma}')

    # Only include professional_summary in JSON output if section is visible
    if has_professional_summary:
        comma = "," if has_any_after_summary else ""
        json_output_parts.append(
            f'  "professional_summary": {{"suggested_text": "...", "original_text": "...", "key_changes": ["..."], "html_diff": "<del>Original text</del><ins>Improved text</ins> with changes marked inline"}}{comma}'
        )

    # Shared JSON example for item-based sections (work_experience and education)
    # Show example with full suggestion (score < 50) and example with only score (score >= 50)
    item_suggestion_example = (
        '{"item_type": "low_score", "id": "work_1", "current_content_score": 45, '
        '"original": "- Old bullet point\\n- Another point", '
        '"suggested": "- Improved bullet point, with enhancements\\n- Another point", '
        '"reasoning": "...", '
        '"importance": "standard", '
        '"html_diff": "- <del>Old</del><ins>Improved</ins> bullet point<ins>, with enhancements</ins>\\n- Another point"}, '
        '{"item_type": "high_score", "id": "work_2", "current_content_score": 85}'
    )

    # Add item-based sections dynamically
    item_sections = []
    if has_work_experience:
        item_sections.append("work_experience")
    if has_education:
        item_sections.append("education")

    for i, section_name in enumerate(item_sections):
        is_last = i == len(item_sections) - 1
        comma = "" if is_last else ","
        json_output_parts.append(
            f'  "{section_name}": [{item_suggestion_example}]{comma}'
        )

    # Add empty arrays for missing item-based sections
    if not has_work_experience:
        # Only add comma if education exists (will be added after this)
        comma = "," if has_education else ""
        json_output_parts.append(f'  "work_experience": []{comma}')
    if not has_education:
        # No comma needed - this is the last field
        json_output_parts.append('  "education": []')

    json_output_example = "\n".join(json_output_parts)

    # Build company name instruction based on whether it's provided
    if company_name:
        company_source = f'Company name: "{company_name}"'
    else:
        company_source = "Extract the company name from the job description"

    company_name_instruction = f"""   - {company_source}
   - If the company name contains an acronym (e.g., in parentheses like "Full Name (ACRONYM)"), extract and use ONLY the acronym in the title: "Hello [ACRONYM]!"
   - If no acronym is present, use an appropriate short form of the company name in the title
   - Throughout the fit_analysis, consistently refer to the company using the acronym or short name for brevity and natural flow"""

    return f"""TASKS:
1. Job Fit Analysis (write as candidate, first person):
{company_name_instruction}
   - confidence_score: 1-100 match quality based on transferable skills and authentic fit
   - fit_analysis: markdown, start with a concise introduction paragraph, then specific requirements with cover paragraphs.
   - CRITICAL: Cover ALL technical/experience requirements AND soft-skill/behavioral/mindset requirements from the job description, regardless of how they're organized in the JD.

   ⚠️ MANDATORY FORMATTING (NON-NEGOTIABLE):
   - Format the fit analysis into two sections: "## Introduction" and "## Your Requirements".
   - In the "Your Requirements" section, for each requirement, you MUST follow this EXACT format:
     \n
     **"[requirement text from job description]"**
    \n
     [cover paragraph explaining how the CV meet this requirement]
     \n

   - CRITICAL: There MUST be a blank line after each requirement quote and a blank line after each cover paragraph
   - Each requirement MUST be wrapped in **bold** WITH quotation marks: **"[requirement text]"**
   - Blank lines are REQUIRED for readability and do NOT count toward word limit
   - Word count: Maximum 200 words total (blank lines don't count)—count ONLY text words and ensure you stay within this limit.
   - CRITICAL: Write ENTIRELY in first person from the candidate's perspective. NEVER refer to "CV" directly, e.g. "My CV..." or "This CV...". Remember, you are the owner of the CV.
   - Be honest about gaps: "I don't have X but eager to learn" or "I bring Y transferable skills"
   - key_matches: Skills/experiences from CV that genuinely transfer to this role (focus on SUBSTANCE over keywords; can be empty)
   - missing_skills: up to 4 skills from the job requirements that the candidate doesn't have but should address or highlight transferable experience for
   - suggested_improvements: 1 to 5 coaching tips for presenting their story more confidently (clarity, authenticity, storytelling)
   - strengths: up to 4 specific strengths they bring to this role (transferable skills, authentic qualities)
   - weaknesses: up to 4 honest gaps or areas for growth (frame as development opportunities)

2. Optimization Suggestions:
{optimization_tasks_text}

REQUEST PAYLOAD:
CV: {cv_json}
Job: {job_description}

OUTPUT JSON:
{{
{json_output_example}
}}
"""


async def generate_ai_suggestions(
    cv_data: Dict[str, Any],
    job_description: str,
    user_id: Optional[str] = None,
    cv_id: Optional[str] = None,
    db_session: Optional[Session] = None,
    company_name: Optional[str] = None,
) -> Tuple[Dict[str, Any], Dict[str, Any], Dict[str, Any]]:
    """
    Generates job fit analysis and CV optimization suggestions via a single AI call.

    Parameters:
        cv_data (Dict[str, Any]): The parsed CV data as a dictionary.
        job_description (str): The job description text to analyze fit against.
        user_id (Optional[str], optional): The ID of the requesting user, if available.
        cv_id (Optional[str], optional): The ID of the CV being analyzed, if available.
        db_session (Optional[Session], optional): SQLAlchemy session for logging/tracking, if used.
        company_name (Optional[str], optional): The company name to use in the title. If provided, will be injected directly into the prompt instead of asking AI to extract it.

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

    # Split prompts by concern to improve maintenance and reasoning quality while
    # keeping the dynamic request payload concise and reducing instruction bloat.
    user_prompt = _build_ai_suggestions_prompt(cv_data, job_description, company_name)

    try:
        logger.info(
            f"Generating AI suggestions - user_id={user_id}, cv_id={cv_id}, operation=ai_suggestions"
        )

        # Single unified OpenAI call
        response, metadata = await call_openai_with_schema(
            system_prompt=AI_SUGGESTIONS_SYSTEM_PROMPT,
            developer_prompt=AI_SUGGESTIONS_DEVELOPER_PROMPT,
            user_prompt=user_prompt,
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
        has_professional_summary = bool(get_summary_custom_section(filtered_cv_data))

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
            "html_diff": "",
        }
        if has_professional_summary:
            professional_summary_response = response.get("professional_summary")
            if professional_summary_response:
                professional_summary_value = {
                    **professional_summary_response,
                    "html_diff": professional_summary_response.get("html_diff", ""),
                }

        # Process suggestions - schema guarantees correct structure
        work_experience_suggestions = response.get("work_experience", [])
        education_suggestions = response.get("education", [])

        # Filter out existing skills from suggestions (safety measure)
        raw_skills_response = response.get("skills", {})
        skills_data = filtered_cv_data.get("skills") or {}
        current_technical_skills = (
            skills_data.get("technical")
            if isinstance(skills_data.get("technical"), dict)
            else {}
        )
        raw_skills_by_category = (
            raw_skills_response if isinstance(raw_skills_response, dict) else {}
        )

        # Build one normalized set across all existing categories to prevent cross-category duplicates.
        current_technical_values = (
            current_technical_skills.values()
            if isinstance(current_technical_skills, dict)
            else []
        )
        existing_any_category = {
            _normalize_skill_name(skill)
            for values in current_technical_values
            if isinstance(values, list)
            for skill in values
            if isinstance(skill, str)
        }
        filtered_skills_response: Dict[str, List[Dict[str, Any]]] = {}
        for category, suggestions in raw_skills_by_category.items():
            if not isinstance(category, str) or not category.strip():
                continue
            if not isinstance(suggestions, list):
                continue
            filtered_category = _filter_existing_skills(
                suggestions,
                list(existing_any_category),
                category,
            )
            # Keep the dedupe set updated to avoid repeating suggestions in different categories.
            for suggestion in filtered_category:
                skill_name = suggestion.get("skill")
                if isinstance(skill_name, str) and skill_name.strip():
                    existing_any_category.add(_normalize_skill_name(skill_name))
            if filtered_category:
                filtered_skills_response[category.strip()] = filtered_category

        optimization_data = {
            "skills": filtered_skills_response,
            "professional_summary": professional_summary_value,
            "work_experience": work_experience_suggestions,
            "education": education_suggestions,
        }

        return job_fit_data, optimization_data, metadata

    except Exception as e:
        logger.error(f"Failed to generate AI suggestions: {str(e)}")
        raise RuntimeError(f"AI suggestions generation failed: {str(e)}")
