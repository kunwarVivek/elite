/**
 * Webhook Controller Tests
 *
 * Tests for Stripe webhook event handling
 * Uses mocked Prisma and email services
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { WebhookController } from '../../controllers/webhook.controller';
import { prismaMock } from '../mocks/prisma';
import { Request, Response } from 'express';
import Stripe from 'stripe';

// Mock Stripe client
jest.mock('../../config/stripe.js', () => ({
  stripe: {
    webhooks: {
      constructEvent: jest.fn(),
    },
  },
}));

// Mock email functions
jest.mock('../../config/email.js', () => ({
  sendTrialStartedEmail: jest.fn().mockResolvedValue(undefined),
  sendTrialEndingSoonEmail: jest.fn().mockResolvedValue(undefined),
  sendTrialEndedEmail: jest.fn().mockResolvedValue(undefined),
  sendPaymentSuccessfulEmail: jest.fn().mockResolvedValue(undefined),
  sendPaymentFailedEmail: jest.fn().mockResolvedValue(undefined),
  sendUpcomingPaymentEmail: jest.fn().mockResolvedValue(undefined),
  sendSubscriptionCanceledEmail: jest.fn().mockResolvedValue(undefined),
  sendSubscriptionReactivatedEmail: jest.fn().mockResolvedValue(undefined),
}));

// Import after mocking
import { stripe } from '../../config/stripe.js';
import * as emailFunctions from '../../config/email.js';

describe('WebhookController', () => {
  let webhookController: WebhookController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    webhookController = new WebhookController();
    jest.clearAllMocks();

    mockRequest = {
      body: {},
      headers: {
        'stripe-signature': 'test-signature',
      },
      rawBody: Buffer.from('test-raw-body'),
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
  });

  describe('handleStripeWebhook', () => {
    it('should process subscription.created event successfully', async () => {
      // Arrange
      const mockSubscription: Partial<Stripe.Subscription> = {
        id: 'sub_123',
        customer: 'cus_123',
        status: 'trialing',
        trial_end: Math.floor(Date.now() / 1000) + 14 * 24 * 60 * 60,
        items: {
          data: [
            {
              price: {
                id: 'price_pro',
                unit_amount: 2900,
                recurring: {
                  interval: 'month',
                },
              },
            } as Stripe.SubscriptionItem,
          ],
        } as Stripe.ApiList<Stripe.SubscriptionItem>,
      };

      const mockEvent: Partial<Stripe.Event> = {
        id: 'evt_123',
        type: 'customer.subscription.created',
        data: {
          object: mockSubscription as Stripe.Subscription,
        },
      };

      const mockUser = {
        id: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        stripeCustomerId: 'cus_123',
      };

      const mockSubscriptionPlan = {
        id: 'plan_123',
        stripePriceId: 'price_pro',
        name: 'Pro Plan',
        tier: 'PRO',
        price: 29,
        billingInterval: 'MONTHLY',
        trialDays: 14,
        features: { safeAgreements: true },
      };

      (stripe.webhooks.constructEvent as jest.Mock).mockReturnValue(mockEvent);
      prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
      prismaMock.subscriptionPlan.findUnique.mockResolvedValue(mockSubscriptionPlan as any);
      prismaMock.subscription.create.mockResolvedValue({
        id: 'subscription_db_123',
        userId: mockUser.id,
        planId: mockSubscriptionPlan.id,
        stripeSubscriptionId: mockSubscription.id,
        status: 'TRIALING',
      } as any);

      // Act
      await webhookController.handleStripeWebhook(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(stripe.webhooks.constructEvent).toHaveBeenCalled();
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { stripeCustomerId: mockSubscription.customer },
      });
      expect(prismaMock.subscription.create).toHaveBeenCalled();
      expect(emailFunctions.sendTrialStartedEmail).toHaveBeenCalledWith(
        mockUser.email,
        mockUser.name,
        expect.any(String), // plan name
        expect.any(Number), // trial days
        expect.any(String), // trial end date
        expect.any(String), // price
        expect.any(String), // features
        expect.any(String) // dashboard URL
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should process subscription.updated event when trial ends', async () => {
      // Arrange
      const mockSubscription: Partial<Stripe.Subscription> = {
        id: 'sub_123',
        customer: 'cus_123',
        status: 'active',
        trial_end: null,
        items: {
          data: [
            {
              price: {
                id: 'price_growth',
                unit_amount: 9900,
              },
            } as Stripe.SubscriptionItem,
          ],
        } as Stripe.ApiList<Stripe.SubscriptionItem>,
      };

      const mockEvent: Partial<Stripe.Event> = {
        id: 'evt_456',
        type: 'customer.subscription.updated',
        data: {
          object: mockSubscription as Stripe.Subscription,
          previous_attributes: {
            status: 'trialing',
          },
        },
      };

      const mockUser = {
        id: 'user_456',
        email: 'growth@example.com',
        name: 'Growth User',
        stripeCustomerId: 'cus_123',
      };

      const mockSubscriptionPlan = {
        id: 'plan_growth',
        stripePriceId: 'price_growth',
        name: 'Growth Plan',
        price: 99,
        billingInterval: 'MONTHLY',
      };

      const mockDbSubscription = {
        id: 'db_sub_123',
        userId: mockUser.id,
        planId: mockSubscriptionPlan.id,
        status: 'TRIALING',
      };

      (stripe.webhooks.constructEvent as jest.Mock).mockReturnValue(mockEvent);
      prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
      prismaMock.subscription.findUnique.mockResolvedValue(mockDbSubscription as any);
      prismaMock.subscriptionPlan.findUnique.mockResolvedValue(mockSubscriptionPlan as any);
      prismaMock.subscription.update.mockResolvedValue({
        ...mockDbSubscription,
        status: 'ACTIVE',
      } as any);

      // Act
      await webhookController.handleStripeWebhook(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prismaMock.subscription.update).toHaveBeenCalled();
      expect(emailFunctions.sendTrialEndedEmail).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should process customer.subscription.trial_will_end event', async () => {
      // Arrange
      const trialEndDate = Math.floor(Date.now() / 1000) + 3 * 24 * 60 * 60; // 3 days from now

      const mockSubscription: Partial<Stripe.Subscription> = {
        id: 'sub_trial_end',
        customer: 'cus_trial',
        status: 'trialing',
        trial_end: trialEndDate,
        items: {
          data: [
            {
              price: {
                id: 'price_pro',
                unit_amount: 2900,
                recurring: {
                  interval: 'month',
                },
              },
            } as Stripe.SubscriptionItem,
          ],
        } as Stripe.ApiList<Stripe.SubscriptionItem>,
      };

      const mockEvent: Partial<Stripe.Event> = {
        id: 'evt_trial_end',
        type: 'customer.subscription.trial_will_end',
        data: {
          object: mockSubscription as Stripe.Subscription,
        },
      };

      const mockUser = {
        id: 'user_trial',
        email: 'trial@example.com',
        name: 'Trial User',
        stripeCustomerId: 'cus_trial',
      };

      const mockSubscriptionPlan = {
        id: 'plan_pro',
        stripePriceId: 'price_pro',
        name: 'Pro Plan',
        price: 29,
        billingInterval: 'MONTHLY',
      };

      (stripe.webhooks.constructEvent as jest.Mock).mockReturnValue(mockEvent);
      prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
      prismaMock.subscription.findUnique.mockResolvedValue({
        id: 'db_sub_trial',
        Plan: mockSubscriptionPlan,
      } as any);

      // Act
      await webhookController.handleStripeWebhook(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(emailFunctions.sendTrialEndingSoonEmail).toHaveBeenCalledWith(
        mockUser.email,
        mockUser.name,
        expect.any(Number), // days left
        expect.any(String), // trial end date
        expect.any(String), // next billing date
        expect.any(String), // amount
        expect.any(String), // payment method
        expect.any(String), // billing settings URL
        expect.any(String) // cancel URL
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should process invoice.paid event', async () => {
      // Arrange
      const mockInvoice: Partial<Stripe.Invoice> = {
        id: 'in_paid_123',
        customer: 'cus_paid',
        subscription: 'sub_paid',
        amount_paid: 2900,
        currency: 'usd',
        status: 'paid',
        period_start: Math.floor(Date.now() / 1000),
        period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        hosted_invoice_url: 'https://invoice.stripe.com/i/abc123',
      };

      const mockEvent: Partial<Stripe.Event> = {
        id: 'evt_invoice_paid',
        type: 'invoice.paid',
        data: {
          object: mockInvoice as Stripe.Invoice,
        },
      };

      const mockUser = {
        id: 'user_paid',
        email: 'paid@example.com',
        name: 'Paid User',
        stripeCustomerId: 'cus_paid',
      };

      const mockSubscriptionPlan = {
        name: 'Pro Plan',
        price: 29,
      };

      (stripe.webhooks.constructEvent as jest.Mock).mockReturnValue(mockEvent);
      prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
      prismaMock.subscription.findUnique.mockResolvedValue({
        id: 'db_sub_paid',
        Plan: mockSubscriptionPlan,
      } as any);
      prismaMock.invoice.create.mockResolvedValue({
        id: 'db_invoice_123',
      } as any);

      // Act
      await webhookController.handleStripeWebhook(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prismaMock.invoice.create).toHaveBeenCalled();
      expect(emailFunctions.sendPaymentSuccessfulEmail).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should process invoice.payment_failed event', async () => {
      // Arrange
      const mockInvoice: Partial<Stripe.Invoice> = {
        id: 'in_failed_123',
        customer: 'cus_failed',
        subscription: 'sub_failed',
        amount_due: 2900,
        currency: 'usd',
        status: 'open',
        attempt_count: 1,
      };

      const mockEvent: Partial<Stripe.Event> = {
        id: 'evt_payment_failed',
        type: 'invoice.payment_failed',
        data: {
          object: mockInvoice as Stripe.Invoice,
        },
      };

      const mockUser = {
        id: 'user_failed',
        email: 'failed@example.com',
        name: 'Failed Payment User',
        stripeCustomerId: 'cus_failed',
      };

      (stripe.webhooks.constructEvent as jest.Mock).mockReturnValue(mockEvent);
      prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
      prismaMock.subscription.update.mockResolvedValue({} as any);

      // Act
      await webhookController.handleStripeWebhook(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prismaMock.subscription.update).toHaveBeenCalledWith({
        where: { stripeSubscriptionId: mockInvoice.subscription },
        data: { status: 'PAST_DUE' },
      });
      expect(emailFunctions.sendPaymentFailedEmail).toHaveBeenCalledWith(
        mockUser.email,
        mockUser.name,
        expect.any(String), // amount
        expect.any(String), // payment method
        expect.any(String), // failure reason
        expect.any(String) // update payment URL
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should process invoice.upcoming event', async () => {
      // Arrange
      const nextBillingDate = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60; // 7 days from now

      const mockInvoice: Partial<Stripe.Invoice> = {
        id: 'in_upcoming_123',
        customer: 'cus_upcoming',
        subscription: 'sub_upcoming',
        amount_due: 9900,
        currency: 'usd',
        period_end: nextBillingDate,
      };

      const mockEvent: Partial<Stripe.Event> = {
        id: 'evt_upcoming',
        type: 'invoice.upcoming',
        data: {
          object: mockInvoice as Stripe.Invoice,
        },
      };

      const mockUser = {
        id: 'user_upcoming',
        email: 'upcoming@example.com',
        name: 'Upcoming User',
        stripeCustomerId: 'cus_upcoming',
      };

      (stripe.webhooks.constructEvent as jest.Mock).mockReturnValue(mockEvent);
      prismaMock.user.findUnique.mockResolvedValue(mockUser as any);

      // Act
      await webhookController.handleStripeWebhook(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(emailFunctions.sendUpcomingPaymentEmail).toHaveBeenCalledWith(
        mockUser.email,
        mockUser.name,
        expect.any(String), // amount
        expect.any(String), // billing date
        expect.any(String), // payment method
        expect.any(String) // manage subscription URL
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should handle webhook signature verification failure', async () => {
      // Arrange
      (stripe.webhooks.constructEvent as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      // Act
      await webhookController.handleStripeWebhook(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: expect.stringContaining('Webhook signature verification failed'),
      });
    });

    it('should handle unhandled event types gracefully', async () => {
      // Arrange
      const mockEvent: Partial<Stripe.Event> = {
        id: 'evt_unhandled',
        type: 'charge.succeeded' as any,
        data: {
          object: {} as any,
        },
      };

      (stripe.webhooks.constructEvent as jest.Mock).mockReturnValue(mockEvent);

      // Act
      await webhookController.handleStripeWebhook(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        received: true,
        message: expect.stringContaining('Unhandled event type'),
      });
    });

    it('should handle errors during event processing gracefully', async () => {
      // Arrange
      const mockSubscription: Partial<Stripe.Subscription> = {
        id: 'sub_error',
        customer: 'cus_error',
        status: 'trialing',
      };

      const mockEvent: Partial<Stripe.Event> = {
        id: 'evt_error',
        type: 'customer.subscription.created',
        data: {
          object: mockSubscription as Stripe.Subscription,
        },
      };

      (stripe.webhooks.constructEvent as jest.Mock).mockReturnValue(mockEvent);
      prismaMock.user.findUnique.mockRejectedValue(new Error('Database connection failed'));

      // Act
      await webhookController.handleStripeWebhook(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: expect.stringContaining('Webhook processing failed'),
      });
    });

    it('should not send email if email fails but still process webhook', async () => {
      // Arrange
      const mockSubscription: Partial<Stripe.Subscription> = {
        id: 'sub_email_fail',
        customer: 'cus_email_fail',
        status: 'trialing',
        items: {
          data: [
            {
              price: {
                id: 'price_pro',
                unit_amount: 2900,
              },
            } as Stripe.SubscriptionItem,
          ],
        } as Stripe.ApiList<Stripe.SubscriptionItem>,
      };

      const mockEvent: Partial<Stripe.Event> = {
        id: 'evt_email_fail',
        type: 'customer.subscription.created',
        data: {
          object: mockSubscription as Stripe.Subscription,
        },
      };

      const mockUser = {
        id: 'user_email_fail',
        email: 'emailfail@example.com',
        name: 'Email Fail User',
        stripeCustomerId: 'cus_email_fail',
      };

      const mockSubscriptionPlan = {
        id: 'plan_pro',
        stripePriceId: 'price_pro',
        name: 'Pro Plan',
        trialDays: 14,
      };

      (stripe.webhooks.constructEvent as jest.Mock).mockReturnValue(mockEvent);
      prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
      prismaMock.subscriptionPlan.findUnique.mockResolvedValue(mockSubscriptionPlan as any);
      prismaMock.subscription.create.mockResolvedValue({} as any);
      (emailFunctions.sendTrialStartedEmail as jest.Mock).mockRejectedValue(new Error('Email service unavailable'));

      // Act
      await webhookController.handleStripeWebhook(mockRequest as Request, mockResponse as Response);

      // Assert
      // Webhook should still return 200 even if email fails
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(prismaMock.subscription.create).toHaveBeenCalled();
    });
  });
});
