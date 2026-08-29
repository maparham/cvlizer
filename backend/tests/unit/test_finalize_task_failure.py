"""
Unit tests for finalize_task_failure (shared background-task failure handler).

These cover the regression that motivated the helper: a background worker whose
session is left in a failed transaction (PendingRollbackError) must still be able
to persist the failure state, instead of silently leaving the record stuck in
is_generating=True forever.
"""

import uuid

import pytest
from sqlalchemy import create_engine
from sqlalchemy.exc import PendingRollbackError
from sqlalchemy.orm import sessionmaker

# Import the models package so every mapper (User, CV, JobDescription, ...) is
# registered before we create tables / configure relationships.
import src.models  # noqa: F401
from src.models.base import Base
from src.models.ai_enhancement import AIEnhancement
from src.utils.background_tasks import finalize_task_failure


@pytest.fixture()
def db():
    # Fresh in-memory engine WITHOUT the app's FK-pragma listener, so we can
    # insert an enhancement with fabricated FK ids and no parent rows.
    engine = create_engine(
        "sqlite:///:memory:", connect_args={"check_same_thread": False}
    )
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


def _make_enhancement(db) -> str:
    enhancement = AIEnhancement(
        id=str(uuid.uuid4()),
        user_id="user-1",
        cv_id="cv-1",
        job_description_id="jd-1",
        is_generating=True,
        generation_error=None,
    )
    db.add(enhancement)
    db.commit()
    return enhancement.id


def test_persists_failure_state(db):
    enh_id = _make_enhancement(db)

    result = finalize_task_failure(db, AIEnhancement, enh_id, "boom")

    assert result is True
    refreshed = db.query(AIEnhancement).filter(AIEnhancement.id == enh_id).first()
    assert refreshed.is_generating is False
    assert refreshed.generation_error == "boom"


def test_recovers_from_poisoned_session(db):
    """The core regression: a failed transaction must not block the failure write."""
    enh_id = _make_enhancement(db)

    # Poison the session exactly like the production failure: an ORM flush that
    # violates a constraint (here a duplicate primary key) deactivates the
    # transaction, so any subsequent query raises PendingRollbackError until a
    # rollback happens.
    db.add(
        AIEnhancement(
            id=enh_id,  # duplicate PK -> IntegrityError on flush
            user_id="user-1",
            cv_id="cv-1",
            job_description_id="jd-1",
            is_generating=True,
        )
    )
    with pytest.raises(Exception):
        db.flush()

    # Prove the old inline behavior (query without rollback) would have failed.
    with pytest.raises(PendingRollbackError):
        db.query(AIEnhancement).filter(AIEnhancement.id == enh_id).first()

    # The helper rolls back first, then succeeds.
    result = finalize_task_failure(db, AIEnhancement, enh_id, "boom")

    assert result is True
    refreshed = db.query(AIEnhancement).filter(AIEnhancement.id == enh_id).first()
    assert refreshed.is_generating is False
    assert refreshed.generation_error == "boom"


def test_missing_record_returns_false(db):
    result = finalize_task_failure(db, AIEnhancement, "does-not-exist", "boom")
    assert result is False
