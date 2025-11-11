import React from 'react'
import { Link } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useCurrentSubscription, useSubscriptionStatus } from '@/stores/subscription-store'
import { TrendingUp, AlertTriangle, CheckCircle, ArrowUpRight, Crown } from 'lucide-react'

interface UsageItemProps {
  label: string
  current: number
  limit: number
  unit?: string
  warningThreshold?: number
}

function UsageItem({ label, current, limit, unit = '', warningThreshold = 0.8 }: UsageItemProps) {
  const percentage = limit === -1 ? 0 : (current / limit) * 100
  const isUnlimited = limit === -1
  const isNearLimit = percentage >= warningThreshold * 100
  const isAtLimit = percentage >= 100

  const getStatusColor = () => {
    if (isUnlimited) return 'text-purple-600'
    if (isAtLimit) return 'text-red-600'
    if (isNearLimit) return 'text-orange-600'
    return 'text-green-600'
  }

  const getProgressColor = () => {
    if (isAtLimit) return 'bg-red-600'
    if (isNearLimit) return 'bg-orange-600'
    return 'bg-blue-600'
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700 dark:text-gray-300">{label}</span>
        <span className={`font-semibold ${getStatusColor()}`}>
          {current}
          {!isUnlimited && ` / ${limit}`}
          {isUnlimited && ' (Unlimited)'}
          {unit && ` ${unit}`}
        </span>
      </div>
      {!isUnlimited && (
        <div className="relative">
          <Progress value={Math.min(percentage, 100)} className="h-2" />
          <div
            className={`absolute top-0 left-0 h-2 rounded-full transition-all ${getProgressColor()}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      )}
      {isAtLimit && (
        <p className="text-xs text-red-600 dark:text-red-400">Limit reached</p>
      )}
      {isNearLimit && !isAtLimit && (
        <p className="text-xs text-orange-600 dark:text-orange-400">
          {Math.round((1 - percentage / 100) * limit)} {unit} remaining
        </p>
      )}
    </div>
  )
}

export function UsageDashboard() {
  const subscription = useCurrentSubscription()
  const status = useSubscriptionStatus()

  if (!subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Usage & Limits
          </CardTitle>
          <CardDescription>Track your subscription usage</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Unable to load subscription data. Please try refreshing the page.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  const limits = subscription.plan.limits as any
  const usage = subscription.usage || {
    investments: 0,
    documents: 0,
    documentStorageMB: 0,
    termSheetsPerYear: 0,
    apiCallsPerMonth: 0,
  }

  const hasReachedAnyLimit = () => {
    if (limits.investments !== -1 && usage.investments >= limits.investments) return true
    if (limits.documents !== -1 && usage.documents >= limits.documents) return true
    if (limits.documentStorageMB !== -1 && usage.documentStorageMB >= limits.documentStorageMB)
      return true
    if (limits.termSheetsPerYear !== -1 && usage.termSheetsPerYear >= limits.termSheetsPerYear)
      return true
    if (limits.apiCallsPerMonth !== -1 && usage.apiCallsPerMonth >= limits.apiCallsPerMonth)
      return true
    return false
  }

  const isApproachingAnyLimit = () => {
    const threshold = 0.8
    if (limits.investments !== -1 && usage.investments / limits.investments >= threshold) return true
    if (limits.documents !== -1 && usage.documents / limits.documents >= threshold) return true
    if (
      limits.documentStorageMB !== -1 &&
      usage.documentStorageMB / limits.documentStorageMB >= threshold
    )
      return true
    if (
      limits.termSheetsPerYear !== -1 &&
      usage.termSheetsPerYear / limits.termSheetsPerYear >= threshold
    )
      return true
    if (
      limits.apiCallsPerMonth !== -1 &&
      usage.apiCallsPerMonth / limits.apiCallsPerMonth >= threshold
    )
      return true
    return false
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Usage & Limits
            </CardTitle>
            <CardDescription>
              Current plan: <strong>{subscription.plan.name}</strong>
            </CardDescription>
          </div>
          <Badge
            variant={
              subscription.plan.tier === 'FREE'
                ? 'secondary'
                : subscription.plan.tier === 'PRO'
                  ? 'default'
                  : subscription.plan.tier === 'GROWTH'
                    ? 'default'
                    : 'default'
            }
            className={
              subscription.plan.tier === 'FREE'
                ? ''
                : subscription.plan.tier === 'PRO'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                  : subscription.plan.tier === 'GROWTH'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                    : 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
            }
          >
            {subscription.plan.tier}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Trial Alert */}
        {status.isTrial && status.trialDaysLeft !== null && (
          <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
            <CheckCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm text-blue-800 dark:text-blue-200">
              Trial: <strong>{status.trialDaysLeft} days remaining</strong>
            </AlertDescription>
          </Alert>
        )}

        {/* Limit Warning Alert */}
        {hasReachedAnyLimit() && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You've reached one or more usage limits.{' '}
              <Link to="/pricing" className="font-semibold underline">
                Upgrade now
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {!hasReachedAnyLimit() && isApproachingAnyLimit() && (
          <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-sm text-orange-800 dark:text-orange-200">
              You're approaching your usage limits. Consider upgrading to avoid interruptions.
            </AlertDescription>
          </Alert>
        )}

        {/* Usage Items */}
        <div className="space-y-4">
          {/* Investments */}
          {limits.investments !== undefined && (
            <UsageItem
              label="Investments"
              current={usage.investments}
              limit={limits.investments}
            />
          )}

          {/* Documents */}
          {limits.documents !== undefined && (
            <UsageItem label="Documents" current={usage.documents} limit={limits.documents} />
          )}

          {/* Storage */}
          {limits.documentStorageMB !== undefined && (
            <UsageItem
              label="Storage"
              current={parseFloat((usage.documentStorageMB / 1024).toFixed(2))}
              limit={limits.documentStorageMB === -1 ? -1 : limits.documentStorageMB / 1024}
              unit="GB"
            />
          )}

          {/* Term Sheets (if applicable) */}
          {limits.termSheetsPerYear !== undefined && limits.termSheetsPerYear > 0 && (
            <UsageItem
              label="Term Sheets (this year)"
              current={usage.termSheetsPerYear}
              limit={limits.termSheetsPerYear}
            />
          )}

          {/* API Calls (if applicable) */}
          {limits.apiCallsPerMonth !== undefined && limits.apiCallsPerMonth > 0 && (
            <UsageItem
              label="API Calls (this month)"
              current={usage.apiCallsPerMonth}
              limit={limits.apiCallsPerMonth}
            />
          )}
        </div>

        {/* Upgrade CTA */}
        {subscription.plan.tier !== 'ENTERPRISE' && (
          <div className="mt-4 space-y-2">
            <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-950">
              <div className="mb-2 flex items-center gap-2">
                <Crown className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                  Need more?
                </span>
              </div>
              <p className="mb-3 text-xs text-purple-800 dark:text-purple-200">
                {subscription.plan.tier === 'FREE'
                  ? 'Upgrade to Pro for unlimited investments, SAFE agreements, and more.'
                  : subscription.plan.tier === 'PRO'
                    ? 'Upgrade to Growth for waterfall analysis, unlimited term sheets, and API access.'
                    : 'Contact us for Enterprise features and custom limits.'}
              </p>
              <Link to="/pricing">
                <Button size="sm" className="w-full" variant="default">
                  {subscription.plan.tier === 'ENTERPRISE' ? 'Contact Sales' : 'View Plans'}
                  <ArrowUpRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Settings Link */}
        <div className="pt-2">
          <Link to="/settings/subscription">
            <Button variant="ghost" size="sm" className="w-full">
              Manage Subscription
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

// Compact version for sidebars
export function CompactUsageDashboard() {
  const subscription = useCurrentSubscription()
  const status = useSubscriptionStatus()

  if (!subscription) return null

  const limits = subscription.plan.limits as any
  const usage = subscription.usage || {
    investments: 0,
    documents: 0,
    documentStorageMB: 0,
  }

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4 text-card-foreground">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Usage</h4>
        <Badge variant="outline" className="text-xs">
          {subscription.plan.tier}
        </Badge>
      </div>

      {status.isTrial && status.trialDaysLeft !== null && (
        <div className="rounded-md bg-blue-50 px-2 py-1 text-xs text-blue-700 dark:bg-blue-950 dark:text-blue-300">
          Trial: {status.trialDaysLeft}d left
        </div>
      )}

      <div className="space-y-3">
        {limits.investments !== undefined && (
          <div>
            <div className="mb-1 flex justify-between text-xs">
              <span>Investments</span>
              <span>
                {usage.investments}
                {limits.investments !== -1 && ` / ${limits.investments}`}
              </span>
            </div>
            {limits.investments !== -1 && (
              <Progress
                value={Math.min((usage.investments / limits.investments) * 100, 100)}
                className="h-1"
              />
            )}
          </div>
        )}

        {limits.documents !== undefined && (
          <div>
            <div className="mb-1 flex justify-between text-xs">
              <span>Documents</span>
              <span>
                {usage.documents}
                {limits.documents !== -1 && ` / ${limits.documents}`}
              </span>
            </div>
            {limits.documents !== -1 && (
              <Progress
                value={Math.min((usage.documents / limits.documents) * 100, 100)}
                className="h-1"
              />
            )}
          </div>
        )}
      </div>

      <Link to="/settings/subscription">
        <Button variant="outline" size="sm" className="w-full text-xs">
          Manage Plan
        </Button>
      </Link>
    </div>
  )
}
