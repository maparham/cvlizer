"""
Pydantic models for quick start API endpoints.

This module contains shared data models used across quick start endpoints
for preview and claim operations.
"""

from typing import Optional

from pydantic import BaseModel


class QuickStartPreviewResponse(BaseModel):
    """Response model for quick start preview"""

    cv_preview: dict
    job_preview: dict
    success: bool
    message: str


class QuickStartClaimResponse(BaseModel):
    """Response model for quick start claim"""

    cv_id: Optional[str] = None
    job_description_id: Optional[str] = None
    message: str = "Data saved successfully"
