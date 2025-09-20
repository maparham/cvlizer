"""
Unit tests for CV History API endpoints.

Tests the REST API endpoints for CV version history including:
- Creating history snapshots
- Retrieving history entries
- Computing diffs between versions
- Restoring versions
- History statistics
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from unittest.mock import patch, MagicMock
import json
from datetime import datetime

from main import app
from src.models import get_db, CVHistory, CV, User
from src.services.cv_diff_service import cv_diff_service
from src.api.auth import get_current_user


class TestCVHistoryAPI:
    """Test suite for CV History API endpoints."""
    
    def setup_method(self):
        """Set up test fixtures."""
        # Mock data
        self.mock_user = User(
            id='user_123',
            email='test@example.com',
            password_hash='hashed_password'
        )
        
        # Mock database and auth dependencies
        self.mock_db = MagicMock()
        
        # Override FastAPI dependencies
        app.dependency_overrides[get_db] = lambda: self.mock_db
        app.dependency_overrides[get_current_user] = lambda: self.mock_user
        
        self.client = TestClient(app)
        
        self.mock_cv = CV(
            id='cv_123',
            user_id='user_123',
            original_filename='test_cv.pdf',
            file_path='/path/to/test_cv.pdf',
            file_size=1024,
            file_type='application/pdf',
            parsed_data={'test': 'data'},
            is_parsed=True
        )
        
        self.sample_cv_data = {
            'personal_info': {
                'full_name': 'John Doe',
                'email': 'john@example.com',
                'location': 'New York, NY'
            },
            'work_experience': [
                {
                    'id': 'work_123',
                    'company': 'TechCorp',
                    'position': 'Developer',
                    'start_date': '2023-01-01'
                }
            ]
        }
    
    def teardown_method(self):
        """Clean up test fixtures."""
        # Clear dependency overrides
        app.dependency_overrides.clear()
    
    def test_create_history_entry_success(self):
        """Test successful history entry creation."""
        # Mock CV query
        self.mock_db.query.return_value.filter.return_value.first.return_value = self.mock_cv
        
        # Mock history entry creation
        mock_history_entry = CVHistory(
            id='history_123',
            cv_id='cv_123',
            user_id='user_123',
            cv_data=self.sample_cv_data,
            change_type='manual_save',
            description='Test snapshot',
            data_size=1024
        )
        self.mock_db.add.return_value = None
        self.mock_db.commit.return_value = None
        self.mock_db.refresh.return_value = None
        
        # Make request
        response = self.client.post(
            '/api/cvs/cv_123/history',
            json={
                'cv_data': self.sample_cv_data,
                'change_type': 'manual_save',
                'description': 'Test snapshot'
            }
        )
        
        # Verify response
        assert response.status_code == 200
        data = response.json()
        assert 'id' in data
        assert data['changeType'] == 'manual_save'
        assert data['description'] == 'Test snapshot'
    
    def test_get_history_entries_success(self):
        """Test successful retrieval of history entries."""
        # Mock CV query
        self.mock_db.query.return_value.filter.return_value.first.return_value = self.mock_cv
        
        # Mock history entries
        mock_entries = [
            CVHistory(
                id='history_1',
                cv_id='cv_123',
                user_id='user_123',
                cv_data=self.sample_cv_data,
                change_type='initial_load',
                description='Original version',
                is_initial=True,
                created_at=datetime.now()
            ),
            CVHistory(
                id='history_2',
                cv_id='cv_123',
                user_id='user_123',
                cv_data=self.sample_cv_data,
                change_type='manual_save',
                description='Updated position',
                is_initial=False,
                created_at=datetime.now()
            )
        ]
        self.mock_db.query.return_value.filter.return_value.order_by.return_value.all.return_value = mock_entries
        
        # Make request
        response = self.client.get('/api/cvs/cv_123/history')
        
        # Verify response
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]['isInitial'] == True
        assert data[1]['description'] == 'Updated position'
    
    @patch('src.services.cv_diff_service.cv_diff_service.compute_diff')
    def test_get_version_diff_success(self, mock_compute_diff):
        """Test successful diff computation between versions."""
        # Setup mocks
        mock_db = MagicMock()
        mock_get_db.return_value = mock_db
        mock_get_user.return_value = self.mock_user
        
        # Mock CV query
        mock_db.query.return_value.filter.return_value.first.return_value = self.mock_cv
        
        # Mock history entries
        original_entry = CVHistory(
            id='history_original',
            cv_data={'work_experience': [{'id': 'work_1', 'position': 'Developer'}]},
            is_initial=True
        )
        target_entry = CVHistory(
            id='history_target',
            cv_data={'work_experience': [{'id': 'work_1', 'position': 'Senior Developer'}]}
        )
        
        # Mock history queries
        def mock_query_side_effect(*args):
            mock_query = MagicMock()
            mock_filter = MagicMock()
            mock_query.filter.return_value = mock_filter
            
            # Simulate different queries based on filter conditions
            if 'is_initial' in str(args):
                mock_filter.first.return_value = original_entry
            else:
                mock_filter.first.return_value = target_entry
            
            return mock_query
        
        mock_db.query.side_effect = mock_query_side_effect
        
        # Mock diff service
        mock_compute_diff.return_value = {
            'changes': [
                {
                    'type': 'field_changed',
                    'section': 'work_experience',
                    'description': 'Work Experience: Position changed from "Developer" to "Senior Developer"',
                    'details': [],
                    'text_diff': None,
                    'icon': 'edit',
                    'color': 'warning'
                }
            ],
            'summary': '1 Change',
            'total_changes': 1
        }
        
        # Make request
        response = self.client.get('/api/cvs/cv_123/history/history_target/diff')
        
        # Verify response
        assert response.status_code == 200
        data = response.json()
        assert data['total_changes'] == 1
        assert data['summary'] == '1 Change'
        assert len(data['changes']) == 1
        assert 'Position changed' in data['changes'][0]['description']
    
    @patch('src.api.cv_history.get_current_user')
    @patch('src.api.cv_history.get_db')
    def test_get_version_diff_not_found(self, mock_get_db, mock_get_user):
        """Test diff endpoint with non-existent CV."""
        # Setup mocks
        mock_db = MagicMock()
        mock_get_db.return_value = mock_db
        mock_get_user.return_value = self.mock_user
        
        # Mock CV not found
        mock_db.query.return_value.filter.return_value.first.return_value = None
        
        # Make request
        response = self.client.get('/api/cvs/nonexistent/history/entry_123/diff')
        
        # Verify error response
        assert response.status_code == 404
        assert 'CV not found' in response.json()['detail']
    
    @patch('src.api.cv_history.get_current_user')
    @patch('src.api.cv_history.get_db')
    def test_restore_version_success(self, mock_get_db, mock_get_user):
        """Test successful version restoration."""
        # Setup mocks
        mock_db = MagicMock()
        mock_get_db.return_value = mock_db
        mock_get_user.return_value = self.mock_user
        
        # Mock CV and history entry
        mock_db.query.return_value.filter.return_value.first.return_value = self.mock_cv
        
        mock_history_entry = CVHistory(
            id='history_123',
            cv_data=self.sample_cv_data,
            created_at=datetime.now()
        )
        
        # Set up query chain for history entry
        mock_history_query = MagicMock()
        mock_history_filter = MagicMock()
        mock_history_query.filter.return_value = mock_history_filter
        mock_history_filter.first.return_value = mock_history_entry
        
        # Mock the CV query to return the CV, and history query to return the entry
        def query_side_effect(model):
            if model == CV:
                cv_query = MagicMock()
                cv_query.filter.return_value.first.return_value = self.mock_cv
                return cv_query
            elif model == CVHistory:
                return mock_history_query
        
        mock_db.query.side_effect = query_side_effect
        
        # Make request
        response = self.client.post('/api/cvs/cv_123/history/history_123/restore')
        
        # Verify response
        assert response.status_code == 200
        data = response.json()
        assert 'message' in data
        assert 'restored successfully' in data['message'].lower()


if __name__ == '__main__':
    pytest.main([__file__])
