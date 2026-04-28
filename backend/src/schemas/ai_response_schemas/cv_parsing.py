"""
Pydantic schemas for CV parsing AI response validation.

Used by the CV parsing prompt to constrain and validate structured output
(personal_info, work_experience, education, skills, etc.).
"""

from typing import Dict, List, Literal, Optional, Union

from pydantic import BaseModel, Field, field_validator

from src.constants import LANGUAGE_PROFICIENCY_MAP, LANGUAGE_PROFICIENCY_VALUES


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


# Allowed proficiency values (must match frontend Language type and cv_parsing_service)
LanguageProficiencyLiteral = Literal[
    "Basic", "Intermediate", "Advanced", "Fluent", "Native"
]


class LanguageItemSchema(BaseModel):
    """Schema for language proficiency entry."""

    language: str = Field(default="")
    proficiency: LanguageProficiencyLiteral = Field(default="Intermediate")

    @field_validator("proficiency", mode="before")
    @classmethod
    def coerce_proficiency(cls, v: object) -> LanguageProficiencyLiteral:
        """Coerce raw strings to allowed enum; unknown values fall back to Intermediate."""
        if v in LANGUAGE_PROFICIENCY_VALUES:
            return v  # type: ignore[return-value]
        if not isinstance(v, str) or not v.strip():
            return "Intermediate"
        key = v.strip().lower()
        return LANGUAGE_PROFICIENCY_MAP.get(key, "Intermediate")  # type: ignore[return-value]


class TechnicalCategoryItemSchema(BaseModel):
    """Schema for one technical skill category in AI parsing response."""

    category: str = Field(..., min_length=1, description="Technical skill category name")
    skills: List[str] = Field(
        ..., min_length=1, description="Skills that belong to this category"
    )


class SkillsResponseSchema(BaseModel):
    """Schema for skills section in AI parsing response.

    Technical skills should be categorized by the AI into logical groups
    relevant to the user's field (e.g., Programming Languages, DevOps, Databases).
    """

    technical: List[TechnicalCategoryItemSchema] = Field(
        default_factory=list,
        description="Technical skills grouped by category (e.g., [{'category': 'Programming Languages', 'skills': ['Python', 'JavaScript']}])",
    )
    soft: List[str] = Field(default_factory=list, description="Soft skills")
    languages: List[LanguageItemSchema] = Field(
        default_factory=list, description="Language proficiencies"
    )

    @field_validator("technical", mode="before")
    @classmethod
    def normalize_technical(
        cls, v: Union[Dict[str, List[str]], List[str], List[Dict[str, object]], object]
    ) -> List[Dict[str, List[str]]]:
        """Normalize technical skills to list-of-categories format."""
        if isinstance(v, dict):
            return [
                {
                    "category": category.strip(),
                    "skills": [
                        skill.strip()
                        for skill in skills
                        if isinstance(skill, str) and skill.strip()
                    ],
                }
                for category, skills in v.items()
                if isinstance(category, str)
                and category.strip()
                and isinstance(skills, list)
                and any(isinstance(skill, str) and skill.strip() for skill in skills)
            ]
        if isinstance(v, list) and v and all(isinstance(item, str) for item in v):
            skills = [
                skill.strip() for skill in v if isinstance(skill, str) and skill.strip()
            ]
            return [{"category": "Technical", "skills": skills}] if skills else []
        if isinstance(v, list):
            return v
        return []

    @field_validator("soft", mode="before")
    @classmethod
    def validate_soft_format(cls, v: List[str]) -> List[str]:
        """Validate that soft skills are strings."""
        if not isinstance(v, list):
            return []
        return [skill.strip() for skill in v if isinstance(skill, str) and skill.strip()]

    def to_dict_format(self) -> Dict[str, List[str]]:
        """Convert technical categories list to internal dictionary format."""
        return {category.category: category.skills for category in self.technical}


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
