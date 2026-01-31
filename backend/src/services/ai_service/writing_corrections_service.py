"""
Writing Corrections Service

Service for applying writing corrections to CV data.
Handles html_diff parsing and field corrections application.
"""

import re
import logging
from typing import Dict, Any, List

from src.schemas.cv_quality_schemas import (  # type: ignore
    WritingCorrectionSchema,
    FieldCorrectionSchema,
)

logger = logging.getLogger(__name__)

# Whitelist of allowed field names for security and data integrity
ALLOWED_FIELD_NAMES = {
    "company",
    "position",
    "institution",
    "degree",
    "location",
    "description",
    "start_date",
    "end_date",
    "content",
    "current",
}


def apply_html_diff(text: str, html_diff: str) -> str:
    """
    Parse html_diff string to extract corrected text.

    Removes <del> tags and their content, and removes <ins> tags but keeps the content,
    keeping only the final corrected text.

    Args:
        text: Original text (not used, but kept for consistency)
        html_diff: The HTML diff string with <del> and <ins> tags

    Returns:
        The corrected text with all HTML tags removed

    Example:
        Input: "Led <del>a team</del><ins>team of 5 engineers</ins> in developing <ins>scalable</ins> web applications"
        Output: "Led team of 5 engineers in developing scalable web applications"
    """
    if not html_diff or html_diff.strip() == "":
        return text

    result = html_diff

    # Remove <del> tags and their content
    # Use [\s\S] instead of . to match across newlines (. doesn't match \n by default)
    result = re.sub(r"<del>[\s\S]*?</del>", "", result)

    # Remove <ins> tags but keep the content
    # Use [\s\S] instead of . to match across newlines (. doesn't match \n by default)
    result = re.sub(r"<ins>([\s\S]*?)</ins>", r"\1", result)

    # Clean up extra horizontal whitespace only (multiple spaces/tabs)
    # Preserve newlines for bullet formatting - only collapse horizontal whitespace
    result = re.sub(r"[^\S\n]+", " ", result)

    # Trim leading and trailing whitespace
    result = result.strip()

    return result


def apply_field_corrections(
    item: Dict[str, Any], field_corrections: List[FieldCorrectionSchema]
) -> tuple[Dict[str, Any], List[str]]:
    """
    Apply field corrections to a CV item.

    Updates all fields (company, position, institution, degree, location, description, dates)
    with corrected values. Uses corrected_value field which is computed from html_diff
    in post-processing (see clean_quality_response in html_diff_utils).

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

        # Update the field if it exists in the item
        if field_name in updated_item:
            updated_item[field_name] = corrected_value
            logger.debug(
                f"Applied field correction: {field_name} = '{corrected_value}' "
                f"(was: '{field_correction.original_value}')"
            )
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
    section = correction.section

    # Validate section
    if section not in ["work_experience", "education", "professional_summary"]:
        raise ValueError(f"Invalid section: {section}")

    # Find the item in CV data
    if section == "work_experience":
        items = cv_data.get("work_experience", [])
        item_key = "work_experience"
    elif section == "education":
        items = cv_data.get("education", [])
        item_key = "education"
    elif section == "professional_summary":
        # Professional summary is a single object, not a list
        # Handle legacy html_diff for backward compatibility
        if correction.html_diff and correction.html_diff.strip():
            # Apply html_diff to content (legacy support)
            if (
                "professional_summary" in cv_data
                and "content" in cv_data["professional_summary"]
            ):
                cv_data["professional_summary"]["content"] = apply_html_diff(
                    cv_data["professional_summary"]["content"], correction.html_diff
                )
                logger.info(f"Applied legacy html_diff to professional_summary content")
            else:
                logger.warning("professional_summary.content not found in CV data")
        # Apply field_corrections if any (includes description field)
        if correction.field_corrections:
            if "professional_summary" not in cv_data:
                cv_data["professional_summary"] = {}
            cv_data["professional_summary"], skipped_fields = apply_field_corrections(
                cv_data["professional_summary"], correction.field_corrections
            )
            if skipped_fields:
                logger.warning(
                    f"Skipped {len(skipped_fields)} fields for professional_summary: {skipped_fields}"
                )
        return cv_data
    else:
        raise ValueError(f"Unsupported section: {section}")

    # Find item by ID
    item_index = None
    for idx, item in enumerate(items):
        if item.get("id") == item_id:
            item_index = idx
            break

    if item_index is None:
        raise ValueError(f"Item with id '{item_id}' not found in {section} section")

    # Get the item to update
    item = items[item_index].copy()

    # Handle legacy html_diff for backward compatibility (deprecated)
    if correction.html_diff and correction.html_diff.strip():
        if "description" in item:
            item["description"] = apply_html_diff(
                item["description"], correction.html_diff
            )
            logger.debug(
                f"Applied legacy html_diff to {section} item {item_id} description"
            )
        else:
            logger.warning(f"description field not found in {section} item {item_id}")

    # Apply field_corrections if present (includes description field)
    if correction.field_corrections:
        item, skipped_fields = apply_field_corrections(item, correction.field_corrections)
        logger.debug(
            f"Applied {len(correction.field_corrections)} field corrections to {section} item {item_id}"
        )
        if skipped_fields:
            logger.warning(
                f"Skipped {len(skipped_fields)} fields for item {item_id}: {skipped_fields}"
            )

    # Update the item in the list
    items[item_index] = item

    # Update CV data
    cv_data[item_key] = items

    logger.info(f"Successfully applied writing correction to {section} item {item_id}")

    return cv_data
