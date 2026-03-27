"""Unit tests for share service token lifecycle and analytics."""

from types import SimpleNamespace

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.models.base import Base
from src.models.cv import CV
from src.models.job_description import JobDescription
from src.models.user import User
from src.sharing.share_service import (
    disable_cv_sharing,
    disable_jd_sharing,
    enable_cv_sharing,
    enable_jd_sharing,
    generate_share_token,
    get_share_analytics,
    log_share_view,
    regenerate_cv_share_token,
)

TEST_DATABASE_URL = "sqlite:///./test_share_service.db"
test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def _make_request(headers=None, client_host="127.0.0.1"):
    return SimpleNamespace(
        headers=headers or {},
        client=SimpleNamespace(host=client_host),
    )


def _seed_data(db):
    user = User(id="user-1", clerk_id="clerk-user-1", email="u1@example.com")
    db.add(user)
    cv = CV(
        id="cv-1",
        user_id=user.id,
        original_filename="Test CV.pdf",
        file_path="/tmp/test.pdf",
        file_size=100,
        file_type="application/pdf",
        parsed_data={"personal_info": {"full_name": "Test User"}},
        is_parsed=True,
    )
    db.add(cv)
    jd = JobDescription(
        id="jd-1",
        user_id=user.id,
        cv_id=cv.id,
        title="Engineer",
        company="ACME",
        content="We need engineers",
    )
    db.add(jd)
    db.commit()
    return user, cv, jd


def test_share_service_token_and_analytics_flow():
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    try:
        user, cv, _jd = _seed_data(db)

        token = generate_share_token()
        assert token and isinstance(token, str)

        enabled = enable_cv_sharing(db, cv.id, user.id, "shell")
        assert enabled is not None
        assert enabled.is_public_shared is True
        assert enabled.public_share_token
        assert enabled.public_share_view_mode == "shell"

        first_token = enabled.public_share_token
        regenerated = regenerate_cv_share_token(db, cv.id, user.id)
        assert regenerated is not None
        assert regenerated.public_share_token
        assert regenerated.public_share_token != first_token

        request = _make_request(
            headers={
                "User-Agent": "pytest-agent",
                "Referer": "https://example.com",
                "X-Forwarded-For": "10.20.30.40",
            }
        )
        log_share_view(db, "cv", cv.id, request)
        log_share_view(db, "cv", cv.id, request)

        analytics = get_share_analytics(db, "cv", cv.id, user.id)
        assert analytics is not None
        assert analytics["total_views"] == 2
        assert analytics["unique_ips"] == 1
        assert len(analytics["recent_views"]) == 2

        disabled = disable_cv_sharing(db, cv.id, user.id)
        assert disabled is not None
        assert disabled.is_public_shared is False
    finally:
        db.close()
        Base.metadata.drop_all(bind=test_engine)


def test_enable_preserves_public_share_created_at_when_re_enabling():
    """Re-enabling with an existing token must not reset public_share_created_at."""
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    try:
        user, cv, jd = _seed_data(db)

        cv_enabled = enable_cv_sharing(db, cv.id, user.id, "shell")
        assert cv_enabled and cv_enabled.public_share_created_at
        cv_created_at = cv_enabled.public_share_created_at

        disable_cv_sharing(db, cv.id, user.id)
        cv_again = enable_cv_sharing(db, cv.id, user.id, "shell")
        assert cv_again and cv_again.public_share_created_at == cv_created_at

        jd_enabled = enable_jd_sharing(db, jd.id, user.id)
        assert jd_enabled and jd_enabled.public_share_created_at
        jd_created_at = jd_enabled.public_share_created_at

        disable_jd_sharing(db, jd.id, user.id)
        jd_again = enable_jd_sharing(db, jd.id, user.id)
        assert jd_again and jd_again.public_share_created_at == jd_created_at
    finally:
        db.close()
        Base.metadata.drop_all(bind=test_engine)
