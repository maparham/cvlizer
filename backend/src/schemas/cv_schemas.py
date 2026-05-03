"""
Comprehensive Pydantic schemas for CV data validation with proper type safety.
"""

from datetime import date
from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator

from src.config import AIConfig


class PersonalInfoSchema(BaseModel):
    """Schema for personal information section."""

    full_name: str = Field(..., min_length=1, description="Full name is required")
    academic_title: Optional[str] = Field(
        None, description="Academic title (e.g., Dr., Prof., Dr.techn.)"
    )
    email: EmailStr = Field(..., description="Valid email address is required")
    phone: Optional[str] = Field(None, description="Phone number")
    location: str = Field(..., min_length=1, description="Location is required")
    linkedin_url: Optional[str] = Field(None, description="LinkedIn profile URL")
    website_url: Optional[str] = Field(None, description="Personal website URL")
    github_url: Optional[str] = Field(None, description="GitHub profile URL")
    description: Optional[str] = Field(None, description="Personal description or bio")
    description_center_align: Optional[bool] = Field(
        False, description="Center align description"
    )
    show_horizontal_line: Optional[bool] = Field(
        False, description="Show horizontal line separator"
    )
    profile_picture: Optional[str] = Field(
        None,
        description="Stored profile picture filename (set via upload endpoint)",
    )
    profile_picture_shape: Optional[Literal["circle", "square"]] = Field(
        default="circle",
        description="Profile picture display shape",
    )
    profile_picture_size: Optional[Literal["small", "standard", "large"]] = Field(
        default="standard",
        description="Display size for profile picture: small (80px), standard (96px), large (128px)",
    )

    class Config:
        extra = "forbid"  # Reject any additional fields


class CustomSectionSchema(BaseModel):
    """Schema for a user-defined or AI-extracted custom section (title + content)."""

    id: str = Field(..., min_length=1, description="Stable UUID for this section")
    title: str = Field(
        ...,
        min_length=1,
        description="Section title (e.g. Professional Summary, Hobbies)",
    )
    content: str = Field(default="", description="Section content in markdown")
    type: Literal["professional_summary", "cover_letter"] = Field(
        default="professional_summary",
        description="Immutable section type; professional_summary or cover_letter",
    )

    class Config:
        extra = "forbid"  # Reject any additional fields


class WhyGoodFitSchema(BaseModel):
    """Schema for validating why_good_fit draft payload (content + title + metadata)."""

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
    title: Optional[str] = Field(
        None, description="Dynamic title from AI generation (e.g., 'Hello Company Name!')"
    )


class WhyGoodFitMetadataSchema(BaseModel):
    """Metadata for the why_good_fit section (content/title live in custom_sections)."""

    model_config = {"protected_namespaces": (), "extra": "forbid"}

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
    academic_title: Optional[str] = Field(
        None, description="Academic degree/title (e.g., Dr., Prof.)"
    )
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


class SkillsSchema(BaseModel):
    """Schema for skills section.

    All skills are represented as dynamically categorized technical buckets.
    """

    technical: Dict[str, List[str]] = Field(
        default_factory=dict,
        description="Skills grouped by dynamic category name",
    )

    @field_validator("technical", mode="before")
    @classmethod
    def validate_technical_format(
        cls, v: Dict[str, List[str]] | List[str] | object
    ) -> Dict[str, List[str]]:
        """Validate skills format with non-empty category names and skill values."""
        if isinstance(v, dict):
            validated_dict = {}
            for category, skills in v.items():
                if not isinstance(category, str) or not category.strip():
                    continue
                if not isinstance(skills, list) or not skills:
                    continue
                validated_skills = [
                    skill.strip()
                    for skill in skills
                    if isinstance(skill, str) and skill.strip()
                ]
                if validated_skills:
                    validated_dict[category.strip()] = validated_skills
            return validated_dict
        return {}

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

    personal_info: PersonalInfoSchema
    custom_sections: List[CustomSectionSchema] = Field(
        default_factory=list,
        description="User-defined or AI-extracted sections (e.g. Professional Summary, References)",
    )
    why_good_fit_metadata: Optional[WhyGoodFitMetadataSchema] = None
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


class CVValidationRequestSchema(BaseModel):
    """Schema for validating CV data (advisory only). Not used for PUT body."""

    parsed_data: CVDataSchema

    class Config:
        extra = "forbid"  # Reject any additional fields for data integrity
