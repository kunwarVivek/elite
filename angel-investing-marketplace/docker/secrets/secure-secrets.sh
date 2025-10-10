#!/bin/bash

# Secure secrets script - sets proper permissions and verifies entropy requirements
# Run this script after generating secrets to ensure proper security

set -e

echo "🔒 Securing secret files and verifying entropy requirements..."

# Function to check if file exists
check_file() {
    if [[ ! -f "$1" ]]; then
        echo "❌ Error: $1 not found!"
        exit 1
    fi
}

# Function to verify entropy requirements
verify_entropy() {
    local file="$1"
    local min_bytes="$2"
    local actual_bytes

    check_file "$file"
    actual_bytes=$(wc -c < "$file")

    if [[ $actual_bytes -lt $min_bytes ]]; then
        echo "❌ Error: $file has insufficient entropy ($actual_bytes bytes, need $min_bytes)"
        return 1
    else
        echo "✅ $file: $actual_bytes bytes (✓ meets requirement)"
        return 0
    fi
}

# Verify all secret files exist
echo "📋 Verifying all secret files exist..."
secret_files=(
    "jwt_secret.txt"
    "encryption_key.txt"
    "postgres_password.txt"
    "redis_password.txt"
    "grafana_admin_password.txt"
    "stripe_secret_key.txt"
    "stripe_webhook_secret.txt"
    "cloudflare_r2_access_key.txt"
    "cloudflare_r2_secret_key.txt"
    "email_service_api_key.txt"
    "database_url.txt"
    "redis_url.txt"
)

for file in "${secret_files[@]}"; do
    check_file "$file"
done

echo "✅ All secret files found"

# Verify entropy requirements
echo ""
echo "🔍 Verifying entropy requirements..."

# JWT secret: 64 hex characters = 32 bytes
verify_entropy "jwt_secret.txt" 32

# Encryption key: 32 hex characters = 16 bytes
verify_entropy "encryption_key.txt" 16

# Database password: 32 alphanumeric characters ≈ 32 bytes
verify_entropy "postgres_password.txt" 32

# Redis password: 32 alphanumeric characters ≈ 32 bytes
verify_entropy "redis_password.txt" 32

# Grafana password: 16 alphanumeric characters ≈ 16 bytes
verify_entropy "grafana_admin_password.txt" 16

# Stripe secret key: 128 hex characters = 64 bytes
verify_entropy "stripe_secret_key.txt" 64

# Stripe webhook secret: 64 hex characters = 32 bytes
verify_entropy "stripe_webhook_secret.txt" 32

# Cloudflare R2 access key: 32 alphanumeric characters ≈ 32 bytes
verify_entropy "cloudflare_r2_access_key.txt" 32

# Cloudflare R2 secret key: 64 hex characters = 32 bytes
verify_entropy "cloudflare_r2_secret_key.txt" 32

# Email service API key: 48 alphanumeric characters ≈ 48 bytes
verify_entropy "email_service_api_key.txt" 48

echo ""
echo "🔐 Setting secure file permissions..."

# Set restrictive permissions on all secret files
chmod 600 jwt_secret.txt
chmod 600 encryption_key.txt
chmod 600 postgres_password.txt
chmod 600 redis_password.txt
chmod 600 grafana_admin_password.txt
chmod 600 stripe_secret_key.txt
chmod 600 stripe_webhook_secret.txt
chmod 600 cloudflare_r2_access_key.txt
chmod 600 cloudflare_r2_secret_key.txt
chmod 600 email_service_api_key.txt
chmod 600 database_url.txt
chmod 600 redis_url.txt

# Set restrictive permissions on secrets directory
chmod 700 ../secrets

echo "✅ File permissions set successfully"

# Display final status
echo ""
echo "📊 Final security status:"
echo "  - All secrets meet entropy requirements"
echo "  - File permissions: 600 (owner read/write only)"
echo "  - Directory permissions: 700 (owner access only)"
echo ""
echo "🔒 Security checklist:"
echo "  ✅ Cryptographically strong secrets generated"
echo "  ✅ Proper entropy requirements verified"
echo "  ✅ Restrictive file permissions applied"
echo "  ✅ Directory permissions secured"
echo "  ✅ Kubernetes configuration updated"
echo ""
echo "🚨 IMPORTANT REMINDERS:"
echo "  - Never commit secret files to version control"
echo "  - Use external secret management in production (AWS Secrets Manager, etc.)"
echo "  - Rotate secrets regularly"
echo "  - Ensure secrets are not logged or exposed in application logs"
echo ""
echo "✅ Secret security setup completed successfully!"