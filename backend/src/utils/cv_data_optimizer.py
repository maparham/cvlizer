"""
CV data optimization utilities for AI prompt efficiency.

This module provides functions to optimize CV data before sending to AI services,
reducing token usage by 20-40% without losing information needed for quality analysis.
"""

import copy
import re
from typing import Any, Dict, Tuple, Optional


def remove_control_characters(text: str) -> str:
    """
    Remove non-printable control characters from text.

    Removes ASCII control characters (0x00-0x1F, 0x7F-0x9F) except:
    - \\n (0x0A) - newline
    - \\r (0x0D) - carriage return
    - \\t (0x09) - tab

    Args:
        text: String to clean

    Returns:
        String with control characters removed
    """
    if not isinstance(text, str):
        return text

    # Remove control characters except newline, carriage return, and tab
    # Pattern: [\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F-\\x9F]
    return re.sub(r"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]", "", text)


def clean_control_characters(data: Any) -> Any:
    """
    Recursively clean control characters from all string values in data structure.

    Args:
        data: Data structure to clean (dict, list, or primitive)

    Returns:
        Cleaned data structure with control characters removed from strings
    """
    if isinstance(data, dict):
        return {k: clean_control_characters(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [clean_control_characters(item) for item in data]
    elif isinstance(data, str):
        return remove_control_characters(data)
    else:
        return data


def remove_empty_fields(data: Any) -> Any:
    """
    Recursively remove empty/null values from data structure.

    Removes: "", None, [], {}
    Preserves: 0, False, and all non-empty values

    Args:
        data: Data structure to clean (dict, list, or primitive)

    Returns:
        Cleaned data structure with empty values removed

    Example:
        >>> data = {"name": "John", "email": "", "skills": [], "age": 0}
        >>> remove_empty_fields(data)
        {"name": "John", "age": 0}
    """
    if isinstance(data, dict):
        return {
            k: remove_empty_fields(v)
            for k, v in data.items()
            if v not in ("", None, [], {})
        }
    elif isinstance(data, list):
        return [
            remove_empty_fields(item) for item in data if item not in ("", None, [], {})
        ]
    else:
        return data


def optimize_cv_data_for_quality_analysis(
    cv_data: Dict[str, Any],
) -> Tuple[Dict[str, Any], Dict[str, Dict[str, str]]]:
    """
    Optimize CV data for quality analysis prompt to reduce token usage.

    This function reduces prompt token usage by 30-50% through:
    - Cleaning control characters from all text fields (prevents AI from seeing formatting artifacts)
    - Removing UI-only metadata (section_config, draft_sections)
    - Replacing UUIDs with short numeric IDs (1, 2, 3...) to save tokens
    - Removing technologies arrays (not used in quality analysis)
    - Removing empty arrays and unused fields (achievements, honors, URLs, GPA, expiry_date)
    - Simplifying personal_info (removing unused URL fields)
    - Removing id fields from skills.languages
    - Removing empty keywords arrays
    - Filtering all empty/null values recursively

    The optimization preserves all information needed for quality analysis,
    including field names and values needed for writing corrections.

    Args:
        cv_data: Filtered CV data dictionary (already processed by filter_hidden_sections)

    Returns:
        Tuple of (optimized_cv_data, id_mapping) where:
        - optimized_cv_data: Optimized CV data with reduced token footprint and cleaned text
        - id_mapping: Dictionary mapping section names to {short_id: actual_id} mappings
          Example: {"work_experience": {"1": "work_abc-123", "2": "work_def-456"}}

    Example:
        Original prompt: ~5,266 tokens
        Optimized prompt: ~3,200-3,500 tokens
        Savings: 33-39% reduction
    """
    optimized = copy.deepcopy(cv_data)

    # Clean control characters from all text fields FIRST
    # This ensures AI doesn't see formatting artifacts like \\u000b
    optimized = clean_control_characters(optimized)

    # Remove UI metadata (not needed for quality analysis)
    optimized.pop("section_config", None)
    optimized.pop("draft_sections", None)

    # Create short ID mapping and replace UUIDs with short IDs (1, 2, 3...)
    id_mapping: Dict[str, Dict[str, str]] = {}
    short_id_counter = 1

    # Map work_experience IDs
    if "work_experience" in optimized:
        work_mapping: Dict[str, str] = {}
        for item in optimized["work_experience"]:
            if isinstance(item, dict) and "id" in item:
                actual_id = item["id"]
                short_id = str(short_id_counter)
                work_mapping[short_id] = actual_id
                item["id"] = short_id
                short_id_counter += 1
        if work_mapping:
            id_mapping["work_experience"] = work_mapping

    # Map education IDs
    if "education" in optimized:
        education_mapping: Dict[str, str] = {}
        for item in optimized["education"]:
            if isinstance(item, dict) and "id" in item:
                actual_id = item["id"]
                short_id = str(short_id_counter)
                education_mapping[short_id] = actual_id
                item["id"] = short_id
                short_id_counter += 1
        if education_mapping:
            id_mapping["education"] = education_mapping

    # Remove technologies arrays (not used in quality analysis)
    if "work_experience" in optimized:
        for item in optimized["work_experience"]:
            if isinstance(item, dict):
                item.pop("technologies", None)

    if "projects" in optimized:
        for item in optimized["projects"]:
            if isinstance(item, dict):
                item.pop("technologies", None)

    # Remove empty arrays and unused fields
    if "work_experience" in optimized:
        for item in optimized["work_experience"]:
            if isinstance(item, dict):
                if not item.get("achievements"):
                    item.pop("achievements", None)

    if "education" in optimized:
        for item in optimized["education"]:
            if isinstance(item, dict):
                if not item.get("achievements"):
                    item.pop("achievements", None)
                if not item.get("honors"):
                    item.pop("honors", None)
                item.pop("gpa", None)  # Not analyzed

    if "projects" in optimized:
        for item in optimized["projects"]:
            if isinstance(item, dict):
                item.pop("url", None)  # Not analyzed

    if "publications" in optimized:
        for item in optimized["publications"]:
            if isinstance(item, dict):
                item.pop("url", None)  # Not analyzed

    if "certifications" in optimized:
        for item in optimized["certifications"]:
            if isinstance(item, dict):
                item.pop("expiry_date", None)  # Not analyzed

    # Simplify personal_info - remove unused URL fields
    if "personal_info" in optimized:
        personal = optimized["personal_info"]
        # Keep: full_name, email, academic_title, location (used for corrections)
        # Remove: phone, linkedin_url, website_url, github_url (not used in analysis)
        for field in ["phone", "linkedin_url", "website_url", "github_url"]:
            personal.pop(field, None)

    # Remove keywords from professional_summary if empty
    if "professional_summary" in optimized:
        prof_summary = optimized["professional_summary"]
        if "keywords" in prof_summary and not prof_summary["keywords"]:
            prof_summary.pop("keywords", None)

    # Remove id from skills.languages (not referenced in quality analysis)
    if "skills" in optimized and "languages" in optimized["skills"]:
        for lang in optimized["skills"]["languages"]:
            if isinstance(lang, dict):
                lang.pop("id", None)

    # Remove all empty/null values recursively (final cleanup pass)
    optimized = remove_empty_fields(optimized)

    return optimized, id_mapping
