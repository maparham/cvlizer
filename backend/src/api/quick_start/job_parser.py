"""
Job parsing logic for quick start preview.

This module handles job description parsing for the quick start feature,
supporting both URL extraction and text input with AI parsing.
"""

import asyncio
import logging
import os
from typing import Any, Dict, Optional

from fastapi import Request

from src.services.ai_service import extract_job_description_with_ai
from src.services.job_descriptions.url_parsing_service import (
    _extract_raw_content_with_fallback,
    _is_search_results_page,
)
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

# Timeout for AI parsing operations (in seconds). Job URL extraction + AI can take up to ~2 min.
# Set QUICK_START_JOB_TIMEOUT to override (e.g. 120 for 2 minutes).
QUICK_START_TIMEOUT = int(os.getenv("QUICK_START_JOB_TIMEOUT", "120"))


async def parse_job_for_preview(
    job_url: Optional[str], job_text: Optional[str], request: Request
) -> Dict[str, Any]:
    """
    Parse job description for quick start preview.

    Args:
        job_url: Optional job posting URL
        job_text: Optional job description text
        request: FastAPI request object for logging

    Returns:
        Dictionary containing job preview data or error information
    """
    job_preview: Dict[str, Any] = {}

    try:
        if job_url:
            logger.info(
                f"Parsing job URL for quick start preview: {job_url} from IP {request.client.host if request.client else 'unknown'}"
            )

            # Validate URL format
            parsed_url = urlparse(job_url)
            if not parsed_url.scheme or not parsed_url.netloc:
                job_preview = {
                    "error": "Invalid URL format. Please check the URL and try again.",
                    "source": "url",
                }
            else:
                # Check if this is a search results page
                if _is_search_results_page(job_url):
                    job_preview = {
                        "error": "This appears to be a search results page. Please use a specific job URL.",
                        "source": "url",
                    }
                else:
                    # Extract raw content from URL
                    raw_content = _extract_raw_content_with_fallback(job_url)

                    if raw_content:
                        # Use AI service to extract structured data with timeout
                        try:
                            job_result = await asyncio.wait_for(
                                extract_job_description_with_ai(
                                    raw_content, job_url, user_id=None, db_session=None
                                ),
                                timeout=QUICK_START_TIMEOUT,
                            )
                        except asyncio.TimeoutError:
                            logger.error(
                                f"Job description parsing timeout in quick start for {job_url}"
                            )
                            job_result = {
                                "error": "Parsing took too long. Please try a simpler URL or use the text option."
                            }

                        if not job_result.get("error"):
                            job_preview = {
                                "source": "url",
                                "title": job_result.get("title", ""),
                                "company": job_result.get("company", ""),
                                "location": job_result.get("location", ""),
                                "content_preview": (
                                    job_result.get("content", "")[:200] + "..."
                                    if len(job_result.get("content", "")) > 200
                                    else job_result.get("content", "")
                                ),
                                "content": job_result.get(
                                    "content", ""
                                ),  # Full content for markdown rendering
                                "has_content": bool(job_result.get("content")),
                                # Include full parsed data for later claiming
                                "full_parsed_data": job_result,
                            }
                        else:
                            job_preview = {
                                "error": job_result.get(
                                    "error", "Failed to parse job content"
                                ),
                                "source": "url",
                            }
                    else:
                        job_preview = {
                            "error": "Unable to extract content from this URL. Please try the text option.",
                            "source": "url",
                        }

        elif job_text:
            logger.info(
                f"Processing job text for quick start preview from IP {request.client.host if request.client else 'unknown'}"
            )
            # For text input, we don't need to parse a URL, just use the text
            job_preview = {
                "source": "text",
                "content_preview": (
                    job_text[:200] + "..." if len(job_text) > 200 else job_text
                ),
                "content": job_text,  # Full content for markdown rendering
                "has_content": bool(job_text.strip()),
                "content_length": len(job_text),
            }

    except Exception as e:
        logger.error(f"Job description parsing error in quick start: {str(e)}")
        job_preview = {
            "error": f"Failed to parse job description: {str(e)}",
            "source": "url" if job_url else "text",
        }

    return job_preview
