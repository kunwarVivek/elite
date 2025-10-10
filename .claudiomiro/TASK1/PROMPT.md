## PROMPT
You are tasked with establishing the database schema foundation for an Angel Investing Marketplace platform.

**Objective:** Validate the Prisma schema and generate all necessary migration files and client code.

**Context:**
- Prisma schema located at: `angel-investing-marketplace/backend/prisma/schema.prisma`
- This is a comprehensive schema with ~40 models for users, investments, syndicates, compliance, etc.
- The schema is based on specifications in database-schema.md (source of truth)
- No migrations have been generated yet (fresh codebase)

**Tasks:**
1. Navigate to backend directory
2. Install Prisma CLI if needed
3. Validate schema syntax: `npx prisma validate`
4. Generate initial migration: `npx prisma migrate dev --name init`
5. Generate Prisma client: `npx prisma generate`
6. Verify migration files exist in `prisma/migrations/`

## COMPLEXITY
Medium - Straightforward Prisma operations but large schema

## RELATED FILES / SOURCES
- `/Users/vivek/elite/angel-investing-marketplace/backend/prisma/schema.prisma`
- `/Users/vivek/elite/database-schema.md` (specification)
- `/Users/vivek/elite/prd.md` (requirements)

## EXTRA DOCUMENTATION
Prisma migration flow:
1. `prisma validate` - checks schema syntax
2. `prisma migrate dev` - generates migration SQL files
3. `prisma generate` - creates TypeScript client
4. Migration files stored in `prisma/migrations/[timestamp]_[name]/`

## LAYER
0 (Foundation)

## PARALLELIZATION
Sequential only - blocks all other tasks

## CONSTRAINTS
- Use CLI commands only (automation-first principle)
- Verify migration files created before completing
- Check for any Prisma errors and fix schema if needed
- Do NOT connect to database yet (that's Docker's job)
- Generate migration with `--name init` for clarity
