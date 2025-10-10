import { StripeConfig } from '../config/stripe.js';
import { logger } from '../config/logger.js';
import Stripe from 'stripe';

export interface WebhookEventData {
  eventType: string;
  eventId: string;
  data: any;
  created: number;
}

export interface PaymentSucceededData {
  paymentIntentId: string;
  investmentId: string;
  amount: number;
  currency: string;
  investorId: string;
  startupId: string;
}

export interface PaymentFailedData {
  paymentIntentId: string;
  investmentId: string;
  failureCode?: string;
  failureMessage?: string;
}

export interface DisputeCreatedData {
  disputeId: string;
  chargeId: string;
  amount: number;
  currency: string;
  reason: string;
  investmentId?: string;
}

export class WebhookService {
  /**
   * Process incoming Stripe webhook
   */
  static async processWebhook(
    payload: string | Buffer,
    signature: string,
    secret: string
  ): Promise<WebhookEventData> {
    try {
      // Verify webhook signature
      const event = StripeConfig.validateWebhookSignature(payload, signature, secret);

      logger.info('Webhook received and verified', {
        eventType: event.type,
        eventId: event.id,
        created: event.created,
      });

      // Process the event
      await this.handleEvent(event);

      return {
        eventType: event.type,
        eventId: event.id,
        data: event.data,
        created: event.created,
      };
    } catch (error) {
      logger.error('Webhook processing failed', { error, signature: signature.substring(0, 10) + '...' });
      throw new Error(`Webhook processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Handle different types of Stripe events
   */
  private static async handleEvent(event: Stripe.Event): Promise<void> {
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
          break;
        case 'payment_intent.canceled':
          await this.handlePaymentCanceled(event.data.object as Stripe.PaymentIntent);
          break;
        case 'charge.dispute.created':
          await this.handleDisputeCreated(event.data.object as Stripe.Dispute);
          break;
        case 'charge.dispute.funds_withdrawn':
          await this.handleDisputeFundsWithdrawn(event.data.object as Stripe.Dispute);
          break;
        case 'charge.dispute.funds_reinstated':
          await this.handleDisputeFundsReinstated(event.data.object as Stripe.Dispute);
          break;
        case 'customer.created':
          await this.handleCustomerCreated(event.data.object as Stripe.Customer);
          break;
        case 'customer.updated':
          await this.handleCustomerUpdated(event.data.object as Stripe.Customer);
          break;
        case 'invoice.payment_succeeded':
          await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;
        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
          break;
        default:
          logger.info(`Unhandled webhook event type: ${event.type}`);
      }
    } catch (error) {
      logger.error('Event handling failed', { error, eventType: event.type, eventId: event.id });
      throw error;
    }
  }

  /**
   * Handle successful payment
   */
  private static async handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const data: PaymentSucceededData = {
      paymentIntentId: paymentIntent.id,
      investmentId: paymentIntent.metadata?.investment_id || '',
      amount: paymentIntent.amount_received ? paymentIntent.amount_received / 100 : 0,
      currency: paymentIntent.currency,
      investorId: paymentIntent.metadata?.investor_id || '',
      startupId: paymentIntent.metadata?.startup_id || '',
    };

    logger.info('Payment succeeded', data);

    // TODO: Update investment status to PAID
    // TODO: Create escrow account
    // TODO: Send confirmation notifications
    // TODO: Update startup funding progress

    await this.updateInvestmentStatus(data.investmentId, 'PAID');
    await this.createEscrowAccount(data);
    await this.sendPaymentNotifications(data);
  }

  /**
   * Handle failed payment
   */
  private static async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const data: PaymentFailedData = {
      paymentIntentId: paymentIntent.id,
      investmentId: paymentIntent.metadata?.investment_id || '',
      failureCode: paymentIntent.last_payment_error?.code || undefined,
      failureMessage: paymentIntent.last_payment_error?.message || undefined,
    };

    logger.warn('Payment failed', data);

    // TODO: Update investment status to FAILED
    // TODO: Send failure notifications
    // TODO: Log failure for analytics

    await this.updateInvestmentStatus(data.investmentId, 'FAILED');
    await this.sendFailureNotifications(data);
  }

  /**
   * Handle canceled payment
   */
  private static async handlePaymentCanceled(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const investmentId = paymentIntent.metadata?.investment_id;

    if (!investmentId) {
      logger.warn('Payment canceled but no investment ID in metadata', { paymentIntentId: paymentIntent.id });
      return;
    }

    logger.info('Payment canceled', { paymentIntentId: paymentIntent.id, investmentId });

    // TODO: Update investment status to CANCELLED
    // TODO: Clean up any pending operations

    await this.updateInvestmentStatus(investmentId, 'CANCELLED');
  }

  /**
   * Handle dispute creation
   */
  private static async handleDisputeCreated(dispute: Stripe.Dispute): Promise<void> {
    const data: DisputeCreatedData = {
      disputeId: dispute.id,
      chargeId: typeof dispute.charge === 'string' ? dispute.charge : (dispute.charge?.id || ''),
      amount: dispute.amount ? dispute.amount / 100 : 0,
      currency: dispute.currency,
      reason: dispute.reason || '',
      investmentId: dispute.metadata?.investment_id || undefined,
    };

    logger.warn('Dispute created', data);

    // TODO: Update investment status to DISPUTED
    // TODO: Notify admin and relevant parties
    // TODO: Create dispute record in database
    // TODO: Hold funds pending resolution

    if (data.investmentId) {
      await this.updateInvestmentStatus(data.investmentId, 'DISPUTED');
    }
    await this.createDisputeRecord(data);
    await this.sendDisputeNotifications(data);
  }

  /**
   * Handle dispute funds withdrawn
   */
  private static async handleDisputeFundsWithdrawn(dispute: Stripe.Dispute): Promise<void> {
    logger.warn('Dispute funds withdrawn', {
      disputeId: dispute.id,
      amount: dispute.amount ? dispute.amount / 100 : 0,
    });

    // TODO: Update dispute status
    // TODO: Notify relevant parties
    // TODO: Update financial records

    await this.updateDisputeStatus(dispute.id, 'FUNDS_WITHDRAWN');
  }

  /**
   * Handle dispute funds reinstated
   */
  private static async handleDisputeFundsReinstated(dispute: Stripe.Dispute): Promise<void> {
    logger.info('Dispute funds reinstated', {
      disputeId: dispute.id,
      amount: dispute.amount ? dispute.amount / 100 : 0,
    });

    // TODO: Update dispute status
    // TODO: Notify relevant parties
    // TODO: Release held funds

    await this.updateDisputeStatus(dispute.id, 'FUNDS_REINSTATED');
  }

  /**
   * Handle customer creation
   */
  private static async handleCustomerCreated(customer: Stripe.Customer): Promise<void> {
    logger.info('Stripe customer created', {
      customerId: customer.id,
      email: customer.email,
    });

    // TODO: Update user record with Stripe customer ID
    // TODO: Send welcome notifications if needed

    if (customer.metadata?.user_id) {
      await this.updateUserStripeCustomerId(customer.metadata.user_id, customer.id);
    }
  }

  /**
   * Handle customer updates
   */
  private static async handleCustomerUpdated(customer: Stripe.Customer): Promise<void> {
    logger.info('Stripe customer updated', {
      customerId: customer.id,
      email: customer.email,
    });

    // TODO: Update user record if needed
    // TODO: Handle subscription changes if applicable
  }

  /**
   * Handle invoice payment succeeded
   */
  private static async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    logger.info('Invoice payment succeeded', {
      invoiceId: invoice.id,
      amount: invoice.amount_paid ? invoice.amount_paid / 100 : 0,
      customerId: invoice.customer,
    });

    // TODO: Handle subscription payments
    // TODO: Update billing records
  }

  /**
   * Handle invoice payment failed
   */
  private static async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    logger.warn('Invoice payment failed', {
      invoiceId: invoice.id,
      customerId: invoice.customer,
    });

    // TODO: Handle subscription payment failures
    // TODO: Notify customer
    // TODO: Update billing status
  }

  // TODO: Implement these database update methods
  private static async updateInvestmentStatus(investmentId: string, status: string): Promise<void> {
    logger.info('Updating investment status', { investmentId, status });
    // Implementation would update the investment record in database
  }

  private static async createEscrowAccount(data: PaymentSucceededData): Promise<void> {
    logger.info('Creating escrow account', { investmentId: data.investmentId });
    // Implementation would create escrow record and hold funds
  }

  private static async sendPaymentNotifications(data: PaymentSucceededData): Promise<void> {
    logger.info('Sending payment notifications', { investmentId: data.investmentId });
    // Implementation would send notifications to investor and startup
  }

  private static async sendFailureNotifications(data: PaymentFailedData): Promise<void> {
    logger.info('Sending failure notifications', { investmentId: data.investmentId });
    // Implementation would send failure notifications to investor
  }

  private static async createDisputeRecord(data: DisputeCreatedData): Promise<void> {
    logger.info('Creating dispute record', { disputeId: data.disputeId });
    // Implementation would create dispute record in database
  }

  private static async sendDisputeNotifications(data: DisputeCreatedData): Promise<void> {
    logger.info('Sending dispute notifications', { disputeId: data.disputeId });
    // Implementation would send notifications to admin and relevant parties
  }

  private static async updateDisputeStatus(disputeId: string, status: string): Promise<void> {
    logger.info('Updating dispute status', { disputeId, status });
    // Implementation would update dispute status in database
  }

  private static async updateUserStripeCustomerId(userId: string, customerId: string): Promise<void> {
    logger.info('Updating user Stripe customer ID', { userId, customerId });
    // Implementation would update user record with Stripe customer ID
  }
}

export default WebhookService;