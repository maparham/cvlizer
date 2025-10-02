"""
AI-powered CV section generation API endpoints.

This module provides endpoints for generating AI-enhanced CV sections
based on job descriptions using OpenAI's GPT models.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict
from pydantic import BaseModel
import uuid

from ..models.base import get_db
from ..models.user import User
from ..models.cv import CV
from ..models.job_description import JobDescription
from ..services.job_description_service import get_cv_owned_by, get_job_description_by_id
from ..models.ai_section import AISection
from ..models.ai_draft import AIDraft
from ..services.ai_service import (
    generate_cv_section, 
    is_ai_enabled, 
    analyze_job_fit, 
    enhance_content, 
    analyze_ats_optimization,
    generate_all_suggestions
)
from ..middleware.clerk_auth import get_effective_user

router = APIRouter(prefix="/api", tags=["ai"])


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

    class Config:
        from_attributes = True


class AISectionListResponse(BaseModel):
    ai_sections: List[AISectionResponse]


# Job Fit Analysis Models
class JobFitAnalysisRequest(BaseModel):
    job_description_id: str


class JobFitAnalysisResponse(BaseModel):
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
    suggestions: List[ContentSuggestion]
    overall_improvements: List[str]
    tokens_used: int
    generation_time: int
    model_used: str


# ATS Optimization Models
class ATSOptimizationRequest(BaseModel):
    job_description_id: str


class MissingKeyword(BaseModel):
    keyword: str
    importance: str
    frequency_in_jd: int
    suggested_placement: str


class KeywordDensity(BaseModel):
    current: float
    recommended: float
    status: str


class OptimizedSection(BaseModel):
    section: str
    current_keywords: List[str]
    missing_keywords: List[str]
    suggestion: str


class ATSOptimizationResponse(BaseModel):
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
    skill: str
    reasoning: str


class SkillsSuggestions(BaseModel):
    technical: List[SkillSuggestion]
    soft: List[SkillSuggestion]


class ProfessionalSummarySuggestion(BaseModel):
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

    class Config:
        from_attributes = True


class DraftListResponse(BaseModel):
    drafts: List[DraftResponse]


class DraftApproveRequest(BaseModel):
    draft_id: str


@router.post("/cvs/{cv_id}/generate-section", response_model=AISectionResponse)
async def generate_ai_section(
    cv_id: str,
    request: AIGenerationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user)
):
    """Generate AI-enhanced section for CV based on job description"""
    # Verify CV exists and belongs to user
    cv = get_cv_owned_by(db, cv_id, str(current_user.id))
    
    if not cv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CV not found"
        )
    
    # Verify job description exists (global lookup)
    job_description = get_job_description_by_id(db, request.job_description_id)
    
    if not job_description:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job description not found"
        )
    
    try:
        if not is_ai_enabled():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="AI features are disabled"
            )
        # Generate AI section
        ai_result = await generate_cv_section(
            cv_data=cv.parsed_data,
            job_description=job_description.content,
            section_type=request.section_type
        )
        
        # Check if AI generation failed
        if ai_result.get("error"):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"AI service error: {ai_result['error']}"
            )
        
        # Save AI section to database
        ai_section = AISection(
            cv_id=cv_id,
            job_description_id=request.job_description_id,
            section_content=ai_result["section_content"],
            section_type=request.section_type,
            generation_prompt=f"Generate {request.section_type} section",
            ai_model=ai_result.get("model_used", "gpt-4o-mini"),
            tokens_used=ai_result.get("tokens_used", 0),
            generation_time=ai_result.get("generation_time", 0)
        )
        
        db.add(ai_section)
        db.commit()
        db.refresh(ai_section)
        
        return AISectionResponse(
            id=str(ai_section.id),
            cv_id=str(ai_section.cv_id),
            job_description_id=str(ai_section.job_description_id),
            section_content=ai_section.section_content,
            section_type=ai_section.section_type,
            ai_model=ai_section.ai_model,
            tokens_used=ai_section.tokens_used or 0,
            generation_time=ai_section.generation_time or 0,
            created_at=ai_section.created_at.isoformat()
        )
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating AI section: {str(e)}"
        )


@router.get("/cvs/{cv_id}/ai-sections", response_model=AISectionListResponse)
async def get_ai_sections(
    cv_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user)
):
    """Get all AI-generated sections for a CV"""
    # Verify CV exists and belongs to user
    cv = db.query(CV).filter(
        CV.id == cv_id,
        CV.user_id == current_user.id
    ).first()
    
    if not cv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CV not found"
        )
    
    # Get AI sections
    ai_sections = db.query(AISection).filter(
        AISection.cv_id == cv_id,
        AISection.is_active == True
    ).all()
    
    ai_responses = [
        AISectionResponse(
            id=str(ai.id),
            cv_id=str(ai.cv_id),
            job_description_id=str(ai.job_description_id),
            section_content=ai.section_content,
            section_type=ai.section_type,
            ai_model=ai.ai_model,
            tokens_used=ai.tokens_used or 0,
            generation_time=ai.generation_time or 0,
            created_at=ai.created_at.isoformat()
        )
        for ai in ai_sections
    ]
    
    return AISectionListResponse(ai_sections=ai_responses)


@router.post("/cvs/{cv_id}/enhance-content", response_model=ContentEnhancementResponse)
async def enhance_content_endpoint(
    cv_id: str,
    request: ContentEnhancementRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user)
):
    """Enhance a piece of content with AI suggestions"""
    # Verify CV exists and belongs to user
    cv = get_cv_owned_by(db, cv_id, str(current_user.id))
    
    if not cv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CV not found"
        )
    
    try:
        if not is_ai_enabled():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="AI features are disabled"
            )
        
        # Enhance content
        enhancement_result = await enhance_content(
            original_content=request.original_content,
            content_type=request.content_type
        )
        
        # Check if enhancement failed
        if enhancement_result.get("error"):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"AI service error: {enhancement_result['error']}"
            )
        
        # Convert suggestions to proper format
        suggestions = []
        for suggestion in enhancement_result.get("suggestions", []):
            suggestions.append(ContentSuggestion(
                content=suggestion.get("content", ""),
                improvements=suggestion.get("improvements", []),
                confidence_score=suggestion.get("confidence_score", 0)
            ))
        
        return ContentEnhancementResponse(
            suggestions=suggestions,
            overall_improvements=enhancement_result.get("overall_improvements", []),
            tokens_used=enhancement_result.get("tokens_used", 0),
            generation_time=enhancement_result.get("generation_time", 0),
            model_used=enhancement_result.get("model_used", "gpt-4o-mini")
        )
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error enhancing content: {str(e)}"
        )


@router.post("/cvs/{cv_id}/optimize-ats", response_model=ATSOptimizationResponse)
async def optimize_ats_endpoint(
    cv_id: str,
    request: ATSOptimizationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user)
):
    """Analyze CV for ATS optimization against job description"""
    # Verify CV exists and belongs to user
    cv = get_cv_owned_by(db, cv_id, str(current_user.id))
    
    if not cv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CV not found"
        )
    
    # Verify job description exists (global lookup)
    job_description = get_job_description_by_id(db, request.job_description_id)
    
    if not job_description:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job description not found"
        )
    
    try:
        if not is_ai_enabled():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="AI features are disabled"
            )
        
        # Analyze ATS optimization
        optimization_result = await analyze_ats_optimization(
            cv_data=cv.parsed_data,
            job_description=job_description.content
        )
        
        # Check if analysis failed
        if optimization_result.get("error"):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"AI service error: {optimization_result['error']}"
            )
        
        # Convert missing keywords to proper format
        missing_keywords = []
        for keyword in optimization_result.get("missing_keywords", []):
            missing_keywords.append(MissingKeyword(
                keyword=keyword.get("keyword", ""),
                importance=keyword.get("importance", "medium"),
                frequency_in_jd=keyword.get("frequency_in_jd", 0),
                suggested_placement=keyword.get("suggested_placement", "")
            ))
        
        # Convert keyword density to proper format
        keyword_density = {}
        for keyword, density_data in optimization_result.get("keyword_density", {}).items():
            keyword_density[keyword] = KeywordDensity(
                current=density_data.get("current", 0.0),
                recommended=density_data.get("recommended", 0.0),
                status=density_data.get("status", "unknown")
            )
        
        # Convert optimized sections to proper format
        optimized_sections = []
        for section in optimization_result.get("optimized_sections", []):
            optimized_sections.append(OptimizedSection(
                section=section.get("section", ""),
                current_keywords=section.get("current_keywords", []),
                missing_keywords=section.get("missing_keywords", []),
                suggestion=section.get("suggestion", "")
            ))
        
        return ATSOptimizationResponse(
            ats_score=optimization_result.get("ats_score", 0),
            missing_keywords=missing_keywords,
            keyword_density=keyword_density,
            suggestions=optimization_result.get("suggestions", []),
            optimized_sections=optimized_sections,
            strengths=optimization_result.get("strengths", []),
            weaknesses=optimization_result.get("weaknesses", []),
            tokens_used=optimization_result.get("tokens_used", 0),
            generation_time=optimization_result.get("generation_time", 0),
            model_used=optimization_result.get("model_used", "gpt-4o-mini")
        )
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error analyzing ATS optimization: {str(e)}"
        )


@router.post("/cvs/{cv_id}/ai-suggestions/generate", response_model=AllSuggestionsResponse)
async def generate_all_suggestions_endpoint(
    cv_id: str,
    request: GenerateSuggestionsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user)
):
    """Generate ALL AI suggestions for CV based on job description in one call"""
    # Verify CV exists and belongs to user
    cv = get_cv_owned_by(db, cv_id, str(current_user.id))
    
    if not cv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CV not found"
        )
    
    # Verify job description exists (global lookup)
    job_description = get_job_description_by_id(db, request.job_description_id)
    
    if not job_description:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job description not found"
        )
    
    try:
        # Call AI service to get ALL suggestions in one call
        # Don't fail the request if AI is disabled or errors - return empty structures
        if not is_ai_enabled():
            return AllSuggestionsResponse(
                skills=SkillsSuggestions(technical=[], soft=[]),
                professional_summary=ProfessionalSummarySuggestion(
                    suggested_text="",
                    original_text="",
                    key_changes=[]
                )
            )
        
        suggestions_result = await generate_all_suggestions(
            cv_data=cv.parsed_data or {},
            job_description=job_description.content
        )
        
        # Convert to response format
        technical_suggestions = []
        for suggestion in suggestions_result.get("skills", {}).get("technical", []):
            technical_suggestions.append(SkillSuggestion(
                skill=suggestion.get("skill", ""),
                reasoning=suggestion.get("reasoning", "")
            ))
        
        soft_suggestions = []
        for suggestion in suggestions_result.get("skills", {}).get("soft", []):
            soft_suggestions.append(SkillSuggestion(
                skill=suggestion.get("skill", ""),
                reasoning=suggestion.get("reasoning", "")
            ))
        
        summary_data = suggestions_result.get("professional_summary", {})
        professional_summary = ProfessionalSummarySuggestion(
            suggested_text=summary_data.get("suggested_text", ""),
            original_text=summary_data.get("original_text", ""),
            key_changes=summary_data.get("key_changes", [])
        )
        
        return AllSuggestionsResponse(
            skills=SkillsSuggestions(
                technical=technical_suggestions,
                soft=soft_suggestions
            ),
            professional_summary=professional_summary
        )
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        # For any other errors, return empty structures (graceful degradation)
        # Log the error but don't fail the request
        return AllSuggestionsResponse(
            skills=SkillsSuggestions(technical=[], soft=[]),
            professional_summary=ProfessionalSummarySuggestion(
                suggested_text="",
                original_text="",
                key_changes=[]
            )
        )


# Draft Management Endpoints
@router.post("/cvs/{cv_id}/analyze-job-fit", response_model=DraftResponse)
async def create_job_fit_draft(
    cv_id: str,
    request: DraftCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user)
):
    """Create a draft job fit analysis for a CV based on job description"""
    # Verify CV exists and belongs to user
    cv = get_cv_owned_by(db, cv_id, str(current_user.id))
    
    if not cv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CV not found"
        )
    
    # Verify job description exists (global lookup)
    job_description = get_job_description_by_id(db, request.job_description_id)
    
    if not job_description:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job description not found"
        )
    
    try:
        if not is_ai_enabled():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="AI features are disabled"
            )
        
        # Generate job fit analysis
        analysis_result = await analyze_job_fit(
            cv_data=cv.parsed_data,
            job_description=job_description.content
        )
        
        # Check if analysis failed
        if analysis_result.get("error"):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"AI service error: {analysis_result['error']}"
            )
        
        # Create draft data with proper schema
        from datetime import datetime
        draft_data = {
            "content": analysis_result.get("fit_analysis", ""),
            "confidence_score": analysis_result.get("confidence_score", 0),
            "fit_analysis": analysis_result.get("fit_analysis", ""),
            "key_matches": analysis_result.get("key_matches", []),
            "missing_skills": analysis_result.get("missing_skills", []),
            "suggested_improvements": analysis_result.get("suggested_improvements", []),
            "strengths": analysis_result.get("strengths", []),
            "weaknesses": analysis_result.get("weaknesses", []),
            "tokens_used": analysis_result.get("tokens_used", 0),
            "generation_time": analysis_result.get("generation_time", 0),
            "model_used": analysis_result.get("model_used", "gpt-4o-mini"),
            "generated_at": datetime.utcnow().isoformat(),
            "job_description_id": request.job_description_id
        }
        
        # Delete any existing draft for this CV and section type
        existing_draft = db.query(AIDraft).filter(
            AIDraft.cv_id == cv_id,
            AIDraft.section_type == "why_good_fit"
        ).first()
        
        if existing_draft:
            db.delete(existing_draft)
        
        # Create new draft
        draft = AIDraft(
            cv_id=cv_id,
            job_description_id=request.job_description_id,
            section_type="why_good_fit",
            draft_data=draft_data,
            ai_model=analysis_result.get("model_used", "gpt-4o-mini"),
            tokens_used=analysis_result.get("tokens_used", 0),
            generation_time=analysis_result.get("generation_time", 0)
        )
        
        db.add(draft)
        db.commit()
        db.refresh(draft)
        
        return DraftResponse(
            id=str(draft.id),
            cv_id=str(draft.cv_id),
            job_description_id=str(draft.job_description_id),
            section_type=draft.section_type,
            draft_data=draft.draft_data,
            ai_model=draft.ai_model,
            tokens_used=draft.tokens_used or 0,
            generation_time=draft.generation_time or 0,
            created_at=draft.created_at.isoformat()
        )
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating job fit draft: {str(e)}"
        )


@router.get("/cvs/{cv_id}/drafts", response_model=DraftListResponse)
async def get_cv_drafts(
    cv_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user)
):
    """Get all drafts for a CV"""
    # Verify CV exists and belongs to user
    cv = get_cv_owned_by(db, cv_id, str(current_user.id))
    
    if not cv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CV not found"
        )
    
    # Get drafts
    drafts = db.query(AIDraft).filter(
        AIDraft.cv_id == cv_id
    ).all()
    
    draft_responses = [
        DraftResponse(
            id=str(draft.id),
            cv_id=str(draft.cv_id),
            job_description_id=str(draft.job_description_id),
            section_type=draft.section_type,
            draft_data=draft.draft_data,
            ai_model=draft.ai_model,
            tokens_used=draft.tokens_used or 0,
            generation_time=draft.generation_time or 0,
            created_at=draft.created_at.isoformat()
        )
        for draft in drafts
    ]
    
    return DraftListResponse(drafts=draft_responses)


@router.post("/cvs/{cv_id}/why_good_fit/approve")
async def approve_why_good_fit_draft(
    cv_id: str,
    request: DraftApproveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user)
):
    """Approve a why_good_fit draft and move it to parsed_data"""
    # Verify CV exists and belongs to user
    cv = get_cv_owned_by(db, cv_id, str(current_user.id))
    
    if not cv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CV not found"
        )
    
    # Find the draft
    draft = db.query(AIDraft).filter(
        AIDraft.id == request.draft_id,
        AIDraft.cv_id == cv_id,
        AIDraft.section_type == "why_good_fit"
    ).first()
    
    if not draft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Draft not found"
        )
    
    try:
        # Update CV parsed_data with the draft content
        if not cv.parsed_data:
            cv.parsed_data = {}
        
        # Move draft to parsed_data.why_good_fit
        # Create a copy to ensure SQLAlchemy detects the change
        updated_parsed_data = dict(cv.parsed_data) if cv.parsed_data else {}
        updated_parsed_data["why_good_fit"] = draft.draft_data
        
        # Update section configuration to position why_good_fit after personal_info (order 2)
        if "section_config" not in updated_parsed_data:
            updated_parsed_data["section_config"] = {"sections": []}
        
        # Remove existing why_good_fit section if it exists
        sections = [s for s in updated_parsed_data["section_config"]["sections"] if s.get("type") != "why_good_fit"]
        
        # Add why_good_fit section with order 2 (after personal_info)
        why_good_fit_section = {
            "id": "why_good_fit",
            "type": "why_good_fit", 
            "title": "Why I'm a Good Fit",
            "visible": True,
            "order": 2
        }
        sections.append(why_good_fit_section)
        
        # Reorder all sections to account for the new positioning
        # personal_info (1), why_good_fit (2), professional_summary (3), work_experience (4), education (5), skills (6), etc.
        section_order_map = {
            "personal_info": 1,
            "why_good_fit": 2,
            "professional_summary": 3,
            "work_experience": 4,
            "education": 5,
            "skills": 6,
            "certifications": 7,
            "projects": 8,
            "awards": 9,
            "publications": 10,
            "volunteer_experience": 11
        }
        
        # Update order for all sections
        for section in sections:
            section_type = section.get("type")
            if section_type in section_order_map:
                section["order"] = section_order_map[section_type]
        
        # Sort sections by order
        sections.sort(key=lambda x: x.get("order", 999))
        updated_parsed_data["section_config"]["sections"] = sections
        
        cv.parsed_data = updated_parsed_data
        
        # Explicitly mark the field as modified for SQLAlchemy
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(cv, 'parsed_data')
        
        # Update CV and delete draft in the same transaction
        db.delete(draft)
        db.commit()
        db.refresh(cv)
        
        return {"message": "Draft approved and committed successfully", "cv": cv.to_response_dict()}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error approving draft: {str(e)}"
        )


@router.delete("/cvs/{cv_id}/why_good_fit/draft")
async def delete_why_good_fit_draft(
    cv_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user)
):
    """Delete the why_good_fit draft for a CV"""
    # Verify CV exists and belongs to user
    cv = get_cv_owned_by(db, cv_id, str(current_user.id))
    
    if not cv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CV not found"
        )
    
    # Find the draft
    draft = db.query(AIDraft).filter(
        AIDraft.cv_id == cv_id,
        AIDraft.section_type == "why_good_fit"
    ).first()
    
    if not draft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No draft found for this CV"
        )
    
    try:
        # Delete the draft
        db.delete(draft)
        db.commit()
        
        return {"message": "Draft deleted successfully"}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting draft: {str(e)}"
        )
