"""
Tests for CV data filtering utilities.

This module tests the filter_hidden_sections function to ensure hidden sections
are properly excluded from CV data before sending to AI services.
"""

import pytest
from src.services.ai_service.cv_filter import filter_hidden_sections


@pytest.fixture
def sample_cv_data():
    """Sample CV data with all sections and section_config."""
    return {
        "personal_info": {
            "full_name": "John Doe",
            "email": "john@example.com",
            "phone": "555-0123",
            "location": "New York, NY",
        },
        "custom_sections": [
            {
                "id": "custom_summary_1",
                "title": "Professional Summary",
                "content": "Experienced software engineer with 5 years of experience.",
                "type": "professional_summary",
            }
        ],
        "work_experience": [
            {
                "id": "1",
                "company": "Tech Corp",
                "position": "Senior Engineer",
                "start_date": "2020-01",
                "end_date": "2023-12",
                "current": False,
                "description": "Built scalable systems",
                "achievements": ["Improved performance by 50%"],
                "technologies": ["Python", "Django"],
            }
        ],
        "education": [
            {
                "id": "1",
                "institution": "MIT",
                "degree": "BS Computer Science",
                "field_of_study": "Computer Science",
                "start_date": "2015-09",
                "end_date": "2019-06",
                "current": False,
                "honors": ["Summa Cum Laude"],
            }
        ],
        "skills": {
            "technical": ["Python", "JavaScript", "React"],
            "soft": ["Leadership", "Communication"],
            "languages": [{"id": "1", "language": "English", "proficiency": "Native"}],
        },
        "certifications": [
            {
                "id": "1",
                "name": "AWS Certified",
                "issuer": "Amazon",
                "date": "2022-06",
            }
        ],
        "projects": [
            {
                "id": "1",
                "name": "Cool Project",
                "description": "A cool project",
                "technologies": ["Python"],
            }
        ],
        "awards": [
            {
                "id": "1",
                "name": "Employee of the Year",
                "issuer": "Tech Corp",
                "date": "2022-12",
            }
        ],
        "publications": [
            {
                "id": "1",
                "title": "AI Research Paper",
                "authors": "John Doe",
                "journal": "IEEE",
                "date": "2021-03",
            }
        ],
        "volunteer_experience": [
            {
                "id": "1",
                "organization": "Local Charity",
                "position": "Volunteer",
                "start_date": "2018-01",
                "end_date": "2019-12",
                "current": False,
                "description": "Helped with tech projects",
            }
        ],
        "section_config": {
            "sections": [
                {"id": "personal_info", "type": "personal_info", "visible": True},
                {
                    "id": "custom_summary_1",
                    "type": "custom",
                    "visible": True,
                },
                {"id": "work_experience", "type": "work_experience", "visible": True},
                {"id": "education", "type": "education", "visible": True},
                {"id": "skills", "type": "skills", "visible": True},
                {"id": "certifications", "type": "certifications", "visible": True},
                {"id": "projects", "type": "projects", "visible": True},
                {"id": "awards", "type": "awards", "visible": True},
                {"id": "publications", "type": "publications", "visible": True},
                {
                    "id": "volunteer_experience",
                    "type": "volunteer_experience",
                    "visible": True,
                },
            ]
        },
    }


class TestFilterHiddenSections:
    """Tests for filter_hidden_sections function."""

    def test_filters_hidden_work_experience(self, sample_cv_data):
        """Test that work_experience is filtered when hidden."""
        sample_cv_data["section_config"]["sections"][2]["visible"] = False

        result = filter_hidden_sections(sample_cv_data)

        assert "work_experience" not in result
        assert "education" in result
        assert "skills" in result

    def test_filters_hidden_custom_section(self, sample_cv_data):
        """Test that a hidden custom section is filtered from custom_sections."""
        sample_cv_data["section_config"]["sections"][1]["visible"] = False

        result = filter_hidden_sections(sample_cv_data)

        custom_ids = [s["id"] for s in result.get("custom_sections", [])]
        assert "custom_summary_1" not in custom_ids
        assert "personal_info" in result
        assert "work_experience" in result

    def test_preserves_personal_info_always(self, sample_cv_data):
        """Test that personal_info is NEVER filtered even if marked hidden."""
        # Note: In practice, frontend prevents hiding personal_info,
        # but this tests the backend behavior if it somehow happens
        sample_cv_data["section_config"]["sections"][0]["visible"] = False

        result = filter_hidden_sections(sample_cv_data)

        # personal_info is NOT in filterable_sections, so it should remain
        assert "personal_info" in result

    def test_filters_multiple_hidden_sections(self, sample_cv_data):
        """Test that multiple hidden sections are filtered."""
        # Hide education, certifications, and awards
        for section in sample_cv_data["section_config"]["sections"]:
            if section["type"] in ["education", "certifications", "awards"]:
                section["visible"] = False

        result = filter_hidden_sections(sample_cv_data)

        assert "education" not in result
        assert "certifications" not in result
        assert "awards" not in result
        assert "work_experience" in result
        assert "skills" in result
        assert "projects" in result

    def test_preserves_all_visible_sections(self, sample_cv_data):
        """Test that all visible sections are preserved."""
        result = filter_hidden_sections(sample_cv_data)

        assert "personal_info" in result
        assert "custom_sections" in result and len(result["custom_sections"]) > 0
        assert "work_experience" in result
        assert "education" in result
        assert "skills" in result
        assert "certifications" in result
        assert "projects" in result
        assert "awards" in result
        assert "publications" in result
        assert "volunteer_experience" in result

    def test_backward_compatibility_no_section_config(self):
        """Test that CVs without section_config keep all sections."""
        cv_data = {
            "personal_info": {"full_name": "John Doe"},
            "work_experience": [{"company": "Tech Corp"}],
            "skills": {"technical": ["Python"]},
        }

        result = filter_hidden_sections(cv_data)

        assert "personal_info" in result
        assert "work_experience" in result
        assert "skills" in result

    def test_backward_compatibility_empty_sections_list(self):
        """Test that CVs with empty sections list keep all sections."""
        cv_data = {
            "personal_info": {"full_name": "John Doe"},
            "work_experience": [{"company": "Tech Corp"}],
            "section_config": {"sections": []},
        }

        result = filter_hidden_sections(cv_data)

        assert "personal_info" in result
        assert "work_experience" in result

    def test_does_not_mutate_original_data(self, sample_cv_data):
        """Test that filtering creates a deep copy and doesn't mutate original."""
        original_sections_count = len(sample_cv_data["section_config"]["sections"])
        sample_cv_data["section_config"]["sections"][2]["visible"] = False

        result = filter_hidden_sections(sample_cv_data)

        # Original should still have work_experience
        assert "work_experience" in sample_cv_data
        assert (
            len(sample_cv_data["section_config"]["sections"]) == original_sections_count
        )

        # Result should not have work_experience
        assert "work_experience" not in result

    def test_updates_section_config_in_filtered_data(self, sample_cv_data):
        """Test that section_config is updated to only include visible sections."""
        # Hide work_experience and education
        sample_cv_data["section_config"]["sections"][2]["visible"] = False
        sample_cv_data["section_config"]["sections"][3]["visible"] = False

        result = filter_hidden_sections(sample_cv_data)

        visible_types = [s["type"] for s in result["section_config"]["sections"]]
        assert "work_experience" not in visible_types
        assert "education" not in visible_types
        assert "personal_info" in visible_types
        assert "skills" in visible_types

    def test_handles_missing_section_data(self, sample_cv_data):
        """Test that filter handles sections defined in config but missing from data."""
        # Remove work_experience from data but keep in config
        del sample_cv_data["work_experience"]

        result = filter_hidden_sections(sample_cv_data)

        # Should not crash, just skip the missing section
        assert "work_experience" not in result
        assert "education" in result

    def test_filters_why_good_fit_when_hidden(self, sample_cv_data):
        """Test that why_good_fit custom section is filtered when hidden."""
        sample_cv_data.setdefault("custom_sections", []).append(
            {
                "id": "why_good_fit",
                "type": "cover_letter",
                "title": "Why I'm a Good Fit",
                "content": "I am a good fit because...",
            }
        )
        sample_cv_data["section_config"]["sections"].append(
            {"id": "why_good_fit", "type": "custom", "visible": False}
        )

        result = filter_hidden_sections(sample_cv_data)

        custom = result.get("custom_sections") or []
        assert not any(s.get("id") == "why_good_fit" for s in custom)

    def test_default_visible_true_when_not_specified(self):
        """Test that sections without explicit visible field default to visible."""
        cv_data = {
            "work_experience": [{"company": "Tech Corp"}],
            "skills": {"technical": ["Python"]},
            "section_config": {
                "sections": [
                    {
                        "id": "work_experience",
                        "type": "work_experience",
                        # visible field missing - should default to True
                    },
                    {"id": "skills", "type": "skills", "visible": True},
                ]
            },
        }

        result = filter_hidden_sections(cv_data)

        # work_experience should be preserved (defaults to visible)
        assert "work_experience" in result
        assert "skills" in result

    def test_filters_all_filterable_section_types(self):
        """Test that all filterable section types can be filtered."""
        cv_data = {
            "work_experience": [{"company": "Corp"}],
            "education": [{"institution": "MIT"}],
            "skills": {"technical": ["Python"]},
            "certifications": [{"name": "AWS"}],
            "projects": [{"name": "Project"}],
            "awards": [{"name": "Award"}],
            "publications": [{"title": "Paper"}],
            "volunteer_experience": [{"organization": "Charity"}],
            "custom_sections": [
                {
                    "id": "why_good_fit",
                    "type": "cover_letter",
                    "title": "Fit",
                    "content": "Fit",
                }
            ],
            "section_config": {
                "sections": [
                    {
                        "id": "work_experience",
                        "type": "work_experience",
                        "visible": False,
                    },
                    {"id": "education", "type": "education", "visible": False},
                    {"id": "skills", "type": "skills", "visible": False},
                    {"id": "certifications", "type": "certifications", "visible": False},
                    {"id": "projects", "type": "projects", "visible": False},
                    {"id": "awards", "type": "awards", "visible": False},
                    {"id": "publications", "type": "publications", "visible": False},
                    {
                        "id": "volunteer_experience",
                        "type": "volunteer_experience",
                        "visible": False,
                    },
                    {"id": "why_good_fit", "type": "custom", "visible": False},
                ]
            },
        }

        result = filter_hidden_sections(cv_data)

        # All filterable sections should be removed
        assert "work_experience" not in result
        assert "education" not in result
        assert "skills" not in result
        assert "certifications" not in result
        assert "projects" not in result
        assert "awards" not in result
        assert "publications" not in result
        assert "volunteer_experience" not in result
        custom = result.get("custom_sections") or []
        assert not any(s.get("id") == "why_good_fit" for s in custom)
