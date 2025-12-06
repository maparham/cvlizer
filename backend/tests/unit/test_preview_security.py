"""
Unit tests for PDF preview endpoint security features.

These tests verify file size validation and security logging without testing
the rate limiter (which is covered in integration tests).
"""
import pytest
from fastapi import HTTPException, status
from unittest.mock import Mock, AsyncMock, patch
from io import BytesIO
from starlette.requests import Request

# Import the constant to test
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../")))

from src.api.cvs.preview import MAX_PREVIEW_FILE_SIZE


def create_mock_request(client_host="192.168.1.1"):
    """Create a properly mocked Starlette Request object."""
    scope = {
        "type": "http",
        "method": "POST",
        "headers": [],
        "client": (client_host, 12345),
    }
    request = Request(scope)
    return request


class TestPreviewFileSizeValidation:
    """Test file size validation for preview endpoint."""

    @pytest.mark.asyncio
    async def test_file_within_size_limit(self):
        """Test that files within 2MB limit are accepted."""
        # Import inside test to enable patching
        from src.api.cvs.preview import generate_uploaded_pdf_preview

        # Create 1MB PDF content
        pdf_content = b"%PDF-1.4\n" + b"x" * (1024 * 1024)

        mock_file = Mock()
        mock_file.filename = "test.pdf"
        mock_file.content_type = "application/pdf"
        mock_file.read = AsyncMock(return_value=pdf_content)

        mock_request = create_mock_request()

        # Disable rate limiter for unit test by making it a passthrough decorator
        with patch("src.api.cvs.preview.limiter.limit", lambda x: lambda f: f):
            with patch(
                "src.api.cvs.preview.convert_pdf_to_preview_image",
                return_value="base64data",
            ):
                result = await generate_uploaded_pdf_preview.__wrapped__(
                    mock_request, mock_file
                )

        assert result == {"preview_image_base64": "base64data"}

    @pytest.mark.asyncio
    async def test_file_exceeds_size_limit(self):
        """Test that files over 2MB are rejected with 413."""
        from src.api.cvs.preview import generate_uploaded_pdf_preview

        # Create 3MB PDF content
        pdf_content = b"%PDF-1.4\n" + b"x" * (3 * 1024 * 1024)

        mock_file = Mock()
        mock_file.filename = "large.pdf"
        mock_file.content_type = "application/pdf"
        mock_file.read = AsyncMock(return_value=pdf_content)

        mock_request = create_mock_request()

        with patch("src.api.cvs.preview.limiter.limit", lambda x: lambda f: f):
            with pytest.raises(HTTPException) as exc_info:
                await generate_uploaded_pdf_preview.__wrapped__(mock_request, mock_file)

        assert exc_info.value.status_code == status.HTTP_413_REQUEST_ENTITY_TOO_LARGE
        assert "2MB" in exc_info.value.detail or "2.0MB" in exc_info.value.detail
        assert "3.0MB" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_file_exactly_at_limit(self):
        """Test file exactly at 2MB boundary."""
        from src.api.cvs.preview import generate_uploaded_pdf_preview

        # Create exactly 2MB PDF
        pdf_content = b"%PDF-1.4\n" + b"x" * (MAX_PREVIEW_FILE_SIZE - 10)

        mock_file = Mock()
        mock_file.filename = "boundary.pdf"
        mock_file.content_type = "application/pdf"
        mock_file.read = AsyncMock(return_value=pdf_content)

        mock_request = create_mock_request()

        with patch("src.api.cvs.preview.limiter.limit", lambda x: lambda f: f):
            with patch(
                "src.api.cvs.preview.convert_pdf_to_preview_image",
                return_value="base64data",
            ):
                result = await generate_uploaded_pdf_preview.__wrapped__(
                    mock_request, mock_file
                )

        assert result == {"preview_image_base64": "base64data"}


class TestPreviewContentTypeValidation:
    """Test content-type validation (existing functionality)."""

    @pytest.mark.asyncio
    async def test_non_pdf_rejected(self):
        """Test that non-PDF files are rejected."""
        from src.api.cvs.preview import generate_uploaded_pdf_preview

        mock_file = Mock()
        mock_file.filename = "test.docx"
        mock_file.content_type = (
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )

        mock_request = create_mock_request()

        with patch("src.api.cvs.preview.limiter.limit", lambda x: lambda f: f):
            with pytest.raises(HTTPException) as exc_info:
                await generate_uploaded_pdf_preview.__wrapped__(mock_request, mock_file)

        assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST
        assert "PDF" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_pdf_content_type_accepted(self):
        """Test that PDF content type is accepted."""
        from src.api.cvs.preview import generate_uploaded_pdf_preview

        # Create small PDF content
        pdf_content = b"%PDF-1.4\n" + b"x" * 1000

        mock_file = Mock()
        mock_file.filename = "test.pdf"
        mock_file.content_type = "application/pdf"
        mock_file.read = AsyncMock(return_value=pdf_content)

        mock_request = create_mock_request()

        with patch("src.api.cvs.preview.limiter.limit", lambda x: lambda f: f):
            with patch(
                "src.api.cvs.preview.convert_pdf_to_preview_image",
                return_value="base64data",
            ):
                result = await generate_uploaded_pdf_preview.__wrapped__(
                    mock_request, mock_file
                )

        assert result == {"preview_image_base64": "base64data"}


class TestPreviewSecurityLogging:
    """Test security event logging."""

    @pytest.mark.asyncio
    async def test_size_rejection_logged(self):
        """Test that size rejections are logged with security events."""
        from src.api.cvs.preview import generate_uploaded_pdf_preview

        # Create 3MB PDF content
        pdf_content = b"%PDF-1.4\n" + b"x" * (3 * 1024 * 1024)

        mock_file = Mock()
        mock_file.filename = "large.pdf"
        mock_file.content_type = "application/pdf"
        mock_file.read = AsyncMock(return_value=pdf_content)

        mock_request = create_mock_request("192.168.1.100")

        with patch("src.api.cvs.preview.limiter.limit", lambda x: lambda f: f):
            with patch("src.api.cvs.preview.logger") as mock_logger:
                try:
                    await generate_uploaded_pdf_preview.__wrapped__(
                        mock_request, mock_file
                    )
                except HTTPException:
                    pass

                # Verify warning was logged with security event details
                mock_logger.warning.assert_called_once()
                call_args = mock_logger.warning.call_args
                assert "file too large" in call_args[0][0]
                assert call_args[1]["extra"]["event_type"] == "preview_size_rejection"
                assert call_args[1]["extra"]["client_ip"] == "192.168.1.100"

    @pytest.mark.asyncio
    async def test_success_logged(self):
        """Test that successful previews are logged with security events."""
        from src.api.cvs.preview import generate_uploaded_pdf_preview

        # Create small PDF content
        pdf_content = b"%PDF-1.4\n" + b"x" * 1000

        mock_file = Mock()
        mock_file.filename = "test.pdf"
        mock_file.content_type = "application/pdf"
        mock_file.read = AsyncMock(return_value=pdf_content)

        mock_request = create_mock_request("192.168.1.200")

        with patch("src.api.cvs.preview.limiter.limit", lambda x: lambda f: f):
            with patch(
                "src.api.cvs.preview.convert_pdf_to_preview_image",
                return_value="base64data",
            ):
                with patch("src.api.cvs.preview.logger") as mock_logger:
                    result = await generate_uploaded_pdf_preview.__wrapped__(
                        mock_request, mock_file
                    )

                    # Verify success was logged with security event details
                    info_calls = [
                        call
                        for call in mock_logger.info.call_args_list
                        if "Successfully generated preview" in str(call)
                    ]
                    assert len(info_calls) > 0
                    call_args = info_calls[0]
                    assert call_args[1]["extra"]["event_type"] == "preview_success"
                    assert call_args[1]["extra"]["client_ip"] == "192.168.1.200"


class TestPreviewConstant:
    """Test that the file size constant is correctly defined."""

    def test_max_preview_file_size_is_2mb(self):
        """Test that MAX_PREVIEW_FILE_SIZE constant is set to 2MB."""
        assert MAX_PREVIEW_FILE_SIZE == 2 * 1024 * 1024
        assert MAX_PREVIEW_FILE_SIZE == 2097152  # 2MB in bytes
