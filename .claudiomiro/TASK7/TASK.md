@dependencies [TASK6]
# Task 7: System Wiring & End-to-End Validation

## Summary
Validate complete system integration by testing critical endpoints, database connectivity, API functionality, and frontend-backend communication. Final verification that all components work together.

## Complexity
Medium

## Dependencies
Depends on: TASK6 (all services must be running)
Blocks: None (final validation task)
Parallel with: None (final sequential validation)

## Steps
1. Test backend health endpoint
2. Verify database connectivity via API
3. Test frontend accessibility
4. Verify frontend can reach backend API
5. Test WebSocket connectivity (if critical)
6. Validate end-to-end flow

## Acceptance Criteria
- [ ] Backend /health endpoint returns 200 OK
- [ ] Backend /api/health shows database connected
- [ ] Frontend loads successfully on http://localhost:3000
- [ ] Frontend can communicate with backend
- [ ] No critical errors in any service logs
- [ ] System passes smoke test

## Reasoning Trace
This is Layer Ω - final assembly validation. Confirms all components wire together correctly: PostgreSQL ← Backend ← Frontend. Tests actual request flows through full stack. Per Pareto's principle, focus on critical path only (health checks, connectivity) not exhaustive E2E. Per instructions: "Focus on functional and technical completion and not exhaustive testing setup."
