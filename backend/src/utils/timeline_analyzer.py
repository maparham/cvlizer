"""
Timeline gap detection utility.

Analyzes work experience and education timelines to identify gaps >= 3 months.
Pure rule-based logic - no AI involved.
"""

from datetime import datetime, timezone
from dateutil.relativedelta import relativedelta
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)


def parse_date(date_str: str) -> Optional[datetime]:
    """
    Parse date string in YYYY-MM-DD or YYYY-MM format.

    Args:
        date_str: Date string to parse

    Returns:
        datetime object or None if parsing fails
    """
    if not date_str:
        return None
    # Try YYYY-MM-DD format first (primary format used by CV data)
    try:
        return datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError:
        pass
    # Fall back to YYYY-MM format (for backward compatibility)
    try:
        return datetime.strptime(date_str, "%Y-%m")
    except ValueError:
        logger.warning(f"Invalid date format: {date_str}")
        return None


def calculate_gap_months(end_date: datetime, start_date: datetime) -> int:
    """
    Calculate gap duration in months between two dates.

    Args:
        end_date: End of previous item
        start_date: Start of next item

    Returns:
        Number of months in gap
    """
    delta = relativedelta(start_date, end_date)
    return delta.years * 12 + delta.months


def analyze_timeline_gaps(cv_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Analyze CV timeline for gaps >= 3 months.

    Combines work experience and education into a unified timeline,
    sorts chronologically, and identifies gaps.

    Args:
        cv_data: Complete CV data dictionary

    Returns:
        List of gap dictionaries with details
    """
    gaps = []

    # Collect all timeline items
    timeline_items = []

    # Track current items for warning
    current_work_items = []
    current_education_items = []

    # Add work experience items
    for work in cv_data.get("work_experience", []):
        start = parse_date(work.get("start_date", ""))
        if not start:
            continue

        # Handle current positions
        if work.get("current", False):
            current_work_items.append(work.get("id"))
            end = datetime.now(timezone.utc)
        else:
            end = parse_date(work.get("end_date", ""))
            if not end:
                continue

        timeline_items.append(
            {
                "type": "work_experience",
                "id": work.get("id"),
                "start": start,
                "end": end,
                "data": work,
            }
        )

    # Add education items
    for edu in cv_data.get("education", []):
        start = parse_date(edu.get("start_date", ""))
        if not start:
            continue

        # Handle current education
        if edu.get("current", False):
            current_education_items.append(edu.get("id"))
            end = datetime.now(timezone.utc)
        else:
            end = parse_date(edu.get("end_date", ""))
            if not end:
                continue

        timeline_items.append(
            {
                "type": "education",
                "id": edu.get("id"),
                "start": start,
                "end": end,
                "data": edu,
            }
        )

    # Warn if multiple items marked as current
    if len(current_work_items) > 1:
        logger.warning(
            f"Multiple work experience items marked as current: {current_work_items}. "
            "Only one current position should be marked."
        )
    if len(current_education_items) > 1:
        logger.warning(
            f"Multiple education items marked as current: {current_education_items}. "
            "Only one current education should be marked."
        )

    # Sort by start date
    timeline_items.sort(key=lambda x: x["start"])

    # Detect gaps between consecutive items
    for i in range(len(timeline_items) - 1):
        current_item = timeline_items[i]
        next_item = timeline_items[i + 1]

        # Calculate gap
        gap_months = calculate_gap_months(current_item["end"], next_item["start"])

        # Only report gaps >= 3 months
        if gap_months >= 3:
            # Determine gap type
            if current_item["type"] == next_item["type"]:
                gap_type = current_item["type"]
            else:
                gap_type = "combined"

            # Extract title for display
            current_title = (
                current_item["data"].get("position")
                or current_item["data"].get("company")
                or current_item["data"].get("degree")
                or current_item["data"].get("institution")
                or "Unknown"
            )

            next_title = (
                next_item["data"].get("position")
                or next_item["data"].get("company")
                or next_item["data"].get("degree")
                or next_item["data"].get("institution")
                or "Unknown"
            )

            gaps.append(
                {
                    "gap_type": gap_type,
                    "gap_duration_months": gap_months,
                    "start_date": current_item["end"].strftime("%Y-%m"),
                    "end_date": next_item["start"].strftime("%Y-%m"),
                    "item_before": {
                        "type": current_item["type"],
                        "id": current_item["id"],
                        "title": current_title,
                    },
                    "item_after": {
                        "type": next_item["type"],
                        "id": next_item["id"],
                        "title": next_title,
                    },
                }
            )

    logger.debug("Timeline: %d gaps", len(gaps))
    return gaps
