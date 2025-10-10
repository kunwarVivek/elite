import { test as setup, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/angel_investing_test'
    }
  }
});

setup('Global Setup', async ({}) => {
  console.log('Setting up E2E test environment...');

  try {
    // Clean test database
    await cleanupDatabase();

    // Seed test data
    await seedTestData();

    console.log('E2E test environment setup completed successfully');
  } catch (error) {
    console.error('Failed to setup E2E test environment:', error);
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

async function seedTestData() {
  // Create test users
  const founderUser = await testPrisma.user.create({
    data: {
      id: 'e2e-founder-user',
      email: 'founder.e2e@test.com',
      name: 'E2E Founder User',
      role: 'FOUNDER',
      is_verified: true,
    }
  });

  const investorUser = await testPrisma.user.create({
    data: {
      id: 'e2e-investor-user',
      email: 'investor.e2e@test.com',
      name: 'E2E Investor User',
      role: 'INVESTOR',
      is_verified: true,
    }
  });

  const adminUser = await testPrisma.user.create({
    data: {
      id: 'e2e-admin-user',
      email: 'admin.e2e@test.com',
      name: 'E2E Admin User',
      role: 'ADMIN',
      is_verified: true,
    }
  });

  // Create test startup
  const startup = await testPrisma.startup.create({
    data: {
      id: 'e2e-test-startup',
      name: 'E2E Test Startup Inc',
      slug: 'e2e-test-startup-inc',
      description: 'A startup created for E2E testing',
      industry: 'Technology',
      stage: 'MVP',
      funding_goal: 1000000,
      current_funding: 0,
      founder_id: founderUser.id,
      is_verified: true,
    }
  });

  // Create test pitch
  const pitch = await testPrisma.pitch.create({
    data: {
      id: 'e2e-test-pitch',
      startup_id: startup.id,
      title: 'Revolutionary E2E Test Platform',
      summary: 'A platform for comprehensive E2E testing',
      funding_amount: 500000,
      equity_offered: 10,
      minimum_investment: 10000,
      status: 'ACTIVE',
    }
  });

  // Create test investment
  await testPrisma.investment.create({
    data: {
      id: 'e2e-test-investment',
      investor_id: investorUser.id,
      pitch_id: pitch.id,
      amount: 25000,
      equity_percentage: 0.5,
      status: 'COMPLETED',
    }
  });

  console.log('Test data seeded successfully');
}

// Store test data for use in tests
setup('Store test credentials', async ({}) => {
  process.env.E2E_FOUNDER_EMAIL = 'founder.e2e@test.com';
  process.env.E2E_FOUNDER_PASSWORD = 'TestPassword123';
  process.env.E2E_INVESTOR_EMAIL = 'investor.e2e@test.com';
  process.env.E2E_INVESTOR_PASSWORD = 'TestPassword123';
  process.env.E2E_ADMIN_EMAIL = 'admin.e2e@test.com';
  process.env.E2E_ADMIN_PASSWORD = 'TestPassword123';
});