#!/bin/bash

# Build script for Angel Investing Marketplace Docker images
# Builds backend and frontend Docker images with validation

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
NO_CACHE=""
PULL=""
PARALLEL=false

# Help documentation
show_help() {
    cat << EOF
${BLUE}Angel Investing Marketplace - Build Script${NC}

${GREEN}USAGE:${NC}
    ./build.sh [OPTIONS]

${GREEN}OPTIONS:${NC}
    --no-cache      Build without using cache
    --pull          Pull latest base images before building
    --parallel      Build images in parallel (faster)
    --help          Show this help message

${GREEN}EXAMPLES:${NC}
    ./build.sh                    # Standard build
    ./build.sh --no-cache         # Clean build without cache
    ./build.sh --pull --parallel  # Pull latest and build in parallel

${GREEN}DESCRIPTION:${NC}
    Builds backend and frontend Docker images for the Angel Investing Marketplace.
    Validates that images are created successfully and reports build times.

${YELLOW}NOTE:${NC}
    Images are tagged as:
    - angel-investing-backend:latest
    - angel-investing-frontend:latest

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --no-cache)
            NO_CACHE="--no-cache"
            shift
            ;;
        --pull)
            PULL="--pull"
            shift
            ;;
        --parallel)
            PARALLEL=true
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}Error: Unknown option $1${NC}"
            echo "Run './build.sh --help' for usage information"
            exit 1
            ;;
    esac
done

# Print header
echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Angel Investing Marketplace - Build         ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Record start time
START_TIME=$(date +%s)

# Build function
build_image() {
    local SERVICE=$1
    local DOCKERFILE=$2
    local IMAGE_NAME=$3

    echo -e "${YELLOW}► Building ${SERVICE}...${NC}"

    local BUILD_START=$(date +%s)

    if docker build \
        -f "$DOCKER_DIR/$DOCKERFILE" \
        -t "$IMAGE_NAME" \
        $NO_CACHE \
        $PULL \
        "$PROJECT_ROOT" 2>&1 | while IFS= read -r line; do
            echo "  $line"
        done; then

        local BUILD_END=$(date +%s)
        local BUILD_TIME=$((BUILD_END - BUILD_START))

        echo -e "${GREEN}✓ ${SERVICE} built successfully (${BUILD_TIME}s)${NC}"
        echo ""
        return 0
    else
        echo -e "${RED}✗ ${SERVICE} build failed${NC}"
        return 1
    fi
}

# Validate image
validate_image() {
    local IMAGE_NAME=$1
    local SERVICE=$2

    echo -e "${YELLOW}► Validating ${SERVICE} image...${NC}"

    if docker images "$IMAGE_NAME" | grep -q "$IMAGE_NAME"; then
        local IMAGE_SIZE=$(docker images "$IMAGE_NAME" --format "{{.Size}}" | head -n1)
        echo -e "${GREEN}✓ ${SERVICE} image exists (Size: ${IMAGE_SIZE})${NC}"
        return 0
    else
        echo -e "${RED}✗ ${SERVICE} image not found${NC}"
        return 1
    fi
}

# Build images
echo -e "${BLUE}Building Docker images...${NC}"
echo ""

BUILD_FAILED=false

if [ "$PARALLEL" = true ]; then
    echo -e "${YELLOW}Building in parallel mode...${NC}"
    echo ""

    # Build in background
    build_image "Backend" "Dockerfile.backend" "angel-investing-backend:latest" &
    BACKEND_PID=$!

    build_image "Frontend" "Dockerfile.frontend" "angel-investing-frontend:latest" &
    FRONTEND_PID=$!

    # Wait for both builds
    wait $BACKEND_PID
    BACKEND_STATUS=$?

    wait $FRONTEND_PID
    FRONTEND_STATUS=$?

    if [ $BACKEND_STATUS -ne 0 ] || [ $FRONTEND_STATUS -ne 0 ]; then
        BUILD_FAILED=true
    fi
else
    # Build sequentially
    if ! build_image "Backend" "Dockerfile.backend" "angel-investing-backend:latest"; then
        BUILD_FAILED=true
    fi

    if ! build_image "Frontend" "Dockerfile.frontend" "angel-investing-frontend:latest"; then
        BUILD_FAILED=true
    fi
fi

# Check if builds failed
if [ "$BUILD_FAILED" = true ]; then
    echo -e "${RED}╔════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║   Build Failed                                  ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════╝${NC}"
    exit 1
fi

# Validate images
echo -e "${BLUE}Validating built images...${NC}"
echo ""

VALIDATION_FAILED=false

if ! validate_image "angel-investing-backend:latest" "Backend"; then
    VALIDATION_FAILED=true
fi

if ! validate_image "angel-investing-frontend:latest" "Frontend"; then
    VALIDATION_FAILED=true
fi

echo ""

# Check if validation failed
if [ "$VALIDATION_FAILED" = true ]; then
    echo -e "${RED}╔════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║   Image Validation Failed                       ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════╝${NC}"
    exit 1
fi

# Calculate total time
END_TIME=$(date +%s)
TOTAL_TIME=$((END_TIME - START_TIME))
MINUTES=$((TOTAL_TIME / 60))
SECONDS=$((TOTAL_TIME % 60))

# Print success summary
echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Build Completed Successfully                  ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✓ Backend image:${NC}  angel-investing-backend:latest"
echo -e "${GREEN}✓ Frontend image:${NC} angel-investing-frontend:latest"
echo ""
echo -e "${BLUE}Total build time:${NC} ${MINUTES}m ${SECONDS}s"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "  • Run ${BLUE}./deploy.sh${NC} to start all services"
echo -e "  • Run ${BLUE}./health-check.sh${NC} to verify deployment"
echo ""
