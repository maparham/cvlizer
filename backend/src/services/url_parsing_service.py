"""
URL Parsing Service for Job Descriptions

This module provides functionality to parse job posting URLs and extract
job description content using OpenAI AI service for intelligent content extraction.
Includes local browser automation using Selenium for handling JavaScript-rendered job postings.

Key responsibilities:
- Validate URLs (reject search results pages)
- Parse job posting URLs using standard web scraping
- Fallback to local browser automation for JavaScript-heavy sites
- Extract job description content and metadata using OpenAI
- Handle various URL formats and site structures
- Provide intelligent content extraction and structuring
- Sanitize and clean extracted content
- Handle dynamic content loading with JavaScript rendering

Usage:
- Use parse_job_url() to extract content from job posting URLs
- Automatically falls back to browser automation for sites requiring JavaScript
- Returns structured job description data
- Handles errors gracefully with detailed error messages

Browser Automation Integration:
- Uses Selenium WebDriver with Chrome for reliable JavaScript rendering
- Enables dynamic content loading with intelligent waiting
- Handles complex sites like jobs.wien.gv.at
- Maintains existing functionality for standard sites

ChromeDriver version must match your installed Chrome (e.g. Chrome 145 needs ChromeDriver 145).
- To use a specific driver: set CHROMEDRIVER_PATH to the chromedriver binary (e.g. from
  Chrome for Testing or after installing chromedriver 145).
- If unset, Selenium uses the driver on PATH (ensure it matches your Chrome version).
"""

import logging
import os
import time
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.common.exceptions import TimeoutException, WebDriverException
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.remote.webdriver import WebDriver
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from src.config import BackgroundTaskConfig
from src.services.ai_service import extract_job_description_with_ai
from src.services.structured_data_extractor import (
    extract_jsonld_job_posting,
    is_complete_structured_job_data,
)

logger = logging.getLogger(__name__)
# "Substantial content" required for raw extraction paths to avoid noisy/partial pages.
SUBSTANTIAL_CONTENT_CHARS = 500
# Minimum iframe text length to include in merged browser extraction.
MIN_IFRAME_CONTENT_CHARS = 100
# Short iframe-specific wait while iterating frames after main page load has completed.
SELENIUM_IFRAME_WAIT_TIMEOUT_SECONDS = 5


def _is_driver_startup_failure(error_message: str) -> bool:
    """Detect hard ChromeDriver startup failures that should fail fast."""
    lowered = error_message.lower()
    return (
        "chromedriver unexpectedly exited" in lowered
        or "status code was: -5" in lowered
        or "service " in lowered
        and "chromedriver" in lowered
        and "exited" in lowered
    )


def _clean_text_content(text: str) -> str:
    """Normalize extracted text while keeping paragraph breaks readable."""
    return (text or "").replace("\r\n", "\n").replace("\r", "\n").strip()


def _build_chrome_options() -> Options:
    """Build shared Chrome options used by Selenium extraction helpers."""
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-setuid-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--no-first-run")
    chrome_options.add_argument("--no-default-browser-check")
    chrome_options.add_argument("--disable-default-apps")
    chrome_options.add_argument("--disable-extensions")
    chrome_options.add_argument("--disable-web-security")
    chrome_options.add_argument("--disable-features=VizDisplayCompositor")
    chrome_options.add_argument("--window-size=1920,1080")
    chrome_options.add_argument(
        "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )
    return chrome_options


def _create_chrome_driver(chrome_options: Options) -> WebDriver:
    """Create Chrome WebDriver using CHROMEDRIVER_PATH when configured."""
    chromedriver_path = os.environ.get("CHROMEDRIVER_PATH")
    if chromedriver_path:
        service = Service(executable_path=chromedriver_path)
        return webdriver.Chrome(service=service, options=chrome_options)
    return webdriver.Chrome(options=chrome_options)


def _is_acceptable_extracted_content(content: str) -> bool:
    """Return True when raw extraction yielded substantial content."""
    return bool(content and len(content) >= SUBSTANTIAL_CONTENT_CHARS)


def _extract_jsonld_job_posting(soup: BeautifulSoup) -> Optional[Dict[str, str]]:
    """Compatibility wrapper around shared structured-data extractor."""
    return extract_jsonld_job_posting(soup, _clean_text_content)


def _is_complete_structured_job_data(job_data: Dict[str, Any]) -> bool:
    """Compatibility wrapper around shared structured-data completeness check."""
    return is_complete_structured_job_data(job_data, SUBSTANTIAL_CONTENT_CHARS)


def _extract_iframe_content_with_browser_automation(driver: WebDriver) -> str:
    """Extract text from iframe documents and return concatenated content."""
    iframe_text_chunks: List[str] = []
    iframes = driver.find_elements(By.TAG_NAME, "iframe")
    for iframe in iframes:
        try:
            driver.switch_to.frame(iframe)
            WebDriverWait(driver, SELENIUM_IFRAME_WAIT_TIMEOUT_SECONDS).until(
                EC.presence_of_element_located((By.TAG_NAME, "body"))
            )
            frame_text = driver.execute_script(
                """
                const body = document.body;
                if (!body) return '';
                const text = body.innerText || body.textContent || '';
                return text.trim();
                """
            )
            if frame_text and len(frame_text) > MIN_IFRAME_CONTENT_CHARS:
                iframe_text_chunks.append(_clean_text_content(frame_text))
        except Exception as e:
            logger.debug("Skipping iframe content extraction due to error: %s", str(e))
        finally:
            try:
                driver.switch_to.default_content()
            except Exception as e:
                logger.debug("Failed switching back to default content: %s", str(e))

    return "\n\n".join(chunk for chunk in iframe_text_chunks if chunk)


def _extract_structured_content_from_browser(driver: WebDriver) -> Optional[str]:
    """Return structured JobPosting content from rendered page when substantial."""
    structured = _extract_jsonld_job_posting(
        BeautifulSoup(driver.page_source, "html.parser")
    )
    if structured and _is_complete_structured_job_data(structured):
        return structured["content"]
    return None


def _extract_parent_content_with_browser_js(driver: WebDriver) -> str:
    """Extract parent document content via JavaScript selectors with fallback."""
    return driver.execute_script(
        """
        // Remove script and style elements
        const scripts = document.querySelectorAll('script, style, nav, header, footer, .navigation, .menu, .sidebar');
        scripts.forEach(el => el.remove());

        // Try to find main content area
        const contentSelectors = [
            'main', 'article', '.content', '.job-description',
            '.job-content', '.description', '#content', '.main-content',
            '.job-details', '.position-description', '.job-info'
        ];

        let contentElement = null;
        for (const selector of contentSelectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent.trim().length > 100) {
                contentElement = element;
                break;
            }
        }

        // Fall back to body if no specific content area found
        if (!contentElement) {
            contentElement = document.body;
        }

        // Get text content with preserved line breaks
        const text = contentElement.textContent || contentElement.innerText || '';

        // Clean up the text
        return text
            .replace(/\\s+/g, ' ')  // Replace multiple whitespace with single space
            .replace(/\\n\\s*\\n/g, '\\n\\n')  // Preserve paragraph breaks
            .trim();
    """
    )


def _combine_parent_and_iframe_content(parent_content: str, iframe_content: str) -> str:
    """Combine and normalize parent + iframe extraction results."""
    return "\n\n".join(
        part for part in [_clean_text_content(parent_content), iframe_content] if part
    )


def parse_job_url(url: str, user_id: str = None, db_session=None) -> Dict[str, Any]:
    """
    Parse a job posting URL and extract job description content using OpenAI.

    Args:
        url: The job posting URL to parse

    Returns:
        Dictionary containing parsed job description data
    """
    try:
        # Validate URL format
        parsed_url = urlparse(url)
        if not parsed_url.scheme or not parsed_url.netloc:
            return {
                "error": "Invalid URL format. Please check the URL and try again, or use the 'Text' tab to enter the job description manually.",
                "success": False,
            }

        # Check if this is a search results page
        if _is_search_results_page(url):
            return {
                "error": "This appears to be a search results page, not an individual job posting. Please open a specific job listing and use that URL instead, or copy and paste the job description using the 'Text' tab.",
                "success": False,
            }

        # Extract raw content from URL using web scraping with browser automation fallback
        raw_content = _extract_raw_content_with_fallback(url)
        if not raw_content:
            return {
                "error": "Unable to extract content from this URL. The page may be empty or protected. Please copy and paste the job description manually using the 'Text' tab.",
                "success": False,
            }

        # Use OpenAI to intelligently parse and structure the content
        return _parse_with_openai(raw_content, url, user_id, db_session)

    except ValueError as e:
        # These are user-friendly error messages from _extract_raw_content
        logger.error(f"URL parsing failed for {url}: {str(e)}")
        return {"error": str(e), "success": False}
    except Exception as e:
        logger.error(f"Failed to parse URL {url}: {str(e)}")
        return {
            "error": f"Unable to parse this URL. Please copy and paste the job description manually using the 'Text' tab.",
            "success": False,
        }


# Minimum pasted characters before AI parsing. Keep in sync with
# `MIN_PASTED_JOB_TEXT_CHARS` in frontend `job-descriptions-modal/types.ts` and
# `JobDescriptionParseTextRequest` in `api/job_descriptions.py`.
MIN_PASTED_JOB_TEXT_CHARS = 100
# Stored on JobDescription.source_url when content came from paste (not a live URL).
PASTED_JOB_SOURCE_MARKER = "pasted-text"


def parse_pasted_job_text(
    raw_text: str, user_id: str = None, db_session=None
) -> Dict[str, Any]:
    """
    Parse user-pasted job description text using the same AI pipeline as URL parsing.

    Skips web scraping; sends trimmed text to OpenAI for structuring.
    """
    from src.services.ai_service.common import MAX_JOB_CONTENT_LENGTH

    stripped = (raw_text or "").strip()
    if len(stripped) < MIN_PASTED_JOB_TEXT_CHARS:
        return {
            "error": (
                f"Pasted text is too short. Please paste at least {MIN_PASTED_JOB_TEXT_CHARS} "
                "characters of the job posting."
            ),
            "success": False,
        }

    content = stripped
    if len(content) > MAX_JOB_CONTENT_LENGTH:
        content = content[:MAX_JOB_CONTENT_LENGTH] + "..."

    return _parse_with_openai(content, PASTED_JOB_SOURCE_MARKER, user_id, db_session)


def _extract_raw_content_with_fallback(url: str) -> str:
    """
    Extract raw content from URL with browser automation fallback for JavaScript-heavy sites.

    First attempts standard web scraping, then falls back to browser automation if that fails
    or returns insufficient content. For known JavaScript-heavy sites, tries browser automation first.

    Args:
        url: The URL to extract content from

    Returns:
        Extracted text content or empty string if both methods fail
    """
    # Check if this is a known JavaScript-heavy site
    is_js_heavy_site = any(
        domain in url.lower()
        for domain in ["jobs.wien.gv.at", "wien.gv.at", "karriere.", "jobs."]
    )

    if is_js_heavy_site:
        # Try browser automation first for known problematic sites
        try:
            content = _extract_with_browser_automation(url)
            if _is_acceptable_extracted_content(content):
                return content
        except ValueError as e:
            # Re-raise user-friendly error messages
            raise
        except Exception as e:
            logger.debug(
                "Browser-first extraction failed for js-heavy site %s: %s", url, str(e)
            )

    # Try standard scraping first (or as fallback)
    try:
        content = _extract_raw_content(url)
        if _is_acceptable_extracted_content(content):
            return content
    except ValueError as e:
        # Re-raise user-friendly error messages (404, 403, timeout, etc.)
        raise
    except Exception as e:
        logger.debug("Standard extraction failed for %s: %s", url, str(e))

    # Fall back to browser automation for JavaScript-heavy sites or if standard scraping had minimal content
    if not is_js_heavy_site:  # Only try if we haven't already
        try:
            content = _extract_with_browser_automation(url)
            if _is_acceptable_extracted_content(content):
                return content
        except ValueError as e:
            # Re-raise user-friendly error messages
            raise
        except Exception as e:
            logger.error(f"Browser automation failed for {url}: {str(e)}")

    return ""


def _extract_with_browser_automation(url: str) -> str:
    """
    Extract content from URL using Selenium browser automation with JavaScript rendering.

    Uses Selenium to handle dynamic sites that require client-side rendering.
    Waits for content to load and extracts clean text content.

    Args:
        url: The URL to extract content from

    Returns:
        Extracted text content or empty string if extraction fails

    Raises:
        Exception: If browser automation fails
    """
    driver = None

    try:
        # Configure Chrome options for headless mode
        chrome_options = _build_chrome_options()

        # Initialize the Chrome driver (use CHROMEDRIVER_PATH if set to match Chrome version)
        driver = _create_chrome_driver(chrome_options)
        driver.set_page_load_timeout(
            BackgroundTaskConfig.SELENIUM_PAGE_LOAD_TIMEOUT_SECONDS
        )

        # Navigate to the URL
        driver.get(url)

        # Wait for page to load
        WebDriverWait(
            driver, BackgroundTaskConfig.SELENIUM_BODY_WAIT_TIMEOUT_SECONDS
        ).until(EC.presence_of_element_located((By.TAG_NAME, "body")))

        structured_content = _extract_structured_content_from_browser(driver)
        if structured_content:
            return structured_content

        # Wait for dynamic content to load (JavaScript-heavy sites)
        # The JavaScript extraction below has its own robust selector logic with fallback
        time.sleep(BackgroundTaskConfig.SELENIUM_DYNAMIC_CONTENT_WAIT_SECONDS)

        # Extract page content using JavaScript
        parent_content = _extract_parent_content_with_browser_js(driver)

        iframe_content = _extract_iframe_content_with_browser_automation(driver)
        content = _combine_parent_and_iframe_content(parent_content, iframe_content)

        if content and len(content) > 100:
            return content
        else:
            raise Exception("Browser automation extracted minimal content")

    except TimeoutException as e:
        logger.error(f"Browser automation timeout for {url}: {str(e)}")
        raise ValueError(
            "Browser automation timed out on this URL. Please copy and paste the job "
            "description manually using the 'Text' tab."
        )
    except WebDriverException as e:
        error_message = str(e)
        logger.error(f"Browser automation driver error for {url}: {error_message}")
        if _is_driver_startup_failure(error_message):
            raise ValueError(
                "Browser automation failed to start for this URL. Please copy and "
                "paste the job description manually using the 'Text' tab."
            )
        raise ValueError(
            "Browser automation failed for this URL. Please copy and paste the job "
            "description manually using the 'Text' tab."
        )
    except Exception as e:
        logger.error(f"Browser automation failed for {url}: {str(e)}")
        raise
    finally:
        # Clean up browser resources
        if driver:
            try:
                driver.quit()
            except Exception:
                pass  # Silently handle cleanup errors


def _extract_raw_content(url: str) -> str:
    """Extract raw content from URL using web scraping."""
    try:
        # Add a small delay to be respectful to the server
        time.sleep(1)

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }

        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()

        soup = BeautifulSoup(response.content, "html.parser")

        structured = _extract_jsonld_job_posting(soup)
        # Keep this aligned with raw extraction gates that require substantial content.
        if structured and len(structured.get("content", "")) >= SUBSTANTIAL_CONTENT_CHARS:
            return structured["content"]

        # Remove script and style elements
        for script in soup(["script", "style"]):
            script.decompose()

        # Get all text content
        text = soup.get_text(separator="\n", strip=True)

        # Clean up the text
        lines = [line.strip() for line in text.split("\n") if line.strip()]
        cleaned_text = "\n".join(lines)

        return cleaned_text if len(cleaned_text) > 100 else ""

    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 429:
            logger.error(f"Rate limited by {url}: {str(e)}")
            raise ValueError(
                "This job site is blocking automated requests. Please copy and paste the job description manually using the 'Text' tab."
            )
        elif e.response.status_code == 403:
            logger.error(f"Access forbidden for {url}: {str(e)}")
            raise ValueError(
                "This job site requires authentication or blocks automated access. Please copy and paste the job description manually using the 'Text' tab."
            )
        else:
            logger.error(f"HTTP error accessing {url}: {str(e)}")
            raise ValueError(
                f"Unable to access this URL (HTTP {e.response.status_code}). Please copy and paste the job description manually using the 'Text' tab."
            )
    except requests.exceptions.Timeout as e:
        logger.error(f"Timeout accessing {url}: {str(e)}")
        raise ValueError(
            "The job site took too long to respond. Please copy and paste the job description manually using the 'Text' tab."
        )
    except requests.exceptions.RequestException as e:
        logger.error(f"Request error accessing {url}: {str(e)}")
        raise ValueError(
            "Unable to access this URL. Please copy and paste the job description manually using the 'Text' tab."
        )
    except Exception as e:
        logger.error(f"Failed to extract content from {url}: {str(e)}")
        raise ValueError(
            "Unable to extract content from this URL. Please copy and paste the job description manually using the 'Text' tab."
        )


def _parse_with_openai(
    raw_content: str, url: str, user_id: str = None, db_session=None
) -> Dict[str, Any]:
    """
    Parse job description content using OpenAI AI service.

    This is a synchronous wrapper around the async extract_job_description_with_ai.
    It uses asyncio.run() to execute the async function in a new event loop.
    """
    import asyncio

    try:
        # Use the AI service to parse the content (async function)
        result = asyncio.run(
            extract_job_description_with_ai(
                raw_content, url, user_id=user_id, db_session=db_session
            )
        )

        # Check if AI service returned an error
        if result.get("error"):
            return {
                "error": f"AI parsing failed: {result.get('error')}. Please copy and paste the job description manually using the 'Text' tab.",
                "success": False,
            }

        return {
            "success": True,
            "content": result.get("content", ""),
            "title": result.get("title", ""),
            "company": result.get("company", ""),
            "location": result.get("location", ""),
            "source_url": url,
            "source": result.get("source", "ai_parsed"),
        }

    except Exception as e:
        logger.error(f"Failed to parse content with OpenAI: {str(e)}")
        return {
            "error": f"AI service is currently unavailable. Please copy and paste the job description manually using the 'Text' tab.",
            "success": False,
        }


def is_supported_url(url: str) -> bool:
    """Check if the URL appears to be a valid web URL."""
    try:
        parsed_url = urlparse(url)
        return bool(parsed_url.scheme and parsed_url.netloc)
    except Exception:
        return False


def _is_search_results_page(url: str) -> bool:
    """
    Check if the URL is a search results page rather than an individual job posting.

    Detects common patterns used by job sites for search results pages:
    - Glassdoor: SRCH_ parameter, /jobs-SRCH pattern
    - LinkedIn: /jobs/search, /jobs/collections
    - Indeed: /jobs?, /q- patterns
    - Generic: search parameters and keywords

    Args:
        url: The URL to check

    Returns:
        True if the URL appears to be a search results page
    """
    url_lower = url.lower()

    # Glassdoor search results patterns
    if "glassdoor" in url_lower:
        if "srch_" in url_lower:  # Search parameter
            return True
        if "/job/" in url_lower and "_jobs" in url_lower and "jv_" not in url_lower:
            return True  # /Job/location-keyword_jobs pattern without job ID

    # LinkedIn search results patterns
    if "linkedin.com" in url_lower:
        if "/jobs/search" in url_lower or "/jobs/collections" in url_lower:
            return True

    # Indeed search results patterns
    if "indeed" in url_lower:
        if "/jobs?" in url_lower or "/q-" in url_lower:
            return True

    # Generic search patterns
    search_indicators = [
        "/search?",
        "/search/",
        "?search=",
        "&search=",
        "/jobs?",
        "/job-search",
        "keyword=",
        "keywords=",
    ]

    return any(indicator in url_lower for indicator in search_indicators)
