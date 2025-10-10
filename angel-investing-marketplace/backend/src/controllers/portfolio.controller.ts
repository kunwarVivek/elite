import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler.js';
import { sendSuccess } from '../utils/response.js';
import { logger } from '../config/logger.js';

// Types for better type safety
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

interface CreatePortfolioData {
  name: string;
  description?: string;
  isPublic?: boolean;
}

interface UpdatePortfolioData {
  name?: string;
  description?: string;
  isPublic?: boolean;
}

class PortfolioController {
  // Get user portfolios
  async getUserPortfolios(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const portfolios = await this.getUserPortfoliosFromDb(userId);

      // Calculate portfolio metrics for each portfolio
      const portfoliosWithMetrics = portfolios.map((portfolio) => {
        return {
          id: portfolio.id,
          name: portfolio.name,
          description: portfolio.description,
          is_public: portfolio.isPublic,
          total_value: portfolio.totalValue,
          total_invested: portfolio.totalInvested,
          total_exits: portfolio.totalExits,
          investment_count: portfolio.investmentCount,
          created_at: portfolio.createdAt,
          updated_at: portfolio.updatedAt,
        };
      });

      sendSuccess(res, {
        portfolios: portfoliosWithMetrics,
      }, 'Portfolios retrieved successfully');

    } catch (error) {
      next(error);
    }
  }

  // Get portfolio by ID
  async getPortfolioById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params as unknown as PortfolioParams;

      const portfolio = await this.findPortfolioById(id);
      if (!portfolio) {
        throw new AppError('Portfolio not found', 404, 'PORTFOLIO_NOT_FOUND');
      }

      // Check if user owns the portfolio or is admin
      if (portfolio.investorId !== userId && req.user?.role !== 'ADMIN') {
        throw new AppError('Not authorized to view this portfolio', 403, 'NOT_AUTHORIZED');
      }

      // Get portfolio investments
      const investments = await this.getPortfolioInvestmentsFromDb(id);

      sendSuccess(res, {
        id: portfolio.id,
        name: portfolio.name,
        description: portfolio.description,
        is_public: portfolio.isPublic,
        total_value: portfolio.totalValue,
        total_invested: portfolio.totalInvested,
        total_exits: portfolio.totalExits,
        investment_count: portfolio.investmentCount,
        investments: investments,
        created_at: portfolio.createdAt,
        updated_at: portfolio.updatedAt,
      }, 'Portfolio retrieved successfully');

    } catch (error) {
      next(error);
    }
  }

  // Create portfolio
  async createPortfolio(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const portfolioData: CreatePortfolioData = req.body;

      // Create portfolio
      const portfolio = await this.createPortfolioInDb({
        ...portfolioData,
        investorId: userId,
      });

      logger.info('Portfolio created', { portfolioId: portfolio.id, userId });

      sendSuccess(res, {
        id: portfolio.id,
        name: portfolio.name,
        is_public: portfolio.isPublic,
        created_at: portfolio.createdAt,
      }, 'Portfolio created successfully', 201);

    } catch (error) {
      next(error);
    }
  }

  // Update portfolio
  async updatePortfolio(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params as unknown as PortfolioParams;
      const updateData: UpdatePortfolioData = req.body;

      // Check if user owns the portfolio or is admin
      const portfolio = await this.findPortfolioById(id);
      if (!portfolio) {
        throw new AppError('Portfolio not found', 404, 'PORTFOLIO_NOT_FOUND');
      }

      if (portfolio.investorId !== userId && req.user?.role !== 'ADMIN') {
        throw new AppError('Not authorized to update this portfolio', 403, 'NOT_AUTHORIZED');
      }

      // Update portfolio
      const updatedPortfolio = await this.updatePortfolioInDb(id, updateData);

      logger.info('Portfolio updated', { portfolioId: id, updatedBy: userId });

      sendSuccess(res, {
        id: updatedPortfolio.id,
        name: updatedPortfolio.name,
        updated_at: updatedPortfolio.updatedAt,
      }, 'Portfolio updated successfully');

    } catch (error) {
      next(error);
    }
  }

  // Delete portfolio
  async deletePortfolio(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params as unknown as PortfolioParams;

      // Check if user owns the portfolio or is admin
      const portfolio = await this.findPortfolioById(id);
      if (!portfolio) {
        throw new AppError('Portfolio not found', 404, 'PORTFOLIO_NOT_FOUND');
      }

      if (portfolio.investorId !== userId && req.user?.role !== 'ADMIN') {
        throw new AppError('Not authorized to delete this portfolio', 403, 'NOT_AUTHORIZED');
      }

      await this.deletePortfolioFromDb(id);

      logger.info('Portfolio deleted', { portfolioId: id, deletedBy: userId });

      sendSuccess(res, null, 'Portfolio deleted successfully');

    } catch (error) {
      next(error);
    }
  }

  // Get portfolio summary
  async getPortfolioSummary(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const {
        includeUnrealized,
        includeRealized,
        asOfDate,
        currency,
      } = req.query as any;

      const summary = await this.calculatePortfolioSummary(userId, {
        includeUnrealized: includeUnrealized !== 'false',
        includeRealized: includeRealized !== 'false',
        asOfDate,
        currency: currency || 'USD',
      });

      sendSuccess(res, {
        as_of_date: asOfDate || new Date().toISOString().split('T')[0],
        currency: currency || 'USD',
        total_portfolios: summary.totalPortfolios,
        total_value: summary.totalValue,
        total_invested: summary.totalInvested,
        total_return: summary.totalReturn,
        percentage_return: summary.percentageReturn,
        investment_count: summary.investmentCount,
        active_investments: summary.activeInvestments,
        exited_investments: summary.exitedInvestments,
        top_performers: summary.topPerformers,
        sector_allocation: summary.sectorAllocation,
        stage_allocation: summary.stageAllocation,
      }, 'Portfolio summary retrieved successfully');

    } catch (error) {
      next(error);
    }
  }

  // Get portfolio performance
  async getPortfolioPerformance(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const {
        startDate,
        endDate,
        interval,
        includeDividends,
        includeFees,
        benchmark,
        currency,
      } = req.query as any;

      const performance = await this.calculatePortfolioPerformance(userId, {
        startDate,
        endDate,
        interval: interval || 'MONTHLY',
        includeDividends: includeDividends !== 'false',
        includeFees: includeFees !== 'false',
        benchmark: benchmark || 'NASDAQ',
        currency: currency || 'USD',
      });

      sendSuccess(res, {
        period: {
          start_date: startDate,
          end_date: endDate,
        },
        interval: interval || 'MONTHLY',
        currency: currency || 'USD',
        portfolio_performance: performance.portfolioPerformance,
        benchmark_performance: performance.benchmarkPerformance,
        relative_performance: performance.relativePerformance,
        risk_metrics: performance.riskMetrics,
        cash_flows: performance.cashFlows,
      }, 'Portfolio performance retrieved successfully');

    } catch (error) {
      next(error);
    }
  }

  // Add investment to portfolio
  async addInvestmentToPortfolio(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params as unknown as PortfolioParams;
      const { investmentId, allocationPercentage, notes } = req.body;

      // Check if user owns the portfolio
      const portfolio = await this.findPortfolioById(id);
      if (!portfolio) {
        throw new AppError('Portfolio not found', 404, 'PORTFOLIO_NOT_FOUND');
      }

      if (portfolio.investorId !== userId) {
        throw new AppError('Not authorized to modify this portfolio', 403, 'NOT_AUTHORIZED');
      }

      // Check if investment exists and user owns it
      const investment = await this.findInvestmentById(investmentId);
      if (!investment) {
        throw new AppError('Investment not found', 404, 'INVESTMENT_NOT_FOUND');
      }

      if (investment.investorId !== userId) {
        throw new AppError('Not authorized to add this investment to portfolio', 403, 'NOT_AUTHORIZED');
      }

      // Add investment to portfolio
      const portfolioInvestment = await this.addInvestmentToPortfolioInDb(id, {
        investmentId,
        allocationPercentage,
        notes,
        addedBy: userId,
      });

      logger.info('Investment added to portfolio', {
        portfolioId: id,
        investmentId,
        addedBy: userId,
      });

      sendSuccess(res, {
        id: portfolioInvestment.id,
        investment_id: portfolioInvestment.investmentId,
        allocation_percentage: portfolioInvestment.allocationPercentage,
        added_at: portfolioInvestment.addedAt,
      }, 'Investment added to portfolio successfully', 201);

    } catch (error) {
      next(error);
    }
  }

  // Update portfolio investment
  async updatePortfolioInvestment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id, investmentId } = req.params as unknown as PortfolioParams & { investmentId: string };
      const { allocationPercentage, notes } = req.body;

      // Check if user owns the portfolio
      const portfolio = await this.findPortfolioById(id);
      if (!portfolio) {
        throw new AppError('Portfolio not found', 404, 'PORTFOLIO_NOT_FOUND');
      }

      if (portfolio.investorId !== userId) {
        throw new AppError('Not authorized to modify this portfolio', 403, 'NOT_AUTHORIZED');
      }

      // Update portfolio investment
      const updatedPortfolioInvestment = await this.updatePortfolioInvestmentInDb(investmentId, {
        allocationPercentage,
        notes,
        updatedBy: userId,
      });

      logger.info('Portfolio investment updated', {
        portfolioId: id,
        investmentId,
        updatedBy: userId,
      });

      sendSuccess(res, {
        id: updatedPortfolioInvestment.id,
        allocation_percentage: updatedPortfolioInvestment.allocationPercentage,
        updated_at: updatedPortfolioInvestment.updatedAt,
      }, 'Portfolio investment updated successfully');

    } catch (error) {
      next(error);
    }
  }

  // Remove investment from portfolio
  async removeInvestmentFromPortfolio(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id, investmentId } = req.params as unknown as PortfolioParams & { investmentId: string };

      // Check if user owns the portfolio
      const portfolio = await this.findPortfolioById(id);
      if (!portfolio) {
        throw new AppError('Portfolio not found', 404, 'PORTFOLIO_NOT_FOUND');
      }

      if (portfolio.investorId !== userId) {
        throw new AppError('Not authorized to modify this portfolio', 403, 'NOT_AUTHORIZED');
      }

      await this.removeInvestmentFromPortfolioInDb(investmentId);

      logger.info('Investment removed from portfolio', {
        portfolioId: id,
        investmentId,
        removedBy: userId,
      });

      sendSuccess(res, null, 'Investment removed from portfolio successfully');

    } catch (error) {
      next(error);
    }
  }

  // Exit investment
  async exitInvestment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params as unknown as PortfolioParams;
      const {
        exitType,
        exitDate,
        exitAmount,
        currency,
        fees,
        taxes,
        notes,
        documents,
      } = req.body;

      // Check if user owns the portfolio
      const portfolio = await this.findPortfolioById(id);
      if (!portfolio) {
        throw new AppError('Portfolio not found', 404, 'PORTFOLIO_NOT_FOUND');
      }

      if (portfolio.investorId !== userId) {
        throw new AppError('Not authorized to modify this portfolio', 403, 'NOT_AUTHORIZED');
      }

      // Process exit
      const exit = await this.processInvestmentExit(id, {
        exitType,
        exitDate,
        exitAmount,
        currency: currency || 'USD',
        fees,
        taxes,
        notes,
        documents,
        processedBy: userId,
      });

      logger.info('Investment exit processed', {
        portfolioId: id,
        exitId: exit.id,
        exitType,
        exitAmount,
        processedBy: userId,
      });

      sendSuccess(res, {
        id: exit.id,
        exit_type: exit.exitType,
        exit_amount: exit.exitAmount,
        net_return: exit.netReturn,
        exit_date: exit.exitDate,
        processed_at: exit.processedAt,
      }, 'Investment exit processed successfully', 201);

    } catch (error) {
      next(error);
    }
  }

  // Get portfolio analytics
  async getPortfolioAnalytics(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params as unknown as PortfolioParams;
      const {
        metrics,
        compareWithBenchmark,
        includeCashFlows,
        riskFreeRate,
      } = req.body;

      // Check if user owns the portfolio
      const portfolio = await this.findPortfolioById(id);
      if (!portfolio) {
        throw new AppError('Portfolio not found', 404, 'PORTFOLIO_NOT_FOUND');
      }

      if (portfolio.investorId !== userId) {
        throw new AppError('Not authorized to view this portfolio analytics', 403, 'NOT_AUTHORIZED');
      }

      const analytics = await this.calculatePortfolioAnalytics(id, {
        metrics: metrics || ['TOTAL_RETURN', 'ANNUALIZED_RETURN', 'VOLATILITY'],
        compareWithBenchmark: compareWithBenchmark !== false,
        includeCashFlows: includeCashFlows !== false,
        riskFreeRate: riskFreeRate || 0.02,
      });

      sendSuccess(res, {
        portfolio_id: id,
        calculated_at: new Date().toISOString(),
        metrics: analytics.metrics,
        benchmark_comparison: analytics.benchmarkComparison,
        risk_analysis: analytics.riskAnalysis,
        allocation_analysis: analytics.allocationAnalysis,
        cash_flow_analysis: analytics.cashFlowAnalysis,
      }, 'Portfolio analytics retrieved successfully');

    } catch (error) {
      next(error);
    }
  }

  // Get portfolio investments (public route handler)
  async getPortfolioInvestments(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params as unknown as PortfolioParams;

      // Check if user owns the portfolio
      const portfolio = await this.findPortfolioById(id);
      if (!portfolio) {
        throw new AppError('Portfolio not found', 404, 'PORTFOLIO_NOT_FOUND');
      }

      if (portfolio.investorId !== userId && req.user?.role !== 'ADMIN') {
        throw new AppError('Not authorized to view this portfolio', 403, 'NOT_AUTHORIZED');
      }

      const investments = await this.getPortfolioInvestmentsFromDb(id);

      sendSuccess(res, {
        portfolio_id: id,
        investments: investments,
      }, 'Portfolio investments retrieved successfully');

    } catch (error) {
      next(error);
    }
  }

  // Helper methods
  private async getPortfolioInvestmentsFromDb(_portfolioId: string): Promise<any[]> {
    // TODO: Get investments in portfolio
    return [];
  }

  // Database operations (these would typically be in a service layer)
  private async getUserPortfoliosFromDb(_userId: string): Promise<any[]> {
    // TODO: Implement database query
    return [];
  }

  private async findPortfolioById(_id: string): Promise<any | null> {
    // TODO: Implement database query
    return null;
  }

  private async createPortfolioInDb(portfolioData: any): Promise<any> {
    // TODO: Implement database insert
    return {
      id: 'portfolio_123',
      ...portfolioData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private async updatePortfolioInDb(id: string, updateData: any): Promise<any> {
    // TODO: Implement database update
    return {
      id,
      ...updateData,
      updatedAt: new Date(),
    };
  }

  private async deletePortfolioFromDb(_id: string): Promise<void> {
    // TODO: Implement database delete
  }

  private async calculatePortfolioSummary(_userId: string, _filters: any): Promise<any> {
    // TODO: Calculate portfolio summary
    return {
      totalPortfolios: 0,
      totalValue: 0,
      totalInvested: 0,
      totalReturn: 0,
      percentageReturn: 0,
      investmentCount: 0,
      activeInvestments: 0,
      exitedInvestments: 0,
      topPerformers: [],
      sectorAllocation: {},
      stageAllocation: {},
    };
  }

  private async calculatePortfolioPerformance(_userId: string, _filters: any): Promise<any> {
    // TODO: Calculate portfolio performance
    return {
      portfolioPerformance: [],
      benchmarkPerformance: [],
      relativePerformance: {},
      riskMetrics: {},
      cashFlows: [],
    };
  }

  private async findInvestmentById(_id: string): Promise<any | null> {
    // TODO: Implement database query
    return null;
  }

  private async addInvestmentToPortfolioInDb(_portfolioId: string, data: any): Promise<any> {
    // TODO: Implement database insert
    return {
      id: 'portfolio_investment_123',
      ...data,
      addedAt: new Date(),
    };
  }

  private async updatePortfolioInvestmentInDb(investmentId: string, updateData: any): Promise<any> {
    // TODO: Implement database update
    return {
      id: investmentId,
      ...updateData,
      updatedAt: new Date(),
    };
  }

  private async removeInvestmentFromPortfolioInDb(_investmentId: string): Promise<void> {
    // TODO: Implement database delete
  }

  private async processInvestmentExit(_portfolioId: string, exitData: any): Promise<any> {
    // TODO: Process investment exit
    return {
      id: 'exit_123',
      ...exitData,
      netReturn: exitData.exitAmount - (exitData.fees || 0) - (exitData.taxes || 0),
      processedAt: new Date(),
    };
  }

  private async calculatePortfolioAnalytics(_portfolioId: string, _config: any): Promise<any> {
    // TODO: Calculate portfolio analytics
    return {
      metrics: {},
      benchmarkComparison: {},
      riskAnalysis: {},
      allocationAnalysis: {},
      cashFlowAnalysis: {},
    };
  }
}

// Export singleton instance
export const portfolioController = new PortfolioController();
export default portfolioController;