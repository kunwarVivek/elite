# Angel Investing Marketplace

A comprehensive B2C SaaS platform connecting angel investors with promising startups through a modern, secure, and scalable marketplace.

## 🚀 Tech Stack

### Frontend
- **React 18** - Modern React with hooks and concurrent features
- **Vite** - Fast build tool and development server
- **TypeScript** - Type-safe JavaScript
- **Zustand** - Lightweight state management
- **TanStack** - Router, Query, Table, and Form utilities
- **TailwindCSS** - Utility-first CSS framework
- **ShadCN/UI** - Modern component library
- **React Hook Form + Zod** - Form handling and validation

### Backend
- **Express.js** - Fast, unopinionated web framework
- **TypeScript** - Type-safe JavaScript
- **PostgreSQL** - Advanced relational database
- **Prisma** - Modern database toolkit
- **Better Auth** - Secure authentication system
- **BullMQ** - Job queue processing
- **Socket.IO** - Real-time communication
- **Winston** - Logging framework

### DevOps & Infrastructure
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **Nginx** - Reverse proxy and load balancing
- **Redis** - Caching and session storage

## 📁 Project Structure

```
angel-investing-marketplace/
├── backend/                 # Express.js API server
│   ├── src/
│   │   ├── controllers/     # Route controllers
│   │   ├── middleware/      # Custom middleware
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── utils/          # Utility functions
│   │   ├── jobs/           # BullMQ job processors
│   │   ├── config/         # Configuration files
│   │   └── index.ts        # Entry point
│   ├── prisma/
│   │   └── schema.prisma   # Database schema
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom hooks
│   │   ├── stores/        # Zustand stores
│   │   ├── lib/           # Utilities and configs
│   │   ├── types/         # TypeScript types
│   │   └── main.tsx       # Entry point
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   └── .env.example
├── docker/                # Docker configuration
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   └── docker-compose.yml
├── .gitignore
└── README.md
```

## 🛠️ Getting Started

### Prerequisites
- Node.js 18+
- Docker and Docker Compose
- PostgreSQL (or use Docker)
- Redis (or use Docker)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd angel-investing-marketplace
   ```

2. **Set up environment variables**
   ```bash
   # Backend
   cp backend/.env.example backend/.env
   # Edit backend/.env with your configuration

   # Frontend
   cp frontend/.env.example frontend/.env
   # Edit frontend/.env with your configuration
   ```

3. **Install dependencies**
   ```bash
   # Backend
   cd backend
   npm install

   # Frontend
   cd ../frontend
   npm install
   ```

4. **Set up the database**
   ```bash
   cd ../backend
   npx prisma generate
   npx prisma db push
   ```

5. **Start with Docker (Recommended)**
   ```bash
   cd ..
   docker-compose up -d
   ```

6. **Or start manually**
   ```bash
   # Backend (in one terminal)
   cd backend
   npm run dev

   # Frontend (in another terminal)
   cd frontend
   npm run dev
   ```

## 🚀 Available Scripts

### Backend
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:migrate` - Create and apply migrations
- `npm run db:studio` - Open Prisma Studio
- `npm run lint` - Run ESLint
- `npm run test` - Run tests

### Frontend
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run test` - Run tests

## 🌐 Environment Variables

### Backend (.env)
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/angel_investing_marketplace"

# Authentication
BETTER_AUTH_SECRET="your-super-secret-key-here"
BETTER_AUTH_URL="http://localhost:3001"

# JWT
JWT_SECRET="your-jwt-secret-key-here"

# Email Service
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# Payments (Stripe)
STRIPE_PUBLISHABLE_KEY="pk_test_your_stripe_publishable_key"
STRIPE_SECRET_KEY="sk_test_your_stripe_secret_key"

# And more...
```

### Frontend (.env)
```env
# API Configuration
VITE_API_URL="http://localhost:3001/api"
VITE_SOCKET_URL="http://localhost:3001"

# Authentication
VITE_BETTER_AUTH_URL="http://localhost:3001"

# Payments
VITE_STRIPE_PUBLISHABLE_KEY="pk_test_your_stripe_publishable_key"
```

## 🐳 Docker Development

The project includes a complete Docker setup with:

- **PostgreSQL** - Database
- **Redis** - Caching and sessions
- **Backend API** - Express.js server
- **Frontend** - React application with Nginx

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Rebuild services
docker-compose up -d --build
```

## 🔒 Security Features

- **Better Auth** - Secure authentication with multiple providers
- **Helmet** - Security headers
- **CORS** - Cross-origin resource sharing configuration
- **Input validation** - Zod schema validation
- **SQL injection protection** - Prisma ORM
- **XSS protection** - Secure headers and sanitization

## 📊 Monitoring & Logging

- **Winston** - Structured logging
- **Health checks** - Docker health checks
- **Morgan** - HTTP request logging
- **CORS logging** - Cross-origin request logging

## 🚀 Deployment

### Production Checklist
- [ ] Set up production database
- [ ] Configure environment variables
- [ ] Set up SSL certificates
- [ ] Configure reverse proxy (Nginx)
- [ ] Set up monitoring (optional)
- [ ] Configure CI/CD pipeline

### Docker Production
```bash
# Build for production
docker-compose -f docker-compose.prod.yml up -d

# Or use individual Dockerfiles
docker build -f docker/Dockerfile.backend -t backend:latest ./backend
docker build -f docker/Dockerfile.frontend -t frontend:latest ./frontend
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the ISC License - see the LICENSE file for details.

## 🆘 Support

For support, email support@angelinvesting.market or join our Slack channel.

## 🔄 Updates

This project follows semantic versioning. Check the [CHANGELOG](CHANGELOG.md) for updates.