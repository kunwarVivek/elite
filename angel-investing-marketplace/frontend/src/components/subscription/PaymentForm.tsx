import React, { useState } from 'react'
import { PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CreditCard, Lock, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PaymentFormProps {
  /**
   * Callback when payment setup is successful
   */
  onSuccess: (paymentMethodId?: string) => void

  /**
   * Callback when payment setup fails
   */
  onError: (error: string) => void

  /**
   * Optional return URL after payment confirmation
   * Defaults to current origin + '/onboarding/success'
   */
  returnUrl?: string

  /**
   * Submit button text
   */
  submitButtonText?: string

  /**
   * Show header with security badges
   */
  showHeader?: boolean

  /**
   * Additional CSS classes for the form container
   */
  className?: string

  /**
   * Loading state (external control)
   */
  isLoading?: boolean
}

/**
 * PaymentForm Component
 *
 * A secure payment form using Stripe Elements to collect payment method details.
 * This component uses SetupIntent for saving payment methods without charging.
 *
 * @example
 * ```tsx
 * import { Elements } from '@stripe/react-stripe-js'
 * import { getStripe } from '@/lib/stripe'
 * import { PaymentForm } from '@/components/subscription/PaymentForm'
 *
 * function PaymentPage() {
 *   const [clientSecret, setClientSecret] = useState<string>('')
 *
 *   // Create SetupIntent on mount
 *   useEffect(() => {
 *     createSetupIntent().then(({ clientSecret }) => {
 *       setClientSecret(clientSecret)
 *     })
 *   }, [])
 *
 *   if (!clientSecret) return <div>Loading...</div>
 *
 *   return (
 *     <Elements stripe={getStripe()} options={{ clientSecret }}>
 *       <PaymentForm
 *         onSuccess={() => console.log('Payment method saved!')}
 *         onError={(error) => console.error(error)}
 *       />
 *     </Elements>
 *   )
 * }
 * ```
 */
export function PaymentForm({
  onSuccess,
  onError,
  returnUrl,
  submitButtonText = 'Save Payment Method',
  showHeader = true,
  className,
  isLoading: externalLoading = false,
}: PaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const isLoading = isProcessing || externalLoading

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      // Stripe.js hasn't yet loaded
      return
    }

    setIsProcessing(true)
    setErrorMessage(null)

    try {
      // Confirm the SetupIntent with the payment details
      const { error, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: returnUrl || `${window.location.origin}/onboarding/success`,
        },
        redirect: 'if_required', // Only redirect if required by payment method
      })

      if (error) {
        // This point will only be reached if there is an immediate error when
        // confirming the setup. Otherwise, your customer will be redirected to
        // your `return_url`. For some payment methods like iDEAL, your customer will
        // be redirected to an intermediate site first to authorize the payment, then
        // redirected to the `return_url`.
        const message = error.message || 'An unexpected error occurred.'
        setErrorMessage(message)
        onError(message)
      } else if (setupIntent && setupIntent.status === 'succeeded') {
        // Payment method successfully saved
        onSuccess(setupIntent.payment_method as string)
      } else {
        // Handle other statuses if needed
        onSuccess()
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.'
      setErrorMessage(message)
      onError(message)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-6', className)}>
      {showHeader && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Payment Information</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="h-4 w-4" />
              <span>Secure Payment</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Your payment information is encrypted and secure. You won't be charged until your trial
            ends.
          </p>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      {/* Stripe Payment Element */}
      <div className="rounded-lg border bg-card p-4">
        <PaymentElement
          options={{
            layout: 'tabs',
            paymentMethodOrder: ['card', 'us_bank_account'],
          }}
        />
      </div>

      {/* Trust Badges */}
      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Lock className="h-3 w-3" />
          <span>256-bit SSL</span>
        </div>
        <div className="h-3 w-px bg-border" />
        <div className="flex items-center gap-1">
          <CreditCard className="h-3 w-3" />
          <span>PCI Compliant</span>
        </div>
        <div className="h-3 w-px bg-border" />
        <span>Powered by Stripe</span>
      </div>

      {/* Submit Button */}
      <Button type="submit" disabled={!stripe || isLoading} className="w-full" size="lg">
        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {isLoading ? 'Processing...' : submitButtonText}
      </Button>

      {/* Disclaimer */}
      <p className="text-center text-xs text-muted-foreground">
        By providing your payment information, you agree to our terms and authorize us to charge your
        payment method after your free trial ends.
      </p>
    </form>
  )
}

/**
 * PaymentFormSkeleton
 *
 * Loading skeleton for the payment form
 */
export function PaymentFormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-6 w-48 animate-pulse rounded bg-muted" />
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
      </div>
      <div className="h-48 animate-pulse rounded-lg border bg-muted" />
      <div className="h-10 w-full animate-pulse rounded bg-muted" />
    </div>
  )
}
