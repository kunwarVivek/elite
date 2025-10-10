import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Bell,
  ExternalLink,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'
import { useRecentActivity } from '@/hooks/use-portfolio'
import { RecentActivity as Activity, ActivityType } from '@/types/portfolio'
import { formatCurrency, formatDateTime, formatRelativeTime, getStatusColor } from '@/lib/portfolio-utils'

interface ActivityItemProps {
  activity: Activity
}

function getActivityIcon(type: ActivityType) {
  switch (type) {
    case ActivityType.INVESTMENT_MADE:
      return <TrendingUp className="h-4 w-4 text-green-600" />
    case ActivityType.INVESTMENT_UPDATED:
      return <Bell className="h-4 w-4 text-blue-600" />
    case ActivityType.EXIT_COMPLETED:
      return <CheckCircle className="h-4 w-4 text-green-600" />
    case ActivityType.VALUATION_UPDATE:
      return <TrendingUp className="h-4 w-4 text-purple-600" />
    case ActivityType.COMPANY_UPDATE:
      return <FileText className="h-4 w-4 text-orange-600" />
    case ActivityType.DOCUMENT_UPLOADED:
      return <FileText className="h-4 w-4 text-gray-600" />
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />
  }
}

function getActivityBadgeVariant(type: ActivityType) {
  switch (type) {
    case ActivityType.INVESTMENT_MADE:
      return 'default'
    case ActivityType.EXIT_COMPLETED:
      return 'default'
    case ActivityType.VALUATION_UPDATE:
      return 'secondary'
    case ActivityType.COMPANY_UPDATE:
      return 'outline'
    default:
      return 'secondary'
  }
}

function ActivityItem({ activity }: ActivityItemProps) {
  const icon = getActivityIcon(activity.type)
  const badgeVariant = getActivityBadgeVariant(activity.type)

  return (
    <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex-shrink-0 mt-0.5">
        {icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground truncate">
            {activity.title}
          </p>
          <div className="flex items-center space-x-2">
            <Badge variant={badgeVariant} className="text-xs">
              {activity.type.replace(/_/g, ' ')}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(activity.created_at)}
            </span>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mt-1">
          {activity.description}
        </p>

        {activity.amount && (
          <div className="flex items-center space-x-2 mt-2">
            <DollarSign className="h-3 w-3 text-muted-foreground" />
            <span className="text-sm font-medium">
              {formatCurrency(activity.amount)}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-muted-foreground">
            {formatDateTime(activity.created_at)}
          </span>

          {activity.metadata?.url && (
            <Button variant="ghost" size="sm" asChild>
              <a
                href={activity.metadata.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-1"
              >
                <span className="text-xs">View</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function ActivityItemSkeleton() {
  return (
    <div className="flex items-start space-x-3 p-3">
      <Skeleton className="h-4 w-4 rounded mt-0.5" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <div className="flex items-center space-x-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-24" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-12" />
        </div>
      </div>
    </div>
  )
}

interface RecentActivityProps {
  portfolioId: string
  maxHeight?: string
  showHeader?: boolean
  limit?: number
}

export function RecentActivity({
  portfolioId,
  maxHeight = "400px",
  showHeader = true,
  limit = 10
}: RecentActivityProps) {
  const { data: activityResponse, isLoading, error } = useRecentActivity(portfolioId, 1, limit)

  const activities = activityResponse?.data || []

  return (
    <Card>
      {showHeader && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>
            Latest updates and transactions from your portfolio
          </CardDescription>
        </CardHeader>
      )}

      <CardContent className="p-0">
        {isLoading ? (
          <div className="space-y-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <ActivityItemSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Unable to load recent activity</p>
            </div>
          </div>
        ) : activities.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            <div className="text-center">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No recent activity</p>
              <p className="text-xs">Activity will appear here as you make investments</p>
            </div>
          </div>
        ) : (
          <ScrollArea style={{ maxHeight }}>
            <div className="divide-y">
              {activities.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}