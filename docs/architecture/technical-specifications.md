# Technical Specifications Document
## B2C SaaS Angel Investing Marketplace

### Document Information
- **Version**: 1.0
- **Date**: October 2024
- **Author**: Technical Architecture Team
- **Status**: Complete

---

## Executive Summary

This document provides comprehensive technical specifications for the development of a B2C SaaS angel investing marketplace. The platform enables group investing with small ticket sizes, portfolio tracking, secondary trading, and centralized investor communications.

## Technology Stack

### Frontend
- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite
- **State Management**: Zustand
- **UI Components**: ShadCN (Radix UI)
- **Styling**: TailwindCSS
- **Forms**: TanStack Form with Zod validation
- **Routing**: TanStack Router
- **Data Fetching**: TanStack Query
- **Real-time**: Socket.IO client

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Database**: PostgreSQL 15+
- **ORM**: Prisma
- **Authentication**: Better-Auth
- **Background Jobs**: BullMQ with Redis
- **File Storage**: AWS S3 / Cloudflare R2
- **Real-time**: Socket.IO server

### Infrastructure
- **Cloud Provider**: AWS / DigitalOcean
- **Containerization**: Docker
- **Orchestration**: Kubernetes (future)
- **CDN**: Cloudflare
- **Monitoring**: DataDog / New Relic
- **CI/CD**: GitHub Actions

## System Architecture

### High-Level Architecture

```mermaid
graph TB
    A[Client Applications] --> B[Load Balancer]
    B --> C[Application Servers]
    C --> D[PostgreSQL Database]
    C --> E[Redis Cache/Queue]
    C --> F[File Storage]
    G[External Services] --> C

    subgraph "External Integrations"
        H[Payment Processors]
        I[Identity Verification]
        J[Email Services]
        K[Analytics]
        L[Blockchain/Contracts]
    end
```

### Component Architecture

#### Frontend Architecture
```
src/
├── components/           # Reusable UI components
│   ├── ui/              # Base UI components (ShadCN)
│   ├── forms/           # Form components with validation
│   ├── layout/          # Layout and navigation
│   └── features/        # Feature-specific components
├── hooks/               # Custom React hooks
├── stores/              # Zustand stores
├── lib/                 # Utilities and configurations
├── pages/               # Page components
├── types/               # TypeScript type definitions
└── validations/         # Zod schemas
```

#### Backend Architecture
```
src/
├── controllers/         # Request handlers
├── services/           # Business logic
├── models/             # Database models (Prisma)
├── middleware/         # Express middleware
├── routes/             # API routes
├── lib/                # Utilities and services
├── types/              # TypeScript definitions
├── validations/        # Input validation schemas
└── workers/            # BullMQ job processors
```

## Database Design

### Core Entities

#### User Management
- **users**: Core user accounts with roles
- **user_profiles**: Extended user information
- **user_sessions**: Session management (Better-Auth)

#### Startup Management
- **startups**: Company profiles and information
- **pitches**: Investment opportunities
- **documents**: File attachments for startups

#### Investment Management
- **investments**: Investment records and transactions
- **portfolios**: Investor portfolio tracking
- **transactions**: Financial transaction records

#### Syndicate Management
- **syndicates**: Group investment entities
- **syndicate_members**: Syndicate participation
- **spvs**: Special Purpose Vehicles for legal structure

#### Trading System
- **orders**: Buy/sell orders for secondary market
- **trades**: Executed transactions
- **share_certificates**: Digital share certificates

#### Communication
- **messages**: Direct messaging between users
- **comments**: Pitch and update comments
- **notifications**: In-app notifications
- **updates**: Company progress updates

## API Design

### RESTful API Structure

#### Authentication Endpoints
```
POST   /api/auth/register          # User registration
POST   /api/auth/login             # User login
POST   /api/auth/logout            # User logout
POST   /api/auth/refresh           # Token refresh
POST   /api/auth/forgot-password   # Password reset
GET    /api/auth/verify-email      # Email verification
```

#### User Management
```
GET    /api/users/me               # Current user profile
PUT    /api/users/me               # Update current user
GET    /api/users/{id}             # Public user profile
GET    /api/users/{id}/portfolio   # User portfolio (public)
```

#### Startup Management
```
POST   /api/startups               # Create startup
GET    /api/startups               # List startups
GET    /api/startups/{id}          # Get startup details
PUT    /api/startups/{id}          # Update startup
POST   /api/startups/{id}/verify   # Verify startup (admin)
```

#### Pitch Management
```
POST   /api/pitches                # Create pitch
GET    /api/pitches                # List pitches
GET    /api/pitches/{id}           # Get pitch details
PUT    /api/pitches/{id}           # Update pitch
POST   /api/pitches/{id}/comments  # Add comment
GET    /api/pitches/{id}/documents # Get documents
```

#### Investment Management
```
POST   /api/investments            # Create investment
GET    /api/investments            # List user investments
GET    /api/investments/{id}       # Get investment details
PUT    /api/investments/{id}       # Update investment
POST   /api/investments/{id}/refund # Request refund
```

#### Syndicate Management
```
POST   /api/syndicates             # Create syndicate
GET    /api/syndicates             # List syndicates
GET    /api/syndicates/{id}        # Get syndicate details
POST   /api/syndicates/{id}/join   # Join syndicate
POST   /api/syndicates/{id}/invest # Invest through syndicate
```

#### Portfolio Management
```
GET    /api/portfolio              # User portfolio overview
GET    /api/portfolio/performance  # Performance analytics
GET    /api/portfolio/returns      # Return calculations
GET    /api/portfolio/tax-documents # Tax document access
```

#### Trading System
```
POST   /api/trading/orders         # Create trading order
GET    /api/trading/orders         # List user orders
GET    /api/trading/orderbook      # Market order book
PUT    /api/trading/orders/{id}    # Cancel order
GET    /api/trading/trades         # User trade history
```

#### Communication
```
GET    /api/messages               # User messages
POST   /api/messages               # Send message
GET    /api/notifications          # User notifications
PUT    /api/notifications/{id}/read # Mark notification read
POST   /api/updates                # Create company update
GET    /api/updates                # Company updates feed
```

## Authentication & Authorization

### Better-Auth Configuration

#### Core Authentication
- **Email/Password**: Primary authentication method
- **OAuth Providers**: Google, LinkedIn integration
- **Session Management**: Secure JWT tokens with refresh
- **MFA Support**: TOTP and SMS-based multi-factor authentication

#### Authorization Strategy
- **Role-Based Access Control**: Four user roles with granular permissions
- **Resource-Based Permissions**: Ownership and relationship-based access
- **API Route Guards**: Middleware for endpoint protection

### Security Measures
- **Password Security**: Bcrypt hashing with salt rounds ≥ 12
- **Session Security**: Secure HTTP-only cookies, CSRF protection
- **Rate Limiting**: API protection against abuse
- **Input Validation**: Comprehensive Zod schema validation

## Real-time Features

### WebSocket Implementation
- **Socket.IO**: Real-time bidirectional communication
- **Room Management**: Topic-based message routing
- **Event Types**: Investment updates, messages, notifications
- **Connection Management**: Auto-reconnection and heartbeat

### Background Job Processing
- **BullMQ**: Redis-based job queue system
- **Job Types**: Email sending, notifications, payments, analytics
- **Retry Logic**: Exponential backoff for failed jobs
- **Monitoring**: Queue health and performance metrics

## Payment Integration

### Escrow System
- **Smart Contracts**: Solidity-based escrow for secure fund holding
- **Traditional Escrow**: Third-party escrow service integration
- **Release Conditions**: Time-based and approval-based releases
- **Dispute Resolution**: Built-in dispute handling mechanisms

### Payment Providers
- **Stripe**: Credit card and bank account processing
- **Plaid**: Bank account linking and ACH transfers
- **Cryptocurrency**: Support for crypto-based investments

### Fee Structure
- **Platform Fees**: 5% on primary investments, 2% on secondary trades
- **Syndicate Carry**: 20% performance fee for syndicate leads
- **Payment Processing**: Transparent fee calculation and display

## File Management

### Storage Strategy
- **Primary Storage**: AWS S3 with Cloudflare R2 backup
- **CDN Integration**: Cloudflare CDN for global content delivery
- **File Processing**: Image optimization, document conversion
- **Access Control**: Time-limited signed URLs for secure access

### Upload Pipeline
- **Virus Scanning**: Real-time malware detection
- **Format Validation**: File type and size restrictions
- **Image Processing**: Automatic resizing and optimization
- **Document Processing**: PDF optimization and text extraction

## State Management

### Zustand Store Architecture
- **Authentication Store**: User session and profile management
- **UI Store**: Modal, loading, and layout state
- **Investment Store**: Investment data and filtering
- **Real-time Store**: WebSocket connection and live updates
- **Portfolio Store**: Portfolio data and analytics

### Performance Optimization
- **Selective Persistence**: Store state in localStorage strategically
- **Memory Management**: Automatic cleanup of stale data
- **Optimistic Updates**: Immediate UI updates with rollback capability

## Data Validation

### Zod Schema Strategy
- **Type Safety**: Runtime type checking with TypeScript integration
- **Form Validation**: Real-time validation with error messaging
- **API Validation**: Request/response validation middleware
- **Cross-field Validation**: Complex business rule validation

### Validation Layers
- **Client-side**: Immediate feedback for user inputs
- **API Gateway**: Request validation before processing
- **Database**: Constraint and trigger-based validation
- **Business Logic**: Domain-specific validation rules

## Communication System

### Messaging Architecture
- **Direct Messages**: User-to-user private communications
- **Pitch Comments**: Public discussions on investment opportunities
- **Investment Discussions**: Context-specific conversation threads
- **Real-time Delivery**: Instant message delivery via WebSocket

### Notification System
- **Push Notifications**: Mobile and desktop push notifications
- **Email Integration**: HTML email templates with branding
- **In-app Notifications**: Persistent notification center
- **Notification Preferences**: Granular user preference controls

## Deployment Strategy

### Infrastructure Setup
- **Development**: Local development with Docker containers
- **Staging**: Single-server deployment for testing
- **Production**: Multi-server setup with load balancing

### CI/CD Pipeline
- **Code Quality**: ESLint, Prettier, TypeScript checking
- **Testing**: Unit, integration, and E2E tests
- **Security**: Automated security scanning
- **Performance**: Load testing and monitoring

## Monitoring & Analytics

### Application Monitoring
- **Error Tracking**: Comprehensive error logging and alerting
- **Performance Monitoring**: Response times and resource usage
- **User Analytics**: Feature usage and conversion tracking
- **Business Metrics**: Investment volume, user growth, revenue

### Health Checks
- **Database**: Connection pooling and query performance
- **External Services**: Third-party API health monitoring
- **Background Jobs**: Queue depth and processing times
- **Real-time Features**: WebSocket connection health

## Security Considerations

### Data Protection
- **Encryption**: AES-256 encryption for sensitive data
- **Access Control**: Principle of least privilege
- **Audit Logging**: Comprehensive audit trails
- **Compliance**: SOC 2, GDPR, CCPA compliance

### Threat Mitigation
- **DDoS Protection**: Cloudflare protection and rate limiting
- **Injection Prevention**: Parameterized queries and input sanitization
- **Authentication Security**: Secure session management
- **File Security**: Virus scanning and type validation

## Performance Requirements

### Scalability Targets
- **Concurrent Users**: 10,000+ simultaneous users
- **API Response Time**: <200ms for 95th percentile
- **Database Queries**: <100ms for complex queries
- **File Upload**: <30 seconds for 50MB files

### Optimization Strategies
- **Caching**: Redis multi-layer caching strategy
- **Database Optimization**: Query optimization and indexing
- **CDN**: Global content delivery optimization
- **Background Processing**: Asynchronous job processing

## Development Guidelines

### Code Standards
- **TypeScript**: Strict mode with comprehensive typing
- **ESLint**: Airbnb configuration with custom rules
- **Prettier**: Consistent code formatting
- **Git Hooks**: Pre-commit quality checks

### Testing Strategy
- **Unit Tests**: Business logic and utility functions
- **Integration Tests**: API endpoints and database operations
- **E2E Tests**: Critical user journeys
- **Performance Tests**: Load testing for scalability

## Appendices

### A. Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://host:6379

# Authentication
BETTER_AUTH_SECRET=your-secret
BETTER_AUTH_URL=http://localhost:3000

# OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret

# Payments
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
PLAID_CLIENT_ID=your-plaid-client-id
PLAID_SECRET=your-plaid-secret

# File Storage
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_S3_BUCKET=your-bucket-name
CLOUDFLARE_R2_ACCESS_KEY_ID=your-r2-key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-r2-secret

# External Services
SENDGRID_API_KEY=your-sendgrid-key
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token

# Monitoring
DATADOG_API_KEY=your-datadog-key
```

### B. Database Connection Pooling

```typescript
// lib/database.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

### C. Error Handling Strategy

```typescript
// lib/error-handler.ts
export class AppError extends Error {
  public code: string
  public statusCode: number
  public isOperational: boolean

  constructor(message: string, code: string, statusCode: number = 500) {
    super(message)

    this.code = code
    this.statusCode = statusCode
    this.isOperational = true

    Error.captureStackTrace(this, this.constructor)
  }
}

export const errorHandler = (
  error: Error,
  request: NextRequest,
  response: NextResponse
) => {
  if (error instanceof AppError) {
    return response.status(error.statusCode).json({
      success: false,
      error: error.message,
      code: error.code
    })
  }

  // Log unexpected errors
  console.error('Unexpected error:', error)

  return response.status(500).json({
    success: false,
    error: 'Internal server error'
  })
}
```

### D. API Response Format

```typescript
// Standard API response format
{
  "success": true,
  "data": {},
  "message": "Operation completed successfully",
  "errors": null,
  "meta": {
    "timestamp": "2024-01-01T00:00:00Z",
    "version": "v1",
    "request_id": "req_12345"
  }
}

// Error response format
{
  "success": false,
  "data": null,
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format",
      "code": "VALIDATION_ERROR"
    }
  ],
  "meta": {
    "timestamp": "2024-01-01T00:00:00Z",
    "version": "v1",
    "request_id": "req_12345"
  }
}
```

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
- [ ] Set up development environment and CI/CD
- [ ] Implement authentication system
- [ ] Create basic user management
- [ ] Set up database schema
- [ ] Implement basic API structure

### Phase 2: Core Features (Week 3-6)
- [ ] Build startup and pitch management
- [ ] Implement investment flow
- [ ] Create portfolio tracking
- [ ] Add file upload and storage
- [ ] Build communication system

### Phase 3: Advanced Features (Week 7-10)
- [ ] Implement syndicate functionality
- [ ] Build secondary marketplace
- [ ] Add advanced analytics
- [ ] Create social features
- [ ] Implement mobile responsiveness

### Phase 4: Production Readiness (Week 11-12)
- [ ] Security audit and hardening
- [ ] Performance optimization
- [ ] Comprehensive testing
- [ ] Documentation completion
- [ ] Production deployment

## Success Criteria

### Technical Metrics
- **Performance**: <200ms API response time, <2s page load
- **Reliability**: 99.9% uptime, <0.1% error rate
- **Security**: SOC 2 compliance, zero data breaches
- **Scalability**: Support 100K+ users, $100M+ transaction volume

### Business Metrics
- **User Growth**: 10K+ registered users in first year
- **Investment Volume**: $10M+ in investments processed
- **Platform Engagement**: 60% monthly active users
- **Market Share**: Top 3 position in retail angel investing

## Support and Maintenance

### Ongoing Activities
- **Security Updates**: Monthly security patches and updates
- **Feature Development**: Quarterly feature releases
- **Performance Monitoring**: Continuous optimization
- **User Support**: 24/7 technical support availability

### Documentation
- **API Documentation**: OpenAPI/Swagger specifications
- **User Guides**: Comprehensive user documentation
- **Developer Docs**: Technical implementation guides
- **Runbooks**: Operational procedures for support team

---

## Conclusion

This technical specification document provides a comprehensive foundation for building a world-class angel investing platform. The architecture supports the unique requirements of group investing, portfolio tracking, secondary trading, and investor communications while maintaining security, scalability, and regulatory compliance.

The modular design allows for incremental development and deployment, with each component designed to work independently while integrating seamlessly with the overall platform. The chosen technology stack provides the performance, security, and developer experience necessary for rapid iteration and scaling.

*This document will be updated as requirements evolve and new features are added to the platform.*