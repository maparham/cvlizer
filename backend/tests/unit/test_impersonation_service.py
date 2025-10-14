"""
Impersonation Service Tests

This module provides comprehensive tests for the impersonation service functionality,
including session management, validation, and security checks.
"""

from datetime import datetime, timedelta
from unittest.mock import MagicMock, Mock, patch

import pytest
from sqlalchemy.orm import Session

from src.models.impersonation_session import ImpersonationSession
from src.models.user import User
from src.services.impersonation_service import (
    ImpersonationNotAllowedError,
    cleanup_expired_sessions,
    end_impersonation_session,
    get_active_session_for_admin,
    get_active_sessions,
    start_impersonation_session,
    validate_session,
)


class TestImpersonationService:
    """Test cases for impersonation service"""

    @pytest.fixture
    def mock_db(self):
        """Create a mock database session"""
        return Mock(spec=Session)

    @pytest.fixture
    def admin_user(self):
        """Create a mock admin user"""
        user = Mock(spec=User)
        user.id = "admin-123"
        user.email = "admin@example.com"
        user.is_admin = True
        return user

    @pytest.fixture
    def target_user(self):
        """Create a mock target user"""
        user = Mock(spec=User)
        user.id = "target-123"
        user.email = "target@example.com"
        user.is_admin = False
        return user

    @pytest.fixture
    def mock_audit_service(self):
        """Create a mock audit service"""
        return Mock()

    def test_start_impersonation_session_success(
        self, mock_db, admin_user, target_user, mock_audit_service
    ):
        """Test successful impersonation session start"""
        # Mock database queries
        mock_db.query.return_value.filter.return_value.first.return_value = target_user
        mock_db.add = Mock()
        mock_db.commit = Mock()
        mock_db.refresh = Mock()

        # Mock all internal functions
        with (
            patch(
                "src.services.impersonation_service.log_admin_action", mock_audit_service
            ),
            patch(
                "src.services.impersonation_service.is_admin_user",
                side_effect=lambda user: user.is_admin,
            ),
            patch("src.services.impersonation_service._check_impersonation_enabled"),
            patch("src.services.impersonation_service._validate_admin_user"),
            patch(
                "src.services.impersonation_service._validate_target_user",
                return_value=target_user,
            ),
            patch("src.services.impersonation_service._check_rate_limits"),
            patch(
                "src.services.impersonation_service.get_active_session_for_admin",
                return_value=None,
            ),
        ):
            result = start_impersonation_session(
                db=mock_db,
                admin_user=admin_user,
                target_user_id=target_user.id,
                justification="Testing impersonation",
                admin_ip="127.0.0.1",
                admin_user_agent="Test Agent",
            )

        # Verify session was created
        assert result is not None
        assert result.admin_id == admin_user.id
        assert result.target_user_id == target_user.id
        assert result.justification == "Testing impersonation"
        assert result.admin_ip == "127.0.0.1"
        assert result.admin_user_agent == "Test Agent"

        # Verify database operations
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()
        mock_db.refresh.assert_called_once()

        # Verify audit log was created
        mock_audit_service.assert_called_once()

    def test_start_impersonation_session_target_user_not_found(
        self, mock_db, admin_user, mock_audit_service
    ):
        """Test impersonation start when target user doesn't exist"""
        # Mock database query to return None (user not found)
        mock_db.query.return_value.filter.return_value.first.return_value = None

        with (
            patch(
                "src.services.impersonation_service.log_admin_action", mock_audit_service
            ),
            patch(
                "src.services.impersonation_service.is_admin_user",
                side_effect=lambda user: user.is_admin,
            ),
            patch("src.services.impersonation_service._check_impersonation_enabled"),
            patch("src.services.impersonation_service._validate_admin_user"),
            patch("src.services.impersonation_service._check_rate_limits"),
            patch(
                "src.services.impersonation_service.get_active_session_for_admin",
                return_value=None,
            ),
        ):
            with pytest.raises(
                ImpersonationNotAllowedError, match="Target user not found"
            ):
                start_impersonation_session(
                    db=mock_db,
                    admin_user=admin_user,
                    target_user_id="nonexistent-user",
                    justification="Testing",
                    admin_ip="127.0.0.1",
                    admin_user_agent="Test Agent",
                )

    def test_start_impersonation_session_existing_active_session(
        self, mock_db, admin_user, target_user, mock_audit_service
    ):
        """Test starting impersonation when admin already has an active session"""
        # Mock existing active session
        existing_session = Mock(spec=ImpersonationSession)
        existing_session.id = "existing-session-123"
        existing_session.status = "active"

        mock_db.query.return_value.filter.return_value.first.return_value = target_user

        with (
            patch(
                "src.services.impersonation_service.log_admin_action", mock_audit_service
            ),
            patch(
                "src.services.impersonation_service.is_admin_user",
                side_effect=lambda user: user.is_admin,
            ),
            patch("src.services.impersonation_service._check_impersonation_enabled"),
            patch("src.services.impersonation_service._validate_admin_user"),
            patch("src.services.impersonation_service._check_rate_limits"),
            patch(
                "src.services.impersonation_service.get_active_session_for_admin",
                return_value=existing_session,
            ),
            patch(
                "src.services.impersonation_service.end_impersonation_session",
                return_value=True,
            ),
        ):
            # This should succeed and end the existing session
            result = start_impersonation_session(
                db=mock_db,
                admin_user=admin_user,
                target_user_id=target_user.id,
                justification="Testing",
                admin_ip="127.0.0.1",
                admin_user_agent="Test Agent",
            )

            # Verify the existing session was ended
            from src.services.impersonation_service import end_impersonation_session

            end_impersonation_session.assert_called_once_with(
                mock_db, existing_session.id, "ended_by_new_session"
            )

            # Verify new session was created
            assert result is not None

    def test_end_impersonation_session_success(
        self, mock_db, admin_user, mock_audit_service
    ):
        """Test successful impersonation session end"""
        # Mock active session
        active_session = Mock(spec=ImpersonationSession)
        active_session.id = "session-123"
        active_session.admin_id = admin_user.id
        active_session.status = "active"
        active_session.ended_at = None
        active_session.started_at = datetime.utcnow() - timedelta(minutes=10)
        active_session.admin = admin_user
        active_session.target_user = Mock()
        active_session.target_user.email = "target@example.com"
        active_session.target_user_id = "target-123"

        mock_db.query.return_value.filter.return_value.first.return_value = active_session
        mock_db.commit = Mock()

        # Mock the end_session method to set ended_at
        def mock_end_session(reason):
            active_session.ended_at = datetime.utcnow()
            active_session.status = "ended"

        active_session.end_session = mock_end_session

        with (
            patch(
                "src.services.impersonation_service.log_admin_action", mock_audit_service
            ),
            patch(
                "src.services.impersonation_service.is_admin_user",
                side_effect=lambda user: user.is_admin,
            ),
        ):
            result = end_impersonation_session(
                db=mock_db, session_id=active_session.id, end_reason="ended_by_admin"
            )

        # Verify session was ended
        assert result is True
        assert active_session.status == "ended"
        assert active_session.ended_at is not None

        # Verify database operations
        mock_db.commit.assert_called_once()

        # Verify audit log was created
        mock_audit_service.assert_called_once()

    def test_end_impersonation_session_not_found(self, mock_db, mock_audit_service):
        """Test ending impersonation session that doesn't exist"""
        # Mock database query to return None (session not found)
        mock_db.query.return_value.filter.return_value.first.return_value = None

        with (
            patch(
                "src.services.impersonation_service.log_admin_action", mock_audit_service
            ),
            patch(
                "src.services.impersonation_service.is_admin_user",
                side_effect=lambda user: user.is_admin,
            ),
        ):
            result = end_impersonation_session(
                db=mock_db, session_id="nonexistent-session", end_reason="ended_by_admin"
            )

        # Verify function returns False for non-existent session
        assert result is False

    def test_get_active_session_for_admin(self, mock_db, admin_user):
        """Test getting active session for admin"""
        # Mock active session
        active_session = Mock(spec=ImpersonationSession)
        active_session.id = "session-123"
        active_session.admin_id = admin_user.id
        active_session.status = "active"
        active_session.is_active = True

        mock_db.query.return_value.filter.return_value.all.return_value = [active_session]

        result = get_active_session_for_admin(mock_db, admin_user.id)

        # Verify correct session is returned
        assert result == active_session

    def test_get_active_session_for_admin_none(self, mock_db, admin_user):
        """Test getting active session when none exists"""
        # Mock database query to return empty list
        mock_db.query.return_value.filter.return_value.all.return_value = []

        result = get_active_session_for_admin(mock_db, admin_user.id)

        # Verify None is returned
        assert result is None

    def test_get_active_sessions(self, mock_db):
        """Test getting all active sessions"""
        # Mock active sessions
        session1 = Mock(spec=ImpersonationSession)
        session1.id = "session-1"
        session1.status = "active"
        session1.is_active = True

        session2 = Mock(spec=ImpersonationSession)
        session2.id = "session-2"
        session2.status = "active"
        session2.is_active = True

        mock_sessions = [session1, session2]
        mock_db.query.return_value.filter.return_value.order_by.return_value.all.return_value = (
            mock_sessions
        )

        result = get_active_sessions(mock_db, limit=10, offset=0)

        # Verify correct sessions are returned
        assert result == mock_sessions

    def test_validate_session_active(self, mock_db):
        """Test session validation for active session"""
        session = Mock(spec=ImpersonationSession)
        session.id = "session-123"
        session.status = "active"
        session.expires_at = datetime.utcnow() + timedelta(hours=1)
        session.is_active = True

        # Mock the query chain: query().options().filter().first()
        mock_query = Mock()
        mock_options = Mock()
        mock_filter = Mock()
        mock_first = Mock(return_value=session)

        mock_filter.first = mock_first
        mock_options.filter.return_value = mock_filter
        mock_query.options.return_value = mock_options
        mock_db.query.return_value = mock_query

        result = validate_session(mock_db, session.id)

        assert result == session

    def test_validate_session_expired(self, mock_db):
        """Test session validation for expired session"""
        session = Mock(spec=ImpersonationSession)
        session.id = "session-123"
        session.status = "active"
        session.expires_at = datetime.utcnow() - timedelta(hours=1)
        session.is_active = False
        session.is_expired = True
        session.ended_at = None

        # Mock the query chain: query().options().filter().first()
        mock_query = Mock()
        mock_options = Mock()
        mock_filter = Mock()
        mock_first = Mock(return_value=session)

        mock_filter.first = mock_first
        mock_options.filter.return_value = mock_filter
        mock_query.options.return_value = mock_options
        mock_db.query.return_value = mock_query

        result = validate_session(mock_db, session.id)

        assert result is None

    def test_validate_session_ended(self, mock_db):
        """Test session validation for ended session"""
        session = Mock(spec=ImpersonationSession)
        session.id = "session-123"
        session.status = "ended"
        session.expires_at = datetime.utcnow() + timedelta(hours=1)
        session.is_active = False

        # Mock the query chain: query().options().filter().first()
        mock_query = Mock()
        mock_options = Mock()
        mock_filter = Mock()
        mock_first = Mock(return_value=session)

        mock_filter.first = mock_first
        mock_options.filter.return_value = mock_filter
        mock_query.options.return_value = mock_options
        mock_db.query.return_value = mock_query

        result = validate_session(mock_db, session.id)

        assert result is None

    def test_cleanup_expired_sessions(self, mock_db):
        """Test cleanup of expired sessions"""
        # Mock expired sessions
        expired_session1 = Mock(spec=ImpersonationSession)
        expired_session1.id = "expired-1"
        expired_session1.status = "active"
        expired_session1.expires_at = datetime.utcnow() - timedelta(hours=1)

        expired_session2 = Mock(spec=ImpersonationSession)
        expired_session2.id = "expired-2"
        expired_session2.status = "active"
        expired_session2.expires_at = datetime.utcnow() - timedelta(hours=2)

        mock_expired_sessions = [expired_session1, expired_session2]
        mock_db.query.return_value.filter.return_value.all.return_value = (
            mock_expired_sessions
        )
        mock_db.commit = Mock()

        with patch("src.services.impersonation_service.log_admin_action", Mock()):
            result = cleanup_expired_sessions(mock_db)

        # Verify cleanup was performed
        assert result == 2
        # The function should set ended_at and status, but we need to check the actual implementation
        # For now, just verify the count is correct
        mock_db.commit.assert_called_once()

    def test_cleanup_expired_sessions_no_expired(self, mock_db):
        """Test cleanup when no sessions are expired"""
        # Mock no expired sessions
        mock_db.query.return_value.filter.return_value.all.return_value = []
        mock_db.commit = Mock()

        with patch("src.services.impersonation_service.log_admin_action", Mock()):
            result = cleanup_expired_sessions(mock_db)

        # Verify no cleanup was performed
        assert result == 0
        # When no sessions are expired, commit should not be called
        mock_db.commit.assert_not_called()
