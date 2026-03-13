"""
CV API Response Models

This module defines Pydantic models for CV API responses.
"""

from typing import List, Optional

from pydantic import BaseModel, Field


class CVResponse(BaseModel):
    """Response model for CV data."""

    id: str
    user_id: str
    original_filename: str
    file_size: int
    file_type: str
    parsed_data: Optional[dict] = None  # Optional for list views
    is_parsed: bool
    parse_error: Optional[str]
    created_at: str
    updated_at: str
    is_imported: bool
    has_been_edited: bool
    section_count: Optional[int] = None  # Set by backend on all CV responses
    validation_warnings: Optional[List[str]] = None  # Advisory errors after save

    class Config:
        from_attributes = True


class CVListResponse(BaseModel):
    """Response model for CV list with pagination."""

    cvs: List[CVResponse]
    total: int
    page: int
    limit: int
    pages: int


class CVTitleUpdateRequest(BaseModel):
    """Request model for updating CV title."""

    title: str = Field(..., min_length=1, max_length=255, description="New CV title")


class CVValidateRequest(BaseModel):
    """Optional body for validate endpoint; when present, validate this data."""

    parsed_data: Optional[dict] = None


class CVValidateResponse(BaseModel):
    """Response model for CV validate endpoint."""

    cv_id: str
    validation_errors: List[str]
    validated_at: str
