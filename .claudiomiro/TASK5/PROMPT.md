## PROMPT
Deploy and validate foundational infrastructure services.

**Objective:** Start PostgreSQL and Redis containers and ensure they're healthy before deploying application services.

**Context:**
- Docker compose file: `angel-investing-marketplace/docker/docker-compose.yml`
- PostgreSQL health check: `pg_isready`
- Redis health check: `redis-cli ping`
- Services must be healthy before backend starts

**Tasks:**
1. `cd angel-investing-marketplace/docker`
2. Start infrastructure only:
   ```bash
   docker-compose up -d postgres redis
   ```
3. Wait for health checks:
   ```bash
   docker-compose ps postgres redis
   ```
4. Verify PostgreSQL:
   ```bash
   docker-compose exec postgres pg_isready -U postgres
   ```
5. Verify Redis:
   ```bash
   docker-compose exec redis redis-cli ping
   ```

## COMPLEXITY
Low - Standard Docker operations

## RELATED FILES / SOURCES
- `/Users/vivek/elite/angel-investing-marketplace/docker/docker-compose.yml`
- `/Users/vivek/elite/angel-investing-marketplace/docker/secrets/` (used by containers)

## EXTRA DOCUMENTATION
Health check flow:
1. PostgreSQL starts → runs init scripts → becomes healthy (30-40s)
2. Redis starts → loads data → becomes healthy (20s)
3. Both must show "healthy" status before proceeding

docker-compose.yml defines:
- PostgreSQL: `healthcheck: pg_isready -U postgres`
- Redis: `healthcheck: redis-cli ping`

## LAYER
4 (Infrastructure Deployment)

## PARALLELIZATION
PostgreSQL and Redis start in parallel automatically (docker-compose)

## CONSTRAINTS
- Must run AFTER TASK4 (needs secrets and Docker setup)
- Wait for healthy status (don't proceed if unhealthy)
- Use docker-compose commands (automation-first)
- Verify connectivity before completing
- Check logs if health checks fail: `docker-compose logs postgres redis`
