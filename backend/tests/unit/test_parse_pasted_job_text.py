"""Unit tests for pasted job description text parsing (AI pipeline entry)."""

from unittest.mock import patch

from src.services.url_parsing_service import (
    MIN_PASTED_JOB_TEXT_CHARS,
    PASTED_JOB_SOURCE_MARKER,
    parse_pasted_job_text,
)


def test_parse_pasted_job_text_too_short():
    """Below minimum length returns error without calling OpenAI."""
    short = "x" * (MIN_PASTED_JOB_TEXT_CHARS - 1)
    result = parse_pasted_job_text(short)
    assert result["success"] is False
    assert "too short" in result["error"].lower()


@patch("src.services.url_parsing_service._parse_with_openai")
def test_parse_pasted_job_text_delegates_to_openai(mock_parse):
    """Sufficient length delegates to _parse_with_openai with pasted marker URL."""
    mock_parse.return_value = {
        "success": True,
        "content": "Body",
        "title": "T",
        "company": "C",
        "location": "L",
        "source_url": PASTED_JOB_SOURCE_MARKER,
        "source": "ai_parsed",
    }
    text = "word " * 25  # >= 100 chars
    assert len(text.strip()) >= MIN_PASTED_JOB_TEXT_CHARS

    result = parse_pasted_job_text(text)

    assert result["success"] is True
    mock_parse.assert_called_once()
    args, _kwargs = mock_parse.call_args
    assert args[1] == PASTED_JOB_SOURCE_MARKER
