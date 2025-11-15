import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../config/logger.js';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Performance Calculation Service
 *
 * Implements comprehensive portfolio performance metrics including:
 * - IRR (Internal Rate of Return) using XIRR algorithm
 * - MOIC (Multiple on Invested Capital)
 * - Cash-on-Cash Return
 * - Sharpe Ratio
 * - Portfolio Volatility
 * - Total Return
 * - Annualized Return
 */

interface CashFlow {
  date: Date;
  amount: number;
}

interface PerformanceMetrics {
  irr: number;
  moic: number;
  cashOnCashReturn: number;
  sharpeRatio: number;
  volatility: number;
  totalReturn: number;
  annualizedReturn: number;
}

interface DateRangeParams {
  startDate?: Date;
  endDate?: Date;
}

export class PerformanceCalculationService {
  /**
   * Calculate all performance metrics for a portfolio
   *
   * @param portfolioId - The portfolio ID
   * @param dateRange - Optional date range for calculations
   * @returns Complete performance metrics
   */
  async calculatePortfolioPerformance(
    portfolioId: string,
    dateRange?: DateRangeParams
  ): Promise<PerformanceMetrics> {
    try {
      logger.info('Calculating portfolio performance', { portfolioId, dateRange });

      // Fetch portfolio with investments
      const portfolio = await this.getPortfolioWithInvestments(portfolioId);

      if (!portfolio) {
        throw new AppError('Portfolio not found', 404, 'PORTFOLIO_NOT_FOUND');
      }

      // Get all cash flows for the portfolio
      const cashFlows = await this.getPortfolioCashFlows(portfolioId, dateRange);

      // Calculate individual metrics
      const irr = this.calculateIRR(cashFlows);
      const moic = this.calculateMOIC(portfolioId, cashFlows);
      const cashOnCashReturn = this.calculateCashOnCashReturn(cashFlows);
      const volatility = await this.calculateVolatility(portfolioId, dateRange);
      const totalReturn = this.calculateTotalReturn(cashFlows);
      const annualizedReturn = this.calculateAnnualizedReturn(totalReturn, cashFlows);
      const sharpeRatio = this.calculateSharpeRatio(annualizedReturn, volatility);

      const metrics: PerformanceMetrics = {
        irr,
        moic,
        cashOnCashReturn,
        sharpeRatio,
        volatility,
        totalReturn,
        annualizedReturn,
      };

      // Store metrics in database
      await this.storePerformanceMetrics(portfolioId, metrics, dateRange);

      logger.info('Portfolio performance calculated successfully', {
        portfolioId,
        metrics,
      });

      return metrics;
    } catch (error: any) {
      logger.error('Error calculating portfolio performance', {
        portfolioId,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Calculate IRR (Internal Rate of Return) using XIRR algorithm
   *
   * XIRR handles irregular cash flows unlike traditional IRR
   * Uses Newton-Raphson method for numerical approximation
   *
   * @param cashFlows - Array of cash flows with dates and amounts
   * @returns IRR as a decimal (e.g., 0.15 = 15%)
   */
  calculateIRR(cashFlows: CashFlow[]): number {
    try {
      if (cashFlows.length === 0) {
        logger.warn('No cash flows for IRR calculation');
        return 0;
      }

      if (cashFlows.length === 1) {
        logger.warn('Only one cash flow, IRR not meaningful');
        return 0;
      }

      // Sort cash flows by date
      const sortedFlows = [...cashFlows].sort((a, b) => a.date.getTime() - b.date.getTime());

      // Initial guess for IRR
      let rate = 0.1;
      const maxIterations = 100;
      const tolerance = 0.0001;

      // Newton-Raphson method
      for (let i = 0; i < maxIterations; i++) {
        const { npv, derivative } = this.calculateNPVAndDerivative(sortedFlows, rate);

        if (Math.abs(npv) < tolerance) {
          return rate;
        }

        if (Math.abs(derivative) < 1e-10) {
          logger.warn('IRR derivative too small, returning current estimate');
          return rate;
        }

        // Newton-Raphson update
        rate = rate - npv / derivative;

        // Bounds checking
        if (rate < -0.99) rate = -0.99;
        if (rate > 10) rate = 10;
      }

      logger.warn('IRR did not converge, returning last estimate', { rate });
      return rate;
    } catch (error: any) {
      logger.error('Error calculating IRR', { error: error.message });
      return 0;
    }
  }

  /**
   * Calculate NPV and its derivative for XIRR
   */
  private calculateNPVAndDerivative(
    cashFlows: CashFlow[],
    rate: number
  ): { npv: number; derivative: number } {
    const firstDate = cashFlows[0].date.getTime();
    let npv = 0;
    let derivative = 0;

    for (const flow of cashFlows) {
      const daysDiff = (flow.date.getTime() - firstDate) / (1000 * 60 * 60 * 24);
      const yearsDiff = daysDiff / 365.25;
      const factor = Math.pow(1 + rate, yearsDiff);

      npv += flow.amount / factor;
      derivative -= (flow.amount * yearsDiff) / Math.pow(1 + rate, yearsDiff + 1);
    }

    return { npv, derivative };
  }

  /**
   * Calculate MOIC (Multiple on Invested Capital)
   *
   * Formula: Current Portfolio Value / Total Invested Capital
   *
   * @param portfolioId - Portfolio ID
   * @param cashFlows - Cash flows for the portfolio
   * @returns MOIC as a multiple (e.g., 2.5 = 2.5x return)
   */
  calculateMOIC(portfolioId: string, cashFlows: CashFlow[]): number {
    try {
      // Total invested capital (negative cash flows = investments)
      const totalInvested = cashFlows
        .filter(cf => cf.amount < 0)
        .reduce((sum, cf) => sum + Math.abs(cf.amount), 0);

      if (totalInvested === 0) {
        logger.warn('No investments found for MOIC calculation', { portfolioId });
        return 0;
      }

      // Current value (positive cash flows + unrealized value)
      const totalDistributions = cashFlows
        .filter(cf => cf.amount > 0)
        .reduce((sum, cf) => sum + cf.amount, 0);

      // Get current unrealized value from portfolio
      // This would be the current market value of holdings
      const currentValue = totalDistributions; // Simplified - would add unrealized value in production

      const moic = currentValue / totalInvested;

      logger.debug('MOIC calculated', {
        portfolioId,
        totalInvested,
        currentValue,
        moic,
      });

      return moic;
    } catch (error: any) {
      logger.error('Error calculating MOIC', { error: error.message });
      return 0;
    }
  }

  /**
   * Calculate Cash-on-Cash Return
   *
   * Formula: Total Cash Distributions / Total Invested Capital
   *
   * @param cashFlows - Cash flows for the portfolio
   * @returns Cash-on-Cash return as a decimal
   */
  calculateCashOnCashReturn(cashFlows: CashFlow[]): number {
    try {
      const totalInvested = cashFlows
        .filter(cf => cf.amount < 0)
        .reduce((sum, cf) => sum + Math.abs(cf.amount), 0);

      if (totalInvested === 0) {
        return 0;
      }

      const totalDistributions = cashFlows
        .filter(cf => cf.amount > 0)
        .reduce((sum, cf) => sum + cf.amount, 0);

      return totalDistributions / totalInvested;
    } catch (error: any) {
      logger.error('Error calculating Cash-on-Cash return', { error: error.message });
      return 0;
    }
  }

  /**
   * Calculate Sharpe Ratio
   *
   * Formula: (Portfolio Return - Risk-Free Rate) / Portfolio Standard Deviation
   *
   * @param portfolioReturn - Annualized portfolio return
   * @param volatility - Portfolio volatility (standard deviation)
   * @param riskFreeRate - Risk-free rate (default 2%)
   * @returns Sharpe Ratio
   */
  calculateSharpeRatio(
    portfolioReturn: number,
    volatility: number,
    riskFreeRate: number = 0.02
  ): number {
    try {
      if (volatility === 0) {
        logger.warn('Volatility is zero, Sharpe Ratio undefined');
        return 0;
      }

      const excessReturn = portfolioReturn - riskFreeRate;
      const sharpeRatio = excessReturn / volatility;

      logger.debug('Sharpe Ratio calculated', {
        portfolioReturn,
        riskFreeRate,
        volatility,
        sharpeRatio,
      });

      return sharpeRatio;
    } catch (error: any) {
      logger.error('Error calculating Sharpe Ratio', { error: error.message });
      return 0;
    }
  }

  /**
   * Calculate Portfolio Volatility (Standard Deviation of Returns)
   *
   * @param portfolioId - Portfolio ID
   * @param dateRange - Date range for calculation
   * @returns Annualized volatility
   */
  async calculateVolatility(
    portfolioId: string,
    dateRange?: DateRangeParams
  ): Promise<number> {
    try {
      // Get historical performance snapshots
      const snapshots = await this.getHistoricalSnapshots(portfolioId, dateRange);

      if (snapshots.length < 2) {
        logger.warn('Insufficient data for volatility calculation', { portfolioId });
        return 0;
      }

      // Calculate period returns
      const returns: number[] = [];
      for (let i = 1; i < snapshots.length; i++) {
        const previousValue = snapshots[i - 1].value;
        const currentValue = snapshots[i].value;

        if (previousValue > 0) {
          const periodReturn = (currentValue - previousValue) / previousValue;
          returns.push(periodReturn);
        }
      }

      if (returns.length === 0) {
        return 0;
      }

      // Calculate mean return
      const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;

      // Calculate variance
      const variance = returns.reduce((sum, r) => {
        const diff = r - meanReturn;
        return sum + diff * diff;
      }, 0) / returns.length;

      // Standard deviation (volatility)
      const volatility = Math.sqrt(variance);

      // Annualize volatility (assuming monthly snapshots)
      const annualizedVolatility = volatility * Math.sqrt(12);

      logger.debug('Volatility calculated', {
        portfolioId,
        returns: returns.length,
        volatility,
        annualizedVolatility,
      });

      return annualizedVolatility;
    } catch (error: any) {
      logger.error('Error calculating volatility', { error: error.message });
      return 0;
    }
  }

  /**
   * Calculate Total Return
   *
   * Formula: (Current Value - Invested Capital) / Invested Capital
   *
   * @param cashFlows - Cash flows for the portfolio
   * @returns Total return as a decimal
   */
  calculateTotalReturn(cashFlows: CashFlow[]): number {
    try {
      const totalInvested = cashFlows
        .filter(cf => cf.amount < 0)
        .reduce((sum, cf) => sum + Math.abs(cf.amount), 0);

      if (totalInvested === 0) {
        return 0;
      }

      const totalValue = cashFlows.reduce((sum, cf) => sum + cf.amount, 0);

      return totalValue / totalInvested;
    } catch (error: any) {
      logger.error('Error calculating total return', { error: error.message });
      return 0;
    }
  }

  /**
   * Calculate Annualized Return (CAGR)
   *
   * Formula: ((Ending Value / Beginning Value) ^ (1 / Years)) - 1
   *
   * @param totalReturn - Total return
   * @param cashFlows - Cash flows to determine time period
   * @returns Annualized return as a decimal
   */
  calculateAnnualizedReturn(totalReturn: number, cashFlows: CashFlow[]): number {
    try {
      if (cashFlows.length < 2) {
        return 0;
      }

      const sortedFlows = [...cashFlows].sort((a, b) => a.date.getTime() - b.date.getTime());
      const firstDate = sortedFlows[0].date;
      const lastDate = sortedFlows[sortedFlows.length - 1].date;

      const daysDiff = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);
      const years = daysDiff / 365.25;

      if (years === 0) {
        return 0;
      }

      const annualizedReturn = Math.pow(1 + totalReturn, 1 / years) - 1;

      logger.debug('Annualized return calculated', {
        totalReturn,
        years,
        annualizedReturn,
      });

      return annualizedReturn;
    } catch (error: any) {
      logger.error('Error calculating annualized return', { error: error.message });
      return 0;
    }
  }

  /**
   * Get portfolio with all investments and transactions
   */
  private async getPortfolioWithInvestments(portfolioId: string) {
    return await prisma.portfolio.findUnique({
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
  }

  /**
   * Get all cash flows for a portfolio
   *
   * Cash flows include:
   * - Initial investments (negative)
   * - Follow-on investments (negative)
   * - Distributions (positive)
   * - Exits (positive)
   */
  private async getPortfolioCashFlows(
    portfolioId: string,
    dateRange?: DateRangeParams
  ): Promise<CashFlow[]> {
    try {
      const portfolio = await prisma.portfolio.findUnique({
        where: { id: portfolioId },
      });

      if (!portfolio) {
        return [];
      }

      // Get all investments for this investor
      const investments = await prisma.investment.findMany({
        where: {
          investorId: portfolio.investorId,
          ...(dateRange?.startDate && {
            investmentDate: {
              gte: dateRange.startDate,
            },
          }),
          ...(dateRange?.endDate && {
            investmentDate: {
              lte: dateRange.endDate,
            },
          }),
        },
        include: {
          transactions: true,
        },
      });

      const cashFlows: CashFlow[] = [];

      // Add investment cash flows (negative)
      for (const investment of investments) {
        if (investment.investmentDate) {
          cashFlows.push({
            date: investment.investmentDate,
            amount: -Number(investment.amount),
          });
        }
      }

      // Add transaction cash flows
      for (const investment of investments) {
        for (const transaction of investment.transactions) {
          if (transaction.status === 'COMPLETED') {
            const amount = Number(transaction.amount);

            // Investments are negative, distributions are positive
            const flowAmount = transaction.type === 'INVESTMENT' ? -amount : amount;

            cashFlows.push({
              date: transaction.processedAt || transaction.createdAt,
              amount: flowAmount,
            });
          }
        }
      }

      // Add current portfolio value as final cash flow
      if (Number(portfolio.totalValue) > 0) {
        cashFlows.push({
          date: new Date(),
          amount: Number(portfolio.totalValue),
        });
      }

      return cashFlows.sort((a, b) => a.date.getTime() - b.date.getTime());
    } catch (error: any) {
      logger.error('Error getting portfolio cash flows', {
        portfolioId,
        error: error.message,
      });
      return [];
    }
  }

  /**
   * Get historical performance snapshots
   */
  private async getHistoricalSnapshots(
    portfolioId: string,
    dateRange?: DateRangeParams
  ): Promise<Array<{ date: Date; value: number }>> {
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

      return snapshots.map(snapshot => ({
        date: snapshot.snapshotDate,
        value: (snapshot.data as any).totalValue || 0,
      }));
    } catch (error: any) {
      logger.error('Error getting historical snapshots', {
        portfolioId,
        error: error.message,
      });
      return [];
    }
  }

  /**
   * Store calculated performance metrics in the database
   */
  private async storePerformanceMetrics(
    portfolioId: string,
    metrics: PerformanceMetrics,
    dateRange?: DateRangeParams
  ): Promise<void> {
    try {
      const now = new Date();
      const periodStart = dateRange?.startDate || new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      const periodEnd = dateRange?.endDate || now;

      const metricsToStore = [
        {
          entityType: 'portfolio',
          entityId: portfolioId,
          metricType: 'INVESTMENT_RETURN',
          metricName: 'IRR',
          metricValue: new Decimal(metrics.irr),
          metricUnit: 'percentage',
          period: 'custom',
          periodStart,
          periodEnd,
          metadata: { dateRange },
        },
        {
          entityType: 'portfolio',
          entityId: portfolioId,
          metricType: 'INVESTMENT_RETURN',
          metricName: 'MOIC',
          metricValue: new Decimal(metrics.moic),
          metricUnit: 'multiple',
          period: 'custom',
          periodStart,
          periodEnd,
          metadata: { dateRange },
        },
        {
          entityType: 'portfolio',
          entityId: portfolioId,
          metricType: 'INVESTMENT_RETURN',
          metricName: 'Cash-on-Cash Return',
          metricValue: new Decimal(metrics.cashOnCashReturn),
          metricUnit: 'percentage',
          period: 'custom',
          periodStart,
          periodEnd,
          metadata: { dateRange },
        },
        {
          entityType: 'portfolio',
          entityId: portfolioId,
          metricType: 'INVESTMENT_RETURN',
          metricName: 'Sharpe Ratio',
          metricValue: new Decimal(metrics.sharpeRatio),
          metricUnit: 'ratio',
          period: 'custom',
          periodStart,
          periodEnd,
          metadata: { dateRange },
        },
        {
          entityType: 'portfolio',
          entityId: portfolioId,
          metricType: 'PORTFOLIO_VALUE',
          metricName: 'Volatility',
          metricValue: new Decimal(metrics.volatility),
          metricUnit: 'percentage',
          period: 'custom',
          periodStart,
          periodEnd,
          metadata: { dateRange },
        },
        {
          entityType: 'portfolio',
          entityId: portfolioId,
          metricType: 'INVESTMENT_RETURN',
          metricName: 'Total Return',
          metricValue: new Decimal(metrics.totalReturn),
          metricUnit: 'percentage',
          period: 'custom',
          periodStart,
          periodEnd,
          metadata: { dateRange },
        },
        {
          entityType: 'portfolio',
          entityId: portfolioId,
          metricType: 'INVESTMENT_RETURN',
          metricName: 'Annualized Return',
          metricValue: new Decimal(metrics.annualizedReturn),
          metricUnit: 'percentage',
          period: 'custom',
          periodStart,
          periodEnd,
          metadata: { dateRange },
        },
      ];

      await prisma.performanceMetric.createMany({
        data: metricsToStore,
      });

      logger.info('Performance metrics stored successfully', { portfolioId });
    } catch (error: any) {
      logger.error('Error storing performance metrics', {
        portfolioId,
        error: error.message,
      });
      // Don't throw - storing metrics is not critical
    }
  }
}

// Export singleton instance
export const performanceCalculationService = new PerformanceCalculationService();
export default performanceCalculationService;
