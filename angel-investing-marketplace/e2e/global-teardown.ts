import { test as teardown } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/angel_investing_test'
    }
  }
});

teardown('Global Teardown', async ({}) => {
  console.log('Cleaning up E2E test environment...');

  try {
    // Clean test database
    await cleanupDatabase();

    // Close database connection
    await testPrisma.$disconnect();

    console.log('E2E test environment cleanup completed successfully');
  } catch (error) {
    console.error('Failed to cleanup E2E test environment:', error);
    throw error;
  }
});

async function cleanupDatabase() {
  const tables = [
    'notifications',
    'documents',
    'comments',
    'messages',
    'transactions',
    'investments',
    'pitches',
    'startups',
    'user_profiles',
    'users'
  ];

  for (const table of tables) {
    try {
      await testPrisma.$executeRawUnsafe(`TRUNCATE TABLE ${table} CASCADE`);
    } catch (error) {
      console.warn(`Failed to truncate table ${table}:`, error);
    }
  }
}