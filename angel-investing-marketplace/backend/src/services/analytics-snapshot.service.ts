import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../config/logger.js';
import { performanceCalculationService } from './performance-calculation.service.js';
import { benchmarkService } from './benchmark.service.js';

/**
 * Analytics Snapshot Service
 *
 * Creates and manages portfolio performance snapshots:
 * - Daily snapshots for detailed tracking
 * - Monthly snapshots for long-term analysis
 * - Historical snapshot retrieval
 * - Trend analysis
 *
 * Snapshots are stored in the AnalyticsSnapshot table for efficient querying
 */

interface SnapshotData {
  totalValue: number;
  totalInvested: number;
  totalExits: number;
  investmentCount: number;
  activeInvestments: number;
  exitedInvestments: number;
  totalReturn: number;
  annualizedReturn: number;
  irr: number;
  moic: number;
  volatility: number;
  sharpeRatio: number;
  topHoldings: Array<{
    investmentId: string;
    companyName: string;
    value: number;
    percentOfPortfolio: number;
  }>;
  sectorAllocation: Record<string, number>;
  stageAllocation: Record<string, number>;
  performanceMetrics: any;
}

interface DateRangeParams {
  startDate?: Date;
  endDate?: Date;
}

export class AnalyticsSnapshotService {
  /**
   * Create daily snapshot for a portfolio
   *
   * Captures current state and performance metrics for daily tracking
   *
   * @param portfolioId - Portfolio to snapshot
   * @returns Created snapshot
   */
  async createDailySnapshot(portfolioId: string) {
    try {
      logger.info('Creating daily snapshot', { portfolioId });

      // Check if snapshot already exists for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const existingSnapshot = await prisma.analyticsSnapshot.findFirst({
        where: {
          entityType: 'portfolio',
          entityId: portfolioId,
          snapshotType: 'DAILY_SUMMARY',
          snapshotDate: {
            gte: today,
          },
        },
      });

      if (existingSnapshot) {
        logger.info('Daily snapshot already exists for today', {
          portfolioId,
          snapshotId: existingSnapshot.id,
        });
        return existingSnapshot;
      }

      // Get portfolio data
      const portfolio = await prisma.portfolio.findUnique({
        where: { id: portfolioId },
        include: {
          investor: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

      if (!portfolio) {
        throw new AppError('Portfolio not found', 404, 'PORTFOLIO_NOT_FOUND');
      }

      // Calculate current metrics
      const performanceMetrics = await performanceCalculationService.calculatePortfolioPerformance(
        portfolioId
      );

      // Get portfolio investments
      const investments = await this.getPortfolioInvestments(portfolio.investorId);

      // Calculate snapshot data
      const snapshotData = await this.buildSnapshotData(
        portfolio,
        investments,
        performanceMetrics
      );

      // Create snapshot
      const snapshot = await prisma.analyticsSnapshot.create({
        data: {
          snapshotType: 'DAILY_SUMMARY',
          entityType: 'portfolio',
          entityId: portfolioId,
          snapshotDate: new Date(),
          data: snapshotData,
        },
      });

      logger.info('Daily snapshot created successfully', {
        portfolioId,
        snapshotId: snapshot.id,
        totalValue: snapshotData.totalValue,
      });

      return snapshot;
    } catch (error: any) {
      logger.error('Error creating daily snapshot', {
        portfolioId,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Create monthly snapshot for a portfolio
   *
   * Aggregates monthly performance and creates comprehensive snapshot
   *
   * @param portfolioId - Portfolio to snapshot
   * @returns Created snapshot
   */
  async createMonthlySnapshot(portfolioId: string) {
    try {
      logger.info('Creating monthly snapshot', { portfolioId });

      // Check if snapshot already exists for this month
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const existingSnapshot = await prisma.analyticsSnapshot.findFirst({
        where: {
          entityType: 'portfolio',
          entityId: portfolioId,
          snapshotType: 'MONTHLY_SUMMARY',
          snapshotDate: {
            gte: firstDayOfMonth,
            lte: lastDayOfMonth,
          },
        },
      });

      if (existingSnapshot) {
        logger.info('Monthly snapshot already exists for this month', {
          portfolioId,
          snapshotId: existingSnapshot.id,
        });
        return existingSnapshot;
      }

      // Get portfolio data
      const portfolio = await prisma.portfolio.findUnique({
        where: { id: portfolioId },
        include: {
          investor: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

      if (!portfolio) {
        throw new AppError('Portfolio not found', 404, 'PORTFOLIO_NOT_FOUND');
      }

      // Calculate month-to-date metrics
      const dateRange: DateRangeParams = {
        startDate: firstDayOfMonth,
        endDate: now,
      };

      const performanceMetrics = await performanceCalculationService.calculatePortfolioPerformance(
        portfolioId,
        dateRange
      );

      // Get benchmark comparisons
      const sp500Comparison = await benchmarkService.compareToSP500(portfolioId, dateRange);
      const nasdaqComparison = await benchmarkService.compareToNASDAQ(portfolioId, dateRange);

      // Get portfolio investments
      const investments = await this.getPortfolioInvestments(portfolio.investorId);

      // Calculate snapshot data
      const snapshotData = await this.buildSnapshotData(
        portfolio,
        investments,
        performanceMetrics
      );

      // Add monthly-specific data
      const monthlyData = {
        ...snapshotData,
        monthlyPerformance: {
          month: now.toISOString().slice(0, 7), // YYYY-MM format
          benchmarkComparisons: {
            sp500: sp500Comparison,
            nasdaq: nasdaqComparison,
          },
        },
      };

      // Create snapshot
      const snapshot = await prisma.analyticsSnapshot.create({
        data: {
          snapshotType: 'MONTHLY_SUMMARY',
          entityType: 'portfolio',
          entityId: portfolioId,
          snapshotDate: now,
          data: monthlyData,
        },
      });

      logger.info('Monthly snapshot created successfully', {
        portfolioId,
        snapshotId: snapshot.id,
        month: now.toISOString().slice(0, 7),
      });

      return snapshot;
    } catch (error: any) {
      logger.error('Error creating monthly snapshot', {
        portfolioId,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Get historical snapshots for a portfolio
   *
   * @param portfolioId - Portfolio ID
   * @param snapshotType - Type of snapshots (daily or monthly)
   * @param dateRange - Date range filter
   * @returns Array of snapshots
   */
  async getHistoricalSnapshots(
    portfolioId: string,
    snapshotType: 'DAILY_SUMMARY' | 'MONTHLY_SUMMARY' = 'MONTHLY_SUMMARY',
    dateRange?: DateRangeParams
  ) {
    try {
      logger.info('Fetching historical snapshots', {
        portfolioId,
        snapshotType,
        dateRange,
      });

      const snapshots = await prisma.analyticsSnapshot.findMany({
        where: {
          entityType: 'portfolio',
          entityId: portfolioId,
          snapshotType,
          ...(dateRange?.startDate && {
            snapshotDate: {
              gte: dateRange.startDate,
            },
          }),
          ...(dateRange?.endDate && {
            snapshotDate: {
              lte: dateRange.endDate,
            },
          }),
        },
        orderBy: {
          snapshotDate: 'desc',
        },
      });

      logger.info('Historical snapshots retrieved', {
        portfolioId,
        snapshotType,
        count: snapshots.length,
      });

      return snapshots;
    } catch (error: any) {
      logger.error('Error fetching historical snapshots', {
        portfolioId,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Get snapshot trend analysis
   *
   * Analyzes performance trends over time
   *
   * @param portfolioId - Portfolio ID
   * @param months - Number of months to analyze
   * @returns Trend analysis
   */
  async getSnapshotTrends(portfolioId: string, months: number = 12) {
    try {
      logger.info('Analyzing snapshot trends', { portfolioId, months });

      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      const snapshots = await this.getHistoricalSnapshots(
        portfolioId,
        'MONTHLY_SUMMARY',
        { startDate }
      );

      if (snapshots.length === 0) {
        return {
          trend: 'insufficient_data',
          averageMonthlyReturn: 0,
          volatility: 0,
          bestMonth: null,
          worstMonth: null,
          consecutivePositiveMonths: 0,
          consecutiveNegativeMonths: 0,
        };
      }

      // Calculate trends
      const monthlyReturns: number[] = [];
      let bestMonth = { date: '', return: -Infinity };
      let worstMonth = { date: '', return: Infinity };

      for (let i = 1; i < snapshots.length; i++) {
        const currData = snapshots[i - 1].data as SnapshotData;
        const prevData = snapshots[i].data as SnapshotData;

        if (prevData.totalValue > 0) {
          const monthlyReturn = (currData.totalValue - prevData.totalValue) / prevData.totalValue;
          monthlyReturns.push(monthlyReturn);

          const monthStr = snapshots[i - 1].snapshotDate.toISOString().slice(0, 7);
          if (monthlyReturn > bestMonth.return) {
            bestMonth = { date: monthStr, return: monthlyReturn };
          }
          if (monthlyReturn < worstMonth.return) {
            worstMonth = { date: monthStr, return: monthlyReturn };
          }
        }
      }

      // Calculate average and volatility
      const averageMonthlyReturn = monthlyReturns.length > 0
        ? monthlyReturns.reduce((sum, r) => sum + r, 0) / monthlyReturns.length
        : 0;

      const variance = monthlyReturns.length > 0
        ? monthlyReturns.reduce((sum, r) => sum + Math.pow(r - averageMonthlyReturn, 2), 0) / monthlyReturns.length
        : 0;
      const volatility = Math.sqrt(variance);

      // Count consecutive months
      let consecutivePositive = 0;
      let consecutiveNegative = 0;
      let currentPositiveStreak = 0;
      let currentNegativeStreak = 0;

      for (const returnValue of monthlyReturns) {
        if (returnValue > 0) {
          currentPositiveStreak++;
          currentNegativeStreak = 0;
          consecutivePositive = Math.max(consecutivePositive, currentPositiveStreak);
        } else if (returnValue < 0) {
          currentNegativeStreak++;
          currentPositiveStreak = 0;
          consecutiveNegative = Math.max(consecutiveNegative, currentNegativeStreak);
        }
      }

      // Determine overall trend
      const recentReturns = monthlyReturns.slice(0, Math.min(3, monthlyReturns.length));
      const avgRecentReturn = recentReturns.reduce((sum, r) => sum + r, 0) / recentReturns.length;
      const trend = avgRecentReturn > 0.02 ? 'upward' : avgRecentReturn < -0.02 ? 'downward' : 'stable';

      logger.info('Snapshot trends analyzed', {
        portfolioId,
        trend,
        averageMonthlyReturn,
      });

      return {
        trend,
        averageMonthlyReturn,
        volatility,
        bestMonth: bestMonth.return !== -Infinity ? bestMonth : null,
        worstMonth: worstMonth.return !== Infinity ? worstMonth : null,
        consecutivePositiveMonths: consecutivePositive,
        consecutiveNegativeMonths: consecutiveNegative,
      };
    } catch (error: any) {
      logger.error('Error analyzing snapshot trends', {
        portfolioId,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Delete old snapshots (cleanup)
   *
   * @param retentionDays - Number of days to retain snapshots
   */
  async cleanupOldSnapshots(retentionDays: number = 365) {
    try {
      logger.info('Cleaning up old snapshots', { retentionDays });

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const result = await prisma.analyticsSnapshot.deleteMany({
        where: {
          snapshotDate: {
            lt: cutoffDate,
          },
          snapshotType: 'DAILY_SUMMARY', // Only delete daily snapshots
        },
      });

      logger.info('Old snapshots cleaned up', {
        deletedCount: result.count,
        retentionDays,
      });

      return result;
    } catch (error: any) {
      logger.error('Error cleaning up old snapshots', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Build snapshot data from portfolio and investments
   */
  private async buildSnapshotData(
    portfolio: any,
    investments: any[],
    performanceMetrics: any
  ): Promise<SnapshotData> {
    // Calculate investment counts
    const activeInvestments = investments.filter(
      inv => inv.status === 'COMPLETED' || inv.status === 'APPROVED'
    ).length;
    const exitedInvestments = investments.filter(
      inv => inv.status === 'EXITED'
    ).length;

    // Calculate sector allocation
    const sectorAllocation: Record<string, number> = {};
    for (const investment of investments) {
      const sector = investment.pitch?.startup?.industry || 'Other';
      sectorAllocation[sector] = (sectorAllocation[sector] || 0) + Number(investment.amount);
    }

    // Calculate stage allocation
    const stageAllocation: Record<string, number> = {};
    for (const investment of investments) {
      const stage = investment.pitch?.startup?.stage || 'Unknown';
      stageAllocation[stage] = (stageAllocation[stage] || 0) + Number(investment.amount);
    }

    // Get top holdings
    const sortedInvestments = investments
      .filter(inv => inv.status === 'COMPLETED' || inv.status === 'APPROVED')
      .sort((a, b) => Number(b.amount) - Number(a.amount))
      .slice(0, 10);

    const totalValue = Number(portfolio.totalValue);
    const topHoldings = sortedInvestments.map(inv => ({
      investmentId: inv.id,
      companyName: inv.pitch?.companyName || inv.pitch?.startup?.name || 'Unknown',
      value: Number(inv.amount),
      percentOfPortfolio: totalValue > 0 ? (Number(inv.amount) / totalValue) * 100 : 0,
    }));

    return {
      totalValue: Number(portfolio.totalValue),
      totalInvested: Number(portfolio.totalInvested),
      totalExits: Number(portfolio.totalExits),
      investmentCount: portfolio.investmentCount,
      activeInvestments,
      exitedInvestments,
      totalReturn: performanceMetrics.totalReturn,
      annualizedReturn: performanceMetrics.annualizedReturn,
      irr: performanceMetrics.irr,
      moic: performanceMetrics.moic,
      volatility: performanceMetrics.volatility,
      sharpeRatio: performanceMetrics.sharpeRatio,
      topHoldings,
      sectorAllocation,
      stageAllocation,
      performanceMetrics,
    };
  }

  /**
   * Get portfolio investments
   */
  private async getPortfolioInvestments(investorId: string) {
    return await prisma.investment.findMany({
      where: {
        investorId,
      },
      include: {
        pitch: {
          include: {
            startup: {
              select: {
                id: true,
                name: true,
                industry: true,
                stage: true,
              },
            },
          },
        },
      },
    });
  }
}

// Export singleton instance
export const analyticsSnapshotService = new AnalyticsSnapshotService();
export default analyticsSnapshotService;
