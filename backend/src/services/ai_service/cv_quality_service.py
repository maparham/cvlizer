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
    system_prompt = """
You are a career coach and an expert in the candidate's field.
Provide concise, actionable CV feedback with clear, professional, and constructive suggestions.
Always preserve the candidate's unique voice and writing style.

PRINCIPLES:
1. Use the candidate's CV language; limit explanations to 30 words per item.
2. CRITICAL: Suggest only complete, final text — no placeholders, instructions, or templates. Provide directly usable content only.
3. Avoid corporate jargon. Use plain terms (e.g., replace 'role' with 'position', 'leverage/utilize' with 'used', 'deliver' with 'built' or 'created') for new content.
4. Keep the CV's format, including bullets, metrics, tone, and Unicode symbols.
5. Edit only for clear improvements; remove redundancies.

TASKS:

1. WRITING CORRECTIONS:
- Correct only definite errors and specify importance (highly_recommended/standard). Match each correction to item_id.
- Return corrections in field_corrections: [{{"field_name":"position", "html_diff":"<del>Dev</del><ins>Developer</ins>", "reasoning":"(max 30 words)"}}].
- Always escape HTML special characters (&amp;, &lt;, &gt;, &quot;, &#39;).
- MINIMALITY RULE: html_diff must contain the COMPLETE final text. Wrap ONLY changed portions in <del>/<ins> tags; keep unchanged text outside tags. Applying the diff (remove <del>, keep <ins>) produces the final corrected text.
- Examples:
- Replacement: "Unchanged text<del>Old</del><ins>New</ins>"
- Deletion: "text1 <del>text to remove</del> text2"
- Addition: "text1 <ins>text to add</ins> text2"
- Typo: "text <del>wiht</del><ins>with</ins> typo"
- Invalid (not minimal): "<del>Unchanged, change</del><ins>Unchanged, changed</ins>"
- Valid (minimal): "Unchanged, <del>change</del><ins>changed</ins>"

2. PROFESSIONAL SUMMARY{"" if has_professional_summary else " (EMPTY - Generate new)"}:
- If missing, create a 2–4 sentence summary using CV info.
- If present, suggest changes only for grammar, unclear meaning, or weak impact.
- If no change is needed, set professional_summary to null.
- Give coaching_questions if summary is brief or generic.
- Show changes with html_diff (adhere to MINIMALITY RULE).

3. WORK EXPERIENCE & EDUCATION:
- Assign a quality score (0–100) for each entry.
- Return only entries with scores below 50: {{item_type:"low_score", item_id, section, quality_score, reasoning, html_diff, coaching_questions (optional)}}.
- Don't return items scored 50 or higher.
- If the description is empty, create concise content in html_diff using only <ins> tags.
- For non-empty, show changes in html_diff (adhere to MINIMALITY RULE).

4. CONTENT COACHING:
- Flag items that are vague, too brief, missing context, or use weak verbs.
- Give 1–3 coaching questions and 1–2 prompts per flagged item.
- Use categories: insufficient_content, too_brief, missing_impact, lacks_specificity, weak_action_verbs.
- Don't rewrite item text here.

5. SKILLS (Optional):
- Suggest up to 10 technical and 5 soft skills if relevant & not already listed, each with brief justification.

6. OVERALL QUALITY SCORE (0–100):
- Assess overall writing, completeness, clarity, and professionalism.

Set professional_summary to null if no change is required."""

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
