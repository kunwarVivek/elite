# Comprehensive Testing Guide

## Overview

This guide provides comprehensive instructions for running and maintaining the testing framework for the angel investing marketplace. The framework includes unit tests, integration tests, end-to-end tests, security tests, and performance tests.

## Test Structure

```
├── backend/
│   ├── src/__tests__/
│   │   ├── unit/                 # Unit tests for services and utilities
│   │   ├── integration/          # Integration tests for API endpoints
│   │   ├── security/             # Security and authentication tests
│   │   ├── performance/          # Performance tests
│   │   ├── utils/                # Test utilities and factories
│   │   └── setup.ts              # Test setup and configuration
│   └── jest.config.js            # Jest configuration
│
├── frontend/
│   ├── src/__tests__/
│   │   ├── components/           # Component tests
│   │   ├── hooks/                # Custom hook tests
│   │   ├── utils/                # Utility function tests
│   │   ├── pages/                # Page component tests
│   │   ├── e2e/                  # E2E user flow tests
│   │   └── setup.ts              # Frontend test setup
│   └── vitest.config.ts          # Vitest configuration
│
├── e2e/                          # Playwright E2E tests
│   ├── auth/                     # Authentication flow tests
│   ├── investment/               # Investment flow tests
│   ├── pitch/                    # Pitch management tests
│   ├── portfolio/                # Portfolio tests
│   ├── admin/                    # Admin functionality tests
│   ├── global-setup.ts           # E2E test setup
│   └── global-teardown.ts        # E2E test cleanup
│
├── shared/
│   └── test-utils/               # Shared testing utilities
│       ├── test-data-generators.ts
│       ├── mock-generators.ts
│       ├── assertion-helpers.ts
│       ├── time-helpers.ts
│       └── validation-helpers.ts
│
├── .github/
│   └── workflows/
│       └── test.yml              # CI/CD pipeline
│
├── docker/
│   ├── docker-compose.test.yml   # Test services
│   └── init-test-db.sql          # Test database initialization
│
└── scripts/
    └── test-setup.sh             # Test environment setup script
```

## Quick Start

### 1. Setup Test Environment

```bash
# Run the complete test environment setup
./scripts/test-setup.sh

# Or setup individual components
./scripts/test-setup.sh db-only       # Setup only database
./scripts/test-setup.sh backend-only  # Setup only backend
./scripts/test-setup.sh frontend-only # Setup only frontend
```

### 2. Start Test Services

```bash
# Start all test services (database, Redis, MinIO, MailHog)
docker-compose -f docker-compose.test.yml up -d

# View logs
docker-compose -f docker-compose.test.yml logs -f

# Stop test services
docker-compose -f docker-compose.test.yml down -v
```

### 3. Run Tests

#### Backend Tests

```bash
cd backend

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test categories
npm run test -- --testPathPattern=unit
npm run test -- --testPathPattern=integration
npm run test -- --testPathPattern=security
```

#### Frontend Tests

```bash
cd frontend

# Run all tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Run specific test patterns
npm run test -- --testPathPattern=components
npm run test -- --testPathPattern=hooks
```

#### E2E Tests

```bash
# Run all E2E tests
npx playwright test

# Run E2E tests with UI
npx playwright test --ui

# Run E2E tests in headed mode (visible browser)
npx playwright test --headed

# Run specific test files
npx playwright test auth-flow.spec.ts
npx playwright test investment-flow.spec.ts

# Run tests for specific browsers
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

## Test Categories

### 1. Unit Tests

**Backend Unit Tests:**
- Service layer functions
- Utility functions
- Business logic calculations
- Data validation functions

**Frontend Unit Tests:**
- React components (in isolation)
- Custom hooks
- Utility functions
- Helper functions

### 2. Integration Tests

**Backend Integration Tests:**
- API endpoint testing
- Database operations
- External service integrations
- Middleware functionality

**Frontend Integration Tests:**
- Component integration
- API client functionality
- State management
- Routing

### 3. End-to-End Tests

- Complete user workflows
- Authentication flows
- Investment processes
- Admin functionality
- Cross-browser testing
- Mobile responsiveness

### 4. Security Tests

- Authentication bypass attempts
- Authorization testing
- Input validation
- SQL injection prevention
- XSS prevention
- CSRF protection

### 5. Performance Tests

- API response times
- Database query performance
- Frontend rendering performance
- Load testing
- Memory leak detection

## Test Data Management

### Test Factories

The framework includes comprehensive test factories for generating consistent test data:

```typescript
import { TestDataGenerator } from '../shared/test-utils';

// Generate test users
const user = TestDataGenerator.generateUser({
  role: 'INVESTOR',
  is_verified: true
});

// Generate test startups
const startup = TestDataGenerator.generateStartup({
  stage: 'MVP',
  funding_goal: 1000000
});

// Generate realistic scenarios
const scenario = TestDataGenerator.generateRealisticScenario();
```

### Mock Generators

For testing external services:

```typescript
import { MockGenerator } from '../shared/test-utils';

// Generate mock API responses
const response = MockGenerator.generateApiResponse(data, true);

// Generate mock payment data
const paymentData = MockGenerator.generatePaymentData({
  amount: 25000,
  status: 'succeeded'
});

// Generate mock webhooks
const webhook = MockGenerator.generateStripeWebhook('payment_intent.succeeded', 'pi_123');
```

## Database Testing

### Test Database Setup

The test environment uses a separate PostgreSQL database with:

- Clean schema for each test run
- Pre-seeded test data
- Proper indexing for performance
- Transaction rollbacks

### Database Operations in Tests

```typescript
import { testPrisma } from '../setup';

// Create test data
const user = await testPrisma.user.create({
  data: {
    email: 'test@example.com',
    name: 'Test User',
    role: 'INVESTOR'
  }
});

// Clean up after test
await testPrisma.user.deleteMany({
  where: { email: 'test@example.com' }
});
```

## API Testing

### Backend API Testing

```typescript
import request from 'supertest';
import { app } from '../../index';

describe('User API', () => {
  it('should create user successfully', async () => {
    const response = await request(app)
      .post('/api/v1/users')
      .send({
        email: 'test@example.com',
        name: 'Test User',
        role: 'INVESTOR'
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe('test@example.com');
  });
});
```

### Frontend API Testing

```typescript
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

describe('API Integration', () => {
  it('should fetch user data successfully', async () => {
    // Mock API response
    vi.spyOn(apiClient, 'get').mockResolvedValue({
      data: { id: '123', name: 'Test User' }
    });

    // Test component that uses the API
    render(<UserProfile />);

    expect(await screen.findByText('Test User')).toBeInTheDocument();
  });
});
```

## Component Testing

### React Component Testing

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaymentForm } from '../components/payments/payment-form';

describe('PaymentForm', () => {
  const defaultProps = {
    investmentId: 'inv-123',
    investmentAmount: 1000,
    startupName: 'Test Startup'
  };

  it('should render form correctly', () => {
    render(<PaymentForm {...defaultProps} />);

    expect(screen.getByLabelText(/investment amount/i)).toBeInTheDocument();
    expect(screen.getByText('Payment Information')).toBeInTheDocument();
  });

  it('should handle form submission', async () => {
    const user = userEvent.setup();
    const mockSubmit = vi.fn();

    render(<PaymentForm {...defaultProps} onPaymentSuccess={mockSubmit} />);

    await user.type(screen.getByLabelText(/amount/i), '25000');
    await user.click(screen.getByText(/pay/i));

    expect(mockSubmit).toHaveBeenCalled();
  });
});
```

## E2E Testing

### User Flow Testing

```typescript
import { test, expect } from '@playwright/test';

test.describe('Investment Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'investor@test.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');
  });

  test('should complete investment process', async ({ page }) => {
    // Navigate to pitches
    await page.click('text=Browse Pitches');

    // Select and invest in pitch
    await page.click('[data-testid="pitch-card"]:first-child');
    await page.click('text=Invest in this Pitch');

    // Fill investment form
    await page.fill('input[name="amount"]', '25000');
    await page.selectOption('select[name="paymentMethod"]', 'CARD');
    await page.click('button[type="submit"]');

    // Verify success
    await expect(page.locator('[data-testid="investment-success"]')).toBeVisible();
  });
});
```

## Security Testing

### Authentication Security

```typescript
describe('Authentication Security', () => {
  it('should prevent unauthorized access', async () => {
    const response = await request(app)
      .get('/api/v1/protected-route');

    expect(response.status).toBe(401);
  });

  it('should validate JWT tokens properly', async () => {
    const response = await request(app)
      .get('/api/v1/protected-route')
      .set('Authorization', 'Bearer invalid-token');

    expect(response.status).toBe(401);
  });
});
```

### Authorization Testing

```typescript
describe('Role-Based Access Control', () => {
  it('should allow admin access to admin routes', async () => {
    const response = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', 'Bearer admin-token');

    expect(response.status).toBe(200);
  });

  it('should deny non-admin access to admin routes', async () => {
    const response = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', 'Bearer user-token');

    expect(response.status).toBe(403);
  });
});
```

## Performance Testing

### Load Testing

```typescript
import { test, expect } from '@playwright/test';

test.describe('Performance', () => {
  test('should handle concurrent users', async ({ page }) => {
    // Simulate multiple users
    const users = [];
    for (let i = 0; i < 10; i++) {
      const userPage = await page.context().newPage();
      users.push(userPage);
    }

    // Perform concurrent operations
    await Promise.all(
      users.map(user => user.goto('/dashboard'))
    );

    // Verify all pages load successfully
    for (const user of users) {
      await expect(user.locator('[data-testid="dashboard"]')).toBeVisible();
      await user.close();
    }
  });
});
```

## CI/CD Integration

### GitHub Actions Workflow

The project includes a comprehensive GitHub Actions workflow that:

1. **Runs on every push and PR** to main/develop branches
2. **Parallel test execution** for faster feedback
3. **Multi-browser E2E testing** (Chrome, Firefox, Safari)
4. **Coverage reporting** with Codecov integration
5. **Security scanning** with vulnerability detection
6. **Performance testing** with Lighthouse CI
7. **Automated deployment** on successful tests

### Workflow Features

- **Matrix testing** across multiple Node.js versions
- **Service containerization** for database and external services
- **Artifact collection** for test results and reports
- **PR commenting** with test results summary
- **Slack notifications** for test failures
- **Automated rollback** on deployment failures

## Test Debugging

### Common Issues and Solutions

#### Backend Tests

```bash
# If tests are failing due to database issues
docker-compose -f docker-compose.test.yml down -v
docker-compose -f docker-compose.test.yml up -d

# If Redis connection is failing
docker-compose -f docker-compose.test.yml restart test-redis

# If tests are timing out
# Increase test timeout in jest.config.js
```

#### Frontend Tests

```bash
# If component tests are failing
cd frontend && npm run test -- --testPathPattern=component-name

# If tests are failing due to missing dependencies
cd frontend && rm -rf node_modules package-lock.json && npm install

# If E2E tests are failing
npx playwright test --debug
```

#### E2E Tests

```bash
# Run tests in debug mode
npx playwright test --debug

# Run tests with browser UI
npx playwright test --headed

# Generate test results
npx playwright show-report
```

## Best Practices

### Writing Tests

1. **Use descriptive test names** that explain what is being tested
2. **Follow AAA pattern** (Arrange, Act, Assert)
3. **Test one thing at a time** per test case
4. **Use realistic test data** that matches production scenarios
5. **Mock external dependencies** appropriately
6. **Clean up test data** after each test

### Test Organization

1. **Group related tests** in describe blocks
2. **Use consistent naming conventions** across the project
3. **Separate unit, integration, and E2E tests** clearly
4. **Share test utilities** across different test files
5. **Document complex test scenarios**

### Performance Considerations

1. **Use beforeAll/beforeEach** efficiently
2. **Mock expensive operations** in unit tests
3. **Limit E2E test scenarios** to critical paths
4. **Use test databases** instead of production
5. **Parallelize tests** where possible

## Coverage Goals

- **Unit Tests**: 90%+ coverage for utilities and services
- **API Tests**: 100% endpoint coverage with various scenarios
- **Component Tests**: 85%+ coverage for React components
- **E2E Tests**: Critical user flows and edge cases
- **Security Tests**: Authentication and authorization coverage

## Monitoring and Reporting

### Test Reports

- **Coverage reports** generated after each test run
- **E2E test reports** with screenshots and videos
- **Performance reports** with timing metrics
- **Security scan reports** with vulnerability findings

### Notifications

- **Slack notifications** for test failures
- **Email notifications** for critical test failures
- **PR comments** with test results summary
- **Dashboard updates** with test metrics

## Contributing

When adding new features:

1. **Write tests first** (TDD approach)
2. **Update test documentation** for new test patterns
3. **Ensure CI/CD pipeline** includes new tests
4. **Update test data factories** for new entities
5. **Review and update coverage goals**

## Troubleshooting

### Common Issues

1. **Database connection failures**
   - Check Docker services are running
   - Verify connection strings in .env.test files
   - Ensure database migrations are up to date

2. **Test timeouts**
   - Increase timeout values in configuration
   - Check for infinite loops in test code
   - Verify external services are available

3. **Flaky tests**
   - Add retry logic for network-dependent tests
   - Use proper wait conditions
   - Avoid time-based assertions

4. **Memory issues**
   - Clean up test data properly
   - Close database connections
   - Monitor memory usage in long-running tests

### Getting Help

- Check the [Troubleshooting Guide](#troubleshooting-guide) section
- Review test logs and error messages
- Consult team members for specific issues
- Update documentation for new issues and solutions

---

## Summary

This testing framework provides comprehensive coverage for the angel investing marketplace with:

✅ **Complete test automation** across all layers
✅ **CI/CD integration** with GitHub Actions
✅ **Multi-browser E2E testing** with Playwright
✅ **Security testing** for authentication and authorization
✅ **Performance testing** with load testing capabilities
✅ **Comprehensive documentation** and setup scripts
✅ **Shared utilities** for consistent testing patterns
✅ **Real-time reporting** and monitoring

The framework is designed to ensure high-quality code, catch issues early, and provide confidence in deployments.