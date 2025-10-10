import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRealtimeEnhanced, PortfolioData } from '@/hooks/use-realtime-enhanced';
import { useAuth } from '@/hooks/use-auth';
import { TrendingUp, TrendingDown, DollarSign, Activity, RefreshCw, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { formatCurrency, formatPercentage, formatTimeAgo } from '@/lib/utils';

interface LivePortfolioUpdatesProps {
  userId?: string;
  showHeader?: boolean;
  compact?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const LivePortfolioUpdates: React.FC<LivePortfolioUpdatesProps> = ({
  userId,
  showHeader = true,
  compact = false,
  autoRefresh = true,
  refreshInterval = 30000
}) => {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;
  const [lastManualRefresh, setLastManualRefresh] = useState<Date | null>(null);

  const {
    portfolioData,
    isLoading,
    error,
    lastUpdate,
    isConnected,
    connectionHealth,
    subscribeToPortfolio,
    refreshData,
    isDataStale
  } = useRealtimeEnhanced({
    enablePortfolio: true,
    enableMarketData: true,
    autoConnect: true,
    reconnectInterval: 5000,
    maxReconnectAttempts: 3
  });

  // Subscribe to portfolio updates when component mounts
  useEffect(() => {
    if (targetUserId && isConnected) {
      subscribeToPortfolio(targetUserId);
    }
  }, [targetUserId, isConnected, subscribeToPortfolio]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh || !targetUserId) return;

    const interval = setInterval(() => {
      if (isConnected && !isDataStale(60000)) { // Only refresh if data is stale
        refreshData();
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, targetUserId, isConnected, refreshData, isDataStale]);

  const handleManualRefresh = async () => {
    if (!isConnected) return;

    setLastManualRefresh(new Date());
    await refreshData();
  };

  const getPortfolioHealth = () => {
    if (!portfolioData) return { status: 'unknown', color: 'gray' };

    const gainLossPercentage = portfolioData.totalValue > 0
      ? ((portfolioData.totalValue - portfolioData.totalInvested) / portfolioData.totalInvested) * 100
      : 0;

    if (gainLossPercentage > 10) return { status: 'excellent', color: 'green' };
    if (gainLossPercentage > 0) return { status: 'good', color: 'blue' };
    if (gainLossPercentage > -10) return { status: 'moderate', color: 'yellow' };
    return { status: 'poor', color: 'red' };
  };

  const portfolioHealth = getPortfolioHealth();

  if (!targetUserId) {
    return (
      <Card className={compact ? 'p-4' : ''}>
        <CardContent className="flex items-center justify-center py-8">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please log in to view your portfolio updates.
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
                Live Portfolio Updates
                {isConnected ? (
                  <Wifi className="h-4 w-4 text-green-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-500" />
                )}
              </CardTitle>
              <CardDescription>
                Real-time portfolio performance and activity
                {lastUpdate && (
                  <span className="ml-2 text-xs">
                    • Updated {formatTimeAgo(lastUpdate)}
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={portfolioHealth.status === 'excellent' ? 'default' :
                           portfolioHealth.status === 'good' ? 'secondary' :
                           portfolioHealth.status === 'moderate' ? 'outline' : 'destructive'}>
                {portfolioHealth.status}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualRefresh}
                disabled={!isConnected || isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
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

        {!portfolioData && isLoading && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
            <Skeleton className="h-32" />
          </div>
        )}

        {portfolioData && (
          <div className="space-y-6">
            {/* Portfolio Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Total Value */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Total Value</span>
                </div>
                <div className="text-2xl font-bold">
                  {formatCurrency(portfolioData.totalValue)}
                </div>
                <div className={`flex items-center gap-1 text-sm ${
                  portfolioData.unrealizedGains >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {portfolioData.unrealizedGains >= 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  {formatCurrency(Math.abs(portfolioData.unrealizedGains))}
                  ({formatPercentage(Math.abs(portfolioData.unrealizedGains / portfolioData.totalInvested))})
                </div>
              </div>

              {/* Total Invested */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Total Invested</span>
                </div>
                <div className="text-2xl font-bold">
                  {formatCurrency(portfolioData.totalInvested)}
                </div>
                <div className="text-sm text-muted-foreground">
                  Across {portfolioData.investmentCount} investments
                </div>
              </div>

              {/* Investment Count */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Active Investments</span>
                </div>
                <div className="text-2xl font-bold">
                  {portfolioData.investmentCount}
                </div>
                <div className="text-sm text-muted-foreground">
                  Diversified portfolio
                </div>
              </div>
            </div>

            {/* Top Performers */}
            {!compact && portfolioData.topPerformers.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium">Top Performers</h4>
                <div className="space-y-2">
                  {portfolioData.topPerformers.map((performer, index) => (
                    <div key={performer.startupId} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{performer.startupName}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatCurrency(performer.currentValue)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`flex items-center gap-1 ${
                          performer.gainLoss >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {performer.gainLoss >= 0 ? (
                            <TrendingUp className="h-4 w-4" />
                          ) : (
                            <TrendingDown className="h-4 w-4" />
                          )}
                          {formatPercentage(performer.gainLossPercentage)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatCurrency(Math.abs(performer.gainLoss))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Activity */}
            {!compact && portfolioData.recentActivity.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium">Recent Activity</h4>
                <div className="space-y-2">
                  {portfolioData.recentActivity.slice(0, 5).map((activity, index) => (
                    <div key={index} className="flex items-center justify-between p-2 text-sm">
                      <span>{activity.startupName}</span>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(activity.amount)}</div>
                        <div className="text-muted-foreground">
                          {formatTimeAgo(new Date(activity.timestamp))}
                        </div>
                      </div>
                    </div>
                  ))}
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
                {lastManualRefresh && (
                  <span>
                    Manual refresh: {formatTimeAgo(lastManualRefresh)}
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

        {portfolioData && isDataStale() && (
          <Alert className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Portfolio data may be outdated. Last updated {formatTimeAgo(lastUpdate!)}.
              <Button
                variant="link"
                className="p-0 h-auto ml-2"
                onClick={handleManualRefresh}
              >
                Refresh now
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default LivePortfolioUpdates;