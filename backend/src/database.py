"""
Database configuration and initialization module.

This module handles database connection setup, table creation,
and imports all models to ensure proper relationship definitions.
"""

import os
import sys

from dotenv import load_dotenv

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
from src.models.impersonation_session import ImpersonationSession  # noqa: F401, E402
from src.models.job_description import JobDescription  # noqa: F401, E402
from src.models.optimization_history import OptimizationHistory  # noqa: F401, E402
from src.models.user import User  # noqa: F401, E402
from src.models.user_activity import UserActivity, UserSession  # noqa: F401, E402

load_dotenv()


def get_database_url():
    """Get the database URL from environment variables."""
    return os.getenv("DATABASE_URL", "sqlite:///./cv_optimizer.db")


def create_tables():
    """Create all database tables using the shared engine."""
    Base.metadata.create_all(bind=engine)


if __name__ == "__main__":
    create_tables()
