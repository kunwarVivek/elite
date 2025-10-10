import { expect, afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup();
});

// Mock environment variables for tests
beforeAll(() => {
  // Mock API base URL
  process.env.VITE_API_URL = 'http://localhost:3001/api/v1';

  // Mock WebSocket URL
  process.env.VITE_WS_URL = 'ws://localhost:3001';

  // Mock other environment variables as needed
  process.env.VITE_STRIPE_PUBLISHABLE_KEY = 'pk_test_mock_key';
});

// Mock modules that are not available in test environment
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  observe() {
    return null;
  }
  disconnect() {
    return null;
  }
  unobserve() {
    return null;
  }
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  observe() {
    return null;
  }
  disconnect() {
    return null;
  }
  unobserve() {
    return null;
  }
};

// Mock WebSocket for testing
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.OPEN;
  url = '';

  constructor(url: string) {
    this.url = url;
  }

  send() {}
  close() {
    this.readyState = MockWebSocket.CLOSED;
  }

  addEventListener() {}
  removeEventListener() {}
  dispatchEvent() {}
}

global.WebSocket = MockWebSocket as any;

// Test utilities
export const createMockUser = (overrides = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  role: 'INVESTOR',
  avatar_url: 'https://example.com/avatar.jpg',
  is_verified: true,
  created_at: new Date().toISOString(),
  ...overrides,
});

export const createMockStartup = (overrides = {}) => ({
  id: 'startup-123',
  name: 'Test Startup Inc',
  slug: 'test-startup-inc',
  description: 'A test startup for testing purposes',
  industry: 'Technology',
  stage: 'MVP',
  funding_goal: 500000,
  current_funding: 150000,
  founder_id: 'user-123',
  is_verified: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export const createMockPitch = (overrides = {}) => ({
  id: 'pitch-123',
  startup_id: 'startup-123',
  title: 'Revolutionary SaaS Platform',
  summary: 'AI-powered platform transforming business operations',
  funding_amount: 500000,
  equity_offered: 10,
  minimum_investment: 10000,
  status: 'ACTIVE',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

export const createMockInvestment = (overrides = {}) => ({
  id: 'investment-123',
  investor_id: 'user-123',
  pitch_id: 'pitch-123',
  amount: 25000,
  equity_percentage: 0.5,
  status: 'COMPLETED',
  investment_date: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

// Mock API responses
export const mockApiResponse = (data: any, success = true) => ({
  success,
  data,
  message: success ? 'Success' : 'Error',
  errors: success ? null : [{ field: 'general', message: 'Mock error' }],
  meta: {
    timestamp: new Date().toISOString(),
    version: 'v1',
    request_id: 'test-request-123',
  },
});

// Wait for async operations
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock localStorage
const localStorageMock = {
  getItem: (key: string) => null,
  setItem: (key: string, value: string) => {},
  removeItem: (key: string) => {},
  clear: () => {},
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: (key: string) => null,
  setItem: (key: string, value: string) => {},
  removeItem: (key: string) => {},
  clear: () => {},
};

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
});