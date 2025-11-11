/**
 * Subscription Controller Tests
 *
 * Tests for subscription management API endpoints
 * Uses mocked Prisma and Stripe services
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { SubscriptionController } from '../../controllers/subscription.controller';
import { prismaMock } from '../mocks/prisma';
import { Request, Response } from 'express';
import { PlanTier, SubscriptionStatus } from '@prisma/client';

// Mock StripeService
jest.mock('../../services/stripe.service.js', () => ({
  StripeService: {
    createSetupIntent: jest.fn(),
    createSubscription: jest.fn(),
    cancelSubscription: jest.fn(),
    reactivateSubscription: jest.fn(),
    createBillingPortalSession: jest.fn(),
    getUpcomingInvoice: jest.fn(),
    getCustomerPaymentMethods: jest.fn(),
  },
}));

// Import after mocking
import { StripeService } from '../../services/stripe.service.js';

describe('SubscriptionController', () => {
  let subscriptionController: SubscriptionController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    subscriptionController = new SubscriptionController();
    jest.clearAllMocks();

    mockRequest = {
      body: {},
      params: {},
      query: {},
      user: {
        id: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
      } as any,
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
  });

  describe('getSubscriptionPlans', () => {
    it('should return all subscription plans', async () => {
      // Arrange
      const mockPlans = [
        {
          id: 'plan_free',
          name: 'Free Plan',
          tier: 'FREE' as PlanTier,
          price: 0,
          billingInterval: 'MONTHLY',
          trialDays: 0,
          features: {},
        },
        {
          id: 'plan_pro',
          name: 'Pro Plan',
          tier: 'PRO' as PlanTier,
          price: 29,
          billingInterval: 'MONTHLY',
          trialDays: 14,
          features: { safeAgreements: true },
        },
        {
          id: 'plan_growth',
          name: 'Growth Plan',
          tier: 'GROWTH' as PlanTier,
          price: 99,
          billingInterval: 'MONTHLY',
          trialDays: 14,
          features: { safeAgreements: true, waterfallAnalysis: true },
        },
      ];

      prismaMock.subscriptionPlan.findMany.mockResolvedValue(mockPlans as any);

      // Act
      await subscriptionController.getSubscriptionPlans(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prismaMock.subscriptionPlan.findMany).toHaveBeenCalledWith({
        orderBy: { price: 'asc' },
      });
      expect(mockResponse.json).toHaveBeenCalledWith(mockPlans);
    });

    it('should handle errors when retrieving plans', async () => {
      // Arrange
      prismaMock.subscriptionPlan.findMany.mockRejectedValue(new Error('Database error'));

      // Act
      await subscriptionController.getSubscriptionPlans(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Failed to retrieve subscription plans',
      });
    });
  });

  describe('getMySubscription', () => {
    it('should return user subscription with plan details', async () => {
      // Arrange
      const mockSubscription = {
        id: 'sub_123',
        userId: 'user_123',
        planId: 'plan_pro',
        status: 'ACTIVE' as SubscriptionStatus,
        stripeSubscriptionId: 'sub_stripe_123',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        Plan: {
          id: 'plan_pro',
          name: 'Pro Plan',
          tier: 'PRO' as PlanTier,
          price: 29,
          features: { safeAgreements: true },
        },
        Usage: {
          investments: 5,
          documents: 10,
        },
      };

      prismaMock.subscription.findUnique.mockResolvedValue(mockSubscription as any);

      // Act
      await subscriptionController.getMySubscription(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(prismaMock.subscription.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user_123' },
        include: {
          Plan: true,
          Usage: true,
        },
      });
      expect(mockResponse.json).toHaveBeenCalledWith(mockSubscription);
    });

    it('should return 404 if user has no subscription', async () => {
      // Arrange
      prismaMock.subscription.findUnique.mockResolvedValue(null);

      // Act
      await subscriptionController.getMySubscription(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Subscription not found',
      });
    });
  });

  describe('createSetupIntent', () => {
    it('should create a setup intent for new customer', async () => {
      // Arrange
      const mockUser = {
        id: 'user_new',
        email: 'newuser@example.com',
        name: 'New User',
        stripeCustomerId: null,
      };

      mockRequest.user = mockUser as any;

      const mockSetupIntent = {
        clientSecret: 'seti_secret_abc123',
        setupIntentId: 'seti_123',
      };

      (StripeService.createSetupIntent as jest.Mock).mockResolvedValue(mockSetupIntent);
      prismaMock.user.update.mockResolvedValue({
        ...mockUser,
        stripeCustomerId: 'cus_new123',
      } as any);

      // Act
      await subscriptionController.createSetupIntent(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(StripeService.createSetupIntent).toHaveBeenCalled();
      expect(prismaMock.user.update).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith(mockSetupIntent);
    });

    it('should create setup intent for existing customer', async () => {
      // Arrange
      const mockUser = {
        id: 'user_existing',
        email: 'existing@example.com',
        name: 'Existing User',
        stripeCustomerId: 'cus_existing123',
      };

      mockRequest.user = mockUser as any;

      const mockSetupIntent = {
        clientSecret: 'seti_secret_xyz789',
        setupIntentId: 'seti_456',
      };

      (StripeService.createSetupIntent as jest.Mock).mockResolvedValue(mockSetupIntent);

      // Act
      await subscriptionController.createSetupIntent(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(StripeService.createSetupIntent).toHaveBeenCalledWith('cus_existing123');
      expect(prismaMock.user.update).not.toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith(mockSetupIntent);
    });

    it('should handle errors during setup intent creation', async () => {
      // Arrange
      (StripeService.createSetupIntent as jest.Mock).mockRejectedValue(new Error('Stripe error'));

      // Act
      await subscriptionController.createSetupIntent(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Failed to create setup intent',
      });
    });
  });

  describe('createStripeSubscription', () => {
    it('should create a subscription with payment method', async () => {
      // Arrange
      mockRequest.body = {
        planId: 'plan_pro',
        paymentMethodId: 'pm_123',
      };

      const mockUser = {
        id: 'user_123',
        email: 'test@example.com',
        name: 'Test User',
        stripeCustomerId: 'cus_123',
      };

      mockRequest.user = mockUser as any;

      const mockPlan = {
        id: 'plan_pro',
        name: 'Pro Plan',
        tier: 'PRO' as PlanTier,
        stripePriceId: 'price_pro',
        price: 29,
        trialDays: 14,
        features: { safeAgreements: true },
      };

      const mockStripeSubscription = {
        id: 'sub_stripe_123',
        customer: 'cus_123',
        status: 'trialing',
        trial_end: Math.floor(Date.now() / 1000) + 14 * 24 * 60 * 60,
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      };

      const mockDbSubscription = {
        id: 'sub_db_123',
        userId: mockUser.id,
        planId: mockPlan.id,
        stripeSubscriptionId: mockStripeSubscription.id,
        status: 'TRIALING' as SubscriptionStatus,
        Plan: mockPlan,
      };

      prismaMock.subscriptionPlan.findUnique.mockResolvedValue(mockPlan as any);
      (StripeService.createSubscription as jest.Mock).mockResolvedValue(mockStripeSubscription);
      prismaMock.subscription.create.mockResolvedValue(mockDbSubscription as any);
      prismaMock.subscriptionUsage.create.mockResolvedValue({} as any);

      // Act
      await subscriptionController.createStripeSubscription(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(StripeService.createSubscription).toHaveBeenCalledWith({
        customerId: mockUser.stripeCustomerId,
        priceId: mockPlan.stripePriceId,
        paymentMethodId: mockRequest.body.paymentMethodId,
        trialDays: mockPlan.trialDays,
      });
      expect(prismaMock.subscription.create).toHaveBeenCalled();
      expect(prismaMock.subscriptionUsage.create).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(mockDbSubscription);
    });

    it('should return 400 if plan not found', async () => {
      // Arrange
      mockRequest.body = {
        planId: 'plan_invalid',
        paymentMethodId: 'pm_123',
      };

      prismaMock.subscriptionPlan.findUnique.mockResolvedValue(null);

      // Act
      await subscriptionController.createStripeSubscription(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid subscription plan',
      });
    });

    it('should return 400 if user already has active subscription', async () => {
      // Arrange
      mockRequest.body = {
        planId: 'plan_pro',
        paymentMethodId: 'pm_123',
      };

      const mockPlan = {
        id: 'plan_pro',
        stripePriceId: 'price_pro',
      };

      const mockExistingSubscription = {
        id: 'sub_existing',
        status: 'ACTIVE',
      };

      prismaMock.subscriptionPlan.findUnique.mockResolvedValue(mockPlan as any);
      prismaMock.subscription.findUnique.mockResolvedValue(mockExistingSubscription as any);

      // Act
      await subscriptionController.createStripeSubscription(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'User already has an active subscription',
      });
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel subscription at period end', async () => {
      // Arrange
      mockRequest.body = {
        cancelAtPeriodEnd: true,
        reason: 'Too expensive',
      };

      const mockSubscription = {
        id: 'sub_db_123',
        userId: 'user_123',
        stripeSubscriptionId: 'sub_stripe_123',
        status: 'ACTIVE' as SubscriptionStatus,
      };

      const mockCanceledSubscription = {
        id: 'sub_stripe_123',
        status: 'active',
        cancel_at_period_end: true,
      };

      prismaMock.subscription.findUnique.mockResolvedValue(mockSubscription as any);
      (StripeService.cancelSubscription as jest.Mock).mockResolvedValue(mockCanceledSubscription);
      prismaMock.subscription.update.mockResolvedValue({
        ...mockSubscription,
        cancelAtPeriodEnd: true,
        canceledAt: new Date(),
      } as any);

      // Act
      await subscriptionController.cancelSubscription(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(StripeService.cancelSubscription).toHaveBeenCalledWith('sub_stripe_123', true);
      expect(prismaMock.subscription.update).toHaveBeenCalledWith({
        where: { userId: 'user_123' },
        data: {
          cancelAtPeriodEnd: true,
          canceledAt: expect.any(Date),
        },
        include: {
          Plan: true,
          Usage: true,
        },
      });
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should cancel subscription immediately', async () => {
      // Arrange
      mockRequest.body = {
        cancelAtPeriodEnd: false,
      };

      const mockSubscription = {
        id: 'sub_db_123',
        userId: 'user_123',
        stripeSubscriptionId: 'sub_stripe_123',
        status: 'ACTIVE' as SubscriptionStatus,
      };

      const mockCanceledSubscription = {
        id: 'sub_stripe_123',
        status: 'canceled',
      };

      prismaMock.subscription.findUnique.mockResolvedValue(mockSubscription as any);
      (StripeService.cancelSubscription as jest.Mock).mockResolvedValue(mockCanceledSubscription);
      prismaMock.subscription.update.mockResolvedValue({
        ...mockSubscription,
        status: 'CANCELED' as SubscriptionStatus,
        canceledAt: new Date(),
      } as any);

      // Act
      await subscriptionController.cancelSubscription(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(StripeService.cancelSubscription).toHaveBeenCalledWith('sub_stripe_123', false);
      expect(prismaMock.subscription.update).toHaveBeenCalledWith({
        where: { userId: 'user_123' },
        data: {
          status: 'CANCELED',
          canceledAt: expect.any(Date),
        },
        include: {
          Plan: true,
          Usage: true,
        },
      });
    });

    it('should return 404 if user has no subscription', async () => {
      // Arrange
      prismaMock.subscription.findUnique.mockResolvedValue(null);

      // Act
      await subscriptionController.cancelSubscription(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Subscription not found',
      });
    });
  });

  describe('createBillingPortalSession', () => {
    it('should create a billing portal session', async () => {
      // Arrange
      mockRequest.body = {
        returnUrl: 'https://example.com/settings/subscription',
      };

      const mockUser = {
        id: 'user_123',
        stripeCustomerId: 'cus_123',
      };

      mockRequest.user = mockUser as any;

      const mockPortalUrl = 'https://billing.stripe.com/session/abc123';
      (StripeService.createBillingPortalSession as jest.Mock).mockResolvedValue(mockPortalUrl);

      // Act
      await subscriptionController.createBillingPortalSession(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(StripeService.createBillingPortalSession).toHaveBeenCalledWith(
        'cus_123',
        'https://example.com/settings/subscription'
      );
      expect(mockResponse.json).toHaveBeenCalledWith({ url: mockPortalUrl });
    });

    it('should return 400 if user has no Stripe customer ID', async () => {
      // Arrange
      const mockUser = {
        id: 'user_no_customer',
        stripeCustomerId: null,
      };

      mockRequest.user = mockUser as any;

      // Act
      await subscriptionController.createBillingPortalSession(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'No Stripe customer found for this user',
      });
    });
  });

  describe('getUpcomingInvoice', () => {
    it('should return upcoming invoice details', async () => {
      // Arrange
      const mockSubscription = {
        id: 'sub_db_123',
        stripeSubscriptionId: 'sub_stripe_123',
      };

      const mockInvoice = {
        id: 'in_upcoming',
        amount_due: 2900,
        currency: 'usd',
        period_start: Math.floor(Date.now() / 1000),
        period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      };

      prismaMock.subscription.findUnique.mockResolvedValue(mockSubscription as any);
      (StripeService.getUpcomingInvoice as jest.Mock).mockResolvedValue(mockInvoice);

      // Act
      await subscriptionController.getUpcomingInvoice(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(StripeService.getUpcomingInvoice).toHaveBeenCalledWith('sub_stripe_123');
      expect(mockResponse.json).toHaveBeenCalledWith(mockInvoice);
    });

    it('should return 404 if user has no subscription', async () => {
      // Arrange
      prismaMock.subscription.findUnique.mockResolvedValue(null);

      // Act
      await subscriptionController.getUpcomingInvoice(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Subscription not found',
      });
    });
  });
});
