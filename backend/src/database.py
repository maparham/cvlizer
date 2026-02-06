"""
Database configuration and initialization module.

This module handles database connection setup, table creation,
and imports all models to ensure proper relationship definitions.
"""

import logging
import os
import sys

from dotenv import load_dotenv
from sqlalchemy import text

# Ensure src is importable
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.models.ai_draft import AIDraft  # noqa: F401, E402
from src.models.ai_enhancement import AIEnhancement  # noqa: F401, E402
from src.models.ai_section import AISection  # noqa: F401, E402
from src.models.ai_suggestion import AISuggestion  # noqa: F401, E402
from src.models.ai_usage_log import AIUsageLog  # noqa: F401, E402
from src.models.audit_log import AuditLog  # noqa: F401, E402

# Reuse the shared engine/Base from models.base; import models to register metadata
from src.models.base import Base, engine  # type: ignore  # noqa: E402
from src.models.cv import CV  # noqa: F401, E402
from src.models.cv_history import CVHistory  # noqa: F401, E402
from src.models.cv_job_description import CVJobDescription  # noqa: F401, E402
from src.models.cv_quality_analysis import CVQualityAnalysis  # noqa: F401, E402
from src.models.impersonation_session import ImpersonationSession  # noqa: F401, E402
from src.models.job_description import JobDescription  # noqa: F401, E402
from src.models.optimization_history import OptimizationHistory  # noqa: F401, E402
from src.models.user import User  # noqa: F401, E402
from src.models.user_activity import UserActivity, UserSession  # noqa: F401, E402

load_dotenv()

logger = logging.getLogger(__name__)


def get_database_url():
    """Get the database URL from environment variables."""
    return os.getenv("DATABASE_URL", "sqlite:///./cv_optimizer.db")


def _migrate_ai_usage_logs_service_tier():
    """
    Add service_tier column to ai_usage_logs if missing (one-off migration).
    Safe to run multiple times; no-op if column already exists.
    """
    try:
        with engine.connect() as conn:
            conn.execute(
                text("ALTER TABLE ai_usage_logs ADD COLUMN service_tier VARCHAR(50)")
            )
            conn.commit()
        logger.info("Migration: added ai_usage_logs.service_tier")
    except Exception as e:
        msg = str(e).lower()
        if "duplicate column" in msg or "already exists" in msg:
            pass
        else:
            raise


def create_tables():
    """Create all database tables using the shared engine."""
    Base.metadata.create_all(bind=engine)
    _migrate_ai_usage_logs_service_tier()


if __name__ == "__main__":
    create_tables()
