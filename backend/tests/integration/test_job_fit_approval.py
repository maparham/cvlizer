"""
Integration tests for job fit draft approval flow.
"""

from datetime import datetime, timezone
from unittest.mock import Mock, patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from main import app
from src.models.ai_draft import AIDraft
from src.models.base import Base
from src.models.cv import CV
from src.models.job_description import JobDescription
from src.models.user import User

# CRITICAL: Use a separate test database, NOT the production database
TEST_DATABASE_URL = "sqlite:///./test_job_fit_approval.db"
test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture
def db_session():
    """Create test database session using separate test database"""
    Base.metadata.create_all(bind=test_engine)
    session = TestingSessionLocal()
    yield session
    session.close()
    Base.metadata.drop_all(bind=test_engine)


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

        # Verify CV was updated: custom section + metadata, no top-level why_good_fit
        db_session.refresh(test_cv)
        assert "why_good_fit" not in test_cv.parsed_data
        assert "why_good_fit_metadata" in test_cv.parsed_data
        assert test_cv.parsed_data["why_good_fit_metadata"]["confidence_score"] == 85
        custom = test_cv.parsed_data.get("custom_sections") or []
        wgf = next((s for s in custom if s.get("id") == "why_good_fit"), None)
        assert wgf is not None
        assert wgf.get("type") == "cover_letter"
        assert wgf.get("content") == "This is a great fit because..."

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

        # Verify content was mapped from fit_analysis into custom section
        db_session.refresh(test_cv)
        custom = test_cv.parsed_data.get("custom_sections") or []
        wgf = next((s for s in custom if s.get("id") == "why_good_fit"), None)
        assert wgf is not None
        assert wgf.get("content") == "I'm a good fit because of my Python expertise"

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

        # Verify section_config was updated with custom why_good_fit entry
        db_session.refresh(test_cv)
        sections = test_cv.parsed_data["section_config"]["sections"]

        why_good_fit_section = next(
            (s for s in sections if s.get("id") == "why_good_fit"), None
        )
        assert why_good_fit_section is not None
        assert why_good_fit_section["type"] == "custom"
        assert why_good_fit_section["order"] == 2
        assert why_good_fit_section["visible"] is True
        assert why_good_fit_section["title"] == "Why I'm a Good Fit"

    def test_approve_draft_preserves_custom_section_order(
        self, db_session, test_cv, test_job_description
    ):
        """Test approval preserves relative order of custom sections without order."""
        # CV with two custom sections that have no explicit order (should get 12, 13)
        ref_id = "custom_ref"
        extra_id = "custom_extra"
        test_cv.parsed_data = dict(test_cv.parsed_data or {})
        test_cv.parsed_data["section_config"] = {
            "sections": [
                {"id": ref_id, "type": "custom", "title": "References", "visible": True},
                {"id": extra_id, "type": "custom", "title": "Extra", "visible": True},
            ]
        }
        test_cv.parsed_data["custom_sections"] = [
            {"id": ref_id, "type": "cover_letter", "title": "References", "content": ""},
            {"id": extra_id, "type": "cover_letter", "title": "Extra", "content": ""},
        ]
        db_session.add(test_cv)
        db_session.commit()
        db_session.refresh(test_cv)

        draft = AIDraft(
            id="test-draft-id",
            cv_id=test_cv.id,
            job_description_id=test_job_description.id,
            section_type="why_good_fit",
            draft_data={
                "confidence_score": 80,
                "fit_analysis": "Good fit",
                "generated_at": "2025-01-01T12:00:00Z",
            },
            is_generating=False,
        )
        db_session.add(draft)
        db_session.commit()

        with patch("src.middleware.clerk_auth.get_effective_user") as mock_auth:
            mock_auth.return_value = Mock(id=test_cv.user_id)
            client = TestClient(app)
            response = client.post(
                f"/api/cvs/{test_cv.id}/why_good_fit/approve",
                json={"draft_id": draft.id},
                headers={"Authorization": "Bearer test-token"},
            )

        assert response.status_code == 200
        db_session.refresh(test_cv)
        sections = test_cv.parsed_data["section_config"]["sections"]
        orders_by_id = {s["id"]: s["order"] for s in sections}
        # why_good_fit at 2; ref and extra should get 12, 13 preserving relative order
        assert orders_by_id["why_good_fit"] == 2
        assert orders_by_id[ref_id] == 12
        assert orders_by_id[extra_id] == 13
        sorted_ids = [s["id"] for s in sorted(sections, key=lambda s: s["order"])]
        assert sorted_ids.index(ref_id) < sorted_ids.index(extra_id)

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
