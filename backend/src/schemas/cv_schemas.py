"""
Comprehensive Pydantic schemas for CV data validation with proper type safety.
"""
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import date


class PersonalInfoSchema(BaseModel):
    """Schema for personal information section."""
    full_name: str = Field(..., min_length=1, description="Full name is required")
    email: EmailStr = Field(..., description="Valid email address is required")
    phone: Optional[str] = Field(None, description="Phone number")
    location: str = Field(..., min_length=1, description="Location is required")
    linkedin_url: Optional[str] = Field(None, description="LinkedIn profile URL")
    website_url: Optional[str] = Field(None, description="Personal website URL")
    github_url: Optional[str] = Field(None, description="GitHub profile URL")


class ProfessionalSummarySchema(BaseModel):
    """Schema for professional summary section."""
    content: str = Field(..., min_length=10, description="Professional summary content")
    keywords: List[str] = Field(default_factory=list, description="Key skills/keywords")


class WorkExperienceSchema(BaseModel):
    """Schema for work experience entries."""
    company: str = Field(..., min_length=1, description="Company name is required")
    position: str = Field(..., min_length=1, description="Position title is required")
    start_date: str = Field(..., description="Start date in YYYY-MM format")
    end_date: Optional[str] = Field(None, description="End date in YYYY-MM format")
    current: bool = Field(default=False, description="Currently working here")
    description: Optional[str] = Field(None, description="Job description")
    achievements: List[str] = Field(default_factory=list, description="Key achievements")
    technologies: List[str] = Field(default_factory=list, description="Technologies used")


class EducationSchema(BaseModel):
    """Schema for education entries."""
    institution: str = Field(..., min_length=1, description="Institution name is required")
    degree: str = Field(..., min_length=1, description="Degree name is required")
    field_of_study: Optional[str] = Field(None, description="Field of study")
    start_date: str = Field(..., description="Start date in YYYY-MM format")
    end_date: Optional[str] = Field(None, description="End date in YYYY-MM format")
    gpa: Optional[str] = Field(None, description="GPA or grade")
    description: Optional[str] = Field(None, description="Additional details")
    achievements: List[str] = Field(default_factory=list, description="Academic achievements")
    honors: List[str] = Field(default_factory=list, description="Honors and awards")


class LanguageSchema(BaseModel):
    """Schema for language proficiency."""
    language: str = Field(..., min_length=1, description="Language name")
    proficiency: str = Field(..., min_length=1, description="Proficiency level")


class SkillsSchema(BaseModel):
    """Schema for skills section."""
    technical: List[str] = Field(default_factory=list, description="Technical skills")
    soft: List[str] = Field(default_factory=list, description="Soft skills")
    languages: List[LanguageSchema] = Field(default_factory=list, description="Language proficiencies")


class CertificationSchema(BaseModel):
    """Schema for certification entries."""
    name: str = Field(..., min_length=1, description="Certification name is required")
    issuer: str = Field(..., min_length=1, description="Issuing organization is required")
    date: str = Field(..., description="Issue date in YYYY-MM format")
    expiry_date: Optional[str] = Field(None, description="Expiry date in YYYY-MM format")
    description: Optional[str] = Field(None, description="Certification description")


class ProjectSchema(BaseModel):
    """Schema for project entries."""
    name: str = Field(..., min_length=1, description="Project name is required")
    description: str = Field(..., min_length=10, description="Project description is required")
    technologies: List[str] = Field(default_factory=list, description="Technologies used")
    url: Optional[str] = Field(None, description="Project URL")


class AwardSchema(BaseModel):
    """Schema for award entries."""
    name: str = Field(..., min_length=1, description="Award name is required")
    issuer: str = Field(..., min_length=1, description="Issuing organization is required")
    date: str = Field(..., description="Award date in YYYY-MM format")
    description: Optional[str] = Field(None, description="Award description")


class PublicationSchema(BaseModel):
    """Schema for publication entries."""
    title: str = Field(..., min_length=1, description="Publication title is required")
    authors: str = Field(..., min_length=1, description="Authors are required")
    journal: str = Field(..., min_length=1, description="Journal/conference name is required")
    date: str = Field(..., description="Publication date in YYYY-MM format")
    url: Optional[str] = Field(None, description="Publication URL")


class VolunteerExperienceSchema(BaseModel):
    """Schema for volunteer experience entries."""
    organization: str = Field(..., min_length=1, description="Organization name is required")
    role: str = Field(..., min_length=1, description="Role is required")
    start_date: str = Field(..., description="Start date in YYYY-MM format")
    end_date: Optional[str] = Field(None, description="End date in YYYY-MM format")
    description: Optional[str] = Field(None, description="Description of volunteer work")


class SectionConfigSchema(BaseModel):
    """Schema for section configuration."""
    sections: List[dict] = Field(default_factory=list, description="Section configuration")


class CVDataSchema(BaseModel):
    """Main schema for CV parsed data validation with proper type safety."""
    personal_info: Optional[PersonalInfoSchema] = None
    professional_summary: Optional[ProfessionalSummarySchema] = None
    work_experience: List[WorkExperienceSchema] = Field(default_factory=list)
    education: List[EducationSchema] = Field(default_factory=list)
    skills: Optional[SkillsSchema] = None
    certifications: List[CertificationSchema] = Field(default_factory=list)
    projects: List[ProjectSchema] = Field(default_factory=list)
    awards: List[AwardSchema] = Field(default_factory=list)
    publications: List[PublicationSchema] = Field(default_factory=list)
    volunteer_experience: List[VolunteerExperienceSchema] = Field(default_factory=list)
    section_config: Optional[SectionConfigSchema] = None

    class Config:
        extra = "ignore"  # Ignore extra fields that don't match our schema


class CVUpdateRequestSchema(BaseModel):
    """Schema for CV update requests"""
    parsed_data: CVDataSchema

    class Config:
        extra = "forbid"  # Prevent additional fields
