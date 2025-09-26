"""
File service for handling file uploads, validation, and text extraction.

This module provides functions for file validation, saving uploaded files,
text extraction from PDF and DOCX files, and file management operations.
"""
import os
import uuid
from typing import Tuple, Optional
from fastapi import UploadFile, HTTPException
import aiofiles
import docx
from io import BytesIO


ALLOWED_FILE_TYPES = {
    "application/pdf",
    # Dropping legacy .doc for reliability/security; keep DOCX only
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


async def validate_file(file: UploadFile) -> Tuple[bool, str]:
    """Validate uploaded file"""
    # Check file type
    if file.content_type not in ALLOWED_FILE_TYPES:
        return False, f"File type {file.content_type} not allowed. Allowed types: {', '.join(ALLOWED_FILE_TYPES)}"
    
    # Check file size by reading the file content
    try:
        # Read file content to get actual size
        content = await file.read()
        file_size = len(content)
        
        # Reset file pointer to beginning for subsequent reads
        await file.seek(0)
        
        if file_size > MAX_FILE_SIZE:
            return False, f"File size {file_size} exceeds maximum allowed size of {MAX_FILE_SIZE} bytes"
    except Exception as e:
        return False, f"Error reading file: {str(e)}"
    
    return True, ""


async def save_uploaded_file(file: UploadFile, content: Optional[bytes] = None) -> Tuple[str, str, int]:
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
    async with aiofiles.open(file_path, 'wb') as f:
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


def extract_text_from_pdf(file_content: bytes) -> str:
    """Extract text from PDF file using PyMuPDF"""
    try:
        # Magic sniff for PDF header
        if not file_content.startswith(b"%PDF"):
            raise HTTPException(status_code=400, detail="Invalid PDF file signature")
        import fitz  # PyMuPDF
        doc = fitz.open(stream=file_content, filetype="pdf")
        text = ""
        
        for page in doc:
            page_text = page.get_text()
            if page_text:
                text += page_text + "\n"
        
        doc.close()
        
        if text.strip():
            return text.strip()
        else:
            raise HTTPException(
                status_code=400, 
                detail="Unable to extract text from PDF. Please upload a PDF with selectable text."
            )
            
    except ImportError:
        raise HTTPException(
            status_code=500, 
            detail="PDF processing library not available."
        )
    except Exception as e:
        raise HTTPException(
            status_code=400, 
            detail="Unable to extract text from PDF. Please upload a PDF with selectable text."
        )


def extract_text_from_docx(file_content: bytes) -> str:
    """Extract text from DOCX file"""
    try:
        # DOCX is a ZIP: must begin with PK\x03\x04
        if not file_content.startswith(b"PK\x03\x04"):
            raise HTTPException(status_code=400, detail="Invalid DOCX file signature")
        doc = docx.Document(BytesIO(file_content))
        text = ""
        for paragraph in doc.paragraphs:
            text += paragraph.text + "\n"
        return text.strip()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading DOCX file: {str(e)}")


def extract_text_from_file(file_content: bytes, content_type: str) -> str:
    """Extract text from uploaded file based on content type"""
    if content_type == "application/pdf":
        return extract_text_from_pdf(file_content)
    elif content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        return extract_text_from_docx(file_content)
    else:
        raise HTTPException(status_code=400, detail="Unsupported file type: " + content_type)
