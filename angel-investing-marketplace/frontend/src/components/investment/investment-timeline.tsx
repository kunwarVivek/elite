import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { CheckCircle2, Circle, XCircle, Clock } from 'lucide-react'

interface TimelineEvent {
  id: string
  title: string
  description?: string
  date: string
  status: 'completed' | 'pending' | 'failed' | 'in_progress'
  type?: string
}

interface InvestmentTimelineProps {
  events: TimelineEvent[]
  className?: string
}

export function InvestmentTimeline({ events, className }: InvestmentTimelineProps) {
  const getStatusIcon = (status: TimelineEvent['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-600" />
      default:
        return <Circle className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusColor = (status: TimelineEvent['status']) => {
    switch (status) {
      case 'completed':
        return 'border-green-600'
      case 'failed':
        return 'border-red-600'
      case 'in_progress':
        return 'border-blue-600'
      default:
        return 'border-gray-400'
    }
  }

  return (
    <div className={cn('space-y-4', className)}>
      {events.map((event, index) => (
        <div key={event.id} className="relative flex gap-4">
          {/* Timeline line */}
          {index !== events.length - 1 && (
            <div
              className={cn(
                'absolute left-[10px] top-8 h-full w-0.5',
                getStatusColor(event.status)
              )}
            />
          )}

          {/* Icon */}
          <div className="relative z-10 flex-shrink-0">{getStatusIcon(event.status)}</div>

          {/* Content */}
          <div className="flex-1 space-y-1 pb-8">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium">{event.title}</h4>
                {event.description && (
                  <p className="text-sm text-muted-foreground">{event.description}</p>
                )}
              </div>
              <time className="text-sm text-muted-foreground">
                {format(new Date(event.date), 'MMM dd, yyyy')}
              </time>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
