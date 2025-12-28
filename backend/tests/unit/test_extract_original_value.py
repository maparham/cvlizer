"""
Unit tests for extracting original_value from CV data in field_corrections.

Tests the enhanced extract_original_from_cv_data function.
"""

import pytest
from src.utils.html_diff_utils import extract_original_from_cv_data


class TestExtractOriginalValueFromCVData:
    """Tests for extracting original_value for field_corrections."""

    def test_extract_original_value_for_work_experience_field(self):
        """Test extracting original_value for work_experience field correction."""
        cv_data = {
            "work_experience": [
                {
                    "id": "123",
                    "company": "Tech Corp",
                    "position": "Dev",
                    "location": "SF",
                    "description": "Built features",
                }
            ]
        }

        response = {
            "writing_corrections": [
                {
                    "item_id": "123",
                    "section": "work_experience",
                    "field_corrections": [
                        {
                            "field_name": "position",
                            "html_diff": "<del>Dev</del><ins>Developer</ins>",
                        }
                    ],
                }
            ]
        }

        result = extract_original_from_cv_data(response, cv_data)

        field_corr = result["writing_corrections"][0]["field_corrections"][0]
        assert "original_value" in field_corr
        assert field_corr["original_value"] == "Dev"

    def test_extract_original_value_for_education_field(self):
        """Test extracting original_value for education field correction."""
        cv_data = {
            "education": [
                {
                    "id": "456",
                    "institution": "MIT",
                    "degree": "BS CS",
                    "location": "Cambridge",
                    "description": "Studied CS",
                }
            ]
        }

        response = {
            "writing_corrections": [
                {
                    "item_id": "456",
                    "section": "education",
                    "field_corrections": [
                        {
                            "field_name": "degree",
                            "html_diff": "<del>BS CS</del><ins>Bachelor of Science in Computer Science</ins>",
                        }
                    ],
                }
            ]
        }

        result = extract_original_from_cv_data(response, cv_data)

        field_corr = result["writing_corrections"][0]["field_corrections"][0]
        assert "original_value" in field_corr
        assert field_corr["original_value"] == "BS CS"

    def test_extract_original_value_for_professional_summary(self):
        """Test extracting original_value for professional_summary field correction."""
        cv_data = {
            "professional_summary": {"content": "Senior engineer with 5 years experience"}
        }

        response = {
            "writing_corrections": [
                {
                    "item_id": "prof_summary",
                    "section": "professional_summary",
                    "field_corrections": [
                        {
                            "field_name": "content",
                            "html_diff": "Senior <del>engineer</del><ins>software engineer</ins> with 5 years experience",
                        }
                    ],
                }
            ]
        }

        result = extract_original_from_cv_data(response, cv_data)

        field_corr = result["writing_corrections"][0]["field_corrections"][0]
        assert "original_value" in field_corr
        assert field_corr["original_value"] == "Senior engineer with 5 years experience"

    def test_extract_original_value_multiple_fields(self):
        """Test extracting original_value for multiple field corrections."""
        cv_data = {
            "work_experience": [
                {
                    "id": "123",
                    "company": "Tech Corp",
                    "position": "Dev",
                    "location": "SF",
                }
            ]
        }

        response = {
            "writing_corrections": [
                {
                    "item_id": "123",
                    "section": "work_experience",
                    "field_corrections": [
                        {
                            "field_name": "position",
                            "html_diff": "<del>Dev</del><ins>Developer</ins>",
                        },
                        {
                            "field_name": "location",
                            "html_diff": "<del>SF</del><ins>San Francisco, CA</ins>",
                        },
                    ],
                }
            ]
        }

        result = extract_original_from_cv_data(response, cv_data)

        field_corrs = result["writing_corrections"][0]["field_corrections"]
        assert field_corrs[0]["original_value"] == "Dev"
        assert field_corrs[1]["original_value"] == "SF"

    def test_extract_original_value_missing_field(self):
        """Test extracting original_value when field is missing in CV data."""
        cv_data = {
            "work_experience": [
                {
                    "id": "123",
                    "company": "Tech Corp",
                    # position field is missing
                }
            ]
        }

        response = {
            "writing_corrections": [
                {
                    "item_id": "123",
                    "section": "work_experience",
                    "field_corrections": [
                        {
                            "field_name": "position",
                            "html_diff": "<ins>Software Developer</ins>",
                        }
                    ],
                }
            ]
        }

        result = extract_original_from_cv_data(response, cv_data)

        field_corr = result["writing_corrections"][0]["field_corrections"][0]
        assert "original_value" in field_corr
        assert field_corr["original_value"] == ""

    def test_extract_original_value_item_not_found(self):
        """Test extracting original_value when item is not found in CV data."""
        cv_data = {"work_experience": [{"id": "999", "company": "Other Corp"}]}

        response = {
            "writing_corrections": [
                {
                    "item_id": "123",  # Not in CV data
                    "section": "work_experience",
                    "field_corrections": [
                        {
                            "field_name": "position",
                            "html_diff": "<ins>Developer</ins>",
                        }
                    ],
                }
            ]
        }

        result = extract_original_from_cv_data(response, cv_data)

        field_corr = result["writing_corrections"][0]["field_corrections"][0]
        assert "original_value" in field_corr
        assert field_corr["original_value"] == ""

    def test_extract_original_value_empty_field(self):
        """Test extracting original_value when field exists but is empty."""
        cv_data = {
            "work_experience": [
                {
                    "id": "123",
                    "company": "Tech Corp",
                    "position": "",  # Empty string
                }
            ]
        }

        response = {
            "writing_corrections": [
                {
                    "item_id": "123",
                    "section": "work_experience",
                    "field_corrections": [
                        {
                            "field_name": "position",
                            "html_diff": "<ins>Software Developer</ins>",
                        }
                    ],
                }
            ]
        }

        result = extract_original_from_cv_data(response, cv_data)

        field_corr = result["writing_corrections"][0]["field_corrections"][0]
        assert "original_value" in field_corr
        assert field_corr["original_value"] == ""

    def test_extract_original_preserves_existing_work_experience_logic(self):
        """Test that existing work_experience 'original' extraction still works."""
        cv_data = {
            "work_experience": [
                {
                    "id": "123",
                    "company": "Tech Corp",
                    "description": "Built amazing features",
                }
            ]
        }

        response = {
            "work_experience": [
                {
                    "item_type": "low_score",
                    "item_id": "123",
                    "quality_score": 30,
                }
            ]
        }

        result = extract_original_from_cv_data(response, cv_data)

        # Should still extract 'original' field for low_score items
        assert "original" in result["work_experience"][0]
        assert result["work_experience"][0]["original"] == "Built amazing features"

    def test_extract_original_preserves_existing_education_logic(self):
        """Test that existing education 'original' extraction still works."""
        cv_data = {
            "education": [
                {
                    "id": "456",
                    "institution": "MIT",
                    "description": "Studied computer science",
                }
            ]
        }

        response = {
            "education": [
                {
                    "item_type": "low_score",
                    "item_id": "456",
                    "quality_score": 25,
                }
            ]
        }

        result = extract_original_from_cv_data(response, cv_data)

        # Should still extract 'original' field for low_score items
        assert "original" in result["education"][0]
        assert result["education"][0]["original"] == "Studied computer science"

    def test_extract_handles_none_input(self):
        """Test that None input is handled gracefully."""
        result = extract_original_from_cv_data(None, {})
        assert result is None

    def test_extract_handles_empty_dict(self):
        """Test that empty dict input is handled gracefully."""
        result = extract_original_from_cv_data({}, {})
        assert result == {}
