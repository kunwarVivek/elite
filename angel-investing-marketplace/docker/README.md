# Docker Deployment Guide - Angel Investing Marketplace

Complete guide for deploying the Angel Investing Marketplace using Docker and Docker Compose.

## Table of Contents
- [Quick Start](#quick-start)
- [Architecture Overview](#architecture-overview)
- [Prerequisites](#prerequisites)
- [Development Setup](#development-setup)
- [Production Deployment](#production-deployment)
- [Services](#services)
- [Environment Variables](#environment-variables)
- [Secrets Management](#secrets-management)
- [Networking](#networking)
- [Monitoring](#monitoring)
- [Security Best Practices](#security-best-practices)
- [Troubleshooting](#troubleshooting)

## Quick Start

Get the application running in 5 minutes:

```bash
# 1. Clone the repository
git clone <repository-url>
cd angel-investing-marketplace/docker

# 2. Generate development secrets
./scripts/generate-dev-secrets.sh

# 3. Start the application
docker-compose up -d

# 4. Verify all services are healthy
docker-compose ps

# 5. Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:3001
# Grafana: http://localhost:3000 (monitoring)
```

## Architecture Overview

The application consists of 5 core services in development and 8 services in production:

### Development Architecture
```
┌─────────────────────────────────────────────────────┐
│                  Docker Network                      │
│                                                      │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐     │
│  │ Frontend │◄───│ Backend  │◄───│ Postgres │     │
│  │  :3000   │    │  :3001   │    │  :5432   │     │
│  └──────────┘    └─────┬────┘    └──────────┘     │
│                        │                            │
│                        │         ┌──────────┐      │
│                        └────────►│  Redis   │      │
│                                  │  :6379   │      │
│                                  └──────────┘      │
└─────────────────────────────────────────────────────┘
```

### Production Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                         Load Balancer                            │
│                           (Nginx)                                │
│                          :80, :443                               │
└───────────────────────────┬─────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼────────┐  ┌───────▼────────┐  ┌──────▼──────┐
│   Frontend     │  │   Frontend     │  │  Monitoring  │
│   (Replica 1)  │  │   (Replica 2)  │  │   Network    │
└───────┬────────┘  └───────┬────────┘  │              │
        │                   │            │ ┌──────────┐ │
        └─────────┬─────────┘            │ │Prometheus│ │
                  │                      │ └──────────┘ │
          ┌───────▼────────┐             │ ┌──────────┐ │
          │    Backend     │◄────────────┤ │ Grafana  │ │
          │   (Replica 1)  │             │ └──────────┘ │
          └───────┬────────┘             │ ┌──────────┐ │
          ┌───────▼────────┐             │ │AlertMgr  │ │
          │    Backend     │             │ └──────────┘ │
          │   (Replica 2)  │             └──────────────┘
          └───────┬────────┘
                  │
        ┌─────────┼─────────┐
        │                   │
┌───────▼────────┐  ┌───────▼────────┐
│   Postgres     │  │     Redis      │
│    :5432       │  │     :6379      │
└────────────────┘  └────────────────┘
```

### Design Decisions

**Why Secrets Management?**
- Separates sensitive data from configuration
- Enables secure production deployments
- Supports secret rotation without code changes
- Prevents accidental credential exposure

**Why Health Checks?**
- Ensures services are ready before accepting traffic
- Enables automatic recovery from failures
- Supports zero-downtime deployments
- Provides monitoring integration

**Why Multiple Networks?**
- Isolates services by function (frontend, backend, monitoring)
- Reduces attack surface area
- Simplifies firewall rules
- Improves security posture

**Why Container Replication?**
- Provides high availability
- Enables rolling updates
- Distributes load across instances
- Improves fault tolerance

## Prerequisites

- **Docker**: Version 20.10 or higher
- **Docker Compose**: Version 2.0 or higher
- **System Resources**:
  - 4GB RAM minimum (8GB recommended for production)
  - 20GB disk space
  - 2 CPU cores minimum (4+ recommended)

### Install Docker

**macOS:**
```bash
brew install --cask docker
```

**Linux:**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

**Windows:**
Download Docker Desktop from https://www.docker.com/products/docker-desktop

### Verify Installation
```bash
docker --version
docker-compose --version
```

## Development Setup

### 1. Generate Development Secrets

Development secrets are safe placeholder values for local testing:

```bash
cd angel-investing-marketplace/docker
./scripts/generate-dev-secrets.sh
```

This creates:
- Database credentials (development-safe passwords)
- JWT signing keys (test keys only)
- API keys (placeholder format for Stripe test mode, Plaid sandbox)
- Encryption keys (development-strength only)

**⚠️ WARNING**: Never use development secrets in production!

### 2. Configure Environment Variables

Copy the example file and customize:

```bash
cp .env.example .env
# Edit .env with your preferred editor
```

For development, the defaults are usually fine. See [Environment Variables](#environment-variables) section for details.

### 3. Start Services

```bash
# Start all services in background
docker-compose up -d

# View logs
docker-compose logs -f

# Check service health
docker-compose ps
```

### 4. Initialize Database

On first run, the database schema is automatically created by backend migrations:

```bash
# View migration logs
docker-compose logs backend | grep migration
```

### 5. Access Services

- **Frontend Application**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Documentation**: http://localhost:3001/api/docs
- **Health Check**: http://localhost:3001/health

### Development Workflow

```bash
# Stop all services
docker-compose down

# Rebuild after code changes
docker-compose up -d --build

# View specific service logs
docker-compose logs -f backend

# Execute commands in containers
docker-compose exec backend npm run migrate
docker-compose exec postgres psql -U postgres -d angel_investing_marketplace

# Clean everything (including volumes)
docker-compose down -v
```

## Production Deployment

Production deployment uses `docker-compose.prod.yml` with additional services and security features.

### 1. Server Requirements

**Minimum Specs:**
- 4 CPU cores
- 8GB RAM
- 100GB SSD storage
- Ubuntu 20.04 LTS or newer

**Recommended Specs:**
- 8 CPU cores
- 16GB RAM
- 250GB SSD storage
- Dedicated PostgreSQL server (RDS/managed database)

### 2. Generate Production Secrets

```bash
cd angel-investing-marketplace/docker/secrets
./generate-secrets.sh
```

This generates cryptographically strong secrets with proper entropy requirements.

**Additional Manual Configuration:**

You must manually add secrets for external services:

```bash
# Stripe (get from https://dashboard.stripe.com)
echo "sk_live_YOUR_STRIPE_SECRET_KEY" > secrets/stripe_secret_key.txt
echo "whsec_YOUR_WEBHOOK_SECRET" > secrets/stripe_webhook_secret.txt

# Cloudflare R2 (get from Cloudflare dashboard)
echo "YOUR_R2_ACCESS_KEY" > secrets/cloudflare_r2_access_key.txt
echo "YOUR_R2_SECRET_KEY" > secrets/cloudflare_r2_secret_key.txt

# Email Service (e.g., SendGrid, Mailgun)
echo "YOUR_EMAIL_API_KEY" > secrets/email_service_api_key.txt

# Alert Manager (optional)
echo "YOUR_SMTP_PASSWORD" > secrets/smtp_password.txt
echo "YOUR_SLACK_WEBHOOK" > secrets/slack_webhook.txt
echo "YOUR_PAGERDUTY_KEY" > secrets/pagerduty_routing_key.txt
```

### 3. SSL Configuration

Set up SSL certificates for HTTPS:

```bash
# Using Let's Encrypt with Certbot
sudo certbot certonly --standalone -d yourdomain.com -d api.yourdomain.com

# Copy certificates to docker directory
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem docker/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem docker/ssl/
```

### 4. Production Environment Variables

Configure production settings in `.env.prod`:

```bash
# Database
POSTGRES_DB=angel_investing_marketplace

# API URLs
API_BASE_URL=https://api.yourdomain.com
WEBSOCKET_URL=wss://api.yourdomain.com

# Domain configuration
DOMAIN=yourdomain.com
API_DOMAIN=api.yourdomain.com
```

### 5. Deploy

```bash
# Pull latest images
docker-compose -f docker-compose.prod.yml pull

# Start production services
docker-compose -f docker-compose.prod.yml up -d

# Verify all services are healthy
docker-compose -f docker-compose.prod.yml ps

# Check logs
docker-compose -f docker-compose.prod.yml logs -f
```

### 6. Post-Deployment Verification

```bash
# Test health endpoints
curl https://api.yourdomain.com/health
curl https://yourdomain.com/health

# Verify SSL
curl -I https://yourdomain.com

# Check monitoring
# Access Grafana at http://your-server-ip:3000
# Default user: admin, password: (from grafana_admin_password.txt)
```

## Services

### PostgreSQL Database

**Image**: `postgres:15-alpine`

**Purpose**: Primary data storage for users, investments, companies, and transactions.

**Configuration**:
- Port: 5432 (internal only in production)
- Database: `angel_investing_marketplace`
- Data persistence: `postgres_data` volume

**Resource Limits (Production)**:
- CPU: 0.25-0.5 cores
- Memory: 256MB-512MB

**Health Check**: `pg_isready` every 30s

### Redis Cache

**Image**: `redis:7-alpine`

**Purpose**: Session storage, caching, and BullMQ job queues.

**Configuration**:
- Port: 6379 (internal only in production)
- Max memory: 256MB
- Eviction policy: allkeys-lru
- Data persistence: `redis_data` volume

**Resource Limits (Production)**:
- CPU: 0.10-0.25 cores
- Memory: 128MB-256MB

**Health Check**: `redis-cli ping` every 30s

### Backend API

**Build**: `Dockerfile.backend`

**Purpose**: Node.js/Express API server handling all business logic.

**Configuration**:
- Port: 3001
- Node environment: production
- Health endpoint: `/health`

**Features**:
- RESTful API
- WebSocket support for real-time updates
- JWT authentication
- Database migrations
- Job queue processing
- File uploads to Cloudflare R2

**Resource Limits (Production)**:
- CPU: 0.5-1.0 cores
- Memory: 512MB-1GB
- Replicas: 2

**Health Check**: HTTP GET `/health` every 30s

### Frontend Application

**Build**: `Dockerfile.frontend`

**Purpose**: React/TypeScript SPA served by Nginx.

**Configuration**:
- Port: 80 (3000 exposed in development)
- Nginx optimization
- Static asset caching
- Gzip compression

**Resource Limits (Production)**:
- CPU: 0.25-0.5 cores
- Memory: 128MB-256MB
- Replicas: 2

**Health Check**: HTTP GET `/health` every 30s

### Nginx Reverse Proxy (Production Only)

**Image**: `nginx:1.25-alpine`

**Purpose**: Load balancing, SSL termination, and request routing.

**Configuration**:
- Ports: 80 (HTTP), 443 (HTTPS)
- SSL/TLS configuration
- Load balancing across backend/frontend replicas
- Rate limiting
- Security headers

### Prometheus (Production Only)

**Image**: `prom/prometheus:latest`

**Purpose**: Metrics collection and storage.

**Configuration**:
- Port: 9090 (internal only)
- Scrape interval: 15s
- Retention: 200 hours
- Data persistence: `prometheus_data` volume

**Metrics Collected**:
- Container CPU/memory usage
- HTTP request rates and latencies
- Database connection pool stats
- Redis hit/miss rates
- Custom application metrics

### Grafana (Production Only)

**Image**: `grafana/grafana:latest`

**Purpose**: Metrics visualization and dashboards.

**Configuration**:
- Port: 3000
- Admin password: from secrets
- Datasources: Prometheus
- Pre-configured dashboards

**Dashboards**:
- System overview
- Application performance
- Database metrics
- API endpoints
- Error rates

### Alert Manager (Production Only)

**Image**: `prom/alertmanager:latest`

**Purpose**: Alert routing and notification.

**Configuration**:
- Port: 9093
- Notification channels: Email, Slack, PagerDuty

**Alert Rules**:
- High error rates
- Service downtime
- High resource usage
- Database connection issues
- Slow response times

## Environment Variables

All environment variables are documented in `.env.example`. Key categories:

### Database Configuration
```bash
POSTGRES_DB=angel_investing_marketplace
POSTGRES_USER=postgres
POSTGRES_PASSWORD=(from secrets in production)
DATABASE_URL=(from secrets)
```

### Redis Configuration
```bash
REDIS_URL=(from secrets)
```

### Application Configuration
```bash
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://yourdomain.com
```

### Authentication
```bash
BETTER_AUTH_SECRET=(from secrets)
JWT_SECRET=(from secrets)
```

### Third-party Services
```bash
STRIPE_SECRET_KEY=(from secrets)
CLOUDFLARE_R2_ACCESS_KEY=(from secrets)
EMAIL_SERVICE_API_KEY=(from secrets)
```

### Monitoring (Production)
```bash
GRAFANA_ADMIN_PASSWORD=(from secrets)
ALERT_EMAIL=alerts@yourdomain.com
SLACK_WEBHOOK=(from secrets)
```

See [.env.example](/.env.example) for complete list with descriptions.

## Secrets Management

### Development Secrets

Generated by `scripts/generate-dev-secrets.sh`:
- Uses weak, clearly-marked test values
- Safe for local development
- Never use in production

### Production Secrets

Generated by `secrets/generate-secrets.sh`:
- Cryptographically strong random values
- Meets entropy requirements (512+ bits for JWT, 256+ bits for encryption)
- File permissions: 600 (owner read/write only)
- Directory permissions: 700 (owner access only)

### Secret Files

All secrets stored in `docker/secrets/` directory:

**Database & Cache:**
- `postgres_user.txt`, `postgres_password.txt`
- `database_url.txt`
- `redis_password.txt`, `redis_url.txt`

**Application:**
- `jwt_secret.txt` (512 bits)
- `encryption_key.txt` (256 bits)

**Third-party Services:**
- `stripe_secret_key.txt`, `stripe_webhook_secret.txt`
- `cloudflare_r2_access_key.txt`, `cloudflare_r2_secret_key.txt`
- `email_service_api_key.txt`

**Monitoring:**
- `grafana_admin_password.txt`
- `smtp_password.txt`, `slack_webhook.txt`, `pagerduty_routing_key.txt`

### Secret Rotation

Best practice: Rotate secrets every 90 days in production.

```bash
# Generate new secrets
cd docker/secrets
./generate-secrets.sh

# Update secrets in running containers
docker-compose -f docker-compose.prod.yml up -d --no-deps backend

# Verify new secrets work
curl https://api.yourdomain.com/health
```

### External Secret Management

For production at scale, use managed secret services:
- **AWS**: Secrets Manager or Parameter Store
- **Azure**: Key Vault
- **Google Cloud**: Secret Manager
- **HashiCorp**: Vault

## Networking

### Development Network

Single network for all services:
- **Network**: `angel-investing-network`
- **Driver**: bridge
- All services can communicate

### Production Networks

Three isolated networks for security:

**Frontend Network** (`angel-investing-frontend`):
- Nginx
- Frontend containers
- Public-facing

**Backend Network** (`angel-investing-backend`):
- Backend containers
- PostgreSQL
- Redis
- Internal only

**Monitoring Network** (`angel-investing-monitoring`):
- Prometheus
- Grafana
- Alert Manager
- Internal only

### Network Security

- Database and Redis ports NOT exposed externally
- Backend API accessible only through Nginx
- Monitoring services on separate network
- Firewall rules limit access to monitoring ports

## Monitoring

### Accessing Monitoring Tools

**Grafana Dashboards**: http://your-server-ip:3000
- User: `admin`
- Password: from `secrets/grafana_admin_password.txt`

**Prometheus Metrics**: http://your-server-ip:9090 (internal only)

**Alert Manager**: http://your-server-ip:9093 (internal only)

### Key Metrics to Monitor

**System Health:**
- Container CPU/memory usage
- Disk I/O
- Network throughput

**Application Performance:**
- API response times (p50, p95, p99)
- Request rates
- Error rates (4xx, 5xx)
- WebSocket connections

**Database:**
- Connection pool utilization
- Query performance
- Replication lag (if using replicas)

**Business Metrics:**
- Active users
- Investment transactions
- Portfolio values
- User signups

### Setting Up Alerts

Edit `docker/monitoring/alertmanager.yml`:

```yaml
receivers:
  - name: 'email'
    email_configs:
      - to: 'alerts@yourdomain.com'
        from: 'monitoring@yourdomain.com'
        smarthost: 'smtp.gmail.com:587'
        auth_username: 'monitoring@yourdomain.com'
        auth_password_file: '/run/secrets/smtp_password'
```

### Common Alert Rules

- Service down for >5 minutes
- Error rate >5% for >10 minutes
- API latency p95 >2 seconds
- Database connections >80% capacity
- Disk usage >85%
- Memory usage >90%

## Security Best Practices

### Secret Management
✅ **DO:**
- Use generated secrets with high entropy
- Set file permissions to 600 for secret files
- Rotate secrets every 90 days
- Use external secret managers in production
- Never commit secrets to version control

❌ **DON'T:**
- Use default/example passwords
- Share secrets via email or chat
- Store secrets in environment variables (use files)
- Reuse secrets across environments

### Container Security
✅ **DO:**
- Run containers as non-root users
- Use minimal base images (alpine)
- Scan images for vulnerabilities
- Keep Docker and images updated
- Set resource limits

❌ **DON'T:**
- Run containers with `--privileged`
- Mount sensitive host directories
- Expose unnecessary ports
- Use `:latest` tags in production

### Network Security
✅ **DO:**
- Use isolated networks
- Implement firewall rules
- Enable SSL/TLS everywhere
- Use security headers (CSP, HSTS, etc.)
- Monitor network traffic

❌ **DON'T:**
- Expose database ports publicly
- Use HTTP in production
- Allow unrestricted CORS
- Skip certificate validation

### Application Security
✅ **DO:**
- Validate all user inputs
- Use parameterized queries
- Implement rate limiting
- Enable CSRF protection
- Log security events

❌ **DON'T:**
- Trust client-side validation
- Store passwords in plain text
- Skip authentication checks
- Disable security middleware

## Troubleshooting

For detailed troubleshooting, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

### Quick Diagnostics

```bash
# Check service status
docker-compose ps

# View all logs
docker-compose logs

# View specific service logs
docker-compose logs backend

# Follow logs in real-time
docker-compose logs -f backend

# Check container resource usage
docker stats

# Test database connection
docker-compose exec postgres psql -U postgres -d angel_investing_marketplace -c "SELECT 1;"

# Test Redis connection
docker-compose exec redis redis-cli ping

# Check backend health
curl http://localhost:3001/health
```

### Common Issues

**Services won't start:**
```bash
# Check for port conflicts
sudo lsof -i :3000
sudo lsof -i :3001

# Verify secrets exist
ls -la docker/secrets/

# Check Docker resources
docker system df
```

**Database connection errors:**
```bash
# Verify database is healthy
docker-compose ps postgres

# Check database logs
docker-compose logs postgres

# Test connection
docker-compose exec backend node -e "console.log(process.env.DATABASE_URL_FILE)"
```

**Performance issues:**
```bash
# Check resource usage
docker stats

# View slow queries (PostgreSQL)
docker-compose exec postgres psql -U postgres -d angel_investing_marketplace -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"

# Check Redis memory
docker-compose exec redis redis-cli info memory
```

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [PostgreSQL Docker Hub](https://hub.docker.com/_/postgres)
- [Redis Docker Hub](https://hub.docker.com/_/redis)
- [Nginx Docker Hub](https://hub.docker.com/_/nginx)

## Support

For issues specific to this deployment:
1. Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
2. Review logs: `docker-compose logs`
3. Open an issue on GitHub
4. Contact DevOps team

---

**Version**: 1.0
**Last Updated**: October 2024
**Maintainer**: DevOps Team
