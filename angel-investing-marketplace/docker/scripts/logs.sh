#!/bin/bash

# Log viewing script for Angel Investing Marketplace
# View and follow logs with filtering capabilities

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_DIR="$(dirname "$SCRIPT_DIR")"

# Default options
FOLLOW=false
TAIL_LINES=100
TIMESTAMPS=false
SINCE=""
SERVICE=""

# Help documentation
show_help() {
    cat << EOF
${BLUE}Angel Investing Marketplace - Logs Viewer${NC}

${GREEN}USAGE:${NC}
    ./logs.sh [SERVICE] [OPTIONS]

${GREEN}SERVICES:${NC}
    all         All services (default)
    backend     Backend API service
    frontend    Frontend application
    postgres    PostgreSQL database
    redis       Redis cache

${GREEN}OPTIONS:${NC}
    -f, --follow        Follow log output (live streaming)
    -n, --tail LINES    Number of lines to show (default: 100)
    -t, --timestamps    Show timestamps
    --since DURATION    Show logs since duration (e.g., 10m, 1h, 2h30m)
    --help              Show this help message

${GREEN}EXAMPLES:${NC}
    ./logs.sh                        # View last 100 lines of all services
    ./logs.sh backend -f             # Follow backend logs
    ./logs.sh frontend --tail 50     # Last 50 lines of frontend
    ./logs.sh all -f -t              # Follow all with timestamps
    ./logs.sh backend --since 1h     # Backend logs from last hour
    ./logs.sh postgres -n 200        # Last 200 lines of postgres

${GREEN}DESCRIPTION:${NC}
    View and follow container logs with service filtering and time-based queries.
    Logs are color-coded by service for easy identification.

${YELLOW}TIPS:${NC}
    • Use -f to watch logs in real-time
    • Combine --since with -f to follow recent logs
    • Press Ctrl+C to exit follow mode

EOF
}

# Determine docker-compose command
if docker compose version &> /dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
else
    COMPOSE_CMD="docker-compose"
fi

# Parse command line arguments
POSITIONAL_ARGS=()
while [[ $# -gt 0 ]]; do
    case $1 in
        -f|--follow)
            FOLLOW=true
            shift
            ;;
        -n|--tail)
            TAIL_LINES="$2"
            shift 2
            ;;
        -t|--timestamps)
            TIMESTAMPS=true
            shift
            ;;
        --since)
            SINCE="$2"
            shift 2
            ;;
        --help)
            show_help
            exit 0
            ;;
        -*)
            echo -e "${RED}Error: Unknown option $1${NC}"
            echo "Run './logs.sh --help' for usage information"
            exit 1
            ;;
        *)
            POSITIONAL_ARGS+=("$1")
            shift
            ;;
    esac
done

# Restore positional parameters
set -- "${POSITIONAL_ARGS[@]}"

# Get service name (first positional argument)
if [ $# -gt 0 ]; then
    SERVICE="$1"
else
    SERVICE="all"
fi

# Validate service name
VALID_SERVICES=("all" "backend" "frontend" "postgres" "redis")
if [[ ! " ${VALID_SERVICES[@]} " =~ " ${SERVICE} " ]]; then
    echo -e "${RED}Error: Invalid service '$SERVICE'${NC}"
    echo -e "Valid services: ${VALID_SERVICES[*]}"
    echo ""
    echo "Run './logs.sh --help' for usage information"
    exit 1
fi

# Build docker-compose logs command
cd "$DOCKER_DIR"

LOGS_CMD="$COMPOSE_CMD logs"

# Add tail option
if [ -n "$TAIL_LINES" ]; then
    LOGS_CMD="$LOGS_CMD --tail=$TAIL_LINES"
fi

# Add follow option
if [ "$FOLLOW" = true ]; then
    LOGS_CMD="$LOGS_CMD --follow"
fi

# Add timestamps option
if [ "$TIMESTAMPS" = true ]; then
    LOGS_CMD="$LOGS_CMD --timestamps"
fi

# Add since option
if [ -n "$SINCE" ]; then
    LOGS_CMD="$LOGS_CMD --since=$SINCE"
fi

# Add service (if not "all")
if [ "$SERVICE" != "all" ]; then
    LOGS_CMD="$LOGS_CMD $SERVICE"
fi

# Print header
echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Angel Investing Marketplace - Logs          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

if [ "$SERVICE" = "all" ]; then
    echo -e "${CYAN}Viewing logs for: ${GREEN}All Services${NC}"
else
    echo -e "${CYAN}Viewing logs for: ${GREEN}$SERVICE${NC}"
fi

if [ "$FOLLOW" = true ]; then
    echo -e "${YELLOW}Mode: Following (Ctrl+C to exit)${NC}"
else
    echo -e "${CYAN}Lines: ${GREEN}$TAIL_LINES${NC}"
fi

if [ -n "$SINCE" ]; then
    echo -e "${CYAN}Since: ${GREEN}$SINCE${NC}"
fi

echo ""
echo -e "${BLUE}────────────────────────────────────────────────${NC}"
echo ""

# Execute logs command
exec $LOGS_CMD
