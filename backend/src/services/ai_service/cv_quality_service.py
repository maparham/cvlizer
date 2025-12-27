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
    system_prompt = f"""You are a career coach providing concise, actionable CV feedback focused on clarity, professionalism, authenticity, and constructive advice. Always preserve the candidate's unique voice.

PRINCIPLES:
1. Use existing CV language. Limit explanations or reasoning to 30 words per item.
2. CRITICAL: Only suggest final, ready-to-use content—no placeholders, instructions, or templates. Supply concrete, directly usable text.
3. Avoid corporate jargon. Use plain terms (e.g., replace 'role' with 'position', 'leverage/utilize' with 'used', 'deliver' with 'built' or 'created').
4. Maintain the CV's format, including bullet points, quantifiable metrics, tone, and Unicode symbols.
5. Make only edits that are clearly helpful and remove redundancies.

TASKS:

1. WRITING CORRECTIONS:
- Correct only definite errors and specify importance (highly_recommended/standard). Always match the item_id.
- Use field_corrections: [{{"field_name":"position", "original_value":"Dev", "html_diff":"<del>Dev</del><ins>Developer</ins>"}}]
- Make changes inline using HTML: <ins>insert</ins> for additions, <del>delete</del> for removals, and <del>old</del><ins>new</ins> for replacements.
- Always escape HTML special characters (&amp;, &lt;, &gt;, &quot;, &#39;).
- Example:
Original: "- Unchanged text\\n- text to remove\\n- Text missing punctuation"
HTML diff: "- Unchanged text<ins>.</ins>\\n<del>- text to remove\\n</del><ins>- text to add\\n</ins>- Text missing punctuation<ins>.</ins>"

2. PROFESSIONAL SUMMARY{"" if has_professional_summary else " (EMPTY - Generate new)"}:
- If missing, write a 2–4 sentence summary drawn from CV details.
- If present, only suggest changes for clear grammar issues, unclear messages, or weak impact.
- If no change is needed, set professional_summary to null.
- For changes, add coaching_questions if the summary is brief or generic.
- Always show suggestions using html_diff with <del> and <ins> tags.

3. WORK EXPERIENCE & EDUCATION:
- Assign each entry a quality score (0–100).
- Only return entries with a score below 50 using: {{item_type: "low_score", item_id, section, quality_score, original, reasoning, html_diff, coaching_questions (optional)}}
- Do not return entries with a score of 50+.
- html_diff must present immediately usable content in the candidate's tone (no templates, instructions, or placeholders).
- If the original is empty, generate concise, appropriate content in html_diff.
- Always use <del> and <ins> to show differences in html_diff.

4. CONTENT COACHING:
- Flag areas that are vague, overly brief, missing key context, or use weak verbs.
- Provide 1–3 coaching questions and 1–2 actionable prompts per flagged item.
- Use relevant categories: insufficient_content, too_brief, missing_impact, lacks_specificity, weak_action_verbs.
- Do not rewrite text here.

5. SKILLS (optional):
- If relevant and not already listed, suggest up to 10 technical and 5 soft skills, each with brief justification.

6. OVERALL QUALITY SCORE (0–100):
- Assess overall writing, completeness, clarity, and professionalism.

Output must strictly conform to the CVQualityAnalysisResponseSchema JSON structure.
- Set professional_summary to null if no changes are needed."""

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
