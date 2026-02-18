from unittest.mock import Mock, patch

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.models.base import Base
from src.models.cv import CV
from src.models.job_description import JobDescription
from src.models.cv_job_description import CVJobDescription
from src.models.user import User
from src.services.cv_parsing_service import parse_cv_with_openai
from src.services.cv_service import (
    create_cv,
    delete_cv,
    get_cv_by_id,
    get_cvs_by_user,
    get_unique_filename_for_user,
    update_cv,
)


class TestCVService:
    """Test cases for CV service"""

    def test_create_cv(self):
        """Test CV creation"""
        db = Mock()
        mock_cv = Mock()
        db.add.return_value = None
        db.commit.return_value = None
        db.refresh.return_value = None
        # get_unique_filename_for_user queries existing filenames
        db.query.return_value.filter.return_value.all.return_value = []

        with patch("src.services.cv_service.CV") as mock_cv_class:
            mock_cv_class.return_value = mock_cv

            result = create_cv(
                db=db,
                user_id="user123",
                original_filename="test.pdf",
                file_path="/uploads/test.pdf",
                file_size=1024,
                file_type="application/pdf",
                parsed_data={"test": "data"},
            )

            assert result == mock_cv
            db.add.assert_called_once_with(mock_cv)
            db.commit.assert_called_once()
            db.refresh.assert_called_once_with(mock_cv)

    def test_get_unique_filename_returns_proposed_when_unique(self):
        """Proposed filename is returned when no conflict exists."""
        db = Mock()
        db.query.return_value.filter.return_value.all.return_value = []
        result = get_unique_filename_for_user(db, "user1", "CV_Mahan_Parham.pdf")
        assert result == "CV_Mahan_Parham.pdf"

    def test_get_unique_filename_appends_index_when_duplicate(self):
        """Incremental index (1), (2), etc. is appended when name exists."""
        db = Mock()
        db.query.return_value.filter.return_value.all.return_value = [
            ("CV_Mahan_Parham.pdf",),
        ]
        result = get_unique_filename_for_user(db, "user1", "CV_Mahan_Parham.pdf")
        assert result == "CV_Mahan_Parham (1).pdf"

    def test_get_unique_filename_increments_when_multiple_duplicates(self):
        """Next available index is used when (1), (2), (3) already exist."""
        db = Mock()
        db.query.return_value.filter.return_value.all.return_value = [
            ("CV_Mahan_Parham.pdf",),
            ("CV_Mahan_Parham (1).pdf",),
            ("CV_Mahan_Parham (2).pdf",),
            ("CV_Mahan_Parham (3).pdf",),
        ]
        result = get_unique_filename_for_user(db, "user1", "CV_Mahan_Parham.pdf")
        assert result == "CV_Mahan_Parham (4).pdf"

    def test_get_cv_by_id(self):
        """Test getting CV by ID"""
        db = Mock()
        mock_cv = Mock()
        db.query.return_value.filter.return_value.first.return_value = mock_cv

        result = get_cv_by_id(db, "cv123", "user123")

        assert result == mock_cv
        db.query.assert_called_once_with(CV)

    def test_get_cv_by_id_not_found(self):
        """Test getting CV by ID when not found"""
        db = Mock()
        db.query.return_value.filter.return_value.first.return_value = None

        result = get_cv_by_id(db, "cv123", "user123")

        assert result is None

    def test_get_cvs_by_user(self):
        """Test getting CVs by user with pagination"""
        db = Mock()
        mock_cvs = [Mock(), Mock()]
        db.query.return_value.filter.return_value.order_by.return_value.offset.return_value.limit.return_value.all.return_value = (
            mock_cvs
        )

        result = get_cvs_by_user(db, "user123", skip=0, limit=10)

        assert result == mock_cvs
        db.query.assert_called_once_with(CV)

    def test_update_cv(self):
        """Test updating CV"""
        db = Mock()
        mock_cv = Mock()
        mock_cv.parsed_data = {"old": "data"}
        db.query.return_value.filter.return_value.first.return_value = mock_cv
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
        db.query.return_value.filter.return_value.first.return_value = None

        result = update_cv(db, "cv123", "user123", {"new": "data"})

        assert result is None

    def test_delete_cv(self):
        """Test deleting CV"""
        db = Mock()
        mock_cv = Mock()
        db.query.return_value.filter.return_value.first.return_value = mock_cv
        db.delete.return_value = None
        db.commit.return_value = None

        result = delete_cv(db, "cv123", "user123")

        assert result == True
        db.delete.assert_called_once_with(mock_cv)
        db.commit.assert_called_once()

    def test_delete_cv_not_found(self):
        """Test deleting CV when not found"""
        db = Mock()
        db.query.return_value.filter.return_value.first.return_value = None

        result = delete_cv(db, "cv123", "user123")

        assert result == False

    @patch("src.services.file_service.extract_text_from_file")
    @patch("src.services.ai_service.parse_cv_text_with_openai")
    @pytest.mark.asyncio
    async def test_parse_cv_with_openai_success(self, mock_parse_text, mock_extract_text):
        """Test successful CV parsing with OpenAI"""
        mock_extract_text.return_value = "Extracted text content"
        mock_parse_text.return_value = {"parsed": "data"}

        file_content = b"PDF content"
        filename = "test.pdf"
        content_type = "application/pdf"

        result = await parse_cv_with_openai(file_content, filename, content_type)

        assert result == {"parsed": "data"}
        mock_extract_text.assert_called_once_with(file_content, content_type)
        mock_parse_text.assert_called_once_with("Extracted text content")

    @patch("src.services.file_service.extract_text_from_file")
    @pytest.mark.asyncio
    async def test_parse_cv_with_openai_error(self, mock_extract_text):
        """Test CV parsing with error"""
        mock_extract_text.side_effect = Exception("File parsing error")

        file_content = b"PDF content"
        filename = "test.pdf"
        content_type = "application/pdf"

        result = await parse_cv_with_openai(file_content, filename, content_type)

        assert "error" in result
        assert "File parsing error" in result["error"]
        # Error response includes default CV structure
        assert "personal_info" in result


class TestCVDeletionWithJobDescriptions:
    """
    Test that CV deletion doesn't CASCADE delete job descriptions.

    This prevents regression of the bug where SQLAlchemy ORM cascade="all, delete-orphan"
    on CV.job_descriptions relationship caused JDs to be deleted when CV was deleted,
    overriding the database FK constraint ondelete="SET NULL".

    These tests use a real database to verify ORM behavior, not just mocks.
    """

    @pytest.fixture
    def db_session(self):
        """Create a test database session"""
        # Use in-memory SQLite for fast tests
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(bind=engine)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        session = SessionLocal()
        yield session
        session.close()

    @pytest.fixture
    def test_user(self, db_session):
        """Create a test user"""
        user = User(
            id="test-user-123",
            clerk_id="clerk-test-user",
            email="test@example.com",
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user

    def test_delete_cv_does_not_delete_job_descriptions(self, db_session, test_user):
        """
        CRITICAL: Test that deleting a CV does NOT delete its job descriptions.

        This is the core test that prevents the CASCADE delete bug.
        """
        # Create a CV
        cv = CV(
            id="test-cv-1",
            user_id=test_user.id,
            original_filename="test.pdf",
            file_path="/uploads/test.pdf",
            file_size=1024,
            file_type="application/pdf",
            parsed_data={},
        )
        db_session.add(cv)
        db_session.commit()

        # Create 2 job descriptions for this CV
        jd1 = JobDescription(
            id="test-jd-1",
            user_id=test_user.id,
            cv_id=cv.id,
            title="Software Engineer",
            company="TechCorp",
            content="Build software",
        )
        jd2 = JobDescription(
            id="test-jd-2",
            user_id=test_user.id,
            cv_id=cv.id,
            title="Product Manager",
            company="StartupCo",
            content="Manage products",
        )
        db_session.add(jd1)
        db_session.add(jd2)
        db_session.commit()

        jd1_id = jd1.id
        jd2_id = jd2.id

        # Delete the CV using the service function
        result = delete_cv(db_session, cv.id, test_user.id)
        assert result is True, "CV deletion should succeed"

        # CRITICAL: Verify CV is deleted
        cv_after = db_session.query(CV).filter(CV.id == cv.id).first()
        assert cv_after is None, "CV should be deleted"

        # CRITICAL: Verify both job descriptions still exist
        jd1_after = (
            db_session.query(JobDescription).filter(JobDescription.id == jd1_id).first()
        )
        jd2_after = (
            db_session.query(JobDescription).filter(JobDescription.id == jd2_id).first()
        )

        assert jd1_after is not None, "JD1 should NOT be deleted (CASCADE bug check)"
        assert jd2_after is not None, "JD2 should NOT be deleted (CASCADE bug check)"

        # CRITICAL: Verify both JDs have cv_id = NULL
        assert jd1_after.cv_id is None, "JD1 cv_id should be NULL after CV deletion"
        assert jd2_after.cv_id is None, "JD2 cv_id should be NULL after CV deletion"

        # Verify JDs are not hidden
        assert jd1_after.hidden is False, "JD1 should not be hidden"
        assert jd2_after.hidden is False, "JD2 should not be hidden"

        # Verify JDs still have correct user_id
        assert jd1_after.user_id == test_user.id, "JD1 user_id should be unchanged"
        assert jd2_after.user_id == test_user.id, "JD2 user_id should be unchanged"

    def test_delete_cv_removes_junction_table_associations(self, db_session, test_user):
        """
        Test that deleting a CV removes its junction table associations.

        This verifies that the many-to-many association CASCADE works correctly
        without affecting the job description itself.
        """
        # Create 2 CVs
        cv1 = CV(
            id="test-cv-1",
            user_id=test_user.id,
            original_filename="cv1.pdf",
            file_path="/uploads/cv1.pdf",
            file_size=1024,
            file_type="application/pdf",
            parsed_data={},
        )
        cv2 = CV(
            id="test-cv-2",
            user_id=test_user.id,
            original_filename="cv2.pdf",
            file_path="/uploads/cv2.pdf",
            file_size=1024,
            file_type="application/pdf",
            parsed_data={},
        )
        db_session.add(cv1)
        db_session.add(cv2)
        db_session.commit()

        # Create a job description
        jd = JobDescription(
            id="test-jd-1",
            user_id=test_user.id,
            cv_id=cv1.id,  # Original creator is CV1
            title="Shared Job",
            company="SharedCorp",
            content="This is shared",
        )
        db_session.add(jd)
        db_session.commit()

        # Create associations with both CVs
        assoc1 = CVJobDescription(cv_id=cv1.id, job_description_id=jd.id)
        assoc2 = CVJobDescription(cv_id=cv2.id, job_description_id=jd.id)
        db_session.add(assoc1)
        db_session.add(assoc2)
        db_session.commit()

        jd_id = jd.id

        # Delete CV1 (the original creator)
        result = delete_cv(db_session, cv1.id, test_user.id)
        assert result is True

        # Verify JD still exists
        jd_after = (
            db_session.query(JobDescription).filter(JobDescription.id == jd_id).first()
        )
        assert jd_after is not None, "JD should persist after CV deletion"
        assert jd_after.cv_id is None, "JD cv_id should be NULL"

        # Verify CV1's association is removed
        assoc1_after = (
            db_session.query(CVJobDescription)
            .filter(
                CVJobDescription.cv_id == cv1.id,
                CVJobDescription.job_description_id == jd_id,
            )
            .first()
        )
        assert assoc1_after is None, "CV1 association should be removed"

        # Verify CV2's association still exists
        assoc2_after = (
            db_session.query(CVJobDescription)
            .filter(
                CVJobDescription.cv_id == cv2.id,
                CVJobDescription.job_description_id == jd_id,
            )
            .first()
        )
        assert assoc2_after is not None, "CV2 association should still exist"
