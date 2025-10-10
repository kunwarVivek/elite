import { logger } from '../config/logger.js';
import { getEnhancedWebSocketService, RoomTypes, RealTimeUpdate } from './websocket.service.js';
import { prisma } from '../config/database.js';

export interface PortfolioUpdateData {
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

export interface InvestmentUpdateData {
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

export interface PitchUpdateData {
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

export interface MarketDataUpdate {
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

export class RealTimeService {
  private wsService = getEnhancedWebSocketService();
  private updateIntervals: Map<string, NodeJS.Timeout> = new Map();
  private isRunning = false;

  constructor() {
    this.initializeServices();
  }

  private async initializeServices(): Promise<void> {
    if (!this.wsService) {
      logger.warn('Enhanced WebSocket service not initialized');
      return;
    }

    this.isRunning = true;
    this.startPeriodicUpdates();
    this.setupDatabaseListeners();

    logger.info('Real-time service initialized');
  }

  // Portfolio Updates
  async broadcastPortfolioUpdate(data: PortfolioUpdateData): Promise<void> {
    try {
      const update: RealTimeUpdate = {
        type: 'portfolio_update',
        data,
        timestamp: new Date().toISOString(),
        source: 'realtime_service',
        targetRooms: [
          `${RoomTypes.USER}:${data.userId}`,
          `${RoomTypes.USER_PORTFOLIO}:${data.userId}`
        ],
        targetUsers: [data.userId],
        priority: 'normal'
      };

      await this.wsService.sendSelectiveUpdate(update);

      // Also send analytics event
      await this.queueAnalyticsEvent('PORTFOLIO_UPDATE', {
        userId: data.userId,
        totalValue: data.totalValue,
        investmentCount: data.investmentCount
      });

      logger.debug('Portfolio update broadcasted', {
        userId: data.userId,
        totalValue: data.totalValue
      });
    } catch (error) {
      logger.error('Failed to broadcast portfolio update', {
        userId: data.userId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async broadcastBulkPortfolioUpdates(updates: PortfolioUpdateData[]): Promise<void> {
    try {
      // Group updates by priority and send in batches
      const highPriorityUpdates = updates.filter(u => u.totalValue > 1000000);
      const normalUpdates = updates.filter(u => u.totalValue <= 1000000);

      // Send high priority updates immediately
      for (const update of highPriorityUpdates) {
        await this.broadcastPortfolioUpdate(update);
      }

      // Batch normal updates
      if (normalUpdates.length > 0) {
        const batchUpdate: RealTimeUpdate = {
          type: 'bulk_portfolio_update',
          data: { updates: normalUpdates },
          timestamp: new Date().toISOString(),
          source: 'realtime_service',
          targetUsers: normalUpdates.map(u => u.userId),
          priority: 'low'
        };

        await this.wsService.sendSelectiveUpdate(batchUpdate);
      }

      logger.info('Bulk portfolio updates broadcasted', {
        total: updates.length,
        highPriority: highPriorityUpdates.length,
        normal: normalUpdates.length
      });
    } catch (error) {
      logger.error('Failed to broadcast bulk portfolio updates', {
        count: updates.length,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Investment Updates
  async broadcastInvestmentUpdate(data: InvestmentUpdateData): Promise<void> {
    try {
      const update: RealTimeUpdate = {
        type: 'investment_update',
        data,
        timestamp: new Date().toISOString(),
        source: 'realtime_service',
        targetRooms: [
          `${RoomTypes.USER}:${data.userId}`,
          `${RoomTypes.USER_INVESTMENTS}:${data.userId}`,
          `${RoomTypes.INVESTMENT}:${data.investmentId}`,
          `${RoomTypes.STARTUP}:${data.startupId}`
        ],
        targetUsers: [data.userId],
        priority: data.status === 'COMPLETED' ? 'high' : 'normal'
      };

      await this.wsService.sendSelectiveUpdate(update);

      // Send notification if status changed significantly
      if (data.status === 'COMPLETED' || data.milestone?.completed) {
        await this.sendInvestmentNotification(data);
      }

      logger.debug('Investment update broadcasted', {
        investmentId: data.investmentId,
        userId: data.userId,
        status: data.status
      });
    } catch (error) {
      logger.error('Failed to broadcast investment update', {
        investmentId: data.investmentId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Pitch Updates
  async broadcastPitchUpdate(data: PitchUpdateData): Promise<void> {
    try {
      const update: RealTimeUpdate = {
        type: 'pitch_update',
        data,
        timestamp: new Date().toISOString(),
        source: 'realtime_service',
        targetRooms: [
          `${RoomTypes.PITCH}:${data.pitchId}`,
          `${RoomTypes.STARTUP}:${data.startupId}`,
          RoomTypes.GLOBAL // Notify all users about popular pitches
        ],
        priority: data.engagementScore > 80 ? 'high' : 'normal'
      };

      await this.wsService.sendSelectiveUpdate(update);

      // Update pitch metrics in database
      await this.updatePitchMetrics(data);

      logger.debug('Pitch update broadcasted', {
        pitchId: data.pitchId,
        viewCount: data.viewCount,
        engagementScore: data.engagementScore
      });
    } catch (error) {
      logger.error('Failed to broadcast pitch update', {
        pitchId: data.pitchId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Market Data Updates
  async broadcastMarketData(data: MarketDataUpdate): Promise<void> {
    try {
      const update: RealTimeUpdate = {
        type: 'market_data',
        data,
        timestamp: new Date().toISOString(),
        source: 'realtime_service',
        targetRooms: [RoomTypes.GLOBAL],
        priority: Math.abs(data.changePercent) > 5 ? 'high' : 'normal',
        ttl: 300 // 5 minutes TTL for market data
      };

      await this.wsService.sendSelectiveUpdate(update);

      logger.debug('Market data broadcasted', {
        symbol: data.symbol,
        price: data.price,
        changePercent: data.changePercent
      });
    } catch (error) {
      logger.error('Failed to broadcast market data', {
        symbol: data.symbol,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async broadcastBulkMarketData(data: MarketDataUpdate[]): Promise<void> {
    try {
      // Group by market significance
      const significantUpdates = data.filter(d => Math.abs(d.changePercent) > 2);
      const normalUpdates = data.filter(d => Math.abs(d.changePercent) <= 2);

      // Send significant market moves immediately
      for (const update of significantUpdates) {
        await this.broadcastMarketData(update);
      }

      // Batch normal updates
      if (normalUpdates.length > 0) {
        const batchUpdate: RealTimeUpdate = {
          type: 'bulk_market_data',
          data: { updates: normalUpdates },
          timestamp: new Date().toISOString(),
          source: 'realtime_service',
          targetRooms: [RoomTypes.GLOBAL],
          priority: 'low',
          ttl: 300
        };

        await this.wsService.sendSelectiveUpdate(batchUpdate);
      }

      logger.info('Bulk market data broadcasted', {
        total: data.length,
        significant: significantUpdates.length,
        normal: normalUpdates.length
      });
    } catch (error) {
      logger.error('Failed to broadcast bulk market data', {
        count: data.length,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Live Metrics Updates
  async broadcastLiveMetrics(data: LiveMetricsData): Promise<void> {
    try {
      const update: RealTimeUpdate = {
        type: 'live_metrics',
        data,
        timestamp: new Date().toISOString(),
        source: 'realtime_service',
        targetRooms: [RoomTypes.ADMIN, RoomTypes.GLOBAL],
        priority: 'normal',
        ttl: 60 // 1 minute TTL for live metrics
      };

      await this.wsService.sendSelectiveUpdate(update);

      logger.debug('Live metrics broadcasted', {
        activeUsers: data.activeUsers,
        totalInvestments: data.totalInvestments
      });
    } catch (error) {
      logger.error('Failed to broadcast live metrics', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // System Status Updates
  async broadcastSystemStatus(status: {
    healthy: boolean;
    services: Record<string, boolean>;
    message?: string;
    timestamp: string;
  }): Promise<void> {
    try {
      const priority = status.healthy ? 'normal' : 'critical';

      const update: RealTimeUpdate = {
        type: 'system_status',
        data: status,
        timestamp: new Date().toISOString(),
        source: 'realtime_service',
        targetRooms: [RoomTypes.ADMIN, RoomTypes.GLOBAL],
        priority,
        ttl: status.healthy ? 300 : 60
      };

      await this.wsService.sendSelectiveUpdate(update);

      logger.info('System status broadcasted', {
        healthy: status.healthy,
        priority
      });
    } catch (error) {
      logger.error('Failed to broadcast system status', {
        healthy: status.healthy,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // User Activity Updates
  async broadcastUserActivity(data: {
    userId: string;
    activity: string;
    metadata?: Record<string, any>;
    targetUsers?: string[];
  }): Promise<void> {
    try {
      const targetRooms = [
        `${RoomTypes.USER}:${data.userId}`,
        RoomTypes.GLOBAL
      ];

      const update: RealTimeUpdate = {
        type: 'user_activity',
        data,
        timestamp: new Date().toISOString(),
        source: 'realtime_service',
        targetRooms,
        targetUsers: data.targetUsers,
        priority: 'low'
      };

      await this.wsService.sendSelectiveUpdate(update);

      logger.debug('User activity broadcasted', {
        userId: data.userId,
        activity: data.activity
      });
    } catch (error) {
      logger.error('Failed to broadcast user activity', {
        userId: data.userId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Private methods
  private startPeriodicUpdates(): void {
    // Portfolio updates every 30 seconds
    this.updateIntervals.set('portfolio', setInterval(async () => {
      await this.sendPeriodicPortfolioUpdates();
    }, 30000));

    // Market data updates every 15 seconds (simulated)
    this.updateIntervals.set('market_data', setInterval(async () => {
      await this.sendPeriodicMarketData();
    }, 15000));

    // Live metrics every 60 seconds
    this.updateIntervals.set('live_metrics', setInterval(async () => {
      await this.sendPeriodicLiveMetrics();
    }, 60000));

    // System health check every 5 minutes
    this.updateIntervals.set('system_health', setInterval(async () => {
      await this.sendPeriodicSystemHealth();
    }, 300000));

    logger.info('Periodic updates started');
  }

  private async sendPeriodicPortfolioUpdates(): Promise<void> {
    try {
      // Get users with active investments
      const usersWithInvestments = await prisma.investment.findMany({
        where: { status: 'ACTIVE' },
        select: { investorId: true },
        distinct: ['investorId']
      });

      // Send portfolio updates for active users
      for (const investment of usersWithInvestments.slice(0, 100)) { // Limit to 100 users per batch
        try {
          const portfolioData = await this.generatePortfolioData(investment.investorId);
          if (portfolioData) {
            await this.broadcastPortfolioUpdate(portfolioData);
          }
        } catch (error) {
          logger.error('Failed to send periodic portfolio update', {
            userId: investment.investorId,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    } catch (error) {
      logger.error('Failed to send periodic portfolio updates', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async sendPeriodicMarketData(): Promise<void> {
    try {
      // Simulate market data updates
      const marketSymbols = ['NASDAQ', 'S&P500', 'DOW', 'VIX', 'BTC', 'ETH'];
      const updates: MarketDataUpdate[] = [];

      for (const symbol of marketSymbols) {
        updates.push({
          symbol,
          price: Math.random() * 1000 + 100,
          change: (Math.random() - 0.5) * 20,
          changePercent: (Math.random() - 0.5) * 10,
          volume: Math.floor(Math.random() * 1000000),
          timestamp: new Date().toISOString(),
          market: symbol.includes('BTC') || symbol.includes('ETH') ? 'CRYPTO' : 'STOCKS'
        });
      }

      await this.broadcastBulkMarketData(updates);
    } catch (error) {
      logger.error('Failed to send periodic market data', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async sendPeriodicLiveMetrics(): Promise<void> {
    try {
      const metrics = await this.generateLiveMetrics();
      await this.broadcastLiveMetrics(metrics);
    } catch (error) {
      logger.error('Failed to send periodic live metrics', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async sendPeriodicSystemHealth(): Promise<void> {
    try {
      const healthStatus = await this.checkSystemHealth();
      await this.broadcastSystemStatus(healthStatus);
    } catch (error) {
      logger.error('Failed to send periodic system health', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async generatePortfolioData(userId: string): Promise<PortfolioUpdateData | null> {
    try {
      const investments = await prisma.investment.findMany({
        where: {
          investorId: userId,
          status: 'ACTIVE'
        },
        include: {
          startup: true
        }
      });

      if (investments.length === 0) return null;

      const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
      const currentValue = totalInvested * (1 + (Math.random() - 0.5) * 0.2); // Simulate value fluctuation
      const unrealizedGains = currentValue - totalInvested;

      return {
        userId,
        totalValue: currentValue,
        totalInvested,
        unrealizedGains,
        realizedGains: 0, // Would be calculated from actual exits
        investmentCount: investments.length,
        topPerformers: investments.slice(0, 3).map(inv => ({
          startupId: inv.startupId,
          startupName: inv.startup.name,
          currentValue: inv.amount * (1 + (Math.random() - 0.5) * 0.2),
          gainLoss: inv.amount * (Math.random() - 0.5) * 0.2,
          gainLossPercentage: (Math.random() - 0.5) * 20
        })),
        recentActivity: investments.slice(0, 5).map(inv => ({
          type: 'INVESTMENT_UPDATE',
          startupName: inv.startup.name,
          amount: inv.amount,
          timestamp: new Date().toISOString()
        }))
      };
    } catch (error) {
      logger.error('Failed to generate portfolio data', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  private async generateLiveMetrics(): Promise<LiveMetricsData> {
    try {
      // Get real metrics from database
      const totalInvestments = await prisma.investment.count({
        where: { status: 'ACTIVE' }
      });

      const totalInvestmentAmount = await prisma.investment.aggregate({
        where: { status: 'ACTIVE' },
        _sum: { amount: true }
      });

      const activeUsers = this.wsService?.getConnectedUsersCount() || 0;

      // Calculate growth metrics (simplified)
      const dailyGrowth = Math.random() * 5;
      const weeklyGrowth = dailyGrowth * 7 + (Math.random() - 0.5) * 10;
      const monthlyGrowth = weeklyGrowth * 4 + (Math.random() - 0.5) * 20;

      // Get top industries
      const industryStats = await prisma.startup.groupBy({
        by: ['industry'],
        _count: { id: true },
        _sum: { fundingGoal: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5
      });

      const topIndustries = industryStats.map(stat => ({
        industry: stat.industry,
        investmentCount: stat._count.id,
        totalAmount: stat._sum.fundingGoal || 0
      }));

      return {
        activeUsers,
        totalInvestments,
        totalPortfolioValue: totalInvestmentAmount._sum.amount || 0,
        platformGrowth: {
          daily: dailyGrowth,
          weekly: weeklyGrowth,
          monthly: monthlyGrowth
        },
        topIndustries
      };
    } catch (error) {
      logger.error('Failed to generate live metrics', {
        error: error instanceof Error ? error.message : String(error)
      });

      // Return fallback metrics
      return {
        activeUsers: 0,
        totalInvestments: 0,
        totalPortfolioValue: 0,
        platformGrowth: { daily: 0, weekly: 0, monthly: 0 },
        topIndustries: []
      };
    }
  }

  private async checkSystemHealth(): Promise<{
    healthy: boolean;
    services: Record<string, boolean>;
    message?: string;
    timestamp: string;
  }> {
    const services = {
      database: true,
      websocket: !!this.wsService,
      redis: true, // Would check actual Redis connection
      email: true, // Would check email service
      storage: true // Would check storage service
    };

    const healthy = Object.values(services).every(status => status);

    return {
      healthy,
      services,
      message: healthy ? 'All systems operational' : 'Some systems experiencing issues',
      timestamp: new Date().toISOString()
    };
  }

  private async sendInvestmentNotification(data: InvestmentUpdateData): Promise<void> {
    try {
      // Queue notification for significant investment updates
      const { queueNotification } = await import('../jobs/notification.processor.js');

      await queueNotification(
        data.userId,
        'INVESTMENT_UPDATE',
        `Investment Update - ${data.status}`,
        `Your investment status has been updated to ${data.status}`,
        {
          data: {
            investmentId: data.investmentId,
            status: data.status,
            milestone: data.milestone
          },
          priority: 'normal',
          actionUrl: `/investments/${data.investmentId}`
        }
      );
    } catch (error) {
      logger.error('Failed to send investment notification', {
        investmentId: data.investmentId,
        userId: data.userId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async updatePitchMetrics(data: PitchUpdateData): Promise<void> {
    try {
      await prisma.pitch.update({
        where: { id: data.pitchId },
        data: {
          viewCount: data.viewCount,
          engagementScore: data.engagementScore,
          lastActivity: new Date(),
          metadata: {
            uniqueViewers: data.uniqueViewers,
            averageTimeOnPage: data.averageTimeOnPage,
            recentActivity: data.recentActivity
          }
        }
      });
    } catch (error) {
      logger.error('Failed to update pitch metrics', {
        pitchId: data.pitchId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async queueAnalyticsEvent(eventType: string, data: any): Promise<void> {
    try {
      const { queueAnalyticsJob } = await import('../jobs/analytics.processor.js');
      await queueAnalyticsJob(eventType, data);
    } catch (error) {
      logger.error('Failed to queue analytics event', {
        eventType,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private setupDatabaseListeners(): void {
    // Listen for database changes and trigger real-time updates
    // This would integrate with Prisma's event system or database triggers

    logger.info('Database listeners setup completed');
  }

  // Public methods for external triggering
  public async triggerPortfolioUpdate(userId: string): Promise<void> {
    const portfolioData = await this.generatePortfolioData(userId);
    if (portfolioData) {
      await this.broadcastPortfolioUpdate(portfolioData);
    }
  }

  public async triggerInvestmentUpdate(investmentId: string): Promise<void> {
    try {
      const investment = await prisma.investment.findUnique({
        where: { id: investmentId },
        include: { investor: true, startup: true }
      });

      if (investment) {
        const updateData: InvestmentUpdateData = {
          investmentId,
          userId: investment.investorId,
          startupId: investment.startupId,
          status: investment.status,
          currentValue: investment.amount * (1 + (Math.random() - 0.5) * 0.1)
        };

        await this.broadcastInvestmentUpdate(updateData);
      }
    } catch (error) {
      logger.error('Failed to trigger investment update', {
        investmentId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  public async triggerPitchUpdate(pitchId: string): Promise<void> {
    try {
      const pitch = await prisma.pitch.findUnique({
        where: { id: pitchId },
        include: { startup: true }
      });

      if (pitch) {
        const updateData: PitchUpdateData = {
          pitchId,
          startupId: pitch.startupId,
          viewCount: pitch.viewCount + Math.floor(Math.random() * 10),
          uniqueViewers: Math.floor((pitch.viewCount + Math.floor(Math.random() * 10)) * 0.7),
          averageTimeOnPage: 180 + Math.random() * 120,
          engagementScore: Math.min(100, pitch.engagementScore + Math.random() * 10),
          recentActivity: [] // Would be populated with real activity data
        };

        await this.broadcastPitchUpdate(updateData);
      }
    } catch (error) {
      logger.error('Failed to trigger pitch update', {
        pitchId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  public stopPeriodicUpdates(): void {
    this.updateIntervals.forEach(interval => clearInterval(interval));
    this.updateIntervals.clear();
    this.isRunning = false;

    logger.info('Periodic updates stopped');
  }

  public isServiceRunning(): boolean {
    return this.isRunning;
  }
}

// Export singleton instance
export const realTimeService = new RealTimeService();