from datetime import datetime, timedelta
from unittest.mock import Mock, patch

import pytest

from src.models.user import User
from src.services.auth_service import (
    authenticate_user,
    create_access_token,
    create_refresh_token,
    create_user,
    get_password_hash,
    get_user_by_email,
    verify_password,
    verify_token,
)


class TestAuthService:
    """Test cases for authentication service"""

    @patch("src.services.auth_service.pwd_context.hash")
    @patch("src.services.auth_service.pwd_context.verify")
    def test_verify_password(self, mock_verify, mock_hash):
        """Test password verification"""
        password = "testpassword123"
        mock_hash.return_value = "$2b$12$mockedhash"
        hashed = get_password_hash(password)

        mock_verify.return_value = True
        assert verify_password(password, hashed) == True

        mock_verify.return_value = False
        assert verify_password("wrongpassword", hashed) == False

    @patch("src.services.auth_service.pwd_context.hash")
    def test_get_password_hash(self, mock_hash):
        """Test password hashing"""
        password = "testpassword123"
        mock_hash.return_value = (
            "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU2fFGYqYpKm"
        )
        hashed = get_password_hash(password)

        assert hashed != password
        assert len(hashed) > 0
        assert hashed.startswith("$2b$")

    def test_create_access_token(self):
        """Test access token creation"""
        data = {"sub": "user123", "email": "test@example.com"}
        token = create_access_token(data)

        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0

    def test_create_refresh_token(self):
        """Test refresh token creation"""
        data = {"sub": "user123", "email": "test@example.com"}
        token = create_refresh_token(data)

        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0

    def test_verify_token_valid(self):
        """Test token verification with valid token"""
        data = {"sub": "user123", "email": "test@example.com"}
        token = create_access_token(data)

        payload = verify_token(token, "access")
        assert payload is not None
        assert payload["sub"] == "user123"
        assert payload["email"] == "test@example.com"
        assert payload["type"] == "access"

    def test_verify_token_invalid(self):
        """Test token verification with invalid token"""
        invalid_token = "invalid.token.here"
        payload = verify_token(invalid_token, "access")
        assert payload is None

    def test_verify_token_wrong_type(self):
        """Test token verification with wrong token type"""
        data = {"sub": "user123", "email": "test@example.com"}
        access_token = create_access_token(data)

        payload = verify_token(access_token, "refresh")
        assert payload is None

    @patch("src.services.auth_service.pwd_context.hash")
    @patch("src.services.auth_service.pwd_context.verify")
    def test_authenticate_user_success(self, mock_verify, mock_hash):
        """Test successful user authentication"""
        # Create a real user object with proper password hash
        from src.models.user import User

        user = User()
        mock_hash.return_value = "$2b$12$mockedhash"
        user.password_hash = "$2b$12$mockedhash"

        db = Mock()
        db.query.return_value.filter.return_value.first.return_value = user

        mock_verify.return_value = True
        result = authenticate_user(db, "test@example.com", "testpassword123")

        assert result == user

    @patch("src.services.auth_service.pwd_context.hash")
    @patch("src.services.auth_service.pwd_context.verify")
    def test_authenticate_user_wrong_password(self, mock_verify, mock_hash):
        """Test authentication with wrong password"""
        # Create a real user object with different password hash
        from src.models.user import User

        user = User()
        mock_hash.return_value = "$2b$12$mockedhash"
        user.password_hash = "$2b$12$mockedhash"

        db = Mock()
        db.query.return_value.filter.return_value.first.return_value = user

        mock_verify.return_value = False
        result = authenticate_user(db, "test@example.com", "testpassword123")

        assert result is None

    def test_authenticate_user_not_found(self):
        """Test authentication with non-existent user"""
        db = Mock()
        db.query.return_value.filter.return_value.first.return_value = None

        result = authenticate_user(db, "nonexistent@example.com", "testpassword123")

        assert result is None

    def test_get_user_by_email(self):
        """Test getting user by email"""
        db = Mock()
        mock_user = Mock()
        db.query.return_value.filter.return_value.first.return_value = mock_user

        result = get_user_by_email(db, "test@example.com")

        assert result == mock_user
        db.query.assert_called_once_with(User)

    @patch("src.services.auth_service.pwd_context.hash")
    def test_create_user(self, mock_hash):
        """Test user creation"""
        mock_hash.return_value = "$2b$12$mockedhash"
        db = Mock()
        mock_user = Mock()
        db.add.return_value = None
        db.commit.return_value = None
        db.refresh.return_value = None

        with patch("src.services.auth_service.User") as mock_user_class:
            mock_user_class.return_value = mock_user

            result = create_user(db, "test@example.com", "testpassword123")

            assert result == mock_user
            db.add.assert_called_once_with(mock_user)
            db.commit.assert_called_once()
            db.refresh.assert_called_once_with(mock_user)
