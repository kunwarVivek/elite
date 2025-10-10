#!/bin/sh
set -e

# Backend Entrypoint Script
# Handles initialization flow for backend container:
# 1. Load secrets from /run/secrets into environment variables
# 2. Wait for PostgreSQL to be ready
# 3. Generate Prisma client
# 4. Run database migrations
# 5. Start application

SECRETS_DIR="/run/secrets"
MAX_RETRIES=30
RETRY_INTERVAL=2

# Load secrets from Docker secrets directory into environment variables
load_secrets() {
  echo "Loading secrets from ${SECRETS_DIR}..."

  # Required secrets - fail fast if missing
  REQUIRED_SECRETS="database_url redis_url better_auth_secret jwt_secret"
  for secret in ${REQUIRED_SECRETS}; do
    secret_path="${SECRETS_DIR}/${secret}"
    if [ ! -f "${secret_path}" ]; then
      echo "ERROR: Required secret not found: ${secret}"
      exit 1
    fi

    # Convert secret filename to uppercase environment variable name
    env_var_name=$(echo "${secret}" | tr '[:lower:]' '[:upper:]')

    # Read secret value and export as environment variable
    secret_value=$(cat "${secret_path}" | tr -d '\n\r')
    if [ -z "${secret_value}" ]; then
      echo "ERROR: Required secret is empty: ${secret}"
      exit 1
    fi

    export "${env_var_name}=${secret_value}"
    echo "Loaded required secret: ${env_var_name}"
  done

  # Optional secrets - gracefully handle if missing
  OPTIONAL_SECRETS="smtp_pass aws_secret_access_key stripe_secret_key stripe_webhook_secret plaid_secret"
  for secret in ${OPTIONAL_SECRETS}; do
    secret_path="${SECRETS_DIR}/${secret}"
    if [ -f "${secret_path}" ]; then
      env_var_name=$(echo "${secret}" | tr '[:lower:]' '[:upper:]')
      secret_value=$(cat "${secret_path}" | tr -d '\n\r')
      if [ -n "${secret_value}" ]; then
        export "${env_var_name}=${secret_value}"
        echo "Loaded optional secret: ${env_var_name}"
      else
        echo "Warning: Optional secret is empty: ${secret}"
      fi
    else
      echo "Optional secret not found (skipping): ${secret}"
    fi
  done

  echo "Secrets loaded successfully"
}

# Wait for PostgreSQL to be ready
wait_for_postgres() {
  echo "Waiting for PostgreSQL to be ready..."

  retry_count=0
  while [ ${retry_count} -lt ${MAX_RETRIES} ]; do
    retry_count=$((retry_count + 1))
    echo "Attempting database connection (${retry_count}/${MAX_RETRIES})..."

    # Use Prisma to check database connectivity
    if echo "SELECT 1" | npx prisma db execute --stdin > /dev/null 2>&1; then
      echo "PostgreSQL is ready!"
      return 0
    fi

    if [ ${retry_count} -lt ${MAX_RETRIES} ]; then
      echo "PostgreSQL not ready yet, retrying in ${RETRY_INTERVAL} seconds..."
      sleep ${RETRY_INTERVAL}
    fi
  done

  echo "ERROR: PostgreSQL did not become ready within $((MAX_RETRIES * RETRY_INTERVAL)) seconds"
  exit 1
}

# Generate Prisma client at runtime
generate_prisma() {
  echo "Generating Prisma client..."

  if npx prisma generate; then
    echo "Prisma client generated successfully"
    return 0
  else
    echo "ERROR: Prisma client generation failed"
    exit 1
  fi
}

# Run database migrations
run_migrations() {
  echo "Running database migrations..."

  if npx prisma migrate deploy; then
    echo "Database migrations completed successfully"
    return 0
  else
    echo "ERROR: Database migrations failed"
    exit 1
  fi
}

# Main initialization flow
main() {
  echo "=== Backend Initialization Started ==="

  load_secrets
  wait_for_postgres
  generate_prisma
  run_migrations

  echo "=== Backend Initialization Complete ==="
  echo "Starting application..."

  # Use exec to replace shell process with node process for proper signal handling
  exec node dist/index.js
}

# Run main function
main
