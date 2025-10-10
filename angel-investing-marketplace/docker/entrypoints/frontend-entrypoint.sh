#!/bin/sh
set -e

# Frontend Entrypoint Script
# Generates runtime configuration from environment variables and starts nginx

# Configuration file path
CONFIG_FILE="/usr/share/nginx/html/config.js"

# Function to safely escape JSON strings
escape_json() {
    printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g; s/$/\\n/g' | tr -d '\n'
}

# Generate runtime configuration from environment variables
generate_config() {
    echo "Generating runtime configuration..."

    # Extract environment variables with VITE_ prefix
    API_URL="${VITE_API_URL:-http://localhost:3001}"
    WS_URL="${VITE_WS_URL:-ws://localhost:3001}"
    BETTER_AUTH_URL="${VITE_BETTER_AUTH_URL:-http://localhost:3001/api/auth}"

    # Create config.js with runtime configuration
    cat > "$CONFIG_FILE" <<EOF
// Runtime Configuration
// This file is generated at container startup from environment variables
window.__RUNTIME_CONFIG__ = {
  apiUrl: "${API_URL}",
  wsUrl: "${WS_URL}",
  betterAuthUrl: "${BETTER_AUTH_URL}"
};
EOF

    echo "Runtime configuration generated successfully"
    echo "API_URL: ${API_URL}"
    echo "WS_URL: ${WS_URL}"
    echo "BETTER_AUTH_URL: ${BETTER_AUTH_URL}"
}

# Main execution
main() {
    # Generate configuration
    generate_config

    # Verify configuration file was created
    if [ ! -f "$CONFIG_FILE" ]; then
        echo "ERROR: Failed to generate configuration file"
        exit 1
    fi

    echo "Starting nginx..."

    # Start nginx in foreground
    exec nginx -g "daemon off;"
}

# Execute main function
main
