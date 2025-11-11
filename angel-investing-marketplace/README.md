# Angel Investing Marketplace

> A comprehensive B2C SaaS platform connecting angel investors with promising startups through a modern, secure, and scalable marketplace.

[![License](https://img.shields.io/badge/license-ISC-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org)
[![Tests](https://img.shields.io/badge/tests-132%2B%20passing-success.svg)](#testing)

## Overview

The Angel Investing Marketplace is a production-ready platform that streamlines the connection between angel investors and startups seeking funding. Built with modern technologies and best practices, it offers a complete investment ecosystem with subscription-based monetization.

### Key Features

- 🚀 **Complete Investment Platform** - SAFE agreements, convertible notes, cap tables, term sheets
- 💳 **Stripe Integration** - Subscription-based pricing with automated billing and trial management
- 📧 **Email Notifications** - 8 lifecycle email templates for subscription events
- 🔐 **Feature Gating** - Usage-based limits and tier-specific access control
- 📊 **Admin Dashboard** - Revenue metrics, user management, analytics, and approval workflows
- 🎨 **Modern UI** - Responsive design with dark mode support using Tailwind CSS
- ✅ **Production Ready** - Comprehensive testing suite with 132+ test cases
- 🔒 **Enterprise Security** - PCI compliant, SSL encrypted, SOC 2 ready

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Stripe account (for payments)
- Redis (optional, for caching)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd angel-investing-marketplace

# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Set up environment variables
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Configure your environment variables
# - DATABASE_URL, JWT_SECRET, STRIPE keys, etc.

# Run database migrations
cd backend
npx prisma generate
npx prisma migrate dev

# Seed subscription plans
npx ts-node prisma/seeds/subscription-plans.seed.ts

# Start development servers
npm run dev  # Backend (port 3001)
cd ../frontend && npm run dev  # Frontend (port 3000)
```

Visit `http://localhost:3000` to see the platform.

## Tech Stack

### Frontend
- **React 18** - Modern UI with hooks and concurrent features
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **TanStack Router** - Type-safe routing
- **TanStack Query** - Powerful data fetching and caching
- **Zustand** - Lightweight state management
- **TailwindCSS** - Utility-first styling
- **shadcn/ui** - Accessible component library
- **Stripe Elements** - Secure payment forms

### Backend
- **Express.js** - Fast, unopinionated web framework
- **TypeScript** - Type-safe JavaScript
- **PostgreSQL** - Advanced relational database
- **Prisma** - Modern database toolkit and ORM
- **Stripe** - Payment processing and subscriptions
- **Nodemailer** - Email notifications
- **Winston** - Structured logging
- **BullMQ** - Job queue processing

### Infrastructure
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **Redis** - Caching and session storage
- **Nginx** - Reverse proxy

## Project Structure

```
angel-investing-marketplace/
├── backend/                    # Express.js API server
│   ├── src/
│   │   ├── controllers/        # Route controllers
│   │   ├── services/           # Business logic (Stripe, Email, etc.)
│   │   ├── middleware/         # Feature gating, auth, validation
│   │   ├── routes/             # API endpoints
│   │   ├── config/             # Configuration files
│   │   └── __tests__/          # Test suites (Jest)
│   └── prisma/
│       ├── schema.prisma       # Database schema
│       └── seeds/              # Seed data
│
├── frontend/                   # React application
│   ├── src/
│   │   ├── components/         # Reusable components
│   │   ├── routes/             # Page components
│   │   ├── stores/             # Zustand state stores
│   │   ├── lib/                # Utilities and API clients
│   │   └── __tests__/          # Component tests (Vitest)
│   └── public/                 # Static assets
│
├── docs/                       # Documentation
│   ├── USER_GUIDE.md          # End-user documentation
│   ├── DEVELOPER_GUIDE.md     # Developer setup and workflows
│   ├── DEPLOYMENT_GUIDE.md    # Production deployment
│   ├── TESTING_GUIDE.md       # Testing guidelines
│   └── STRIPE_INTEGRATION_GUIDE.md # Payment setup
│
└── docker/                     # Docker configuration
    ├── Dockerfile.backend
    ├── Dockerfile.frontend
    └── docker-compose.yml
```

## Documentation

- 📖 **[User Guide](docs/USER_GUIDE.md)** - Platform features and how to use them
- 👨‍💻 **[Developer Guide](docs/DEVELOPER_GUIDE.md)** - Setup, development, and contribution
- 🚀 **[Deployment Guide](docs/DEPLOYMENT_GUIDE.md)** - Production deployment instructions
- ✅ **[Testing Guide](docs/TESTING_GUIDE.md)** - Testing strategy and guidelines
- 💳 **[Stripe Integration](docs/STRIPE_INTEGRATION_GUIDE.md)** - Payment setup
- 📧 **[Email Notifications](docs/EMAIL_NOTIFICATIONS.md)** - Email system documentation
- 🔐 **[Feature Gating](docs/FEATURE_GATING_GUIDE.md)** - Subscription-based access control
- 🗄️ **[Database Setup](docs/DATABASE_SETUP.md)** - Schema and migrations

## Subscription Plans

| Feature | Free | Pro ($29/mo) | Growth ($99/mo) | Enterprise ($499/mo) |
|---------|------|--------------|-----------------|----------------------|
| Browse Deals | ✅ | ✅ | ✅ | ✅ |
| Investment Tracking | 5 max | Unlimited | Unlimited | Unlimited |
| SAFE Agreements | ❌ | ✅ | ✅ | ✅ |
| Cap Tables | ❌ | Basic | Advanced | Advanced + API |
| Waterfall Analysis | ❌ | ❌ | ✅ | ✅ |
| Document Storage | 100MB | 5GB | 50GB | Unlimited |
| Support | Community | Email | Email + Chat | Dedicated Manager |
| Free Trial | N/A | 14 days | 14 days | 30 days |

## Testing

The platform includes comprehensive test coverage:

- **132+ test cases** across backend and frontend
- **77 backend tests** (Jest) - Stripe, webhooks, emails, subscriptions
- **55+ frontend tests** (Vitest) - Payment forms, components, flows
- **100% coverage** of payment-critical paths

```bash
# Run backend tests
cd backend && npm test

# Run frontend tests
cd frontend && npm test

# Run tests with coverage
npm run test:coverage
```

See [Testing Guide](docs/TESTING_GUIDE.md) for details.

## Environment Variables

### Backend (.env)

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/angel_marketplace"

# Authentication
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"
JWT_EXPIRES_IN="7d"

# Stripe (Required for payments)
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Email (Optional - has dev fallback)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="Angel Marketplace <noreply@yourdomain.com>"

# Application
PORT=3001
NODE_ENV="production"
FRONTEND_URL="https://yourdomain.com"
```

### Frontend (.env)

```bash
# API Configuration
VITE_API_URL="https://api.yourdomain.com/api"

# Stripe (Required for payments)
VITE_STRIPE_PUBLISHABLE_KEY="pk_live_..."
```

See `.env.example` files for complete configuration.

## Docker Deployment

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Rebuild and restart
docker-compose up -d --build
```

## Security

- **PCI Compliant** - Stripe handles all payment data
- **SSL Encrypted** - All data in transit is encrypted
- **SOC 2 Ready** - Security controls and audit trails
- **GDPR Compliant** - Data privacy and user rights
- **Role-Based Access Control** - Admin, investor, founder roles
- **Input Validation** - Zod schema validation throughout
- **SQL Injection Protection** - Prisma ORM parameterized queries
- **XSS Protection** - Sanitization and CSP headers

## Performance

- **CDN Integration** - Static asset delivery
- **Database Indexing** - Optimized query performance
- **API Caching** - Redis-backed response caching
- **Code Splitting** - Lazy-loaded route components
- **Image Optimization** - Compressed and responsive images

## Monitoring

- **Structured Logging** - Winston with JSON formatting
- **Error Tracking** - Comprehensive error handling
- **Health Checks** - Docker health checks
- **Request Logging** - Morgan HTTP request logs
- **Webhook Logs** - Stripe event processing logs

## Revenue Potential

Based on freemium conversion rates and pricing:

- **Month 1**: $2,000 MRR (20 paid users)
- **Month 3**: $10,000 MRR (100 paid users)
- **Month 6**: $25,000 MRR (250 paid users)
- **Month 12**: $60,000 MRR (600 paid users) = **$720K ARR**

With optimization: **$1M+ ARR potential within 12 months**

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## Support

- 📧 **Email**: support@angelinvesting.market
- 💬 **Discord**: [Join our community](#)
- 📚 **Documentation**: [docs/](docs/)
- 🐛 **Issues**: [GitHub Issues](#)

## Roadmap

### Completed ✅
- Complete investment instruments (SAFE, convertible notes, cap tables)
- Stripe subscription integration with trial management
- Email notification system (8 lifecycle templates)
- Feature gating and usage tracking
- Admin dashboard with analytics
- Comprehensive testing suite

### Upcoming 🚀
- Mobile application (React Native)
- Advanced analytics and reporting
- AI-powered startup matching
- Secondary market for shares
- Syndicate formation tools
- International payment support

## Acknowledgments

Built with:
- [React](https://react.dev)
- [Express.js](https://expressjs.com)
- [Prisma](https://www.prisma.io)
- [Stripe](https://stripe.com)
- [TailwindCSS](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)

---

**Made with ❤️ for the angel investing community**

For detailed setup and development instructions, see the [Developer Guide](docs/DEVELOPER_GUIDE.md).
