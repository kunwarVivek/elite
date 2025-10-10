import { readFileSync, existsSync } from 'fs';
import { logger } from './logger.js';

/**
 * Docker Secrets Configuration
 *
 * This module provides utilities for reading Docker secrets from files.
 * Docker secrets are stored in /run/secrets/ directory in production containers.
 *
 * The implementation follows a fallback strategy:
 * 1. Try to read from secret file (e.g., /run/secrets/database_url)
 * 2. Fall back to environment variable (e.g., DATABASE_URL)
 * 3. Return undefined if neither exists
 *
 * @module config/secrets
 */

/**
 * Default directory where Docker secrets are mounted
 */
const SECRETS_DIR = '/run/secrets';

/**
 * Read a secret from a Docker secrets file
 *
 * @param secretName - Name of the secret file (without path)
 * @returns The secret value as a string, or undefined if not found
 *
 * @example
 * ```typescript
 * const dbPassword = readSecretFile('database_password');
 * ```
 */
export function readSecretFile(secretName: string): string | undefined {
  const secretPath = `${SECRETS_DIR}/${secretName}`;

  try {
    if (existsSync(secretPath)) {
      const content = readFileSync(secretPath, 'utf-8').trim();

      if (content) {
        logger.debug(`Successfully read secret from file: ${secretName}`);
        return content;
      } else {
        logger.warn(`Secret file is empty: ${secretPath}`);
        return undefined;
      }
    } else {
      logger.debug(`Secret file not found: ${secretPath}`);
      return undefined;
    }
  } catch (error) {
    logger.error(`Failed to read secret file: ${secretPath}`, { error });
    return undefined;
  }
}

/**
 * Get a secret value with fallback to environment variable
 *
 * This function implements the following priority:
 * 1. Read from Docker secret file (if _FILE suffix provided)
 * 2. Read from environment variable
 * 3. Return undefined
 *
 * @param envVarName - Name of the environment variable
 * @param secretFileName - Optional name of the secret file (defaults to lowercase envVarName)
 * @returns The secret value as a string, or undefined if not found
 *
 * @example
 * ```typescript
 * // Tries DATABASE_URL_FILE, then DATABASE_URL env var
 * const dbUrl = getSecretOrEnv('DATABASE_URL', 'database_url');
 *
 * // Tries JWT_SECRET_FILE, then JWT_SECRET env var
 * const jwtSecret = getSecretOrEnv('JWT_SECRET');
 * ```
 */
export function getSecretOrEnv(
  envVarName: string,
  secretFileName?: string
): string | undefined {
  // Try reading from secret file first
  const secretName = secretFileName || envVarName.toLowerCase();
  const secretValue = readSecretFile(secretName);

  if (secretValue) {
    logger.debug(`Using secret from file for: ${envVarName}`);
    return secretValue;
  }

  // Fall back to environment variable
  const envValue = process.env[envVarName];

  if (envValue) {
    logger.debug(`Using environment variable: ${envVarName}`);
    return envValue;
  }

  // Also try _FILE suffix variant
  const fileEnvValue = process.env[`${envVarName}_FILE`];
  if (fileEnvValue) {
    logger.debug(`Using file path from ${envVarName}_FILE`);
    try {
      if (existsSync(fileEnvValue)) {
        const content = readFileSync(fileEnvValue, 'utf-8').trim();
        if (content) {
          logger.debug(`Successfully read secret from custom path: ${fileEnvValue}`);
          return content;
        }
      }
    } catch (error) {
      logger.error(`Failed to read secret from custom path: ${fileEnvValue}`, { error });
    }
  }

  logger.warn(`No secret or environment variable found for: ${envVarName}`);
  return undefined;
}

/**
 * Validate that required secrets are available
 *
 * @param requiredSecrets - Array of secret names that must be present
 * @throws Error if any required secret is missing
 *
 * @example
 * ```typescript
 * validateSecrets(['DATABASE_URL', 'REDIS_URL', 'JWT_SECRET']);
 * ```
 */
export function validateSecrets(requiredSecrets: string[]): void {
  const missingSecrets: string[] = [];

  for (const secretName of requiredSecrets) {
    const value = getSecretOrEnv(secretName);
    if (!value) {
      missingSecrets.push(secretName);
    }
  }

  if (missingSecrets.length > 0) {
    const errorMessage = `Missing required secrets/environment variables: ${missingSecrets.join(', ')}`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }

  logger.info('All required secrets validated successfully');
}

/**
 * Get all available secrets for debugging (without exposing values)
 *
 * @returns Array of secret names that are available
 */
export function listAvailableSecrets(): string[] {
  const availableSecrets: string[] = [];

  try {
    if (existsSync(SECRETS_DIR)) {
      const { readdirSync } = require('fs');
      const files = readdirSync(SECRETS_DIR);
      availableSecrets.push(...files);
    }
  } catch (error) {
    logger.error('Failed to list secrets directory', { error });
  }

  return availableSecrets;
}

/**
 * Common secret mappings for the application
 */
export const secretMappings = {
  DATABASE_URL: 'database_url',
  REDIS_URL: 'redis_url',
  JWT_SECRET: 'jwt_secret',
  BETTER_AUTH_SECRET: 'better_auth_secret',
  STRIPE_SECRET_KEY: 'stripe_secret_key',
  STRIPE_WEBHOOK_SECRET: 'stripe_webhook_secret',
  AWS_SECRET_ACCESS_KEY: 'aws_secret_access_key',
  SMTP_PASS: 'smtp_password',
} as const;

export default {
  readSecretFile,
  getSecretOrEnv,
  validateSecrets,
  listAvailableSecrets,
  secretMappings,
};
