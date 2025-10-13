"""
Integration tests for job fit draft approval flow.
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch
from datetime import datetime, timezone

from main import app
from src.models.base import Base, engine, SessionLocal
from src.models.user import User
from src.models.cv import CV
from src.models.job_description import JobDescription
from src.models.ai_draft import AIDraft


@pytest.fixture
def db_session():
    """Create test database session"""
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def test_user(db_session):
    """Create test user"""
    user = User(
        id="test-user-id", clerk_user_id="clerk-test-user", email="test@example.com"
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def test_cv(db_session, test_user):
    """Create test CV"""
    cv = CV(
        id="test-cv-id",
        user_id=test_user.id,
        filename="test.pdf",
        parsed_data={
            "personal_info": {
                "full_name": "Test User",
                "email": "test@example.com",
                "location": "US",
            },
            "section_config": {"sections": []},
        },
    )
    db_session.add(cv)
    db_session.commit()
    db_session.refresh(cv)
    return cv


@pytest.fixture
def test_job_description(db_session, test_user, test_cv):
    """Create test job description"""
    jd = JobDescription(
        id="test-jd-id",
        user_id=test_user.id,
        cv_id=test_cv.id,
        title="Python Developer",
        company="Test Corp",
        content="Looking for Python developer",
    )
    db_session.add(jd)
    db_session.commit()
    db_session.refresh(jd)
    return jd


class TestJobFitApprovalIntegration:
    """Integration tests for job fit draft approval"""

    def test_approve_draft_with_valid_data(
        self, db_session, test_cv, test_job_description
    ):
        """Test approving a draft with all required fields"""
        # Create draft with complete data
        draft = AIDraft(
            id="test-draft-id",
            cv_id=test_cv.id,
            job_description_id=test_job_description.id,
            section_type="why_good_fit",
            draft_data={
                "confidence_score": 85,
                "fit_analysis": "This is a great fit because...",
                "generated_at": "2025-01-01T12:00:00Z",
                "key_matches": ["Python", "FastAPI"],
                "missing_skills": [],
                "suggested_improvements": [],
                "strengths": ["Strong backend"],
                "weaknesses": [],
            },
            tokens_used=500,
            generation_time=2500,
            ai_model="gpt-5",
            is_generating=False,
        )
        db_session.add(draft)
        db_session.commit()

        # Mock authentication
        with patch("src.middleware.clerk_auth.get_effective_user") as mock_auth:
            mock_auth.return_value = Mock(id=test_cv.user_id)

            # Approve draft
            client = TestClient(app)
            response = client.post(
                f"/api/cvs/{test_cv.id}/why_good_fit/approve",
                json={"draft_id": draft.id},
                headers={"Authorization": "Bearer test-token"},
            )

        # Verify success
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Draft approved and committed successfully"

        # Verify CV was updated
        db_session.refresh(test_cv)
        assert "why_good_fit" in test_cv.parsed_data
        assert test_cv.parsed_data["why_good_fit"]["confidence_score"] == 85
        assert (
            test_cv.parsed_data["why_good_fit"]["content"]
            == "This is a great fit because..."
        )

        # Verify draft was deleted
        deleted_draft = db_session.query(AIDraft).filter(AIDraft.id == draft.id).first()
        assert deleted_draft is None

    def test_approve_draft_missing_confidence_score(
        self, db_session, test_cv, test_job_description
    ):
        """Test approving a draft missing confidence_score returns 400"""
        # Create draft WITHOUT confidence_score
        draft = AIDraft(
            id="test-draft-id",
            cv_id=test_cv.id,
            job_description_id=test_job_description.id,
            section_type="why_good_fit",
            draft_data={
                # confidence_score missing!
                "fit_analysis": "This is a great fit",
                "generated_at": "2025-01-01T12:00:00Z",
            },
            is_generating=False,
        )
        db_session.add(draft)
        db_session.commit()

        # Mock authentication
        with patch("src.middleware.clerk_auth.get_effective_user") as mock_auth:
            mock_auth.return_value = Mock(id=test_cv.user_id)

            # Attempt to approve draft
            client = TestClient(app)
            response = client.post(
                f"/api/cvs/{test_cv.id}/why_good_fit/approve",
                json={"draft_id": draft.id},
                headers={"Authorization": "Bearer test-token"},
            )

        # Verify failure with clear error message
        assert response.status_code == 400
        data = response.json()
        assert "invalid" in data["detail"].lower()
        assert "confidence_score" in data["detail"]

        # Verify draft still exists (wasn't deleted)
        existing_draft = db_session.query(AIDraft).filter(AIDraft.id == draft.id).first()
        assert existing_draft is not None

    def test_approve_draft_with_content_mapping(
        self, db_session, test_cv, test_job_description
    ):
        """Test approval maps fit_analysis to content when content is missing"""
        # Create draft with fit_analysis but no content
        draft = AIDraft(
            id="test-draft-id",
            cv_id=test_cv.id,
            job_description_id=test_job_description.id,
            section_type="why_good_fit",
            draft_data={
                "confidence_score": 75,
                # content field missing, should use fit_analysis
                "fit_analysis": "I'm a good fit because of my Python expertise",
                "generated_at": "2025-01-01T10:00:00Z",
            },
            is_generating=False,
        )
        db_session.add(draft)
        db_session.commit()

        # Mock authentication
        with patch("src.middleware.clerk_auth.get_effective_user") as mock_auth:
            mock_auth.return_value = Mock(id=test_cv.user_id)

            # Approve draft
            client = TestClient(app)
            response = client.post(
                f"/api/cvs/{test_cv.id}/why_good_fit/approve",
                json={"draft_id": draft.id},
                headers={"Authorization": "Bearer test-token"},
            )

        # Verify success
        assert response.status_code == 200

        # Verify content was mapped from fit_analysis
        db_session.refresh(test_cv)
        assert (
            test_cv.parsed_data["why_good_fit"]["content"]
            == "I'm a good fit because of my Python expertise"
        )
        assert (
            test_cv.parsed_data["why_good_fit"]["fit_analysis"]
            == "I'm a good fit because of my Python expertise"
        )

    def test_approve_draft_updates_section_order(
        self, db_session, test_cv, test_job_description
    ):
        """Test approval updates section_config with why_good_fit at order 2"""
        # Create draft with valid data
        draft = AIDraft(
            id="test-draft-id",
            cv_id=test_cv.id,
            job_description_id=test_job_description.id,
            section_type="why_good_fit",
            draft_data={
                "confidence_score": 90,
                "fit_analysis": "Perfect match",
                "generated_at": "2025-01-01T12:00:00Z",
            },
            is_generating=False,
        )
        db_session.add(draft)
        db_session.commit()

        # Mock authentication
        with patch("src.middleware.clerk_auth.get_effective_user") as mock_auth:
            mock_auth.return_value = Mock(id=test_cv.user_id)

            # Approve draft
            client = TestClient(app)
            response = client.post(
                f"/api/cvs/{test_cv.id}/why_good_fit/approve",
                json={"draft_id": draft.id},
                headers={"Authorization": "Bearer test-token"},
            )

        # Verify success
        assert response.status_code == 200

        # Verify section_config was updated
        db_session.refresh(test_cv)
        sections = test_cv.parsed_data["section_config"]["sections"]

        # Find why_good_fit section
        why_good_fit_section = next(
            (s for s in sections if s["type"] == "why_good_fit"), None
        )
        assert why_good_fit_section is not None
        assert why_good_fit_section["order"] == 2
        assert why_good_fit_section["visible"] is True
        assert why_good_fit_section["title"] == "Why I'm a Good Fit"

    def test_approve_nonexistent_draft(self, db_session, test_cv):
        """Test approving a non-existent draft returns 404"""
        # Mock authentication
        with patch("src.middleware.clerk_auth.get_effective_user") as mock_auth:
            mock_auth.return_value = Mock(id=test_cv.user_id)

            # Attempt to approve non-existent draft
            client = TestClient(app)
            response = client.post(
                f"/api/cvs/{test_cv.id}/why_good_fit/approve",
                json={"draft_id": "non-existent-draft"},
                headers={"Authorization": "Bearer test-token"},
            )

        # Verify 404 error
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    def test_approve_draft_with_generation_error(
        self, db_session, test_cv, test_job_description
    ):
        """Test approving a draft that has generation_error set"""
        # Create draft with error
        draft = AIDraft(
            id="test-draft-id",
            cv_id=test_cv.id,
            job_description_id=test_job_description.id,
            section_type="why_good_fit",
            draft_data={},
            is_generating=False,
            generation_error="AI generation result missing required field: confidence_score",
        )
        db_session.add(draft)
        db_session.commit()

        # Mock authentication
        with patch("src.middleware.clerk_auth.get_effective_user") as mock_auth:
            mock_auth.return_value = Mock(id=test_cv.user_id)

            # Attempt to approve draft
            client = TestClient(app)
            response = client.post(
                f"/api/cvs/{test_cv.id}/why_good_fit/approve",
                json={"draft_id": draft.id},
                headers={"Authorization": "Bearer test-token"},
            )

        # Should fail validation due to empty draft_data
        assert response.status_code == 400
