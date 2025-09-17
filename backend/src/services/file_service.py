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
import PyPDF2
import docx
from io import BytesIO


ALLOWED_FILE_TYPES = {
    "application/pdf",
    "application/msword", 
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


def validate_file(file: UploadFile) -> Tuple[bool, str]:
    """Validate uploaded file"""
    # Check file type
    if file.content_type not in ALLOWED_FILE_TYPES:
        return False, f"File type {file.content_type} not allowed. Allowed types: {', '.join(ALLOWED_FILE_TYPES)}"
    
    # Check file size
    if file.size and file.size > MAX_FILE_SIZE:
        return False, f"File size {file.size} exceeds maximum allowed size of {MAX_FILE_SIZE} bytes"
    
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
    """Extract text from PDF file"""
    try:
        pdf_reader = PyPDF2.PdfReader(BytesIO(file_content))
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        return text.strip()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading PDF file: {str(e)}")


def extract_text_from_docx(file_content: bytes) -> str:
    """Extract text from DOCX file"""
    try:
        doc = docx.Document(BytesIO(file_content))
        text = ""
        for paragraph in doc.paragraphs:
            text += paragraph.text + "\n"
        return text.strip()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading DOCX file: {str(e)}")


def extract_text_from_doc(file_content: bytes) -> str:
    """Extract text from DOC file (basic implementation)"""
    try:
        # For DOC files, we'll use a simple approach
        # In production, you might want to use python-docx2txt or antiword
        doc = docx.Document(BytesIO(file_content))
        text = ""
        for paragraph in doc.paragraphs:
            text += paragraph.text + "\n"
        return text.strip()
    except Exception as e:
        # Fallback: try to extract as plain text
        try:
            return file_content.decode('utf-8', errors='ignore')
        except:
            raise HTTPException(status_code=400, detail=f"Error reading DOC file: {str(e)}")


def extract_text_from_file(file_content: bytes, content_type: str) -> str:
    """Extract text from uploaded file based on content type"""
    if content_type == "application/pdf":
        return extract_text_from_pdf(file_content)
    elif content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        return extract_text_from_docx(file_content)
    elif content_type == "application/msword":
        return extract_text_from_doc(file_content)
    else:
        raise HTTPException(status_code=400, detail="Unsupported file type: " + content_type)
