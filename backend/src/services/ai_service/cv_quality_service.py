"""
CV Quality Analysis AI Service.

Generates comprehensive quality analysis independent of job descriptions.
Single AI call returns all quality data.
"""

import json
import logging
from typing import Dict, Any, Tuple
from sqlalchemy.orm import Session

from src.schemas.cv_quality_schemas import CVQualityAnalysisResponseSchema
from src.utils.timeline_analyzer import analyze_timeline_gaps
from src.utils.html_diff_utils import clean_quality_response
from src.utils.cv_data_optimizer import optimize_cv_data_for_quality_analysis
from src.config import AIConfig
from .common import call_openai_with_schema, is_ai_enabled
from .cv_filter import filter_hidden_sections

logger = logging.getLogger(__name__)


def _build_cv_quality_prompt(cv_data: Dict[str, Any]) -> str:
    """
    Build user prompt for CV quality analysis (data only).

    Args:
        cv_data: Complete CV data dictionary

    Returns:
        Formatted user prompt string containing only CV data
    """
    # Filter hidden sections
    filtered_cv = filter_hidden_sections(cv_data)

    # Optimize for prompt (reduce token usage by 20-40%)
    optimized_cv = optimize_cv_data_for_quality_analysis(filtered_cv)

    # Minified JSON (no indentation, minimal separators for token efficiency)
    cv_json = json.dumps(optimized_cv, separators=(",", ":"))

    # User prompt: Only the CV data
    prompt = f"""CV DATA:
{cv_json}

Analyze this CV and provide quality feedback according to the instructions provided."""

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

    # Filter and optimize CV data for section detection
    filtered_cv = filter_hidden_sections(cv_data)
    optimized_cv = optimize_cv_data_for_quality_analysis(filtered_cv)

    # Extract sections for context (needed for system prompt)
    has_professional_summary = bool(
        optimized_cv.get("professional_summary", {}).get("content")
    )

    # Build user prompt (data only)
    prompt = _build_cv_quality_prompt(cv_data)

    # System prompt: Role + Principles + Tasks (behavioral instructions)
    system_prompt = f"""You are a professional career coach offering clear, constructive CV feedback. Prioritize clarity, professionalism, authenticity, and actionable advice. Always preserve the candidate's unique voice.

PRINCIPLES:
1. Use the CV's language. Limit reasoning to 30 words max.
2. CRITICAL: Suggested text must be final, ready-to-use content for the CV. NO placeholders like [brackets], NO instructions like "(add X)", NO templates. Write actual concrete text that can be used directly.
3. NO CORPORATE JARGON: Use plain words (e.g., "position" for "role", "used" for "leverage"/"utilize", "built"/"created" for "deliver").
4. Keep style (bullets, metrics, tone, Unicode).
5. Make only clearly helpful, non-redundant edits.

TASKS:

1. WRITING CORRECTIONS:
- Fix clear errors only. Mark importance (highly_recommended/standard). Match item_id.
- field_corrections: [{{"field_name":"position", "original_value":"Dev", "html_diff":"<del>Dev</del><ins>Developer</ins>"}}]
- Highlight all changes inline using HTML: <ins>insert</ins>, <del>delete</del>, <del>old</del><ins>new</ins>.
- CRITICAL: Properly escape HTML special characters in text: &amp; for &, &lt; for <, &gt; for >, &quot; for ", &#39; for '
- Example:
Original: "- Unchanged text\\n- text to remove\\n- Text missing punctuation"
HTML diff: "- Unchanged text<ins>.</ins>\\n<del>- text to remove\\n</del><ins>- text to add\\n</ins>- Text missing punctuation<ins>.</ins>"

2. PROFESSIONAL SUMMARY{"" if has_professional_summary else " (EMPTY - Generate new)"}:
- If missing: Write 2–4 CV-based sentences.
- If present: Suggest changes only for definite grammar, unclear messages, or weak impact.
- CRITICAL: If no changes are needed (original and suggested would be identical), return null for the entire professional_summary field.
- Add coaching_questions if brief/generic (only when suggesting changes).
- Use html_diff field with <del> and <ins> tags to show changes.

3. WORK EXPERIENCE & EDUCATION:
- Score each item 0–100.
- Only return items with score < 50 that need improvement: {{item_type: "low_score", item_id, section, quality_score, original, reasoning, html_diff, coaching_questions (optional - add to this object if content is brief)}}
- Do NOT return items with score ≥ 50 (they don't need improvement).
- html_diff must contain READY-TO-USE content in candidate's voice (not meta-instructions, not templates, not placeholders, not instructions).
- If original is empty, generate ready-to-use final content in html_diff that fits the item based on CV context, not templates.
- Use html_diff field with <del> and <ins> tags to show changes.

4. CONTENT COACHING:
- Flag vague/brief areas, missing context, or weak verbs.
- Give 1–3 coaching questions and 1–2 direct prompts per item.
- Categories: insufficient_content, too_brief, missing_impact, lacks_specificity, weak_action_verbs.
- Do not rewrite here.

5. SKILLS (optional):
- Suggest up to 10 technical and 5 soft skills (only if relevant/not listed) with a brief reason each.

6. OVERALL QUALITY SCORE (0–100):
- Score: writing, completeness, clarity, professionalism.

OUTPUT JSON matching CVQualityAnalysisResponseSchema structure.
- professional_summary can be null if no changes are needed (this is valid per the schema)."""

    logger.info(
        f"Generating CV corrections and feedback - user_id={user_id}, cv_id={cv_id}"
    )

    try:
        # Single AI call with configurable verbosity
        response, metadata = await call_openai_with_schema(
            system_prompt=system_prompt,
            user_prompt=prompt,
            response_schema=CVQualityAnalysisResponseSchema,
            user_id=user_id,
            cv_id=cv_id,
            operation_type="cv_quality_analysis",
            db_session=db_session,
            text_verbosity=AIConfig.CV_QUALITY_VERBOSITY,
        )

        # Post-process to clean html_diff strings
        response = clean_quality_response(response)

        # Detect timeline gaps (rule-based, not AI)
        timeline_gaps = analyze_timeline_gaps(cv_data)
        response["timeline_gaps"] = timeline_gaps

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
