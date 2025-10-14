"""
CV AI enhancement status tracking service.

This module provides functions for checking and updating the AI enhancement
status of CVs, tracking whether CVs have been modified with AI-generated
content or suggestions.
"""

import logging

from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


# ============================================================================
# CV Enhancement Status Functions
# ============================================================================


def check_cv_ai_enhancement_status(db_session: Session, cv_id: str) -> bool:
    """
    Check if a CV has been enhanced with AI by looking for accepted AI suggestions.

    Args:
        db_session: Database session
        cv_id: CV ID to check

    Returns:
        True if CV has accepted AI suggestions, False otherwise
    """
    try:
        from src.models.ai_section import AISection
        from src.models.ai_suggestion import AISuggestion

        # Check for accepted AI suggestions
        accepted_suggestions = (
            db_session.query(AISuggestion)
            .filter(AISuggestion.cv_id == cv_id, AISuggestion.is_accepted == "accepted")
            .count()
        )

        # Check for active AI sections (AI-generated content that's been applied)
        active_ai_sections = (
            db_session.query(AISection)
            .filter(AISection.cv_id == cv_id, AISection.is_active == True)
            .count()
        )

        # CV is considered AI-enhanced if it has any accepted suggestions or active AI sections
        return accepted_suggestions > 0 or active_ai_sections > 0

    except Exception as e:
        logger.error(f"Error checking AI enhancement status for CV {cv_id}: {str(e)}")
        return False


def mark_cv_as_ai_enhanced(db_session: Session, cv_id: str) -> bool:
    """
    Mark a CV as AI-enhanced by setting the is_ai_enhanced flag to True.

    Args:
        db_session: Database session
        cv_id: CV ID to mark as AI-enhanced

    Returns:
        True if successfully marked, False otherwise
    """
    try:
        from src.models.cv import CV

        cv = db_session.query(CV).filter(CV.id == cv_id).first()
        if cv:
            cv.is_ai_enhanced = True
            db_session.commit()
            return True
        return False

    except Exception as e:
        logger.error(f"Error marking CV {cv_id} as AI-enhanced: {str(e)}")
        db_session.rollback()
        return False
