from datetime import datetime

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from src.models.ai_section import AISection
from src.models.base import Base
from src.models.cv import CV
from src.models.job_description import JobDescription
from src.models.user import User
from src.services.auth_service import get_password_hash


class TestUserModel:
    """Test cases for User model"""

    @pytest.fixture(scope="function")
    def db_session(self):
        """Create a test database session"""
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)
        SessionLocal = sessionmaker(bind=engine)
        session = SessionLocal()
        yield session
        session.close()

    def test_user_creation(self, db_session):
        """Test user creation with valid data"""
        user = User(
            email="test@example.com",
            password_hash=get_password_hash("password123"),
            is_active=True,
            email_verified=True,
        )

        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        assert user.id is not None
        assert user.email == "test@example.com"
        assert user.is_active is True
        assert user.email_verified is True
        assert user.created_at is not None
        assert user.updated_at is not None

    def test_user_email_uniqueness(self, db_session):
        """Test that email must be unique"""
        user1 = User(
            email="test@example.com",
            password_hash=get_password_hash("password123"),
            is_active=True,
            email_verified=True,
        )

        user2 = User(
            email="test@example.com",  # Same email
            password_hash=get_password_hash("password456"),
            is_active=True,
            email_verified=True,
        )

        db_session.add(user1)
        db_session.commit()

        db_session.add(user2)
        with pytest.raises(Exception):  # Should raise integrity error
            db_session.commit()

    def test_user_default_values(self, db_session):
        """Test user default values"""
        user = User(
            email="test@example.com", password_hash=get_password_hash("password123")
        )

        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        assert user.is_active is True  # Default value
        assert user.email_verified is False  # Default value

    def test_user_string_representation(self, db_session):
        """Test user string representation"""
        user = User(
            email="test@example.com", password_hash=get_password_hash("password123")
        )

        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        assert str(user) == f"<User {user.email}>"

    def test_user_password_verification(self, db_session):
        """Test password verification"""
        password = "password123"
        user = User(email="test@example.com", password_hash=get_password_hash(password))

        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        # Password should be hashed, not stored as plain text
        assert user.password_hash != password
        assert len(user.password_hash) > 0


class TestCVModel:
    """Test cases for CV model"""

    @pytest.fixture(scope="function")
    def db_session(self):
        """Create a test database session"""
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)
        SessionLocal = sessionmaker(bind=engine)
        session = SessionLocal()
        yield session
        session.close()

    def test_cv_creation(self, db_session):
        """Test CV creation with valid data"""
        cv = CV(
            user_id="user-123",
            original_filename="test.pdf",
            file_path="/uploads/test.pdf",
            file_size=1024,
            file_type="application/pdf",
            parsed_data={"test": "data"},
            is_parsed=True,
        )

        db_session.add(cv)
        db_session.commit()
        db_session.refresh(cv)

        assert cv.id is not None
        assert cv.user_id == "user-123"
        assert cv.original_filename == "test.pdf"
        assert cv.file_path == "/uploads/test.pdf"
        assert cv.file_size == 1024
        assert cv.file_type == "application/pdf"
        assert cv.parsed_data == {"test": "data"}
        assert cv.is_parsed is True
        assert cv.created_at is not None
        assert cv.updated_at is not None

    def test_cv_default_values(self, db_session):
        """Test CV default values"""
        cv = CV(
            user_id="user-123",
            original_filename="test.pdf",
            file_path="/uploads/test.pdf",
            file_size=1024,
            file_type="application/pdf",
        )

        db_session.add(cv)
        db_session.commit()
        db_session.refresh(cv)

        assert cv.parsed_data is None  # Default value
        assert cv.is_parsed is False  # Default value

    def test_cv_string_representation(self, db_session):
        """Test CV string representation"""
        cv = CV(
            user_id="user-123",
            original_filename="test.pdf",
            file_path="/uploads/test.pdf",
            file_size=1024,
            file_type="application/pdf",
        )

        db_session.add(cv)
        db_session.commit()
        db_session.refresh(cv)

        assert str(cv) == f"<CV {cv.original_filename}>"

    def test_cv_parsed_data_json(self, db_session):
        """Test CV parsed_data as JSON"""
        parsed_data = {
            "personal_info": {"full_name": "John Doe", "email": "john@example.com"},
            "work_experience": [{"company": "Tech Corp", "position": "Developer"}],
        }

        cv = CV(
            user_id="user-123",
            original_filename="test.pdf",
            file_path="/uploads/test.pdf",
            file_size=1024,
            file_type="application/pdf",
            parsed_data=parsed_data,
        )

        db_session.add(cv)
        db_session.commit()
        db_session.refresh(cv)

        assert cv.parsed_data == parsed_data
        assert isinstance(cv.parsed_data, dict)


class TestJobDescriptionModel:
    """Test cases for JobDescription model"""

    @pytest.fixture(scope="function")
    def db_session(self):
        """Create a test database session"""
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)
        SessionLocal = sessionmaker(bind=engine)
        session = SessionLocal()
        yield session
        session.close()

    @pytest.fixture(scope="function")
    def test_user(self, db_session):
        """Create a test user for JobDescription foreign key"""
        user = User(
            email="testuser@example.com",
            password_hash=get_password_hash("password123"),
            is_active=True,
            email_verified=True,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user

    def test_job_description_creation(self, db_session, test_user):
        """Test job description creation with valid data"""
        job_desc = JobDescription(
            user_id=test_user.id,
            title="Senior Software Engineer",
            company="Tech Company",
            description="We are looking for a senior software engineer...",
            requirements=[
                "5+ years of experience in software development",
                "Strong knowledge of JavaScript and React",
                "Experience with Node.js and databases",
            ],
            location="New York, NY",
            salary_range="$100,000 - $150,000",
            employment_type="Full-time",
        )

        db_session.add(job_desc)
        db_session.commit()
        db_session.refresh(job_desc)

        assert job_desc.id is not None
        assert job_desc.user_id == test_user.id
        assert job_desc.title == "Senior Software Engineer"
        assert job_desc.company == "Tech Company"
        assert job_desc.description == "We are looking for a senior software engineer..."
        assert job_desc.requirements == [
            "5+ years of experience in software development",
            "Strong knowledge of JavaScript and React",
            "Experience with Node.js and databases",
        ]
        assert job_desc.location == "New York, NY"
        assert job_desc.salary_range == "$100,000 - $150,000"
        assert job_desc.employment_type == "Full-time"
        assert job_desc.created_at is not None
        assert job_desc.updated_at is not None

    def test_job_description_default_values(self, db_session, test_user):
        """Test job description default values"""
        job_desc = JobDescription(
            user_id=test_user.id, title="Software Engineer", company="Tech Company"
        )

        db_session.add(job_desc)
        db_session.commit()
        db_session.refresh(job_desc)

        assert job_desc.user_id == test_user.id
        assert job_desc.description is None  # Default value
        assert job_desc.requirements is None  # Default value
        assert job_desc.location is None  # Default value
        assert job_desc.salary_range is None  # Default value
        assert job_desc.employment_type is None  # Default value
        assert job_desc.hidden is False  # Default value
        assert job_desc.is_parsing is False  # Default value
        assert job_desc.parse_error is None  # Default value
        assert job_desc.created_at is not None
        assert job_desc.updated_at is not None

    def test_job_description_string_representation(self, db_session, test_user):
        """Test job description string representation"""
        job_desc = JobDescription(
            user_id=test_user.id, title="Software Engineer", company="Tech Company"
        )

        db_session.add(job_desc)
        db_session.commit()
        db_session.refresh(job_desc)

        assert job_desc.user_id == test_user.id
        assert str(job_desc) == f"<JobDescription {job_desc.title} at {job_desc.company}>"

    def test_job_description_requirements_json(self, db_session, test_user):
        """Test job description requirements as JSON"""
        requirements = [
            "5+ years of experience",
            "Strong communication skills",
            "Team player",
        ]

        job_desc = JobDescription(
            user_id=test_user.id,
            title="Software Engineer",
            company="Tech Company",
            requirements=requirements,
        )

        db_session.add(job_desc)
        db_session.commit()
        db_session.refresh(job_desc)

        assert job_desc.user_id == test_user.id
        assert job_desc.requirements == requirements
        assert isinstance(job_desc.requirements, list)


class TestAISectionModel:
    """Test cases for AISection model"""

    @pytest.fixture(scope="function")
    def db_session(self):
        """Create a test database session"""
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)
        SessionLocal = sessionmaker(bind=engine)
        session = SessionLocal()
        yield session
        session.close()

    def test_ai_section_creation(self, db_session):
        """Test AI section creation with valid data"""
        ai_section = AISection(
            cv_id="cv-123",
            section_type="personal_info",
            suggestions={
                "suggestions": [
                    {
                        "field": "full_name",
                        "current": "John Doe",
                        "suggested": "John A. Doe",
                        "reason": "Adding middle initial for professionalism",
                    }
                ]
            },
            optimized_data={"full_name": "John A. Doe", "email": "john@example.com"},
        )

        db_session.add(ai_section)
        db_session.commit()
        db_session.refresh(ai_section)

        assert ai_section.id is not None
        assert ai_section.cv_id == "cv-123"
        assert ai_section.section_type == "personal_info"
        assert ai_section.suggestions == {
            "suggestions": [
                {
                    "field": "full_name",
                    "current": "John Doe",
                    "suggested": "John A. Doe",
                    "reason": "Adding middle initial for professionalism",
                }
            ]
        }
        assert ai_section.optimized_data == {
            "full_name": "John A. Doe",
            "email": "john@example.com",
        }
        assert ai_section.created_at is not None
        assert ai_section.updated_at is not None

    def test_ai_section_default_values(self, db_session):
        """Test AI section default values"""
        ai_section = AISection(cv_id="cv-123", section_type="personal_info")

        db_session.add(ai_section)
        db_session.commit()
        db_session.refresh(ai_section)

        assert ai_section.suggestions is None  # Default value
        assert ai_section.optimized_data is None  # Default value

    def test_ai_section_string_representation(self, db_session):
        """Test AI section string representation"""
        ai_section = AISection(cv_id="cv-123", section_type="personal_info")

        db_session.add(ai_section)
        db_session.commit()
        db_session.refresh(ai_section)

        assert (
            str(ai_section)
            == f"<AISection {ai_section.section_type} for CV {ai_section.cv_id}>"
        )

    def test_ai_section_suggestions_json(self, db_session):
        """Test AI section suggestions as JSON"""
        suggestions = {
            "personal_info": {
                "suggestions": [
                    {
                        "field": "full_name",
                        "current": "John Doe",
                        "suggested": "John A. Doe",
                        "reason": "Adding middle initial for professionalism",
                    }
                ]
            },
            "work_experience": {
                "suggestions": [
                    {
                        "field": "description",
                        "current": "Developed applications",
                        "suggested": "Developed scalable web applications serving 10,000+ users",
                        "reason": "Add quantifiable achievements",
                    }
                ]
            },
        }

        ai_section = AISection(
            cv_id="cv-123", section_type="personal_info", suggestions=suggestions
        )

        db_session.add(ai_section)
        db_session.commit()
        db_session.refresh(ai_section)

        assert ai_section.suggestions == suggestions
        assert isinstance(ai_section.suggestions, dict)

    def test_ai_section_optimized_data_json(self, db_session):
        """Test AI section optimized data as JSON"""
        optimized_data = {
            "personal_info": {
                "full_name": "John A. Doe",
                "email": "john@example.com",
                "phone": "+1234567890",
                "location": "New York, NY",
            },
            "professional_summary": "Senior Software Engineer with 5+ years of experience developing scalable web applications using modern technologies.",
        }

        ai_section = AISection(
            cv_id="cv-123", section_type="personal_info", optimized_data=optimized_data
        )

        db_session.add(ai_section)
        db_session.commit()
        db_session.refresh(ai_section)

        assert ai_section.optimized_data == optimized_data
        assert isinstance(ai_section.optimized_data, dict)


class TestModelRelationships:
    """Test cases for model relationships"""

    @pytest.fixture(scope="function")
    def db_session(self):
        """Create a test database session"""
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine)
        SessionLocal = sessionmaker(bind=engine)
        session = SessionLocal()
        yield session
        session.close()

    def test_user_cv_relationship(self, db_session):
        """Test user-CV relationship"""
        user = User(
            email="test@example.com", password_hash=get_password_hash("password123")
        )

        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        cv = CV(
            user_id=str(user.id),
            original_filename="test.pdf",
            file_path="/uploads/test.pdf",
            file_size=1024,
            file_type="application/pdf",
        )

        db_session.add(cv)
        db_session.commit()

        # Test that we can query CVs by user
        user_cvs = db_session.query(CV).filter(CV.user_id == str(user.id)).all()
        assert len(user_cvs) == 1
        assert user_cvs[0].original_filename == "test.pdf"

    def test_cv_ai_section_relationship(self, db_session):
        """Test CV-AI section relationship"""
        user = User(
            email="test@example.com", password_hash=get_password_hash("password123")
        )

        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)

        cv = CV(
            user_id=str(user.id),
            original_filename="test.pdf",
            file_path="/uploads/test.pdf",
            file_size=1024,
            file_type="application/pdf",
        )

        db_session.add(cv)
        db_session.commit()
        db_session.refresh(cv)

        ai_section = AISection(
            cv_id=str(cv.id),
            section_type="personal_info",
            suggestions={"test": "suggestions"},
            optimized_data={"test": "data"},
        )

        db_session.add(ai_section)
        db_session.commit()

        # Test that we can query AI sections by CV
        cv_ai_sections = (
            db_session.query(AISection).filter(AISection.cv_id == str(cv.id)).all()
        )
        assert len(cv_ai_sections) == 1
        assert cv_ai_sections[0].section_type == "personal_info"
