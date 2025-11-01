"""
CV Preview Generation API Endpoints

This module handles async preview generation for CV templates.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from src.middleware.clerk_auth import get_effective_user_lightweight
from src.models.base import SessionLocal, get_db
from src.models.user import User
from src.services.cv_service import get_cv_by_id
from src.services.latex_export_service import compile_pdf_from_latex, is_latex_available
from src.services.latex_export_service import generate_cv_latex
from src.services.preview_service import generate_blurred_preview, is_preview_available
from src.services.template_loader import is_template_available

from .common import executor, get_preview_jobs, logger

router = APIRouter()


def generate_preview_sync(cv_id: str, template_name: str, user_id: str):
    """Synchronous preview generation function to run in thread pool."""
    db = SessionLocal()
    try:
        cv = get_cv_by_id(db, cv_id, user_id)
        if not cv:
            logger.error(f"CV {cv_id} not found for user {user_id}")
            _preview_jobs = get_preview_jobs()
            _preview_jobs[cv_id + "_" + template_name]["status"] = "failed"
            _preview_jobs[cv_id + "_" + template_name]["error"] = "CV not found"
            return

        # Generate LaTeX with selected template
        tex_source = generate_cv_latex(
            cv.parsed_data or {},
            cv.original_filename or "My CV",
            template_name=template_name,
        )

        # Compile LaTeX to PDF
        pdf_bytes = compile_pdf_from_latex(tex_source)

        # Generate blurred preview
        _preview_jobs = get_preview_jobs()
        if is_preview_available():
            preview_pages = generate_blurred_preview(pdf_bytes, blur_radius=0)
            if preview_pages:
                _preview_jobs[cv_id + "_" + template_name]["status"] = "completed"
                _preview_jobs[cv_id + "_" + template_name][
                    "preview_images"
                ] = preview_pages  # Store list of images
                _preview_jobs[cv_id + "_" + template_name]["page_count"] = len(
                    preview_pages
                )
            else:
                logger.error("Failed to generate blurred preview - returned None")
                _preview_jobs[cv_id + "_" + template_name]["status"] = "failed"
                _preview_jobs[cv_id + "_" + template_name][
                    "error"
                ] = "Failed to generate preview"
        else:
            logger.warning("Preview service not available, falling back to PDF")
            # Fallback: return PDF if preview service not available
            _preview_jobs[cv_id + "_" + template_name]["status"] = "completed"
            _preview_jobs[cv_id + "_" + template_name]["preview_pdf"] = pdf_bytes
    except Exception as e:
        logger.error(
            f"Preview generation failed for CV {cv_id} template {template_name}: {str(e)}",
            exc_info=True,
        )
        _preview_jobs = get_preview_jobs()
        _preview_jobs[cv_id + "_" + template_name]["status"] = "failed"
        _preview_jobs[cv_id + "_" + template_name]["error"] = str(e)
    finally:
        db.close()


@router.post("/{cv_id}/export/preview/start")
async def start_preview_generation(
    cv_id: str,
    template: str = Query(..., description="Template name"),
    request: Request = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user_lightweight),
):
    """Start async preview generation for a template."""

    # Verify CV ownership
    cv = get_cv_by_id(db, cv_id, str(current_user.id))
    if not cv:
        logger.error(f"CV {cv_id} not found for user {current_user.id}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")

    # Verify template exists
    if not is_template_available(template):
        logger.error(f"Template {template} not found")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Template not found"
        )

    # Create job ID
    job_id = f"{cv_id}_{template}"

    # Check if LaTeX is available
    if not is_latex_available():
        logger.error("LaTeX toolchain not available")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="LaTeX toolchain not available",
        )

    # Initialize job status
    _preview_jobs = get_preview_jobs()
    _preview_jobs[job_id] = {"status": "pending"}

    # Submit to thread pool
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

    # Verify CV ownership
    cv = get_cv_by_id(db, cv_id, str(current_user.id))
    if not cv:
        logger.error(f"CV {cv_id} not found for user {current_user.id}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")

    # Check job status
    _preview_jobs = get_preview_jobs()
    if job_id not in _preview_jobs:
        logger.error(f"Job {job_id} not found in _preview_jobs")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    job = _preview_jobs[job_id]

    if job["status"] == "completed":
        has_preview = "preview_images" in job or "preview_pdf" in job
        page_count = job.get("page_count", 1)
        return {
            "status": "completed",
            "has_preview": has_preview,
            "page_count": page_count,
        }
    elif job["status"] == "failed":
        error = job.get("error", "Unknown error")
        logger.error(f"Job {job_id} failed: {error}")
        return {"status": "failed", "error": error}
    else:
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

    # Verify CV ownership
    cv = get_cv_by_id(db, cv_id, str(current_user.id))
    if not cv:
        logger.error(f"CV {cv_id} not found for user {current_user.id}")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")

    # Check job status
    _preview_jobs = get_preview_jobs()
    if job_id not in _preview_jobs:
        logger.error(f"Job {job_id} not found in _preview_jobs")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    job = _preview_jobs[job_id]

    if job["status"] != "completed":
        logger.error(f"Job {job_id} not completed, status: {job['status']}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Job not completed"
        )

    # Return preview image if available
    if "preview_images" in job:
        page_count = len(job["preview_images"])
        if page < 1 or page > page_count:
            logger.error(f"Invalid page number {page}, valid range: 1-{page_count}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid page number, must be 1-{page_count}",
            )

        return Response(content=job["preview_images"][page - 1], media_type="image/png")
    elif "preview_pdf" in job:
        # Fallback to PDF if preview image not available
        return Response(content=job["preview_pdf"], media_type="application/pdf")
    else:
        logger.error(f"No preview available for job {job_id}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No preview available",
        )
