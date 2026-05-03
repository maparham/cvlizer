"""
Relaxed Pydantic schemas for CV update (PUT) requests only.

Uses explicit relaxed subclasses that override required/min_length/email fields
with permissive defaults so saves always pass.
The strict schema in cv_schemas.py is used only for advisory validation errors.
"""

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field

from src.schemas.cv_schemas import (
    AwardSchema,
    CertificationSchema,
    CustomSectionSchema,
    EducationSchema,
    PersonalInfoSchema,
    ProjectSchema,
    PublicationSchema,
    SectionConfigSchema,
    SkillsSchema,
    VolunteerExperienceSchema,
    WorkExperienceSchema,
)


class PersonalInfoSchemaRelaxed(PersonalInfoSchema):
    """Relaxed personal info: allow empty required fields (and non-email email)."""

    full_name: str = Field(default="")
    email: str = Field(default="")
    location: str = Field(default="")
    profile_picture_url: Optional[str] = Field(
        None,
        description="Accepted for compatibility; not persisted. Canonical field is profile_picture (filename only).",
    )
    profile_picture_size: Optional[Literal["small", "standard", "large"]] = Field(
        default="standard",
        description="Display size for profile picture: small (80px), standard (96px), large (128px)",
    )


class CustomSectionSchemaRelaxed(CustomSectionSchema):
    """Relaxed custom section: allow empty id/title."""

    id: str = Field(default="")
    title: str = Field(default="")


class WorkExperienceSchemaRelaxed(WorkExperienceSchema):
    """Relaxed work experience: allow empty required fields."""

    company: str = Field(default="")
    position: str = Field(default="")
    start_date: str = Field(default="")


class EducationSchemaRelaxed(EducationSchema):
    """Relaxed education: allow empty required fields."""

    institution: str = Field(default="")
    degree: str = Field(default="")
    start_date: str = Field(default="")


class CertificationSchemaRelaxed(CertificationSchema):
    """Relaxed certification: allow empty required fields."""

    name: str = Field(default="")
    issuer: str = Field(default="")
    date: str = Field(default="")


class ProjectSchemaRelaxed(ProjectSchema):
    """Relaxed project: allow empty required fields."""

    name: str = Field(default="")
    description: str = Field(default="")


class AwardSchemaRelaxed(AwardSchema):
    """Relaxed award: allow empty required fields."""

    name: str = Field(default="")
    issuer: str = Field(default="")
    date: str = Field(default="")


class PublicationSchemaRelaxed(PublicationSchema):
    """Relaxed publication: allow empty required fields."""

    title: str = Field(default="")
    authors: str = Field(default="")
    journal: str = Field(default="")
    date: str = Field(default="")


class VolunteerExperienceSchemaRelaxed(VolunteerExperienceSchema):
    """Relaxed volunteer experience: allow empty required fields."""

    organization: str = Field(default="")
    role: str = Field(default="")
    start_date: str = Field(default="")


class SkillsSchemaRelaxed(SkillsSchema):
    """Relaxed skills schema."""


class CVUpdateDataSchema(BaseModel):
    """Relaxed CV data schema for PUT body only; save always passes."""

    personal_info: Optional[PersonalInfoSchemaRelaxed] = None
    custom_sections: List[CustomSectionSchemaRelaxed] = Field(default_factory=list)
    why_good_fit_metadata: Optional[Dict[str, Any]] = None
    work_experience: List[WorkExperienceSchemaRelaxed] = Field(default_factory=list)
    education: List[EducationSchemaRelaxed] = Field(default_factory=list)
    skills: Optional[SkillsSchemaRelaxed] = None
    certifications: List[CertificationSchemaRelaxed] = Field(default_factory=list)
    projects: List[ProjectSchemaRelaxed] = Field(default_factory=list)
    awards: List[AwardSchemaRelaxed] = Field(default_factory=list)
    publications: List[PublicationSchemaRelaxed] = Field(default_factory=list)
    volunteer_experience: List[VolunteerExperienceSchemaRelaxed] = Field(
        default_factory=list
    )
    section_config: Optional[SectionConfigSchema] = None
    draft_sections: Optional[Dict[str, Any]] = None

    class Config:
        extra = "forbid"


class CVUpdateRequestSchema(BaseModel):
    """Request body for CV update (PUT); uses relaxed schema so save always passes."""

    parsed_data: CVUpdateDataSchema

    class Config:
        extra = "forbid"
