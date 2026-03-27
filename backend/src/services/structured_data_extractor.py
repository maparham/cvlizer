"""Helpers for extracting JobPosting structured data from HTML and browser pages."""

import json
import logging
from typing import Any, Callable, Dict, List, Optional

from bs4 import BeautifulSoup  # type: ignore[import-untyped]

logger = logging.getLogger(__name__)


def _extract_hiring_organization_name(candidate: Dict[str, Any]) -> str:
    """Get company name from JobPosting.hiringOrganization."""
    hiring_org = candidate.get("hiringOrganization")
    if isinstance(hiring_org, dict):
        return (hiring_org.get("name") or "").strip()
    if isinstance(hiring_org, str):
        return hiring_org.strip()
    return ""


def _extract_job_location(candidate: Dict[str, Any]) -> str:
    """Build a readable location string from JobPosting fields."""
    job_location = candidate.get("jobLocation")
    if not isinstance(job_location, dict):
        return ""

    address = job_location.get("address")
    if not isinstance(address, dict):
        return ""

    locality = (address.get("addressLocality") or "").strip()
    country = (address.get("addressCountry") or "").strip()
    if locality and country:
        return f"{locality}, {country}"
    return locality or country


def _parse_description_field(description_value: Any) -> str:
    """Parse description field from JobPosting candidate into plain text."""
    if isinstance(description_value, str):
        description_html = description_value
    elif description_value is None:
        description_html = ""
    else:
        # Some sites use non-string JSON-LD fields; coerce safely.
        description_html = str(description_value)

    try:
        return BeautifulSoup(description_html, "html.parser").get_text(
            separator="\n", strip=True
        )
    except Exception as e:
        logger.debug(
            "Failed to parse JobPosting description HTML, using raw text: %s", str(e)
        )
        return description_html


def _parse_jsonld_script_payload(payload: str) -> List[Dict[str, Any]]:
    """Parse script payload into a list of dictionary candidates."""
    try:
        data = json.loads(payload)
    except json.JSONDecodeError:
        return []

    candidates: List[Dict[str, Any]] = []
    if isinstance(data, list):
        candidates = [item for item in data if isinstance(item, dict)]
    elif isinstance(data, dict):
        if isinstance(data.get("@graph"), list):
            candidates.extend(item for item in data["@graph"] if isinstance(item, dict))
        candidates.append(data)
    return candidates


def _extract_job_posting_from_candidate(
    candidate: Dict[str, Any], clean_text: Callable[[str], str]
) -> Optional[Dict[str, str]]:
    """Extract normalized JobPosting fields from one candidate dictionary."""
    if candidate.get("@type") != "JobPosting":
        return None

    description_text = _parse_description_field(candidate.get("description"))
    return {
        "title": (candidate.get("title") or "").strip(),
        "company": _extract_hiring_organization_name(candidate),
        "location": _extract_job_location(candidate),
        "content": clean_text(description_text),
        "source": "jsonld_jobposting",
    }


def extract_jsonld_job_posting(
    soup: BeautifulSoup, clean_text: Callable[[str], str]
) -> Optional[Dict[str, str]]:
    """Extract JobPosting fields from JSON-LD blocks."""
    scripts = soup.find_all("script", attrs={"type": "application/ld+json"})
    for script in scripts:
        payload = script.string or script.get_text()
        if not payload:
            continue
        candidates = _parse_jsonld_script_payload(payload)
        for candidate in candidates:
            job_posting = _extract_job_posting_from_candidate(candidate, clean_text)
            if job_posting:
                return job_posting
    return None


def is_complete_structured_job_data(
    job_data: Dict[str, Any], min_content_chars: int
) -> bool:
    """Return True when structured data is complete enough for extraction flow."""
    title = (job_data.get("title") or "").strip() if job_data else ""
    content = (job_data.get("content") or "").strip() if job_data else ""
    return len(title) > 0 and len(content) >= min_content_chars
