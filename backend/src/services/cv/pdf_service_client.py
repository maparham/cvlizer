"""
Client for communicating with the external PDF generation service.

This module is intentionally small and focused so export endpoints can switch
between local LaTeX compilation and a remote PDF service by configuration.
"""

from __future__ import annotations

import asyncio
import base64
import logging
import os
import time
from pathlib import Path
from typing import Any, Dict, Optional

import httpx

logger = logging.getLogger(__name__)


def _http_error_context(exc: httpx.HTTPStatusError, max_chars: int = 1200) -> str:
    """Short status + response body snippet for logs and raised errors."""
    try:
        text = exc.response.text or ""
    except Exception:  # noqa: BLE001
        text = ""
    snippet = text.strip().replace("\n", " ")
    if len(snippet) > max_chars:
        snippet = snippet[:max_chars] + "…"
    return f"HTTP {exc.response.status_code} {snippet}"


PDF_SERVICE_URL = os.getenv("PDF_SERVICE_URL", "").strip()
PDF_SERVICE_AUTH_HEADER = os.getenv("PDF_SERVICE_AUTH_HEADER", "X-PDF-Service-Token")
PDF_SERVICE_AUTH_TOKEN = os.getenv("PDF_SERVICE_AUTH_TOKEN", "").strip()
PDF_SERVICE_TIMEOUT_SECONDS = float(os.getenv("PDF_SERVICE_TIMEOUT_SECONDS", "120"))
PDF_SERVICE_RETRIES = max(1, int(os.getenv("PDF_SERVICE_RETRIES", "3")))
PDF_SERVICE_RETRY_DELAY_SECONDS = float(
    os.getenv("PDF_SERVICE_RETRY_DELAY_SECONDS", "0.5")
)


class PDFServiceError(RuntimeError):
    """Raised when the PDF service cannot complete a request."""


def should_use_pdf_service() -> bool:
    """Return whether PDF generation should route through external PDF service."""
    return os.getenv("USE_PDF_SERVICE", "false").strip().lower() == "true"


def _profile_picture_as_base64(profile_pic_path: Optional[str]) -> Optional[str]:
    """
    Read a local profile picture and return base64 for cross-container transport.

    A local filesystem path from the API container is invalid in a separate PDF
    container. Sending bytes allows the downstream service to reconstruct the file.
    """
    if not profile_pic_path:
        return None

    file_path = Path(profile_pic_path)
    if not file_path.exists() or not file_path.is_file():
        return None

    raw = file_path.read_bytes()
    if not raw:
        return None

    return base64.b64encode(raw).decode("ascii")


def _build_pdf_service_request(
    cv_data: Dict[str, Any],
    cv_filename: str,
    template_name: str,
    profile_pic_path: Optional[str],
    profile_pic_shape: Optional[str],
    profile_pic_size: Optional[str],
    show_ai_attribution: bool = True,
) -> tuple[str, Dict[str, Any], Dict[str, str]]:
    """Build URL, payload, and auth headers for PDF service calls."""
    if not PDF_SERVICE_URL:
        raise PDFServiceError("PDF_SERVICE_URL is not configured")

    headers: Dict[str, str] = {}
    if PDF_SERVICE_AUTH_TOKEN:
        headers[PDF_SERVICE_AUTH_HEADER] = PDF_SERVICE_AUTH_TOKEN

    profile_picture_base64 = _profile_picture_as_base64(profile_pic_path)
    payload: Dict[str, Any] = {
        "cv_data": cv_data,
        "cv_filename": cv_filename,
        "template_name": template_name,
        # Path is intentionally omitted for service mode; it is local-only.
        "profile_pic_path": None,
        "profile_pic_shape": profile_pic_shape,
        "profile_pic_size": profile_pic_size,
        "show_ai_attribution": show_ai_attribution,
    }
    if profile_picture_base64:
        payload["profile_picture_base64"] = profile_picture_base64

    url = f"{PDF_SERVICE_URL.rstrip('/')}/generate-pdf"
    return (url, payload, headers)


async def generate_pdf_via_service(
    cv_data: Dict[str, Any],
    cv_filename: str,
    template_name: str = "default",
    profile_pic_path: Optional[str] = None,
    profile_pic_shape: Optional[str] = None,
    profile_pic_size: Optional[str] = None,
    show_ai_attribution: bool = True,
) -> bytes:
    """
    Call the external PDF service and return generated PDF bytes.

    Raises:
        PDFServiceError: When service URL is missing, auth is invalid, or
            all attempts fail.
    """
    url, payload, headers = _build_pdf_service_request(
        cv_data=cv_data,
        cv_filename=cv_filename,
        template_name=template_name,
        profile_pic_path=profile_pic_path,
        profile_pic_shape=profile_pic_shape,
        profile_pic_size=profile_pic_size,
        show_ai_attribution=show_ai_attribution,
    )

    last_error: Optional[Exception] = None
    async with httpx.AsyncClient(timeout=PDF_SERVICE_TIMEOUT_SECONDS) as client:
        for attempt in range(1, PDF_SERVICE_RETRIES + 1):
            try:
                response = await client.post(
                    url,
                    json=payload,
                    headers=headers,
                )
                response.raise_for_status()
                return response.content
            except httpx.HTTPStatusError as exc:
                status_code = exc.response.status_code
                # Do not retry auth/client validation failures.
                if status_code in (400, 401, 403, 404, 422):
                    raise PDFServiceError(
                        f"PDF service rejected request: {_http_error_context(exc)}"
                    ) from exc
                last_error = exc
            except httpx.HTTPError as exc:
                last_error = exc

            if attempt < PDF_SERVICE_RETRIES:
                backoff = PDF_SERVICE_RETRY_DELAY_SECONDS * (2 ** (attempt - 1))
                detail = (
                    _http_error_context(last_error)
                    if isinstance(last_error, httpx.HTTPStatusError)
                    else str(last_error)
                )
                logger.warning(
                    "PDF service request failed (attempt %s/%s). Retrying in %.2fs. %s",
                    attempt,
                    PDF_SERVICE_RETRIES,
                    backoff,
                    detail,
                )
                await asyncio.sleep(backoff)

    if isinstance(last_error, httpx.HTTPStatusError):
        ctx = _http_error_context(last_error)
        logger.error("PDF service failed after %s attempts: %s", PDF_SERVICE_RETRIES, ctx)
        raise PDFServiceError(
            f"PDF service unavailable after {PDF_SERVICE_RETRIES} attempts: {ctx}"
        ) from last_error
    raise PDFServiceError(
        f"PDF service unavailable after {PDF_SERVICE_RETRIES} attempts: {last_error}"
    ) from last_error


def generate_pdf_via_service_sync(
    cv_data: Dict[str, Any],
    cv_filename: str,
    template_name: str = "default",
    profile_pic_path: Optional[str] = None,
    profile_pic_shape: Optional[str] = None,
    profile_pic_size: Optional[str] = None,
    show_ai_attribution: bool = True,
) -> bytes:
    """
    Synchronous PDF service call for thread-worker code paths.

    This avoids creating ad-hoc event loops in worker threads just to execute a
    single async HTTP call.
    """
    url, payload, headers = _build_pdf_service_request(
        cv_data=cv_data,
        cv_filename=cv_filename,
        template_name=template_name,
        profile_pic_path=profile_pic_path,
        profile_pic_shape=profile_pic_shape,
        profile_pic_size=profile_pic_size,
        show_ai_attribution=show_ai_attribution,
    )

    last_error: Optional[Exception] = None
    with httpx.Client(timeout=PDF_SERVICE_TIMEOUT_SECONDS) as client:
        for attempt in range(1, PDF_SERVICE_RETRIES + 1):
            try:
                response = client.post(
                    url,
                    json=payload,
                    headers=headers,
                )
                response.raise_for_status()
                return response.content
            except httpx.HTTPStatusError as exc:
                status_code = exc.response.status_code
                if status_code in (400, 401, 403, 404, 422):
                    raise PDFServiceError(
                        f"PDF service rejected request: {_http_error_context(exc)}"
                    ) from exc
                last_error = exc
            except httpx.HTTPError as exc:
                last_error = exc

            if attempt < PDF_SERVICE_RETRIES:
                backoff = PDF_SERVICE_RETRY_DELAY_SECONDS * (2 ** (attempt - 1))
                detail = (
                    _http_error_context(last_error)
                    if isinstance(last_error, httpx.HTTPStatusError)
                    else str(last_error)
                )
                logger.warning(
                    "PDF service request failed (attempt %s/%s). Retrying in %.2fs. %s",
                    attempt,
                    PDF_SERVICE_RETRIES,
                    backoff,
                    detail,
                )
                time.sleep(backoff)

    if isinstance(last_error, httpx.HTTPStatusError):
        ctx = _http_error_context(last_error)
        logger.error("PDF service failed after %s attempts: %s", PDF_SERVICE_RETRIES, ctx)
        raise PDFServiceError(
            f"PDF service unavailable after {PDF_SERVICE_RETRIES} attempts: {ctx}"
        ) from last_error
    raise PDFServiceError(
        f"PDF service unavailable after {PDF_SERVICE_RETRIES} attempts: {last_error}"
    ) from last_error


def _build_preview_conversion_request(
    pdf_bytes: bytes,
    blur_radius: int,
) -> tuple[str, Dict[str, Any], Dict[str, str]]:
    """Build URL, payload, and auth headers for preview conversion calls."""
    if not PDF_SERVICE_URL:
        raise PDFServiceError("PDF_SERVICE_URL is not configured")

    headers: Dict[str, str] = {}
    if PDF_SERVICE_AUTH_TOKEN:
        headers[PDF_SERVICE_AUTH_HEADER] = PDF_SERVICE_AUTH_TOKEN

    payload: Dict[str, Any] = {
        "pdf_base64": base64.b64encode(pdf_bytes).decode("ascii"),
        "blur_radius": blur_radius,
    }
    url = f"{PDF_SERVICE_URL.rstrip('/')}/convert-preview"
    return (url, payload, headers)


def generate_preview_via_service_sync(
    pdf_bytes: bytes,
    blur_radius: int = 0,
) -> dict[str, Any]:
    """
    Synchronously convert PDF bytes to preview pages via external PDF service.

    Returns a deterministic payload with:
    - status: converted | conversion_unavailable | conversion_failed | service_error
    - pages: decoded PNG bytes list when converted, else None
    - error: optional diagnostic string for logs and fallback decisions
    """
    try:
        url, payload, headers = _build_preview_conversion_request(pdf_bytes, blur_radius)
    except PDFServiceError as exc:
        return {"status": "service_error", "pages": None, "error": str(exc)}

    last_error: Optional[Exception] = None
    with httpx.Client(timeout=PDF_SERVICE_TIMEOUT_SECONDS) as client:
        for attempt in range(1, PDF_SERVICE_RETRIES + 1):
            try:
                response = client.post(url, json=payload, headers=headers)
                response.raise_for_status()
                body = response.json()

                status = body.get("status")
                if status == "converted":
                    encoded_pages = body.get("preview_pages") or []
                    try:
                        decoded_pages = [
                            base64.b64decode(page_b64, validate=True)
                            for page_b64 in encoded_pages
                        ]
                    except Exception as exc:  # noqa: BLE001
                        return {
                            "status": "conversion_failed",
                            "pages": None,
                            "error": f"Invalid preview page encoding from service: {exc}",
                        }
                    if not decoded_pages:
                        return {
                            "status": "conversion_failed",
                            "pages": None,
                            "error": "Service conversion succeeded but returned no pages",
                        }
                    return {"status": "converted", "pages": decoded_pages, "error": None}

                if status in ("conversion_unavailable", "conversion_failed"):
                    return {
                        "status": status,
                        "pages": None,
                        "error": body.get("error"),
                    }

                return {
                    "status": "service_error",
                    "pages": None,
                    "error": f"Unexpected preview conversion status: {status}",
                }
            except httpx.HTTPStatusError as exc:
                status_code = exc.response.status_code
                if status_code in (400, 401, 403, 404, 422):
                    return {
                        "status": "service_error",
                        "pages": None,
                        "error": f"Preview conversion rejected with status {status_code}",
                    }
                last_error = exc
            except httpx.HTTPError as exc:
                last_error = exc
            except ValueError as exc:
                return {
                    "status": "service_error",
                    "pages": None,
                    "error": f"Invalid JSON response from preview conversion service: {exc}",
                }

            if attempt < PDF_SERVICE_RETRIES:
                backoff = PDF_SERVICE_RETRY_DELAY_SECONDS * (2 ** (attempt - 1))
                logger.warning(
                    "Preview conversion request failed (attempt %s/%s). Retrying in %.2fs",
                    attempt,
                    PDF_SERVICE_RETRIES,
                    backoff,
                )
                time.sleep(backoff)

    return {
        "status": "service_error",
        "pages": None,
        "error": (
            f"Preview conversion unavailable after {PDF_SERVICE_RETRIES} attempts: "
            f"{last_error}"
        ),
    }
