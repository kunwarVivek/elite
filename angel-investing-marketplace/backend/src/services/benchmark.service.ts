import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../config/logger.js';
import { performanceCalculationService } from './performance-calculation.service.js';

/**
 * Benchmark Comparison Service
 *
 * Compares portfolio performance against various benchmarks:
 * - S&P 500
 * - NASDAQ Composite
 * - Peer portfolios
 * - Sector-specific benchmarks
 *
 * TODO: Integrate with real market data API (Alpha Vantage, Yahoo Finance, or IEX Cloud)
 * For production, replace mock data with actual API calls
 */

interface BenchmarkComparison {
  portfolioReturn: number;
  benchmarkReturn: number;
  outperformance: number;
  alpha: number;
  beta: number;
  correlationCoefficient: number;
  trackingError: number;
}

interface DateRangeParams {
  startDate?: Date;
  endDate?: Date;
}

interface BenchmarkData {
  date: Date;
  value: number;
  return?: number;
}

interface SectorBenchmark {
  sector: string;
  return: number;
  volatility: number;
  sharpeRatio: number;
  companyCount: number;
}

export class BenchmarkService {
  /**
   * Compare portfolio performance to S&P 500
   *
   * @param portfolioId - Portfolio to compare
   * @param dateRange - Date range for comparison
   * @returns Comparison metrics
   */
  async compareToSP500(
    portfolioId: string,
    dateRange?: DateRangeParams
  ): Promise<BenchmarkComparison> {
    try {
      logger.info('Comparing portfolio to S&P 500', { portfolioId, dateRange });

      // Get portfolio performance metrics
      const portfolioMetrics = await performanceCalculationService.calculatePortfolioPerformance(
        portfolioId,
        dateRange
      );

      // TODO: Fetch real S&P 500 data from market data API
      // Example: const sp500Data = await this.fetchSP500Data(dateRange);
      const sp500Data = await this.getMockSP500Data(dateRange);

      // Calculate benchmark metrics
      const benchmarkReturn = this.calculateBenchmarkReturn(sp500Data);

      // Calculate comparison metrics
      const comparison = this.calculateComparisonMetrics(
        portfolioMetrics.annualizedReturn,
        benchmarkReturn,
        await this.getPortfolioReturns(portfolioId, dateRange),
        sp500Data
      );

      // Store comparison results
      await this.storeBenchmarkComparison(portfolioId, 'SP500', comparison, dateRange);

      logger.info('S&P 500 comparison completed', {
        portfolioId,
        portfolioReturn: portfolioMetrics.annualizedReturn,
        benchmarkReturn,
        outperformance: comparison.outperformance,
      });

      return comparison;
    } catch (error: any) {
      logger.error('Error comparing to S&P 500', {
        portfolioId,
        error: error.message,
        stack: error.stack,
      });
      throw new AppError('Failed to compare with S&P 500', 500, 'BENCHMARK_COMPARISON_FAILED');
    }
  }

  /**
   * Compare portfolio performance to NASDAQ Composite
   *
   * @param portfolioId - Portfolio to compare
   * @param dateRange - Date range for comparison
   * @returns Comparison metrics
   */
  async compareToNASDAQ(
    portfolioId: string,
    dateRange?: DateRangeParams
  ): Promise<BenchmarkComparison> {
    try {
      logger.info('Comparing portfolio to NASDAQ', { portfolioId, dateRange });

      // Get portfolio performance metrics
      const portfolioMetrics = await performanceCalculationService.calculatePortfolioPerformance(
        portfolioId,
        dateRange
      );

      // TODO: Fetch real NASDAQ data from market data API
      const nasdaqData = await this.getMockNASDAQData(dateRange);

      // Calculate benchmark metrics
      const benchmarkReturn = this.calculateBenchmarkReturn(nasdaqData);

      // Calculate comparison metrics
      const comparison = this.calculateComparisonMetrics(
        portfolioMetrics.annualizedReturn,
        benchmarkReturn,
        await this.getPortfolioReturns(portfolioId, dateRange),
        nasdaqData
      );

      // Store comparison results
      await this.storeBenchmarkComparison(portfolioId, 'NASDAQ', comparison, dateRange);

      logger.info('NASDAQ comparison completed', {
        portfolioId,
        portfolioReturn: portfolioMetrics.annualizedReturn,
        benchmarkReturn,
        outperformance: comparison.outperformance,
      });

      return comparison;
    } catch (error: any) {
      logger.error('Error comparing to NASDAQ', {
        portfolioId,
        error: error.message,
        stack: error.stack,
      });
      throw new AppError('Failed to compare with NASDAQ', 500, 'BENCHMARK_COMPARISON_FAILED');
    }
  }

  /**
   * Compare portfolio to peer portfolios
   *
   * Finds similar portfolios based on:
   * - Similar total investment size
   * - Similar sector allocation
   * - Similar stage focus
   *
   * @param portfolioId - Portfolio to compare
   * @param dateRange - Date range for comparison
   * @returns Peer comparison metrics
   */
  async compareToPeerPortfolios(
    portfolioId: string,
    dateRange?: DateRangeParams
  ): Promise<{
    peerCount: number;
    percentileRank: number;
    averagePeerReturn: number;
    topQuartileReturn: number;
    medianPeerReturn: number;
    bottomQuartileReturn: number;
  }> {
    try {
      logger.info('Comparing portfolio to peers', { portfolioId, dateRange });

      // Get portfolio details
      const portfolio = await prisma.portfolio.findUnique({
        where: { id: portfolioId },
      });

      if (!portfolio) {
        throw new AppError('Portfolio not found', 404, 'PORTFOLIO_NOT_FOUND');
      }

      // Find peer portfolios (similar size and characteristics)
      const peerPortfolios = await this.findPeerPortfolios(portfolio);

      if (peerPortfolios.length === 0) {
        logger.warn('No peer portfolios found', { portfolioId });
        return {
          peerCount: 0,
          percentileRank: 0,
          averagePeerReturn: 0,
          topQuartileReturn: 0,
          medianPeerReturn: 0,
          bottomQuartileReturn: 0,
        };
      }

      // Calculate returns for all peers
      const peerReturns = await Promise.all(
        peerPortfolios.map(async (peer) => {
          const metrics = await performanceCalculationService.calculatePortfolioPerformance(
            peer.id,
            dateRange
          );
          return metrics.annualizedReturn;
        })
      );

      // Get current portfolio return
      const currentMetrics = await performanceCalculationService.calculatePortfolioPerformance(
        portfolioId,
        dateRange
      );

      // Calculate peer statistics
      const sortedReturns = peerReturns.sort((a, b) => a - b);
      const peerCount = sortedReturns.length;

      const averagePeerReturn = sortedReturns.reduce((sum, r) => sum + r, 0) / peerCount;
      const medianPeerReturn = sortedReturns[Math.floor(peerCount / 2)];
      const topQuartileReturn = sortedReturns[Math.floor(peerCount * 0.75)];
      const bottomQuartileReturn = sortedReturns[Math.floor(peerCount * 0.25)];

      // Calculate percentile rank
      const betterCount = sortedReturns.filter(r => currentMetrics.annualizedReturn > r).length;
      const percentileRank = (betterCount / peerCount) * 100;

      logger.info('Peer comparison completed', {
        portfolioId,
        peerCount,
        percentileRank,
        currentReturn: currentMetrics.annualizedReturn,
        averagePeerReturn,
      });

      return {
        peerCount,
        percentileRank,
        averagePeerReturn,
        topQuartileReturn,
        medianPeerReturn,
        bottomQuartileReturn,
      };
    } catch (error: any) {
      logger.error('Error comparing to peer portfolios', {
        portfolioId,
        error: error.message,
        stack: error.stack,
      });
      throw new AppError('Failed to compare with peers', 500, 'PEER_COMPARISON_FAILED');
    }
  }

  /**
   * Get sector-specific benchmark performance
   *
   * Returns performance benchmarks for different startup sectors
   *
   * @param dateRange - Date range for benchmark data
   * @returns Sector benchmark data
   */
  async getSectorBenchmarks(dateRange?: DateRangeParams): Promise<SectorBenchmark[]> {
    try {
      logger.info('Fetching sector benchmarks', { dateRange });

      // TODO: Fetch real sector performance data
      // This could come from industry reports, VC databases, or market indices
      const sectorBenchmarks: SectorBenchmark[] = [
        {
          sector: 'Software/SaaS',
          return: 0.25,
          volatility: 0.35,
          sharpeRatio: 0.71,
          companyCount: 150,
        },
        {
          sector: 'FinTech',
          return: 0.22,
          volatility: 0.40,
          sharpeRatio: 0.55,
          companyCount: 120,
        },
        {
          sector: 'HealthTech',
          return: 0.28,
          volatility: 0.38,
          sharpeRatio: 0.74,
          companyCount: 100,
        },
        {
          sector: 'E-commerce',
          return: 0.18,
          volatility: 0.45,
          sharpeRatio: 0.40,
          companyCount: 90,
        },
        {
          sector: 'AI/ML',
          return: 0.35,
          volatility: 0.50,
          sharpeRatio: 0.70,
          companyCount: 80,
        },
        {
          sector: 'CleanTech',
          return: 0.20,
          volatility: 0.42,
          sharpeRatio: 0.48,
          companyCount: 70,
        },
        {
          sector: 'EdTech',
          return: 0.15,
          volatility: 0.35,
          sharpeRatio: 0.43,
          companyCount: 60,
        },
        {
          sector: 'BioTech',
          return: 0.30,
          volatility: 0.55,
          sharpeRatio: 0.55,
          companyCount: 85,
        },
      ];

      logger.info('Sector benchmarks retrieved', {
        sectorCount: sectorBenchmarks.length,
      });

      return sectorBenchmarks;
    } catch (error: any) {
      logger.error('Error fetching sector benchmarks', {
        error: error.message,
        stack: error.stack,
      });
      throw new AppError('Failed to fetch sector benchmarks', 500, 'SECTOR_BENCHMARK_FAILED');
    }
  }

  /**
   * Calculate comparison metrics between portfolio and benchmark
   */
  private calculateComparisonMetrics(
    portfolioReturn: number,
    benchmarkReturn: number,
    portfolioReturns: number[],
    benchmarkData: BenchmarkData[]
  ): BenchmarkComparison {
    // Outperformance (excess return)
    const outperformance = portfolioReturn - benchmarkReturn;

    // Calculate beta (portfolio volatility relative to benchmark)
    const beta = this.calculateBeta(portfolioReturns, benchmarkData);

    // Calculate alpha (excess return after adjusting for risk)
    const riskFreeRate = 0.02; // 2% risk-free rate
    const alpha = portfolioReturn - (riskFreeRate + beta * (benchmarkReturn - riskFreeRate));

    // Calculate correlation coefficient
    const correlationCoefficient = this.calculateCorrelation(portfolioReturns, benchmarkData);

    // Calculate tracking error (volatility of excess returns)
    const trackingError = this.calculateTrackingError(portfolioReturns, benchmarkData);

    return {
      portfolioReturn,
      benchmarkReturn,
      outperformance,
      alpha,
      beta,
      correlationCoefficient,
      trackingError,
    };
  }

  /**
   * Calculate Beta (systematic risk relative to benchmark)
   */
  private calculateBeta(portfolioReturns: number[], benchmarkData: BenchmarkData[]): number {
    if (portfolioReturns.length !== benchmarkData.length || portfolioReturns.length < 2) {
      return 1.0; // Default beta
    }

    const benchmarkReturns = benchmarkData.map(d => d.return || 0);

    const covariance = this.calculateCovariance(portfolioReturns, benchmarkReturns);
    const benchmarkVariance = this.calculateVariance(benchmarkReturns);

    if (benchmarkVariance === 0) {
      return 1.0;
    }

    return covariance / benchmarkVariance;
  }

  /**
   * Calculate correlation coefficient
   */
  private calculateCorrelation(portfolioReturns: number[], benchmarkData: BenchmarkData[]): number {
    if (portfolioReturns.length !== benchmarkData.length || portfolioReturns.length < 2) {
      return 0;
    }

    const benchmarkReturns = benchmarkData.map(d => d.return || 0);

    const covariance = this.calculateCovariance(portfolioReturns, benchmarkReturns);
    const portfolioStdDev = Math.sqrt(this.calculateVariance(portfolioReturns));
    const benchmarkStdDev = Math.sqrt(this.calculateVariance(benchmarkReturns));

    if (portfolioStdDev === 0 || benchmarkStdDev === 0) {
      return 0;
    }

    return covariance / (portfolioStdDev * benchmarkStdDev);
  }

  /**
   * Calculate tracking error (standard deviation of excess returns)
   */
  private calculateTrackingError(portfolioReturns: number[], benchmarkData: BenchmarkData[]): number {
    if (portfolioReturns.length !== benchmarkData.length || portfolioReturns.length < 2) {
      return 0;
    }

    const benchmarkReturns = benchmarkData.map(d => d.return || 0);
    const excessReturns = portfolioReturns.map((r, i) => r - benchmarkReturns[i]);

    return Math.sqrt(this.calculateVariance(excessReturns));
  }

  /**
   * Calculate covariance between two return series
   */
  private calculateCovariance(returns1: number[], returns2: number[]): number {
    if (returns1.length !== returns2.length || returns1.length === 0) {
      return 0;
    }

    const mean1 = returns1.reduce((sum, r) => sum + r, 0) / returns1.length;
    const mean2 = returns2.reduce((sum, r) => sum + r, 0) / returns2.length;

    let covariance = 0;
    for (let i = 0; i < returns1.length; i++) {
      covariance += (returns1[i] - mean1) * (returns2[i] - mean2);
    }

    return covariance / returns1.length;
  }

  /**
   * Calculate variance of return series
   */
  private calculateVariance(returns: number[]): number {
    if (returns.length === 0) {
      return 0;
    }

    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;

    return variance;
  }

  /**
   * Calculate benchmark return from historical data
   */
  private calculateBenchmarkReturn(benchmarkData: BenchmarkData[]): number {
    if (benchmarkData.length < 2) {
      return 0;
    }

    const startValue = benchmarkData[0].value;
    const endValue = benchmarkData[benchmarkData.length - 1].value;

    return (endValue - startValue) / startValue;
  }

  /**
   * Get historical returns for a portfolio
   */
  private async getPortfolioReturns(
    portfolioId: string,
    dateRange?: DateRangeParams
  ): Promise<number[]> {
    try {
      const snapshots = await prisma.analyticsSnapshot.findMany({
        where: {
          entityType: 'portfolio',
          entityId: portfolioId,
          snapshotType: 'MONTHLY_SUMMARY',
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
          snapshotDate: 'asc',
        },
      });

      const returns: number[] = [];
      for (let i = 1; i < snapshots.length; i++) {
        const prevValue = (snapshots[i - 1].data as any).totalValue || 0;
        const currValue = (snapshots[i].data as any).totalValue || 0;

        if (prevValue > 0) {
          returns.push((currValue - prevValue) / prevValue);
        }
      }

      return returns;
    } catch (error: any) {
      logger.error('Error getting portfolio returns', { error: error.message });
      return [];
    }
  }

  /**
   * Find peer portfolios based on similar characteristics
   */
  private async findPeerPortfolios(portfolio: any): Promise<any[]> {
    try {
      const totalInvested = Number(portfolio.totalInvested);

      // Find portfolios with similar investment size (±50%)
      const minInvestment = totalInvested * 0.5;
      const maxInvestment = totalInvested * 1.5;

      const peers = await prisma.portfolio.findMany({
        where: {
          id: { not: portfolio.id },
          totalInvested: {
            gte: minInvestment,
            lte: maxInvestment,
          },
        },
        take: 50, // Limit to 50 peers
      });

      return peers;
    } catch (error: any) {
      logger.error('Error finding peer portfolios', { error: error.message });
      return [];
    }
  }

  /**
   * Get mock S&P 500 data
   * TODO: Replace with real API call in production
   */
  private async getMockSP500Data(dateRange?: DateRangeParams): Promise<BenchmarkData[]> {
    const endDate = dateRange?.endDate || new Date();
    const startDate = dateRange?.startDate || new Date(endDate.getFullYear() - 1, endDate.getMonth(), endDate.getDate());

    const monthsDiff = this.getMonthsDifference(startDate, endDate);
    const data: BenchmarkData[] = [];

    let currentValue = 4000; // Starting S&P 500 value
    for (let i = 0; i <= monthsDiff; i++) {
      const date = new Date(startDate);
      date.setMonth(date.getMonth() + i);

      // Simulate monthly returns (average ~10% annual = ~0.8% monthly)
      const monthlyReturn = (Math.random() - 0.4) * 0.05; // Random walk around positive trend
      currentValue *= (1 + monthlyReturn);

      data.push({
        date,
        value: currentValue,
        return: monthlyReturn,
      });
    }

    return data;
  }

  /**
   * Get mock NASDAQ data
   * TODO: Replace with real API call in production
   */
  private async getMockNASDAQData(dateRange?: DateRangeParams): Promise<BenchmarkData[]> {
    const endDate = dateRange?.endDate || new Date();
    const startDate = dateRange?.startDate || new Date(endDate.getFullYear() - 1, endDate.getMonth(), endDate.getDate());

    const monthsDiff = this.getMonthsDifference(startDate, endDate);
    const data: BenchmarkData[] = [];

    let currentValue = 12000; // Starting NASDAQ value
    for (let i = 0; i <= monthsDiff; i++) {
      const date = new Date(startDate);
      date.setMonth(date.getMonth() + i);

      // NASDAQ typically more volatile than S&P 500
      const monthlyReturn = (Math.random() - 0.35) * 0.08;
      currentValue *= (1 + monthlyReturn);

      data.push({
        date,
        value: currentValue,
        return: monthlyReturn,
      });
    }

    return data;
  }

  /**
   * Get number of months between two dates
   */
  private getMonthsDifference(startDate: Date, endDate: Date): number {
    const months = (endDate.getFullYear() - startDate.getFullYear()) * 12;
    return months + endDate.getMonth() - startDate.getMonth();
  }

  /**
   * Store benchmark comparison results
   */
  private async storeBenchmarkComparison(
    portfolioId: string,
    benchmarkName: string,
    comparison: BenchmarkComparison,
    dateRange?: DateRangeParams
  ): Promise<void> {
    try {
      const now = new Date();
      const periodStart = dateRange?.startDate || new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      const periodEnd = dateRange?.endDate || now;

      await prisma.analyticsSnapshot.create({
        data: {
          snapshotType: 'INVESTMENT_ANALYTICS',
          entityType: 'portfolio',
          entityId: portfolioId,
          snapshotDate: now,
          data: {
            benchmarkName,
            comparison,
            dateRange: {
              start: periodStart,
              end: periodEnd,
            },
          },
        },
      });

      logger.debug('Benchmark comparison stored', { portfolioId, benchmarkName });
    } catch (error: any) {
      logger.error('Error storing benchmark comparison', {
        portfolioId,
        error: error.message,
      });
      // Don't throw - storing is not critical
    }
  }
}

// Export singleton instance
export const benchmarkService = new BenchmarkService();
export default benchmarkService;
