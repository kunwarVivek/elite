# System Architecture Overview

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                            CLIENT                               │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Vite      │  │   React     │  │  Zustand    │              │
│  │   + React   │  │   + ShadCN  │  │  + State    │              │
│  │             │  │   + TanStack│  │  Management │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────┬───────────────────────────────────────────────┘
                  │ HTTP/WebSocket
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                           SERVER                                │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Express   │  │  PostgreSQL  │  │   Redis     │              │
│  │   + REST    │  │   + Prisma  │  │   + BullMQ  │              │
│  │   APIs      │  │   ORM       │  │   Queue     │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

## Component Architecture

### Frontend Layer (Vite + React)
- **Vite**: Build tool and development server for fast development
- **React**: Component-based UI library with hooks and context
- **ShadCN**: Re-usable component library built on Radix UI
- **TanStack Router**: Client-side routing with nested layouts
- **TanStack Query**: Server state management and caching
- **Zustand**: Lightweight state management for global client state

### Backend Layer (Express + Node.js)
- **Express.js**: Web application framework for API routes
- **Prisma**: Type-safe ORM for database operations
- **PostgreSQL**: Primary data storage with ACID compliance
- **Redis**: Caching layer and BullMQ queue backend
- **BullMQ**: Background job processing and rate limiting

## Data Flow Architecture

### Authentication Flow
```
User Request → Better-Auth → JWT Token → Protected Routes
     ↓              ↓           ↓            ↓
   Login        Session      Token       Route Guards
   Form         Storage      Validation   (Frontend/Backend)
```

### Investment Flow (Direct with Escrow)
```
Startup Pitch → Investor Review → Investment Offer → Escrow Hold → Legal Review → Fund Transfer
     ↓              ↓                    ↓              ↓           ↓            ↓
  Profile       Browse &             Payment        Smart       Due         Bank
  Creation      Filter               Processing     Contract    Diligence   Transfer
```

### Real-time Communication Flow
```
User Action → WebSocket Event → BullMQ Queue → Background Processing → Notifications
     ↓             ↓                ↓              ↓                   ↓
  In-app       Real-time         Job Queue     Email/SMS/          Targeted
  Message      Updates           Processing    Push Services       Users
```

## Technology Decisions & Rationale

### Frontend Architecture
- **Vite over Create React App**: Faster development, better DX, native ES modules
- **Zustand over Redux**: Simpler state management, less boilerplate, better TypeScript support
- **TanStack Query over SWR**: More powerful caching, background updates, optimistic updates
- **ShadCN over Material-UI**: Better customization, smaller bundle size, modern design system

### Backend Architecture
- **Express over Fastify**: Larger ecosystem, better middleware support, proven stability
- **Prisma over TypeORM**: Better TypeScript support, modern API, excellent documentation
- **PostgreSQL over MySQL**: Better JSON support, advanced features, proven reliability
- **BullMQ over Agenda**: Better performance, active maintenance, Redis-based reliability

### Real-time & Background Processing
- **WebSocket for real-time**: Bidirectional communication for live updates
- **BullMQ for background jobs**: Reliable job processing, retry mechanisms, UI dashboard
- **Redis for caching**: High performance, persistence options, pub/sub capabilities

## Deployment Architecture

### Production Environment
```
┌─────────────────────────────────────────────────────────────────┐
│                        LOAD BALANCER                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  App Server │  │  App Server │  │  App Server │              │
│  │   Instance  │  │   Instance  │  │   Instance  │              │
│  │     1       │  │     2       │  │     3       │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────┬───────────────────────────────────────────────┘
                  │
         ┌────────▼────────┐
         │   PostgreSQL    │
         │     Cluster     │
         └─────────────────┘
                  │
         ┌────────▼────────┐
         │     Redis       │
         │     Cluster     │
         └─────────────────┘
```

### Development Environment
- Local development with hot reload
- Docker containers for database and Redis
- Local file storage for development
- Ngrok for webhook testing

## Security Architecture

### Authentication & Authorization
- **Better-Auth**: Session management, OAuth providers, magic links
- **JWT Tokens**: Stateless authentication with refresh tokens
- **Role-Based Access Control**: Granular permissions per user type
- **Rate Limiting**: API protection against abuse

### Data Protection
- **Encryption at Rest**: Database-level encryption for sensitive data
- **Encryption in Transit**: TLS 1.3 for all communications
- **Input Validation**: Zod schemas for all data validation
- **SQL Injection Prevention**: Prisma ORM with parameterized queries

## Scalability Considerations

### Horizontal Scaling
- Stateless application servers for easy scaling
- Database read replicas for query distribution
- Redis clustering for session storage
- CDN for static asset delivery

### Performance Optimization
- Database query optimization with Prisma
- Redis caching for frequently accessed data
- Background job processing with BullMQ
- Image optimization and lazy loading

### Monitoring & Observability
- Application performance monitoring (APM)
- Error tracking and alerting
- Database performance monitoring
- Real-time metrics and dashboards