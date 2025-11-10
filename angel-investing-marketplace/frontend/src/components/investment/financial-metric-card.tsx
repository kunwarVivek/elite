import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CurrencyDisplay } from './currency-display'
import { PercentageDisplay } from './percentage-display'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface FinancialMetricCardProps {
  title: string
  value: number | string
  type?: 'currency' | 'percentage' | 'number'
  currency?: string
  change?: number
  changeType?: 'currency' | 'percentage'
  description?: string
  icon?: React.ReactNode
  className?: string
  trend?: 'up' | 'down' | 'neutral'
}

export function FinancialMetricCard({
  title,
  value,
  type = 'currency',
  currency = 'USD',
  change,
  changeType = 'percentage',
  description,
  icon,
  className,
  trend,
}: FinancialMetricCardProps) {
  const numValue = typeof value === 'string' ? parseFloat(value) : value

  const renderValue = () => {
    if (type === 'currency') {
      return <CurrencyDisplay value={numValue} currency={currency} className="text-3xl" />
    } else if (type === 'percentage') {
      return <PercentageDisplay value={numValue} className="text-3xl" />
    } else {
      return <span className="text-3xl font-bold">{numValue.toLocaleString()}</span>
    }
  }

  const renderChange = () => {
    if (change === undefined) return null

    const isPositive = change > 0
    const isNegative = change < 0
    const TrendIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus

    return (
      <div
        className={cn(
          'flex items-center gap-1 text-sm',
          isPositive && 'text-green-600 dark:text-green-400',
          isNegative && 'text-red-600 dark:text-red-400',
          !isPositive && !isNegative && 'text-muted-foreground'
        )}
      >
        <TrendIcon className="h-4 w-4" />
        {changeType === 'currency' ? (
          <CurrencyDisplay value={Math.abs(change)} currency={currency} showSign />
        ) : (
          <PercentageDisplay value={Math.abs(change)} showSign />
        )}
      </div>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {renderValue()}
          <div className="flex items-center justify-between">
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
            {renderChange()}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
