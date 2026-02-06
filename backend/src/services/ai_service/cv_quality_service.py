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
    CVQualityAnalysisAIResponseSchemaWritingOnly,
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
from .cv_quality_prompts import build_system_prompt

logger = logging.getLogger(__name__)


def _cv_quality_prompt_ref(correction_mode: str) -> Dict[str, Any]:
    """Build prompt_ref for CV quality (id + version only when set). Coach mode uses coach prompt ID."""
    is_coach = correction_mode == "coaching"
    prompt_id = (
        AIConfig.CV_QUALITY_COACH_PROMPT_ID.strip()
        if is_coach
        else AIConfig.CV_QUALITY_PROMPT_ID.strip()
    )
    version_str = (
        (AIConfig.CV_QUALITY_COACH_PROMPT_VERSION or "").strip()
        if is_coach
        else (AIConfig.CV_QUALITY_PROMPT_VERSION or "").strip()
    )
    ref: Dict[str, Any] = {"id": prompt_id}
    if version_str:
        ref["version"] = version_str
    return ref


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
    correction_mode: str = "proofread",
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
        correction_mode: 'proofread' for spelling/grammar only,
                        'coaching' to also fix unprofessional content

    Returns:
        Tuple of (quality_data, metadata)
    """
    if not is_ai_enabled():
        raise RuntimeError("AI features are not enabled")

    # Build CV payload (same string as current user message) and ID mapping
    prompt, id_mapping = _build_cv_quality_user_prompt(cv_data)

    logger.debug(
        "cv_quality_analysis: user_id=%s, cv_id=%s, correction_mode=%s",
        user_id,
        cv_id,
        correction_mode,
    )

    response_schema = (
        CVQualityAnalysisAIResponseSchemaWritingOnly
        if correction_mode == "proofread"
        else CVQualityAnalysisAIResponseSchema
    )
    cv_variable = AIConfig.CV_QUALITY_PROMPT_CV_VARIABLE
    is_coach = correction_mode == "coaching"
    prompt_id_for_mode = (
        AIConfig.CV_QUALITY_COACH_PROMPT_ID if is_coach else AIConfig.CV_QUALITY_PROMPT_ID
    )
    use_prompt_ref = bool(prompt_id_for_mode and prompt_id_for_mode.strip())

    try:
        if use_prompt_ref:
            response, metadata = await call_openai_with_schema(
                response_schema=response_schema,
                user_id=user_id,
                cv_id=cv_id,
                operation_type="cv_quality_analysis",
                db_session=db_session,
                text_verbosity=AIConfig.CV_QUALITY_VERBOSITY,
                prompt_ref=_cv_quality_prompt_ref(correction_mode),
                prompt_variables={cv_variable: prompt},
            )
        else:
            system_prompt = build_system_prompt(correction_mode)
            response, metadata = await call_openai_with_schema(
                system_prompt=system_prompt,
                user_prompt=prompt,
                response_schema=response_schema,
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

        # proofread: if model reported no corrections, score must be 100 (enforce prompt contract).
        if correction_mode == "proofread":
            skills = response.get("skills") or {}
            if not response.get("writing_corrections") and not (
                skills.get("technical") or skills.get("soft")
            ):
                response["overall_quality_score"] = 100

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
