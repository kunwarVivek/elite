import { loadStripe, Stripe } from '@stripe/stripe-js'

/**
 * Stripe Initialization
 *
 * This module handles Stripe.js initialization with lazy loading.
 * The Stripe object is created once and reused across the application.
 *
 * Environment Variable Required:
 * VITE_STRIPE_PUBLISHABLE_KEY - Your Stripe publishable key (pk_test_... or pk_live_...)
 */

let stripePromise: Promise<Stripe | null> | null = null

/**
 * Get or initialize Stripe instance
 *
 * @returns Promise resolving to Stripe instance or null
 * @throws Error if VITE_STRIPE_PUBLISHABLE_KEY is not configured
 *
 * @example
 * ```typescript
 * import { getStripe } from '@/lib/stripe'
 *
 * const stripe = await getStripe()
 * if (stripe) {
 *   // Use Stripe
 * }
 * ```
 */
export const getStripe = (): Promise<Stripe | null> => {
  if (!stripePromise) {
    const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY

    if (!publishableKey) {
      console.error('VITE_STRIPE_PUBLISHABLE_KEY is not defined in environment variables')
      throw new Error(
        'Stripe publishable key is not configured. Please add VITE_STRIPE_PUBLISHABLE_KEY to your .env.local file.'
      )
    }

    // Validate key format
    if (!publishableKey.startsWith('pk_')) {
      console.error('Invalid Stripe publishable key format:', publishableKey)
      throw new Error(
        'Invalid Stripe publishable key. Key must start with "pk_test_" or "pk_live_".'
      )
    }

    // Initialize Stripe
    stripePromise = loadStripe(publishableKey)
  }

  return stripePromise
}

/**
 * Reset Stripe instance (useful for testing)
 */
export const resetStripe = (): void => {
  stripePromise = null
}

/**
 * Check if Stripe is configured
 *
 * @returns true if VITE_STRIPE_PUBLISHABLE_KEY is set
 */
export const isStripeConfigured = (): boolean => {
  const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
  return Boolean(publishableKey && publishableKey.startsWith('pk_'))
}

/**
 * Get Stripe publishable key
 *
 * @returns Stripe publishable key or undefined
 */
export const getStripePublishableKey = (): string | undefined => {
  return import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
}
