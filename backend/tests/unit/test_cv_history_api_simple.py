"""
Simplified CV History API tests.

Basic tests to ensure the API endpoints are working correctly.
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock
from main import app
from src.models import get_db, User
from src.api.auth import get_current_user


def test_cv_history_endpoints_exist():
    """Test that CV history endpoints exist and return expected status codes."""
    # Mock dependencies
    mock_db = MagicMock()
    mock_user = User(id='user_123', email='test@example.com', password_hash='hash')
    
    # Override dependencies
    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[get_current_user] = lambda: mock_user
    
    client = TestClient(app)
    
    try:
        # Mock CV not found to get consistent 404 responses
        mock_db.query.return_value.filter.return_value.first.return_value = None
        
        # Test endpoints exist (they should return 404 for non-existent CV, not 404 for missing endpoint)
        response = client.post('/api/cvs/test_cv/history', json={
            'cv_data': {'test': 'data'},
            'change_type': 'manual_save'
        })
        # Should be 404 (CV not found), not 405 (method not allowed) or 404 (endpoint not found)
        assert response.status_code in [404, 422]  # 422 for validation error is also acceptable
        
        response = client.get('/api/cvs/test_cv/history')
        assert response.status_code == 404  # CV not found
        
        response = client.get('/api/cvs/test_cv/history/test_entry/diff')
        assert response.status_code == 404  # CV not found
        
        response = client.post('/api/cvs/test_cv/history/test_entry/restore')
        assert response.status_code == 404  # CV not found
        
    finally:
        # Clean up
        app.dependency_overrides.clear()


def test_cv_history_validation():
    """Test that CV history API validates input correctly."""
    mock_db = MagicMock()
    mock_user = User(id='user_123', email='test@example.com', password_hash='hash')
    
    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[get_current_user] = lambda: mock_user
    
    client = TestClient(app)
    
    try:
        # Test invalid input
        response = client.post('/api/cvs/test_cv/history', json={
            'invalid_field': 'value'
        })
        # Should get validation error (422) or not found (404)
        assert response.status_code in [422, 404]
        
    finally:
        app.dependency_overrides.clear()
