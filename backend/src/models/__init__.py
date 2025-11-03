"""
Database models for the CV Optimizer application.

This module exports all database models for easy importing.
"""

from .ai_draft import AIDraft
from .ai_enhancement import AIEnhancement
from .ai_section import AISection
from .ai_suggestion import AISuggestion
from .ai_usage_log import AIUsageLog
from .audit_log import AuditLog
from .base import Base, engine, get_db
from .cv import CV
from .cv_history import CVHistory
from .cv_job_description import CVJobDescription
from .impersonation_session import ImpersonationSession
from .job_description import JobDescription
from .optimization_history import OptimizationHistory
from .user import User
from .user_activity import UserActivity, UserSession

__all__ = [
    "Base",
    "get_db",
    "engine",
    "User",
    "CV",
    "CVHistory",
    "CVJobDescription",
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
    "AIEnhancement",
]
