import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type RoundType =
  | 'PRE_SEED'
  | 'SEED'
  | 'SERIES_A'
  | 'SERIES_B'
  | 'SERIES_C'
  | 'SERIES_D'

interface RoundTypeBadgeProps {
  roundType: RoundType
  className?: string
}

export function RoundTypeBadge({ roundType, className }: RoundTypeBadgeProps) {
  const variantMap: Record<RoundType, string> = {
    PRE_SEED: 'bg-gray-500/10 text-gray-700 dark:text-gray-400 hover:bg-gray-500/20',
    SEED: 'bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20',
    SERIES_A: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-500/20',
    SERIES_B: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 hover:bg-purple-500/20',
    SERIES_C: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 hover:bg-orange-500/20',
    SERIES_D: 'bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-500/20',
  }

  const labelMap: Record<RoundType, string> = {
    PRE_SEED: 'Pre-Seed',
    SEED: 'Seed',
    SERIES_A: 'Series A',
    SERIES_B: 'Series B',
    SERIES_C: 'Series C',
    SERIES_D: 'Series D',
  }

  return (
    <Badge className={cn(variantMap[roundType], className)} variant="secondary">
      {labelMap[roundType]}
    </Badge>
  )
}
