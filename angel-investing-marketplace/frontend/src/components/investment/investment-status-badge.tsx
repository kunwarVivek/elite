import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type InvestmentStatus =
  | 'ACTIVE'
  | 'CONVERTED'
  | 'DISSOLVED'
  | 'REPAID'
  | 'DEFAULTED'
  | 'PENDING'
  | 'COMPLETED'
  | 'CANCELLED'

interface InvestmentStatusBadgeProps {
  status: InvestmentStatus
  className?: string
}

export function InvestmentStatusBadge({ status, className }: InvestmentStatusBadgeProps) {
  const variantMap: Record<InvestmentStatus, string> = {
    ACTIVE: 'bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20',
    CONVERTED: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-500/20',
    DISSOLVED: 'bg-gray-500/10 text-gray-700 dark:text-gray-400 hover:bg-gray-500/20',
    REPAID: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 hover:bg-purple-500/20',
    DEFAULTED: 'bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-500/20',
    PENDING: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/20',
    COMPLETED: 'bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20',
    CANCELLED: 'bg-gray-500/10 text-gray-700 dark:text-gray-400 hover:bg-gray-500/20',
  }

  const labelMap: Record<InvestmentStatus, string> = {
    ACTIVE: 'Active',
    CONVERTED: 'Converted',
    DISSOLVED: 'Dissolved',
    REPAID: 'Repaid',
    DEFAULTED: 'Defaulted',
    PENDING: 'Pending',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
  }

  return (
    <Badge className={cn(variantMap[status], className)} variant="secondary">
      {labelMap[status]}
    </Badge>
  )
}
