"""
Pydantic schemas for AI suggestions responses (job fit + optimization).

Used by the AI suggestions prompt for job fit analysis and CV optimization
suggestions (skills, professional summary, work/education descriptions).
"""

from enum import Enum
from typing import List, Optional, Union

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Job fit analysis (single-call response shape)
# ---------------------------------------------------------------------------


class JobFitAnalysisResponseSchema(BaseModel):
    """Schema for job fit analysis AI response."""

    title: Optional[str] = Field(
        None, description="Dynamic title (e.g., 'Hello Company Name!')"
    )
    confidence_score: int = Field(ge=1, le=100)
    fit_analysis: str = Field(min_length=50)
    key_matches: List[str] = Field(default_factory=list)
    missing_skills: List[str] = Field(default_factory=list)
    suggested_improvements: List[str] = Field(default_factory=list)
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Optimization suggestions (skills, summary, item descriptions)
# ---------------------------------------------------------------------------


class SkillSuggestionSchema(BaseModel):
    """Schema for skill suggestion."""

    skill: str = Field(min_length=1)
    reasoning: str = Field(min_length=1)


class SkillsSuggestionsSchema(BaseModel):
    """Schema for skills suggestions."""

    technical: List[SkillSuggestionSchema] = Field(default_factory=list)
    soft: List[SkillSuggestionSchema] = Field(default_factory=list)


class ProfessionalSummarySuggestionSchema(BaseModel):
    """Schema for professional summary suggestion."""

    suggested_text: str = Field(default="")
    original_text: str = Field(default="")
    key_changes: List[str] = Field(default_factory=list)
    html_diff: str = Field(
        default="",
        description="HTML-formatted diff: <del>removed</del> <ins>added</ins>",
    )


class ItemType(str, Enum):
    """Discriminator for item suggestion types."""

    HIGH_SCORE = "high_score"
    LOW_SCORE = "low_score"


class HighScoreItemSchema(BaseModel):
    """Schema for items with score >= 50 - no suggestions needed."""

    item_type: ItemType = Field(
        default=ItemType.HIGH_SCORE,
        description="Item type discriminator",
    )
    id: str = Field(min_length=1, description="Item ID from CV data")
    current_content_score: int = Field(
        ge=50,
        le=100,
        description="Evaluation score for current content (50-100) w.r.t. job",
    )

    class Config:
        extra = "forbid"


class LowScoreItemSchema(BaseModel):
    """Schema for items with score < 50 - includes all suggestion fields."""

    item_type: ItemType = Field(
        default=ItemType.LOW_SCORE,
        description="Item type discriminator",
    )
    id: str = Field(min_length=1, description="Item ID from CV data")
    current_content_score: int = Field(
        ge=0,
        lt=50,
        description="Evaluation score for current content (0-49) w.r.t. job",
    )
    original: str = Field(min_length=1, description="Original description text")
    suggested: str = Field(
        min_length=1,
        description="Improved description text; match original format (bullets/paragraph).",
    )
    reasoning: str = Field(
        min_length=1,
        description="Reasoning for the improvement and relevance to target job",
    )
    importance: str = Field(
        pattern="^(highly_recommended|standard)$",
        description="'highly_recommended' or 'standard'",
    )
    html_diff: str = Field(
        default="",
        description="HTML-formatted diff: <del>removed</del> <ins>added</ins>",
    )

    class Config:
        extra = "forbid"


ItemDescriptionSuggestionSchema = Union[HighScoreItemSchema, LowScoreItemSchema]


class OptimizationSuggestionsResponseSchema(BaseModel):
    """Schema for optimization suggestions AI response."""

    skills: SkillsSuggestionsSchema = Field(default_factory=SkillsSuggestionsSchema)
    professional_summary: ProfessionalSummarySuggestionSchema = Field(
        default_factory=ProfessionalSummarySuggestionSchema
    )
    work_experience: List[ItemDescriptionSuggestionSchema] = Field(
        default_factory=list,
        description="Work experience description improvements",
    )
    education: List[ItemDescriptionSuggestionSchema] = Field(
        default_factory=list,
        description="Education description improvements",
    )


# ---------------------------------------------------------------------------
# Combined AI suggestions response (job fit + optimization in one call)
# ---------------------------------------------------------------------------


class AISuggestionsResponseSchema(BaseModel):
    """Schema for AI suggestions response (job fit analysis and optimization)."""

    # Job fit fields
    title: Optional[str] = Field(None, description="Dynamic title")
    confidence_score: int = Field(ge=1, le=100)
    fit_analysis: str = Field(min_length=50)
    key_matches: List[str] = Field(default_factory=list)
    missing_skills: List[str] = Field(default_factory=list)
    suggested_improvements: List[str] = Field(default_factory=list)
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)

    # Optimization fields
    skills: SkillsSuggestionsSchema = Field(default_factory=SkillsSuggestionsSchema)
    professional_summary: Optional[ProfessionalSummarySuggestionSchema] = Field(
        default=None,
        description="Only include if professional summary is visible in CV",
    )
    work_experience: List[ItemDescriptionSuggestionSchema] = Field(default_factory=list)
    education: List[ItemDescriptionSuggestionSchema] = Field(default_factory=list)
