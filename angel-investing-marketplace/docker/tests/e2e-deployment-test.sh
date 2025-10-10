#!/bin/bash

# E2E Deployment Test Orchestrator
# Complete deployment lifecycle validation

set -e

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TESTS_DIR="$SCRIPT_DIR"
SCENARIOS_DIR="$TESTS_DIR/test-scenarios"
RESULTS_DIR="$TESTS_DIR/test-results"

# Source test utilities
source "$TESTS_DIR/test-utils.sh"

# Configuration
SKIP_CLEANUP=false
VERBOSE=false
TEST_START_TIME=$(date +%s)

# Test scenarios to run (in order)
SCENARIOS=(
    "full-deployment.sh"
    "health-validation.sh"
    "migration-validation.sh"
    "service-restart.sh"
    "clean-teardown.sh"
)

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0

# Parse command line arguments
show_help() {
    cat << EOF
${BLUE}Angel Investing Marketplace - E2E Deployment Test${NC}

${GREEN}USAGE:${NC}
    ./e2e-deployment-test.sh [OPTIONS]

${GREEN}OPTIONS:${NC}
    --skip-cleanup    Preserve environment after tests for debugging
    --verbose         Show detailed output from each test
    --help            Show this help message

${GREEN}EXAMPLES:${NC}
    ./e2e-deployment-test.sh                  # Run full test suite
    ./e2e-deployment-test.sh --verbose        # Detailed output
    ./e2e-deployment-test.sh --skip-cleanup   # Keep environment for debugging

${GREEN}TEST PHASES:${NC}
    1. Full Deployment    - Clean environment → fresh deployment
    2. Health Validation  - Comprehensive health checks
    3. Migration Check    - Database migration verification
    4. Restart Resilience - Service recovery and data persistence
    5. Clean Teardown     - Resource cleanup validation

${GREEN}EXIT CODES:${NC}
    0 - All tests passed
    1 - One or more tests failed

${YELLOW}DURATION:${NC}
    Expected: 3-5 minutes on healthy system
    Timeout:  Individual test timeouts apply

EOF
}

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-cleanup)
            SKIP_CLEANUP=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}Error: Unknown option $1${NC}"
            echo "Run './e2e-deployment-test.sh --help' for usage"
            exit 1
            ;;
    esac
done

# Create results directory
mkdir -p "$RESULTS_DIR"

# Generate timestamped log file
LOG_FILE="$RESULTS_DIR/e2e-test-$(get_iso_timestamp).log"
touch "$LOG_FILE"

# Log function
log_to_file() {
    echo "[$(get_timestamp)] $1" >> "$LOG_FILE"
}

# Print header
echo -e "${BLUE}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Angel Investing Marketplace - E2E Deployment Test  ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""

log_to_file "E2E Deployment Test Started"
log_to_file "Test Configuration: skip_cleanup=$SKIP_CLEANUP, verbose=$VERBOSE"

# System information
echo -e "${CYAN}Test Environment:${NC}"
DOCKER_VERSION=$(docker --version 2>/dev/null || echo "Docker not found")
COMPOSE_VERSION=$(docker compose version 2>/dev/null || docker-compose --version 2>/dev/null || echo "Compose not found")
echo -e "  Docker:  $DOCKER_VERSION"
echo -e "  Compose: $COMPOSE_VERSION"
echo -e "  OS:      $(uname -s)"
echo -e "  Log:     $LOG_FILE"
echo ""

log_to_file "Docker Version: $DOCKER_VERSION"
log_to_file "Compose Version: $COMPOSE_VERSION"
log_to_file "OS: $(uname -s)"

# Run test scenarios
log_test_phase "Starting Test Execution" "INFO"
echo ""

for scenario in "${SCENARIOS[@]}"; do
    SCENARIO_PATH="$SCENARIOS_DIR/$scenario"
    SCENARIO_NAME=$(basename "$scenario" .sh)

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    if [ ! -f "$SCENARIO_PATH" ]; then
        log_test_phase "$SCENARIO_NAME" "FAIL" "Scenario file not found"
        log_to_file "FAILED: $SCENARIO_NAME - file not found"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        continue
    fi

    echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
    log_test_phase "Scenario: $SCENARIO_NAME" "START"
    echo ""

    log_to_file "Starting scenario: $SCENARIO_NAME"
    SCENARIO_START=$(date +%s)

    # Run scenario
    if [ "$VERBOSE" = true ]; then
        # Show full output
        if bash "$SCENARIO_PATH"; then
            SCENARIO_END=$(date +%s)
            SCENARIO_DURATION=$((SCENARIO_END - SCENARIO_START))

            log_test_phase "$SCENARIO_NAME" "PASS" "Completed in ${SCENARIO_DURATION}s"
            log_to_file "PASSED: $SCENARIO_NAME (${SCENARIO_DURATION}s)"
            PASSED_TESTS=$((PASSED_TESTS + 1))
        else
            SCENARIO_END=$(date +%s)
            SCENARIO_DURATION=$((SCENARIO_END - SCENARIO_START))

            log_test_phase "$SCENARIO_NAME" "FAIL" "Failed after ${SCENARIO_DURATION}s"
            log_to_file "FAILED: $SCENARIO_NAME (${SCENARIO_DURATION}s)"
            FAILED_TESTS=$((FAILED_TESTS + 1))
        fi
    else
        # Capture output, show only on failure
        SCENARIO_OUTPUT=$(bash "$SCENARIO_PATH" 2>&1) || SCENARIO_EXIT=$?
        SCENARIO_EXIT=${SCENARIO_EXIT:-0}
        SCENARIO_END=$(date +%s)
        SCENARIO_DURATION=$((SCENARIO_END - SCENARIO_START))

        if [ $SCENARIO_EXIT -eq 0 ]; then
            log_test_phase "$SCENARIO_NAME" "PASS" "Completed in ${SCENARIO_DURATION}s"
            log_to_file "PASSED: $SCENARIO_NAME (${SCENARIO_DURATION}s)"
            PASSED_TESTS=$((PASSED_TESTS + 1))
        else
            log_test_phase "$SCENARIO_NAME" "FAIL" "Failed after ${SCENARIO_DURATION}s"
            echo ""
            echo -e "${RED}Scenario Output:${NC}"
            echo "$SCENARIO_OUTPUT"
            echo ""
            log_to_file "FAILED: $SCENARIO_NAME (${SCENARIO_DURATION}s)"
            log_to_file "$SCENARIO_OUTPUT"
            FAILED_TESTS=$((FAILED_TESTS + 1))
        fi
    fi

    echo ""
done

# Calculate total duration
TEST_END_TIME=$(date +%s)
TOTAL_DURATION=$((TEST_END_TIME - TEST_START_TIME))
TOTAL_MINUTES=$((TOTAL_DURATION / 60))
TOTAL_SECONDS=$((TOTAL_DURATION % 60))

# Print summary
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
print_test_summary "$TOTAL_TESTS" "$PASSED_TESTS" "$FAILED_TESTS" "$SKIPPED_TESTS"

echo -e "${CYAN}Test Duration:${NC} ${TOTAL_MINUTES}m ${TOTAL_SECONDS}s"
echo ""

# Service logs on failure
if [ $FAILED_TESTS -gt 0 ]; then
    echo -e "${YELLOW}Service Logs (last 20 lines each):${NC}"
    echo ""

    COMPOSE_CMD=$(get_compose_cmd)
    DOCKER_DIR="$(dirname "$TESTS_DIR")"

    cd "$DOCKER_DIR"

    for service in backend frontend postgres redis; do
        if container_exists "angel-investing-$service"; then
            echo -e "${CYAN}=== $service ===${NC}"
            get_service_logs "$service" 20
            echo ""
        fi
    done
fi

# Recommendations on failure
if [ $FAILED_TESTS -gt 0 ]; then
    echo -e "${YELLOW}Troubleshooting Recommendations:${NC}"
    echo -e "  • Check detailed logs: ${BLUE}cat $LOG_FILE${NC}"
    echo -e "  • Run individual test: ${BLUE}./test-scenarios/<scenario>.sh${NC}"
    echo -e "  • Check service logs: ${BLUE}../scripts/logs.sh${NC}"
    echo -e "  • Check health status: ${BLUE}../scripts/health-check.sh -v${NC}"
    echo -e "  • Reset environment: ${BLUE}../scripts/down.sh --volumes${NC}"
    echo ""
fi

# Cleanup unless skipped
if [ "$SKIP_CLEANUP" = true ]; then
    echo -e "${YELLOW}${WARNING_EMOJI} Cleanup skipped (--skip-cleanup flag)${NC}"
    echo -e "  Environment preserved for debugging"
    echo -e "  Clean up manually: ${BLUE}../scripts/down.sh --volumes${NC}"
    echo ""
    log_to_file "Cleanup skipped - environment preserved"
else
    if [ $FAILED_TESTS -eq 0 ]; then
        log_test_phase "Cleanup" "INFO" "Removing test environment"
        # Only clean up on success to allow debugging of failures
        DOCKER_DIR="$(dirname "$TESTS_DIR")"
        cd "$DOCKER_DIR"

        COMPOSE_CMD=$(get_compose_cmd)
        $COMPOSE_CMD down > /dev/null 2>&1 || true

        log_to_file "Cleanup completed"
    else
        log_test_phase "Cleanup" "INFO" "Preserving environment for debugging (tests failed)"
        log_to_file "Environment preserved due to test failures"
    fi
fi

# Final summary
echo -e "${CYAN}Test Report:${NC} $LOG_FILE"
echo -e "${CYAN}Result:${NC} "

log_to_file "Test Summary: Total=$TOTAL_TESTS, Passed=$PASSED_TESTS, Failed=$FAILED_TESTS"
log_to_file "Total Duration: ${TOTAL_MINUTES}m ${TOTAL_SECONDS}s"
log_to_file "E2E Deployment Test Completed"

# Exit with appropriate code
if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}${PASSED_EMOJI} All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}${FAILED_EMOJI} $FAILED_TESTS test(s) failed.${NC}"
    exit 1
fi
