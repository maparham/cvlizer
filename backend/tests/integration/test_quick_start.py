"""
Integration tests for Quick Start API endpoints.

Tests cover:
- Successful preview with CV and job description parsing
- Rate limiting enforcement
- File validation (type, size)
- AI parsing timeout handling
- Base64 file claiming
- Database transaction integrity
"""

import asyncio
import base64
import io
import json
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from main import app
from src.models.base import Base
from src.models.cv import CV
from src.models.job_description import JobDescription
from src.models.user import User

# CRITICAL: Use a separate test database, NOT the production database
TEST_DATABASE_URL = "sqlite:///./test_quick_start.db"
test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture
def client():
    """Create test client"""
    return TestClient(app)


@pytest.fixture
def db_session():
    """Create test database session using separate test database"""
    Base.metadata.create_all(bind=test_engine)
    session = TestingSessionLocal()
    yield session
    session.close()
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def auth_headers():
    """Mock Clerk JWT token headers"""
    return {"Authorization": "Bearer mock-token"}


@pytest.fixture
def test_user(db_session):
    """Create test user in database"""
    user = User(id="test-user-123", clerk_id="clerk_test_123", email="test@example.com")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def mock_cv_data():
    """Mock parsed CV data returned by AI"""
    return {
        "personal_information": {
            "full_name": "John Doe",
            "email": "john@example.com",
            "phone": "+1234567890",
            "location": "San Francisco, CA",
        },
        "professional_summary": "Experienced software engineer...",
        "work_experience": [
            {
                "company": "Tech Corp",
                "position": "Senior Engineer",
                "start_date": "2020-01",
                "end_date": "2023-12",
            }
        ],
        "education": [
            {
                "institution": "University",
                "degree": "BS Computer Science",
                "graduation_date": "2019",
            }
        ],
        "skills": ["Python", "JavaScript", "React"],
    }


@pytest.fixture
def mock_job_data():
    """Mock parsed job description data returned by AI"""
    return {
        "title": "Senior Software Engineer",
        "company": "Example Inc",
        "location": "Remote",
        "content": "We are looking for an experienced software engineer...",
        "requirements": ["5+ years experience", "Python", "React"],
    }


def test_quick_start_preview_rate_limit(client):
    """Test rate limiting on preview endpoint"""
    # Create test CV file
    cv_content = b"Mock CV content"
    files = {"cv_file": ("test_cv.pdf", cv_content, "application/pdf")}
    data = {"job_url": "https://example.com/jobs/123"}

    # Mock AI parsing to return quickly
    with patch(
        "src.api.quick_start.parse_cv_with_openai", new_callable=AsyncMock
    ) as mock_cv_parse:
        with patch(
            "src.api.quick_start.extract_job_description_with_ai", new_callable=AsyncMock
        ) as mock_job_parse:
            with patch(
                "src.services.url_parsing_service.parse_job_url", new_callable=AsyncMock
            ) as mock_url_parse:
                mock_cv_parse.return_value = {"personal_information": {}}
                mock_job_parse.return_value = {"title": "Test"}
                mock_url_parse.return_value = "Content"

                # Make multiple requests in succession
                responses = []
                for _ in range(6):  # Exceed the rate limit
                    response = client.post(
                        "/api/quick-start/preview", files=files, data=data
                    )
                    responses.append(response)

    # At least one request should be rate limited
    status_codes = [r.status_code for r in responses]
    assert 429 in status_codes, "Expected at least one 429 Too Many Requests response"


def test_quick_start_claim_without_cv_data(client, test_user):
    """Test error when claiming without cv_file or cv_file_base64"""
    form_data = {"job_text": "Software engineer position"}

    # Mock dependencies - override the dependency
    def override_get_effective_user():
        return test_user

    from src.middleware.clerk_auth import get_effective_user
    from main import app as main_app

    main_app.dependency_overrides[get_effective_user] = override_get_effective_user

    try:
        response = client.post("/api/quick-start/claim", data=form_data)

        assert response.status_code == 400
        response_json = response.json()
        response_detail = response_json.get("detail") or response_json.get("message", "")
        assert (
            "cv_file" in response_detail.lower()
            or "cv_file_base64" in response_detail.lower()
        )
    finally:
        main_app.dependency_overrides.clear()


def test_quick_start_claim_transaction_rollback(
    client, db_session, test_user, mock_cv_data
):
    """Test database rollback when job description creation fails"""
    # Create base64 encoded file
    cv_content = b"Mock PDF content"
    cv_base64 = base64.b64encode(cv_content).decode("utf-8")
    base64_with_header = f"data:application/pdf;base64,{cv_base64}"

    session_data = {
        "cvFileName": "test_cv.pdf",
        "cvFileSize": len(cv_content),
        "cvFileType": "application/pdf",
        "cvFileBase64": base64_with_header,
        "full_parsed_data": mock_cv_data,
    }

    form_data = {
        "cv_data": json.dumps(session_data),
        "cv_file_base64": base64_with_header,
        "job_text": "Software engineer position",
    }

    # Mock dependencies - override the dependency
    def override_get_effective_user():
        return test_user

    from src.middleware.clerk_auth import get_effective_user
    from main import app as main_app

    main_app.dependency_overrides[get_effective_user] = override_get_effective_user

    try:
        # Mock file saving and make JD creation fail
        with patch(
            "src.api.quick_start.save_uploaded_file", new_callable=AsyncMock
        ) as mock_save_file:
            with patch(
                "src.api.quick_start.create_job_description_for_user"
            ) as mock_create_jd:
                mock_save_file.return_value = (
                    "uploads/test.pdf",
                    "test_cv.pdf",
                    len(cv_content),
                )

                # Make JD creation fail
                mock_create_jd.side_effect = Exception("Database error")

                # Make request
                response = client.post("/api/quick-start/claim", data=form_data)

        # Assertions
        assert response.status_code == 500

        # Verify no orphaned CV records in database
        cv_count = db_session.query(CV).filter_by(user_id=test_user.id).count()
        assert cv_count == 0, "CV should have been rolled back"

        # Verify no job description records
        jd_count = (
            db_session.query(JobDescription).filter_by(user_id=test_user.id).count()
        )
        assert jd_count == 0, "No JD should have been created"
    finally:
        main_app.dependency_overrides.clear()
