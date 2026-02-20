"""
AI response schemas package: one submodule per prompt/feature.

Submodules:
- cv_parsing: CV parsing (personal_info, work_experience, education, skills, etc.)
- section_generation: Section generation (e.g. "Why I'm a Good Fit")
- job_extraction: Job description extraction from URL/text
- ai_suggestions: Job fit analysis and optimization suggestions

Import from the package: from src.schemas.ai_response_schemas import CVParsingResponseSchema
Or from a submodule: from src.schemas.ai_response_schemas.cv_parsing import CVParsingResponseSchema
"""

from .ai_suggestions import (
    AISuggestionsResponseSchema,
    HighScoreItemSchema,
    ItemDescriptionSuggestionSchema,
    ItemType,
    JobFitAnalysisResponseSchema,
    LowScoreItemSchema,
    OptimizationSuggestionsResponseSchema,
    ProfessionalSummarySuggestionSchema,
    SkillSuggestionSchema,
    SkillsSuggestionsSchema,
)
from .cv_parsing import (
    AwardItemSchema,
    CertificationItemSchema,
    CVParsingResponseSchema,
    CustomSectionItemSchema,
    EducationItemSchema,
    LanguageItemSchema,
    PersonalInfoResponseSchema,
    ProjectItemSchema,
    PublicationItemSchema,
    SkillsResponseSchema,
    VolunteerItemSchema,
    WorkExperienceItemSchema,
)
from .job_extraction import JobExtractionResponseSchema
from .section_generation import CVSectionGenerationResponseSchema

__all__ = [
    "AISuggestionsResponseSchema",
    "AwardItemSchema",
    "CertificationItemSchema",
    "CVSectionGenerationResponseSchema",
    "CVParsingResponseSchema",
    "CustomSectionItemSchema",
    "EducationItemSchema",
    "HighScoreItemSchema",
    "ItemDescriptionSuggestionSchema",
    "ItemType",
    "JobExtractionResponseSchema",
    "JobFitAnalysisResponseSchema",
    "LanguageItemSchema",
    "LowScoreItemSchema",
    "OptimizationSuggestionsResponseSchema",
    "PersonalInfoResponseSchema",
    "ProfessionalSummarySuggestionSchema",
    "ProjectItemSchema",
    "PublicationItemSchema",
    "SkillSuggestionSchema",
    "SkillsResponseSchema",
    "SkillsSuggestionsSchema",
    "VolunteerItemSchema",
    "WorkExperienceItemSchema",
]
