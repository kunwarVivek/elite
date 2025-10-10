@dependencies [TASK1]
# Task 3: Frontend Build & Static Assets

## Summary
Install frontend dependencies and build Vite production bundle for deployment. Creates optimized static assets that Nginx will serve.

## Complexity
Low

## Dependencies
Depends on: TASK1 (schema defines API contracts)
Blocks: TASK6 (Docker frontend build needs dist/)
Parallel with: TASK2 (backend build is independent)

## Steps
1. Navigate to frontend directory
2. Install all dependencies via npm
3. Run Vite build to generate production bundle
4. Verify dist/ directory with static assets
5. Check for any build errors

## Acceptance Criteria
- [ ] All dependencies installed in `node_modules/`
- [ ] Vite build completed successfully
- [ ] `dist/` directory exists with index.html and assets
- [ ] Build is optimized (minified, tree-shaken)
- [ ] No build errors or warnings

## Reasoning Trace
Frontend needs static HTML/JS/CSS for Nginx to serve. Dockerfile copies dist/ folder. Without build, Docker image serves nothing. This is Layer 1 - core frontend preparation. Independent from backend compilation so can run parallel.
