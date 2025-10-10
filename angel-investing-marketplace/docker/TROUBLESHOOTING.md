# Docker Deployment Troubleshooting Guide

Comprehensive troubleshooting guide for the Angel Investing Marketplace Docker deployment.

## Table of Contents
- [Quick Diagnostics](#quick-diagnostics)
- [Common Issues](#common-issues)
- [Service-Specific Issues](#service-specific-issues)
- [Network Issues](#network-issues)
- [Secret Management Issues](#secret-management-issues)
- [Performance Issues](#performance-issues)
- [Log Analysis](#log-analysis)
- [Clean Slate Reset](#clean-slate-reset)
- [FAQ](#faq)

## Quick Diagnostics

Run these commands first to quickly identify the issue:

```bash
# Check service status
docker-compose ps

# View all logs (last 100 lines)
docker-compose logs --tail=100

# Check Docker resources
docker system df

# Verify Docker daemon is running
docker info

# Check for port conflicts
sudo lsof -i :3000
sudo lsof -i :3001
sudo lsof -i :5432
sudo lsof -i :6379

# Test network connectivity
docker network ls
docker network inspect angel-investing-network
```

## Common Issues

### Issue: Services Won't Start

**Symptoms:**
- `docker-compose up` fails immediately
- Services show "Exited (1)" status
- Error: "Cannot start service"

**Diagnosis:**
```bash
# Check service status
docker-compose ps

# View error logs
docker-compose logs

# Check Docker daemon
docker info
```

**Solutions:**

1. **Port conflicts:**
```bash
# Find processes using required ports
sudo lsof -i :3000
sudo lsof -i :3001

# Kill conflicting processes
sudo kill -9 <PID>

# Or change ports in docker-compose.yml
```

2. **Insufficient resources:**
```bash
# Check Docker resources
docker system df

# Clean up unused resources
docker system prune -a
docker volume prune
```

3. **Missing secrets:**
```bash
# Verify secrets exist
ls -la docker/secrets/*.txt

# Regenerate secrets
cd docker
./scripts/generate-dev-secrets.sh
```

4. **Invalid Docker Compose syntax:**
```bash
# Validate docker-compose.yml
docker-compose config

# Check for YAML syntax errors
```

### Issue: Services Start But Don't Work

**Symptoms:**
- Services show "Up" status
- Health checks failing
- Cannot connect to services
- 502/504 errors

**Diagnosis:**
```bash
# Check health status
docker-compose ps

# View service logs
docker-compose logs backend
docker-compose logs frontend

# Test health endpoints
curl http://localhost:3001/health
curl http://localhost:3000/health

# Check network connectivity
docker-compose exec backend ping postgres
docker-compose exec backend ping redis
```

**Solutions:**

1. **Health checks failing:**
```bash
# Wait for services to initialize (can take 30-60 seconds)
sleep 60
docker-compose ps

# Check logs for startup errors
docker-compose logs backend | grep -i error
```

2. **Database not ready:**
```bash
# Verify database is accessible
docker-compose exec postgres pg_isready -U postgres

# Check database logs
docker-compose logs postgres

# Restart database service
docker-compose restart postgres
```

3. **Missing environment variables:**
```bash
# Verify environment variables are loaded
docker-compose exec backend env | grep DATABASE
docker-compose exec backend env | grep REDIS

# Check .env file exists and is valid
cat docker/.env
```

### Issue: Cannot Access Application

**Symptoms:**
- Browser cannot load http://localhost:3000
- "Connection refused" errors
- Timeout errors

**Diagnosis:**
```bash
# Verify services are running
docker-compose ps

# Check if ports are exposed
docker-compose port frontend 80
docker-compose port backend 3001

# Test from inside container
docker-compose exec frontend curl http://localhost:80
docker-compose exec backend curl http://localhost:3001/health

# Check firewall rules
sudo ufw status (Linux)
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate (macOS)
```

**Solutions:**

1. **Services not listening on correct ports:**
```bash
# Check port mappings in docker-compose.yml
grep -A 5 "ports:" docker-compose.yml

# Verify container is listening
docker-compose exec backend netstat -tlnp
```

2. **Firewall blocking connections:**
```bash
# Allow Docker ports (Linux)
sudo ufw allow 3000/tcp
sudo ufw allow 3001/tcp

# Check Docker network
docker network inspect angel-investing-network
```

3. **Wrong URL or hostname:**
```bash
# Verify frontend API URL configuration
docker-compose exec frontend env | grep API

# Check backend URL
docker-compose logs frontend | grep -i "api url"
```

## Service-Specific Issues

### PostgreSQL Database Issues

#### Cannot Connect to Database

**Symptoms:**
- Backend logs show "ECONNREFUSED" or "Connection timeout"
- Database connection errors

**Diagnosis:**
```bash
# Check database is running
docker-compose ps postgres

# Test connection from backend
docker-compose exec backend node -e "
  const { Client } = require('pg');
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  client.connect().then(() => console.log('Connected!')).catch(console.error);
"

# Check database logs
docker-compose logs postgres | tail -50
```

**Solutions:**

1. **Database not ready:**
```bash
# Wait for health check to pass
docker-compose ps postgres

# Restart backend after database is healthy
docker-compose restart backend
```

2. **Wrong credentials:**
```bash
# Verify database_url.txt content
cat docker/secrets/database_url.txt

# Check expected format:
# postgresql://username:password@postgres:5432/angel_investing_marketplace

# Regenerate secrets if needed
cd docker
./scripts/generate-dev-secrets.sh
docker-compose down
docker-compose up -d
```

3. **Database volume corrupted:**
```bash
# Stop services
docker-compose down

# Remove database volume
docker volume rm docker_postgres_data

# Restart (will recreate database)
docker-compose up -d
```

#### Slow Query Performance

**Symptoms:**
- API requests taking >5 seconds
- Database CPU usage high
- Timeout errors

**Diagnosis:**
```bash
# Check active queries
docker-compose exec postgres psql -U postgres -d angel_investing_marketplace -c "
  SELECT pid, now() - query_start as duration, query
  FROM pg_stat_activity
  WHERE state = 'active'
  ORDER BY duration DESC;
"

# Check table sizes
docker-compose exec postgres psql -U postgres -d angel_investing_marketplace -c "
  SELECT schemaname, tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
  FROM pg_tables
  WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"

# Check for missing indexes
docker-compose exec postgres psql -U postgres -d angel_investing_marketplace -c "
  SELECT schemaname, tablename, attname, n_distinct, correlation
  FROM pg_stats
  WHERE schemaname = 'public'
  ORDER BY n_distinct DESC;
"
```

**Solutions:**

1. **Add missing indexes:**
```bash
# Identify slow queries in backend logs
docker-compose logs backend | grep -i "query took"

# Add indexes for frequently queried columns
docker-compose exec postgres psql -U postgres -d angel_investing_marketplace -c "
  CREATE INDEX IF NOT EXISTS idx_investments_user_id ON investments(user_id);
  CREATE INDEX IF NOT EXISTS idx_companies_created_at ON companies(created_at);
"
```

2. **Vacuum and analyze:**
```bash
# Run maintenance
docker-compose exec postgres psql -U postgres -d angel_investing_marketplace -c "
  VACUUM ANALYZE;
"
```

3. **Increase resources:**
```yaml
# Edit docker-compose.prod.yml
postgres:
  deploy:
    resources:
      limits:
        cpus: '1.0'  # Increase from 0.5
        memory: 1G   # Increase from 512M
```

### Redis Issues

#### Cannot Connect to Redis

**Symptoms:**
- Backend logs show "Redis connection error"
- Session data not persisting
- Cache misses on every request

**Diagnosis:**
```bash
# Check Redis is running
docker-compose ps redis

# Test connection
docker-compose exec redis redis-cli ping

# Check Redis logs
docker-compose logs redis | tail -50

# Test from backend
docker-compose exec backend node -e "
  const redis = require('redis');
  const client = redis.createClient({ url: process.env.REDIS_URL });
  client.connect().then(() => console.log('Connected!')).catch(console.error);
"
```

**Solutions:**

1. **Redis authentication issue:**
```bash
# Verify redis_url.txt format
cat docker/secrets/redis_url.txt

# Should be: redis://:password@redis:6379
# Or without password for dev: redis://redis:6379

# Test with explicit password
docker-compose exec redis redis-cli -a <password> ping
```

2. **Redis out of memory:**
```bash
# Check memory usage
docker-compose exec redis redis-cli info memory

# Clear cache if needed
docker-compose exec redis redis-cli FLUSHALL

# Or increase memory limit in docker-compose.yml
```

3. **Redis persistence issues:**
```bash
# Check Redis data directory permissions
docker-compose exec redis ls -la /data

# Restart with clean state
docker-compose down
docker volume rm docker_redis_data
docker-compose up -d
```

### Backend API Issues

#### Backend Won't Start

**Symptoms:**
- Backend container exits immediately
- Status shows "Exited (1)"

**Diagnosis:**
```bash
# Check backend logs
docker-compose logs backend

# Look for specific errors:
# - Module not found: Missing dependencies
# - Syntax error: Code compilation issues
# - Cannot connect: Database/Redis not available
# - Permission denied: File/secret access issues

# Check file permissions on secrets
ls -la docker/secrets/
```

**Solutions:**

1. **Missing dependencies:**
```bash
# Rebuild with no cache
docker-compose build --no-cache backend
docker-compose up -d backend
```

2. **Syntax errors in code:**
```bash
# Check TypeScript compilation
cd backend
npm run build

# Fix errors and rebuild
docker-compose build backend
```

3. **Cannot read secrets:**
```bash
# Verify secrets exist and have correct permissions
ls -la docker/secrets/
chmod 600 docker/secrets/*.txt

# Restart backend
docker-compose restart backend
```

#### Backend Health Check Failing

**Symptoms:**
- Backend shows "unhealthy" status
- Health endpoint returns errors

**Diagnosis:**
```bash
# Test health endpoint manually
docker-compose exec backend curl -v http://localhost:3001/health

# Check if backend is listening
docker-compose exec backend netstat -tlnp | grep 3001

# View recent backend logs
docker-compose logs backend --tail=100
```

**Solutions:**

1. **Health endpoint not implemented:**
```bash
# Verify health endpoint exists in code
# Should be at backend/src/index.ts or routes/health.ts

# Example implementation:
# app.get('/health', (req, res) => {
#   res.json({ status: 'ok', timestamp: new Date() });
# });
```

2. **Database connection in health check:**
```bash
# Health check might be waiting for database
# Check if database is healthy first
docker-compose ps postgres

# Simplify health check or add timeout
```

3. **Port mismatch:**
```bash
# Verify PORT environment variable
docker-compose exec backend env | grep PORT

# Should match health check configuration
```

#### API Returns 500 Errors

**Symptoms:**
- API requests return "Internal Server Error"
- Frontend shows error messages

**Diagnosis:**
```bash
# Check backend error logs
docker-compose logs backend | grep -i error

# Enable debug logging
# Add to .env:
# LOG_LEVEL=debug

# Restart backend
docker-compose restart backend

# Watch logs
docker-compose logs -f backend
```

**Solutions:**

1. **Unhandled exception:**
```bash
# Look for stack traces in logs
docker-compose logs backend | grep -A 20 "Error:"

# Fix the code issue identified
# Rebuild and restart
docker-compose up -d --build backend
```

2. **Missing environment variable:**
```bash
# Check all required variables are set
docker-compose exec backend env | grep -E "DATABASE|REDIS|JWT|STRIPE"

# Add missing variables to .env
# Restart backend
docker-compose restart backend
```

### Frontend Issues

#### Frontend Shows Blank Page

**Symptoms:**
- Browser shows white/blank page
- No errors in browser console or shows "Failed to fetch"

**Diagnosis:**
```bash
# Check frontend logs
docker-compose logs frontend

# Check if nginx is serving files
docker-compose exec frontend ls -la /usr/share/nginx/html

# Test nginx configuration
docker-compose exec frontend nginx -t

# Check API connectivity from frontend
docker-compose exec frontend curl http://backend:3001/health
```

**Solutions:**

1. **Build artifacts missing:**
```bash
# Rebuild frontend with no cache
docker-compose build --no-cache frontend
docker-compose up -d frontend

# Verify build artifacts exist
docker-compose exec frontend ls -la /usr/share/nginx/html
```

2. **Wrong API URL:**
```bash
# Check frontend environment variables
docker-compose logs frontend | grep -i "api"

# Update .env with correct API URL
# VITE_API_URL=http://localhost:3001/api

# Rebuild frontend (environment variables baked into build)
docker-compose up -d --build frontend
```

3. **Nginx misconfigured:**
```bash
# Check nginx.conf
docker-compose exec frontend cat /etc/nginx/conf.d/default.conf

# Test configuration
docker-compose exec frontend nginx -t

# Reload nginx
docker-compose exec frontend nginx -s reload
```

#### Frontend Cannot Connect to Backend

**Symptoms:**
- Browser console shows CORS errors
- API requests fail with network errors
- "Failed to fetch" errors

**Diagnosis:**
```bash
# Check CORS configuration in backend
docker-compose logs backend | grep -i cors

# Test API from browser console
# Open http://localhost:3000 in browser
# Run in console:
# fetch('http://localhost:3001/health').then(r => r.json()).then(console.log)

# Check network connectivity
docker-compose exec frontend ping backend
```

**Solutions:**

1. **CORS not configured:**
```bash
# Add CORS_ORIGINS to .env
echo "CORS_ORIGINS=http://localhost:3000" >> docker/.env

# Restart backend
docker-compose restart backend
```

2. **Wrong backend URL:**
```bash
# Check frontend API configuration
# Should be http://localhost:3001 in development
# Should be https://api.yourdomain.com in production

# Update .env
# VITE_API_URL=http://localhost:3001

# Rebuild frontend
docker-compose up -d --build frontend
```

3. **Network isolation:**
```bash
# Verify both services on same network
docker network inspect angel-investing-network

# Both frontend and backend should be listed
```

## Network Issues

### Services Cannot Communicate

**Symptoms:**
- Backend cannot connect to database/Redis
- Frontend cannot reach backend
- "Connection refused" errors in logs

**Diagnosis:**
```bash
# Check network configuration
docker network ls
docker network inspect angel-investing-network

# Test connectivity between services
docker-compose exec backend ping postgres
docker-compose exec backend ping redis
docker-compose exec frontend ping backend

# Check DNS resolution
docker-compose exec backend nslookup postgres
```

**Solutions:**

1. **Network not created:**
```bash
# Recreate network
docker-compose down
docker network create angel-investing-network
docker-compose up -d
```

2. **Service not on network:**
```bash
# Check service network configuration
docker inspect <container_name> | grep Networks

# Reconnect to network
docker network connect angel-investing-network <container_name>
```

3. **DNS not resolving service names:**
```bash
# Use IP address instead of service name temporarily
# Get service IP:
docker inspect <container_name> | grep IPAddress

# Or recreate containers
docker-compose down
docker-compose up -d
```

### Port Conflicts

**Symptoms:**
- Error: "port is already allocated"
- Services fail to start
- Cannot bind to port

**Diagnosis:**
```bash
# Find processes using ports
sudo lsof -i :3000
sudo lsof -i :3001
sudo lsof -i :5432
sudo lsof -i :6379

# Check Docker port mappings
docker ps -a --format "table {{.Names}}\t{{.Ports}}"
```

**Solutions:**

1. **Kill conflicting process:**
```bash
# Find PID
sudo lsof -i :3000

# Kill process
sudo kill -9 <PID>

# Restart Docker services
docker-compose up -d
```

2. **Change port mapping:**
```yaml
# Edit docker-compose.yml
frontend:
  ports:
    - "3002:80"  # Change from 3000 to 3002
```

3. **Stop other Docker containers:**
```bash
# List all containers
docker ps -a

# Stop conflicting containers
docker stop <container_name>
```

## Secret Management Issues

### Secrets Not Loading

**Symptoms:**
- Backend cannot read secret files
- Error: "ENOENT: no such file or directory"
- Authentication failures

**Diagnosis:**
```bash
# Check secrets directory exists
ls -la docker/secrets/

# Verify secret files
ls -la docker/secrets/*.txt

# Check file permissions
stat docker/secrets/database_url.txt

# Test reading secrets from container
docker-compose exec backend ls -la /run/secrets/
docker-compose exec backend cat /run/secrets/database_url
```

**Solutions:**

1. **Secrets not generated:**
```bash
# Generate development secrets
cd docker
./scripts/generate-dev-secrets.sh

# Verify files created
ls -la secrets/
```

2. **Wrong file permissions:**
```bash
# Fix permissions
chmod 600 docker/secrets/*.txt
chmod 700 docker/secrets/

# Restart services
docker-compose down
docker-compose up -d
```

3. **Secrets not mounted:**
```bash
# Verify secret configuration in docker-compose.yml
grep -A 20 "secrets:" docker-compose.yml

# Should have both:
# - secrets section at service level
# - secrets section at top level with file paths
```

### Invalid Secret Values

**Symptoms:**
- Authentication errors
- "Invalid token" errors
- Stripe/Plaid API errors

**Diagnosis:**
```bash
# Check secret file contents
cat docker/secrets/jwt_secret.txt
cat docker/secrets/stripe_secret_key.txt

# Verify secret format and length
wc -c docker/secrets/jwt_secret.txt  # Should be 64+ chars
wc -c docker/secrets/encryption_key.txt  # Should be 32 chars
```

**Solutions:**

1. **Regenerate secrets:**
```bash
# For development
cd docker
./scripts/generate-dev-secrets.sh

# For production
cd docker/secrets
./generate-secrets.sh

# Restart services
docker-compose down
docker-compose up -d
```

2. **Replace placeholder values:**
```bash
# Get real test keys from Stripe
# https://dashboard.stripe.com/test/apikeys
echo "sk_test_YOUR_REAL_KEY" > docker/secrets/stripe_secret_key.txt

# Get real SMTP password
# https://myaccount.google.com/apppasswords
echo "your-app-password" > docker/secrets/smtp_pass.txt

# Restart backend
docker-compose restart backend
```

## Performance Issues

### Slow Response Times

**Symptoms:**
- API requests taking >5 seconds
- Page load times >10 seconds
- Timeout errors

**Diagnosis:**
```bash
# Check container resource usage
docker stats

# Check database performance
docker-compose exec postgres psql -U postgres -d angel_investing_marketplace -c "
  SELECT * FROM pg_stat_activity WHERE state = 'active';
"

# Check Redis memory
docker-compose exec redis redis-cli info memory

# Check application metrics (if monitoring enabled)
curl http://localhost:9090/api/v1/query?query=http_request_duration_seconds
```

**Solutions:**

1. **Insufficient resources:**
```bash
# Increase Docker resource limits
# Docker Desktop → Preferences → Resources
# Increase CPUs to 4+ and RAM to 8GB+

# Or increase per-service limits in docker-compose.prod.yml
```

2. **Database not optimized:**
```bash
# Add indexes for slow queries
# Run VACUUM ANALYZE
docker-compose exec postgres psql -U postgres -d angel_investing_marketplace -c "VACUUM ANALYZE;"

# Enable query logging to find slow queries
# Edit postgresql.conf to log queries > 1s
```

3. **Redis cache not working:**
```bash
# Check cache hit rate
docker-compose exec redis redis-cli info stats | grep hit_rate

# Increase Redis memory
# Edit docker-compose.yml: maxmemory 512mb
```

### High Memory Usage

**Symptoms:**
- Containers being killed (OOMKilled)
- System running out of memory
- Swap usage high

**Diagnosis:**
```bash
# Check memory usage per container
docker stats --no-stream

# Check host memory
free -h (Linux)
vm_stat (macOS)

# Check for memory leaks in application
docker-compose exec backend node --expose-gc -e "
  setInterval(() => {
    if (global.gc) global.gc();
    console.log(process.memoryUsage());
  }, 5000);
"
```

**Solutions:**

1. **Set memory limits:**
```yaml
# Edit docker-compose.prod.yml
backend:
  deploy:
    resources:
      limits:
        memory: 1G
```

2. **Fix memory leaks:**
```bash
# Profile application
# Look for unclosed connections, event listeners, timers

# Common causes:
# - Database connections not closed
# - Event listeners not removed
# - Large objects in memory
# - Circular references
```

3. **Increase host memory:**
```bash
# Upgrade server or Docker Desktop RAM allocation
```

## Log Analysis

### Finding Errors in Logs

```bash
# View all errors across all services
docker-compose logs | grep -i error

# View errors for specific service
docker-compose logs backend | grep -i error

# View last 100 lines with timestamps
docker-compose logs --tail=100 -t

# Follow logs in real-time
docker-compose logs -f

# Search for specific patterns
docker-compose logs | grep -i "database\|redis\|connection"

# Export logs to file for analysis
docker-compose logs > docker-logs-$(date +%Y%m%d-%H%M%S).log
```

### Common Error Patterns

**Database Connection Errors:**
```
Error: connect ECONNREFUSED
→ Database not ready or wrong credentials

Error: password authentication failed
→ Check postgres_password.txt

Error: database "xxx" does not exist
→ Database not initialized
```

**Redis Connection Errors:**
```
Error: Redis connection error
→ Redis not ready or wrong URL

Error: NOAUTH Authentication required
→ Redis password missing or wrong

Error: WRONGPASS invalid username-password pair
→ Redis password incorrect
```

**Application Errors:**
```
Error: Cannot find module
→ Dependencies not installed, rebuild needed

SyntaxError: Unexpected token
→ Code compilation error, check TypeScript

Error: EACCES: permission denied
→ File permission issue, check secret file permissions

Error: listen EADDRINUSE
→ Port already in use, check for conflicts
```

## Clean Slate Reset

If all else fails, completely reset the environment:

```bash
# WARNING: This will delete ALL data and volumes!

# 1. Stop all services
docker-compose down

# 2. Remove all volumes (DELETES DATA!)
docker-compose down -v

# 3. Remove all containers
docker rm -f $(docker ps -aq)

# 4. Remove all images (optional, forces rebuild)
docker rmi $(docker images -q)

# 5. Remove all networks
docker network prune -f

# 6. Clean Docker system
docker system prune -a -f --volumes

# 7. Regenerate secrets
cd docker
./scripts/generate-dev-secrets.sh

# 8. Rebuild and start fresh
docker-compose build --no-cache
docker-compose up -d

# 9. Verify everything is working
docker-compose ps
docker-compose logs
curl http://localhost:3001/health
curl http://localhost:3000/health
```

## FAQ

### Q: How do I know if services are healthy?

A: Run `docker-compose ps` and check the "Status" column. Healthy services show "Up (healthy)".

### Q: How long should I wait for services to start?

A: Database and Redis: 10-20 seconds. Backend: 30-60 seconds. Frontend: 10-20 seconds.

### Q: Can I use real Stripe keys in development?

A: Use test mode keys (pk_test_*, sk_test_*) only. Never use live keys in development.

### Q: How do I access the database directly?

A:
```bash
docker-compose exec postgres psql -U postgres -d angel_investing_marketplace
```

### Q: How do I reset the database?

A:
```bash
docker-compose down -v  # Removes volumes
docker-compose up -d    # Recreates database
```

### Q: Why is my backend still showing old code?

A: You need to rebuild: `docker-compose up -d --build backend`

### Q: Can I run services without Docker?

A: Yes, but you'll need to manually install PostgreSQL, Redis, and Node.js, and manage configurations yourself.

### Q: How do I enable debug logging?

A: Add `LOG_LEVEL=debug` to .env and restart: `docker-compose restart backend`

### Q: How do I check if ports are available?

A:
```bash
# Check specific port
sudo lsof -i :3000

# Check all Docker ports
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

### Q: What if I forgot my Grafana password?

A:
```bash
# Check the generated password
cat docker/secrets/grafana_admin_password.txt

# Or reset it
docker-compose exec grafana grafana-cli admin reset-admin-password newpassword
```

### Q: How do I update to the latest code?

A:
```bash
git pull
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Q: How do I backup my data?

A:
```bash
# Backup database
docker-compose exec postgres pg_dump -U postgres angel_investing_marketplace > backup.sql

# Backup Redis
docker-compose exec redis redis-cli save
docker cp <redis-container-id>:/data/dump.rdb ./redis-backup.rdb

# Backup volumes
docker run --rm -v docker_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres-backup.tar.gz /data
```

### Q: How do I restore from backup?

A:
```bash
# Restore database
cat backup.sql | docker-compose exec -T postgres psql -U postgres angel_investing_marketplace

# Restore Redis
docker cp redis-backup.rdb <redis-container-id>:/data/dump.rdb
docker-compose restart redis
```

---

**Still having issues?**
1. Check Docker logs: `docker-compose logs`
2. Review the main [README.md](README.md)
3. Search for error messages online
4. Open an issue on GitHub with logs and symptoms
5. Contact DevOps team

**Version**: 1.0
**Last Updated**: October 2024
