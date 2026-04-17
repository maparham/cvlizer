"""
Preview Generation Service - Generate blurred preview images from PDFs

This module provides functionality to convert PDF documents to blurred PNG images
for template previews in the export gallery.

Key responsibilities:
- Convert PDF to image using pdf2image or similar
- Apply Gaussian blur for preview effect
- Manage temporary files during conversion
- Provide both blurred and full-resolution previews

Dependencies:
- pdf2image library with poppler-utils
- PIL/Pillow for image processing
"""

from __future__ import annotations

import logging
import shutil
import tempfile
from pathlib import Path
from typing import Optional

try:
    from pdf2image import convert_from_path
    from PIL import Image, ImageFilter, ImageDraw, ImageFont

    PDF_TO_IMAGE_AVAILABLE = True
except ImportError:
    PDF_TO_IMAGE_AVAILABLE = False

logger = logging.getLogger(__name__)


def is_preview_available() -> bool:
    """Check if PDF to image conversion is available."""
    # pdf2image import alone is insufficient; poppler binaries are required at runtime.
    poppler_available = shutil.which("pdftoppm") is not None
    if PDF_TO_IMAGE_AVAILABLE and not poppler_available:
        logger.warning(
            "Preview conversion disabled: pdftoppm binary not found at runtime"
        )
    return PDF_TO_IMAGE_AVAILABLE and poppler_available


def add_corner_watermark(image: Image.Image, text: str = "PREVIEW") -> Image.Image:
    """Add a large diagonal watermark covering the entire content area.

    Args:
        image: PIL Image object
        text: Watermark text (default: "PREVIEW")

    Returns:
        Image with watermark applied
    """
    # Create a copy to avoid modifying original
    watermarked = image.copy()
    width, height = watermarked.size

    # Convert to RGBA if needed
    if watermarked.mode != "RGBA":
        watermarked = watermarked.convert("RGBA")

    # Create a transparent overlay
    overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # Use a large font size - scale to cover most of the diagonal
    # Calculate the diagonal length
    diagonal = int((width**2 + height**2) ** 0.5)

    # Font size should be about 15% of the diagonal
    font_size = int(diagonal * 0.15)

    # Try to use a nice font, fall back to default if not available
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", font_size)
    except (OSError, IOError):
        try:
            font = ImageFont.truetype("Arial.ttf", font_size)
        except (OSError, IOError):
            # Use default font if no truetype fonts available
            font = ImageFont.load_default()

    # Calculate text bounding box
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]

    # Create a temporary image for the text (larger to accommodate rotation)
    temp_size = int(diagonal * 1.5)
    temp_img = Image.new("RGBA", (temp_size, temp_size), (0, 0, 0, 0))
    temp_draw = ImageDraw.Draw(temp_img)

    # Draw text in the center of the temporary image with semi-transparent gray
    text_x = (temp_size - text_width) // 2
    text_y = (temp_size - text_height) // 2
    temp_draw.text(
        (text_x, text_y),
        text,
        fill=(128, 128, 128, 100),  # Gray with transparency
        font=font,
    )

    # Rotate the temporary image 45 degrees (counter-clockwise)
    rotated = temp_img.rotate(45, expand=False)

    # Calculate position to paste the rotated watermark (centered)
    paste_x = (width - rotated.width) // 2
    paste_y = (height - rotated.height) // 2

    # Paste the rotated watermark onto the overlay
    overlay.paste(rotated, (paste_x, paste_y), rotated)

    # Composite the watermark onto the image
    watermarked = Image.alpha_composite(watermarked, overlay)

    # Convert back to RGB for PNG export
    rgb_image = Image.new("RGB", watermarked.size, (255, 255, 255))
    rgb_image.paste(watermarked, mask=watermarked.split()[3])  # Use alpha channel as mask

    return rgb_image


def generate_blurred_preview(
    pdf_bytes: bytes, blur_radius: int = 2
) -> Optional[list[bytes]]:
    """Generate blurred PNG previews from PDF bytes (all pages).

    Args:
        pdf_bytes: PDF document as bytes
        blur_radius: Radius of Gaussian blur (default: 2)

    Returns:
        List of PNG image bytes (one per page, blurred), or None if conversion failed

    Raises:
        RuntimeError: If pdf2image or PIL not available
    """
    if not PDF_TO_IMAGE_AVAILABLE:
        raise RuntimeError("pdf2image or PIL not available - cannot generate previews")

    with tempfile.TemporaryDirectory() as tmpdir:
        # Save PDF to temp file
        pdf_path = Path(tmpdir) / "temp.pdf"
        pdf_path.write_bytes(pdf_bytes)
        # Convert ALL pages to images
        try:
            images = convert_from_path(str(pdf_path), dpi=100)

            if not images:
                logger.warning(
                    "PDF to image conversion returned no pages for preview generation"
                )
                return None

            # Process each page
            result_pages = []
            for i, image in enumerate(images):
                # Apply Gaussian blur if specified
                if blur_radius > 0:
                    processed_image = image.filter(
                        ImageFilter.GaussianBlur(radius=blur_radius)
                    )
                else:
                    processed_image = image

                # Add watermark
                watermarked_image = add_corner_watermark(processed_image, text="PREVIEW")

                # Convert to PNG bytes
                from io import BytesIO

                output = BytesIO()
                watermarked_image.save(output, format="PNG")
                result_bytes = output.getvalue()
                result_pages.append(result_bytes)
            return result_pages
        except Exception as e:
            # Log error but return None to gracefully handle failures.
            # Use exc_info to preserve stack traces in Cloudflare/worker logs.
            logger.error(
                "Error generating blurred preview pages from PDF conversion: %s",
                str(e),
                exc_info=True,
            )
            return None


def generate_full_preview(pdf_bytes: bytes) -> Optional[bytes]:
    """Generate a full-resolution PNG preview from PDF bytes (no blur).

    Args:
        pdf_bytes: PDF document as bytes

    Returns:
        PNG image bytes (full resolution), or None if conversion failed

    Raises:
        RuntimeError: If pdf2image or PIL not available
    """
    if not PDF_TO_IMAGE_AVAILABLE:
        raise RuntimeError("pdf2image or PIL not available - cannot generate previews")

    with tempfile.TemporaryDirectory() as tmpdir:
        # Save PDF to temp file
        pdf_path = Path(tmpdir) / "temp.pdf"
        pdf_path.write_bytes(pdf_bytes)

        # Convert first page to image
        try:
            images = convert_from_path(str(pdf_path), dpi=300, first_page=1, last_page=1)
            if not images:
                return None

            image = images[0]

            # Convert to PNG bytes without blur
            from io import BytesIO

            output = BytesIO()
            image.save(output, format="PNG")

            return output.getvalue()
        except Exception as e:
            # Log error but return None to gracefully handle failures
            logger.error(f"Error generating preview: {str(e)}")
            return None
