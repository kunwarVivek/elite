import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
  });

  test('should complete full registration and login flow', async ({ page }) => {
    // Generate unique email for this test
    const timestamp = Date.now();
    const testEmail = `testuser${timestamp}@example.com`;

    // Navigate to registration page
    await page.click('text=Sign Up');
    await expect(page).toHaveURL(/.*register/);

    // Fill registration form
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'SecurePass123');
    await page.fill('input[name="confirmPassword"]', 'SecurePass123');
    await page.fill('input[name="name"]', 'Test User');

    // Select investor role
    await page.click('text=Investor');
    await page.click('button[type="submit"]');

    // Should redirect to email verification or dashboard
    await expect(page.locator('h1')).toContainText(/welcome|verify|dashboard/i);

    // If email verification is required, complete it
    if (page.url().includes('verify')) {
      // Check email (in real app, this would be mocked)
      await page.fill('input[name="verificationCode"]', '123456');
      await page.click('button[type="submit"]');
    }

    // Should be logged in and redirected to dashboard
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
  });

  test('should login with existing credentials', async ({ page }) => {
    // Navigate to login page
    await page.click('text=Sign In');
    await expect(page).toHaveURL(/.*login/);

    // Fill login form
    await page.fill('input[name="email"]', process.env.E2E_INVESTOR_EMAIL || 'investor.e2e@test.com');
    await page.fill('input[name="password"]', process.env.E2E_INVESTOR_PASSWORD || 'TestPassword123');

    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();

    // Should display user name or welcome message
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('should handle login with invalid credentials', async ({ page }) => {
    await page.click('text=Sign In');
    await expect(page).toHaveURL(/.*login/);

    // Fill login form with wrong credentials
    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');

    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText(/invalid|incorrect|failed/i);

    // Should remain on login page
    await expect(page).toHaveURL(/.*login/);
  });

  test('should handle password reset flow', async ({ page }) => {
    await page.click('text=Sign In');
    await page.click('text=Forgot Password?');

    await expect(page).toHaveURL(/.*forgot-password/);

    // Fill email for password reset
    await page.fill('input[name="email"]', process.env.E2E_INVESTOR_EMAIL || 'investor.e2e@test.com');
    await page.click('button[type="submit"]');

    // Should show success message
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="success-message"]')).toContainText(/sent|email|instructions/i);
  });

  test('should logout successfully', async ({ page }) => {
    // First login
    await page.click('text=Sign In');
    await page.fill('input[name="email"]', process.env.E2E_INVESTOR_EMAIL || 'investor.e2e@test.com');
    await page.fill('input[name="password"]', process.env.E2E_INVESTOR_PASSWORD || 'TestPassword123');
    await page.click('button[type="submit"]');

    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();

    // Click logout
    await page.click('[data-testid="user-menu"]');
    await page.click('text=Sign Out');

    // Should redirect to home page
    await expect(page).toHaveURL('/');
    await expect(page.locator('text=Sign In')).toBeVisible();
  });

  test('should handle session timeout', async ({ page }) => {
    // Login first
    await page.click('text=Sign In');
    await page.fill('input[name="email"]', process.env.E2E_INVESTOR_EMAIL || 'investor.e2e@test.com');
    await page.fill('input[name="password"]', process.env.E2E_INVESTOR_PASSWORD || 'TestPassword123');
    await page.click('button[type="submit"]');

    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();

    // Simulate session timeout by clearing localStorage
    await page.evaluate(() => {
      localStorage.removeItem('auth-token');
      localStorage.removeItem('user');
    });

    // Try to access protected route
    await page.goto('/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL(/.*login/);
  });

  test('should handle role-based access control', async ({ page }) => {
    // Login as investor
    await page.click('text=Sign In');
    await page.fill('input[name="email"]', process.env.E2E_INVESTOR_EMAIL || 'investor.e2e@test.com');
    await page.fill('input[name="password"]', process.env.E2E_INVESTOR_PASSWORD || 'TestPassword123');
    await page.click('button[type="submit"]');

    // Try to access admin panel (should fail or redirect)
    await page.goto('/admin');

    // Should either redirect or show access denied
    await expect(page.locator('text=Access Denied').or(page.locator('text=Sign In'))).toBeVisible();
  });

  test('should handle form validation errors', async ({ page }) => {
    await page.click('text=Sign In');

    // Try to submit empty form
    await page.click('button[type="submit"]');

    // Should show validation errors
    await expect(page.locator('[data-testid="field-error"]')).toHaveCount(2); // Email and password errors

    // Fill only email
    await page.fill('input[name="email"]', 'test@example.com');
    await page.click('button[type="submit"]');

    // Should still show password error
    await expect(page.locator('input[name="password"]')).toHaveAttribute('aria-invalid', 'true');
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Mock network error
    await page.route('**/api/v1/auth/login', route => {
      route.abort('failed');
    });

    await page.click('text=Sign In');
    await page.fill('input[name="email"]', process.env.E2E_INVESTOR_EMAIL || 'investor.e2e@test.com');
    await page.fill('input[name="password"]', process.env.E2E_INVESTOR_PASSWORD || 'TestPassword123');
    await page.click('button[type="submit"]');

    // Should show network error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toContainText(/network|connection|failed/i);
  });

  test('should handle rate limiting', async ({ page }) => {
    await page.click('text=Sign In');

    // Attempt multiple rapid logins
    for (let i = 0; i < 5; i++) {
      await page.fill('input[name="email"]', 'ratelimit@test.com');
      await page.fill('input[name="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');
    }

    // Should eventually show rate limiting message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
  });

  test('should remember user session across browser refresh', async ({ page }) => {
    // Login
    await page.click('text=Sign In');
    await page.fill('input[name="email"]', process.env.E2E_INVESTOR_EMAIL || 'investor.e2e@test.com');
    await page.fill('input[name="password"]', process.env.E2E_INVESTOR_PASSWORD || 'TestPassword123');
    await page.click('button[type="submit"]');

    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();

    // Refresh page
    await page.reload();

    // Should still be logged in
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });
});