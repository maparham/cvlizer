"""
CV data filtering utilities for AI services.

This module provides functions for filtering CV data before sending to AI services,
ensuring that hidden sections are not included in AI prompts.
"""

import copy
from typing import Any, Dict, Set


def filter_hidden_sections(cv_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Filter out hidden sections from CV data before sending to AI services.

    This function creates a deep copy of the CV data and removes any sections
    that are marked as hidden (visible=false) in the section_config.

    Args:
        cv_data: Complete CV data dictionary including section_config

    Returns:
        Filtered CV data dictionary with only visible sections

    Note:
        - If no section_config exists, all sections are treated as visible (backward compatibility)
        - Creates a deep copy to avoid mutating the original data
        - Updates section_config to only include visible sections
        - personal_info is always preserved (never filtered) as it's needed for basic context
        - All other sections including professional_summary are filtered when hidden
    """
    # Create a deep copy to avoid mutating the original data
    filtered_data = copy.deepcopy(cv_data)

    # Get section_config to determine which sections are visible
    section_config = filtered_data.get("section_config", {})
    sections = section_config.get("sections", [])

    # If no section_config exists, treat all sections as visible (backward compatibility)
    if not sections:
        return filtered_data

    # Build a set of visible section types
    # Only sections explicitly listed in section_config with visible=True are visible
    visible_section_types: Set[str] = set()
    for section in sections:
        if section.get("visible", True):  # Default to visible if not specified
            section_type = section.get("type") or section.get("id")
            if section_type:
                visible_section_types.add(section_type)

    # personal_info is always visible (never filtered)
    visible_section_types.add("personal_info")

    # Define all possible section types that can be filtered
    filterable_sections = [
        "professional_summary",
        "work_experience",
        "education",
        "skills",
        "certifications",
        "projects",
        "awards",
        "publications",
        "volunteer_experience",
        "why_good_fit",
    ]

    # Remove hidden sections from the data
    # A section is hidden if:
    # 1. It's not in visible_section_types (either not in section_config.sections at all, or has visible=false)
    # 2. It's in filterable_sections (can be filtered)
    for section_type in filterable_sections:
        if section_type in filtered_data:
            # If this section type is not in the visible set, remove it
            if section_type not in visible_section_types:
                del filtered_data[section_type]

    # Update section_config to only include visible sections
    visible_sections = [s for s in sections if s.get("visible", True)]
    if "section_config" in filtered_data:
        filtered_data["section_config"]["sections"] = visible_sections

    return filtered_data
