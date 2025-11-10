import { Request, Response, NextFunction } from 'express'
import { subscriptionService } from '../services/subscription.service'

/**
 * Middleware to check if user has access to a specific feature
 * Usage: featureGate('safeAgreements')
 */
export const featureGate = (featureName: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const hasAccess = await subscriptionService.checkFeatureAccess(userId, featureName)

      if (!hasAccess) {
        return res.status(403).json({
          error: 'Feature not available',
          message: `Your current plan doesn't include access to ${featureName}. Please upgrade to unlock this feature.`,
          feature: featureName,
          upgradeRequired: true,
        })
      }

      next()
    } catch (error: any) {
      console.error('Error in feature gate middleware:', error)
      res.status(500).json({ error: 'Failed to verify feature access' })
    }
  }
}

/**
 * Middleware to check if user has reached a usage limit
 * Usage: usageLimit('investments')
 */
export const usageLimit = (limitName: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const { allowed, current, limit } = await subscriptionService.checkUsageLimit(userId, limitName)

      if (!allowed) {
        return res.status(403).json({
          error: 'Usage limit reached',
          message: `You've reached your ${limitName} limit (${current}/${limit}). Please upgrade your plan for unlimited access.`,
          limitName,
          current,
          limit,
          upgradeRequired: true,
        })
      }

      // Attach usage info to request for tracking
      req.usageInfo = { limitName, current, limit }

      next()
    } catch (error: any) {
      console.error('Error in usage limit middleware:', error)
      res.status(500).json({ error: 'Failed to verify usage limit' })
    }
  }
}

/**
 * Middleware to require a minimum subscription tier
 * Usage: requireTier('PRO')
 */
export const requireTier = (minTier: 'FREE' | 'PRO' | 'GROWTH' | 'ENTERPRISE') => {
  const tierHierarchy = {
    FREE: 0,
    PRO: 1,
    GROWTH: 2,
    ENTERPRISE: 3,
  }

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const subscription = await subscriptionService.getUserSubscription(userId)

      if (!subscription) {
        // No subscription means free tier
        if (minTier === 'FREE') {
          return next()
        }

        return res.status(403).json({
          error: 'Subscription required',
          message: `This feature requires at least a ${minTier} subscription.`,
          minimumTier: minTier,
          currentTier: 'FREE',
          upgradeRequired: true,
        })
      }

      const userTier = subscription.plan.tier
      const userTierLevel = tierHierarchy[userTier]
      const requiredTierLevel = tierHierarchy[minTier]

      if (userTierLevel < requiredTierLevel) {
        return res.status(403).json({
          error: 'Insufficient subscription tier',
          message: `This feature requires at least a ${minTier} subscription. You are currently on ${userTier}.`,
          minimumTier: minTier,
          currentTier: userTier,
          upgradeRequired: true,
        })
      }

      next()
    } catch (error: any) {
      console.error('Error in require tier middleware:', error)
      res.status(500).json({ error: 'Failed to verify subscription tier' })
    }
  }
}

/**
 * Middleware to track usage after successful operation
 * Should be used after the main route handler
 * Usage: trackUsageAfter('investments', 1)
 */
export const trackUsageAfter = (limitName: string, increment: number = 1) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id

      if (!userId) {
        return next()
      }

      // Track usage asynchronously (don't block response)
      subscriptionService.trackUsage(userId, {
        [limitName]: increment,
      }).catch((error) => {
        console.error('Error tracking usage:', error)
      })

      next()
    } catch (error: any) {
      console.error('Error in track usage middleware:', error)
      // Don't block the request if tracking fails
      next()
    }
  }
}

/**
 * Middleware to check if user's subscription is active
 */
export const requireActiveSubscription = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const subscription = await subscriptionService.getUserSubscription(userId)

    if (!subscription) {
      return res.status(403).json({
        error: 'No active subscription',
        message: 'You need an active subscription to access this feature.',
        upgradeRequired: true,
      })
    }

    // Check if subscription is in good standing
    const validStatuses = ['ACTIVE', 'TRIALING']
    if (!validStatuses.includes(subscription.status)) {
      return res.status(403).json({
        error: 'Subscription not active',
        message: `Your subscription is ${subscription.status}. Please update your payment method or contact support.`,
        status: subscription.status,
      })
    }

    // Attach subscription to request for use in route handler
    req.subscription = subscription

    next()
  } catch (error: any) {
    console.error('Error in require active subscription middleware:', error)
    res.status(500).json({ error: 'Failed to verify subscription status' })
  }
}

/**
 * Middleware to check if user is within trial period
 */
export const requireTrial = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const subscription = await subscriptionService.getUserSubscription(userId)

    if (!subscription || subscription.status !== 'TRIALING') {
      return res.status(403).json({
        error: 'Not in trial',
        message: 'This feature is only available during trial period.',
      })
    }

    next()
  } catch (error: any) {
    console.error('Error in require trial middleware:', error)
    res.status(500).json({ error: 'Failed to verify trial status' })
  }
}

/**
 * Combine multiple feature checks
 * Usage: combineGates(featureGate('safeAgreements'), usageLimit('investments'))
 */
export const combineGates = (...middlewares: any[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    let index = 0

    const runNext = async () => {
      if (index >= middlewares.length) {
        return next()
      }

      const middleware = middlewares[index]
      index++

      await middleware(req, res, runNext)
    }

    await runNext()
  }
}

// Extend Express Request type to include subscription and usage info
declare global {
  namespace Express {
    interface Request {
      subscription?: any
      usageInfo?: {
        limitName: string
        current: number
        limit: number
      }
    }
  }
}
