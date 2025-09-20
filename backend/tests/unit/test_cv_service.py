import pytest
from unittest.mock import Mock, patch
from src.services.cv_service import (
    create_cv, get_cv_by_id, get_cvs_by_user, 
    update_cv, delete_cv, parse_cv_with_openai
)
from src.models.cv import CV


class TestCVService:
    """Test cases for CV service"""
    
    def test_create_cv(self):
        """Test CV creation"""
        db = Mock()
        mock_cv = Mock()
        db.add.return_value = None
        db.commit.return_value = None
        db.refresh.return_value = None
        
        with patch('src.services.cv_service.CV') as mock_cv_class:
            mock_cv_class.return_value = mock_cv
            
            result = create_cv(
                db=db,
                user_id="user123",
                original_filename="test.pdf",
                file_path="/uploads/test.pdf",
                file_size=1024,
                file_type="application/pdf",
                parsed_data={"test": "data"}
            )
            
            assert result == mock_cv
            db.add.assert_called_once_with(mock_cv)
            db.commit.assert_called_once()
            db.refresh.assert_called_once_with(mock_cv)
    
    def test_get_cv_by_id(self):
        """Test getting CV by ID"""
        db = Mock()
        mock_cv = Mock()
        db.query.return_value.options.return_value.filter.return_value.first.return_value = mock_cv
        
        result = get_cv_by_id(db, "cv123", "user123")
        
        assert result == mock_cv
        db.query.assert_called_once_with(CV)
    
    def test_get_cv_by_id_not_found(self):
        """Test getting CV by ID when not found"""
        db = Mock()
        db.query.return_value.options.return_value.filter.return_value.first.return_value = None
        
        result = get_cv_by_id(db, "cv123", "user123")
        
        assert result is None
    
    def test_get_cvs_by_user(self):
        """Test getting CVs by user with pagination"""
        db = Mock()
        mock_cvs = [Mock(), Mock()]
        db.query.return_value.options.return_value.filter.return_value.offset.return_value.limit.return_value.all.return_value = mock_cvs
        
        result = get_cvs_by_user(db, "user123", skip=0, limit=10)
        
        assert result == mock_cvs
        db.query.assert_called_once_with(CV)
    
    def test_update_cv(self):
        """Test updating CV"""
        db = Mock()
        mock_cv = Mock()
        mock_cv.parsed_data = {"old": "data"}
        db.query.return_value.options.return_value.filter.return_value.first.return_value = mock_cv
        db.commit.return_value = None
        db.refresh.return_value = None
        
        new_data = {"new": "data"}
        result = update_cv(db, "cv123", "user123", new_data)
        
        assert result == mock_cv
        assert mock_cv.parsed_data == new_data
        db.commit.assert_called_once()
        db.refresh.assert_called_once_with(mock_cv)
    
    def test_update_cv_not_found(self):
        """Test updating CV when not found"""
        db = Mock()
        db.query.return_value.options.return_value.filter.return_value.first.return_value = None
        
        result = update_cv(db, "cv123", "user123", {"new": "data"})
        
        assert result is None
    
    def test_delete_cv(self):
        """Test deleting CV"""
        db = Mock()
        mock_cv = Mock()
        db.query.return_value.options.return_value.filter.return_value.first.return_value = mock_cv
        db.delete.return_value = None
        db.commit.return_value = None
        
        result = delete_cv(db, "cv123", "user123")
        
        assert result == True
        db.delete.assert_called_once_with(mock_cv)
        db.commit.assert_called_once()
    
    def test_delete_cv_not_found(self):
        """Test deleting CV when not found"""
        db = Mock()
        db.query.return_value.options.return_value.filter.return_value.first.return_value = None
        
        result = delete_cv(db, "cv123", "user123")
        
        assert result == False
    
    @patch('src.services.file_service.extract_text_from_file')
    @patch('src.services.ai_service.parse_cv_text_with_openai')
    def test_parse_cv_with_openai_success(self, mock_parse_text, mock_extract_text):
        """Test successful CV parsing with OpenAI"""
        mock_extract_text.return_value = "Extracted text content"
        mock_parse_text.return_value = {"parsed": "data"}
        
        file_content = b"PDF content"
        filename = "test.pdf"
        content_type = "application/pdf"
        
        result = parse_cv_with_openai(file_content, filename, content_type)
        
        assert result == {"parsed": "data"}
        mock_extract_text.assert_called_once_with(file_content, content_type)
        mock_parse_text.assert_called_once_with("Extracted text content")
    
    @patch('src.services.file_service.extract_text_from_file')
    def test_parse_cv_with_openai_error(self, mock_extract_text):
        """Test CV parsing with error"""
        mock_extract_text.side_effect = Exception("File parsing error")
        
        file_content = b"PDF content"
        filename = "test.pdf"
        content_type = "application/pdf"
        
        result = parse_cv_with_openai(file_content, filename, content_type)
        
        assert "error" in result
        assert "File parsing error" in result["error"]
        # Error response includes default CV structure
        assert "personal_info" in result
