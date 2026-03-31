"""
Pydantic schemas for CV Quality Analysis responses.

Defines strict validation for all quality analysis data structures.
"""

from datetime import datetime
from typing import Dict, List, Optional
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
    field_path: str = Field(
        description="Field path for UI placement. E.g. work_experience.position, work_experience.description, education.degree.",
    )
    html_diff: Optional[str] = Field(
        default=None,
        description="Optional; ignored in apply logic. Use field_corrections with field_name='description' instead.",
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
        min_length=10,
        max_length=100,
        description="Specific, concise coaching question",
    )


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
    reasoning: str = Field(min_length=10, max_length=80)
    original: Optional[str] = Field(
        default=None,
        description="Exact string as it appears in the CV when correcting; null for new suggestions.",
    )


class SkillsSuggestionsSchema(BaseModel):
    """Skills suggestions structure."""

    technical: List[SkillQualitySuggestionSchema] = Field(
        default_factory=list, max_length=5
    )
    soft: List[SkillQualitySuggestionSchema] = Field(default_factory=list, max_length=3)

    class Config:
        extra = "forbid"  # Prevent additional properties


# ============================================================================
# cv_review_v2 (issues-based) Schemas
# ============================================================================


class CoachingSchema(BaseModel):
    """Coaching block nested in an issue (coaching_questions + direct_prompts)."""

    model_config = {"extra": "forbid"}

    coaching_questions: List[CoachingQuestionSchema] = Field(min_length=1, max_length=2)
    direct_prompts: List[str] = Field(max_length=1, default_factory=list)

    @field_validator("direct_prompts")
    @classmethod
    def validate_direct_prompt_lengths(cls, v: List[str]) -> List[str]:
        """Each direct prompt must be at most 150 characters (aligned with API schema)."""
        for prompt in v:
            if len(prompt) > 150:
                raise ValueError("direct_prompts must be max 150 chars each")
        return v


ISSUE_ITEM_TYPES = (
    "personal_info",
    "professional_summary",
    "work_experience",
    "education",
    "skills",
    "certifications",
    "projects",
    "awards",
    "publications",
    "volunteer_experience",
)
ISSUE_SEVERITY = ("critical", "major", "minor")
ISSUE_CATEGORY = (
    "offensive_language",
    "discriminatory_content",
    "unprofessional_tone",
    "grammar_errors",
    "insufficient_content",
    "missing_impact",
    "missing_achievements",
    "lacks_specificity",
    "too_brief",
    "missing_context",
    "weak_action_verbs",
)


class IssueSchema(BaseModel):
    """Single issue from cv_review_v2 (item_type, severity, category, coaching).
    One issue per detected problem; field_path identifies the target field for UI placement.
    """

    model_config = {"extra": "forbid"}

    item_type: str = Field(
        description="Section type: personal_info, professional_summary, work_experience, education, skills, certifications, projects, awards, publications, volunteer_experience"
    )
    item_id: Optional[str] = Field(default=None)
    field_path: str = Field(
        description="Field path for UI placement. One issue per field. E.g. work_experience.position, work_experience.description, education.degree, personal_info.description.",
    )
    issue_severity: str = Field(description="critical, major, minor")
    issue_category: str = Field(description="Issue category enum")
    quality_score: Optional[int] = Field(default=None, ge=0, le=100)
    reasoning: str = Field(max_length=60, min_length=15)
    html_diff: Optional[str] = Field(default=None)
    coaching: Optional[CoachingSchema] = Field(default=None)
    # Post-processing: populated by extract_original_from_cv_data_issues / clean
    original: Optional[str] = Field(default=None, description="From CV data")
    suggested: Optional[str] = Field(default=None, description="From html_diff")


class ProfessionalSummaryV2Schema(BaseModel):
    """Professional summary for cv_review_v2 (original_text + html_diff only)."""

    model_config = {"extra": "forbid"}

    original_text: str = Field(default="")
    html_diff: Optional[str] = Field(default=None)
    reasoning: Optional[str] = Field(default=None)
    # Post-processing
    suggested_text: Optional[str] = Field(default=None, description="From html_diff")


class CVQualityAnalysisResponseSchemaV2(BaseModel):
    """CV quality analysis response from cv_review_v2 (issues-based)."""

    overall_quality_score: int = Field(ge=0, le=100)
    issues: List[IssueSchema] = Field(default_factory=list)
    professional_summary: Optional[ProfessionalSummaryV2Schema] = Field(default=None)
    skills: SkillsSuggestionsSchema = Field(
        default_factory=SkillsSuggestionsSchema,
    )
    timeline_gaps: List[TimelineGapSchema] = Field(default_factory=list)
    # Per-field draft history for retry (length capped by CV_QUALITY_MAX_DRAFT_HISTORY, default 3)
    field_draft_histories: Optional[Dict[str, List[IssueSchema]]] = Field(
        default=None,
        description="Keyed by draft history key; each value is a list of issues (newest first), length capped by config",
    )
    # Mode used to generate this analysis; only 'coaching' enables regenerate/history in UI
    correction_mode: Optional[str] = Field(
        default=None,
        description="'proofread' or 'coaching'; frontend gates retry/history on coaching",
    )


class SingleIssueResponseSchema(BaseModel):
    """Response schema for single-field coaching (field retry). One issue only."""

    issue: IssueSchema


# ============================================================================
# API Response Schemas
# ============================================================================


class CVQualityAnalysisDBSchema(BaseModel):
    """Database model schema for API responses."""

    model_config = {"protected_namespaces": (), "from_attributes": True}

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
    """Schema for updating quality analysis data (for dismissals). V2 only."""

    quality_data: CVQualityAnalysisResponseSchemaV2 = Field(
        description="Updated quality analysis data with dismissed items removed"
    )


# ============================================================================
# Writing Corrections Application
# ============================================================================


class WritingCorrectionApplyRequest(BaseModel):
    """Request schema for applying a single writing correction."""

    cv_id: str = Field(description="CV ID to apply correction to")
    analysis_id: str = Field(description="Quality analysis ID containing the correction")
    draft_index: int = Field(
        description="0-based index into the draft list for this item (0 when only one draft)"
    )


class WritingCorrectionBatchApplyRequest(BaseModel):
    """Request schema for applying multiple writing corrections."""

    cv_id: str = Field(description="CV ID to apply corrections to")
    analysis_id: str = Field(description="Quality analysis ID containing the corrections")
    correction_ids: List[str] = Field(
        min_length=1, description="List of correction IDs to apply"
    )


# ============================================================================
# Field retry (single-field coaching)
# ============================================================================


class FieldRetryRequestSchema(BaseModel):
    """Request schema for field retry (single-field coaching)."""

    analysis_id: str = Field(description="Quality analysis ID to attach the new issue to")
    field_path: str = Field(
        description="Field path e.g. professional_summary, personal_info.description, "
        "work_experience.<id>.description, education.<id>.description"
    )
    item_id: Optional[str] = Field(
        default=None,
        description="Item ID for work_experience or education list items",
    )


class FieldRetryResponseSchema(BaseModel):
    """Response schema for field retry. Returns new issue and updated list for that field."""

    issue: IssueSchema = Field(description="The new issue from single-field coaching")
    list_for_field: List[IssueSchema] = Field(
        default_factory=list,
        description="Updated list of issues for this field (newest first), length capped by CV_QUALITY_MAX_DRAFT_HISTORY",
    )
