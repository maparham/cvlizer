#!/bin/bash

# Comprehensive Test Runner for CV Optimizer
# This script runs all tests for both backend and frontend

set -e  # Exit on any error

echo "🚀 Starting Comprehensive Test Suite for CV Optimizer"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to run tests and capture results
run_test_suite() {
    local test_name="$1"
    local test_command="$2"
    local test_dir="$3"
    
    print_status "Running $test_name..."
    
    if [ -n "$test_dir" ]; then
        cd "$test_dir"
    fi
    
    if eval "$test_command"; then
        print_success "$test_name passed"
        return 0
    else
        print_error "$test_name failed"
        return 1
    fi
}

# Track test results
backend_tests_passed=0
frontend_tests_passed=0
total_tests=0

# Backend Tests
echo ""
echo "🔧 BACKEND TESTS"
echo "================="

# Check if backend directory exists
if [ ! -d "backend" ]; then
    print_error "Backend directory not found!"
    exit 1
fi

# Backend Unit Tests
total_tests=$((total_tests + 1))
if run_test_suite "Backend Unit Tests" "python -m pytest tests/unit/ -v --tb=short" "backend"; then
    backend_tests_passed=$((backend_tests_passed + 1))
fi

# Backend Integration Tests
total_tests=$((total_tests + 1))
if run_test_suite "Backend Integration Tests" "python -m pytest tests/integration/ -v --tb=short" "backend"; then
    backend_tests_passed=$((backend_tests_passed + 1))
fi

# Backend Coverage
total_tests=$((total_tests + 1))
if run_test_suite "Backend Coverage" "python -m pytest tests/ --cov=src --cov-report=term-missing -v" "backend"; then
    backend_tests_passed=$((backend_tests_passed + 1))
fi

# Backend Linting
total_tests=$((total_tests + 1))
if run_test_suite "Backend Linting" "python -m flake8 src/ --max-line-length=100 --ignore=E203,W503" "backend"; then
    backend_tests_passed=$((backend_tests_passed + 1))
fi

# Frontend Tests
echo ""
echo "⚛️  FRONTEND TESTS"
echo "=================="

# Check if frontend directory exists
if [ ! -d "frontend" ]; then
    print_error "Frontend directory not found!"
    exit 1
fi

# Frontend Unit Tests
total_tests=$((total_tests + 1))
if run_test_suite "Frontend Unit Tests" "npm test -- --coverage --watchAll=false" "frontend"; then
    frontend_tests_passed=$((frontend_tests_passed + 1))
fi

# Frontend Linting
total_tests=$((total_tests + 1))
if run_test_suite "Frontend Linting" "npm run lint" "frontend"; then
    frontend_tests_passed=$((frontend_tests_passed + 1))
fi

# Frontend Type Checking
total_tests=$((total_tests + 1))
if run_test_suite "Frontend Type Checking" "npx tsc --noEmit" "frontend"; then
    frontend_tests_passed=$((frontend_tests_passed + 1))
fi

# Frontend Build Test
total_tests=$((total_tests + 1))
if run_test_suite "Frontend Build Test" "npm run build" "frontend"; then
    frontend_tests_passed=$((frontend_tests_passed + 1))
fi

# Return to root directory
cd "$(dirname "$0")"

# Summary
echo ""
echo "📊 TEST SUMMARY"
echo "==============="

backend_total=4
frontend_total=4
total_passed=$((backend_tests_passed + frontend_tests_passed))

echo "Backend Tests: $backend_tests_passed/$backend_total"
echo "Frontend Tests: $frontend_tests_passed/$frontend_total"
echo "Total: $total_passed/$total_tests"

if [ $total_passed -eq $total_tests ]; then
    print_success "🎉 All tests passed! The application is ready for production."
    exit 0
else
    print_error "⚠️  Some tests failed. Please check the errors above."
    exit 1
fi
