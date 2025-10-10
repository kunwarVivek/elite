#!/bin/bash

# Restart script for Angel Investing Marketplace
# Restart individual services or all services

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_DIR="$(dirname "$SCRIPT_DIR")"

# Default options
HARD_RESTART=false
TIMEOUT=60

# Help documentation
show_help() {
    cat << EOF
${BLUE}Angel Investing Marketplace - Restart Script${NC}

${GREEN}USAGE:${NC}
    ./restart.sh [SERVICE...] [OPTIONS]

${GREEN}SERVICES:${NC}
    all         Restart all services (default)
    backend     Backend API service
    frontend    Frontend application
    postgres    PostgreSQL database
    redis       Redis cache

${GREEN}OPTIONS:${NC}
    --hard              Force recreation of containers
    --timeout SECONDS   Health check timeout (default: 60s)
    --help              Show this help message

${GREEN}EXAMPLES:${NC}
    ./restart.sh                  # Restart all services
    ./restart.sh backend          # Restart only backend
    ./restart.sh backend frontend # Restart backend and frontend
    ./restart.sh all --hard       # Force recreate all containers
    ./restart.sh postgres --hard  # Force recreate postgres

${GREEN}DESCRIPTION:${NC}
    Gracefully restarts services with health validation:
    • Stops specified services
    • Waits for clean shutdown
    • Starts services
    • Validates health status

${YELLOW}RESTART MODES:${NC}
    • Normal: Restart existing containers (preserves state)
    • Hard (--hard): Recreate containers from scratch

${YELLOW}HEALTH CHECKS:${NC}
    • Waits for services to become healthy
    • Timeout configurable (default: 60s)
    • Reports status before and after restart

EOF
}

# Determine docker-compose command
if docker compose version &> /dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
else
    COMPOSE_CMD="docker-compose"
fi

# Parse command line arguments
SERVICES=()
while [[ $# -gt 0 ]]; do
    case $1 in
        --hard)
            HARD_RESTART=true
            shift
            ;;
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --help)
            show_help
            exit 0
            ;;
        -*)
            echo -e "${RED}Error: Unknown option $1${NC}"
            echo "Run './restart.sh --help' for usage information"
            exit 1
            ;;
        *)
            SERVICES+=("$1")
            shift
            ;;
    esac
done

# Default to "all" if no services specified
if [ ${#SERVICES[@]} -eq 0 ]; then
    SERVICES=("all")
fi

# Validate service names
VALID_SERVICES=("all" "backend" "frontend" "postgres" "redis")
for service in "${SERVICES[@]}"; do
    if [[ ! " ${VALID_SERVICES[@]} " =~ " ${service} " ]]; then
        echo -e "${RED}Error: Invalid service '$service'${NC}"
        echo -e "Valid services: ${VALID_SERVICES[*]}"
        exit 1
    fi
done

# Convert "all" to actual service list
if [[ " ${SERVICES[@]} " =~ " all " ]]; then
    SERVICES=("backend" "frontend" "postgres" "redis")
fi

# Print header
echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Angel Investing Marketplace - Restart       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

if [ "$HARD_RESTART" = true ]; then
    echo -e "${YELLOW}Mode: Hard restart (recreating containers)${NC}"
else
    echo -e "${YELLOW}Mode: Graceful restart${NC}"
fi

echo -e "${BLUE}Services: ${GREEN}${SERVICES[*]}${NC}"
echo ""

cd "$DOCKER_DIR"

# Show current status
echo -e "${YELLOW}► Current status:${NC}"
for service in "${SERVICES[@]}"; do
    STATE=$($COMPOSE_CMD ps "$service" --format json 2>/dev/null | grep -o '"State":"[^"]*"' | cut -d'"' -f4 || echo "not found")
    HEALTH=$($COMPOSE_CMD ps "$service" --format json 2>/dev/null | grep -o '"Health":"[^"]*"' | cut -d'"' -f4 || echo "none")

    if [ "$STATE" = "running" ] && [ "$HEALTH" = "healthy" ]; then
        echo -e "  ${GREEN}✓${NC} $service: $STATE ($HEALTH)"
    elif [ "$STATE" = "running" ]; then
        echo -e "  ${YELLOW}⚠${NC} $service: $STATE ($HEALTH)"
    else
        echo -e "  ${RED}✗${NC} $service: $STATE"
    fi
done

echo ""

# Restart services
echo -e "${YELLOW}► Restarting services...${NC}"
echo ""

if [ "$HARD_RESTART" = true ]; then
    # Hard restart: stop, remove, and recreate
    for service in "${SERVICES[@]}"; do
        echo -e "  ${YELLOW}Recreating $service...${NC}"

        # Stop and remove container
        $COMPOSE_CMD stop "$service" > /dev/null 2>&1 || true
        $COMPOSE_CMD rm -f "$service" > /dev/null 2>&1 || true

        # Recreate and start
        if $COMPOSE_CMD up -d "$service" 2>&1 | sed 's/^/    /'; then
            echo -e "  ${GREEN}✓ $service recreated${NC}"
        else
            echo -e "  ${RED}✗ Failed to recreate $service${NC}"
            exit 1
        fi
        echo ""
    done
else
    # Graceful restart
    for service in "${SERVICES[@]}"; do
        echo -e "  ${YELLOW}Restarting $service...${NC}"

        if $COMPOSE_CMD restart "$service" 2>&1 | sed 's/^/    /'; then
            echo -e "  ${GREEN}✓ $service restarted${NC}"
        else
            echo -e "  ${RED}✗ Failed to restart $service${NC}"
            exit 1
        fi
        echo ""
    done
fi

# Wait for services to be healthy
echo -e "${YELLOW}► Waiting for services to be healthy...${NC}"
echo ""

ELAPSED=0
WAIT_INTERVAL=5

while [ $ELAPSED -lt $TIMEOUT ]; do
    ALL_HEALTHY=true

    for service in "${SERVICES[@]}"; do
        STATE=$($COMPOSE_CMD ps "$service" --format json 2>/dev/null | grep -o '"State":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
        HEALTH=$($COMPOSE_CMD ps "$service" --format json 2>/dev/null | grep -o '"Health":"[^"]*"' | cut -d'"' -f4 || echo "none")

        if [ "$STATE" = "running" ] && [ "$HEALTH" = "healthy" ]; then
            echo -e "  ${GREEN}✓${NC} $service is healthy"
        elif [ "$STATE" = "running" ] && [ "$HEALTH" = "starting" ]; then
            echo -e "  ${YELLOW}⏳${NC} $service is starting..."
            ALL_HEALTHY=false
        elif [ "$STATE" = "running" ] && [ "$HEALTH" = "none" ]; then
            # Service doesn't have health check, assume healthy if running
            echo -e "  ${GREEN}✓${NC} $service is running (no healthcheck)"
        else
            echo -e "  ${RED}✗${NC} $service is $STATE"
            ALL_HEALTHY=false
        fi
    done

    if [ "$ALL_HEALTHY" = true ]; then
        echo ""
        echo -e "${GREEN}✓ All services are healthy${NC}"
        break
    fi

    if [ $ELAPSED -ge $TIMEOUT ]; then
        echo ""
        echo -e "${RED}✗ Timeout waiting for services to be healthy${NC}"
        echo -e "  Run ${BLUE}./logs.sh${NC} to check service logs"
        echo -e "  Run ${BLUE}./health-check.sh${NC} for detailed status"
        exit 1
    fi

    sleep $WAIT_INTERVAL
    ELAPSED=$((ELAPSED + WAIT_INTERVAL))
    echo ""
done

# Print success summary
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Restart Complete                             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Show final status
for service in "${SERVICES[@]}"; do
    STATE=$($COMPOSE_CMD ps "$service" --format json 2>/dev/null | grep -o '"State":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
    HEALTH=$($COMPOSE_CMD ps "$service" --format json 2>/dev/null | grep -o '"Health":"[^"]*"' | cut -d'"' -f4 || echo "none")

    if [ "$STATE" = "running" ] && [ "$HEALTH" = "healthy" ]; then
        echo -e "  ${GREEN}✓${NC} $service: $STATE ($HEALTH)"
    elif [ "$STATE" = "running" ]; then
        echo -e "  ${GREEN}✓${NC} $service: $STATE"
    else
        echo -e "  ${RED}✗${NC} $service: $STATE"
    fi
done

echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo -e "  • View logs:    ${BLUE}./logs.sh${NC}"
echo -e "  • Check health: ${BLUE}./health-check.sh${NC}"
echo ""
