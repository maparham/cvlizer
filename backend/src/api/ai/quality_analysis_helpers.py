"""
CV Quality Analysis API Helper Functions

Helper functions for CV quality analysis endpoints to reduce code duplication.
Handles validation, loading, and parsing of CVs and quality analyses.
"""

import logging
from typing import Any, List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from src.models.cv import CV
from src.models.cv_quality_analysis import CVQualityAnalysis
from src.schemas.cv_quality_schemas import (
    CVQualityAnalysisResponseSchemaV2,
    FieldCorrectionSchema,
    WritingCorrectionSchema,
)
from src.services.cv_service import get_cv_by_id, update_cv
from src.services.ai_service.writing_corrections_service import apply_html_diff

logger = logging.getLogger(__name__)


def validate_and_load_cv(db: Session, cv_id: str, user_id: str) -> CV:
    """
    Validate CV ownership and ensure it has parsed data.

    Args:
        db: Database session
        cv_id: CV ID to validate
        user_id: User ID for ownership check

    Returns:
        CV: The validated CV with parsed_data

    Raises:
        HTTPException: 404 if CV not found or not parsed
    """
    cv = get_cv_by_id(db, cv_id, user_id)
    if not cv or not cv.parsed_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="CV not found or not parsed"
        )
    return cv


def load_quality_analysis(
    db: Session, analysis_id: str, cv_id: str, user_id: str
) -> CVQualityAnalysis:
    """
    Load quality analysis and verify ownership.

    Args:
        db: Database session
        analysis_id: Analysis ID to load
        cv_id: CV ID for validation
        user_id: User ID for ownership check

    Returns:
        CVQualityAnalysis: The validated analysis with quality_data

    Raises:
        HTTPException: 404 if analysis not found or has no quality_data
    """
    analysis = (
        db.query(CVQualityAnalysis)
        .filter(
            CVQualityAnalysis.id == analysis_id,
            CVQualityAnalysis.user_id == user_id,
            CVQualityAnalysis.cv_id == cv_id,
        )
        .first()
    )

    if not analysis or not analysis.quality_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Quality analysis not found"
        )

    return analysis


def parse_quality_data(analysis: CVQualityAnalysis) -> CVQualityAnalysisResponseSchemaV2:
    """
    Parse quality analysis data into V2 schema (issues-based only).

    Raises:
        HTTPException: 500 if quality data format is invalid
    """
    data = analysis.quality_data or {}
    try:
        return CVQualityAnalysisResponseSchemaV2(**data)
    except Exception as e:
        logger.error(f"Failed to parse quality analysis data: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Invalid quality analysis data format",
        )


def _synthetic_correction_from_issues(
    issues_with_html: List[Any], correction_id: str
) -> WritingCorrectionSchema:
    """Build a WritingCorrectionSchema from issues with same item_id and html_diff."""
    field_path = issues_with_html[0].field_path if issues_with_html else ""
    importance = (
        "highly_recommended"
        if issues_with_html
        and getattr(issues_with_html[0], "issue_severity", None) == "critical"
        else "standard"
    )
    field_corrections = []
    for issue in issues_with_html:
        path = getattr(issue, "field_path", None) or ""
        # Derive field name from path. professional_summary uses "content" in CV data.
        if path == "professional_summary" or (
            path and path.startswith("professional_summary.")
        ):
            field_name = path.split(".")[-1] if "." in path else "content"
        elif path and "." in path:
            field_name = path.split(".")[-1]
        else:
            field_name = "description"
        orig = getattr(issue, "original", None) or ""
        sugg = getattr(issue, "suggested", None)
        if sugg is None and getattr(issue, "html_diff", None):
            sugg = apply_html_diff(orig, issue.html_diff)
        field_corrections.append(
            FieldCorrectionSchema(
                field_name=field_name,
                html_diff=issue.html_diff or "",
                reasoning=getattr(issue, "reasoning", "") or "",
                original_value=orig,
                corrected_value=sugg or orig,
            )
        )
    return WritingCorrectionSchema(
        item_id=correction_id,
        field_path=field_path,
        importance=importance,
        field_corrections=field_corrections,
    )


def _is_work_experience_description_path(field_path: str) -> bool:
    """True if field_path refers to a work_experience description (dot or bracket notation)."""
    return field_path.startswith("work_experience") and field_path.endswith(
        ".description"
    )


def _is_education_description_path(field_path: str) -> bool:
    """True if field_path refers to an education description (dot or bracket notation)."""
    return field_path.startswith("education") and field_path.endswith(".description")


def get_draft_history_key(field_path: str, item_id: Optional[str]) -> str:
    """
    Return the field_draft_histories key for a given field_path and optional item_id.

    For work_experience/education description fields (including bracket notation
    e.g. work_experience[0].description), the key is work_experience.<item_id>.description
    or education.<item_id>.description. Otherwise the key is field_path as-is.
    """
    if item_id and _is_work_experience_description_path(field_path):
        return f"work_experience.{item_id}.description"
    if item_id and _is_education_description_path(field_path):
        return f"education.{item_id}.description"
    return field_path


def get_initial_draft_list_for_key(
    existing_quality_data: dict,
    key: str,
    request_item_id: Optional[str],
) -> List[dict]:
    """
    Resolve the initial draft list for a field when field_draft_histories is empty.

    First retry: the original suggestion lives in issues, not field_draft_histories.
    This finds the matching issue so history navigation shows on first retry.
    AI may return field_path in various forms (e.g. work_experience.1.description,
    work_experience[0].description); we match by item_id and description-field semantics.

    Args:
        existing_quality_data: quality_data dict (issues, field_draft_histories, etc.)
        key: Draft history key (e.g. work_experience.<id>.description, professional_summary)
        request_item_id: Item ID from the request (for work_experience/education)

    Returns:
        List of at most one issue dict (the one that matches this key), or empty list.
    """

    def _fp_matches_work_exp_desc(fp: str) -> bool:
        return fp.startswith("work_experience") and fp.endswith(".description")

    def _fp_matches_education_desc(fp: str) -> bool:
        return fp.startswith("education") and fp.endswith(".description")

    current_list: List[dict] = []
    req_item_id = (request_item_id or "") or None
    norm_req = _normalize_correction_id(req_item_id or "")
    for i in existing_quality_data.get("issues") or []:
        if not i.get("html_diff"):
            continue
        fp = i.get("field_path") or ""
        iid = (i.get("item_id") or "") or None
        norm_iid = _normalize_correction_id(iid or "")
        if key == fp:
            current_list = [dict(i)]
            break
        if key.startswith("work_experience.") and norm_iid == norm_req:
            if _fp_matches_work_exp_desc(fp):
                current_list = [dict(i)]
                break
        if key.startswith("education.") and norm_iid == norm_req:
            if _fp_matches_education_desc(fp):
                current_list = [dict(i)]
                break
        if key == "professional_summary" or key.startswith("professional_summary."):
            if fp == "professional_summary" or fp.startswith("professional_summary."):
                current_list = [dict(i)]
                break
        if key.startswith("personal_info."):
            if fp == "personal_info.description" or fp.startswith("personal_info."):
                current_list = [dict(i)]
                break
    return current_list


def _normalize_correction_id(correction_id: str) -> str:
    """
    If correction_id is a frontend section-prefixed id (work_<uuid>, edu_<uuid>),
    return the UUID part so backend can match issues stored with raw UUID.
    Same normalization (strip work_/edu_ prefix) must be kept in sync with frontend
    (e.g. cvQualityStore dismissWritingCorrection).
    """
    if correction_id.startswith("work_") and len(correction_id) > 5:
        return correction_id[5:]
    if correction_id.startswith("edu_") and len(correction_id) > 4:
        return correction_id[4:]
    return correction_id


def find_correction_by_id(
    quality_data: CVQualityAnalysisResponseSchemaV2, correction_id: str
) -> WritingCorrectionSchema:
    """
    Find a writing correction by item_id; builds synthetic WritingCorrection from issues.
    Also matches by field_path prefix so section-level ids (e.g. personal_info,
    professional_summary) work when issues have no item_id. Accepts frontend
    prefixed ids (work_<uuid>, edu_<uuid>) by normalizing to the stored UUID.
    """
    resolved_id = _normalize_correction_id(correction_id)
    issues_with_html = [
        i
        for i in quality_data.issues
        if i.html_diff
        and (
            (i.item_id or "") == correction_id
            or (i.item_id or "") == resolved_id
            or (i.field_path or "").startswith(correction_id + ".")
            or (i.field_path or "") == correction_id
        )
    ]
    if not issues_with_html:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Writing correction with item_id '{correction_id}' not found in analysis",
        )
    return _synthetic_correction_from_issues(issues_with_html, correction_id)


def find_corrections_batch(
    quality_data: CVQualityAnalysisResponseSchemaV2, correction_ids: List[str]
) -> List[WritingCorrectionSchema]:
    """Find multiple writing corrections by item_ids."""
    unique_correction_ids = list(dict.fromkeys(correction_ids))
    corrections = []
    for correction_id in unique_correction_ids:
        corrections.append(find_correction_by_id(quality_data, correction_id))
    return corrections


def remove_applied_corrections_from_quality_data(
    quality_data: CVQualityAnalysisResponseSchemaV2, correction_ids: List[str]
) -> dict:
    """Remove all issues whose item_id is in correction_ids or whose field_path matches a section-level id (e.g. personal_info.xxx). Accepts prefixed ids (work_xxx, edu_xxx) by including normalized UUIDs."""
    ids_to_remove = set(correction_ids)
    for rid in list(ids_to_remove):
        ids_to_remove.add(_normalize_correction_id(rid))

    # ids_to_remove: for item_id matching (includes normalized IDs, e.g. work_<uuid> -> uuid).
    # correction_ids (raw): for field_path prefix matching only (section-level e.g. personal_info, professional_summary).
    def should_remove(issue: Any) -> bool:
        if (issue.item_id or "") in ids_to_remove:
            return True
        path = getattr(issue, "field_path", None) or ""
        return any(path == rid or path.startswith(rid + ".") for rid in correction_ids)

    new_issues = [i for i in quality_data.issues if not should_remove(i)]
    updated = quality_data.model_dump(by_alias=True)
    updated["issues"] = [i.model_dump(by_alias=True) for i in new_issues]
    return updated


def update_analysis_after_applying_corrections(
    db: Session,
    analysis: CVQualityAnalysis,
    quality_data: CVQualityAnalysisResponseSchemaV2,
    correction_ids: List[str],
) -> None:
    """
    Update analysis.quality_data to remove applied corrections and commit.

    Call after applying writing corrections so GET latest analysis returns
    correct state (applied corrections no longer listed).

    Args:
        db: Database session
        analysis: CVQualityAnalysis record to update
        quality_data: Parsed quality analysis data (before removal)
        correction_ids: item_ids of applied corrections to remove
    """
    updated_quality_data = remove_applied_corrections_from_quality_data(
        quality_data, correction_ids
    )
    analysis.quality_data = updated_quality_data
    db.commit()
    db.refresh(analysis)


def update_cv_with_corrections(
    db: Session, cv_id: str, user_id: str, updated_cv_data: dict
) -> CV:
    """
    Update CV with corrected data and handle errors.

    Args:
        db: Database session
        cv_id: CV ID to update
        user_id: User ID for ownership check
        updated_cv_data: New CV parsed_data

    Returns:
        CV: Updated CV

    Raises:
        HTTPException: 500 if update fails
    """
    updated_cv = update_cv(db, cv_id, user_id, updated_cv_data)
    if not updated_cv:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update CV",
        )
    return updated_cv
