"""
CV Preview Service - Generate Low-Quality CV Preview Images

This module provides functionality to generate low-quality preview images
from parsed CV data for the Quick Start wizard. It reuses the existing
LaTeX-to-PDF pipeline and converts the first page to a thumbnail image.

Key responsibilities:
- Generate LaTeX from parsed CV data using existing service
- Compile LaTeX to PDF using existing compilation service
- Convert PDF first page to low-quality PNG thumbnail
- Return base64-encoded image for frontend display
- Handle errors gracefully with fallback options

Usage context:
- Used by Quick Start preview endpoint for unauthenticated users
- Generates small preview images to show CV layout without full export
- Maintains consistency with actual CV export appearance
"""

import base64
import io
import logging
from typing import Dict, Any
from PIL import Image

from src.services.platform.file_service import get_profile_picture_settings
from src.services.cv.latex_export_service import (
    generate_cv_latex,
    compile_pdf_from_latex,
    is_latex_available,
)
from src.services.shared.template_loader import (
    get_default_template,
    is_template_available,
)

logger = logging.getLogger(__name__)

# Configure PIL to handle large images safely
Image.MAX_IMAGE_PIXELS = 200_000_000  # 200 megapixels limit

# Try to import PDF-to-image conversion libraries
try:
    import fitz  # PyMuPDF

    PYMUPDF_AVAILABLE = True
except ImportError:
    PYMUPDF_AVAILABLE = False

try:
    from pdf2image import convert_from_bytes

    PDF2IMAGE_AVAILABLE = True
except ImportError:
    PDF2IMAGE_AVAILABLE = False

try:
    from PIL import Image

    PILLOW_AVAILABLE = True
except ImportError:
    PILLOW_AVAILABLE = False


def _convert_pdf_to_image_pymupdf(pdf_bytes: bytes, max_width: int = 300) -> str:
    """Convert PDF to PNG using PyMuPDF (fitz)."""
    if not PYMUPDF_AVAILABLE:
        raise ImportError("PyMuPDF not available")

    # Open PDF document
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")

    if len(doc) == 0:
        raise ValueError("PDF has no pages")

    # Get first page
    page = doc[0]

    # Calculate scale factor for ultra-high resolution
    page_rect = page.rect
    scale_factor = max_width / page_rect.width

    # Use high resolution matrix for crisp text
    # Scale by 4x for high quality, then resize down
    high_res_scale = scale_factor * 4
    mat = fitz.Matrix(high_res_scale, high_res_scale)

    # Render page to pixmap
    pix = page.get_pixmap(matrix=mat)

    # Convert to PIL Image
    img_data = pix.tobytes("png")
    img = Image.open(io.BytesIO(img_data))

    # Resize to target width for consistent output with ultra-high quality
    if img.width != max_width:
        aspect_ratio = img.height / img.width
        new_height = int(max_width * aspect_ratio)
        img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)

    # Close document
    doc.close()

    # Convert to base64
    buffer = io.BytesIO()
    img.save(buffer, format="PNG", optimize=True, quality=95)
    buffer.seek(0)

    return base64.b64encode(buffer.getvalue()).decode("utf-8")


def _convert_pdf_to_image_pdf2image(pdf_bytes: bytes, max_width: int = 300) -> str:
    """Convert PDF to PNG using pdf2image."""
    if not PDF2IMAGE_AVAILABLE or not PILLOW_AVAILABLE:
        raise ImportError("pdf2image or Pillow not available")

    # Convert PDF to images (first page only) at high resolution
    images = convert_from_bytes(
        pdf_bytes,
        first_page=1,
        last_page=1,
        dpi=600,  # High DPI for crisp text
        fmt="PNG",
    )

    if not images:
        raise ValueError("No pages found in PDF")

    img = images[0]

    # Always resize to target width for consistent output
    if img.width != max_width:
        aspect_ratio = img.height / img.width
        new_height = int(max_width * aspect_ratio)
        img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)

    # Convert to base64
    buffer = io.BytesIO()
    img.save(buffer, format="PNG", optimize=True, quality=95)
    buffer.seek(0)

    return base64.b64encode(buffer.getvalue()).decode("utf-8")


def convert_pdf_to_preview_image(pdf_bytes: bytes, max_width: int = 300) -> str:
    """
    Convert PDF first page to base64 PNG image.

    Reusable function that can work with any PDF bytes.
    Extracted for use by both Quick Start and Upload Preview.

    Args:
        pdf_bytes: Raw PDF file bytes
        max_width: Target image width in pixels (default: 300)

    Returns:
        Base64-encoded PNG image string

    Raises:
        RuntimeError: If no PDF conversion library is available
        ValueError: If PDF has no pages or is invalid
    """
    # Check if any image conversion library is available
    if not (PYMUPDF_AVAILABLE or PDF2IMAGE_AVAILABLE):
        raise RuntimeError(
            "No PDF-to-image conversion library available (PyMuPDF or pdf2image)"
        )

    # Try PyMuPDF first (faster), then pdf2image
    if PYMUPDF_AVAILABLE:
        try:
            return _convert_pdf_to_image_pymupdf(pdf_bytes, max_width)
        except Exception as e:
            logger.warning(f"PyMuPDF conversion failed: {e}, trying pdf2image")

    if PDF2IMAGE_AVAILABLE:
        return _convert_pdf_to_image_pdf2image(pdf_bytes, max_width)

    raise RuntimeError("No working PDF-to-image conversion method available")


async def generate_cv_preview_image(
    parsed_cv_data: Dict[str, Any], max_width: int = 1000, title: str = "CV Preview"
) -> str:
    """
    Generate a low-quality preview image from parsed CV data.

    Args:
        parsed_cv_data: Parsed CV data from AI service
        max_width: Maximum width of the preview image in pixels
        title: Title for the CV document

    Returns:
        Base64-encoded PNG image string

    Raises:
        RuntimeError: If LaTeX is not available or image conversion fails
        ImportError: If required image conversion libraries are not available
    """
    # Check if LaTeX is available
    if not is_latex_available():
        raise RuntimeError("LaTeX (pdflatex) is not available on the server")

    # Resolve template: default from config, else "standard" if available
    template_name = get_default_template()
    if not template_name or not is_template_available(template_name):
        template_name = "standard" if is_template_available("standard") else None
    if not template_name:
        raise RuntimeError("No LaTeX template available for preview")

    profile_pic_path, profile_pic_shape, profile_pic_size = get_profile_picture_settings(
        parsed_cv_data
    )

    try:
        # Generate LaTeX from parsed data
        logger.info("Generating LaTeX from CV data for preview")
        latex_source = generate_cv_latex(
            parsed_cv_data,
            title,
            template_name,
            profile_pic_path=profile_pic_path,
            profile_pic_shape=profile_pic_shape,
            profile_pic_size=profile_pic_size,
        )

        # Compile LaTeX to PDF
        logger.info("Compiling LaTeX to PDF for preview")
        pdf_bytes = compile_pdf_from_latex(
            latex_source, profile_pic_path=profile_pic_path
        )

        # Convert PDF to image using extracted function
        logger.info("Converting PDF to preview image")
        return convert_pdf_to_preview_image(pdf_bytes, max_width)

    except Exception as e:
        logger.error(f"Failed to generate CV preview image: {str(e)}")
        raise RuntimeError(f"Failed to generate CV preview image: {str(e)}")


def is_preview_generation_available() -> bool:
    """
    Check if CV preview generation is available.

    Returns:
        True if both LaTeX and at least one image conversion library are available
    """
    return (
        is_latex_available()
        and (PYMUPDF_AVAILABLE or PDF2IMAGE_AVAILABLE)
        and PILLOW_AVAILABLE
    )
