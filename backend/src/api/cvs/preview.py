"""
CV Preview Generation API Endpoints

This module handles async preview generation for CV templates.
Job state is stored in the database and preview bytes on disk so all HTTP
workers share the same preview jobs.
"""

from datetime import datetime, timedelta, timezone

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    Request,
    status,
)
from fastapi.responses import Response
from sqlalchemy.orm import Session

from src.config import PreviewJobConfig
from src.middleware.clerk_auth import get_effective_user_lightweight
from src.models.base import SessionLocal, get_db
from src.models.preview_job import PreviewJob
from src.models.user import User
from src.services.cv.cv_service import get_cv_by_id
from src.services.platform.file_service import get_profile_picture_settings
from src.services.cv.latex_export_service import (
    compile_pdf_from_latex,
    is_latex_available,
)
from src.services.cv.latex_export_service import generate_cv_latex
from src.services.platform.preview_service import (
    generate_blurred_preview,
    is_preview_available,
)
from src.services.shared.template_loader import is_template_available
from src.utils.background_tasks import executor
from src.utils.preview_storage import (
    delete_preview_files,
    read_preview_page,
    read_preview_pdf_fallback,
    write_preview_pages,
    write_preview_pdf_fallback,
)

from .common import logger

router = APIRouter()


def _fail_preview_job(job_id: str, error: str) -> None:
    db = SessionLocal()
    try:
        job = db.query(PreviewJob).filter(PreviewJob.job_id == job_id).first()
        if job:
            job.status = "failed"
            job.error = error
            db.commit()
    finally:
        db.close()


def _complete_preview_images(job_id: str, page_count: int) -> None:
    db = SessionLocal()
    try:
        job = db.query(PreviewJob).filter(PreviewJob.job_id == job_id).first()
        if not job:
            raise RuntimeError("Preview job not found for completion")
        job.status = "completed"
        job.page_count = page_count
        job.has_pdf_fallback = False
        job.error = None
        db.commit()
    finally:
        db.close()


def _complete_preview_pdf(job_id: str) -> None:
    db = SessionLocal()
    try:
        job = db.query(PreviewJob).filter(PreviewJob.job_id == job_id).first()
        if not job:
            raise RuntimeError("Preview job not found for completion")
        job.status = "completed"
        job.page_count = 1
        job.has_pdf_fallback = True
        job.error = None
        db.commit()
    finally:
        db.close()


def generate_preview_sync(cv_id: str, template_name: str, user_id: str) -> None:
    """Synchronous preview generation function to run in thread pool."""
    job_id = f"{cv_id}_{template_name}"

    try:
        db = SessionLocal()
        try:
            job = db.query(PreviewJob).filter(PreviewJob.job_id == job_id).first()
            if not job or str(job.user_id) != user_id:
                logger.error(
                    "Preview job %s missing or user mismatch for %s", job_id, user_id
                )
                return
            job.status = "processing"
            db.commit()
        finally:
            db.close()

        db = SessionLocal()
        try:
            cv = get_cv_by_id(db, cv_id, user_id)
        finally:
            db.close()

        if not cv:
            logger.error("CV %s not found for user %s", cv_id, user_id)
            _fail_preview_job(job_id, "CV not found")
            return

        (
            profile_pic_path,
            profile_pic_shape,
            profile_pic_size,
        ) = get_profile_picture_settings(cv.parsed_data)

        tex_source = generate_cv_latex(
            cv.parsed_data or {},
            cv.original_filename or "My CV",
            template_name=template_name,
            profile_pic_path=profile_pic_path,
            profile_pic_shape=profile_pic_shape,
            profile_pic_size=profile_pic_size,
        )

        pdf_bytes = compile_pdf_from_latex(tex_source, profile_pic_path=profile_pic_path)

        if is_preview_available():
            preview_pages = generate_blurred_preview(pdf_bytes, blur_radius=0)
            if preview_pages:
                write_preview_pages(job_id, preview_pages)
                _complete_preview_images(job_id, len(preview_pages))
            else:
                logger.error("Failed to generate blurred preview - returned None")
                _fail_preview_job(job_id, "Failed to generate preview")
        else:
            logger.warning("Preview service not available, falling back to PDF")
            write_preview_pdf_fallback(job_id, pdf_bytes)
            _complete_preview_pdf(job_id)
    except Exception as e:
        logger.error(
            "Preview generation failed for CV %s template %s: %s",
            cv_id,
            template_name,
            str(e),
            exc_info=True,
        )
        # Remove any preview files written before the failure so disk matches DB.
        delete_preview_files(job_id)
        _fail_preview_job(job_id, str(e))


@router.post("/{cv_id}/export/preview/start")
async def start_preview_generation(
    cv_id: str,
    template: str = Query(..., description="Template name"),
    request: Request = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user_lightweight),
):
    """Start async preview generation for a template."""

    cv = get_cv_by_id(db, cv_id, str(current_user.id))
    if not cv:
        logger.error("CV %s not found for user %s", cv_id, current_user.id)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")

    if not is_template_available(template):
        logger.error("Template %s not found", template)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Template not found"
        )

    job_id = f"{cv_id}_{template}"

    if not is_latex_available():
        logger.error("LaTeX toolchain not available")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="LaTeX toolchain not available",
        )

    existing = db.query(PreviewJob).filter(PreviewJob.job_id == job_id).first()
    if existing:
        delete_preview_files(job_id)
        db.delete(existing)
        db.commit()

    expires_at = datetime.now(timezone.utc) + timedelta(hours=PreviewJobConfig.TTL_HOURS)
    row = PreviewJob(
        job_id=job_id,
        cv_id=cv_id,
        user_id=str(current_user.id),
        template_name=template,
        status="pending",
        expires_at=expires_at,
    )
    db.add(row)
    db.commit()

    executor.submit(generate_preview_sync, cv_id, template, str(current_user.id))

    return {"job_id": job_id, "status": "pending"}


@router.get("/{cv_id}/export/preview/status")
async def get_preview_status(
    cv_id: str,
    job_id: str = Query(..., description="Job ID from start endpoint"),
    request: Request = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user_lightweight),
):
    """Get status of preview generation job."""

    cv = get_cv_by_id(db, cv_id, str(current_user.id))
    if not cv:
        logger.error("CV %s not found for user %s", cv_id, current_user.id)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")

    job = db.query(PreviewJob).filter(PreviewJob.job_id == job_id).first()
    if not job or job.cv_id != cv_id:
        logger.error("Job %s not found or wrong CV", job_id)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    if str(job.user_id) != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    if job.status == "completed":
        has_preview = True
        page_count = job.page_count or 1
        return {
            "status": "completed",
            "has_preview": has_preview,
            "page_count": page_count,
        }
    if job.status == "failed":
        error = job.error or "Unknown error"
        logger.error("Job %s failed: %s", job_id, error)
        return {"status": "failed", "error": error}
    # pending or processing — client polls until completed/failed
    return {"status": "pending"}


@router.get("/{cv_id}/export/preview/image")
async def get_preview_image(
    cv_id: str,
    job_id: str = Query(..., description="Job ID from start endpoint"),
    page: int = Query(1, description="Page number (1-indexed)"),
    request: Request = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user_lightweight),
):
    """Get the blurred preview image for a completed job (specific page)."""

    cv = get_cv_by_id(db, cv_id, str(current_user.id))
    if not cv:
        logger.error("CV %s not found for user %s", cv_id, current_user.id)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")

    job = db.query(PreviewJob).filter(PreviewJob.job_id == job_id).first()
    if not job or job.cv_id != cv_id:
        logger.error("Job %s not found or wrong CV", job_id)
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    if str(job.user_id) != str(current_user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    if job.status != "completed":
        logger.error("Job %s not completed, status: %s", job_id, job.status)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Job not completed"
        )

    if job.has_pdf_fallback:
        try:
            pdf_body = read_preview_pdf_fallback(job_id)
        except OSError as e:
            logger.error("Missing preview PDF for %s: %s", job_id, e)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No preview available",
            ) from e
        return Response(content=pdf_body, media_type="application/pdf")

    page_count = job.page_count or 1
    if page < 1 or page > page_count:
        logger.error("Invalid page number %s, valid range: 1-%s", page, page_count)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid page number, must be 1-{page_count}",
        )

    try:
        body = read_preview_page(job_id, page)
    except OSError as e:
        logger.error("Missing preview file for %s page %s: %s", job_id, page, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No preview available",
        ) from e

    return Response(content=body, media_type="image/png")
