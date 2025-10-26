"""
Pydantic models for AI API endpoints.

This module contains all request and response models for AI-powered
CV section generation, content enhancement, and optimization features.
"""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel

from src.config import AIConfig


class AIGenerationRequest(BaseModel):
    job_description_id: str
    section_type: str = "why_good_fit"


class AISectionResponse(BaseModel):
    id: str
    cv_id: str
    job_description_id: str
    section_content: str
    section_type: str
    ai_model: str
    tokens_used: int
    generation_time: int
    created_at: str
    low_fit_warning: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class AISectionListResponse(BaseModel):
    ai_sections: List[AISectionResponse]


# Job Fit Analysis Models
class JobFitAnalysisRequest(BaseModel):
    job_description_id: str


class JobFitAnalysisResponse(BaseModel):
    model_config = {"protected_namespaces": ()}

    confidence_score: int
    fit_analysis: str
    key_matches: List[str]
    missing_skills: List[str]
    suggested_improvements: List[str]
    strengths: List[str]
    weaknesses: List[str]
    tokens_used: int
    generation_time: int
    model_used: str


# Content Enhancement Models
class ContentEnhancementRequest(BaseModel):
    original_content: str
    content_type: str = "bullet_point"


class ContentSuggestion(BaseModel):
    content: str
    improvements: List[str]
    confidence_score: int


class ContentEnhancementResponse(BaseModel):
    model_config = {"protected_namespaces": ()}

    suggestions: List[ContentSuggestion]
    overall_improvements: List[str]
    tokens_used: int
    generation_time: int
    model_used: str
    is_generating: bool = False
    generation_error: Optional[str] = None


class ContentEnhancementCreateResponse(BaseModel):
    enhancement_id: str
    is_generating: bool = True


# AI Enhancement Models (for Enhance CV functionality)
class AIEnhancementRequest(BaseModel):
    job_description_id: str


class AIEnhancementResponse(BaseModel):
    model_config = {"protected_namespaces": ()}

    id: str
    cv_id: str
    job_description_id: str
    enhancement_data: Optional[Dict] = None
    tokens_used: int = 0
    generation_time: int = 0
    model_used: Optional[str] = None
    is_generating: bool = False
    generation_error: Optional[str] = None
    created_at: str


class AIEnhancementCreateResponse(BaseModel):
    enhancement_id: str
    is_generating: bool = True


# ATS Optimization Models
class ATSOptimizationRequest(BaseModel):
    job_description_id: str


class MissingKeyword(BaseModel):
    """Represents a keyword identified in the job description but missing from the CV."""

    keyword: str
    importance: str
    frequency_in_jd: int
    suggested_placement: str


class KeywordDensity(BaseModel):
    """Tracks keyword density metrics for ATS optimization analysis."""

    current: float
    recommended: float
    status: str


class OptimizedSection(BaseModel):
    """Provides section-specific optimization suggestions for ATS compatibility."""

    section: str
    current_keywords: List[str]
    missing_keywords: List[str]
    suggestion: str


class ATSOptimizationResponse(BaseModel):
    model_config = {"protected_namespaces": ()}

    ats_score: int
    missing_keywords: List[MissingKeyword]
    keyword_density: Dict[str, KeywordDensity]
    suggestions: List[str]
    optimized_sections: List[OptimizedSection]
    strengths: List[str]
    weaknesses: List[str]
    tokens_used: int
    generation_time: int
    model_used: str


# Unified AI Suggestions Models
class GenerateSuggestionsRequest(BaseModel):
    job_description_id: str


class SkillSuggestion(BaseModel):
    """Represents a suggested skill to add to improve CV-job match."""

    skill: str
    reasoning: str


class SkillsSuggestions(BaseModel):
    """Groups skill suggestions by category (technical vs soft skills)."""

    technical: List[SkillSuggestion]
    soft: List[SkillSuggestion]


class ProfessionalSummarySuggestion(BaseModel):
    """Provides AI-generated professional summary with before/after comparison and key changes."""

    suggested_text: str
    original_text: str
    key_changes: List[str]


class AllSuggestionsResponse(BaseModel):
    skills: SkillsSuggestions
    professional_summary: ProfessionalSummarySuggestion


# Draft Management Models
class DraftCreateRequest(BaseModel):
    job_description_id: str


class DraftResponse(BaseModel):
    id: str
    cv_id: str
    job_description_id: str
    section_type: str
    draft_data: dict
    ai_model: str
    tokens_used: int
    generation_time: int
    created_at: str
    is_generating: bool = False
    generation_error: Optional[str] = None

    class Config:
        from_attributes = True


class DraftListResponse(BaseModel):
    drafts: List[DraftResponse]


class DraftApproveRequest(BaseModel):
    draft_id: str


# AI Suggestion Management Models
class AISuggestionCreate(BaseModel):
    cv_id: str
    job_description_id: Optional[str] = None
    original_content: str
    suggested_content: str
    content_type: str = "bullet_point"
    improvements: Optional[List[str]] = None
    confidence_score: Optional[int] = None
    section_path: Optional[str] = None
    ai_model: str = AIConfig.OPENAI_MODEL
    tokens_used: Optional[int] = None
    generation_time: Optional[int] = None


class AISuggestionAcceptRequest(BaseModel):
    suggestion_id: str
    is_accepted: bool = True
