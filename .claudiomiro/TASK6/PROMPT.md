## PROMPT
Deploy backend and frontend application containers.

**Objective:** Start application services and verify successful deployment.

**Context:**
- Backend runs on port 3001
- Frontend runs on port 3000
- Backend entrypoint handles:
  - Secret loading
  - Database connection wait
  - Prisma client generation
  - Migration deployment
  - Server startup
- Frontend entrypoint handles:
  - Environment variable injection
  - Nginx startup

**Tasks:**
1. Start backend:
   ```bash
   docker-compose up -d backend
   ```
2. Monitor backend logs:
   ```bash
   docker-compose logs -f backend
   ```
   Wait for: "🚀 Server started successfully"
3. Verify backend health:
   ```bash
   curl http://localhost:3001/health
   ```
4. Start frontend:
   ```bash
   docker-compose up -d frontend
   ```
5. Verify frontend:
   ```bash
   curl http://localhost:3000/health
   ```

## COMPLEXITY
Medium - Deployment can reveal integration issues

## RELATED FILES / SOURCES
- `/Users/vivek/elite/angel-investing-marketplace/docker/docker-compose.yml`
- `/Users/vivek/elite/angel-investing-marketplace/docker/entrypoints/backend-entrypoint.sh`
- `/Users/vivek/elite/angel-investing-marketplace/docker/entrypoints/frontend-entrypoint.sh`
- `/Users/vivek/elite/angel-investing-marketplace/backend/src/index.ts`

## EXTRA DOCUMENTATION
Backend startup flow:
1. Load secrets from /run/secrets
2. Wait for PostgreSQL (max 30 retries)
3. Generate Prisma client
4. Run migrations: `prisma migrate deploy`
5. Start Express server on port 3001

Frontend startup flow:
1. Inject environment variables into built files
2. Start Nginx on port 80 (mapped to 3000)
3. Serve static files from /usr/share/nginx/html

## LAYER
4 (Application Deployment)

## PARALLELIZATION
Sequential: Backend must be healthy before frontend starts

## CONSTRAINTS
- Must run AFTER TASK5 (needs healthy database)
- Monitor logs for errors
- Verify health endpoints respond
- Check migrations completed: Look for "Database migrations completed successfully" in logs
- If backend fails, check: secrets, database connection, migration errors
- If frontend fails, check: Nginx config, build artifacts, environment variables
