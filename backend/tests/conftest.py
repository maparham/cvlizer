"""
Pytest configuration for shared test fixtures.

This file contains shared fixtures and configuration for all tests including
rate limiting tests and impersonation tests.
"""

import pytest
import os
from unittest.mock import patch, Mock
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.models.base import Base

# Set test environment variables
os.environ["RATE_LIMIT_PER_MINUTE"] = "60"  # Higher limit for testing
os.environ["DEV_MODE"] = "true"
os.environ["CLERK_VERIFY_TOKENS"] = "false"  # Disable token verification for tests

# Test database configuration for impersonation tests
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_impersonation.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# ============================================================================
# Rate Limiting Test Fixtures
# ============================================================================


@pytest.fixture
def test_client():
    """Create a test client with rate limiting enabled."""
    from main import app

    return TestClient(app)


@pytest.fixture
def mock_user():
    """Create a mock user for testing."""
    user = Mock()
    user.id = "test_user_123"
    user.email = "test@example.com"
    user.is_active = True
    return user


@pytest.fixture
def mock_request():
    """Create a mock request for testing."""
    request = Mock()
    request.state = Mock()
    return request


@pytest.fixture
def rate_limit_config():
    """Rate limiting configuration for tests."""
    return {
        "quick_start_limit": "5/15minutes",
        "admin_limit": "10/minute",
        "test_timeout": 30,
    }


@pytest.fixture(autouse=True)
def reset_rate_limits():
    """Reset rate limits before each test."""
    # This fixture runs before each test to ensure clean state
    # In a real implementation, you might want to clear Redis or other storage
    pass


@pytest.fixture
def mock_authentication(mock_user):
    """Mock authentication for tests that need it."""
    with patch(
        "src.middleware.rate_limit_user.get_effective_user", return_value=mock_user
    ):
        yield mock_user


@pytest.fixture
def mock_no_authentication():
    """Mock no authentication for tests."""
    with patch("src.middleware.rate_limit_user.get_effective_user", return_value=None):
        yield


@pytest.fixture
def mock_ip_address(ip_address="192.168.1.100"):
    """Mock IP address for tests."""
    with patch("src.utils.rate_limit.get_remote_address", return_value=ip_address):
        yield ip_address


# Test data fixtures
@pytest.fixture
def sample_cv_file():
    """Sample CV file content for testing."""
    return b"fake pdf content for testing"


@pytest.fixture
def sample_job_text():
    """Sample job description text for testing."""
    return "Software Engineer position with Python and FastAPI experience"


@pytest.fixture
def sample_upload_files(sample_cv_file):
    """Sample file upload data for testing."""
    return {"cv_file": ("test.pdf", sample_cv_file, "application/pdf")}


# ============================================================================
# Impersonation Test Fixtures
# ============================================================================


@pytest.fixture(scope="function")
def setup_impersonation_test_db():
    """Set up test database for impersonation tests"""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def impersonation_db_session(setup_impersonation_test_db):
    """Create a fresh database session for impersonation tests"""
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def mock_clerk_auth():
    """Mock Clerk authentication for tests"""
    with (
        patch("src.middleware.clerk_auth.get_current_user_from_clerk") as mock_get_user,
        patch("src.middleware.clerk_auth.get_impersonation_session") as mock_get_session,
        patch("src.middleware.clerk_auth.get_user_by_id") as mock_get_user_by_id,
    ):
        yield {
            "get_user": mock_get_user,
            "get_session": mock_get_session,
            "get_user_by_id": mock_get_user_by_id,
        }


@pytest.fixture
def mock_audit_service():
    """Mock audit service for tests"""
    with patch("src.services.impersonation_service.audit_service") as mock_audit:
        yield mock_audit


@pytest.fixture
def mock_password_hash():
    """
    Provide a pre-computed bcrypt password hash for testing.

    This avoids triggering bcrypt's initialization and wrap bug detection
    which can cause test failures. Use this in tests instead of calling
    get_password_hash() directly.

    Password: "password123"
    Hash: Pre-computed bcrypt hash
    """
    # Pre-computed bcrypt hash for "password123"
    return "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU2fFGYqYpKm"
