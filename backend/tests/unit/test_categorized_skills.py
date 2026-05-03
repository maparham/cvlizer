"""
Tests for categorized technical skills functionality.

Tests schema validation and PDF export for categorized technical skills.
"""

import pytest
from src.schemas.cv_schemas import SkillsSchema
from src.schemas.ai_response_schemas.cv_parsing import SkillsResponseSchema
from src.services.cv.latex_export_service import _format_skills


class TestSkillsSchemaValidation:
    """Test SkillsSchema validation for dynamic categorized skills."""

    def test_categorized_technical_skills_new_format(self):
        """Test that new categorized dictionary format is accepted."""
        data = {
            "technical": {
                "Programming Languages": ["Python", "JavaScript", "TypeScript"],
                "DevOps & Infrastructure": ["Docker", "Kubernetes", "Git"],
                "Databases": ["PostgreSQL", "MongoDB"],
                "Soft Skills": ["Leadership", "Communication"],
                "Languages": ["English", "German"],
            }
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
            }
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
            }
        }
        schema = SkillsSchema(**data)
        # Invalid categories should be filtered
        assert "" not in schema.technical
        assert "  " not in schema.technical
        assert "Valid Category" in schema.technical


class TestSkillsResponseSchemaValidation:
    """Test SkillsResponseSchema for AI parsing output."""

    def test_ai_parsing_categorized_output(self):
        """Test that AI parsing schema accepts categorized dict format."""
        data = {
            "technical": {
                "Programming Languages": ["Python", "Java"],
                "Cloud Platforms": ["AWS", "Azure"],
                "Soft Skills": ["Problem Solving"],
            }
        }
        schema = SkillsResponseSchema(**data)
        assert isinstance(schema.technical, dict)
        assert len(schema.technical) == 3

    def test_ai_parsing_coerces_legacy_flat_list(self):
        """Flat list of strings maps to the legacy PDF category bucket."""
        data = {"technical": ["Python", "Docker"]}
        schema = SkillsResponseSchema(**data)
        assert schema.technical == {
            "Technical": ["Python", "Docker"],
        }


class TestPDFExportCategorizedSkills:
    """Test PDF export with categorized technical skills."""

    def test_pdf_format_categorized_skills(self):
        """Test that PDF export handles categorized technical skills."""
        skills = {
            "technical": {
                "Programming Languages": ["Python", "JavaScript"],
                "DevOps": ["Docker", "Kubernetes"],
                "Soft Skills": ["Leadership"],
                "Languages": ["English"],
            }
        }
        result = _format_skills(skills)

        # Should contain category names
        assert "Programming Languages" in result
        assert "DevOps" in result
        # Should contain skills
        assert "Python" in result
        assert "Docker" in result
        # Should contain dynamic categories too
        assert "Leadership" in result

    def test_pdf_format_mixed_empty_categories(self):
        """Test that empty categories are skipped in PDF export."""
        skills = {
            "technical": {"Programming": ["Python"], "Empty": []},
        }
        result = _format_skills(skills)

        # Should contain non-empty category
        assert "Programming" in result
        assert "Python" in result
        # Should not contain empty category label
        assert "Empty" not in result

    def test_pdf_format_legacy_flat_technical_soft_languages(self):
        """Legacy skills shape (list technical, soft, languages) is exported."""
        skills = {
            "technical": ["Python", "FastAPI"],
            "soft": ["Leadership", "Communication"],
            "languages": [
                {"language": "English", "proficiency": "Native"},
                {"language": "Spanish", "proficiency": "Professional"},
            ],
        }
        result = _format_skills(skills)
        assert "Technical" in result
        assert "Python" in result and "FastAPI" in result
        assert "Soft Skills" in result
        assert "Leadership" in result
        assert "Languages" in result
        assert "English" in result and "Native" in result
        assert "Spanish" in result


class TestStrictSkillsFormat:
    """Categorized schema still accepts legacy flat technical lists."""

    def test_schema_coerces_flat_list_to_single_category(self):
        flat_data = {"technical": ["Python"]}
        flat_schema = SkillsSchema(**flat_data)
        assert flat_schema.technical == {"Technical": ["Python"]}


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
