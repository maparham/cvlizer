"""
Integration tests for Job Description CV Association endpoints.

These tests verify the API endpoints for managing JD-CV associations
and ensure proper user ownership validation.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from main import app
from src.models import User, CV, JobDescription, CVJobDescription
from src.models.base import Base
from src.utils.sqlite_foreign_keys import register_sqlite_pragma_foreign_keys

# CRITICAL: Use a separate test database, NOT the production database
TEST_DATABASE_URL = "sqlite:///./test_jd_associations.db"
test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
register_sqlite_pragma_foreign_keys(test_engine)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture
def db_session():
    """Create test database session using separate test database"""
    Base.metadata.create_all(bind=test_engine)
    session = TestingSessionLocal()
    yield session
    session.close()
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def client():
    """Create test client"""
    return TestClient(app)


@pytest.fixture
def test_user(db_session):
    """Create test user"""
    user = User(id="test-user-id", clerk_id="clerk-test-user", email="test@example.com")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


class TestJobDescriptionAssociations:
    """Test job description CV association endpoints."""

    @pytest.fixture
    def test_user(self, db_session: Session):
        """Create a test user."""
        user = User(
            id="test-user-1",
            clerk_id="clerk-test-user-1",
            email="test@example.com",
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user

    @pytest.fixture
    def test_cv(self, db_session: Session, test_user: User):
        """Create a test CV."""
        cv = CV(
            id="test-cv-1",
            user_id=test_user.id,
            original_filename="test.pdf",
            file_path="/test/test.pdf",
            file_size=1024,
            file_type="application/pdf",
            parsed_data={},
        )
        db_session.add(cv)
        db_session.commit()
        db_session.refresh(cv)
        return cv

    @pytest.fixture
    def test_cv2(self, db_session: Session, test_user: User):
        """Create a second test CV."""
        cv = CV(
            id="test-cv-2",
            user_id=test_user.id,
            original_filename="test2.pdf",
            file_path="/test/test2.pdf",
            file_size=1024,
            file_type="application/pdf",
            parsed_data={},
        )
        db_session.add(cv)
        db_session.commit()
        db_session.refresh(cv)
        return cv

    @pytest.fixture
    def test_job_description(self, db_session: Session, test_user: User, test_cv: CV):
        """Create a test job description."""
        jd = JobDescription(
            id="test-jd-1",
            user_id=test_user.id,
            cv_id=test_cv.id,  # Original creator CV
            title="Test Job",
            company="Test Company",
            location="Test Location",
            content="Test job description content",
        )
        db_session.add(jd)
        db_session.commit()
        db_session.refresh(jd)

        # Create initial association with the original CV
        association = CVJobDescription(
            cv_id=test_cv.id,
            job_description_id=jd.id,
        )
        db_session.add(association)
        db_session.commit()

        return jd

    @pytest.fixture
    def other_user(self, db_session: Session):
        """Create another test user."""
        user = User(
            id="test-user-2",
            clerk_id="clerk-test-user-2",
            email="other@example.com",
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        return user

    @pytest.fixture
    def other_cv(self, db_session: Session, other_user: User):
        """Create a CV for the other user."""
        cv = CV(
            id="test-cv-other",
            user_id=other_user.id,
            original_filename="other.pdf",
            file_path="/test/other.pdf",
            file_size=1024,
            file_type="application/pdf",
            parsed_data={},
        )
        db_session.add(cv)
        db_session.commit()
        db_session.refresh(cv)
        return cv

    def test_associate_job_description_with_cv(
        self, client: TestClient, test_job_description: JobDescription, test_cv2: CV
    ):
        """Test associating a job description with a CV."""
        # Associate JD with second CV
        response = client.post(
            f"/api/job-descriptions/{test_job_description.id}/cvs/{test_cv2.id}",
            headers={"X-User-ID": test_job_description.user_id},
        )

        assert response.status_code == 200

        # Verify association was created
        response = client.get(
            "/api/job-descriptions",
            headers={"X-User-ID": test_job_description.user_id},
        )
        assert response.status_code == 200

        job_descriptions = response.json()["job_descriptions"]
        jd_data = next(
            jd for jd in job_descriptions if jd["id"] == test_job_description.id
        )

        assert test_cv2.id in jd_data["cv_ids"]
        assert test_job_description.cv_id in jd_data["cv_ids"]  # Original CV still there

    def test_associate_job_description_idempotent(
        self, client: TestClient, test_job_description: JobDescription, test_cv: CV
    ):
        """Test that associating an already associated JD is idempotent."""
        # Try to associate JD with its original CV again
        response = client.post(
            f"/api/job-descriptions/{test_job_description.id}/cvs/{test_cv.id}",
            headers={"X-User-ID": test_job_description.user_id},
        )

        assert response.status_code == 200

        # Verify association still exists (not duplicated)
        response = client.get(
            "/api/job-descriptions",
            headers={"X-User-ID": test_job_description.user_id},
        )
        assert response.status_code == 200

        job_descriptions = response.json()["job_descriptions"]
        jd_data = next(
            jd for jd in job_descriptions if jd["id"] == test_job_description.id
        )

        # Should only appear once in cv_ids
        cv_id_count = jd_data["cv_ids"].count(test_cv.id)
        assert cv_id_count == 1

    def test_associate_job_description_unauthorized(
        self, client: TestClient, test_job_description: JobDescription, other_cv: CV
    ):
        """Test that users cannot associate JDs with CVs they don't own."""
        # Try to associate JD with another user's CV
        response = client.post(
            f"/api/job-descriptions/{test_job_description.id}/cvs/{other_cv.id}",
            headers={"X-User-ID": test_job_description.user_id},
        )

        assert response.status_code == 403

    def test_associate_nonexistent_job_description(self, client: TestClient, test_cv: CV):
        """Test associating a non-existent job description."""
        response = client.post(
            f"/api/job-descriptions/nonexistent-id/cvs/{test_cv.id}",
            headers={"X-User-ID": test_cv.user_id},
        )

        assert response.status_code == 404

    def test_associate_job_description_nonexistent_cv(
        self, client: TestClient, test_job_description: JobDescription
    ):
        """Test associating a job description with a non-existent CV."""
        response = client.post(
            f"/api/job-descriptions/{test_job_description.id}/cvs/nonexistent-id",
            headers={"X-User-ID": test_job_description.user_id},
        )

        assert response.status_code == 404

    def test_disassociate_job_description_from_cv(
        self, client: TestClient, test_job_description: JobDescription, test_cv: CV
    ):
        """Test disassociating a job description from a CV."""
        # First verify association exists
        response = client.get(
            "/api/job-descriptions",
            headers={"X-User-ID": test_job_description.user_id},
        )
        assert response.status_code == 200

        job_descriptions = response.json()["job_descriptions"]
        jd_data = next(
            jd for jd in job_descriptions if jd["id"] == test_job_description.id
        )
        assert test_cv.id in jd_data["cv_ids"]

        # Disassociate JD from CV
        response = client.delete(
            f"/api/job-descriptions/{test_job_description.id}/cvs/{test_cv.id}",
            headers={"X-User-ID": test_job_description.user_id},
        )

        assert response.status_code == 200

        # Verify association was removed
        response = client.get(
            "/api/job-descriptions",
            headers={"X-User-ID": test_job_description.user_id},
        )
        assert response.status_code == 200

        job_descriptions = response.json()["job_descriptions"]
        jd_data = next(
            jd for jd in job_descriptions if jd["id"] == test_job_description.id
        )
        assert test_cv.id not in jd_data["cv_ids"]

    def test_disassociate_nonexistent_association(
        self, client: TestClient, test_job_description: JobDescription, test_cv2: CV
    ):
        """Test disassociating a non-existent association."""
        response = client.delete(
            f"/api/job-descriptions/{test_job_description.id}/cvs/{test_cv2.id}",
            headers={"X-User-ID": test_job_description.user_id},
        )

        assert response.status_code == 404

    def test_disassociate_unauthorized(
        self, client: TestClient, test_job_description: JobDescription, other_cv: CV
    ):
        """Test that users cannot disassociate JDs from CVs they don't own."""
        response = client.delete(
            f"/api/job-descriptions/{test_job_description.id}/cvs/{other_cv.id}",
            headers={"X-User-ID": test_job_description.user_id},
        )

        assert response.status_code == 403

    def test_get_job_descriptions_returns_cv_ids(
        self, client: TestClient, test_job_description: JobDescription, test_cv2: CV
    ):
        """Test that GET /api/job-descriptions returns cv_ids array."""
        # First associate JD with second CV
        response = client.post(
            f"/api/job-descriptions/{test_job_description.id}/cvs/{test_cv2.id}",
            headers={"X-User-ID": test_job_description.user_id},
        )
        assert response.status_code == 200

        # Get job descriptions
        response = client.get(
            "/api/job-descriptions",
            headers={"X-User-ID": test_job_description.user_id},
        )
        assert response.status_code == 200

        job_descriptions = response.json()["job_descriptions"]
        jd_data = next(
            jd for jd in job_descriptions if jd["id"] == test_job_description.id
        )

        # Verify cv_ids array contains both CVs
        assert "cv_ids" in jd_data
        assert isinstance(jd_data["cv_ids"], list)
        assert test_job_description.cv_id in jd_data["cv_ids"]  # Original CV
        assert test_cv2.id in jd_data["cv_ids"]  # Associated CV

    def test_cv_scoped_endpoints_backward_compatibility(
        self, client: TestClient, test_job_description: JobDescription, test_cv: CV
    ):
        """Test that CV-scoped JD endpoints still work for backward compatibility."""
        # Test GET /api/cvs/{cv_id}/job-descriptions
        response = client.get(
            f"/api/cvs/{test_cv.id}/job-descriptions",
            headers={"X-User-ID": test_cv.user_id},
        )
        assert response.status_code == 200

        job_descriptions = response.json()["job_descriptions"]
        assert len(job_descriptions) >= 1

        # Should return all user JDs, not just CV-specific ones
        jd_ids = [jd["id"] for jd in job_descriptions]
        assert test_job_description.id in jd_ids

    def test_job_description_created_with_cv_association(
        self, client: TestClient, test_user: User, test_cv: CV
    ):
        """Test that creating a JD with cv_id creates the association."""
        jd_data = {
            "title": "New Test Job",
            "company": "New Test Company",
            "location": "New Test Location",
            "content": "New test job description content",
            "cv_id": test_cv.id,
        }

        response = client.post(
            "/api/job-descriptions",
            headers={"X-User-ID": test_user.id},
            json=jd_data,
        )

        assert response.status_code == 200
        created_jd = response.json()

        # Verify cv_id is set
        assert created_jd["cv_id"] == test_cv.id

        # Verify cv_ids array contains the CV
        assert test_cv.id in created_jd["cv_ids"]

    def test_multiple_cv_associations(
        self, client: TestClient, test_job_description: JobDescription, test_cv2: CV
    ):
        """Test that a JD can be associated with multiple CVs."""
        # Associate with second CV
        response = client.post(
            f"/api/job-descriptions/{test_job_description.id}/cvs/{test_cv2.id}",
            headers={"X-User-ID": test_job_description.user_id},
        )
        assert response.status_code == 200

        # Verify both associations exist
        response = client.get(
            "/api/job-descriptions",
            headers={"X-User-ID": test_job_description.user_id},
        )
        assert response.status_code == 200

        job_descriptions = response.json()["job_descriptions"]
        jd_data = next(
            jd for jd in job_descriptions if jd["id"] == test_job_description.id
        )

        assert len(jd_data["cv_ids"]) == 2
        assert test_job_description.cv_id in jd_data["cv_ids"]
        assert test_cv2.id in jd_data["cv_ids"]

    def test_delete_job_description_cascades_associations(
        self, client: TestClient, test_job_description: JobDescription, test_cv2: CV
    ):
        """Test that deleting a JD removes all its associations."""
        # First associate with second CV
        response = client.post(
            f"/api/job-descriptions/{test_job_description.id}/cvs/{test_cv2.id}",
            headers={"X-User-ID": test_job_description.user_id},
        )
        assert response.status_code == 200

        # Delete the job description
        response = client.delete(
            f"/api/job-descriptions/{test_job_description.id}",
            headers={"X-User-ID": test_job_description.user_id},
        )
        assert response.status_code == 200

        # Verify JD no longer exists
        response = client.get(
            f"/api/job-descriptions/{test_job_description.id}",
            headers={"X-User-ID": test_job_description.user_id},
        )
        assert response.status_code == 404

    def test_delete_cv_cascades_associations(
        self, client: TestClient, test_job_description: JobDescription, test_cv2: CV
    ):
        """Test that deleting a CV removes its JD associations."""
        # First associate JD with second CV
        response = client.post(
            f"/api/job-descriptions/{test_job_description.id}/cvs/{test_cv2.id}",
            headers={"X-User-ID": test_job_description.user_id},
        )
        assert response.status_code == 200

        # Delete the CV
        response = client.delete(
            f"/api/cvs/{test_cv2.id}",
            headers={"X-User-ID": test_cv2.user_id},
        )
        assert response.status_code == 200

        # Verify JD still exists but association is gone
        response = client.get(
            "/api/job-descriptions",
            headers={"X-User-ID": test_job_description.user_id},
        )
        assert response.status_code == 200

        job_descriptions = response.json()["job_descriptions"]
        jd_data = next(
            jd for jd in job_descriptions if jd["id"] == test_job_description.id
        )

        # Should only have the original CV association
        assert len(jd_data["cv_ids"]) == 1
        assert test_job_description.cv_id in jd_data["cv_ids"]
        assert test_cv2.id not in jd_data["cv_ids"]


def create_test_cv(db: Session, user_id: str, title: str) -> CV:
    """Helper function to create a test CV."""
    cv = CV(
        user_id=user_id,
        original_filename=f"{title}.pdf",
        file_path=f"/test/{title}.pdf",
        file_size=1024,
        file_type="application/pdf",
        parsed_data={},
    )
    db.add(cv)
    db.commit()
    db.refresh(cv)
    return cv


def create_test_job_description(
    db: Session,
    user_id: str,
    cv_id: str,
    title: str,
    company: str,
    location: str = None,
    content: str = "Test content",
) -> JobDescription:
    """Helper function to create a test job description."""
    jd = JobDescription(
        user_id=user_id,
        cv_id=cv_id,
        title=title,
        company=company,
        location=location,
        content=content,
    )
    db.add(jd)
    db.commit()
    db.refresh(jd)
    return jd


def associate_jd_with_cv(db: Session, jd_id: str, cv_id: str) -> CVJobDescription:
    """Helper function to associate a JD with a CV."""
    association = CVJobDescription(
        cv_id=cv_id,
        job_description_id=jd_id,
    )
    db.add(association)
    db.commit()
    return association


class TestJDSharingBetweenCVs:
    """Test that job descriptions are properly shared between CVs of the same user."""

    def test_user_jds_visible_to_all_user_cvs(self, client, test_user, db_session):
        """Test that all user JDs are visible when listing from any CV."""
        # Create CV A
        cv_a = create_test_cv(db_session, test_user.id, "CV A")

        # Create JD1 from CV A
        jd1 = create_test_job_description(
            db_session,
            test_user.id,
            cv_a.id,
            title="Software Engineer",
            company="TechCorp",
            location="San Francisco",
            content="Build amazing software",
        )

        # Create JD2 from CV A
        jd2 = create_test_job_description(
            db_session,
            test_user.id,
            cv_a.id,
            title="Product Manager",
            company="StartupCo",
            location="New York",
            content="Lead product development",
        )

        # Associate both JDs with CV A
        associate_jd_with_cv(db_session, jd1.id, cv_a.id)
        associate_jd_with_cv(db_session, jd2.id, cv_a.id)

        # Create CV B
        cv_b = create_test_cv(db_session, test_user.id, "CV B")

        # Test: CV B should see both JDs when listing CV-scoped endpoints
        response = client.get(
            f"/api/cvs/{cv_b.id}/job-descriptions", headers={"X-User-ID": test_user.id}
        )
        assert response.status_code == 200

        jds = response.json()["job_descriptions"]
        assert len(jds) == 2

        jd_titles = [jd["title"] for jd in jds]
        assert "Software Engineer" in jd_titles
        assert "Product Manager" in jd_titles

        # Test: User-scoped endpoint should also show both JDs
        response = client.get(
            "/api/job-descriptions", headers={"X-User-ID": test_user.id}
        )
        assert response.status_code == 200

        jds = response.json()["job_descriptions"]
        assert len(jds) == 2

    def test_jd_association_independence(self, client, test_user, db_session):
        """Test that associating JD with one CV doesn't affect other CVs."""
        # Create CV A and CV B
        cv_a = create_test_cv(db_session, test_user.id, "CV A")
        cv_b = create_test_cv(db_session, test_user.id, "CV B")

        # Create JD from CV A
        jd = create_test_job_description(
            db_session,
            test_user.id,
            cv_a.id,
            title="Shared Role",
            company="Shared Company",
            content="This role should be shared",
        )

        # Initially, JD is only associated with CV A
        response = client.get(
            f"/api/job-descriptions/{jd.id}", headers={"X-User-ID": test_user.id}
        )
        assert response.status_code == 200
        assert cv_a.id in [assoc["cv_id"] for assoc in response.json()["cv_ids"]]

        # Associate JD with CV B
        response = client.post(
            f"/api/job-descriptions/{jd.id}/cvs/{cv_b.id}",
            headers={"X-User-ID": test_user.id},
        )
        assert response.status_code == 200

        # Verify JD is now associated with both CVs
        response = client.get(
            f"/api/job-descriptions/{jd.id}", headers={"X-User-ID": test_user.id}
        )
        assert response.status_code == 200

        cv_ids = [assoc["cv_id"] for assoc in response.json()["cv_ids"]]
        assert cv_a.id in cv_ids
        assert cv_b.id in cv_ids

        # Verify both CVs can see the JD
        for cv_id in [cv_a.id, cv_b.id]:
            response = client.get(
                f"/api/cvs/{cv_id}/job-descriptions", headers={"X-User-ID": test_user.id}
            )
            assert response.status_code == 200

            jds = response.json()["job_descriptions"]
            jd_titles = [jd["title"] for jd in jds]
            assert "Shared Role" in jd_titles

    def test_multiple_cvs_can_select_same_jd(self, client, test_user, db_session):
        """Test that multiple CVs can independently select the same JD."""
        # Create CV A, CV B, and CV C
        cv_a = create_test_cv(db_session, test_user.id, "CV A")
        cv_b = create_test_cv(db_session, test_user.id, "CV B")
        cv_c = create_test_cv(db_session, test_user.id, "CV C")

        # Create JD from CV A
        jd = create_test_job_description(
            db_session,
            test_user.id,
            cv_a.id,
            title="Popular Role",
            company="Popular Company",
            content="Everyone wants this role",
        )

        # Associate JD with all three CVs
        for cv_id in [cv_a.id, cv_b.id, cv_c.id]:
            response = client.post(
                f"/api/job-descriptions/{jd.id}/cvs/{cv_id}",
                headers={"X-User-ID": test_user.id},
            )
            assert response.status_code == 200

        # Verify all CVs can see the JD
        for cv_id in [cv_a.id, cv_b.id, cv_c.id]:
            response = client.get(
                f"/api/cvs/{cv_id}/job-descriptions", headers={"X-User-ID": test_user.id}
            )
            assert response.status_code == 200

            jds = response.json()["job_descriptions"]
            jd_titles = [jd["title"] for jd in jds]
            assert "Popular Role" in jd_titles

    def test_disassociating_jd_from_cv_preserves_other_associations(
        self, client, test_user, db_session
    ):
        """Test that disassociating JD from one CV doesn't affect other CV associations."""
        # Create CV A, CV B, and CV C
        cv_a = create_test_cv(db_session, test_user.id, "CV A")
        cv_b = create_test_cv(db_session, test_user.id, "CV B")
        cv_c = create_test_cv(db_session, test_user.id, "CV C")

        # Create JD
        jd = create_test_job_description(
            db_session,
            test_user.id,
            cv_a.id,
            title="Multi-CV Role",
            company="Multi-CV Company",
            content="Associated with multiple CVs",
        )

        # Associate JD with all three CVs
        for cv_id in [cv_a.id, cv_b.id, cv_c.id]:
            associate_jd_with_cv(db_session, jd.id, cv_id)

        # Verify all associations exist
        response = client.get(
            f"/api/job-descriptions/{jd.id}", headers={"X-User-ID": test_user.id}
        )
        assert response.status_code == 200

        cv_ids = [assoc["cv_id"] for assoc in response.json()["cv_ids"]]
        assert len(cv_ids) == 3
        assert cv_a.id in cv_ids
        assert cv_b.id in cv_ids
        assert cv_c.id in cv_ids

        # Disassociate JD from CV B
        response = client.delete(
            f"/api/job-descriptions/{jd.id}/cvs/{cv_b.id}",
            headers={"X-User-ID": test_user.id},
        )
        assert response.status_code == 200

        # Verify CV A and CV C still have the association
        response = client.get(
            f"/api/job-descriptions/{jd.id}", headers={"X-User-ID": test_user.id}
        )
        assert response.status_code == 200

        cv_ids = [assoc["cv_id"] for assoc in response.json()["cv_ids"]]
        assert len(cv_ids) == 2
        assert cv_a.id in cv_ids
        assert cv_c.id in cv_ids
        assert cv_b.id not in cv_ids

        # Verify CV B no longer sees the JD
        response = client.get(
            f"/api/cvs/{cv_b.id}/job-descriptions", headers={"X-User-ID": test_user.id}
        )
        assert response.status_code == 200

        jds = response.json()["job_descriptions"]
        jd_titles = [jd["title"] for jd in jds]
        assert "Multi-CV Role" not in jd_titles

        # Verify CV A and CV C still see the JD
        for cv_id in [cv_a.id, cv_c.id]:
            response = client.get(
                f"/api/cvs/{cv_id}/job-descriptions", headers={"X-User-ID": test_user.id}
            )
            assert response.status_code == 200

            jds = response.json()["job_descriptions"]
            jd_titles = [jd["title"] for jd in jds]
            assert "Multi-CV Role" in jd_titles

    def test_jd_deletion_removes_all_associations(self, client, test_user, db_session):
        """Test that deleting a JD removes all CV associations."""
        # Create CV A, CV B, and CV C
        cv_a = create_test_cv(db_session, test_user.id, "CV A")
        cv_b = create_test_cv(db_session, test_user.id, "CV B")
        cv_c = create_test_cv(db_session, test_user.id, "CV C")

        # Create JD
        jd = create_test_job_description(
            db_session,
            test_user.id,
            cv_a.id,
            title="To Be Deleted",
            company="Delete Company",
            content="This will be deleted",
        )

        # Associate JD with all three CVs
        for cv_id in [cv_a.id, cv_b.id, cv_c.id]:
            associate_jd_with_cv(db_session, jd.id, cv_id)

        # Verify associations exist
        response = client.get(
            f"/api/job-descriptions/{jd.id}", headers={"X-User-ID": test_user.id}
        )
        assert response.status_code == 200
        assert len(response.json()["cv_ids"]) == 3

        # Delete the JD
        response = client.delete(
            f"/api/job-descriptions/{jd.id}", headers={"X-User-ID": test_user.id}
        )
        assert response.status_code == 200

        # Verify JD is deleted
        response = client.get(
            f"/api/job-descriptions/{jd.id}", headers={"X-User-ID": test_user.id}
        )
        assert response.status_code == 404

        # Verify no CVs can see the JD anymore
        for cv_id in [cv_a.id, cv_b.id, cv_c.id]:
            response = client.get(
                f"/api/cvs/{cv_id}/job-descriptions", headers={"X-User-ID": test_user.id}
            )
            assert response.status_code == 200

            jds = response.json()["job_descriptions"]
            jd_titles = [jd["title"] for jd in jds]
            assert "To Be Deleted" not in jd_titles


class TestJobDescriptionPersistenceAfterCVDeletion:
    """
    Test that job descriptions persist when their original CV is deleted.

    This test class prevents regression of the bug where SQLAlchemy ORM
    cascade="all, delete-orphan" overrode the database FK constraint
    ondelete="SET NULL", causing job descriptions to be deleted when
    their original CV was deleted.
    """

    def test_job_description_persists_when_original_cv_deleted(
        self, test_user, db_session
    ):
        """Test that JD persists when its original (creator) CV is deleted."""
        # Create CV #1 with a job description
        cv1 = create_test_cv(db_session, test_user.id, "CV1")
        jd = create_test_job_description(
            db_session,
            test_user.id,
            cv1.id,
            title="Persistent Job",
            company="Persistent Company",
            content="This JD should persist after CV deletion",
        )
        associate_jd_with_cv(db_session, jd.id, cv1.id)

        jd_id = jd.id
        user_id = jd.user_id

        # Delete CV #1 directly via database (bypassing API auth)
        from src.services.cv.cv_service import delete_cv

        result = delete_cv(db_session, cv1.id, test_user.id)
        assert result is True, "CV deletion should succeed"

        # CRITICAL: Verify JD still exists in database
        jd_after = (
            db_session.query(JobDescription).filter(JobDescription.id == jd_id).first()
        )
        assert jd_after is not None, "Job description should persist after CV deletion"

        # Verify JD's cv_id is NULL (original creator CV is gone)
        assert jd_after.cv_id is None, "JD cv_id should be NULL after original CV deleted"

        # Verify JD is not hidden
        assert jd_after.hidden is False, "JD should not be hidden"

        # Verify JD user_id is unchanged
        assert jd_after.user_id == user_id, "JD user_id should remain unchanged"

    def test_job_description_can_be_associated_after_original_cv_deleted(
        self, test_user, db_session
    ):
        """Test that JD can be associated with new CV after original CV is deleted."""
        # Create CV #1 with a job description
        cv1 = create_test_cv(db_session, test_user.id, "CV1")
        jd = create_test_job_description(
            db_session,
            test_user.id,
            cv1.id,
            title="Reusable Job",
            company="Reusable Company",
            content="This JD can be reused after original CV deletion",
        )
        associate_jd_with_cv(db_session, jd.id, cv1.id)

        # Create CV #2
        cv2 = create_test_cv(db_session, test_user.id, "CV2")

        jd_id = jd.id

        # Delete CV #1 (original creator) directly via database
        from src.services.cv.cv_service import delete_cv

        result = delete_cv(db_session, cv1.id, test_user.id)
        assert result is True, "CV deletion should succeed"

        # CRITICAL: Verify JD can be associated with CV #2
        from src.services.job_descriptions.job_description_service import (
            associate_jd_with_cv as service_associate,
        )

        success = service_associate(db_session, jd_id, cv2.id, test_user.id)
        assert success is True, "Should be able to associate JD with new CV"

        # Verify JD's cv_id and associations
        jd_after = (
            db_session.query(JobDescription).filter(JobDescription.id == jd_id).first()
        )
        assert jd_after is not None, "JD should still exist"

        # Check associations
        from src.models.cv_job_description import CVJobDescription

        assoc = (
            db_session.query(CVJobDescription)
            .filter(
                CVJobDescription.job_description_id == jd_id,
                CVJobDescription.cv_id == cv2.id,
            )
            .first()
        )
        assert assoc is not None, "JD should be associated with CV #2"

        # Verify JD still has NULL cv_id (original creator CV)
        jd_after = (
            db_session.query(JobDescription).filter(JobDescription.id == jd_id).first()
        )
        assert jd_after.cv_id is None, "JD cv_id should remain NULL"

    def test_multiple_associations_persist_after_original_cv_deleted(
        self, test_user, db_session
    ):
        """Test that multiple associations persist when original CV is deleted."""
        # Create CV #1 with a job description
        cv1 = create_test_cv(db_session, test_user.id, "CV1")
        jd = create_test_job_description(
            db_session,
            test_user.id,
            cv1.id,
            title="Multi-Association Job",
            company="Multi-Association Company",
            content="This JD has multiple CV associations",
        )
        associate_jd_with_cv(db_session, jd.id, cv1.id)

        # Create CV #2 and CV #3
        cv2 = create_test_cv(db_session, test_user.id, "CV2")
        cv3 = create_test_cv(db_session, test_user.id, "CV3")

        # Associate JD with CV #2 and CV #3
        associate_jd_with_cv(db_session, jd.id, cv2.id)
        associate_jd_with_cv(db_session, jd.id, cv3.id)

        jd_id = jd.id

        # Delete CV #1 (original creator) directly via database
        from src.services.cv.cv_service import delete_cv

        result = delete_cv(db_session, cv1.id, test_user.id)
        assert result is True, "CV deletion should succeed"

        # CRITICAL: Verify JD still exists
        jd_after = (
            db_session.query(JobDescription).filter(JobDescription.id == jd_id).first()
        )
        assert jd_after is not None, "JD should persist after original CV deletion"

        # Verify JD's cv_id is NULL
        assert jd_after.cv_id is None, "JD cv_id should be NULL"

        # Verify JD still associated with CV #2 and CV #3
        from src.models.cv_job_description import CVJobDescription

        assoc2 = (
            db_session.query(CVJobDescription)
            .filter(
                CVJobDescription.job_description_id == jd_id,
                CVJobDescription.cv_id == cv2.id,
            )
            .first()
        )
        assoc3 = (
            db_session.query(CVJobDescription)
            .filter(
                CVJobDescription.job_description_id == jd_id,
                CVJobDescription.cv_id == cv3.id,
            )
            .first()
        )
        assoc1 = (
            db_session.query(CVJobDescription)
            .filter(
                CVJobDescription.job_description_id == jd_id,
                CVJobDescription.cv_id == cv1.id,
            )
            .first()
        )

        assert assoc2 is not None, "JD should still be associated with CV #2"
        assert assoc3 is not None, "JD should still be associated with CV #3"
        assert assoc1 is None, "CV #1 association should be removed"

    def test_junction_table_association_removed_when_cv_deleted(
        self, test_user, db_session
    ):
        """Test that junction table record is removed when non-original CV is deleted."""
        # Create CV #1 with JD
        cv1 = create_test_cv(db_session, test_user.id, "CV1")
        jd = create_test_job_description(
            db_session,
            test_user.id,
            cv1.id,
            title="Junction Test Job",
            company="Junction Test Company",
            content="Testing junction table behavior",
        )
        associate_jd_with_cv(db_session, jd.id, cv1.id)

        # Associate JD with CV #2
        cv2 = create_test_cv(db_session, test_user.id, "CV2")
        associate_jd_with_cv(db_session, jd.id, cv2.id)

        jd_id = jd.id

        # Delete CV #2 (not the original creator) directly via database
        from src.services.cv.cv_service import delete_cv

        result = delete_cv(db_session, cv2.id, test_user.id)
        assert result is True, "CV deletion should succeed"

        # CRITICAL: Verify JD still exists
        jd_after = (
            db_session.query(JobDescription).filter(JobDescription.id == jd_id).first()
        )
        assert jd_after is not None, "JD should persist"

        # Verify JD's cv_id still points to CV #1
        assert jd_after.cv_id == cv1.id, "JD cv_id should still point to original CV"

        # Verify junction table record for CV #2 is removed
        association = (
            db_session.query(CVJobDescription)
            .filter(
                CVJobDescription.cv_id == cv2.id,
                CVJobDescription.job_description_id == jd_id,
            )
            .first()
        )
        assert association is None, "Junction table record should be removed"

        # Verify JD still associated with CV #1
        assoc1 = (
            db_session.query(CVJobDescription)
            .filter(
                CVJobDescription.cv_id == cv1.id,
                CVJobDescription.job_description_id == jd_id,
            )
            .first()
        )
        assert assoc1 is not None, "JD should still be associated with CV #1"

    def test_all_associations_removed_when_all_cvs_deleted(self, test_user, db_session):
        """Test that JD persists with no associations when all CVs are deleted."""
        # Create CV #1 with JD
        cv1 = create_test_cv(db_session, test_user.id, "CV1")
        jd = create_test_job_description(
            db_session,
            test_user.id,
            cv1.id,
            title="Orphaned Job",
            company="Orphaned Company",
            content="This JD will have no CV associations",
        )
        associate_jd_with_cv(db_session, jd.id, cv1.id)

        # Associate JD with CV #2 and CV #3
        cv2 = create_test_cv(db_session, test_user.id, "CV2")
        cv3 = create_test_cv(db_session, test_user.id, "CV3")
        associate_jd_with_cv(db_session, jd.id, cv2.id)
        associate_jd_with_cv(db_session, jd.id, cv3.id)

        jd_id = jd.id

        # Delete all CVs directly via database
        from src.services.cv.cv_service import delete_cv

        for cv_id in [cv1.id, cv2.id, cv3.id]:
            result = delete_cv(db_session, cv_id, test_user.id)
            assert result is True, f"CV {cv_id} deletion should succeed"

        # CRITICAL: Verify JD still exists
        jd_after = (
            db_session.query(JobDescription).filter(JobDescription.id == jd_id).first()
        )
        assert jd_after is not None, "JD should persist even with no CV associations"

        # Verify JD's cv_id is NULL
        assert jd_after.cv_id is None, "JD cv_id should be NULL"

        # Verify JD has no associations (cv_ids is empty)
        from src.models.cv_job_description import CVJobDescription

        associations = (
            db_session.query(CVJobDescription)
            .filter(CVJobDescription.job_description_id == jd_id)
            .all()
        )
        assert len(associations) == 0, "JD should have no CV associations"

        # CRITICAL: Verify JD can still be associated with new CVs
        cv_new = create_test_cv(db_session, test_user.id, "NewCV")
        from src.services.job_descriptions.job_description_service import (
            associate_jd_with_cv as service_associate,
        )

        success = service_associate(db_session, jd_id, cv_new.id, test_user.id)
        assert success is True, "Should be able to associate orphaned JD with new CV"
