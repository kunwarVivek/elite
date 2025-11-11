import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Check, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/onboarding/subscription')({
  component: OnboardingSubscriptionPage,
})

function OnboardingSubscriptionPage() {
  const navigate = useNavigate()
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'annual'>('monthly')
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)

  // Get user role from localStorage (set in role selection)
  const userRole = localStorage.getItem('onboarding_role') || 'INVESTOR'

  const plans = {
    monthly: [
      {
        id: 'free',
        name: 'Free',
        price: 0,
        description: 'Perfect for exploring the platform',
        features: [
          'Browse all deals',
          'Track up to 5 investments',
          'Basic portfolio view',
          '100MB document storage',
          'Community support',
        ],
        cta: 'Start Free',
        highlighted: false,
      },
      {
        id: 'pro-monthly',
        name: userRole === 'INVESTOR' ? 'Investor Pro' : 'Founder Pro',
        price: 49,
        description: userRole === 'INVESTOR'
          ? 'For active angel investors'
          : 'For founders raising capital',
        features: [
          'Everything in Free',
          'Unlimited investments',
          'SAFE & Convertible Notes',
          'Cap table management',
          'Dilution calculator',
          '5GB document storage',
          'Email support',
        ],
        cta: 'Start 14-Day Trial',
        highlighted: true,
        badge: 'Most Popular',
        trial: true,
      },
      {
        id: 'growth-monthly',
        name: userRole === 'INVESTOR' ? 'Growth' : 'Founder Growth',
        price: 199,
        description: 'Advanced features and analytics',
        features: [
          'Everything in Pro',
          'Waterfall analysis',
          'Advanced analytics',
          'Unlimited term sheets',
          '50GB document storage',
          'Priority support',
          'API access',
        ],
        cta: 'Start 14-Day Trial',
        highlighted: false,
        trial: true,
      },
    ],
    annual: [
      {
        id: 'free',
        name: 'Free',
        price: 0,
        description: 'Perfect for exploring the platform',
        features: [
          'Browse all deals',
          'Track up to 5 investments',
          'Basic portfolio view',
          '100MB document storage',
          'Community support',
        ],
        cta: 'Start Free',
        highlighted: false,
      },
      {
        id: 'pro-annual',
        name: userRole === 'INVESTOR' ? 'Investor Pro' : 'Founder Pro',
        price: 39,
        originalPrice: 49,
        description: userRole === 'INVESTOR'
          ? 'For active angel investors'
          : 'For founders raising capital',
        features: [
          'Everything in Free',
          'Unlimited investments',
          'SAFE & Convertible Notes',
          'Cap table management',
          'Dilution calculator',
          '5GB document storage',
          'Email support',
        ],
        cta: 'Start 14-Day Trial',
        highlighted: true,
        badge: 'Save 20%',
        trial: true,
      },
      {
        id: 'growth-annual',
        name: userRole === 'INVESTOR' ? 'Growth' : 'Founder Growth',
        price: 159,
        originalPrice: 199,
        description: 'Advanced features and analytics',
        features: [
          'Everything in Pro',
          'Waterfall analysis',
          'Advanced analytics',
          'Unlimited term sheets',
          '50GB document storage',
          'Priority support',
          'API access',
        ],
        cta: 'Start 14-Day Trial',
        highlighted: false,
        trial: true,
      },
    ],
  }

  const currentPlans = plans[billingInterval]

  const handleSelectPlan = (planId: string) => {
    setSelectedPlan(planId)

    // Store selected plan in localStorage
    localStorage.setItem('onboarding_plan', planId)

    // If free plan, skip payment and go to profile completion
    if (planId === 'free') {
      navigate({ to: '/onboarding/profile' })
    } else {
      // For paid plans, go to payment page
      navigate({ to: '/onboarding/payment' })
    }
  }

  const handleSkip = () => {
    // Default to free plan if skipped
    localStorage.setItem('onboarding_plan', 'free')
    navigate({ to: '/onboarding/profile' })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="container mx-auto px-6 py-12">
        {/* Progress Bar */}
        <div className="mx-auto mb-8 max-w-2xl">
          <div className="mb-2 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>Step 2 of 4</span>
            <span>50% Complete</span>
          </div>
          <Progress value={50} className="h-2" />
        </div>

        {/* Header */}
        <div className="mb-12 text-center">
          <div className="mb-4 flex items-center justify-center">
            <Sparkles className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="mb-4 text-4xl font-bold text-gray-900 dark:text-white">
            Choose Your Plan
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-300">
            Start with a free account or unlock advanced features with a 14-day trial.
            No credit card required to get started.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="mb-8 flex items-center justify-center gap-4">
          <span className={cn(
            'text-sm font-medium transition-colors',
            billingInterval === 'monthly' ? 'text-gray-900 dark:text-white' : 'text-gray-500'
          )}>
            Monthly
          </span>
          <button
            onClick={() => setBillingInterval(billingInterval === 'monthly' ? 'annual' : 'monthly')}
            className={cn(
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
              billingInterval === 'annual' ? 'bg-blue-600' : 'bg-gray-300'
            )}
          >
            <span className={cn(
              'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
              billingInterval === 'annual' ? 'translate-x-6' : 'translate-x-1'
            )}/>
          </button>
          <span className={cn(
            'text-sm font-medium transition-colors',
            billingInterval === 'annual' ? 'text-gray-900 dark:text-white' : 'text-gray-500'
          )}>
            Annual
          </span>
          {billingInterval === 'annual' && (
            <Badge className="bg-green-100 text-green-700">Save 20%</Badge>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="mx-auto mb-12 grid max-w-6xl gap-8 md:grid-cols-3">
          {currentPlans.map((plan) => (
            <Card
              key={plan.id}
              className={cn(
                'relative transition-all hover:shadow-xl',
                plan.highlighted && 'border-2 border-blue-600 shadow-lg'
              )}
            >
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="bg-blue-600 px-4 py-1 text-white">
                    {plan.badge}
                  </Badge>
                </div>
              )}

              <CardHeader>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-gray-900 dark:text-white">
                      ${plan.price}
                    </span>
                    {plan.originalPrice && (
                      <span className="text-lg text-gray-500 line-through">
                        ${plan.originalPrice}
                      </span>
                    )}
                    <span className="text-gray-600 dark:text-gray-400">
                      /{billingInterval === 'monthly' ? 'mo' : 'mo'}
                    </span>
                  </div>
                  {billingInterval === 'annual' && plan.price > 0 && (
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      Billed ${plan.price * 12} annually
                    </p>
                  )}
                  {plan.trial && (
                    <p className="mt-2 text-sm font-medium text-blue-600">
                      14-day free trial • No credit card required
                    </p>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handleSelectPlan(plan.id)}
                  className={cn(
                    'w-full',
                    plan.highlighted && 'bg-blue-600 hover:bg-blue-700'
                  )}
                  variant={plan.highlighted ? 'default' : 'outline'}
                  size="lg"
                >
                  {plan.cta}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Features Comparison Note */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            Need help choosing? Check out our{' '}
            <a href="/pricing" className="text-blue-600 hover:underline">
              detailed pricing comparison
            </a>
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            All plans include bank-level security, data encryption, and compliance with financial regulations.
            Cancel anytime with no long-term commitments.
          </p>
        </div>

        {/* Navigation */}
        <div className="mx-auto mt-12 flex max-w-2xl items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate({ to: '/onboarding/role' })}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button
            variant="ghost"
            onClick={handleSkip}
          >
            Skip for now
          </Button>
        </div>
      </div>
    </div>
  )
}
