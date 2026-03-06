"""
CV Export API Endpoints

This module handles PDF and LaTeX export functionality for CVs.
"""

import os
import re
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from src.middleware.clerk_auth import get_effective_user_lightweight, verify_clerk_token
from src.models.base import get_db
from src.models.user import User
from src.services.cv_service import get_cv_by_id
from src.services.latex_export_service import (
    compile_pdf_from_latex,
    generate_cv_latex,
    is_latex_available,
)
from src.services.template_loader import (
    get_default_template,
    is_template_available,
)
from src.services.user_activity_service import log_api_call, log_user_activity

from .common import logger

router = APIRouter()


def _resolve_export_template(template: Optional[str]) -> str:
    """
    Resolve to a valid template name for export.
    Uses query param if valid, else default from config, else "standard" if available.
    Raises HTTPException 503 if no template is available.
    """
    if template and is_template_available(template):
        return template
    default = get_default_template()
    if default and is_template_available(default):
        return default
    if is_template_available("standard"):
        return "standard"
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="No export template available. Please configure defaultTemplate in templates config.",
    )


# Stem of original_filename is considered generic; use parsed full_name for filename.
_GENERIC_TITLE_STEMS = ("cv", "resume", "document", "new cv")


def _cv_title_for_filename(cv) -> str:
    """
    Build a safe filename base from the CV's title (original_filename).
    Uses the stem only (extension is never included). When the stem is generic
    (e.g. resume, document), falls back to parsed personal_info.full_name so
    exports get a meaningful name (e.g. Jane_Doe). When no meaningful name is
    available, returns "CV".
    """
    raw = (cv.original_filename or "CV").strip()
    stem = raw.rsplit(".", 1)[0].strip() if "." in raw else raw
    stem_lower = stem.lower()

    if stem_lower in _GENERIC_TITLE_STEMS:
        personal_info = (cv.parsed_data or {}).get("personal_info") or {}
        full_name = (personal_info.get("full_name") or "").strip()
        if not full_name:
            for field in ("name", "fullName", "fullname", "first_name", "last_name"):
                if field in personal_info and personal_info[field]:
                    full_name = str(personal_info[field]).strip()
                    break
        base = full_name if full_name else "CV"
    else:
        base = stem

    with_underscores = base.replace(".", "_")
    safe = re.sub(r"[^A-Za-z0-9_\-\s]+", " ", with_underscores).strip()
    safe = re.sub(r"[\s\-]+", "_", safe).strip("_") or "CV"
    return safe


def _export_filename(cv, template_name: str, ext: str) -> str:
    """Build export filename: title_base_YYYYMMDD_template.ext."""
    base = _cv_title_for_filename(cv)
    date_str = datetime.now(timezone.utc).strftime("%Y%m%d")
    return f"{base}_{date_str}_{template_name}.{ext}"


@router.get("/{cv_id}/export/pdf")
async def export_cv_pdf(
    cv_id: str,
    template: Optional[str] = Query(None, description="Optional template name"),
    request: Request = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user_lightweight),
):
    """Export CV as PDF via LaTeX (pdflatex)."""
    cv = get_cv_by_id(db, cv_id, str(current_user.id))
    if not cv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")

    template_name = _resolve_export_template(template)
    logger.info(
        f"User {current_user.email} exporting CV {cv_id} ({cv.original_filename}) as PDF with template '{template_name}'"
    )
    try:
        log_user_activity(
            db=db,
            user=current_user,
            activity_type="user_action",
            action="export_cv_pdf",
            description=f"Exported CV '{cv.original_filename}' as PDF with template '{template_name}'",
            details={
                "cv_id": cv_id,
                "cv_filename": cv.original_filename,
                "template_name": template_name,
                "export_type": "pdf",
            },
        )
    except Exception as e:
        logger.warning(f"Failed to log user activity for PDF export: {str(e)}")

    if not is_latex_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="LaTeX toolchain (pdflatex) not available on server",
        )
    try:
        tex_source = generate_cv_latex(
            cv.parsed_data or {},
            cv.original_filename or "My CV",
            template_name=template_name,
        )
        pdf_bytes = compile_pdf_from_latex(tex_source)
        filename = _export_filename(cv, template_name, "pdf")

        headers = {
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Type": "application/pdf",
            "Access-Control-Expose-Headers": "Content-Disposition",
        }

        # Log successful API call
        try:
            log_api_call(
                db=db,
                user=current_user,
                endpoint=f"/api/cvs/{cv_id}/export/pdf",
                method="GET",
                status_code=200,
                request_data={"template": template},
                response_data={"filename": filename, "file_size": len(pdf_bytes)},
            )
        except Exception as e:
            logger.warning(f"Failed to log API call for PDF export: {str(e)}")

        return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate PDF: {str(e)}",
        )


@router.get("/{cv_id}/export/latex")
async def export_cv_latex(
    cv_id: str,
    template: Optional[str] = Query(None, description="Optional template name"),
    request: Request = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user_lightweight),
):
    """Export CV as raw LaTeX source code for the selected template."""
    cv = get_cv_by_id(db, cv_id, str(current_user.id))
    if not cv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")

    try:
        template_name = _resolve_export_template(template)
        tex_source = generate_cv_latex(
            cv.parsed_data or {},
            cv.original_filename or "My CV",
            template_name=template_name,
        )
        filename = _export_filename(cv, template_name, "tex")
        headers = {
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Type": "text/plain; charset=utf-8",
            "Access-Control-Expose-Headers": "Content-Disposition",
        }

        # Log API call (best-effort)
        try:
            log_api_call(
                db=db,
                user=current_user,
                endpoint=f"/api/cvs/{cv_id}/export/latex",
                method="GET",
                status_code=200,
                request_data={"template": template},
                response_data={
                    "filename": filename,
                    "size": len(tex_source.encode("utf-8")),
                },
            )
        except Exception:
            pass

        return Response(
            content=tex_source, media_type="text/plain; charset=utf-8", headers=headers
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate LaTeX: {str(e)}",
        )


@router.get("/{cv_id}/export/pdf/public")
async def export_cv_pdf_public(
    cv_id: str,
    request: Request,
    token: str = Query(
        ..., description="Clerk JWT token for auth when opening in new tab"
    ),
    db: Session = Depends(get_db),
):
    """Export CV as PDF via LaTeX (pdflatex) for direct new-tab viewing.

    This endpoint allows opening the PDF directly in a new tab (so the browser
    honors Content-Disposition filename) by accepting a Clerk JWT token via
    query string. The token is verified server-side to authenticate the user.
    """
    # Verify token and resolve user id
    payload = verify_clerk_token(token)
    if not payload or not payload.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized"
        )

    clerk_user_id = str(payload.get("sub"))

    # Sync Clerk user to local database to get local user ID
    from src.services.clerk_sync_service import sync_clerk_user_to_local_db

    local_user = sync_clerk_user_to_local_db(clerk_user_id, payload.get("email", ""), db)
    user_id = str(local_user.id)

    # Fetch CV and verify ownership
    cv = get_cv_by_id(db, cv_id, user_id)
    if not cv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")

    default_template = _resolve_export_template(None)
    logger.info(
        f"User {local_user.email} exporting CV {cv_id} ({cv.original_filename}) as PDF via public endpoint"
    )
    try:
        log_user_activity(
            db=db,
            user=local_user,
            activity_type="user_action",
            action="export_cv_pdf_public",
            description=f"Exported CV '{cv.original_filename}' as PDF via public endpoint",
            details={
                "cv_id": cv_id,
                "cv_filename": cv.original_filename,
                "template_name": default_template,
                "export_type": "pdf",
                "endpoint_type": "public",
            },
        )
    except Exception as e:
        logger.warning(f"Failed to log user activity for public PDF export: {str(e)}")

    if not is_latex_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="LaTeX toolchain (pdflatex) not available on server",
        )

    try:
        tex_source = generate_cv_latex(
            cv.parsed_data or {},
            cv.original_filename or "My CV",
            template_name=default_template,
        )
        pdf_bytes = compile_pdf_from_latex(tex_source)
        filename = _export_filename(cv, default_template, "pdf")

        headers = {
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Type": "application/pdf",
            "Access-Control-Expose-Headers": "Content-Disposition",
        }

        # Log successful API call
        try:
            log_api_call(
                db=db,
                user=local_user,
                endpoint=f"/api/cvs/{cv_id}/export/pdf/public",
                method="GET",
                status_code=200,
                request_data={"token": "***"},
                response_data={"filename": filename, "file_size": len(pdf_bytes)},
            )
        except Exception as e:
            logger.warning(f"Failed to log API call for public PDF export: {str(e)}")

        return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate PDF: {str(e)}",
        )
