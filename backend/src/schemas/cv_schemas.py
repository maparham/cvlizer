"""
Comprehensive Pydantic schemas for CV data validation with proper type safety.
"""

from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import date
from src.config import AIConfig


class PersonalInfoSchema(BaseModel):
    """Schema for personal information section."""

    full_name: str = Field(..., min_length=1, description="Full name is required")
    email: EmailStr = Field(..., description="Valid email address is required")
    phone: Optional[str] = Field(None, description="Phone number")
    location: str = Field(..., min_length=1, description="Location is required")
    linkedin_url: Optional[str] = Field(None, description="LinkedIn profile URL")
    website_url: Optional[str] = Field(None, description="Personal website URL")
    github_url: Optional[str] = Field(None, description="GitHub profile URL")

    class Config:
        extra = "forbid"  # Reject any additional fields


class ProfessionalSummarySchema(BaseModel):
    """Schema for professional summary section."""

    content: str = Field(..., min_length=10, description="Professional summary content")
    keywords: List[str] = Field(default_factory=list, description="Key skills/keywords")

    class Config:
        extra = "forbid"  # Reject any additional fields


class WhyGoodFitSchema(BaseModel):
    """Schema for AI-generated 'Why I'm a Good Fit' section."""

    model_config = {"protected_namespaces": (), "extra": "forbid"}

    content: str = Field(..., min_length=10, description="Why I'm a good fit content")
    confidence_score: int = Field(
        ..., ge=0, le=100, description="Confidence score (0-100)"
    )
    fit_analysis: str = Field(..., min_length=10, description="Detailed fit analysis")
    key_matches: List[str] = Field(
        default_factory=list, description="Key matches with job requirements"
    )
    missing_skills: List[str] = Field(
        default_factory=list, description="Missing skills from job requirements"
    )
    suggested_improvements: List[str] = Field(
        default_factory=list, description="Suggested improvements"
    )
    strengths: List[str] = Field(default_factory=list, description="Candidate strengths")
    weaknesses: List[str] = Field(
        default_factory=list, description="Areas for improvement"
    )
    tokens_used: int = Field(0, description="Tokens used in generation")
    generation_time: int = Field(0, description="Generation time in milliseconds")
    model_used: str = Field(
        default_factory=lambda: AIConfig.OPENAI_MODEL, description="AI model used"
    )
    generated_at: str = Field(..., description="Generation timestamp")
    job_description_id: Optional[str] = Field(
        None, description="Associated job description ID"
    )


class WorkExperienceSchema(BaseModel):
    """Schema for work experience entries."""

    id: Optional[str] = Field(
        None, description="Unique identifier for the work experience entry"
    )
    company: str = Field(..., min_length=1, description="Company name is required")
    position: str = Field(..., min_length=1, description="Position title is required")
    location: Optional[str] = Field(None, description="Work location")
    start_date: str = Field(..., description="Start date in YYYY-MM-DD format")
    end_date: Optional[str] = Field(None, description="End date in YYYY-MM-DD format")
    current: bool = Field(default=False, description="Currently working here")
    description: Optional[str] = Field(None, description="Job description")
    achievements: List[str] = Field(default_factory=list, description="Key achievements")
    technologies: List[str] = Field(default_factory=list, description="Technologies used")

    class Config:
        extra = "forbid"  # Reject any additional fields


class EducationSchema(BaseModel):
    """Schema for education entries."""

    id: Optional[str] = Field(
        None, description="Unique identifier for the education entry"
    )
    institution: str = Field(
        ..., min_length=1, description="Institution name is required"
    )
    degree: str = Field(..., min_length=1, description="Degree name is required")
    field_of_study: Optional[str] = Field(None, description="Field of study")
    location: Optional[str] = Field(None, description="Institution location")
    start_date: str = Field(..., description="Start date in YYYY-MM-DD format")
    end_date: Optional[str] = Field(None, description="End date in YYYY-MM-DD format")
    gpa: Optional[str] = Field(None, description="GPA or grade")
    description: Optional[str] = Field(None, description="Additional details")
    achievements: List[str] = Field(
        default_factory=list, description="Academic achievements"
    )
    honors: List[str] = Field(default_factory=list, description="Honors and awards")

    class Config:
        extra = "forbid"  # Reject any additional fields


class LanguageSchema(BaseModel):
    """Schema for language proficiency."""

    id: Optional[str] = Field(
        None, description="Unique identifier for the language entry"
    )
    language: str = Field(..., min_length=1, description="Language name")
    proficiency: str = Field(..., min_length=1, description="Proficiency level")

    class Config:
        extra = "forbid"  # Reject any additional fields


class SkillsSchema(BaseModel):
    """Schema for skills section."""

    technical: List[str] = Field(default_factory=list, description="Technical skills")
    soft: List[str] = Field(default_factory=list, description="Soft skills")
    languages: List[LanguageSchema] = Field(
        default_factory=list, description="Language proficiencies"
    )

    class Config:
        extra = "forbid"  # Reject any additional fields


class CertificationSchema(BaseModel):
    """Schema for certification entries."""

    id: Optional[str] = Field(
        None, description="Unique identifier for the certification entry"
    )
    name: str = Field(..., min_length=1, description="Certification name is required")
    issuer: str = Field(..., min_length=1, description="Issuing organization is required")
    date: str = Field(..., description="Issue date in YYYY-MM-DD format")
    expiry_date: Optional[str] = Field(
        None, description="Expiry date in YYYY-MM-DD format"
    )
    description: Optional[str] = Field(None, description="Certification description")

    class Config:
        extra = "forbid"  # Reject any additional fields


class ProjectSchema(BaseModel):
    """Schema for project entries."""

    id: Optional[str] = Field(None, description="Unique identifier for the project entry")
    name: str = Field(..., min_length=1, description="Project name is required")
    description: str = Field(
        ..., min_length=10, description="Project description is required"
    )
    technologies: List[str] = Field(default_factory=list, description="Technologies used")
    url: Optional[str] = Field(None, description="Project URL")

    class Config:
        extra = "forbid"  # Reject any additional fields


class AwardSchema(BaseModel):
    """Schema for award entries."""

    id: Optional[str] = Field(None, description="Unique identifier for the award entry")
    name: str = Field(..., min_length=1, description="Award name is required")
    issuer: str = Field(..., min_length=1, description="Issuing organization is required")
    date: str = Field(..., description="Award date in YYYY-MM-DD format")
    description: Optional[str] = Field(None, description="Award description")

    class Config:
        extra = "forbid"  # Reject any additional fields


class PublicationSchema(BaseModel):
    """Schema for publication entries."""

    id: Optional[str] = Field(
        None, description="Unique identifier for the publication entry"
    )
    title: str = Field(..., min_length=1, description="Publication title is required")
    authors: str = Field(..., min_length=1, description="Authors are required")
    journal: str = Field(
        ..., min_length=1, description="Journal/conference name is required"
    )
    date: str = Field(..., description="Publication date in YYYY-MM-DD format")
    url: Optional[str] = Field(None, description="Publication URL")

    class Config:
        extra = "forbid"  # Reject any additional fields


class VolunteerExperienceSchema(BaseModel):
    """Schema for volunteer experience entries."""

    id: Optional[str] = Field(
        None, description="Unique identifier for the volunteer experience entry"
    )
    organization: str = Field(
        ..., min_length=1, description="Organization name is required"
    )
    role: str = Field(..., min_length=1, description="Role is required")
    location: Optional[str] = Field(None, description="Volunteer location")
    start_date: str = Field(..., description="Start date in YYYY-MM-DD format")
    end_date: Optional[str] = Field(None, description="End date in YYYY-MM-DD format")
    description: Optional[str] = Field(None, description="Description of volunteer work")

    class Config:
        extra = "forbid"  # Reject any additional fields


class SectionConfigSchema(BaseModel):
    """Schema for section configuration."""

    sections: List[dict] = Field(
        default_factory=list, description="Section configuration"
    )

    class Config:
        extra = "forbid"  # Reject any additional fields


class DraftSectionsSchema(BaseModel):
    """Schema for draft sections that haven't been committed yet."""

    why_good_fit: Optional[WhyGoodFitSchema] = None

    class Config:
        extra = "forbid"  # Reject any additional fields


class CVDataSchema(BaseModel):
    """Main schema for CV parsed data validation with proper type safety."""

    personal_info: Optional[PersonalInfoSchema] = None
    professional_summary: Optional[ProfessionalSummarySchema] = None
    why_good_fit: Optional[WhyGoodFitSchema] = None
    work_experience: List[WorkExperienceSchema] = Field(default_factory=list)
    education: List[EducationSchema] = Field(default_factory=list)
    skills: Optional[SkillsSchema] = None
    certifications: List[CertificationSchema] = Field(default_factory=list)
    projects: List[ProjectSchema] = Field(default_factory=list)
    awards: List[AwardSchema] = Field(default_factory=list)
    publications: List[PublicationSchema] = Field(default_factory=list)
    volunteer_experience: List[VolunteerExperienceSchema] = Field(default_factory=list)
    section_config: Optional[SectionConfigSchema] = None
    draft_sections: Optional[DraftSectionsSchema] = None

    class Config:
        extra = "forbid"  # Reject any additional fields for data integrity


class CVUpdateRequestSchema(BaseModel):
    """Schema for CV update requests"""

    parsed_data: CVDataSchema

    class Config:
        extra = "forbid"  # Reject any additional fields for data integrity
