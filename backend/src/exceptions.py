"""
Domain exceptions for the backend.

These exceptions are raised by the service layer. The API layer catches them
and maps to HTTPException with appropriate status codes and generic client messages.
"""


class InvalidFileException(Exception):
    """Raised when file format/signature is invalid or file type is not supported."""


class ExtractionError(Exception):
    """Raised when text extraction from a file fails (read/parse failure)."""
