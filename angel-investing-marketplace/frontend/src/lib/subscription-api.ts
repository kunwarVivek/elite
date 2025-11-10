import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export interface SubscriptionPlan {
  id: string
  name: string
  slug: string
  tier: 'FREE' | 'PRO' | 'GROWTH' | 'ENTERPRISE'
  price: number
  billingInterval: 'MONTHLY' | 'ANNUAL'
  features: Record<string, any>
  limits: Record<string, any>
  trialDays: number
  description?: string
  highlightedText?: string
  stripePriceId?: string
  stripeProductId?: string
  displayOrder: number
  isActive: boolean
}

export interface Subscription {
  id: string
  userId: string
  planId: string
  status: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'UNPAID'
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  canceledAt?: string
  cancelReason?: string
  stripeSubscriptionId?: string
  stripeCustomerId?: string
  trialStart?: string
  trialEnd?: string
  plan: SubscriptionPlan
  usage?: SubscriptionUsage
}

export interface SubscriptionUsage {
  investments: number
  documents: number
  documentStorage: number
  apiCalls: number
  periodStart: string
  periodEnd: string
}

export interface CreateSubscriptionData {
  planId: string
  stripeSubscriptionId?: string
  stripeCustomerId?: string
  stripePaymentMethodId?: string
  trialDays?: number
}

export interface UsageLimitCheck {
  allowed: boolean
  current: number
  limit: number
}

export interface RevenueMetrics {
  mrr: number
  arr: number
  totalSubscriptions: number
  activeSubscriptions: number
  trialingSubscriptions: number
  canceledSubscriptions: number
  averageRevenuePerUser: number
}

// Subscription Plans
export const getSubscriptionPlans = async (): Promise<SubscriptionPlan[]> => {
  const response = await api.get('/subscription-plans')
  return response.data.plans
}

// User Subscription
export const getMySubscription = async (): Promise<Subscription> => {
  const response = await api.get('/subscriptions/me')
  return response.data.subscription
}

export const createSubscription = async (data: CreateSubscriptionData): Promise<Subscription> => {
  const response = await api.post('/subscriptions', data)
  return response.data.subscription
}

export const updateSubscription = async (
  id: string,
  data: {
    planId?: string
    status?: string
    cancelAtPeriodEnd?: boolean
  }
): Promise<Subscription> => {
  const response = await api.patch(`/subscriptions/${id}`, data)
  return response.data.subscription
}

export const cancelSubscription = async (
  id: string,
  cancelReason?: string,
  immediate: boolean = false
): Promise<Subscription> => {
  const response = await api.post(`/subscriptions/${id}/cancel`, {
    cancelReason,
    immediate,
  })
  return response.data.subscription
}

export const reactivateSubscription = async (id: string): Promise<Subscription> => {
  const response = await api.post(`/subscriptions/${id}/reactivate`)
  return response.data.subscription
}

// Feature Access
export const checkFeatureAccess = async (featureName: string): Promise<boolean> => {
  const response = await api.get(`/subscriptions/check-feature/${featureName}`)
  return response.data.hasAccess
}

export const checkUsageLimit = async (limitName: string): Promise<UsageLimitCheck> => {
  const response = await api.get(`/subscriptions/check-limit/${limitName}`)
  return response.data
}

export const trackUsage = async (usage: {
  investments?: number
  documents?: number
  documentStorage?: number
  apiCalls?: number
}): Promise<SubscriptionUsage> => {
  const response = await api.post('/subscriptions/track-usage', usage)
  return response.data.usage
}

// Admin endpoints
export const getAllSubscriptions = async (filters?: {
  status?: string
  planTier?: string
  limit?: number
  offset?: number
}): Promise<{ subscriptions: Subscription[]; total: number }> => {
  const response = await api.get('/subscriptions', { params: filters })
  return response.data
}

export const getRevenueMetrics = async (): Promise<RevenueMetrics> => {
  const response = await api.get('/subscriptions/metrics/revenue')
  return response.data.metrics
}

// Helper functions
export const isFeatureAvailable = async (featureName: string): Promise<boolean> => {
  try {
    return await checkFeatureAccess(featureName)
  } catch (error) {
    console.error('Error checking feature access:', error)
    return false
  }
}

export const canPerformAction = async (limitName: string): Promise<boolean> => {
  try {
    const result = await checkUsageLimit(limitName)
    return result.allowed
  } catch (error) {
    console.error('Error checking usage limit:', error)
    return false
  }
}

export const getSubscriptionStatus = (subscription?: Subscription): {
  isActive: boolean
  isTrialing: boolean
  isCanceled: boolean
  isPastDue: boolean
  daysLeftInTrial?: number
} => {
  if (!subscription) {
    return {
      isActive: false,
      isTrialing: false,
      isCanceled: false,
      isPastDue: false,
    }
  }

  const isTrialing = subscription.status === 'TRIALING'
  let daysLeftInTrial: number | undefined

  if (isTrialing && subscription.trialEnd) {
    const trialEnd = new Date(subscription.trialEnd)
    const now = new Date()
    const diffMs = trialEnd.getTime() - now.getTime()
    daysLeftInTrial = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  }

  return {
    isActive: subscription.status === 'ACTIVE',
    isTrialing,
    isCanceled: subscription.status === 'CANCELED',
    isPastDue: subscription.status === 'PAST_DUE',
    daysLeftInTrial,
  }
}

export const formatPrice = (price: number, billingInterval: string): string => {
  const interval = billingInterval === 'ANNUAL' ? 'year' : 'month'
  return `$${price}/${interval}`
}

export const getPlanDisplayName = (tier: string): string => {
  switch (tier) {
    case 'FREE':
      return 'Free'
    case 'PRO':
      return 'Pro'
    case 'GROWTH':
      return 'Growth'
    case 'ENTERPRISE':
      return 'Enterprise'
    default:
      return tier
  }
}

// Error handler helper
export const handleSubscriptionError = (error: any): {
  message: string
  upgradeRequired: boolean
  code?: string
} => {
  if (axios.isAxiosError(error) && error.response) {
    const data = error.response.data
    return {
      message: data.message || data.error || 'An error occurred',
      upgradeRequired: data.upgradeRequired || false,
      code: data.error,
    }
  }

  return {
    message: 'An unexpected error occurred',
    upgradeRequired: false,
  }
}

// Export subscription API object
export const subscriptionApi = {
  // Plans
  getPlans: getSubscriptionPlans,

  // User subscription
  getMy: getMySubscription,
  create: createSubscription,
  update: updateSubscription,
  cancel: cancelSubscription,
  reactivate: reactivateSubscription,

  // Feature access
  checkFeature: checkFeatureAccess,
  checkLimit: checkUsageLimit,
  trackUsage,

  // Admin
  getAll: getAllSubscriptions,
  getMetrics: getRevenueMetrics,

  // Helpers
  isFeatureAvailable,
  canPerformAction,
  getStatus: getSubscriptionStatus,
  formatPrice,
  getPlanName: getPlanDisplayName,
  handleError: handleSubscriptionError,
}

export default subscriptionApi
