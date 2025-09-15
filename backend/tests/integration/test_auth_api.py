import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from unittest.mock import patch
import os
import sys

# Add the src directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'src'))

from main import app
from models.base import Base, get_db
from models.user import User
from services.auth_service import get_password_hash

# Test database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

@pytest.fixture(scope="function")
def setup_database():
    """Set up test database for each test"""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def test_user(setup_database):
    """Create a test user"""
    db = TestingSessionLocal()
    user = User(
        email="test@example.com",
        password_hash=get_password_hash("testpassword123"),
        is_active=True,
        email_verified=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    yield user
    db.close()

class TestAuthAPI:
    """Integration tests for authentication API"""
    
    def test_register_success(self, setup_database):
        """Test successful user registration"""
        response = client.post("/auth/register", json={
            "email": "newuser@example.com",
            "password": "newpassword123"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert data["expires_in"] == 900  # 15 minutes
    
    def test_register_duplicate_email(self, setup_database, test_user):
        """Test registration with duplicate email"""
        response = client.post("/auth/register", json={
            "email": "test@example.com",
            "password": "newpassword123"
        })
        
        assert response.status_code == 400
        assert "Email already registered" in response.json()["detail"]
    
    def test_register_invalid_email(self, setup_database):
        """Test registration with invalid email"""
        response = client.post("/auth/register", json={
            "email": "invalid-email",
            "password": "newpassword123"
        })
        
        assert response.status_code == 422  # Validation error
    
    def test_login_success(self, setup_database, test_user):
        """Test successful user login"""
        response = client.post("/auth/login", json={
            "email": "test@example.com",
            "password": "testpassword123"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
    
    def test_login_wrong_password(self, setup_database, test_user):
        """Test login with wrong password"""
        response = client.post("/auth/login", json={
            "email": "test@example.com",
            "password": "wrongpassword"
        })
        
        assert response.status_code == 401
        assert "Incorrect email or password" in response.json()["detail"]
    
    def test_login_nonexistent_user(self, setup_database):
        """Test login with non-existent user"""
        response = client.post("/auth/login", json={
            "email": "nonexistent@example.com",
            "password": "testpassword123"
        })
        
        assert response.status_code == 401
        assert "Incorrect email or password" in response.json()["detail"]
    
    def test_login_inactive_user(self, setup_database):
        """Test login with inactive user"""
        db = TestingSessionLocal()
        user = User(
            email="inactive@example.com",
            password_hash=get_password_hash("testpassword123"),
            is_active=False,
            email_verified=True
        )
        db.add(user)
        db.commit()
        db.close()
        
        response = client.post("/auth/login", json={
            "email": "inactive@example.com",
            "password": "testpassword123"
        })
        
        assert response.status_code == 400
        assert "Inactive user" in response.json()["detail"]
    
    def test_refresh_token_success(self, setup_database, test_user):
        """Test successful token refresh"""
        # First login to get tokens
        login_response = client.post("/auth/login", json={
            "email": "test@example.com",
            "password": "testpassword123"
        })
        
        refresh_token = login_response.json()["refresh_token"]
        
        # Refresh token
        response = client.post("/auth/refresh", json={
            "refresh_token": refresh_token
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
    
    def test_refresh_token_invalid(self, setup_database):
        """Test token refresh with invalid token"""
        response = client.post("/auth/refresh", json={
            "refresh_token": "invalid.token.here"
        })
        
        assert response.status_code == 401
        assert "Invalid refresh token" in response.json()["detail"]
    
    def test_logout(self, setup_database):
        """Test logout endpoint"""
        response = client.post("/auth/logout")
        
        assert response.status_code == 200
        assert "Successfully logged out" in response.json()["message"]
    
    def test_get_current_user_success(self, setup_database, test_user):
        """Test getting current user with valid token"""
        # First login to get token
        login_response = client.post("/auth/login", json={
            "email": "test@example.com",
            "password": "testpassword123"
        })
        
        access_token = login_response.json()["access_token"]
        
        # Test protected endpoint (using CV list as example)
        response = client.get("/api/cvs", headers={
            "Authorization": f"Bearer {access_token}"
        })
        
        assert response.status_code == 200
    
    def test_get_current_user_invalid_token(self, setup_database):
        """Test getting current user with invalid token"""
        response = client.get("/api/cvs", headers={
            "Authorization": "Bearer invalid.token.here"
        })
        
        assert response.status_code == 401
        assert "Invalid authentication credentials" in response.json()["detail"]
    
    def test_get_current_user_no_token(self, setup_database):
        """Test getting current user without token"""
        response = client.get("/api/cvs")
        
        assert response.status_code == 403  # No authorization header
