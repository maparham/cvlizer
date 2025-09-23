"""
AI-powered CV section generation API endpoints.

This module provides endpoints for generating AI-enhanced CV sections
based on job descriptions using OpenAI's GPT models.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
import uuid

from ..models.base import get_db
from ..models.user import User
from ..models.cv import CV
from ..models.job_description import JobDescription
from ..models.ai_section import AISection
from ..services.ai_service import generate_cv_section
from ..middleware.clerk_auth import get_current_user_from_clerk as get_current_user

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


@router.post("/cvs/{cv_id}/generate-section", response_model=AISectionResponse)
async def generate_ai_section(
    cv_id: str,
    request: AIGenerationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate AI-enhanced section for CV based on job description"""
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
    
    # Verify job description exists and belongs to CV
    job_description = db.query(JobDescription).filter(
        JobDescription.id == request.job_description_id,
        JobDescription.cv_id == cv_id
    ).first()
    
    if not job_description:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job description not found"
        )
    
    try:
        # Generate AI section
        ai_result = await generate_cv_section(
            cv_data=cv.parsed_data,
            job_description=job_description.content,
            section_type=request.section_type
        )
        
        # Save AI section to database
        ai_section = AISection(
            cv_id=cv_id,
            job_description_id=request.job_description_id,
            section_content=ai_result["section_content"],
            section_type=request.section_type,
            generation_prompt=f"Generate {request.section_type} section",
            ai_model=ai_result.get("ai_model", "gpt-4o-mini"),
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
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating AI section: {str(e)}"
        )


@router.get("/cvs/{cv_id}/ai-sections", response_model=AISectionListResponse)
async def get_ai_sections(
    cv_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
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
