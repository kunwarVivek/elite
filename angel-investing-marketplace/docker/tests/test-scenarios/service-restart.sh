#!/bin/bash

# Service Restart Resilience Test Scenario
# Tests service recovery and data persistence across restarts

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
TEST_USER_EMAIL="test_restart_$(date +%s)@e2e.test"
TEST_USER_NAME="E2E Test User"

log_test_phase "Service Restart Resilience Test" "INFO"
echo ""

cd "$DOCKER_DIR"
COMPOSE_CMD=$(get_compose_cmd)

# Test 1: Insert test data via backend
log_test_phase "Test 1: Insert Test Data" "START"

# Create test user via SQL (simpler than API call)
INSERT_RESULT=$(docker_exec_postgres "INSERT INTO \"User\" (id, email, name, \"emailVerified\", \"createdAt\", \"updatedAt\") VALUES (gen_random_uuid(), '${TEST_USER_EMAIL}', '${TEST_USER_NAME}', NOW(), NOW(), NOW()) RETURNING id;" 2>&1)

if echo "$INSERT_RESULT" | grep -q "[0-9a-f-]\{36\}"; then
    TEST_USER_ID=$(echo "$INSERT_RESULT" | grep -oE "[0-9a-f-]{36}" | head -n1)
    log_test_phase "Test user created (ID: ${TEST_USER_ID:0:8}...)" "PASS"
else
    log_test_phase "Failed to create test user" "FAIL"
    TEST_FAILED=1
fi

# Test 2: Restart backend service
log_test_phase "Test 2: Restart Backend Service" "START"

if bash "$SCRIPTS_DIR/restart.sh" backend > /dev/null 2>&1; then
    log_test_phase "Backend restart initiated" "PASS"
else
    log_test_phase "Backend restart failed" "FAIL"
    TEST_FAILED=1
fi

# Test 3: Verify backend recovery
log_test_phase "Test 3: Backend Recovery" "START"

if wait_for_service "backend" 60; then
    log_test_phase "Backend recovered and healthy" "PASS"
else
    log_test_phase "Backend failed to recover (timeout 60s)" "FAIL"
    TEST_FAILED=1
fi

# Verify backend health endpoint
if assert_http_ok "http://localhost:3001/health" 10; then
    log_test_phase "Backend health endpoint reachable" "PASS"
else
    log_test_phase "Backend health endpoint unreachable" "FAIL"
    TEST_FAILED=1
fi

# Test 4: Verify data persistence
log_test_phase "Test 4: Data Persistence After Backend Restart" "START"

USER_EXISTS=$(docker_exec_postgres "SELECT COUNT(*) FROM \"User\" WHERE email = '${TEST_USER_EMAIL}';" | tr -d ' \n')

if [ "$USER_EXISTS" = "1" ]; then
    log_test_phase "Test user data persisted" "PASS"
else
    log_test_phase "Test user data lost" "FAIL"
    TEST_FAILED=1
fi

# Test 5: Restart frontend service
log_test_phase "Test 5: Restart Frontend Service" "START"

if bash "$SCRIPTS_DIR/restart.sh" frontend > /dev/null 2>&1; then
    log_test_phase "Frontend restart initiated" "PASS"
else
    log_test_phase "Frontend restart failed" "FAIL"
    TEST_FAILED=1
fi

# Test 6: Verify frontend recovery
log_test_phase "Test 6: Frontend Recovery" "START"

if wait_for_service "frontend" 60; then
    log_test_phase "Frontend recovered and healthy" "PASS"
else
    log_test_phase "Frontend failed to recover (timeout 60s)" "FAIL"
    TEST_FAILED=1
fi

# Verify frontend serves content
if assert_http_ok "http://localhost:3000/" 10; then
    log_test_phase "Frontend serving content" "PASS"
else
    log_test_phase "Frontend not serving content" "FAIL"
    TEST_FAILED=1
fi

# Test 7: Restart postgres service (graceful)
log_test_phase "Test 7: Restart PostgreSQL Service" "START"

# Note: This will temporarily disconnect backend, expect some errors
$COMPOSE_CMD restart postgres > /dev/null 2>&1

if wait_for_service "postgres" 60; then
    log_test_phase "PostgreSQL restarted" "PASS"
else
    log_test_phase "PostgreSQL failed to restart" "FAIL"
    TEST_FAILED=1
fi

# Wait for postgres to accept connections
if wait_for_postgres 30; then
    log_test_phase "PostgreSQL accepting connections" "PASS"
else
    log_test_phase "PostgreSQL not accepting connections" "FAIL"
    TEST_FAILED=1
fi

# Test 8: Verify backend reconnects to database
log_test_phase "Test 8: Backend Database Reconnection" "START"

# Backend may need time to reconnect after postgres restart
sleep 5

if docker exec angel-investing-backend sh -c 'timeout 10 node -e "const { PrismaClient } = require(\"@prisma/client\"); const prisma = new PrismaClient(); prisma.\$connect().then(() => { prisma.\$disconnect(); process.exit(0); }).catch(() => process.exit(1));"' > /dev/null 2>&1; then
    log_test_phase "Backend reconnected to database" "PASS"
else
    log_test_phase "Backend failed to reconnect" "FAIL"
    TEST_FAILED=1
fi

# Test 9: Verify data still persists
log_test_phase "Test 9: Data Persistence After Postgres Restart" "START"

USER_EXISTS=$(docker_exec_postgres "SELECT COUNT(*) FROM \"User\" WHERE email = '${TEST_USER_EMAIL}';" | tr -d ' \n')

if [ "$USER_EXISTS" = "1" ]; then
    log_test_phase "Test user data still persisted" "PASS"
else
    log_test_phase "Test user data lost after postgres restart" "FAIL"
    TEST_FAILED=1
fi

# Test 10: Restart all services simultaneously
log_test_phase "Test 10: Simultaneous Service Restart" "START"

if $COMPOSE_CMD restart > /dev/null 2>&1; then
    log_test_phase "All services restart initiated" "PASS"
else
    log_test_phase "Failed to restart all services" "FAIL"
    TEST_FAILED=1
fi

# Test 11: Verify complete system recovery
log_test_phase "Test 11: Complete System Recovery" "START"

ELAPSED=0
MAX_WAIT=120
INTERVAL=5
ALL_HEALTHY=false

while [ $ELAPSED -lt $MAX_WAIT ]; do
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
    log_test_phase "All services recovered (${ELAPSED}s)" "PASS"
else
    log_test_phase "Not all services recovered (timeout: ${MAX_WAIT}s)" "FAIL"
    TEST_FAILED=1
fi

# Final data persistence check
USER_EXISTS=$(docker_exec_postgres "SELECT COUNT(*) FROM \"User\" WHERE email = '${TEST_USER_EMAIL}';" | tr -d ' \n')

if [ "$USER_EXISTS" = "1" ]; then
    log_test_phase "Test user data persisted through all restarts" "PASS"
else
    log_test_phase "Test user data lost" "FAIL"
    TEST_FAILED=1
fi

# Cleanup test data
log_test_phase "Cleanup: Removing Test Data" "INFO"

docker_exec_postgres "DELETE FROM \"User\" WHERE email = '${TEST_USER_EMAIL}';" > /dev/null 2>&1

# Test Summary
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║    Service Restart Resilience Test Complete   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

if [ $TEST_FAILED -eq 0 ]; then
    log_test_phase "Service Restart Resilience Test" "PASS" "All restarts successful, data persisted"
    exit 0
else
    log_test_phase "Service Restart Resilience Test" "FAIL" "Some restarts or data checks failed"
    exit 1
fi
