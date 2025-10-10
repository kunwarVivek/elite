import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRealtimeEnhanced, PitchData } from '@/hooks/use-realtime-enhanced';
import { useAuth } from '@/hooks/use-auth';
import {
  Eye,
  Users,
  Clock,
  TrendingUp,
  Activity,
  RefreshCw,
  AlertCircle,
  Wifi,
  WifiOff,
  BarChart3,
  MousePointer,
  Timer
} from 'lucide-react';
import { formatNumber, formatTimeAgo, formatDuration } from '@/lib/utils';

interface PitchEngagementProps {
  pitchId?: string;
  startupId?: string;
  showHeader?: boolean;
  compact?: boolean;
  showActivity?: boolean;
  autoRefresh?: boolean;
}

export const PitchEngagement: React.FC<PitchEngagementProps> = ({
  pitchId,
  startupId,
  showHeader = true,
  compact = false,
  showActivity = true,
  autoRefresh = true
}) => {
  const { user } = useAuth();
  const [selectedPitchId, setSelectedPitchId] = useState<string | null>(pitchId || null);

  const {
    pitchUpdates,
    isLoading,
    error,
    lastUpdate,
    isConnected,
    connectionHealth,
    subscribeToPitch,
    refreshData,
    getPitchData
  } = useRealtimeEnhanced({
    enablePitch: true,
    enableUserActivity: true,
    autoConnect: true,
    reconnectInterval: 5000,
    maxReconnectAttempts: 3
  });

  // Subscribe to pitch updates
  useEffect(() => {
    if (selectedPitchId && isConnected) {
      subscribeToPitch(selectedPitchId);
    }
  }, [selectedPitchId, isConnected, subscribeToPitch]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh || !selectedPitchId) return;

    const interval = setInterval(() => {
      if (isConnected) {
        refreshData();
      }
    }, 45000); // Refresh every 45 seconds for engagement metrics

    return () => clearInterval(interval);
  }, [autoRefresh, selectedPitchId, isConnected, refreshData]);

  const handlePitchSelect = (pId: string) => {
    setSelectedPitchId(pId);
  };

  const handleRefresh = async () => {
    if (!isConnected) return;
    await refreshData();
  };

  const getEngagementLevel = (score: number) => {
    if (score >= 80) return { level: 'Excellent', color: 'text-green-600', bgColor: 'bg-green-100' };
    if (score >= 60) return { level: 'Good', color: 'text-blue-600', bgColor: 'bg-blue-100' };
    if (score >= 40) return { level: 'Moderate', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    return { level: 'Low', color: 'text-red-600', bgColor: 'bg-red-100' };
  };

  const currentPitchData = selectedPitchId ? getPitchData(selectedPitchId) : null;
  const allPitches = Array.from(pitchUpdates.values());

  if (!user) {
    return (
      <Card className={compact ? 'p-4' : ''}>
        <CardContent className="flex items-center justify-center py-8">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please log in to view pitch engagement metrics.
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
                <BarChart3 className="h-5 w-5" />
                Pitch Engagement Metrics
                {isConnected ? (
                  <Wifi className="h-4 w-4 text-green-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-500" />
                )}
              </CardTitle>
              <CardDescription>
                Real-time pitch views and engagement tracking
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

        {/* Pitch Selection */}
        {allPitches.length > 0 && !selectedPitchId && (
          <div className="mb-6">
            <h4 className="font-medium mb-3">Select Pitch to Track</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {allPitches.map((pitch) => (
                <Button
                  key={pitch.pitchId}
                  variant="outline"
                  className="justify-start h-auto p-3"
                  onClick={() => handlePitchSelect(pitch.pitchId)}
                >
                  <div className="text-left">
                    <div className="font-medium">Pitch #{pitch.pitchId.slice(-8)}</div>
                    <div className="text-sm text-muted-foreground">
                      {pitch.viewCount} views • {pitch.engagementScore}% engagement
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Current Pitch Display */}
        {currentPitchData && (
          <div className="space-y-6">
            {/* Engagement Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* View Count */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Total Views</span>
                </div>
                <div className="text-2xl font-bold">
                  {formatNumber(currentPitchData.viewCount)}
                </div>
                <div className="text-sm text-muted-foreground">
                  Unique viewers: {formatNumber(currentPitchData.uniqueViewers)}
                </div>
              </div>

              {/* Average Time */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Avg. Time on Page</span>
                </div>
                <div className="text-2xl font-bold">
                  {formatDuration(currentPitchData.averageTimeOnPage)}
                </div>
                <div className="text-sm text-muted-foreground">
                  Engagement duration
                </div>
              </div>

              {/* Engagement Score */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Engagement Score</span>
                </div>
                <div className="text-2xl font-bold">
                  {currentPitchData.engagementScore}%
                </div>
                <Badge
                  variant="outline"
                  className={getEngagementLevel(currentPitchData.engagementScore).bgColor}
                >
                  <span className={getEngagementLevel(currentPitchData.engagementScore).color}>
                    {getEngagementLevel(currentPitchData.engagementScore).level}
                  </span>
                </Badge>
              </div>
            </div>

            {/* Engagement Progress */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Engagement Progress</span>
                <span>{currentPitchData.engagementScore}%</span>
              </div>
              <Progress value={currentPitchData.engagementScore} className="h-2" />
            </div>

            {/* Engagement Insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <MousePointer className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Interaction Rate</span>
                </div>
                <div className="text-lg font-bold">
                  {((currentPitchData.uniqueViewers / Math.max(currentPitchData.viewCount, 1)) * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">
                  Unique viewers vs total views
                </div>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Timer className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Attention Span</span>
                </div>
                <div className="text-lg font-bold">
                  {currentPitchData.averageTimeOnPage > 180 ? 'High' :
                   currentPitchData.averageTimeOnPage > 90 ? 'Medium' : 'Low'}
                </div>
                <div className="text-sm text-muted-foreground">
                  Based on average viewing time
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            {showActivity && currentPitchData.recentActivity.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Recent Activity
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {currentPitchData.recentActivity.slice(0, 10).map((activity, index) => (
                    <div key={index} className="flex items-center justify-between p-2 text-sm bg-muted/30 rounded">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span>User {activity.userId.slice(-4)}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{activity.action}</div>
                        <div className="text-muted-foreground">
                          {formatTimeAgo(new Date(activity.timestamp))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Engagement Tips */}
            {!compact && (
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <h4 className="font-medium mb-2 text-blue-900 dark:text-blue-100">
                  Engagement Tips
                </h4>
                <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  {currentPitchData.engagementScore < 50 && (
                    <>
                      <p>• Consider adding more visual elements to increase engagement</p>
                      <p>• Shorten pitch sections to maintain viewer attention</p>
                    </>
                  )}
                  {currentPitchData.engagementScore >= 50 && currentPitchData.engagementScore < 80 && (
                    <>
                      <p>• Your pitch is performing well! Consider A/B testing headlines</p>
                      <p>• Add more interactive elements to boost engagement further</p>
                    </>
                  )}
                  {currentPitchData.engagementScore >= 80 && (
                    <>
                      <p>• Excellent engagement! Your pitch is resonating with viewers</p>
                      <p>• Consider featuring successful elements in future pitches</p>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Connection Status */}
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  {isConnected ? (
                    <Wifi className="h-3 w-3 text-green-500" />
                  ) : (
                    <WifiOff className="h-3 w-3 text-red-500" />
                  )}
                  {isConnected ? 'Live' : 'Offline'}
                </span>
                {lastUpdate && (
                  <span>
                    Last update: {formatTimeAgo(lastUpdate)}
                  </span>
                )}
              </div>
              {connectionHealth.reconnectAttempts > 0 && (
                <span className="text-yellow-600">
                  Reconnecting... ({connectionHealth.reconnectAttempts})
                </span>
              )}
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && !currentPitchData && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
            <Skeleton className="h-32" />
          </div>
        )}

        {/* No Data State */}
        {!isLoading && !currentPitchData && allPitches.length === 0 && (
          <div className="text-center py-8">
            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">No Pitch Data</h3>
            <p className="text-sm text-muted-foreground">
              Subscribe to pitches to see real-time engagement metrics.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PitchEngagement;