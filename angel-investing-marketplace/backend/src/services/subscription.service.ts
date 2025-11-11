import { PrismaClient, PlanTier, SubscriptionStatus, BillingInterval } from '@prisma/client'

const prisma = new PrismaClient()

export interface CreateSubscriptionData {
  userId: string
  planId: string
  stripeSubscriptionId?: string
  stripeCustomerId?: string
  stripePaymentMethodId?: string
  trialDays?: number
}

export interface UpdateSubscriptionData {
  planId?: string
  status?: SubscriptionStatus
  cancelAtPeriodEnd?: boolean
  cancelReason?: string
}

export interface UsageData {
  investments?: number
  documents?: number
  documentStorage?: number
  apiCalls?: number
}

export class SubscriptionService {
  /**
   * Create a new subscription for a user
   */
  async createSubscription(data: CreateSubscriptionData) {
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: data.planId },
    })

    if (!plan) {
      throw new Error('Subscription plan not found')
    }

    const now = new Date()
    const trialDays = data.trialDays ?? plan.trialDays
    const periodStart = now
    const periodEnd = new Date(now)

    if (trialDays > 0) {
      periodEnd.setDate(periodEnd.getDate() + trialDays)
    } else if (plan.billingInterval === BillingInterval.MONTHLY) {
      periodEnd.setMonth(periodEnd.getMonth() + 1)
    } else {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1)
    }

    const subscription = await prisma.subscription.create({
      data: {
        userId: data.userId,
        planId: data.planId,
        status: trialDays > 0 ? SubscriptionStatus.TRIALING : SubscriptionStatus.ACTIVE,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        stripeSubscriptionId: data.stripeSubscriptionId,
        stripeCustomerId: data.stripeCustomerId,
        stripePaymentMethodId: data.stripePaymentMethodId,
        trialStart: trialDays > 0 ? now : null,
        trialEnd: trialDays > 0 ? periodEnd : null,
      },
      include: {
        plan: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
    })

    // Initialize usage tracking
    await prisma.subscriptionUsage.create({
      data: {
        subscriptionId: subscription.id,
        investments: 0,
        documents: 0,
        documentStorage: 0,
        apiCalls: 0,
        periodStart: periodStart,
        periodEnd: periodEnd,
      },
    })

    return subscription
  }

  /**
   * Get subscription by ID
   */
  async getSubscriptionById(id: string) {
    const subscription = await prisma.subscription.findUnique({
      where: { id },
      include: {
        plan: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
        usage: true,
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    })

    if (!subscription) {
      throw new Error('Subscription not found')
    }

    return subscription
  }

  /**
   * Get user's active subscription
   */
  async getUserSubscription(userId: string) {
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: {
          in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING],
        },
      },
      include: {
        plan: true,
        usage: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return subscription
  }

  /**
   * Get all subscriptions with filtering
   */
  async getAllSubscriptions(filters?: {
    status?: SubscriptionStatus
    planTier?: PlanTier
    limit?: number
    offset?: number
  }) {
    const where: any = {}

    if (filters?.status) {
      where.status = filters.status
    }

    if (filters?.planTier) {
      where.plan = {
        tier: filters.planTier,
      }
    }

    const subscriptions = await prisma.subscription.findMany({
      where,
      include: {
        plan: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 50,
      skip: filters?.offset || 0,
    })

    const total = await prisma.subscription.count({ where })

    return { subscriptions, total }
  }

  /**
   * Update subscription
   */
  async updateSubscription(id: string, data: UpdateSubscriptionData) {
    // If changing plan, validate new plan exists
    if (data.planId) {
      const plan = await prisma.subscriptionPlan.findUnique({
        where: { id: data.planId },
      })

      if (!plan) {
        throw new Error('New subscription plan not found')
      }
    }

    const subscription = await prisma.subscription.update({
      where: { id },
      data: {
        ...data,
        canceledAt: data.cancelAtPeriodEnd ? new Date() : undefined,
      },
      include: {
        plan: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
        usage: true,
      },
    })

    return subscription
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(id: string, cancelReason?: string, immediate: boolean = false) {
    const subscription = await this.getSubscriptionById(id)

    if (immediate) {
      return await prisma.subscription.update({
        where: { id },
        data: {
          status: SubscriptionStatus.CANCELED,
          canceledAt: new Date(),
          cancelReason,
        },
        include: {
          plan: true,
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
            },
          },
        },
      })
    } else {
      return await prisma.subscription.update({
        where: { id },
        data: {
          cancelAtPeriodEnd: true,
          canceledAt: new Date(),
          cancelReason,
        },
        include: {
          plan: true,
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
            },
          },
        },
      })
    }
  }

  /**
   * Reactivate a canceled subscription
   */
  async reactivateSubscription(id: string) {
    const subscription = await this.getSubscriptionById(id)

    if (subscription.status !== SubscriptionStatus.CANCELED && !subscription.cancelAtPeriodEnd) {
      throw new Error('Subscription is not canceled')
    }

    return await prisma.subscription.update({
      where: { id },
      data: {
        cancelAtPeriodEnd: false,
        canceledAt: null,
        cancelReason: null,
      },
      include: {
        plan: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
    })
  }

  /**
   * Check if user has access to a feature
   */
  async checkFeatureAccess(userId: string, featureName: string): Promise<boolean> {
    const subscription = await this.getUserSubscription(userId)

    if (!subscription) {
      // No active subscription, check if feature is in free tier
      const freePlan = await prisma.subscriptionPlan.findFirst({
        where: { tier: PlanTier.FREE },
      })

      if (!freePlan) {
        return false
      }

      const features = freePlan.features as any
      return features[featureName] === true
    }

    const features = subscription.plan.features as any
    return features[featureName] === true
  }

  /**
   * Check usage limits
   */
  async checkUsageLimit(userId: string, limitName: string): Promise<{ allowed: boolean; current: number; limit: number }> {
    const subscription = await this.getUserSubscription(userId)

    let planLimits: any
    if (!subscription) {
      // No active subscription, use free tier limits
      const freePlan = await prisma.subscriptionPlan.findFirst({
        where: { tier: PlanTier.FREE },
      })

      if (!freePlan) {
        return { allowed: false, current: 0, limit: 0 }
      }

      planLimits = freePlan.limits as any
    } else {
      planLimits = subscription.plan.limits as any
    }

    const limit = planLimits[limitName]
    if (limit === -1 || limit === 'unlimited') {
      return { allowed: true, current: 0, limit: -1 }
    }

    // Get current usage
    const usage = subscription?.usage || await prisma.subscriptionUsage.findFirst({
      where: { subscriptionId: subscription?.id },
    })

    const currentUsage = usage ? (usage as any)[limitName] || 0 : 0

    return {
      allowed: currentUsage < limit,
      current: currentUsage,
      limit,
    }
  }

  /**
   * Track usage
   */
  async trackUsage(userId: string, usageData: UsageData) {
    const subscription = await this.getUserSubscription(userId)

    if (!subscription) {
      throw new Error('No active subscription found')
    }

    const usage = await prisma.subscriptionUsage.findUnique({
      where: { subscriptionId: subscription.id },
    })

    if (!usage) {
      throw new Error('Usage record not found')
    }

    return await prisma.subscriptionUsage.update({
      where: { subscriptionId: subscription.id },
      data: {
        investments: usageData.investments !== undefined ? { increment: usageData.investments } : undefined,
        documents: usageData.documents !== undefined ? { increment: usageData.documents } : undefined,
        documentStorage: usageData.documentStorage !== undefined ? { increment: usageData.documentStorage } : undefined,
        apiCalls: usageData.apiCalls !== undefined ? { increment: usageData.apiCalls } : undefined,
      },
    })
  }

  /**
   * Reset usage for new billing period
   */
  async resetUsage(subscriptionId: string) {
    const subscription = await this.getSubscriptionById(subscriptionId)

    return await prisma.subscriptionUsage.update({
      where: { subscriptionId },
      data: {
        investments: 0,
        documents: 0,
        documentStorage: 0,
        apiCalls: 0,
        periodStart: new Date(),
        periodEnd: subscription.currentPeriodEnd,
      },
    })
  }

  /**
   * Get revenue metrics
   */
  async getRevenueMetrics() {
    const activeSubscriptions = await prisma.subscription.findMany({
      where: {
        status: {
          in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING],
        },
      },
      include: {
        plan: true,
      },
    })

    let monthlyRevenue = 0
    let annualRevenue = 0

    activeSubscriptions.forEach((sub) => {
      const price = Number(sub.plan.price)
      if (sub.plan.billingInterval === BillingInterval.MONTHLY) {
        monthlyRevenue += price
        annualRevenue += price * 12
      } else {
        monthlyRevenue += price / 12
        annualRevenue += price
      }
    })

    const totalSubscriptions = await prisma.subscription.count()
    const activeCount = activeSubscriptions.length
    const trialingCount = activeSubscriptions.filter(s => s.status === SubscriptionStatus.TRIALING).length
    const canceledCount = await prisma.subscription.count({
      where: { status: SubscriptionStatus.CANCELED },
    })

    return {
      mrr: Math.round(monthlyRevenue),
      arr: Math.round(annualRevenue),
      totalSubscriptions,
      activeSubscriptions: activeCount,
      trialingSubscriptions: trialingCount,
      canceledSubscriptions: canceledCount,
      averageRevenuePerUser: activeCount > 0 ? Math.round(monthlyRevenue / activeCount) : 0,
    }
  }

  /**
   * Process subscription renewal
   */
  async processRenewal(subscriptionId: string) {
    const subscription = await this.getSubscriptionById(subscriptionId)

    const now = new Date()
    const newPeriodEnd = new Date(subscription.currentPeriodEnd)

    if (subscription.plan.billingInterval === BillingInterval.MONTHLY) {
      newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1)
    } else {
      newPeriodEnd.setFullYear(newPeriodEnd.getFullYear() + 1)
    }

    // Update subscription period
    await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        currentPeriodStart: subscription.currentPeriodEnd,
        currentPeriodEnd: newPeriodEnd,
        status: subscription.cancelAtPeriodEnd ? SubscriptionStatus.CANCELED : SubscriptionStatus.ACTIVE,
      },
    })

    // Reset usage for new period
    await this.resetUsage(subscriptionId)

    // Create invoice
    await prisma.invoice.create({
      data: {
        subscriptionId,
        amount: subscription.plan.price,
        status: 'PAID',
        paidAt: now,
      },
    })

    return await this.getSubscriptionById(subscriptionId)
  }

  /**
   * Handle trial expiry
   */
  async handleTrialExpiry(subscriptionId: string) {
    const subscription = await this.getSubscriptionById(subscriptionId)

    if (subscription.status !== SubscriptionStatus.TRIALING) {
      throw new Error('Subscription is not in trial')
    }

    // Check if payment method is set up
    if (!subscription.stripePaymentMethodId) {
      // No payment method, cancel subscription
      return await this.updateSubscription(subscriptionId, {
        status: SubscriptionStatus.CANCELED,
        cancelReason: 'Trial ended without payment method',
      })
    }

    // Convert to active subscription
    return await this.updateSubscription(subscriptionId, {
      status: SubscriptionStatus.ACTIVE,
    })
  }

  /**
   * Get subscription plans
   */
  async getSubscriptionPlans() {
    return await prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    })
  }

  /**
   * Create or update subscription plan (admin only)
   */
  async upsertSubscriptionPlan(data: {
    id?: string
    name: string
    slug: string
    tier: PlanTier
    price: number
    billingInterval: BillingInterval
    features: Record<string, any>
    limits: Record<string, any>
    trialDays?: number
    description?: string
    highlightedText?: string
    stripePriceId?: string
    stripeProductId?: string
  }) {
    if (data.id) {
      return await prisma.subscriptionPlan.update({
        where: { id: data.id },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      })
    } else {
      return await prisma.subscriptionPlan.create({
        data: {
          ...data,
          isActive: true,
          displayOrder: 0,
        },
      })
    }
  }
}

export const subscriptionService = new SubscriptionService()
