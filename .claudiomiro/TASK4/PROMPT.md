## PROMPT
Validate Docker secrets and build container images for deployment.

**Objective:** Ensure all required secrets exist and create Docker images for backend and frontend services.

**Context:**
- Secrets located in: `angel-investing-marketplace/docker/secrets/`
- Secret generation script: `docker/scripts/generate-dev-secrets.sh`
- Backend Dockerfile: `docker/Dockerfile.backend`
- Frontend Dockerfile: `docker/Dockerfile.frontend`
- Docker compose uses Docker secrets mechanism

**Tasks:**
1. Check existing secrets in `docker/secrets/`
2. Run `bash docker/scripts/generate-dev-secrets.sh` if secrets missing
3. Verify required secrets exist:
   - database_url.txt
   - redis_url.txt
   - better_auth_secret.txt
   - jwt_secret.txt
4. Build images:
   - `docker build -f docker/Dockerfile.backend -t angel-backend:latest .`
   - `docker build -f docker/Dockerfile.frontend -t angel-frontend:latest .`
5. Verify: `docker images | grep angel`

## COMPLEXITY
Medium - Docker builds can reveal issues

## RELATED FILES / SOURCES
- `/Users/vivek/elite/angel-investing-marketplace/docker/Dockerfile.backend`
- `/Users/vivek/elite/angel-investing-marketplace/docker/Dockerfile.frontend`
- `/Users/vivek/elite/angel-investing-marketplace/docker/docker-compose.yml`
- `/Users/vivek/elite/angel-investing-marketplace/docker/scripts/generate-dev-secrets.sh`

## EXTRA DOCUMENTATION
Backend Dockerfile:
- Multi-stage build
- Copies dist/ from TASK2
- Copies prisma/ for migrations
- Uses backend-entrypoint.sh

Frontend Dockerfile:
- Multi-stage build with Vite
- Copies dist/ from TASK3
- Serves via Nginx
- Uses frontend-entrypoint.sh

## LAYER
3 (Infrastructure)

## PARALLELIZATION
Backend and frontend images can build in parallel (use `&` and `wait`)

## CONSTRAINTS
- Must run AFTER TASK2 and TASK3 (needs built code)
- Generate secrets via script (automation-first)
- Build from project root (context for Dockerfiles)
- Verify images created (docker images check)
- Images should build without errors
