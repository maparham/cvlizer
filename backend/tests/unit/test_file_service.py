import pytest
from unittest.mock import Mock, patch
from fastapi import UploadFile, HTTPException
from src.services.file_service import (
    validate_file, save_uploaded_file, delete_file,
    extract_text_from_pdf, extract_text_from_docx, 
    extract_text_from_doc, extract_text_from_file
)
import os
import uuid


class TestFileService:
    """Test cases for file service"""
    
    def test_validate_file_valid(self):
        """Test file validation with valid file"""
        mock_file = Mock()
        mock_file.content_type = "application/pdf"
        mock_file.size = 1024
        
        is_valid, error_message = validate_file(mock_file)
        
        assert is_valid == True
        assert error_message == ""
    
    def test_validate_file_invalid_type(self):
        """Test file validation with invalid file type"""
        mock_file = Mock()
        mock_file.content_type = "text/plain"
        mock_file.size = 1024
        
        is_valid, error_message = validate_file(mock_file)
        
        assert is_valid == False
        assert "File type text/plain not allowed" in error_message
    
    def test_validate_file_too_large(self):
        """Test file validation with file too large"""
        mock_file = Mock()
        mock_file.content_type = "application/pdf"
        mock_file.size = 20 * 1024 * 1024  # 20MB
        
        is_valid, error_message = validate_file(mock_file)
        
        assert is_valid == False
        assert "exceeds maximum allowed size" in error_message
    
    @patch('src.services.file_service.aiofiles.open')
    @patch('src.services.file_service.os.makedirs')
    @patch('src.services.file_service.uuid.uuid4')
    async def test_save_uploaded_file(self, mock_uuid, mock_makedirs, mock_open):
        """Test saving uploaded file"""
        mock_uuid.return_value = "test-uuid"
        mock_file = Mock()
        mock_file.filename = "test.pdf"
        mock_file.read.return_value = b"file content"
        
        mock_f = Mock()
        mock_open.return_value.__aenter__.return_value = mock_f
        
        file_path, filename, file_size = await save_uploaded_file(mock_file)
        
        assert filename == "test-uuid.pdf"
        assert file_size == len(b"file content")
        assert file_path.endswith("test-uuid.pdf")
        mock_makedirs.assert_called_once_with("uploads", exist_ok=True)
        mock_f.write.assert_called_once_with(b"file content")
    
    @patch('src.services.file_service.os.path.exists')
    @patch('src.services.file_service.os.remove')
    def test_delete_file_success(self, mock_remove, mock_exists):
        """Test successful file deletion"""
        mock_exists.return_value = True
        mock_remove.return_value = None
        
        result = delete_file("/path/to/file.pdf")
        
        assert result == True
        mock_remove.assert_called_once_with("/path/to/file.pdf")
    
    @patch('src.services.file_service.os.path.exists')
    def test_delete_file_not_exists(self, mock_exists):
        """Test file deletion when file doesn't exist"""
        mock_exists.return_value = False
        
        result = delete_file("/path/to/nonexistent.pdf")
        
        assert result == False
    
    @patch('src.services.file_service.os.path.exists')
    @patch('src.services.file_service.os.remove')
    def test_delete_file_error(self, mock_remove, mock_exists):
        """Test file deletion with error"""
        mock_exists.return_value = True
        mock_remove.side_effect = Exception("Permission denied")
        
        result = delete_file("/path/to/file.pdf")
        
        assert result == False
    
    @patch('src.services.file_service.PyPDF2.PdfReader')
    def test_extract_text_from_pdf_success(self, mock_pdf_reader):
        """Test successful PDF text extraction"""
        mock_page1 = Mock()
        mock_page1.extract_text.return_value = "Page 1 content"
        mock_page2 = Mock()
        mock_page2.extract_text.return_value = "Page 2 content"
        mock_pdf_reader.return_value.pages = [mock_page1, mock_page2]
        
        result = extract_text_from_pdf(b"PDF content")
        
        assert result == "Page 1 content\nPage 2 content"
        mock_pdf_reader.assert_called_once()
    
    @patch('src.services.file_service.PyPDF2.PdfReader')
    def test_extract_text_from_pdf_error(self, mock_pdf_reader):
        """Test PDF text extraction with error"""
        mock_pdf_reader.side_effect = Exception("PDF parsing error")
        
        with pytest.raises(HTTPException) as exc_info:
            extract_text_from_pdf(b"Invalid PDF content")
        
        assert exc_info.value.status_code == 400
        assert "Error reading PDF file" in str(exc_info.value.detail)
    
    @patch('src.services.file_service.docx.Document')
    def test_extract_text_from_docx_success(self, mock_docx):
        """Test successful DOCX text extraction"""
        mock_para1 = Mock()
        mock_para1.text = "Paragraph 1"
        mock_para2 = Mock()
        mock_para2.text = "Paragraph 2"
        mock_docx.return_value.paragraphs = [mock_para1, mock_para2]
        
        result = extract_text_from_docx(b"DOCX content")
        
        assert result == "Paragraph 1\nParagraph 2"
        mock_docx.assert_called_once()
    
    @patch('src.services.file_service.docx.Document')
    def test_extract_text_from_docx_error(self, mock_docx):
        """Test DOCX text extraction with error"""
        mock_docx.side_effect = Exception("DOCX parsing error")
        
        with pytest.raises(HTTPException) as exc_info:
            extract_text_from_docx(b"Invalid DOCX content")
        
        assert exc_info.value.status_code == 400
        assert "Error reading DOCX file" in str(exc_info.value.detail)
    
    @patch('src.services.file_service.docx.Document')
    def test_extract_text_from_doc_success(self, mock_docx):
        """Test successful DOC text extraction"""
        mock_para1 = Mock()
        mock_para1.text = "Paragraph 1"
        mock_para2 = Mock()
        mock_para2.text = "Paragraph 2"
        mock_docx.return_value.paragraphs = [mock_para1, mock_para2]
        
        result = extract_text_from_doc(b"DOC content")
        
        assert result == "Paragraph 1\nParagraph 2"
        mock_docx.assert_called_once()
    
    @patch('src.services.file_service.docx.Document')
    def test_extract_text_from_doc_error_fallback(self, mock_docx):
        """Test DOC text extraction with error and fallback"""
        mock_docx.side_effect = Exception("DOC parsing error")
        
        result = extract_text_from_doc(b"DOC content")
        
        assert result == "DOC content"
    
    def test_extract_text_from_file_pdf(self):
        """Test file text extraction for PDF"""
        with patch('src.services.file_service.extract_text_from_pdf') as mock_extract:
            mock_extract.return_value = "PDF text"
            
            result = extract_text_from_file(b"PDF content", "application/pdf")
            
            assert result == "PDF text"
            mock_extract.assert_called_once_with(b"PDF content")
    
    def test_extract_text_from_file_docx(self):
        """Test file text extraction for DOCX"""
        with patch('src.services.file_service.extract_text_from_docx') as mock_extract:
            mock_extract.return_value = "DOCX text"
            
            result = extract_text_from_file(b"DOCX content", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
            
            assert result == "DOCX text"
            mock_extract.assert_called_once_with(b"DOCX content")
    
    def test_extract_text_from_file_doc(self):
        """Test file text extraction for DOC"""
        with patch('src.services.file_service.extract_text_from_doc') as mock_extract:
            mock_extract.return_value = "DOC text"
            
            result = extract_text_from_file(b"DOC content", "application/msword")
            
            assert result == "DOC text"
            mock_extract.assert_called_once_with(b"DOC content")
    
    def test_extract_text_from_file_unsupported(self):
        """Test file text extraction for unsupported type"""
        with pytest.raises(HTTPException) as exc_info:
            extract_text_from_file(b"content", "text/plain")
        
        assert exc_info.value.status_code == 400
        assert "Unsupported file type" in str(exc_info.value.detail)
