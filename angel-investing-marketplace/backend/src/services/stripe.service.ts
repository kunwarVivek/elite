import { stripe, StripeConfig } from '../config/stripe.js';
import Stripe from 'stripe';
import { PaymentConfig } from '../config/payment.js';
import { logger } from '../config/logger.js';

export interface PaymentIntentData {
  amount: number;
  currency: string;
  investmentId: string;
  investorId: string;
  startupId: string;
  paymentMethod?: string;
}

export interface PaymentIntentResult {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
  status: string;
}

export interface RefundData {
  paymentIntentId: string;
  amount?: number; // Partial refund if specified
  reason?: string;
}

export interface RefundResult {
  refundId: string;
  amount: number;
  status: string;
  reason?: string;
}

export class StripeService {
  /**
   * Create a payment intent for investment
   */
  static async createPaymentIntent(data: PaymentIntentData): Promise<PaymentIntentResult> {
    try {
      const { amount, currency, investmentId, investorId, startupId, paymentMethod } = data;

      // Calculate total amount including fees
      const { totalAmount, platformFee } = PaymentConfig.calculateTotalAmount(amount);

      // Format amount for Stripe (convert to cents)
      const stripeAmount = StripeConfig.formatAmountForStripe(totalAmount);

      // Create payment intent metadata
      const metadata = StripeConfig.createPaymentIntentMetadata(investmentId, investorId, startupId);

      // Prepare payment intent parameters
      const paymentIntentParams: any = {
        amount: stripeAmount,
        currency: currency.toLowerCase(),
        metadata,
        automatic_payment_methods: {
          enabled: true,
        },
        description: `Investment payment for ${investmentId}`,
      };

      // Add payment method restrictions if specified
      if (paymentMethod) {
        switch (paymentMethod) {
          case 'CARD':
            paymentIntentParams.payment_method_types = ['card'];
            break;
          case 'BANK_TRANSFER':
            paymentIntentParams.payment_method_types = ['us_bank_account', 'sepa_debit'];
            break;
          case 'DIGITAL_WALLET':
            paymentIntentParams.payment_method_types = ['card']; // Will be handled by wallet providers
            break;
        }
      }

      const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

      logger.info('Payment intent created successfully', {
        paymentIntentId: paymentIntent.id,
        investmentId,
        amount: totalAmount,
        platformFee,
      });

      return {
        clientSecret: paymentIntent.client_secret!,
        paymentIntentId: paymentIntent.id,
        amount: StripeConfig.formatAmountFromStripe(paymentIntent.amount),
        currency: paymentIntent.currency,
        status: paymentIntent.status,
      };
    } catch (error) {
      logger.error('Failed to create payment intent', { error, data });
      throw new Error(`Payment intent creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Confirm a payment intent
   */
  static async confirmPayment(paymentIntentId: string): Promise<any> {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status === 'succeeded') {
        logger.info('Payment confirmed successfully', { paymentIntentId });

        return {
          success: true,
          transactionId: paymentIntent.id,
          amount: StripeConfig.formatAmountFromStripe(paymentIntent.amount_received),
          currency: paymentIntent.currency,
          status: 'completed',
          metadata: paymentIntent.metadata,
        };
      }

      return {
        success: false,
        status: paymentIntent.status,
        error: 'Payment not completed',
      };
    } catch (error) {
      logger.error('Failed to confirm payment', { error, paymentIntentId });
      throw new Error(`Payment confirmation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process a refund
   */
  static async processRefund(data: RefundData): Promise<RefundResult> {
    try {
      const { paymentIntentId, amount, reason } = data;

      // Get the payment intent to check refundable amount
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status !== 'succeeded') {
        throw new Error('Can only refund succeeded payments');
      }

      // Calculate refund amount (partial or full)
      const refundAmount = amount
        ? StripeConfig.formatAmountForStripe(amount)
        : paymentIntent.amount_received;

      // Ensure refund amount doesn't exceed original payment
      if (refundAmount > paymentIntent.amount_received!) {
        throw new Error('Refund amount cannot exceed original payment amount');
      }

      const refundParams: any = {
        payment_intent: paymentIntentId,
        amount: refundAmount,
        reason: 'requested_by_customer',
        metadata: {
          reason: reason || 'Customer requested refund',
          processed_at: new Date().toISOString(),
        },
      };

      const refund = await stripe.refunds.create(refundParams);

      logger.info('Refund processed successfully', {
        refundId: refund.id,
        paymentIntentId,
        amount: StripeConfig.formatAmountFromStripe(refund.amount),
      });

      return {
        refundId: refund.id,
        amount: StripeConfig.formatAmountFromStripe(refund.amount),
        status: refund.status || 'pending',
        reason: reason,
      };
    } catch (error) {
      logger.error('Failed to process refund', { error, data });
      throw new Error(`Refund processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create or retrieve a Stripe customer
   */
  static async getOrCreateCustomer(email: string, name: string, userId: string): Promise<string> {
    try {
      // Search for existing customer
      const existingCustomers = await stripe.customers.list({
        email: email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        return existingCustomers.data[0].id;
      }

      // Create new customer
      const customer = await stripe.customers.create({
        email,
        name,
        metadata: {
          user_id: userId,
          platform: 'angel_investing_marketplace',
        },
      });

      logger.info('Stripe customer created', { customerId: customer.id, userId });
      return customer.id;
    } catch (error) {
      logger.error('Failed to get or create Stripe customer', { error, email, userId });
      throw new Error(`Customer creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Attach payment method to customer
   */
  static async attachPaymentMethod(customerId: string, paymentMethodId: string): Promise<void> {
    try {
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

      logger.info('Payment method attached to customer', { customerId, paymentMethodId });
    } catch (error) {
      logger.error('Failed to attach payment method', { error, customerId, paymentMethodId });
      throw new Error(`Payment method attachment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get payment methods for a customer
   */
  static async getCustomerPaymentMethods(customerId: string): Promise<any[]> {
    try {
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });

      return paymentMethods.data.map(pm => ({
        id: pm.id,
        type: pm.type,
        card: pm.card ? {
          brand: pm.card.brand,
          last4: pm.card.last4,
          expMonth: pm.card.exp_month,
          expYear: pm.card.exp_year,
        } : null,
        isDefault: pm.metadata?.is_default === 'true',
      }));
    } catch (error) {
      logger.error('Failed to get customer payment methods', { error, customerId });
      throw new Error(`Failed to retrieve payment methods: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Handle webhook events
   */
  static async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
          break;
        case 'charge.dispute.created':
          await this.handleDisputeCreated(event.data.object as Stripe.Dispute);
          break;
        default:
          logger.info(`Unhandled webhook event type: ${event.type}`);
      }
    } catch (error) {
      logger.error('Failed to handle webhook event', { error, eventType: event.type });
      throw error;
    }
  }

  private static async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const investmentId = paymentIntent.metadata?.investment_id;

    if (!investmentId) {
      logger.warn('Payment succeeded but no investment ID in metadata', { paymentIntentId: paymentIntent.id });
      return;
    }

    logger.info('Payment succeeded for investment', {
      paymentIntentId: paymentIntent.id,
      investmentId,
      amount: StripeConfig.formatAmountFromStripe(paymentIntent.amount_received!),
    });

    // TODO: Update investment status and trigger escrow creation
    // This will be handled by the webhook service
  }

  private static async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const investmentId = paymentIntent.metadata?.investment_id;

    if (!investmentId) {
      logger.warn('Payment failed but no investment ID in metadata', { paymentIntentId: paymentIntent.id });
      return;
    }

    logger.warn('Payment failed for investment', {
      paymentIntentId: paymentIntent.id,
      investmentId,
      failureCode: paymentIntent.last_payment_error?.code,
    });

    // TODO: Update investment status to failed
    // This will be handled by the webhook service
  }

  private static async handleDisputeCreated(dispute: Stripe.Dispute): Promise<void> {
    logger.warn('Dispute created for charge', {
      disputeId: dispute.id,
      chargeId: dispute.charge,
      amount: StripeConfig.formatAmountFromStripe(dispute.amount),
      reason: dispute.reason,
    });

    // TODO: Handle dispute creation - notify admin, update investment status
    // This will be handled by the webhook service
  }

  // ============================================================================
  // SUBSCRIPTION METHODS
  // ============================================================================

  /**
   * Create a SetupIntent for collecting payment method (for subscriptions)
   */
  static async createSetupIntent(customerId: string): Promise<{ clientSecret: string; setupIntentId: string }> {
    try {
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        automatic_payment_methods: {
          enabled: true,
        },
        usage: 'off_session', // Allow charging without customer present
      });

      logger.info('SetupIntent created for subscription', {
        setupIntentId: setupIntent.id,
        customerId,
      });

      return {
        clientSecret: setupIntent.client_secret!,
        setupIntentId: setupIntent.id,
      };
    } catch (error) {
      logger.error('Failed to create SetupIntent', { error, customerId });
      throw new Error(`SetupIntent creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Set default payment method for a customer
   */
  static async setDefaultPaymentMethod(customerId: string, paymentMethodId: string): Promise<void> {
    try {
      // Attach payment method if not already attached
      try {
        await stripe.paymentMethods.attach(paymentMethodId, {
          customer: customerId,
        });
      } catch (error: any) {
        // If already attached, continue
        if (error.code !== 'resource_already_exists') {
          throw error;
        }
      }

      // Set as default
      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      logger.info('Default payment method set', { customerId, paymentMethodId });
    } catch (error) {
      logger.error('Failed to set default payment method', { error, customerId, paymentMethodId });
      throw new Error(`Failed to set default payment method: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a subscription
   */
  static async createSubscription(params: {
    customerId: string;
    priceId: string;
    trialPeriodDays?: number;
    metadata?: Record<string, string>;
  }): Promise<Stripe.Subscription> {
    try {
      const subscriptionParams: Stripe.SubscriptionCreateParams = {
        customer: params.customerId,
        items: [{ price: params.priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: {
          save_default_payment_method: 'on_subscription',
        },
        expand: ['latest_invoice.payment_intent', 'pending_setup_intent'],
        metadata: params.metadata || {},
      };

      // Add trial period if specified
      if (params.trialPeriodDays && params.trialPeriodDays > 0) {
        subscriptionParams.trial_period_days = params.trialPeriodDays;
      }

      const subscription = await stripe.subscriptions.create(subscriptionParams);

      logger.info('Subscription created', {
        subscriptionId: subscription.id,
        customerId: params.customerId,
        priceId: params.priceId,
        trialPeriodDays: params.trialPeriodDays,
      });

      return subscription;
    } catch (error) {
      logger.error('Failed to create subscription', { error, params });
      throw new Error(`Subscription creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update a subscription (change plan, quantity, etc.)
   */
  static async updateSubscription(
    subscriptionId: string,
    params: Stripe.SubscriptionUpdateParams
  ): Promise<Stripe.Subscription> {
    try {
      const subscription = await stripe.subscriptions.update(subscriptionId, params);

      logger.info('Subscription updated', {
        subscriptionId,
        updates: Object.keys(params),
      });

      return subscription;
    } catch (error) {
      logger.error('Failed to update subscription', { error, subscriptionId, params });
      throw new Error(`Subscription update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Cancel a subscription
   */
  static async cancelSubscription(
    subscriptionId: string,
    cancelAtPeriodEnd: boolean = true
  ): Promise<Stripe.Subscription> {
    try {
      let subscription: Stripe.Subscription;

      if (cancelAtPeriodEnd) {
        // Cancel at period end (user retains access until end of billing period)
        subscription = await stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
        });
      } else {
        // Cancel immediately
        subscription = await stripe.subscriptions.cancel(subscriptionId);
      }

      logger.info('Subscription canceled', {
        subscriptionId,
        cancelAtPeriodEnd,
        status: subscription.status,
      });

      return subscription;
    } catch (error) {
      logger.error('Failed to cancel subscription', { error, subscriptionId, cancelAtPeriodEnd });
      throw new Error(`Subscription cancellation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Reactivate a canceled subscription
   */
  static async reactivateSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
      });

      logger.info('Subscription reactivated', { subscriptionId });

      return subscription;
    } catch (error) {
      logger.error('Failed to reactivate subscription', { error, subscriptionId });
      throw new Error(`Subscription reactivation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get subscription details
   */
  static async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      return await stripe.subscriptions.retrieve(subscriptionId);
    } catch (error) {
      logger.error('Failed to retrieve subscription', { error, subscriptionId });
      throw new Error(`Subscription retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get upcoming invoice for a subscription
   */
  static async getUpcomingInvoice(subscriptionId: string): Promise<Stripe.Invoice> {
    try {
      return await stripe.invoices.retrieveUpcoming({
        subscription: subscriptionId,
      });
    } catch (error) {
      logger.error('Failed to retrieve upcoming invoice', { error, subscriptionId });
      throw new Error(`Invoice retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a billing portal session for customer self-service
   */
  static async createBillingPortalSession(
    customerId: string,
    returnUrl: string
  ): Promise<Stripe.BillingPortal.Session> {
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });

      logger.info('Billing portal session created', { customerId, sessionId: session.id });

      return session;
    } catch (error) {
      logger.error('Failed to create billing portal session', { error, customerId });
      throw new Error(`Billing portal creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List all subscriptions for a customer
   */
  static async listCustomerSubscriptions(customerId: string): Promise<Stripe.Subscription[]> {
    try {
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: 'all',
      });

      return subscriptions.data;
    } catch (error) {
      logger.error('Failed to list customer subscriptions', { error, customerId });
      throw new Error(`Subscription list failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Map Stripe subscription status to application status
   */
  static mapStripeStatusToAppStatus(stripeStatus: Stripe.Subscription.Status): string {
    const statusMap: Record<Stripe.Subscription.Status, string> = {
      active: 'ACTIVE',
      trialing: 'TRIALING',
      past_due: 'PAST_DUE',
      canceled: 'CANCELED',
      unpaid: 'UNPAID',
      incomplete: 'PAST_DUE',
      incomplete_expired: 'CANCELED',
      paused: 'CANCELED',
    };

    return statusMap[stripeStatus] || 'ACTIVE';
  }

  /**
   * Create or update a product in Stripe
   */
  static async createOrUpdateProduct(params: {
    name: string;
    description?: string;
    metadata?: Record<string, string>;
    productId?: string;
  }): Promise<Stripe.Product> {
    try {
      if (params.productId) {
        // Update existing product
        return await stripe.products.update(params.productId, {
          name: params.name,
          description: params.description,
          metadata: params.metadata,
        });
      } else {
        // Create new product
        return await stripe.products.create({
          name: params.name,
          description: params.description,
          metadata: params.metadata,
        });
      }
    } catch (error) {
      logger.error('Failed to create/update product', { error, params });
      throw new Error(`Product operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a price for a product
   */
  static async createPrice(params: {
    productId: string;
    unitAmount: number; // in cents
    currency: string;
    interval: 'month' | 'year';
    metadata?: Record<string, string>;
  }): Promise<Stripe.Price> {
    try {
      return await stripe.prices.create({
        product: params.productId,
        unit_amount: params.unitAmount,
        currency: params.currency,
        recurring: {
          interval: params.interval,
        },
        metadata: params.metadata,
      });
    } catch (error) {
      logger.error('Failed to create price', { error, params });
      throw new Error(`Price creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Detach a payment method from a customer
   */
  static async detachPaymentMethod(paymentMethodId: string): Promise<Stripe.PaymentMethod> {
    try {
      const paymentMethod = await stripe.paymentMethods.detach(paymentMethodId);

      logger.info('Payment method detached', { paymentMethodId });

      return paymentMethod;
    } catch (error) {
      logger.error('Failed to detach payment method', { error, paymentMethodId });
      throw new Error(`Payment method detach failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export default StripeService;