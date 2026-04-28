"""
Tests for categorized technical skills functionality.

Tests schema validation, PDF export, and backward compatibility
for the new categorized technical skills feature.
"""

import pytest
from src.schemas.cv_schemas import SkillsSchema
from src.schemas.ai_response_schemas.cv_parsing import SkillsResponseSchema
from src.services.cv.latex_export_service import _format_skills


class TestSkillsSchemaValidation:
    """Test SkillsSchema validation for both flat and categorized formats."""

    def test_flat_technical_skills_legacy_format(self):
        """Test that legacy flat list format is still accepted."""
        data = {
            "technical": ["Python", "Docker", "JavaScript"],
            "soft": ["Leadership", "Communication"],
            "languages": [],
        }
        schema = SkillsSchema(**data)
        assert schema.technical == ["Python", "Docker", "JavaScript"]
        assert schema.soft == ["Leadership", "Communication"]

    def test_categorized_technical_skills_new_format(self):
        """Test that new categorized dictionary format is accepted."""
        data = {
            "technical": {
                "Programming Languages": ["Python", "JavaScript", "TypeScript"],
                "DevOps & Infrastructure": ["Docker", "Kubernetes", "Git"],
                "Databases": ["PostgreSQL", "MongoDB"],
            },
            "soft": ["Leadership", "Communication"],
            "languages": [],
        }
        schema = SkillsSchema(**data)
        assert isinstance(schema.technical, dict)
        assert "Programming Languages" in schema.technical
        assert "Python" in schema.technical["Programming Languages"]

    def test_empty_categories_filtered_out(self):
        """Test that empty categories are filtered during validation."""
        data = {
            "technical": {
                "Programming Languages": ["Python"],
                "Empty Category": [],
                "DevOps": ["Docker"],
            },
            "soft": [],
            "languages": [],
        }
        schema = SkillsSchema(**data)
        # Empty categories should be filtered out
        assert "Empty Category" not in schema.technical
        assert "Programming Languages" in schema.technical
        assert "DevOps" in schema.technical

    def test_invalid_category_names_filtered(self):
        """Test that invalid category names (empty strings, whitespace) are filtered."""
        data = {
            "technical": {
                "": ["Python"],
                "  ": ["JavaScript"],
                "Valid Category": ["Docker"],
            },
            "soft": [],
            "languages": [],
        }
        schema = SkillsSchema(**data)
        # Invalid categories should be filtered
        assert "" not in schema.technical
        assert "  " not in schema.technical
        assert "Valid Category" in schema.technical


class TestSkillsResponseSchemaValidation:
    """Test SkillsResponseSchema for AI parsing output."""

    def test_ai_parsing_categorized_output(self):
        """Test that AI parsing schema accepts categorized list format."""
        data = {
            "technical": [
                {"category": "Programming Languages", "skills": ["Python", "Java"]},
                {"category": "Cloud Platforms", "skills": ["AWS", "Azure"]},
            ],
            "soft": ["Problem Solving"],
            "languages": [],
        }
        schema = SkillsResponseSchema(**data)
        assert isinstance(schema.technical, list)
        assert len(schema.technical) == 2

    def test_ai_parsing_fallback_to_categorized(self):
        """Test that flat list input is converted to one category object."""
        data = {
            "technical": ["Python", "Docker"],
            "soft": ["Leadership"],
            "languages": [],
        }
        schema = SkillsResponseSchema(**data)
        assert isinstance(schema.technical, list)
        assert schema.technical[0].category == "Technical"
        assert schema.technical[0].skills == ["Python", "Docker"]


class TestPDFExportCategorizedSkills:
    """Test PDF export with categorized technical skills."""

    def test_pdf_format_categorized_skills(self):
        """Test that PDF export handles categorized technical skills."""
        skills = {
            "technical": {
                "Programming Languages": ["Python", "JavaScript"],
                "DevOps": ["Docker", "Kubernetes"],
            },
            "soft": ["Leadership"],
            "languages": [{"language": "English", "proficiency": "Fluent"}],
        }
        result = _format_skills(skills)

        # Should contain category names
        assert "Programming Languages" in result
        assert "DevOps" in result
        # Should contain skills
        assert "Python" in result
        assert "Docker" in result
        # Should contain soft skills
        assert "Leadership" in result

    def test_pdf_format_legacy_flat_skills(self):
        """Test that PDF export still handles legacy flat list format."""
        skills = {
            "technical": ["Python", "Docker", "JavaScript"],
            "soft": ["Leadership"],
            "languages": [],
        }
        result = _format_skills(skills)

        # Should have Technical label
        assert "Technical:" in result
        # Should contain skills
        assert "Python" in result
        assert "Docker" in result

    def test_pdf_format_mixed_empty_categories(self):
        """Test that empty categories are skipped in PDF export."""
        skills = {
            "technical": {"Programming": ["Python"], "Empty": []},
            "soft": [],
            "languages": [],
        }
        result = _format_skills(skills)

        # Should contain non-empty category
        assert "Programming" in result
        assert "Python" in result
        # Should not contain empty category label
        assert "Empty" not in result


class TestBackwardCompatibility:
    """Test backward compatibility between flat and categorized formats."""

    def test_schema_accepts_both_formats(self):
        """Test that SkillsSchema accepts both flat and categorized technical skills."""
        # Test flat
        flat_data = {"technical": ["Python"], "soft": [], "languages": []}
        flat_schema = SkillsSchema(**flat_data)
        assert isinstance(flat_schema.technical, list)

        # Test categorized
        cat_data = {"technical": {"Programming": ["Python"]}, "soft": [], "languages": []}
        cat_schema = SkillsSchema(**cat_data)
        assert isinstance(cat_schema.technical, dict)

    def test_pdf_export_handles_both_formats(self):
        """Test that PDF export works for both formats."""
        # Flat format
        flat_skills = {"technical": ["Python"], "soft": [], "languages": []}
        flat_result = _format_skills(flat_skills)
        assert "Python" in flat_result

        # Categorized format
        cat_skills = {
            "technical": {"Programming": ["Python"]},
            "soft": [],
            "languages": [],
        }
        cat_result = _format_skills(cat_skills)
        assert "Python" in cat_result
        assert "Programming" in cat_result


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
