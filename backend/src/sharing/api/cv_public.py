"""
Unauthenticated public CV share endpoints (JSON, profile image, PDF).
"""

import os

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session

from src.models.base import get_db
from src.services.cv.cv_export_naming import (
    export_filename_for_cv,
    resolve_export_template,
)
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
from src.sharing.api.share_limiter import limiter
from src.sharing.schemas import PublicCVResponse
from src.sharing.share_service import get_cv_by_share_token, log_share_view
from src.utils.datetime_utils import format_datetime_utc_iso

router = APIRouter()


@router.get("/public/cv/{token}", response_model=PublicCVResponse)
@limiter.limit("100/hour")
async def get_public_cv(token: str, request: Request, db: Session = Depends(get_db)):
    cv = get_cv_by_share_token(db, token)
    if not cv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")

    log_share_view(db, "cv", str(cv.id), request)

    parsed_data = cv.parsed_data
    if parsed_data and isinstance(parsed_data, dict):
        # Omit internal validation flags from the public payload (not useful for
        # viewers; avoids leaking validation error text in the share JSON).
        parsed_data = {
            k: v
            for k, v in parsed_data.items()
            if k not in ["is_valid_cv", "validation_error"]
        }

    return PublicCVResponse(
        id=str(cv.id),
        original_filename=cv.original_filename,
        parsed_data=parsed_data,
        created_at=format_datetime_utc_iso(cv.created_at),
        updated_at=format_datetime_utc_iso(cv.updated_at),
        view_mode=(cv.public_share_view_mode or "shell"),
    )


@router.get("/public/cv/{token}/profile-picture")
@limiter.limit("100/hour")
async def get_public_cv_profile_picture(
    token: str, request: Request, db: Session = Depends(get_db)
):
    """
    Stream the CV profile image for visitors with a valid share token.
    Same trust boundary as GET /public/cv/{token}; returns 404 when unavailable.

    View analytics are recorded on GET /public/cv/{token} only so one page load
    does not multiply counts (image/PDF sub-requests).
    """
    cv = get_cv_by_share_token(db, token)
    if not cv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")

    profile_pic_path, _, _ = get_profile_picture_settings(cv.parsed_data)
    if not profile_pic_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile picture not found",
        )

    ext = os.path.splitext(profile_pic_path)[1].lower()
    media_type = "image/jpeg" if ext in (".jpg", ".jpeg") else "image/png"
    return FileResponse(profile_pic_path, media_type=media_type)


@router.get("/public/cv/{token}/pdf")
@limiter.limit("100/hour")
async def download_public_cv_pdf(
    token: str, request: Request, db: Session = Depends(get_db)
):
    cv = get_cv_by_share_token(db, token)
    if not cv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")

    template_name = resolve_export_template(cv.export_template_name)
    profile_pic_path, profile_pic_shape, profile_pic_size = get_profile_picture_settings(
        cv.parsed_data
    )

    try:
        if should_use_pdf_service():
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
    filename = export_filename_for_cv(cv, "pdf")

    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"',
        "Content-Type": "application/pdf",
        "Access-Control-Expose-Headers": "Content-Disposition",
    }
    return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)
