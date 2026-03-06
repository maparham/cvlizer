"""
Shared CV response builders for the CVs API.

Centralizes building CVResponse with section_count so crud and upload
do not duplicate logic.
"""

from src.utils.section_count import count_visible_sections_with_data

from .models import CVResponse


def build_cv_response(cv, *, include_parsed_data: bool = True) -> CVResponse:
    """
    Build a CVResponse with section_count set.

    Args:
        cv: CV model instance.
        include_parsed_data: If True, include parsed_data in the response;
            if False, omit it (e.g. for list view to reduce payload size).

    Returns:
        CVResponse with section_count populated.
    """
    d = cv.to_response_dict(include_parsed_data=include_parsed_data)
    d["section_count"] = count_visible_sections_with_data(cv.parsed_data)
    return CVResponse(**d)
