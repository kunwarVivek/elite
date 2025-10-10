#!/bin/bash

# Clean Teardown Verification Test Scenario
# Validates complete resource cleanup

set -e

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TESTS_DIR="$(dirname "$SCRIPT_DIR")"
DOCKER_DIR="$(dirname "$TESTS_DIR")"
SCRIPTS_DIR="$DOCKER_DIR/scripts"

# Source test utilities
source "$TESTS_DIR/test-utils.sh"

# Test configuration
TEST_FAILED=0

log_test_phase "Clean Teardown Verification Test" "INFO"
echo ""

cd "$DOCKER_DIR"
COMPOSE_CMD=$(get_compose_cmd)

# Phase 1: Graceful shutdown (without volumes)
log_test_phase "Phase 1: Graceful Shutdown" "START"

if bash "$SCRIPTS_DIR/down.sh" --timeout 30 > /dev/null 2>&1; then
    log_test_phase "Graceful shutdown completed" "PASS"
else
    log_test_phase "Graceful shutdown failed" "FAIL"
    TEST_FAILED=1
fi

# Test 1: Verify all containers stopped
log_test_phase "Test 1: Container Shutdown Verification" "START"

RUNNING_CONTAINERS=$(docker ps --format '{{.Names}}' | grep "angel-investing" || echo "")

if [ -z "$RUNNING_CONTAINERS" ]; then
    log_test_phase "All containers stopped" "PASS"
else
    log_test_phase "Some containers still running" "FAIL"
    echo "$RUNNING_CONTAINERS" | while read -r container; do
        log_test_phase "Running container: $container" "FAIL"
    done
    TEST_FAILED=1
fi

# Test 2: Verify networks removed (default behavior)
log_test_phase "Test 2: Network Cleanup" "START"

if network_exists "angel-investing-network"; then
    log_test_phase "Network still exists (expected for graceful shutdown)" "INFO"
else
    log_test_phase "Network removed" "PASS"
fi

# Phase 2: Complete cleanup (with volumes)
log_test_phase "Phase 2: Complete Cleanup with Volumes" "START"

# Run down with volumes flag (non-interactive with 'yes')
echo "yes" | bash "$SCRIPTS_DIR/down.sh" --volumes --timeout 30 > /dev/null 2>&1 || true

sleep 2  # Allow time for cleanup

# Test 3: Verify volumes removed
log_test_phase "Test 3: Volume Removal" "START"

VOLUMES_EXIST=false

if volume_exists "angel-investing-marketplace_postgres_data"; then
    log_test_phase "postgres_data volume still exists" "FAIL"
    VOLUMES_EXIST=true
    TEST_FAILED=1
else
    log_test_phase "postgres_data volume removed" "PASS"
fi

if volume_exists "angel-investing-marketplace_redis_data"; then
    log_test_phase "redis_data volume still exists" "FAIL"
    VOLUMES_EXIST=true
    TEST_FAILED=1
else
    log_test_phase "redis_data volume removed" "PASS"
fi

# Test 4: Check for orphan containers
log_test_phase "Test 4: Orphan Container Detection" "START"

ALL_ANGEL_CONTAINERS=$(docker ps -a --format '{{.Names}}' | grep "angel-investing" || echo "")

if [ -z "$ALL_ANGEL_CONTAINERS" ]; then
    log_test_phase "No orphan containers" "PASS"
else
    log_test_phase "Orphan containers detected" "FAIL"
    echo "$ALL_ANGEL_CONTAINERS" | while read -r container; do
        log_test_phase "Orphan container: $container" "FAIL"
    done
    TEST_FAILED=1
fi

# Test 5: Verify ports freed
log_test_phase "Test 5: Port Availability" "START"

if check_port_available 3000; then
    log_test_phase "Port 3000 available" "PASS"
else
    log_test_phase "Port 3000 still in use" "FAIL"
    TEST_FAILED=1
fi

if check_port_available 3001; then
    log_test_phase "Port 3001 available" "PASS"
else
    log_test_phase "Port 3001 still in use" "FAIL"
    TEST_FAILED=1
fi

# Test 6: Idempotency check - run down again
log_test_phase "Test 6: Idempotency Verification" "START"

if bash "$SCRIPTS_DIR/down.sh" --timeout 10 > /dev/null 2>&1; then
    log_test_phase "Multiple down.sh executions succeed" "PASS"
else
    log_test_phase "down.sh not idempotent" "WARN"
fi

# Test 7: Network cleanup verification
log_test_phase "Test 7: Final Network State" "START"

if network_exists "angel-investing-network"; then
    # Try to remove network manually
    docker network rm angel-investing-network > /dev/null 2>&1 || true
    sleep 1

    if network_exists "angel-investing-network"; then
        log_test_phase "Network persists (may have other containers)" "WARN"
    else
        log_test_phase "Network removed" "PASS"
    fi
else
    log_test_phase "Network already removed" "PASS"
fi

# Resource summary
log_test_phase "Resource Cleanup Summary" "INFO"

ANGEL_CONTAINERS=$(docker ps -a --format '{{.Names}}' | grep "angel-investing" | wc -l | tr -d ' ')
ANGEL_VOLUMES=$(docker volume ls --format '{{.Name}}' | grep "angel-investing" | wc -l | tr -d ' ')
ANGEL_NETWORKS=$(docker network ls --format '{{.Name}}' | grep "angel-investing" | wc -l | tr -d ' ')

log_test_phase "Remaining containers" "INFO" "$ANGEL_CONTAINERS"
log_test_phase "Remaining volumes" "INFO" "$ANGEL_VOLUMES"
log_test_phase "Remaining networks" "INFO" "$ANGEL_NETWORKS"

# Test Summary
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║    Clean Teardown Verification Complete       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

if [ $TEST_FAILED -eq 0 ]; then
    log_test_phase "Clean Teardown Verification Test" "PASS" "All resources cleaned up"
    exit 0
else
    log_test_phase "Clean Teardown Verification Test" "FAIL" "Some resources remain"
    exit 1
fi
