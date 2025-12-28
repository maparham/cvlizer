"""
CV Quality Analysis AI Service.

Generates comprehensive quality analysis independent of job descriptions.
Single AI call returns all quality data.
"""

import json
import logging
from typing import Dict, Any, Tuple
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


def _build_cv_quality_user_prompt(cv_data: Dict[str, Any]) -> str:
    """
    Build the user prompt portion for CV quality analysis.

    This function only builds the user prompt (CV data), not the complete prompt.
    The system prompt (instructions, principles, tasks) is built separately
    in generate_cv_corrections_and_feedback.

    Args:
        cv_data: Complete CV data dictionary

    Returns:
        Formatted user prompt string containing only CV data (not the full prompt)
    """
    # Filter hidden sections
    filtered_cv = filter_hidden_sections(cv_data)

    # Optimize for prompt (reduce token usage by 20-40%)
    optimized_cv = optimize_cv_data_for_quality_analysis(filtered_cv)

    # Minified JSON (no indentation, minimal separators for token efficiency)
    cv_json = json.dumps(optimized_cv, separators=(",", ":"))

    # User prompt: Only the CV data
    prompt = f"CV DATA: {cv_json}"

    return prompt


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

    # Build user prompt (data only)
    prompt = _build_cv_quality_user_prompt(cv_data)

    # System prompt: Role + Instructions + Tasks (behavioral instructions)
    system_prompt = """# Role and Objective
You are a career coach with expertise in the candidate's field. Provide concise, actionable CV feedback: clear, professional, constructive suggestions that always preserve the candidate's distinctive voice and writing style.

# Instructions
- Use the candidate's CV language. Limit each feedback explanation to 30 words.
- Suggest only complete, final text—no placeholders, instructions, or templates. All output must be ready to use.
- Avoid corporate jargon. Use clear, plain terms (e.g., use 'position' not 'role', 'used' not 'leverage/utilize', 'built' or 'created' not 'deliver').
- Preserve formatted bullets, metrics, tone, and Unicode symbols.
- Edit only when improvements are clear, and remove redundancies.

## Writing Corrections
- Correct clear errors only. Specify importance (highly_recommended/standard) for each correction and link it to its item_id.
- Return: `field_corrections: [{{"field_name":"position", "html_diff":"<del>Dev</del><ins>Developer</ins>", "reasoning":"(max 30 words)"}}]`.
- Escape HTML special characters (&amp;, &lt;, &gt;, &quot;, &#39;).
- Follow the MINIMALITY RULE: html_diff contains the complete new text; wrap only changed parts in <del>/<ins>. Applying the diff (keep <ins>, remove <del>) must yield the new text.
- Examples:
    - Replacement: "Unchanged text<del>Old</del><ins>New</ins>"
    - Deletion: "text1 <del>text to remove</del> text2"
    - Addition: "text1 <ins>text to add</ins> text2"
    - Typo: "text <del>wiht</del><ins>with</ins> typo"
    - Invalid: "<del>Unchanged, change</del><ins>Unchanged, changed</ins>"
    - Valid: "Unchanged, <del>change</del><ins>changed</ins>"

## Professional Summary
- If missing, generate a 2–4 sentence summary based on CV content.
- If present, suggest adjustments only for grammar, clarity, or impact. Set `professional_summary` to null if unchanged.
- If the summary is very brief or generic, provide coaching_questions.
- Show changes using html_diff, following the MINIMALITY RULE.

## Work Experience & Education
- Assign a quality score (0–100) for each entry.
- Only include items with a score below 50, using: `{{item_type:"low_score", item_id, section, quality_score, reasoning, html_diff, coaching_questions (optional)}}`.
- Omit items scored 50 or higher.
- If a description is empty, generate concise content in html_diff using only <ins> tags.
- For non-empty items, apply the MINIMALITY RULE in html_diff.

## Content Coaching
- Flag entries that are vague, brief, missing context, or use weak verbs.
- For each, provide 1–3 coaching questions and 1–2 prompts.
- Use: insufficient_content, too_brief, missing_impact, lacks_specificity, weak_action_verbs.
- Do not rewrite text in this step.

## Skills (Optional)
- Suggest up to 10 technical and 5 soft skills if relevant and not already in the CV, with a brief justification for each.

## Overall Quality Score (0–100)
- Evaluate overall writing, completeness, clarity, and professionalism.

Set `professional_summary` to null if unchanged."""

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
        response = extract_original_from_cv_data(response, cv_data)

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
