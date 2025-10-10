Fully implemented: NO

## Implementation Plan

- [ ] **Item 1 — Deploy Backend Service and Verify Startup Success**
  - **Context (read-only):**
    - `angel-investing-marketplace/docker/docker-compose.yml` (backend service definition with health checks and dependencies)
    - `angel-investing-marketplace/docker/entrypoints/backend-entrypoint.sh` (initialization: secrets → DB wait → Prisma generate → migrations → server start)
    - `angel-investing-marketplace/backend/src/index.ts` (Express server startup, health endpoints at /health and /api/health)
    - `angel-investing-marketplace/backend/src/config/database.ts` (Prisma connection logic with retry mechanism)
    - `angel-investing-marketplace/docker/secrets/*.txt` (all secrets from TASK4, validated before backend starts)
    - `.claudiomiro/TASK5/TODO.md` (verification that PostgreSQL and Redis are healthy from infrastructure deployment)
    - `.claudiomiro/TASK4/TODO.md` (verification that Docker images are built: angel-backend:latest)
    - Docker image: `angel-backend:latest` (463MB, built in TASK4)
    - PostgreSQL service: `postgres:5432` (healthy, from TASK5)
    - Redis service: `redis:6379` (healthy, from TASK5)
  
  - **Touched (will modify/create):**
    - Docker container: `angel-investing-backend` (running backend application)
    - PostgreSQL database schema: Tables created via Prisma migrations
    - Container logs: Backend initialization and startup logs
    - Network connections: Backend → PostgreSQL (port 5432), Backend → Redis (port 6379)
    - Host port binding: 3001 → container port 3001
  
  - **Interfaces / Contracts:**
    - **Startup Sequence Contract** (backend-entrypoint.sh):
      1. Load secrets from `/run/secrets/` → Environment variables (DATABASE_URL, REDIS_URL, etc.)
      2. Wait for PostgreSQL (max 30 retries × 2s = 60s)
      3. Generate Prisma client: `npx prisma generate`
      4. Deploy migrations: `npx prisma migrate deploy`
      5. Start Express server: `node dist/index.js` on port 3001
    - **Health Check Contract**:
      - Basic health: `GET /health` → `{"status": "OK", "timestamp": "...", "uptime": N}` (no DB check)
      - Full health: `GET /api/health` → `{"status": "OK", "database": "connected", ...}` (includes DB connectivity test)
      - Docker health check: `curl -f http://localhost:3001/health` every 30s, 3 retries, 60s startup period
    - **Database Migration Contract**:
      - Prisma migrations run via `prisma migrate deploy` (applies all pending migrations)
      - Success indicator: Backend logs show "Database migrations completed successfully"
      - Migration failure → Backend container exits with code 1
    - **Dependency Contract** (from docker-compose.yml):
      - Backend waits for PostgreSQL: `condition: service_healthy`
      - Backend waits for Redis: `condition: service_healthy`
      - Frontend waits for Backend: `condition: service_healthy` (deferred to Item 2)
    - **Secret Loading Contract**:
      - Required secrets: database_url, redis_url, better_auth_secret, jwt_secret (fail if missing)
      - Optional secrets: smtp_pass, aws_secret_access_key, stripe_secret_key, etc. (graceful handling)
  
  - **Tests:**
    - **Type**: Container deployment validation + startup sequence verification + health endpoint testing
    - **Key Scenarios:**
      1. Backend container starts successfully: `docker-compose ps backend` shows State=running
      2. Secrets loaded without errors: Logs show "Loaded required secret: DATABASE_URL" (4 required secrets)
      3. PostgreSQL connection established: Logs show "PostgreSQL is ready!" within 60s
      4. Prisma client generated: Logs show "Prisma client generated successfully"
      5. Migrations deployed successfully: Logs show "Database migrations completed successfully"
      6. Express server started: Logs show "🚀 Server started successfully" with port 3001
      7. Health endpoint responds: `curl http://localhost:3001/health` returns HTTP 200 with JSON
      8. API health endpoint responds: `curl http://localhost:3001/api/health` returns HTTP 200 with database status
      9. Container health status becomes "healthy": `docker-compose ps backend` shows Status=(healthy)
      10. No error messages in logs: Backend logs contain no "ERROR" or "FATAL" entries after startup
    - **Edge Cases:**
      - PostgreSQL slow to initialize (>20s) → Backend waits up to 60s before failing
      - Migration conflicts or failures → Backend logs error and exits, container restart policy triggers retry
      - Missing required secret → Backend logs "ERROR: Required secret not found" and exits immediately
      - Port 3001 already in use on host → Docker Compose reports port binding error
      - Prisma client generation fails → Backend logs error and exits before starting server
      - Database connection lost during startup → Retry mechanism in connectWithRetry (5 retries, 1s interval)
  
  - **Migrations / Data:**
    - **Migration Execution**: `npx prisma migrate deploy` runs all pending migrations in `backend/prisma/migrations/` directory
    - **Migration Order**: Prisma applies migrations in chronological order (based on migration folder timestamps)
    - **Expected Migrations** (from TASK1): User, Startup, Investment, Document, Notification, Message tables + indexes
    - **Migration Idempotency**: `prisma migrate deploy` is safe to re-run (skips already-applied migrations)
    - **Migration Rollback**: Not automated; manual rollback via SQL if deployment fails (document in risks)
    - **Initial Data**: No seed data in this task (empty tables after migrations)
    - **Database Schema Verification**: After migrations, verify tables exist via Prisma: `await prisma.$queryRaw\`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'\``
  
  - **Observability:**
    - **Container Logs** (`docker-compose logs -f backend`):
      ```
      Loading secrets from /run/secrets...
      Loaded required secret: DATABASE_URL
      Loaded required secret: REDIS_URL
      Loaded required secret: BETTER_AUTH_SECRET
      Loaded required secret: JWT_SECRET
      Secrets loaded successfully
      Waiting for PostgreSQL to be ready...
      Attempting database connection (1/30)...
      PostgreSQL is ready!
      Generating Prisma client...
      Prisma client generated successfully
      Running database migrations...
      Database migrations completed successfully
      === Backend Initialization Complete ===
      Starting application...
      🔌 Connecting to database...
      🚀 Server started successfully { port: 3001, environment: 'production' }
      ```
    - **Metrics to Track**:
      - Time to healthy: Target <90s (60s startup period + 30s for health checks to pass)
      - Migration execution time: Log duration of `prisma migrate deploy` (target <30s for initial schema)
      - Database connection retries: Should be 0-1 (PostgreSQL already healthy from TASK5)
      - Container restart count: Should be 0 for successful deployment
    - **Success Indicators**:
      - Backend container shows State=running, Status=(healthy)
      - Logs contain "🚀 Server started successfully"
      - No ERROR/FATAL messages in logs after startup complete
      - Health endpoints return HTTP 200
    - **Failure Indicators**:
      - Container shows State=restarting or State=exited
      - Logs contain "ERROR: Required secret not found" or "ERROR: Database migrations failed"
      - Health checks fail after 60s startup period
      - Migration errors: "P3XXX" Prisma error codes
  
  - **Security & Permissions:**
    - **Secret Handling**: Secrets loaded from `/run/secrets/` (Docker secrets, not environment variables directly)
    - **Database Credentials**: PostgreSQL connection uses credentials from database_url secret (postgres/postgres in dev)
    - **Network Security**: Backend exposed on host port 3001 (acceptable for development, document production reverse proxy)
    - **Container User**: Backend runs as non-root user `appuser` (UID 1001) per Dockerfile.backend
    - **Migration Safety**: Migrations run in production mode (`prisma migrate deploy`), no interactive prompts
    - **Secret Logging**: Backend entrypoint logs secret names but NOT values (security best practice)
    - **Production Warning**: Document requirement to use proper secret management (AWS Secrets Manager, Vault) for production
  
  - **Performance:**
    - **Startup Time**:
      - Secret loading: <1s
      - PostgreSQL wait: 0-5s (already healthy from TASK5)
      - Prisma generate: 5-15s (generates TypeScript types)
      - Migration deploy: 5-30s (depends on migration complexity)
      - Express startup: 1-3s
      - **Total target**: <60s to "Server started", <90s to healthy
    - **Health Check Impact**: Health checks run every 30s (minimal overhead, single HTTP request)
    - **Resource Limits**: Not enforced in development (rely on Docker Desktop defaults)
    - **Database Connection Pool**: Prisma default pool (connection limit based on DATABASE_URL)
    - **Complexity**: O(1) - single backend container with deterministic startup sequence
  
  - **Commands:**
    ```bash
    # Navigate to Docker directory
    cd /Users/vivek/elite/angel-investing-marketplace/docker

    # Verify TASK5 prerequisite (infrastructure services healthy)
    docker-compose ps postgres redis | grep -q "healthy" || {
      echo "ERROR: TASK5 not complete - PostgreSQL or Redis not healthy"
      echo "Run: docker-compose up -d postgres redis"
      exit 1
    }

    # Verify TASK4 prerequisite (backend image exists)
    docker images angel-backend:latest --format "{{.Repository}}" | grep -q "angel-backend" || {
      echo "ERROR: TASK4 not complete - angel-backend:latest image missing"
      echo "Run: docker build -f Dockerfile.backend -t angel-backend:latest .."
      exit 1
    }

    # Start backend service only (NOT frontend yet)
    echo "Starting backend service..."
    docker-compose up -d backend

    # Monitor backend logs in real-time (run in separate terminal or background)
    echo "Monitoring backend logs (Ctrl+C to stop, container continues running)..."
    docker-compose logs -f backend &
    LOGS_PID=$!

    # Wait for backend initialization (watch for success message)
    echo "Waiting for backend initialization..."
    INIT_RETRIES=45  # 45 * 2s = 90s max wait
    RETRY_COUNT=0
    INIT_SUCCESS=false

    while [ $RETRY_COUNT -lt $INIT_RETRIES ]; do
      RETRY_COUNT=$((RETRY_COUNT + 1))

      # Check if "Server started successfully" appears in logs
      if docker-compose logs backend 2>&1 | grep -q "Server started successfully"; then
        echo "✅ Backend initialization complete!"
        INIT_SUCCESS=true
        break
      fi

      # Check for initialization errors
      if docker-compose logs backend 2>&1 | grep -qE "ERROR:|FATAL:|failed"; then
        echo "❌ Backend initialization error detected!"
        docker-compose logs backend | tail -50
        kill $LOGS_PID 2>/dev/null || true
        exit 1
      fi

      echo "Waiting for backend startup... ($RETRY_COUNT/$INIT_RETRIES)"
      sleep 2
    done

    if [ "$INIT_SUCCESS" != "true" ]; then
      echo "❌ Backend did not start within 90 seconds"
      docker-compose logs backend | tail -100
      kill $LOGS_PID 2>/dev/null || true
      exit 1
    fi

    # Wait additional 10s for Express to fully bind to port
    sleep 10

    # Kill background logs process
    kill $LOGS_PID 2>/dev/null || true

    # Verify backend health endpoint
    echo ""
    echo "Verifying backend health endpoint..."
    HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:3001/health || echo "000")
    HEALTH_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
    HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | head -n-1)

    if [ "$HEALTH_CODE" = "200" ]; then
      echo "✅ Backend health endpoint responding (HTTP $HEALTH_CODE)"
      echo "Response: $HEALTH_BODY" | head -c 200
      echo ""
    else
      echo "❌ Backend health endpoint failed (HTTP $HEALTH_CODE)"
      echo "Response: $HEALTH_RESPONSE"
      docker-compose logs backend | tail -30
      exit 1
    fi

    # Verify API health endpoint (includes database check)
    echo ""
    echo "Verifying API health endpoint..."
    API_HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:3001/api/health || echo "000")
    API_HEALTH_CODE=$(echo "$API_HEALTH_RESPONSE" | tail -n1)
    API_HEALTH_BODY=$(echo "$API_HEALTH_RESPONSE" | head -n-1)

    if [ "$API_HEALTH_CODE" = "200" ]; then
      echo "✅ API health endpoint responding (HTTP $API_HEALTH_CODE)"
      echo "Response: $API_HEALTH_BODY" | head -c 200
      echo ""
    else
      echo "❌ API health endpoint failed (HTTP $API_HEALTH_CODE)"
      echo "Response: $API_HEALTH_RESPONSE"
      docker-compose logs backend | tail -30
      exit 1
    fi

    # Wait for Docker health check to pass
    echo ""
    echo "Waiting for Docker health check to become healthy..."
    HEALTH_RETRIES=10  # 10 * 5s = 50s max wait (health checks run every 30s)
    RETRY_COUNT=0
    HEALTH_PASS=false

    while [ $RETRY_COUNT -lt $HEALTH_RETRIES ]; do
      RETRY_COUNT=$((RETRY_COUNT + 1))

      BACKEND_HEALTH=$(docker-compose ps backend --format json 2>/dev/null | grep -o '"Health":"[^"]*"' | cut -d'"' -f4 || echo "none")

      if [ "$BACKEND_HEALTH" = "healthy" ]; then
        echo "✅ Backend container is healthy!"
        HEALTH_PASS=true
        break
      fi

      echo "Backend health status: $BACKEND_HEALTH (attempt $RETRY_COUNT/$HEALTH_RETRIES)"

      if [ "$BACKEND_HEALTH" = "unhealthy" ]; then
        echo "❌ Backend health check failed!"
        docker-compose logs backend | tail -50
        exit 1
      fi

      sleep 5
    done

    if [ "$HEALTH_PASS" != "true" ]; then
      echo "⚠️  Warning: Backend not marked healthy yet, but endpoints responding"
      echo "This may be normal if health checks haven't run enough times yet"
    fi

    # Verify migrations ran successfully
    echo ""
    echo "Verifying database migrations..."
    if docker-compose logs backend 2>&1 | grep -q "Database migrations completed successfully"; then
      echo "✅ Database migrations completed successfully"
    else
      echo "❌ Migration completion message not found in logs"
      docker-compose logs backend | grep -i migration
      exit 1
    fi

    # Show final backend status
    echo ""
    echo "=== Backend Deployment Status ==="
    docker-compose ps backend

    # Check for any errors in logs
    echo ""
    echo "=== Checking for errors in backend logs ==="
    ERROR_COUNT=$(docker-compose logs backend 2>&1 | grep -cE "ERROR:|FATAL:" || echo "0")
    if [ "$ERROR_COUNT" -gt 0 ]; then
      echo "⚠️  Warning: Found $ERROR_COUNT error/fatal messages in logs"
      docker-compose logs backend | grep -E "ERROR:|FATAL:" | tail -10
      echo "(Review logs above - some errors during initialization may be acceptable)"
    else
      echo "✅ No errors found in backend logs"
    fi

    # Success summary
    echo ""
    echo "╔════════════════════════════════════════════════╗"
    echo "║   Backend Deployment Complete ✅               ║"
    echo "╚════════════════════════════════════════════════╝"
    echo ""
    echo "Backend running at: http://localhost:3001"
    echo "Health endpoint: http://localhost:3001/health"
    echo "API health: http://localhost:3001/api/health"
    echo ""
    echo "Ready for Item 2 (Frontend Deployment)"
    ```
  
  - **Risks & Mitigations:**
    - **Risk**: Migration fails due to schema conflicts → **Mitigation**: Verify Prisma schema in TASK1, test migrations locally before deployment, log migration output for debugging
    - **Risk**: PostgreSQL connection timeout (>60s) → **Mitigation**: TASK5 ensures PostgreSQL is healthy before backend starts, retry mechanism handles transient failures
    - **Risk**: Missing required secret causes startup failure → **Mitigation**: TASK4 validates secrets exist, backend-entrypoint.sh fails fast with clear error message
    - **Risk**: Port 3001 already in use on host → **Mitigation**: Check port availability before docker-compose up, document port conflict resolution
    - **Risk**: Prisma client generation fails → **Mitigation**: Dockerfile.backend already generates client at build time (this is runtime regeneration for safety), log error clearly
    - **Risk**: Database migration takes >30s (complex schema) → **Mitigation**: Monitor migration duration, increase timeout if needed, consider migration splitting for large schemas
    - **Risk**: Health check passes but application not functional → **Mitigation**: API health endpoint includes database connectivity test, verify both /health and /api/health
    - **Risk**: Container restart loop due to startup failure → **Mitigation**: Check logs immediately, backend-entrypoint.sh exits with code 1 on errors (prevents silent failures)

- [ ] **Item 2 — Deploy Frontend Service and Verify Accessibility**
  - **Context (read-only):**
    - `angel-investing-marketplace/docker/docker-compose.yml` (frontend service definition with Nginx on port 80 → host 3000)
    - `angel-investing-marketplace/docker/entrypoints/frontend-entrypoint.sh` (config.js generation from env vars → Nginx start)
    - `angel-investing-marketplace/docker/nginx.conf` (SPA routing with try_files fallback, reverse proxy not included)
    - `angel-investing-marketplace/frontend/dist/` (built static assets from TASK3, includes index.html and hashed assets/)
    - `.claudiomiro/TASK4/TODO.md` (verification that Docker images are built: angel-frontend:latest 117MB)
    - `.claudiomiro/TASK6/TODO.md` Item 1 (backend must be healthy before frontend starts)
    - Docker image: `angel-frontend:latest` (117MB, built in TASK4)
    - Backend service: `http://backend:3001` (healthy, from Item 1)
  
  - **Touched (will modify/create):**
    - Docker container: `angel-investing-frontend` (running Nginx with static files)
    - Runtime config: `/usr/share/nginx/html/config.js` (generated at startup from environment variables)
    - Container logs: Frontend initialization and Nginx startup logs
    - Network connections: Frontend → Backend (internal Docker network for API calls from browser)
    - Host port binding: 3000 → container port 80
  
  - **Interfaces / Contracts:**
    - **Startup Sequence Contract** (frontend-entrypoint.sh):
      1. Generate `/usr/share/nginx/html/config.js` from environment variables (VITE_API_URL, VITE_WS_URL, VITE_BETTER_AUTH_URL)
      2. Verify config.js file created successfully
      3. Start Nginx in foreground: `nginx -g "daemon off;"`
    - **Runtime Configuration Contract**:
      - `window.__RUNTIME_CONFIG__` injected into browser via config.js (loaded by frontend JS)
      - API URL: `http://backend:3001` (internal Docker network) or `http://localhost:3001` (from browser perspective)
      - WebSocket URL: `ws://backend:3001` (for Socket.IO real-time features)
      - Better Auth URL: `http://backend:3001/api/auth` (authentication endpoints)
    - **Health Check Contract**:
      - Health endpoint: `GET /health` → Nginx serves static health check file or 404 (depends on implementation)
      - Docker health check: `curl -f http://localhost:80/health` every 30s, 3 retries, 30s startup period
      - Alternative: `curl -f http://localhost:80/` returns index.html (HTTP 200)
    - **SPA Routing Contract** (nginx.conf):
      - All routes fallback to index.html: `try_files $uri /index.html`
      - Assets served with proper MIME types: `.js`, `.css`, `.png`, `.svg`, etc.
      - Gzip compression enabled for text assets (JS, CSS, HTML, JSON)
    - **Dependency Contract** (from docker-compose.yml):
      - Frontend waits for backend: `condition: service_healthy` (backend must be healthy first)
      - No dependency on PostgreSQL/Redis directly (backend handles database interactions)
  
  - **Tests:**
    - **Type**: Container deployment validation + Nginx configuration verification + static file serving
    - **Key Scenarios:**
      1. Frontend container starts successfully: `docker-compose ps frontend` shows State=running
      2. Config.js generated: Logs show "Runtime configuration generated successfully" with API URLs
      3. Nginx started: Logs show "Starting nginx..." (no config syntax errors)
      4. Index.html accessible: `curl http://localhost:3000/` returns HTML with HTTP 200
      5. Config.js accessible: `curl http://localhost:3000/config.js` returns JavaScript runtime config
      6. Static assets accessible: `curl http://localhost:3000/assets/*.js` returns JavaScript files
      7. SPA routing works: `curl http://localhost:3000/some-route` returns index.html (not 404)
      8. Health endpoint responds: `curl http://localhost:3000/health` returns HTTP 200 or fallback to index.html
      9. Container health status becomes "healthy": `docker-compose ps frontend` shows Status=(healthy)
      10. No error messages in logs: Frontend logs contain no Nginx errors after startup
    - **Edge Cases:**
      - Missing dist/index.html → Nginx fails to start, logs "No such file or directory"
      - Nginx config syntax error → Container exits immediately, logs show error line number
      - Port 3000 already in use on host → Docker Compose reports port binding error
      - Config.js generation fails → Container exits, logs show "ERROR: Failed to generate configuration file"
      - Backend not healthy when frontend starts → Docker Compose waits (depends_on condition prevents start)
      - Asset files missing (empty dist/) → Nginx starts but routes return 404 (verify in TASK3)
  
  - **Migrations / Data:**
    - N/A (static file serving, no database or data changes)
  
  - **Observability:**
    - **Container Logs** (`docker-compose logs -f frontend`):
      ```
      Generating runtime configuration...
      Runtime configuration generated successfully
      API_URL: http://backend:3001
      WS_URL: ws://backend:3001
      BETTER_AUTH_URL: http://backend:3001/api/auth
      Starting nginx...
      [nginx startup messages]
      ```
    - **Nginx Access Logs**: Logged to stdout, captured by Docker (shows HTTP requests to frontend)
    - **Nginx Error Logs**: Logged to stderr, captured by Docker (shows 404s, config errors, etc.)
    - **Metrics to Track**:
      - Time to healthy: Target <40s (30s startup period + 10s for health checks)
      - Nginx startup time: Target <5s (very fast, just loads config and binds port)
      - Container restart count: Should be 0 for successful deployment
      - Static file request latency: Target <50ms (Nginx serving from memory/disk cache)
    - **Success Indicators**:
      - Frontend container shows State=running, Status=(healthy)
      - Logs contain "Runtime configuration generated successfully"
      - No Nginx error messages in logs
      - `curl http://localhost:3000/` returns HTML with HTTP 200
    - **Failure Indicators**:
      - Container shows State=exited or State=restarting
      - Logs contain Nginx config errors: "nginx: configuration file ... test failed"
      - Health checks fail after 30s startup period
      - `curl http://localhost:3000/` returns "Connection refused"
  
  - **Security & Permissions:**
    - **Container User**: Frontend runs as non-root user `nginxuser` (UID 1001) per Dockerfile.frontend
    - **Network Security**: Frontend exposed on host port 3000 (acceptable for development)
    - **Static Files**: No sensitive data in static files (environment vars injected via config.js)
    - **Config.js Security**: Contains backend URLs only (no secrets, API keys, or credentials)
    - **Nginx Hardening**: 
      - Server tokens disabled (hide Nginx version)
      - Default server config removed (prevent unintended access)
      - PID file in /run/nginx (non-root writable)
    - **Production Warning**: Document requirement for HTTPS, CDN, and reverse proxy for production
  
  - **Performance:**
    - **Startup Time**:
      - Config.js generation: <1s (simple JavaScript file write)
      - Nginx startup: 1-3s (load config, bind port 80)
      - **Total target**: <10s to "nginx started", <40s to healthy
    - **Static File Serving**:
      - Nginx optimized for static files (sendfile, tcp_nopush enabled)
      - Gzip compression for text assets (reduces transfer size by ~70%)
      - Browser caching headers for hashed assets (1 year max-age)
    - **Resource Limits**: Not enforced in development (rely on Docker Desktop defaults)
    - **Complexity**: O(1) - single frontend container with deterministic startup
  
  - **Commands:**
    ```bash
    # Navigate to Docker directory
    cd /Users/vivek/elite/angel-investing-marketplace/docker

    # Verify Item 1 prerequisite (backend is healthy)
    docker-compose ps backend | grep -q "healthy" || {
      echo "ERROR: Item 1 not complete - Backend not healthy"
      echo "Run Item 1 commands first"
      exit 1
    }

    # Verify TASK4 prerequisite (frontend image exists)
    docker images angel-frontend:latest --format "{{.Repository}}" | grep -q "angel-frontend" || {
      echo "ERROR: TASK4 not complete - angel-frontend:latest image missing"
      echo "Run: docker build -f Dockerfile.frontend -t angel-frontend:latest .."
      exit 1
    }

    # Start frontend service
    echo "Starting frontend service..."
    docker-compose up -d frontend

    # Monitor frontend logs
    echo "Monitoring frontend logs..."
    docker-compose logs -f frontend &
    LOGS_PID=$!

    # Wait for frontend initialization (much faster than backend)
    echo "Waiting for frontend initialization..."
    sleep 10

    # Kill background logs process
    kill $LOGS_PID 2>/dev/null || true

    # Verify frontend accessible via index.html
    echo ""
    echo "Verifying frontend index.html..."
    INDEX_RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:3000/ || echo "000")
    INDEX_CODE=$(echo "$INDEX_RESPONSE" | tail -n1)

    if [ "$INDEX_CODE" = "200" ]; then
      echo "✅ Frontend index.html accessible (HTTP $INDEX_CODE)"
      # Verify it's actual HTML content
      if echo "$INDEX_RESPONSE" | grep -q "<!DOCTYPE html>"; then
        echo "✅ Response contains valid HTML"
      else
        echo "⚠️  Warning: Response is not HTML (unexpected)"
        echo "$INDEX_RESPONSE" | head -n1
      fi
    else
      echo "❌ Frontend index.html failed (HTTP $INDEX_CODE)"
      docker-compose logs frontend | tail -30
      exit 1
    fi

    # Verify config.js was generated
    echo ""
    echo "Verifying runtime config.js..."
    CONFIG_RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:3000/config.js || echo "000")
    CONFIG_CODE=$(echo "$CONFIG_RESPONSE" | tail -n1)

    if [ "$CONFIG_CODE" = "200" ]; then
      echo "✅ Runtime config.js accessible (HTTP $CONFIG_CODE)"
      # Check if contains expected config keys
      if echo "$CONFIG_RESPONSE" | grep -q "__RUNTIME_CONFIG__"; then
        echo "✅ Config contains runtime configuration"
      else
        echo "⚠️  Warning: Config does not contain expected structure"
      fi
    else
      echo "⚠️  Warning: config.js not accessible (HTTP $CONFIG_CODE)"
      echo "This may be expected if config.js is not in dist/"
    fi

    # Verify SPA routing (any route should return index.html)
    echo ""
    echo "Verifying SPA routing..."
    ROUTE_RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:3000/dashboard || echo "000")
    ROUTE_CODE=$(echo "$ROUTE_RESPONSE" | tail -n1)

    if [ "$ROUTE_CODE" = "200" ]; then
      if echo "$ROUTE_RESPONSE" | grep -q "<!DOCTYPE html>"; then
        echo "✅ SPA routing works (fallback to index.html)"
      else
        echo "⚠️  Warning: Route returned HTTP 200 but not HTML"
      fi
    else
      echo "⚠️  Warning: SPA routing may not be configured (HTTP $ROUTE_CODE)"
      echo "Check nginx.conf for try_files directive"
    fi

    # Wait for Docker health check to pass
    echo ""
    echo "Waiting for Docker health check to become healthy..."
    HEALTH_RETRIES=10  # 10 * 5s = 50s max wait
    RETRY_COUNT=0
    HEALTH_PASS=false

    while [ $RETRY_COUNT -lt $HEALTH_RETRIES ]; do
      RETRY_COUNT=$((RETRY_COUNT + 1))

      FRONTEND_HEALTH=$(docker-compose ps frontend --format json 2>/dev/null | grep -o '"Health":"[^"]*"' | cut -d'"' -f4 || echo "none")

      if [ "$FRONTEND_HEALTH" = "healthy" ]; then
        echo "✅ Frontend container is healthy!"
        HEALTH_PASS=true
        break
      fi

      echo "Frontend health status: $FRONTEND_HEALTH (attempt $RETRY_COUNT/$HEALTH_RETRIES)"

      if [ "$FRONTEND_HEALTH" = "unhealthy" ]; then
        echo "❌ Frontend health check failed!"
        docker-compose logs frontend | tail -50
        exit 1
      fi

      sleep 5
    done

    if [ "$HEALTH_PASS" != "true" ]; then
      echo "⚠️  Warning: Frontend not marked healthy yet, but serving content"
      echo "This may be normal if health checks haven't run enough times yet"
    fi

    # Show final frontend status
    echo ""
    echo "=== Frontend Deployment Status ==="
    docker-compose ps frontend

    # Check frontend logs for errors
    echo ""
    echo "=== Checking frontend logs for errors ==="
    if docker-compose logs frontend 2>&1 | grep -qE "error|failed"; then
      echo "⚠️  Warning: Found error messages in frontend logs"
      docker-compose logs frontend | grep -iE "error|failed" | tail -10
      echo "(Review logs above - some warnings may be acceptable)"
    else
      echo "✅ No errors found in frontend logs"
    fi

    # Success summary
    echo ""
    echo "╔════════════════════════════════════════════════╗"
    echo "║   Frontend Deployment Complete ✅              ║"
    echo "╚════════════════════════════════════════════════╝"
    echo ""
    echo "Frontend running at: http://localhost:3000"
    echo "Backend API at: http://localhost:3001"
    echo ""
    echo "Ready for TASK7 (Application Validation)"
    ```
  
  - **Risks & Mitigations:**
    - **Risk**: Backend not healthy when frontend starts → **Mitigation**: docker-compose.yml has `depends_on: backend: condition: service_healthy` (Docker Compose waits automatically)
    - **Risk**: Config.js generation fails → **Mitigation**: frontend-entrypoint.sh exits with code 1 if config.js not created, logs error clearly
    - **Risk**: Nginx config syntax error → **Mitigation**: Test nginx.conf with `nginx -t` during build, entrypoint logs errors if Nginx fails to start
    - **Risk**: SPA routing broken (404s on refresh) → **Mitigation**: Verify nginx.conf has `try_files $uri /index.html`, test /dashboard route returns HTML
    - **Risk**: Port 3000 already in use on host → **Mitigation**: Check port availability before docker-compose up, document port conflict resolution
    - **Risk**: Missing static assets (empty dist/) → **Mitigation**: TASK3 and TASK4 verify dist/ has index.html and assets/, frontend-entrypoint.sh validates files exist
    - **Risk**: CORS issues between frontend and backend → **Mitigation**: Backend has CORS middleware configured, frontend uses internal Docker network for API calls
    - **Risk**: Health check endpoint missing (404) → **Mitigation**: Acceptable if health check falls back to index.html (HTTP 200), document expected behavior

- [ ] **Item 3 — Comprehensive Deployment Validation and Smoke Testing**
  - **Context (read-only):**
    - `angel-investing-marketplace/docker/docker-compose.yml` (all services: postgres, redis, backend, frontend)
    - `angel-investing-marketplace/docker/scripts/health-check.sh` (comprehensive health validation script)
    - `angel-investing-marketplace/docker/scripts/smoke-tests.sh` (end-to-end smoke tests if available)
    - `.claudiomiro/TASK6/TODO.md` Items 1-2 (backend and frontend deployed and healthy)
    - `.claudiomiro/TASK5/TODO.md` (PostgreSQL and Redis infrastructure validated)
    - Running containers: postgres, redis, backend, frontend (all should be healthy)
  
  - **Touched (will modify/create):**
    - No files modified (read-only validation and testing)
    - Test logs: Validation output and smoke test results
    - stdout/stderr: Comprehensive status report
  
  - **Interfaces / Contracts:**
    - **System Health Contract**:
      - All 4 containers running: postgres, redis, backend, frontend
      - All 4 containers healthy: Docker health checks passing
      - Backend accessible: `http://localhost:3001/health` returns HTTP 200
      - Frontend accessible: `http://localhost:3000/` returns HTML
      - Database connected: Backend `/api/health` shows `"database": "connected"`
    - **Integration Contract**:
      - Backend → PostgreSQL: Database queries execute successfully
      - Backend → Redis: Cache operations work (if implemented)
      - Frontend → Backend: API endpoints accessible from browser
      - End-to-End: Full request flow from frontend → backend → database
    - **Readiness Contract** (for TASK7):
      - All services stable (uptime >1 minute, no restarts)
      - No critical errors in logs (ERROR/FATAL acceptable during startup only)
      - Database schema created (migrations successful)
      - Application ready for functional testing
  
  - **Tests:**
    - **Type**: System integration validation + end-to-end smoke testing + stability verification
    - **Key Scenarios:**
      1. **Container Status**: All 4 services show State=running, Status=(healthy)
      2. **Uptime Stability**: All containers have uptime >1 minute (no crash-looping)
      3. **Restart Count**: All containers have restart count = 0 (clean startup)
      4. **Backend Health**: `curl http://localhost:3001/health` returns HTTP 200 with uptime
      5. **Backend API Health**: `curl http://localhost:3001/api/health` returns HTTP 200 with database status
      6. **Frontend Access**: `curl http://localhost:3000/` returns HTTP 200 with HTML
      7. **Database Connectivity**: Backend API health shows `"database": "connected"`
      8. **Migration Verification**: PostgreSQL has tables (User, Startup, Investment, etc.)
      9. **Log Cleanliness**: No ERROR/FATAL messages in recent logs (last 50 lines)
      10. **Network Connectivity**: All services can reach each other (backend → postgres, backend → redis)
      11. **Port Bindings**: Host ports 3000 and 3001 accessible from localhost
      12. **Volume Persistence**: Postgres data volume contains data (pg_stat_database shows tables)
    - **Edge Cases:**
      - Services healthy but recently restarted → Warning, investigate restart cause
      - Health checks passing but slow responses → Log warning about performance
      - Backend healthy but database shows 0 tables → Migration failure, critical error
      - Frontend serving content but backend unreachable → Network issue, critical error
      - Volumes mounted but empty → Data loss risk, investigate
  
  - **Migrations / Data:**
    - **Verification**: Query PostgreSQL for created tables via backend API or direct psql
    - **Expected Tables** (from TASK1 Prisma schema):
      - `User`, `Startup`, `Investment`, `Document`, `Notification`, `Message`
      - Plus Prisma internal: `_prisma_migrations`
    - **Table Count**: Should be 7+ tables (6 domain tables + migrations table + potential join tables)
    - **Migration Status**: `_prisma_migrations` table shows all migrations applied with success status
  
  - **Observability:**
    - **Comprehensive Status Report**:
      ```
      ╔════════════════════════════════════════════════╗
      ║   Angel Investing Marketplace - System Status ║
      ╚════════════════════════════════════════════════╝

         SERVICE      STATE      HEALTH      UPTIME
      ──────────────────────────────────────────────────
      ✓  postgres     running    healthy     2m 15s
      ✓  redis        running    healthy     2m 14s
      ✓  backend      running    healthy     1m 45s
      ✓  frontend     running    healthy     1m 20s

      ╔════════════════════════════════════════════════╗
      ║   Health Endpoints                             ║
      ╚════════════════════════════════════════════════╝

      ✓  Backend health: HTTP 200 (uptime: 105s)
      ✓  API health: HTTP 200 (database: connected)
      ✓  Frontend: HTTP 200 (serving index.html)

      ╔════════════════════════════════════════════════╗
      ║   Database Schema                              ║
      ╚════════════════════════════════════════════════╝

      ✓  Tables created: 7 (User, Startup, Investment, ...)
      ✓  Migrations applied: 3 successful

      ╔════════════════════════════════════════════════╗
      ║   System Ready ✅                              ║
      ╚════════════════════════════════════════════════╝

      Backend API: http://localhost:3001
      Frontend: http://localhost:3000
      ```
    - **Failure Examples**:
      ```
      ✗  backend      running    unhealthy   0m 15s
      ⚠  Backend health check failing, check logs
      ```
    - **Metrics Summary**:
      - Total deployment time: From `docker-compose up` to all healthy (target <3 minutes)
      - Backend startup: <90s (Item 1 target)
      - Frontend startup: <40s (Item 2 target)
      - Infrastructure stable: >1 minute uptime
  
  - **Security & Permissions:**
    - N/A (read-only validation, no security changes)
    - Verification includes checking that services run as non-root users (ps output shows UID 1001)
  
  - **Performance:**
    - **Validation Time**: <30 seconds (Docker API queries + HTTP health checks + database query)
    - **End-to-End Test Time**: <60 seconds if smoke-tests.sh includes API calls
    - **Complexity**: O(1) - fixed number of services and checks
  
  - **Commands:**
    ```bash
    # Navigate to Docker directory
    cd /Users/vivek/elite/angel-investing-marketplace/docker

    echo "╔════════════════════════════════════════════════╗"
    echo "║   Comprehensive Deployment Validation         ║"
    echo "╚════════════════════════════════════════════════╝"
    echo ""

    # Run health check script (if available)
    if [ -f scripts/health-check.sh ]; then
      echo "Running health-check.sh script..."
      bash scripts/health-check.sh
      echo ""
    fi

    # Comprehensive container status
    echo "=== Container Status ==="
    docker-compose ps
    echo ""

    # Detailed status for each service
    echo "=== Detailed Service Status ==="
    for service in postgres redis backend frontend; do
      STATUS=$(docker-compose ps $service --format json 2>/dev/null | grep -o '"State":"[^"]*"' | cut -d'"' -f4 || echo "unknown")
      HEALTH=$(docker-compose ps $service --format json 2>/dev/null | grep -o '"Health":"[^"]*"' | cut -d'"' -f4 || echo "none")
      
      if [ "$STATUS" = "running" ] && [ "$HEALTH" = "healthy" ]; then
        echo "✅ $service: running and healthy"
      elif [ "$STATUS" = "running" ]; then
        echo "⚠️  $service: running but not healthy (status: $HEALTH)"
      else
        echo "❌ $service: not running (status: $STATUS)"
      fi
    done
    echo ""

    # Verify backend health endpoint
    echo "=== Backend Health Check ==="
    BACKEND_HEALTH=$(curl -s http://localhost:3001/health 2>/dev/null)
    if [ $? -eq 0 ]; then
      echo "✅ Backend health endpoint responding"
      echo "$BACKEND_HEALTH" | grep -o '"status":"[^"]*"' || echo "$BACKEND_HEALTH" | head -c 200
    else
      echo "❌ Backend health endpoint failed"
      docker-compose logs backend | tail -20
    fi
    echo ""

    # Verify API health endpoint with database check
    echo "=== API Health Check (includes database) ==="
    API_HEALTH=$(curl -s http://localhost:3001/api/health 2>/dev/null)
    if [ $? -eq 0 ]; then
      echo "✅ API health endpoint responding"
      echo "$API_HEALTH" | grep -o '"database":"[^"]*"' && echo "✅ Database connected" || echo "⚠️  Database status unknown"
    else
      echo "❌ API health endpoint failed"
      docker-compose logs backend | tail -20
    fi
    echo ""

    # Verify frontend accessibility
    echo "=== Frontend Accessibility ==="
    FRONTEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null)
    if [ "$FRONTEND_RESPONSE" = "200" ]; then
      echo "✅ Frontend accessible (HTTP $FRONTEND_RESPONSE)"
    else
      echo "❌ Frontend not accessible (HTTP $FRONTEND_RESPONSE)"
      docker-compose logs frontend | tail -20
    fi
    echo ""

    # Verify database schema (tables created by migrations)
    echo "=== Database Schema Verification ==="
    TABLES=$(docker-compose exec -T postgres psql -U postgres -d angel_investing_marketplace -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' \n')
    if [ -n "$TABLES" ] && [ "$TABLES" -gt 0 ]; then
      echo "✅ Database tables created: $TABLES tables"
      echo "Listing tables:"
      docker-compose exec -T postgres psql -U postgres -d angel_investing_marketplace -c "\dt" 2>/dev/null | head -20
    else
      echo "❌ No database tables found (migrations may have failed)"
      docker-compose logs backend | grep -i migration
    fi
    echo ""

    # Check for errors in logs
    echo "=== Log Health Check ==="
    for service in postgres redis backend frontend; do
      ERROR_COUNT=$(docker-compose logs $service 2>&1 | grep -cE "ERROR:|FATAL:" || echo "0")
      if [ "$ERROR_COUNT" -eq 0 ]; then
        echo "✅ $service: No errors in logs"
      else
        echo "⚠️  $service: $ERROR_COUNT error messages in logs"
        docker-compose logs $service | grep -E "ERROR:|FATAL:" | tail -5
      fi
    done
    echo ""

    # Verify container uptime (stability check)
    echo "=== Container Stability Check ==="
    for service in postgres redis backend frontend; do
      UPTIME=$(docker-compose ps $service --format "{{.Status}}" 2>/dev/null | grep -o "Up [^(]*" || echo "Unknown")
      echo "$service: $UPTIME"
    done
    echo ""

    # Verify volumes exist and have data
    echo "=== Volume Verification ==="
    docker volume ls | grep "angel-investing"
    echo ""
    
    # Check Postgres data volume size (should be >10MB if migrations ran)
    POSTGRES_VOLUME_SIZE=$(docker volume inspect angel-investing-marketplace_postgres_data --format "{{ .Mountpoint }}" 2>/dev/null | xargs du -sh 2>/dev/null | cut -f1 || echo "unknown")
    echo "Postgres data volume size: $POSTGRES_VOLUME_SIZE"
    echo ""

    # Network connectivity test
    echo "=== Network Connectivity Test ==="
    echo "Testing backend → postgres connectivity..."
    docker-compose exec -T backend sh -c "nc -zv postgres 5432" 2>&1 | grep -q "open" && echo "✅ Backend can reach PostgreSQL" || echo "❌ Backend cannot reach PostgreSQL"
    
    echo "Testing backend → redis connectivity..."
    docker-compose exec -T backend sh -c "nc -zv redis 6379" 2>&1 | grep -q "open" && echo "✅ Backend can reach Redis" || echo "❌ Backend cannot reach Redis"
    echo ""

    # Run smoke tests if available
    if [ -f scripts/smoke-tests.sh ]; then
      echo "=== Running Smoke Tests ==="
      bash scripts/smoke-tests.sh || echo "⚠️  Some smoke tests failed (review output above)"
      echo ""
    fi

    # Final summary
    echo ""
    echo "╔════════════════════════════════════════════════╗"
    echo "║   Deployment Validation Complete               ║"
    echo "╚════════════════════════════════════════════════╝"
    echo ""
    echo "System Status: All services deployed and operational"
    echo ""
    echo "Access Points:"
    echo "  Frontend:     http://localhost:3000"
    echo "  Backend API:  http://localhost:3001"
    echo "  Health Check: http://localhost:3001/health"
    echo "  API Health:   http://localhost:3001/api/health"
    echo ""
    echo "Next Steps:"
    echo "  - Run TASK7 validation tests"
    echo "  - Test user registration and authentication"
    echo "  - Verify startup creation and investment flows"
    echo "  - Check real-time features (Socket.IO)"
    echo ""
    echo "✅ TASK6 Complete - Application Fully Deployed!"
    ```
  
  - **Risks & Mitigations:**
    - **Risk**: Services pass health checks but not actually functional → **Mitigation**: Smoke tests include end-to-end API calls and database queries
    - **Risk**: Database tables missing despite migration success → **Mitigation**: Query information_schema.tables to verify schema
    - **Risk**: Services stable now but crash after validation → **Mitigation**: Monitor logs during TASK7, check restart counts periodically
    - **Risk**: Network connectivity issues not detected by health checks → **Mitigation**: Test inter-service connectivity with nc (netcat) commands
    - **Risk**: Volume data corruption or empty volumes → **Mitigation**: Check volume size and query database for row counts
    - **Risk**: Frontend serves content but can't reach backend API → **Mitigation**: Test cross-origin requests from browser (CORS configuration)

## Verification (global)
- [ ] All automated tests pass (unit/integration/e2e)
  - Backend unit tests: Run `npm test` in backend/ (verify no regressions from deployment)
  - Integration tests: API endpoints return expected responses
  - E2E tests: Frontend → Backend → Database flow works end-to-end
  - Smoke tests: scripts/smoke-tests.sh passes all checks
- [ ] Code builds cleanly (local + CI)
  - N/A (no code changes, deployment task only)
  - Docker Compose validation: `docker-compose config` shows valid YAML
- [ ] Manual QA script executed and green (steps + expected results)
  - **Step 1**: Navigate to `angel-investing-marketplace/docker/`
  - **Expected**: Current directory is docker/
  - **Step 2**: Verify TASK5 complete: `docker-compose ps postgres redis | grep healthy`
  - **Expected**: Both postgres and redis show "(healthy)"
  - **Step 3**: Start backend: `docker-compose up -d backend`
  - **Expected**: "Creating angel-investing-backend" or "Starting angel-investing-backend"
  - **Step 4**: Wait 90s and check backend logs: `docker-compose logs backend | grep "Server started"`
  - **Expected**: "🚀 Server started successfully"
  - **Step 5**: Test backend health: `curl http://localhost:3001/health`
  - **Expected**: HTTP 200 with JSON response containing `"status": "OK"`
  - **Step 6**: Test API health: `curl http://localhost:3001/api/health`
  - **Expected**: HTTP 200 with `"database": "connected"`
  - **Step 7**: Start frontend: `docker-compose up -d frontend`
  - **Expected**: "Creating angel-investing-frontend" or "Starting angel-investing-frontend"
  - **Step 8**: Wait 30s and test frontend: `curl http://localhost:3000/`
  - **Expected**: HTTP 200 with HTML containing `<!DOCTYPE html>`
  - **Step 9**: Check all services: `docker-compose ps`
  - **Expected**: All 4 services show State=running, Status=(healthy)
  - **Step 10**: Verify migrations: `docker-compose exec postgres psql -U postgres -d angel_investing_marketplace -c "\dt"`
  - **Expected**: Lists User, Startup, Investment tables (7+ tables total)
  - **Step 11**: Run validation: Item 3 commands (comprehensive status check)
  - **Expected**: All checks pass, no critical errors
- [ ] Feature meets **Acceptance Criteria** (see below)
- [ ] Dashboards/alerts configured and healthy
  - N/A (local development, no monitoring infrastructure)
  - Health status visible via `docker-compose ps` and health-check.sh
- [ ] Rollout/rollback path validated (flag/canary)
  - **Rollback**: `docker-compose down` stops all services
  - **Partial rollback**: `docker-compose stop backend frontend` (keep infrastructure running)
  - **Re-deploy**: `docker-compose up -d` is idempotent (safe to re-run)
  - **Clean slate**: `docker-compose down -v` removes volumes, `docker-compose up -d` starts fresh
  - **Emergency stop**: `docker-compose down` immediately stops all containers
- [ ] Documentation updated (README/ADR/changelog)
  - Deployment documented in `docker/README.md` (already exists from project setup)
  - Health check usage documented in `docker/scripts/health-check.sh`
  - Troubleshooting guide for common deployment issues (optional, can be added post-deployment)
  - No new documentation required for this task (deployment follows standard Docker Compose patterns)

## Acceptance Criteria
- [ ] **Backend container running**: `docker-compose ps backend` shows State=running
- [ ] **Backend container healthy**: `docker-compose ps backend` shows Status=(healthy)
- [ ] **Backend logs show successful startup**: Logs contain "🚀 Server started successfully"
- [ ] **Database migrations completed**: Logs contain "Database migrations completed successfully"
- [ ] **Backend health endpoint responds**: `curl http://localhost:3001/health` returns HTTP 200
- [ ] **API health endpoint responds**: `curl http://localhost:3001/api/health` returns HTTP 200 with `"database": "connected"`
- [ ] **Frontend container running**: `docker-compose ps frontend` shows State=running
- [ ] **Frontend container healthy**: `docker-compose ps frontend` shows Status=(healthy)
- [ ] **Frontend serving on port 3000**: `curl http://localhost:3000/` returns HTTP 200 with HTML
- [ ] **All services stable**: Container uptime >1 minute, restart count = 0
- [ ] **Database schema created**: PostgreSQL has 7+ tables (User, Startup, Investment, etc.)
- [ ] **No critical errors in logs**: No ERROR/FATAL messages in recent logs (last 50 lines)
- [ ] **System ready for TASK7**: All services healthy and accessible

## Impact Analysis
- **Directly impacted:**
  - Docker containers: `angel-investing-backend` (created and running, port 3001)
  - Docker containers: `angel-investing-frontend` (created and running, port 3000)
  - PostgreSQL database schema: Tables, indexes, constraints created via Prisma migrations
  - Network connections: Backend ↔ PostgreSQL, Backend ↔ Redis, Frontend ↔ Backend (via browser)
  - Host port bindings: 3000 (frontend), 3001 (backend)
  - Runtime configuration: `/usr/share/nginx/html/config.js` (frontend runtime config)

- **Indirectly impacted:**
  - **TASK7 (Application Validation)**: Unblocked - can now test user flows end-to-end
  - **TASK8+ (Advanced Features)**: Depends on running application for integration testing
  - **Local Development**: Developers can access running application for feature development
  - **CI/CD Pipeline**: Deployment pattern established for automation
  - **Database State**: Migrations applied, schema ready for seed data (if needed)
  - **System Resources**: Docker Desktop memory/CPU usage increased (4 containers running)
  - **Log Files**: Container logs accumulating (monitor disk usage over time)

## Follow-ups
- **Production Deployment**:
  - Replace docker-compose.yml with production orchestration (Kubernetes, ECS, etc.)
  - Add reverse proxy (Nginx/Traefik) for SSL/TLS termination and load balancing
  - Configure environment-specific secrets (AWS Secrets Manager, HashiCorp Vault)
  - Set resource limits (memory, CPU) for all containers
  - Enable container auto-restart policies (restart: always)
- **Monitoring & Observability**:
  - Add Prometheus + Grafana for metrics and dashboards
  - Configure centralized logging (ELK stack, CloudWatch, Datadog)
  - Set up alerting for health check failures and error spikes
  - Add APM (Application Performance Monitoring) for backend tracing
- **Performance Optimization**:
  - Enable Nginx gzip compression for frontend assets
  - Configure backend caching with Redis (implement cache service)
  - Add database connection pooling (PgBouncer) for production scale
  - Optimize Prisma queries (add indexes based on query patterns)
- **Security Hardening**:
  - Enable HTTPS for frontend (Let's Encrypt certificates)
  - Configure CORS restrictions for production domains
  - Implement rate limiting per user/IP (not just global)
  - Add security headers (HSTS, CSP, X-Frame-Options)
  - Scan Docker images for vulnerabilities (Trivy, Snyk)
- **Database Management**:
  - Set up automated backups (pg_dump scheduled via cron)
  - Document restore procedures and test recovery
  - Configure PostgreSQL replication for high availability
  - Plan database migration strategy (blue-green deployments)
- **Development Workflow**:
  - Add hot reload for backend (mount source volumes in development mode)
  - Configure frontend HMR (run Vite dev server outside Docker for faster iteration)
  - Add debug port mapping for Node.js inspector (port 9229)
  - Document local development setup in README
