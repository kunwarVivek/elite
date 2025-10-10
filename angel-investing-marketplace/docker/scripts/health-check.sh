#!/bin/bash

# Health check script for Angel Investing Marketplace
# Comprehensive service validation and status reporting

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_DIR="$(dirname "$SCRIPT_DIR")"

# Default options
VERBOSE=false
WAIT_MODE=false
WAIT_TIMEOUT=120

# Help documentation
show_help() {
    cat << EOF
${BLUE}Angel Investing Marketplace - Health Check${NC}

${GREEN}USAGE:${NC}
    ./health-check.sh [OPTIONS]

${GREEN}OPTIONS:${NC}
    -v, --verbose       Show detailed health information
    --wait              Wait until all services are healthy
    --timeout SECONDS   Wait timeout (default: 120s, only with --wait)
    --help              Show this help message

${GREEN}EXAMPLES:${NC}
    ./health-check.sh           # Quick health check
    ./health-check.sh -v        # Detailed health information
    ./health-check.sh --wait    # Wait for all services to be healthy
    ./health-check.sh --wait --timeout 180  # Wait up to 3 minutes

${GREEN}DESCRIPTION:${NC}
    Validates health of all services:
    • Docker container status
    • Service health checks (from docker-compose)
    • HTTP endpoint validation (backend, frontend)
    • Database connectivity
    • Redis connectivity

${GREEN}EXIT CODES:${NC}
    0 - All services healthy
    1 - One or more services unhealthy

${YELLOW}HEALTH CHECK DETAILS:${NC}
    • Backend:  curl http://localhost:3001/health
    • Frontend: curl http://localhost:80/
    • Postgres: docker-compose healthcheck
    • Redis:    docker-compose healthcheck

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        --wait)
            WAIT_MODE=true
            shift
            ;;
        --timeout)
            WAIT_TIMEOUT="$2"
            shift 2
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}Error: Unknown option $1${NC}"
            echo "Run './health-check.sh --help' for usage information"
            exit 1
            ;;
    esac
done

# Determine docker-compose command
if docker compose version &> /dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
else
    COMPOSE_CMD="docker-compose"
fi

# Check service health
check_service_health() {
    local SERVICE=$1
    local STATE=""
    local HEALTH=""

    cd "$DOCKER_DIR"

    # Get container state and health
    STATE=$($COMPOSE_CMD ps "$SERVICE" --format json 2>/dev/null | grep -o '"State":"[^"]*"' | cut -d'"' -f4 || echo "not found")
    HEALTH=$($COMPOSE_CMD ps "$SERVICE" --format json 2>/dev/null | grep -o '"Health":"[^"]*"' | cut -d'"' -f4 || echo "none")

    echo "$STATE|$HEALTH"
}

# Check HTTP endpoint
check_http_endpoint() {
    local URL=$1
    local TIMEOUT=5

    if curl -sf --max-time $TIMEOUT "$URL" > /dev/null 2>&1; then
        echo "reachable"
    else
        echo "unreachable"
    fi
}

# Print service status
print_service_status() {
    local SERVICE=$1
    local STATE=$2
    local HEALTH=$3
    local HTTP_STATUS=${4:-""}

    local STATUS_ICON=""
    local STATUS_COLOR=""

    # Determine status
    if [ "$STATE" = "running" ] && [ "$HEALTH" = "healthy" ]; then
        STATUS_ICON="✓"
        STATUS_COLOR="$GREEN"
    elif [ "$STATE" = "running" ] && [ "$HEALTH" = "starting" ]; then
        STATUS_ICON="⏳"
        STATUS_COLOR="$YELLOW"
    elif [ "$STATE" = "running" ] && [ "$HEALTH" = "none" ]; then
        # No health check defined
        STATUS_ICON="✓"
        STATUS_COLOR="$GREEN"
    elif [ "$STATE" = "running" ]; then
        STATUS_ICON="⚠"
        STATUS_COLOR="$YELLOW"
    elif [ "$STATE" = "not found" ]; then
        STATUS_ICON="?"
        STATUS_COLOR="$RED"
    else
        STATUS_ICON="✗"
        STATUS_COLOR="$RED"
    fi

    # Print status line
    printf "${STATUS_COLOR}%-2s${NC} %-12s ${CYAN}%-10s${NC}" "$STATUS_ICON" "$SERVICE" "$STATE"

    if [ "$HEALTH" != "none" ]; then
        if [ "$HEALTH" = "healthy" ]; then
            printf " ${GREEN}%-10s${NC}" "$HEALTH"
        elif [ "$HEALTH" = "starting" ]; then
            printf " ${YELLOW}%-10s${NC}" "$HEALTH"
        else
            printf " ${RED}%-10s${NC}" "$HEALTH"
        fi
    else
        printf " %-10s" "-"
    fi

    if [ -n "$HTTP_STATUS" ]; then
        if [ "$HTTP_STATUS" = "reachable" ]; then
            printf " ${GREEN}%-12s${NC}" "$HTTP_STATUS"
        else
            printf " ${RED}%-12s${NC}" "$HTTP_STATUS"
        fi
    fi

    echo ""
}

# Print detailed info
print_detailed_info() {
    local SERVICE=$1

    cd "$DOCKER_DIR"

    echo -e "${CYAN}Details for $SERVICE:${NC}"

    # Get container ID
    local CONTAINER_ID=$($COMPOSE_CMD ps -q "$SERVICE" 2>/dev/null || echo "")

    if [ -n "$CONTAINER_ID" ]; then
        # Show container info
        echo -e "  ${BLUE}Container ID:${NC} $CONTAINER_ID"

        # Show uptime
        local UPTIME=$(docker inspect --format='{{.State.StartedAt}}' "$CONTAINER_ID" 2>/dev/null || echo "unknown")
        echo -e "  ${BLUE}Started:${NC} $UPTIME"

        # Show restart count
        local RESTARTS=$(docker inspect --format='{{.RestartCount}}' "$CONTAINER_ID" 2>/dev/null || echo "0")
        echo -e "  ${BLUE}Restarts:${NC} $RESTARTS"

        # Show resource usage
        local STATS=$(docker stats --no-stream --format "CPU: {{.CPUPerc}} | Memory: {{.MemUsage}}" "$CONTAINER_ID" 2>/dev/null || echo "unavailable")
        echo -e "  ${BLUE}Resources:${NC} $STATS"
    else
        echo -e "  ${RED}Container not found${NC}"
    fi

    echo ""
}

# Main health check function
perform_health_check() {
    local ALL_HEALTHY=true

    # Print header
    echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║   Angel Investing Marketplace - Health        ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
    echo ""

    # Print table header
    printf "${CYAN}%-2s %-12s %-10s %-10s %-12s${NC}\n" "" "SERVICE" "STATE" "HEALTH" "HTTP"
    echo -e "${BLUE}────────────────────────────────────────────────${NC}"

    # Check postgres
    local POSTGRES_RESULT=$(check_service_health "postgres")
    local POSTGRES_STATE=$(echo "$POSTGRES_RESULT" | cut -d'|' -f1)
    local POSTGRES_HEALTH=$(echo "$POSTGRES_RESULT" | cut -d'|' -f2)
    print_service_status "postgres" "$POSTGRES_STATE" "$POSTGRES_HEALTH"

    if [ "$POSTGRES_STATE" != "running" ] || [ "$POSTGRES_HEALTH" != "healthy" ]; then
        ALL_HEALTHY=false
    fi

    if [ "$VERBOSE" = true ]; then
        print_detailed_info "postgres"
    fi

    # Check redis
    local REDIS_RESULT=$(check_service_health "redis")
    local REDIS_STATE=$(echo "$REDIS_RESULT" | cut -d'|' -f1)
    local REDIS_HEALTH=$(echo "$REDIS_RESULT" | cut -d'|' -f2)
    print_service_status "redis" "$REDIS_STATE" "$REDIS_HEALTH"

    if [ "$REDIS_STATE" != "running" ] || [ "$REDIS_HEALTH" != "healthy" ]; then
        ALL_HEALTHY=false
    fi

    if [ "$VERBOSE" = true ]; then
        print_detailed_info "redis"
    fi

    # Check backend
    local BACKEND_RESULT=$(check_service_health "backend")
    local BACKEND_STATE=$(echo "$BACKEND_RESULT" | cut -d'|' -f1)
    local BACKEND_HEALTH=$(echo "$BACKEND_RESULT" | cut -d'|' -f2)
    local BACKEND_HTTP=$(check_http_endpoint "http://localhost:3001/health")
    print_service_status "backend" "$BACKEND_STATE" "$BACKEND_HEALTH" "$BACKEND_HTTP"

    if [ "$BACKEND_STATE" != "running" ] || [ "$BACKEND_HEALTH" != "healthy" ] || [ "$BACKEND_HTTP" != "reachable" ]; then
        ALL_HEALTHY=false
    fi

    if [ "$VERBOSE" = true ]; then
        print_detailed_info "backend"
    fi

    # Check frontend
    local FRONTEND_RESULT=$(check_service_health "frontend")
    local FRONTEND_STATE=$(echo "$FRONTEND_RESULT" | cut -d'|' -f1)
    local FRONTEND_HEALTH=$(echo "$FRONTEND_RESULT" | cut -d'|' -f2)
    local FRONTEND_HTTP=$(check_http_endpoint "http://localhost:80/")
    print_service_status "frontend" "$FRONTEND_STATE" "$FRONTEND_HEALTH" "$FRONTEND_HTTP"

    if [ "$FRONTEND_STATE" != "running" ] || [ "$FRONTEND_HEALTH" != "healthy" ]; then
        ALL_HEALTHY=false
    fi

    if [ "$VERBOSE" = true ]; then
        print_detailed_info "frontend"
    fi

    echo ""

    # Print summary
    if [ "$ALL_HEALTHY" = true ]; then
        echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║   All Services Healthy ✓                       ║${NC}"
        echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
        return 0
    else
        echo -e "${RED}╔════════════════════════════════════════════════╗${NC}"
        echo -e "${RED}║   Some Services Unhealthy ✗                    ║${NC}"
        echo -e "${RED}╚════════════════════════════════════════════════╝${NC}"
        echo ""
        echo -e "${YELLOW}Troubleshooting:${NC}"
        echo -e "  • Check logs: ${BLUE}./logs.sh${NC}"
        echo -e "  • Restart:    ${BLUE}./restart.sh${NC}"
        return 1
    fi
}

# Wait mode
if [ "$WAIT_MODE" = true ]; then
    echo -e "${YELLOW}Waiting for all services to be healthy (timeout: ${WAIT_TIMEOUT}s)...${NC}"
    echo ""

    ELAPSED=0
    WAIT_INTERVAL=5

    while [ $ELAPSED -lt $WAIT_TIMEOUT ]; do
        if perform_health_check; then
            echo ""
            echo -e "${GREEN}All services are healthy!${NC}"
            exit 0
        fi

        if [ $ELAPSED -ge $WAIT_TIMEOUT ]; then
            echo ""
            echo -e "${RED}Timeout waiting for services to be healthy${NC}"
            exit 1
        fi

        sleep $WAIT_INTERVAL
        ELAPSED=$((ELAPSED + WAIT_INTERVAL))
        echo ""
        echo -e "${YELLOW}Retrying in ${WAIT_INTERVAL}s... (${ELAPSED}/${WAIT_TIMEOUT}s elapsed)${NC}"
        echo ""
    done
else
    # Single check
    if perform_health_check; then
        exit 0
    else
        exit 1
    fi
fi
