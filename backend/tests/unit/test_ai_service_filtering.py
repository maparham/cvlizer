"""
Tests for AI services using CV filtering.

This module tests that AI services properly filter hidden sections before
sending CV data to OpenAI.
"""

import json
import pytest
from unittest.mock import Mock, patch, MagicMock
from src.services.ai_service.section_generation import generate_cv_section
from src.services.ai_service.ai_suggestions_service import _build_ai_suggestions_prompt


@pytest.fixture
def cv_data_with_hidden_sections():
    """CV data with some sections marked as hidden."""
    return {
        "personal_info": {
            "full_name": "John Doe",
            "email": "john@example.com",
        },
        "professional_summary": {
            "content": "Senior software engineer with expertise in Python."
        },
        "work_experience": [
            {
                "id": "1",
                "company": "Secret Company",
                "position": "Secret Position",
                "description": "Confidential work",
            }
        ],
        "education": [
            {
                "id": "1",
                "institution": "MIT",
                "degree": "BS Computer Science",
            }
        ],
        "skills": {
            "technical": ["Python", "Django", "React"],
            "soft": ["Leadership"],
        },
        "certifications": [
            {
                "id": "1",
                "name": "Secret Certification",
            }
        ],
        "section_config": {
            "sections": [
                {"id": "personal_info", "type": "personal_info", "visible": True},
                {
                    "id": "professional_summary",
                    "type": "professional_summary",
                    "visible": True,
                },
                {
                    "id": "work_experience",
                    "type": "work_experience",
                    "visible": False,
                },  # HIDDEN
                {"id": "education", "type": "education", "visible": True},
                {"id": "skills", "type": "skills", "visible": True},
                {
                    "id": "certifications",
                    "type": "certifications",
                    "visible": False,
                },  # HIDDEN
            ]
        },
    }


class TestSectionGenerationFiltering:
    """Test that section generation filters hidden sections from prompts."""

    @pytest.mark.asyncio
    async def test_section_generation_excludes_hidden_sections(
        self, cv_data_with_hidden_sections
    ):
        """Test that hidden sections are not sent to section generation."""
        job_description = "Python developer role"

        # Mock the OpenAI call
        with patch(
            "src.services.ai_service.section_generation.call_openai_with_schema"
        ) as mock_openai:
            mock_openai.return_value = (
                {
                    "title": "Why I'm a Good Fit",
                    "content": "I am qualified...",
                    "key_points": ["Point 1"],
                },
                {
                    "tokens_used": 100,
                    "generation_time": 500,
                    "model_used": "gpt-4o-mini",
                },
            )

            await generate_cv_section(
                cv_data=cv_data_with_hidden_sections,
                job_description=job_description,
                section_type="why_good_fit",
            )

            # Get the prompt that was passed to OpenAI
            call_args = mock_openai.call_args
            user_prompt = call_args.kwargs["user_prompt"]

            # Hidden sections should not be in the prompt
            assert "Secret Company" not in user_prompt
            assert "Secret Certification" not in user_prompt

            # Visible sections should be in the prompt
            assert "MIT" in user_prompt or "education" in user_prompt


class TestPersonalInfoNeverFiltered:
    """Test that personal_info is never filtered from AI prompts."""

    def test_personal_info_included_even_if_marked_hidden(self):
        """Test personal_info is always included (though UI prevents hiding it)."""
        cv_data = {
            "personal_info": {
                "full_name": "John Doe",
                "email": "john@example.com",
            },
            "skills": {"technical": ["Python"]},
            "section_config": {
                "sections": [
                    # In practice, frontend prevents this, but test backend behavior
                    {"id": "personal_info", "type": "personal_info", "visible": False},
                    {"id": "skills", "type": "skills", "visible": True},
                ]
            },
        }
        job_description = "Python developer"

        prompt = _build_ai_suggestions_prompt(cv_data, job_description)

        # personal_info should still be in prompt because it's not in filterable_sections
        assert "John Doe" in prompt or "personal_info" in prompt


class TestProfessionalSummaryFiltering:
    """Test that professional_summary can be filtered when hidden."""

    def test_hidden_professional_summary_excluded(self):
        """Test that professional_summary is filtered when marked as hidden."""
        cv_data = {
            "personal_info": {"full_name": "John Doe"},
            "professional_summary": {
                "content": "This is my secret summary that should not be shared."
            },
            "skills": {"technical": ["Python"]},
            "section_config": {
                "sections": [
                    {"id": "personal_info", "type": "personal_info", "visible": True},
                    {
                        "id": "professional_summary",
                        "type": "professional_summary",
                        "visible": False,
                    },
                    {"id": "skills", "type": "skills", "visible": True},
                ]
            },
        }
        job_description = "Python developer"

        prompt = _build_ai_suggestions_prompt(cv_data, job_description)

        # professional_summary should be filtered out
        assert "secret summary" not in prompt
        assert "should not be shared" not in prompt

        # Other sections should be present
        assert "John Doe" in prompt or "personal_info" in prompt
        assert "Python" in prompt


class TestAISuggestionsFiltering:
    """Test that AI suggestions service filters hidden sections from prompts."""

    def test_ai_suggestions_excludes_hidden_work_experience(
        self, cv_data_with_hidden_sections
    ):
        """Test that hidden work_experience is not in AI suggestions prompt."""
        job_description = "Looking for a Python developer"

        prompt = _build_ai_suggestions_prompt(
            cv_data_with_hidden_sections, job_description
        )

        # Hidden work_experience should not appear in prompt
        assert "Secret Company" not in prompt
        assert "Secret Position" not in prompt
        assert "Confidential work" not in prompt

        # Visible sections should appear
        assert "Python" in prompt
        assert "MIT" in prompt or "education" in prompt

    def test_ai_suggestions_excludes_hidden_professional_summary(self):
        """Test that hidden professional_summary is not in AI suggestions prompt."""
        cv_data = {
            "personal_info": {"full_name": "John Doe"},
            "professional_summary": {"content": "Secret summary that should be hidden"},
            "work_experience": [
                {"id": "1", "company": "Tech Corp", "position": "Engineer"}
            ],
            "skills": {"technical": ["Python"]},
            "section_config": {
                "sections": [
                    {"id": "personal_info", "type": "personal_info", "visible": True},
                    {
                        "id": "professional_summary",
                        "type": "professional_summary",
                        "visible": False,
                    },
                    {"id": "work_experience", "type": "work_experience", "visible": True},
                    {"id": "skills", "type": "skills", "visible": True},
                ]
            },
        }
        job_description = "Python developer"

        prompt = _build_ai_suggestions_prompt(cv_data, job_description)

        # Hidden professional_summary should not appear
        assert "Secret summary" not in prompt
        assert "should be hidden" not in prompt
        assert "Current Summary:" in prompt  # The label should still be there
        # But the summary content should be empty or not present

        # Other sections should be present
        assert "Tech Corp" in prompt or "work_experience" in prompt
        assert "Python" in prompt

    def test_ai_suggestions_excludes_hidden_skills(self):
        """Test that hidden skills are not in AI suggestions prompt."""
        cv_data = {
            "personal_info": {"full_name": "John Doe"},
            "work_experience": [{"id": "1", "company": "Tech Corp"}],
            "skills": {
                "technical": ["Secret Tech", "Python"],
                "soft": ["Secret Soft"],
            },
            "section_config": {
                "sections": [
                    {"id": "personal_info", "type": "personal_info", "visible": True},
                    {"id": "work_experience", "type": "work_experience", "visible": True},
                    {"id": "skills", "type": "skills", "visible": False},  # HIDDEN
                ]
            },
        }
        job_description = "Python developer"

        prompt = _build_ai_suggestions_prompt(cv_data, job_description)

        # Hidden skills should not appear in the separate skills lists
        assert "Secret Tech" not in prompt
        assert "Secret Soft" not in prompt
        # Python might appear in the main CV JSON but should not be in the Technical Skills list
        # when skills section is hidden, the Technical Skills: line should show empty array

    def test_ai_suggestions_excludes_hidden_education(self):
        """Test that hidden education is not in AI suggestions prompt."""
        cv_data = {
            "personal_info": {"full_name": "John Doe"},
            "work_experience": [{"id": "1", "company": "Tech Corp"}],
            "education": [
                {"id": "1", "institution": "Secret University", "degree": "PhD"}
            ],
            "skills": {"technical": ["Python"]},
            "section_config": {
                "sections": [
                    {"id": "personal_info", "type": "personal_info", "visible": True},
                    {"id": "work_experience", "type": "work_experience", "visible": True},
                    {"id": "education", "type": "education", "visible": False},  # HIDDEN
                    {"id": "skills", "type": "skills", "visible": True},
                ]
            },
        }
        job_description = "Python developer"

        prompt = _build_ai_suggestions_prompt(cv_data, job_description)

        # Hidden education should not appear
        assert "Secret University" not in prompt
        assert "PhD" not in prompt

        # Other sections should be present
        assert "Tech Corp" in prompt or "work_experience" in prompt
        assert "Python" in prompt
