"""
File service for handling file uploads, validation, and text extraction.

This module provides functions for file validation, saving uploaded files,
text extraction from PDF and DOCX files, and file management operations.
"""

import os
import re
import unicodedata
import uuid
from io import BytesIO
from typing import Any, Dict, Optional, Tuple

import aiofiles
import docx
from fastapi import UploadFile

from src.config import FileConfig, ProfilePictureConfig
from src.constants import ERROR_EXTRACT_DOCX, ERROR_EXTRACT_PDF
from src.exceptions import ExtractionError, InvalidFileException


def _clean_extracted_text(text: str) -> str:
    """
    Clean extracted text by removing problematic characters while preserving
    all legitimate text from any language.

    Removes:
    - Unicode replacement character (U+FFFD -)
    - Control characters (except common whitespace like \n, \t, \r)
    - Zero-width characters

    Preserves:
    - All printable Unicode characters (including non-Latin scripts)
    - Common whitespace characters (\n, \t, \r, space)
    - Accented characters, emoji, and symbols used in text
    """
    # Remove Unicode replacement character (U+FFFD)
    text = text.replace("\ufffd", "")

    # Remove zero-width characters
    text = text.replace("\u200b", "")  # Zero-width space
    text = text.replace("\u200c", "")  # Zero-width non-joiner
    text = text.replace("\u200d", "")  # Zero-width joiner
    text = text.replace("\ufeff", "")  # Zero-width no-break space (BOM)

    # Remove control characters but keep common whitespace (\n, \t, \r, space)
    cleaned_chars = []
    for char in text:
        # Keep printable characters and common whitespace
        if char.isprintable() or char in "\n\t\r ":
            cleaned_chars.append(char)
        # Remove other control characters
        elif unicodedata.category(char).startswith("C"):
            continue

    return "".join(cleaned_chars)


# Compiled regex for page-number line detection (full-line match only)
_PAGE_NUMBER_PATTERNS = re.compile(
    r"^(?:\d{1,3}|page\s*\d+|\d+\s+of\s+\d+|\d+\s*/\s*\d+)$",
    re.IGNORECASE,
)


def _remove_page_number_lines(text: str) -> str:
    """
    Remove lines that look like page numbers (e.g. standalone digits, "Page N",
    "N of M", "N/M"). Only drops lines that match entirely after strip.
    Preserves paragraph breaks (\\n\\n). May rarely remove list numerals
    that are a single 1-3 digit line.
    """
    lines = text.split("\n")
    kept = [
        line
        for line in lines
        if not (line.strip() and _PAGE_NUMBER_PATTERNS.match(line.strip()))
    ]
    return "\n".join(kept)


async def validate_file(file: UploadFile) -> Tuple[bool, str]:
    """Validate uploaded file"""
    # Check file type
    if file.content_type not in FileConfig.ALLOWED_CV_TYPES:
        return (
            False,
            f"File type {file.content_type} not allowed. Allowed types: {', '.join(FileConfig.ALLOWED_CV_TYPES)}",
        )

    # Check file size by reading the file content
    try:
        # Read file content to get actual size
        content = await file.read()
        file_size = len(content)

        # Reset file pointer to beginning for subsequent reads
        await file.seek(0)

        if file_size > FileConfig.MAX_FILE_SIZE:
            return (
                False,
                f"File size {file_size} exceeds maximum allowed size of {FileConfig.MAX_FILE_SIZE} bytes",
            )
    except Exception as e:
        return False, f"Error reading file: {str(e)}"

    return True, ""


async def save_uploaded_file(
    file: UploadFile, content: Optional[bytes] = None
) -> Tuple[str, str, int]:
    """Save uploaded file to disk and return file path, filename, and size.

    If 'content' is provided, it will be written directly without reading the file again.
    """
    # Generate unique filename
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"

    # Create uploads directory if it doesn't exist
    upload_dir = "uploads"
    os.makedirs(upload_dir, exist_ok=True)

    # Full file path
    file_path = os.path.join(upload_dir, unique_filename)

    # Save file
    async with aiofiles.open(file_path, "wb") as f:
        if content is None:
            content = await file.read()
        await f.write(content)

    return file_path, unique_filename, len(content)


def delete_file(file_path: str) -> bool:
    """Delete a file from disk"""
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
            return True
        return False
    except Exception:
        return False


# ---------------------------------------------------------------------------
# Profile picture (CV personal info)
# ---------------------------------------------------------------------------

# JPEG and PNG magic bytes (partial)
_JPEG_MAGIC = (b"\xff\xd8\xff",)
_PNG_MAGIC = (b"\x89PNG\r\n\x1a\n",)


def _profile_picture_content_type_from_bytes(content: bytes) -> Optional[str]:
    """Infer image/jpeg or image/png from magic bytes; else None."""
    if not content or len(content) < 8:
        return None
    if content.startswith(_JPEG_MAGIC[0]):
        return "image/jpeg"
    if content.startswith(_PNG_MAGIC[0]):
        return "image/png"
    return None


def validate_profile_picture_content(
    content: bytes, content_type: Optional[str] = None
) -> Tuple[bool, str]:
    """
    Validate profile picture from raw bytes: type, size, and dimensions.

    Returns (True, "") if valid, else (False, error_message).
    """
    if not content:
        return False, "No image data"
    size = len(content)
    if size > ProfilePictureConfig.MAX_SIZE_BYTES:
        return (
            False,
            f"Image size {size} exceeds maximum {ProfilePictureConfig.MAX_SIZE_BYTES} bytes",
        )
    inferred = _profile_picture_content_type_from_bytes(content)
    if not inferred:
        return False, "Invalid image format; only JPG and PNG are allowed"
    if content_type and inferred != content_type:
        # Prefer magic bytes over client-provided type
        pass  # use inferred
    if inferred not in ProfilePictureConfig.ALLOWED_MIME_TYPES:
        return False, "Only JPG and PNG images are allowed"
    try:
        from PIL import Image

        img = Image.open(BytesIO(content))
        img.load()
    except Exception as e:
        return False, f"Invalid or corrupted image: {str(e)}"
    w, h = img.size
    if w < ProfilePictureConfig.MIN_WIDTH or h < ProfilePictureConfig.MIN_HEIGHT:
        return (
            False,
            f"Image dimensions {w}x{h} are below minimum "
            f"{ProfilePictureConfig.MIN_WIDTH}x{ProfilePictureConfig.MIN_HEIGHT}",
        )
    if w > ProfilePictureConfig.MAX_WIDTH or h > ProfilePictureConfig.MAX_HEIGHT:
        return (
            False,
            f"Image dimensions {w}x{h} exceed maximum "
            f"{ProfilePictureConfig.MAX_WIDTH}x{ProfilePictureConfig.MAX_HEIGHT}",
        )
    return True, ""


async def validate_profile_picture_file(file: UploadFile) -> Tuple[bool, str]:
    """
    Read uploaded file once, validate with validate_profile_picture_content,
    then reset file pointer. Use when router has not yet read the body.
    """
    try:
        content = await file.read()
        await file.seek(0)
        return validate_profile_picture_content(content, file.content_type)
    except Exception as e:
        return False, f"Error reading file: {str(e)}"


async def save_profile_picture(
    file: UploadFile, user_id: str, content: Optional[bytes] = None
) -> Tuple[str, str, int]:
    """
    Save profile picture to the dedicated directory. Returns (stored_path, filename, size).

    stored_path is relative (filename only) for storage in personal_info; resolve with
    resolve_profile_picture_path when reading or deleting.
    If content is provided, it is written without reading the file again.
    """
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ProfilePictureConfig.ALLOWED_EXTENSIONS:
        ext = ".jpg"
    unique_filename = f"{user_id}_{uuid.uuid4().hex}{ext}"
    directory = ProfilePictureConfig.directory()
    os.makedirs(directory, exist_ok=True)
    file_path = os.path.join(directory, unique_filename)
    if content is None:
        content = await file.read()
    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)
    # Store only the filename so path resolution is always under our dir
    return unique_filename, unique_filename, len(content)


def resolve_profile_picture_path(stored_path: Optional[str]) -> Optional[str]:
    """
    Resolve stored path (filename only) to absolute path. Returns None if invalid.
    Prevents path traversal; only the basename of stored_path is used.
    """
    if not stored_path or not isinstance(stored_path, str):
        return None
    base = os.path.basename(stored_path)
    if base != stored_path or ".." in base:
        return None
    return os.path.join(ProfilePictureConfig.directory(), base)


def get_profile_picture_settings(
    parsed_data: Optional[Dict[str, Any]],
) -> Tuple[Optional[str], str, str]:
    """
    Resolve profile picture path, shape, and size from CV parsed_data.

    Returns (profile_pic_path or None, profile_pic_shape, profile_pic_size).
    Path is None if no picture is set or the file does not exist on disk.
    """
    pi = (parsed_data or {}).get("personal_info") or {}
    profile_stored = pi.get("profile_picture")
    profile_pic_path = (
        resolve_profile_picture_path(profile_stored) if profile_stored else None
    )
    if profile_pic_path and not os.path.exists(profile_pic_path):
        profile_pic_path = None
    shape = pi.get("profile_picture_shape") or "circle"
    size = pi.get("profile_picture_size") or "standard"
    return (profile_pic_path, shape, size)


def _is_bold(span: dict) -> bool:
    """Check if a PDF span is bold based on flags or font name."""
    flags = span.get("flags", 0)
    if flags & 16:  # Bit 4 indicates bold in PyMuPDF
        return True
    font = span.get("font", "").lower()
    return bool(re.search(r"(?<![a-z])bold(?![a-z])", font))


def _is_italic(span: dict) -> bool:
    """Check if a PDF span is italic based on flags or font name."""
    flags = span.get("flags", 0)
    if flags & 2:  # Bit 1 indicates italic in PyMuPDF
        return True
    font = span.get("font", "").lower()
    return bool(re.search(r"(?<![a-z])(italic|oblique)(?![a-z])", font))


def _apply_markdown_formatting(text: str, is_bold: bool, is_italic: bool) -> str:
    """Wrap text in markdown formatting markers, escaping existing asterisks."""
    if not text or not text.strip():
        return text

    # Preserve leading/trailing whitespace
    leading = text[: len(text) - len(text.lstrip())]
    trailing = text[len(text.rstrip()) :]
    content = text.strip()

    if not content:
        return text

    # Escape existing asterisks to prevent markdown conflicts
    content = content.replace("*", "\\*")

    if is_bold and is_italic:
        content = f"***{content}***"
    elif is_bold:
        content = f"**{content}**"
    elif is_italic:
        content = f"*{content}*"

    return leading + content + trailing


def _merge_adjacent_formatting(text: str) -> str:
    """Clean up adjacent markdown markers that should be merged."""
    # Merge adjacent bold markers: **text1** **text2** -> **text1 text2**
    text = re.sub(r"\*\*\s*\*\*", " ", text)

    # Merge adjacent bold-italic markers: ***text1*** ***text2*** -> ***text1 text2***
    text = re.sub(r"\*\*\*\s*\*\*\*", " ", text)

    # Merge adjacent italic markers repeatedly until no more changes
    # Handles 3+ adjacent: *a* *b* *c* -> *a b c*
    italic_pattern = re.compile(r"(?<!\*)\*([^*]+)\*\s+\*([^*]+)\*(?!\*)")
    prev_text = None
    while prev_text != text:
        prev_text = text
        text = italic_pattern.sub(r"*\1 \2*", text)

    # Clean up empty formatting markers (require at least one whitespace to avoid matching **)
    text = re.sub(r"\*\*\s+\*\*", "", text)
    text = re.sub(r"(?<!\*)\*\s+\*(?!\*)", "", text)

    return text


def extract_text_from_pdf(file_content: bytes) -> str:
    """Extract text from PDF file using PyMuPDF with formatting preservation.

    Preserves bold and italic formatting as markdown markers.
    """
    try:
        # Magic sniff for PDF header
        if not file_content.startswith(b"%PDF"):
            raise InvalidFileException("Invalid PDF file signature")
        import fitz  # PyMuPDF

        with fitz.open(stream=file_content, filetype="pdf") as doc:
            result_lines = []

            for page in doc:
                # Use dict output for formatting info
                page_dict = page.get_text("dict", flags=fitz.TEXT_DEHYPHENATE)

                for block in page_dict.get("blocks", []):
                    # Skip image blocks
                    if block.get("type") != 0:
                        continue

                    block_lines = []
                    for line in block.get("lines", []):
                        line_parts = []
                        for span in line.get("spans", []):
                            text = span.get("text", "")
                            if not text:
                                continue

                            bold = _is_bold(span)
                            italic = _is_italic(span)

                            # Apply formatting
                            formatted = _apply_markdown_formatting(text, bold, italic)
                            line_parts.append(formatted)

                        if line_parts:
                            line_text = "".join(line_parts)
                            block_lines.append(line_text)

                    if block_lines:
                        # Join lines within a block
                        block_text = "\n".join(block_lines)
                        result_lines.append(block_text)

        if result_lines:
            # Join blocks with blank lines for paragraph separation
            text = "\n\n".join(result_lines)
            # Merge adjacent formatting markers
            text = _merge_adjacent_formatting(text)
            # Clean extracted text
            cleaned_text = _clean_extracted_text(text)
            cleaned_text = _remove_page_number_lines(cleaned_text)
            return cleaned_text.strip()
        else:
            raise ExtractionError(ERROR_EXTRACT_PDF)

    except ImportError:
        raise ExtractionError("PDF processing library not available.")
    except (InvalidFileException, ExtractionError):
        raise
    except Exception:
        raise ExtractionError(ERROR_EXTRACT_PDF)


def extract_text_from_docx(file_content: bytes) -> str:
    """Extract text from DOCX file with formatting preservation.

    Preserves bold and italic formatting as markdown markers.
    """
    try:
        # DOCX is a ZIP: must begin with PK\x03\x04
        if not file_content.startswith(b"PK\x03\x04"):
            raise InvalidFileException("Invalid DOCX file signature")
        doc = docx.Document(BytesIO(file_content))
        paragraphs = []

        for paragraph in doc.paragraphs:
            para_parts = []
            for run in paragraph.runs:
                text = run.text
                if not text:
                    continue

                # Check formatting on the run
                is_bold = run.bold is True
                is_italic = run.italic is True

                # Apply markdown formatting
                formatted = _apply_markdown_formatting(text, is_bold, is_italic)
                para_parts.append(formatted)

            if para_parts:
                para_text = "".join(para_parts)
                paragraphs.append(para_text)

        if paragraphs:
            text = "\n".join(paragraphs)
            # Merge adjacent formatting markers
            text = _merge_adjacent_formatting(text)
            # Clean extracted text
            cleaned_text = _clean_extracted_text(text)
            return cleaned_text.strip()

        raise ExtractionError(ERROR_EXTRACT_DOCX)
    except (InvalidFileException, ExtractionError):
        raise
    except Exception:
        raise ExtractionError("Error reading DOCX file.")


def extract_text_from_file(file_content: bytes, content_type: str) -> str:
    """Extract text from uploaded file based on content type"""
    if content_type == "application/pdf":
        return extract_text_from_pdf(file_content)
    elif (
        content_type
        == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ):
        return extract_text_from_docx(file_content)
    else:
        raise InvalidFileException("Unsupported file type: " + content_type)
