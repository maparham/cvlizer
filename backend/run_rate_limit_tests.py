#!/usr/bin/env python3
"""
Test runner for rate limiting tests.

This script runs all rate limiting tests and provides a summary of results.

Usage:
    python run_rate_limit_tests.py [--unit] [--integration] [--manual] [--all]
"""

import sys
import subprocess
import argparse
from pathlib import Path


def run_command(command: list, description: str) -> bool:
    """Run a command and return success status."""
    print(f"\n{'='*60}")
    print(f"Running: {description}")
    print(f"Command: {' '.join(command)}")
    print(f"{'='*60}")

    try:
        result = subprocess.run(command, check=True, capture_output=True, text=True)
        print("✅ SUCCESS")
        if result.stdout:
            print("Output:")
            print(result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        print("❌ FAILED")
        print(f"Exit code: {e.returncode}")
        if e.stdout:
            print("Output:")
            print(e.stdout)
        if e.stderr:
            print("Error:")
            print(e.stderr)
        return False


def run_unit_tests() -> bool:
    """Run unit tests for rate limiting."""
    return run_command(
        [
            sys.executable,
            "-m",
            "pytest",
            "tests/unit/test_rate_limit.py",
            "-v",
            "--tb=short",
        ],
        "Unit Tests",
    )


def run_integration_tests() -> bool:
    """Run integration tests for rate limiting."""
    return run_command(
        [
            sys.executable,
            "-m",
            "pytest",
            "tests/integration/test_rate_limit_integration.py",
            "-v",
            "--tb=short",
        ],
        "Integration Tests",
    )


def run_manual_tests() -> bool:
    """Run manual tests for rate limiting."""
    print(f"\n{'='*60}")
    print("Manual Tests")
    print("=" * 60)
    print("Note: Manual tests require the server to be running.")
    print("Start the server with: python main.py")
    print("Then run: python tests/manual/test_rate_limit_manual.py")
    print("=" * 60)
    return True


def run_all_tests() -> bool:
    """Run all rate limiting tests."""
    print("🚀 Running All Rate Limiting Tests")
    print("=" * 60)

    results = []

    # Run unit tests
    results.append(("Unit Tests", run_unit_tests()))

    # Run integration tests
    results.append(("Integration Tests", run_integration_tests()))

    # Manual tests info
    results.append(("Manual Tests", run_manual_tests()))

    # Print summary
    print(f"\n{'='*60}")
    print("TEST SUMMARY")
    print("=" * 60)

    all_passed = True
    for test_name, passed in results:
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{test_name:<20} {status}")
        if not passed:
            all_passed = False

    print("=" * 60)
    if all_passed:
        print("🎉 All tests completed successfully!")
    else:
        print("⚠️  Some tests failed. Check the output above for details.")

    return all_passed


def main():
    """Main function to run tests based on command line arguments."""
    parser = argparse.ArgumentParser(description="Run rate limiting tests")
    parser.add_argument("--unit", action="store_true", help="Run unit tests only")
    parser.add_argument(
        "--integration", action="store_true", help="Run integration tests only"
    )
    parser.add_argument(
        "--manual", action="store_true", help="Show manual test instructions"
    )
    parser.add_argument("--all", action="store_true", help="Run all tests (default)")

    args = parser.parse_args()

    # If no specific test type is specified, run all
    if not any([args.unit, args.integration, args.manual]):
        args.all = True

    success = True

    if args.unit:
        success &= run_unit_tests()

    if args.integration:
        success &= run_integration_tests()

    if args.manual:
        success &= run_manual_tests()

    if args.all:
        success &= run_all_tests()

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
