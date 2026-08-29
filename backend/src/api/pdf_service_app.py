"""
Dedicated PDF service app for Cloudflare container deployment.

This app isolates LaTeX PDF generation from the main API container so the main
backend image can stay small and avoid TeX-related cold-start issues.
"""

from __future__ import annotations

import base64
import logging
import os
import tempfile
from pathlib import Path
from typing import Any, Dict, Literal, Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import Response
from pydantic import BaseModel

from src.services.cv.latex_export_service import (
    compile_pdf_from_latex,
    generate_cv_latex,
    is_latex_available,
)
from src.services.platform.preview_service import (
    generate_blurred_preview,
    is_preview_available,
)

app = FastAPI(title="CVLator PDF Service", version="1.0.0")
logger = logging.getLogger(__name__)

PDF_SERVICE_AUTH_TOKEN = os.getenv("PDF_SERVICE_AUTH_TOKEN", "").strip()
PDF_SERVICE_AUTH_HEADER = os.getenv("PDF_SERVICE_AUTH_HEADER", "X-PDF-Service-Token")


class PDFGenerationRequest(BaseModel):
    """Payload required to generate a PDF document from CV JSON."""

    cv_data: Dict[str, Any]
    cv_filename: str
    template_name: str = "standard"
    profile_pic_path: Optional[str] = None
    profile_pic_shape: Optional[str] = None
    profile_pic_size: Optional[str] = None
    profile_picture_base64: Optional[str] = None
    # Defaults to True so an API container predating this field keeps the
    # opt-out semantics (credit shown unless the caller turns it off).
    show_ai_attribution: bool = True


class PreviewConversionRequest(BaseModel):
    """Payload required to convert PDF bytes into preview PNG page images."""

    pdf_base64: str
    blur_radius: int = 0


class PreviewConversionResponse(BaseModel):
    """
    Deterministic conversion response for backend fallback decisions.

    status values:
    - converted: conversion succeeded with one or more pages.
    - conversion_unavailable: runtime cannot convert PDFs to images.
    - conversion_failed: conversion was attempted but failed or returned no pages.
    """

    status: Literal["converted", "conversion_unavailable", "conversion_failed"]
    preview_pages: Optional[list[str]] = None
    error: Optional[str] = None


def _validate_service_auth(request: Request) -> None:
    """
    Validate shared-secret header when PDF service auth is configured.

    The service allows unauthenticated access only when PDF_SERVICE_AUTH_TOKEN
    is intentionally left empty.
    """
    if not PDF_SERVICE_AUTH_TOKEN:
        return

    received = request.headers.get(PDF_SERVICE_AUTH_HEADER, "")
    if not received or received != PDF_SERVICE_AUTH_TOKEN:
        raise HTTPException(status_code=401, detail="Unauthorized")


def _decode_profile_picture_to_tempfile(
    profile_picture_base64: Optional[str],
) -> Optional[str]:
    """Decode profile image bytes from base64 and return temporary file path."""
    if not profile_picture_base64:
        return None

    try:
        image_bytes = base64.b64decode(profile_picture_base64, validate=True)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=400, detail="Invalid profile picture encoding"
        ) from exc

    if not image_bytes:
        return None

    with tempfile.NamedTemporaryFile(delete=False, suffix=".img") as tmp_file:
        tmp_file.write(image_bytes)
        return tmp_file.name


@app.post("/generate-pdf")
async def generate_pdf(
    request: Request,
    payload: PDFGenerationRequest,
) -> Response:
    """
    Generate PDF bytes using LaTeX compilation.

    Profile image can be supplied as base64 data for cross-container compatibility.
    """
    _validate_service_auth(request)

    if not is_latex_available():
        raise HTTPException(
            status_code=503,
            detail="LaTeX toolchain (pdflatex) not available in PDF service",
        )

    profile_picture_path: Optional[str] = None
    try:
        profile_picture_path = _decode_profile_picture_to_tempfile(
            payload.profile_picture_base64
        )
        effective_profile_path = profile_picture_path or payload.profile_pic_path

        tex_source = generate_cv_latex(
            payload.cv_data,
            payload.cv_filename or "My CV",
            template_name=payload.template_name,
            profile_pic_path=effective_profile_path,
            profile_pic_shape=payload.profile_pic_shape,
            profile_pic_size=payload.profile_pic_size,
            show_ai_attribution=payload.show_ai_attribution,
        )
        pdf_bytes = compile_pdf_from_latex(
            tex_source,
            profile_pic_path=effective_profile_path,
        )
        return Response(content=pdf_bytes, media_type="application/pdf")
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=500, detail=f"Failed to generate PDF: {exc}"
        ) from exc
    finally:
        if profile_picture_path:
            try:
                Path(profile_picture_path).unlink(missing_ok=True)
            except Exception:
                pass


@app.post("/convert-preview", response_model=PreviewConversionResponse)
async def convert_preview(
    request: Request,
    payload: PreviewConversionRequest,
) -> PreviewConversionResponse:
    """
    Convert PDF bytes to preview PNG pages for backend preview jobs.

    This endpoint keeps PDF->image dependencies in the PDF service runtime so the
    main backend image can stay minimal.
    """
    _validate_service_auth(request)

    if not is_preview_available():
        logger.warning("Preview conversion unavailable in PDF service runtime")
        return PreviewConversionResponse(
            status="conversion_unavailable",
            error="Preview conversion dependencies unavailable in PDF service runtime",
        )

    try:
        pdf_bytes = base64.b64decode(payload.pdf_base64, validate=True)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=400, detail="Invalid PDF payload encoding"
        ) from exc

    if not pdf_bytes:
        raise HTTPException(status_code=400, detail="PDF payload is empty")

    preview_pages = generate_blurred_preview(pdf_bytes, blur_radius=payload.blur_radius)
    if preview_pages is None:
        logger.error("Preview conversion failed in PDF service")
        return PreviewConversionResponse(
            status="conversion_failed",
            error="Preview conversion failed",
        )
    if not preview_pages:
        logger.warning("Preview conversion returned zero pages in PDF service")
        return PreviewConversionResponse(
            status="conversion_failed",
            error="Preview conversion returned no pages",
        )

    return PreviewConversionResponse(
        status="converted",
        preview_pages=[base64.b64encode(page).decode("ascii") for page in preview_pages],
    )


@app.get("/health")
async def health() -> Dict[str, Any]:
    """Health endpoint for service checks and smoke tests."""
    return {
        "status": "healthy",
        "latex_available": is_latex_available(),
        "auth_required": bool(PDF_SERVICE_AUTH_TOKEN),
        "auth_header": PDF_SERVICE_AUTH_HEADER,
    }
