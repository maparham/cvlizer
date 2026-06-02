"""
Writing Corrections Service

Service for applying writing corrections to CV data.
Handles html_diff parsing and field corrections application.
"""

import json
import re
import logging
from typing import Dict, Any, List

from .cv_section_utils import get_summary_custom_section

from src.schemas.cv_quality_schemas import (  # type: ignore
    WritingCorrectionSchema,
    FieldCorrectionSchema,
)

logger = logging.getLogger(__name__)

# Whitelist of allowed field names for security and data integrity
ALLOWED_FIELD_NAMES = {
    # Work experience / education / summary
    "company",
    "position",
    "institution",
    "degree",
    "field_of_study",
    "location",
    "description",
    "start_date",
    "end_date",
    "content",
    "current",
    "honors",
    # Personal info (proofread corrections)
    "email",
    "full_name",
    "phone",
    "linkedin_url",
    "github_url",
    "website_url",
    "academic_title",
}


_TAG_RE = re.compile(r"(<del>[\s\S]*?</del>|<ins>[\s\S]*?</ins>)", re.DOTALL)


def apply_html_diff(original: str, html_diff: str) -> str:
    """
    Apply html_diff patches to original text using context-aware find-replace.

    Supports both full-text html_diff (legacy: entire field with markup) and
    partial html_diff (new: only changed lines/sentences). Each <del>X</del>
    (optionally followed by <ins>Y</ins>) is applied as a find-replace on the
    original, using the preceding text in the html_diff as context to
    disambiguate when X appears more than once.

    Falls back gracefully: if a patch cannot be located, it is skipped and a
    warning is logged rather than corrupting the text.
    """
    if not html_diff or not html_diff.strip():
        return original

    if not re.search(r"<(?:del|ins)>", html_diff):
        # No markup — shouldn't normally happen; return html_diff directly (legacy).
        return html_diff

    segs = _TAG_RE.split(html_diff)
    # segs alternates: plain text, tag, plain text, tag, ...

    result = original
    i = 0
    n = len(segs)

    while i < n:
        seg = segs[i]

        del_m = re.match(r"^<del>([\s\S]*?)</del>$", seg, re.DOTALL)
        if del_m:
            old_text = del_m.group(1)
            new_text = ""

            # Look for a paired <ins> immediately after, skipping empty gaps.
            j = i + 1
            while j < n and not segs[j].strip():
                j += 1
            if j < n:
                ins_m = re.match(r"^<ins>([\s\S]*?)</ins>$", segs[j], re.DOTALL)
                if ins_m:
                    new_text = ins_m.group(1)
                    segs[j] = ""  # consume so the standalone-ins branch skips it

            pre_ctx = segs[i - 1] if i > 0 else ""
            result = _apply_patch(result, old_text, new_text, pre_ctx)
            i += 1
            continue

        ins_m = re.match(r"^<ins>([\s\S]*?)</ins>$", seg, re.DOTALL)
        if ins_m and seg:  # seg may be "" if already consumed as part of del+ins
            # Standalone insertion: insert new_text after the preceding context.
            new_text = ins_m.group(1)
            pre_ctx = segs[i - 1] if i > 0 else ""
            result = _apply_patch(result, "", new_text, pre_ctx)

        i += 1

    return result


def _apply_patch(text: str, old: str, new: str, pre_ctx: str) -> str:
    """
    Replace old with new in text using trailing chars of pre_ctx for disambiguation.

    Tries progressively shorter context lengths until a match is found so that
    minor whitespace differences between html_diff and original don't block apply.
    """
    ctx_lengths = sorted(
        {
            len(pre_ctx),
            min(25, len(pre_ctx)),
            min(15, len(pre_ctx)),
            min(7, len(pre_ctx)),
            0,
        },
        reverse=True,
    )
    for ctx_len in ctx_lengths:
        ctx = pre_ctx[-ctx_len:] if ctx_len > 0 else ""
        search = ctx + old
        replace = ctx + new
        if search and search in text:
            return text.replace(search, replace, 1)
    logger.warning(
        "apply_html_diff: patch '%s'→'%s' not found in text",
        old[:40],
        new[:40],
    )
    return text


def apply_field_corrections(
    item: Dict[str, Any], field_corrections: List[FieldCorrectionSchema]
) -> tuple[Dict[str, Any], List[str]]:
    """
    Apply field corrections to a CV item.

    Updates all fields (company, position, institution, degree, location, description, dates)
    with corrected values. Uses corrected_value field which is computed from html_diff
    in post-processing (see clean_quality_response_issues in html_diff_utils).

    Args:
        item: The CV item dictionary to update
        field_corrections: List of field corrections to apply (with corrected_value pre-computed)

    Returns:
        Tuple of (updated item dictionary, list of skipped field names)
    """
    updated_item = item.copy()
    skipped_fields = []

    for field_correction in field_corrections:
        field_name = field_correction.field_name

        # Validate field name against whitelist
        if field_name not in ALLOWED_FIELD_NAMES:
            logger.warning(
                f"Attempted to update disallowed field '{field_name}', skipping. "
                f"Allowed fields: {ALLOWED_FIELD_NAMES}"
            )
            skipped_fields.append(field_name)
            continue

        # Get corrected_value (should be pre-computed in post-processing)
        # Fallback: compute from html_diff if missing (defensive check for edge cases)
        corrected_value = field_correction.corrected_value
        if corrected_value is None:
            logger.warning(
                f"corrected_value missing for {field_name}, computing from html_diff"
            )
            corrected_value = apply_html_diff(
                field_correction.original_value, field_correction.html_diff
            )

        # Array fields (honors) may arrive as JSON strings; parse to list
        if field_name == "honors" and isinstance(corrected_value, str):
            try:
                parsed = json.loads(corrected_value)
                if isinstance(parsed, list):
                    corrected_value = parsed
            except json.JSONDecodeError as e:
                logger.warning(
                    f"Failed to parse {field_name} JSON, keeping existing value: {e}"
                )
                skipped_fields.append(field_name)
                continue

        # Update the field if it exists in the item
        if field_name in updated_item:
            updated_item[field_name] = corrected_value
        else:
            skipped_fields.append(field_name)
            logger.warning(f"Field '{field_name}' not found in item, skipping correction")

    return updated_item, skipped_fields


def apply_writing_correction(
    cv_data: Dict[str, Any], correction: WritingCorrectionSchema
) -> Dict[str, Any]:
    """
    Apply a writing correction to CV data.

    Handles field_corrections for all fields including description.
    All fields (company, position, institution, degree, location, description, etc.)
    are now handled through field_corrections with field_name.

    Args:
        cv_data: The CV parsed_data dictionary
        correction: The writing correction to apply

    Returns:
        Updated CV data dictionary

    Raises:
        ValueError: If item_id not found in CV data or section is invalid
    """
    item_id = correction.item_id
    field_path = correction.field_path
    first_segment = (field_path or "").split(".")[0] or field_path
    # Normalize array-style paths: work_experience[0] -> work_experience
    base_section = (
        re.sub(r"\[\d+\]$", "", first_segment) if first_segment else first_segment
    )
    # Extract custom section id from custom_sections[section_id] format
    custom_match = re.match(r"custom_sections\[([^\]]+)\]", first_segment)
    if custom_match:
        base_section = custom_match.group(1)

    # Validate field_path: exact or prefix; allow work_experience, education, personal_info, professional_summary (summary custom section), or custom section id
    allowed_bases = (
        "work_experience",
        "education",
        "professional_summary",
        "personal_info",
    )
    custom_sections = cv_data.get("custom_sections") or []
    custom_section_ids = {
        s.get("id") for s in custom_sections if isinstance(s, dict) and s.get("id")
    }
    if base_section not in allowed_bases and base_section not in custom_section_ids:
        raise ValueError(f"Invalid field_path: {field_path}")

    # Find the item in CV data (use base_section for list/single-object lookup)
    if base_section == "work_experience":
        items = cv_data.get("work_experience", [])
        item_key = "work_experience"
    elif base_section == "education":
        items = cv_data.get("education", [])
        item_key = "education"
    elif base_section == "professional_summary":
        # Summary = first custom section with title "Professional Summary" or first custom section; apply to that item
        summary_section = get_summary_custom_section(cv_data)
        if summary_section and correction.field_corrections:
            section_id = summary_section.get("id")
            for i, s in enumerate(custom_sections):
                if isinstance(s, dict) and s.get("id") == section_id:
                    # Build a dict with content for apply_field_corrections
                    obj = {"content": s.get("content") or ""}
                    obj, skipped_fields = apply_field_corrections(
                        obj, correction.field_corrections
                    )
                    cv_data["custom_sections"] = list(custom_sections)
                    cv_data["custom_sections"][i] = {
                        **s,
                        "content": obj.get("content", ""),
                    }
                    if skipped_fields:
                        logger.warning(
                            f"Skipped {len(skipped_fields)} fields for summary custom section: {skipped_fields}"
                        )
                    break
        return cv_data
    elif base_section in custom_section_ids:
        # Custom section by id
        if correction.field_corrections:
            for i, s in enumerate(custom_sections):
                if isinstance(s, dict) and s.get("id") == base_section:
                    obj = {"content": s.get("content") or ""}
                    obj, skipped_fields = apply_field_corrections(
                        obj, correction.field_corrections
                    )
                    cv_data["custom_sections"] = list(custom_sections)
                    cv_data["custom_sections"][i] = {
                        **s,
                        "content": obj.get("content", ""),
                    }
                    if skipped_fields:
                        logger.warning(
                            f"Skipped {len(skipped_fields)} fields for custom section {base_section}: {skipped_fields}"
                        )
                    break
        return cv_data
    elif base_section == "personal_info":
        # Personal info is a single object, not a list (similar to professional_summary)
        if correction.field_corrections:
            personal_info = cv_data.get("personal_info")
            if personal_info is None:
                personal_info = {}
            personal_info, skipped_fields = apply_field_corrections(
                personal_info, correction.field_corrections
            )
            cv_data["personal_info"] = personal_info
            if skipped_fields:
                logger.warning(
                    f"Skipped {len(skipped_fields)} fields for personal_info: {skipped_fields}"
                )
        return cv_data
    else:
        raise ValueError(f"Unsupported field_path: {field_path}")

    # Find item by ID
    item_index = None
    for idx, item in enumerate(items):
        if item.get("id") == item_id:
            item_index = idx
            break

    if item_index is None:
        raise ValueError(f"Item with id '{item_id}' not found in {base_section} section")

    # Get the item to update
    item = items[item_index].copy()

    # Apply field_corrections if present (includes description field)
    if correction.field_corrections:
        item, skipped_fields = apply_field_corrections(item, correction.field_corrections)
        if skipped_fields:
            logger.warning(
                f"Skipped {len(skipped_fields)} fields for item {item_id}: {skipped_fields}"
            )

    # Update the item in the list
    items[item_index] = item

    # Update CV data
    cv_data[item_key] = items

    return cv_data
