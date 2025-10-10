## PROMPT
Compile the backend TypeScript application to production-ready JavaScript.

**Objective:** Build the Express + TypeScript backend into executable JavaScript that Docker can run.

**Context:**
- Backend uses Express, Prisma, Socket.IO
- TypeScript configuration in `tsconfig.json`
- Build script defined in `package.json` as `"build": "tsc"`
- Output directory: `dist/`
- Main entry: `src/index.ts` → `dist/index.js`

**Tasks:**
1. `cd angel-investing-marketplace/backend`
2. `npm install` (install all dependencies including Prisma client)
3. `npm run build` (compile TypeScript)
4. Verify `dist/index.js` exists
5. Check build output for errors

## COMPLEXITY
Low

## RELATED FILES / SOURCES
- `/Users/vivek/elite/angel-investing-marketplace/backend/package.json`
- `/Users/vivek/elite/angel-investing-marketplace/backend/tsconfig.json`
- `/Users/vivek/elite/angel-investing-marketplace/backend/src/index.ts`

## EXTRA DOCUMENTATION
TypeScript compilation will:
- Transform .ts → .js
- Preserve directory structure in dist/
- Include all controllers, services, routes, config
- Use Prisma client from TASK1

## LAYER
1 (Backend Core)

## PARALLELIZATION
Parallel with: TASK3 (frontend build)

## CONSTRAINTS
- Must run AFTER TASK1 (needs Prisma client)
- Use npm install (not manual dependency management)
- Use npm run build (automation-first)
- Verify dist/ contains all necessary files
- Check for TypeScript errors and fix if needed
