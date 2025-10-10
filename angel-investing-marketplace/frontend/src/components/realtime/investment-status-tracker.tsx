import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRealtimeEnhanced, InvestmentData } from '@/hooks/use-realtime-enhanced';
import { useAuth } from '@/hooks/use-auth';
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Target,
  RefreshCw,
  AlertCircle,
  Wifi,
  WifiOff,
  DollarSign
} from 'lucide-react';
import { formatCurrency, formatTimeAgo, formatDate } from '@/lib/utils';

interface InvestmentStatusTrackerProps {
  investmentId?: string;
  userId?: string;
  showHeader?: boolean;
  compact?: boolean;
  showMilestones?: boolean;
  autoRefresh?: boolean;
}

export const InvestmentStatusTracker: React.FC<InvestmentStatusTrackerProps> = ({
  investmentId,
  userId,
  showHeader = true,
  compact = false,
  showMilestones = true,
  autoRefresh = true
}) => {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;
  const [selectedInvestmentId, setSelectedInvestmentId] = useState<string | null>(investmentId || null);

  const {
    investmentUpdates,
    isLoading,
    error,
    lastUpdate,
    isConnected,
    connectionHealth,
    subscribeToInvestment,
    refreshData,
    getInvestmentData
  } = useRealtimeEnhanced({
    enableInvestment: true,
    autoConnect: true,
    reconnectInterval: 5000,
    maxReconnectAttempts: 3
  });

  // Subscribe to investment updates
  useEffect(() => {
    if (selectedInvestmentId && isConnected) {
      subscribeToInvestment(selectedInvestmentId);
    }
  }, [selectedInvestmentId, isConnected, subscribeToInvestment]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh || !selectedInvestmentId) return;

    const interval = setInterval(() => {
      if (isConnected) {
        refreshData();
      }
    }, 60000); // Refresh every minute for investment updates

    return () => clearInterval(interval);
  }, [autoRefresh, selectedInvestmentId, isConnected, refreshData]);

  const handleInvestmentSelect = (invId: string) => {
    setSelectedInvestmentId(invId);
  };

  const handleRefresh = async () => {
    if (!isConnected) return;
    await refreshData();
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing':
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'failed':
      case 'cancelled':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'active':
        return 'bg-green-500';
      case 'processing':
      case 'pending':
        return 'bg-yellow-500';
      case 'failed':
      case 'cancelled':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'active':
        return 'default';
      case 'processing':
      case 'pending':
        return 'secondary';
      case 'failed':
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const currentInvestmentData = selectedInvestmentId
    ? getInvestmentData(selectedInvestmentId)
    : null;

  const allInvestments = Array.from(investmentUpdates.values());

  if (!targetUserId) {
    return (
      <Card className={compact ? 'p-4' : ''}>
        <CardContent className="flex items-center justify-center py-8">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please log in to view your investment updates.
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
                <Target className="h-5 w-5" />
                Investment Status Tracker
                {isConnected ? (
                  <Wifi className="h-4 w-4 text-green-500" />
                ) : (
                  <WifiOff className="h-4 w-4 text-red-500" />
                )}
              </CardTitle>
              <CardDescription>
                Real-time investment progress and milestone tracking
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

        {/* Investment Selection */}
        {allInvestments.length > 0 && !selectedInvestmentId && (
          <div className="mb-6">
            <h4 className="font-medium mb-3">Select Investment to Track</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {allInvestments.map((investment) => (
                <Button
                  key={investment.investmentId}
                  variant="outline"
                  className="justify-start h-auto p-3"
                  onClick={() => handleInvestmentSelect(investment.investmentId)}
                >
                  <div className="text-left">
                    <div className="font-medium">Investment #{investment.investmentId.slice(-8)}</div>
                    <div className="text-sm text-muted-foreground">
                      Status: {investment.status}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Current Investment Display */}
        {currentInvestmentData && (
          <div className="space-y-6">
            {/* Investment Overview */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getStatusIcon(currentInvestmentData.status)}
                <div>
                  <div className="font-medium">
                    Investment #{currentInvestmentData.investmentId.slice(-8)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {currentInvestmentData.startupId}
                  </div>
                </div>
              </div>
              <Badge variant={getStatusVariant(currentInvestmentData.status)}>
                {currentInvestmentData.status}
              </Badge>
            </div>

            {/* Current Value */}
            {currentInvestmentData.currentValue && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Current Value</span>
                </div>
                <div className="text-2xl font-bold">
                  {formatCurrency(currentInvestmentData.currentValue)}
                </div>
              </div>
            )}

            {/* Active Milestone */}
            {currentInvestmentData.milestone && showMilestones && (
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Current Milestone
                </h4>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    {currentInvestmentData.milestone.completed ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Clock className="h-4 w-4 text-yellow-500" />
                    )}
                    <span className="font-medium">{currentInvestmentData.milestone.title}</span>
                  </div>
                  {currentInvestmentData.milestone.completed && currentInvestmentData.milestone.completedAt && (
                    <div className="text-sm text-muted-foreground">
                      Completed on {formatDate(new Date(currentInvestmentData.milestone.completedAt))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Next Milestone */}
            {currentInvestmentData.nextMilestone && showMilestones && (
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Next Milestone
                </h4>
                <div className="space-y-3">
                  <div className="p-4 border rounded-lg">
                    <div className="font-medium mb-2">
                      {currentInvestmentData.nextMilestone.title}
                    </div>
                    <div className="text-sm text-muted-foreground mb-3">
                      Due: {formatDate(new Date(currentInvestmentData.nextMilestone.dueDate))}
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{currentInvestmentData.nextMilestone.progress}%</span>
                      </div>
                      <Progress value={currentInvestmentData.nextMilestone.progress} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Investment Timeline */}
            {!compact && (
              <div className="space-y-3">
                <h4 className="font-medium">Investment Timeline</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <div className="font-medium">Investment Initiated</div>
                      <div className="text-sm text-muted-foreground">Investment process started</div>
                    </div>
                  </div>

                  {currentInvestmentData.status === 'PROCESSING' && (
                    <div className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                      <div className="flex-1">
                        <div className="font-medium">Payment Processing</div>
                        <div className="text-sm text-muted-foreground">Payment is being processed</div>
                      </div>
                    </div>
                  )}

                  {currentInvestmentData.status === 'ACTIVE' && (
                    <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div className="flex-1">
                        <div className="font-medium">Investment Active</div>
                        <div className="text-sm text-muted-foreground">Investment is now active</div>
                      </div>
                    </div>
                  )}

                  {currentInvestmentData.milestone?.completed && (
                    <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <div className="flex-1">
                        <div className="font-medium">Milestone Completed</div>
                        <div className="text-sm text-muted-foreground">
                          {currentInvestmentData.milestone.title}
                        </div>
                      </div>
                    </div>
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
        {isLoading && !currentInvestmentData && (
          <div className="space-y-4">
            <Skeleton className="h-20" />
            <Skeleton className="h-32" />
            <Skeleton className="h-24" />
          </div>
        )}

        {/* No Data State */}
        {!isLoading && !currentInvestmentData && allInvestments.length === 0 && (
          <div className="text-center py-8">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium mb-2">No Investment Updates</h3>
            <p className="text-sm text-muted-foreground">
              Subscribe to investments to see real-time status updates.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InvestmentStatusTracker;