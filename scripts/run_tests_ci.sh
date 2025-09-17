#!/bin/bash

# =============================================================================
# CV Optimizer - CI/CD Test Runner
# =============================================================================
# This script is optimized for continuous integration environments
# Runs tests with minimal output and proper exit codes
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

# Function to run command and capture exit code
run_test() {
    local test_name="$1"
    local command="$2"
    local working_dir="$3"
    
    echo "Running $test_name..."
    
    if cd "$working_dir" && eval "$command" >/dev/null 2>&1; then
        echo "✅ $test_name passed"
        return 0
    else
        echo "❌ $test_name failed"
        return 1
    fi
}

# Track overall success
OVERALL_SUCCESS=0

echo "Starting CI test suite..."

# Backend tests
echo "Testing backend..."
cd "$BACKEND_DIR"

# Activate virtual environment if available
if [[ -f "venv/bin/activate" ]]; then
    source venv/bin/activate
fi

# Run backend unit tests
if ! run_test "Backend Unit Tests" "python -m pytest tests/unit/ -v" "$BACKEND_DIR"; then
    OVERALL_SUCCESS=1
fi

# Run backend integration tests if they exist
if [[ -d "$BACKEND_DIR/tests/integration" ]] && [[ "$(ls -A "$BACKEND_DIR/tests/integration")" ]]; then
    if ! run_test "Backend Integration Tests" "python -m pytest tests/integration/ -v" "$BACKEND_DIR"; then
        OVERALL_SUCCESS=1
    fi
fi

# Frontend tests
echo "Testing frontend..."
cd "$FRONTEND_DIR"

# Install dependencies if needed
if [[ ! -d "node_modules" ]]; then
    echo "Installing frontend dependencies..."
    npm install --silent
fi

# Run frontend unit tests
if ! run_test "Frontend Unit Tests" "npm test -- --watchAll=false --silent" "$FRONTEND_DIR"; then
    OVERALL_SUCCESS=1
fi

# Run frontend build test
if ! run_test "Frontend Build Test" "npm run build" "$FRONTEND_DIR"; then
    OVERALL_SUCCESS=1
fi

# Summary
if [[ $OVERALL_SUCCESS -eq 0 ]]; then
    echo "🎉 All CI tests passed!"
    exit 0
else
    echo "❌ Some CI tests failed!"
    exit 1
fi
