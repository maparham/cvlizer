"""
Pydantic schemas for CV Quality Analysis responses.

Defines strict validation for all quality analysis data structures.
"""

from datetime import datetime
from typing import List, Optional
from pydantic import AliasChoices, BaseModel, Field, field_validator


# ============================================================================
# Writing Corrections
# ============================================================================


class FieldCorrectionSchema(BaseModel):
    """Field correction for all fields including description."""

    field_name: str = Field(
        description="Name of the field (company, position, institution, degree, location, description, etc.)"
    )
    original_value: str = Field(description="Current value in CV")
    corrected_value: Optional[str] = Field(
        default=None, description="Computed from html_diff in post-processing"
    )
    html_diff: str = Field(
        description="Required HTML diff showing visual changes with <del> and <ins> tags. Used for display. Corrected value is computed from this in post-processing."
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
    html_diff: Optional[str] = Field(
        default=None,
        description="DEPRECATED: Use field_corrections with field_name='description' instead. Kept for backward compatibility.",
    )
    field_corrections: List[FieldCorrectionSchema] = Field(
        default_factory=list,
        description="Array of field corrections (company, position, institution, degree, location, description, etc.). All fields including description use this format.",
    )
    importance: str = Field(pattern="^(highly_recommended|standard)$")


# ============================================================================
# Content Coaching
# ============================================================================


class CoachingQuestionSchema(BaseModel):
    """Individual coaching question for content expansion."""

    model_config = {"extra": "forbid"}

    question: str = Field(
        min_length=10, description="Specific, actionable coaching question"
    )


class ContentCoachingItemSchema(BaseModel):
    """Content coaching for a specific CV item.

    Matches OpenAI cv_corrections ContentCoaching schema.
    """

    model_config = {"extra": "forbid"}

    item_id: str = Field(description="ID of the CV item needing more content")
    section: str = Field(description="Section name")
    issue_category: str = Field(
        pattern="^(insufficient_content|missing_impact|too_brief|missing_achievements|lacks_specificity|missing_context|weak_action_verbs)$"
    )
    coaching_questions: List[CoachingQuestionSchema] = Field(min_length=1, max_length=3)
    direct_prompts: List[str] = Field(
        max_length=2, description="Direct expansion prompts"
    )


# ============================================================================
# Professional Summary
# ============================================================================


class ProfessionalSummaryQualitySuggestionSchema(BaseModel):
    """Professional summary quality suggestion."""

    suggested_text: Optional[str] = Field(
        default=None, description="Computed from html_diff in post-processing"
    )
    original_text: str = Field(default="")
    key_changes: List[str] = Field(default_factory=list)
    html_diff: Optional[str] = Field(default=None)
    coaching_questions: Optional[List[CoachingQuestionSchema]] = Field(default=None)


# ============================================================================
# Work Experience & Education Quality Items
# ============================================================================


class LowQualityItemSchema(BaseModel):
    """Item with low quality score - includes rewritten content.

    Only items with quality score < 50 are returned in the analysis.
    Items with score >= 50 are not included in the response.
    """

    item_type: str = Field(default="low_score", description="Discriminator for item type")
    item_id: str
    section: str
    quality_score: int = Field(ge=0, lt=50)
    original: str
    suggested: Optional[str] = Field(
        default=None, description="Computed from html_diff in post-processing"
    )
    reasoning: str = Field(max_length=200)
    html_diff: str
    coaching_questions: Optional[List[CoachingQuestionSchema]] = Field(default=None)


# Only low_score items are returned (items with score < 50 that need improvement)
QualityItemSchema = LowQualityItemSchema


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
    """Skill suggestion with reasoning.

    Matches OpenAI cv_corrections Skill schema. original can be null for new
    suggestions; required for spelling/capitalization corrections.
    """

    model_config = {"extra": "forbid"}

    skill: str
    reasoning: str = Field(max_length=100)
    original: Optional[str] = Field(
        default=None,
        description="Exact string as it appears in the CV when correcting; null for new suggestions.",
    )


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
    """Complete CV quality analysis response from AI.

    Note: work_experience and education arrays only contain items with quality score < 50
    that need improvement. Items with score >= 50 are not included in the response.
    """

    overall_quality_score: int = Field(ge=0, le=100)

    writing_corrections: List[WritingCorrectionSchema] = Field(default_factory=list)
    content_coaching: List[ContentCoachingItemSchema] = Field(default_factory=list)

    professional_summary: Optional[ProfessionalSummaryQualitySuggestionSchema] = Field(
        default=None
    )

    work_experience: List[QualityItemSchema] = Field(
        default_factory=list,
        description="Only items with quality score < 50 that need improvement",
    )
    education: List[QualityItemSchema] = Field(
        default_factory=list,
        description="Only items with quality score < 50 that need improvement",
    )

    skills: SkillsSuggestionsSchema = Field(
        default_factory=SkillsSuggestionsSchema,
        description="Optional new skills suggestions",
    )

    timeline_gaps: List[TimelineGapSchema] = Field(default_factory=list)


# ============================================================================
# AI-Only Schemas (Exclude Computed Fields)
# ============================================================================


class FieldCorrectionAISchema(BaseModel):
    """Field correction for AI responses (excludes computed fields).

    Matches OpenAI cv_corrections schema: field_name, html_diff, reasoning (all required).
    Accepts "field" as alias for field_name for model output robustness.
    """

    model_config = {"extra": "forbid"}

    field_name: str = Field(
        description="Name of the field (company, position, institution, degree, location, description, etc.)",
        validation_alias=AliasChoices("field_name", "field"),
    )
    html_diff: str = Field(
        description="HTML diff with <del> and <ins> tags. Must contain actual edits.",
        pattern=r"<(del|ins)>",
    )
    reasoning: str = Field(
        max_length=200,
        description="Field-specific explanation of the correction. Brief (max 30 words).",
    )


class WritingCorrectionAISchema(BaseModel):
    """Individual writing correction suggestion for AI responses.

    Matches OpenAI cv_corrections schema: item_id, section, importance, field_corrections
    (min 1) all required.
    """

    model_config = {"extra": "forbid"}

    item_id: str = Field(description="ID of the CV item containing the error")
    section: str = Field(
        description="Section name: work_experience, education, professional_summary, etc."
    )
    importance: str = Field(
        default="standard",
        pattern="^(highly_recommended|standard)$",
        description="How strongly to recommend this correction.",
    )
    field_corrections: List[FieldCorrectionAISchema] = Field(
        min_length=1,
        description="Field corrections with html_diff. At least one required.",
    )


class ProfessionalSummaryQualitySuggestionAISchema(BaseModel):
    """Professional summary for AI responses.

    Matches OpenAI cv_corrections ProfessionalSummary schema. html_diff and
    coaching_questions can be null.
    """

    model_config = {"extra": "forbid"}

    original_text: str = Field(default="")
    key_changes: List[str] = Field(default_factory=list)
    html_diff: Optional[str] = Field(default=None)
    coaching_questions: Optional[List[CoachingQuestionSchema]] = Field(default=None)


class LowQualityItemAISchema(BaseModel):
    """Item with low quality score for AI responses (excludes computed fields).

    Matches OpenAI cv_corrections LowQualityItem schema. Only items with
    quality score < 50 are returned. coaching_questions can be null.
    """

    model_config = {"extra": "forbid"}

    item_type: str = Field(default="low_score", description="Discriminator for item type")
    item_id: str
    section: str
    quality_score: int = Field(ge=0, lt=50)
    reasoning: str = Field(max_length=200)
    html_diff: str = Field(pattern=r"<(del|ins)>")
    coaching_questions: Optional[List[CoachingQuestionSchema]] = Field(
        default=None,
        description="Coaching questions for content expansion. Can be null.",
    )


class CVQualityAnalysisAIResponseBaseSchema(BaseModel):
    """Base AI response schema for CV quality analysis (shared fields across modes)."""

    overall_quality_score: int = Field(ge=0, le=100)

    writing_corrections: List[WritingCorrectionAISchema] = Field(
        default_factory=list,
        description="Only items where at least one field_correction has an html_diff containing <del> or <ins>. Omit items with no edits; do not include entries with only 'No changes needed'.",
    )

    professional_summary: Optional[ProfessionalSummaryQualitySuggestionAISchema] = Field(
        default=None
    )

    skills: SkillsSuggestionsSchema = Field(
        default_factory=SkillsSuggestionsSchema,
        description="Optional new skills suggestions",
    )


class CVQualityAnalysisAIResponseSchema(CVQualityAnalysisAIResponseBaseSchema):
    """AI response schema for CV quality analysis (excludes computed fields).

    This schema is used for OpenAI API calls. Computed fields (corrected_value,
    suggested, suggested_text, timeline_gaps) are excluded as they are computed
    in post-processing, not generated by the AI.

    Note: work_experience and education arrays only contain items with quality score < 50
    that need improvement. Items with score >= 50 are not included in the response.
    """

    content_coaching: List[ContentCoachingItemSchema] = Field(default_factory=list)

    work_experience: List[LowQualityItemAISchema] = Field(
        default_factory=list,
        description="Only items with quality score < 50 that need improvement",
    )
    education: List[LowQualityItemAISchema] = Field(
        default_factory=list,
        description="Only items with quality score < 50 that need improvement",
    )


class LowQualityItemAISchemaWritingOnly(BaseModel):
    """Low-quality item schema for proofread mode; no coaching_questions.

    Matches OpenAI cv_corrections schema for proofread mode.
    """

    model_config = {"extra": "forbid"}

    item_type: str = Field(default="low_score", description="Discriminator for item type")
    item_id: str
    section: str
    quality_score: int = Field(ge=0, lt=50)
    reasoning: str = Field(max_length=200)
    html_diff: str = Field(pattern=r"<(del|ins)>")


class CVQualityAnalysisAIResponseSchemaWritingOnly(CVQualityAnalysisAIResponseBaseSchema):
    """AI response schema for proofread mode; no content_coaching or item coaching_questions."""

    work_experience: List[LowQualityItemAISchemaWritingOnly] = Field(
        default_factory=list,
        description="Only items with quality score < 50 that need improvement",
    )
    education: List[LowQualityItemAISchemaWritingOnly] = Field(
        default_factory=list,
        description="Only items with quality score < 50 that need improvement",
    )


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


class CVQualityAnalysisCreateRequestSchema(BaseModel):
    """Request schema for creating quality analysis."""

    correction_mode: str = Field(
        default="proofread",
        pattern="^(proofread|coaching)$",
        description="Correction mode: 'proofread' for spelling/grammar only, "
        "'coaching' to also fix unprofessional content",
    )


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
