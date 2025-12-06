"""
Background task functions for AI API endpoints.

This module contains synchronous and asynchronous wrapper functions for
running AI generation tasks in background thread pools to avoid blocking
the main event loop.
"""

import asyncio
import logging
from typing import Optional

from src.config import AIConfig
from src.models.ai_draft import AIDraft
from src.models.ai_enhancement import AIEnhancement
from src.models.base import SessionLocal
from src.utils.background_tasks import run_task_in_background

logger = logging.getLogger(__name__)


# ============================================================================
# AI Suggestions Background Tasks
# ============================================================================


def ai_suggestions_sync(
    enhancement_id: str,
    cv_data: dict,
    job_description: str,
    user_id: str,
    cv_id: str,
    job_description_id: str,
    company_name: Optional[str] = None,
):
    """
    Synchronous AI suggestions generation using single optimized AI call.

    This function uses a single optimized AI call that generates job fit
    analysis and optimization suggestions.

    Stores suggestions on the `AIEnhancement` and embeds the created
    draft_id under enhancement_data.meta.draft_id for the polling client.
    """
    # Lazy imports to avoid circular deps
    from src.services.ai_service import generate_ai_suggestions

    # Use a local event loop to run async parts if needed
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    db = SessionLocal()
    try:
        # Single AI call for both job fit and optimization
        job_fit_data, optimization_data, metadata = loop.run_until_complete(
            generate_ai_suggestions(
                cv_data=cv_data,
                job_description=job_description,
                user_id=user_id,
                cv_id=cv_id,
                db_session=db,
                company_name=company_name,
            )
        )

        # Delete any existing draft for this CV and section type
        existing_draft = (
            db.query(AIDraft)
            .filter(AIDraft.cv_id == cv_id, AIDraft.section_type == "why_good_fit")
            .first()
        )

        if existing_draft:
            db.delete(existing_draft)
            db.flush()  # Ensure deletion is persisted before creating new draft

        # Create Why Good Fit draft with job fit data
        draft = AIDraft(
            cv_id=cv_id,
            job_description_id=job_description_id,
            section_type="why_good_fit",
            draft_data=job_fit_data,
            ai_model=metadata.get("model_used", AIConfig.OPENAI_MODEL),
            tokens_used=metadata.get("tokens_used", 0),
            generation_time=metadata.get("generation_time", 0),
            is_generating=False,
            generation_error=None,
        )
        db.add(draft)
        db.commit()
        db.refresh(draft)

        # Update enhancement with optimization data and metadata
        enhancement = (
            db.query(AIEnhancement).filter(AIEnhancement.id == enhancement_id).first()
        )
        if enhancement:
            # Add draft_id to meta
            enhancement_data = optimization_data or {}

            # Add why_good_fit to enhancement_data for unified response
            enhancement_data["why_good_fit"] = {
                "title": job_fit_data.get("title", ""),
                "confidence_score": job_fit_data.get("confidence_score", 0),
                "fit_analysis": job_fit_data.get("fit_analysis", ""),
                "key_matches": job_fit_data.get("key_matches", []),
                "missing_skills": job_fit_data.get("missing_skills", []),
                "suggested_improvements": job_fit_data.get("suggested_improvements", []),
                "strengths": job_fit_data.get("strengths", []),
                "weaknesses": job_fit_data.get("weaknesses", []),
            }

            meta = dict(enhancement_data.get("meta") or {})
            meta.update({"draft_id": str(draft.id)})
            enhancement_data["meta"] = meta

            # Store enhancement data and metadata
            enhancement.enhancement_data = enhancement_data
            enhancement.tokens_used = metadata.get("tokens_used", 0)
            enhancement.generation_time = metadata.get("generation_time", 0)
            enhancement.model_used = metadata.get("model_used", AIConfig.OPENAI_MODEL)
            enhancement.is_generating = False
            enhancement.generation_error = None
            db.commit()

    except Exception as e:
        # Persist error on enhancement
        try:
            enhancement = (
                db.query(AIEnhancement).filter(AIEnhancement.id == enhancement_id).first()
            )
            if enhancement:
                enhancement.is_generating = False
                enhancement.generation_error = str(e)
                db.commit()
        except Exception:
            pass
        finally:
            logger.exception(f"ai_suggestions_sync failed: {str(e)}")
    finally:
        try:
            loop.close()
        except Exception:
            pass
        db.close()


async def ai_suggestions_background(
    enhancement_id: str,
    cv_data: dict,
    job_description: str,
    user_id: str,
    cv_id: str,
    job_description_id: str,
    company_name: Optional[str] = None,
):
    """Background task wrapper for AI suggestions generation."""
    await run_task_in_background(
        enhancement_id,
        "ai_suggestions",
        ai_suggestions_sync,
        cv_data,
        job_description,
        user_id,
        cv_id,
        job_description_id,
        company_name,
    )


__all__ = [
    "ai_suggestions_sync",
    "ai_suggestions_background",
]
