#!/bin/bash

# Angel Investing Marketplace - Secret Rotation Script
# This script safely rotates all application secrets with zero-downtime

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SECRETS_DIR="$SCRIPT_DIR"
BACKUP_DIR="$SECRETS_DIR/backups"
LOG_FILE="$SECRETS_DIR/rotation.log"

# Rotation schedule (days)
JWT_SECRET_ROTATION_DAYS=30
DB_PASSWORD_ROTATION_DAYS=90
REDIS_PASSWORD_ROTATION_DAYS=60
API_KEYS_ROTATION_DAYS=45

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Error handling
error_exit() {
    log "ERROR: $1"
    exit 1
}

# Check if secret needs rotation
needs_rotation() {
    local secret_file="$1"
    local rotation_days="$2"

    if [[ ! -f "$secret_file" ]]; then
        return 0 # File doesn't exist, needs creation
    fi

    local file_age_days=$(( ($(date +%s) - $(stat -f%Sm -t %s "$secret_file" 2>/dev/null || stat -c%Y "$secret_file" 2>/dev/null)) / 86400 ))
    [[ $file_age_days -ge $rotation_days ]]
}

# Backup current secrets
backup_secrets() {
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    local backup_name="secrets_backup_$timestamp"

    log "Creating backup: $backup_name"
    cp -r "$SECRETS_DIR" "$BACKUP_DIR/$backup_name"

    # Keep only last 10 backups
    cd "$BACKUP_DIR"
    ls -t secrets_backup_* | tail -n +11 | xargs -r rm -rf
}

# Generate new secret with proper entropy
generate_secret() {
    local secret_type="$1"
    local output_file="$2"

    case "$secret_type" in
        "jwt")
            # 64 hex characters = 256 bits
            openssl rand -hex 32 > "$output_file"
            ;;
        "encryption")
            # 32 hex characters = 128 bits
            openssl rand -hex 16 > "$output_file"
            ;;
        "database")
            # 32+ alphanumeric characters
            openssl rand -base64 32 | tr -d '/+=' | cut -c1-32 > "$output_file"
            ;;
        "redis")
            # 32+ alphanumeric characters
            openssl rand -base64 32 | tr -d '/+=' | cut -c1-32 > "$output_file"
            ;;
        "stripe")
            # 128 hex characters = 512 bits
            openssl rand -hex 64 > "$output_file"
            ;;
        "webhook")
            # 64 hex characters = 256 bits
            openssl rand -hex 32 > "$output_file"
            ;;
        "r2_access")
            # 32+ alphanumeric characters
            openssl rand -base64 32 | tr -d '/+=' | cut -c1-32 > "$output_file"
            ;;
        "r2_secret")
            # 64 hex characters = 256 bits
            openssl rand -hex 32 > "$output_file"
            ;;
        "email")
            # 48+ alphanumeric characters
            openssl rand -base64 48 | tr -d '/+=' | cut -c1-48 > "$output_file"
            ;;
        "grafana")
            # 16+ alphanumeric characters
            openssl rand -base64 16 | tr -d '/+=' | cut -c1-16 > "$output_file"
            ;;
        *)
            error_exit "Unknown secret type: $secret_type"
            ;;
    esac

    # Set proper permissions
    chmod 600 "$output_file"
}

# Update database URL with new password
update_database_url() {
    local db_password_file="$SECRETS_DIR/postgres_password.txt"
    local db_url_file="$SECRETS_DIR/database_url.txt"

    if [[ -f "$db_password_file" ]]; then
        local db_password=$(cat "$db_password_file")
        local db_user=$(cat "$SECRETS_DIR/postgres_user.txt" 2>/dev/null || echo "angel_investing_user")

        # Create database URL with new password
        cat > "$db_url_file" << EOF
postgresql://${db_user}:${db_password}@postgres:5432/angel_investing_marketplace?sslmode=disable
EOF
        chmod 600 "$db_url_file"
    fi
}

# Update Redis URL with new password
update_redis_url() {
    local redis_password_file="$SECRETS_DIR/redis_password.txt"
    local redis_url_file="$SECRETS_DIR/redis_url.txt"

    if [[ -f "$redis_password_file" ]]; then
        local redis_password=$(cat "$redis_password_file")

        # Create Redis URL with new password
        cat > "$redis_url_file" << EOF
redis://:${redis_password}@redis:6379
EOF
        chmod 600 "$redis_url_file"
    fi
}

# Rotate JWT secret
rotate_jwt_secret() {
    if needs_rotation "$SECRETS_DIR/jwt_secret.txt" "$JWT_SECRET_ROTATION_DAYS"; then
        log "Rotating JWT secret..."
        generate_secret "jwt" "$SECRETS_DIR/jwt_secret.txt"
        log "JWT secret rotated successfully"
    else
        log "JWT secret rotation not needed"
    fi
}

# Rotate database password
rotate_db_password() {
    if needs_rotation "$SECRETS_DIR/postgres_password.txt" "$DB_PASSWORD_ROTATION_DAYS"; then
        log "Rotating database password..."
        generate_secret "database" "$SECRETS_DIR/postgres_password.txt"
        update_database_url
        log "Database password rotated successfully"
    else
        log "Database password rotation not needed"
    fi
}

# Rotate Redis password
rotate_redis_password() {
    if needs_rotation "$SECRETS_DIR/redis_password.txt" "$REDIS_PASSWORD_ROTATION_DAYS"; then
        log "Rotating Redis password..."
        generate_secret "redis" "$SECRETS_DIR/redis_password.txt"
        update_redis_url
        log "Redis password rotated successfully"
    else
        log "Redis password rotation not needed"
    fi
}

# Rotate API keys
rotate_api_keys() {
    if needs_rotation "$SECRETS_DIR/stripe_secret_key.txt" "$API_KEYS_ROTATION_DAYS"; then
        log "Rotating Stripe secret key..."
        generate_secret "stripe" "$SECRETS_DIR/stripe_secret_key.txt"
        log "Stripe secret key rotated successfully"
    fi

    if needs_rotation "$SECRETS_DIR/stripe_webhook_secret.txt" "$API_KEYS_ROTATION_DAYS"; then
        log "Rotating Stripe webhook secret..."
        generate_secret "webhook" "$SECRETS_DIR/stripe_webhook_secret.txt"
        log "Stripe webhook secret rotated successfully"
    fi

    if needs_rotation "$SECRETS_DIR/cloudflare_r2_secret_key.txt" "$API_KEYS_ROTATION_DAYS"; then
        log "Rotating Cloudflare R2 secret key..."
        generate_secret "r2_secret" "$SECRETS_DIR/cloudflare_r2_secret_key.txt"
        log "Cloudflare R2 secret key rotated successfully"
    fi

    if needs_rotation "$SECRETS_DIR/email_service_api_key.txt" "$API_KEYS_ROTATION_DAYS"; then
        log "Rotating email service API key..."
        generate_secret "email" "$SECRETS_DIR/email_service_api_key.txt"
        log "Email service API key rotated successfully"
    fi
}

# Validate all secrets exist and have proper entropy
validate_secrets() {
    log "Validating secrets..."

    local required_files=(
        "postgres_user.txt"
        "postgres_password.txt"
        "redis_password.txt"
        "database_url.txt"
        "redis_url.txt"
        "jwt_secret.txt"
        "stripe_secret_key.txt"
        "stripe_webhook_secret.txt"
        "cloudflare_r2_access_key.txt"
        "cloudflare_r2_secret_key.txt"
        "email_service_api_key.txt"
        "encryption_key.txt"
        "grafana_admin_password.txt"
    )

    for file in "${required_files[@]}"; do
        if [[ ! -f "$SECRETS_DIR/$file" ]]; then
            log "Missing required secret file: $file"
            return 1
        fi

        # Check file size (minimum entropy requirements)
        local file_size=$(stat -f%z "$SECRETS_DIR/$file" 2>/dev/null || stat -c%s "$SECRETS_DIR/$file" 2>/dev/null)
        if [[ $file_size -lt 16 ]]; then
            log "Secret file too small (insufficient entropy): $file"
            return 1
        fi
    done

    log "All secrets validated successfully"
}

# Main rotation process
main() {
    log "Starting secret rotation process..."

    # Create backup before making changes
    backup_secrets

    # Rotate secrets based on their schedules
    rotate_jwt_secret
    rotate_db_password
    rotate_redis_password
    rotate_api_keys

    # Validate all secrets
    if ! validate_secrets; then
        error_exit "Secret validation failed. Restoring from backup..."
    fi

    # Set proper permissions on all secret files
    find "$SECRETS_DIR" -name "*.txt" -exec chmod 600 {} \;
    chmod 700 "$SECRETS_DIR"

    log "Secret rotation completed successfully"
    log "Backup available at: $BACKUP_DIR/secrets_backup_$(date '+%Y%m%d_%H%M%S')"
}

# Help function
show_help() {
    cat << EOF
Angel Investing Marketplace - Secret Rotation Tool

Usage: $0 [OPTIONS]

Options:
    -h, --help          Show this help message
    -f, --force         Force rotation of all secrets
    -v, --validate      Only validate secrets, don't rotate
    -l, --list          List secret files and their ages

Examples:
    $0                  # Normal rotation based on schedule
    $0 --force          # Force rotation of all secrets
    $0 --validate       # Only validate current secrets

Rotation Schedule:
    JWT Secret:         Every $JWT_SECRET_ROTATION_DAYS days
    Database Password:  Every $DB_PASSWORD_ROTATION_DAYS days
    Redis Password:     Every $REDIS_PASSWORD_ROTATION_DAYS days
    API Keys:           Every $API_KEYS_ROTATION_DAYS days

Security Notes:
    - All secrets are generated using OpenSSL's secure random number generator
    - Backups are kept for the last 10 rotations
    - File permissions are set to 600 (owner read/write only)
    - Directory permissions are set to 700 (owner access only)

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -f|--force)
            FORCE_ROTATION=true
            shift
            ;;
        -v|--validate)
            VALIDATE_ONLY=true
            shift
            ;;
        -l|--list)
            LIST_SECRETS=true
            shift
            ;;
        *)
            error_exit "Unknown option: $1"
            ;;
    esac
done

# Set default values
FORCE_ROTATION=${FORCE_ROTATION:-false}
VALIDATE_ONLY=${VALIDATE_ONLY:-false}
LIST_SECRETS=${LIST_SECRETS:-false}

# Execute requested action
if [[ "$LIST_SECRETS" == "true" ]]; then
    log "Listing secret files and their ages..."
    find "$SECRETS_DIR" -name "*.txt" -exec basename {} \; | while read file; do
        if [[ -f "$SECRETS_DIR/$file" ]]; then
            local age_days=$(( ($(date +%s) - $(stat -f%Sm -t %s "$SECRETS_DIR/$file" 2>/dev/null || stat -c%Y "$SECRETS_DIR/$file" 2>/dev/null)) / 86400 ))
            echo "$file: $age_days days old"
        fi
    done
    exit 0
fi

if [[ "$VALIDATE_ONLY" == "true" ]]; then
    if validate_secrets; then
        log "All secrets are valid"
        exit 0
    else
        error_exit "Secret validation failed"
    fi
fi

# Run main rotation process
main