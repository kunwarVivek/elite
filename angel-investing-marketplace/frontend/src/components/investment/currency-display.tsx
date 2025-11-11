import { cn } from '@/lib/utils'

interface CurrencyDisplayProps {
  value: number | string
  currency?: string
  className?: string
  showSign?: boolean
  compact?: boolean
}

export function CurrencyDisplay({
  value,
  currency = 'USD',
  className,
  showSign = false,
  compact = false,
}: CurrencyDisplayProps) {
  const numValue = typeof value === 'string' ? parseFloat(value) : value

  if (isNaN(numValue)) {
    return <span className={cn('text-muted-foreground', className)}>—</span>
  }

  const formatOptions: Intl.NumberFormatOptions = {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }

  if (compact && Math.abs(numValue) >= 1000000) {
    formatOptions.notation = 'compact'
    formatOptions.compactDisplay = 'short'
  }

  let formatted = new Intl.NumberFormat('en-US', formatOptions).format(numValue)

  // Add sign for positive values if requested
  if (showSign && numValue > 0) {
    formatted = '+' + formatted
  }

  const colorClass = showSign
    ? numValue > 0
      ? 'text-green-600 dark:text-green-400'
      : numValue < 0
      ? 'text-red-600 dark:text-red-400'
      : ''
    : ''

  return <span className={cn('font-medium', colorClass, className)}>{formatted}</span>
}
