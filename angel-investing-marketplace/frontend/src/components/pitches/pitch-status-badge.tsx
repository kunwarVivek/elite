import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatPitchStatus, getStatusBadgeVariant } from '@/lib/pitch-utils'
import type { PitchStatus } from '@/types/pitch'

interface PitchStatusBadgeProps {
  status: PitchStatus
  className?: string
  showIcon?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const statusIcons: Record<PitchStatus, string> = {
  DRAFT: '📝',
  UNDER_REVIEW: '🔍',
  ACTIVE: '🚀',
  FUNDED: '💰',
  CLOSED: '✅',
  WITHDRAWN: '❌',
}

const statusDescriptions: Record<PitchStatus, string> = {
  DRAFT: 'Pitch is being prepared',
  UNDER_REVIEW: 'Under review by our team',
  ACTIVE: 'Actively seeking investment',
  FUNDED: 'Successfully funded',
  CLOSED: 'No longer accepting investment',
  WITHDRAWN: 'Withdrawn by founder',
}

export function PitchStatusBadge({
  status,
  className,
  showIcon = false,
  size = 'md'
}: PitchStatusBadgeProps) {
  const variant = getStatusBadgeVariant(status)
  const icon = statusIcons[status]
  const description = statusDescriptions[status]

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  }

  return (
    <div className="flex items-center gap-2">
      <Badge
        variant={variant}
        className={cn(sizeClasses[size], className)}
        title={description}
      >
        {showIcon && <span className="mr-1">{icon}</span>}
        {formatPitchStatus(status)}
      </Badge>
    </div>
  )
}

// Status indicator for use in lists and tables
export function PitchStatusIndicator({ status }: { status: PitchStatus }) {
  const variant = getStatusBadgeVariant(status)
  const icon = statusIcons[status]

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
        {
          'bg-gray-100 text-gray-800': variant === 'secondary',
          'bg-gray-100 text-gray-600 border border-gray-300': variant === 'outline',
          'bg-blue-100 text-blue-800': variant === 'default',
          'bg-red-100 text-red-800': variant === 'destructive',
        }
      )}
      title={statusDescriptions[status]}
    >
      <span>{icon}</span>
      {formatPitchStatus(status)}
    </div>
  )
}

// Status badge with additional context
export function PitchStatusBadgeWithContext({
  status,
  fundingProgress,
  expiresAt,
  className
}: {
  status: PitchStatus
  fundingProgress?: number
  expiresAt?: string
  className?: string
}) {
  const variant = getStatusBadgeVariant(status)
  const icon = statusIcons[status]

  return (
    <div className={cn("space-y-2", className)}>
      <Badge
        variant={variant}
        className="text-sm px-2.5 py-1"
      >
        <span className="mr-1.5">{icon}</span>
        {formatPitchStatus(status)}
      </Badge>

      {/* Additional context for active pitches */}
      {status === 'ACTIVE' && (
        <div className="text-xs text-muted-foreground space-y-1">
          {fundingProgress !== undefined && (
            <div>Funding: {fundingProgress.toFixed(0)}% complete</div>
          )}
          {expiresAt && (
            <div>Expires: {new Date(expiresAt).toLocaleDateString()}</div>
          )}
        </div>
      )}

      {/* Status description */}
      <p className="text-xs text-muted-foreground">
        {statusDescriptions[status]}
      </p>
    </div>
  )
}