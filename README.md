# Elite - Angel Investing Marketplace

> A comprehensive B2C SaaS platform connecting angel investors with promising startups through group investing, portfolio tracking, secondary trading, and social features.

## 🎯 Project Status

**Current Phase:** ✅ P0-P3 Complete (62+ pages, ~32,000 lines)

| Phase | Status | Features |
|-------|--------|----------|
| **P0: Regulatory & Compliance** | ✅ Complete | Accreditation, KYC/AML, Tax Docs, Admin Workflows |
| **P1: Core Investment** | ✅ Complete | Discovery, Commitment, Portfolio, Syndicates, Updates |
| **P2: Secondary Marketplace** | ✅ Complete | Share Trading, Order Book, Settlement |
| **P3: Social & Content** | ✅ Complete | News Feed, Trending, Profiles, Network, Activity |
| **P4+: Advanced Features** | 📋 Planned | See [Product Docs](docs/product/) |

**Build Status:** ✅ TypeScript compiling, ready for testing

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- Docker (optional, recommended)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd elite

# Install dependencies
cd angel-investing-marketplace/backend
npm install

cd ../frontend
npm install

# Set up environment
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Configure your database and Redis URLs in .env files

# Run database migrations
cd backend
npx prisma migrate dev

# Start development servers
npm run dev # Backend (port 3000)

# In another terminal
cd frontend
npm run dev # Frontend (port 5173)
```

Visit `http://localhost:5173` to see the application.

---

## 📁 Project Structure

```
elite/
├── angel-investing-marketplace/   # Main application
│   ├── backend/                   # Express.js API server
│   │   ├── src/
│   │   │   ├── routes/           # API endpoints
│   │   │   ├── services/         # Business logic
│   │   │   ├── controllers/      # Route controllers
│   │   │   ├── middleware/       # Auth, validation, etc.
│   │   │   ├── jobs/             # Background jobs
│   │   │   └── config/           # Configuration
│   │   └── prisma/
│   │       └── schema.prisma     # Database schema
│   │
│   └── frontend/                  # React application
│       ├── src/
│       │   ├── pages/            # 62 pages
│       │   ├── components/       # Reusable UI
│       │   ├── hooks/            # Custom hooks
│       │   ├── stores/           # State management
│       │   └── lib/              # Utilities
│       │
│       ├── README.md
│       ├── DEPLOYMENT_GUIDE.md
│       ├── MIGRATION_STRATEGY.md
│       ├── TESTING.md
│       └── TESTING_GUIDE.md
│
├── docs/                          # Documentation
│   ├── product/                   # Product requirements
│   │   ├── prd.md                # Product Requirements
│   │   ├── frd.md                # Functional Requirements
│   │   └── prompt.md             # Original prompt
│   │
│   └── architecture/              # Architecture docs
│       ├── api-design.md
│       ├── auth-strategy.md
│       ├── database-schema.md
│       └── ... (8 more)
│
├── README.md                      # This file
├── DEVELOPMENT.md                 # Development guide
└── ARCHITECTURE.md                # System architecture
```

---

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** - Lightning-fast builds
- **TanStack Router** - Type-safe routing
- **Zustand** - Lightweight state management
- **shadcn/ui** - Modern component library
- **Tailwind CSS** - Utility-first styling
- **React Hook Form + Zod** - Form validation

### Backend
- **Express.js** with TypeScript
- **Prisma ORM** - Type-safe database access
- **PostgreSQL** - Relational database
- **Better Auth** - Secure authentication
- **BullMQ** - Job queue processing
- **Redis** - Caching and sessions
- **Winston** - Logging
- **Socket.IO** - Real-time features

### Infrastructure
- **Docker** - Containerization
- **Nginx** - Reverse proxy
- **GitHub Actions** - CI/CD (planned)

---

## 📚 Documentation

- **[DEVELOPMENT.md](DEVELOPMENT.md)** - Development setup and workflows
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System architecture overview
- **[Product Docs](docs/product/)** - Product requirements and specifications
- **[Architecture Docs](docs/architecture/)** - Detailed architecture documents
- **[App README](angel-investing-marketplace/README.md)** - App-specific documentation
- **[Deployment Guide](angel-investing-marketplace/DEPLOYMENT_GUIDE.md)** - Deployment instructions
- **[Testing Guide](angel-investing-marketplace/TESTING_GUIDE.md)** - Testing strategies

---

## 🎨 Features Implemented

### P0: Regulatory Compliance
- ✅ SEC Regulation D accreditation (4 methods)
- ✅ KYC/AML screening (PEP, sanctions, adverse media)
- ✅ IRS tax document generation (K-1, 1099-DIV, 1099-B, 8949)
- ✅ Admin approval workflows with SLA tracking

### P1: Core Investment Platform
- ✅ Investment discovery and browsing
- ✅ Investment commitment flow
- ✅ Portfolio dashboard with analytics (IRR, MOIC, Sharpe)
- ✅ Syndicate creation and management
- ✅ Company update system with reactions

### P2: Secondary Marketplace
- ✅ Share listing and trading
- ✅ Order book with price-time matching
- ✅ Buy/sell flows
- ✅ Trade history and settlement (T+3)
- ✅ 6-month holding period enforcement

### P3: Social & Content Features
- ✅ Personalized news feed
- ✅ Trending topics and tags
- ✅ Investor profiles (view and edit)
- ✅ Network discovery
- ✅ Activity feed
- ✅ Content management for founders

---

## 🔐 Security & Compliance

- **Authentication:** Better Auth with session management
- **Authorization:** Role-based access control (RBAC)
- **Data Protection:** Encrypted sensitive data
- **Audit Logging:** Complete audit trail for compliance
- **SEC Compliance:** Regulation D accreditation
- **AML/KYC:** Comprehensive screening
- **Tax Compliance:** IRS-compliant document generation

---

## 🧪 Testing

```bash
# Backend tests
cd angel-investing-marketplace/backend
npm test

# Frontend tests
cd angel-investing-marketplace/frontend
npm test

# E2E tests (coming soon)
npm run test:e2e
```

See [TESTING_GUIDE.md](angel-investing-marketplace/TESTING_GUIDE.md) for comprehensive testing strategies.

---

## 🚢 Deployment

The application is containerized and ready for deployment.

```bash
# Build Docker images
docker-compose build

# Run with Docker
docker-compose up -d
```

See [DEPLOYMENT_GUIDE.md](angel-investing-marketplace/DEPLOYMENT_GUIDE.md) for detailed deployment instructions.

---

## 📝 Development Status

### Completed (P0-P3)
- ✅ 62 pages of production UI
- ✅ ~32,000 lines of code
- ✅ Full TypeScript compilation
- ✅ Database schema complete
- ✅ API endpoints implemented
- ✅ Authentication system
- ✅ Background job processing

### In Progress
- 🔄 Database migration setup
- 🔄 Integration testing
- 🔄 E2E test suite

### Planned (P4+)
- 📋 Mobile app (iOS/Android)
- 📋 Advanced analytics
- 📋 AI-powered matching
- 📋 International expansion
- 📋 API for third-party integrations

---

## 🤝 Contributing

1. Create a feature branch from the appropriate base branch
2. Make your changes
3. Write/update tests
4. Submit a pull request

See [DEVELOPMENT.md](DEVELOPMENT.md) for detailed contribution guidelines.

---

## 📄 License

[Add your license here]

---

## 🔗 Links

- **Product Requirements:** [docs/product/prd.md](docs/product/prd.md)
- **Functional Requirements:** [docs/product/frd.md](docs/product/frd.md)
- **Architecture Overview:** [ARCHITECTURE.md](ARCHITECTURE.md)
- **Development Guide:** [DEVELOPMENT.md](DEVELOPMENT.md)

---

**Built with ❤️ for the angel investing community**
