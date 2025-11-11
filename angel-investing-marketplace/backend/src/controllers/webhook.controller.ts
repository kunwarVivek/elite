import { Request, Response } from 'express';
import Stripe from 'stripe';
import { stripe } from '../config/stripe.js';
import StripeService from '../services/stripe.service.js';
import { logger } from '../config/logger.js';
import { PrismaClient } from '@prisma/client';
import {
  sendTrialStartedEmail,
  sendTrialEndingSoonEmail,
  sendTrialEndedEmail,
  sendPaymentSuccessfulEmail,
  sendPaymentFailedEmail,
  sendUpcomingPaymentEmail,
  sendSubscriptionCanceledEmail,
  sendSubscriptionReactivatedEmail,
} from '../config/email.js';

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

// Helper functions for email data formatting
const formatDate = (date: Date): string => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatPrice = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount);
};

const formatPaymentMethod = (paymentMethod: any): string => {
  if (!paymentMethod) return 'No payment method';
  if (paymentMethod.card) {
    return `${paymentMethod.card.brand} ending in ${paymentMethod.card.last4}`;
  }
  if (paymentMethod.type) {
    return paymentMethod.type.replace('_', ' ').toUpperCase();
  }
  return 'Payment method on file';
};

const calculateDaysLeft = (endDate: Date): number => {
  const now = new Date();
  const diffMs = new Date(endDate).getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
};

const getAppUrl = (): string => {
  return process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:5173';
};

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

      // Send trial started email if this is a trial subscription
      if (subscription.status === 'trialing' && trialEnd) {
        try {
          const appUrl = getAppUrl();
          const billingInterval = subscription.items.data[0]?.price.recurring?.interval || 'month';
          const priceAmount = subscription.items.data[0]?.price.unit_amount || 0;

          // Format plan features as HTML list items
          const features = plan.features
            ? Object.entries(plan.features)
                .filter(([_, value]) => value === true)
                .map(([key]) => `<li>${key.replace(/([A-Z])/g, ' $1').trim()}</li>`)
                .join('')
            : '<li>All features included</li>';

          await sendTrialStartedEmail(
            user.email,
            user.name || user.email,
            plan.name,
            plan.trialDays || 14,
            formatDate(trialEnd),
            formatPrice(priceAmount / 100) + '/' + billingInterval,
            features,
            `${appUrl}/dashboard`
          );

          logger.info('Trial started email sent', { userId: user.id, planName: plan.name });
        } catch (emailError) {
          logger.error('Failed to send trial started email', { error: emailError, userId: user.id });
          // Don't throw - email failure shouldn't break the webhook
        }
      }
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

      // Get subscription from database with user and plan details
      const dbSubscription = await prisma.subscription.findUnique({
        where: { stripeSubscriptionId: subscription.id },
        include: { user: true, plan: true },
      });

      if (!dbSubscription) {
        logger.warn('Subscription not found in database', { subscriptionId: subscription.id });
        return;
      }

      const appUrl = getAppUrl();

      // If subscription was canceled, handle cancellation logic
      if (subscription.status === 'canceled' || subscription.cancel_at_period_end) {
        logger.info('Subscription canceled or will cancel', {
          subscriptionId: subscription.id,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        });

        // Send cancellation email
        if (subscription.cancel_at_period_end && subscription.status !== 'canceled') {
          try {
            await sendSubscriptionCanceledEmail(
              dbSubscription.user.email,
              dbSubscription.user.name || dbSubscription.user.email,
              dbSubscription.plan.name,
              formatDate(currentPeriodEnd),
              formatDate(new Date()),
              `${appUrl}/settings/subscription`
            );

            logger.info('Subscription canceled email sent', { userId: dbSubscription.userId });
          } catch (emailError) {
            logger.error('Failed to send subscription canceled email', { error: emailError });
          }
        }
      }

      // If subscription was reactivated (cancel_at_period_end changed from true to false)
      if (!subscription.cancel_at_period_end && subscription.status === 'active') {
        // Check if this was a reactivation
        const wasScheduledForCancellation = await prisma.subscription.findFirst({
          where: {
            id: dbSubscription.id,
            cancelAtPeriodEnd: true,
          },
        });

        if (wasScheduledForCancellation) {
          try {
            const billingInterval = subscription.items.data[0]?.price.recurring?.interval || 'month';
            const priceAmount = subscription.items.data[0]?.price.unit_amount || 0;

            await sendSubscriptionReactivatedEmail(
              dbSubscription.user.email,
              dbSubscription.user.name || dbSubscription.user.email,
              dbSubscription.plan.name,
              formatPrice(priceAmount / 100) + '/' + billingInterval,
              formatDate(currentPeriodEnd),
              `${appUrl}/dashboard`
            );

            logger.info('Subscription reactivated email sent', { userId: dbSubscription.userId });
          } catch (emailError) {
            logger.error('Failed to send subscription reactivated email', { error: emailError });
          }
        }
      }

      // If subscription went from trialing to active
      if (subscription.status === 'active' && !subscription.trial_end) {
        logger.info('Subscription converted from trial to active', {
          subscriptionId: subscription.id,
        });

        // Send trial ended / subscription activated email
        try {
          const billingInterval = subscription.items.data[0]?.price.recurring?.interval || 'month';
          const priceAmount = subscription.items.data[0]?.price.unit_amount || 0;

          // Get default payment method
          const customer = await stripe.customers.retrieve(subscription.customer as string);
          const paymentMethodId =
            (customer as Stripe.Customer).invoice_settings?.default_payment_method;
          let paymentMethodDescription = 'Payment method on file';

          if (paymentMethodId) {
            try {
              const pm = await stripe.paymentMethods.retrieve(paymentMethodId as string);
              paymentMethodDescription = formatPaymentMethod(pm);
            } catch (pmError) {
              logger.warn('Failed to retrieve payment method details', { error: pmError });
            }
          }

          await sendTrialEndedEmail(
            dbSubscription.user.email,
            dbSubscription.user.name || dbSubscription.user.email,
            dbSubscription.plan.name,
            formatPrice(priceAmount / 100) + '/' + billingInterval,
            formatDate(currentPeriodEnd),
            paymentMethodDescription,
            `${appUrl}/dashboard`
          );

          logger.info('Trial ended email sent', { userId: dbSubscription.userId });
        } catch (emailError) {
          logger.error('Failed to send trial ended email', { error: emailError });
        }
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

      // Send trial ending soon email
      try {
        if (!sub.trialEnd) {
          logger.warn('Trial end date not found', { subscriptionId: subscription.id });
          return;
        }

        const appUrl = getAppUrl();
        const daysLeft = calculateDaysLeft(sub.trialEnd);
        const billingInterval = subscription.items.data[0]?.price.recurring?.interval || 'month';
        const priceAmount = subscription.items.data[0]?.price.unit_amount || 0;

        // Get default payment method
        const customer = await stripe.customers.retrieve(subscription.customer as string);
        const paymentMethodId =
          (customer as Stripe.Customer).invoice_settings?.default_payment_method;
        let paymentMethodDescription = 'No payment method on file';

        if (paymentMethodId) {
          try {
            const pm = await stripe.paymentMethods.retrieve(paymentMethodId as string);
            paymentMethodDescription = formatPaymentMethod(pm);
          } catch (pmError) {
            logger.warn('Failed to retrieve payment method details', { error: pmError });
          }
        }

        await sendTrialEndingSoonEmail(
          sub.user.email,
          sub.user.name || sub.user.email,
          sub.plan.name,
          daysLeft,
          formatDate(sub.trialEnd),
          formatPrice(priceAmount / 100) + '/' + billingInterval,
          formatDate(sub.currentPeriodEnd),
          paymentMethodDescription,
          `${appUrl}/settings/subscription`,
          `${appUrl}/pricing`
        );

        logger.info('Trial ending soon email sent', { userId: sub.userId });
      } catch (emailError) {
        logger.error('Failed to send trial ending soon email', { error: emailError });
      }
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

      // Send payment receipt email
      try {
        const appUrl = getAppUrl();
        const billingInterval = invoice.lines.data[0]?.price?.recurring?.interval || 'month';

        // Get default payment method
        const customer = await stripe.customers.retrieve(invoice.customer as string);
        const paymentMethodId =
          (customer as Stripe.Customer).invoice_settings?.default_payment_method ||
          invoice.payment_intent?.payment_method;
        let paymentMethodDescription = 'Payment method on file';

        if (paymentMethodId) {
          try {
            const pm = await stripe.paymentMethods.retrieve(paymentMethodId as string);
            paymentMethodDescription = formatPaymentMethod(pm);
          } catch (pmError) {
            logger.warn('Failed to retrieve payment method details', { error: pmError });
          }
        }

        const billingPeriodStart = invoice.period_start
          ? formatDate(new Date(invoice.period_start * 1000))
          : '';
        const billingPeriodEnd = invoice.period_end
          ? formatDate(new Date(invoice.period_end * 1000))
          : '';
        const billingPeriod = `${billingPeriodStart} - ${billingPeriodEnd}`;

        // Get next billing date (approximation)
        const nextBillingDate = new Date(invoice.period_end! * 1000);
        if (billingInterval === 'month') {
          nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
        } else if (billingInterval === 'year') {
          nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
        }

        await sendPaymentSuccessfulEmail(
          subscription.user.email,
          subscription.user.name || subscription.user.email,
          subscription.plan.name,
          formatPrice(invoice.amount_paid / 100, invoice.currency),
          formatDate(new Date(invoice.status_transitions.paid_at! * 1000)),
          billingPeriod,
          paymentMethodDescription,
          formatDate(nextBillingDate),
          invoice.hosted_invoice_url || `${appUrl}/settings/subscription`
        );

        logger.info('Payment successful email sent', { userId: subscription.userId });
      } catch (emailError) {
        logger.error('Failed to send payment successful email', { error: emailError });
      }
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

      // Send payment failed email
      try {
        const appUrl = getAppUrl();

        // Get default payment method
        const customer = await stripe.customers.retrieve(invoice.customer as string);
        const paymentMethodId =
          (customer as Stripe.Customer).invoice_settings?.default_payment_method ||
          invoice.payment_intent?.payment_method;
        let paymentMethodDescription = 'Payment method on file';

        if (paymentMethodId) {
          try {
            const pm = await stripe.paymentMethods.retrieve(paymentMethodId as string);
            paymentMethodDescription = formatPaymentMethod(pm);
          } catch (pmError) {
            logger.warn('Failed to retrieve payment method details', { error: pmError });
          }
        }

        // Get failure reason
        const failureReason =
          invoice.last_finalization_error?.message ||
          'Your payment could not be processed. Please check your payment method and try again.';

        await sendPaymentFailedEmail(
          subscription.user.email,
          subscription.user.name || subscription.user.email,
          subscription.plan.name,
          formatPrice(invoice.amount_due / 100, invoice.currency),
          paymentMethodDescription,
          failureReason,
          `${appUrl}/settings/subscription`
        );

        logger.info('Payment failed email sent', { userId: subscription.userId });
      } catch (emailError) {
        logger.error('Failed to send payment failed email', { error: emailError });
      }
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

      // Send upcoming payment email
      try {
        const appUrl = getAppUrl();

        // Get default payment method
        const customer = await stripe.customers.retrieve(invoice.customer as string);
        const paymentMethodId =
          (customer as Stripe.Customer).invoice_settings?.default_payment_method;
        let paymentMethodDescription = 'Payment method on file';

        if (paymentMethodId) {
          try {
            const pm = await stripe.paymentMethods.retrieve(paymentMethodId as string);
            paymentMethodDescription = formatPaymentMethod(pm);
          } catch (pmError) {
            logger.warn('Failed to retrieve payment method details', { error: pmError });
          }
        }

        // Calculate billing date (when payment will be attempted)
        const billingDate = invoice.next_payment_attempt
          ? formatDate(new Date(invoice.next_payment_attempt * 1000))
          : formatDate(new Date(invoice.period_end! * 1000));

        await sendUpcomingPaymentEmail(
          subscription.user.email,
          subscription.user.name || subscription.user.email,
          subscription.plan.name,
          formatPrice(invoice.amount_due / 100, invoice.currency),
          billingDate,
          paymentMethodDescription,
          `${appUrl}/settings/subscription`
        );

        logger.info('Upcoming payment email sent', { userId: subscription.userId });
      } catch (emailError) {
        logger.error('Failed to send upcoming payment email', { error: emailError });
      }
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
