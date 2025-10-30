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
from src.models.content_enhancement import ContentEnhancement
from src.utils.background_tasks import run_task_in_background

logger = logging.getLogger(__name__)


def enhance_content_sync(
    task_id: str, original_content: str, content_type: str, user_id: str, cv_id: str
):
    """Synchronous content enhancement function to run in thread pool"""
    db = SessionLocal()
    try:
        # Enhance content (run async function in sync context)
        import asyncio

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            from src.services.ai_service import enhance_content

            enhancement_result = loop.run_until_complete(
                enhance_content(
                    original_content=original_content,
                    content_type=content_type,
                    user_id=user_id,
                    cv_id=cv_id,
                    db_session=db,
                )
            )
        finally:
            loop.close()

        # Update ContentEnhancement record with results
        enhancement = (
            db.query(ContentEnhancement).filter(ContentEnhancement.id == task_id).first()
        )
        if enhancement:
            if enhancement_result.get("error"):
                enhancement.is_generating = False
                enhancement.generation_error = enhancement_result["error"]
            else:
                enhancement.suggestions = enhancement_result.get("suggestions", [])
                enhancement.overall_improvements = enhancement_result.get(
                    "overall_improvements", []
                )
                enhancement.tokens_used = enhancement_result.get("tokens_used", 0)
                enhancement.generation_time = enhancement_result.get("generation_time", 0)
                enhancement.model_used = enhancement_result.get(
                    "model_used", AIConfig.OPENAI_MODEL
                )
                enhancement.is_generating = False
                enhancement.generation_error = None

            db.commit()
            db.refresh(enhancement)

    except Exception as e:
        # Update ContentEnhancement record with error
        logger.exception(f"enhance_content_sync: Exception during enhancement: {str(e)}")
        db_error = SessionLocal()
        try:
            enhancement = (
                db_error.query(ContentEnhancement)
                .filter(ContentEnhancement.id == task_id)
                .first()
            )
            if enhancement:
                enhancement.is_generating = False
                enhancement.generation_error = f"Background enhancement failed: {str(e)}"
                db_error.commit()
        except Exception as update_error:
            logger.exception(
                f"enhance_content_sync: Failed to update enhancement with error: {str(update_error)}"
            )
        finally:
            db_error.close()
    finally:
        db.close()


async def enhance_content_background(
    enhancement_id: str,
    original_content: str,
    content_type: str,
    user_id: str,
    cv_id: str,
):
    """Enhance content in background using thread pool executor"""
    await run_task_in_background(
        enhancement_id,
        "content_enhancement",
        enhance_content_sync,
        original_content,
        content_type,
        user_id,
        cv_id,
    )


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


def ai_enhancement_sync(
    task_id: str,
    cv_data: dict,
    job_description: str,
    user_id: str,
    cv_id: str,
    job_description_id: str,
):
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
            enhancement_result = loop.run_until_complete(
                create_optimization_suggestions(
                    cv_data=cv_data,
                    job_description=job_description,
                    user_id=user_id,
                    cv_id=cv_id,
                )
            )

            # Update the AI enhancement record with results
            from src.models.base import SessionLocal

            db = SessionLocal()
            try:
                enhancement = (
                    db.query(AIEnhancement).filter(AIEnhancement.id == task_id).first()
                )
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
            enhancement = (
                db.query(AIEnhancement).filter(AIEnhancement.id == task_id).first()
            )
            if enhancement:
                enhancement.is_generating = False
                enhancement.generation_error = str(e)
                db.commit()
        finally:
            db.close()


async def ai_enhancement_background(
    enhancement_id: str,
    cv_data: dict,
    job_description: str,
    user_id: str,
    cv_id: str,
    job_description_id: str,
):
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
        job_description_id,
    )


def ai_combined_sync(
    enhancement_id: str,
    cv_data: dict,
    job_description: str,
    user_id: str,
    cv_id: str,
    job_description_id: str,
):
    """
    Synchronous combined generation:
    - Generate AI enhancement suggestions
    - Create a Why Good Fit draft

    Stores suggestions on the `AIEnhancement` and embeds the created
    draft_id under enhancement_data.meta.draft_id for the polling client.
    """
    # Lazy imports to avoid circular deps
    from src.services.ai_service import (
        create_optimization_suggestions,
        analyze_job_fit_sync,
    )

    # Use a local event loop to run async parts if needed
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    db = SessionLocal()
    try:
        # 1) Generate suggestions
        suggestions = loop.run_until_complete(
            create_optimization_suggestions(
                cv_data=cv_data,
                job_description=job_description,
                user_id=user_id,
                cv_id=cv_id,
            )
        )

        # 2) Create Why Good Fit draft and populate content synchronously
        #    First create the draft row in generating state
        draft = AIDraft(
            cv_id=cv_id,
            job_description_id=job_description_id,
            section_type="why_good_fit",
            draft_data={},
            ai_model=AIConfig.OPENAI_MODEL,
            tokens_used=0,
            generation_time=0,
            is_generating=True,
        )
        db.add(draft)
        db.commit()
        db.refresh(draft)

        # Run job-fit analysis (sync function)
        fit_result = analyze_job_fit_sync(
            cv_data=cv_data,
            job_description=job_description,
            user_id=user_id,
            cv_id=cv_id,
            db_session=db,
        )

        # Save draft result (success or error)
        if fit_result.get("error"):
            draft.is_generating = False
            draft.generation_error = fit_result["error"]
        else:
            draft.draft_data = fit_result
            draft.tokens_used = fit_result.get("tokens_used", 0)
            draft.generation_time = fit_result.get("generation_time", 0)
            draft.ai_model = fit_result.get("model_used", AIConfig.OPENAI_MODEL)
            draft.is_generating = False
            draft.generation_error = None
        db.commit()
        db.refresh(draft)

        # 3) Update enhancement with suggestions and reference to draft_id
        enhancement = (
            db.query(AIEnhancement).filter(AIEnhancement.id == enhancement_id).first()
        )
        if enhancement:
            # Ensure meta with draft id
            enhancement_data = suggestions or {}
            meta = dict(enhancement_data.get("meta") or {})
            meta.update({"draft_id": str(draft.id)})
            enhancement_data["meta"] = meta

            enhancement.enhancement_data = enhancement_data
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
            logger.exception(f"ai_combined_sync failed: {str(e)}")
    finally:
        try:
            loop.close()
        except Exception:
            pass
        db.close()


async def ai_combined_background(
    enhancement_id: str,
    cv_data: dict,
    job_description: str,
    user_id: str,
    cv_id: str,
    job_description_id: str,
):
    """Background task wrapper for combined generation."""
    await run_task_in_background(
        enhancement_id,
        "ai_combined",
        ai_combined_sync,
        cv_data,
        job_description,
        user_id,
        cv_id,
        job_description_id,
    )


__all__ = [
    "enhance_content_sync",
    "enhance_content_background",
    "generate_job_fit_sync",
    "generate_job_fit_background",
    "ai_enhancement_sync",
    "ai_enhancement_background",
]
