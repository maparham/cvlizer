import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from unittest.mock import patch, Mock
import os
import sys
import io

# Add the src directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'src'))

from main import app
from models.base import Base, get_db
from models.user import User
from models.cv import CV
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

@pytest.fixture(scope="function")
def auth_headers(test_user):
    """Get authentication headers for test user"""
    login_response = client.post("/auth/login", json={
        "email": "test@example.com",
        "password": "testpassword123"
    })
    access_token = login_response.json()["access_token"]
    return {"Authorization": f"Bearer {access_token}"}

@pytest.fixture(scope="function")
def test_cv(setup_database, test_user):
    """Create a test CV"""
    db = TestingSessionLocal()
    cv = CV(
        user_id=str(test_user.id),
        original_filename="test.pdf",
        file_path="/uploads/test.pdf",
        file_size=1024,
        file_type="application/pdf",
        parsed_data={"test": "data"},
        is_parsed=True
    )
    db.add(cv)
    db.commit()
    db.refresh(cv)
    yield cv
    db.close()

class TestCVAPI:
    """Integration tests for CV API"""
    
    @patch('src.services.file_service.save_uploaded_file')
    @patch('src.services.cv_service.parse_cv_with_openai')
    def test_upload_cv_success(self, mock_parse, mock_save, setup_database, auth_headers):
        """Test successful CV upload"""
        mock_save.return_value = ("/uploads/test.pdf", "test.pdf", 1024)
        mock_parse.return_value = {"parsed": "data"}
        
        # Create a mock file
        file_content = b"PDF content"
        files = {"file": ("test.pdf", io.BytesIO(file_content), "application/pdf")}
        
        response = client.post("/api/cvs/", files=files, headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["original_filename"] == "test.pdf"
        assert data["file_size"] == 1024
        assert data["file_type"] == "application/pdf"
        assert data["is_parsed"] == True
    
    def test_upload_cv_invalid_file_type(self, setup_database, auth_headers):
        """Test CV upload with invalid file type"""
        file_content = b"Text content"
        files = {"file": ("test.txt", io.BytesIO(file_content), "text/plain")}
        
        response = client.post("/api/cvs/", files=files, headers=auth_headers)
        
        assert response.status_code == 400
        assert "File type text/plain not allowed" in response.json()["detail"]
    
    def test_upload_cv_no_auth(self, setup_database):
        """Test CV upload without authentication"""
        file_content = b"PDF content"
        files = {"file": ("test.pdf", io.BytesIO(file_content), "application/pdf")}
        
        response = client.post("/api/cvs/", files=files)
        
        assert response.status_code == 403
    
    def test_list_cvs_success(self, setup_database, auth_headers, test_cv):
        """Test successful CV listing"""
        response = client.get("/api/cvs/", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert len(data["cvs"]) == 1
        assert data["cvs"][0]["id"] == str(test_cv.id)
    
    def test_list_cvs_pagination(self, setup_database, auth_headers, test_user):
        """Test CV listing with pagination"""
        # Create multiple CVs
        db = TestingSessionLocal()
        for i in range(5):
            cv = CV(
                user_id=str(test_user.id),
                original_filename=f"test{i}.pdf",
                file_path=f"/uploads/test{i}.pdf",
                file_size=1024,
                file_type="application/pdf",
                parsed_data={"test": f"data{i}"},
                is_parsed=True
            )
            db.add(cv)
        db.commit()
        db.close()
        
        response = client.get("/api/cvs/?page=1&limit=2", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 5
        assert len(data["cvs"]) == 2
        assert data["page"] == 1
        assert data["limit"] == 2
        assert data["pages"] == 3
    
    def test_get_cv_success(self, setup_database, auth_headers, test_cv):
        """Test successful CV retrieval"""
        response = client.get(f"/api/cvs/{test_cv.id}", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(test_cv.id)
        assert data["original_filename"] == "test.pdf"
    
    def test_get_cv_not_found(self, setup_database, auth_headers):
        """Test CV retrieval with non-existent CV"""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = client.get(f"/api/cvs/{fake_id}", headers=auth_headers)
        
        assert response.status_code == 404
        assert "CV not found" in response.json()["detail"]
    
    def test_get_cv_wrong_user(self, setup_database, auth_headers):
        """Test CV retrieval with CV belonging to different user"""
        # Create another user and CV
        db = TestingSessionLocal()
        other_user = User(
            email="other@example.com",
            password_hash=get_password_hash("password123"),
            is_active=True,
            email_verified=True
        )
        db.add(other_user)
        db.commit()
        db.refresh(other_user)
        
        cv = CV(
            user_id=str(other_user.id),
            original_filename="other.pdf",
            file_path="/uploads/other.pdf",
            file_size=1024,
            file_type="application/pdf",
            parsed_data={"test": "data"},
            is_parsed=True
        )
        db.add(cv)
        db.commit()
        db.refresh(cv)
        db.close()
        
        response = client.get(f"/api/cvs/{cv.id}", headers=auth_headers)
        
        assert response.status_code == 404
        assert "CV not found" in response.json()["detail"]
    
    def test_update_cv_success(self, setup_database, auth_headers, test_cv):
        """Test successful CV update"""
        new_data = {"updated": "data"}
        response = client.put(
            f"/api/cvs/{test_cv.id}",
            json={"parsed_data": new_data},
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["parsed_data"] == new_data
    
    def test_update_cv_not_found(self, setup_database, auth_headers):
        """Test CV update with non-existent CV"""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = client.put(
            f"/api/cvs/{fake_id}",
            json={"parsed_data": {"updated": "data"}},
            headers=auth_headers
        )
        
        assert response.status_code == 404
        assert "CV not found" in response.json()["detail"]
    
    @patch('src.services.file_service.delete_file')
    def test_delete_cv_success(self, mock_delete, setup_database, auth_headers, test_cv):
        """Test successful CV deletion"""
        mock_delete.return_value = True
        
        response = client.delete(f"/api/cvs/{test_cv.id}", headers=auth_headers)
        
        assert response.status_code == 200
        assert "CV deleted successfully" in response.json()["message"]
        mock_delete.assert_called_once_with(test_cv.file_path)
    
    def test_delete_cv_not_found(self, setup_database, auth_headers):
        """Test CV deletion with non-existent CV"""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = client.delete(f"/api/cvs/{fake_id}", headers=auth_headers)
        
        assert response.status_code == 404
        assert "CV not found" in response.json()["detail"]
    
    def test_delete_cv_wrong_user(self, setup_database, auth_headers):
        """Test CV deletion with CV belonging to different user"""
        # Create another user and CV
        db = TestingSessionLocal()
        other_user = User(
            email="other@example.com",
            password_hash=get_password_hash("password123"),
            is_active=True,
            email_verified=True
        )
        db.add(other_user)
        db.commit()
        db.refresh(other_user)
        
        cv = CV(
            user_id=str(other_user.id),
            original_filename="other.pdf",
            file_path="/uploads/other.pdf",
            file_size=1024,
            file_type="application/pdf",
            parsed_data={"test": "data"},
            is_parsed=True
        )
        db.add(cv)
        db.commit()
        db.refresh(cv)
        db.close()
        
        response = client.delete(f"/api/cvs/{cv.id}", headers=auth_headers)
        
        assert response.status_code == 404
        assert "CV not found" in response.json()["detail"]
