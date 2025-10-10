#!/bin/bash

# Test Environment Setup Script
# This script sets up the complete testing environment for the angel investing marketplace

set -e

echo "🚀 Setting up comprehensive testing framework..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
check_docker() {
    print_status "Checking Docker..."
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    print_success "Docker is running"
}

# Check if Node.js is installed
check_nodejs() {
    print_status "Checking Node.js..."
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ and try again."
        exit 1
    fi

    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18+ is required. Current version: $(node -v)"
        exit 1
    fi
    print_success "Node.js $(node -v) is installed"
}

# Setup test database
setup_database() {
    print_status "Setting up test database..."

    # Stop existing test containers
    docker-compose -f docker-compose.test.yml down -v > /dev/null 2>&1 || true

    # Start test services
    docker-compose -f docker-compose.test.yml up -d

    # Wait for services to be ready
    print_status "Waiting for test services to be ready..."
    sleep 10

    # Check if PostgreSQL is ready
    if docker-compose -f docker-compose.test.yml exec -T test-postgres pg_isready -U test -d angel_investing_test > /dev/null 2>&1; then
        print_success "Test database is ready"
    else
        print_error "Test database failed to start"
        exit 1
    fi

    # Check if Redis is ready
    if docker-compose -f docker-compose.test.yml exec -T test-redis redis-cli ping > /dev/null 2>&1; then
        print_success "Test Redis is ready"
    else
        print_error "Test Redis failed to start"
        exit 1
    fi
}

# Setup backend for testing
setup_backend() {
    print_status "Setting up backend for testing..."

    cd backend

    # Install dependencies
    if [ ! -d "node_modules" ]; then
        print_status "Installing backend dependencies..."
        npm ci
    fi

    # Generate Prisma client
    print_status "Generating Prisma client..."
    npm run db:generate

    # Run database migrations
    print_status "Running database migrations..."
    TEST_DATABASE_URL="postgresql://test:test@localhost:5433/angel_investing_test" npm run db:push

    # Build the application
    print_status "Building backend..."
    npm run build

    cd ..
    print_success "Backend setup completed"
}

# Setup frontend for testing
setup_frontend() {
    print_status "Setting up frontend for testing..."

    cd frontend

    # Install dependencies
    if [ ! -d "node_modules" ]; then
        print_status "Installing frontend dependencies..."
        npm ci
    fi

    # Build the application
    print_status "Building frontend..."
    npm run build

    cd ..
    print_success "Frontend setup completed"
}

# Install Playwright browsers
setup_playwright() {
    print_status "Setting up Playwright browsers..."

    if [ ! -d "node_modules" ]; then
        print_status "Installing root dependencies..."
        npm ci
    fi

    print_status "Installing Playwright browsers..."
    npx playwright install --with-deps

    print_success "Playwright setup completed"
}

# Seed test data
seed_test_data() {
    print_status "Seeding test data..."

    cd backend

    # Run Prisma seed script
    if [ -f "prisma/seed.ts" ]; then
        print_status "Running database seed script..."
        TEST_DATABASE_URL="postgresql://test:test@localhost:5433/angel_investing_test" npm run db:seed
    fi

    cd ..
    print_success "Test data seeded"
}

# Create test environment files
create_env_files() {
    print_status "Creating test environment files..."

    # Backend test environment
    if [ ! -f "backend/.env.test" ]; then
        cp backend/.env.example backend/.env.test 2>/dev/null || {
            print_warning "No .env.example found for backend, creating basic .env.test"
            cat > backend/.env.test << EOF
NODE_ENV=test
TEST_DATABASE_URL=postgresql://test:test@localhost:5433/angel_investing_test
REDIS_URL=redis://localhost:6380
JWT_SECRET=test_jwt_secret_key
PORT=3001
EOF
        }
    fi

    # Frontend test environment
    if [ ! -f "frontend/.env.test" ]; then
        cat > frontend/.env.test << EOF
VITE_API_URL=http://localhost:3001/api/v1
VITE_WS_URL=ws://localhost:3001
NODE_ENV=test
EOF
    fi

    print_success "Test environment files created"
}

# Run health checks
run_health_checks() {
    print_status "Running health checks..."

    # Check backend health
    print_status "Checking backend health..."
    sleep 5

    # Check if backend is responding
    if curl -f http://localhost:3001/api/v1/health > /dev/null 2>&1; then
        print_success "Backend is responding"
    else
        print_warning "Backend health check failed - this might be expected if server isn't running"
    fi

    # Check database connectivity
    print_status "Checking database connectivity..."
    if docker-compose -f docker-compose.test.yml exec -T test-postgres psql -U test -d angel_investing_test -c "SELECT 1;" > /dev/null 2>&1; then
        print_success "Database connectivity verified"
    else
        print_error "Database connectivity check failed"
        exit 1
    fi
}

# Main setup process
main() {
    echo "🔧 Angel Investing Marketplace - Test Environment Setup"
    echo "=================================================="

    check_docker
    check_nodejs
    create_env_files
    setup_database
    setup_backend
    setup_frontend
    setup_playwright
    seed_test_data
    run_health_checks

    echo ""
    print_success "🎉 Test environment setup completed successfully!"
    echo ""
    echo "📋 Available test commands:"
    echo "   Backend Tests:"
    echo "   - cd backend && npm test                 # Run all tests"
    echo "   - cd backend && npm run test:watch       # Run tests in watch mode"
    echo "   - cd backend && npm run test:coverage    # Run tests with coverage"
    echo ""
    echo "   Frontend Tests:"
    echo "   - cd frontend && npm test               # Run all tests"
    echo "   - cd frontend && npm run test:ui         # Run tests with UI"
    echo "   - cd frontend && npm run test:coverage   # Run tests with coverage"
    echo ""
    echo "   E2E Tests:"
    echo "   - npx playwright test                    # Run E2E tests"
    echo "   - npx playwright test --ui               # Run E2E tests with UI"
    echo "   - npx playwright test --headed           # Run E2E tests in headed mode"
    echo ""
    echo "   Test Services:"
    echo "   - docker-compose -f docker-compose.test.yml up -d    # Start test services"
    echo "   - docker-compose -f docker-compose.test.yml down     # Stop test services"
    echo ""
    echo "   Database:"
    echo "   - docker-compose -f docker-compose.test.yml exec test-postgres psql -U test -d angel_investing_test"
    echo ""
    echo "   Email Testing (MailHog):"
    echo "   - Open http://localhost:8026 to view test emails"
    echo ""
    echo "   File Storage Testing (MinIO):"
    echo "   - Console: http://localhost:9001 (test/testpassword)"
    echo ""
    echo "🚀 Happy testing!"
}

# Handle script arguments
case "${1:-}" in
    "db-only")
        check_docker
        setup_database
        ;;
    "backend-only")
        check_nodejs
        setup_backend
        ;;
    "frontend-only")
        check_nodejs
        setup_frontend
        ;;
    "playwright-only")
        setup_playwright
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [OPTION]"
        echo "Setup the testing environment for the angel investing marketplace"
        echo ""
        echo "Options:"
        echo "  db-only       Setup only the test database"
        echo "  backend-only  Setup only the backend for testing"
        echo "  frontend-only Setup only the frontend for testing"
        echo "  playwright-only Setup only Playwright browsers"
        echo "  help          Show this help message"
        echo ""
        echo "If no option is provided, the full setup will be performed."
        exit 0
        ;;
    *)
        main
        ;;
esac