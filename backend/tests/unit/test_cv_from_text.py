"""Unit tests for CV-from-text parsing and request validation."""

from unittest.mock import AsyncMock, patch

import pytest
from pydantic import ValidationError

from src.api.cvs.models import CreateCVFromTextRequest
from src.services.cv.cv_parsing_service import parse_cv_text_pipeline


class TestCreateCVFromTextRequest:
    def test_rejects_text_shorter_than_10_after_strip(self):
        with pytest.raises(ValidationError):
            CreateCVFromTextRequest(text="x" * 9)

    def test_accepts_min_length_text(self):
        m = CreateCVFromTextRequest(text=" " + "y" * 10 + " ")
        assert len(m.text) == 10

    def test_rejects_over_50000_chars(self):
        with pytest.raises(ValidationError):
            CreateCVFromTextRequest(text="z" * 50001)

    def test_accepts_text_at_max_length(self):
        m = CreateCVFromTextRequest(text="z" * 50000)
        assert len(m.text) == 50000


@pytest.mark.asyncio
async def test_parse_cv_text_pipeline_applies_uuids_and_normalize():
    """Pipeline wraps AI parse with UUID and PRESENT normalization."""
    ai_payload = {
        "personal_info": {},
        "work_experience": [
            {
                "company": "Acme",
                "position": "Dev",
                "start_date": None,
                "end_date": "PRESENT",
                "description": "",
            }
        ],
        "education": [],
        "skills": {"technical": {}},
        "certifications": [],
        "projects": [],
        "awards": [],
        "publications": [],
        "volunteer_experience": [],
        "custom_sections": [],
        "section_config": {},
    }

    with patch(
        "src.services.ai_service.parse_cv_text_with_openai",
        new_callable=AsyncMock,
        return_value=ai_payload,
    ):
        out = await parse_cv_text_pipeline("some resume text long enough")

    assert "error" not in out
    assert out["work_experience"][0]["id"].startswith("work_")
    assert out["work_experience"][0]["end_date"] is None
