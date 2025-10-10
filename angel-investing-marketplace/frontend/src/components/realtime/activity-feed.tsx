import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRealtimeEnhanced } from '@/hooks/use-realtime-enhanced';
import { useAuth } from '@/hooks/use-auth';
import {
  Activity,
  DollarSign,
  Eye,
  Users,
  TrendingUp,
  MessageSquare,
  Heart,
  Share,
  RefreshCw,
  AlertCircle,
  Wifi,
  WifiOff,
  Clock,
  Filter,
  Search
} from 'lucide-react';
import { formatTimeAgo, formatCurrency } from '@/lib/utils';

interface ActivityFeedProps {
  showHeader?: boolean;
  compact?: boolean;
  maxItems?: number;
  showFilters?: boolean;
  autoRefresh?: boolean;
  filterTypes?: string[];
}

interface ActivityItem {
  id: string;
  type: 'investment' | 'pitch_view' | 'user_engagement' | 'system' | 'social' | 'milestone';
  title: string;
  description: string;
  timestamp: string;
  userId?: string;
  userName?: string;
  metadata?: Record<string, any>;
  priority: 'low' | 'normal' | 'high';
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  showHeader = true,
  compact = false,
  maxItems = 50,
  showFilters = true,
  autoRefresh = true,
  filterTypes = []
}) => {
  const { user } = useAuth();
  const [filter, setFilter] = useState<string[]>(filterTypes);
  const [searchTerm, setSearchTerm] = useState('');

  const {
    userActivity,
    isLoading,
    error,
    lastUpdate,
    isConnected,
    connectionHealth,
    refreshData
  } = useRealtimeEnhanced({
    enableUserActivity: true,
    autoConnect: true,
    reconnectInterval: 5000,
    maxReconnectAttempts: 3
  });

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      if (isConnected) {
        refreshData();
      }
    }, 20000); // Refresh every 20 seconds for activity feed

    return () => clearInterval(interval);
  }, [autoRefresh, isConnected, refreshData]);

  const handleRefresh = async () => {
    if (!isConnected) return;
    await refreshData();
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'investment':
        return <DollarSign className="h-4 w-4 text-green-500" />;
      case 'pitch_view':
        return <Eye className="h-4 w-4 text-blue-500" />;
      case 'user_engagement':
        return <Users className="h-4 w-4 text-purple-500" />;
      case 'system':
        return <Activity className="h-4 w-4 text-gray-500" />;
      case 'social':
        return <Heart className="h-4 w-4 text-red-500" />;
      case 'milestone':
        return <TrendingUp className="h-4 w-4 text-orange-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActivityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500 bg-red-50/50 dark:bg-red-950/20';
      case 'normal':
        return 'border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20';
      case 'low':
        return 'border-l-gray-500 bg-gray-50/50 dark:bg-gray-950/20';
      default:
        return 'border-l-gray-300 bg-gray-50/50 dark:bg-gray-950/20';
    }
  };

  const getActivityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'normal':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  // Transform raw activity data into structured format
  const processedActivities: ActivityItem[] = React.useMemo(() => {
    return userActivity.slice(0, maxItems).map((activity, index) => {
      // Transform based on activity type
      let processedActivity: ActivityItem;

      if (activity.type === 'portfolio_update') {
        processedActivity = {
          id: `portfolio_${index}_${Date.now()}`,
          type: 'investment',
          title: 'Portfolio Updated',
          description: `Portfolio value changed by ${formatCurrency(activity.totalValue - activity.totalInvested)}`,
          timestamp: activity.timestamp || new Date().toISOString(),
          userId: activity.userId,
          priority: Math.abs(activity.totalValue - activity.totalInvested) > 10000 ? 'high' : 'normal',
          metadata: activity
        };
      } else if (activity.type === 'investment_update') {
        processedActivity = {
          id: `investment_${activity.investmentId}_${index}`,
          type: 'investment',
          title: 'Investment Status Updated',
          description: `Investment ${activity.investmentId?.slice(-8)} status changed to ${activity.status}`,
          timestamp: new Date().toISOString(),
          userId: activity.userId,
          priority: activity.status === 'COMPLETED' ? 'high' : 'normal',
          metadata: activity
        };
      } else if (activity.type === 'pitch_update') {
        processedActivity = {
          id: `pitch_${activity.pitchId}_${index}`,
          type: 'pitch_view',
          title: 'Pitch Engagement',
          description: `Pitch viewed ${activity.viewCount} times with ${activity.engagementScore}% engagement`,
          timestamp: new Date().toISOString(),
          priority: activity.engagementScore > 80 ? 'high' : 'normal',
          metadata: activity
        };
      } else {
        // Generic activity processing
        processedActivity = {
          id: `activity_${index}_${Date.now()}`,
          type: 'system',
          title: activity.title || 'System Activity',
          description: activity.description || 'Activity occurred',
          timestamp: activity.timestamp || new Date().toISOString(),
          userId: activity.userId,
          priority: activity.priority || 'normal',
          metadata: activity
        };
      }

      return processedActivity;
    });
  }, [userActivity, maxItems]);

  // Filter activities based on selected filters and search term
  const filteredActivities = React.useMemo(() => {
    return processedActivities.filter(activity => {
      // Filter by type
      if (filter.length > 0 && !filter.includes(activity.type)) {
        return false;
      }

      // Filter by search term
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          activity.title.toLowerCase().includes(searchLower) ||
          activity.description.toLowerCase().includes(searchLower) ||
          activity.userName?.toLowerCase().includes(searchLower)
        );
      }

      return true;
    });
  }, [processedActivities, filter, searchTerm]);

  const handleFilterChange = (type: string) => {
    setFilter(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  if (!user) {
    return (
      <Card className={compact ? 'p-4' : ''}>
        <CardContent className="flex items-center justify-center py-8">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please log in to view the activity feed.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={compact ? 'p-4' : ''}>
      {showHeader && (
        <CardHeader className={compact ? 'pb-3' : ''}>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Live Activity Feed
                {isConnected ? (
                  <Wifi className="h-4 w-4 text-green-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-500" />
                )}
              </CardTitle>
              <CardDescription>
                Real-time platform activity and updates
                {lastUpdate && (
                  <span className="ml-2 text-xs">
                    • Updated {formatTimeAgo(lastUpdate)}
                  </span>
                )}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={!isConnected || isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {/* Search and Filters */}
          {showFilters && (
            <div className="flex flex-col sm:flex-row gap-3 pt-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search activities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border rounded-md text-sm"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {['investment', 'pitch_view', 'user_engagement', 'system', 'social'].map(type => (
                  <Button
                    key={type}
                    variant={filter.includes(type) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleFilterChange(type)}
                    className="text-xs"
                  >
                    {type.replace('_', ' ')}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardHeader>
      )}

      <CardContent className={compact ? 'pt-0' : ''}>
        {!isConnected && (
          <Alert className="mb-4">
            <WifiOff className="h-4 w-4" />
            <AlertDescription>
              Real-time updates are currently unavailable. {error}
            </AlertDescription>
          </Alert>
        )}

        {error && isConnected && (
          <Alert className="mb-4" variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Activity Feed */}
        <ScrollArea className="h-[400px] pr-4">
          {isLoading && filteredActivities.length === 0 && (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 p-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {filteredActivities.length > 0 ? (
            <div className="space-y-3">
              {filteredActivities.map((activity) => (
                <div
                  key={activity.id}
                  className={`flex items-start gap-3 p-3 border-l-4 rounded-r-lg transition-colors ${getActivityColor(activity.priority)}`}
                >
                  <div className="mt-1">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm truncate">
                        {activity.title}
                      </h4>
                      <Badge variant={getActivityBadgeVariant(activity.priority)} className="text-xs">
                        {activity.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {activity.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTimeAgo(new Date(activity.timestamp))}
                      </span>
                      {activity.userName && (
                        <span>by {activity.userName}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            !isLoading && (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">No Recent Activity</h3>
                <p className="text-sm text-muted-foreground">
                  {searchTerm || filter.length > 0
                    ? 'No activities match your current filters.'
                    : 'Activity feed will appear here as events occur.'}
                </p>
              </div>
            )
          )}
        </ScrollArea>

        {/* Feed Footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t mt-4">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              {isConnected ? (
                <Wifi className="h-3 w-3 text-green-500" />
              ) : (
                <WifiOff className="h-3 w-3 text-red-500" />
              )}
              {isConnected ? 'Live' : 'Offline'}
            </span>
            <span>
              Showing {filteredActivities.length} of {processedActivities.length} activities
            </span>
          </div>
          {connectionHealth.reconnectAttempts > 0 && (
            <span className="text-yellow-600">
              Reconnecting... ({connectionHealth.reconnectAttempts})
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ActivityFeed;