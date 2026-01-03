"""
Pydantic schemas for AI response validation.

This module defines strict schemas for all AI operations to guarantee
response format, structure, and semantic correctness from OpenAI API calls.
"""

from enum import Enum
from typing import Any, Dict, List, Optional, Union

from pydantic import BaseModel, Field, field_validator

# ============================================================================
# CV Parsing Schemas
# ============================================================================


class PersonalInfoResponseSchema(BaseModel):
    """Schema for personal information in CV parsing response."""

    full_name: str = Field(default="")
    academic_title: Optional[str] = Field(default="")
    email: str = Field(default="")
    phone: str = Field(default="")
    location: str = Field(default="")
    linkedin_url: str = Field(default="")
    website_url: str = Field(default="")
    github_url: str = Field(default="")
    description: Optional[str] = Field(
        default="", description="Personal description or bio"
    )
    description_center_align: Optional[bool] = Field(
        default=False, description="Center align description"
    )
    show_horizontal_line: Optional[bool] = Field(
        default=False, description="Show horizontal line separator"
    )


class ProfessionalSummaryResponseSchema(BaseModel):
    """Schema for professional summary in CV parsing response."""

    content: str = Field(default="")
    keywords: List[str] = Field(default_factory=list)


class WorkExperienceItemSchema(BaseModel):
    """Schema for individual work experience entry."""

    company: str = Field(default="")
    position: str = Field(default="")
    location: Optional[str] = Field(default="")
    start_date: str = Field(default="")
    end_date: Optional[str] = Field(default=None)
    current: bool = Field(default=False)
    description: str = Field(default="")
    achievements: List[str] = Field(default_factory=list)
    technologies: List[str] = Field(default_factory=list)


class EducationItemSchema(BaseModel):
    """Schema for individual education entry."""

    institution: str = Field(default="")
    degree: str = Field(default="")
    field_of_study: Optional[str] = Field(default="")
    location: Optional[str] = Field(default="")
    start_date: str = Field(default="")
    end_date: Optional[str] = Field(default=None)
    gpa: Optional[str] = Field(default=None)
    description: str = Field(default="")
    achievements: List[str] = Field(default_factory=list)
    honors: List[str] = Field(default_factory=list)


class LanguageItemSchema(BaseModel):
    """Schema for language proficiency entry."""

    language: str = Field(default="")
    proficiency: str = Field(default="")


class SkillsResponseSchema(BaseModel):
    """Schema for skills section."""

    technical: List[str] = Field(default_factory=list)
    soft: List[str] = Field(default_factory=list)
    languages: List[LanguageItemSchema] = Field(default_factory=list)

    @field_validator("technical", "soft", mode="before")
    @classmethod
    def validate_skill_format(cls, v: List[str]) -> List[str]:
        """Validate that skills are strings. Preserve original formatting including category labels and comma-separated lists."""
        if not isinstance(v, list):
            return v
        validated_skills = []
        for skill in v:
            if not isinstance(skill, str):
                continue
            # Preserve original formatting - no length limit to allow category labels and comma-separated lists
            validated_skills.append(skill)
        return validated_skills


class CertificationItemSchema(BaseModel):
    """Schema for certification entry."""

    name: str = Field(default="")
    issuer: str = Field(default="")
    date: str = Field(default="")
    expiry_date: Optional[str] = Field(default=None)
    description: str = Field(default="")


class ProjectItemSchema(BaseModel):
    """Schema for project entry."""

    name: str = Field(default="")
    description: str = Field(default="")
    technologies: List[str] = Field(default_factory=list)
    url: Optional[str] = Field(default=None)


class AwardItemSchema(BaseModel):
    """Schema for award entry."""

    name: str = Field(default="")
    issuer: str = Field(default="")
    date: str = Field(default="")
    description: str = Field(default="")


class PublicationItemSchema(BaseModel):
    """Schema for publication entry."""

    title: str = Field(default="")
    authors: str = Field(default="")
    journal: str = Field(default="")
    date: str = Field(default="")
    url: Optional[str] = Field(default=None)


class VolunteerItemSchema(BaseModel):
    """Schema for volunteer experience entry."""

    organization: str = Field(default="")
    role: str = Field(default="")
    location: Optional[str] = Field(default="")
    start_date: str = Field(default="")
    end_date: Optional[str] = Field(default=None)
    description: str = Field(default="")


class CVParsingResponseSchema(BaseModel):
    """Schema for complete CV parsing AI response."""

    personal_info: PersonalInfoResponseSchema = Field(
        default_factory=PersonalInfoResponseSchema
    )
    professional_summary: ProfessionalSummaryResponseSchema = Field(
        default_factory=ProfessionalSummaryResponseSchema
    )
    work_experience: List[WorkExperienceItemSchema] = Field(default_factory=list)
    education: List[EducationItemSchema] = Field(default_factory=list)
    skills: SkillsResponseSchema = Field(default_factory=SkillsResponseSchema)
    certifications: List[CertificationItemSchema] = Field(default_factory=list)
    projects: List[ProjectItemSchema] = Field(default_factory=list)
    awards: List[AwardItemSchema] = Field(default_factory=list)
    publications: List[PublicationItemSchema] = Field(default_factory=list)
    volunteer_experience: List[VolunteerItemSchema] = Field(default_factory=list)
    is_valid_cv: bool = Field(
        default=True, description="Whether the document is a valid CV"
    )
    validation_error: Optional[str] = Field(
        default=None, description="Error message if not a valid CV"
    )


# ============================================================================
# Section Generation Schemas
# ============================================================================


class CVSectionGenerationResponseSchema(BaseModel):
    """Schema for CV section generation AI response."""

    title: str = Field(min_length=1)
    content: str = Field(min_length=10)
    key_points: List[str] = Field(default_factory=list)


# ============================================================================
# Job Fit Analysis Schemas
# ============================================================================


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


# ============================================================================
# Optimization Suggestions Schemas
# ============================================================================


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
        description="HTML-formatted diff showing changes: <del>text</del> for removed text, <ins>text</ins> for added text",
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
        description="Evaluation score for current content quality (50-100) w.r.t. the job description",
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
        description="Evaluation score for current content quality (0-49) w.r.t. the job description",
    )
    original: str = Field(
        min_length=1,
        description="Original description text",
    )
    suggested: str = Field(
        min_length=1,
        description="Actual improved description text written as the candidate's own content. MUST be ready-to-use rewritten text, NOT meta-instructions. Must match original format: bullets→bullets, paragraph→paragraph.",
    )
    reasoning: str = Field(
        min_length=1,
        description="Reasoning for the improvement and its relevance to target job",
    )
    importance: str = Field(
        pattern="^(highly_recommended|standard)$",
        description="Importance level: 'highly_recommended' for high-impact changes, 'standard' for moderate improvements",
    )
    html_diff: str = Field(
        default="",
        description="HTML-formatted diff showing changes: <del>text</del> for removed text, <ins>text</ins> for added text",
    )

    class Config:
        extra = "forbid"


# Union type for item suggestions
ItemDescriptionSuggestionSchema = Union[HighScoreItemSchema, LowScoreItemSchema]


class OptimizationSuggestionsResponseSchema(BaseModel):
    """Schema for optimization suggestions AI response."""

    skills: SkillsSuggestionsSchema = Field(default_factory=SkillsSuggestionsSchema)
    professional_summary: ProfessionalSummarySuggestionSchema = Field(
        default_factory=ProfessionalSummarySuggestionSchema
    )
    work_experience: List[ItemDescriptionSuggestionSchema] = Field(
        default_factory=list, description="Work experience description improvements"
    )
    education: List[ItemDescriptionSuggestionSchema] = Field(
        default_factory=list, description="Education description improvements"
    )


class AISuggestionsResponseSchema(BaseModel):
    """Schema for AI suggestions response (job fit analysis and optimization)."""

    # Job Fit fields
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
        description="Professional summary suggestions (only include if section is visible in CV)",
    )
    work_experience: List[ItemDescriptionSuggestionSchema] = Field(default_factory=list)
    education: List[ItemDescriptionSuggestionSchema] = Field(default_factory=list)


# ============================================================================
# Job Extraction Schemas
# ============================================================================


class JobExtractionResponseSchema(BaseModel):
    """Schema for job extraction AI response."""

    title: str = Field(min_length=1)
    company: str = Field(min_length=1)
    location: str = Field(min_length=1)
    content: str = Field(min_length=1)
    source: str = Field(min_length=1)
