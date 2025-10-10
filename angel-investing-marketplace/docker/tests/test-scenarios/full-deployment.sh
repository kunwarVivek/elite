#!/bin/bash

# Full Deployment Test Scenario
# Tests complete clean deployment lifecycle: teardown → fresh start → validation

set -e

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TESTS_DIR="$(dirname "$SCRIPT_DIR")"
DOCKER_DIR="$(dirname "$TESTS_DIR")"
SCRIPTS_DIR="$DOCKER_DIR/scripts"

# Source test utilities
source "$TESTS_DIR/test-utils.sh"

# Test configuration
MAX_STARTUP_WAIT=180  # 3 minutes for all services to be healthy
TEST_FAILED=0

log_test_phase "Full Deployment Test Scenario" "INFO"
echo ""

# Phase 1: Clean environment teardown
log_test_phase "Phase 1: Clean Environment Teardown" "START"

cd "$DOCKER_DIR"
COMPOSE_CMD=$(get_compose_cmd)

# Stop all services and remove volumes
if $COMPOSE_CMD down -v --timeout 30 > /dev/null 2>&1; then
    log_test_phase "Services stopped and volumes removed" "PASS"
else
    log_test_phase "Failed to stop services" "FAIL"
    TEST_FAILED=1
fi

# Phase 2: Verify clean state
log_test_phase "Phase 2: Verify Clean State" "START"

# Check no containers running
if ! docker ps --format '{{.Names}}' | grep -q "angel-investing"; then
    log_test_phase "No orphan containers" "PASS"
else
    log_test_phase "Orphan containers detected" "FAIL"
    TEST_FAILED=1
fi

# Check volumes removed
if ! volume_exists "angel-investing-marketplace_postgres_data" && \
   ! volume_exists "angel-investing-marketplace_redis_data"; then
    log_test_phase "Volumes removed" "PASS"
else
    log_test_phase "Volumes still exist" "FAIL"
    TEST_FAILED=1
fi

# Check network removed
if ! network_exists "angel-investing-network"; then
    log_test_phase "Network removed" "PASS"
else
    log_test_phase "Network still exists" "WARN" "Will be reused"
fi

# Phase 3: Fresh deployment
log_test_phase "Phase 3: Fresh Deployment" "START"

# Run deployment script
if bash "$SCRIPTS_DIR/deploy.sh" --dev-secrets > /dev/null 2>&1; then
    log_test_phase "Deployment script completed" "PASS"
else
    log_test_phase "Deployment script failed" "FAIL"
    TEST_FAILED=1
    exit 1
fi

# Phase 4: Wait for services to be healthy
log_test_phase "Phase 4: Service Health Validation" "START"

ELAPSED=0
INTERVAL=5
ALL_HEALTHY=false

while [ $ELAPSED -lt $MAX_STARTUP_WAIT ]; do
    if assert_service_healthy "postgres" && \
       assert_service_healthy "redis" && \
       assert_service_healthy "backend" && \
       assert_service_healthy "frontend"; then
        ALL_HEALTHY=true
        break
    fi

    sleep $INTERVAL
    ELAPSED=$((ELAPSED + INTERVAL))
done

if [ "$ALL_HEALTHY" = true ]; then
    log_test_phase "All services healthy (${ELAPSED}s)" "PASS"
else
    log_test_phase "Services did not reach healthy state (timeout: ${MAX_STARTUP_WAIT}s)" "FAIL"
    TEST_FAILED=1
fi

# Phase 5: Validate service endpoints
log_test_phase "Phase 5: Endpoint Validation" "START"

# Backend health endpoint
if assert_http_ok "http://localhost:3001/health" 10; then
    log_test_phase "Backend health endpoint reachable" "PASS"
else
    log_test_phase "Backend health endpoint unreachable" "FAIL"
    TEST_FAILED=1
fi

# Frontend root endpoint
if assert_http_ok "http://localhost:3000/" 10; then
    log_test_phase "Frontend root endpoint reachable" "PASS"
else
    log_test_phase "Frontend root endpoint unreachable" "FAIL"
    TEST_FAILED=1
fi

# Database connectivity (via backend container)
if docker exec angel-investing-backend node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.\$connect().then(() => { prisma.\$disconnect(); process.exit(0); }).catch(() => process.exit(1));" > /dev/null 2>&1; then
    log_test_phase "Database connectivity from backend" "PASS"
else
    log_test_phase "Database connectivity from backend" "FAIL"
    TEST_FAILED=1
fi

# Test Summary
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║      Full Deployment Test Complete            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

if [ $TEST_FAILED -eq 0 ]; then
    log_test_phase "Full Deployment Test" "PASS" "All phases completed successfully"
    exit 0
else
    log_test_phase "Full Deployment Test" "FAIL" "One or more phases failed"
    exit 1
fi
