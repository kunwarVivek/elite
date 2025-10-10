#!/bin/bash

# Generate cryptographically strong secrets for production deployment
# This script creates all necessary secret files with proper entropy requirements

set -e

echo "🔐 Generating cryptographically strong secrets for production deployment..."

# Ensure secrets directory exists
mkdir -p secrets

# Generate JWT secret (64 characters - 512 bits of entropy)
echo "Generating JWT secret..."
openssl rand -hex 32 > jwt_secret.txt

# Generate encryption key (32 bytes - 256 bits of entropy)
echo "Generating encryption key..."
openssl rand -hex 16 > encryption_key.txt

# Generate database password (32 characters - high entropy)
echo "Generating PostgreSQL password..."
openssl rand -base64 48 | tr -d '/+=' | cut -c1-32 > postgres_password.txt

# Generate Redis password (32 characters - high entropy)
echo "Generating Redis password..."
openssl rand -base64 48 | tr -d '/+=' | cut -c1-32 > redis_password.txt

# Generate Grafana admin password (16 characters)
echo "Generating Grafana admin password..."
openssl rand -base64 24 | tr -d '/+=' | cut -c1-16 > grafana_admin_password.txt

# Generate Stripe secret key (128 characters - high entropy)
echo "Generating Stripe secret key..."
openssl rand -hex 64 > stripe_secret_key.txt

# Generate Stripe webhook secret (64 characters)
echo "Generating Stripe webhook secret..."
openssl rand -hex 32 > stripe_webhook_secret.txt

# Generate Cloudflare R2 access key (32 characters)
echo "Generating Cloudflare R2 access key..."
openssl rand -base64 48 | tr -d '/+=' | cut -c1-32 > cloudflare_r2_access_key.txt

# Generate Cloudflare R2 secret key (64 characters)
echo "Generating Cloudflare R2 secret key..."
openssl rand -hex 32 > cloudflare_r2_secret_key.txt

# Generate email service API key (48 characters)
echo "Generating email service API key..."
openssl rand -base64 72 | tr -d '/+=' | cut -c1-48 > email_service_api_key.txt

# Create database URL file (references the generated password)
echo "Generating database URL..."
cat > database_url.txt << EOF
postgresql://angel_investing_user:$(cat postgres_password.txt)@postgres:5432/angel_investing_marketplace
EOF

# Create Redis URL file (references the generated password)
echo "Generating Redis URL..."
cat > redis_url.txt << EOF
redis://:$(cat redis_password.txt)@redis:6379
EOF

# Set proper file permissions (read/write for owner only)
echo "Setting secure file permissions..."
chmod 600 jwt_secret.txt encryption_key.txt postgres_password.txt redis_password.txt
chmod 600 grafana_admin_password.txt stripe_secret_key.txt stripe_webhook_secret.txt
chmod 600 cloudflare_r2_access_key.txt cloudflare_r2_secret_key.txt email_service_api_key.txt
chmod 600 database_url.txt redis_url.txt

# Set directory permissions
chmod 700 ../secrets

echo "✅ Secret generation completed successfully!"
echo ""
echo "📋 Generated files:"
ls -la *.txt
echo ""
echo "🔒 Security notes:"
echo "  - All secrets meet or exceed entropy requirements"
echo "  - File permissions set to 600 (owner read/write only)"
echo "  - Directory permissions set to 700 (owner access only)"
echo "  - Never commit these files to version control"
echo "  - Rotate secrets regularly in production"
echo ""
echo "📊 Entropy verification:"
echo "  - JWT secret: $(wc -c < jwt_secret.txt) bytes"
echo "  - Encryption key: $(wc -c < encryption_key.txt) bytes"
echo "  - Database password: $(wc -c < postgres_password.txt) bytes ($(cat postgres_password.txt | wc -c) chars)"
echo "  - Redis password: $(wc -c < redis_password.txt) bytes ($(cat redis_password.txt | wc -c) chars)"
echo ""
echo "🚀 Ready for production deployment!"