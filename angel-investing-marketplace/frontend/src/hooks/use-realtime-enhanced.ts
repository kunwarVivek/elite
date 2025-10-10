import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocketStore } from '@/stores/websocket.store';

export interface PortfolioData {
  userId: string;
  totalValue: number;
  totalInvested: number;
  unrealizedGains: number;
  realizedGains: number;
  investmentCount: number;
  topPerformers: Array<{
    startupId: string;
    startupName: string;
    currentValue: number;
    gainLoss: number;
    gainLossPercentage: number;
  }>;
  recentActivity: Array<{
    type: string;
    startupName: string;
    amount: number;
    timestamp: string;
  }>;
}

export interface InvestmentData {
  investmentId: string;
  userId: string;
  startupId: string;
  status: string;
  currentValue?: number;
  milestone?: {
    title: string;
    completed: boolean;
    completedAt?: string;
  };
  nextMilestone?: {
    title: string;
    dueDate: string;
    progress: number;
  };
}

export interface PitchData {
  pitchId: string;
  startupId: string;
  viewCount: number;
  uniqueViewers: number;
  averageTimeOnPage: number;
  engagementScore: number;
  recentActivity: Array<{
    userId: string;
    action: string;
    timestamp: string;
  }>;
}

export interface MarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string;
  market: string;
}

export interface LiveMetricsData {
  activeUsers: number;
  totalInvestments: number;
  totalPortfolioValue: number;
  platformGrowth: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  topIndustries: Array<{
    industry: string;
    investmentCount: number;
    totalAmount: number;
  }>;
}

export interface SystemStatus {
  healthy: boolean;
  services: Record<string, boolean>;
  message?: string;
  timestamp: string;
}

interface UseRealtimeEnhancedOptions {
  enablePortfolio?: boolean;
  enableInvestment?: boolean;
  enablePitch?: boolean;
  enableMarketData?: boolean;
  enableLiveMetrics?: boolean;
  enableSystemStatus?: boolean;
  enableUserActivity?: boolean;
  autoConnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export const useRealtimeEnhanced = (options: UseRealtimeEnhancedOptions = {}) => {
  const {
    enablePortfolio = true,
    enableInvestment = true,
    enablePitch = true,
    enableMarketData = true,
    enableLiveMetrics = true,
    enableSystemStatus = true,
    enableUserActivity = true,
    autoConnect = true,
    reconnectInterval = 5000,
    maxReconnectAttempts = 5,
  } = options;

  const { socket, isConnected, sendMessage, joinRoom, leaveRoom } = useWebSocketStore();

  // State for different data types
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
  const [investmentUpdates, setInvestmentUpdates] = useState<Map<string, InvestmentData>>(new Map());
  const [pitchUpdates, setPitchUpdates] = useState<Map<string, PitchData>>(new Map());
  const [marketData, setMarketData] = useState<Map<string, MarketData>>(new Map());
  const [liveMetrics, setLiveMetrics] = useState<LiveMetricsData | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [userActivity, setUserActivity] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Refs for managing subscriptions and intervals
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const subscriptions = useRef<Set<string>>(new Set());
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);

  // Subscribe to portfolio updates
  const subscribeToPortfolio = useCallback((userId: string) => {
    if (!isConnected || !enablePortfolio) return;

    const roomId = `user_portfolio:${userId}`;
    joinRoom(roomId);
    subscriptions.current.add(roomId);

    sendMessage('subscribe_portfolio', { userId });

    console.log('Subscribed to portfolio updates:', userId);
  }, [isConnected, enablePortfolio, joinRoom, sendMessage]);

  // Subscribe to investment updates
  const subscribeToInvestment = useCallback((investmentId: string) => {
    if (!isConnected || !enableInvestment) return;

    const roomId = `investment:${investmentId}`;
    joinRoom(roomId);
    subscriptions.current.add(roomId);

    sendMessage('subscribe_investment', { investmentId });

    console.log('Subscribed to investment updates:', investmentId);
  }, [isConnected, enableInvestment, joinRoom, sendMessage]);

  // Subscribe to pitch updates
  const subscribeToPitch = useCallback((pitchId: string) => {
    if (!isConnected || !enablePitch) return;

    const roomId = `pitch:${pitchId}`;
    joinRoom(roomId);
    subscriptions.current.add(roomId);

    sendMessage('subscribe_pitch', { pitchId });

    console.log('Subscribed to pitch updates:', pitchId);
  }, [isConnected, enablePitch, joinRoom, sendMessage]);

  // Subscribe to market data
  const subscribeToMarketData = useCallback(() => {
    if (!isConnected || !enableMarketData) return;

    joinRoom('global');
    subscriptions.current.add('global');

    console.log('Subscribed to market data updates');
  }, [isConnected, enableMarketData, joinRoom]);

  // Subscribe to live metrics
  const subscribeToLiveMetrics = useCallback(() => {
    if (!isConnected || !enableLiveMetrics) return;

    joinRoom('admin');
    subscriptions.current.add('admin');

    console.log('Subscribed to live metrics updates');
  }, [isConnected, enableLiveMetrics, joinRoom]);

  // Subscribe to system status
  const subscribeToSystemStatus = useCallback(() => {
    if (!isConnected || !enableSystemStatus) return;

    joinRoom('system');
    subscriptions.current.add('system');

    console.log('Subscribed to system status updates');
  }, [isConnected, enableSystemStatus, joinRoom]);

  // Unsubscribe from all subscriptions
  const unsubscribeAll = useCallback(() => {
    subscriptions.current.forEach(roomId => {
      leaveRoom(roomId);
    });
    subscriptions.current.clear();

    console.log('Unsubscribed from all real-time updates');
  }, [leaveRoom]);

  // Handle reconnection logic
  const handleReconnection = useCallback(() => {
    if (reconnectAttempts.current >= maxReconnectAttempts) {
      setError('Max reconnection attempts reached');
      return;
    }

    reconnectAttempts.current++;
    setIsLoading(true);

    reconnectTimeout.current = setTimeout(() => {
      if (isConnected) {
        // Re-subscribe to all previous subscriptions
        subscriptions.current.forEach(roomId => {
          joinRoom(roomId);
        });
        reconnectAttempts.current = 0;
        setIsLoading(false);
        setError(null);
        console.log('Reconnected and restored subscriptions');
      } else {
        handleReconnection();
      }
    }, reconnectInterval);
  }, [isConnected, joinRoom, reconnectInterval, maxReconnectAttempts]);

  // Start heartbeat to monitor connection
  const startHeartbeat = useCallback(() => {
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
    }

    heartbeatInterval.current = setInterval(() => {
      if (isConnected) {
        sendMessage('heartbeat', { timestamp: new Date().toISOString() });
      }
    }, 30000); // Send heartbeat every 30 seconds
  }, [isConnected, sendMessage]);

  // Stop heartbeat
  const stopHeartbeat = useCallback(() => {
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
      heartbeatInterval.current = null;
    }
  }, []);

  // Set up WebSocket event listeners
  useEffect(() => {
    if (!isConnected || !socket) return;

    const handlePortfolioUpdate = (data: PortfolioData) => {
      setPortfolioData(data);
      setLastUpdate(new Date());
    };

    const handleInvestmentUpdate = (data: InvestmentData) => {
      setInvestmentUpdates(prev => {
        const newMap = new Map(prev);
        newMap.set(data.investmentId, data);
        return newMap;
      });
      setLastUpdate(new Date());
    };

    const handlePitchUpdate = (data: PitchData) => {
      setPitchUpdates(prev => {
        const newMap = new Map(prev);
        newMap.set(data.pitchId, data);
        return newMap;
      });
      setLastUpdate(new Date());
    };

    const handleMarketDataUpdate = (data: MarketData) => {
      setMarketData(prev => {
        const newMap = new Map(prev);
        newMap.set(data.symbol, data);
        return newMap;
      });
      setLastUpdate(new Date());
    };

    const handleBulkMarketData = (data: { updates: MarketData[] }) => {
      setMarketData(prev => {
        const newMap = new Map(prev);
        data.updates.forEach(update => {
          newMap.set(update.symbol, update);
        });
        return newMap;
      });
      setLastUpdate(new Date());
    };

    const handleLiveMetrics = (data: LiveMetricsData) => {
      setLiveMetrics(data);
      setLastUpdate(new Date());
    };

    const handleSystemStatus = (data: SystemStatus) => {
      setSystemStatus(data);
      setLastUpdate(new Date());
    };

    const handleUserActivity = (data: any) => {
      setUserActivity(prev => [data, ...prev.slice(0, 49)]); // Keep last 50 activities
      setLastUpdate(new Date());
    };

    const handleConnectionError = (data: { message: string }) => {
      setError(data.message);
      handleReconnection();
    };

    const handleRateLimited = (data: { event: string; retryAfter: number }) => {
      setError(`Rate limited for ${data.event}. Retry after ${data.retryAfter}ms`);
    };

    // Set up event listeners
    socket.on('portfolio_update', handlePortfolioUpdate);
    socket.on('investment_update', handleInvestmentUpdate);
    socket.on('pitch_update', handlePitchUpdate);
    socket.on('market_data', handleMarketDataUpdate);
    socket.on('bulk_market_data', handleBulkMarketData);
    socket.on('live_metrics', handleLiveMetrics);
    socket.on('system_status', handleSystemStatus);
    socket.on('user_activity', handleUserActivity);
    socket.on('connection_error', handleConnectionError);
    socket.on('rate_limited', handleRateLimited);

    // Start heartbeat
    startHeartbeat();

    return () => {
      socket.off('portfolio_update', handlePortfolioUpdate);
      socket.off('investment_update', handleInvestmentUpdate);
      socket.off('pitch_update', handlePitchUpdate);
      socket.off('market_data', handleMarketDataUpdate);
      socket.off('bulk_market_data', handleBulkMarketData);
      socket.off('live_metrics', handleLiveMetrics);
      socket.off('system_status', handleSystemStatus);
      socket.off('user_activity', handleUserActivity);
      socket.off('connection_error', handleConnectionError);
      socket.off('rate_limited', handleRateLimited);

      stopHeartbeat();
    };
  }, [isConnected, socket, startHeartbeat, stopHeartbeat, handleReconnection]);

  // Handle connection status changes
  useEffect(() => {
    if (isConnected && autoConnect) {
      setIsLoading(false);
      setError(null);
      reconnectAttempts.current = 0;

      // Auto-subscribe to enabled data types
      if (enableMarketData) subscribeToMarketData();
      if (enableLiveMetrics) subscribeToLiveMetrics();
      if (enableSystemStatus) subscribeToSystemStatus();
    } else if (!isConnected && autoConnect) {
      setIsLoading(true);
      if (reconnectAttempts.current === 0) {
        handleReconnection();
      }
    }
  }, [
    isConnected,
    autoConnect,
    enableMarketData,
    enableLiveMetrics,
    enableSystemStatus,
    subscribeToMarketData,
    subscribeToLiveMetrics,
    subscribeToSystemStatus,
    handleReconnection
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unsubscribeAll();
      stopHeartbeat();

      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
    };
  }, [unsubscribeAll, stopHeartbeat]);

  // Get specific investment data
  const getInvestmentData = useCallback((investmentId: string): InvestmentData | undefined => {
    return investmentUpdates.get(investmentId);
  }, [investmentUpdates]);

  // Get specific pitch data
  const getPitchData = useCallback((pitchId: string): PitchData | undefined => {
    return pitchUpdates.get(pitchId);
  }, [pitchUpdates]);

  // Get specific market data
  const getMarketData = useCallback((symbol: string): MarketData | undefined => {
    return marketData.get(symbol);
  }, [marketData]);

  // Get all market data as array
  const getAllMarketData = useCallback((): MarketData[] => {
    return Array.from(marketData.values());
  }, [marketData]);

  // Get recent user activity
  const getRecentActivity = useCallback((limit: number = 10): any[] => {
    return userActivity.slice(0, limit);
  }, [userActivity]);

  // Check if data is stale
  const isDataStale = useCallback((maxAge: number = 30000): boolean => {
    if (!lastUpdate) return true;
    return Date.now() - lastUpdate.getTime() > maxAge;
  }, [lastUpdate]);

  // Manual refresh function
  const refreshData = useCallback(async () => {
    if (!isConnected) return;

    setIsLoading(true);
    setError(null);

    try {
      // Trigger data refresh from server
      sendMessage('refresh_data', {
        types: [
          enablePortfolio && 'portfolio',
          enableInvestment && 'investment',
          enablePitch && 'pitch',
          enableMarketData && 'market_data',
          enableLiveMetrics && 'live_metrics',
          enableSystemStatus && 'system_status'
        ].filter(Boolean),
        timestamp: new Date().toISOString()
      });

      setLastUpdate(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh data');
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, sendMessage, enablePortfolio, enableInvestment, enablePitch, enableMarketData, enableLiveMetrics, enableSystemStatus]);

  // Get connection health status
  const getConnectionHealth = useCallback(() => {
    return {
      isConnected,
      isLoading,
      error,
      lastUpdate,
      reconnectAttempts: reconnectAttempts.current,
      subscriptionsCount: subscriptions.current.size,
      isDataStale: isDataStale()
    };
  }, [isConnected, isLoading, error, lastUpdate, isDataStale]);

  return {
    // State
    portfolioData,
    investmentUpdates: Array.from(investmentUpdates.values()),
    pitchUpdates: Array.from(pitchUpdates.values()),
    marketData: getAllMarketData(),
    liveMetrics,
    systemStatus,
    userActivity,
    isLoading,
    error,
    lastUpdate,
    isConnected,

    // Connection health
    connectionHealth: getConnectionHealth(),

    // Actions
    subscribeToPortfolio,
    subscribeToInvestment,
    subscribeToPitch,
    subscribeToMarketData,
    subscribeToLiveMetrics,
    subscribeToSystemStatus,
    unsubscribeAll,

    // Data accessors
    getInvestmentData,
    getPitchData,
    getMarketData,
    getAllMarketData,
    getRecentActivity,

    // Utilities
    refreshData,
    isDataStale,

    // Subscription management
    activeSubscriptions: Array.from(subscriptions.current),
  };
};

export default useRealtimeEnhanced;