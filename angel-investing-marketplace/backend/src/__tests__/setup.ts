/**
 * Jest Test Setup Configuration
 *
 * IMPORTANT: All tests use MOCKED data only. No real database connections.
 * This file configures mocked Prisma, Redis, and external services.
 */

import { jest } from '@jest/globals';
import { prismaMock, resetPrismaMock } from './mocks/prisma';
import { redisMock, resetRedisMock } from './mocks/redis';

// Export mocked clients for use in tests
export { prismaMock, redisMock };

// Export all fixtures for easy access in tests
export * from './fixtures';

// Mock external services to prevent real API calls
// Note: Mock implementations are set up without return values here
// Tests should configure specific return values using mockResolvedValue as needed
jest.mock('../services/email.service', () => ({
  EmailService: {
    sendEmail: jest.fn(),
    sendWelcomeEmail: jest.fn(),
    sendInvestmentNotification: jest.fn(),
    sendVerificationEmail: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
  },
}));

jest.mock('../services/payment.service', () => ({
  PaymentService: {
    processPayment: jest.fn(),
    createPaymentIntent: jest.fn(),
    refundPayment: jest.fn(),
    capturePayment: jest.fn(),
  },
}));

jest.mock('../services/stripe.service', () => ({
  StripeService: {
    createPaymentIntent: jest.fn(),
    confirmPayment: jest.fn(),
    createRefund: jest.fn(),
    createCustomer: jest.fn(),
  },
}));

jest.mock('../services/realtime.service', () => ({
  RealtimeService: {
    emitToUser: jest.fn(),
    emitToRoom: jest.fn(),
    joinRoom: jest.fn(),
    leaveRoom: jest.fn(),
  },
}));

jest.mock('../services/file.service', () => ({
  FileService: {
    uploadFile: jest.fn(),
    deleteFile: jest.fn(),
    getSignedUrl: jest.fn(),
  },
}));

jest.mock('../services/email.service', () => ({
  EmailService: jest.fn(() => ({
    sendEmail: jest.fn(),
    sendTemplateEmail: jest.fn(),
    sendBulkEmail: jest.fn(),
    scheduleEmail: jest.fn(),
  })),
  emailService: {
    sendEmail: jest.fn(),
    sendTemplateEmail: jest.fn(),
    sendBulkEmail: jest.fn(),
    scheduleEmail: jest.fn(),
  },
}));

// Mock AWS S3
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(() => ({
    send: jest.fn(),
  })),
  PutObjectCommand: jest.fn(),
  GetObjectCommand: jest.fn(),
  DeleteObjectCommand: jest.fn(),
}));

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn(() => ({
    paymentIntents: {
      create: jest.fn(),
      confirm: jest.fn(),
    },
    refunds: {
      create: jest.fn(),
    },
    customers: {
      create: jest.fn(),
    },
  }));
});

// Global test setup - runs before all tests
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-key';
  process.env.DATABASE_URL = 'postgresql://mock:mock@localhost:5432/mock_test';
  process.env.REDIS_URL = 'redis://mock:6379';
});

// Reset all mocks before each test to ensure test isolation
beforeEach(() => {
  resetPrismaMock();
  resetRedisMock();
  jest.clearAllMocks();
});

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Global cleanup after all tests
afterAll(() => {
  jest.restoreAllMocks();
});

// Global test utilities
export const createMockRequest = (overrides: any = {}) => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  user: null,
  ...overrides,
});

export const createMockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  res.sendStatus = jest.fn().mockReturnValue(res);
  res.get = jest.fn().mockReturnValue('mock-request-id'); // For X-Request-ID
  return res;
};

export const createMockNext = () => jest.fn();