"""
CV Quality Analysis API Helper Functions

Helper functions for CV quality analysis endpoints to reduce code duplication.
Handles validation, loading, and parsing of CVs and quality analyses.
"""

import logging
from typing import List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from src.models.cv import CV
from src.models.cv_quality_analysis import CVQualityAnalysis
from src.schemas.cv_quality_schemas import (
    CVQualityAnalysisResponseSchema,
    WritingCorrectionSchema,
)
from src.services.cv_service import get_cv_by_id, update_cv

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


def parse_quality_data(analysis: CVQualityAnalysis) -> CVQualityAnalysisResponseSchema:
    """
    Parse quality analysis data into schema.

    Args:
        analysis: Quality analysis with quality_data dict

    Returns:
        CVQualityAnalysisResponseSchema: Parsed quality data

    Raises:
        HTTPException: 500 if quality data format is invalid
    """
    try:
        return CVQualityAnalysisResponseSchema(**analysis.quality_data)
    except Exception as e:
        logger.error(f"Failed to parse quality analysis data: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Invalid quality analysis data format",
        )


def find_correction_by_id(
    quality_data: CVQualityAnalysisResponseSchema, correction_id: str
) -> WritingCorrectionSchema:
    """
    Find a writing correction by item_id.

    Args:
        quality_data: Parsed quality analysis data
        correction_id: The item_id to find

    Returns:
        WritingCorrectionSchema: The found correction

    Raises:
        HTTPException: 404 if correction not found
    """
    for wc in quality_data.writing_corrections:
        if wc.item_id == correction_id:
            return wc

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Writing correction with item_id '{correction_id}' not found in analysis",
    )


def find_corrections_batch(
    quality_data: CVQualityAnalysisResponseSchema, correction_ids: List[str]
) -> List[WritingCorrectionSchema]:
    """
    Find multiple writing corrections by item_ids.

    Optimized with O(m+n) complexity using dictionary lookup instead of O(n*m).

    Args:
        quality_data: Parsed quality analysis data
        correction_ids: List of item_ids to find

    Returns:
        List[WritingCorrectionSchema]: List of found corrections in same order

    Raises:
        HTTPException: 404 if any correction not found
    """
    # Deduplicate correction IDs while preserving order
    unique_correction_ids = list(dict.fromkeys(correction_ids))

    # Build lookup dictionary O(m) where m = total corrections
    corrections_by_id = {wc.item_id: wc for wc in quality_data.writing_corrections}

    # Find corrections O(n) where n = requested corrections
    corrections = []
    for correction_id in unique_correction_ids:
        correction = corrections_by_id.get(correction_id)

        if not correction:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Writing correction with item_id '{correction_id}' not found in analysis",
            )

        corrections.append(correction)

    return corrections


def remove_applied_corrections_from_quality_data(
    quality_data: CVQualityAnalysisResponseSchema, correction_ids: List[str]
) -> dict:
    """
    Build quality_data dict with given writing corrections removed (by item_id).

    Used after applying corrections so GET latest analysis returns correct state.

    Args:
        quality_data: Parsed quality analysis data
        correction_ids: item_ids of applied corrections to remove

    Returns:
        dict: quality_data suitable for analysis.quality_data (JSON)
    """
    ids_to_remove = set(correction_ids)
    new_writing_corrections = [
        wc for wc in quality_data.writing_corrections if wc.item_id not in ids_to_remove
    ]
    updated = quality_data.model_dump()
    updated["writing_corrections"] = [wc.model_dump() for wc in new_writing_corrections]
    return updated


def update_analysis_after_applying_corrections(
    db: Session,
    analysis: CVQualityAnalysis,
    quality_data: CVQualityAnalysisResponseSchema,
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
