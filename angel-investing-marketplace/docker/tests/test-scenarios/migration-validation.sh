#!/bin/bash

# Database Migration Validation Test Scenario
# Verifies all Prisma migrations completed successfully

set -e

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TESTS_DIR="$(dirname "$SCRIPT_DIR")"
DOCKER_DIR="$(dirname "$TESTS_DIR")"

# Source test utilities
source "$TESTS_DIR/test-utils.sh"

# Test configuration
TEST_FAILED=0

log_test_phase "Database Migration Validation Test" "INFO"
echo ""

cd "$DOCKER_DIR"

# Test 1: Prisma migrations table exists
log_test_phase "Test 1: Migration Table Existence" "START"

MIGRATION_TABLE_COUNT=$(docker_exec_postgres "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = '_prisma_migrations';" | tr -d ' \n')

if [ "$MIGRATION_TABLE_COUNT" = "1" ]; then
    log_test_phase "Prisma migrations table exists" "PASS"
else
    log_test_phase "Prisma migrations table not found" "FAIL"
    TEST_FAILED=1
    exit 1
fi

# Test 2: All migrations completed successfully
log_test_phase "Test 2: Migration Completion Status" "START"

TOTAL_MIGRATIONS=$(docker_exec_postgres "SELECT COUNT(*) FROM _prisma_migrations;" | tr -d ' \n')
COMPLETED_MIGRATIONS=$(docker_exec_postgres "SELECT COUNT(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL;" | tr -d ' \n')

log_test_phase "Total migrations" "INFO" "$TOTAL_MIGRATIONS"
log_test_phase "Completed migrations" "INFO" "$COMPLETED_MIGRATIONS"

if [ "$TOTAL_MIGRATIONS" = "$COMPLETED_MIGRATIONS" ]; then
    log_test_phase "All migrations completed" "PASS"
else
    log_test_phase "Some migrations incomplete" "FAIL"
    TEST_FAILED=1
fi

# Test 3: No failed migrations
log_test_phase "Test 3: Failed Migration Detection" "START"

FAILED_MIGRATIONS=$(docker_exec_postgres "SELECT COUNT(*) FROM _prisma_migrations WHERE finished_at IS NULL AND logs IS NOT NULL;" | tr -d ' \n')

if [ "$FAILED_MIGRATIONS" = "0" ]; then
    log_test_phase "No failed migrations" "PASS"
else
    log_test_phase "Failed migrations detected ($FAILED_MIGRATIONS)" "FAIL"
    TEST_FAILED=1

    # Show failed migration details
    FAILED_DETAILS=$(docker_exec_postgres "SELECT migration_name, started_at, logs FROM _prisma_migrations WHERE finished_at IS NULL AND logs IS NOT NULL;")
    log_test_phase "Failed migration details" "INFO" "$FAILED_DETAILS"
fi

# Test 4: Key tables exist (from PRD requirements)
log_test_phase "Test 4: Required Tables Existence" "START"

REQUIRED_TABLES=("User" "Pitch" "Investment" "Transaction")

for table in "${REQUIRED_TABLES[@]}"; do
    TABLE_EXISTS=$(docker_exec_postgres "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = '${table}';" | tr -d ' \n')

    if [ "$TABLE_EXISTS" = "1" ]; then
        log_test_phase "Table '$table' exists" "PASS"
    else
        log_test_phase "Table '$table' missing" "FAIL"
        TEST_FAILED=1
    fi
done

# Test 5: Foreign key constraints
log_test_phase "Test 5: Foreign Key Constraints" "START"

FK_COUNT=$(docker_exec_postgres "SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public';" | tr -d ' \n')

if [ "$FK_COUNT" -gt 0 ]; then
    log_test_phase "Foreign key constraints present ($FK_COUNT)" "PASS"
else
    log_test_phase "No foreign key constraints found" "WARN"
fi

# Test 6: Indexes
log_test_phase "Test 6: Database Indexes" "START"

INDEX_COUNT=$(docker_exec_postgres "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public';" | tr -d ' \n')

if [ "$INDEX_COUNT" -gt 0 ]; then
    log_test_phase "Database indexes present ($INDEX_COUNT)" "PASS"
else
    log_test_phase "No database indexes found" "WARN"
fi

# Migration history (informational)
log_test_phase "Migration History" "INFO"

MIGRATION_HISTORY=$(docker_exec_postgres "SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at;" 2>/dev/null | head -n 10)
if [ -n "$MIGRATION_HISTORY" ]; then
    echo "$MIGRATION_HISTORY" | while IFS= read -r line; do
        if [ -n "$line" ]; then
            log_test_phase "Migration" "INFO" "$line"
        fi
    done
fi

# Test Summary
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║      Migration Validation Test Complete       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

if [ $TEST_FAILED -eq 0 ]; then
    log_test_phase "Migration Validation Test" "PASS" "All migrations valid"
    exit 0
else
    log_test_phase "Migration Validation Test" "FAIL" "Migration issues detected"
    exit 1
fi
