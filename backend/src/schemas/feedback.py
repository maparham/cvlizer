"""
Pydantic schemas for feedback API request/response validation.
"""

from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


class FeedbackCreate(BaseModel):
    """Schema for creating a new feedback entry."""

    type: Literal["bug", "suggestion", "general"] = Field(
        ..., description="Feedback type"
    )
    title: str = Field(..., min_length=1, max_length=200, description="Short title")
    body: str = Field(..., min_length=10, max_length=5000, description="Feedback content")
    page_url: Optional[str] = Field(None, max_length=500, description="Page URL")
    context: Optional[Dict[str, Any]] = Field(None, description="Optional context")

    model_config = {"extra": "forbid"}


class FeedbackResponse(BaseModel):
    """Schema for feedback in API responses."""

    id: str
    user_id: str
    type: str
    title: str
    body: str
    page_url: Optional[str] = None
    context: Optional[Dict[str, Any]] = None
    status: str
    admin_notes: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    submitter_email: Optional[str] = None  # Populated when listing with user loaded

    model_config = {"from_attributes": True}


class FeedbackUpdate(BaseModel):
    """Schema for admin updates to feedback (status, admin_notes)."""

    status: Optional[Literal["open", "in_progress", "resolved", "closed"]] = None
    admin_notes: Optional[str] = None

    model_config = {"extra": "forbid"}


class FeedbackListResponse(BaseModel):
    """Schema for paginated list of feedback."""

    feedbacks: List[FeedbackResponse]
    total: int
    page: int
    page_size: int
