"""
Unit tests for html_diff_utils module.

Tests the cleaning and normalization of html_diff strings and computed field derivation.
"""

import pytest
from src.utils.html_diff_utils import (
    clean_html_diff_string,
    clean_quality_response,
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


class TestCleanQualityResponse:
    """Tests for clean_quality_response function."""

    def test_clean_quality_response_computes_corrected_value(self):
        """Test that corrected_value is computed from html_diff for field_corrections."""
        response = {
            "writing_corrections": [
                {
                    "field_corrections": [
                        {
                            "field_name": "position",
                            "original_value": "Dev",
                            "html_diff": "<del>Dev</del><ins>Developer</ins>",
                        }
                    ]
                }
            ]
        }

        result = clean_quality_response(response)

        field_corr = result["writing_corrections"][0]["field_corrections"][0]
        assert "corrected_value" in field_corr
        assert field_corr["corrected_value"] == "Developer"
        assert field_corr["html_diff"] == "<del>Dev</del><ins>Developer</ins>"

    def test_clean_quality_response_with_newlines_in_field_corrections(self):
        """Test that newlines are cleaned in field_corrections."""
        response = {
            "writing_corrections": [
                {
                    "field_corrections": [
                        {
                            "field_name": "description",
                            "original_value": "Original text",
                            "html_diff": "- Item 1\\n- Item 2",
                        }
                    ]
                }
            ]
        }

        result = clean_quality_response(response)

        html_diff = result["writing_corrections"][0]["field_corrections"][0]["html_diff"]
        assert "\n" in html_diff
        assert "\\n" not in html_diff
        assert html_diff == "- Item 1\n- Item 2"

    def test_clean_quality_response_computes_suggested_text(self):
        """Test that suggested_text is computed from html_diff for professional_summary."""
        response = {
            "professional_summary": {
                "original_text": "Original summary text",
                "html_diff": "Original summary <del>text</del><ins>content</ins>",
            }
        }

        result = clean_quality_response(response)

        ps = result["professional_summary"]
        assert "suggested_text" in ps
        assert ps["suggested_text"] == "Original summary content"

    def test_clean_quality_response_with_newlines_in_professional_summary(self):
        """Test that newlines are cleaned in professional_summary."""
        response = {
            "professional_summary": {
                "original_text": "Original",
                "html_diff": "Line 1\\nLine 2\\nLine 3",
            }
        }

        result = clean_quality_response(response)

        html_diff = result["professional_summary"]["html_diff"]
        assert "\n" in html_diff
        assert "\\n" not in html_diff
        lines = html_diff.split("\n")
        assert len(lines) == 3

    def test_clean_quality_response_computes_suggested_for_work_experience(self):
        """Test that suggested is computed from html_diff for low_score work_experience items."""
        response = {
            "work_experience": [
                {
                    "item_type": "low_score",
                    "original": "Original description",
                    "html_diff": "Original <del>description</del><ins>content</ins>",
                }
            ]
        }

        result = clean_quality_response(response)

        item = result["work_experience"][0]
        assert "suggested" in item
        assert item["suggested"] == "Original content"

    def test_clean_quality_response_with_newlines_in_work_experience(self):
        """Test that newlines are cleaned in work_experience low_score items."""
        response = {
            "work_experience": [
                {
                    "item_type": "low_score",
                    "original": "Original",
                    "html_diff": "- Point 1\\n- Point 2",
                }
            ]
        }

        result = clean_quality_response(response)

        html_diff = result["work_experience"][0]["html_diff"]
        assert "\n" in html_diff
        assert "\\n" not in html_diff
        assert html_diff == "- Point 1\n- Point 2"

    def test_clean_quality_response_computes_suggested_for_education(self):
        """Test that suggested is computed from html_diff for low_score education items."""
        response = {
            "education": [
                {
                    "item_type": "low_score",
                    "original": "Original description",
                    "html_diff": "Original <del>description</del><ins>content</ins>",
                }
            ]
        }

        result = clean_quality_response(response)

        item = result["education"][0]
        assert "suggested" in item
        assert item["suggested"] == "Original content"

    def test_clean_quality_response_with_newlines_in_education(self):
        """Test that newlines are cleaned in education low_score items."""
        response = {
            "education": [
                {
                    "item_type": "low_score",
                    "original": "Original",
                    "html_diff": "Bullet 1\\nBullet 2",
                }
            ]
        }

        result = clean_quality_response(response)

        html_diff = result["education"][0]["html_diff"]
        assert "\n" in html_diff
        assert "\\n" not in html_diff

    def test_clean_quality_response_none_input(self):
        """Test that None input is handled gracefully."""
        result = clean_quality_response(None)
        assert result is None

    def test_clean_quality_response_empty_dict(self):
        """Test that empty dict is handled gracefully."""
        result = clean_quality_response({})
        assert result == {}

    def test_clean_quality_response_preserves_other_fields(self):
        """Test that cleaning and computation don't affect other fields."""
        response = {
            "writing_corrections": [
                {
                    "field_corrections": [
                        {
                            "field_name": "description",
                            "original_value": "Original",
                            "html_diff": "Text\\nwith\\nnewlines",
                            "severity": "medium",
                        }
                    ],
                    "section_name": "work_experience",
                }
            ],
            "overall_quality_score": 85,
        }

        result = clean_quality_response(response)

        # Check html_diff was cleaned
        html_diff = result["writing_corrections"][0]["field_corrections"][0]["html_diff"]
        assert "\n" in html_diff
        assert "\\n" not in html_diff

        # Check corrected_value was computed
        field_corr = result["writing_corrections"][0]["field_corrections"][0]
        assert "corrected_value" in field_corr

        # Check other fields preserved
        assert field_corr["severity"] == "medium"
        assert result["writing_corrections"][0]["section_name"] == "work_experience"
        assert result["overall_quality_score"] == 85
