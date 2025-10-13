"""
Database models for the CV Optimizer application.

This module exports all database models for easy importing.
"""

from .base import Base, get_db, engine
from .user import User
from .cv import CV
from .cv_history import CVHistory
from .job_description import JobDescription
from .ai_section import AISection
from .ai_draft import AIDraft
from .ai_suggestion import AISuggestion
from .optimization_history import OptimizationHistory
from .audit_log import AuditLog
from .user_activity import UserActivity, UserSession
from .impersonation_session import ImpersonationSession
from .ai_usage_log import AIUsageLog
from .content_enhancement import ContentEnhancement
from .ai_enhancement import AIEnhancement

__all__ = [
    "Base",
    "get_db",
    "engine",
    "User",
    "CV",
    "CVHistory",
    "JobDescription",
    "AISection",
    "AIDraft",
    "AISuggestion",
    "OptimizationHistory",
    "AuditLog",
    "UserActivity",
    "UserSession",
    "ImpersonationSession",
    "AIUsageLog",
    "ContentEnhancement",
    "AIEnhancement",
]
