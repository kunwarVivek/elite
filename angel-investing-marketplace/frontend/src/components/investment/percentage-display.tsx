import { cn } from '@/lib/utils'

interface PercentageDisplayProps {
  value: number | string
  className?: string
  showSign?: boolean
  decimals?: number
}

export function PercentageDisplay({
  value,
  className,
  showSign = false,
  decimals = 2,
}: PercentageDisplayProps) {
  const numValue = typeof value === 'string' ? parseFloat(value) : value

  if (isNaN(numValue)) {
    return <span className={cn('text-muted-foreground', className)}>—</span>
  }

  const formatted = numValue.toFixed(decimals)
  const display = showSign && numValue > 0 ? `+${formatted}%` : `${formatted}%`

  const colorClass = showSign
    ? numValue > 0
      ? 'text-green-600 dark:text-green-400'
      : numValue < 0
      ? 'text-red-600 dark:text-red-400'
      : ''
    : ''

  return <span className={cn('font-medium', colorClass, className)}>{display}</span>
}
