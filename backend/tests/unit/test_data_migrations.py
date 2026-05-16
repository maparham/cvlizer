"""Tests for the data-migrations runner and m001_legacy_achievements migration."""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.models.base import Base
from src.models.applied_data_migration import AppliedDataMigration
from src.models.cv import CV
from src.models.cv_history import CVHistory
from src.models.user import User


# ---------------------------------------------------------------------------
# Shared fixture
# ---------------------------------------------------------------------------


@pytest.fixture()
def session():
    """In-memory SQLite session with all tables created."""
    engine = create_engine("sqlite:///:memory:")
    import src.database  # noqa: F401 — side-effect: registers all models

    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    sess = Session()
    yield sess
    sess.close()


@pytest.fixture()
def user(session):
    u = User(id="user-1", clerk_id="clerk-1", email="test@example.com")
    session.add(u)
    session.commit()
    return u


def _make_cv(session, user, cv_id, parsed_data):
    cv = CV(
        id=cv_id,
        user_id=user.id,
        original_filename="cv.pdf",
        file_path="/tmp/cv.pdf",
        file_size=1234,
        file_type="pdf",
        parsed_data=parsed_data,
    )
    session.add(cv)
    session.commit()
    return cv


def _make_history(session, cv, entry_id, cv_data):
    entry = CVHistory(
        id=entry_id,
        cv_id=cv.id,
        user_id=cv.user_id,
        cv_data=cv_data,
        change_type="manual",
        data_size=len(json.dumps(cv_data)),
    )
    session.add(entry)
    session.commit()
    return entry


# ---------------------------------------------------------------------------
# Runner: skip / reapply behaviour
# ---------------------------------------------------------------------------


class TestRunner:
    def test_pending_migration_is_applied(self, session, user):
        from src.data_migrations.runner import run_pending

        assert session.query(AppliedDataMigration).count() == 0
        run_pending(session, dry_run=False)
        assert session.query(AppliedDataMigration).count() == 1
        row = session.query(AppliedDataMigration).first()
        assert row.id == "001_legacy_achievements"

    def test_already_applied_migration_is_skipped(self, session, user):
        from src.data_migrations.runner import run_pending
        from datetime import datetime, timezone

        session.add(
            AppliedDataMigration(
                id="001_legacy_achievements",
                applied_at=datetime.now(timezone.utc),
            )
        )
        session.commit()

        cv = _make_cv(
            session,
            user,
            "cv-skip",
            {
                "work_experience": [
                    {"description": "Worked", "achievements": ["Should not be merged"]}
                ]
            },
        )

        run_pending(session, dry_run=False)
        session.refresh(cv)
        # migration was skipped, achievements still present
        assert "achievements" in cv.parsed_data["work_experience"][0]

    def test_dry_run_does_not_write_ledger(self, session, user):
        from src.data_migrations.runner import run_pending

        run_pending(session, dry_run=True)
        assert session.query(AppliedDataMigration).count() == 0


# ---------------------------------------------------------------------------
# m001_legacy_achievements: persist bug fix
# ---------------------------------------------------------------------------


class TestLegacyAchievementsMigration:
    def test_non_empty_achievements_are_merged(self, session, user):
        from src.data_migrations.m001_legacy_achievements import run

        cv = _make_cv(
            session,
            user,
            "cv-1",
            {
                "work_experience": [
                    {"description": "Role", "achievements": ["Led team", "Cut costs 10%"]}
                ]
            },
        )
        run(session, dry_run=False)
        session.refresh(cv)
        we = cv.parsed_data["work_experience"][0]
        assert "achievements" not in we
        assert "Led team" in we["description"]
        assert "Cut costs 10%" in we["description"]

    def test_empty_achievements_array_key_removed_and_persisted(self, session, user):
        """Regression: row with achievements=[] must have the key removed and be saved."""
        from src.data_migrations.m001_legacy_achievements import run

        cv = _make_cv(
            session,
            user,
            "cv-empty",
            {"work_experience": [{"description": "Role", "achievements": []}]},
        )
        run(session, dry_run=False)
        session.refresh(cv)

        we = cv.parsed_data["work_experience"][0]
        assert "achievements" not in we
        assert we["description"] == "Role"

    def test_history_entries_updated(self, session, user):
        from src.data_migrations.m001_legacy_achievements import run

        cv = _make_cv(session, user, "cv-hist", {"work_experience": []})
        entry = _make_history(
            session,
            cv,
            "hist-1",
            {
                "work_experience": [
                    {"description": "Prev role", "achievements": ["Big win"]}
                ]
            },
        )
        run(session, dry_run=False)
        session.refresh(entry)
        we = entry.cv_data["work_experience"][0]
        assert "achievements" not in we
        assert "Big win" in we["description"]

    def test_no_achievements_row_not_dirtied(self, session, user):
        from src.data_migrations.m001_legacy_achievements import run

        clean_data = {"work_experience": [{"description": "Clean role"}]}
        cv = _make_cv(session, user, "cv-clean", clean_data)
        run(session, dry_run=False)
        session.refresh(cv)
        assert cv.parsed_data == clean_data

    def test_dry_run_does_not_persist(self, session, user):
        from src.data_migrations.m001_legacy_achievements import run

        cv = _make_cv(
            session,
            user,
            "cv-dry",
            {
                "work_experience": [
                    {"description": "Role", "achievements": ["Achievement"]}
                ]
            },
        )
        run(session, dry_run=True)
        session.refresh(cv)
        assert "achievements" in cv.parsed_data["work_experience"][0]
