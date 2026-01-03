"""
CV Quality Analysis AI Service.

Generates comprehensive quality analysis independent of job descriptions.
Single AI call returns all quality data.
"""

import json
import logging
from typing import Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session

from src.schemas.cv_quality_schemas import (
    CVQualityAnalysisAIResponseSchema,
    CVQualityAnalysisResponseSchema,
)
from src.utils.timeline_analyzer import analyze_timeline_gaps
from src.utils.html_diff_utils import (
    clean_quality_response,
    extract_original_from_cv_data,
)
from src.utils.cv_data_optimizer import optimize_cv_data_for_quality_analysis
from src.config import AIConfig
from .common import call_openai_with_schema, is_ai_enabled
from .cv_filter import filter_hidden_sections

logger = logging.getLogger(__name__)


def _build_cv_quality_user_prompt(
    cv_data: Dict[str, Any],
) -> Tuple[str, Dict[str, Dict[str, str]]]:
    """
    Build the user prompt portion for CV quality analysis.

    This function only builds the user prompt (CV data), not the complete prompt.
    The system prompt (instructions, principles, tasks) is built separately
    in generate_cv_corrections_and_feedback.

    Args:
        cv_data: Complete CV data dictionary

    Returns:
        Tuple of (prompt_string, id_mapping) where:
        - prompt_string: Formatted user prompt string containing only CV data
        - id_mapping: Dictionary mapping section names to {short_id: actual_id} mappings
    """
    # Filter hidden sections
    filtered_cv = filter_hidden_sections(cv_data)

    # Optimize for prompt (reduce token usage by 30-50%)
    optimized_cv, id_mapping = optimize_cv_data_for_quality_analysis(filtered_cv)

    # Minified JSON (no indentation, minimal separators for token efficiency)
    cv_json = json.dumps(optimized_cv, separators=(",", ":"))

    # User prompt: Only the CV data
    prompt = f"CV DATA: {cv_json}"

    return prompt, id_mapping


async def generate_cv_corrections_and_feedback(
    cv_data: Dict[str, Any],
    user_id: str,
    cv_id: str,
    db_session: Session,
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """
    Generate comprehensive CV corrections and feedback.

    Generates writing corrections, content coaching, quality suggestions,
    skills recommendations, and overall quality score.

    Args:
        cv_data: Complete CV data dictionary
        user_id: User ID for logging
        cv_id: CV ID for logging
        db_session: Database session for AI usage logging

    Returns:
        Tuple of (quality_data, metadata)
    """
    if not is_ai_enabled():
        raise RuntimeError("AI features are not enabled")

    # Build user prompt (data only) and get ID mapping
    prompt, id_mapping = _build_cv_quality_user_prompt(cv_data)

    # System prompt: Role + Instructions + Tasks (behavioral instructions)
    system_prompt = """# Role
Career coach with field expertise. Provide concise, actionable CV feedback that preserves the candidate's voice.

# Instructions
- Use candidate's CV language. Limit feedback to 30 words.
- Suggest complete, final text only—no placeholders.
- Avoid jargon (use 'position' not 'role', 'used' not 'leverage', 'built' not 'deliver').
- Preserve bullets, metrics, tone, Unicode.
- Edit only for clear improvements.

## Writing Corrections
- Correct errors and unprofessional language only. Specify importance (highly_recommended/standard) per item_id.
- Do not include professional_summary in writing_corrections.
- Return: field_corrections: [{"field_name":"position", "html_diff":"<del>Dev</del><ins>Developer</ins>", "reasoning":"(max 30 words)"}].
- Escape HTML: &amp;, &lt;, &gt;, &quot;, &#39;.
- MINIMALITY RULE: html_diff has complete new text; wrap only changed parts in <del>/<ins>. Examples:
- Examples:
    - Replacement: "Unchanged text<del>Old</del><ins>New</ins>"
    - Deletion: "text1 <del>text to remove</del> text2"
    - Addition: "text1 <ins>text to add</ins> text2"
    - Typo: "text <del>wiht</del><ins>with</ins> typo"
    - Invalid: "<del>Unchanged, change</del><ins>Unchanged, changed</ins>"
    - Valid: "Unchanged, <del>change</del><ins>changed</ins>"

## Professional Summary
- If missing: generate 2–4 sentences. If present: adjust only for grammar/clarity/impact.
- Never do complete rewrites. Always preserve original structure, format, length, and organization.
- For unprofessional content: replace ONLY problematic phrases/sentences with professional alternatives. Keep all unchanged content as-is. Use MINIMALITY RULE. Maintain same bullet points, sections, headers, and approximate word count.
- Set to null if unchanged.

## Work Experience & Education
- Score each (0–100). Include only scores <50: {item_type:"low_score", item_id, section, quality_score, reasoning, html_diff, coaching_questions?}.
- Empty descriptions: generate content with <ins> only. Others: apply MINIMALITY RULE.

## Content Coaching
- Flag vague/brief/missing context/weak verbs. Provide 1–3 questions and 1–2 prompts per entry.
- Categories: insufficient_content, too_brief, missing_impact, lacks_specificity, weak_action_verbs.
- Do not rewrite text.

## Skills (Optional)
- Suggest up to 10 technical and 5 soft skills with brief justification if relevant and not already present.

## Overall Quality Score (0–100)
- Evaluate writing, completeness, clarity, professionalism.

Set professional_summary to null if unchanged."""

    logger.info(
        f"Generating CV corrections and feedback - user_id={user_id}, cv_id={cv_id}"
    )

    try:
        # Single AI call with configurable verbosity (using AI-only schema)
        response, metadata = await call_openai_with_schema(
            system_prompt=system_prompt,
            user_prompt=prompt,
            response_schema=CVQualityAnalysisAIResponseSchema,
            user_id=user_id,
            cv_id=cv_id,
            operation_type="cv_quality_analysis",
            db_session=db_session,
            text_verbosity=AIConfig.CV_QUALITY_VERBOSITY,
        )

        # Extract original description from CV data for each item
        # Map short IDs back to actual IDs and extract original values
        response = extract_original_from_cv_data(response, cv_data, id_mapping)

        # Post-process to clean html_diff strings and compute derived fields
        response = clean_quality_response(response)

        # Detect timeline gaps (rule-based, not AI)
        timeline_gaps = analyze_timeline_gaps(cv_data)
        response["timeline_gaps"] = timeline_gaps

        # Convert to full schema to ensure type safety and add computed fields
        response = CVQualityAnalysisResponseSchema(**response).model_dump()

        logger.info(
            f"CV corrections and feedback complete - "
            f"score={response.get('overall_quality_score')}, "
            f"tokens={metadata['tokens_used']}, "
            f"gaps={len(timeline_gaps)}"
        )

        return response, metadata

    except Exception as e:
        logger.error(f"Failed to generate CV corrections and feedback: {str(e)}")
        raise RuntimeError(f"CV corrections and feedback failed: {str(e)}")
