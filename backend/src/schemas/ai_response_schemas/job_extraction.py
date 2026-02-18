"""
Pydantic schemas for job description extraction AI response validation.

Used by the job extraction prompt (URL or raw text → structured job data).
"""

from pydantic import BaseModel, Field


class JobExtractionResponseSchema(BaseModel):
    """Schema for job extraction AI response."""

    title: str = Field(min_length=1)
    company: str = Field(min_length=1)
    location: str = Field(min_length=1)
    content: str = Field(min_length=1)
    source: str = Field(min_length=1)
