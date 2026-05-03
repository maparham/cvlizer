"""
Pydantic schemas for CV parsing AI response validation.

Used by the CV parsing prompt to constrain and validate structured output
(personal_info, work_experience, education, skills, etc.).
"""

from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field, field_validator

from src.schemas.cv_schemas import LEGACY_FLAT_TECHNICAL_SKILLS_CATEGORY


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
    profile_picture: Optional[str] = Field(
        default=None,
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


class CustomSectionItemSchema(BaseModel):
    """Schema for one custom section in CV parsing response (title + content from AI)."""

    title: str = Field(default="", description="Section heading from the CV")
    content: str = Field(default="", description="Section body in markdown")
    type: Literal["professional_summary", "cover_letter"] = Field(
        default="professional_summary",
        description="Section type: professional_summary or cover_letter",
    )


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


class SkillsResponseSchema(BaseModel):
    """Schema for skills section in AI parsing response.

    All skills should be grouped into dynamic categories chosen by the AI.
    """

    technical: Dict[str, List[str]] = Field(
        default_factory=dict,
        description="All skills grouped by dynamic category name",
    )

    @field_validator("technical", mode="before")
    @classmethod
    def normalize_technical(
        cls, v: Dict[str, List[str]] | List[str] | List[Dict[str, object]] | object
    ) -> Dict[str, List[str]]:
        """Normalize skills to internal dictionary format.

        Flat lists of strings (legacy or malformed model output) map to one
        category so parsed skills are not discarded.
        """
        if isinstance(v, dict):
            normalized: Dict[str, List[str]] = {}
            for category, skills in v.items():
                if not isinstance(category, str) or not category.strip():
                    continue
                if not isinstance(skills, list):
                    continue
                cleaned = [
                    skill.strip()
                    for skill in skills
                    if isinstance(skill, str) and skill.strip()
                ]
                if cleaned:
                    normalized[category.strip()] = cleaned
            return normalized
        if isinstance(v, list):
            flat_skills = [
                skill.strip() for skill in v if isinstance(skill, str) and skill.strip()
            ]
            if flat_skills:
                return {LEGACY_FLAT_TECHNICAL_SKILLS_CATEGORY: flat_skills}
            return {}
        return {}


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
    custom_sections: List[CustomSectionItemSchema] = Field(
        default_factory=list,
        description="Sections that do not match predefined types (e.g. Summary, References, Hobbies)",
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
