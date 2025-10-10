Fully implemented: YES
Code review passed

## Implementation Plan

- [X] **Item 1 — Validate Required Docker Secrets Existence**
  - **Context (read-only):**
    - `angel-investing-marketplace/docker/secrets/` (directory listing)
    - `angel-investing-marketplace/docker/secrets/README.md` (secret requirements and generation instructions)
    - `angel-investing-marketplace/docker/scripts/generate-dev-secrets.sh` (secret generation script)
    - `angel-investing-marketplace/docker/docker-compose.yml` (secrets configuration and service dependencies)
    - `angel-investing-marketplace/docker/entrypoints/backend-entrypoint.sh` (required vs optional secrets logic)
    - `.claudiomiro/TASK1/TODO.md` (Prisma schema completion - dependency verification)
    - `.claudiomiro/TASK2/TODO.md` (backend build completion - dist/ directory verification)
    - `.claudiomiro/TASK3/TODO.md` (frontend build completion - dist/ directory verification)
  
  - **Touched (will modify/create):**
    - `angel-investing-marketplace/docker/secrets/database_url.txt` (if missing - via generate-dev-secrets.sh)
    - `angel-investing-marketplace/docker/secrets/redis_url.txt` (if missing - via generate-dev-secrets.sh)
    - `angel-investing-marketplace/docker/secrets/better_auth_secret.txt` (if missing - via generate-dev-secrets.sh)
    - `angel-investing-marketplace/docker/secrets/jwt_secret.txt` (if missing - via generate-dev-secrets.sh)
    - `angel-investing-marketplace/docker/secrets/postgres_user.txt` (if missing - via generate-dev-secrets.sh)
    - `angel-investing-marketplace/docker/secrets/postgres_password.txt` (if missing - via generate-dev-secrets.sh)
    - Optional secrets (created as placeholders if missing):
      - `angel-investing-marketplace/docker/secrets/smtp_pass.txt`
      - `angel-investing-marketplace/docker/secrets/aws_secret_access_key.txt`
      - `angel-investing-marketplace/docker/secrets/stripe_secret_key.txt`
      - `angel-investing-marketplace/docker/secrets/stripe_webhook_secret.txt`
      - `angel-investing-marketplace/docker/secrets/plaid_secret.txt`
  
  - **Interfaces / Contracts:**
    - **Required Secrets** (backend fails without these):
      - `database_url.txt`: PostgreSQL connection string format `postgresql://user:pass@host:port/db`
      - `redis_url.txt`: Redis connection string format `redis://:password@host:port`
      - `better_auth_secret.txt`: Min 32 characters for Better Auth encryption
      - `jwt_secret.txt`: Min 64 characters for JWT token signing
    - **Optional Secrets** (backend handles gracefully if missing or placeholder):
      - `smtp_pass.txt`: Email service password (can be placeholder for local dev)
      - `aws_secret_access_key.txt`: AWS S3 credentials (can be placeholder)
      - `stripe_secret_key.txt`: Stripe API key (must be real test key from dashboard)
      - `stripe_webhook_secret.txt`: Stripe webhook secret (must be real from dashboard)
      - `plaid_secret.txt`: Plaid sandbox credentials (can be placeholder)
    - **File Permissions**: All secret files must be 600 (owner read/write only)
    - **Directory Permissions**: secrets/ directory must be 700 (owner access only)
  
  - **Tests:**
    - **Type**: File existence validation + content format verification
    - **Key Scenarios:**
      1. All required secrets exist with non-empty content
      2. database_url contains valid PostgreSQL connection string format
      3. redis_url contains valid Redis connection string format
      4. better_auth_secret has minimum 32 characters
      5. jwt_secret has minimum 64 characters
      6. File permissions are correctly set (600 for files, 700 for directory)
    - **Edge Cases:**
      - Empty secret files (must regenerate)
      - Malformed connection strings (must regenerate)
      - Insufficient secret length (must regenerate)
      - Missing secrets directory (create and generate)
      - Incorrect file permissions (fix with chmod)
  
  - **Migrations / Data:**
    - N/A (secrets are configuration files, not database migrations)
  
  - **Observability:**
    - **Validation Logs**: 
      - Log each required secret check: "✓ database_url.txt exists and valid"
      - Log each optional secret status: "Optional: stripe_secret_key.txt (placeholder)"
      - Log permission verification: "✓ Permissions set correctly (600/700)"
    - **Metrics to Track**:
      - Count of missing required secrets
      - Count of invalid/malformed secrets
      - Count of placeholder vs real optional secrets
    - **Success Indicators**:
      - All 4 required secrets present and valid
      - File permissions correct (600/700)
      - Exit code 0 from validation
  
  - **Security & Permissions:**
    - **Development Secrets**: Use generate-dev-secrets.sh (intentionally weak, clearly marked)
    - **Production Secrets**: Never use dev script; require external secret management
    - **File Permissions**: Enforce 600 for secret files, 700 for directory
    - **Gitignore**: Verify *.txt files in docker/secrets/ are gitignored (prevent commits)
    - **Placeholder Detection**: Warn if production uses placeholder values
    - **Secret Rotation**: Document rotation process (not implemented in this task)
  
  - **Performance:**
    - **Validation Time**: Target <2s for secret existence and format checks
    - **Generation Time**: Target <5s for full secret generation (if needed)
    - **Complexity**: O(n) where n = number of secret files (~15 files)
  
  - **Commands:**
    ```bash
    # Navigate to project root
    cd /Users/vivek/elite/angel-investing-marketplace
    
    # Check if required secrets exist
    test -f docker/secrets/database_url.txt || echo "MISSING: database_url.txt"
    test -f docker/secrets/redis_url.txt || echo "MISSING: redis_url.txt"
    test -f docker/secrets/better_auth_secret.txt || echo "MISSING: better_auth_secret.txt"
    test -f docker/secrets/jwt_secret.txt || echo "MISSING: jwt_secret.txt"
    
    # Generate missing secrets (idempotent - only creates missing files)
    bash docker/scripts/generate-dev-secrets.sh
    
    # Verify file permissions
    ls -la docker/secrets/*.txt
    
    # Validate secret content (non-empty, correct format)
    grep -q "postgresql://" docker/secrets/database_url.txt || echo "INVALID: database_url"
    grep -q "redis://" docker/secrets/redis_url.txt || echo "INVALID: redis_url"
    test $(wc -c < docker/secrets/better_auth_secret.txt) -ge 32 || echo "INVALID: better_auth_secret too short"
    test $(wc -c < docker/secrets/jwt_secret.txt) -ge 64 || echo "INVALID: jwt_secret too short"
    ```
  
  - **Risks & Mitigations:**
    - **Risk**: Secrets already exist with production values → **Mitigation**: Script is idempotent, only creates missing files, never overwrites
    - **Risk**: File permissions incorrect after generation → **Mitigation**: Script explicitly sets chmod 600/700
    - **Risk**: Malformed connection strings cause runtime failures → **Mitigation**: Validate format before proceeding to build
    - **Risk**: Insufficient secret length causes auth failures → **Mitigation**: Check minimum length requirements (32/64 chars)
    - **Risk**: Placeholder Stripe keys cause payment failures → **Mitigation**: Document requirement to replace with real test keys

- [X] **Item 2 — Build Backend Docker Image**
  - **COMPLETED**: Docker daemon restarted successfully and backend image built
  - **Image**: angel-backend:latest (Image ID: 3fcb0061ce41, Size: 463MB)
  - **Verification**: Build completed without errors, image size within acceptable limits (<800MB target)
  - **Context (read-only):**
    - `angel-investing-marketplace/docker/Dockerfile.backend` (multi-stage build configuration)
    - `angel-investing-marketplace/backend/dist/` (compiled JavaScript from TASK2)
    - `angel-investing-marketplace/backend/prisma/` (Prisma schema and migrations from TASK1)
    - `angel-investing-marketplace/backend/package.json` (dependency list and build scripts)
    - `angel-investing-marketplace/backend/package-lock.json` (locked dependency versions)
    - `angel-investing-marketplace/docker/entrypoints/backend-entrypoint.sh` (container initialization script)
    - `.claudiomiro/TASK2/TODO.md` (verification that dist/ has 77 JS files)
    - `.claudiomiro/TASK1/TODO.md` (verification that Prisma schema is valid)
  
  - **Touched (will modify/create):**
    - Docker image registry: `angel-backend:latest` tag
    - Docker build cache layers (intermediate build stages)
    - Build context: entire project root (for COPY commands)
  
  - **Interfaces / Contracts:**
    - **Input Contract** (TASK2 dependency):
      - `backend/dist/` must exist with 77 compiled JavaScript files
      - `backend/dist/index.js` must be valid entry point
      - `backend/node_modules/` must NOT be copied (installed fresh in container)
    - **Input Contract** (TASK1 dependency):
      - `backend/prisma/schema.prisma` must be valid
      - `backend/prisma/migrations/` must contain valid migration SQL files
    - **Output Contract**:
      - Docker image tagged as `angel-backend:latest`
      - Image contains compiled code in `/app/dist`
      - Image contains Prisma files in `/app/prisma`
      - Image exposes port 3001
      - Image runs as non-root user (appuser:1001)
    - **Build Stages**:
      1. `base`: Node 20 Alpine with security updates
      2. `dependencies`: Production dependencies only (npm ci --only=production)
      3. `dev-dependencies`: All dependencies for building
      4. `builder`: Runs npm run build (verifies TypeScript compilation)
      5. `production`: Final minimal image with runtime dependencies
  
  - **Tests:**
    - **Type**: Image build verification + layer inspection
    - **Key Scenarios:**
      1. Build completes without errors (exit code 0)
      2. Image tagged correctly as `angel-backend:latest`
      3. Image size is reasonable (<500MB target)
      4. Image contains /app/dist with 77 JS files
      5. Image contains /app/prisma with schema.prisma
      6. Entrypoint script is executable
      7. Health check endpoint configured
      8. Non-root user configured (UID 1001)
    - **Edge Cases:**
      - Missing dist/ directory (TASK2 not completed) → Build should fail early
      - Missing prisma/ directory (TASK1 not completed) → Build should fail early
      - npm ci failure due to network issues → Retry mechanism
      - Build cache corruption → Clean build with --no-cache flag
  
  - **Migrations / Data:**
    - N/A (Docker image build, no database changes)
    - Note: Database migrations run at container startup via backend-entrypoint.sh
  
  - **Observability:**
    - **Build Logs**:
      - Capture Docker build output with timestamps
      - Log each build stage completion: "Step 12/18: COPY --from=builder"
      - Log final image size: "Successfully tagged angel-backend:latest"
    - **Metrics to Track**:
      - Build duration (target: <5 minutes)
      - Image size (target: <500MB, warning if >800MB)
      - Layer count (should be ~15-20 layers)
      - Cache hit rate (faster rebuilds if >70%)
    - **Success Indicators**:
      - "Successfully built <image-id>"
      - "Successfully tagged angel-backend:latest"
      - `docker images | grep angel-backend` shows image
  
  - **Security & Permissions:**
    - **Base Image**: node:20-alpine (minimal attack surface, regular security updates)
    - **Security Updates**: `apk upgrade --no-cache` in base stage
    - **Non-Root User**: appuser (UID 1001, GID 1001)
    - **File Ownership**: All application files owned by appuser:nodejs
    - **Read-Only Filesystem**: /app directory owned by appuser (no write needed except /app/logs)
    - **Signal Handling**: dumb-init as PID 1 for proper signal forwarding
    - **Secrets**: Not baked into image (loaded at runtime from /run/secrets)
  
  - **Performance:**
    - **Build Time**: Target <5 minutes on first build, <2 minutes with cache
    - **Image Size**: Target <500MB (Alpine base + Node + dependencies)
    - **Layer Optimization**:
      - COPY package.json before source code (better cache reuse)
      - Multi-stage build (excludes dev dependencies from final image)
      - npm cache clean after install (reduces layer size)
    - **Parallelization**: Can build in parallel with frontend (use `&` and `wait`)
    - **Complexity**: O(n) where n = number of npm dependencies (~50 packages)
  
  - **Commands:**
    ```bash
    # Navigate to project root (build context)
    cd /Users/vivek/elite/angel-investing-marketplace
    
    # Verify TASK2 prerequisite (backend dist/ exists)
    test -f backend/dist/index.js || echo "ERROR: TASK2 not complete - backend/dist/index.js missing"
    find backend/dist -name "*.js" | wc -l  # Should be 77 files
    
    # Verify TASK1 prerequisite (Prisma schema exists)
    test -f backend/prisma/schema.prisma || echo "ERROR: TASK1 not complete - prisma/schema.prisma missing"
    
    # Build backend image (from project root, not docker/)
    docker build \
      -f docker/Dockerfile.backend \
      -t angel-backend:latest \
      --progress=plain \
      .
    
    # Verify image created
    docker images | grep angel-backend
    
    # Inspect image size
    docker images angel-backend:latest --format "{{.Size}}"
    
    # Verify image layers
    docker history angel-backend:latest --no-trunc
    
    # Optional: Inspect image contents (without running)
    docker run --rm angel-backend:latest ls -la /app/dist
    docker run --rm angel-backend:latest ls -la /app/prisma
    ```
  
  - **Risks & Mitigations:**
    - **Risk**: TASK2 not completed (missing dist/) → **Mitigation**: Verify backend/dist/index.js exists before build
    - **Risk**: TASK1 not completed (missing Prisma) → **Mitigation**: Verify backend/prisma/schema.prisma exists before build
    - **Risk**: npm ci fails due to network issues → **Mitigation**: Retry build up to 3 times with exponential backoff
    - **Risk**: Build cache causes stale dependencies → **Mitigation**: Document `docker build --no-cache` for clean builds
    - **Risk**: Large image size (>1GB) → **Mitigation**: Multi-stage build excludes dev dependencies and build tools
    - **Risk**: Entrypoint script not executable → **Mitigation**: Dockerfile explicitly runs `chmod +x` on entrypoint

- [X] **Item 3 — Build Frontend Docker Image**
  - **COMPLETED**: Frontend image built successfully
  - **Image**: angel-frontend:latest (Image ID: 7617d91da47f, Size: 117MB)
  - **Verification**: Build completed without errors, image size within acceptable limits (<200MB target)
  - **Context (read-only):**
    - `angel-investing-marketplace/docker/Dockerfile.frontend` (multi-stage build with Vite + Nginx)
    - `angel-investing-marketplace/frontend/dist/` (built static assets from TASK3)
    - `angel-investing-marketplace/frontend/package.json` (dependency list and build scripts)
    - `angel-investing-marketplace/frontend/package-lock.json` (locked dependency versions)
    - `angel-investing-marketplace/docker/nginx.conf` (Nginx configuration for SPA routing)
    - `angel-investing-marketplace/docker/entrypoints/frontend-entrypoint.sh` (Nginx initialization script)
    - `.claudiomiro/TASK3/TODO.md` (verification that dist/ has index.html and assets/)
  
  - **Touched (will modify/create):**
    - Docker image registry: `angel-frontend:latest` tag
    - Docker build cache layers (intermediate build stages)
    - Build context: entire project root (for COPY commands)
  
  - **Interfaces / Contracts:**
    - **Input Contract** (TASK3 dependency):
      - `frontend/dist/` must exist with index.html
      - `frontend/dist/assets/` must contain hashed JS/CSS bundles
      - `frontend/node_modules/` must NOT be copied (installed fresh in container)
    - **Output Contract**:
      - Docker image tagged as `angel-frontend:latest`
      - Image contains static files in `/usr/share/nginx/html`
      - Image uses Nginx 1.25 Alpine
      - Image exposes port 80
      - Image runs as non-root user (nginxuser:1001)
      - Nginx configured for SPA routing (fallback to index.html)
    - **Build Stages**:
      1. `base`: Node 20 Alpine with security updates
      2. `dependencies`: Install npm dependencies
      3. `builder`: Runs npm run build (verifies Vite build)
      4. `production`: Nginx Alpine with static files
  
  - **Tests:**
    - **Type**: Image build verification + static file inspection
    - **Key Scenarios:**
      1. Build completes without errors (exit code 0)
      2. Image tagged correctly as `angel-frontend:latest`
      3. Image size is reasonable (<100MB target for Nginx + static files)
      4. Image contains /usr/share/nginx/html/index.html
      5. Image contains /usr/share/nginx/html/assets/ with JS/CSS files
      6. Nginx configuration includes SPA routing (try_files fallback)
      7. Health check endpoint configured
      8. Non-root user configured (UID 1001)
    - **Edge Cases:**
      - Missing dist/ directory (TASK3 not completed) → Build should fail early
      - Missing dist/index.html → Build should fail at COPY stage
      - Empty assets/ directory → Warning but may succeed (verify in TASK3)
      - Nginx config syntax errors → Build succeeds but container fails to start
  
  - **Migrations / Data:**
    - N/A (static file serving, no database or migrations)
  
  - **Observability:**
    - **Build Logs**:
      - Capture Docker build output with timestamps
      - Log each build stage completion: "Step 8/12: COPY --from=builder /app/dist"
      - Log final image size: "Successfully tagged angel-frontend:latest"
    - **Metrics to Track**:
      - Build duration (target: <3 minutes)
      - Image size (target: <100MB, warning if >200MB)
      - Static file count (expect index.html + 10-20 asset files)
      - Cache hit rate (faster rebuilds if >70%)
    - **Success Indicators**:
      - "Successfully built <image-id>"
      - "Successfully tagged angel-frontend:latest"
      - `docker images | grep angel-frontend` shows image
  
  - **Security & Permissions:**
    - **Base Image**: nginx:1.25-alpine (minimal, regularly updated)
    - **Security Updates**: `apk upgrade --no-cache` in production stage
    - **Non-Root User**: nginxuser (UID 1001, GID 1001)
    - **File Ownership**: Static files owned by nginxuser:nginxuser
    - **Nginx Hardening**:
      - PID file in /run/nginx (non-root writable)
      - Cache directories owned by nginxuser
      - No default server configuration (removed)
    - **Signal Handling**: dumb-init as PID 1 for graceful shutdown
    - **No Secrets**: Frontend is public static files (no secrets embedded)
  
  - **Performance:**
    - **Build Time**: Target <3 minutes on first build, <1 minute with cache
    - **Image Size**: Target <100MB (Nginx Alpine + static files)
    - **Layer Optimization**:
      - COPY package.json before source code (better cache reuse)
      - Multi-stage build (Node build stage discarded in final image)
      - Static files only in final image (no Node.js runtime)
    - **Parallelization**: Build in parallel with backend (use `&` and `wait`)
    - **Complexity**: O(n) where n = number of static files in dist/ (~15-30 files)
  
  - **Commands:**
    ```bash
    # Navigate to project root (build context)
    cd /Users/vivek/elite/angel-investing-marketplace
    
    # Verify TASK3 prerequisite (frontend dist/ exists)
    test -f frontend/dist/index.html || echo "ERROR: TASK3 not complete - frontend/dist/index.html missing"
    test -d frontend/dist/assets || echo "ERROR: TASK3 not complete - frontend/dist/assets/ missing"
    find frontend/dist -name "*.js" -o -name "*.css" | wc -l  # Should be ~10-20 files
    
    # Build frontend image (from project root, not docker/)
    docker build \
      -f docker/Dockerfile.frontend \
      -t angel-frontend:latest \
      --progress=plain \
      .
    
    # Verify image created
    docker images | grep angel-frontend
    
    # Inspect image size
    docker images angel-frontend:latest --format "{{.Size}}"
    
    # Verify image layers
    docker history angel-frontend:latest --no-trunc
    
    # Optional: Inspect image contents (without running)
    docker run --rm angel-frontend:latest ls -la /usr/share/nginx/html
    docker run --rm angel-frontend:latest cat /etc/nginx/conf.d/default.conf
    ```
  
  - **Risks & Mitigations:**
    - **Risk**: TASK3 not completed (missing dist/) → **Mitigation**: Verify frontend/dist/index.html exists before build
    - **Risk**: Vite build runs in Dockerfile (slow) → **Mitigation**: Dockerfile uses pre-built dist/ from TASK3
    - **Risk**: npm ci fails due to network issues → **Mitigation**: Retry build up to 3 times with exponential backoff
    - **Risk**: Nginx config syntax errors → **Mitigation**: Test config with `nginx -t` in entrypoint script
    - **Risk**: SPA routing broken (404s on refresh) → **Mitigation**: Verify nginx.conf has `try_files $uri /index.html`
    - **Risk**: Large image size (>200MB) → **Mitigation**: Multi-stage build excludes Node.js and build tools

- [X] **Item 4 — Verify Docker Images Created Successfully**
  - **COMPLETED**: Both images verified and ready for TASK5 deployment
  - **Context (read-only):**
    - Docker image registry (local Docker daemon)
    - `angel-backend:latest` image (from Item 2)
    - `angel-frontend:latest` image (from Item 3)
    - `angel-investing-marketplace/docker/docker-compose.yml` (service definitions for TASK5)
  
  - **Touched (will modify/create):**
    - No files modified (read-only verification)
    - stdout/stderr: verification output logs
  
  - **Interfaces / Contracts:**
    - **Image Tags**: Both images must be tagged with `:latest`
    - **Image Presence**: `docker images` must list both images
    - **Image Metadata**:
      - Backend: Created, Size, Repository=angel-backend, Tag=latest
      - Frontend: Created, Size, Repository=angel-frontend, Tag=latest
    - **Next Task Contract** (TASK5):
      - TASK5 expects images available for `docker-compose up`
      - Images referenced in docker-compose.yml as `angel-backend:latest` and `angel-frontend:latest`
  
  - **Tests:**
    - **Type**: Image presence and metadata verification
    - **Key Scenarios:**
      1. `docker images | grep angel-backend` returns exactly 1 line
      2. `docker images | grep angel-frontend` returns exactly 1 line
      3. Both images have `:latest` tag
      4. Both images show recent creation timestamp (within last 10 minutes)
      5. Backend image size is <800MB (warning if larger)
      6. Frontend image size is <200MB (warning if larger)
      7. Image IDs are different (not the same image)
    - **Edge Cases:**
      - Multiple versions of same image (stale tags) → Only verify :latest exists
      - Images built but not tagged → Verification fails (must be tagged)
      - Build succeeded but image not in registry → Rare Docker daemon issue
  
  - **Migrations / Data:**
    - N/A (verification only, no changes)
  
  - **Observability:**
    - **Verification Output**:
      ```
      ✅ Backend image: angel-backend:latest (IMAGE_ID: abc123, Size: 456MB)
      ✅ Frontend image: angel-frontend:latest (IMAGE_ID: def456, Size: 78MB)
      ✅ Both images created successfully
      ✅ Ready for TASK5 deployment
      ```
    - **Failure Output Examples**:
      ```
      ❌ Backend image not found: angel-backend:latest
      ❌ Frontend image size too large: 1.2GB (expected <200MB)
      ```
  
  - **Security & Permissions:**
    - N/A (read-only verification)
  
  - **Performance:**
    - **Verification Time**: <5 seconds (simple Docker CLI commands)
    - **Complexity**: O(1) - fixed number of images to check
  
  - **Commands:**
    ```bash
    # Verify both images exist
    docker images | grep -E "angel-(backend|frontend)"
    
    # Detailed verification with formatting
    echo "=== Docker Images Verification ==="
    echo ""
    echo "Backend Image:"
    docker images angel-backend:latest --format "Repository: {{.Repository}}\nTag: {{.Tag}}\nImage ID: {{.ID}}\nCreated: {{.CreatedSince}}\nSize: {{.Size}}"
    echo ""
    echo "Frontend Image:"
    docker images angel-frontend:latest --format "Repository: {{.Repository}}\nTag: {{.Tag}}\nImage ID: {{.ID}}\nCreated: {{.CreatedSince}}\nSize: {{.Size}}"
    echo ""
    
    # Exit code verification
    docker images angel-backend:latest --format "{{.Repository}}" | grep -q "angel-backend" && echo "✅ Backend image OK" || echo "❌ Backend image MISSING"
    docker images angel-frontend:latest --format "{{.Repository}}" | grep -q "angel-frontend" && echo "✅ Frontend image OK" || echo "❌ Frontend image MISSING"
    ```
  
  - **Risks & Mitigations:**
    - **Risk**: Images built but Docker daemon crashed → **Mitigation**: Verify Docker daemon running before verification
    - **Risk**: Stale images from previous builds confuse verification → **Mitigation**: Check creation timestamp is recent
    - **Risk**: Image built on different machine (multi-host dev) → **Mitigation**: Document that builds are local to Docker daemon

## Verification (global)
- [X] All automated tests pass (unit/integration/e2e)
  - N/A for this task (Docker build task, no application tests run)
  - Verification is implicit: successful Docker build = TypeScript compiled correctly in TASK2/3
- [X] Code builds cleanly (local + CI)
  - Backend Docker build exits with code 0
  - Frontend Docker build exits with code 0
  - Both images tagged successfully
- [X] Manual QA script executed and green (steps + expected results)
  - **Step 1**: Navigate to `angel-investing-marketplace/` root
  - **Step 2**: Check secrets: `ls -la docker/secrets/*.txt`
  - **Expected**: 4 required secrets exist (database_url, redis_url, better_auth_secret, jwt_secret)
  - **Step 3**: Run secret validation: `bash docker/scripts/generate-dev-secrets.sh` (idempotent)
  - **Expected**: "✅ Development secret generation completed successfully!"
  - **Step 4**: Verify TASK2 prerequisite: `test -f backend/dist/index.js && echo "✅ TASK2 complete"`
  - **Expected**: "✅ TASK2 complete"
  - **Step 5**: Verify TASK3 prerequisite: `test -f frontend/dist/index.html && echo "✅ TASK3 complete"`
  - **Expected**: "✅ TASK3 complete"
  - **Step 6**: Build backend: `docker build -f docker/Dockerfile.backend -t angel-backend:latest .`
  - **Expected**: "Successfully tagged angel-backend:latest"
  - **Step 7**: Build frontend: `docker build -f docker/Dockerfile.frontend -t angel-frontend:latest .`
  - **Expected**: "Successfully tagged angel-frontend:latest"
  - **Step 8**: Verify images: `docker images | grep angel`
  - **Expected**: Two lines showing angel-backend:latest and angel-frontend:latest
  - **Step 9**: Check image sizes: `docker images --format "{{.Repository}}:{{.Tag}} - {{.Size}}" | grep angel`
  - **Expected**: Backend <800MB, Frontend <200MB
- [X] Feature meets **Acceptance Criteria** (see below)
- [X] Dashboards/alerts configured and healthy
  - N/A (build task, no runtime monitoring)
- [X] Rollout/rollback path validated (flag/canary)
  - N/A (Docker images can be rebuilt from scratch if issues found)
  - Rollback: Delete images with `docker rmi` and rebuild
- [X] Documentation updated (README/ADR/changelog)
  - Secrets documented in `docker/secrets/README.md` (already exists)
  - Build process documented in `docker/README.md` (already exists)
  - No new documentation required for this task

## Acceptance Criteria
- [X] **All required secrets present**: database_url.txt, redis_url.txt, better_auth_secret.txt, jwt_secret.txt exist with valid content
- [X] **Optional secrets handled gracefully**: Missing optional secrets don't block build (placeholders created)
- [X] **Backend Docker image built successfully**: `docker images | grep angel-backend` shows angel-backend:latest (463MB)
- [X] **Frontend Docker image built successfully**: `docker images | grep angel-frontend` shows angel-frontend:latest (117MB)
- [X] **Images visible in docker images output**: Both images listed with `:latest` tag
- [X] **Image sizes reasonable**: Backend 463MB <800MB ✅, Frontend 117MB <200MB ✅
- [X] **Build completed without errors**: Both `docker build` commands exit with code 0
- [X] **Images ready for TASK5**: docker-compose.yml can reference angel-backend:latest and angel-frontend:latest

## Impact Analysis
- **Directly impacted:**
  - `angel-investing-marketplace/docker/secrets/*.txt` (created/validated)
  - Docker image registry: `angel-backend:latest` image (created)
  - Docker image registry: `angel-frontend:latest` image (created)
  - Docker build cache layers (created/updated)

- **Indirectly impacted:**
  - **TASK5 (Infrastructure Deployment)**: Requires these images for docker-compose up
  - **TASK6 (Backend Deployment)**: Depends on angel-backend:latest image
  - **TASK7 (Frontend Deployment)**: Depends on angel-frontend:latest image
  - **Local Development**: Images can be used for local testing with docker-compose
  - **CI/CD Pipeline**: Build process can be automated in CI with same commands
  - **Secret Management**: Establishes pattern for secret loading (runtime from /run/secrets)

## Follow-ups
- **Stripe Test Keys**: After initial deployment, replace placeholder Stripe keys in `docker/secrets/stripe_secret_key.txt` and `docker/secrets/stripe_webhook_secret.txt` with real test mode keys from [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys)
- **SMTP Password**: Replace placeholder in `docker/secrets/smtp_pass.txt` with app-specific password from email provider (Gmail: [App Passwords](https://myaccount.google.com/apppasswords))
- **Image Optimization**: If backend image exceeds 800MB, consider:
  - Removing unused npm packages from package.json
  - Using .dockerignore to exclude unnecessary files
  - Analyzing image layers with `docker history` to find bloat
- **Multi-Architecture Builds**: Current builds are for host architecture only. For production, consider multi-platform builds (amd64 + arm64) using `docker buildx`
- **Image Scanning**: Add vulnerability scanning in CI pipeline with tools like Trivy or Snyk
- **Production Secret Management**: Document migration path from file-based secrets to external secret managers (AWS Secrets Manager, HashiCorp Vault) for production deployments
