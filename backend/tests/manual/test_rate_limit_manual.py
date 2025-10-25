#!/usr/bin/env python3
"""
Manual test script for combined IP + User ID rate limiting.

This script can be run manually to verify rate limiting behavior
with real HTTP requests and different scenarios.

Usage:
    python test_rate_limit_manual.py
"""

import requests
import time
import json
from typing import List, Dict, Any


class RateLimitTester:
    """Manual tester for rate limiting functionality."""

    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.session = requests.Session()

    def make_quick_start_request(
        self, cv_content: bytes = b"fake pdf content"
    ) -> requests.Response:
        """Make a quick start preview request."""
        files = {"cv_file": ("test.pdf", cv_content, "application/pdf")}
        data = {"job_text": "Test job description for rate limiting"}

        return self.session.post(
            f"{self.base_url}/api/quick-start/preview", files=files, data=data
        )

    def make_admin_request(self) -> requests.Response:
        """Make an admin request."""
        return self.session.get(f"{self.base_url}/admin/users")

    def test_basic_rate_limiting(self, endpoint_name: str, make_request, limit: int = 5):
        """Test basic rate limiting behavior."""
        print(f"\n=== Testing {endpoint_name} Rate Limiting (limit: {limit}) ===")

        # Make requests up to the limit
        for i in range(limit):
            response = make_request()
            print(f"Request {i+1}: Status {response.status_code}")

            if response.status_code not in [200, 422, 401, 403]:
                print(f"  Unexpected status: {response.text[:200]}")

        # Make one more request (should be rate limited)
        response = make_request()
        print(f"Request {limit+1}: Status {response.status_code}")

        if response.status_code == 429:
            print("  ✅ Rate limiting working correctly")
            try:
                error_data = response.json()
                print(f"  Error message: {error_data.get('message', 'No message')}")
            except (ValueError, KeyError):
                print(f"  Error text: {response.text[:200]}")
        else:
            print(f"  ❌ Expected 429 (rate limited), got {response.status_code}")
            print(f"  Response: {response.text[:200]}")

    def test_ip_based_rate_limiting(self):
        """Test that rate limiting is based on IP address."""
        print("\n=== Testing IP-based Rate Limiting ===")

        # Simulate different IP addresses by using different headers
        headers1 = {"X-Forwarded-For": "192.168.1.100"}
        headers2 = {"X-Forwarded-For": "192.168.1.101"}

        # Make 5 requests from first IP
        print("Making 5 requests from IP 192.168.1.100...")
        for i in range(5):
            response = self.session.post(
                f"{self.base_url}/api/quick-start/preview",
                files={"cv_file": ("test.pdf", b"fake pdf content", "application/pdf")},
                data={"job_text": "Test job description"},
                headers=headers1,
            )
            print(f"  Request {i+1}: Status {response.status_code}")

        # Make 5 requests from second IP (should work)
        print("Making 5 requests from IP 192.168.1.101...")
        for i in range(5):
            response = self.session.post(
                f"{self.base_url}/api/quick-start/preview",
                files={"cv_file": ("test.pdf", b"fake pdf content", "application/pdf")},
                data={"job_text": "Test job description"},
                headers=headers2,
            )
            print(f"  Request {i+1}: Status {response.status_code}")

        # Back to first IP (should be rate limited)
        print("Making request from IP 192.168.1.100 (should be rate limited)...")
        response = self.session.post(
            f"{self.base_url}/api/quick-start/preview",
            files={"cv_file": ("test.pdf", b"fake pdf content", "application/pdf")},
            data={"job_text": "Test job description"},
            headers=headers1,
        )
        print(f"  Request: Status {response.status_code}")

        if response.status_code == 429:
            print("  ✅ IP-based rate limiting working correctly")
        else:
            print(f"  ❌ Expected 429 (rate limited), got {response.status_code}")

    def test_rate_limit_reset(self, wait_time: int = 16):
        """Test that rate limits reset after time window."""
        print(f"\n=== Testing Rate Limit Reset (waiting {wait_time} minutes) ===")

        # Hit the rate limit
        print("Hitting rate limit...")
        for i in range(6):  # 5 + 1 to hit limit
            response = self.make_quick_start_request()
            print(f"Request {i+1}: Status {response.status_code}")

        print(f"Waiting {wait_time} minutes for rate limit to reset...")
        print("(In a real test, you would wait for the actual time window)")
        print("For now, we'll just verify the rate limiting worked")

    def test_concurrent_requests(self, num_requests: int = 10):
        """Test rate limiting with concurrent requests."""
        print(f"\n=== Testing Concurrent Requests ({num_requests} requests) ===")

        import threading
        import queue

        results = queue.Queue()

        def make_request():
            response = self.make_quick_start_request()
            results.put(response.status_code)

        # Start all threads
        threads = []
        for i in range(num_requests):
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

        successful = [code for code in status_codes if code in [200, 422]]
        rate_limited = [code for code in status_codes if code == 429]

        print(f"Successful requests: {len(successful)}")
        print(f"Rate limited requests: {len(rate_limited)}")

        if len(successful) == 5 and len(rate_limited) == 5:
            print("✅ Concurrent rate limiting working correctly")
        else:
            print(
                f"❌ Expected 5 successful and 5 rate limited, got {len(successful)} and {len(rate_limited)}"
            )

    def run_all_tests(self):
        """Run all rate limiting tests."""
        print("🚀 Starting Rate Limiting Tests")
        print("=" * 50)

        try:
            # Test basic rate limiting
            self.test_basic_rate_limiting(
                "Quick Start", self.make_quick_start_request, limit=5
            )

            # Wait a bit between tests
            time.sleep(2)

            # Test admin rate limiting
            self.test_basic_rate_limiting("Admin", self.make_admin_request, limit=10)

            # Wait a bit between tests
            time.sleep(2)

            # Test IP-based rate limiting
            self.test_ip_based_rate_limiting()

            # Wait a bit between tests
            time.sleep(2)

            # Test concurrent requests
            self.test_concurrent_requests()

            print("\n" + "=" * 50)
            print("✅ All tests completed!")

        except requests.exceptions.ConnectionError:
            print(
                "❌ Could not connect to server. Make sure the backend is running on localhost:8000"
            )
        except Exception as e:
            print(f"❌ Test failed with error: {e}")


def main():
    """Main function to run manual tests."""
    tester = RateLimitTester()
    tester.run_all_tests()


if __name__ == "__main__":
    main()
