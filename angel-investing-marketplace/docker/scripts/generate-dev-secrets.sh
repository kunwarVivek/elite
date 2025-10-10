#!/bin/bash

# ============================================================================
# Development Secrets Generation Script
# ============================================================================
#
# This script generates DEVELOPMENT-SAFE secrets for local testing.
# These secrets are intentionally weak and clearly marked as test values.
#
# ⚠️  WARNING: NEVER USE THESE SECRETS IN PRODUCTION!
#
# For production secrets, use: ../secrets/generate-secrets.sh
#
# ============================================================================

set -e

echo "🔧 Generating development secrets for local testing..."
echo ""
echo "⚠️  WARNING: These are DEVELOPMENT-ONLY secrets!"
echo "   DO NOT use these values in production!"
echo ""

# Navigate to docker directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SECRETS_DIR="$DOCKER_DIR/secrets"

# Ensure secrets directory exists
mkdir -p "$SECRETS_DIR"
cd "$SECRETS_DIR"

# ============================================================================
# DATABASE SECRETS
# ============================================================================

echo "📦 Generating database credentials..."

# PostgreSQL username (simple for development)
echo "postgres" > postgres_user.txt

# PostgreSQL password (simple but valid)
echo "postgres_dev_password_12345" > postgres_password.txt

# Database URL (references development password)
echo "postgresql://postgres:postgres_dev_password_12345@postgres:5432/angel_investing_marketplace" > database_url.txt

# ============================================================================
# REDIS SECRETS
# ============================================================================

echo "📦 Generating Redis credentials..."

# Redis password (simple for development)
echo "redis_dev_password_12345" > redis_password.txt

# Redis URL (references development password)
echo "redis://:redis_dev_password_12345@redis:6379" > redis_url.txt

# ============================================================================
# APPLICATION SECRETS
# ============================================================================

echo "🔐 Generating application secrets..."

# Better Auth secret (development-safe)
echo "better_auth_dev_secret_min_32_characters_required_for_valid_config" > better_auth_secret.txt

# JWT secret (64 characters for development)
echo "jwt_dev_secret_abcdef0123456789_this_is_not_for_production_use_only" > jwt_secret.txt

# Encryption key (32 characters exactly)
echo "encryption_dev_key_32_chars_00" > encryption_key.txt

# ============================================================================
# THIRD-PARTY SERVICE SECRETS (PLACEHOLDERS)
# ============================================================================

echo "🔌 Generating third-party service placeholders..."

# Stripe (test mode keys format)
# These are placeholder formats - replace with real test keys from Stripe dashboard
echo "sk_test_DEVELOPMENT_PLACEHOLDER_REPLACE_WITH_REAL_STRIPE_TEST_KEY" > stripe_secret_key.txt
echo "whsec_DEVELOPMENT_PLACEHOLDER_REPLACE_WITH_REAL_WEBHOOK_SECRET" > stripe_webhook_secret.txt

# SMTP Password (placeholder)
echo "smtp_dev_password_replace_with_real_app_password" > smtp_pass.txt

# Cloudflare R2 / AWS credentials (placeholders)
echo "cloudflare_dev_access_key_placeholder" > cloudflare_r2_access_key.txt
echo "cloudflare_dev_secret_key_placeholder" > cloudflare_r2_secret_key.txt
echo "aws_dev_access_key_placeholder" > aws_access_key_id.txt
echo "aws_dev_secret_key_placeholder" > aws_secret_access_key.txt

# Email service API key (placeholder)
echo "email_service_dev_api_key_placeholder" > email_service_api_key.txt

# Plaid (sandbox mode)
echo "plaid_dev_secret_placeholder_use_sandbox_credentials" > plaid_secret.txt

# ============================================================================
# MONITORING SECRETS
# ============================================================================

echo "📊 Generating monitoring credentials..."

# Grafana admin password (simple for development)
echo "admin_dev_password" > grafana_admin_password.txt

# Alert Manager credentials (placeholders for development)
echo "smtp_password_placeholder" > smtp_password.txt
echo "https://hooks.slack.com/services/DEV/PLACEHOLDER/WEBHOOK" > slack_webhook.txt
echo "pagerduty_routing_key_placeholder" > pagerduty_routing_key.txt

# ============================================================================
# SET FILE PERMISSIONS
# ============================================================================

echo "🔒 Setting file permissions..."

# Set all secret files to 600 (owner read/write only)
chmod 600 *.txt 2>/dev/null || true

# Set directory permissions to 700 (owner access only)
chmod 700 "$SECRETS_DIR"

# ============================================================================
# VERIFICATION
# ============================================================================

echo ""
echo "✅ Development secret generation completed successfully!"
echo ""
echo "📋 Generated secret files:"
ls -la "$SECRETS_DIR"/*.txt
echo ""
echo "📍 Secrets location: $SECRETS_DIR"
echo ""
echo "🔍 Next steps:"
echo "   1. Replace Stripe placeholders with real test keys from:"
echo "      https://dashboard.stripe.com/test/apikeys"
echo ""
echo "   2. Replace SMTP password with app-specific password from:"
echo "      https://myaccount.google.com/apppasswords (for Gmail)"
echo ""
echo "   3. (Optional) Replace Plaid secret with sandbox credentials from:"
echo "      https://dashboard.plaid.com/team/keys"
echo ""
echo "   4. (Optional) Replace Cloudflare R2 credentials from:"
echo "      Cloudflare Dashboard → R2 → Manage R2 API Tokens"
echo ""
echo "   5. Start the application:"
echo "      cd $DOCKER_DIR"
echo "      docker-compose up -d"
echo ""
echo "⚠️  SECURITY REMINDERS:"
echo "   - These are DEVELOPMENT-ONLY secrets"
echo "   - Never commit secret files to version control"
echo "   - Never use these secrets in production"
echo "   - For production, use: ./secrets/generate-secrets.sh"
echo ""
echo "🚀 Ready for local development!"
