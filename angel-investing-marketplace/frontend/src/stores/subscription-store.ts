import { create } from 'zustand'
import {
  subscriptionApi,
  Subscription,
  SubscriptionPlan,
  RevenueMetrics,
} from '@/lib/subscription-api'

interface SubscriptionStore {
  // State
  subscription: Subscription | null
  plans: SubscriptionPlan[]
  revenueMetrics: RevenueMetrics | null
  isLoading: boolean
  error: string | null

  // Actions
  fetchSubscription: () => Promise<void>
  fetchPlans: () => Promise<void>
  fetchRevenueMetrics: () => Promise<void>
  createSubscription: (planId: string) => Promise<void>
  cancelSubscription: (cancelReason?: string, immediate?: boolean) => Promise<void>
  reactivateSubscription: () => Promise<void>
  checkFeatureAccess: (featureName: string) => Promise<boolean>
  checkUsageLimit: (limitName: string) => Promise<{ allowed: boolean; current: number; limit: number }>
  trackUsage: (usage: {
    investments?: number
    documents?: number
    documentStorage?: number
    apiCalls?: number
  }) => Promise<void>
  setError: (error: string | null) => void
  clearError: () => void
  reset: () => void
}

const initialState = {
  subscription: null,
  plans: [],
  revenueMetrics: null,
  isLoading: false,
  error: null,
}

export const useSubscriptionStore = create<SubscriptionStore>((set, get) => ({
  ...initialState,

  fetchSubscription: async () => {
    set({ isLoading: true, error: null })
    try {
      const subscription = await subscriptionApi.getMy()
      set({ subscription, isLoading: false })
    } catch (error: any) {
      const errorMsg = subscriptionApi.handleError(error).message
      set({ error: errorMsg, isLoading: false })
      throw error
    }
  },

  fetchPlans: async () => {
    set({ isLoading: true, error: null })
    try {
      const plans = await subscriptionApi.getPlans()
      set({ plans, isLoading: false })
    } catch (error: any) {
      const errorMsg = subscriptionApi.handleError(error).message
      set({ error: errorMsg, isLoading: false })
      throw error
    }
  },

  fetchRevenueMetrics: async () => {
    set({ isLoading: true, error: null })
    try {
      const revenueMetrics = await subscriptionApi.getMetrics()
      set({ revenueMetrics, isLoading: false })
    } catch (error: any) {
      const errorMsg = subscriptionApi.handleError(error).message
      set({ error: errorMsg, isLoading: false })
      throw error
    }
  },

  createSubscription: async (planId: string) => {
    set({ isLoading: true, error: null })
    try {
      const subscription = await subscriptionApi.create({ planId })
      set({ subscription, isLoading: false })
    } catch (error: any) {
      const errorMsg = subscriptionApi.handleError(error).message
      set({ error: errorMsg, isLoading: false })
      throw error
    }
  },

  cancelSubscription: async (cancelReason?: string, immediate: boolean = false) => {
    const { subscription } = get()
    if (!subscription) {
      throw new Error('No active subscription')
    }

    set({ isLoading: true, error: null })
    try {
      const updatedSubscription = await subscriptionApi.cancel(
        subscription.id,
        cancelReason,
        immediate
      )
      set({ subscription: updatedSubscription, isLoading: false })
    } catch (error: any) {
      const errorMsg = subscriptionApi.handleError(error).message
      set({ error: errorMsg, isLoading: false })
      throw error
    }
  },

  reactivateSubscription: async () => {
    const { subscription } = get()
    if (!subscription) {
      throw new Error('No subscription to reactivate')
    }

    set({ isLoading: true, error: null })
    try {
      const updatedSubscription = await subscriptionApi.reactivate(subscription.id)
      set({ subscription: updatedSubscription, isLoading: false })
    } catch (error: any) {
      const errorMsg = subscriptionApi.handleError(error).message
      set({ error: errorMsg, isLoading: false })
      throw error
    }
  },

  checkFeatureAccess: async (featureName: string): Promise<boolean> => {
    try {
      return await subscriptionApi.checkFeature(featureName)
    } catch (error: any) {
      console.error('Error checking feature access:', error)
      return false
    }
  },

  checkUsageLimit: async (limitName: string) => {
    try {
      return await subscriptionApi.checkLimit(limitName)
    } catch (error: any) {
      console.error('Error checking usage limit:', error)
      throw error
    }
  },

  trackUsage: async (usage) => {
    try {
      await subscriptionApi.trackUsage(usage)
      // Optionally refresh subscription to get updated usage
      await get().fetchSubscription()
    } catch (error: any) {
      console.error('Error tracking usage:', error)
      // Don't throw - usage tracking is non-critical
    }
  },

  setError: (error: string | null) => {
    set({ error })
  },

  clearError: () => {
    set({ error: null })
  },

  reset: () => {
    set(initialState)
  },
}))

// Selector hooks for common use cases
export const useCurrentSubscription = () => useSubscriptionStore((state) => state.subscription)
export const useSubscriptionPlans = () => useSubscriptionStore((state) => state.plans)
export const useRevenueMetrics = () => useSubscriptionStore((state) => state.revenueMetrics)
export const useSubscriptionLoading = () => useSubscriptionStore((state) => state.isLoading)
export const useSubscriptionError = () => useSubscriptionStore((state) => state.error)

// Helper hooks
export const useSubscriptionStatus = () => {
  const subscription = useCurrentSubscription()
  return subscriptionApi.getStatus(subscription || undefined)
}

export const useIsFeatureAvailable = (featureName: string) => {
  const checkFeature = useSubscriptionStore((state) => state.checkFeatureAccess)
  return () => checkFeature(featureName)
}

export const useCanPerformAction = (limitName: string) => {
  const checkLimit = useSubscriptionStore((state) => state.checkUsageLimit)
  return async () => {
    const result = await checkLimit(limitName)
    return result.allowed
  }
}
