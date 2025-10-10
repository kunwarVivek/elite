import Stripe from 'stripe';
import { env } from './environment.js';

// Initialize Stripe with API version
export const stripe = new Stripe(env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
  typescript: true,
});

// Stripe configuration constants
export const STRIPE_CONFIG = {
  // Currency settings
  DEFAULT_CURRENCY: 'USD',
  SUPPORTED_CURRENCIES: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'],

  // Payment method types
  PAYMENT_METHODS: {
    CARD: 'card',
    BANK_ACCOUNT: 'bank_account',
    APPLE_PAY: 'apple_pay',
    GOOGLE_PAY: 'google_pay',
    SEPA_DEBIT: 'sepa_debit',
  },

  // Webhook events to listen for
  WEBHOOK_EVENTS: [
    'payment_intent.succeeded',
    'payment_intent.payment_failed',
    'payment_intent.canceled',
    'charge.dispute.created',
    'charge.dispute.funds_withdrawn',
    'charge.dispute.funds_reinstated',
    'customer.created',
    'customer.updated',
    'invoice.payment_succeeded',
    'invoice.payment_failed',
  ],

  // Fee structure (in cents)
  APPLICATION_FEE_PERCENTAGE: 0.029, // 2.9%
  APPLICATION_FEE_FIXED: 30, // $0.30

  // Platform settings
  PLATFORM_ACCOUNT_ID: env.STRIPE_SECRET_KEY?.startsWith('sk_test_') ? 'acct_test' : 'acct_live',
} as const;

// Helper functions for Stripe operations
export class StripeConfig {
  /**
   * Calculate application fee for a given amount
   */
  static calculateApplicationFee(amount: number): number {
    return Math.round((amount * STRIPE_CONFIG.APPLICATION_FEE_PERCENTAGE) + STRIPE_CONFIG.APPLICATION_FEE_FIXED);
  }

  /**
   * Format amount for Stripe (convert dollars to cents)
   */
  static formatAmountForStripe(amount: number): number {
    return Math.round(amount * 100);
  }

  /**
   * Format amount from Stripe (convert cents to dollars)
   */
  static formatAmountFromStripe(stripeAmount: number): number {
    return stripeAmount / 100;
  }

  /**
   * Validate webhook signature
   */
  static validateWebhookSignature(payload: string | Buffer, signature: string, secret: string): Stripe.Event {
    return stripe.webhooks.constructEvent(payload, signature, secret);
  }

  /**
   * Create payment intent metadata for investment tracking
   */
  static createPaymentIntentMetadata(investmentId: string, investorId: string, startupId: string) {
    return {
      investment_id: investmentId,
      investor_id: investorId,
      startup_id: startupId,
      platform: 'angel_investing_marketplace',
      created_at: new Date().toISOString(),
    };
  }

  /**
   * Get idempotency key for payment operations
   */
  static getIdempotencyKey(operation: string, id: string): string {
    return `${operation}_${id}_${Date.now()}`;
  }
}

export default stripe;