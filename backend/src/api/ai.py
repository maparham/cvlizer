"""
AI-powered CV section generation API endpoints.

This module provides endpoints for generating AI-enhanced CV sections
based on job descriptions using OpenAI's GPT models.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Optional
from pydantic import BaseModel
import uuid
import asyncio

from src.models.base import get_db
from src.models.user import User
from src.models.cv import CV
from src.models.job_description import JobDescription
from src.services.job_description_service import get_cv_owned_by, get_job_description_by_id
from src.models.ai_section import AISection
from src.models.ai_draft import AIDraft
from src.config import AIConfig
from src.models.content_enhancement import ContentEnhancement
from src.models.ai_enhancement import AIEnhancement
from src.services.ai_service import (
    generate_cv_section, 
    is_ai_enabled, 
    analyze_job_fit, 
    enhance_content,
    analyze_ats_optimization,
    create_optimization_suggestions
)
from src.middleware.clerk_auth import get_effective_user
from src.utils.background_tasks import run_task_in_background
from src.models.base import SessionLocal
from src.schemas.cv_schemas import WhyGoodFitSchema
from datetime import datetime, timezone

router = APIRouter(prefix="/api", tags=["ai"])


def enhance_content_sync(task_id: str, original_content: str, content_type: str, user_id: str, cv_id: str):
    """Synchronous content enhancement function to run in thread pool"""
    import logging
    logger = logging.getLogger(__name__)

    db = SessionLocal()
    try:
        # Enhance content (run async function in sync context)
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            from src.services.ai_service import enhance_content
            enhancement_result = loop.run_until_complete(enhance_content(
                original_content=original_content,
                content_type=content_type,
                user_id=user_id,
                cv_id=cv_id,
                db_session=db
            ))
        finally:
            loop.close()

        # Update ContentEnhancement record with results
        enhancement = db.query(ContentEnhancement).filter(ContentEnhancement.id == task_id).first()
        if enhancement:
            if enhancement_result.get("error"):
                enhancement.is_generating = False
                enhancement.generation_error = enhancement_result["error"]
            else:
                enhancement.suggestions = enhancement_result.get("suggestions", [])
                enhancement.overall_improvements = enhancement_result.get("overall_improvements", [])
                enhancement.tokens_used = enhancement_result.get("tokens_used", 0)
                enhancement.generation_time = enhancement_result.get("generation_time", 0)
                enhancement.model_used = enhancement_result.get("model_used", AIConfig.OPENAI_MODEL)
                enhancement.is_generating = False
                enhancement.generation_error = None

            db.commit()
            db.refresh(enhancement)

    except Exception as e:
        # Update ContentEnhancement record with error
        logger.exception(f"enhance_content_sync: Exception during enhancement: {str(e)}")
        db_error = SessionLocal()
        try:
            enhancement = db_error.query(ContentEnhancement).filter(ContentEnhancement.id == task_id).first()
            if enhancement:
                enhancement.is_generating = False
                enhancement.generation_error = f"Background enhancement failed: {str(e)}"
                db_error.commit()
        except Exception as update_error:
            logger.exception(f"enhance_content_sync: Failed to update enhancement with error: {str(update_error)}")
        finally:
            db_error.close()
    finally:
        db.close()


async def enhance_content_background(enhancement_id: str, original_content: str, content_type: str, user_id: str, cv_id: str):
    """Enhance content in background using thread pool executor"""
    await run_task_in_background(
        enhancement_id,
        "content_enhancement",
        enhance_content_sync,
        original_content,
        content_type,
        user_id,
        cv_id
    )


def generate_job_fit_sync(task_id: str, cv_data: dict, job_description: str, user_id: str, cv_id: str, job_description_id: str):
    """Synchronous job fit generation function to run in thread pool"""

    import logging
    logger = logging.getLogger(__name__)

    db = SessionLocal()
    try:
        # Generate job fit analysis using synchronous function
        from src.services.ai_service import analyze_job_fit_sync
        fit_result = analyze_job_fit_sync(
            cv_data=cv_data,
            job_description=job_description,
            user_id=user_id,
            cv_id=cv_id,
            db_session=db
        )

        # Update AIDraft record with results
        draft = db.query(AIDraft).filter(AIDraft.id == task_id).first()
        if draft:
            if fit_result.get("error"):
                draft.is_generating = False
                draft.generation_error = fit_result["error"]
                logger.warning(f"generate_job_fit_sync: AI returned error: {fit_result['error']}")
            else:
                # Validate required fields before saving
                confidence_score = fit_result.get("confidence_score")
                generated_at = fit_result.get("generated_at")

                logger.info(f"generate_job_fit_sync: Saving draft with confidence_score={confidence_score}, generated_at={generated_at}")

                if confidence_score is None:
                    error_msg = "AI generation result missing required field: confidence_score"
                    logger.error(error_msg)
                    draft.is_generating = False
                    draft.generation_error = error_msg
                elif not generated_at:
                    error_msg = "AI generation result missing required field: generated_at"
                    logger.error(error_msg)
                    draft.is_generating = False
                    draft.generation_error = error_msg
                else:
                    # All required fields present; save draft
                    draft.draft_data = fit_result
                    draft.tokens_used = fit_result.get("tokens_used", 0)
                    draft.generation_time = fit_result.get("generation_time", 0)
                    draft.ai_model = fit_result.get("model_used", AIConfig.OPENAI_MODEL)
                    draft.is_generating = False
                    draft.generation_error = None
                    logger.info(f"generate_job_fit_sync: Draft {task_id} saved successfully with required fields")

            db.commit()
            db.refresh(draft)
        else:
            logger.warning(f"generate_job_fit_sync: Draft {task_id} not found in database")

    except Exception as e:
        # Update AIDraft record with error
        logger.exception(f"generate_job_fit_sync: Exception during generation: {str(e)}")
        db_error = SessionLocal()
        try:
            draft = db_error.query(AIDraft).filter(AIDraft.id == task_id).first()
            if draft:
                draft.is_generating = False
                draft.generation_error = f"Background generation failed: {str(e)}"
                db_error.commit()
        except Exception as update_error:
            logger.exception(f"generate_job_fit_sync: Failed to update draft with error: {str(update_error)}")
        finally:
            db_error.close()
    finally:
        db.close()


async def generate_job_fit_background(draft_id: str, cv_data: dict, job_description: str, user_id: str, cv_id: str, job_description_id: str):
    """Generate job fit analysis in background using thread pool executor"""
    
    await run_task_in_background(
        draft_id,
        "job_fit_generation",
        generate_job_fit_sync,
        cv_data,
        job_description,
        user_id,
        cv_id,
        job_description_id
    )


def ai_enhancement_sync(task_id: str, cv_data: dict, job_description: str, user_id: str, cv_id: str, job_description_id: str):
    """
    Synchronous function to generate AI enhancement suggestions.
    This runs in a background thread to avoid blocking the main event loop.
    """
    try:
        # Import here to avoid circular imports
        from src.services.ai_service import create_optimization_suggestions
        
        # Run the AI enhancement generation
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            enhancement_result = loop.run_until_complete(create_optimization_suggestions(
                cv_data=cv_data,
                job_description=job_description,
                user_id=user_id,
                cv_id=cv_id
            ))
            
            # Update the AI enhancement record with results
            from src.models.base import SessionLocal
            db = SessionLocal()
            try:
                enhancement = db.query(AIEnhancement).filter(AIEnhancement.id == task_id).first()
                if enhancement:
                    enhancement.enhancement_data = enhancement_result
                    enhancement.is_generating = False
                    enhancement.generation_error = None
                    db.commit()
            finally:
                db.close()
                
        finally:
            loop.close()
            
    except Exception as e:
        # Update the enhancement record with error
        from src.models.base import SessionLocal
        db = SessionLocal()
        try:
            enhancement = db.query(AIEnhancement).filter(AIEnhancement.id == task_id).first()
            if enhancement:
                enhancement.is_generating = False
                enhancement.generation_error = str(e)
                db.commit()
        finally:
            db.close()


async def ai_enhancement_background(enhancement_id: str, cv_data: dict, job_description: str, user_id: str, cv_id: str, job_description_id: str):
    """
    Background task to generate AI enhancement suggestions.
    """
    await run_task_in_background(
        enhancement_id,
        "ai_enhancement",
        ai_enhancement_sync,
        cv_data,
        job_description,
        user_id,
        cv_id,
        job_description_id
    )


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
    is_generating: bool = False
    generation_error: Optional[str] = None

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
    job_description = get_job_description_by_id(db, request.job_description_id, str(current_user.id))
    
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
            section_type=request.section_type,
            user_id=current_user.id,
            cv_id=cv_id,
            db_session=db
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
            ai_model=ai_result.get("model_used", AIConfig.OPENAI_MODEL),
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


@router.post("/cvs/{cv_id}/enhance-content", response_model=ContentEnhancementCreateResponse)
async def enhance_content_endpoint(
    cv_id: str,
    request: ContentEnhancementRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user)
):
    """Enhance a piece of content with AI suggestions using background processing"""
    # Verify CV exists and belongs to user
    cv = get_cv_owned_by(db, cv_id, str(current_user.id))
    
    if not cv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CV not found"
        )
    
    if not is_ai_enabled():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI features are disabled"
        )
    
    # Create ContentEnhancement record immediately with generation status
    enhancement = ContentEnhancement(
        user_id=str(current_user.id),
        cv_id=cv_id,
        original_content=request.original_content,
        content_type=request.content_type,
        is_generating=True,
        suggestions=None,
        overall_improvements=None,
        tokens_used=0,
        generation_time=0,
        model_used=None
    )
    
    db.add(enhancement)
    db.commit()
    db.refresh(enhancement)
    
    # Start background enhancement task
    asyncio.create_task(enhance_content_background(
        str(enhancement.id),
        request.original_content,
        request.content_type,
        str(current_user.id),
        cv_id
    ))
    
    # Add small delay to ensure DB commit
    await asyncio.sleep(0.1)
    
    return ContentEnhancementCreateResponse(
        enhancement_id=str(enhancement.id),
        is_generating=True
    )


@router.get("/content-enhancements/{enhancement_id}/status", response_model=ContentEnhancementResponse)
async def get_content_enhancement_status(
    enhancement_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user)
):
    """Get the current status of a content enhancement task"""
    # Get enhancement and verify ownership
    enhancement = db.query(ContentEnhancement).filter(ContentEnhancement.id == enhancement_id).first()

    if not enhancement or enhancement.user_id != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content enhancement not found"
        )

    # Convert suggestions to proper format if available
    suggestions = []
    if enhancement.suggestions:
        for suggestion in enhancement.suggestions:
            suggestions.append(ContentSuggestion(
                content=suggestion.get("content", ""),
                improvements=suggestion.get("improvements", []),
                confidence_score=suggestion.get("confidence_score", 0)
            ))

    return ContentEnhancementResponse(
        suggestions=suggestions,
        overall_improvements=enhancement.overall_improvements or [],
        tokens_used=enhancement.tokens_used,
        generation_time=enhancement.generation_time,
        model_used=enhancement.model_used or AIConfig.OPENAI_MODEL,
        is_generating=enhancement.is_generating,
        generation_error=enhancement.generation_error
    )


@router.delete("/content-enhancements/{enhancement_id}")
async def delete_content_enhancement(
    enhancement_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user)
):
    """Delete a content enhancement record"""
    # Get enhancement and verify ownership
    enhancement = db.query(ContentEnhancement).filter(ContentEnhancement.id == enhancement_id).first()

    if not enhancement or enhancement.user_id != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content enhancement not found"
        )

    try:
        db.delete(enhancement)
        db.commit()
        return {"message": "Content enhancement deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting content enhancement: {str(e)}"
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
    job_description = get_job_description_by_id(db, request.job_description_id, str(current_user.id))
    
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
        
        # Analyze ATS optimization - use the dedicated ATS analysis function
        ats_result = await analyze_ats_optimization(
            cv_data=cv.parsed_data,
            job_description=job_description.content,
            user_id=current_user.id,
            cv_id=cv_id,
            db_session=db
        )
        
        # Check if analysis failed
        if ats_result.get("error"):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"AI service error: {ats_result['error']}"
            )
        
        # Convert missing keywords to proper format
        missing_keywords = []
        for keyword in ats_result.get("missing_keywords", []):
            missing_keywords.append(MissingKeyword(
                keyword=keyword.get("keyword", ""),
                importance=keyword.get("importance", "medium"),
                frequency_in_jd=keyword.get("frequency_in_jd", 0),
                suggested_placement=keyword.get("suggested_placement", "")
            ))
        
        # Convert keyword_analysis to keyword_density format for response
        # keyword_analysis contains presence info, we map it to density format
        keyword_density = {}
        keyword_analysis = ats_result.get("keyword_analysis", {})
        for keyword, analysis_data in keyword_analysis.items():
            # Map keyword analysis to density format
            # present=True means current > 0, not present means current = 0
            is_present = analysis_data.get("present", False)
            keyword_density[keyword] = KeywordDensity(
                current=1.0 if is_present else 0.0,
                recommended=1.0,  # Recommended is always 1 if keyword is in JD
                status="good" if is_present else "missing"
            )
        
        # Convert content_optimization to optimized_sections format
        optimized_sections = []
        for optimization in ats_result.get("content_optimization", []):
            optimized_sections.append(OptimizedSection(
                section=optimization.get("section", ""),
                current_keywords=[],  # Not provided in content_optimization
                missing_keywords=optimization.get("missing_keywords", []),
                suggestion=optimization.get("suggestion", "")
            ))
        
        return ATSOptimizationResponse(
            ats_score=ats_result.get("ats_score", 0),
            missing_keywords=missing_keywords,
            keyword_density=keyword_density,
            suggestions=ats_result.get("suggestions", []),
            optimized_sections=optimized_sections,
            strengths=ats_result.get("strengths", []),
            weaknesses=ats_result.get("weaknesses", []),
            tokens_used=ats_result.get("tokens_used", 0),
            generation_time=ats_result.get("generation_time", 0),
            model_used=ats_result.get("model_used", AIConfig.OPENAI_MODEL)
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
    job_description = get_job_description_by_id(db, request.job_description_id, str(current_user.id))
    
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
        
        suggestions_result = await create_optimization_suggestions(
            cv_data=cv.parsed_data or {},
            job_description=job_description.content,
            user_id=current_user.id,
            cv_id=cv_id,
            db_session=db
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
    """Create a draft job fit analysis for a CV based on job description using background processing"""
    # Verify CV exists and belongs to user
    cv = get_cv_owned_by(db, cv_id, str(current_user.id))
    
    if not cv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CV not found"
        )
    
    # Verify job description exists (global lookup)
    job_description = get_job_description_by_id(db, request.job_description_id, str(current_user.id))
    
    if not job_description:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job description not found"
        )
    
    if not is_ai_enabled():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI features are disabled"
        )
    
    # Delete any existing draft for this CV and section type
    existing_draft = db.query(AIDraft).filter(
        AIDraft.cv_id == cv_id,
        AIDraft.section_type == "why_good_fit"
    ).first()
    
    if existing_draft:
        db.delete(existing_draft)
    
    # Create new draft with generation status
    draft = AIDraft(
        cv_id=cv_id,
        job_description_id=request.job_description_id,
        section_type="why_good_fit",
        draft_data={},  # Will be populated by background task
        ai_model=AIConfig.OPENAI_MODEL,
        tokens_used=0,
        generation_time=0,
        is_generating=True
    )
    
    db.add(draft)
    db.commit()
    db.refresh(draft)
    
    # Start background generation task
    
    asyncio.create_task(generate_job_fit_background(
        str(draft.id),
        cv.parsed_data,
        job_description.content,
        str(current_user.id),
        cv_id,
        request.job_description_id
    ))
    
    # Add small delay to ensure DB commit
    await asyncio.sleep(0.1)
    
    return DraftResponse(
        id=str(draft.id),
        cv_id=str(draft.cv_id),
        job_description_id=str(draft.job_description_id),
        section_type=draft.section_type,
        draft_data=draft.draft_data,
        ai_model=draft.ai_model,
        tokens_used=draft.tokens_used or 0,
        generation_time=draft.generation_time or 0,
        created_at=draft.created_at.isoformat(),
        is_generating=True,
        generation_error=None
    )


@router.get("/drafts/{draft_id}/status", response_model=DraftResponse)
async def get_draft_status(
    draft_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user)
):
    """Get the current status of a draft generation task"""
    # Get draft and verify ownership through CV
    draft = db.query(AIDraft).filter(AIDraft.id == draft_id).first()
    
    if not draft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Draft not found"
        )
    
    # Verify CV belongs to user
    cv = get_cv_owned_by(db, draft.cv_id, str(current_user.id))
    if not cv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Draft not found"
        )
    
    return DraftResponse(
        id=str(draft.id),
        cv_id=str(draft.cv_id),
        job_description_id=str(draft.job_description_id),
        section_type=draft.section_type,
        draft_data=draft.draft_data,
        ai_model=draft.ai_model,
        tokens_used=draft.tokens_used or 0,
        generation_time=draft.generation_time or 0,
        created_at=draft.created_at.isoformat(),
        is_generating=draft.is_generating,
        generation_error=draft.generation_error
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
            created_at=draft.created_at.isoformat(),
            is_generating=draft.is_generating,
            generation_error=draft.generation_error
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
    
    import logging
    logger = logging.getLogger(__name__)

    try:
        # Update CV parsed_data with the draft content
        if not cv.parsed_data:
            cv.parsed_data = {}

        # Normalize draft data to WhyGoodFitSchema to avoid Pydantic extra/required errors
        raw = draft.draft_data or {}
        logger.info(f"approve_why_good_fit_draft: Processing draft {request.draft_id} with keys: {list(raw.keys())}")

        # Build a compliant payload, mapping possible alternative keys
        content_value = (
            raw.get("content")
            or raw.get("fit_analysis")
            or raw.get("cleanedFitAnalysis")
            or raw.get("originalFitAnalysis")
            or ""
        )

        confidence_score = raw.get("confidence_score")
        generated_at = raw.get("generated_at") or (draft.updated_at.isoformat() if getattr(draft, "updated_at", None) else None)

        # Log presence of required fields before validation
        logger.info(f"approve_why_good_fit_draft: confidence_score={confidence_score}, generated_at={generated_at}")
        if confidence_score is None:
            logger.warning(f"approve_why_good_fit_draft: confidence_score is missing in draft {request.draft_id}")

        normalized = {
            "content": content_value,
            # confidence_score must be present; do not default here
            "confidence_score": confidence_score,
            "fit_analysis": content_value,
            "key_matches": raw.get("key_matches", []),
            "missing_skills": raw.get("missing_skills", []),
            "suggested_improvements": raw.get("suggested_improvements", []),
            "strengths": raw.get("strengths", []),
            "weaknesses": raw.get("weaknesses", []),
            "tokens_used": draft.tokens_used or raw.get("tokens_used", 0),
            "generation_time": draft.generation_time or raw.get("generation_time", 0),
            "model_used": draft.ai_model or raw.get("model_used", AIConfig.OPENAI_MODEL),
            "generated_at": generated_at,
            "job_description_id": str(draft.job_description_id) if draft.job_description_id else raw.get("job_description_id"),
        }
        # Validate and strip extras strictly via Pydantic
        try:
            validated = WhyGoodFitSchema(**normalized)
            compliant_data = validated.dict()
            logger.info(f"approve_why_good_fit_draft: Validation succeeded for draft {request.draft_id}")
        except Exception as e:
            logger.error(f"approve_why_good_fit_draft: Validation failed for draft {request.draft_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Draft data invalid for why_good_fit: {str(e)}"
            )
        
        # Move draft to parsed_data.why_good_fit
        # Create a copy to ensure SQLAlchemy detects the change
        updated_parsed_data = dict(cv.parsed_data) if cv.parsed_data else {}
        updated_parsed_data["why_good_fit"] = compliant_data
        
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
        
        
        response_data = {"message": "Draft approved and committed successfully", "cv": cv.to_response_dict()}
        return response_data
        
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


@router.post("/ai-suggestions", response_model=dict)
async def create_ai_suggestion(
    suggestion: AISuggestionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user)
):
    """Create a new AI suggestion"""
    try:
        # Verify CV exists and belongs to user
        cv = get_cv_owned_by(db, suggestion.cv_id, str(current_user.id))
        if not cv:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="CV not found"
            )
        
        # Create AI suggestion record
        from src.models.ai_suggestion import AISuggestion
        ai_suggestion = AISuggestion(
            cv_id=suggestion.cv_id,
            job_description_id=suggestion.job_description_id,
            original_content=suggestion.original_content,
            suggested_content=suggestion.suggested_content,
            content_type=suggestion.content_type,
            improvements=suggestion.improvements,
            confidence_score=suggestion.confidence_score,
            section_path=suggestion.section_path,
            ai_model=suggestion.ai_model,
            tokens_used=suggestion.tokens_used,
            generation_time=suggestion.generation_time,
            is_accepted=None  # Initially not accepted
        )
        
        db.add(ai_suggestion)
        db.commit()
        db.refresh(ai_suggestion)
        
        return {
            "id": str(ai_suggestion.id),
            "message": "AI suggestion created successfully"
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating AI suggestion: {str(e)}"
        )


@router.patch("/ai-suggestions/{suggestion_id}/accept", response_model=dict)
async def accept_ai_suggestion(
    suggestion_id: str,
    request: AISuggestionAcceptRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user)
):
    """Accept or reject an AI suggestion"""
    try:
        from src.models.ai_suggestion import AISuggestion
        
        # Get the suggestion
        suggestion = db.query(AISuggestion).filter(AISuggestion.id == suggestion_id).first()
        if not suggestion:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="AI suggestion not found"
            )
        
        # Verify CV belongs to user
        cv = get_cv_owned_by(db, suggestion.cv_id, str(current_user.id))
        if not cv:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="CV not found"
            )
        
        # Update suggestion status
        suggestion.is_accepted = "accepted" if request.is_accepted else "rejected"
        db.commit()
        
        return {
            "message": f"AI suggestion {'accepted' if request.is_accepted else 'rejected'} successfully"
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating AI suggestion: {str(e)}"
        )


@router.post("/cvs/{cv_id}/ai-enhancements", response_model=AIEnhancementCreateResponse)
async def create_ai_enhancement(
    cv_id: str,
    request: AIEnhancementRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user)
):
    """Create a new AI enhancement task for CV suggestions"""
    # Verify CV exists and belongs to user
    cv = get_cv_owned_by(db, cv_id, str(current_user.id))
    
    if not cv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CV not found"
        )
    
    # Verify job description exists
    job_description = get_job_description_by_id(db, request.job_description_id, str(current_user.id))
    
    if not job_description:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job description not found"
        )
    
    try:
        # Create AI enhancement record
        enhancement_id = str(uuid.uuid4())
        enhancement = AIEnhancement(
            id=enhancement_id,
            user_id=str(current_user.id),
            cv_id=cv_id,
            job_description_id=request.job_description_id,
            is_generating=True,
            generation_error=None
        )
        
        db.add(enhancement)
        db.commit()
        
        # Start background task
        asyncio.create_task(ai_enhancement_background(
            enhancement_id,
            cv.parsed_data or {},
            job_description.content,
            str(current_user.id),
            cv_id,
            request.job_description_id
        ))
        
        return AIEnhancementCreateResponse(
            enhancement_id=enhancement_id,
            is_generating=True
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating AI enhancement: {str(e)}"
        )


@router.get("/ai-enhancements/{enhancement_id}/status", response_model=AIEnhancementResponse)
async def get_ai_enhancement_status(
    enhancement_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user)
):
    """Get the status of an AI enhancement task"""
    enhancement = db.query(AIEnhancement).filter(
        AIEnhancement.id == enhancement_id,
        AIEnhancement.user_id == str(current_user.id)
    ).first()
    
    if not enhancement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="AI enhancement not found"
        )
    
    return AIEnhancementResponse(
        id=enhancement.id,
        cv_id=enhancement.cv_id,
        job_description_id=enhancement.job_description_id,
        enhancement_data=enhancement.enhancement_data,
        tokens_used=enhancement.tokens_used,
        generation_time=enhancement.generation_time,
        model_used=enhancement.model_used,
        is_generating=enhancement.is_generating,
        generation_error=enhancement.generation_error,
        created_at=enhancement.created_at.isoformat()
    )


@router.get("/cvs/{cv_id}/ai-enhancements/latest")
async def get_latest_ai_enhancement(
    cv_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user)
):
    """Get the latest AI enhancement for a CV (returns null if none exists)"""
    # Verify CV belongs to user
    cv = get_cv_owned_by(db, cv_id, str(current_user.id))
    if not cv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="CV not found"
        )

    # Get the most recent enhancement for this CV
    enhancement = db.query(AIEnhancement).filter(
        AIEnhancement.cv_id == cv_id,
        AIEnhancement.user_id == str(current_user.id)
    ).order_by(AIEnhancement.created_at.desc()).first()

    # Return null instead of 404 when no enhancement exists (expected case)
    if not enhancement:
        return None

    return AIEnhancementResponse(
        id=enhancement.id,
        cv_id=enhancement.cv_id,
        job_description_id=enhancement.job_description_id,
        enhancement_data=enhancement.enhancement_data,
        tokens_used=enhancement.tokens_used,
        generation_time=enhancement.generation_time,
        model_used=enhancement.model_used,
        is_generating=enhancement.is_generating,
        generation_error=enhancement.generation_error,
        created_at=enhancement.created_at.isoformat()
    )


@router.put("/ai-enhancements/{enhancement_id}")
async def update_ai_enhancement(
    enhancement_id: str,
    update_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user)
):
    """Update an AI enhancement record with new suggestion data"""
    # Get enhancement and verify ownership
    enhancement = db.query(AIEnhancement).filter(
        AIEnhancement.id == enhancement_id,
        AIEnhancement.user_id == str(current_user.id)
    ).first()

    if not enhancement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="AI enhancement not found"
        )

    try:
        # Update enhancement_data field with new suggestions
        if 'enhancement_data' in update_data:
            enhancement.enhancement_data = update_data['enhancement_data']
            enhancement.updated_at = datetime.utcnow()

        db.commit()
        db.refresh(enhancement)

        return {"message": "AI enhancement updated successfully", "id": enhancement.id}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating AI enhancement: {str(e)}"
        )


@router.delete("/ai-enhancements/{enhancement_id}")
async def delete_ai_enhancement(
    enhancement_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user)
):
    """Delete an AI enhancement record"""
    # Get enhancement and verify ownership
    enhancement = db.query(AIEnhancement).filter(
        AIEnhancement.id == enhancement_id,
        AIEnhancement.user_id == str(current_user.id)
    ).first()

    if not enhancement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="AI enhancement not found"
        )

    try:
        db.delete(enhancement)
        db.commit()
        return {"message": "AI enhancement deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting AI enhancement: {str(e)}"
        )
