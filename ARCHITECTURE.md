# System Architecture

High-level architecture overview of the Elite Angel Investing Marketplace platform.

---

## 📋 Table of Contents

- [Overview](#overview)
- [System Components](#system-components)
- [Technology Stack](#technology-stack)
- [Database Architecture](#database-architecture)
- [API Design](#api-design)
- [Authentication & Authorization](#authentication--authorization)
- [Data Flow](#data-flow)
- [Background Jobs](#background-jobs)
- [Real-time Features](#real-time-features)
- [Security](#security)
- [Scalability](#scalability)
- [Deployment Architecture](#deployment-architecture)

---

## Overview

Elite is a **modern B2C SaaS platform** built with a **microservices-ready monolithic architecture**, designed to scale horizontally while maintaining code simplicity during early stages.

### Architecture Principles

1. **Type Safety First** - TypeScript across the stack
2. **Database as Source of Truth** - Prisma ORM for type-safe database access
3. **RESTful API Design** - Predictable, resource-based endpoints
4. **Separation of Concerns** - Clear boundaries between layers
5. **Async Processing** - Background jobs for long-running tasks
6. **Security by Default** - Authentication, authorization, encryption

---

## System Components

```
┌─────────────────────────────────────────────────────────────┐
│                         Client Layer                         │
├─────────────────────────────────────────────────────────────┤
│  React SPA (Vite)  │  Mobile App (Future)  │  Admin Portal │
└────────────┬─────────────────────┬─────────────────────┬────┘
             │                     │                     │
             ├─────────────────────┴─────────────────────┤
             │         API Gateway / Load Balancer       │
             │              (Nginx)                      │
             └──────────────────┬────────────────────────┘
                                │
        ┌───────────────────────┴───────────────────────┐
        │              Application Layer                 │
        ├───────────────────────────────────────────────┤
        │                                               │
        │  ┌────────────┐  ┌────────────┐  ┌─────────┐│
        │  │  Express   │  │  Socket.IO │  │  BullMQ ││
        │  │  REST API  │  │  WebSocket │  │  Worker ││
        │  └────────────┘  └────────────┘  └─────────┘│
        │                                               │
        └───────────────────┬───────────────────────────┘
                            │
        ┌───────────────────┴───────────────────────────┐
        │               Data Layer                       │
        ├───────────────────────────────────────────────┤
        │  ┌────────────┐  ┌────────────┐  ┌─────────┐│
        │  │ PostgreSQL │  │   Redis    │  │   S3    ││
        │  │ (Primary)  │  │  (Cache)   │  │ (Files) ││
        │  └────────────┘  └────────────┘  └─────────┘│
        └───────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility |
|-----------|----------------|
| **React SPA** | User interface, client-side routing, state management |
| **Nginx** | Reverse proxy, load balancing, SSL termination |
| **Express API** | Business logic, HTTP routing, request handling |
| **Socket.IO** | Real-time features (notifications, live updates) |
| **BullMQ Worker** | Background job processing (emails, reports, etc.) |
| **PostgreSQL** | Relational data storage, ACID transactions |
| **Redis** | Session storage, caching, job queue |
| **S3** | File storage (documents, images) |

---

## Technology Stack

### Frontend Stack

```typescript
{
  "framework": "React 18",
  "bundler": "Vite",
  "language": "TypeScript 5",
  "routing": "TanStack Router",
  "state": "Zustand",
  "ui": "shadcn/ui + Tailwind CSS",
  "forms": "React Hook Form + Zod",
  "http": "Fetch API",
  "realtime": "Socket.IO Client"
}
```

**Rationale:**
- **React 18** - Industry standard, great ecosystem
- **Vite** - Fast builds, excellent DX
- **TanStack Router** - Type-safe routing
- **Zustand** - Lightweight state management vs Redux
- **shadcn/ui** - Customizable, accessible components

### Backend Stack

```typescript
{
  "runtime": "Node.js 18+",
  "framework": "Express.js",
  "language": "TypeScript 5",
  "database": "PostgreSQL 14+",
  "orm": "Prisma",
  "auth": "Better Auth",
  "jobs": "BullMQ",
  "cache": "Redis",
  "storage": "AWS S3",
  "logging": "Winston",
  "validation": "Zod"
}
```

**Rationale:**
- **Express.js** - Mature, flexible, large ecosystem
- **Prisma** - Type-safe ORM, excellent migrations
- **Better Auth** - Modern auth, session management
- **BullMQ** - Reliable job queue with Redis
- **PostgreSQL** - ACID compliance, JSON support, performance

---

## Database Architecture

### Schema Overview

```sql
-- Core Entities
User (investors, founders, admins)
  ↓
  ├─→ Startup (companies)
  │     ├─→ Pitch (investment opportunities)
  │     │     └─→ Investment (commitments)
  │     └─→ CompanyUpdate (news, milestones)
  │
  ├─→ Syndicate (group investing)
  │     ├─→ SyndicateInvestment (members)
  │     └─→ SPV (Special Purpose Vehicle)
  │           └─→ SpvInvestment (allocations)
  │
  ├─→ Order (secondary marketplace)
  │     └─→ Trade (executed trades)
  │           └─→ ShareCertificate (ownership)
  │
  └─→ ComplianceProfile (KYC/AML/Accreditation)
        ├─→ ComplianceLog (audit trail)
        └─→ ComplianceDocument (verification docs)
```

### Key Tables

| Table | Purpose | Relationships |
|-------|---------|---------------|
| `User` | All platform users | → Investments, Startups, Syndicates |
| `Pitch` | Investment opportunities | → Startup, Investments |
| `Investment` | Investment commitments | → User, Pitch, SPV |
| `Syndicate` | Investment groups | → Lead Investor, Investments |
| `Order` | Buy/sell orders | → User, ShareCertificate |
| `ComplianceProfile` | Regulatory compliance | → User, Documents |

**See:** [docs/architecture/database-schema.md](docs/architecture/database-schema.md) for complete schema.

---

## API Design

### REST Principles

- **Resource-based URLs** - `/api/investments`, `/api/syndicates`
- **HTTP methods** - GET, POST, PUT, DELETE
- **Status codes** - 200, 201, 400, 401, 403, 404, 500
- **JSON format** - Request/response bodies
- **Pagination** - Cursor or offset-based
- **Versioning** - `/api/v1/` (future-ready)

### API Structure

```
/api
├── /auth           # Authentication
│   ├── /register
│   ├── /login
│   └── /logout
│
├── /users          # User management
│   ├── /me
│   └── /:id
│
├── /investments    # Investment operations
│   ├── GET    /               # List investments
│   ├── POST   /               # Create investment
│   ├── GET    /:id            # Get details
│   └── PUT    /:id/status     # Update status
│
├── /pitches        # Investment opportunities
├── /syndicates     # Group investing
├── /marketplace    # Secondary trading
│   ├── /orders
│   ├── /trades
│   └── /shares
│
├── /portfolio      # Portfolio tracking
├── /compliance     # KYC/AML
├── /tax            # Tax documents
└── /admin          # Admin operations
```

### Response Format

**Success:**
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": { ... }
  }
}
```

**See:** [docs/architecture/api-design.md](docs/architecture/api-design.md)

---

## Authentication & Authorization

### Authentication Flow

```
1. User submits credentials → POST /api/auth/login
2. Backend validates credentials (Better Auth)
3. Create session in database
4. Return session token to client
5. Client stores token (httpOnly cookie)
6. Client includes token in subsequent requests
7. Backend validates token on each request
```

### Session Management

- **Storage:** PostgreSQL (persistent)
- **Cache:** Redis (performance)
- **Expiry:** 7 days (configurable)
- **Refresh:** Automatic token renewal

### Authorization (RBAC)

```typescript
enum UserRole {
  INVESTOR,
  FOUNDER,
  ADMIN
}

// Middleware example
requireRole('ADMIN', 'FOUNDER')
```

**See:** [docs/architecture/auth-strategy.md](docs/architecture/auth-strategy.md)

---

## Data Flow

### Request Flow

```
Client Request
    ↓
Nginx (reverse proxy)
    ↓
Express Middleware Stack
    ├─→ CORS
    ├─→ Authentication
    ├─→ Rate Limiting
    └─→ Request Validation (Zod)
    ↓
Route Handler (Controller)
    ↓
Service Layer (Business Logic)
    ├─→ Prisma ORM
    ├─→ External APIs (if needed)
    └─→ Queue Jobs (if async)
    ↓
Database Transaction
    ↓
Response Formation
    ↓
Client
```

### Layered Architecture

```
┌───────────────────────────────────────┐
│       Presentation Layer              │
│  (Controllers - HTTP handling)        │
└─────────────┬─────────────────────────┘
              │
┌─────────────┴─────────────────────────┐
│       Business Logic Layer            │
│  (Services - Core logic)              │
└─────────────┬─────────────────────────┘
              │
┌─────────────┴─────────────────────────┐
│       Data Access Layer               │
│  (Prisma - Database queries)          │
└─────────────┬─────────────────────────┘
              │
┌─────────────┴─────────────────────────┐
│       Database Layer                  │
│  (PostgreSQL - Persistent storage)    │
└───────────────────────────────────────┘
```

---

## Background Jobs

### Job Queue Architecture

```
Express API
    ↓ (Enqueue)
BullMQ + Redis
    ↓ (Process)
Worker Processes
    ↓ (Execute)
Job Handlers
```

### Job Types

| Job Type | Trigger | Purpose |
|----------|---------|---------|
| `send-email` | User action | Send transactional emails |
| `generate-tax-docs` | Scheduled (Jan 20) | Generate annual tax forms |
| `aml-screening` | KYC submission | Run compliance checks |
| `calculate-portfolio` | Nightly | Update portfolio metrics |
| `process-settlement` | T+3 after trade | Settle secondary trades |

### Job Configuration

```typescript
{
  "priority": 1-10,
  "attempts": 3,
  "backoff": "exponential",
  "timeout": 30000,
  "removeOnComplete": true,
  "removeOnFail": false
}
```

---

## Real-time Features

### WebSocket Architecture

```
Client (Socket.IO)
    ↓
Nginx (WebSocket proxy)
    ↓
Socket.IO Server
    ↓ (Emit events)
Room/Channel
    ↓ (Broadcast)
Connected Clients
```

### Event Types

- **`notification`** - New notification
- **`investment:update`** - Investment status change
- **`trade:executed`** - Trade completed
- **`update:published`** - New company update
- **`market:price`** - Real-time price updates

---

## Security

### Security Layers

1. **Transport Security** - HTTPS/TLS, WSS
2. **Authentication** - Session-based with httpOnly cookies
3. **Authorization** - Role-based access control (RBAC)
4. **Input Validation** - Zod schemas
5. **SQL Injection** - Prisma parameterized queries
6. **XSS Protection** - Content Security Policy
7. **CSRF Protection** - CSRF tokens
8. **Rate Limiting** - Per-IP and per-user limits
9. **Data Encryption** - At-rest and in-transit
10. **Audit Logging** - Complete audit trail

### Compliance

- **SEC Regulation D** - Accreditation verification
- **AML/KYC** - Know Your Customer screening
- **GDPR** - Data protection and privacy
- **SOC 2** - Security controls (planned)

---

## Scalability

### Horizontal Scaling

```
Load Balancer
    ├─→ App Server 1
    ├─→ App Server 2
    ├─→ App Server 3
    └─→ App Server N
```

### Database Scaling

- **Read Replicas** - For read-heavy workloads
- **Connection Pooling** - Prisma connection pool
- **Caching** - Redis for frequently accessed data
- **Indexing** - Strategic database indexes

### Caching Strategy

```
Request
    ↓
Check Redis Cache
    ├─→ Cache Hit → Return
    └─→ Cache Miss
            ↓
        Database Query
            ↓
        Store in Cache
            ↓
        Return
```

**Cache Invalidation:**
- Time-based (TTL)
- Event-based (on data change)

---

## Deployment Architecture

### Production Environment

```
┌─────────────────────────────────────────────┐
│              CDN (CloudFront)               │
│         (Static Assets, Frontend)           │
└────────────────┬────────────────────────────┘
                 │
┌────────────────┴────────────────────────────┐
│         Load Balancer (ALB/NLB)            │
└────────────────┬────────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
┌───────┴───────┐ ┌──────┴────────┐
│  App Server 1 │ │  App Server 2 │
│   (Docker)    │ │   (Docker)    │
└───────┬───────┘ └──────┬────────┘
        │                │
        └────────┬────────┘
                 │
    ┌────────────┴────────────┐
    │                         │
┌───┴────────┐   ┌───────────┴──────┐
│ PostgreSQL │   │  Redis Cluster   │
│ (RDS/Cloud)│   │  (ElastiCache)   │
└────────────┘   └──────────────────┘
```

### Container Strategy

- **Docker** - Application containerization
- **Docker Compose** - Local development
- **Kubernetes** - Production orchestration (future)

### CI/CD Pipeline

```
Git Push
    ↓
GitHub Actions
    ├─→ Run Tests
    ├─→ Type Check
    ├─→ Lint
    ├─→ Build
    └─→ Security Scan
    ↓
Build Docker Images
    ↓
Push to Registry
    ↓
Deploy to Environment
    ├─→ Dev (auto)
    ├─→ Staging (auto)
    └─→ Production (manual approval)
```

---

## Monitoring & Observability

### Logging
- **Application Logs** - Winston
- **Access Logs** - Nginx
- **Database Logs** - PostgreSQL
- **Centralized** - CloudWatch/ELK Stack

### Metrics
- **Performance** - Response times, throughput
- **Errors** - Error rates, types
- **Business** - Investments, trades, users

### Alerting
- **Error Spikes** - Immediate notification
- **Performance Degradation** - Early warning
- **Security Events** - Real-time alerts

---

## Additional Resources

- **[API Design](docs/architecture/api-design.md)** - Detailed API specifications
- **[Database Schema](docs/architecture/database-schema.md)** - Complete schema documentation
- **[Auth Strategy](docs/architecture/auth-strategy.md)** - Authentication & authorization
- **[State Management](docs/architecture/state-management-strategy.md)** - Frontend state
- **[Payment Strategy](docs/architecture/payment-strategy.md)** - Payment processing
- **[File Storage](docs/architecture/file-storage-strategy.md)** - Document storage
- **[Real-time Architecture](docs/architecture/realtime-architecture.md)** - WebSocket design

---

**Last Updated:** November 2025
