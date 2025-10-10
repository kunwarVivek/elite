## PROMPT
Perform end-to-end system validation and wiring verification.

**Objective:** Validate complete system integration and ensure all components communicate correctly.

**Context:**
- Backend running on http://localhost:3001
- Frontend running on http://localhost:3000
- PostgreSQL accessible to backend
- All services containerized in Docker

**Tasks:**
1. **Backend Health Check:**
   ```bash
   curl -v http://localhost:3001/health
   ```
   Expected: 200 OK with {"status":"OK"}

2. **API Health with Database:**
   ```bash
   curl -v http://localhost:3001/api/health
   ```
   Expected: 200 OK with {"database":"connected"}

3. **Frontend Health:**
   ```bash
   curl -v http://localhost:3000/
   ```
   Expected: 200 OK with HTML content

4. **Service Status:**
   ```bash
   docker-compose ps
   ```
   Expected: All services showing "healthy" or "running"

5. **Critical Logs Check:**
   ```bash
   docker-compose logs backend | grep -i error
   docker-compose logs frontend | grep -i error
   ```
   Expected: No critical errors

6. **System Overview:**
   ```bash
   docker-compose ps
   docker stats --no-stream
   ```

## COMPLEXITY
Medium - Integration testing

## RELATED FILES / SOURCES
- `/Users/vivek/elite/angel-investing-marketplace/backend/src/index.ts` (health endpoints)
- `/Users/vivek/elite/angel-investing-marketplace/docker/docker-compose.yml`
- `/Users/vivek/elite/prd.md` (requirements for validation)

## EXTRA DOCUMENTATION
Critical flows per PRD (Pareto 80/20):
1. Health/Status - System operational ✓
2. Database connectivity - Data layer works ✓
3. API availability - Backend functional ✓
4. Frontend serving - UI accessible ✓

NOT testing (per instructions - focus on deployment, not exhaustive testing):
- User authentication flows ✗
- Payment integration ✗
- Email services ✗
- Complex business logic ✗

## LAYER
Ω (Final Validation)

## PARALLELIZATION
None - final sequential validation

## CONSTRAINTS
- Must run AFTER TASK6 (all services deployed)
- Test only critical path (Pareto's principle)
- Use curl/docker commands (automation)
- Document any errors found
- Create summary report of system status
- If validation fails:
  - Check service logs: `docker-compose logs [service]`
  - Check container status: `docker-compose ps`
  - Check networks: `docker network ls`
  - Restart if needed: `docker-compose restart [service]`
