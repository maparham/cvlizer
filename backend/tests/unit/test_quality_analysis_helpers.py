"""
Unit tests for CV quality analysis API helper functions.

Tests validation, loading, parsing, and error handling for all helpers.
"""

import pytest
from unittest.mock import Mock, patch
from fastapi import HTTPException

from src.api.ai.quality_analysis_helpers import (
    validate_and_load_cv,
    load_quality_analysis,
    parse_quality_data,
    find_correction_by_id,
    find_corrections_batch,
    update_cv_with_corrections,
)
from src.schemas.cv_quality_schemas import (
    CVQualityAnalysisResponseSchema,
    WritingCorrectionSchema,
)


class TestValidateAndLoadCV:
    """Test CV validation helper"""

    def test_success(self):
        """Test successful CV validation"""
        db = Mock()
        mock_cv = Mock(parsed_data={"test": "data"})

        with patch("src.api.ai.quality_analysis_helpers.get_cv_by_id") as mock_get:
            mock_get.return_value = mock_cv

            result = validate_and_load_cv(db, "cv123", "user123")

            assert result == mock_cv
            mock_get.assert_called_once_with(db, "cv123", "user123")

    def test_cv_not_found(self):
        """Test CV not found raises 404"""
        db = Mock()

        with patch("src.api.ai.quality_analysis_helpers.get_cv_by_id") as mock_get:
            mock_get.return_value = None

            with pytest.raises(HTTPException) as exc_info:
                validate_and_load_cv(db, "cv123", "user123")

            assert exc_info.value.status_code == 404
            assert "CV not found" in exc_info.value.detail

    def test_cv_not_parsed(self):
        """Test CV without parsed_data raises 404"""
        db = Mock()
        mock_cv = Mock(parsed_data=None)

        with patch("src.api.ai.quality_analysis_helpers.get_cv_by_id") as mock_get:
            mock_get.return_value = mock_cv

            with pytest.raises(HTTPException) as exc_info:
                validate_and_load_cv(db, "cv123", "user123")

            assert exc_info.value.status_code == 404
            assert "CV not found" in exc_info.value.detail


class TestLoadQualityAnalysis:
    """Test quality analysis loading helper"""

    def test_success(self):
        """Test successful analysis loading"""
        db = Mock()
        mock_analysis = Mock(quality_data={"test": "data"})
        db.query.return_value.filter.return_value.first.return_value = mock_analysis

        result = load_quality_analysis(db, "analysis123", "cv123", "user123")

        assert result == mock_analysis

    def test_analysis_not_found(self):
        """Test analysis not found raises 404"""
        db = Mock()
        db.query.return_value.filter.return_value.first.return_value = None

        with pytest.raises(HTTPException) as exc_info:
            load_quality_analysis(db, "analysis123", "cv123", "user123")

        assert exc_info.value.status_code == 404
        assert "Quality analysis not found" in exc_info.value.detail

    def test_analysis_no_data(self):
        """Test analysis without quality_data raises 404"""
        db = Mock()
        mock_analysis = Mock(quality_data=None)
        db.query.return_value.filter.return_value.first.return_value = mock_analysis

        with pytest.raises(HTTPException) as exc_info:
            load_quality_analysis(db, "analysis123", "cv123", "user123")

        assert exc_info.value.status_code == 404
        assert "Quality analysis not found" in exc_info.value.detail


class TestParseQualityData:
    """Test quality data parsing helper"""

    def test_success(self):
        """Test successful parsing"""
        # Use minimal valid quality data
        quality_dict = {
            "overall_quality_score": 85,
            "work_experience": [],
            "education": [],
            "writing_corrections": [],
            "content_coaching": [],
            "timeline_gaps": [],
        }
        mock_analysis = Mock(quality_data=quality_dict)

        result = parse_quality_data(mock_analysis)

        assert isinstance(result, CVQualityAnalysisResponseSchema)
        assert result.overall_quality_score == 85

    def test_invalid_format_raises_500(self):
        """Test invalid format raises 500"""
        mock_analysis = Mock(quality_data={"invalid": "schema"})

        with pytest.raises(HTTPException) as exc_info:
            parse_quality_data(mock_analysis)

        assert exc_info.value.status_code == 500
        assert "Invalid quality analysis data format" in exc_info.value.detail


class TestFindCorrectionById:
    """Test correction lookup helper"""

    def test_find_existing_correction(self):
        """Test finding existing correction"""
        correction1 = WritingCorrectionSchema(
            item_id="wc1",
            section="work_experience",
            reasoning="Test correction 1",
            importance="standard",
        )
        correction2 = WritingCorrectionSchema(
            item_id="wc2",
            section="education",
            reasoning="Test correction 2",
            importance="highly_recommended",
        )

        quality_data = Mock(writing_corrections=[correction1, correction2])

        result = find_correction_by_id(quality_data, "wc2")

        assert result == correction2

    def test_correction_not_found_raises_404(self):
        """Test correction not found raises 404"""
        quality_data = Mock(writing_corrections=[])

        with pytest.raises(HTTPException) as exc_info:
            find_correction_by_id(quality_data, "wc999")

        assert exc_info.value.status_code == 404
        assert "wc999" in exc_info.value.detail
        assert "not found in analysis" in exc_info.value.detail


class TestFindCorrectionsBatch:
    """Test batch correction lookup helper"""

    def test_find_all_corrections(self):
        """Test finding all corrections in order"""
        correction1 = WritingCorrectionSchema(
            item_id="wc1",
            section="work_experience",
            reasoning="Test correction 1",
            importance="standard",
        )
        correction2 = WritingCorrectionSchema(
            item_id="wc2",
            section="education",
            reasoning="Test correction 2",
            importance="standard",
        )
        correction3 = WritingCorrectionSchema(
            item_id="wc3",
            section="work_experience",
            reasoning="Test correction 3",
            importance="highly_recommended",
        )

        quality_data = Mock(writing_corrections=[correction1, correction2, correction3])

        result = find_corrections_batch(quality_data, ["wc2", "wc1", "wc3"])

        assert len(result) == 3
        assert result[0] == correction2  # Order preserved
        assert result[1] == correction1
        assert result[2] == correction3

    def test_missing_correction_raises_404(self):
        """Test missing correction in batch raises 404"""
        correction1 = WritingCorrectionSchema(
            item_id="wc1",
            section="work_experience",
            reasoning="Test correction",
            importance="standard",
        )

        quality_data = Mock(writing_corrections=[correction1])

        with pytest.raises(HTTPException) as exc_info:
            find_corrections_batch(quality_data, ["wc1", "wc999"])

        assert exc_info.value.status_code == 404
        assert "wc999" in exc_info.value.detail
        assert "not found in analysis" in exc_info.value.detail

    def test_empty_batch(self):
        """Test empty batch returns empty list"""
        quality_data = Mock(writing_corrections=[])

        result = find_corrections_batch(quality_data, [])

        assert result == []


class TestUpdateCVWithCorrections:
    """Test CV update helper"""

    def test_success(self):
        """Test successful CV update"""
        db = Mock()
        mock_cv = Mock()

        with patch("src.api.ai.quality_analysis_helpers.update_cv") as mock_update:
            mock_update.return_value = mock_cv

            result = update_cv_with_corrections(
                db, "cv123", "user123", {"updated": "data"}
            )

            assert result == mock_cv
            mock_update.assert_called_once_with(
                db, "cv123", "user123", {"updated": "data"}
            )

    def test_update_failure_raises_500(self):
        """Test update failure raises 500"""
        db = Mock()

        with patch("src.api.ai.quality_analysis_helpers.update_cv") as mock_update:
            mock_update.return_value = None

            with pytest.raises(HTTPException) as exc_info:
                update_cv_with_corrections(db, "cv123", "user123", {"updated": "data"})

            assert exc_info.value.status_code == 500
            assert "Failed to update CV" in exc_info.value.detail
