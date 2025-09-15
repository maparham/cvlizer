#!/usr/bin/env python3
"""
Comprehensive test runner for the CV Optimizer backend
"""

import os
import sys
import subprocess
import pytest
from pathlib import Path

# Add the src directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))

def run_command(command, description):
    """Run a command and return success status"""
    
    try:
        result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
        return True
    except subprocess.CalledProcessError as e:
        return False

def run_tests():
    """Run all tests with coverage"""
    
    # Change to backend directory
    backend_dir = Path(__file__).parent.parent
    os.chdir(backend_dir)
    
    # Test results
    test_results = {}
    
    # 1. Run unit tests
    unit_command = "python -m pytest tests/unit/ -v --tb=short"
    test_results["unit"] = run_command(unit_command, "Unit Tests")
    
    # 2. Run integration tests
    integration_command = "python -m pytest tests/integration/ -v --tb=short"
    test_results["integration"] = run_command(integration_command, "Integration Tests")
    
    # 3. Run all tests with coverage
    coverage_command = "python -m pytest tests/ --cov=src --cov-report=html --cov-report=term-missing -v"
    test_results["coverage"] = run_command(coverage_command, "Coverage Report")
    
    # 4. Run linting
    lint_command = "python -m flake8 src/ --max-line-length=100 --ignore=E203,W503"
    test_results["linting"] = run_command(lint_command, "Code Linting")
    
    # 5. Run type checking
    type_check_command = "python -m mypy src/ --ignore-missing-imports"
    test_results["type_check"] = run_command(type_check_command, "Type Checking")
    
    # Summary
    total_tests = len(test_results)
    passed_tests = sum(1 for result in test_results.values() if result)
    
    if passed_tests == total_tests:
        return True
    else:
        return False

def run_specific_test(test_path):
    """Run a specific test file"""
    command = f"python -m pytest {test_path} -v --tb=short"
    return run_command(command, f"Running {test_path}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        # Run specific test
        test_path = sys.argv[1]
        success = run_specific_test(test_path)
    else:
        # Run all tests
        success = run_tests()
    
    sys.exit(0 if success else 1)
