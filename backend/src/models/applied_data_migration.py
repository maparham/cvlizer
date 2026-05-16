from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, String

from src.models.base import Base


class AppliedDataMigration(Base):
    """Ledger row recording that a named data migration has been applied."""

    __tablename__ = "applied_data_migrations"

    id = Column(String, primary_key=True)  # e.g. "001_legacy_achievements"
    applied_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
