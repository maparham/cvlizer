"""
Shared CV section utilities for AI services.

Provides helpers used by AI suggestions, quality, and writing correction services.
"""

from typing import Any, Dict, Optional


def get_summary_custom_section(cv_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Return the custom section used for AI summary suggestions (read/write).

    Rule: first section with type professional_summary; else first with title
    "professional summary" (case-insensitive); else first custom section.
    Frontend getSummaryCustomSection in CVContentArea.tsx must match this.
    """
    custom_sections = cv_data.get("custom_sections") or []
    for item in custom_sections:
        if isinstance(item, dict) and item.get("type") == "professional_summary":
            return item
    for item in custom_sections:
        if isinstance(item, dict):
            title = (item.get("title") or "").strip().lower()
            if title == "professional summary":
                return item
    return custom_sections[0] if custom_sections else None
