import React from 'react'
import { Link } from '@tanstack/react-router'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sparkles, ArrowRight, Check, X } from 'lucide-react'

interface UpgradePromptProps {
  isOpen: boolean
  onClose: () => void
  reason: 'feature' | 'limit'
  featureName?: string
  limitName?: string
  currentLimit?: number
  currentUsage?: number
  requiredTier?: 'PRO' | 'GROWTH' | 'ENTERPRISE'
}

export function UpgradePrompt({
  isOpen,
  onClose,
  reason,
  featureName,
  limitName,
  currentLimit,
  currentUsage,
  requiredTier = 'PRO',
}: UpgradePromptProps) {
  const tierInfo = {
    PRO: {
      name: 'Investor Pro',
      price: 49,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900',
    },
    GROWTH: {
      name: 'Founder Growth',
      price: 199,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900',
    },
    ENTERPRISE: {
      name: 'Enterprise',
      price: null,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900',
    },
  }

  const tier = tierInfo[requiredTier]

  const getFeatureDisplayName = (feature?: string) => {
    const featureNames: Record<string, string> = {
      safeAgreements: 'SAFE Agreements',
      convertibleNotes: 'Convertible Notes',
      capTableManagement: 'Cap Table Management',
      dilutionCalculator: 'Dilution Calculator',
      waterfallAnalysis: 'Waterfall Analysis',
      termSheetTemplates: 'Term Sheet Templates',
      portfolioAnalytics: 'Portfolio Analytics',
      apiAccess: 'API Access',
    }
    return feature ? featureNames[feature] || feature : 'This feature'
  }

  const getLimitDisplayName = (limit?: string) => {
    const limitNames: Record<string, string> = {
      investments: 'Investment Tracking',
      documents: 'Document Storage',
      documentStorageMB: 'Storage Space',
      termSheetsPerYear: 'Term Sheets',
      apiCallsPerMonth: 'API Calls',
    }
    return limit ? limitNames[limit] || limit : 'usage'
  }

  const getUpgradeReasons = () => {
    if (requiredTier === 'PRO') {
      return [
        'Unlimited investment tracking',
        'SAFE & Convertible Note agreements',
        'Cap table management',
        'Dilution calculator',
        '5GB document storage',
        'Email support',
      ]
    } else if (requiredTier === 'GROWTH') {
      return [
        'Everything in Pro',
        'Waterfall analysis',
        'Unlimited term sheets',
        'Advanced analytics',
        '50GB document storage',
        'Priority support',
        'API access',
      ]
    } else {
      return [
        'Everything in Growth',
        'Unlimited everything',
        'Custom integrations',
        'White-labeling',
        'Dedicated account manager',
        'SLA guarantee',
      ]
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="mb-4 flex items-center justify-center">
            <div className={`rounded-full ${tier.bgColor} p-3`}>
              <Sparkles className={`h-6 w-6 ${tier.color}`} />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">
            {reason === 'feature'
              ? `Upgrade to unlock ${getFeatureDisplayName(featureName)}`
              : `Upgrade for more ${getLimitDisplayName(limitName)}`}
          </DialogTitle>
          <DialogDescription className="text-center">
            {reason === 'feature' ? (
              <>
                <strong>{getFeatureDisplayName(featureName)}</strong> is available on the{' '}
                <strong>{tier.name}</strong> plan and higher.
              </>
            ) : (
              <>
                You've reached your limit of {currentLimit} {getLimitDisplayName(limitName)}.
                Upgrade to <strong>{tier.name}</strong> for {requiredTier === 'PRO' ? '500' : 'unlimited'}{' '}
                {getLimitDisplayName(limitName)}.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="my-4">
          {/* Current vs Upgraded */}
          {reason === 'limit' && currentLimit !== undefined && (
            <div className="mb-4 grid grid-cols-2 gap-4 rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
              <div className="text-center">
                <div className="text-sm text-gray-600 dark:text-gray-400">Current Plan</div>
                <div className="mt-1 flex items-center justify-center gap-2">
                  <X className="h-4 w-4 text-red-600" />
                  <span className="text-lg font-bold">{currentLimit}</span>
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-600 dark:text-gray-400">{tier.name}</div>
                <div className="mt-1 flex items-center justify-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-lg font-bold">
                    {requiredTier === 'PRO' ? '500' : 'Unlimited'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* What's Included */}
          <div className="space-y-2">
            <div className="text-sm font-semibold text-gray-900 dark:text-white">
              What's included in {tier.name}:
            </div>
            <ul className="space-y-2">
              {getUpgradeReasons().map((reason, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Pricing */}
          <div className="mt-4 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Starting at</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {tier.price ? (
                    <>
                      ${tier.price}
                      <span className="text-sm font-normal text-gray-600">/month</span>
                    </>
                  ) : (
                    'Custom pricing'
                  )}
                </div>
              </div>
              <Badge className={`${tier.bgColor} ${tier.color}`}>
                14-day free trial
              </Badge>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Link to="/pricing" className="w-full">
            <Button className="w-full" size="lg">
              View Plans & Upgrade
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Button variant="ghost" onClick={onClose} className="w-full">
            Maybe later
          </Button>
        </DialogFooter>

        <p className="mt-2 text-center text-xs text-gray-500">
          Questions? <a href="/contact" className="underline">Contact our team</a>
        </p>
      </DialogContent>
    </Dialog>
  )
}

// Hook to easily show upgrade prompts
export function useUpgradePrompt() {
  const [isOpen, setIsOpen] = React.useState(false)
  const [promptProps, setPromptProps] = React.useState<Omit<UpgradePromptProps, 'isOpen' | 'onClose'>>({
    reason: 'feature',
  })

  const showUpgradePrompt = (props: Omit<UpgradePromptProps, 'isOpen' | 'onClose'>) => {
    setPromptProps(props)
    setIsOpen(true)
  }

  const closeUpgradePrompt = () => {
    setIsOpen(false)
  }

  return {
    UpgradePromptComponent: () => (
      <UpgradePrompt {...promptProps} isOpen={isOpen} onClose={closeUpgradePrompt} />
    ),
    showUpgradePrompt,
    closeUpgradePrompt,
  }
}

// Helper to parse API errors and show upgrade prompts
export function shouldShowUpgradePrompt(error: any): {
  show: boolean
  props?: Omit<UpgradePromptProps, 'isOpen' | 'onClose'>
} {
  if (error?.response?.data?.upgradeRequired) {
    const data = error.response.data

    if (data.error === 'Feature not available') {
      return {
        show: true,
        props: {
          reason: 'feature',
          featureName: data.feature,
          requiredTier: 'PRO',
        },
      }
    }

    if (data.error === 'Usage limit reached') {
      return {
        show: true,
        props: {
          reason: 'limit',
          limitName: data.limitName,
          currentLimit: data.limit,
          currentUsage: data.current,
          requiredTier: 'PRO',
        },
      }
    }

    if (data.error === 'Insufficient subscription tier') {
      return {
        show: true,
        props: {
          reason: 'feature',
          requiredTier: data.minimumTier,
        },
      }
    }
  }

  return { show: false }
}
