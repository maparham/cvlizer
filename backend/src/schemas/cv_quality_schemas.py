"""
Pydantic schemas for CV Quality Analysis responses.

Defines strict validation for all quality analysis data structures.
"""

from datetime import datetime
from typing import List, Optional, Union
from pydantic import BaseModel, Field, field_validator


# ============================================================================
# Writing Corrections
# ============================================================================


class FieldCorrectionSchema(BaseModel):
    """Field correction for all fields including description."""

    field_name: str = Field(
        description="Name of the field (company, position, institution, degree, location, description, etc.)"
    )
    original_value: str = Field(description="Current value in CV")
    corrected_value: str = Field(description="Corrected value")
    markdown_diff: str = Field(
        description="Required markdown diff showing visual changes with ~~strikethrough~~ and **bold** markers. Used for display only. corrected_value is used for application."
    )
    reasoning: Optional[str] = Field(
        default=None,
        max_length=200,
        description="Field-specific explanation of the correction. Should be brief (max 30 words) and specific to this field.",
    )


class WritingCorrectionSchema(BaseModel):
    """Individual writing correction suggestion."""

    item_id: str = Field(description="ID of the CV item containing the error")
    section: str = Field(
        description="Section name: work_experience, education, professional_summary, etc."
    )
    markdown_diff: Optional[str] = Field(
        default=None,
        description="DEPRECATED: Use field_corrections with field_name='description' instead. Kept for backward compatibility.",
    )
    field_corrections: List[FieldCorrectionSchema] = Field(
        default_factory=list,
        description="Array of field corrections (company, position, institution, degree, location, description, etc.). All fields including description use this format.",
    )
    reasoning: str = Field(max_length=200, description="Brief explanation of the issue")
    importance: str = Field(pattern="^(highly_recommended|standard)$")


# ============================================================================
# Content Coaching
# ============================================================================


class CoachingQuestionSchema(BaseModel):
    """Individual coaching question for content expansion."""

    question: str = Field(
        min_length=10, description="Specific, actionable coaching question"
    )


class ContentCoachingItemSchema(BaseModel):
    """Content coaching for a specific CV item."""

    item_id: str = Field(description="ID of the CV item needing more content")
    section: str = Field(description="Section name")
    issue_category: str = Field(
        pattern="^(insufficient_content|missing_impact|too_brief|missing_achievements|lacks_specificity|missing_context|weak_action_verbs)$"
    )
    coaching_questions: List[CoachingQuestionSchema] = Field(min_items=2, max_items=4)
    direct_prompts: List[str] = Field(max_items=2, description="Direct expansion prompts")


# ============================================================================
# Professional Summary
# ============================================================================


class ProfessionalSummaryQualitySuggestionSchema(BaseModel):
    """Professional summary quality suggestion."""

    suggested_text: Optional[str] = Field(default=None)
    original_text: str = Field(default="")
    key_changes: List[str] = Field(default_factory=list)
    markdown_diff: Optional[str] = Field(default=None)
    coaching_questions: Optional[List[CoachingQuestionSchema]] = Field(default=None)


# ============================================================================
# Work Experience & Education Quality Items
# ============================================================================


class HighQualityItemSchema(BaseModel):
    """Item with high quality score - no suggestions needed."""

    item_type: str = Field(
        default="high_score", description="Discriminator for item type"
    )
    item_id: str
    section: str
    quality_score: int = Field(ge=50, le=100)


class LowQualityItemSchema(BaseModel):
    """Item with low quality score - includes rewritten content."""

    item_type: str = Field(default="low_score", description="Discriminator for item type")
    item_id: str
    section: str
    quality_score: int = Field(ge=0, lt=50)
    original: str
    suggested: str
    reasoning: str = Field(max_length=200)
    markdown_diff: str
    coaching_questions: Optional[List[CoachingQuestionSchema]] = Field(default=None)


# Union type for quality items
QualityItemSchema = Union[HighQualityItemSchema, LowQualityItemSchema]


# ============================================================================
# Timeline Gaps
# ============================================================================


class TimelineGapItemSchema(BaseModel):
    """Item reference for timeline gap."""

    type: str
    id: str
    title: str

    class Config:
        extra = "forbid"  # Prevent additional properties


class TimelineGapSchema(BaseModel):
    """Detected gap in work/education timeline."""

    gap_type: str = Field(pattern="^(work_experience|education|combined)$")
    gap_duration_months: int = Field(ge=3)
    start_date: str
    end_date: str
    item_before: Optional[TimelineGapItemSchema] = Field(default=None)
    item_after: Optional[TimelineGapItemSchema] = Field(default=None)


# ============================================================================
# Skills Suggestions
# ============================================================================


class SkillQualitySuggestionSchema(BaseModel):
    """Skill suggestion with reasoning."""

    skill: str
    reasoning: str = Field(max_length=100)


class SkillsSuggestionsSchema(BaseModel):
    """Skills suggestions structure."""

    technical: List[SkillQualitySuggestionSchema] = Field(default_factory=list)
    soft: List[SkillQualitySuggestionSchema] = Field(default_factory=list)

    class Config:
        extra = "forbid"  # Prevent additional properties


# ============================================================================
# Main CV Quality Analysis Response
# ============================================================================


class CVQualityAnalysisResponseSchema(BaseModel):
    """Complete CV quality analysis response from AI."""

    overall_quality_score: int = Field(ge=0, le=100)

    writing_corrections: List[WritingCorrectionSchema] = Field(default_factory=list)
    content_coaching: List[ContentCoachingItemSchema] = Field(default_factory=list)

    professional_summary: Optional[ProfessionalSummaryQualitySuggestionSchema] = Field(
        default=None
    )

    work_experience: List[QualityItemSchema] = Field(default_factory=list)
    education: List[QualityItemSchema] = Field(default_factory=list)

    skills: SkillsSuggestionsSchema = Field(
        default_factory=SkillsSuggestionsSchema,
        description="Optional new skills suggestions",
    )

    timeline_gaps: List[TimelineGapSchema] = Field(default_factory=list)


# ============================================================================
# API Response Schemas
# ============================================================================


class CVQualityAnalysisDBSchema(BaseModel):
    """Database model schema for API responses."""

    id: str
    cv_id: str
    user_id: str
    quality_data: Optional[dict]
    overall_quality_score: Optional[int]
    is_generating: bool
    generation_error: Optional[str]
    tokens_used: int
    generation_time: int
    model_used: Optional[str]
    created_at: str

    @field_validator("created_at", mode="before")
    @classmethod
    def serialize_datetime(cls, v):
        """Convert datetime to ISO format string."""
        if isinstance(v, datetime):
            return v.isoformat()
        return v

    class Config:
        from_attributes = True


class CVQualityAnalysisCreateResponseSchema(BaseModel):
    """Response schema for creating quality analysis."""

    analysis_id: str
    is_generating: bool
    message: Optional[str] = None


class CVQualityAnalysisUpdateSchema(BaseModel):
    """Schema for updating quality analysis data (for dismissals)."""

    quality_data: CVQualityAnalysisResponseSchema = Field(
        description="Updated quality analysis data with dismissed items removed"
    )


# ============================================================================
# Writing Corrections Application
# ============================================================================


class WritingCorrectionApplyRequest(BaseModel):
    """Request schema for applying a single writing correction."""

    cv_id: str = Field(description="CV ID to apply correction to")
    analysis_id: str = Field(description="Quality analysis ID containing the correction")


class WritingCorrectionBatchApplyRequest(BaseModel):
    """Request schema for applying multiple writing corrections."""

    cv_id: str = Field(description="CV ID to apply corrections to")
    analysis_id: str = Field(description="Quality analysis ID containing the corrections")
    correction_ids: List[str] = Field(
        min_length=1, description="List of correction IDs to apply"
    )
