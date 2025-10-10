@dependencies [TASK2, TASK3]
# Task 4: Secrets Validation & Docker Image Build

## Summary
Validate all required Docker secrets exist and build Docker images for backend and frontend. This prepares containerized applications for deployment.

## Complexity
Medium

## Dependencies
Depends on: TASK2, TASK3 (needs compiled backend and built frontend)
Blocks: TASK5 (deployment needs images)
Parallel with: None (sequential after builds)

## Steps
1. Verify all required secrets exist in docker/secrets/
2. Generate any missing development secrets
3. Build backend Docker image
4. Build frontend Docker image
5. Verify both images created successfully

## Acceptance Criteria
- [ ] All required secrets present (database_url, redis_url, better_auth_secret, jwt_secret)
- [ ] Optional secrets handled gracefully
- [ ] Backend Docker image built successfully
- [ ] Frontend Docker image built successfully
- [ ] Images visible in `docker images` output

## Reasoning Trace
Docker images need secrets and built artifacts. Entrypoint scripts load secrets from /run/secrets. Without secrets, containers fail to start. Without built code (TASK2/3), images are empty. This is Layer 3 - infrastructure preparation before deployment.
