import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Check, X, ArrowRight, Zap, Shield, Star } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/pricing')({
  component: PricingPage,
})

const plans = {
  monthly: [
    {
      name: 'Free',
      price: 0,
      description: 'Perfect for exploring the platform',
      features: {
        'Browse Deals': true,
        'Investment Tracking': '5 investments max',
        'SAFE Agreements': false,
        'Convertible Notes': false,
        'Cap Table Management': false,
        'Dilution Calculator': false,
        'Waterfall Analysis': false,
        'Term Sheet Templates': false,
        'Investor Rights Tracking': false,
        'Document Storage': '100 MB',
        'Portfolio Analytics': 'Basic',
        'Support': 'Community',
        'API Access': false,
      },
      cta: 'Start Free',
      highlighted: false,
    },
    {
      name: 'Investor Pro',
      price: 49,
      description: 'For active angel investors',
      features: {
        'Browse Deals': true,
        'Investment Tracking': 'Unlimited',
        'SAFE Agreements': true,
        'Convertible Notes': true,
        'Cap Table Management': 'Basic',
        'Dilution Calculator': true,
        'Waterfall Analysis': false,
        'Term Sheet Templates': '3 per year',
        'Investor Rights Tracking': true,
        'Document Storage': '5 GB',
        'Portfolio Analytics': 'Advanced',
        'Support': 'Email',
        'API Access': false,
      },
      cta: 'Start 14-Day Trial',
      highlighted: true,
      badge: 'Most Popular',
    },
    {
      name: 'Founder Growth',
      price: 199,
      description: 'For startups raising capital',
      features: {
        'Browse Deals': true,
        'Investment Tracking': 'Unlimited',
        'SAFE Agreements': true,
        'Convertible Notes': true,
        'Cap Table Management': 'Advanced',
        'Dilution Calculator': true,
        'Waterfall Analysis': true,
        'Term Sheet Templates': 'Unlimited',
        'Investor Rights Tracking': true,
        'Document Storage': '50 GB',
        'Portfolio Analytics': 'Advanced',
        'Support': 'Email + Chat',
        'API Access': 'Limited',
      },
      cta: 'Start 14-Day Trial',
      highlighted: false,
    },
    {
      name: 'Enterprise',
      price: null,
      description: 'For institutions and funds',
      features: {
        'Browse Deals': true,
        'Investment Tracking': 'Unlimited',
        'SAFE Agreements': true,
        'Convertible Notes': true,
        'Cap Table Management': 'Advanced + API',
        'Dilution Calculator': true,
        'Waterfall Analysis': true,
        'Term Sheet Templates': 'Unlimited',
        'Investor Rights Tracking': true,
        'Document Storage': 'Unlimited',
        'Portfolio Analytics': 'Custom Reports',
        'Support': 'Dedicated Manager',
        'API Access': 'Full Access',
        'White-label': true,
        'SSO': true,
        'Custom Integration': true,
      },
      cta: 'Contact Sales',
      highlighted: false,
    },
  ],
  annual: [
    {
      name: 'Free',
      price: 0,
      description: 'Perfect for exploring the platform',
      features: {
        'Browse Deals': true,
        'Investment Tracking': '5 investments max',
        'SAFE Agreements': false,
        'Convertible Notes': false,
        'Cap Table Management': false,
        'Dilution Calculator': false,
        'Waterfall Analysis': false,
        'Term Sheet Templates': false,
        'Investor Rights Tracking': false,
        'Document Storage': '100 MB',
        'Portfolio Analytics': 'Basic',
        'Support': 'Community',
        'API Access': false,
      },
      cta: 'Start Free',
      highlighted: false,
    },
    {
      name: 'Investor Pro',
      price: 39,
      originalPrice: 49,
      description: 'For active angel investors',
      features: {
        'Browse Deals': true,
        'Investment Tracking': 'Unlimited',
        'SAFE Agreements': true,
        'Convertible Notes': true,
        'Cap Table Management': 'Basic',
        'Dilution Calculator': true,
        'Waterfall Analysis': false,
        'Term Sheet Templates': '3 per year',
        'Investor Rights Tracking': true,
        'Document Storage': '5 GB',
        'Portfolio Analytics': 'Advanced',
        'Support': 'Email',
        'API Access': false,
      },
      cta: 'Start 14-Day Trial',
      highlighted: true,
      badge: 'Most Popular',
      savings: 'Save 20%',
    },
    {
      name: 'Founder Growth',
      price: 159,
      originalPrice: 199,
      description: 'For startups raising capital',
      features: {
        'Browse Deals': true,
        'Investment Tracking': 'Unlimited',
        'SAFE Agreements': true,
        'Convertible Notes': true,
        'Cap Table Management': 'Advanced',
        'Dilution Calculator': true,
        'Waterfall Analysis': true,
        'Term Sheet Templates': 'Unlimited',
        'Investor Rights Tracking': true,
        'Document Storage': '50 GB',
        'Portfolio Analytics': 'Advanced',
        'Support': 'Email + Chat',
        'API Access': 'Limited',
      },
      cta: 'Start 14-Day Trial',
      highlighted: false,
      savings: 'Save 20%',
    },
    {
      name: 'Enterprise',
      price: null,
      description: 'For institutions and funds',
      features: {
        'Browse Deals': true,
        'Investment Tracking': 'Unlimited',
        'SAFE Agreements': true,
        'Convertible Notes': true,
        'Cap Table Management': 'Advanced + API',
        'Dilution Calculator': true,
        'Waterfall Analysis': true,
        'Term Sheet Templates': 'Unlimited',
        'Investor Rights Tracking': true,
        'Document Storage': 'Unlimited',
        'Portfolio Analytics': 'Custom Reports',
        'Support': 'Dedicated Manager',
        'API Access': 'Full Access',
        'White-label': true,
        'SSO': true,
        'Custom Integration': true,
      },
      cta: 'Contact Sales',
      highlighted: false,
    },
  ],
}

function PricingPage() {
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'annual'>('annual')
  const currentPlans = plans[billingInterval]

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <section className="px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <Badge className="mb-4 bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300">
              Pricing
            </Badge>
            <h1 className="mb-6 text-5xl font-bold tracking-tight text-gray-900 dark:text-white">
              Choose Your Plan
            </h1>
            <p className="mb-8 text-xl text-gray-600 dark:text-gray-300">
              Start free, upgrade as you grow. All paid plans include a 14-day free trial.
            </p>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-4">
              <span className={cn('text-sm font-medium', billingInterval === 'monthly' ? 'text-gray-900 dark:text-white' : 'text-gray-500')}>
                Monthly
              </span>
              <button
                onClick={() => setBillingInterval(billingInterval === 'monthly' ? 'annual' : 'monthly')}
                className={cn(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  billingInterval === 'annual' ? 'bg-blue-600' : 'bg-gray-300'
                )}
              >
                <span
                  className={cn(
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                    billingInterval === 'annual' ? 'translate-x-6' : 'translate-x-1'
                  )}
                />
              </button>
              <span className={cn('text-sm font-medium', billingInterval === 'annual' ? 'text-gray-900 dark:text-white' : 'text-gray-500')}>
                Annual
              </span>
              {billingInterval === 'annual' && (
                <Badge className="bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-300">
                  Save 20%
                </Badge>
              )}
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="mt-16 grid gap-8 lg:grid-cols-4">
            {currentPlans.map((plan, idx) => (
              <Card
                key={idx}
                className={cn(
                  'relative flex flex-col',
                  plan.highlighted && 'border-2 border-blue-600 shadow-xl dark:border-blue-500'
                )}
              >
                {plan.badge && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-blue-600 text-white hover:bg-blue-700">
                      {plan.badge}
                    </Badge>
                  </div>
                )}

                <CardHeader>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    {plan.price === null ? (
                      <div className="text-4xl font-bold">Custom</div>
                    ) : (
                      <>
                        <div className="flex items-baseline gap-2">
                          <span className="text-5xl font-bold">${plan.price}</span>
                          {plan.price > 0 && (
                            <span className="text-gray-600 dark:text-gray-400">
                              /{billingInterval === 'monthly' ? 'mo' : 'mo'}
                            </span>
                          )}
                        </div>
                        {plan.originalPrice && (
                          <div className="mt-1 flex items-center gap-2">
                            <span className="text-sm text-gray-500 line-through">
                              ${plan.originalPrice}/mo
                            </span>
                            <Badge variant="outline" className="text-green-600">
                              {plan.savings}
                            </Badge>
                          </div>
                        )}
                        {billingInterval === 'annual' && plan.price > 0 && (
                          <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            Billed ${plan.price * 12} annually
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="flex-1">
                  <ul className="space-y-3">
                    {Object.entries(plan.features).map(([feature, value]) => (
                      <li key={feature} className="flex items-start gap-3">
                        {value === true || (typeof value === 'string' && value !== '0') ? (
                          <Check className="h-5 w-5 flex-shrink-0 text-green-600" />
                        ) : (
                          <X className="h-5 w-5 flex-shrink-0 text-gray-400" />
                        )}
                        <span className="text-sm">
                          <span className="font-medium">{feature}</span>
                          {typeof value === 'string' && value !== 'true' && (
                            <span className="ml-1 text-gray-600 dark:text-gray-400">
                              • {value}
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  {plan.name === 'Enterprise' ? (
                    <Button variant="outline" className="w-full" asChild>
                      <a href="mailto:sales@angelmarket.com">{plan.cta}</a>
                    </Button>
                  ) : plan.name === 'Free' ? (
                    <Button variant="outline" className="w-full" asChild>
                      <Link to="/auth/register">{plan.cta}</Link>
                    </Button>
                  ) : (
                    <Button
                      className={cn(
                        'w-full',
                        plan.highlighted && 'bg-blue-600 hover:bg-blue-700'
                      )}
                      asChild
                    >
                      <Link to="/auth/register">{plan.cta}</Link>
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>

          {/* Trust Section */}
          <div className="mt-16 flex flex-wrap items-center justify-center gap-8 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-600" />
              <span>SOC 2 Certified</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-600" />
              <span>Cancel Anytime</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              <span>30-Day Money Back</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="border-t bg-white px-6 py-20 dark:border-gray-800 dark:bg-slate-900 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              Compare All Features
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
              See exactly what's included in each plan
            </p>
          </div>

          <div className="mt-12 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-3 text-left text-sm font-semibold">Feature</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Free</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Pro</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Growth</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(currentPlans[0].features).map((feature) => (
                  <tr key={feature} className="border-b">
                    <td className="px-4 py-3 text-sm font-medium">{feature}</td>
                    {currentPlans.map((plan, idx) => (
                      <td key={idx} className="px-4 py-3 text-center text-sm">
                        {plan.features[feature] === true ? (
                          <Check className="mx-auto h-5 w-5 text-green-600" />
                        ) : plan.features[feature] === false ? (
                          <X className="mx-auto h-5 w-5 text-gray-400" />
                        ) : (
                          <span className="text-gray-600 dark:text-gray-400">
                            {plan.features[feature]}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              Frequently Asked Questions
            </h2>
          </div>

          <Accordion type="single" collapsible className="mt-12">
            <AccordionItem value="trial">
              <AccordionTrigger>How does the free trial work?</AccordionTrigger>
              <AccordionContent>
                All paid plans include a 14-day free trial with full access to all features. No credit card required to start. You can cancel anytime during the trial without being charged.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="cancel">
              <AccordionTrigger>Can I cancel my subscription?</AccordionTrigger>
              <AccordionContent>
                Yes, you can cancel your subscription at any time. Your access will continue until the end of your billing period, and you won't be charged again.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="upgrade">
              <AccordionTrigger>Can I upgrade or downgrade my plan?</AccordionTrigger>
              <AccordionContent>
                Absolutely! You can upgrade or downgrade your plan at any time. When upgrading, you'll be charged a prorated amount for the remainder of your billing period. When downgrading, the change takes effect at the start of your next billing period.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="payment">
              <AccordionTrigger>What payment methods do you accept?</AccordionTrigger>
              <AccordionContent>
                We accept all major credit cards (Visa, Mastercard, American Express) and ACH transfers for annual plans. All payments are processed securely through Stripe.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="security">
              <AccordionTrigger>Is my data secure?</AccordionTrigger>
              <AccordionContent>
                Yes. We use 256-bit encryption, are SOC 2 certified, and are fully compliant with SEC regulations. Your data is backed up daily and stored in secure, redundant data centers.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="enterprise">
              <AccordionTrigger>What's included in Enterprise?</AccordionTrigger>
              <AccordionContent>
                Enterprise plans include everything in Growth plus: unlimited storage, white-label options, SSO, custom integrations, dedicated account manager, SLA guarantees, and custom reporting. Contact our sales team for a customized quote.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-600 px-6 py-20 dark:bg-blue-700 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to Get Started?
          </h2>
          <p className="mt-4 text-lg text-blue-100">
            Join 1,000+ angel investors already using our platform. Start your free trial today.
          </p>
          <div className="mt-10">
            <Button size="lg" variant="secondary" className="h-14 px-8 text-lg" asChild>
              <Link to="/auth/register">
                Start Your Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-blue-100">
            No credit card required • Cancel anytime • 30-day money-back guarantee
          </p>
        </div>
      </section>
    </div>
  )
}
