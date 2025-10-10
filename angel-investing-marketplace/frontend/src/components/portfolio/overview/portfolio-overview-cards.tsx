import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { TrendingUp, TrendingDown, DollarSign, Target, Activity, PieChart } from 'lucide-react'
import { usePortfolioSummary } from '@/hooks/use-portfolio'
import { formatCurrency, formatPercentage, formatNumber } from '@/lib/portfolio-utils'

interface MetricCardProps {
  title: string
  value: string | number
  change?: number
  changeLabel?: string
  icon: React.ReactNode
  trend?: 'up' | 'down' | 'neutral'
  format?: 'currency' | 'percentage' | 'number'
}

function MetricCard({ title, value, change, changeLabel, icon, trend, format }: MetricCardProps) {
  const formatValue = (val: string | number) => {
    if (format === 'currency') return formatCurrency(Number(val))
    if (format === 'percentage') return formatPercentage(Number(val))
    if (format === 'number') return formatNumber(Number(val))
    return val
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="text-muted-foreground">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {formatValue(value)}
        </div>
        {change !== undefined && (
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <div className={`flex items-center space-x-1 ${
              trend === 'up' ? 'text-green-600' :
              trend === 'down' ? 'text-red-600' : 'text-muted-foreground'
            }`}>
              {trend === 'up' && <TrendingUp className="h-3 w-3" />}
              {trend === 'down' && <TrendingDown className="h-3 w-3" />}
              <span className="font-medium">
                {format === 'percentage' ? formatPercentage(change) : formatValue(change)}
              </span>
            </div>
            {changeLabel && <span>{changeLabel}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function MetricCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-20 mb-2" />
        <Skeleton className="h-3 w-16" />
      </CardContent>
    </Card>
  )
}

export function PortfolioOverviewCards() {
  const { data: summary, isLoading, error } = usePortfolioSummary()

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <MetricCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (error || !summary) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="col-span-full">
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              Unable to load portfolio summary. Please try again later.
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const totalReturn = summary.total_return
  const totalReturnPercentage = summary.total_return_percentage
  const unrealizedGainLoss = summary.total_unrealized_gain_loss

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Total Invested"
        value={summary.total_invested}
        format="currency"
        icon={<DollarSign className="h-4 w-4" />}
      />

      <MetricCard
        title="Current Value"
        value={summary.total_current_value}
        format="currency"
        icon={<Target className="h-4 w-4" />}
      />

      <MetricCard
        title="Total Return"
        value={totalReturn}
        change={totalReturnPercentage}
        changeLabel="from invested"
        format="currency"
        trend={totalReturn >= 0 ? 'up' : 'down'}
        icon={<Activity className="h-4 w-4" />}
      />

      <MetricCard
        title="Unrealized P&L"
        value={unrealizedGainLoss}
        format="currency"
        trend={unrealizedGainLoss >= 0 ? 'up' : 'down'}
        icon={<TrendingUp className="h-4 w-4" />}
      />

      <MetricCard
        title="Investments"
        value={summary.total_portfolios}
        format="number"
        icon={<PieChart className="h-4 w-4" />}
      />

      <MetricCard
        title="Avg IRR"
        value={summary.average_irr}
        format="percentage"
        icon={<TrendingUp className="h-4 w-4" />}
      />
    </div>
  )
}