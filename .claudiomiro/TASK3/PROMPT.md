## PROMPT
Build the frontend React + Vite application into production-ready static assets.

**Objective:** Create optimized static files (HTML, JS, CSS) that Nginx will serve.

**Context:**
- Frontend uses React 18, Vite, TanStack Router, Zustand
- Vite configuration in `vite.config.ts`
- Build script defined in `package.json` as `"build": "vite build"`
- Output directory: `dist/`
- Includes ShadCN components, Radix UI primitives

**Tasks:**
1. `cd angel-investing-marketplace/frontend`
2. `npm install` (install all dependencies)
3. `npm run build` (run Vite production build)
4. Verify `dist/index.html` and `dist/assets/` exist
5. Check build output for errors/warnings

## COMPLEXITY
Low

## RELATED FILES / SOURCES
- `/Users/vivek/elite/angel-investing-marketplace/frontend/package.json`
- `/Users/vivek/elite/angel-investing-marketplace/frontend/vite.config.ts`
- `/Users/vivek/elite/angel-investing-marketplace/frontend/index.html`

## EXTRA DOCUMENTATION
Vite build will:
- Bundle React components
- Optimize and minify JavaScript
- Process CSS/Tailwind
- Generate hashed filenames for cache busting
- Create production-ready index.html

## LAYER
1 (Frontend Core)

## PARALLELIZATION
Parallel with: TASK2 (backend build)

## CONSTRAINTS
- Must run AFTER TASK1 (API types may reference schema)
- Use npm install (not manual)
- Use npm run build (automation-first)
- Verify dist/ contains index.html and assets/
- Check for build errors and fix if needed
- Build should complete without warnings
