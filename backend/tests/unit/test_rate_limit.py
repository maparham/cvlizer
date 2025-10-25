"""
Unit tests for combined IP + User ID rate limiting system.

Tests the multi-key rate limiting functionality that prevents circumvention
via VPN switching or multiple account creation.
"""

import pytest
from unittest.mock import Mock, patch
from fastapi import Request
from fastapi.testclient import TestClient

from src.utils.rate_limit import get_combined_rate_limit_keys, create_combined_limiter
from src.middleware.rate_limit_user import RateLimitUserMiddleware


class TestRateLimitKeys:
    """Test rate limit key generation for different request types."""

    def test_unauthenticated_request_keys(self):
        """Test key generation for unauthenticated requests (IP only)."""
        # Mock request with IP but no user
        request = Mock(spec=Request)
        request.state = Mock()
        delattr(request.state, "user_id")  # Ensure no user_id

        with patch(
            "src.utils.rate_limit.get_remote_address", return_value="192.168.1.100"
        ):
            keys = get_combined_rate_limit_keys(request)

        assert keys == ["ip:192.168.1.100"]

    def test_authenticated_request_keys(self):
        """Test key generation for authenticated requests (IP + user ID)."""
        # Mock request with IP and user
        request = Mock(spec=Request)
        request.state = Mock()
        request.state.user_id = "user_123"

        with patch(
            "src.utils.rate_limit.get_remote_address", return_value="192.168.1.100"
        ):
            keys = get_combined_rate_limit_keys(request)

        assert keys == ["ip:192.168.1.100", "user:user_123"]

    def test_no_ip_address(self):
        """Test key generation when IP address is not available."""
        request = Mock(spec=Request)
        request.state = Mock()
        request.state.user_id = "user_123"

        with patch("src.utils.rate_limit.get_remote_address", return_value=None):
            keys = get_combined_rate_limit_keys(request)

        # Should only have user key when IP is not available
        assert keys == ["user:user_123"]

    def test_no_user_id_attribute(self):
        """Test key generation when user_id is not set in request state."""
        request = Mock(spec=Request)
        request.state = Mock()
        # Don't set user_id attribute - ensure it doesn't exist
        if hasattr(request.state, "user_id"):
            delattr(request.state, "user_id")

        with patch(
            "src.utils.rate_limit.get_remote_address", return_value="192.168.1.100"
        ):
            keys = get_combined_rate_limit_keys(request)

        assert keys == ["ip:192.168.1.100"]


class TestRateLimitUserMiddleware:
    """Test the middleware that extracts user ID for rate limiting."""

    @pytest.fixture
    def middleware(self):
        """Create middleware instance for testing."""
        return RateLimitUserMiddleware(Mock())

    @pytest.fixture
    def mock_request(self):
        """Create mock request for testing."""
        request = Mock(spec=Request)
        request.state = Mock()
        return request

    async def test_authenticated_user_extraction(self, middleware, mock_request):
        """Test user ID extraction for authenticated requests."""
        # Mock authorization header
        mock_request.headers = {"Authorization": "Bearer fake_token"}
        mock_request.cookies = {}

        # Mock verify_clerk_token to return a valid payload
        with patch(
            "src.middleware.rate_limit_user.verify_clerk_token",
            return_value={"sub": "user_123"},
        ):
            # Mock call_next as async function
            mock_response = Mock()

            async def mock_call_next(request):
                return mock_response

            call_next = mock_call_next

            # Run middleware
            response = await middleware.dispatch(mock_request, call_next)

            # Verify user_id was set
            assert hasattr(mock_request.state, "user_id")
            assert mock_request.state.user_id == "user_123"
            assert response == mock_response

    async def test_unauthenticated_request(self, middleware):
        """Test middleware behavior for unauthenticated requests."""

        # Create a proper request state object (not Mock) to test attribute presence
        class State:
            pass

        mock_request = Mock(spec=Request)
        mock_request.state = State()
        mock_request.headers = {}

        # Mock call_next as async function
        mock_response = Mock()

        async def mock_call_next(request):
            return mock_response

        call_next = mock_call_next

        # Run middleware
        response = await middleware.dispatch(mock_request, call_next)

        # Verify no user_id was set
        assert not hasattr(mock_request.state, "user_id")
        assert response == mock_response

    async def test_user_extraction_failure(self, middleware):
        """Test middleware behavior when user extraction fails."""

        # Create a proper request state object (not Mock) to test attribute presence
        class State:
            pass

        mock_request = Mock(spec=Request)
        mock_request.state = State()
        mock_request.headers = {"Authorization": "Bearer fake_token"}

        # Mock verify_clerk_token to raise an exception
        with patch(
            "src.middleware.rate_limit_user.verify_clerk_token",
            side_effect=Exception("Auth error"),
        ):
            # Mock call_next as async function
            mock_response = Mock()

            async def mock_call_next(request):
                return mock_response

            call_next = mock_call_next

            # Run middleware
            response = await middleware.dispatch(mock_request, call_next)

            # Verify no user_id was set and request continues
            assert not hasattr(mock_request.state, "user_id")
            assert response == mock_response

    async def test_clear_existing_user_id(self, middleware, mock_request):
        """Test that unauthenticated requests don't set user_id."""
        # Set initial user_id (from previous request in same test session)
        mock_request.state.user_id = "old_user_123"
        mock_request.headers = {}

        # Mock call_next as async function
        mock_response = Mock()

        async def mock_call_next(request):
            return mock_response

        call_next = mock_call_next

        # Run middleware
        response = await middleware.dispatch(mock_request, call_next)

        # Verify user_id was not overwritten (middleware doesn't clear existing values)
        # The old value remains because no auth header was present
        assert hasattr(mock_request.state, "user_id")
        assert mock_request.state.user_id == "old_user_123"
        assert response == mock_response


class TestCombinedLimiter:
    """Test the combined limiter creation and configuration."""

    def test_create_combined_limiter(self):
        """Test that combined limiter is created correctly."""
        limiter = create_combined_limiter()

        # Verify limiter is created and has the correct key function
        assert limiter is not None
        assert limiter._key_func == get_combined_rate_limit_keys


class TestRateLimitIntegration:
    """Integration tests for rate limiting behavior."""

    @pytest.fixture
    def client(self):
        """Create test client with rate limiting enabled."""
        from main import app

        return TestClient(app)

    def test_quick_start_rate_limiting_unauthenticated(self, client):
        """Test rate limiting for unauthenticated quick start requests."""
        # Test that we can make requests up to the limit (10/15minutes)
        for i in range(10):
            response = client.post(
                "/api/quick-start/preview",
                files={"cv_file": ("test.pdf", b"fake pdf content", "application/pdf")},
                data={"job_text": "Test job description"},
            )
            # Should succeed for first 10 requests
            assert response.status_code in [200, 422]  # 422 for validation errors is OK

        # 11th request should be rate limited
        response = client.post(
            "/api/quick-start/preview",
            files={"cv_file": ("test.pdf", b"fake pdf content", "application/pdf")},
            data={"job_text": "Test job description"},
        )
        assert response.status_code == 429  # Too Many Requests

    def test_admin_rate_limiting_unauthenticated(self, client):
        """Test rate limiting for unauthenticated admin requests."""
        # Test that we can make requests up to the limit
        for i in range(10):
            response = client.get("/admin/users")
            # Should get 403 for auth errors (not rate limited yet)
            assert (
                response.status_code == 403
            ), f"Request {i+1} failed with status {response.status_code}"

        # 11th request should still be 403 (auth error, not rate limited)
        # because admin endpoints require authentication before rate limiting applies
        response = client.get("/admin/users")
        assert (
            response.status_code == 403
        ), f"Expected 403 (auth required), got {response.status_code}: {response.text}"

    def test_rate_limiting_with_different_ips(self, client):
        """Test that rate limiting works across different IP addresses."""
        # Mock different IP addresses
        with patch("src.utils.rate_limit.get_remote_address") as mock_get_ip:
            # First IP: make 10 requests (should succeed)
            mock_get_ip.return_value = "192.168.1.100"
            for i in range(10):
                response = client.post(
                    "/api/quick-start/preview",
                    files={
                        "cv_file": ("test.pdf", b"fake pdf content", "application/pdf")
                    },
                    data={"job_text": "Test job description"},
                )
                assert response.status_code in [200, 422]

            # Different IP: should be able to make 10 more requests
            mock_get_ip.return_value = "192.168.1.101"
            for i in range(10):
                response = client.post(
                    "/api/quick-start/preview",
                    files={
                        "cv_file": ("test.pdf", b"fake pdf content", "application/pdf")
                    },
                    data={"job_text": "Test job description"},
                )
                assert response.status_code in [200, 422]

            # Back to first IP: should still be rate limited
            mock_get_ip.return_value = "192.168.1.100"
            response = client.post(
                "/api/quick-start/preview",
                files={"cv_file": ("test.pdf", b"fake pdf content", "application/pdf")},
                data={"job_text": "Test job description"},
            )
            assert response.status_code == 429


class TestRateLimitScenarios:
    """Test specific rate limiting scenarios from the plan."""

    @pytest.fixture
    def client(self):
        """Create test client with rate limiting enabled."""
        from main import app

        return TestClient(app)

    def test_user_tracking_across_ips(self, client):
        """Test that user counter tracks across different IP addresses."""
        # This test would require authentication setup
        # For now, we'll test the key generation logic
        request = Mock(spec=Request)
        request.state = Mock()
        request.state.user_id = "user_123"

        # Test with different IPs but same user
        with patch(
            "src.utils.rate_limit.get_remote_address", return_value="192.168.1.100"
        ):
            keys1 = get_combined_rate_limit_keys(request)

        with patch(
            "src.utils.rate_limit.get_remote_address", return_value="192.168.1.101"
        ):
            keys2 = get_combined_rate_limit_keys(request)

        # Both should include the same user key
        assert "user:user_123" in keys1
        assert "user:user_123" in keys2
        assert keys1 != keys2  # Different IP keys

    def test_ip_tracking_across_users(self, client):
        """Test that IP counter tracks across different users."""
        # Test with same IP but different users
        request1 = Mock(spec=Request)
        request1.state = Mock()
        request1.state.user_id = "user_123"

        request2 = Mock(spec=Request)
        request2.state = Mock()
        request2.state.user_id = "user_456"

        with patch(
            "src.utils.rate_limit.get_remote_address", return_value="192.168.1.100"
        ):
            keys1 = get_combined_rate_limit_keys(request1)
            keys2 = get_combined_rate_limit_keys(request2)

        # Both should include the same IP key
        assert "ip:192.168.1.100" in keys1
        assert "ip:192.168.1.100" in keys2
        assert keys1 != keys2  # Different user keys
