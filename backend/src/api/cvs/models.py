"""
CV API Response Models

This module defines Pydantic models for CV API responses.
"""

from typing import List, Optional

from pydantic import BaseModel, Field, field_validator


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
    export_template_name: Optional[
        str
    ] = None  # Per-CV PDF template; public export uses this when set
    show_ai_attribution: bool = Field(
        True,
        description=(
            "Show the rahkar.pro credit line on exports that render the "
            "AI-generated section."
        ),
    )
    is_public_shared: bool = Field(
        False,
        description="True when this CV has public sharing enabled (active share token).",
    )

    class Config:
        from_attributes = True


class CVListResponse(BaseModel):
    """Response model for CV list with pagination."""

    cvs: List[CVResponse]
    total: int
    page: int
    limit: int
    pages: int


class CVExportTemplatePatchRequest(BaseModel):
    """Body for PATCH /cvs/{cv_id}/export-template."""

    template_name: Optional[str] = Field(
        None,
        description="LaTeX template name, or null to clear and use server default for export",
    )


class CVAIAttributionPatchRequest(BaseModel):
    """Body for PATCH /cvs/{cv_id}/ai-attribution."""

    show_ai_attribution: bool = Field(
        ...,
        description=(
            "True to keep the rahkar.pro credit line on exports, false to remove it"
        ),
    )


class CreateCVFromTextRequest(BaseModel):
    """Body for POST /cvs/from-text: paste raw resume text for AI parsing."""

    text: str = Field(..., description="Raw CV text to parse")
    title: Optional[str] = Field(
        None,
        max_length=255,
        description="Optional CV title; defaults to a generated name ending in .txt",
    )

    @field_validator("text")
    @classmethod
    def validate_text_length(cls, v: str) -> str:
        s = (v or "").strip()
        if len(s) < 10:
            raise ValueError(
                "Text must be at least 10 characters after trimming whitespace."
            )
        if len(s) > 50000:
            raise ValueError(
                "Text must be at most 50,000 characters after trimming whitespace."
            )
        return s


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
