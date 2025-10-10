import { test, expect } from '@playwright/test';

test.describe('Investment Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as investor
    await page.goto('/login');
    await page.fill('input[name="email"]', process.env.E2E_INVESTOR_EMAIL || 'investor.e2e@test.com');
    await page.fill('input[name="password"]', process.env.E2E_INVESTOR_PASSWORD || 'TestPassword123');
    await page.click('button[type="submit"]');

    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible();
  });

  test('should complete full investment flow', async ({ page }) => {
    // Navigate to pitches/browsing page
    await page.click('text=Browse Pitches');
    await expect(page.locator('[data-testid="pitches-list"]')).toBeVisible();

    // Browse and select a pitch
    await page.click('[data-testid="pitch-card"]:first-child');
    await expect(page.locator('[data-testid="pitch-detail"]')).toBeVisible();

    // Verify pitch information is displayed
    await expect(page.locator('[data-testid="pitch-title"]')).toBeVisible();
    await expect(page.locator('[data-testid="pitch-amount"]')).toBeVisible();
    await expect(page.locator('[data-testid="startup-info"]')).toBeVisible();

    // Click invest button
    await page.click('text=Invest in this Pitch');
    await expect(page.locator('[data-testid="investment-form"]')).toBeVisible();

    // Fill investment form
    await page.fill('input[name="amount"]', '25000');
    await page.selectOption('select[name="paymentMethod"]', 'CARD');

    // Review investment details
    await expect(page.locator('[data-testid="investment-summary"]')).toBeVisible();
    await expect(page.locator('[data-testid="fee-breakdown"]')).toBeVisible();

    // Confirm investment
    await page.click('button[type="submit"]');

    // Should show processing state
    await expect(page.locator('[data-testid="processing-payment"]')).toBeVisible();

    // Wait for completion (in real app, this might take time)
    await expect(page.locator('[data-testid="investment-success"]')).toBeVisible();

    // Should redirect to portfolio or show success message
    await expect(page.locator('[data-testid="investment-confirmation"]')).toBeVisible();
  });

  test('should handle investment form validation', async ({ page }) => {
    await page.click('text=Browse Pitches');
    await page.click('[data-testid="pitch-card"]:first-child');
    await page.click('text=Invest in this Pitch');

    // Try to submit without amount
    await page.click('button[type="submit"]');
    await expect(page.locator('[data-testid="amount-error"]')).toBeVisible();

    // Enter invalid amount (too low)
    await page.fill('input[name="amount"]', '10');
    await page.click('button[type="submit"]');
    await expect(page.locator('[data-testid="amount-error"]')).toContainText(/minimum/i);

    // Enter invalid amount (too high)
    await page.fill('input[name="amount"]', '999999999');
    await page.click('button[type="submit"]');
    await expect(page.locator('[data-testid="amount-error"]')).toContainText(/maximum/i);

    // Enter valid amount but no payment method
    await page.fill('input[name="amount"]', '25000');
    await page.click('button[type="submit"]');
    await expect(page.locator('[data-testid="payment-method-error"]')).toBeVisible();
  });

  test('should display correct fee calculations', async ({ page }) => {
    await page.click('text=Browse Pitches');
    await page.click('[data-testid="pitch-card"]:first-child');
    await page.click('text=Invest in this Pitch');

    // Fill valid amount
    await page.fill('input[name="amount"]', '25000');

    // Should show fee breakdown
    await expect(page.locator('[data-testid="fee-breakdown"]')).toBeVisible();

    // Check fee components
    await expect(page.locator('[data-testid="platform-fee"]')).toBeVisible();
    await expect(page.locator('[data-testid="processing-fee"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-amount"]')).toBeVisible();

    // Verify calculations are correct
    const investmentAmount = 25000;
    const platformFeeElement = page.locator('[data-testid="platform-fee"]');
    const totalAmountElement = page.locator('[data-testid="total-amount"]');

    // Platform fee should be calculated correctly (e.g., 5% for direct investment)
    const expectedPlatformFee = investmentAmount * 0.05; // 5%
    await expect(platformFeeElement).toContainText(expectedPlatformFee.toString());

    // Total should be investment + fees
    const expectedTotal = investmentAmount + expectedPlatformFee;
    await expect(totalAmountElement).toContainText(expectedTotal.toString());
  });

  test('should handle payment method selection', async ({ page }) => {
    await page.click('text=Browse Pitches');
    await page.click('[data-testid="pitch-card"]:first-child');
    await page.click('text=Invest in this Pitch');

    await page.fill('input[name="amount"]', '25000');

    // Test different payment methods
    const paymentMethods = ['CARD', 'BANK_TRANSFER', 'DIGITAL_WALLET'];

    for (const method of paymentMethods) {
      await page.selectOption('select[name="paymentMethod"]', method);

      // Should show method-specific information
      await expect(page.locator(`[data-testid="payment-method-${method}"]`)).toBeVisible();

      // Should update fees based on payment method
      await expect(page.locator('[data-testid="fee-breakdown"]')).toBeVisible();
    }
  });

  test('should handle investment cancellation', async ({ page }) => {
    await page.click('text=Browse Pitches');
    await page.click('[data-testid="pitch-card"]:first-child');
    await page.click('text=Invest in this Pitch');

    await page.fill('input[name="amount"]', '25000');
    await page.selectOption('select[name="paymentMethod"]', 'CARD');

    // Click cancel instead of submit
    await page.click('text=Cancel');

    // Should return to pitch detail page
    await expect(page.locator('[data-testid="pitch-detail"]')).toBeVisible();

    // Form should not be visible
    await expect(page.locator('[data-testid="investment-form"]')).not.toBeVisible();
  });

  test('should handle real-time investment updates', async ({ page }) => {
    await page.click('text=Browse Pitches');
    await page.click('[data-testid="pitch-card"]:first-child');

    // Should show current funding progress
    await expect(page.locator('[data-testid="funding-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="current-funding"]')).toBeVisible();
    await expect(page.locator('[data-testid="funding-goal"]')).toBeVisible();

    // Progress bar should reflect current funding level
    const progressBar = page.locator('[data-testid="funding-progress-bar"]');
    await expect(progressBar).toBeVisible();

    // Should show investor count
    await expect(page.locator('[data-testid="investor-count"]')).toBeVisible();
  });

  test('should handle multiple investments in same pitch', async ({ page }) => {
    await page.click('text=Browse Pitches');
    await page.click('[data-testid="pitch-card"]:first-child');
    await page.click('text=Invest in this Pitch');

    // Make first investment
    await page.fill('input[name="amount"]', '25000');
    await page.selectOption('select[name="paymentMethod"]', 'CARD');
    await page.click('button[type="submit"]');

    await expect(page.locator('[data-testid="investment-success"]')).toBeVisible();

    // Navigate back to portfolio
    await page.click('text=Portfolio');

    // Should show the investment in portfolio
    await expect(page.locator('[data-testid="investment-item"]')).toBeVisible();

    // Try to invest again in the same pitch
    await page.goto('/pitches');
    await page.click('[data-testid="pitch-card"]:first-child');
    await page.click('text=Invest in this Pitch');

    // Should allow additional investment
    await page.fill('input[name="amount"]', '15000');
    await page.selectOption('select[name="paymentMethod"]', 'BANK_TRANSFER');
    await page.click('button[type="submit"]');

    await expect(page.locator('[data-testid="investment-success"]')).toBeVisible();
  });

  test('should handle investment limits and restrictions', async ({ page }) => {
    await page.click('text=Browse Pitches');
    await page.click('[data-testid="pitch-card"]:first-child');
    await page.click('text=Invest in this Pitch');

    // Try to invest below minimum
    await page.fill('input[name="amount"]', '100');
    await page.click('button[type="submit"]');

    await expect(page.locator('[data-testid="amount-error"]')).toContainText(/minimum/i);

    // Try to invest above maximum (if there's a per-investor limit)
    await page.fill('input[name="amount"]', '500000');
    await page.click('button[type="submit"]');

    // Should either show error or proceed (depending on business rules)
    const errorElement = page.locator('[data-testid="amount-error"]');
    if (await errorElement.isVisible()) {
      await expect(errorElement).toContainText(/maximum|limit/i);
    }
  });

  test('should handle escrow and legal document flow', async ({ page }) => {
    await page.click('text=Browse Pitches');
    await page.click('[data-testid="pitch-card"]:first-child');
    await page.click('text=Invest in this Pitch');

    await page.fill('input[name="amount"]', '25000');
    await page.selectOption('select[name="paymentMethod"]', 'CARD');
    await page.click('button[type="submit"]');

    await expect(page.locator('[data-testid="investment-success"]')).toBeVisible();

    // Should show escrow information
    await expect(page.locator('[data-testid="escrow-status"]')).toBeVisible();

    // Should show legal documents if required
    const legalDocsSection = page.locator('[data-testid="legal-documents"]');
    if (await legalDocsSection.isVisible()) {
      await expect(legalDocsSection).toBeVisible();

      // Should be able to view/download documents
      await expect(page.locator('[data-testid="document-download"]')).toBeVisible();
    }

    // Should show next steps
    await expect(page.locator('[data-testid="next-steps"]')).toBeVisible();
  });

  test('should handle investment failure scenarios', async ({ page }) => {
    // Mock payment failure
    await page.route('**/api/v1/payments/process', route => {
      route.fulfill({
        status: 402,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: 'Payment declined by bank',
          error: 'PAYMENT_DECLINED'
        })
      });
    });

    await page.click('text=Browse Pitches');
    await page.click('[data-testid="pitch-card"]:first-child');
    await page.click('text=Invest in this Pitch');

    await page.fill('input[name="amount"]', '25000');
    await page.selectOption('select[name="paymentMethod"]', 'CARD');
    await page.click('button[type="submit"]');

    // Should show payment error
    await expect(page.locator('[data-testid="payment-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="payment-error"]')).toContainText(/declined|failed/i);

    // Should allow retry
    await expect(page.locator('[data-testid="retry-payment"]')).toBeVisible();
  });

  test('should handle mobile investment flow', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.click('text=Browse Pitches');
    await page.click('[data-testid="pitch-card"]:first-child');
    await page.click('text=Invest in this Pitch');

    // Form should be mobile-friendly
    await expect(page.locator('[data-testid="investment-form"]')).toBeVisible();

    // Should be able to scroll and interact with all elements
    await page.fill('input[name="amount"]', '25000');
    await page.selectOption('select[name="paymentMethod"]', 'CARD');

    // Submit button should be accessible
    await page.click('button[type="submit"]');

    await expect(page.locator('[data-testid="investment-success"]')).toBeVisible();
  });

  test('should handle concurrent investments', async ({ page }) => {
    await page.click('text=Browse Pitches');

    // Open multiple pitch pages
    const [pitchPage1] = await Promise.all([
      page.context().newPage(),
      page.click('[data-testid="pitch-card"]:first-child')
    ]);

    const [pitchPage2] = await Promise.all([
      pitchPage1.context().newPage(),
      pitchPage1.click('[data-testid="pitch-card"]:nth-child(2)')
    ]);

    // Try to invest in both pitches
    await pitchPage1.click('text=Invest in this Pitch');
    await pitchPage1.fill('input[name="amount"]', '25000');
    await pitchPage1.selectOption('select[name="paymentMethod"]', 'CARD');

    await pitchPage2.click('text=Invest in this Pitch');
    await pitchPage2.fill('input[name="amount"]', '15000');
    await pitchPage2.selectOption('select[name="paymentMethod"]', 'BANK_TRANSFER');

    // Submit both investments
    await pitchPage1.click('button[type="submit"]');
    await pitchPage2.click('button[type="submit"]');

    // Both should succeed
    await expect(pitchPage1.locator('[data-testid="investment-success"]')).toBeVisible();
    await expect(pitchPage2.locator('[data-testid="investment-success"]')).toBeVisible();

    await pitchPage1.close();
    await pitchPage2.close();
  });

  test('should handle investment analytics and reporting', async ({ page }) => {
    // Complete an investment first
    await page.click('text=Browse Pitches');
    await page.click('[data-testid="pitch-card"]:first-child');
    await page.click('text=Invest in this Pitch');

    await page.fill('input[name="amount"]', '25000');
    await page.selectOption('select[name="paymentMethod"]', 'CARD');
    await page.click('button[type="submit"]');

    await expect(page.locator('[data-testid="investment-success"]')).toBeVisible();

    // Navigate to portfolio
    await page.click('text=Portfolio');

    // Should show investment analytics
    await expect(page.locator('[data-testid="portfolio-analytics"]')).toBeVisible();
    await expect(page.locator('[data-testid="investment-performance"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-invested"]')).toBeVisible();

    // Should show investment details
    await page.click('[data-testid="investment-item"]:first-child');
    await expect(page.locator('[data-testid="investment-details"]')).toBeVisible();
  });
});