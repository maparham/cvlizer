"""Unit tests for URL parsing structured and iframe extraction paths."""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from bs4 import BeautifulSoup

from src.services.job_descriptions.url_parsing_service import (
    _extract_jsonld_job_posting,
    _extract_raw_content,
    _extract_raw_content_with_fallback,
    _extract_with_browser_automation,
    _extract_with_browser_automation_async,
    _extract_iframe_content_with_playwright,
    parse_job_url,
)


def test_extract_jsonld_job_posting_extracts_jobposting_fields():
    """JSON-LD JobPosting is parsed into title/company/location/content."""
    html = """
    <html><head>
      <script type="application/ld+json">
      {
        "@context": "http://schema.org",
        "@type": "JobPosting",
        "title": "Solution Designer",
        "description": "<h1>Role</h1><p>Main responsibilities</p>",
        "hiringOrganization": {"@type": "Organization", "name": "Magenta Telekom"},
        "jobLocation": {"@type": "Place", "address": {"@type": "PostalAddress", "addressLocality": "Vienna", "addressCountry": "Austria"}}
      }
      </script>
    </head><body></body></html>
    """
    parsed = _extract_jsonld_job_posting(BeautifulSoup(html, "html.parser"))
    assert parsed is not None
    assert parsed["title"] == "Solution Designer"
    assert parsed["company"] == "Magenta Telekom"
    assert parsed["location"] == "Vienna, Austria"
    assert "Main responsibilities" in parsed["content"]


def test_extract_jsonld_job_posting_handles_non_string_description():
    """Non-string JSON-LD description values are coerced safely."""
    html = """
    <html><head>
      <script type="application/ld+json">
      {
        "@type": "JobPosting",
        "title": "Solution Designer",
        "description": {"text": "Nested description value"}
      }
      </script>
    </head><body></body></html>
    """
    parsed = _extract_jsonld_job_posting(BeautifulSoup(html, "html.parser"))
    assert parsed is not None
    assert parsed["title"] == "Solution Designer"
    assert "Nested description value" in parsed["content"]


@pytest.mark.asyncio
async def test_extract_iframe_content_collects_multiple_frames():
    """Iframe text extraction concatenates substantial frame content."""
    main_frame = object()

    frame1 = AsyncMock()
    frame1.wait_for_selector = AsyncMock()
    frame1.evaluate = AsyncMock(return_value="x" * 120)

    frame2 = AsyncMock()
    frame2.wait_for_selector = AsyncMock()
    frame2.evaluate = AsyncMock(return_value="short")

    frame3 = AsyncMock()
    frame3.wait_for_selector = AsyncMock()
    frame3.evaluate = AsyncMock(return_value="y" * 130)

    page = MagicMock()
    page.main_frame = main_frame
    page.frames = [main_frame, frame1, frame2, frame3]

    text = await _extract_iframe_content_with_playwright(page)

    assert "x" * 120 in text
    assert "y" * 130 in text
    assert "short" not in text


@patch("src.services.job_descriptions.url_parsing_service._parse_with_openai")
@patch(
    "src.services.job_descriptions.url_parsing_service._extract_raw_content_with_fallback"
)
def test_parse_job_url_always_uses_raw_extraction_then_ai(mock_raw, mock_ai):
    """URL parsing should always use raw extraction, then pass content to AI."""
    mock_raw.return_value = "Extracted raw posting text " * 30
    mock_ai.return_value = {
        "success": True,
        "title": "Parsed by AI",
        "source": "ai_parsed",
    }

    result = parse_job_url("https://example.com/job/123")

    assert result["success"] is True
    assert result["title"] == "Parsed by AI"
    mock_raw.assert_called_once()
    mock_ai.assert_called_once()


@patch("src.services.job_descriptions.url_parsing_service._parse_with_openai")
@patch(
    "src.services.job_descriptions.url_parsing_service._extract_raw_content_with_fallback"
)
def test_parse_job_url_returns_error_when_raw_extraction_fails(mock_raw, mock_ai):
    """Raw extraction failure should return a user-facing error without calling AI."""
    mock_raw.return_value = ""

    result = parse_job_url("https://example.com/job/456")

    assert result["success"] is False
    assert "Unable to extract content" in result["error"]
    mock_raw.assert_called_once()
    mock_ai.assert_not_called()


@patch("src.services.job_descriptions.url_parsing_service.requests.get")
def test_extract_raw_content_does_not_early_return_short_structured(mock_get):
    """Short JSON-LD should not bypass the normal text extraction path."""
    html = (
        """
    <html><head>
      <script type="application/ld+json">
      {"@type":"JobPosting","title":"T","description":"short"}
      </script>
    </head><body>
      <main>"""
        + ("Long page content " * 80)
        + """</main>
    </body></html>
    """
    )

    class Response:
        content = html.encode("utf-8")

        @staticmethod
        def raise_for_status():
            return None

    mock_get.return_value = Response()
    content = _extract_raw_content("https://example.com/job/short-structured")
    assert len(content) > 500
    assert "Long page content" in content


@pytest.mark.asyncio
@patch(
    "src.services.job_descriptions.url_parsing_service.asyncio.sleep",
    new_callable=AsyncMock,
)
@patch("src.services.job_descriptions.url_parsing_service.async_playwright")
async def test_browser_automation_structured_short_falls_back_to_parent_text(
    mock_playwright, _mock_sleep
):
    """Short structured data should not short-circuit browser extraction."""
    html = """
    <html><head>
      <script type="application/ld+json">
      {"@type":"JobPosting","title":"T","description":"short"}
      </script>
    </head><body>Body</body></html>
    """

    page = AsyncMock()
    page.goto = AsyncMock()
    page.wait_for_selector = AsyncMock()
    page.content = AsyncMock(return_value=html)
    page.evaluate = AsyncMock(return_value="Parent content " * 20)
    page.main_frame = object()
    page.frames = [page.main_frame]  # no iframes

    context = AsyncMock()
    context.new_page = AsyncMock(return_value=page)

    browser = AsyncMock()
    browser.new_context = AsyncMock(return_value=context)
    browser.close = AsyncMock()

    playwright_instance = AsyncMock()
    playwright_instance.chromium.launch = AsyncMock(return_value=browser)

    mock_playwright.return_value.__aenter__ = AsyncMock(return_value=playwright_instance)
    mock_playwright.return_value.__aexit__ = AsyncMock(return_value=None)

    content = await _extract_with_browser_automation_async(
        "https://example.com/job/structured"
    )

    assert "Parent content" in content


@pytest.mark.parametrize(
    "url,raw_content,browser_content,expected_raw_calls,expected_browser_calls",
    [
        (
            "https://jobs.wien.gv.at/posting/123",
            "",
            "Structured content " * 9,  # 171 chars
            1,
            1,
        ),
        (
            "https://example.com/job/non-js-heavy",
            "Structured job details " * 7,  # 161 chars
            "",
            1,
            1,
        ),
    ],
)
@patch(
    "src.services.job_descriptions.url_parsing_service._extract_with_browser_automation"
)
@patch("src.services.job_descriptions.url_parsing_service._extract_raw_content")
def test_extract_raw_content_with_fallback_rejects_short_content(
    mock_raw,
    mock_browser,
    url,
    raw_content,
    browser_content,
    expected_raw_calls,
    expected_browser_calls,
):
    """Short (<500) content is rejected consistently across fallback paths."""
    mock_raw.return_value = raw_content
    mock_browser.return_value = browser_content

    content = _extract_raw_content_with_fallback(url)

    assert content == ""
    assert mock_raw.call_count == expected_raw_calls
    assert mock_browser.call_count == expected_browser_calls
