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
from typing import Optional, Tuple

import aiofiles
import docx
from fastapi import HTTPException, UploadFile

ALLOWED_FILE_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


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


async def validate_file(file: UploadFile) -> Tuple[bool, str]:
    """Validate uploaded file"""
    # Check file type
    if file.content_type not in ALLOWED_FILE_TYPES:
        return (
            False,
            f"File type {file.content_type} not allowed. Allowed types: {', '.join(ALLOWED_FILE_TYPES)}",
        )

    # Check file size by reading the file content
    try:
        # Read file content to get actual size
        content = await file.read()
        file_size = len(content)

        # Reset file pointer to beginning for subsequent reads
        await file.seek(0)

        if file_size > MAX_FILE_SIZE:
            return (
                False,
                f"File size {file_size} exceeds maximum allowed size of {MAX_FILE_SIZE} bytes",
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
            raise HTTPException(status_code=400, detail="Invalid PDF file signature")
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
            return cleaned_text.strip()
        else:
            raise HTTPException(
                status_code=400,
                detail="Unable to extract text from PDF. Please upload a PDF with selectable text.",
            )

    except ImportError:
        raise HTTPException(
            status_code=500, detail="PDF processing library not available."
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail="Unable to extract text from PDF. Please upload a PDF with selectable text.",
        )


def extract_text_from_docx(file_content: bytes) -> str:
    """Extract text from DOCX file with formatting preservation.

    Preserves bold and italic formatting as markdown markers.
    """
    try:
        # DOCX is a ZIP: must begin with PK\x03\x04
        if not file_content.startswith(b"PK\x03\x04"):
            raise HTTPException(status_code=400, detail="Invalid DOCX file signature")
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

        raise HTTPException(
            status_code=400,
            detail="Unable to extract text from DOCX. Please upload a DOCX with text content.",
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading DOCX file: {str(e)}")


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
        raise HTTPException(
            status_code=400, detail="Unsupported file type: " + content_type
        )
