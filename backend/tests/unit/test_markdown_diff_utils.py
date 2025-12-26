"""
Unit tests for markdown_diff_utils module.

Tests the cleaning and normalization of markdown_diff strings.
"""

import pytest
from src.utils.markdown_diff_utils import (
    clean_markdown_diff_string,
    clean_quality_response,
)


class TestCleanMarkdownDiffString:
    """Tests for clean_markdown_diff_string function."""

    def test_clean_markdown_diff_with_newlines(self):
        """Test that literal \\n escape sequences are converted to actual newlines."""
        input_diff = "- Item 1\\n- Item 2\\n- Item 3"
        result = clean_markdown_diff_string(input_diff)

        # Verify actual newlines exist
        assert "\n" in result
        assert "\\n" not in result  # No literal escape sequences remain

        # Verify the structure
        lines = result.split("\n")
        assert len(lines) == 3
        assert lines[0] == "- Item 1"
        assert lines[1] == "- Item 2"
        assert lines[2] == "- Item 3"

    def test_clean_markdown_diff_with_double_newlines(self):
        """Test that double \\n creates paragraph breaks."""
        input_diff = "Paragraph 1\\n\\nParagraph 2"
        result = clean_markdown_diff_string(input_diff)

        # Should have two newlines (paragraph break)
        assert "\n\n" in result
        assert "\\n" not in result

        # Verify paragraphs are separated
        paragraphs = result.split("\n\n")
        assert len(paragraphs) == 2
        assert paragraphs[0] == "Paragraph 1"
        assert paragraphs[1] == "Paragraph 2"

    def test_clean_markdown_diff_with_newlines_and_markdown(self):
        """Test newlines work correctly with markdown formatting."""
        input_diff = "- ~~Old item~~\\n- **New item**\\n- Unchanged item"
        result = clean_markdown_diff_string(input_diff)

        # Verify newlines are converted
        assert "\n" in result
        assert "\\n" not in result

        # Verify markdown is preserved
        assert "~~Old item~~" in result
        assert "**New item**" in result

        # Verify structure
        lines = result.split("\n")
        assert len(lines) == 3

    def test_clean_markdown_diff_with_no_newlines(self):
        """Test that strings without \\n are unchanged."""
        input_diff = "Simple text without newlines"
        result = clean_markdown_diff_string(input_diff)
        assert result == input_diff

    def test_clean_markdown_diff_with_actual_newlines(self):
        """Test that strings with actual newlines are preserved."""
        input_diff = "Line 1\nLine 2\nLine 3"
        result = clean_markdown_diff_string(input_diff)

        # Should preserve the actual newlines
        assert result == input_diff
        lines = result.split("\n")
        assert len(lines) == 3

    def test_clean_markdown_diff_empty_strikethrough(self):
        """Test that empty strikethrough markers are removed."""
        input_diff = "Text ~~ ~~ more text"
        result = clean_markdown_diff_string(input_diff)
        assert result == "Text  more text"

    def test_clean_markdown_diff_trailing_space_strikethrough(self):
        """Test that trailing spaces in strikethrough are removed."""
        input_diff = "~~text ~~"
        result = clean_markdown_diff_string(input_diff)
        assert result == "~~text~~"

    def test_clean_markdown_diff_leading_space_strikethrough(self):
        """Test that leading spaces in strikethrough are removed."""
        input_diff = "~~ text~~"
        result = clean_markdown_diff_string(input_diff)
        assert result == "~~text~~"

    def test_clean_markdown_diff_none_input(self):
        """Test that None input is handled gracefully."""
        result = clean_markdown_diff_string(None)
        assert result is None

    def test_clean_markdown_diff_empty_string(self):
        """Test that empty string is handled gracefully."""
        result = clean_markdown_diff_string("")
        assert result == ""


class TestCleanQualityResponse:
    """Tests for clean_quality_response function."""

    def test_clean_quality_response_with_newlines_in_field_corrections(self):
        """Test that newlines are cleaned in field_corrections."""
        response = {
            "writing_corrections": [
                {
                    "field_corrections": [
                        {
                            "field_name": "description",
                            "markdown_diff": "- Item 1\\n- Item 2",
                        }
                    ]
                }
            ]
        }

        result = clean_quality_response(response)

        markdown_diff = result["writing_corrections"][0]["field_corrections"][0][
            "markdown_diff"
        ]
        assert "\n" in markdown_diff
        assert "\\n" not in markdown_diff
        assert markdown_diff == "- Item 1\n- Item 2"

    def test_clean_quality_response_with_newlines_in_professional_summary(self):
        """Test that newlines are cleaned in professional_summary."""
        response = {"professional_summary": {"markdown_diff": "Line 1\\nLine 2\\nLine 3"}}

        result = clean_quality_response(response)

        markdown_diff = result["professional_summary"]["markdown_diff"]
        assert "\n" in markdown_diff
        assert "\\n" not in markdown_diff
        lines = markdown_diff.split("\n")
        assert len(lines) == 3

    def test_clean_quality_response_with_newlines_in_work_experience(self):
        """Test that newlines are cleaned in work_experience low_score items."""
        response = {
            "work_experience": [
                {"item_type": "low_score", "markdown_diff": "- Point 1\\n- Point 2"}
            ]
        }

        result = clean_quality_response(response)

        markdown_diff = result["work_experience"][0]["markdown_diff"]
        assert "\n" in markdown_diff
        assert "\\n" not in markdown_diff
        assert markdown_diff == "- Point 1\n- Point 2"

    def test_clean_quality_response_with_newlines_in_education(self):
        """Test that newlines are cleaned in education low_score items."""
        response = {
            "education": [
                {"item_type": "low_score", "markdown_diff": "Bullet 1\\nBullet 2"}
            ]
        }

        result = clean_quality_response(response)

        markdown_diff = result["education"][0]["markdown_diff"]
        assert "\n" in markdown_diff
        assert "\\n" not in markdown_diff

    def test_clean_quality_response_none_input(self):
        """Test that None input is handled gracefully."""
        result = clean_quality_response(None)
        assert result is None

    def test_clean_quality_response_empty_dict(self):
        """Test that empty dict is handled gracefully."""
        result = clean_quality_response({})
        assert result == {}

    def test_clean_quality_response_preserves_other_fields(self):
        """Test that cleaning doesn't affect other fields."""
        response = {
            "writing_corrections": [
                {
                    "field_corrections": [
                        {
                            "field_name": "description",
                            "markdown_diff": "Text\\nwith\\nnewlines",
                            "severity": "medium",
                        }
                    ],
                    "section_name": "work_experience",
                }
            ],
            "overall_score": 8.5,
        }

        result = clean_quality_response(response)

        # Check markdown_diff was cleaned
        markdown_diff = result["writing_corrections"][0]["field_corrections"][0][
            "markdown_diff"
        ]
        assert "\n" in markdown_diff
        assert "\\n" not in markdown_diff

        # Check other fields preserved
        assert (
            result["writing_corrections"][0]["field_corrections"][0]["severity"]
            == "medium"
        )
        assert result["writing_corrections"][0]["section_name"] == "work_experience"
        assert result["overall_score"] == 8.5
