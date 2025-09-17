#!/bin/bash

# =============================================================================
# CV Optimizer - Main Test Runner
# =============================================================================
# This script provides a simple interface to run different test suites
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_usage() {
    echo -e "${BLUE}CV Optimizer Test Runner${NC}"
    echo -e "${BLUE}========================${NC}\n"
    echo "Usage: $0 [TEST_TYPE]"
    echo ""
    echo "Available test types:"
    echo "  ci       - Run CI/CD optimized tests (minimal output)"
    echo "  minimal  - Run only working tests"
    echo "  quick    - Run essential tests quickly"
    echo "  simple   - Run basic tests with error handling"
    echo ""
    echo "If no argument is provided, runs 'simple' tests by default."
}

# Default to simple if no argument provided
TEST_TYPE="${1:-simple}"

case "$TEST_TYPE" in
    "ci")
        echo -e "${GREEN}Running CI tests...${NC}"
        exec "$SCRIPT_DIR/scripts/run_tests_ci.sh"
        ;;
    "minimal")
        echo -e "${GREEN}Running minimal tests...${NC}"
        exec "$SCRIPT_DIR/scripts/run_tests_minimal.sh"
        ;;
    "quick")
        echo -e "${GREEN}Running quick tests...${NC}"
        exec "$SCRIPT_DIR/scripts/run_tests_quick.sh"
        ;;
    "simple")
        echo -e "${GREEN}Running simple tests...${NC}"
        exec "$SCRIPT_DIR/scripts/run_tests_simple.sh"
        ;;
    "--help"|"-h"|"help")
        print_usage
        exit 0
        ;;
    *)
        echo -e "${RED}Error: Unknown test type '$TEST_TYPE'${NC}\n"
        print_usage
        exit 1
        ;;
esac
