"""
Pydantic schemas for AI response validation.

This module defines strict schemas for all AI operations to guarantee
response format, structure, and semantic correctness from OpenAI API calls.
"""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

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
# Content Enhancement Schemas
# ============================================================================


class ContentSuggestionSchema(BaseModel):
    """Schema for individual content suggestion."""

    content: str = Field(min_length=1)
    improvements: List[str] = Field(min_length=1)
    confidence_score: int = Field(ge=0, le=100)


class ContentEnhancementResponseSchema(BaseModel):
    """Schema for content enhancement AI response."""

    suggestions: List[ContentSuggestionSchema] = Field(min_length=1, max_length=4)
    overall_improvements: List[str] = Field(min_length=1)


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
# ATS Optimization Schemas
# ============================================================================


class MissingKeywordSchema(BaseModel):
    """Schema for missing keyword entry."""

    keyword: str = Field(min_length=1)
    importance: str = Field(pattern="^(high|medium|low)$")
    frequency_in_jd: int = Field(ge=0)
    present_in_cv: bool = Field(default=False)
    found_in_sections: List[str] = Field(default_factory=list)
    suggested_placement: str = Field(min_length=1)


class KeywordAnalysisEntrySchema(BaseModel):
    """Schema for individual keyword analysis."""

    present: bool
    found_in_sections: List[str] = Field(default_factory=list)
    suggested_sections: List[str] = Field(default_factory=list)


class ContentOptimizationSchema(BaseModel):
    """Schema for content optimization suggestion."""

    section: str = Field(min_length=1)
    missing_keywords: List[str] = Field(default_factory=list)
    suggestion: str = Field(min_length=1)


class ATSOptimizationResponseSchema(BaseModel):
    """Schema for ATS optimization AI response."""

    ats_score: int = Field(ge=0, le=100)
    missing_keywords: List[MissingKeywordSchema] = Field(default_factory=list)
    keyword_analysis: Dict[str, KeywordAnalysisEntrySchema] = Field(default_factory=dict)
    suggestions: List[str] = Field(default_factory=list)
    content_optimization: List[ContentOptimizationSchema] = Field(default_factory=list)
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


class OptimizationSuggestionsResponseSchema(BaseModel):
    """Schema for optimization suggestions AI response."""

    skills: SkillsSuggestionsSchema = Field(default_factory=SkillsSuggestionsSchema)
    professional_summary: ProfessionalSummarySuggestionSchema = Field(
        default_factory=ProfessionalSummarySuggestionSchema
    )


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
