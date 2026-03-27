"""
Database configuration and initialization module.

This module handles database connection setup, table creation,
and imports all models to ensure proper relationship definitions.

When run as a script, run from the backend directory with PYTHONPATH set
(e.g. python -m src.database or PYTHONPATH=. python src/database.py).
"""

import logging
import os

from dotenv import load_dotenv
from sqlalchemy import text

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
from src.models.preview_job import PreviewJob  # noqa: F401, E402
from src.sharing.models.share_view import ShareView  # noqa: F401, E402
from src.models.user import User  # noqa: F401, E402
from src.models.feedback import Feedback  # noqa: F401, E402
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


def _migrate_ai_usage_logs_provider_cost():
    """
    Add provider_cost column to ai_usage_logs if missing (one-off migration).
    Safe to run multiple times; no-op if column already exists.
    """
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE ai_usage_logs ADD COLUMN provider_cost FLOAT"))
            conn.commit()
        logger.info("Migration: added ai_usage_logs.provider_cost")
    except Exception as e:
        msg = str(e).lower()
        if "duplicate column" in msg or "already exists" in msg:
            pass
        else:
            raise


def _migrate_add_public_sharing():
    """
    Add public sharing columns to cvs/job_descriptions if missing.
    Safe to run multiple times; no-op for already-added columns.

    Each DDL runs in its own transaction so a duplicate-column/index error on
    re-runs does not abort the whole batch (PostgreSQL aborts the txn on error).

    Uses dialect-appropriate types (e.g. TIMESTAMPTZ vs DATETIME, BOOLEAN default).
    """
    if engine.dialect.name == "postgresql":
        statements = [
            "ALTER TABLE cvs ADD COLUMN public_share_token VARCHAR(128)",
            "ALTER TABLE cvs ADD COLUMN is_public_shared BOOLEAN DEFAULT FALSE NOT NULL",
            "ALTER TABLE cvs ADD COLUMN public_share_created_at TIMESTAMPTZ",
            "ALTER TABLE cvs ADD COLUMN public_share_view_mode VARCHAR(20) DEFAULT 'shell' NOT NULL",
            "CREATE UNIQUE INDEX ux_cvs_public_share_token ON cvs(public_share_token)",
            "CREATE INDEX ix_cvs_is_public_shared ON cvs(is_public_shared)",
            "ALTER TABLE job_descriptions ADD COLUMN public_share_token VARCHAR(128)",
            "ALTER TABLE job_descriptions ADD COLUMN is_public_shared BOOLEAN DEFAULT FALSE NOT NULL",
            "ALTER TABLE job_descriptions ADD COLUMN public_share_created_at TIMESTAMPTZ",
            "CREATE UNIQUE INDEX ux_job_descriptions_public_share_token ON job_descriptions(public_share_token)",
            "CREATE INDEX ix_job_descriptions_is_public_shared ON job_descriptions(is_public_shared)",
        ]
    else:
        statements = [
            "ALTER TABLE cvs ADD COLUMN public_share_token VARCHAR(128)",
            "ALTER TABLE cvs ADD COLUMN is_public_shared BOOLEAN DEFAULT 0 NOT NULL",
            "ALTER TABLE cvs ADD COLUMN public_share_created_at DATETIME",
            "ALTER TABLE cvs ADD COLUMN public_share_view_mode VARCHAR(20) DEFAULT 'shell' NOT NULL",
            "CREATE UNIQUE INDEX ux_cvs_public_share_token ON cvs(public_share_token)",
            "CREATE INDEX ix_cvs_is_public_shared ON cvs(is_public_shared)",
            "ALTER TABLE job_descriptions ADD COLUMN public_share_token VARCHAR(128)",
            "ALTER TABLE job_descriptions ADD COLUMN is_public_shared BOOLEAN DEFAULT 0 NOT NULL",
            "ALTER TABLE job_descriptions ADD COLUMN public_share_created_at DATETIME",
            "CREATE UNIQUE INDEX ux_job_descriptions_public_share_token ON job_descriptions(public_share_token)",
            "CREATE INDEX ix_job_descriptions_is_public_shared ON job_descriptions(is_public_shared)",
        ]

    def _is_idempotent_schema_error(exc: Exception) -> bool:
        msg = str(exc).lower()
        return (
            "duplicate column" in msg
            or "already exists" in msg
            or "duplicate key name" in msg
        )

    # One transaction per statement: idempotent DDL often raises on re-runs; if those
    # errors shared one transaction (PostgreSQL), the whole batch would abort.
    for statement in statements:
        try:
            with engine.begin() as conn:
                conn.execute(text(statement))
        except Exception as e:
            if _is_idempotent_schema_error(e):
                continue
            raise
    logger.info("Migration: public sharing columns/indexes applied (idempotent)")


def _migrate_cvs_export_template_name():
    """
    Add cvs.export_template_name if missing (per-CV LaTeX template for public PDF).
    Safe to run multiple times.
    """
    statement = "ALTER TABLE cvs ADD COLUMN export_template_name VARCHAR(64)"
    try:
        with engine.begin() as conn:
            conn.execute(text(statement))
        logger.info("Migration: added cvs.export_template_name")
    except Exception as e:
        msg = str(e).lower()
        if "duplicate column" in msg or "already exists" in msg:
            return
        raise


def _migrate_share_view_viewer_ip_width():
    """
    Widen share_views.viewer_ip for IPv6 with zone ID (PostgreSQL only).

    SQLite uses flexible text storage; new installs get the ORM length from create_all.
    """
    if engine.dialect.name != "postgresql":
        return
    try:
        with engine.begin() as conn:
            conn.execute(
                text("ALTER TABLE share_views ALTER COLUMN viewer_ip TYPE VARCHAR(50)")
            )
        logger.info("Migration: share_views.viewer_ip widened to VARCHAR(50)")
    except Exception as e:
        msg = str(e).lower()
        if "share_views" in msg and ("does not exist" in msg or "unknown" in msg):
            return
        if "already" in msg or "varchar(50)" in msg:
            return
        raise


def create_tables():
    """Create all database tables using the shared engine."""
    Base.metadata.create_all(bind=engine)
    _migrate_ai_usage_logs_service_tier()
    _migrate_ai_usage_logs_provider_cost()
    _migrate_add_public_sharing()
    _migrate_cvs_export_template_name()
    _migrate_share_view_viewer_ip_width()


if __name__ == "__main__":
    create_tables()
