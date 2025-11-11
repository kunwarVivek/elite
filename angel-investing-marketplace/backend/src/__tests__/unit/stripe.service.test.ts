/**
 * Stripe Service Tests
 *
 * Tests for subscription and payment processing functionality
 * Uses mocked Stripe client to avoid real API calls
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { StripeService } from '../../services/stripe.service';
import Stripe from 'stripe';

// Mock the stripe client
jest.mock('../../config/stripe.js', () => ({
  stripe: {
    setupIntents: {
      create: jest.fn(),
    },
    paymentMethods: {
      attach: jest.fn(),
      list: jest.fn(),
      detach: jest.fn(),
    },
    customers: {
      create: jest.fn(),
      retrieve: jest.fn(),
      update: jest.fn(),
      list: jest.fn(),
    },
    subscriptions: {
      create: jest.fn(),
      retrieve: jest.fn(),
      update: jest.fn(),
      cancel: jest.fn(),
      list: jest.fn(),
    },
    invoices: {
      retrieveUpcoming: jest.fn(),
    },
    billingPortal: {
      sessions: {
        create: jest.fn(),
      },
    },
    products: {
      create: jest.fn(),
      update: jest.fn(),
    },
    prices: {
      create: jest.fn(),
    },
  },
  StripeConfig: {
    formatAmountForStripe: (amount: number) => Math.round(amount * 100),
    formatAmountFromStripe: (amount: number) => amount / 100,
    createPaymentIntentMetadata: (investmentId: string, investorId: string, startupId: string) => ({
      investmentId,
      investorId,
      startupId,
    }),
  },
}));

// Import stripe after mocking
import { stripe } from '../../config/stripe.js';

describe('StripeService - Subscription Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createSetupIntent', () => {
    it('should create a setup intent for payment method collection', async () => {
      // Arrange
      const customerId = 'cus_123';
      const mockSetupIntent = {
        id: 'seti_123',
        client_secret: 'seti_123_secret_abc',
        customer: customerId,
        status: 'requires_payment_method',
      };

      (stripe.setupIntents.create as jest.Mock).mockResolvedValue(mockSetupIntent);

      // Act
      const result = await StripeService.createSetupIntent(customerId);

      // Assert
      expect(stripe.setupIntents.create).toHaveBeenCalledWith({
        customer: customerId,
        payment_method_types: ['card'],
        usage: 'off_session',
      });
      expect(result).toEqual({
        clientSecret: mockSetupIntent.client_secret,
        setupIntentId: mockSetupIntent.id,
      });
    });

    it('should handle errors when creating setup intent', async () => {
      // Arrange
      const customerId = 'cus_123';
      (stripe.setupIntents.create as jest.Mock).mockRejectedValue(new Error('Stripe API error'));

      // Act & Assert
      await expect(StripeService.createSetupIntent(customerId)).rejects.toThrow('Failed to create setup intent');
    });
  });

  describe('getOrCreateCustomer', () => {
    it('should create a new customer if none exists', async () => {
      // Arrange
      const email = 'test@example.com';
      const name = 'Test User';
      const userId = 'user_123';
      const mockCustomer = {
        id: 'cus_new123',
        email,
        name,
      };

      (stripe.customers.list as jest.Mock).mockResolvedValue({ data: [] });
      (stripe.customers.create as jest.Mock).mockResolvedValue(mockCustomer);

      // Act
      const result = await StripeService.getOrCreateCustomer(email, name, userId);

      // Assert
      expect(stripe.customers.list).toHaveBeenCalledWith({ email, limit: 1 });
      expect(stripe.customers.create).toHaveBeenCalledWith({
        email,
        name,
        metadata: { userId },
      });
      expect(result).toBe(mockCustomer.id);
    });

    it('should return existing customer if found', async () => {
      // Arrange
      const email = 'existing@example.com';
      const name = 'Existing User';
      const userId = 'user_456';
      const mockCustomer = {
        id: 'cus_existing456',
        email,
        name,
      };

      (stripe.customers.list as jest.Mock).mockResolvedValue({ data: [mockCustomer] });

      // Act
      const result = await StripeService.getOrCreateCustomer(email, name, userId);

      // Assert
      expect(stripe.customers.list).toHaveBeenCalledWith({ email, limit: 1 });
      expect(stripe.customers.create).not.toHaveBeenCalled();
      expect(result).toBe(mockCustomer.id);
    });
  });

  describe('createSubscription', () => {
    it('should create a subscription with trial period', async () => {
      // Arrange
      const params = {
        customerId: 'cus_123',
        priceId: 'price_pro_monthly',
        paymentMethodId: 'pm_123',
        trialDays: 14,
      };

      const mockSubscription = {
        id: 'sub_123',
        customer: params.customerId,
        status: 'trialing',
        items: {
          data: [
            {
              price: {
                id: params.priceId,
                unit_amount: 2900,
                currency: 'usd',
              },
            },
          ],
        },
        trial_end: Math.floor(Date.now() / 1000) + 14 * 24 * 60 * 60,
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      };

      (stripe.paymentMethods.attach as jest.Mock).mockResolvedValue({});
      (stripe.customers.update as jest.Mock).mockResolvedValue({});
      (stripe.subscriptions.create as jest.Mock).mockResolvedValue(mockSubscription);

      // Act
      const result = await StripeService.createSubscription(params);

      // Assert
      expect(stripe.paymentMethods.attach).toHaveBeenCalledWith(params.paymentMethodId, {
        customer: params.customerId,
      });
      expect(stripe.customers.update).toHaveBeenCalledWith(params.customerId, {
        invoice_settings: {
          default_payment_method: params.paymentMethodId,
        },
      });
      expect(stripe.subscriptions.create).toHaveBeenCalledWith({
        customer: params.customerId,
        items: [{ price: params.priceId }],
        trial_period_days: params.trialDays,
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
      });
      expect(result.id).toBe(mockSubscription.id);
      expect(result.status).toBe('trialing');
    });

    it('should create a subscription without trial period', async () => {
      // Arrange
      const params = {
        customerId: 'cus_123',
        priceId: 'price_growth_annual',
        paymentMethodId: 'pm_456',
      };

      const mockSubscription = {
        id: 'sub_456',
        customer: params.customerId,
        status: 'active',
        items: {
          data: [
            {
              price: {
                id: params.priceId,
                unit_amount: 99000,
                currency: 'usd',
              },
            },
          ],
        },
        current_period_end: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
      };

      (stripe.paymentMethods.attach as jest.Mock).mockResolvedValue({});
      (stripe.customers.update as jest.Mock).mockResolvedValue({});
      (stripe.subscriptions.create as jest.Mock).mockResolvedValue(mockSubscription);

      // Act
      const result = await StripeService.createSubscription(params);

      // Assert
      expect(stripe.subscriptions.create).toHaveBeenCalledWith({
        customer: params.customerId,
        items: [{ price: params.priceId }],
        trial_period_days: undefined,
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
      });
      expect(result.id).toBe(mockSubscription.id);
      expect(result.status).toBe('active');
    });

    it('should handle subscription creation errors', async () => {
      // Arrange
      const params = {
        customerId: 'cus_123',
        priceId: 'price_invalid',
        paymentMethodId: 'pm_123',
      };

      (stripe.paymentMethods.attach as jest.Mock).mockResolvedValue({});
      (stripe.customers.update as jest.Mock).mockResolvedValue({});
      (stripe.subscriptions.create as jest.Mock).mockRejectedValue(new Error('Invalid price'));

      // Act & Assert
      await expect(StripeService.createSubscription(params)).rejects.toThrow('Failed to create subscription');
    });
  });

  describe('updateSubscription', () => {
    it('should update subscription to a new price', async () => {
      // Arrange
      const subscriptionId = 'sub_123';
      const newPriceId = 'price_growth_monthly';
      const subscriptionItemId = 'si_123';

      const mockSubscription = {
        id: subscriptionId,
        items: {
          data: [
            {
              id: subscriptionItemId,
              price: { id: 'price_pro_monthly' },
            },
          ],
        },
        status: 'active',
      };

      const mockUpdatedSubscription = {
        ...mockSubscription,
        items: {
          data: [
            {
              id: subscriptionItemId,
              price: { id: newPriceId },
            },
          ],
        },
      };

      (stripe.subscriptions.retrieve as jest.Mock).mockResolvedValue(mockSubscription);
      (stripe.subscriptions.update as jest.Mock).mockResolvedValue(mockUpdatedSubscription);

      // Act
      const result = await StripeService.updateSubscription(subscriptionId, { priceId: newPriceId });

      // Assert
      expect(stripe.subscriptions.retrieve).toHaveBeenCalledWith(subscriptionId);
      expect(stripe.subscriptions.update).toHaveBeenCalledWith(subscriptionId, {
        items: [
          {
            id: subscriptionItemId,
            price: newPriceId,
          },
        ],
        proration_behavior: 'create_prorations',
      });
      expect(result.id).toBe(subscriptionId);
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel subscription at period end', async () => {
      // Arrange
      const subscriptionId = 'sub_123';
      const mockSubscription = {
        id: subscriptionId,
        status: 'active',
        cancel_at_period_end: true,
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      };

      (stripe.subscriptions.update as jest.Mock).mockResolvedValue(mockSubscription);

      // Act
      const result = await StripeService.cancelSubscription(subscriptionId, true);

      // Assert
      expect(stripe.subscriptions.update).toHaveBeenCalledWith(subscriptionId, {
        cancel_at_period_end: true,
      });
      expect(result.cancel_at_period_end).toBe(true);
      expect(result.status).toBe('active');
    });

    it('should cancel subscription immediately', async () => {
      // Arrange
      const subscriptionId = 'sub_456';
      const mockSubscription = {
        id: subscriptionId,
        status: 'canceled',
        canceled_at: Math.floor(Date.now() / 1000),
      };

      (stripe.subscriptions.cancel as jest.Mock).mockResolvedValue(mockSubscription);

      // Act
      const result = await StripeService.cancelSubscription(subscriptionId, false);

      // Assert
      expect(stripe.subscriptions.cancel).toHaveBeenCalledWith(subscriptionId);
      expect(result.status).toBe('canceled');
    });

    it('should handle cancellation errors', async () => {
      // Arrange
      const subscriptionId = 'sub_invalid';
      (stripe.subscriptions.update as jest.Mock).mockRejectedValue(new Error('Subscription not found'));

      // Act & Assert
      await expect(StripeService.cancelSubscription(subscriptionId, true)).rejects.toThrow(
        'Failed to cancel subscription'
      );
    });
  });

  describe('reactivateSubscription', () => {
    it('should reactivate a canceled subscription', async () => {
      // Arrange
      const subscriptionId = 'sub_123';
      const mockSubscription = {
        id: subscriptionId,
        status: 'active',
        cancel_at_period_end: false,
      };

      (stripe.subscriptions.update as jest.Mock).mockResolvedValue(mockSubscription);

      // Act
      const result = await StripeService.reactivateSubscription(subscriptionId);

      // Assert
      expect(stripe.subscriptions.update).toHaveBeenCalledWith(subscriptionId, {
        cancel_at_period_end: false,
      });
      expect(result.cancel_at_period_end).toBe(false);
      expect(result.status).toBe('active');
    });

    it('should handle reactivation errors', async () => {
      // Arrange
      const subscriptionId = 'sub_invalid';
      (stripe.subscriptions.update as jest.Mock).mockRejectedValue(new Error('Cannot reactivate'));

      // Act & Assert
      await expect(StripeService.reactivateSubscription(subscriptionId)).rejects.toThrow(
        'Failed to reactivate subscription'
      );
    });
  });

  describe('getUpcomingInvoice', () => {
    it('should retrieve upcoming invoice for a subscription', async () => {
      // Arrange
      const subscriptionId = 'sub_123';
      const mockInvoice = {
        id: 'in_upcoming',
        subscription: subscriptionId,
        amount_due: 2900,
        currency: 'usd',
        period_start: Math.floor(Date.now() / 1000),
        period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      };

      (stripe.invoices.retrieveUpcoming as jest.Mock).mockResolvedValue(mockInvoice);

      // Act
      const result = await StripeService.getUpcomingInvoice(subscriptionId);

      // Assert
      expect(stripe.invoices.retrieveUpcoming).toHaveBeenCalledWith({
        subscription: subscriptionId,
      });
      expect(result.amount_due).toBe(2900);
    });

    it('should handle errors when retrieving upcoming invoice', async () => {
      // Arrange
      const subscriptionId = 'sub_invalid';
      (stripe.invoices.retrieveUpcoming as jest.Mock).mockRejectedValue(new Error('No upcoming invoice'));

      // Act & Assert
      await expect(StripeService.getUpcomingInvoice(subscriptionId)).rejects.toThrow(
        'Failed to retrieve upcoming invoice'
      );
    });
  });

  describe('createBillingPortalSession', () => {
    it('should create a billing portal session', async () => {
      // Arrange
      const customerId = 'cus_123';
      const returnUrl = 'https://example.com/settings/subscription';
      const mockSession = {
        id: 'bps_123',
        url: 'https://billing.stripe.com/session/abc123',
        customer: customerId,
      };

      (stripe.billingPortal.sessions.create as jest.Mock).mockResolvedValue(mockSession);

      // Act
      const result = await StripeService.createBillingPortalSession(customerId, returnUrl);

      // Assert
      expect(stripe.billingPortal.sessions.create).toHaveBeenCalledWith({
        customer: customerId,
        return_url: returnUrl,
      });
      expect(result).toBe(mockSession.url);
    });

    it('should handle errors when creating billing portal session', async () => {
      // Arrange
      const customerId = 'cus_invalid';
      const returnUrl = 'https://example.com/settings';
      (stripe.billingPortal.sessions.create as jest.Mock).mockRejectedValue(new Error('Customer not found'));

      // Act & Assert
      await expect(StripeService.createBillingPortalSession(customerId, returnUrl)).rejects.toThrow(
        'Failed to create billing portal session'
      );
    });
  });

  describe('getCustomerPaymentMethods', () => {
    it('should retrieve all payment methods for a customer', async () => {
      // Arrange
      const customerId = 'cus_123';
      const mockPaymentMethods = [
        {
          id: 'pm_123',
          type: 'card',
          card: {
            brand: 'visa',
            last4: '4242',
            exp_month: 12,
            exp_year: 2025,
          },
        },
        {
          id: 'pm_456',
          type: 'card',
          card: {
            brand: 'mastercard',
            last4: '5555',
            exp_month: 6,
            exp_year: 2026,
          },
        },
      ];

      (stripe.paymentMethods.list as jest.Mock).mockResolvedValue({ data: mockPaymentMethods });

      // Act
      const result = await StripeService.getCustomerPaymentMethods(customerId);

      // Assert
      expect(stripe.paymentMethods.list).toHaveBeenCalledWith({
        customer: customerId,
        type: 'card',
      });
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('pm_123');
      expect(result[1].card.last4).toBe('5555');
    });

    it('should return empty array if customer has no payment methods', async () => {
      // Arrange
      const customerId = 'cus_no_pm';
      (stripe.paymentMethods.list as jest.Mock).mockResolvedValue({ data: [] });

      // Act
      const result = await StripeService.getCustomerPaymentMethods(customerId);

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  describe('attachPaymentMethod', () => {
    it('should attach a payment method to a customer', async () => {
      // Arrange
      const customerId = 'cus_123';
      const paymentMethodId = 'pm_new789';
      const mockPaymentMethod = {
        id: paymentMethodId,
        customer: customerId,
      };

      (stripe.paymentMethods.attach as jest.Mock).mockResolvedValue(mockPaymentMethod);

      // Act
      await StripeService.attachPaymentMethod(customerId, paymentMethodId);

      // Assert
      expect(stripe.paymentMethods.attach).toHaveBeenCalledWith(paymentMethodId, {
        customer: customerId,
      });
    });

    it('should handle errors when attaching payment method', async () => {
      // Arrange
      const customerId = 'cus_123';
      const paymentMethodId = 'pm_invalid';
      (stripe.paymentMethods.attach as jest.Mock).mockRejectedValue(new Error('Payment method already attached'));

      // Act & Assert
      await expect(StripeService.attachPaymentMethod(customerId, paymentMethodId)).rejects.toThrow(
        'Failed to attach payment method'
      );
    });
  });

  describe('detachPaymentMethod', () => {
    it('should detach a payment method', async () => {
      // Arrange
      const paymentMethodId = 'pm_123';
      const mockPaymentMethod = {
        id: paymentMethodId,
        customer: null,
      };

      (stripe.paymentMethods.detach as jest.Mock).mockResolvedValue(mockPaymentMethod);

      // Act
      const result = await StripeService.detachPaymentMethod(paymentMethodId);

      // Assert
      expect(stripe.paymentMethods.detach).toHaveBeenCalledWith(paymentMethodId);
      expect(result.customer).toBeNull();
    });

    it('should handle errors when detaching payment method', async () => {
      // Arrange
      const paymentMethodId = 'pm_invalid';
      (stripe.paymentMethods.detach as jest.Mock).mockRejectedValue(new Error('Payment method not found'));

      // Act & Assert
      await expect(StripeService.detachPaymentMethod(paymentMethodId)).rejects.toThrow(
        'Failed to detach payment method'
      );
    });
  });
});
