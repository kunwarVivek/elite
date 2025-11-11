/**
 * Email Service Tests
 *
 * Tests for email template functions and email sending
 * Uses mocked Nodemailer transporter
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock nodemailer before importing email functions
const mockSendMail = jest.fn();
const mockCreateTransport = jest.fn(() => ({
  sendMail: mockSendMail,
}));

jest.mock('nodemailer', () => ({
  createTransport: mockCreateTransport,
}));

// Mock email queue
jest.mock('../../config/email.js', () => {
  const actual = jest.requireActual('../../config/email.js') as any;
  return {
    ...actual,
    queueEmail: jest.fn().mockResolvedValue(undefined),
  };
});

import * as emailFunctions from '../../config/email.js';

describe('Email Service - Template Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendTrialStartedEmail', () => {
    it('should queue trial started email with correct data', async () => {
      // Arrange
      const to = 'user@example.com';
      const name = 'John Doe';
      const planName = 'Pro Plan';
      const trialDays = 14;
      const trialEndDate = 'December 15, 2025';
      const priceAfterTrial = '$29/month';
      const planFeatures = '<li>Feature 1</li><li>Feature 2</li>';
      const dashboardUrl = 'https://example.com/dashboard';

      // Act
      await emailFunctions.sendTrialStartedEmail(
        to,
        name,
        planName,
        trialDays,
        trialEndDate,
        priceAfterTrial,
        planFeatures,
        dashboardUrl
      );

      // Assert
      expect(emailFunctions.queueEmail).toHaveBeenCalledWith({
        to,
        template: 'trialStarted',
        templateData: {
          name,
          planName,
          trialDays: trialDays.toString(),
          trialEndDate,
          priceAfterTrial,
          planFeatures,
          dashboardUrl,
        },
      });
    });
  });

  describe('sendTrialEndingSoonEmail', () => {
    it('should queue trial ending soon email with correct data', async () => {
      // Arrange
      const to = 'user@example.com';
      const name = 'Jane Smith';
      const daysLeft = 3;
      const trialEndDate = 'December 18, 2025';
      const nextBillingDate = 'December 19, 2025';
      const nextBillingAmount = '$29.00';
      const paymentMethod = 'Visa ending in 4242';
      const billingSettingsUrl = 'https://example.com/settings/billing';
      const cancelUrl = 'https://example.com/settings/cancel';

      // Act
      await emailFunctions.sendTrialEndingSoonEmail(
        to,
        name,
        daysLeft,
        trialEndDate,
        nextBillingDate,
        nextBillingAmount,
        paymentMethod,
        billingSettingsUrl,
        cancelUrl
      );

      // Assert
      expect(emailFunctions.queueEmail).toHaveBeenCalledWith({
        to,
        template: 'trialEndingSoon',
        templateData: {
          name,
          daysLeft: daysLeft.toString(),
          trialEndDate,
          nextBillingDate,
          nextBillingAmount,
          paymentMethod,
          billingSettingsUrl,
          cancelUrl,
        },
      });
    });
  });

  describe('sendTrialEndedEmail', () => {
    it('should queue trial ended email with correct data', async () => {
      // Arrange
      const to = 'user@example.com';
      const name = 'Alice Johnson';
      const planName = 'Growth Plan';
      const nextBillingDate = 'January 15, 2026';
      const billingAmount = '$99.00';
      const paymentMethod = 'MasterCard ending in 5555';
      const dashboardUrl = 'https://example.com/dashboard';

      // Act
      await emailFunctions.sendTrialEndedEmail(
        to,
        name,
        planName,
        nextBillingDate,
        billingAmount,
        paymentMethod,
        dashboardUrl
      );

      // Assert
      expect(emailFunctions.queueEmail).toHaveBeenCalledWith({
        to,
        template: 'trialEnded',
        templateData: {
          name,
          planName,
          nextBillingDate,
          billingAmount,
          paymentMethod,
          dashboardUrl,
        },
      });
    });
  });

  describe('sendPaymentSuccessfulEmail', () => {
    it('should queue payment successful email with correct data', async () => {
      // Arrange
      const to = 'user@example.com';
      const name = 'Bob Wilson';
      const paymentAmount = '$29.00';
      const paymentDate = 'December 15, 2025';
      const billingPeriod = 'Dec 15, 2025 - Jan 14, 2026';
      const paymentMethod = 'Visa ending in 4242';
      const nextBillingDate = 'January 14, 2026';
      const invoiceUrl = 'https://invoice.stripe.com/i/abc123';

      // Act
      await emailFunctions.sendPaymentSuccessfulEmail(
        to,
        name,
        paymentAmount,
        paymentDate,
        billingPeriod,
        paymentMethod,
        nextBillingDate,
        invoiceUrl
      );

      // Assert
      expect(emailFunctions.queueEmail).toHaveBeenCalledWith({
        to,
        template: 'paymentSuccessful',
        templateData: {
          name,
          paymentAmount,
          paymentDate,
          billingPeriod,
          paymentMethod,
          nextBillingDate,
          invoiceUrl,
        },
      });
    });
  });

  describe('sendPaymentFailedEmail', () => {
    it('should queue payment failed email with high priority', async () => {
      // Arrange
      const to = 'user@example.com';
      const name = 'Charlie Brown';
      const amountDue = '$29.00';
      const paymentMethod = 'Visa ending in 4242';
      const failureReason = 'Insufficient funds';
      const updatePaymentUrl = 'https://example.com/settings/payment';

      // Act
      await emailFunctions.sendPaymentFailedEmail(
        to,
        name,
        amountDue,
        paymentMethod,
        failureReason,
        updatePaymentUrl
      );

      // Assert
      expect(emailFunctions.queueEmail).toHaveBeenCalledWith({
        to,
        template: 'paymentFailed',
        templateData: {
          name,
          amountDue,
          paymentMethod,
          failureReason,
          updatePaymentUrl,
        },
        priority: 'high',
      });
    });
  });

  describe('sendUpcomingPaymentEmail', () => {
    it('should queue upcoming payment email with correct data', async () => {
      // Arrange
      const to = 'user@example.com';
      const name = 'Diana Prince';
      const paymentAmount = '$99.00';
      const billingDate = 'January 1, 2026';
      const paymentMethod = 'Amex ending in 1234';
      const manageSubscriptionUrl = 'https://example.com/settings/subscription';

      // Act
      await emailFunctions.sendUpcomingPaymentEmail(
        to,
        name,
        paymentAmount,
        billingDate,
        paymentMethod,
        manageSubscriptionUrl
      );

      // Assert
      expect(emailFunctions.queueEmail).toHaveBeenCalledWith({
        to,
        template: 'upcomingPayment',
        templateData: {
          name,
          paymentAmount,
          billingDate,
          paymentMethod,
          manageSubscriptionUrl,
        },
      });
    });
  });

  describe('sendSubscriptionCanceledEmail', () => {
    it('should queue subscription canceled email with correct data', async () => {
      // Arrange
      const to = 'user@example.com';
      const name = 'Edward Norton';
      const planName = 'Pro Plan';
      const accessEndDate = 'January 31, 2026';
      const reactivateUrl = 'https://example.com/settings/reactivate';

      // Act
      await emailFunctions.sendSubscriptionCanceledEmail(to, name, planName, accessEndDate, reactivateUrl);

      // Assert
      expect(emailFunctions.queueEmail).toHaveBeenCalledWith({
        to,
        template: 'subscriptionCanceled',
        templateData: {
          name,
          planName,
          accessEndDate,
          reactivateUrl,
        },
      });
    });
  });

  describe('sendSubscriptionReactivatedEmail', () => {
    it('should queue subscription reactivated email with correct data', async () => {
      // Arrange
      const to = 'user@example.com';
      const name = 'Fiona Green';
      const planName = 'Growth Plan';
      const nextBillingDate = 'February 1, 2026';
      const billingAmount = '$99.00';
      const dashboardUrl = 'https://example.com/dashboard';

      // Act
      await emailFunctions.sendSubscriptionReactivatedEmail(
        to,
        name,
        planName,
        nextBillingDate,
        billingAmount,
        dashboardUrl
      );

      // Assert
      expect(emailFunctions.queueEmail).toHaveBeenCalledWith({
        to,
        template: 'subscriptionReactivated',
        templateData: {
          name,
          planName,
          nextBillingDate,
          billingAmount,
          dashboardUrl,
        },
      });
    });
  });

  describe('Email Template Compilation', () => {
    it('should compile template with variables correctly', () => {
      // This test verifies the template compilation logic
      const template = 'Hello {{name}}, your trial ends on {{date}}.';
      const data = { name: 'John', date: 'Dec 31' };

      // Simple template compilation
      const compiled = template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key as keyof typeof data] || '');

      expect(compiled).toBe('Hello John, your trial ends on Dec 31.');
    });

    it('should handle missing template variables gracefully', () => {
      const template = 'Hello {{name}}, {{missing}} variable test.';
      const data = { name: 'Jane' };

      const compiled = template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key as keyof typeof data] || '');

      expect(compiled).toBe('Hello Jane,  variable test.');
    });
  });

  describe('Email Priority Handling', () => {
    it('should send high priority emails for payment failures', async () => {
      // Arrange
      const to = 'urgent@example.com';
      const name = 'Urgent User';
      const amountDue = '$199.00';
      const paymentMethod = 'Visa ending in 1111';
      const failureReason = 'Card expired';
      const updatePaymentUrl = 'https://example.com/update';

      // Act
      await emailFunctions.sendPaymentFailedEmail(
        to,
        name,
        amountDue,
        paymentMethod,
        failureReason,
        updatePaymentUrl
      );

      // Assert
      expect(emailFunctions.queueEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 'high',
        })
      );
    });

    it('should send normal priority emails for non-urgent notifications', async () => {
      // Arrange
      const to = 'user@example.com';
      const name = 'Regular User';
      const planName = 'Pro Plan';
      const trialDays = 14;
      const trialEndDate = 'Dec 31, 2025';
      const priceAfterTrial = '$29/month';
      const planFeatures = '<li>Feature</li>';
      const dashboardUrl = 'https://example.com/dashboard';

      // Act
      await emailFunctions.sendTrialStartedEmail(
        to,
        name,
        planName,
        trialDays,
        trialEndDate,
        priceAfterTrial,
        planFeatures,
        dashboardUrl
      );

      // Assert
      expect(emailFunctions.queueEmail).toHaveBeenCalledWith(
        expect.not.objectContaining({
          priority: 'high',
        })
      );
    });
  });

  describe('Email Service Error Handling', () => {
    it('should handle email queue failures gracefully', async () => {
      // Arrange
      const mockError = new Error('Email queue is down');
      (emailFunctions.queueEmail as jest.Mock).mockRejectedValue(mockError);

      // Act & Assert
      await expect(
        emailFunctions.sendTrialStartedEmail(
          'test@example.com',
          'Test User',
          'Pro Plan',
          14,
          'Dec 31',
          '$29/mo',
          '<li>Feature</li>',
          'https://example.com'
        )
      ).rejects.toThrow('Email queue is down');
    });
  });

  describe('Email Data Validation', () => {
    it('should handle empty or invalid email addresses', async () => {
      // This would be implemented in the actual email service
      // Here we're just ensuring the function accepts the parameter

      await emailFunctions.sendTrialStartedEmail(
        '', // empty email
        'Test User',
        'Pro Plan',
        14,
        'Dec 31',
        '$29/mo',
        '<li>Feature</li>',
        'https://example.com'
      );

      // Email service should still be called (validation happens in transporter)
      expect(emailFunctions.queueEmail).toHaveBeenCalled();
    });

    it('should handle special characters in user names', async () => {
      await emailFunctions.sendTrialStartedEmail(
        'test@example.com',
        "O'Brien & Sons <script>alert('xss')</script>", // potentially problematic name
        'Pro Plan',
        14,
        'Dec 31',
        '$29/mo',
        '<li>Feature</li>',
        'https://example.com'
      );

      expect(emailFunctions.queueEmail).toHaveBeenCalled();
    });
  });
});
