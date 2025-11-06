# Development Guide

Complete guide for setting up and developing the Elite Angel Investing Marketplace.

---

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Database Setup](#database-setup)
- [Running Locally](#running-locally)
- [Development Workflow](#development-workflow)
- [Code Structure](#code-structure)
- [Testing](#testing)
- [Debugging](#debugging)
- [Common Issues](#common-issues)

---

## Prerequisites

### Required Software
- **Node.js:** 18.x or higher
- **npm:** 9.x or higher
- **PostgreSQL:** 14.x or higher
- **Redis:** 6.x or higher
- **Git:** Latest version

### Optional (Recommended)
- **Docker** and **Docker Compose** - For containerized development
- **pgAdmin** or **DBeaver** - Database GUI tools
- **Postman** or **Insomnia** - API testing

### Development Tools
- **VS Code** (recommended) with extensions:
  - ESLint
  - Prettier
  - Prisma
  - Tailwind CSS IntelliSense
  - TypeScript and JavaScript Language Features

---

## Initial Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd elite
```

### 2. Install Dependencies

```bash
# Backend
cd angel-investing-marketplace/backend
npm install

# Frontend
cd ../frontend
npm install
```

### 3. Environment Configuration

#### Backend Environment

```bash
cd angel-investing-marketplace/backend
cp .env.example .env
```

Edit `.env` with your values:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/elite_dev"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT Secret
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"

# Better Auth
BETTER_AUTH_SECRET="your-auth-secret-key-min-32-chars"
BETTER_AUTH_URL="http://localhost:3000"

# Email (for development, use Mailtrap or similar)
SMTP_HOST="smtp.mailtrap.io"
SMTP_PORT=2525
SMTP_USER="your-mailtrap-username"
SMTP_PASS="your-mailtrap-password"
SMTP_FROM="noreply@elite-marketplace.com"

# AWS S3 (optional for development)
AWS_ACCESS_KEY_ID="your-aws-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret"
AWS_S3_BUCKET="elite-dev-uploads"
AWS_REGION="us-east-1"

# Environment
NODE_ENV="development"
PORT=3000
```

#### Frontend Environment

```bash
cd angel-investing-marketplace/frontend
cp .env.example .env
```

Edit `.env`:

```env
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
VITE_APP_NAME="Elite Marketplace"
VITE_APP_ENV=development
```

---

## Database Setup

### Option 1: Local PostgreSQL

1. **Install PostgreSQL** (if not already installed)

```bash
# macOS with Homebrew
brew install postgresql@14
brew services start postgresql@14

# Ubuntu/Debian
sudo apt-get install postgresql-14
sudo systemctl start postgresql

# Windows
# Download and install from https://www.postgresql.org/download/windows/
```

2. **Create Database**

```bash
# Connect to PostgreSQL
psql postgres

# Create database and user
CREATE DATABASE elite_dev;
CREATE USER elite_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE elite_dev TO elite_user;
\q
```

3. **Update DATABASE_URL** in backend `.env`

```env
DATABASE_URL="postgresql://elite_user:your_password@localhost:5432/elite_dev"
```

### Option 2: Docker PostgreSQL

```bash
# Run PostgreSQL in Docker
docker run --name elite-postgres \
  -e POSTGRES_DB=elite_dev \
  -e POSTGRES_USER=elite_user \
  -e POSTGRES_PASSWORD=your_password \
  -p 5432:5432 \
  -d postgres:14-alpine

# Update DATABASE_URL in backend .env
DATABASE_URL="postgresql://elite_user:your_password@localhost:5432/elite_dev"
```

### Run Migrations

```bash
cd angel-investing-marketplace/backend

# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database (optional)
npm run seed
```

### Redis Setup

```bash
# macOS with Homebrew
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis

# Docker
docker run --name elite-redis -p 6379:6379 -d redis:6-alpine
```

---

## Running Locally

### Development Mode

#### Terminal 1: Backend

```bash
cd angel-investing-marketplace/backend
npm run dev
```

Backend runs on `http://localhost:3000`

#### Terminal 2: Frontend

```bash
cd angel-investing-marketplace/frontend
npm run dev
```

Frontend runs on `http://localhost:5173`

#### Terminal 3: Background Jobs (Optional)

```bash
cd angel-investing-marketplace/backend
npm run worker
```

### Production Mode (Local)

```bash
# Backend
cd angel-investing-marketplace/backend
npm run build
npm start

# Frontend
cd angel-investing-marketplace/frontend
npm run build
npm run preview
```

### Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

---

## Development Workflow

### Branch Strategy

```
main/master          # Production-ready code
develop              # Integration branch
feature/*            # Feature branches
fix/*                # Bug fix branches
hotfix/*             # Urgent production fixes
```

### Making Changes

1. **Create Feature Branch**

```bash
git checkout -b feature/your-feature-name
```

2. **Make Changes**
   - Write code
   - Follow TypeScript strict mode
   - Use ESLint and Prettier
   - Write tests

3. **Test Locally**

```bash
# Run tests
npm test

# Type check
npm run type-check

# Lint
npm run lint
```

4. **Commit**

```bash
git add .
git commit -m "feat: add user profile editing"
```

Commit message format:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Formatting
- `refactor:` Code restructuring
- `test:` Tests
- `chore:` Maintenance

5. **Push and Create PR**

```bash
git push origin feature/your-feature-name
```

---

## Code Structure

### Backend

```
backend/src/
├── config/           # Configuration (database, auth, etc.)
├── controllers/      # Route controllers (HTTP handlers)
├── middleware/       # Express middleware (auth, validation, etc.)
├── routes/           # API route definitions
├── services/         # Business logic (reusable services)
├── jobs/             # Background job processors (BullMQ)
├── utils/            # Utility functions
├── types/            # TypeScript type definitions
└── index.ts          # Application entry point
```

**Key Patterns:**
- Controllers handle HTTP requests/responses
- Services contain business logic
- Middleware for cross-cutting concerns
- Jobs for async/background processing

### Frontend

```
frontend/src/
├── components/       # Reusable UI components
│   ├── ui/          # shadcn/ui components
│   └── ...          # Custom components
├── pages/           # Page components (62 pages)
├── hooks/           # Custom React hooks
├── stores/          # Zustand state management
├── lib/             # Utilities and helpers
├── types/           # TypeScript types
└── routes/          # TanStack Router configuration
```

**Key Patterns:**
- Components are functional with hooks
- State management via Zustand stores
- Form validation with React Hook Form + Zod
- API calls in services layer

---

## Testing

### Backend Tests

```bash
cd angel-investing-marketplace/backend

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- path/to/test.spec.ts

# Watch mode
npm run test:watch
```

### Frontend Tests

```bash
cd angel-investing-marketplace/frontend

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# UI testing (if configured)
npm run test:ui
```

### Integration Tests

```bash
# Run integration tests
npm run test:integration
```

### E2E Tests (Planned)

```bash
# Run E2E tests
npm run test:e2e
```

---

## Debugging

### Backend Debugging (VS Code)

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Backend",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/angel-investing-marketplace/backend/src/index.ts",
      "preLaunchTask": "tsc: build - tsconfig.json",
      "outFiles": ["${workspaceFolder}/angel-investing-marketplace/backend/dist/**/*.js"],
      "env": {
        "NODE_ENV": "development"
      }
    }
  ]
}
```

### Frontend Debugging

1. Open browser DevTools
2. Use React DevTools extension
3. Use Zustand DevTools

### Database Debugging

```bash
# Prisma Studio - Visual database browser
cd angel-investing-marketplace/backend
npx prisma studio
```

### Logs

```bash
# Backend logs
tail -f logs/app.log

# Redis CLI
redis-cli

# PostgreSQL logs
tail -f /var/log/postgresql/postgresql-14-main.log
```

---

## Common Issues

### "Cannot find module '@prisma/client'"

```bash
cd angel-investing-marketplace/backend
npx prisma generate
```

### Database Connection Refused

- Check PostgreSQL is running: `brew services list` or `sudo systemctl status postgresql`
- Verify DATABASE_URL in `.env`
- Check port 5432 is not in use

### Redis Connection Error

- Check Redis is running: `redis-cli ping` (should return "PONG")
- Verify REDIS_URL in `.env`

### Port Already in Use

```bash
# Find process using port
lsof -i :3000  # Backend
lsof -i :5173  # Frontend

# Kill process
kill -9 <PID>
```

### TypeScript Errors After Schema Change

```bash
# Regenerate Prisma Client
npx prisma generate

# Rebuild
npm run build
```

### Frontend Build Fails

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf .vite
```

---

## Useful Commands

### Prisma

```bash
# Generate client
npx prisma generate

# Create migration
npx prisma migrate dev --name description

# Reset database (CAUTION: deletes all data)
npx prisma migrate reset

# Seed database
npm run seed

# Open Prisma Studio
npx prisma studio

# Format schema
npx prisma format
```

### Database

```bash
# Backup database
pg_dump -U elite_user elite_dev > backup.sql

# Restore database
psql -U elite_user elite_dev < backup.sql
```

### Build

```bash
# Type check only (no build)
npm run type-check

# Lint and fix
npm run lint:fix

# Format code
npm run format
```

---

## Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [React Documentation](https://react.dev)
- [TanStack Router](https://tanstack.com/router)
- [shadcn/ui](https://ui.shadcn.com)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

---

## Getting Help

- Check existing issues on GitHub
- Review architecture docs in `docs/architecture/`
- Consult API design docs
- Ask in team chat/discussions

---

**Happy Coding! 🚀**
