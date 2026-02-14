"""
Unit tests for html_diff_utils module.

Tests the cleaning and normalization of html_diff strings and computed field derivation.
"""

from src.utils.html_diff_utils import (
    clean_html_diff_string,
    clean_quality_response_issues,
    extract_original_from_cv_data_issues,
    fill_skill_originals_from_cv_data,
)


class TestCleanHtmlDiffString:
    """Tests for clean_html_diff_string function."""

    def test_clean_html_diff_with_newlines(self):
        """Test that literal \\n escape sequences are converted to actual newlines."""
        input_diff = "- Item 1\\n- Item 2\\n- Item 3"
        result = clean_html_diff_string(input_diff)

        # Verify actual newlines exist
        assert "\n" in result
        assert "\\n" not in result  # No literal escape sequences remain

        # Verify the structure
        lines = result.split("\n")
        assert len(lines) == 3
        assert lines[0] == "- Item 1"
        assert lines[1] == "- Item 2"
        assert lines[2] == "- Item 3"

    def test_clean_html_diff_with_double_newlines(self):
        """Test that double \\n creates paragraph breaks."""
        input_diff = "Paragraph 1\\n\\nParagraph 2"
        result = clean_html_diff_string(input_diff)

        # Should have two newlines (paragraph break)
        assert "\n\n" in result
        assert "\\n" not in result

        # Verify paragraphs are separated
        paragraphs = result.split("\n\n")
        assert len(paragraphs) == 2
        assert paragraphs[0] == "Paragraph 1"
        assert paragraphs[1] == "Paragraph 2"

    def test_clean_html_diff_with_newlines_and_html(self):
        """Test newlines work correctly with HTML diff formatting."""
        input_diff = "- <del>Old item</del>\\n- <ins>New item</ins>\\n- Unchanged item"
        result = clean_html_diff_string(input_diff)

        # Verify newlines are converted
        assert "\n" in result
        assert "\\n" not in result

        # Verify HTML is preserved
        assert "<del>Old item</del>" in result
        assert "<ins>New item</ins>" in result

        # Verify structure
        lines = result.split("\n")
        assert len(lines) == 3

    def test_clean_html_diff_with_no_newlines(self):
        """Test that strings without \\n are unchanged."""
        input_diff = "Simple text without newlines"
        result = clean_html_diff_string(input_diff)
        assert result == input_diff

    def test_clean_html_diff_with_actual_newlines(self):
        """Test that strings with actual newlines are preserved."""
        input_diff = "Line 1\nLine 2\nLine 3"
        result = clean_html_diff_string(input_diff)

        # Should preserve the actual newlines
        assert result == input_diff
        lines = result.split("\n")
        assert len(lines) == 3

    def test_clean_html_diff_none_input(self):
        """Test that None input is handled gracefully."""
        result = clean_html_diff_string(None)
        assert result is None

    def test_clean_html_diff_empty_string(self):
        """Test that empty string is handled gracefully."""
        result = clean_html_diff_string("")
        assert result == ""


class TestExtractOriginalFromCvDataIssues:
    """Tests for extract_original_from_cv_data_issues id_mapping with array-style field_path."""

    def test_maps_short_id_to_actual_id_when_field_path_has_array_index(self):
        """issue with field_path work_experience[1].position and item_id 2 should use id_mapping work_experience."""
        actual_uuid = "work_abc-123-def"
        response = {
            "issues": [
                {
                    "field_path": "work_experience[1].position",
                    "item_id": "2",
                    "item_type": "work_experience",
                    "issue_severity": "critical",
                    "reasoning": "Contains profanity",
                    "html_diff": "<del>Bad</del><ins>Good</ins>",
                }
            ]
        }
        cv_data = {
            "work_experience": [
                {"id": "work_first", "description": "First job"},
                {"id": actual_uuid, "description": "Second job"},
            ]
        }
        id_mapping = {"work_experience": {"1": "work_first", "2": actual_uuid}}

        result = extract_original_from_cv_data_issues(response, cv_data, id_mapping)

        assert result["issues"][0]["item_id"] == actual_uuid

    def test_professional_summary_issue_gets_original_from_cv_data(self):
        """issue with item_type professional_summary gets original from cv_data."""
        response = {
            "issues": [
                {
                    "item_type": "professional_summary",
                    "item_id": None,
                    "field_path": "professional_summary",
                    "issue_severity": "minor",
                    "reasoning": "Grammar fix",
                    "html_diff": "<del>sumary</del><ins>summary</ins>",
                }
            ]
        }
        cv_data = {"professional_summary": {"content": "My sumary text."}}
        result = extract_original_from_cv_data_issues(response, cv_data, None)
        assert result["issues"][0]["original"] == "My sumary text."


class TestCleanQualityResponseIssuesProfessionalSummary:
    """Tests: no top-level professional_summary is added; frontend uses issues only."""

    def test_no_top_level_professional_summary_when_issue_present(self):
        """professional_summary is not added; issue remains in issues array."""
        response = {
            "issues": [
                {
                    "item_type": "professional_summary",
                    "field_path": "professional_summary",
                    "original": "My sumary.",
                    "html_diff": "<del>sumary</del><ins>summary</ins>",
                    "reasoning": "Spelling.",
                }
            ],
            "skills": {"technical": [], "soft": []},
        }
        cv_data = {"professional_summary": {"content": "My sumary."}}
        result = clean_quality_response_issues(response, cv_data)
        assert result.get("professional_summary") is None
        assert len(result["issues"]) == 1
        assert result["issues"][0]["item_type"] == "professional_summary"

    def test_omits_professional_summary_when_no_issue(self):
        """professional_summary is not in result when there are no issues."""
        response = {"issues": [], "skills": {"technical": [], "soft": []}}
        cv_data = {"professional_summary": {"content": "Existing summary."}}
        result = clean_quality_response_issues(response, cv_data)
        assert result.get("professional_summary") is None

    def test_no_top_level_professional_summary_for_coaching_only_issue(self):
        """professional_summary is not added for coaching-only issue; issue remains."""
        response = {
            "issues": [
                {
                    "item_type": "professional_summary",
                    "field_path": "professional_summary",
                    "reasoning": "Summary too brief; add impact.",
                    "html_diff": None,
                }
            ],
            "skills": {"technical": [], "soft": []},
        }
        cv_data = {"professional_summary": {"content": "Short summary."}}
        result = clean_quality_response_issues(response, cv_data)
        assert result.get("professional_summary") is None
        assert len(result["issues"]) == 1
        assert result["issues"][0]["reasoning"] == "Summary too brief; add impact."


class TestFillSkillOriginalsFromCvData:
    """Tests for fill_skill_originals_from_cv_data: derive missing original from CV."""

    def test_fills_original_when_suggested_matches_cv_technical(self):
        """When skill suggestion has no original but matches CV technical (case-insensitive), original is set to CV string."""
        response = {
            "skills": {
                "technical": [
                    {"skill": "Python", "reasoning": "Capitalization fix."},
                    {"skill": "TypeScript", "reasoning": "Relevant for role."},
                ],
                "soft": [],
            }
        }
        cv_data = {
            "skills": {
                "technical": ["python", "FastAPI"],
                "soft": ["Communication"],
            }
        }
        result = fill_skill_originals_from_cv_data(response, cv_data)
        assert result["skills"]["technical"][0]["original"] == "python"
        assert result["skills"]["technical"][1].get("original") is None

    def test_fills_original_when_suggested_matches_cv_soft(self):
        """When skill suggestion matches CV soft skill, original is set to CV string."""
        response = {
            "skills": {
                "technical": [],
                "soft": [
                    {"skill": "Problem Solving", "reasoning": "Fix casing."},
                    {"skill": "Leadership", "reasoning": "New suggestion."},
                ],
            }
        }
        cv_data = {
            "skills": {
                "technical": [],
                "soft": ["problem solving", "Communication"],
            }
        }
        result = fill_skill_originals_from_cv_data(response, cv_data)
        assert result["skills"]["soft"][0]["original"] == "problem solving"
        assert result["skills"]["soft"][1].get("original") is None

    def test_leaves_original_unchanged_when_already_set(self):
        """When skill already has original, it is not overwritten."""
        response = {
            "skills": {
                "technical": [
                    {"skill": "Python", "reasoning": "Fix.", "original": "pyhton"},
                ],
                "soft": [],
            }
        }
        cv_data = {"skills": {"technical": ["Python", "pyhton"], "soft": []}}
        result = fill_skill_originals_from_cv_data(response, cv_data)
        assert result["skills"]["technical"][0]["original"] == "pyhton"

    def test_no_change_when_cv_data_empty(self):
        """When cv_data is None or has no skills, response is unchanged."""
        response = {
            "skills": {
                "technical": [{"skill": "Python", "reasoning": "New."}],
                "soft": [],
            }
        }
        result = fill_skill_originals_from_cv_data(response, None)
        assert result["skills"]["technical"][0].get("original") is None
        result2 = fill_skill_originals_from_cv_data(response, {})
        assert result2["skills"]["technical"][0].get("original") is None
