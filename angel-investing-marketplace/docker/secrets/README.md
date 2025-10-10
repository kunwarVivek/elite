# Secrets Management

This directory contains all sensitive configuration files for the Angel Investing Marketplace production deployment.

## Important Security Notes

⚠️ **NEVER commit actual secrets to version control**
⚠️ **Always use strong, randomly generated values**
⚠️ **Rotate secrets regularly**
⚠️ **Use managed secret services in production**

## Files Description

### Database Secrets
- `postgres_user.txt` - PostgreSQL username
- `postgres_password.txt` - PostgreSQL password (min 32 characters)
- `database_url.txt` - Full database connection string

### Redis Secrets
- `redis_password.txt` - Redis authentication password
- `redis_url.txt` - Redis connection URL

### Application Secrets
- `jwt_secret.txt` - JWT signing secret (min 64 characters)
- `encryption_key.txt` - Data encryption key (32 bytes)

### Third-party Service Secrets
- `stripe_secret_key.txt` - Stripe secret key
- `stripe_webhook_secret.txt` - Stripe webhook secret
- `cloudflare_r2_access_key.txt` - Cloudflare R2 access key
- `cloudflare_r2_secret_key.txt` - Cloudflare R2 secret key
- `email_service_api_key.txt` - Email service API key

### Monitoring Secrets
- `grafana_admin_password.txt` - Grafana admin password

## Generation Commands

```bash
# Generate JWT secret (64 characters)
openssl rand -hex 32 > jwt_secret.txt

# Generate encryption key (32 bytes)
openssl rand -hex 16 > encryption_key.txt

# Generate database password (32 characters)
openssl rand -alnum 32 > postgres_password.txt

# Generate Redis password (32 characters)
openssl rand -alnum 32 > redis_password.txt

# Generate Grafana password (16 characters)
openssl rand -alnum 16 > grafana_admin_password.txt
```

## Production Deployment

In production, use external secret management:
- AWS Secrets Manager
- Azure Key Vault
- Google Secret Manager
- HashiCorp Vault
- Kubernetes Secrets

## File Permissions

Ensure these files have restricted permissions:
```bash
chmod 600 secrets/*
chmod 700 secrets/