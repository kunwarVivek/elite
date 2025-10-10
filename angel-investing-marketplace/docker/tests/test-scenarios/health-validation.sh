#!/bin/bash

# Service Health Validation Test Scenario
# Comprehensive health checks for all services

set -e

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TESTS_DIR="$(dirname "$SCRIPT_DIR")"
DOCKER_DIR="$(dirname "$TESTS_DIR")"

# Source test utilities
source "$TESTS_DIR/test-utils.sh"

# Test configuration
TEST_FAILED=0

log_test_phase "Service Health Validation Test" "INFO"
echo ""

COMPOSE_CMD=$(get_compose_cmd)
cd "$DOCKER_DIR"

# Test 1: Docker container status
log_test_phase "Test 1: Docker Container Status" "START"

SERVICES=("postgres" "redis" "backend" "frontend")
ALL_RUNNING=true

for service in "${SERVICES[@]}"; do
    STATE=$($COMPOSE_CMD ps "$service" --format json 2>/dev/null | grep -o '"State":"[^"]*"' | cut -d'"' -f4 || echo "not found")

    if [ "$STATE" = "running" ]; then
        log_test_phase "$service container running" "PASS"
    else
        log_test_phase "$service container not running (state: $STATE)" "FAIL"
        ALL_RUNNING=false
        TEST_FAILED=1
    fi
done

# Test 2: Health check status
log_test_phase "Test 2: Health Check Status" "START"

for service in "${SERVICES[@]}"; do
    if assert_service_healthy "$service"; then
        log_test_phase "$service health check" "PASS"
    else
        HEALTH=$($COMPOSE_CMD ps "$service" --format json 2>/dev/null | grep -o '"Health":"[^"]*"' | cut -d'"' -f4 || echo "none")
        log_test_phase "$service health check (status: $HEALTH)" "FAIL"
        TEST_FAILED=1
    fi
done

# Test 3: Backend HTTP endpoint
log_test_phase "Test 3: Backend HTTP Endpoint" "START"

if assert_http_ok "http://localhost:3001/health" 10; then
    log_test_phase "Backend /health endpoint responds with 200" "PASS"
else
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://localhost:3001/health" 2>/dev/null || echo "000")
    log_test_phase "Backend /health endpoint (HTTP $HTTP_CODE)" "FAIL"
    TEST_FAILED=1
fi

# Test 4: Frontend HTTP endpoint
log_test_phase "Test 4: Frontend HTTP Endpoint" "START"

if assert_http_ok "http://localhost:3000/" 10; then
    log_test_phase "Frontend / endpoint responds with 200" "PASS"
else
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://localhost:3000/" 2>/dev/null || echo "000")
    log_test_phase "Frontend / endpoint (HTTP $HTTP_CODE)" "FAIL"
    TEST_FAILED=1
fi

# Test 5: Database connectivity
log_test_phase "Test 5: Database Connectivity" "START"

if docker exec angel-investing-postgres pg_isready -U postgres > /dev/null 2>&1; then
    log_test_phase "PostgreSQL accepting connections" "PASS"
else
    log_test_phase "PostgreSQL not accepting connections" "FAIL"
    TEST_FAILED=1
fi

# Check backend can connect to database
if docker exec angel-investing-backend sh -c 'timeout 5 node -e "const { PrismaClient } = require(\"@prisma/client\"); const prisma = new PrismaClient(); prisma.\$connect().then(() => { prisma.\$disconnect(); process.exit(0); }).catch(() => process.exit(1));"' > /dev/null 2>&1; then
    log_test_phase "Backend → PostgreSQL connection" "PASS"
else
    log_test_phase "Backend → PostgreSQL connection" "FAIL"
    TEST_FAILED=1
fi

# Test 6: Redis connectivity
log_test_phase "Test 6: Redis Connectivity" "START"

if docker exec angel-investing-redis redis-cli ping > /dev/null 2>&1; then
    log_test_phase "Redis responding to PING" "PASS"
else
    log_test_phase "Redis not responding to PING" "FAIL"
    TEST_FAILED=1
fi

# Test 7: Prisma client functionality
log_test_phase "Test 7: Prisma Client Functionality" "START"

# Check if Prisma migrations table exists
MIGRATION_TABLE=$(docker_exec_postgres "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = '_prisma_migrations';")
MIGRATION_COUNT=$(echo "$MIGRATION_TABLE" | tr -d ' ')

if [ "$MIGRATION_COUNT" -eq 1 ]; then
    log_test_phase "Prisma migrations table exists" "PASS"
else
    log_test_phase "Prisma migrations table missing" "FAIL"
    TEST_FAILED=1
fi

# Container resource status (informational)
log_test_phase "Container Resource Status" "INFO"

for service in "${SERVICES[@]}"; do
    CONTAINER_ID=$(get_container_id "$service")
    if [ -n "$CONTAINER_ID" ]; then
        STATS=$(docker stats --no-stream --format "CPU: {{.CPUPerc}} | Mem: {{.MemUsage}}" "$CONTAINER_ID" 2>/dev/null || echo "unavailable")
        log_test_phase "$service resources" "INFO" "$STATS"
    fi
done

# Test Summary
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║      Health Validation Test Complete          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

if [ $TEST_FAILED -eq 0 ]; then
    log_test_phase "Health Validation Test" "PASS" "All health checks passed"
    exit 0
else
    log_test_phase "Health Validation Test" "FAIL" "One or more health checks failed"
    exit 1
fi
