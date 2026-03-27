"""Tests for database-backed export preview jobs and on-disk storage."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.config import FileConfig, PreviewJobConfig
from src.models.base import Base
from src.models.cv import CV
from src.models.preview_job import PreviewJob
from src.models.user import User
from src.services.platform.preview_cleanup_service import (
    cleanup_expired_preview_jobs,
    cleanup_stale_preview_jobs,
)
from src.utils.preview_storage import (
    delete_preview_files,
    read_preview_page,
    write_preview_pages,
)


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()


@pytest.fixture
def user_and_cv(db_session):
    user = User(
        email="pv@test.com",
        password_hash="x",
        is_active=True,
        email_verified=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    cv = CV(
        user_id=user.id,
        original_filename="cv.pdf",
        file_path="/tmp/cv.pdf",
        file_size=100,
        file_type="application/pdf",
    )
    db_session.add(cv)
    db_session.commit()
    db_session.refresh(cv)
    return user, cv


def test_preview_job_crud(db_session, user_and_cv):
    user, cv = user_and_cv
    now = datetime.now(timezone.utc)
    job = PreviewJob(
        job_id=f"{cv.id}_standard",
        cv_id=cv.id,
        user_id=user.id,
        template_name="standard",
        status="pending",
        expires_at=now + timedelta(hours=1),
    )
    db_session.add(job)
    db_session.commit()

    loaded = db_session.query(PreviewJob).filter_by(job_id=job.job_id).first()
    assert loaded is not None
    assert loaded.status == "pending"


def test_cleanup_expired_preview_job(db_session, user_and_cv, tmp_path, monkeypatch):
    monkeypatch.setattr(FileConfig, "UPLOAD_DIR", str(tmp_path))
    user, cv = user_and_cv
    past = datetime.now(timezone.utc) - timedelta(hours=1)
    job = PreviewJob(
        job_id=f"{cv.id}_staletpl",
        cv_id=cv.id,
        user_id=user.id,
        template_name="staletpl",
        status="completed",
        page_count=1,
        expires_at=past,
    )
    db_session.add(job)
    db_session.commit()
    write_preview_pages(job.job_id, [b"\x89PNG\r\n\x1a\n"])

    removed = cleanup_expired_preview_jobs(db_session)
    assert removed == 1
    assert db_session.query(PreviewJob).count() == 0


def test_cleanup_stale_pending_job(db_session, user_and_cv):
    user, cv = user_and_cv
    old = datetime.now(timezone.utc) - timedelta(
        minutes=PreviewJobConfig.STALE_MINUTES + 5
    )
    job = PreviewJob(
        job_id=f"{cv.id}_stuck",
        cv_id=cv.id,
        user_id=user.id,
        template_name="stuck",
        status="pending",
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
    )
    db_session.add(job)
    db_session.commit()
    # Force created_at for SQLite (no server default override in test)
    db_session.query(PreviewJob).filter_by(job_id=job.job_id).update(
        {"created_at": old}, synchronize_session=False
    )
    db_session.commit()

    removed = cleanup_stale_preview_jobs(db_session)
    assert removed == 1


def test_generate_preview_sync_marks_failed_when_processing_commit_fails(monkeypatch):
    """Commit failure while setting status to processing must call _fail_preview_job."""
    from src.api.cvs import preview as preview_api

    fail_calls = []

    def capture_fail(job_id, error):
        fail_calls.append((job_id, error))

    monkeypatch.setattr(preview_api, "_fail_preview_job", capture_fail)

    class CommitFailsSession:
        def query(self, _model):
            return self

        def filter(self, *_a, **_k):
            return self

        def first(self):
            class _Job:
                user_id = "user-1"

            return _Job()

        def commit(self):
            raise RuntimeError("database is closed")

        def close(self):
            pass

    monkeypatch.setattr(preview_api, "SessionLocal", lambda: CommitFailsSession())

    preview_api.generate_preview_sync("cv-uuid", "standard", "user-1")

    assert len(fail_calls) == 1
    assert fail_calls[0][0] == "cv-uuid_standard"
    assert "database is closed" in fail_calls[0][1]


def test_preview_storage_write_read(monkeypatch, tmp_path):
    monkeypatch.setattr(FileConfig, "UPLOAD_DIR", str(tmp_path))
    jid = "00000000-0000-0000-0000-000000000001_standard"
    write_preview_pages(jid, [b"a", b"b"])
    assert read_preview_page(jid, 1) == b"a"
    assert read_preview_page(jid, 2) == b"b"
    delete_preview_files(jid)
    assert not (tmp_path / "previews").exists() or not list(
        (tmp_path / "previews").rglob("page_1.png")
    )
