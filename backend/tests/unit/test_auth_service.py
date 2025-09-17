import pytest
from unittest.mock import Mock, patch
from src.services.auth_service import (
    verify_password, get_password_hash, create_access_token, 
    create_refresh_token, verify_token, authenticate_user, 
    get_user_by_email, create_user
)
from src.models.user import User
from datetime import datetime, timedelta


class TestAuthService:
    """Test cases for authentication service"""
    
    def test_verify_password(self):
        """Test password verification"""
        password = "testpassword123"
        hashed = get_password_hash(password)
        
        assert verify_password(password, hashed) == True
        assert verify_password("wrongpassword", hashed) == False
    
    def test_get_password_hash(self):
        """Test password hashing"""
        password = "testpassword123"
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
    
    def test_authenticate_user_success(self):
        """Test successful user authentication"""
        # Create a real user object with proper password hash
        from src.models.user import User
        user = User()
        user.password_hash = get_password_hash("testpassword123")
        
        db = Mock()
        db.query.return_value.filter.return_value.first.return_value = user
        
        result = authenticate_user(db, "test@example.com", "testpassword123")
        
        assert result == user
    
    def test_authenticate_user_wrong_password(self):
        """Test authentication with wrong password"""
        # Create a real user object with different password hash
        from src.models.user import User
        user = User()
        user.password_hash = get_password_hash("differentpassword")
        
        db = Mock()
        db.query.return_value.filter.return_value.first.return_value = user
        
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
    
    def test_create_user(self):
        """Test user creation"""
        db = Mock()
        mock_user = Mock()
        db.add.return_value = None
        db.commit.return_value = None
        db.refresh.return_value = None
        
        with patch('src.services.auth_service.User') as mock_user_class:
            mock_user_class.return_value = mock_user
            
            result = create_user(db, "test@example.com", "testpassword123")
            
            assert result == mock_user
            db.add.assert_called_once_with(mock_user)
            db.commit.assert_called_once()
            db.refresh.assert_called_once_with(mock_user)
