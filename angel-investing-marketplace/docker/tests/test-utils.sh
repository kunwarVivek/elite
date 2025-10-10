#!/bin/bash

# Test Utilities Library for E2E Deployment Tests
# Shared helper functions for test scenarios

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Test phase emoji indicators
TESTING_EMOJI="🧪"
PASSED_EMOJI="✅"
FAILED_EMOJI="❌"
WARNING_EMOJI="⚠️"
INFO_EMOJI="ℹ️"

# Determine docker-compose command
get_compose_cmd() {
    if docker compose version &> /dev/null 2>&1; then
        echo "docker compose"
    else
        echo "docker-compose"
    fi
}

# Wait for service to be healthy with timeout
# Usage: wait_for_service <service_name> <timeout_seconds>
# Returns: 0 if healthy, 1 if timeout
wait_for_service() {
    local SERVICE=$1
    local TIMEOUT=${2:-60}
    local ELAPSED=0
    local INTERVAL=5
    local COMPOSE_CMD=$(get_compose_cmd)

    while [ $ELAPSED -lt $TIMEOUT ]; do
        local HEALTH_STATUS=$($COMPOSE_CMD ps "$SERVICE" --format json 2>/dev/null | grep -o '"Health":"[^"]*"' | cut -d'"' -f4 || echo "unknown")

        if [ "$HEALTH_STATUS" = "healthy" ]; then
            return 0
        fi

        sleep $INTERVAL
        ELAPSED=$((ELAPSED + INTERVAL))
    done

    return 1
}

# Check if HTTP endpoint returns 200
# Usage: assert_http_ok <url> [timeout_seconds]
# Returns: 0 if HTTP 200, 1 otherwise
assert_http_ok() {
    local URL=$1
    local TIMEOUT=${2:-5}

    local HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" "$URL" 2>/dev/null || echo "000")

    if [ "$HTTP_CODE" = "200" ]; then
        return 0
    else
        return 1
    fi
}

# Verify docker health check status
# Usage: assert_service_healthy <service_name>
# Returns: 0 if healthy, 1 otherwise
assert_service_healthy() {
    local SERVICE=$1
    local COMPOSE_CMD=$(get_compose_cmd)

    local HEALTH_STATUS=$($COMPOSE_CMD ps "$SERVICE" --format json 2>/dev/null | grep -o '"Health":"[^"]*"' | cut -d'"' -f4 || echo "unknown")

    if [ "$HEALTH_STATUS" = "healthy" ]; then
        return 0
    else
        return 1
    fi
}

# Colorized test phase logging
# Usage: log_test_phase <phase_name> <status>
# Status: START, PASS, FAIL, WARN, INFO
log_test_phase() {
    local PHASE=$1
    local STATUS=$2
    local MESSAGE=${3:-""}

    case $STATUS in
        START)
            echo -e "${BLUE}${TESTING_EMOJI} TESTING${NC}: $PHASE"
            ;;
        PASS)
            echo -e "${GREEN}${PASSED_EMOJI} PASSED${NC}: $PHASE"
            if [ -n "$MESSAGE" ]; then
                echo -e "  ${GREEN}└─ $MESSAGE${NC}"
            fi
            ;;
        FAIL)
            echo -e "${RED}${FAILED_EMOJI} FAILED${NC}: $PHASE"
            if [ -n "$MESSAGE" ]; then
                echo -e "  ${RED}└─ $MESSAGE${NC}"
            fi
            ;;
        WARN)
            echo -e "${YELLOW}${WARNING_EMOJI} WARNING${NC}: $PHASE"
            if [ -n "$MESSAGE" ]; then
                echo -e "  ${YELLOW}└─ $MESSAGE${NC}"
            fi
            ;;
        INFO)
            echo -e "${CYAN}${INFO_EMOJI} INFO${NC}: $PHASE"
            if [ -n "$MESSAGE" ]; then
                echo -e "  ${CYAN}└─ $MESSAGE${NC}"
            fi
            ;;
        *)
            echo -e "${NC}$PHASE${NC}"
            ;;
    esac
}

# Remove test data from database
# Usage: cleanup_test_data
# Returns: 0 on success, 1 on failure
cleanup_test_data() {
    local COMPOSE_CMD=$(get_compose_cmd)

    # Check if postgres container is running
    if ! docker ps --format '{{.Names}}' | grep -q "angel-investing-postgres"; then
        return 1
    fi

    # Delete test users and related data
    docker exec angel-investing-postgres psql -U postgres -d angel_investing_marketplace -c \
        "DELETE FROM \"User\" WHERE email LIKE 'test_%@e2e.test';" > /dev/null 2>&1

    return $?
}

# Check if port is available
# Usage: check_port_available <port_number>
# Returns: 0 if available, 1 if in use
check_port_available() {
    local PORT=$1

    if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 1
    else
        return 0
    fi
}

# Execute SQL query in postgres container
# Usage: docker_exec_postgres <sql_query>
# Returns: query result
docker_exec_postgres() {
    local SQL_QUERY=$1

    docker exec angel-investing-postgres psql -U postgres -d angel_investing_marketplace -t -c "$SQL_QUERY" 2>/dev/null
}

# Get service container ID
# Usage: get_container_id <service_name>
# Returns: container ID or empty string
get_container_id() {
    local SERVICE=$1
    local COMPOSE_CMD=$(get_compose_cmd)

    $COMPOSE_CMD ps -q "$SERVICE" 2>/dev/null || echo ""
}

# Check if all services are running
# Usage: all_services_running
# Returns: 0 if all running, 1 otherwise
all_services_running() {
    local COMPOSE_CMD=$(get_compose_cmd)
    local SERVICES=("postgres" "redis" "backend" "frontend")

    for service in "${SERVICES[@]}"; do
        local STATE=$($COMPOSE_CMD ps "$service" --format json 2>/dev/null | grep -o '"State":"[^"]*"' | cut -d'"' -f4 || echo "not found")
        if [ "$STATE" != "running" ]; then
            return 1
        fi
    done

    return 0
}

# Get service logs (last N lines)
# Usage: get_service_logs <service_name> [num_lines]
# Returns: log output
get_service_logs() {
    local SERVICE=$1
    local NUM_LINES=${2:-50}
    local COMPOSE_CMD=$(get_compose_cmd)

    $COMPOSE_CMD logs --tail=$NUM_LINES "$SERVICE" 2>/dev/null || echo "Unable to fetch logs"
}

# Measure command execution time
# Usage: time_command <command>
# Returns: execution time in seconds
time_command() {
    local START=$(date +%s)
    eval "$@"
    local EXIT_CODE=$?
    local END=$(date +%s)
    local DURATION=$((END - START))

    echo "$DURATION"
    return $EXIT_CODE
}

# Wait for postgres to accept connections
# Usage: wait_for_postgres [timeout_seconds]
# Returns: 0 if ready, 1 if timeout
wait_for_postgres() {
    local TIMEOUT=${1:-30}
    local ELAPSED=0
    local INTERVAL=2

    while [ $ELAPSED -lt $TIMEOUT ]; do
        if docker exec angel-investing-postgres pg_isready -U postgres > /dev/null 2>&1; then
            return 0
        fi

        sleep $INTERVAL
        ELAPSED=$((ELAPSED + INTERVAL))
    done

    return 1
}

# Check if container exists
# Usage: container_exists <container_name>
# Returns: 0 if exists, 1 otherwise
container_exists() {
    local CONTAINER_NAME=$1

    if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        return 0
    else
        return 1
    fi
}

# Check if volume exists
# Usage: volume_exists <volume_name>
# Returns: 0 if exists, 1 otherwise
volume_exists() {
    local VOLUME_NAME=$1

    if docker volume ls --format '{{.Name}}' | grep -q "^${VOLUME_NAME}$"; then
        return 0
    else
        return 1
    fi
}

# Check if network exists
# Usage: network_exists <network_name>
# Returns: 0 if exists, 1 otherwise
network_exists() {
    local NETWORK_NAME=$1

    if docker network ls --format '{{.Name}}' | grep -q "^${NETWORK_NAME}$"; then
        return 0
    else
        return 1
    fi
}

# Get current timestamp
# Usage: get_timestamp
# Returns: formatted timestamp
get_timestamp() {
    date '+%Y-%m-%d %H:%M:%S'
}

# Get ISO timestamp for filenames
# Usage: get_iso_timestamp
# Returns: ISO formatted timestamp
get_iso_timestamp() {
    date '+%Y%m%d-%H%M%S'
}

# Print test summary table
# Usage: print_test_summary <total> <passed> <failed> <skipped>
print_test_summary() {
    local TOTAL=$1
    local PASSED=$2
    local FAILED=$3
    local SKIPPED=$4

    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║           Test Execution Summary               ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  Total Tests:    ${CYAN}$TOTAL${NC}"
    echo -e "  Passed:         ${GREEN}$PASSED${NC}"
    echo -e "  Failed:         ${RED}$FAILED${NC}"
    echo -e "  Skipped:        ${YELLOW}$SKIPPED${NC}"
    echo ""

    if [ $FAILED -eq 0 ]; then
        echo -e "${GREEN}${PASSED_EMOJI} All tests passed!${NC}"
    else
        echo -e "${RED}${FAILED_EMOJI} Some tests failed.${NC}"
    fi
    echo ""
}

# Export all functions for use in other scripts
export -f get_compose_cmd
export -f wait_for_service
export -f assert_http_ok
export -f assert_service_healthy
export -f log_test_phase
export -f cleanup_test_data
export -f check_port_available
export -f docker_exec_postgres
export -f get_container_id
export -f all_services_running
export -f get_service_logs
export -f time_command
export -f wait_for_postgres
export -f container_exists
export -f volume_exists
export -f network_exists
export -f get_timestamp
export -f get_iso_timestamp
export -f print_test_summary
