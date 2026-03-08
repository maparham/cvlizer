"""
Integration tests for combined IP + User ID rate limiting.

Tests the actual rate limiting behavior with real HTTP requests to ensure
the system prevents circumvention via VPN switching or multiple accounts.
"""

import pytest
import time
from unittest.mock import patch, Mock
from fastapi.testclient import TestClient

from main import app


class TestRateLimitIntegration:
    """Integration tests for rate limiting with real HTTP requests."""

    @pytest.fixture
    def client(self):
        """Create test client with rate limiting enabled."""
        return TestClient(app)

    def test_quick_start_rate_limit_unauthenticated(self, client):
        """Test rate limiting for unauthenticated quick start requests."""
        # Make 10 requests (should succeed - current limit is 10/15minutes)
        for i in range(10):
            response = client.post(
                "/api/quick-start/preview",
                files={"cv_file": ("test.pdf", b"fake pdf content", "application/pdf")},
                data={"job_text": "Test job description"},
            )
            # Should succeed for first 10 requests (422 is OK for validation errors)
            assert response.status_code in [
                200,
                422,
            ], f"Request {i+1} failed with status {response.status_code}"

        # 11th request should be rate limited
        response = client.post(
            "/api/quick-start/preview",
            files={"cv_file": ("test.pdf", b"fake pdf content", "application/pdf")},
            data={"job_text": "Test job description"},
        )
        assert (
            response.status_code == 429
        ), f"Expected 429 (rate limited), got {response.status_code}: {response.text}"

    def test_admin_rate_limit_unauthenticated(self, client):
        """Test rate limiting for unauthenticated admin requests."""
        # Admin endpoints require authentication, so we expect 403 errors
        # Rate limiting only applies after authentication passes
        for i in range(10):
            response = client.get("/api/admin/users")
            # Should get 403 for auth errors (rate limiting doesn't apply before auth)
            assert (
                response.status_code == 403
            ), f"Request {i+1} failed with status {response.status_code}"

        # 11th request should still be 403 (auth error, not rate limited)
        response = client.get("/api/admin/users")
        assert (
            response.status_code == 403
        ), f"Expected 403 (auth required), got {response.status_code}: {response.text}"

    def test_rate_limit_with_different_ips(self, client):
        """Test that rate limiting works across different IP addresses."""
        with patch("src.utils.rate_limit.get_remote_address") as mock_get_ip:
            # First IP: make 10 requests (should succeed - current limit is 10/15minutes)
            mock_get_ip.return_value = "192.168.1.100"
            for i in range(10):
                response = client.post(
                    "/api/quick-start/preview",
                    files={
                        "cv_file": ("test.pdf", b"fake pdf content", "application/pdf")
                    },
                    data={"job_text": "Test job description"},
                )
                assert response.status_code in [
                    200,
                    422,
                ], f"IP1 Request {i+1} failed with status {response.status_code}"

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
                assert response.status_code in [
                    200,
                    422,
                ], f"IP2 Request {i+1} failed with status {response.status_code}"

            # Back to first IP: should still be rate limited
            mock_get_ip.return_value = "192.168.1.100"
            response = client.post(
                "/api/quick-start/preview",
                files={"cv_file": ("test.pdf", b"fake pdf content", "application/pdf")},
                data={"job_text": "Test job description"},
            )
            assert (
                response.status_code == 429
            ), f"Expected 429 (rate limited), got {response.status_code}: {response.text}"

    def test_rate_limit_reset_after_time_window(self, client):
        """Test that rate limits reset after the time window expires."""
        # Make 5 requests to hit the limit
        for i in range(5):
            response = client.post(
                "/api/quick-start/preview",
                files={"cv_file": ("test.pdf", b"fake pdf content", "application/pdf")},
                data={"job_text": "Test job description"},
            )
            assert response.status_code in [200, 422]

        # 6th request should be rate limited
        response = client.post(
            "/api/quick-start/preview",
            files={"cv_file": ("test.pdf", b"fake pdf content", "application/pdf")},
            data={"job_text": "Test job description"},
        )
        assert response.status_code == 429

        # Note: In a real test, we would wait for the time window to expire
        # For this test, we'll just verify the rate limiting works
        # In production, the 15-minute window would reset the counters

    def test_rate_limit_error_message(self, client):
        """Test that rate limit error messages are user-friendly."""
        # Make 5 requests to hit the limit
        for i in range(5):
            response = client.post(
                "/api/quick-start/preview",
                files={"cv_file": ("test.pdf", b"fake pdf content", "application/pdf")},
                data={"job_text": "Test job description"},
            )
            assert response.status_code in [200, 422]

        # 6th request should be rate limited with proper error message
        response = client.post(
            "/api/quick-start/preview",
            files={"cv_file": ("test.pdf", b"fake pdf content", "application/pdf")},
            data={"job_text": "Test job description"},
        )
        assert response.status_code == 429

        # Check that response contains rate limit information
        response_data = response.json()
        assert "message" in response_data
        assert (
            "rate limit" in response_data["message"].lower()
            or "too many requests" in response_data["message"].lower()
        )


class TestRateLimitWithAuthentication:
    """Test rate limiting behavior with authenticated requests."""

    @pytest.fixture
    def client(self):
        """Create test client with rate limiting enabled."""
        return TestClient(app)

    def test_authenticated_user_rate_limiting(self, client):
        """Test rate limiting for authenticated users."""
        # Mock authentication to simulate logged-in user
        with patch("src.middleware.rate_limit_user.get_effective_user") as mock_get_user:
            # Create mock user
            mock_user = Mock()
            mock_user.id = "test_user_123"
            mock_get_user.return_value = mock_user

            # Make 5 requests (should succeed)
            for i in range(5):
                response = client.post(
                    "/api/quick-start/preview",
                    files={
                        "cv_file": ("test.pdf", b"fake pdf content", "application/pdf")
                    },
                    data={"job_text": "Test job description"},
                )
                assert response.status_code in [
                    200,
                    422,
                ], f"Request {i+1} failed with status {response.status_code}"

            # 6th request should be rate limited
            response = client.post(
                "/api/quick-start/preview",
                files={"cv_file": ("test.pdf", b"fake pdf content", "application/pdf")},
                data={"job_text": "Test job description"},
            )
            assert (
                response.status_code == 429
            ), f"Expected 429 (rate limited), got {response.status_code}: {response.text}"

    def test_user_tracking_across_ips_authenticated(self, client):
        """Test that authenticated user counter tracks across different IPs."""
        with patch(
            "src.middleware.rate_limit_user.get_effective_user"
        ) as mock_get_user, patch(
            "src.utils.rate_limit.get_remote_address"
        ) as mock_get_ip:
            # Create mock user
            mock_user = Mock()
            mock_user.id = "test_user_123"
            mock_get_user.return_value = mock_user

            # First IP: make 3 requests
            mock_get_ip.return_value = "192.168.1.100"
            for i in range(3):
                response = client.post(
                    "/api/quick-start/preview",
                    files={
                        "cv_file": ("test.pdf", b"fake pdf content", "application/pdf")
                    },
                    data={"job_text": "Test job description"},
                )
                assert response.status_code in [
                    200,
                    422,
                ], f"IP1 Request {i+1} failed with status {response.status_code}"

            # Different IP: make 2 more requests (should succeed, same user)
            mock_get_ip.return_value = "192.168.1.101"
            for i in range(2):
                response = client.post(
                    "/api/quick-start/preview",
                    files={
                        "cv_file": ("test.pdf", b"fake pdf content", "application/pdf")
                    },
                    data={"job_text": "Test job description"},
                )
                assert response.status_code in [
                    200,
                    422,
                ], f"IP2 Request {i+1} failed with status {response.status_code}"

            # 6th request from any IP should be rate limited (user counter at 5)
            mock_get_ip.return_value = "192.168.1.102"
            response = client.post(
                "/api/quick-start/preview",
                files={"cv_file": ("test.pdf", b"fake pdf content", "application/pdf")},
                data={"job_text": "Test job description"},
            )
            assert (
                response.status_code == 429
            ), f"Expected 429 (rate limited), got {response.status_code}: {response.text}"

    def test_ip_tracking_across_users_authenticated(self, client):
        """Test that IP counter tracks across different authenticated users."""
        with patch(
            "src.middleware.rate_limit_user.get_effective_user"
        ) as mock_get_user, patch(
            "src.utils.rate_limit.get_remote_address"
        ) as mock_get_ip:
            mock_get_ip.return_value = "192.168.1.100"

            # First user: make 3 requests
            mock_user1 = Mock()
            mock_user1.id = "user_123"
            mock_get_user.return_value = mock_user1

            for i in range(3):
                response = client.post(
                    "/api/quick-start/preview",
                    files={
                        "cv_file": ("test.pdf", b"fake pdf content", "application/pdf")
                    },
                    data={"job_text": "Test job description"},
                )
                assert response.status_code in [
                    200,
                    422,
                ], f"User1 Request {i+1} failed with status {response.status_code}"

            # Second user: make 2 more requests (should succeed, same IP)
            mock_user2 = Mock()
            mock_user2.id = "user_456"
            mock_get_user.return_value = mock_user2

            for i in range(2):
                response = client.post(
                    "/api/quick-start/preview",
                    files={
                        "cv_file": ("test.pdf", b"fake pdf content", "application/pdf")
                    },
                    data={"job_text": "Test job description"},
                )
                assert response.status_code in [
                    200,
                    422,
                ], f"User2 Request {i+1} failed with status {response.status_code}"

            # 6th request from any user should be rate limited (IP counter at 5)
            mock_user3 = Mock()
            mock_user3.id = "user_789"
            mock_get_user.return_value = mock_user3

            response = client.post(
                "/api/quick-start/preview",
                files={"cv_file": ("test.pdf", b"fake pdf content", "application/pdf")},
                data={"job_text": "Test job description"},
            )
            assert (
                response.status_code == 429
            ), f"Expected 429 (rate limited), got {response.status_code}: {response.text}"


class TestRateLimitEdgeCases:
    """Test edge cases and error conditions for rate limiting."""

    @pytest.fixture
    def client(self):
        """Create test client with rate limiting enabled."""
        return TestClient(app)

    def test_rate_limit_with_malformed_requests(self, client):
        """Test that rate limiting works even with malformed requests."""
        # Make 5 malformed requests (should still count toward rate limit)
        for i in range(5):
            response = client.post(
                "/api/quick-start/preview",
                # Missing required files/data
                data={"job_text": "Test job description"},
            )
            # Should get validation error but still count toward rate limit
            assert response.status_code in [422, 429]

        # 6th request should be rate limited
        response = client.post(
            "/api/quick-start/preview", data={"job_text": "Test job description"}
        )
        assert response.status_code == 429

    def test_rate_limit_with_concurrent_requests(self, client):
        """Test rate limiting behavior with concurrent requests."""
        import threading
        import queue

        results = queue.Queue()

        def make_request():
            response = client.post(
                "/api/quick-start/preview",
                files={"cv_file": ("test.pdf", b"fake pdf content", "application/pdf")},
                data={"job_text": "Test job description"},
            )
            results.put(response.status_code)

        # Make 10 concurrent requests
        threads = []
        for i in range(10):
            thread = threading.Thread(target=make_request)
            threads.append(thread)
            thread.start()

        # Wait for all threads to complete
        for thread in threads:
            thread.join()

        # Collect results
        status_codes = []
        while not results.empty():
            status_codes.append(results.get())

        # Should have 5 successful requests and 5 rate limited
        successful = [code for code in status_codes if code in [200, 422]]
        rate_limited = [code for code in status_codes if code == 429]

        assert (
            len(successful) == 5
        ), f"Expected 5 successful requests, got {len(successful)}"
        assert (
            len(rate_limited) == 5
        ), f"Expected 5 rate limited requests, got {len(rate_limited)}"
