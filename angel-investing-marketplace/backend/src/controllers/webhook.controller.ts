import { Request, Response } from 'express';
import Stripe from 'stripe';
import { stripe } from '../config/stripe.js';
import StripeService from '../services/stripe.service.js';
import { logger } from '../config/logger.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Webhook Controller
 * Handles Stripe webhook events for subscription lifecycle
 *
 * Key events handled:
 * - customer.subscription.created
 * - customer.subscription.updated
 * - customer.subscription.deleted
 * - invoice.paid
 * - invoice.payment_failed
 * - payment_method.attached
 * - payment_method.detached
 */

export class WebhookController {
  /**
   * Handle Stripe webhooks
   * This endpoint receives events from Stripe
   */
  async handleStripeWebhook(req: Request, res: Response): Promise<void> {
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      logger.error('Missing stripe-signature header');
      res.status(400).json({ error: 'Missing stripe-signature header' });
      return;
    }

    let event: Stripe.Event;

    try {
      // Construct event from webhook secret
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!webhookSecret) {
        logger.error('STRIPE_WEBHOOK_SECRET is not configured');
        res.status(500).json({ error: 'Webhook secret not configured' });
        return;
      }

      event = stripe.webhooks.constructEvent(
        req.body, // raw body (must be buffer)
        signature,
        webhookSecret
      );
    } catch (error: any) {
      logger.error('Webhook signature verification failed', {
        error: error.message,
      });
      res.status(400).json({ error: `Webhook Error: ${error.message}` });
      return;
    }

    logger.info('Webhook event received', {
      type: event.type,
      id: event.id,
    });

    // Handle the event
    try {
      switch (event.type) {
        // Subscription events
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.trial_will_end':
          await this.handleTrialWillEnd(event.data.object as Stripe.Subscription);
          break;

        // Invoice events
        case 'invoice.paid':
          await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.upcoming':
          await this.handleInvoiceUpcoming(event.data.object as Stripe.Invoice);
          break;

        // Payment method events
        case 'payment_method.attached':
          await this.handlePaymentMethodAttached(event.data.object as Stripe.PaymentMethod);
          break;

        case 'payment_method.detached':
          await this.handlePaymentMethodDetached(event.data.object as Stripe.PaymentMethod);
          break;

        // Customer events
        case 'customer.updated':
          await this.handleCustomerUpdated(event.data.object as Stripe.Customer);
          break;

        default:
          logger.info(`Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      logger.error('Error handling webhook event', {
        error,
        eventType: event.type,
        eventId: event.id,
      });
      res.status(500).json({ error: 'Webhook handler failed' });
    }
  }

  /**
   * Handle subscription created event
   */
  private async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
    logger.info('Handling subscription created', { subscriptionId: subscription.id });

    try {
      // Find user by Stripe customer ID
      const user = await prisma.user.findFirst({
        where: { stripeCustomerId: subscription.customer as string },
      });

      if (!user) {
        logger.warn('User not found for subscription', {
          customerId: subscription.customer,
          subscriptionId: subscription.id,
        });
        return;
      }

      // Find subscription plan by Stripe price ID
      const priceId = subscription.items.data[0]?.price.id;
      const plan = await prisma.subscriptionPlan.findFirst({
        where: { stripePriceId: priceId },
      });

      if (!plan) {
        logger.warn('Subscription plan not found', {
          priceId,
          subscriptionId: subscription.id,
        });
        return;
      }

      // Calculate billing period dates
      const currentPeriodStart = new Date(subscription.current_period_start * 1000);
      const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
      const trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null;

      // Create or update subscription in database
      await prisma.subscription.upsert({
        where: {
          stripeSubscriptionId: subscription.id,
        },
        create: {
          userId: user.id,
          planId: plan.id,
          stripeSubscriptionId: subscription.id,
          stripeCustomerId: subscription.customer as string,
          stripePriceId: priceId!,
          status: StripeService.mapStripeStatusToAppStatus(subscription.status),
          currentPeriodStart,
          currentPeriodEnd,
          trialStart: subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
          trialEnd,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        },
        update: {
          planId: plan.id,
          stripePriceId: priceId!,
          status: StripeService.mapStripeStatusToAppStatus(subscription.status),
          currentPeriodStart,
          currentPeriodEnd,
          trialEnd,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        },
      });

      logger.info('Subscription created in database', {
        userId: user.id,
        subscriptionId: subscription.id,
      });
    } catch (error) {
      logger.error('Error handling subscription created', { error, subscriptionId: subscription.id });
      throw error;
    }
  }

  /**
   * Handle subscription updated event
   */
  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    logger.info('Handling subscription updated', { subscriptionId: subscription.id });

    try {
      const currentPeriodStart = new Date(subscription.current_period_start * 1000);
      const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
      const trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000) : null;

      // Update subscription in database
      await prisma.subscription.update({
        where: { stripeSubscriptionId: subscription.id },
        data: {
          status: StripeService.mapStripeStatusToAppStatus(subscription.status),
          currentPeriodStart,
          currentPeriodEnd,
          trialEnd,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
        },
      });

      logger.info('Subscription updated in database', { subscriptionId: subscription.id });

      // If subscription was canceled, handle cancellation logic
      if (subscription.status === 'canceled' || subscription.cancel_at_period_end) {
        logger.info('Subscription canceled or will cancel', {
          subscriptionId: subscription.id,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        });

        // TODO: Send cancellation email
        // TODO: Track in analytics
      }

      // If subscription went from trialing to active
      if (subscription.status === 'active' && !subscription.trial_end) {
        logger.info('Subscription converted from trial to active', {
          subscriptionId: subscription.id,
        });

        // TODO: Send welcome email
        // TODO: Track conversion in analytics
      }
    } catch (error) {
      logger.error('Error handling subscription updated', { error, subscriptionId: subscription.id });
      throw error;
    }
  }

  /**
   * Handle subscription deleted event
   */
  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    logger.info('Handling subscription deleted', { subscriptionId: subscription.id });

    try {
      await prisma.subscription.update({
        where: { stripeSubscriptionId: subscription.id },
        data: {
          status: 'CANCELED',
          canceledAt: new Date(),
        },
      });

      logger.info('Subscription marked as canceled in database', {
        subscriptionId: subscription.id,
      });

      // TODO: Send cancellation confirmation email
      // TODO: Revoke access to premium features
    } catch (error) {
      logger.error('Error handling subscription deleted', { error, subscriptionId: subscription.id });
      throw error;
    }
  }

  /**
   * Handle trial will end event (3 days before trial ends)
   */
  private async handleTrialWillEnd(subscription: Stripe.Subscription): Promise<void> {
    logger.info('Handling trial will end', { subscriptionId: subscription.id });

    try {
      const sub = await prisma.subscription.findUnique({
        where: { stripeSubscriptionId: subscription.id },
        include: { user: true, plan: true },
      });

      if (!sub) {
        logger.warn('Subscription not found for trial will end', {
          subscriptionId: subscription.id,
        });
        return;
      }

      logger.info('Trial ending soon notification', {
        userId: sub.userId,
        subscriptionId: subscription.id,
        trialEnd: sub.trialEnd,
      });

      // TODO: Send trial ending email
      // TODO: Prompt to add payment method if not added
    } catch (error) {
      logger.error('Error handling trial will end', { error, subscriptionId: subscription.id });
      throw error;
    }
  }

  /**
   * Handle invoice paid event
   */
  private async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    logger.info('Handling invoice paid', { invoiceId: invoice.id });

    try {
      if (!invoice.subscription) {
        logger.info('Invoice not related to subscription', { invoiceId: invoice.id });
        return;
      }

      // Find subscription
      const subscription = await prisma.subscription.findUnique({
        where: { stripeSubscriptionId: invoice.subscription as string },
        include: { user: true },
      });

      if (!subscription) {
        logger.warn('Subscription not found for invoice', {
          invoiceId: invoice.id,
          subscriptionId: invoice.subscription,
        });
        return;
      }

      // Create invoice record
      await prisma.invoice.create({
        data: {
          subscriptionId: subscription.id,
          stripeInvoiceId: invoice.id,
          amount: invoice.amount_paid / 100, // Convert from cents
          currency: invoice.currency.toUpperCase(),
          status: 'PAID',
          paidAt: new Date(invoice.status_transitions.paid_at! * 1000),
          invoiceUrl: invoice.hosted_invoice_url,
          invoicePdf: invoice.invoice_pdf,
        },
      });

      logger.info('Invoice recorded in database', {
        invoiceId: invoice.id,
        subscriptionId: subscription.id,
        amount: invoice.amount_paid / 100,
      });

      // TODO: Send payment receipt email
    } catch (error) {
      logger.error('Error handling invoice paid', { error, invoiceId: invoice.id });
      throw error;
    }
  }

  /**
   * Handle invoice payment failed event
   */
  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    logger.warn('Handling invoice payment failed', { invoiceId: invoice.id });

    try {
      if (!invoice.subscription) {
        logger.info('Invoice not related to subscription', { invoiceId: invoice.id });
        return;
      }

      // Find subscription
      const subscription = await prisma.subscription.findUnique({
        where: { stripeSubscriptionId: invoice.subscription as string },
        include: { user: true },
      });

      if (!subscription) {
        logger.warn('Subscription not found for failed invoice', {
          invoiceId: invoice.id,
          subscriptionId: invoice.subscription,
        });
        return;
      }

      // Update subscription status to PAST_DUE
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: 'PAST_DUE' },
      });

      logger.warn('Subscription marked as past due', {
        subscriptionId: subscription.id,
        invoiceId: invoice.id,
      });

      // TODO: Send payment failed email
      // TODO: Prompt to update payment method
      // TODO: Track in analytics
    } catch (error) {
      logger.error('Error handling invoice payment failed', { error, invoiceId: invoice.id });
      throw error;
    }
  }

  /**
   * Handle upcoming invoice event (7 days before payment)
   */
  private async handleInvoiceUpcoming(invoice: Stripe.Invoice): Promise<void> {
    logger.info('Handling upcoming invoice', { invoiceId: invoice.id });

    try {
      if (!invoice.subscription) {
        return;
      }

      const subscription = await prisma.subscription.findUnique({
        where: { stripeSubscriptionId: invoice.subscription as string },
        include: { user: true, plan: true },
      });

      if (!subscription) {
        return;
      }

      logger.info('Upcoming payment notification', {
        userId: subscription.userId,
        subscriptionId: subscription.id,
        amount: invoice.amount_due / 100,
      });

      // TODO: Send upcoming payment email
    } catch (error) {
      logger.error('Error handling upcoming invoice', { error, invoiceId: invoice.id });
      throw error;
    }
  }

  /**
   * Handle payment method attached event
   */
  private async handlePaymentMethodAttached(paymentMethod: Stripe.PaymentMethod): Promise<void> {
    logger.info('Handling payment method attached', {
      paymentMethodId: paymentMethod.id,
      customerId: paymentMethod.customer,
    });

    try {
      if (!paymentMethod.customer) {
        return;
      }

      // Find user
      const user = await prisma.user.findFirst({
        where: { stripeCustomerId: paymentMethod.customer as string },
      });

      if (!user) {
        logger.warn('User not found for payment method', {
          customerId: paymentMethod.customer,
        });
        return;
      }

      // Create payment method record
      await prisma.paymentMethod.upsert({
        where: { stripePaymentMethodId: paymentMethod.id },
        create: {
          userId: user.id,
          stripePaymentMethodId: paymentMethod.id,
          type: paymentMethod.type.toUpperCase() as any,
          cardBrand: paymentMethod.card?.brand,
          cardLast4: paymentMethod.card?.last4,
          cardExpMonth: paymentMethod.card?.exp_month,
          cardExpYear: paymentMethod.card?.exp_year,
          isDefault: false,
        },
        update: {
          cardBrand: paymentMethod.card?.brand,
          cardLast4: paymentMethod.card?.last4,
          cardExpMonth: paymentMethod.card?.exp_month,
          cardExpYear: paymentMethod.card?.exp_year,
        },
      });

      logger.info('Payment method recorded in database', {
        userId: user.id,
        paymentMethodId: paymentMethod.id,
      });
    } catch (error) {
      logger.error('Error handling payment method attached', { error, paymentMethodId: paymentMethod.id });
      throw error;
    }
  }

  /**
   * Handle payment method detached event
   */
  private async handlePaymentMethodDetached(paymentMethod: Stripe.PaymentMethod): Promise<void> {
    logger.info('Handling payment method detached', {
      paymentMethodId: paymentMethod.id,
    });

    try {
      await prisma.paymentMethod.delete({
        where: { stripePaymentMethodId: paymentMethod.id },
      });

      logger.info('Payment method removed from database', {
        paymentMethodId: paymentMethod.id,
      });
    } catch (error) {
      logger.error('Error handling payment method detached', { error, paymentMethodId: paymentMethod.id });
      // Don't throw - payment method might already be deleted
    }
  }

  /**
   * Handle customer updated event
   */
  private async handleCustomerUpdated(customer: Stripe.Customer): Promise<void> {
    logger.info('Handling customer updated', { customerId: customer.id });

    try {
      // Update user's default payment method if changed
      if (customer.invoice_settings.default_payment_method) {
        const user = await prisma.user.findFirst({
          where: { stripeCustomerId: customer.id },
        });

        if (user) {
          // Set all payment methods to not default
          await prisma.paymentMethod.updateMany({
            where: { userId: user.id },
            data: { isDefault: false },
          });

          // Set the new default
          await prisma.paymentMethod.update({
            where: {
              stripePaymentMethodId: customer.invoice_settings.default_payment_method as string,
            },
            data: { isDefault: true },
          });

          logger.info('Default payment method updated', {
            userId: user.id,
            paymentMethodId: customer.invoice_settings.default_payment_method,
          });
        }
      }
    } catch (error) {
      logger.error('Error handling customer updated', { error, customerId: customer.id });
      // Don't throw - not critical
    }
  }
}

export const webhookController = new WebhookController();
