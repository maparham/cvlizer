"""Integration tests for public sharing endpoints."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from main import app
from src.middleware.clerk_auth import get_effective_user_lightweight
from src.models import CV, JobDescription, User
from src.models.base import Base, get_db

TEST_DATABASE_URL = "sqlite:///./test_public_shares.db"
test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture
def db_session():
    Base.metadata.create_all(bind=test_engine)
    session = TestingSessionLocal()
    yield session
    session.close()
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def client(db_session):
    user = User(id="user-1", clerk_id="clerk-user-1", email="u1@example.com")
    db_session.add(user)
    cv = CV(
        id="cv-1",
        user_id=user.id,
        original_filename="Integration CV.pdf",
        file_path="/tmp/cv.pdf",
        file_size=100,
        file_type="application/pdf",
        parsed_data={"personal_info": {"full_name": "Integration User"}},
        is_parsed=True,
    )
    db_session.add(cv)
    jd = JobDescription(
        id="jd-1",
        user_id=user.id,
        cv_id=cv.id,
        title="Backend Engineer",
        company="ACME",
        location="Remote",
        content="Detailed JD content",
    )
    db_session.add(jd)
    db_session.commit()

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    def override_auth():
        return user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_effective_user_lightweight] = override_auth
    test_client = TestClient(app)
    yield test_client
    app.dependency_overrides.clear()


def test_cv_share_public_flow(client: TestClient):
    share_response = client.post("/api/cvs/cv-1/share", json={"view_mode": "shell"})
    assert share_response.status_code == 200
    share_data = share_response.json()
    assert share_data["is_shared"] is True
    assert share_data["view_mode"] == "shell"
    token = share_data["token"]
    assert token

    public_response = client.get(f"/api/public/cv/{token}")
    assert public_response.status_code == 200
    assert public_response.json()["id"] == "cv-1"
    assert public_response.json()["view_mode"] == "shell"

    analytics_response = client.get("/api/cvs/cv-1/share/analytics")
    assert analytics_response.status_code == 200
    assert analytics_response.json()["total_views"] >= 1


def test_cv_share_regenerate_invalidates_old_token(client: TestClient):
    first = client.post("/api/cvs/cv-1/share")
    assert first.status_code == 200
    old_token = first.json()["token"]

    regen = client.put("/api/cvs/cv-1/share/regenerate")
    assert regen.status_code == 200
    new_token = regen.json()["token"]
    assert new_token and new_token != old_token

    old_public = client.get(f"/api/public/cv/{old_token}")
    assert old_public.status_code == 404
    new_public = client.get(f"/api/public/cv/{new_token}")
    assert new_public.status_code == 200


def test_cv_share_settings_update_view_mode(client: TestClient):
    first = client.post("/api/cvs/cv-1/share")
    assert first.status_code == 200
    assert first.json()["view_mode"] == "shell"

    updated = client.put("/api/cvs/cv-1/share", json={"view_mode": "shell"})
    assert updated.status_code == 200
    assert updated.json()["view_mode"] == "shell"


def test_job_description_share_public_flow(client: TestClient):
    share_response = client.post("/api/job-descriptions/jd-1/share")
    assert share_response.status_code == 200
    token = share_response.json()["token"]

    public_response = client.get(f"/api/public/job-description/{token}")
    assert public_response.status_code == 200
    data = public_response.json()
    assert data["id"] == "jd-1"
    assert data["title"] == "Backend Engineer"

    analytics_response = client.get("/api/job-descriptions/jd-1/share/analytics")
    assert analytics_response.status_code == 200
    assert analytics_response.json()["total_views"] >= 1
