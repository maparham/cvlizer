"""
CV Export API Endpoints

This module handles PDF and LaTeX export functionality for CVs.
"""

import re
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from src.middleware.clerk_auth import get_effective_user_lightweight, verify_clerk_token
from src.models.base import get_db
from src.models.user import User
from src.services.cv.cv_export_naming import (
    export_filename_for_cv,
    resolve_export_template,
)
from src.services.cv.cv_service import get_cv_by_id, update_cv_export_template
from src.services.platform.file_service import get_profile_picture_settings
from src.services.cv.latex_export_service import (
    compile_pdf_from_latex,
    generate_cv_latex,
    is_latex_available,
)
from src.services.cv.pdf_service_client import (
    PDFServiceError,
    generate_pdf_via_service,
    should_use_pdf_service,
)
from src.services.job_descriptions.job_description_service import (
    get_cv_ids_for_job_description,
    get_job_description_owned_by,
)
from src.services.shared.template_loader import is_template_available
from src.services.users.user_activity_service import (
    safe_log_api_call,
    safe_log_user_activity,
)

from .common import logger
from .models import CVExportTemplatePatchRequest, CVResponse
from .responses import build_cv_response

router = APIRouter()


def _employer_suffix_for_filename(
    db: Session, user_id: str, cv_id: str, job_description_id: Optional[str]
) -> Optional[str]:
    """Resolve a safe employer suffix when selected job belongs to this CV/user."""
    if not job_description_id:
        return None

    jd = get_job_description_owned_by(db, job_description_id, user_id)
    if not jd:
        return None

    is_direct_cv_match = str(jd.cv_id or "") == cv_id
    if not is_direct_cv_match:
        associated_cv_ids = get_cv_ids_for_job_description(
            db, job_description_id, user_id
        )
        if cv_id not in associated_cv_ids:
            return None

    employer = str(jd.company or "").strip()
    if not employer:
        return None

    safe = re.sub(r"[^A-Za-z0-9_\-\s]+", " ", employer).strip()
    safe = re.sub(r"[\s\-]+", "_", safe).strip("_")
    return safe or None


@router.patch("/{cv_id}/export-template", response_model=CVResponse)
async def patch_cv_export_template(
    cv_id: str,
    body: CVExportTemplatePatchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user_lightweight),
):
    """
    Set or clear the per-CV LaTeX template used for export (including public share PDF).
    """
    raw = body.template_name
    if raw is None:
        stored: Optional[str] = None
    else:
        stripped = raw.strip()
        if not stripped:
            stored = None
        elif not is_template_available(stripped):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unknown or unavailable template name",
            )
        else:
            stored = stripped

    cv = update_cv_export_template(db, cv_id, str(current_user.id), stored)
    if not cv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")
    safe_log_user_activity(
        db=db,
        user=current_user,
        activity_type="user_action",
        action="cv_export_template_patch",
        description="Updated CV export LaTeX template setting",
        details={
            "cv_id": cv_id,
            "template_name": stored,
            "cleared": stored is None,
        },
    )
    return build_cv_response(cv)


@router.get("/{cv_id}/export/pdf")
async def export_cv_pdf(
    cv_id: str,
    job_description_id: Optional[str] = Query(
        None,
        description="Optional selected job description ID for filename employer suffix",
    ),
    request: Request = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user_lightweight),
):
    """Export CV as PDF via LaTeX (pdflatex).

    Template comes from the CV's stored export_template_name (PATCH export-template);
    filename uses employer suffix when available.
    """
    cv = get_cv_by_id(db, cv_id, str(current_user.id))
    if not cv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")

    template_name = resolve_export_template(cv.export_template_name)
    logger.info(
        f"User {current_user.email} exporting CV {cv_id} ({cv.original_filename}) as PDF with template '{template_name}'"
    )
    safe_log_user_activity(
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

    use_pdf_service = should_use_pdf_service()
    profile_pic_path, profile_pic_shape, profile_pic_size = get_profile_picture_settings(
        cv.parsed_data
    )
    try:
        if use_pdf_service:
            pdf_bytes = await generate_pdf_via_service(
                cv_data=cv.parsed_data or {},
                cv_filename=cv.original_filename or "My CV",
                template_name=template_name,
                profile_pic_path=profile_pic_path,
                profile_pic_shape=profile_pic_shape,
                profile_pic_size=profile_pic_size,
            )
        else:
            if not is_latex_available():
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="LaTeX toolchain (pdflatex) not available on server",
                )

            tex_source = generate_cv_latex(
                cv.parsed_data or {},
                cv.original_filename or "My CV",
                template_name=template_name,
                profile_pic_path=profile_pic_path,
                profile_pic_shape=profile_pic_shape,
                profile_pic_size=profile_pic_size,
            )
            pdf_bytes = compile_pdf_from_latex(
                tex_source, profile_pic_path=profile_pic_path
            )
        employer_suffix = _employer_suffix_for_filename(
            db, str(current_user.id), cv_id, job_description_id
        )
        filename = export_filename_for_cv(cv, "pdf", employer_suffix)

        headers = {
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Type": "application/pdf",
            "Access-Control-Expose-Headers": "Content-Disposition",
        }

        safe_log_api_call(
            db=db,
            user=current_user,
            endpoint=f"/api/cvs/{cv_id}/export/pdf",
            method="GET",
            status_code=200,
            request_data={
                "export_template_name": cv.export_template_name,
            },
            response_data={"filename": filename, "file_size": len(pdf_bytes)},
        )

        return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)
    except PDFServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"PDF service unavailable: {str(e)}",
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate PDF: {str(e)}",
        )


@router.get("/{cv_id}/export/latex")
async def export_cv_latex(
    cv_id: str,
    job_description_id: Optional[str] = Query(
        None,
        description="Optional selected job description ID for filename employer suffix",
    ),
    request: Request = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user_lightweight),
):
    """Export CV as raw LaTeX source using the CV's stored export template.

    Template comes from export_template_name; filename uses employer suffix when available.
    """
    cv = get_cv_by_id(db, cv_id, str(current_user.id))
    if not cv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")

    profile_pic_path, profile_pic_shape, profile_pic_size = get_profile_picture_settings(
        cv.parsed_data
    )
    try:
        template_name = resolve_export_template(cv.export_template_name)
        tex_source = generate_cv_latex(
            cv.parsed_data or {},
            cv.original_filename or "My CV",
            template_name=template_name,
            profile_pic_path=profile_pic_path,
            profile_pic_shape=profile_pic_shape,
            profile_pic_size=profile_pic_size,
        )
        employer_suffix = _employer_suffix_for_filename(
            db, str(current_user.id), cv_id, job_description_id
        )
        filename = export_filename_for_cv(cv, "tex", employer_suffix)
        headers = {
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Type": "text/plain; charset=utf-8",
            "Access-Control-Expose-Headers": "Content-Disposition",
        }

        safe_log_user_activity(
            db=db,
            user=current_user,
            activity_type="user_action",
            action="export_cv_latex",
            description=f"Exported CV '{cv.original_filename}' as LaTeX with template '{template_name}'",
            details={
                "cv_id": cv_id,
                "cv_filename": cv.original_filename,
                "template_name": template_name,
                "export_type": "latex",
            },
        )
        safe_log_api_call(
            db=db,
            user=current_user,
            endpoint=f"/api/cvs/{cv_id}/export/latex",
            method="GET",
            status_code=200,
            request_data={
                "export_template_name": cv.export_template_name,
            },
            response_data={
                "filename": filename,
                "size": len(tex_source.encode("utf-8")),
            },
        )

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
    job_description_id: Optional[str] = Query(
        None,
        description="Optional selected job description ID for filename employer suffix",
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
    from src.services.users.clerk_sync_service import sync_clerk_user_to_local_db

    local_user = sync_clerk_user_to_local_db(clerk_user_id, payload.get("email", ""), db)
    user_id = str(local_user.id)

    # Fetch CV and verify ownership
    cv = get_cv_by_id(db, cv_id, user_id)
    if not cv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")

    # Per-CV stored template when set; else server default (same as share-token PDF).
    template_name = resolve_export_template(cv.export_template_name)
    logger.info(
        f"User {local_user.email} exporting CV {cv_id} ({cv.original_filename}) as PDF via public endpoint"
    )
    safe_log_user_activity(
        db=db,
        user=local_user,
        activity_type="user_action",
        action="export_cv_pdf_public",
        description=f"Exported CV '{cv.original_filename}' as PDF via public endpoint",
        details={
            "cv_id": cv_id,
            "cv_filename": cv.original_filename,
            "template_name": template_name,
            "export_type": "pdf",
            "endpoint_type": "public",
        },
    )

    use_pdf_service = should_use_pdf_service()
    profile_pic_path, profile_pic_shape, profile_pic_size = get_profile_picture_settings(
        cv.parsed_data
    )

    try:
        if use_pdf_service:
            pdf_bytes = await generate_pdf_via_service(
                cv_data=cv.parsed_data or {},
                cv_filename=cv.original_filename or "My CV",
                template_name=template_name,
                profile_pic_path=profile_pic_path,
                profile_pic_shape=profile_pic_shape,
                profile_pic_size=profile_pic_size,
            )
        else:
            if not is_latex_available():
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="LaTeX toolchain (pdflatex) not available on server",
                )

            tex_source = generate_cv_latex(
                cv.parsed_data or {},
                cv.original_filename or "My CV",
                template_name=template_name,
                profile_pic_path=profile_pic_path,
                profile_pic_shape=profile_pic_shape,
                profile_pic_size=profile_pic_size,
            )
            pdf_bytes = compile_pdf_from_latex(
                tex_source, profile_pic_path=profile_pic_path
            )
        employer_suffix = _employer_suffix_for_filename(
            db, str(local_user.id), cv_id, job_description_id
        )
        filename = export_filename_for_cv(cv, "pdf", employer_suffix)

        headers = {
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Type": "application/pdf",
            "Access-Control-Expose-Headers": "Content-Disposition",
        }

        safe_log_api_call(
            db=db,
            user=local_user,
            endpoint=f"/api/cvs/{cv_id}/export/pdf/public",
            method="GET",
            status_code=200,
            request_data={"token": "***"},
            response_data={"filename": filename, "file_size": len(pdf_bytes)},
        )

        return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)
    except PDFServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"PDF service unavailable: {str(e)}",
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate PDF: {str(e)}",
        )
