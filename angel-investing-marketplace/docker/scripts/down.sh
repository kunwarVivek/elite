#!/bin/bash

# Shutdown script for Angel Investing Marketplace
# Graceful shutdown with optional cleanup

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
REMOVE_VOLUMES=false
REMOVE_IMAGES=false
REMOVE_ALL=false
TIMEOUT=30

# Help documentation
show_help() {
    cat << EOF
${BLUE}Angel Investing Marketplace - Shutdown Script${NC}

${GREEN}USAGE:${NC}
    ./down.sh [OPTIONS]

${GREEN}OPTIONS:${NC}
    -v, --volumes       Remove volumes (deletes ALL data)
    --images            Remove built images
    --all               Remove everything (volumes + images + networks)
    --timeout SECONDS   Shutdown timeout (default: 30s)
    --help              Show this help message

${GREEN}EXAMPLES:${NC}
    ./down.sh                # Stop services, keep data
    ./down.sh --volumes      # Stop and remove all data
    ./down.sh --images       # Stop and remove images
    ./down.sh --all          # Complete cleanup

${GREEN}DESCRIPTION:${NC}
    Gracefully stops all services with optional cleanup of:
    • Docker volumes (database and cache data)
    • Built images
    • Docker networks

${RED}WARNING:${NC}
    • ${RED}--volumes${NC} will delete ALL database data permanently
    • ${RED}--images${NC} will remove built Docker images
    • ${RED}--all${NC} performs complete cleanup
    • Destructive operations require confirmation

${YELLOW}DATA LOSS PREVENTION:${NC}
    • Confirmation prompts for destructive operations
    • Default behavior preserves all data
    • Use without flags for safe shutdown

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -v|--volumes)
            REMOVE_VOLUMES=true
            shift
            ;;
        --images)
            REMOVE_IMAGES=true
            shift
            ;;
        --all)
            REMOVE_ALL=true
            REMOVE_VOLUMES=true
            REMOVE_IMAGES=true
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
        *)
            echo -e "${RED}Error: Unknown option $1${NC}"
            echo "Run './down.sh --help' for usage information"
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

# Print header
echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Angel Investing Marketplace - Shutdown      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Confirmation for destructive operations
if [ "$REMOVE_VOLUMES" = true ] || [ "$REMOVE_IMAGES" = true ]; then
    echo -e "${RED}⚠ WARNING: Destructive operation requested${NC}"
    echo ""

    if [ "$REMOVE_VOLUMES" = true ]; then
        echo -e "${RED}• Volumes will be removed (ALL DATA WILL BE LOST)${NC}"
    fi

    if [ "$REMOVE_IMAGES" = true ]; then
        echo -e "${YELLOW}• Docker images will be removed${NC}"
    fi

    echo ""
    read -p "Are you sure you want to continue? (yes/no): " CONFIRM

    if [ "$CONFIRM" != "yes" ]; then
        echo -e "${GREEN}Operation cancelled${NC}"
        exit 0
    fi

    echo ""
fi

cd "$DOCKER_DIR"

# Stop services
echo -e "${YELLOW}► Stopping services...${NC}"
echo ""

# Build down command
DOWN_CMD="$COMPOSE_CMD down --timeout $TIMEOUT"

if [ "$REMOVE_VOLUMES" = true ]; then
    DOWN_CMD="$DOWN_CMD --volumes"
fi

# Execute down command
if $DOWN_CMD; then
    echo ""
    echo -e "${GREEN}✓ Services stopped successfully${NC}"
else
    echo -e "${RED}✗ Failed to stop services${NC}"
    exit 1
fi

# Remove images if requested
if [ "$REMOVE_IMAGES" = true ]; then
    echo ""
    echo -e "${YELLOW}► Removing Docker images...${NC}"

    IMAGES=(
        "angel-investing-backend:latest"
        "angel-investing-frontend:latest"
    )

    for image in "${IMAGES[@]}"; do
        if docker images -q "$image" 2> /dev/null | grep -q .; then
            echo -e "  Removing $image..."
            if docker rmi "$image" 2>&1 | sed 's/^/  /'; then
                echo -e "${GREEN}  ✓ Removed $image${NC}"
            else
                echo -e "${YELLOW}  ⚠ Could not remove $image (may be in use)${NC}"
            fi
        else
            echo -e "${YELLOW}  ⚠ Image $image not found${NC}"
        fi
    done

    echo ""
    echo -e "${GREEN}✓ Image cleanup completed${NC}"
fi

# Check if any containers are still running
echo ""
echo -e "${YELLOW}► Verifying shutdown...${NC}"

RUNNING_CONTAINERS=$($COMPOSE_CMD ps -q 2>/dev/null || echo "")

if [ -z "$RUNNING_CONTAINERS" ]; then
    echo -e "${GREEN}✓ All services stopped${NC}"
else
    echo -e "${YELLOW}⚠ Some containers may still be running${NC}"
fi

# Print summary
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Shutdown Complete                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

if [ "$REMOVE_VOLUMES" = true ]; then
    echo -e "${RED}✓ Volumes removed (data deleted)${NC}"
fi

if [ "$REMOVE_IMAGES" = true ]; then
    echo -e "${GREEN}✓ Images removed${NC}"
fi

if [ "$REMOVE_VOLUMES" = false ] && [ "$REMOVE_IMAGES" = false ]; then
    echo -e "${GREEN}✓ Data preserved (volumes intact)${NC}"
fi

echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "  • Restart services: ${BLUE}./deploy.sh${NC}"
echo -e "  • Build new images: ${BLUE}./build.sh${NC}"

if [ "$REMOVE_VOLUMES" = true ]; then
    echo -e "  • ${RED}Note: All data was deleted - fresh start required${NC}"
fi

echo ""
