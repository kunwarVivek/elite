# Task 7 Code Review: API Smoke Tests

## Status
❌ **FAILED - CRITICAL BUGS FOUND**

## Executive Summary
The smoke test script is well-structured with excellent organization, clear output formatting, and good error handling. However, it contains **3 critical bugs** that will cause all authentication and pitch creation tests to fail. These are not stylistic issues—they are functional blockers that prevent the script from working.

---

## Critical Bugs (BLOCKERS)

### 1. ❌ **BLOCKER: Wrong Better Auth API Endpoints**
**Location:** `smoke-tests.sh:195-197, 216-218`

**Issue:**
```bash
# Script uses (WRONG):
http_request "POST" "$BACKEND_URL/api/auth.signUp.email"
http_request "POST" "$BACKEND_URL/api/auth.signIn.email"

# Actual Better Auth endpoints:
/api/sign-up/email    # (hyphens, not dots)
/api/sign-in/email    # (hyphens, not dots)
```

**Why it matters:**
- Better Auth uses `/sign-up/email` and `/sign-in/email` (verified from official docs)
- Script uses `/auth.signUp.email` and `/auth.signIn.email` (wrong format)
- All auth tests will fail with 404 Not Found
- No token will be generated → pitch creation tests will also fail

**Evidence:**
- Better Auth docs: POST `/sign-up/email` and POST `/sign-in/email`
- Backend `auth.ts:24`: `router.use(auth.handlers)` mounts Better Auth at standard routes
- Context7 docs confirm hyphen-separated endpoint format

**Fix required:**
```bash
# Line ~195-197
RESPONSE=$(http_request "POST" "$BACKEND_URL/api/sign-up/email" "$REG_DATA" "" 2>&1)

# Line ~216-218
RESPONSE=$(http_request "POST" "$BACKEND_URL/api/sign-in/email" "$LOGIN_DATA" "" 2>&1)
```

---

### 2. ❌ **BLOCKER: Hardcoded startup_id Doesn't Exist**
**Location:** `smoke-tests.sh:274`

**Issue:**
```bash
"startup_id": "00000000-0000-0000-0000-000000000001"
```

**Why it matters:**
- Pitch creation requires valid `startup_id` (foreign key constraint)
- Hardcoded UUID doesn't exist in fresh database
- Will fail with: "Foreign key constraint violation"
- Validation requires: `z.string().uuid()` format (which it is), but database will reject non-existent ID

**Evidence:**
- `pitch.validation.ts:6`: `export const startupIdSchema = z.string().uuid('Invalid startup ID format')`
- `pitch.validation.ts:33`: `startup_id: startupIdSchema` (required field)
- Database will enforce foreign key relationship to startups table
- No seed data visible in codebase to guarantee this UUID exists

**Fix required:**
Either:
1. Create a test startup first, extract its ID, then use for pitch creation
2. Make pitch creation test gracefully handle 400/404 as acceptable (if startup validation is working correctly)
3. Add a seed script that guarantees this UUID exists in development

---

### 3. ❌ **BLOCKER: Non-existent Session Endpoint**
**Location:** `smoke-tests.sh:251`

**Issue:**
```bash
http_request "GET" "$BACKEND_URL/api/auth/session"
```

**Why it matters:**
- No `/api/auth/session` endpoint exists in backend code
- `auth.ts` routes don't define this endpoint
- Better Auth may provide this, but not visible in current implementation
- Test will fail with 404 Not Found

**Evidence:**
- Reviewed `backend/src/routes/auth.ts`: No `GET /session` route defined
- Only custom routes: `/register`, `/login`, `/me`, `/logout`, etc.
- Better Auth `auth.handlers` may provide this, but not documented in implementation

**Fix required:**
Either:
1. Use `/api/auth/me` endpoint instead (exists at `auth.ts:124`)
2. Test auth by attempting authenticated operation (creating pitch with token)
3. Remove session validation test if endpoint doesn't exist

---

## Logic Issues

### 4. ⚠️ **WARNING: Cascading Failure Chain**
**Severity:** High (affects test reliability)

**Issue:**
- Auth registration fails (bug #1) → no user created
- Auth login fails (bug #1) → no token generated
- Pitch creation fails (no token + bug #2) → can't test CRUD

**Why it matters:**
- Can't determine if pitch endpoints actually work when auth is broken
- Single point of failure causes all downstream tests to fail
- Makes debugging harder—is it auth or pitches that's broken?

**Recommendation:**
Add fallback paths:
- Test public pitch listing endpoint (doesn't require auth)
- Add mock token or bypass auth for smoke tests
- Or accept that pitch tests are conditional on auth success

---

### 5. ⚠️ **WARNING: Frontend Health Check May Not Exist**
**Location:** `smoke-tests.sh:160`

**Issue:**
```bash
http_request "GET" "$FRONTEND_URL/health"
```

**Why it matters:**
- Frontend is Next.js—no `/health` endpoint visible in code
- Script has good mitigation: falls back to `/` root endpoint
- But test name is misleading if it's just checking root

**Mitigation in place:**
```bash
# Script already handles this well:
RESPONSE=$(http_request "GET" "$FRONTEND_URL/health" "" "" 2>&1)
if [ $? -eq 0 ]; then
    pass_test "Frontend is healthy"
else
    # Fallback to root
    RESPONSE=$(http_request "GET" "$FRONTEND_URL/" "" "" 2>&1)
    if [ $? -eq 0 ]; then
        pass_test "Frontend is reachable"
    fi
fi
```

**Status:** Acceptable with current fallback logic

---

## Validation Requirements Not Met

### Field Length Requirements
**Location:** `smoke-tests.sh:274-294`

**Issue:**
Pitch test data meets minimum character requirements, but uses repetitive filler text:
```bash
"problem_statement": "Testing the problem statement field with sufficient content..."  # 87 chars
```

**Validation requirements** (from `pitch.validation.ts`):
- `problem_statement`: min 50 chars ✅
- `solution`: min 50 chars ✅
- `market_opportunity`: min 50 chars ✅
- `product`: min 50 chars ✅
- `business_model`: min 50 chars ✅
- All other required fields: Present ✅

**Why it matters:**
- Fields meet minimum length requirements ✅
- Repetitive content is acceptable for smoke tests (not production data)
- Validation regex check: `^[^<>\"'&]*$` will pass ✅

**Status:** Acceptable for smoke tests

---

## What Works Well ✅

### Excellent Implementation Aspects:

1. **POSIX Compliance:** ✅
   - Uses `/bin/sh` not `/bin/bash`
   - No bashisms detected
   - Portable across Unix systems

2. **Error Handling:** ✅
   - Clear pass/fail output
   - Timeout handling (120s script timeout, 5s per request)
   - Graceful degradation (frontend health fallback)

3. **Organization:** ✅
   - Well-structured functions
   - Clear test categories (health, auth, CRUD)
   - Comprehensive summary output

4. **Usability:** ✅
   - `--help` flag with documentation
   - `--verbose` flag for debugging
   - Color-coded output
   - Clear error messages

5. **Test Scope:** ✅
   - Covers critical path (Pareto principle)
   - Non-destructive (read-only where possible)
   - Fast execution target (< 2 minutes)

6. **File Permissions:** ✅
   - Script is executable (`-rwxr-xr-x`)
   - Located in correct directory (`docker/scripts/`)

---

## Verification Against Requirements

### From PROMPT.md (TASK7/PROMPT.md):

✅ **Health check tests** - Implemented (5 tests)
❌ **Auth flow tests** - Implemented but BROKEN (endpoint bugs)
❌ **Basic CRUD tests** - Implemented but WILL FAIL (auth + startup_id bugs)
✅ **Tests complete quickly** - Target < 2min (well-designed)
✅ **Clear test output** - Excellent formatting and summary

### From TODO.md Success Criteria:

✅ Critical endpoints tested
❌ Fast execution (can't verify—tests won't run)
❌ Clear pass/fail (will show failures due to bugs)
✅ Non-destructive design
✅ Repeatable design

---

## Required Fixes

### Must Fix (Blockers):

1. **Fix Better Auth endpoints** (lines 195-197, 216-218):
   ```bash
   # Change from:
   /api/auth.signUp.email → /api/sign-up/email
   /api/auth.signIn.email → /api/sign-in/email
   ```

2. **Fix startup_id dependency** (line 274):
   Either:
   - Create test startup first OR
   - Accept 400/404 as valid test result (validates foreign key works) OR
   - Add seed data to guarantee UUID exists

3. **Fix session endpoint** (line 251):
   Either:
   - Change to `/api/auth/me` (verified exists) OR
   - Test auth via authenticated pitch operation OR
   - Remove test if endpoint doesn't exist

### Should Fix (Improvements):

4. **Add conditional pitch testing:**
   - Only run pitch tests if auth succeeded and token obtained
   - Or make pitch tests independent of auth state

---

## Test Execution Required

**Cannot approve without:**
1. Running fixed script against live docker-compose stack
2. Verifying all 11 tests pass (5 health + 3 auth + 3 CRUD)
3. Confirming execution time < 2 minutes
4. Testing `--help` and `--verbose` flags work

---

## Decision

**Status:** ❌ **FAILED - REQUIRES FIXES**

**Reason:** Three critical bugs that prevent core functionality:
1. Wrong Better Auth API endpoint format (all auth tests will fail)
2. Non-existent startup_id foreign key (pitch creation will fail)
3. Non-existent session endpoint (token validation will fail)

**Next Steps:**
1. Fix 3 critical bugs listed above
2. Run smoke tests against live deployment
3. Verify all tests pass
4. Re-submit for code review

**Estimated Fix Time:** 15-20 minutes (straightforward endpoint and validation fixes)
