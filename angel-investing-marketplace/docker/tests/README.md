# E2E Deployment Tests

Comprehensive end-to-end deployment testing suite for the Angel Investing Marketplace Docker deployment.

## Quick Start

```bash
# Run full test suite
cd angel-investing-marketplace/docker/tests
./e2e-deployment-test.sh

# Run with detailed output
./e2e-deployment-test.sh --verbose

# Keep environment after tests for debugging
./e2e-deployment-test.sh --skip-cleanup

# Run individual test scenarios
./test-scenarios/full-deployment.sh
./test-scenarios/health-validation.sh
./test-scenarios/migration-validation.sh
./test-scenarios/service-restart.sh
./test-scenarios/clean-teardown.sh
```

## Test Suite Overview

The E2E test suite validates the complete deployment lifecycle through 5 comprehensive test scenarios:

### 1. Full Deployment Test (`full-deployment.sh`)
- **Phase 1:** Clean environment teardown (removes all containers, volumes)
- **Phase 2:** Verify clean state (no orphan resources)
- **Phase 3:** Fresh deployment (runs deploy.sh)
- **Phase 4:** Service health validation (all services reach healthy state)
- **Phase 5:** Endpoint validation (HTTP endpoints reachable)

**Duration:** ~90 seconds

### 2. Health Validation Test (`health-validation.sh`)
Comprehensive health checks covering:
- Docker container status for all services
- Health check status (postgres, redis, backend, frontend)
- Backend HTTP endpoint (/health)
- Frontend HTTP endpoint (/)
- Database connectivity (PostgreSQL accepting connections)
- Redis connectivity (PING response)
- Prisma client functionality (migrations table exists)

**Duration:** ~15 seconds

### 3. Migration Validation Test (`migration-validation.sh`)
Database schema verification:
- Prisma migrations table existence
- All migrations completed successfully
- No failed migrations detected
- Required tables exist (User, Pitch, Investment, Transaction)
- Foreign key constraints present
- Database indexes created

**Duration:** ~10 seconds

### 4. Service Restart Resilience Test (`service-restart.sh`)
Tests service recovery and data persistence:
- Insert test data via backend
- Restart backend service and verify recovery
- Verify data persists across backend restart
- Restart frontend service and verify recovery
- Restart postgres service (graceful)
- Verify backend reconnects to database
- Verify data persists across postgres restart
- Simultaneous restart of all services
- Complete system recovery validation

**Duration:** ~60 seconds

### 5. Clean Teardown Test (`clean-teardown.sh`)
Resource cleanup verification:
- Graceful shutdown (without volumes)
- Verify all containers stopped
- Complete cleanup with volumes
- Verify volumes removed
- Check for orphan containers
- Verify ports freed (3000, 3001)
- Idempotency check (multiple down.sh runs)

**Duration:** ~20 seconds

## Test Utilities

Shared helper functions in `test-utils.sh`:

### Service Management
- `wait_for_service <service_name> <timeout>` - Wait for service to be healthy
- `assert_service_healthy <service_name>` - Verify docker health check status
- `get_service_logs <service_name> [num_lines]` - Get service logs

### Health Checks
- `assert_http_ok <url> [timeout]` - Check if HTTP endpoint returns 200
- `wait_for_postgres [timeout]` - Wait for postgres to accept connections
- `all_services_running` - Check if all services are running

### Database Operations
- `docker_exec_postgres <sql_query>` - Execute SQL query in postgres container
- `cleanup_test_data` - Remove test data from database

### Resource Checks
- `container_exists <container_name>` - Check if container exists
- `volume_exists <volume_name>` - Check if volume exists
- `network_exists <network_name>` - Check if network exists
- `check_port_available <port>` - Check if port is available

### Output & Logging
- `log_test_phase <phase_name> <status> [message]` - Colorized test logging
- `print_test_summary <total> <passed> <failed> <skipped>` - Test summary table
- `get_timestamp` - Get formatted timestamp
- `time_command <command>` - Measure command execution time

## Test Reports

Test results are automatically saved to timestamped log files:

```
test-results/e2e-test-YYYYMMDD-HHMMSS.log
```

Reports include:
- Test execution summary (total, passed, failed, skipped)
- Timing information for each test phase
- Service logs on failures
- Environment information (Docker/Compose versions)
- Detailed test output and error messages

## Exit Codes

- `0` - All tests passed
- `1` - One or more tests failed

## Expected Performance

On a healthy system:
- **Full Suite:** 3-5 minutes
- **Individual Scenarios:** 10-90 seconds each

## Troubleshooting

### All Tests Failing
```bash
# Reset environment completely
cd ../
./scripts/down.sh --volumes

# Regenerate secrets
./scripts/generate-dev-secrets.sh

# Try tests again
cd tests
./e2e-deployment-test.sh
```

### Service Health Checks Failing
```bash
# Check service logs
../scripts/logs.sh

# Check detailed health status
../scripts/health-check.sh -v
```

### Database Migration Issues
```bash
# Access postgres directly
docker exec -it angel-investing-postgres psql -U postgres -d angel_investing_marketplace

# Check migrations
SELECT * FROM _prisma_migrations;
```

### Port Conflicts
```bash
# Check what's using ports
lsof -i :3000
lsof -i :3001

# Stop conflicting services or use different ports
```

## Integration with CI/CD

The test suite is designed for CI/CD integration:

```yaml
# Example GitHub Actions workflow
- name: Run E2E Deployment Tests
  run: |
    cd angel-investing-marketplace/docker/tests
    ./e2e-deployment-test.sh
```

## Test Coverage

✅ **Infrastructure Layer**
- Container lifecycle management
- Volume persistence
- Network configuration
- Service dependencies
- Health check mechanisms

✅ **Deployment Process**
- Clean deployment from scratch
- Service startup ordering
- Secret management
- Configuration injection

✅ **Service Resilience**
- Service restart recovery
- Database connection handling
- Data persistence across restarts
- Graceful shutdown handling

✅ **Resource Management**
- Complete cleanup verification
- Orphan resource detection
- Port management
- Volume cleanup

## Next Steps

After E2E tests pass:
1. Proceed to **TASK9** (Final Validation & Documentation)
2. Run smoke tests (TASK7) for API endpoint validation
3. Document deployment procedures
4. Create troubleshooting guides

## Contributing

When adding new test scenarios:
1. Place in `test-scenarios/` directory
2. Make script executable (`chmod +x`)
3. Source `test-utils.sh` for shared functions
4. Use consistent logging with `log_test_phase`
5. Return proper exit codes (0=pass, 1=fail)
6. Add to `SCENARIOS` array in `e2e-deployment-test.sh`
