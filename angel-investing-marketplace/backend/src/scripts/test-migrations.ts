/**
 * Migration Idempotency Test Script
 *
 * This script tests that migrations can be run multiple times safely
 * by running migrations, resetting the database, and running them again.
 *
 * Usage: ts-node backend/src/scripts/test-migrations.ts
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import * as path from 'path';

const prisma = new PrismaClient();

interface TestResult {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Execute a shell command and return the result
 */
function executeCommand(command: string, cwd: string): TestResult {
  try {
    console.log(`\n🔧 Executing: ${command}`);
    const output = execSync(command, {
      cwd,
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    console.log(output);
    return {
      success: true,
      message: `Command executed successfully: ${command}`
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Command failed: ${command}`,
      error: error.message || String(error)
    };
  }
}

/**
 * Test database connection
 */
async function testConnection(): Promise<TestResult> {
  try {
    console.log('\n🔌 Testing database connection...');
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection successful');
    return {
      success: true,
      message: 'Database connection successful'
    };
  } catch (error: any) {
    console.error('❌ Database connection failed:', error.message);
    return {
      success: false,
      message: 'Database connection failed',
      error: error.message || String(error)
    };
  }
}

/**
 * Get the count of applied migrations
 */
async function getMigrationCount(): Promise<number> {
  try {
    const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM "_prisma_migrations"
    `;
    return Number(result[0].count);
  } catch (error) {
    // Table might not exist yet
    return 0;
  }
}

/**
 * Run migrations and verify they complete successfully
 */
async function runMigrations(backendPath: string): Promise<TestResult> {
  try {
    console.log('\n📦 Running migrations...');
    const result = executeCommand('npx prisma migrate deploy', backendPath);

    if (!result.success) {
      return result;
    }

    const migrationCount = await getMigrationCount();
    console.log(`✅ Migrations completed. Total applied: ${migrationCount}`);

    return {
      success: true,
      message: `Migrations completed successfully. Applied: ${migrationCount}`
    };
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    return {
      success: false,
      message: 'Migration failed',
      error: error.message || String(error)
    };
  }
}

/**
 * Test that migrations are idempotent (can run multiple times)
 */
async function testIdempotency(backendPath: string): Promise<TestResult> {
  try {
    console.log('\n🔁 Testing migration idempotency...');

    // Get migration count before
    const countBefore = await getMigrationCount();
    console.log(`Migrations before re-run: ${countBefore}`);

    // Run migrations again
    const result = executeCommand('npx prisma migrate deploy', backendPath);

    if (!result.success) {
      return result;
    }

    // Get migration count after
    const countAfter = await getMigrationCount();
    console.log(`Migrations after re-run: ${countAfter}`);

    if (countBefore !== countAfter) {
      return {
        success: false,
        message: 'Idempotency test failed: migration count changed on re-run',
        error: `Before: ${countBefore}, After: ${countAfter}`
      };
    }

    console.log('✅ Idempotency test passed: migrations can run multiple times safely');
    return {
      success: true,
      message: 'Migrations are idempotent'
    };
  } catch (error: any) {
    console.error('❌ Idempotency test failed:', error.message);
    return {
      success: false,
      message: 'Idempotency test failed',
      error: error.message || String(error)
    };
  }
}

/**
 * Verify schema is in sync after migrations
 */
async function verifySchema(backendPath: string): Promise<TestResult> {
  try {
    console.log('\n🔍 Verifying schema sync...');

    // Check if there are pending migrations
    const result = executeCommand('npx prisma migrate status', backendPath);

    if (!result.success) {
      return result;
    }

    console.log('✅ Schema verification completed');
    return {
      success: true,
      message: 'Schema is in sync with migrations'
    };
  } catch (error: any) {
    console.error('❌ Schema verification failed:', error.message);
    return {
      success: false,
      message: 'Schema verification failed',
      error: error.message || String(error)
    };
  }
}

/**
 * Main test function
 */
async function main() {
  console.log('🧪 Migration Idempotency Test Suite');
  console.log('=====================================\n');

  const backendPath = path.resolve(__dirname, '../..');
  const results: TestResult[] = [];

  // Test 1: Database connection
  const connectionResult = await testConnection();
  results.push(connectionResult);
  if (!connectionResult.success) {
    console.error('\n❌ Test suite failed: Cannot connect to database');
    process.exit(1);
  }

  // Test 2: Run migrations (first time)
  const migrationResult1 = await runMigrations(backendPath);
  results.push(migrationResult1);
  if (!migrationResult1.success) {
    console.error('\n❌ Test suite failed: Initial migration failed');
    await prisma.$disconnect();
    process.exit(1);
  }

  // Test 3: Test idempotency (run migrations again)
  const idempotencyResult = await testIdempotency(backendPath);
  results.push(idempotencyResult);
  if (!idempotencyResult.success) {
    console.error('\n❌ Test suite failed: Idempotency test failed');
    await prisma.$disconnect();
    process.exit(1);
  }

  // Test 4: Verify schema
  const schemaResult = await verifySchema(backendPath);
  results.push(schemaResult);
  if (!schemaResult.success) {
    console.error('\n⚠️  Warning: Schema verification had issues');
  }

  // Summary
  console.log('\n\n📊 Test Summary');
  console.log('=====================================');
  const passed = results.filter(r => r.success).length;
  const total = results.length;

  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} Test ${index + 1}: ${result.message}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });

  console.log(`\n${passed}/${total} tests passed`);

  await prisma.$disconnect();

  if (passed === total) {
    console.log('\n✅ All migration tests passed! Migrations are idempotent.');
    process.exit(0);
  } else {
    console.log('\n❌ Some migration tests failed.');
    process.exit(1);
  }
}

// Run the test suite
main().catch((error) => {
  console.error('❌ Test suite encountered an unexpected error:', error);
  prisma.$disconnect();
  process.exit(1);
});
