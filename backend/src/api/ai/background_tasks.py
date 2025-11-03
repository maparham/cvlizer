"""
Background task functions for AI API endpoints.

This module contains synchronous and asynchronous wrapper functions for
running AI generation tasks in background thread pools to avoid blocking
the main event loop.
"""

import asyncio
import logging

from src.config import AIConfig
from src.models.ai_draft import AIDraft
from src.models.ai_enhancement import AIEnhancement
from src.models.base import SessionLocal
from src.utils.background_tasks import run_task_in_background

logger = logging.getLogger(__name__)


def generate_job_fit_sync(
    task_id: str,
    cv_data: dict,
    job_description: str,
    user_id: str,
    cv_id: str,
    job_description_id: str,
):
    """Synchronous job fit generation function to run in thread pool"""

    db = SessionLocal()
    try:
        # Generate job fit analysis using synchronous function
        from src.services.ai_service import analyze_job_fit_sync

        fit_result = analyze_job_fit_sync(
            cv_data=cv_data,
            job_description=job_description,
            user_id=user_id,
            cv_id=cv_id,
            db_session=db,
        )

        # Update AIDraft record with results
        draft = db.query(AIDraft).filter(AIDraft.id == task_id).first()
        if draft:
            if fit_result.get("error"):
                draft.is_generating = False
                draft.generation_error = fit_result["error"]
                logger.warning(
                    f"generate_job_fit_sync: AI returned error: {fit_result['error']}"
                )
            else:
                # Validate required fields before saving
                confidence_score = fit_result.get("confidence_score")
                generated_at = fit_result.get("generated_at")

                logger.info(
                    f"generate_job_fit_sync: Saving draft with confidence_score={confidence_score}, generated_at={generated_at}"
                )

                if confidence_score is None:
                    error_msg = (
                        "AI generation result missing required field: confidence_score"
                    )
                    logger.error(error_msg)
                    draft.is_generating = False
                    draft.generation_error = error_msg
                elif not generated_at:
                    error_msg = (
                        "AI generation result missing required field: generated_at"
                    )
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
                    logger.info(
                        f"generate_job_fit_sync: Draft {task_id} saved successfully with required fields"
                    )

            db.commit()
            db.refresh(draft)
        else:
            logger.warning(
                f"generate_job_fit_sync: Draft {task_id} not found in database"
            )

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
            logger.exception(
                f"generate_job_fit_sync: Failed to update draft with error: {str(update_error)}"
            )
        finally:
            db_error.close()
    finally:
        db.close()


async def generate_job_fit_background(
    draft_id: str,
    cv_data: dict,
    job_description: str,
    user_id: str,
    cv_id: str,
    job_description_id: str,
):
    """Generate job fit analysis in background using thread pool executor"""

    await run_task_in_background(
        draft_id,
        "job_fit_generation",
        generate_job_fit_sync,
        cv_data,
        job_description,
        user_id,
        cv_id,
        job_description_id,
    )


def ai_suggestions_sync(
    enhancement_id: str,
    cv_data: dict,
    job_description: str,
    user_id: str,
    cv_id: str,
    job_description_id: str,
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
    )


__all__ = [
    "generate_job_fit_sync",
    "generate_job_fit_background",
    "ai_suggestions_sync",
    "ai_suggestions_background",
]
