#!/usr/bin/env ts-node
/**
 * Production Migration Runner
 *
 * This script runs Prisma migrations in production environments.
 * It should be executed before the application starts to ensure
 * the database schema is up to date.
 *
 * Usage:
 *   npm run migrate:deploy
 *   or
 *   ts-node src/scripts/migrate.ts
 *
 * Environment Variables Required:
 *   DATABASE_URL - PostgreSQL connection string
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface MigrationResult {
  success: boolean;
  message: string;
  error?: Error;
}

/**
 * Run Prisma migrate deploy command
 * This applies pending migrations to the database
 */
async function runMigrations(): Promise<MigrationResult> {
  console.log('🔄 Starting database migration...');
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);

  try {
    // Verify DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    console.log('📊 Checking migration status...');

    // Run prisma migrate deploy
    const { stdout, stderr } = await execAsync('npx prisma migrate deploy', {
      cwd: process.cwd(),
      env: process.env,
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    });

    if (stderr && !stderr.includes('Applying migration')) {
      console.warn('⚠️  Migration warnings:', stderr);
    }

    console.log('✅ Migration output:', stdout);

    return {
      success: true,
      message: 'Migrations applied successfully'
    };
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return {
      success: false,
      message: 'Migration failed',
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}

/**
 * Verify database connection before running migrations
 */
async function verifyConnection(): Promise<boolean> {
  console.log('🔌 Verifying database connection...');

  try {
    await execAsync('npx prisma db execute --stdin', {
      cwd: process.cwd(),
      env: process.env,
      maxBuffer: 1024 * 1024
    });

    console.log('✅ Database connection verified');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

/**
 * Main migration execution
 */
async function main() {
  console.log('🚀 Database Migration Runner');
  console.log('================================\n');

  // Verify connection first
  const connected = await verifyConnection();
  if (!connected) {
    console.error('❌ Cannot proceed without database connection');
    process.exit(1);
  }

  // Run migrations
  const result = await runMigrations();

  if (!result.success) {
    console.error('\n❌ Migration failed:', result.message);
    if (result.error) {
      console.error('Error details:', result.error);
    }
    process.exit(1);
  }

  console.log('\n✅ All migrations completed successfully');
  console.log('================================\n');
}

// Execute if run directly
if (require.main === module) {
  main()
    .then(() => {
      console.log('✅ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

export { runMigrations, verifyConnection };
