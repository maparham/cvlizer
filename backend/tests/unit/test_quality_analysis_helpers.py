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
    remove_applied_corrections_from_quality_data,
    update_cv_with_corrections,
)
from src.schemas.cv_quality_schemas import (
    CVQualityAnalysisResponseSchemaV2,
    IssueSchema,
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
    """Test quality data parsing helper (V2 only)."""

    def test_success(self):
        """Test successful parsing of V2 quality data."""
        quality_dict = {
            "overall_quality_score": 85,
            "issues": [],
            "professional_summary": None,
            "skills": {},
            "timeline_gaps": [],
        }
        mock_analysis = Mock(quality_data=quality_dict)

        result = parse_quality_data(mock_analysis)

        assert isinstance(result, CVQualityAnalysisResponseSchemaV2)
        assert result.overall_quality_score == 85
        assert result.issues == []

    def test_invalid_format_raises_500(self):
        """Test invalid format raises 500"""
        mock_analysis = Mock(quality_data={"invalid": "schema"})

        with pytest.raises(HTTPException) as exc_info:
            parse_quality_data(mock_analysis)

        assert exc_info.value.status_code == 500
        assert "Invalid quality analysis data format" in exc_info.value.detail

    def test_parse_v2_issues_shape(self):
        """Test parsing cv_review_v2 (issues) quality data"""
        quality_dict = {
            "overall_quality_score": 70,
            "issues": [
                {
                    "item_type": "work_experience",
                    "item_id": "item1",
                    "field_path": "work_experience",
                    "issue_severity": "major",
                    "issue_category": "too_brief",
                    "quality_score": 40,
                    "reasoning": "Issue: too short; Impact: weak signal",
                    "html_diff": "<del>x</del><ins>y</ins>",
                    "coaching": None,
                },
            ],
            "professional_summary": {"original_text": "Summary", "html_diff": None},
            "skills": {},
            "timeline_gaps": [],
        }
        mock_analysis = Mock(quality_data=quality_dict)

        result = parse_quality_data(mock_analysis)

        assert isinstance(result, CVQualityAnalysisResponseSchemaV2)
        assert result.overall_quality_score == 70
        assert len(result.issues) == 1
        assert result.issues[0].item_id == "item1"
        assert result.issues[0].field_path == "work_experience"


class TestFindCorrectionById:
    """Test correction lookup helper (V2 only)."""

    def test_correction_not_found_raises_404(self):
        """Test correction not found raises 404"""
        quality_data = CVQualityAnalysisResponseSchemaV2(
            overall_quality_score=80,
            issues=[],
            professional_summary=None,
            skills={},
            timeline_gaps=[],
        )

        with pytest.raises(HTTPException) as exc_info:
            find_correction_by_id(quality_data, "wc999")

        assert exc_info.value.status_code == 404
        assert "wc999" in exc_info.value.detail
        assert "not found in analysis" in exc_info.value.detail

    def test_find_correction_from_issues(self):
        """Test finding correction from issues-based quality data (synthetic)"""
        issue = IssueSchema(
            item_type="work_experience",
            item_id="item1",
            field_path="work_experience",
            issue_severity="critical",
            issue_category="unprofessional_tone",
            quality_score=30,
            reasoning="Needs improvement",
            html_diff="<del>old</del><ins>new</ins>",
            coaching=None,
            original="old",
            suggested="new",
        )
        quality_data = CVQualityAnalysisResponseSchemaV2(
            overall_quality_score=70,
            issues=[issue],
            professional_summary=None,
            skills={},
            timeline_gaps=[],
        )

        result = find_correction_by_id(quality_data, "item1")

        assert isinstance(result, WritingCorrectionSchema)
        assert result.item_id == "item1"
        assert result.field_path == "work_experience"
        assert result.importance == "highly_recommended"
        assert len(result.field_corrections) == 1
        assert result.field_corrections[0].field_name == "description"
        assert result.field_corrections[0].html_diff == "<del>old</del><ins>new</ins>"

    def test_find_correction_derives_field_name_from_field_path(self):
        """Applying a correction uses the field from field_path (position, degree, description)."""
        for field_path, expected_field_name in [
            ("work_experience[1].position", "position"),
            ("work_experience[0].company", "company"),
            ("work_experience[2].description", "description"),
            ("education[0].degree", "degree"),
            ("education[3].institution", "institution"),
        ]:
            issue = IssueSchema(
                item_type="work_experience"
                if "work_experience" in field_path
                else "education",
                item_id="item1",
                field_path=field_path,
                issue_severity="critical",
                issue_category="unprofessional_tone",
                quality_score=30,
                reasoning="Fix spelling and tone in field",
                html_diff="<del>old</del><ins>new</ins>",
                coaching=None,
            )
            quality_data = CVQualityAnalysisResponseSchemaV2(
                overall_quality_score=70,
                issues=[issue],
                professional_summary=None,
                skills={},
                timeline_gaps=[],
            )
            result = find_correction_by_id(quality_data, "item1")
            assert (
                result.field_corrections[0].field_name == expected_field_name
            ), f"field_path {field_path!r} should yield field_name {expected_field_name!r}"


class TestFindCorrectionsBatch:
    """Test batch correction lookup helper (V2 only)."""

    def test_find_all_corrections(self):
        """Test finding all corrections in order from issues."""
        quality_data = CVQualityAnalysisResponseSchemaV2(
            overall_quality_score=75,
            issues=[
                IssueSchema(
                    item_type="work_experience",
                    item_id="wc1",
                    field_path="work_experience",
                    issue_severity="minor",
                    issue_category="too_brief",
                    quality_score=45,
                    reasoning="First issue: needs more detail",
                    html_diff="<del>a</del><ins>b</ins>",
                    coaching=None,
                ),
                IssueSchema(
                    item_type="education",
                    item_id="wc2",
                    field_path="education",
                    issue_severity="major",
                    issue_category="lacks_specificity",
                    quality_score=30,
                    reasoning="Second issue: needs more detail",
                    html_diff="<del>c</del><ins>d</ins>",
                    coaching=None,
                ),
                IssueSchema(
                    item_type="work_experience",
                    item_id="wc3",
                    field_path="work_experience",
                    issue_severity="critical",
                    issue_category="unprofessional_tone",
                    quality_score=20,
                    reasoning="Third issue: needs more detail",
                    html_diff="<del>e</del><ins>f</ins>",
                    coaching=None,
                ),
            ],
            professional_summary=None,
            skills={},
            timeline_gaps=[],
        )

        result = find_corrections_batch(quality_data, ["wc2", "wc1", "wc3"])

        assert len(result) == 3
        assert result[0].item_id == "wc2"
        assert result[1].item_id == "wc1"
        assert result[2].item_id == "wc3"

    def test_missing_correction_raises_404(self):
        """Test missing correction in batch raises 404"""
        quality_data = CVQualityAnalysisResponseSchemaV2(
            overall_quality_score=80,
            issues=[
                IssueSchema(
                    item_type="work_experience",
                    item_id="wc1",
                    field_path="work_experience",
                    issue_severity="minor",
                    issue_category="too_brief",
                    quality_score=40,
                    reasoning="Reasoning for batch test item",
                    html_diff="<del>x</del><ins>y</ins>",
                    coaching=None,
                ),
            ],
            professional_summary=None,
            skills={},
            timeline_gaps=[],
        )

        with pytest.raises(HTTPException) as exc_info:
            find_corrections_batch(quality_data, ["wc1", "wc999"])

        assert exc_info.value.status_code == 404
        assert "wc999" in exc_info.value.detail

    def test_empty_batch(self):
        """Test empty batch returns empty list"""
        quality_data = CVQualityAnalysisResponseSchemaV2(
            overall_quality_score=80,
            issues=[],
            professional_summary=None,
            skills={},
            timeline_gaps=[],
        )

        result = find_corrections_batch(quality_data, [])

        assert result == []


class TestRemoveAppliedCorrectionsFromQualityData:
    """Test remove applied corrections (V2 only)."""

    def test_removes_issues_by_item_id(self):
        """Test issues-based shape: issues with given item_ids removed"""
        quality_data = CVQualityAnalysisResponseSchemaV2(
            overall_quality_score=75,
            issues=[
                IssueSchema(
                    item_type="work_experience",
                    item_id="id1",
                    field_path="work_experience",
                    issue_severity="minor",
                    issue_category="too_brief",
                    quality_score=45,
                    reasoning="Brief text; needs more detail",
                    html_diff="<del>x</del><ins>y</ins>",
                    coaching=None,
                ),
                IssueSchema(
                    item_type="education",
                    item_id="id2",
                    field_path="education",
                    issue_severity="major",
                    issue_category="lacks_specificity",
                    quality_score=30,
                    reasoning="Vague text; needs more detail",
                    html_diff=None,
                    coaching=None,
                ),
            ],
            professional_summary=None,
            skills={},
            timeline_gaps=[],
        )

        updated = remove_applied_corrections_from_quality_data(quality_data, ["id1"])

        assert "issues" in updated
        assert len(updated["issues"]) == 1
        assert updated["issues"][0]["item_id"] == "id2"

    def test_removes_issues_by_section_level_id_exact_field_path(self):
        """Dismissing by section-level id (e.g. professional_summary) removes issue with field_path == that id."""
        quality_data = CVQualityAnalysisResponseSchemaV2(
            overall_quality_score=70,
            issues=[
                IssueSchema(
                    item_type="professional_summary",
                    item_id=None,
                    field_path="professional_summary",
                    issue_severity="major",
                    issue_category="insufficient_content",
                    quality_score=40,
                    reasoning="Summary too brief",
                    html_diff=None,
                    coaching=None,
                ),
                IssueSchema(
                    item_type="personal_info",
                    item_id=None,
                    field_path="personal_info.description",
                    issue_severity="minor",
                    issue_category="too_brief",
                    quality_score=45,
                    reasoning="Description brief",
                    html_diff=None,
                    coaching=None,
                ),
            ],
            professional_summary=None,
            skills={},
            timeline_gaps=[],
        )

        updated = remove_applied_corrections_from_quality_data(
            quality_data, ["professional_summary"]
        )

        assert "issues" in updated
        assert len(updated["issues"]) == 1
        assert updated["issues"][0]["field_path"] == "personal_info.description"


class TestUpdateCVWithCorrections:
    """Test CV update helper"""

    def test_success(self):
        """Test successful CV update mutates cv.parsed_data in place"""
        mock_cv = Mock()
        updated_data = {"updated": "data"}

        with patch(
            "src.api.ai.quality_analysis_helpers.update_cv_in_place"
        ) as mock_update:
            update_cv_with_corrections(mock_cv, updated_data)

            mock_update.assert_called_once_with(mock_cv, updated_data)
