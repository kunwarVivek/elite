import { Request, Response } from 'express'
import { subscriptionService } from '../services/subscription.service'
import { SubscriptionStatus, PlanTier } from '@prisma/client'
import StripeService from '../services/stripe.service.js'

export class SubscriptionController {
  /**
   * Create a new subscription
   * POST /api/subscriptions
   */
  async createSubscription(req: Request, res: Response) {
    try {
      const userId = req.user?.id

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const { planId, stripeSubscriptionId, stripeCustomerId, stripePaymentMethodId, trialDays } = req.body

      if (!planId) {
        return res.status(400).json({ error: 'Plan ID is required' })
      }

      // Check if user already has an active subscription
      const existing = await subscriptionService.getUserSubscription(userId)
      if (existing) {
        return res.status(400).json({ error: 'User already has an active subscription' })
      }

      const subscription = await subscriptionService.createSubscription({
        userId,
        planId,
        stripeSubscriptionId,
        stripeCustomerId,
        stripePaymentMethodId,
        trialDays,
      })

      res.status(201).json({ subscription })
    } catch (error: any) {
      console.error('Error creating subscription:', error)
      res.status(500).json({ error: error.message || 'Failed to create subscription' })
    }
  }

  /**
   * Get current user's subscription
   * GET /api/subscriptions/me
   */
  async getMySubscription(req: Request, res: Response) {
    try {
      const userId = req.user?.id

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const subscription = await subscriptionService.getUserSubscription(userId)

      if (!subscription) {
        return res.status(404).json({ error: 'No active subscription found' })
      }

      res.json({ subscription })
    } catch (error: any) {
      console.error('Error fetching subscription:', error)
      res.status(500).json({ error: error.message || 'Failed to fetch subscription' })
    }
  }

  /**
   * Get subscription by ID (admin or owner)
   * GET /api/subscriptions/:id
   */
  async getSubscriptionById(req: Request, res: Response) {
    try {
      const { id } = req.params
      const userId = req.user?.id
      const userRole = req.user?.role

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const subscription = await subscriptionService.getSubscriptionById(id)

      // Check if user is admin or subscription owner
      if (userRole !== 'ADMIN' && subscription.userId !== userId) {
        return res.status(403).json({ error: 'Forbidden' })
      }

      res.json({ subscription })
    } catch (error: any) {
      console.error('Error fetching subscription:', error)
      res.status(500).json({ error: error.message || 'Failed to fetch subscription' })
    }
  }

  /**
   * Get all subscriptions (admin only)
   * GET /api/subscriptions
   */
  async getAllSubscriptions(req: Request, res: Response) {
    try {
      const userRole = req.user?.role

      if (userRole !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden: Admin access required' })
      }

      const { status, planTier, limit, offset } = req.query

      const result = await subscriptionService.getAllSubscriptions({
        status: status as SubscriptionStatus | undefined,
        planTier: planTier as PlanTier | undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      })

      res.json(result)
    } catch (error: any) {
      console.error('Error fetching subscriptions:', error)
      res.status(500).json({ error: error.message || 'Failed to fetch subscriptions' })
    }
  }

  /**
   * Update subscription
   * PATCH /api/subscriptions/:id
   */
  async updateSubscription(req: Request, res: Response) {
    try {
      const { id } = req.params
      const userId = req.user?.id
      const userRole = req.user?.role

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      // Get existing subscription to check ownership
      const existing = await subscriptionService.getSubscriptionById(id)

      // Check if user is admin or subscription owner
      if (userRole !== 'ADMIN' && existing.userId !== userId) {
        return res.status(403).json({ error: 'Forbidden' })
      }

      const { planId, status, cancelAtPeriodEnd, cancelReason } = req.body

      const subscription = await subscriptionService.updateSubscription(id, {
        planId,
        status,
        cancelAtPeriodEnd,
        cancelReason,
      })

      res.json({ subscription })
    } catch (error: any) {
      console.error('Error updating subscription:', error)
      res.status(500).json({ error: error.message || 'Failed to update subscription' })
    }
  }

  /**
   * Cancel subscription
   * POST /api/subscriptions/:id/cancel
   */
  async cancelSubscription(req: Request, res: Response) {
    try {
      const { id } = req.params
      const userId = req.user?.id
      const userRole = req.user?.role

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      // Get existing subscription to check ownership
      const existing = await subscriptionService.getSubscriptionById(id)

      // Check if user is admin or subscription owner
      if (userRole !== 'ADMIN' && existing.userId !== userId) {
        return res.status(403).json({ error: 'Forbidden' })
      }

      const { cancelReason, immediate } = req.body

      const subscription = await subscriptionService.cancelSubscription(
        id,
        cancelReason,
        immediate || false
      )

      res.json({ subscription })
    } catch (error: any) {
      console.error('Error canceling subscription:', error)
      res.status(500).json({ error: error.message || 'Failed to cancel subscription' })
    }
  }

  /**
   * Reactivate subscription
   * POST /api/subscriptions/:id/reactivate
   */
  async reactivateSubscription(req: Request, res: Response) {
    try {
      const { id } = req.params
      const userId = req.user?.id
      const userRole = req.user?.role

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      // Get existing subscription to check ownership
      const existing = await subscriptionService.getSubscriptionById(id)

      // Check if user is admin or subscription owner
      if (userRole !== 'ADMIN' && existing.userId !== userId) {
        return res.status(403).json({ error: 'Forbidden' })
      }

      const subscription = await subscriptionService.reactivateSubscription(id)

      res.json({ subscription })
    } catch (error: any) {
      console.error('Error reactivating subscription:', error)
      res.status(500).json({ error: error.message || 'Failed to reactivate subscription' })
    }
  }

  /**
   * Check feature access
   * GET /api/subscriptions/check-feature/:featureName
   */
  async checkFeatureAccess(req: Request, res: Response) {
    try {
      const userId = req.user?.id

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const { featureName } = req.params

      const hasAccess = await subscriptionService.checkFeatureAccess(userId, featureName)

      res.json({ hasAccess, feature: featureName })
    } catch (error: any) {
      console.error('Error checking feature access:', error)
      res.status(500).json({ error: error.message || 'Failed to check feature access' })
    }
  }

  /**
   * Check usage limit
   * GET /api/subscriptions/check-limit/:limitName
   */
  async checkUsageLimit(req: Request, res: Response) {
    try {
      const userId = req.user?.id

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const { limitName } = req.params

      const result = await subscriptionService.checkUsageLimit(userId, limitName)

      res.json(result)
    } catch (error: any) {
      console.error('Error checking usage limit:', error)
      res.status(500).json({ error: error.message || 'Failed to check usage limit' })
    }
  }

  /**
   * Track usage
   * POST /api/subscriptions/track-usage
   */
  async trackUsage(req: Request, res: Response) {
    try {
      const userId = req.user?.id

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const { investments, documents, documentStorage, apiCalls } = req.body

      const usage = await subscriptionService.trackUsage(userId, {
        investments,
        documents,
        documentStorage,
        apiCalls,
      })

      res.json({ usage })
    } catch (error: any) {
      console.error('Error tracking usage:', error)
      res.status(500).json({ error: error.message || 'Failed to track usage' })
    }
  }

  /**
   * Get revenue metrics (admin only)
   * GET /api/subscriptions/metrics/revenue
   */
  async getRevenueMetrics(req: Request, res: Response) {
    try {
      const userRole = req.user?.role

      if (userRole !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden: Admin access required' })
      }

      const metrics = await subscriptionService.getRevenueMetrics()

      res.json({ metrics })
    } catch (error: any) {
      console.error('Error fetching revenue metrics:', error)
      res.status(500).json({ error: error.message || 'Failed to fetch revenue metrics' })
    }
  }

  /**
   * Get subscription plans
   * GET /api/subscription-plans
   */
  async getSubscriptionPlans(req: Request, res: Response) {
    try {
      const plans = await subscriptionService.getSubscriptionPlans()

      res.json({ plans })
    } catch (error: any) {
      console.error('Error fetching subscription plans:', error)
      res.status(500).json({ error: error.message || 'Failed to fetch subscription plans' })
    }
  }

  /**
   * Create or update subscription plan (admin only)
   * POST /api/subscription-plans
   */
  async upsertSubscriptionPlan(req: Request, res: Response) {
    try {
      const userRole = req.user?.role

      if (userRole !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden: Admin access required' })
      }

      const planData = req.body

      const plan = await subscriptionService.upsertSubscriptionPlan(planData)

      res.json({ plan })
    } catch (error: any) {
      console.error('Error upserting subscription plan:', error)
      res.status(500).json({ error: error.message || 'Failed to upsert subscription plan' })
    }
  }

  /**
   * Process subscription renewal (internal/cron)
   * POST /api/subscriptions/:id/renew
   */
  async processRenewal(req: Request, res: Response) {
    try {
      const { id } = req.params
      const userRole = req.user?.role

      if (userRole !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden: Admin access required' })
      }

      const subscription = await subscriptionService.processRenewal(id)

      res.json({ subscription })
    } catch (error: any) {
      console.error('Error processing renewal:', error)
      res.status(500).json({ error: error.message || 'Failed to process renewal' })
    }
  }

  /**
   * Handle trial expiry (internal/cron)
   * POST /api/subscriptions/:id/trial-expiry
   */
  async handleTrialExpiry(req: Request, res: Response) {
    try {
      const { id } = req.params
      const userRole = req.user?.role

      if (userRole !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden: Admin access required' })
      }

      const subscription = await subscriptionService.handleTrialExpiry(id)

      res.json({ subscription })
    } catch (error: any) {
      console.error('Error handling trial expiry:', error)
      res.status(500).json({ error: error.message || 'Failed to handle trial expiry' })
    }
  }

  // ============================================================================
  // STRIPE INTEGRATION ENDPOINTS
  // ============================================================================

  /**
   * Create a SetupIntent for payment method collection
   * POST /api/subscriptions/stripe/setup-intent
   */
  async createSetupIntent(req: Request, res: Response) {
    try {
      const userId = req.user?.id
      const user = req.user

      if (!userId || !user) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      // Get or create Stripe customer
      const customerId = await StripeService.getOrCreateCustomer(
        user.email,
        user.name || '',
        userId
      )

      // Create SetupIntent
      const { clientSecret, setupIntentId } = await StripeService.createSetupIntent(customerId)

      res.json({
        clientSecret,
        setupIntentId,
        customerId,
      })
    } catch (error: any) {
      console.error('Error creating setup intent:', error)
      res.status(500).json({ error: error.message || 'Failed to create setup intent' })
    }
  }

  /**
   * Create subscription with Stripe
   * POST /api/subscriptions/stripe/create
   */
  async createStripeSubscription(req: Request, res: Response) {
    try {
      const userId = req.user?.id
      const user = req.user

      if (!userId || !user) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const { planId, paymentMethodId } = req.body

      if (!planId) {
        return res.status(400).json({ error: 'Plan ID is required' })
      }

      // Check if user already has an active subscription
      const existing = await subscriptionService.getUserSubscription(userId)
      if (existing && existing.status !== 'CANCELED') {
        return res.status(400).json({ error: 'User already has an active subscription' })
      }

      // Get plan details
      const plan = await subscriptionService.getSubscriptionPlanById(planId)
      if (!plan) {
        return res.status(404).json({ error: 'Plan not found' })
      }

      if (!plan.stripePriceId) {
        return res.status(400).json({ error: 'Plan does not have Stripe integration configured' })
      }

      // Get or create Stripe customer
      const customerId = await StripeService.getOrCreateCustomer(
        user.email,
        user.name || '',
        userId
      )

      // Attach payment method if provided
      if (paymentMethodId) {
        await StripeService.setDefaultPaymentMethod(customerId, paymentMethodId)
      }

      // Calculate trial days based on plan
      const trialPeriodDays = plan.trial && plan.trialDays > 0 ? plan.trialDays : undefined

      // Create Stripe subscription
      const stripeSubscription = await StripeService.createSubscription({
        customerId,
        priceId: plan.stripePriceId,
        trialPeriodDays,
        metadata: {
          userId,
          planId: plan.id,
          planName: plan.name,
        },
      })

      // Create subscription in database (will be updated by webhook)
      const subscription = await subscriptionService.createSubscription({
        userId,
        planId: plan.id,
        stripeSubscriptionId: stripeSubscription.id,
        stripeCustomerId: customerId,
        stripePaymentMethodId: paymentMethodId,
        trialDays: trialPeriodDays,
      })

      res.status(201).json({
        subscription,
        stripeSubscription: {
          id: stripeSubscription.id,
          status: stripeSubscription.status,
          clientSecret: (stripeSubscription as any).latest_invoice?.payment_intent?.client_secret ||
                       (stripeSubscription as any).pending_setup_intent?.client_secret,
        },
      })
    } catch (error: any) {
      console.error('Error creating Stripe subscription:', error)
      res.status(500).json({ error: error.message || 'Failed to create subscription' })
    }
  }

  /**
   * Create billing portal session
   * POST /api/subscriptions/stripe/billing-portal
   */
  async createBillingPortalSession(req: Request, res: Response) {
    try {
      const userId = req.user?.id

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      // Get user's subscription to find Stripe customer ID
      const subscription = await subscriptionService.getUserSubscription(userId)

      if (!subscription || !subscription.stripeCustomerId) {
        return res.status(404).json({ error: 'No active subscription with payment method found' })
      }

      const { returnUrl } = req.body
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
      const redirectUrl = returnUrl || `${frontendUrl}/settings/subscription`

      // Create billing portal session
      const session = await StripeService.createBillingPortalSession(
        subscription.stripeCustomerId,
        redirectUrl
      )

      res.json({
        url: session.url,
        sessionId: session.id,
      })
    } catch (error: any) {
      console.error('Error creating billing portal session:', error)
      res.status(500).json({ error: error.message || 'Failed to create billing portal session' })
    }
  }

  /**
   * Get upcoming invoice
   * GET /api/subscriptions/stripe/upcoming-invoice
   */
  async getUpcomingInvoice(req: Request, res: Response) {
    try {
      const userId = req.user?.id

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const subscription = await subscriptionService.getUserSubscription(userId)

      if (!subscription || !subscription.stripeSubscriptionId) {
        return res.status(404).json({ error: 'No active subscription found' })
      }

      const invoice = await StripeService.getUpcomingInvoice(subscription.stripeSubscriptionId)

      res.json({
        invoice: {
          amount: invoice.amount_due / 100,
          currency: invoice.currency,
          periodStart: new Date(invoice.period_start * 1000),
          periodEnd: new Date(invoice.period_end * 1000),
          dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : null,
        },
      })
    } catch (error: any) {
      console.error('Error fetching upcoming invoice:', error)
      res.status(500).json({ error: error.message || 'Failed to fetch upcoming invoice' })
    }
  }

  /**
   * List payment methods
   * GET /api/subscriptions/stripe/payment-methods
   */
  async listPaymentMethods(req: Request, res: Response) {
    try {
      const userId = req.user?.id

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const subscription = await subscriptionService.getUserSubscription(userId)

      if (!subscription || !subscription.stripeCustomerId) {
        return res.json({ paymentMethods: [] })
      }

      const paymentMethods = await StripeService.getCustomerPaymentMethods(subscription.stripeCustomerId)

      res.json({ paymentMethods })
    } catch (error: any) {
      console.error('Error fetching payment methods:', error)
      res.status(500).json({ error: error.message || 'Failed to fetch payment methods' })
    }
  }
}

export const subscriptionController = new SubscriptionController()
