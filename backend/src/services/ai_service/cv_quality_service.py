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
from src.utils.markdown_diff_utils import clean_quality_response
from .common import call_openai_with_schema, is_ai_enabled
from .cv_filter import filter_hidden_sections

logger = logging.getLogger(__name__)


def _build_cv_quality_prompt(cv_data: Dict[str, Any]) -> str:
    """
    Build AI prompt for CV quality analysis.

    Args:
        cv_data: Complete CV data dictionary

    Returns:
        Formatted prompt string for OpenAI
    """
    # Filter hidden sections
    filtered_cv = filter_hidden_sections(cv_data)

    # Extract sections for context
    has_professional_summary = bool(
        filtered_cv.get("professional_summary", {}).get("content")
    )
    has_work_experience = bool(filtered_cv.get("work_experience", []))
    has_education = bool(filtered_cv.get("education", []))
    has_skills = bool(
        filtered_cv.get("skills", {}).get("technical")
        or filtered_cv.get("skills", {}).get("soft")
    )

    cv_json = json.dumps(filtered_cv, indent=2)

    prompt = f"""Analyze CV quality and provide coaching to improve clarity, professionalism, and impact.

CRITICAL PRINCIPLES:
1. Write in SAME LANGUAGE as CV
2. Be BRIEF and CONCISE - maximum 30 words per reasoning field
3. Use HUMAN COACH voice, not corporate recruiter tone
4. Use SIMPLE language, avoid corporate jargon (never: "role", "leverage", "utilize", "synergize")
5. RESPECT candidate's writing style (bullets vs paragraphs, metrics usage), wording (technical, academic, simple), tone (formal, casual, friendly)
6. Preserve ALL Unicode characters exactly
7. MINIMAL CHANGES: Only suggest when there's CLEAR, SUBSTANTIAL benefit
8. Remove redundant phrases that don't add meaning or value (e.g., "very unique", "completely finished")

CV DATA:
{cv_json}

YOUR TASKS:

1. WRITING CORRECTIONS (grammar, typos, punctuation, unprofessional language, profanity):
   - Identify clear errors only (not style preferences)
   - Categorize importance: highly_recommended (critical errors) or standard
   - CRITICAL: item_id MUST exactly match an actual CV item ID from CV DATA (work_experience or education item IDs)

   ALL FIELD CORRECTIONS (company, position, institution, degree, location, description, etc.):
      - Use field_corrections array with separate entries for each field
      - Each entry MUST include: field_name, original_value, corrected_value, and markdown_diff
      - markdown_diff is REQUIRED for visual display
      - corrected_value is used by the user to apply the correction
      - Example for correcting company, position, and description:
        field_corrections: [
          {{"field_name": "company", "original_value": "Acme Inc", "corrected_value": "Acme Corporation", "markdown_diff": "~~Acme Inc~~ **Acme Corporation**"}},
          {{"field_name": "position", "original_value": "Dev", "corrected_value": "Senior Developer", "markdown_diff": "~~Dev~~ **Senior Developer**"}},
          {{"field_name": "description", "original_value": "Led a team in developing web applications", "corrected_value": "Led team of 5 engineers in developing scalable web applications", "markdown_diff": "Led ~~a team~~ **team of 5 engineers** in developing **scalable** web applications"}}
        ]
      - Field names must match actual CV data field names (company, position, institution, degree, location, description, start_date, end_date, etc.)
      - original_value and corrected_value must be the actual field values, not formatted strings with labels
      - For description fields, markdown_diff shows the COMPLETE corrected text with inline change markers using ~~strikethrough~~ and **bold** markers

2. PROFESSIONAL SUMMARY{"" if has_professional_summary else " (EMPTY - Generate new)"}:
   - If empty: Generate new 2-4 sentence professional summary using only the information from the CV
   - If exists: Only suggest changes for CLEAR issues (grammar, unclear messaging, weak impact)
   - Preserve original structure and key phrases
   - Return NULL if no changes needed
   - Include coaching_questions if content insufficient (too brief, too generic, etc)

3. WORK EXPERIENCE & EDUCATION:
   - Evaluate quality_score (0-100) for EACH item
   - Score >= 50: Return {{item_type: "high_score", item_id, section, quality_score}} only
   - Score < 50: Return {{item_type: "low_score", item_id, section, quality_score, original, suggested, reasoning, markdown_diff}}
   - Suggested text must be READY-TO-USE in candidate's voice (not meta-instructions)
   - Include coaching_questions for items needing expansion (too brief, missing impact)

4. CONTENT COACHING (items needing MORE content, not fixes):
   - Identify items with: insufficient detail, vague statements, missing context, weak verbs
   - Provide 1-3 specific, contextual coaching questions per item
   - Optionally, include 1-2 direct suggestions like "Write more about your key responsibilities"
   - Issue categories: insufficient_content, too_brief, missing_impact, missing_achievements, lacks_specificity, missing_context, weak_action_verbs
   - NO rewritten content - only coaching questions and direct suggestions

5. SKILLS SUGGESTIONS (optional):
   - Suggest NEW technical skills (max 10)
   - Suggest NEW soft skills (max 5)
   - Only suggest if highly relevant to candidate's background and not already in the CV
   - Provide brief reasoning for each

6. OVERALL QUALITY SCORE (0-100):
   - Consider: writing quality, content completeness, clarity, professionalism
   - Be honest but encouraging

MARKDOWN DIFF FORMAT:
- Show COMPLETE suggested text with inline markers
- Use ~~strikethrough~~ for removed text
- Use **bold** for added text
- Mark ONLY changed portions, keep unchanged text plain

OUTPUT JSON matching CVQualityAnalysisResponseSchema structure.
"""

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

    # Build prompt
    prompt = _build_cv_quality_prompt(cv_data)

    system_prompt = (
        "You are a professional career coach providing constructive feedback to help candidates "
        "improve their CVs. Focus on clarity, professionalism, and authentic presentation. "
        "Be encouraging and specific. Use simple, human language. Respect the candidate's unique voice."
    )

    logger.info(
        f"Generating CV corrections and feedback - user_id={user_id}, cv_id={cv_id}"
    )

    try:
        # Single AI call
        response, metadata = await call_openai_with_schema(
            system_prompt=system_prompt,
            user_prompt=prompt,
            response_schema=CVQualityAnalysisResponseSchema,
            user_id=user_id,
            cv_id=cv_id,
            operation_type="cv_quality_analysis",
            db_session=db_session,
        )

        # Post-process to clean markdown_diff strings
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
