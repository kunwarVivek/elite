import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler.js';
import { sendSuccess } from '../utils/response.js';
import { logger } from '../config/logger.js';
import { performanceCalculationService } from '../services/performance-calculation.service.js';
import { benchmarkService } from '../services/benchmark.service.js';
import { analyticsSnapshotService } from '../services/analytics-snapshot.service.js';
import { prisma } from '../config/database.js';

/**
 * Portfolio Analytics Controller
 *
 * Handles all portfolio analytics and performance tracking endpoints:
 * - Performance metrics (IRR, MOIC, Sharpe Ratio, etc.)
 * - Benchmark comparisons (S&P 500, NASDAQ, peers)
 * - Risk metrics and analysis
 * - Historical snapshots and trends
 * - Admin snapshot creation
 */

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name?: string;
    role: string;
  };
}

interface PortfolioParams {
  id: string;
}

// Simple in-memory cache for expensive calculations
// In production, use Redis or similar
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export class PortfolioAnalyticsController {
  /**
   * Get all performance metrics for a portfolio
   *
   * GET /api/portfolio/:id/analytics/performance
   */
  async getPerformanceMetrics(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params as unknown as PortfolioParams;
      const { startDate, endDate } = req.query;

      // Check authorization
      await this.checkPortfolioAccess(id, userId, req.user?.role);

      // Check cache
      const cacheKey = `performance:${id}:${startDate}:${endDate}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        logger.info('Returning cached performance metrics', { portfolioId: id });
        return sendSuccess(res, cached, 'Performance metrics retrieved from cache');
      }

      // Parse date range
      const dateRange = {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      };

      // Calculate performance metrics
      const metrics = await performanceCalculationService.calculatePortfolioPerformance(
        id,
        dateRange
      );

      // Format response
      const response = {
        portfolioId: id,
        dateRange: {
          startDate: dateRange.startDate?.toISOString(),
          endDate: dateRange.endDate?.toISOString(),
        },
        calculatedAt: new Date().toISOString(),
        metrics: {
          irr: {
            value: metrics.irr,
            formatted: `${(metrics.irr * 100).toFixed(2)}%`,
            description: 'Internal Rate of Return (XIRR)',
          },
          moic: {
            value: metrics.moic,
            formatted: `${metrics.moic.toFixed(2)}x`,
            description: 'Multiple on Invested Capital',
          },
          cashOnCashReturn: {
            value: metrics.cashOnCashReturn,
            formatted: `${(metrics.cashOnCashReturn * 100).toFixed(2)}%`,
            description: 'Cash-on-Cash Return',
          },
          sharpeRatio: {
            value: metrics.sharpeRatio,
            formatted: metrics.sharpeRatio.toFixed(2),
            description: 'Risk-adjusted Return (Sharpe Ratio)',
          },
          volatility: {
            value: metrics.volatility,
            formatted: `${(metrics.volatility * 100).toFixed(2)}%`,
            description: 'Portfolio Volatility (Annualized)',
          },
          totalReturn: {
            value: metrics.totalReturn,
            formatted: `${(metrics.totalReturn * 100).toFixed(2)}%`,
            description: 'Total Portfolio Return',
          },
          annualizedReturn: {
            value: metrics.annualizedReturn,
            formatted: `${(metrics.annualizedReturn * 100).toFixed(2)}%`,
            description: 'Annualized Return (CAGR)',
          },
        },
      };

      // Cache the result
      this.setCache(cacheKey, response);

      logger.info('Performance metrics calculated', {
        portfolioId: id,
        userId,
        irr: metrics.irr,
        moic: metrics.moic,
      });

      sendSuccess(res, response, 'Performance metrics calculated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get benchmark comparisons
   *
   * GET /api/portfolio/:id/analytics/benchmarks
   */
  async getBenchmarkComparisons(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params as unknown as PortfolioParams;
      const { startDate, endDate, benchmarks } = req.query;

      // Check authorization
      await this.checkPortfolioAccess(id, userId, req.user?.role);

      // Check cache
      const cacheKey = `benchmarks:${id}:${startDate}:${endDate}:${benchmarks}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        logger.info('Returning cached benchmark comparisons', { portfolioId: id });
        return sendSuccess(res, cached, 'Benchmark comparisons retrieved from cache');
      }

      // Parse date range
      const dateRange = {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      };

      // Get requested benchmarks (default: all)
      const requestedBenchmarks = benchmarks
        ? (benchmarks as string).split(',')
        : ['sp500', 'nasdaq', 'peers'];

      const comparisons: any = {
        portfolioId: id,
        dateRange: {
          startDate: dateRange.startDate?.toISOString(),
          endDate: dateRange.endDate?.toISOString(),
        },
        calculatedAt: new Date().toISOString(),
        benchmarks: {},
      };

      // Calculate each benchmark comparison
      if (requestedBenchmarks.includes('sp500')) {
        const sp500 = await benchmarkService.compareToSP500(id, dateRange);
        comparisons.benchmarks.sp500 = {
          name: 'S&P 500',
          portfolioReturn: `${(sp500.portfolioReturn * 100).toFixed(2)}%`,
          benchmarkReturn: `${(sp500.benchmarkReturn * 100).toFixed(2)}%`,
          outperformance: `${(sp500.outperformance * 100).toFixed(2)}%`,
          alpha: sp500.alpha.toFixed(4),
          beta: sp500.beta.toFixed(2),
          correlation: sp500.correlationCoefficient.toFixed(2),
          trackingError: `${(sp500.trackingError * 100).toFixed(2)}%`,
        };
      }

      if (requestedBenchmarks.includes('nasdaq')) {
        const nasdaq = await benchmarkService.compareToNASDAQ(id, dateRange);
        comparisons.benchmarks.nasdaq = {
          name: 'NASDAQ Composite',
          portfolioReturn: `${(nasdaq.portfolioReturn * 100).toFixed(2)}%`,
          benchmarkReturn: `${(nasdaq.benchmarkReturn * 100).toFixed(2)}%`,
          outperformance: `${(nasdaq.outperformance * 100).toFixed(2)}%`,
          alpha: nasdaq.alpha.toFixed(4),
          beta: nasdaq.beta.toFixed(2),
          correlation: nasdaq.correlationCoefficient.toFixed(2),
          trackingError: `${(nasdaq.trackingError * 100).toFixed(2)}%`,
        };
      }

      if (requestedBenchmarks.includes('peers')) {
        const peers = await benchmarkService.compareToPeerPortfolios(id, dateRange);
        comparisons.benchmarks.peers = {
          name: 'Peer Portfolios',
          peerCount: peers.peerCount,
          percentileRank: `${peers.percentileRank.toFixed(1)}th`,
          averageReturn: `${(peers.averagePeerReturn * 100).toFixed(2)}%`,
          medianReturn: `${(peers.medianPeerReturn * 100).toFixed(2)}%`,
          topQuartile: `${(peers.topQuartileReturn * 100).toFixed(2)}%`,
          bottomQuartile: `${(peers.bottomQuartileReturn * 100).toFixed(2)}%`,
        };
      }

      // Get sector benchmarks
      if (requestedBenchmarks.includes('sectors')) {
        const sectorBenchmarks = await benchmarkService.getSectorBenchmarks(dateRange);
        comparisons.benchmarks.sectors = sectorBenchmarks.map(sector => ({
          sector: sector.sector,
          return: `${(sector.return * 100).toFixed(2)}%`,
          volatility: `${(sector.volatility * 100).toFixed(2)}%`,
          sharpeRatio: sector.sharpeRatio.toFixed(2),
          companyCount: sector.companyCount,
        }));
      }

      // Cache the result
      this.setCache(cacheKey, comparisons);

      logger.info('Benchmark comparisons calculated', {
        portfolioId: id,
        userId,
        benchmarks: requestedBenchmarks,
      });

      sendSuccess(res, comparisons, 'Benchmark comparisons calculated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get risk metrics and analysis
   *
   * GET /api/portfolio/:id/analytics/risk-metrics
   */
  async getRiskMetrics(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params as unknown as PortfolioParams;
      const { startDate, endDate } = req.query;

      // Check authorization
      await this.checkPortfolioAccess(id, userId, req.user?.role);

      // Check cache
      const cacheKey = `risk:${id}:${startDate}:${endDate}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        logger.info('Returning cached risk metrics', { portfolioId: id });
        return sendSuccess(res, cached, 'Risk metrics retrieved from cache');
      }

      // Parse date range
      const dateRange = {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      };

      // Calculate performance metrics (includes volatility and Sharpe ratio)
      const metrics = await performanceCalculationService.calculatePortfolioPerformance(
        id,
        dateRange
      );

      // Get portfolio for concentration metrics
      const portfolio = await prisma.portfolio.findUnique({
        where: { id },
      });

      if (!portfolio) {
        throw new AppError('Portfolio not found', 404, 'PORTFOLIO_NOT_FOUND');
      }

      // Calculate concentration risk
      const investments = await prisma.investment.findMany({
        where: {
          investorId: portfolio.investorId,
          status: { in: ['COMPLETED', 'APPROVED'] },
        },
        include: {
          pitch: {
            include: {
              startup: {
                select: {
                  industry: true,
                  stage: true,
                },
              },
            },
          },
        },
      });

      // Calculate Herfindahl-Hirschman Index (HHI) for concentration
      const totalInvested = Number(portfolio.totalInvested);
      let hhi = 0;
      if (totalInvested > 0) {
        for (const inv of investments) {
          const weight = Number(inv.amount) / totalInvested;
          hhi += weight * weight;
        }
      }

      // Sector concentration
      const sectorConcentration: Record<string, number> = {};
      for (const inv of investments) {
        const sector = inv.pitch?.startup?.industry || 'Other';
        sectorConcentration[sector] = (sectorConcentration[sector] || 0) + Number(inv.amount);
      }

      const topSector = Object.entries(sectorConcentration)
        .sort(([, a], [, b]) => b - a)[0];
      const topSectorConcentration = topSector && totalInvested > 0
        ? (topSector[1] / totalInvested) * 100
        : 0;

      // Risk metrics response
      const riskMetrics = {
        portfolioId: id,
        dateRange: {
          startDate: dateRange.startDate?.toISOString(),
          endDate: dateRange.endDate?.toISOString(),
        },
        calculatedAt: new Date().toISOString(),
        volatilityMetrics: {
          annualizedVolatility: {
            value: metrics.volatility,
            formatted: `${(metrics.volatility * 100).toFixed(2)}%`,
            interpretation: this.interpretVolatility(metrics.volatility),
          },
          sharpeRatio: {
            value: metrics.sharpeRatio,
            formatted: metrics.sharpeRatio.toFixed(2),
            interpretation: this.interpretSharpeRatio(metrics.sharpeRatio),
          },
        },
        concentrationRisk: {
          herfindahlIndex: {
            value: hhi,
            formatted: hhi.toFixed(4),
            interpretation: this.interpretHHI(hhi),
          },
          investmentCount: investments.length,
          topSector: topSector ? topSector[0] : 'N/A',
          topSectorConcentration: {
            value: topSectorConcentration / 100,
            formatted: `${topSectorConcentration.toFixed(2)}%`,
          },
        },
        riskLevel: this.calculateOverallRiskLevel(metrics.volatility, hhi, investments.length),
      };

      // Cache the result
      this.setCache(cacheKey, riskMetrics);

      logger.info('Risk metrics calculated', {
        portfolioId: id,
        userId,
        volatility: metrics.volatility,
        sharpeRatio: metrics.sharpeRatio,
      });

      sendSuccess(res, riskMetrics, 'Risk metrics calculated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get historical snapshots and trends
   *
   * GET /api/portfolio/:id/analytics/historical
   */
  async getHistoricalSnapshots(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params as unknown as PortfolioParams;
      const { type = 'monthly', startDate, endDate, includeTrends = 'true' } = req.query;

      // Check authorization
      await this.checkPortfolioAccess(id, userId, req.user?.role);

      // Parse parameters
      const snapshotType = type === 'daily' ? 'DAILY_SUMMARY' : 'MONTHLY_SUMMARY';
      const dateRange = {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      };

      // Get snapshots
      const snapshots = await analyticsSnapshotService.getHistoricalSnapshots(
        id,
        snapshotType,
        dateRange
      );

      // Format snapshots
      const formattedSnapshots = snapshots.map(snapshot => ({
        date: snapshot.snapshotDate.toISOString().split('T')[0],
        data: snapshot.data,
      }));

      // Get trends if requested
      let trends = null;
      if (includeTrends === 'true') {
        trends = await analyticsSnapshotService.getSnapshotTrends(id, 12);
      }

      const response = {
        portfolioId: id,
        snapshotType: type,
        dateRange: {
          startDate: dateRange.startDate?.toISOString(),
          endDate: dateRange.endDate?.toISOString(),
        },
        count: snapshots.length,
        snapshots: formattedSnapshots,
        trends,
      };

      logger.info('Historical snapshots retrieved', {
        portfolioId: id,
        userId,
        count: snapshots.length,
        type,
      });

      sendSuccess(res, response, 'Historical snapshots retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create snapshot (admin only)
   *
   * POST /api/analytics/snapshot
   */
  async createSnapshot(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      // Only admins can manually create snapshots
      if (userRole !== 'ADMIN') {
        throw new AppError('Only admins can create snapshots', 403, 'FORBIDDEN');
      }

      const { portfolioId, type = 'daily' } = req.body;

      if (!portfolioId) {
        throw new AppError('Portfolio ID is required', 400, 'VALIDATION_ERROR');
      }

      // Create snapshot based on type
      let snapshot;
      if (type === 'monthly') {
        snapshot = await analyticsSnapshotService.createMonthlySnapshot(portfolioId);
      } else {
        snapshot = await analyticsSnapshotService.createDailySnapshot(portfolioId);
      }

      logger.info('Snapshot created manually', {
        portfolioId,
        type,
        createdBy: userId,
        snapshotId: snapshot.id,
      });

      sendSuccess(
        res,
        {
          snapshotId: snapshot.id,
          portfolioId,
          type,
          createdAt: snapshot.createdAt,
          snapshotDate: snapshot.snapshotDate,
        },
        'Snapshot created successfully',
        201
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check if user has access to portfolio
   */
  private async checkPortfolioAccess(
    portfolioId: string,
    userId: string,
    userRole?: string
  ): Promise<void> {
    const portfolio = await prisma.portfolio.findUnique({
      where: { id: portfolioId },
    });

    if (!portfolio) {
      throw new AppError('Portfolio not found', 404, 'PORTFOLIO_NOT_FOUND');
    }

    // Check if user owns the portfolio or is admin
    if (portfolio.investorId !== userId && userRole !== 'ADMIN') {
      throw new AppError(
        'Not authorized to view this portfolio',
        403,
        'NOT_AUTHORIZED'
      );
    }
  }

  /**
   * Cache management
   */
  private getFromCache(key: string): any | null {
    const cached = cache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > CACHE_TTL) {
      cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCache(key: string, data: any): void {
    cache.set(key, {
      data,
      timestamp: Date.now(),
    });

    // Cleanup old cache entries
    if (cache.size > 1000) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
  }

  /**
   * Interpretation helpers
   */
  private interpretVolatility(volatility: number): string {
    if (volatility < 0.15) return 'Low volatility';
    if (volatility < 0.25) return 'Moderate volatility';
    if (volatility < 0.40) return 'High volatility';
    return 'Very high volatility';
  }

  private interpretSharpeRatio(sharpe: number): string {
    if (sharpe < 0) return 'Poor risk-adjusted returns';
    if (sharpe < 1) return 'Below average risk-adjusted returns';
    if (sharpe < 2) return 'Good risk-adjusted returns';
    if (sharpe < 3) return 'Very good risk-adjusted returns';
    return 'Excellent risk-adjusted returns';
  }

  private interpretHHI(hhi: number): string {
    if (hhi < 0.15) return 'Well diversified';
    if (hhi < 0.25) return 'Moderately concentrated';
    if (hhi < 0.5) return 'Highly concentrated';
    return 'Very highly concentrated';
  }

  private calculateOverallRiskLevel(
    volatility: number,
    hhi: number,
    investmentCount: number
  ): string {
    let riskScore = 0;

    // Volatility component
    if (volatility > 0.40) riskScore += 3;
    else if (volatility > 0.25) riskScore += 2;
    else if (volatility > 0.15) riskScore += 1;

    // Concentration component
    if (hhi > 0.5) riskScore += 3;
    else if (hhi > 0.25) riskScore += 2;
    else if (hhi > 0.15) riskScore += 1;

    // Diversification component
    if (investmentCount < 5) riskScore += 2;
    else if (investmentCount < 10) riskScore += 1;

    if (riskScore >= 6) return 'High Risk';
    if (riskScore >= 3) return 'Moderate Risk';
    return 'Low Risk';
  }
}

// Export singleton instance
export const portfolioAnalyticsController = new PortfolioAnalyticsController();
export default portfolioAnalyticsController;
