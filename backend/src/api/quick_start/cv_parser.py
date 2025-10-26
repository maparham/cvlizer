"""
CV parsing logic for quick start preview.

This module handles CV file parsing for the quick start feature,
extracting text content, parsing with AI, and generating preview images.
"""

import asyncio
import logging
from typing import Any, Dict

from fastapi import Request, UploadFile

from src.services.cv_preview_service import (
    generate_cv_preview_image,
    is_preview_generation_available,
)
from src.services.cv_parsing_service import parse_cv_with_openai

logger = logging.getLogger(__name__)

# Timeout for AI parsing operations (in seconds)
QUICK_START_TIMEOUT = 30


async def parse_cv_for_preview(
    cv_file: UploadFile, file_content: bytes, request: Request
) -> Dict[str, Any]:
    """
    Parse CV file for quick start preview.

    Args:
        cv_file: Uploaded CV file
        file_content: File content bytes
        request: FastAPI request object for logging

    Returns:
        Dictionary containing CV preview data or error information
    """
    cv_preview: Dict[str, Any] = {}

    try:
        logger.info(
            f"Parsing CV for quick start preview: {cv_file.filename} from IP {request.client.host if request.client else 'unknown'}"
        )

        # Extract text for AI processing
        from src.services.file_service import extract_text_from_file

        try:
            text_content = extract_text_from_file(file_content, cv_file.content_type)
        except Exception as e:
            logger.warning(f"Text extraction failed, proceeding with AI: {e}")
            text_content = ""

        # Wrap CV parsing with timeout
        try:
            parsed_cv = await asyncio.wait_for(
                parse_cv_with_openai(
                    file_content, cv_file.filename, cv_file.content_type
                ),
                timeout=QUICK_START_TIMEOUT,
            )
        except asyncio.TimeoutError:
            logger.error(f"CV parsing timeout in quick start for {cv_file.filename}")
            cv_preview = {
                "error": "Parsing took too long. Please try a simpler CV or contact support.",
                "filename": cv_file.filename,
            }
            parsed_cv = {"error": "timeout"}
        except Exception as e:
            logger.error(f"CV parsing error in quick start: {str(e)}")
            logger.debug(
                f"CV parsing failed for file: {cv_file.filename if cv_file else 'unknown'}, error: {str(e)}"
            )
            cv_preview = {
                "error": f"Failed to parse CV: {str(e)}",
                "filename": cv_file.filename if cv_file else "unknown",
            }
            parsed_cv = {"error": str(e)}

        # Check for parsing errors
        if parsed_cv.get("error"):
            if parsed_cv.get("error") != "timeout":  # Don't overwrite timeout error
                logger.debug(
                    f"CV parsing failed - AI service returned error: {parsed_cv.get('error')} for file: {cv_file.filename}"
                )
                cv_preview = {
                    "error": parsed_cv["error"],
                    "filename": cv_file.filename,
                }
        else:
            # Extract key information for preview
            personal_info = parsed_cv.get("personal_info", {})
            cv_preview = {
                "filename": cv_file.filename,
                "full_name": personal_info.get("full_name", ""),
                "email": personal_info.get("email", ""),
                "phone": personal_info.get("phone", ""),
                "location": personal_info.get("location", ""),
                "section_count": sum(
                    [
                        len(parsed_cv.get("work_experience", [])),
                        len(parsed_cv.get("education", [])),
                        len(parsed_cv.get("skills", [])),
                        len(parsed_cv.get("certifications", [])),
                        len(parsed_cv.get("projects", [])),
                    ]
                ),
                "has_summary": bool(parsed_cv.get("summary")),
                "work_experience_count": len(parsed_cv.get("work_experience", [])),
                "education_count": len(parsed_cv.get("education", [])),
                # Include full parsed data for later claiming
                "full_parsed_data": parsed_cv,
            }

            # Generate preview image if possible
            if is_preview_generation_available():
                try:
                    logger.info(f"Generating CV preview image for {cv_file.filename}")
                    preview_image = await generate_cv_preview_image(
                        parsed_cv,
                        max_width=1000,  # Increased for better quality
                        title=personal_info.get("full_name", "CV Preview"),
                    )
                    cv_preview["preview_image_base64"] = preview_image
                    logger.info(
                        f"Successfully generated CV preview image for {cv_file.filename}"
                    )
                except Exception as e:
                    logger.warning(
                        f"Failed to generate CV preview image for {cv_file.filename}: {e}"
                    )
                    logger.debug(
                        f"CV preview image generation failed for file: {cv_file.filename}, error: {str(e)}"
                    )
                    # Continue without image - not critical for preview
            else:
                logger.info(
                    "CV preview image generation not available (missing dependencies)"
                )

    except Exception as e:
        logger.error(f"CV parsing error in quick start: {str(e)}")
        logger.debug(
            f"CV parsing failed for file: {cv_file.filename if cv_file else 'unknown'}, error: {str(e)}"
        )
        cv_preview = {
            "error": f"Failed to parse CV: {str(e)}",
            "filename": cv_file.filename if cv_file else "unknown",
        }

    return cv_preview
