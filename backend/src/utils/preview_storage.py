"""
On-disk storage for CV export preview images and PDF fallbacks.

Files live under UPLOAD_DIR/previews/<sanitized_job_id>/.
"""

from __future__ import annotations

import logging
import os
import shutil

from src.config import FileConfig

logger = logging.getLogger(__name__)

PREVIEW_SUBDIR = "previews"


def _uploads_root() -> str:
    return os.path.abspath(FileConfig.UPLOAD_DIR)


def _sanitize_job_id_for_path(job_id: str) -> str:
    """Avoid path traversal; job_id is expected to be uuid_template."""
    return "".join(c if c.isalnum() or c in "-_" else "_" for c in job_id)


def preview_directory(job_id: str) -> str:
    """Absolute directory for this preview job's files."""
    safe = _sanitize_job_id_for_path(job_id)
    return os.path.join(_uploads_root(), PREVIEW_SUBDIR, safe)


def delete_preview_files(job_id: str) -> None:
    """Remove all on-disk files for a preview job."""
    path = preview_directory(job_id)
    if os.path.isdir(path):
        try:
            shutil.rmtree(path, ignore_errors=True)
        except OSError as e:
            logger.warning("Could not remove preview dir %s: %s", path, e)


def write_preview_pages(job_id: str, pages: list[bytes]) -> None:
    """Write PNG blobs as page_1.png, page_2.png, ..."""
    d = preview_directory(job_id)
    os.makedirs(d, exist_ok=True)
    for name in os.listdir(d):
        lower = name.lower()
        if lower.startswith("page_") and lower.endswith(".png"):
            try:
                os.remove(os.path.join(d, name))
            except OSError:
                pass
    for i, blob in enumerate(pages, start=1):
        out = os.path.join(d, f"page_{i}.png")
        with open(out, "wb") as f:
            f.write(blob)


def write_preview_pdf_fallback(job_id: str, pdf_bytes: bytes) -> None:
    """Write a single preview.pdf when PNG previews are unavailable."""
    d = preview_directory(job_id)
    os.makedirs(d, exist_ok=True)
    path = os.path.join(d, "preview.pdf")
    with open(path, "wb") as f:
        f.write(pdf_bytes)


def read_preview_page(job_id: str, page: int) -> bytes:
    """Read one PNG page (1-indexed)."""
    path = os.path.join(preview_directory(job_id), f"page_{page}.png")
    with open(path, "rb") as f:
        return f.read()


def read_preview_pdf_fallback(job_id: str) -> bytes:
    path = os.path.join(preview_directory(job_id), "preview.pdf")
    with open(path, "rb") as f:
        return f.read()
