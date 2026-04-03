"""
CV Quality Analysis AI Service.

Generates comprehensive quality analysis independent of job descriptions.
Single AI call returns all quality data.
"""

import json
import logging
from typing import Any, Dict, Optional, Tuple
from sqlalchemy.orm import Session

from src.schemas.cv_quality_schemas import CVQualityAnalysisResponseSchemaV2
from src.utils.timeline_analyzer import analyze_timeline_gaps
from src.utils.html_diff_utils import (
    clean_quality_response_issues,
    extract_original_from_cv_data_issues,
    fill_skill_originals_from_cv_data,
)
from src.utils.cv_data_optimizer import optimize_cv_data_for_quality_analysis
from src.config import AIConfig
from .common import call_openai_with_schema, is_ai_enabled
from .cv_filter import filter_hidden_sections
from .cv_quality_prompts import build_system_prompt
from .openai_schema_utils import CV_CORRECTIONS_COACHING_FORMAT

logger = logging.getLogger(__name__)


def _cv_quality_prompt_ref(correction_mode: str) -> Dict[str, Any]:
    """Build prompt_ref for CV quality (id + version). Uses OpenAI provider-prefixed vars."""
    is_coach = correction_mode == "coaching"
    prompt_id = (
        (AIConfig.OPENAI_CV_QUALITY_COACH_PROMPT_ID or "").strip()
        if is_coach
        else (AIConfig.OPENAI_CV_QUALITY_PROMPT_ID or "").strip()
    )
    version_str = (
        (AIConfig.OPENAI_CV_QUALITY_COACH_PROMPT_VERSION or "").strip()
        if is_coach
        else (AIConfig.OPENAI_CV_QUALITY_PROMPT_VERSION or "").strip()
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


def _normalize_rewording_mode(correction_mode: str, rewording_mode: Optional[str]) -> str:
    """Return minimal|deep for coaching; proofread ignores this (caller uses minimal for API consistency)."""
    if correction_mode != "coaching":
        return "minimal"
    raw = (
        (rewording_mode or AIConfig.CV_QUALITY_DEFAULT_REWORDING_MODE or "minimal")
        .strip()
        .lower()
    )
    if raw == "deep":
        return "deep"
    return "minimal"


async def generate_cv_corrections_and_feedback(
    cv_data: Dict[str, Any],
    user_id: str,
    cv_id: str,
    db_session: Session,
    correction_mode: str = "proofread",
    rewording_mode: Optional[str] = None,
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
                        'coaching' for writing improvements / coaching
        rewording_mode: When correction_mode is 'coaching', 'minimal' (objective edits)
            or 'deep' (legacy full coach). Ignored for proofread.

    Returns:
        Tuple of (quality_data, metadata)
    """
    if not is_ai_enabled():
        raise RuntimeError("AI features are not enabled")

    rewording_effective = _normalize_rewording_mode(correction_mode, rewording_mode)

    # Build CV payload (same string as current user message) and ID mapping
    prompt, id_mapping = _build_cv_quality_user_prompt(cv_data)

    response_schema = CVQualityAnalysisResponseSchemaV2
    cv_variable = AIConfig.CV_QUALITY_PROMPT_CV_VARIABLE
    is_coach = correction_mode == "coaching"
    # Prompt-by-ID (dashboard prompts) is OpenAI-only; OpenRouter uses presets or inline.
    # Dashboard coach prompts are treated as deep mode; minimal coaching always uses inline prompts.
    prompt_id_for_mode = (
        AIConfig.OPENAI_CV_QUALITY_COACH_PROMPT_ID
        if is_coach
        else AIConfig.OPENAI_CV_QUALITY_PROMPT_ID
    )
    use_openai_prompt_id = (
        AIConfig.AI_PROVIDER == "openai"
        and bool(prompt_id_for_mode and prompt_id_for_mode.strip())
        and (not is_coach or rewording_effective == "deep")
    )
    openrouter_preset = AIConfig.get_cv_quality_preset(is_coach)
    use_openrouter_preset = (
        AIConfig.AI_PROVIDER == "openrouter"
        and bool(openrouter_preset)
        and (not is_coach or rewording_effective == "deep")
    )

    try:
        if use_openai_prompt_id:
            response, metadata = await call_openai_with_schema(
                response_schema=response_schema,
                user_id=user_id,
                cv_id=cv_id,
                operation_type="cv_quality_analysis",
                db_session=db_session,
                text_verbosity=AIConfig.CV_QUALITY_VERBOSITY,
                prompt_ref=_cv_quality_prompt_ref(correction_mode),
                prompt_variables={cv_variable: prompt},
                text_format_schema=CV_CORRECTIONS_COACHING_FORMAT,
            )
        elif use_openrouter_preset:
            response, metadata = await call_openai_with_schema(
                system_prompt="",
                user_prompt=prompt,
                response_schema=response_schema,
                model=openrouter_preset,
                user_id=user_id,
                cv_id=cv_id,
                operation_type="cv_quality_analysis",
                db_session=db_session,
                text_verbosity=AIConfig.CV_QUALITY_VERBOSITY,
                text_format_schema=CV_CORRECTIONS_COACHING_FORMAT,
            )
        else:
            system_prompt = build_system_prompt(
                correction_mode,
                rewording_effective if is_coach else "minimal",
            )
            response, metadata = await call_openai_with_schema(
                system_prompt=system_prompt,
                user_prompt=prompt,
                response_schema=response_schema,
                user_id=user_id,
                cv_id=cv_id,
                operation_type="cv_quality_analysis",
                db_session=db_session,
                text_verbosity=AIConfig.CV_QUALITY_VERBOSITY,
                text_format_schema=CV_CORRECTIONS_COACHING_FORMAT,
            )

        response = extract_original_from_cv_data_issues(response, cv_data, id_mapping)
        response = clean_quality_response_issues(response, cv_data)
        response = fill_skill_originals_from_cv_data(response, cv_data)
        if correction_mode == "proofread":
            skills = response.get("skills") or {}
            issues = response.get("issues") or []
            if not issues and not (skills.get("technical") or skills.get("soft")):
                response["overall_quality_score"] = 100

        timeline_gaps = analyze_timeline_gaps(cv_data)
        response["timeline_gaps"] = timeline_gaps
        response["correction_mode"] = correction_mode
        if is_coach:
            response["rewording_mode"] = rewording_effective
        else:
            response["rewording_mode"] = None

        response = CVQualityAnalysisResponseSchemaV2(**response).model_dump()

        logger.info("CV quality done score=%s", response.get("overall_quality_score"))

        return response, metadata

    except Exception as e:
        raise RuntimeError(f"CV corrections and feedback failed: {str(e)}")
