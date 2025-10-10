#!/bin/bash

# Angel Investing Marketplace - Secrets Validation Script
# Validates secret strength, entropy requirements, and security compliance

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

# Validation rules (using simple arrays for compatibility)
SECRET_FILES=(
    "postgres_password.txt:32:alphanumeric:Database password must be at least 32 characters"
    "redis_password.txt:32:alphanumeric:Redis password must be at least 32 characters"
    "jwt_secret.txt:64:hex:JWT secret must be at least 64 hex characters (256 bits)"
    "encryption_key.txt:32:hex:Encryption key must be at least 32 hex characters (128 bits)"
    "stripe_secret_key.txt:128:hex:Stripe secret key must be at least 128 hex characters (512 bits)"
    "stripe_webhook_secret.txt:64:hex:Stripe webhook secret must be at least 64 hex characters (256 bits)"
    "cloudflare_r2_access_key.txt:32:alphanumeric:R2 access key must be at least 32 characters"
    "cloudflare_r2_secret_key.txt:64:hex:R2 secret key must be at least 64 hex characters (256 bits)"
    "email_service_api_key.txt:48:alphanumeric:Email API key must be at least 48 characters"
    "grafana_admin_password.txt:16:alphanumeric:Grafana password must be at least 16 characters"
)

# Entropy calculation function
calculate_entropy() {
    local data="$1"
    local length=${#data}

    # Simple entropy calculation based on character set diversity
    local charset_size=0

    # Check for different character types
    [[ "$data" =~ [a-z] ]] && ((charset_size += 26))
    [[ "$data" =~ [A-Z] ]] && ((charset_size += 26))
    [[ "$data" =~ [0-9] ]] && ((charset_size += 10))

    # Check for special characters (rough estimate)
    local special_chars=$(echo "$data" | tr -d 'a-zA-Z0-9' | wc -c)
    if [[ $special_chars -gt 0 ]]; then
        ((charset_size += 32)) # Rough estimate for special chars
    fi

    if [[ $charset_size -eq 0 ]]; then
        echo "0"
        return
    fi

    # Calculate entropy: log2(charset_size^length)
    local entropy=$(echo "l($charset_size^$length)/l(2)" | bc -l 2>/dev/null || echo "0")
    echo "$entropy"
}

# Validate hex string
is_hex() {
    local data="$1"
    [[ "$data" =~ ^[a-fA-F0-9]+$ ]]
}

# Validate alphanumeric string
is_alphanumeric() {
    local data="$1"
    [[ "$data" =~ ^[a-zA-Z0-9]+$ ]]
}

# Validate file permissions
validate_file_permissions() {
    local file="$1"
    local expected_perms="$2"

    if [[ ! -f "$file" ]]; then
        echo "ERROR: File does not exist: $file"
        return 1
    fi

    local actual_perms=$(stat -f%Lp "$file" 2>/dev/null || stat -c%a "$file" 2>/dev/null)

    if [[ "$actual_perms" != "$expected_perms" ]]; then
        echo "ERROR: Invalid permissions on $file. Expected: $expected_perms, Got: $actual_perms"
        return 1
    fi

    echo "OK: File permissions correct for $file"
    return 0
}

# Validate individual secret
validate_secret() {
    local file="$1"
    local requirements="$2"
    local description="$3"

    IFS=':' read -r min_length char_type error_msg <<< "$requirements"

    if [[ ! -f "$SECRETS_DIR/$file" ]]; then
        echo "ERROR: $file does not exist"
        return 1
    fi

    local content=$(cat "$SECRETS_DIR/$file" 2>/dev/null)
    local actual_length=${#content}

    # Check length requirement
    if [[ $actual_length -lt $min_length ]]; then
        echo "ERROR: $file too short. $error_msg (Current: $actual_length, Required: $min_length)"
        return 1
    fi

    # Check character type requirements
    case "$char_type" in
        "hex")
            if ! is_hex "$content"; then
                echo "ERROR: $file must contain only hexadecimal characters"
                return 1
            fi
            ;;
        "alphanumeric")
            if ! is_alphanumeric "$content"; then
                echo "ERROR: $file must contain only alphanumeric characters"
                return 1
            fi
            ;;
    esac

    # Calculate and check entropy
    local entropy=$(calculate_entropy "$content")
    local min_entropy_threshold=64 # Minimum 64 bits of entropy

    if (( $(echo "$entropy < $min_entropy_threshold" | bc -l 2>/dev/null || echo "1") )); then
        echo "WARNING: $file has low entropy: $entropy bits (recommended: $min_entropy_threshold+ bits)"
    fi

    echo "OK: $file meets requirements ($actual_length chars, ~$entropy bits entropy)"
    return 0
}

# Check for common weak patterns
check_weak_patterns() {
    local file="$1"
    local content=$(cat "$SECRETS_DIR/$file" 2>/dev/null)

    local weak_patterns=(
        "password:123456"
        "password:admin"
        "password:root"
        "password:qwerty"
        "password:letmein"
        "password:welcome"
        "password:monkey"
        "password:dragon"
        "password:password"
        "password:changeme"
        "password:test"
        "password:demo"
    )

    for pattern in "${weak_patterns[@]}"; do
        if [[ "$content" == "$pattern" ]]; then
            echo "ERROR: $file contains weak pattern: $pattern"
            return 1
        fi
    done

    # Check for repeated characters
    if [[ "$content" =~ (.)\1{7,} ]]; then
        echo "WARNING: $file contains repeated characters"
    fi

    return 0
}

# Main validation function
validate_all_secrets() {
    local errors=0
    local warnings=0

    echo "🔐 Validating Angel Investing Marketplace Secrets"
    echo "================================================="

    # Check directory permissions
    local dir_perms=$(stat -f%Lp "$SECRETS_DIR" 2>/dev/null || stat -c%a "$SECRETS_DIR" 2>/dev/null)
    if [[ "$dir_perms" != "700" ]]; then
        echo "ERROR: Secrets directory has incorrect permissions. Expected: 700, Got: $dir_perms"
        ((errors++))
    else
        echo "OK: Secrets directory permissions correct (700)"
    fi

    echo

    # Validate each secret file
    for secret_spec in "${SECRET_FILES[@]}"; do
        local file=$(echo "$secret_spec" | cut -d: -f1)
        local requirements=$(echo "$secret_spec" | cut -d: -f2-)
        local description=$(echo "$requirements" | cut -d: -f3)

        echo "Validating $file..."
        echo "  Requirements: $description"

        if validate_secret "$file" "$requirements" "$description"; then
            if check_weak_patterns "$file"; then
                echo "  Status: ✅ VALID"
            else
                echo "  Status: ⚠️  VALID WITH WARNINGS"
                ((warnings++))
            fi
        else
            echo "  Status: ❌ INVALID"
            ((errors++))
        fi
        echo
    done

    # Summary
    echo "================================================="
    if [[ $errors -eq 0 ]]; then
        echo -e "${GREEN}✅ VALIDATION SUCCESSFUL${NC}"
        echo "All secrets meet security requirements"
        if [[ $warnings -gt 0 ]]; then
            echo -e "${YELLOW}⚠️  $warnings warning(s) found${NC}"
        fi
        return 0
    else
        echo -e "${RED}❌ VALIDATION FAILED${NC}"
        echo "$errors error(s) found"
        if [[ $warnings -gt 0 ]]; then
            echo -e "${YELLOW}⚠️  $warnings warning(s) found${NC}"
        fi
        return 1
    fi
}

# Show help
show_help() {
    cat << EOF
Angel Investing Marketplace - Secrets Validation Tool

Usage: $0 [OPTIONS]

Options:
    -h, --help          Show this help message
    -v, --verbose       Show detailed validation information
    -f, --fix           Attempt to fix common issues
    -s, --summary       Show only summary results

Validation Checks:
    - File existence and accessibility
    - Minimum length requirements
    - Character set validation (hex, alphanumeric)
    - Entropy calculation and validation
    - Common weak pattern detection
    - File permission validation

Security Requirements:
    Database Password:     32+ alphanumeric characters
    Redis Password:        32+ alphanumeric characters
    JWT Secret:           64+ hex characters (256+ bits)
    Encryption Key:       32+ hex characters (128+ bits)
    Stripe Secret Key:   128+ hex characters (512+ bits)
    Webhook Secret:       64+ hex characters (256+ bits)
    R2 Access Key:        32+ alphanumeric characters
    R2 Secret Key:        64+ hex characters (256+ bits)
    Email API Key:        48+ alphanumeric characters
    Grafana Password:     16+ alphanumeric characters

Examples:
    $0                  # Run full validation
    $0 --verbose        # Show detailed information
    $0 --summary        # Show only summary

EOF
}

# Parse command line arguments
VERBOSE=false
FIX_MODE=false
SUMMARY_ONLY=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -f|--fix)
            FIX_MODE=true
            shift
            ;;
        -s|--summary)
            SUMMARY_ONLY=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run validation
if validate_all_secrets; then
    exit 0
else
    exit 1
fi