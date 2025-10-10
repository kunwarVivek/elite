#!/usr/bin/env ts-node
/**
 * Schema Verification Script
 *
 * This script verifies that the database schema is in sync with Prisma schema.
 * It checks for any pending migrations or schema drift.
 *
 * Usage:
 *   npm run migrate:verify
 *   or
 *   ts-node src/scripts/verify-schema.ts
 *
 * Exit codes:
 *   0 - Schema is in sync
 *   1 - Schema is out of sync or verification failed
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface VerificationResult {
  inSync: boolean;
  message: string;
  pendingMigrations?: string[];
  error?: Error;
}

/**
 * Check migration status
 */
async function checkMigrationStatus(): Promise<VerificationResult> {
  console.log('🔍 Checking migration status...');

  try {
    // Verify DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    // Run prisma migrate status
    const { stdout, stderr } = await execAsync('npx prisma migrate status', {
      cwd: process.cwd(),
      env: process.env,
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    });

    console.log('Migration status output:', stdout);

    // Check if there are pending migrations
    const hasPendingMigrations =
      stdout.includes('have not yet been applied') ||
      stdout.includes('Database schema is not up to date');

    if (hasPendingMigrations) {
      // Extract migration names from output
      const migrations = stdout
        .split('\n')
        .filter((line) => line.includes('migration'))
        .map((line) => line.trim());

      return {
        inSync: false,
        message: 'Database schema is out of sync. Pending migrations detected.',
        pendingMigrations: migrations
      };
    }

    // Check for schema drift
    const hasDrift =
      stdout.includes('drift') ||
      stderr.includes('drift') ||
      stdout.includes('Your database schema is not in sync');

    if (hasDrift) {
      return {
        inSync: false,
        message: 'Database schema drift detected. Schema does not match migrations.'
      };
    }

    return {
      inSync: true,
      message: 'Database schema is in sync with Prisma schema'
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Migration status command returns non-zero exit code when there are pending migrations
    // Check if the error is actually about pending migrations
    if (errorMessage.includes('have not yet been applied')) {
      return {
        inSync: false,
        message: 'Pending migrations detected',
        error: error instanceof Error ? error : new Error(errorMessage)
      };
    }

    return {
      inSync: false,
      message: 'Failed to verify schema status',
      error: error instanceof Error ? error : new Error(errorMessage)
    };
  }
}

/**
 * Verify Prisma schema syntax
 */
async function verifyPrismaSchema(): Promise<boolean> {
  console.log('📋 Verifying Prisma schema syntax...');

  try {
    await execAsync('npx prisma validate', {
      cwd: process.cwd(),
      env: process.env
    });

    console.log('✅ Prisma schema is valid');
    return true;
  } catch (error) {
    console.error('❌ Prisma schema validation failed:', error);
    return false;
  }
}

/**
 * Main verification execution
 */
async function main() {
  console.log('🔍 Database Schema Verification');
  console.log('================================\n');

  // First verify Prisma schema is valid
  const schemaValid = await verifyPrismaSchema();
  if (!schemaValid) {
    console.error('\n❌ Prisma schema is invalid');
    process.exit(1);
  }

  console.log('');

  // Check migration status
  const result = await checkMigrationStatus();

  if (!result.inSync) {
    console.error('\n❌ Schema verification failed');
    console.error('Message:', result.message);

    if (result.pendingMigrations && result.pendingMigrations.length > 0) {
      console.error('\nPending migrations:');
      result.pendingMigrations.forEach((migration) => {
        console.error(`  - ${migration}`);
      });
      console.error('\nRun "npm run migrate:deploy" to apply pending migrations');
    }

    if (result.error) {
      console.error('\nError details:', result.error.message);
    }

    process.exit(1);
  }

  console.log('\n✅ Schema verification passed');
  console.log('Message:', result.message);
  console.log('================================\n');
}

// Execute if run directly
if (require.main === module) {
  main()
    .then(() => {
      console.log('✅ Verification script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Verification script failed:', error);
      process.exit(1);
    });
}

export { checkMigrationStatus, verifyPrismaSchema };
