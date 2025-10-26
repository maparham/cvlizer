"""
ATS optimization endpoints.

This module provides endpoints for analyzing CVs for ATS (Applicant Tracking System)
optimization including keyword analysis and optimization suggestions.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from src.config import APIConfig, AIConfig
from src.middleware.clerk_auth import get_effective_user
from src.models.base import get_db
from src.models.user import User
from src.services.ai_service import analyze_ats_optimization, is_ai_enabled
from src.services.job_description_service import (
    get_cv_owned_by,
    get_job_description_by_id,
)
from src.utils.rate_limit import create_combined_limiter

from .models import (
    ATSOptimizationRequest,
    ATSOptimizationResponse,
    KeywordDensity,
    MissingKeyword,
    OptimizedSection,
)

router = APIRouter(tags=["ai"])
limiter = create_combined_limiter()


@router.post("/cvs/{cv_id}/optimize-ats", response_model=ATSOptimizationResponse)
@limiter.limit(APIConfig.AI_REASONING_RATE_LIMIT)
async def optimize_ats_endpoint(
    cv_id: str,
    request: ATSOptimizationRequest,
    request_obj: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_effective_user),
):
    """Analyze CV for ATS optimization against job description"""
    # Verify CV exists and belongs to user
    cv = get_cv_owned_by(db, cv_id, str(current_user.id))

    if not cv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")

    # Verify job description exists (global lookup)
    job_description = get_job_description_by_id(
        db, request.job_description_id, str(current_user.id)
    )

    if not job_description:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Job description not found"
        )

    try:
        if not is_ai_enabled():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="AI features are disabled",
            )

        # Analyze ATS optimization - use the dedicated ATS analysis function
        ats_result = await analyze_ats_optimization(
            cv_data=cv.parsed_data,
            job_description=job_description.content,
            user_id=current_user.id,
            cv_id=cv_id,
            db_session=db,
        )

        # Check if analysis failed
        if ats_result.get("error"):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"AI service error: {ats_result['error']}",
            )

        # Convert missing keywords to proper format
        missing_keywords = []
        for keyword in ats_result.get("missing_keywords", []):
            missing_keywords.append(
                MissingKeyword(
                    keyword=keyword.get("keyword", ""),
                    importance=keyword.get("importance", "medium"),
                    frequency_in_jd=keyword.get("frequency_in_jd", 0),
                    suggested_placement=keyword.get("suggested_placement", ""),
                )
            )

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
                status="good" if is_present else "missing",
            )

        # Convert content_optimization to optimized_sections format
        optimized_sections = []
        for optimization in ats_result.get("content_optimization", []):
            optimized_sections.append(
                OptimizedSection(
                    section=optimization.get("section", ""),
                    current_keywords=[],  # Not provided in content_optimization
                    missing_keywords=optimization.get("missing_keywords", []),
                    suggestion=optimization.get("suggestion", ""),
                )
            )

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
            model_used=ats_result.get("model_used", AIConfig.OPENAI_MODEL),
        )

    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error analyzing ATS optimization: {str(e)}",
        )


__all__ = ["router"]
