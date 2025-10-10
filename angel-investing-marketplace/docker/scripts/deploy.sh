#!/bin/bash

# Deployment script for Angel Investing Marketplace
# Orchestrates complete system startup with prerequisite checks

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
PROJECT_ROOT="$(dirname "$DOCKER_DIR")"

# Default options
BUILD_LOCAL=false
PULL_IMAGES=false
AUTO_DEV_SECRETS=false
DETACHED=true

# Help documentation
show_help() {
    cat << EOF
${BLUE}Angel Investing Marketplace - Deployment Script${NC}

${GREEN}USAGE:${NC}
    ./deploy.sh [OPTIONS]

${GREEN}OPTIONS:${NC}
    --build           Build images locally before deployment
    --pull            Pull images from registry (not implemented yet)
    --dev-secrets     Auto-generate development secrets if missing
    --foreground      Run in foreground (attached mode)
    --help            Show this help message

${GREEN}EXAMPLES:${NC}
    ./deploy.sh                      # Deploy with existing images
    ./deploy.sh --build              # Build and deploy
    ./deploy.sh --dev-secrets        # Auto-generate dev secrets if needed
    ./deploy.sh --build --foreground # Build and run in foreground

${GREEN}DESCRIPTION:${NC}
    Orchestrates complete system deployment including:
    • Prerequisite validation (Docker running, secrets exist)
    • Optional development secret generation
    • Service startup with docker-compose
    • Health check validation with timeout
    • Service status summary

${YELLOW}PREREQUISITES:${NC}
    • Docker and Docker Compose installed and running
    • Secrets configured in docker/secrets/ directory
    • .env file present (if required)

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --build)
            BUILD_LOCAL=true
            shift
            ;;
        --pull)
            PULL_IMAGES=true
            shift
            ;;
        --dev-secrets)
            AUTO_DEV_SECRETS=true
            shift
            ;;
        --foreground)
            DETACHED=false
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}Error: Unknown option $1${NC}"
            echo "Run './deploy.sh --help' for usage information"
            exit 1
            ;;
    esac
done

# Print header
echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Angel Investing Marketplace - Deploy        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Check if Docker is running
echo -e "${YELLOW}► Checking prerequisites...${NC}"

if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}✗ Docker is not running${NC}"
    echo -e "  Please start Docker and try again"
    exit 1
fi
echo -e "${GREEN}✓ Docker is running${NC}"

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null 2>&1; then
    echo -e "${RED}✗ Docker Compose is not available${NC}"
    echo -e "  Please install Docker Compose and try again"
    exit 1
fi
echo -e "${GREEN}✓ Docker Compose is available${NC}"

# Determine docker-compose command
if docker compose version &> /dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
else
    COMPOSE_CMD="docker-compose"
fi

# Check if secrets directory exists
if [ ! -d "$DOCKER_DIR/secrets" ]; then
    if [ "$AUTO_DEV_SECRETS" = true ]; then
        echo -e "${YELLOW}⚠ Secrets directory not found${NC}"
        echo -e "${YELLOW}► Generating development secrets...${NC}"

        if [ -f "$SCRIPT_DIR/generate-dev-secrets.sh" ]; then
            bash "$SCRIPT_DIR/generate-dev-secrets.sh"
            echo -e "${GREEN}✓ Development secrets generated${NC}"
        else
            echo -e "${RED}✗ generate-dev-secrets.sh not found${NC}"
            exit 1
        fi
    else
        echo -e "${RED}✗ Secrets directory not found: $DOCKER_DIR/secrets${NC}"
        echo -e "  Run with ${BLUE}--dev-secrets${NC} to auto-generate development secrets"
        echo -e "  Or run: ${BLUE}$SCRIPT_DIR/generate-dev-secrets.sh${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ Secrets directory exists${NC}"
fi

# Validate secrets exist
REQUIRED_SECRETS=(
    "database_url.txt"
    "redis_url.txt"
    "better_auth_secret.txt"
    "jwt_secret.txt"
    "smtp_pass.txt"
    "aws_secret_access_key.txt"
    "stripe_secret_key.txt"
    "stripe_webhook_secret.txt"
    "plaid_secret.txt"
)

MISSING_SECRETS=()
for secret in "${REQUIRED_SECRETS[@]}"; do
    if [ ! -f "$DOCKER_DIR/secrets/$secret" ]; then
        MISSING_SECRETS+=("$secret")
    fi
done

if [ ${#MISSING_SECRETS[@]} -gt 0 ]; then
    echo -e "${RED}✗ Missing required secrets:${NC}"
    for secret in "${MISSING_SECRETS[@]}"; do
        echo -e "  - $secret"
    done

    if [ "$AUTO_DEV_SECRETS" = true ]; then
        echo -e "${YELLOW}► Generating missing development secrets...${NC}"
        if [ -f "$SCRIPT_DIR/generate-dev-secrets.sh" ]; then
            bash "$SCRIPT_DIR/generate-dev-secrets.sh"
            echo -e "${GREEN}✓ Development secrets generated${NC}"
        else
            echo -e "${RED}✗ generate-dev-secrets.sh not found${NC}"
            exit 1
        fi
    else
        echo -e "  Run with ${BLUE}--dev-secrets${NC} to auto-generate development secrets"
        exit 1
    fi
else
    echo -e "${GREEN}✓ All required secrets present${NC}"
fi

echo ""

# Build images if requested
if [ "$BUILD_LOCAL" = true ]; then
    echo -e "${BLUE}Building images locally...${NC}"
    echo ""

    if [ -f "$SCRIPT_DIR/build.sh" ]; then
        bash "$SCRIPT_DIR/build.sh"
    else
        echo -e "${RED}✗ build.sh not found${NC}"
        exit 1
    fi

    echo ""
fi

# Pull images if requested (placeholder for future registry support)
if [ "$PULL_IMAGES" = true ]; then
    echo -e "${YELLOW}⚠ Image registry not configured yet${NC}"
    echo -e "  Building images locally instead..."
    echo ""
    if [ -f "$SCRIPT_DIR/build.sh" ]; then
        bash "$SCRIPT_DIR/build.sh"
    fi
    echo ""
fi

# Start services
echo -e "${BLUE}Starting services...${NC}"
echo ""

cd "$DOCKER_DIR"

if [ "$DETACHED" = true ]; then
    if $COMPOSE_CMD up -d; then
        echo ""
        echo -e "${GREEN}✓ Services started in detached mode${NC}"
    else
        echo -e "${RED}✗ Failed to start services${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}Running in foreground mode (Ctrl+C to stop)${NC}"
    echo ""
    $COMPOSE_CMD up
    exit 0
fi

echo ""

# Wait for services to be healthy
echo -e "${BLUE}Waiting for services to be healthy...${NC}"
echo ""

MAX_WAIT=120
WAIT_INTERVAL=5
ELAPSED=0

while [ $ELAPSED -lt $MAX_WAIT ]; do
    HEALTHY=true

    # Check each service
    SERVICES=("backend" "frontend" "postgres" "redis")
    for service in "${SERVICES[@]}"; do
        HEALTH_STATUS=$($COMPOSE_CMD ps "$service" --format json 2>/dev/null | grep -o '"Health":"[^"]*"' | cut -d'"' -f4 || echo "unknown")

        if [ "$HEALTH_STATUS" = "healthy" ]; then
            echo -e "${GREEN}✓ $service is healthy${NC}"
        elif [ "$HEALTH_STATUS" = "starting" ]; then
            echo -e "${YELLOW}⏳ $service is starting...${NC}"
            HEALTHY=false
        else
            STATE=$($COMPOSE_CMD ps "$service" --format json 2>/dev/null | grep -o '"State":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
            if [ "$STATE" = "running" ]; then
                echo -e "${YELLOW}⏳ $service is running (no healthcheck)${NC}"
            else
                echo -e "${RED}✗ $service is $STATE${NC}"
                HEALTHY=false
            fi
        fi
    done

    if [ "$HEALTHY" = true ]; then
        echo ""
        echo -e "${GREEN}✓ All services are healthy${NC}"
        break
    fi

    if [ $ELAPSED -ge $MAX_WAIT ]; then
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

# Display service status summary
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Deployment Complete                          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

$COMPOSE_CMD ps

echo ""
echo -e "${GREEN}Available endpoints:${NC}"
echo -e "  • Backend:  ${BLUE}http://localhost:3001${NC}"
echo -e "  • Frontend: ${BLUE}http://localhost:3000${NC}"
echo -e "  • Health:   ${BLUE}http://localhost:3001/health${NC}"
echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo -e "  • View logs:        ${BLUE}./logs.sh${NC}"
echo -e "  • Check health:     ${BLUE}./health-check.sh${NC}"
echo -e "  • Restart services: ${BLUE}./restart.sh${NC}"
echo -e "  • Stop services:    ${BLUE}./down.sh${NC}"
echo ""
