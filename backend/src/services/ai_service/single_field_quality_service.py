"""
Single-field quality coaching service.

Runs a trimmed coaching prompt for one description field (e.g. professional_summary,
personal_info.description, work_experience[].description) and returns one issue.
Used when the user clicks "retry" on a description-field correction card.
"""

import logging
import re
from typing import Any, Dict, Optional, Tuple

from sqlalchemy.orm import Session

from src.schemas.cv_quality_schemas import IssueSchema, SingleIssueResponseSchema
from src.utils.html_diff_utils import clean_html_diff_string
from src.config import AIConfig
from .cv_section_utils import get_summary_custom_section
from .common import call_openai_with_schema, is_ai_enabled
from .cv_quality_prompts.single_field_coach import build_single_field_coach_system_prompt
from .openai_schema_utils import SINGLE_ISSUE_RESPONSE_FORMAT

logger = logging.getLogger(__name__)


def get_max_draft_history_per_field() -> int:
    """Max number of generations to keep per field (from config, default 3)."""
    n = AIConfig.CV_QUALITY_MAX_DRAFT_HISTORY
    # Defensive clamp; config is already clamped 1-10 at load time.
    return max(1, min(10, n))


def get_description_field_text(
    cv_data: Dict[str, Any],
    field_path: str,
    item_id: Optional[str] = None,
) -> str:
    """
    Get the current text for a description field from CV data.

    Args:
        cv_data: Full CV parsed_data dict.
        field_path: E.g. professional_summary, personal_info.description,
            work_experience.description, education.description.
        item_id: Required for work_experience or education (the list item id).

    Returns:
        Current field text (may be empty).
    """
    base = (field_path or "").split(".")[0] or ""

    # Custom section: custom_sections[section_id].content (frontend/AI format)
    custom_match = re.match(r"custom_sections\[([^\]]+)\]\.content", field_path or "")
    if custom_match:
        section_id = custom_match.group(1)
        for s in cv_data.get("custom_sections") or []:
            if isinstance(s, dict) and s.get("id") == section_id:
                return s.get("content") or ""
        return ""

    # Summary: first custom section with title "Professional Summary" or first custom
    if base == "professional_summary":
        section = get_summary_custom_section(cv_data)
        return (section.get("content") or "") if section else ""

    # Custom section by id (plain section_id as base)
    for s in cv_data.get("custom_sections") or []:
        if isinstance(s, dict) and s.get("id") == base:
            return s.get("content") or ""
    if base == "personal_info":
        obj = cv_data.get("personal_info") or {}
        return (obj.get("description") or "") if isinstance(obj, dict) else ""

    if base == "work_experience" and item_id:
        for item in cv_data.get("work_experience") or []:
            if isinstance(item, dict) and item.get("id") == item_id:
                return item.get("description") or ""
        return ""

    if base == "education" and item_id:
        for item in cv_data.get("education") or []:
            if isinstance(item, dict) and item.get("id") == item_id:
                return item.get("description") or ""
        return ""

    return ""


def _derive_item_type_from_field_path(field_path: str) -> str:
    """Derive item_type from field_path for singular sections or list sections."""
    base = (field_path or "").split(".")[0] or ""
    if base in ("personal_info", "work_experience", "education"):
        return base
    return "custom"


async def generate_single_field_correction(
    cv_data: Dict[str, Any],
    field_path: str,
    item_id: Optional[str],
    user_id: str,
    cv_id: str,
    db_session: Session,
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """
    Run single-field coaching for one description field and return one issue.

    Args:
        cv_data: Full CV parsed_data.
        field_path: Target field path (e.g. professional_summary, personal_info.description).
        item_id: Optional item id for work_experience/education.
        user_id: User id for logging.
        cv_id: CV id for logging.
        db_session: Session for AI usage logging.

    Returns:
        Tuple of (issue_dict, metadata). issue_dict has IssueSchema shape with
        original/suggested set from cv_data and html_diff.
    """
    if not is_ai_enabled():
        raise RuntimeError("AI features are not enabled")

    current_text = get_description_field_text(cv_data, field_path, item_id)
    system_prompt = build_single_field_coach_system_prompt()
    text_block = current_text if current_text else "(empty or missing)"
    user_prompt = f"TEXT TO IMPROVE:\n\n{text_block}"

    openrouter_preset = AIConfig.get_cv_quality_preset(True)
    use_openrouter = AIConfig.AI_PROVIDER == "openrouter" and bool(openrouter_preset)

    if use_openrouter:
        response, metadata = await call_openai_with_schema(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            response_schema=SingleIssueResponseSchema,
            model=openrouter_preset,
            user_id=user_id,
            cv_id=cv_id,
            operation_type="cv_quality_field_retry",
            db_session=db_session,
            text_format_schema=SINGLE_ISSUE_RESPONSE_FORMAT,
        )
    else:
        response, metadata = await call_openai_with_schema(
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            response_schema=SingleIssueResponseSchema,
            user_id=user_id,
            cv_id=cv_id,
            operation_type="cv_quality_field_retry",
            db_session=db_session,
            text_format_schema=SINGLE_ISSUE_RESPONSE_FORMAT,
        )

    issue = response.get("issue") or {}
    issue["original"] = current_text
    issue["item_id"] = item_id if item_id else None
    issue["item_type"] = _derive_item_type_from_field_path(field_path)
    issue["field_path"] = field_path

    html_diff = issue.get("html_diff")
    if html_diff:
        issue["html_diff"] = clean_html_diff_string(html_diff)
        try:
            # Lazy import to avoid pulling in writing_corrections_service at module load.
            from .writing_corrections_service import apply_html_diff

            suggested = apply_html_diff(current_text, issue["html_diff"])
            if suggested is not None:
                issue["suggested"] = suggested
        except Exception:
            pass

    validated = IssueSchema(**issue)
    return validated.model_dump(), metadata
