import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Elements } from '@stripe/react-stripe-js'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Lock, CreditCard, Shield, ArrowRight, AlertCircle } from 'lucide-react'
import { getStripe, isStripeConfigured } from '@/lib/stripe'
import { PaymentForm, PaymentFormSkeleton } from '@/components/subscription/PaymentForm'
import { subscriptionApi } from '@/lib/subscription-api'

export const Route = createFileRoute('/onboarding/payment')({
  component: OnboardingPaymentPage,
})

function OnboardingPaymentPage() {
  const navigate = useNavigate()
  const [isProcessing, setIsProcessing] = useState(false)
  const [setupMethod, setSetupMethod] = useState<'now' | 'later'>('later')
  const [clientSecret, setClientSecret] = useState<string>('')
  const [setupIntentLoading, setSetupIntentLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check if Stripe is configured
  const stripeConfigured = isStripeConfigured()

  // Get selected plan from localStorage
  const selectedPlanId = localStorage.getItem('onboarding_plan') || 'free'

  // Parse plan details
  const getPlanDetails = (planId: string) => {
    if (planId === 'free') {
      return { name: 'Free', price: 0, trial: false }
    } else if (planId.includes('pro')) {
      return {
        name: 'Pro',
        price: planId.includes('annual') ? 39 : 49,
        billing: planId.includes('annual') ? 'annual' : 'monthly',
        trial: true
      }
    } else if (planId.includes('growth')) {
      return {
        name: 'Growth',
        price: planId.includes('annual') ? 159 : 199,
        billing: planId.includes('annual') ? 'annual' : 'monthly',
        trial: true
      }
    }
    return { name: 'Unknown', price: 0, trial: false }
  }

  const plan = getPlanDetails(selectedPlanId)

  // Create SetupIntent when user chooses to add payment now
  useEffect(() => {
    if (setupMethod === 'now' && stripeConfigured && !clientSecret && selectedPlanId !== 'free') {
      const createSetupIntent = async () => {
        setSetupIntentLoading(true)
        setError(null)
        try {
          const { clientSecret: secret } = await subscriptionApi.createSetupIntent()
          setClientSecret(secret)
        } catch (err) {
          console.error('Error creating SetupIntent:', err)
          setError('Failed to initialize payment form. Please try again.')
        } finally {
          setSetupIntentLoading(false)
        }
      }

      createSetupIntent()
    }
  }, [setupMethod, stripeConfigured, clientSecret, selectedPlanId])

  const handlePaymentSuccess = async (paymentMethodId?: string) => {
    // Payment method saved successfully
    localStorage.setItem('trial_started', 'true')
    localStorage.setItem('trial_start_date', new Date().toISOString())
    if (paymentMethodId) {
      localStorage.setItem('payment_method_added', 'true')
    }

    // Navigate to profile completion
    navigate({ to: '/onboarding/profile' })
  }

  const handlePaymentError = (errorMessage: string) => {
    setError(errorMessage)
  }

  const handleSetupPaymentLater = () => {
    // Start trial without payment method
    localStorage.setItem('trial_started', 'true')
    localStorage.setItem('trial_start_date', new Date().toISOString())
    localStorage.setItem('payment_setup_deferred', 'true')

    navigate({ to: '/onboarding/profile' })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="container mx-auto px-6 py-12">
        {/* Progress Bar */}
        <div className="mx-auto mb-8 max-w-2xl">
          <div className="mb-2 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>Step 3 of 4</span>
            <span>75% Complete</span>
          </div>
          <Progress value={75} className="h-2" />
        </div>

        {/* Header */}
        <div className="mb-12 text-center">
          <div className="mb-4 flex items-center justify-center">
            <Lock className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="mb-4 text-4xl font-bold text-gray-900 dark:text-white">
            Start Your Free Trial
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-300">
            Get full access to {plan.name} features for 14 days. No charges until trial ends.
          </p>
        </div>

        <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
          {/* Left: Plan Summary */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Plan Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Selected Plan</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">{plan.name}</div>
                </div>

                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Trial Period</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">14 Days Free</div>
                </div>

                <div className="border-t pt-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">After Trial</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    ${plan.price}
                    <span className="text-sm font-normal text-gray-600">
                      /{plan.billing === 'annual' ? 'month' : 'month'}
                    </span>
                  </div>
                  {plan.billing === 'annual' && (
                    <div className="mt-1 text-xs text-gray-500">
                      Billed ${plan.price * 12} annually
                    </div>
                  )}
                </div>

                <div className="rounded-lg bg-green-50 p-3 text-sm dark:bg-green-900/20">
                  <div className="font-medium text-green-900 dark:text-green-300">What's Included:</div>
                  <ul className="mt-2 space-y-1 text-green-700 dark:text-green-400">
                    <li>✓ Unlimited investments</li>
                    <li>✓ SAFE & Convertible Notes</li>
                    <li>✓ Cap table management</li>
                    <li>✓ Email support</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Trust Badges */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-green-600" />
                    <span className="text-gray-700 dark:text-gray-300">256-bit SSL encryption</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-green-600" />
                    <span className="text-gray-700 dark:text-gray-300">PCI DSS compliant</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-green-600" />
                    <span className="text-gray-700 dark:text-gray-300">Cancel anytime</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Payment Form / Trial Options */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Trial Setup</CardTitle>
                <CardDescription>
                  Choose how you'd like to start your 14-day free trial
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Option 1: Setup Payment Now */}
                <div
                  className={`cursor-pointer rounded-lg border-2 p-4 transition-all ${
                    setupMethod === 'now'
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSetupMethod('now')}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      checked={setupMethod === 'now'}
                      onChange={() => setSetupMethod('now')}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        Add payment method now
                      </div>
                      <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Save time by adding your payment details now. You won't be charged until the trial ends.
                      </div>
                    </div>
                  </div>

                  {setupMethod === 'now' && (
                    <div className="mt-4 space-y-4 border-t pt-4">
                      {!stripeConfigured && (
                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            Payment integration is not configured. Please contact support or continue without adding a payment method.
                          </AlertDescription>
                        </Alert>
                      )}

                      {error && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{error}</AlertDescription>
                        </Alert>
                      )}

                      {stripeConfigured && selectedPlanId !== 'free' && (
                        <>
                          {setupIntentLoading || !clientSecret ? (
                            <PaymentFormSkeleton />
                          ) : (
                            <Elements
                              stripe={getStripe()}
                              options={{
                                clientSecret,
                                appearance: {
                                  theme: 'stripe',
                                },
                              }}
                            >
                              <PaymentForm
                                onSuccess={handlePaymentSuccess}
                                onError={handlePaymentError}
                                submitButtonText="Save & Start Trial"
                                showHeader={false}
                              />
                            </Elements>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Option 2: Setup Payment Later */}
                <div
                  className={`cursor-pointer rounded-lg border-2 p-4 transition-all ${
                    setupMethod === 'later'
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSetupMethod('later')}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      checked={setupMethod === 'later'}
                      onChange={() => setSetupMethod('later')}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 dark:text-white">
                        I'll add payment later
                      </div>
                      <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        Start your trial now and add payment details anytime before it ends.
                        We'll remind you 3 days before trial expiry.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Trial Info */}
                <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                  <div className="text-sm text-blue-900 dark:text-blue-300">
                    <strong>Free Trial Details:</strong>
                    <ul className="mt-2 space-y-1">
                      <li>• Full access to all {plan.name} features for 14 days</li>
                      <li>• Cancel anytime during trial at no cost</li>
                      <li>• After trial, only ${plan.price}/month</li>
                      <li>• We'll email you 3 days before trial ends</li>
                    </ul>
                  </div>
                </div>

                {/* Action Buttons - Only show for "later" option */}
                {setupMethod === 'later' && (
                  <div className="flex gap-3">
                    <Button
                      onClick={handleSetupPaymentLater}
                      disabled={isProcessing}
                      className="flex-1"
                      size="lg"
                    >
                      {isProcessing ? (
                        'Setting up trial...'
                      ) : (
                        <>
                          Start Free Trial
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                )}

                <p className="text-center text-xs text-gray-500">
                  By starting your trial, you agree to our{' '}
                  <a href="/terms" className="underline">Terms of Service</a> and{' '}
                  <a href="/privacy" className="underline">Privacy Policy</a>
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Navigation */}
        <div className="mx-auto mt-12 flex max-w-5xl items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate({ to: '/onboarding/subscription' })}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Plans
          </Button>
          <Button
            variant="ghost"
            onClick={handleSetupPaymentLater}
          >
            Skip payment setup
          </Button>
        </div>
      </div>
    </div>
  )
}
