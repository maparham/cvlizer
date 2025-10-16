"""
Pytest configuration for impersonation tests

This module provides shared fixtures and configuration for all impersonation tests.
"""

from unittest.mock import Mock, patch

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.models.base import Base

# Test database configuration
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_impersonation.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


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
