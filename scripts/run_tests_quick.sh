#!/bin/bash

# =============================================================================
# CV Optimizer - Quick Test Runner
# =============================================================================
# This script runs essential tests quickly without full coverage reports
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

print_header() {
    echo -e "\n${BLUE}=============================================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}=============================================================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_header "CV OPTIMIZER - QUICK TEST RUN"

# Backend quick tests
echo -e "\n${YELLOW}Running Backend Tests...${NC}"
cd "$BACKEND_DIR"

# Activate virtual environment if available
if [[ -f "venv/bin/activate" ]]; then
    source venv/bin/activate
fi

# Run unit tests only
if python -m pytest tests/unit/ -v --tb=short; then
    print_success "Backend unit tests passed"
else
    print_error "Backend unit tests failed"
    exit 1
fi

# Frontend quick tests
echo -e "\n${YELLOW}Running Frontend Tests...${NC}"
cd "$FRONTEND_DIR"

# Run unit tests only
if npm test -- --watchAll=false; then
    print_success "Frontend unit tests passed"
else
    print_error "Frontend unit tests failed"
    exit 1
fi

print_success "🎉 All quick tests passed!"
