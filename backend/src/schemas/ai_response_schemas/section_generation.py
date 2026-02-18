"""
Pydantic schemas for CV section generation AI response validation.

Used by the section generation prompt (e.g. "Why I'm a Good Fit").
"""

from typing import List

from pydantic import BaseModel, Field


class CVSectionGenerationResponseSchema(BaseModel):
    """Schema for CV section generation AI response."""

    title: str = Field(min_length=1)
    content: str = Field(min_length=10)
    key_points: List[str] = Field(default_factory=list)
