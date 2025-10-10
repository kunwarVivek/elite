import { Job } from 'bullmq';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';

export interface AnalyticsJobData {
  eventType: 'USER_ACTIVITY' | 'INVESTMENT_MADE' | 'PITCH_VIEWED' | 'PORTFOLIO_UPDATE' |
             'SYSTEM_METRIC' | 'USER_ENGAGEMENT' | 'CONVERSION_FUNNEL' | 'RETENTION_METRIC' |
             'REVENUE_TRACKING' | 'CUSTOM_EVENT';
  data: {
    userId?: string;
    investmentId?: string;
    pitchId?: string;
    startupId?: string;
    sessionId?: string;
    timestamp?: string;
    metadata?: Record<string, any>;
    // Event-specific data
    activityType?: string;
    amount?: number;
    duration?: number;
    pageUrl?: string;
    referrer?: string;
    deviceInfo?: Record<string, any>;
    location?: Record<string, any>;
    [key: string]: any;
  };
  aggregate?: boolean;
  timeframe?: 'realtime' | 'hourly' | 'daily' | 'weekly' | 'monthly';
}

export interface AnalyticsJobResult {
  success: boolean;
  eventId?: string;
  processedCount?: number;
  metadata?: Record<string, any>;
  error?: string;
  processingTime?: number;
}

export class AnalyticsProcessor {
  static async process(job: Job<AnalyticsJobData>): Promise<AnalyticsJobResult> {
    const { eventType, data, aggregate = false, timeframe = 'realtime' } = job.data;
    const startTime = Date.now();

    logger.info('Processing analytics job', {
      jobId: job.id,
      eventType,
      aggregate,
      timeframe,
      userId: data.userId
    });

    try {
      // Process the analytics event
      const eventResult = await this.processAnalyticsEvent(job.data);

      // If aggregation is requested, process aggregated metrics
      if (aggregate) {
        await this.processAggregatedMetrics(eventType, timeframe, data);
      }

      // Store raw event data for detailed analysis
      await this.storeAnalyticsEvent({
        jobId: job.id!,
        eventType,
        data,
        processedAt: new Date().toISOString(),
        metadata: {
          processingTime: Date.now() - startTime,
          aggregated: aggregate,
          timeframe
        }
      });

      logger.info('Analytics job completed successfully', {
        jobId: job.id,
        eventType,
        eventId: eventResult.eventId,
        processingTime: Date.now() - startTime
      });

      return {
        success: true,
        eventId: eventResult.eventId,
        processedCount: eventResult.processedCount || 1,
        metadata: {
          eventType,
          aggregated: aggregate,
          timeframe,
          processedAt: new Date().toISOString()
        },
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      logger.error('Analytics job failed', {
        jobId: job.id,
        eventType,
        error: error instanceof Error ? error.message : String(error)
      });

      throw error;
    }
  }

  private static async processAnalyticsEvent(jobData: AnalyticsJobData): Promise<{ eventId: string; processedCount: number }> {
    const { eventType, data } = jobData;

    switch (eventType) {
      case 'USER_ACTIVITY':
        return await this.processUserActivity(data);
      case 'INVESTMENT_MADE':
        return await this.processInvestmentEvent(data);
      case 'PITCH_VIEWED':
        return await this.processPitchView(data);
      case 'PORTFOLIO_UPDATE':
        return await this.processPortfolioUpdate(data);
      case 'SYSTEM_METRIC':
        return await this.processSystemMetric(data);
      case 'USER_ENGAGEMENT':
        return await this.processUserEngagement(data);
      case 'CONVERSION_FUNNEL':
        return await this.processConversionFunnel(data);
      case 'RETENTION_METRIC':
        return await this.processRetentionMetric(data);
      case 'REVENUE_TRACKING':
        return await this.processRevenueTracking(data);
      case 'CUSTOM_EVENT':
        return await this.processCustomEvent(data);
      default:
        throw new Error(`Unknown event type: ${eventType}`);
    }
  }

  private static async processUserActivity(data: any): Promise<{ eventId: string; processedCount: number }> {
    const { userId, activityType, metadata } = data;

    // Track user activity
    const activityData = {
      userId,
      activityType,
      timestamp: data.timestamp || new Date().toISOString(),
      metadata: {
        ...metadata,
        sessionId: data.sessionId,
        pageUrl: data.pageUrl,
        referrer: data.referrer,
        deviceInfo: data.deviceInfo
      }
    };

    // Update user engagement metrics
    await this.updateUserEngagementMetrics(userId, activityType);

    return {
      eventId: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      processedCount: 1
    };
  }

  private static async processInvestmentEvent(data: any): Promise<{ eventId: string; processedCount: number }> {
    const { userId, investmentId, amount, metadata } = data;

    // Track investment metrics
    const investment = await prisma.investment.findUnique({
      where: { id: investmentId },
      include: { startup: true, investor: true }
    });

    if (!investment) {
      throw new Error(`Investment not found: ${investmentId}`);
    }

    // Update platform-wide investment metrics
    await this.updateInvestmentMetrics(investment);

    // Track conversion funnel
    await this.trackConversionFunnel('investment_completed', {
      userId,
      investmentId,
      amount,
      startupId: investment.startupId
    });

    return {
      eventId: `investment_${investmentId}_${Date.now()}`,
      processedCount: 1
    };
  }

  private static async processPitchView(data: any): Promise<{ eventId: string; processedCount: number }> {
    const { userId, pitchId, duration, metadata } = data;

    // Track pitch engagement
    const pitch = await prisma.pitch.findUnique({
      where: { id: pitchId },
      include: { startup: true }
    });

    if (!pitch) {
      throw new Error(`Pitch not found: ${pitchId}`);
    }

    // Update pitch view metrics
    await prisma.pitch.update({
      where: { id: pitchId },
      data: {
        viewCount: { increment: 1 },
        totalViewTime: { increment: duration || 0 },
        lastViewed: new Date(),
        metadata: {
          ...pitch.metadata as Record<string, any>,
          recentViewers: [
            ...(pitch.metadata as any)?.recentViewers || [],
            { userId, timestamp: new Date().toISOString(), duration }
          ].slice(-100) // Keep last 100 viewers
        }
      }
    });

    // Update startup engagement metrics
    await this.updateStartupEngagementMetrics(pitch.startupId);

    return {
      eventId: `pitch_view_${pitchId}_${Date.now()}`,
      processedCount: 1
    };
  }

  private static async processPortfolioUpdate(data: any): Promise<{ eventId: string; processedCount: number }> {
    const { userId, metadata } = data;

    // Update portfolio performance metrics
    const portfolioMetrics = await this.calculatePortfolioMetrics(userId);

    // Store portfolio snapshot
    await this.storePortfolioSnapshot(userId, portfolioMetrics);

    return {
      eventId: `portfolio_${userId}_${Date.now()}`,
      processedCount: 1
    };
  }

  private static async processSystemMetric(data: any): Promise<{ eventId: string; processedCount: number }> {
    const { metricType, value, metadata } = data;

    // Store system performance metrics
    await this.storeSystemMetric(metricType, value, metadata);

    return {
      eventId: `system_${metricType}_${Date.now()}`,
      processedCount: 1
    };
  }

  private static async processUserEngagement(data: any): Promise<{ eventId: string; processedCount: number }> {
    const { userId, engagementType, score, metadata } = data;

    // Update user engagement score
    await this.updateUserEngagementScore(userId, engagementType, score);

    return {
      eventId: `engagement_${userId}_${Date.now()}`,
      processedCount: 1
    };
  }

  private static async processConversionFunnel(data: any): Promise<{ eventId: string; processedCount: number }> {
    const { funnelStep, userId, metadata } = data;

    // Track user journey through conversion funnel
    await this.trackConversionFunnel(funnelStep, { userId, ...metadata });

    return {
      eventId: `funnel_${funnelStep}_${userId}_${Date.now()}`,
      processedCount: 1
    };
  }

  private static async processRetentionMetric(data: any): Promise<{ eventId: string; processedCount: number }> {
    const { userId, retentionType, daysSinceRegistration, metadata } = data;

    // Calculate and store retention metrics
    await this.calculateRetentionMetrics(userId, retentionType, daysSinceRegistration);

    return {
      eventId: `retention_${userId}_${Date.now()}`,
      processedCount: 1
    };
  }

  private static async processRevenueTracking(data: any): Promise<{ eventId: string; processedCount: number }> {
    const { amount, revenueType, metadata } = data;

    // Track revenue metrics
    await this.trackRevenueMetrics(amount, revenueType, metadata);

    return {
      eventId: `revenue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      processedCount: 1
    };
  }

  private static async processCustomEvent(data: any): Promise<{ eventId: string; processedCount: number }> {
    const { eventName, customData } = data;

    // Process custom analytics event
    await this.storeCustomEvent(eventName, customData);

    return {
      eventId: `custom_${eventName}_${Date.now()}`,
      processedCount: 1
    };
  }

  private static async processAggregatedMetrics(
    eventType: string,
    timeframe: string,
    data: any
  ): Promise<void> {
    // Calculate aggregated metrics based on timeframe
    const timeRanges = this.getTimeRanges(timeframe);

    for (const timeRange of timeRanges) {
      await this.calculateAggregatedMetrics(eventType, timeRange, data);
    }
  }

  private static async updateUserEngagementMetrics(userId: string, activityType: string): Promise<void> {
    // Update daily active users
    const today = new Date().toISOString().split('T')[0];

    await prisma.userEngagement.upsert({
      where: {
        userId_date: {
          userId,
          date: today
        }
      },
      update: {
        activityCount: { increment: 1 },
        lastActivity: new Date(),
        activityTypes: {
          push: activityType
        }
      },
      create: {
        userId,
        date: today,
        activityCount: 1,
        lastActivity: new Date(),
        activityTypes: [activityType]
      }
    });
  }

  private static async updateInvestmentMetrics(investment: any): Promise<void> {
    // Update platform investment metrics
    const today = new Date().toISOString().split('T')[0];

    await prisma.platformMetrics.upsert({
      where: { date: today },
      update: {
        totalInvestments: { increment: 1 },
        totalInvestmentAmount: { increment: investment.amount },
        averageInvestmentSize: prisma.platformMetrics.fields.totalInvestmentAmount,
        lastUpdated: new Date()
      },
      create: {
        date: today,
        totalInvestments: 1,
        totalInvestmentAmount: investment.amount,
        averageInvestmentSize: investment.amount,
        lastUpdated: new Date()
      }
    });
  }

  private static async updateStartupEngagementMetrics(startupId: string): Promise<void> {
    // Update startup engagement metrics
    await prisma.startup.update({
      where: { id: startupId },
      data: {
        engagementScore: { increment: 1 },
        lastEngagement: new Date(),
        metadata: {
          lastPitchView: new Date().toISOString()
        }
      }
    });
  }

  private static async calculatePortfolioMetrics(userId: string): Promise<any> {
    // Calculate user's portfolio performance
    const investments = await prisma.investment.findMany({
      where: {
        investorId: userId,
        status: 'ACTIVE'
      },
      include: {
        startup: true
      }
    });

    const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
    const activeInvestments = investments.length;

    return {
      totalInvested,
      activeInvestments,
      averageInvestmentSize: activeInvestments > 0 ? totalInvested / activeInvestments : 0,
      portfolioDiversification: this.calculateDiversificationScore(investments),
      calculatedAt: new Date().toISOString()
    };
  }

  private static async storePortfolioSnapshot(userId: string, metrics: any): Promise<void> {
    await prisma.portfolioSnapshot.create({
      data: {
        userId,
        ...metrics,
        snapshotDate: new Date()
      }
    });
  }

  private static async storeSystemMetric(metricType: string, value: number, metadata: any): Promise<void> {
    await prisma.systemMetric.create({
      data: {
        metricType,
        value,
        metadata,
        recordedAt: new Date()
      }
    });
  }

  private static async updateUserEngagementScore(userId: string, engagementType: string, score: number): Promise<void> {
    // Update user engagement score
    await prisma.user.update({
      where: { id: userId },
      data: {
        engagementScore: { increment: score },
        lastEngagementUpdate: new Date()
      }
    });
  }

  private static async trackConversionFunnel(funnelStep: string, data: any): Promise<void> {
    // Track user progress through conversion funnel
    await prisma.conversionFunnel.create({
      data: {
        userId: data.userId,
        funnelStep,
        metadata: data,
        timestamp: new Date()
      }
    });
  }

  private static async calculateRetentionMetrics(userId: string, retentionType: string, daysSinceRegistration: number): Promise<void> {
    // Calculate retention metrics
    await prisma.retentionMetric.create({
      data: {
        userId,
        retentionType,
        daysSinceRegistration,
        calculatedAt: new Date()
      }
    });
  }

  private static async trackRevenueMetrics(amount: number, revenueType: string, metadata: any): Promise<void> {
    // Track revenue metrics
    await prisma.revenueMetric.create({
      data: {
        amount,
        revenueType,
        metadata,
        recordedAt: new Date()
      }
    });
  }

  private static async storeCustomEvent(eventName: string, customData: any): Promise<void> {
    // Store custom analytics event
    await prisma.customEvent.create({
      data: {
        eventName,
        eventData: customData,
        timestamp: new Date()
      }
    });
  }

  private static async calculateAggregatedMetrics(eventType: string, timeRange: any, data: any): Promise<void> {
    // Calculate aggregated metrics for the given time range
    const { startDate, endDate } = timeRange;

    // This would contain logic to aggregate events within the time range
    // For now, we'll create a placeholder for the aggregated metric
    await prisma.aggregatedMetric.create({
      data: {
        eventType,
        timeRange: timeframe,
        startDate,
        endDate,
        metadata: {
          calculatedAt: new Date().toISOString(),
          eventCount: 0 // Would be calculated based on actual events
        }
      }
    });
  }

  private static async storeAnalyticsEvent(data: {
    jobId: string;
    eventType: string;
    data: any;
    processedAt: string;
    metadata: any;
  }): Promise<void> {
    try {
      await prisma.analyticsEvent.create({
        data: {
          jobId: data.jobId,
          eventType: data.eventType,
          eventData: data.data,
          processedAt: data.processedAt,
          metadata: data.metadata
        }
      });
    } catch (error) {
      logger.error('Failed to store analytics event', {
        jobId: data.jobId,
        error: error instanceof Error ? error.message : String(error)
      });
      // Don't throw here as this is not critical for analytics processing
    }
  }

  private static getTimeRanges(timeframe: string): Array<{ startDate: Date; endDate: Date }> {
    const now = new Date();
    const ranges = [];

    switch (timeframe) {
      case 'hourly':
        for (let i = 23; i >= 0; i--) {
          const startDate = new Date(now.getTime() - i * 60 * 60 * 1000);
          const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
          ranges.push({ startDate, endDate });
        }
        break;
      case 'daily':
        for (let i = 6; i >= 0; i--) {
          const startDate = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
          const endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
          ranges.push({ startDate, endDate });
        }
        break;
      case 'weekly':
        for (let i = 3; i >= 0; i--) {
          const startDate = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
          const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
          ranges.push({ startDate, endDate });
        }
        break;
      case 'monthly':
        for (let i = 11; i >= 0; i--) {
          const startDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
          ranges.push({ startDate, endDate });
        }
        break;
      default:
        ranges.push({
          startDate: new Date(now.getTime() - 60 * 60 * 1000), // Last hour
          endDate: now
        });
    }

    return ranges;
  }

  private static calculateDiversificationScore(investments: any[]): number {
    // Calculate portfolio diversification score based on industries, stages, etc.
    const industries = new Set(investments.map(inv => inv.startup.industry));
    const stages = new Set(investments.map(inv => inv.startup.stage));

    // Simple diversification score (0-100)
    const industryScore = Math.min(industries.size * 20, 60);
    const stageScore = Math.min(stages.size * 15, 40);

    return Math.min(industryScore + stageScore, 100);
  }

  // Queue analytics job
  static async queueAnalyticsJob(
    eventType: AnalyticsJobData['eventType'],
    data: AnalyticsJobData['data'],
    options: {
      aggregate?: boolean;
      timeframe?: AnalyticsJobData['timeframe'];
      delay?: number;
    } = {}
  ): Promise<void> {
    const { analyticsQueue } = await import('../config/queues.js');

    await analyticsQueue.add('process-analytics', {
      eventType,
      data,
      aggregate: options.aggregate || false,
      timeframe: options.timeframe || 'realtime',
      queuedAt: new Date().toISOString()
    }, {
      delay: options.delay || 0
    });

    logger.info('Analytics job queued', {
      eventType,
      aggregate: options.aggregate,
      timeframe: options.timeframe,
      userId: data.userId
    });
  }

  // Process analytics in real-time
  static async processRealtimeAnalytics(eventType: string, data: any): Promise<void> {
    await this.queueAnalyticsJob(eventType, data, {
      aggregate: false,
      timeframe: 'realtime'
    });
  }
}

export default AnalyticsProcessor;