import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  CreditCard,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Sparkles,
  ArrowRight,
} from 'lucide-react'
import { format } from 'date-fns'
import {
  useCurrentSubscription,
  useSubscriptionStore,
  useSubscriptionStatus,
} from '@/stores/subscription-store'

export const Route = createFileRoute('/settings/subscription')({
  component: SubscriptionSettingsPage,
})

function SubscriptionSettingsPage() {
  const navigate = useNavigate()
  const subscription = useCurrentSubscription()
  const status = useSubscriptionStatus()
  const { fetchSubscription, cancelSubscription, reactivateSubscription } = useSubscriptionStore()
  const [isLoading, setIsLoading] = useState(true)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [isCanceling, setIsCanceling] = useState(false)

  useEffect(() => {
    fetchSubscription()
      .catch((error) => {
        console.error('Failed to fetch subscription:', error)
      })
      .finally(() => setIsLoading(false))
  }, [])

  const handleCancelSubscription = async () => {
    setIsCanceling(true)
    try {
      await cancelSubscription(cancelReason, false) // Cancel at period end
      setShowCancelDialog(false)
      setCancelReason('')
      await fetchSubscription() // Refresh
    } catch (error) {
      console.error('Failed to cancel subscription:', error)
    } finally {
      setIsCanceling(false)
    }
  }

  const handleReactivate = async () => {
    setIsLoading(true)
    try {
      await reactivateSubscription()
      await fetchSubscription()
    } catch (error) {
      console.error('Failed to reactivate subscription:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto flex min-h-screen items-center justify-center px-6 py-12">
        <div className="text-center">
          <div className="text-lg text-gray-600 dark:text-gray-400">Loading subscription...</div>
        </div>
      </div>
    )
  }

  if (!subscription) {
    return (
      <div className="container mx-auto px-6 py-12">
        <Card>
          <CardHeader>
            <CardTitle>No Active Subscription</CardTitle>
            <CardDescription>You're currently on the free plan</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-gray-600 dark:text-gray-400">
              Upgrade to unlock premium features and unlimited usage.
            </p>
            <Link to="/pricing">
              <Button>
                View Plans & Upgrade
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const getPlanBadgeColor = (tier: string) => {
    switch (tier) {
      case 'PRO':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
      case 'GROWTH':
        return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
      case 'ENTERPRISE':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
      case 'TRIALING':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
      case 'PAST_DUE':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
      case 'CANCELED':
        return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
    }
  }

  const formatPrice = (price: number, interval: string) => {
    return `$${price}/${interval === 'ANNUAL' ? 'year' : 'month'}`
  }

  return (
    <div className="container mx-auto px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Subscription</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Manage your subscription and billing settings
        </p>
      </div>

      {/* Status Alerts */}
      {status.isTrialing && status.daysLeftInTrial && (
        <Alert className="mb-6 border-blue-200 bg-blue-50 dark:bg-blue-900/20">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-900 dark:text-blue-300">Trial Active</AlertTitle>
          <AlertDescription className="text-blue-700 dark:text-blue-400">
            You have {status.daysLeftInTrial} days left in your free trial. Add a payment method before your trial ends to continue using premium features.
          </AlertDescription>
        </Alert>
      )}

      {subscription.cancelAtPeriodEnd && (
        <Alert className="mb-6 border-orange-200 bg-orange-50 dark:bg-orange-900/20">
          <XCircle className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-900 dark:text-orange-300">Subscription Ending</AlertTitle>
          <AlertDescription className="text-orange-700 dark:text-orange-400">
            Your subscription will end on{' '}
            {format(new Date(subscription.currentPeriodEnd), 'MMMM dd, yyyy')}. You can reactivate
            anytime before then.
            <Button variant="link" className="ml-2 p-0 text-orange-700" onClick={handleReactivate}>
              Reactivate Now
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {status.isPastDue && (
        <Alert className="mb-6 border-red-200 bg-red-50 dark:bg-red-900/20">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-900 dark:text-red-300">Payment Failed</AlertTitle>
          <AlertDescription className="text-red-700 dark:text-red-400">
            Your last payment failed. Please update your payment method to continue using premium
            features.
            <Button variant="link" className="ml-2 p-0 text-red-700">
              Update Payment Method
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Current Plan */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Current Plan</span>
                <Badge className={getPlanBadgeColor(subscription.plan.tier)} variant="secondary">
                  {subscription.plan.tier}
                </Badge>
              </CardTitle>
              <CardDescription>{subscription.plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Plan Info */}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Plan Name</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {subscription.plan.name}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Price</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {formatPrice(Number(subscription.plan.price), subscription.plan.billingInterval)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Status</div>
                  <Badge className={getStatusBadgeColor(subscription.status)} variant="secondary">
                    {subscription.status}
                  </Badge>
                </div>
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Billing Interval</div>
                  <div className="text-base font-medium text-gray-900 dark:text-white capitalize">
                    {subscription.plan.billingInterval.toLowerCase()}
                  </div>
                </div>
              </div>

              {/* Billing Dates */}
              <div className="rounded-lg border p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
                  <Calendar className="h-4 w-4" />
                  Billing Period
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Current period:{' '}
                  {format(new Date(subscription.currentPeriodStart), 'MMM dd, yyyy')} -{' '}
                  {format(new Date(subscription.currentPeriodEnd), 'MMM dd, yyyy')}
                </div>
                {!subscription.cancelAtPeriodEnd && (
                  <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Next billing date: {format(new Date(subscription.currentPeriodEnd), 'MMM dd, yyyy')}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Link to="/pricing" className="flex-1">
                  <Button variant="outline" className="w-full">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Upgrade Plan
                  </Button>
                </Link>
                {!subscription.cancelAtPeriodEnd && subscription.status !== 'CANCELED' && (
                  <Button
                    variant="ghost"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => setShowCancelDialog(true)}
                  >
                    Cancel Subscription
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Usage Limits */}
          {subscription.usage && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Usage This Period</CardTitle>
                <CardDescription>
                  Your usage from {format(new Date(subscription.currentPeriodStart), 'MMM dd')} to{' '}
                  {format(new Date(subscription.currentPeriodEnd), 'MMM dd')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Investments */}
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-900 dark:text-white">Investments</span>
                    <span className="text-gray-600 dark:text-gray-400">
                      {subscription.usage.investments} /{' '}
                      {(subscription.plan.limits as any).investments === -1
                        ? 'Unlimited'
                        : (subscription.plan.limits as any).investments}
                    </span>
                  </div>
                  {(subscription.plan.limits as any).investments !== -1 && (
                    <Progress
                      value={
                        (subscription.usage.investments / (subscription.plan.limits as any).investments) *
                        100
                      }
                      className="h-2"
                    />
                  )}
                </div>

                {/* Documents */}
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-900 dark:text-white">Documents</span>
                    <span className="text-gray-600 dark:text-gray-400">
                      {subscription.usage.documents} /{' '}
                      {(subscription.plan.limits as any).documents === -1
                        ? 'Unlimited'
                        : (subscription.plan.limits as any).documents}
                    </span>
                  </div>
                  {(subscription.plan.limits as any).documents !== -1 && (
                    <Progress
                      value={
                        (subscription.usage.documents / (subscription.plan.limits as any).documents) * 100
                      }
                      className="h-2"
                    />
                  )}
                </div>

                {/* Storage */}
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-900 dark:text-white">Storage</span>
                    <span className="text-gray-600 dark:text-gray-400">
                      {(subscription.usage.documentStorage / 1024).toFixed(2)} GB /{' '}
                      {(subscription.plan.limits as any).documentStorageMB === -1
                        ? 'Unlimited'
                        : `${((subscription.plan.limits as any).documentStorageMB / 1024).toFixed(0)} GB`}
                    </span>
                  </div>
                  {(subscription.plan.limits as any).documentStorageMB !== -1 && (
                    <Progress
                      value={
                        (subscription.usage.documentStorage /
                          (subscription.plan.limits as any).documentStorageMB) *
                        100
                      }
                      className="h-2"
                    />
                  )}
                </div>

                {/* API Calls (if applicable) */}
                {(subscription.plan.limits as any).apiCallsPerMonth > 0 && (
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-900 dark:text-white">API Calls</span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {subscription.usage.apiCalls} /{' '}
                        {(subscription.plan.limits as any).apiCallsPerMonth === -1
                          ? 'Unlimited'
                          : (subscription.plan.limits as any).apiCallsPerMonth}
                      </span>
                    </div>
                    {(subscription.plan.limits as any).apiCallsPerMonth !== -1 && (
                      <Progress
                        value={
                          (subscription.usage.apiCalls /
                            (subscription.plan.limits as any).apiCallsPerMonth) *
                          100
                        }
                        className="h-2"
                      />
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Payment Method */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-4 w-4" />
                Payment Method
              </CardTitle>
            </CardHeader>
            <CardContent>
              {subscription.stripePaymentMethodId ? (
                <div className="text-sm">
                  <div className="text-gray-600 dark:text-gray-400">Card ending in ****</div>
                  <Button variant="link" className="mt-2 p-0 text-sm">
                    Update Payment Method
                  </Button>
                </div>
              ) : (
                <div>
                  <div className="mb-2 text-sm text-gray-600 dark:text-gray-400">
                    No payment method on file
                  </div>
                  <Button variant="outline" size="sm" className="w-full">
                    Add Payment Method
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upgrade Benefits */}
          {subscription.plan.tier !== 'ENTERPRISE' && (
            <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-blue-900 dark:text-blue-300">
                  <TrendingUp className="h-4 w-4" />
                  Upgrade for More
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-blue-700 dark:text-blue-400">
                <ul className="space-y-2">
                  {subscription.plan.tier === 'PRO' && (
                    <>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                        <span>Waterfall analysis</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                        <span>Unlimited term sheets</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                        <span>50GB storage</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                        <span>API access</span>
                      </li>
                    </>
                  )}
                  {(subscription.plan.tier === 'PRO' || subscription.plan.tier === 'GROWTH') && (
                    <>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                        <span>Unlimited everything</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                        <span>Dedicated support</span>
                      </li>
                    </>
                  )}
                </ul>
                <Link to="/pricing">
                  <Button className="mt-4 w-full bg-blue-600 hover:bg-blue-700">
                    View Plans
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Cancel Subscription Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Subscription</DialogTitle>
            <DialogDescription>
              We're sorry to see you go. Your subscription will remain active until the end of your
              current billing period on {format(new Date(subscription.currentPeriodEnd), 'MMMM dd, yyyy')}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="cancelReason">Help us improve (optional)</Label>
              <Textarea
                id="cancelReason"
                placeholder="Let us know why you're canceling..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={4}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Keep Subscription
            </Button>
            <Button variant="destructive" onClick={handleCancelSubscription} disabled={isCanceling}>
              {isCanceling ? 'Canceling...' : 'Cancel Subscription'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
