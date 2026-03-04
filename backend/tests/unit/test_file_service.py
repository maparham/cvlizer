import os
import shutil
import tempfile
from unittest.mock import AsyncMock, Mock, patch

import pytest
from fastapi import UploadFile

from src.exceptions import InvalidFileException

from src.services.file_service import (
    _remove_page_number_lines,
    delete_file,
    extract_text_from_docx,
    extract_text_from_file,
    extract_text_from_pdf,
    save_uploaded_file,
    validate_file,
)


class TestFileService:
    """Test cases for file service"""

    @pytest.fixture(scope="function")
    def temp_dir(self):
        """Create a temporary directory for testing"""
        temp_dir = tempfile.mkdtemp()
        yield temp_dir
        shutil.rmtree(temp_dir)

    @pytest.fixture
    def mock_upload_file(self):
        """Create a mock UploadFile for testing"""
        mock_file = Mock(spec=UploadFile)
        mock_file.filename = "test.pdf"
        mock_file.content_type = "application/pdf"
        mock_file.read = AsyncMock(return_value=b"Test PDF content")
        mock_file.seek = AsyncMock()
        return mock_file

    @pytest.mark.asyncio
    async def test_save_uploaded_file_success(self, temp_dir, mock_upload_file):
        """Test successful file upload"""
        with patch("src.services.file_service.os.makedirs"):
            with patch("src.services.file_service.aiofiles.open") as mock_open:
                mock_file = AsyncMock()
                mock_open.return_value.__aenter__.return_value = mock_file

                result = await save_uploaded_file(mock_upload_file)

                file_path, unique_filename, file_size = result

                assert file_path is not None
                assert unique_filename.endswith(".pdf")
                assert file_size == len(b"Test PDF content")
                mock_file.write.assert_called_once_with(b"Test PDF content")

    def test_delete_file_success(self, temp_dir):
        """Test successful file deletion"""
        test_file = os.path.join(temp_dir, "test.pdf")
        with open(test_file, "wb") as f:
            f.write(b"Test content")

        result = delete_file(test_file)

        assert result is True
        assert not os.path.exists(test_file)

    def test_delete_file_not_exists(self, temp_dir):
        """Test file deletion when file doesn't exist"""
        non_existent_file = os.path.join(temp_dir, "non_existent.pdf")

        result = delete_file(non_existent_file)

        assert result is False

    @pytest.mark.asyncio
    async def test_validate_file_valid(self, mock_upload_file):
        """Test file validation with valid file"""
        is_valid, message = await validate_file(mock_upload_file)

        assert is_valid is True
        assert message == ""

    @pytest.mark.asyncio
    async def test_validate_file_invalid_type(self):
        """Test file validation with invalid file type"""
        mock_file = Mock(spec=UploadFile)
        mock_file.content_type = "text/plain"
        mock_file.read = AsyncMock(return_value=b"Test content")
        mock_file.seek = AsyncMock()

        is_valid, message = await validate_file(mock_file)

        assert is_valid is False
        assert "File type text/plain not allowed" in message

    @pytest.mark.asyncio
    async def test_validate_file_too_large(self):
        """Test file validation with file too large"""
        mock_file = Mock(spec=UploadFile)
        mock_file.content_type = "application/pdf"
        # Create content larger than 10MB
        large_content = b"x" * (11 * 1024 * 1024)
        mock_file.read = AsyncMock(return_value=large_content)
        mock_file.seek = AsyncMock()

        is_valid, message = await validate_file(mock_file)

        assert is_valid is False
        assert "File size" in message and "exceeds maximum" in message

    @patch("fitz.open")
    def test_extract_text_from_pdf(self, mock_fitz_open):
        """Test text extraction from PDF file"""
        file_content = b"%PDF-1.4\nPDF content"

        mock_page = Mock()
        mock_page.get_text.return_value = "Extracted text"

        mock_doc = Mock()
        mock_doc.__iter__ = Mock(return_value=iter([mock_page]))
        mock_fitz_open.return_value = mock_doc

        result = extract_text_from_pdf(file_content)

        assert result == "Extracted text"

    def test_extract_text_from_docx(self):
        """Test text extraction from DOCX file"""
        file_content = b"PK\x03\x04DOCX content"

        with patch("src.services.file_service.docx.Document") as mock_doc:
            mock_paragraph = Mock()
            mock_paragraph.text = "Extracted text"
            mock_doc.return_value.paragraphs = [mock_paragraph]

            result = extract_text_from_docx(file_content)

            assert result == "Extracted text"

    def test_extract_text_from_file_pdf(self):
        """Test text extraction from file with PDF content type"""
        file_content = b"PDF content"

        with patch("src.services.file_service.extract_text_from_pdf") as mock_extract:
            mock_extract.return_value = "Extracted PDF text"

            result = extract_text_from_file(file_content, "application/pdf")

            assert result == "Extracted PDF text"
            mock_extract.assert_called_once_with(file_content)

    def test_extract_text_from_file_docx(self):
        """Test text extraction from file with DOCX content type"""
        file_content = b"DOCX content"

        with patch("src.services.file_service.extract_text_from_docx") as mock_extract:
            mock_extract.return_value = "Extracted DOCX text"

            result = extract_text_from_file(
                file_content,
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )

            assert result == "Extracted DOCX text"
            mock_extract.assert_called_once_with(file_content)

    def test_extract_text_from_file_unsupported_type(self):
        """Test text extraction from file with unsupported content type"""
        file_content = b"Some content"

        with pytest.raises(InvalidFileException) as exc_info:
            extract_text_from_file(file_content, "text/plain")
        assert "Unsupported file type" in str(exc_info.value)

    def test_remove_page_number_lines_removes_standalone_digits(self):
        """Lines that are only 1-3 digits are removed"""
        text = "Name\n1\nExperience\n2\nSkills"
        assert _remove_page_number_lines(text) == "Name\nExperience\nSkills"

    def test_remove_page_number_lines_removes_page_n_pattern(self):
        """Lines like 'Page 1' or 'page 2' are removed"""
        text = "Summary\nPage 1\nContent\npage 3"
        assert _remove_page_number_lines(text) == "Summary\nContent"

    def test_remove_page_number_lines_removes_n_of_m_and_n_slash_m(self):
        """Lines like '1 of 5' and '2/10' are removed"""
        text = "Intro\n1 of 5\nBody\n3/10\nEnd"
        assert _remove_page_number_lines(text) == "Intro\nBody\nEnd"

    def test_remove_page_number_lines_keeps_non_matching_lines(self):
        """Content lines and 4+ digit numbers are kept"""
        text = "5 years experience\n2020\nPage 1 of 10\nNormal line"
        result = _remove_page_number_lines(text)
        assert "5 years experience" in result
        assert "2020" in result
        assert "Page 1 of 10" in result
        assert "Normal line" in result

    def test_remove_page_number_lines_preserves_paragraph_breaks(self):
        """Double newlines (paragraph breaks) are preserved"""
        text = "Para one\n\n2\n\nPara two"
        result = _remove_page_number_lines(text)
        assert result == "Para one\n\n\n\nPara two"
