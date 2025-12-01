"""
AI suggestions service for job fit analysis and optimization.

This module generates job fit analysis and CV optimization suggestions
in a single AI call with token-optimized prompts.
"""

import json
import logging
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from src.schemas.ai_response_schemas import AISuggestionsResponseSchema

from .common import call_openai_with_schema, is_ai_enabled
from .cv_filter import filter_hidden_sections

logger = logging.getLogger(__name__)


def _extract_company_name_for_title(company_name: str) -> str:
    """
    Extract a shorter, more natural company name for use in titles.

    Handles cases like:
    - "Institute of Science and Technology Austria (ISTA)" -> "ISTA"
    - "International Business Machines (IBM)" -> "IBM"
    - "Microsoft Corporation" -> "Microsoft"
    - "Google LLC" -> "Google"

    Args:
        company_name: Full company name

    Returns:
        Shorter company name suitable for title use
    """
    # Check for acronym in parentheses: "Full Name (ACRONYM)"
    match = re.search(r"\(([A-Z]{2,})\)", company_name)
    if match:
        return match.group(1)

    # Remove common suffixes
    suffixes = ["Corporation", "Corp.", "Inc.", "LLC", "Ltd.", "Limited", "GmbH", "AG"]
    name = company_name
    for suffix in suffixes:
        # Match suffix at end of string (case insensitive)
        pattern = r"\s+" + re.escape(suffix) + r"$"
        name = re.sub(pattern, "", name, flags=re.IGNORECASE)

    # If still too long (>30 chars), try to extract first meaningful part
    if len(name) > 30:
        # Split by common separators and take first part
        parts = re.split(r"[,\s]+(?:of|and|&)\s+", name, maxsplit=1)
        if parts and len(parts[0]) < len(name):
            name = parts[0]

    return name.strip()


def _build_ai_suggestions_prompt(
    cv_data: Dict[str, Any], job_description: str, company_name: Optional[str] = None
) -> str:
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

    # ============================================================================
    # MARKDOWN DIFF FORMATTING INSTRUCTIONS
    # ============================================================================
    # This instruction applies to professional_summary, work_experience, and education
    # sections when they include markdown_diff fields.
    markdown_diff_instruction = (
        "Provide markdown_diff showing the COMPLETE suggested text with inline change markers. "
        "GOAL: Enable users to quickly see changes—single out ONLY changed parts, keep all unchanged text plain. "
        "CRITICAL: markdown_diff must contain EVERY word from 'suggested' field, but mark ONLY changed words/punctuation. "
        "Rules: Use ~~strikethrough~~ for removed text, **bold** for added text. "
        "Process: Compare word-by-word and punctuation-by-punctuation with 'original', mark only changed elements. "
        "Examples: '- Item one**, with addition**' (adding), "
        "'- Unchanged text and ~~old part~~**new part**' (partial change), "
        "'- Text with ~~Old~~**old** word' (capitalization), "
        "'Text ~~and~~**;** word unchanged' (punctuation change), "
        "'Start unchanged ~~and~~**;** middle ~~unchanged~~**changed** end' (multiple changes), "
        "'Start unchanged ~~and~~**, inserted text, and** end unchanged' (text insertion). "
        "WRONG: '~~Start unchanged Old Word~~**Start unchanged new word** end unchanged' (marks unchanged text—DO NOT DO THIS). "
        'Mark at word/punctuation level. Keep marking MINIMAL. If no changes, use empty string "".'
    )

    # Build conditional optimization instructions
    optimization_tasks = []
    if has_skills_section:
        optimization_tasks.append(
            "   - skills.technical: ONLY suggest skills candidate has actually used but may have undersold. NEVER suggest new skills they haven't used (max 10) with reasoning"
        )
        optimization_tasks.append(
            "   - skills.soft: Suggest soft skills that would help highlight their authentic strengths (max 5) with reasoning"
        )
    if has_professional_summary:
        optimization_tasks.append(
            f"   - professional_summary: Only suggest changes when there are clear issues: unclear messaging, weak impact, grammar errors, or factual problems. "
            "Preserve original structure and key phrases. Avoid unnecessary rephrasing. "
            "Stay close to original wording—only modify when the change addresses a concrete problem that significantly improves clarity or impact (2-4 sentences). "
            "If no changes needed, set professional_summary field to null. "
            f"See MARKDOWN DIFF FORMATTING INSTRUCTIONS section above for markdown_diff format requirements."
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
            f'   - Score < 50: {{"item_type": "low_score", "id": "...", "current_content_score": XX, "original": "...", "suggested": "...", "reasoning": "...", "importance": "standard", "markdown_diff": "..."}}\n'
            f"   \n"
            f"   Schema enforces this structure - you CANNOT include extra fields for high scores.\n"
            f"   Only suggest changes for score < 50 when there are clear issues: grammar errors, unclear messaging, missing impact, or factual errors. "
            f"Avoid scoring items low just because they are 'generic'—only mark as low_score when there are concrete problems that need fixing.\n"
            f"   \n"
            f"   CRITICAL: The 'suggested' field must contain the ACTUAL rewritten content written as the candidate's own text. "
            f"Write the complete improved version directly. DO NOT include meta-instructions like 'Clarify X' or 'Add Y'. "
            f"The 'suggested' field is ready-to-use content, not instructions.\n"
            f"   See MARKDOWN DIFF FORMATTING INSTRUCTIONS section above for markdown_diff format requirements."
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
            f'  "skills": {{"technical": [{{"skill": "X", "reasoning": "Y"}}], "soft": []}}{comma}'
        )
    else:
        comma = "," if has_any_after_skills else ""
        json_output_parts.append(f'  "skills": {{"technical": [], "soft": []}}{comma}')

    # Only include professional_summary in JSON output if section is visible
    if has_professional_summary:
        comma = "," if has_any_after_summary else ""
        json_output_parts.append(
            f'  "professional_summary": {{"suggested_text": "...", "original_text": "...", "key_changes": ["..."], "markdown_diff": "~~Original text~~**Improved text** with changes marked inline"}}{comma}'
        )

    # Shared JSON example for item-based sections (work_experience and education)
    # Show example with full suggestion (score < 50) and example with only score (score >= 50)
    item_suggestion_example = (
        '{"item_type": "low_score", "id": "work_1", "current_content_score": 45, '
        '"original": "- Old bullet point\\n- Another point", '
        '"suggested": "- Improved bullet point**, with enhancements**\\n- Another point", '
        '"reasoning": "...", '
        '"importance": "standard", '
        '"markdown_diff": "- ~~Old~~**Improved** bullet point**, with enhancements**\\n- Another point"}, '
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
        # Extract shorter name for title (e.g., "ISTA" from "Institute of Science and Technology Austria (ISTA)")
        short_company_name = _extract_company_name_for_title(company_name)
        company_name_instruction = f'   - Use the company name "{short_company_name}" in the title: "Hello {short_company_name}!"'
    else:
        company_name_instruction = '   - Extract the company name from the job description and use it in the title: "Hello [Company Name]!"'

    return f"""Analyze CV fit for position and suggest improvements.

⚠️ LANGUAGE: Write ALL content in SAME LANGUAGE as job description.

⚠️ WRITING STYLE:
- Be brief and concise—avoid unnecessary words and phrases.
- Write like a human coach, not a corporate recruiter. Use simple language, avoid corporate jargon.
- Use phrases like 'position' or 'job' instead of corporate jargons like 'role'.
- Respect the candidate's existing writing STYLE: observe their CV—only suggest metrics if they already use them. If CV uses bullets, suggest bullets except when there is only one item. If CV has no metrics, don't add metrics.
- Write naturally: avoid hyphenated compounds like "multi-year" and "data-pipeline"—use separate words or rephrase for a conversational, human tone.
- Avoid overusing the pronoun "I"—vary sentence structure and use active voice to reduce repetition. Example: Instead of "I developed a system. I implemented features. I managed the team.", use "Developed a system, implementing key features while managing the team."

⚠️ MINIMAL CHANGES PRINCIPLE (CRITICAL):
- Only suggest changes when there is a CLEAR, SUBSTANTIAL benefit: fixing grammar errors, clarifying unclear messaging, adding missing impact, or correcting factual issues.
- AVOID cosmetic changes: synonym swapping (e.g., "developed" → "created"), minor rephrasing, style tweaks, or changes that don't address concrete problems.
- Stay CLOSE to original wording—preserve the candidate's voice and authentic expression. Don't change words just to sound "better" or more polished.
- When in doubt, keep the original text unchanged. Only modify when the change addresses a specific, concrete issue that significantly improves clarity, correctness, or impact.
- Preserve original structure, key phrases, and the candidate's natural writing style unless there's a compelling reason to change them.
- CRITICAL: Preserve ALL Unicode characters exactly as they appear in the original CV text (e.g., apostrophes, quotes, dashes). Do not modify or corrupt Unicode characters.

⚠️ CAREER COACHING APPROACH:
- Provide DETAILED and CONCRETE reasoning for ALL suggestions—explain WHY each suggestion helps. Quote specific CV phrases when explaining issues. Reference actual job IDs, dates, or company names.
- Count keyword usage across ALL suggestions. If 'Docker' appears twice, don't use it again. Each keyword should appear at most 2 times over all suggestions.
- Focus on TRANSFERABLE SKILLS from the CV, not keywords from the job description, unless they are explicitly mentioned in the CV
- Try to connect skills mentioned in the job description with the skills mentioned in the CV. E.g. if the job description mentions "AWS", try to find a skill that is related to deployment, scaling, etc
- FACT-BASED ONLY: For work_experience/education suggestions, only reference technologies/skills explicitly in each item's data. Never add technologies not listed in that item's 'technologies' array. NEVER suggest skills/technologies candidate hasn't used. Only highlight existing skills they may have undersold.

CV: {cv_json}
Job: {job_description}

⚠️ MARKDOWN DIFF FORMATTING INSTRUCTIONS:
{markdown_diff_instruction}

TASKS:
1. Job Fit Analysis (write as candidate, first person):
{company_name_instruction}
   - confidence_score: 1-100 match quality based on transferable skills and authentic fit
   - fit_analysis: markdown, start with a concise introduction paragraph, then specific requirements with cover paragraphs. CRITICAL: Maximum 200 words total—count words and ensure you stay within this limit.
   - Format the fit analysis into two sections: "## Introduction" and "## Your Requirements".
   - In the "Your Requirements" section, for each requirement, quote the requirement text from the job description and write the cover paragraph below it.
   - CRITICAL: Each requirement quote MUST be wrapped in **bold** markdown WITH quotation marks: **"[requirement text]"**
     The format is: double asterisk, double quote, requirement text, double quote, double asterisk.
     Example: **"Refactor and modularize existing scientific software"** (NOT **Refactor and modularize existing scientific software**)
   - Example format for each requirement-cover paragraph pair: **"[requirement]"** followed by a blank line, then [experience paragraph], then another blank line.
   - CRITICAL: Write ENTIRELY in first person from the candidate's perspective. NEVER refer to "CV" directly, e.g. "My CV..." or "This CV...". Remember, you are the owner of the CV.
   - Be honest about gaps: "I don't have X but eager to learn" or "I bring Y transferable skills"
   - key_matches: Skills/experiences from CV that genuinely transfer to this role (focus on SUBSTANCE over keywords; can be empty)
   - missing_skills: up to 4 skills from the job requirements that the candidate doesn't have but should address or highlight transferable experience for
   - suggested_improvements: 1 to 5 coaching tips for presenting their story more confidently (clarity, authenticity, storytelling)
   - strengths: up to 4 specific strengths they bring to this role (transferable skills, authentic qualities)
   - weaknesses: up to 4 honest gaps or areas for growth (frame as development opportunities)

2. Optimization Suggestions:
{optimization_tasks_text}

OUTPUT JSON:
{{
{json_output_example}
}}

- suggested_improvements, strengths, weaknesses must have ≥1 value.
- key_matches can be empty.
- First focus on writing issues, e.g. grammar, punctuation, etc. Then focus on semantics.
- In your reasoning, provide accurate explanation of why the existing content is not good enough. Quote the specific parts of the CV that you are referring to.
- CRITICAL for 'suggested' field: Write the ACTUAL improved content as the candidate's own text. DO NOT write instructions like 'Clarify X' or 'Add Y'. The 'reasoning' field explains what to improve; the 'suggested' field is the actual rewritten text ready to use.
- Be as specific as possible. Be very brief, concise and to the point. Reasoning fields: maximum 30 words each.
- CRITICAL: Only suggest changes when there's a clear, substantial benefit. Avoid cosmetic modifications, synonym swapping, or unnecessary rephrasing.
- For professional_summary: If no changes needed, set the field to null. If changes exist, include markdown_diff with the diff string.
- CRITICAL for work_experience and education: Include ALL items with their current_content_score. Use item_type="high_score" for score >= 50 (only id and score). Use item_type="low_score" for score < 50 with clear issues (all suggestion fields). The schema will reject responses that don't follow this format.
- CRITICAL for markdown_diff: See MARKDOWN DIFF FORMATTING INSTRUCTIONS section above. Must show the COMPLETE suggested text with INLINE change markers only. Mark ONLY changed portions, keep unchanged text plain. NEVER mark entire lines—only wrap changed words/phrases.
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

    # Build token-optimized prompt
    prompt = _build_ai_suggestions_prompt(cv_data, job_description, company_name)

    try:
        logger.info(
            f"Generating AI suggestions - user_id={user_id}, cv_id={cv_id}, operation=ai_suggestions"
        )

        system_prompt = (
            "You are a supportive career coach helping candidates present their authentic experience confidently."
            "Focus on transferable skills and genuine fit over keyword matching."
            "CRITICAL: Only suggest changes when there is a clear, substantial benefit—avoid cosmetic changes, synonym swapping, or unnecessary rephrasing."
            "Stay close to the original wording and preserve the candidate's voice. Only modify text when it addresses concrete issues like grammar errors, unclear messaging, or missing impact."
            "Be encouraging, honest, and help them tell their story well."
        )

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

        # Debug log: Print entire AI response
        logger.info("=" * 80)
        logger.info("AI SUGGESTION GENERATION RESPONSE")
        logger.info("=" * 80)
        logger.info(f"RESPONSE:\n{json.dumps(response, indent=2)}")
        logger.info("=" * 80)

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
            "markdown_diff": "",
        }
        if has_professional_summary:
            professional_summary_response = response.get("professional_summary")
            if professional_summary_response:
                professional_summary_value = {
                    **professional_summary_response,
                    "markdown_diff": professional_summary_response.get(
                        "markdown_diff", ""
                    ),
                }

        # Process suggestions - schema guarantees correct structure
        work_experience_suggestions = response.get("work_experience", [])
        education_suggestions = response.get("education", [])

        optimization_data = {
            "skills": response.get("skills", {"technical": [], "soft": []}),
            "professional_summary": professional_summary_value,
            "work_experience": work_experience_suggestions,
            "education": education_suggestions,
        }

        return job_fit_data, optimization_data, metadata

    except Exception as e:
        logger.error(f"Failed to generate AI suggestions: {str(e)}")
        raise RuntimeError(f"AI suggestions generation failed: {str(e)}")
