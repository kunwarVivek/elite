import { Router } from 'express';
import { portfolioController } from '../controllers/portfolio.controller.js';
import { portfolioAnalyticsController } from '../controllers/portfolio-analytics.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validateBody, validateParams } from '../middleware/validation.js';
import {
  createPortfolioSchema,
  updatePortfolioSchema,
  portfolioSummaryQuerySchema,
  portfolioPerformanceQuerySchema,
  exitInvestmentSchema,
  portfolioInvestmentQuerySchema,
  addInvestmentToPortfolioSchema,
  updatePortfolioInvestmentSchema,
  portfolioAnalyticsSchema,
} from '../validations/portfolio.validation.js';

const router = Router();

// All portfolio routes require authentication
router.use(authenticate);

// Get user portfolios
router.get('/', portfolioController.getUserPortfolios.bind(portfolioController));

// Get portfolio by ID
router.get('/:id', portfolioController.getPortfolioById.bind(portfolioController));

// Create portfolio
router.post('/', validateBody(createPortfolioSchema), portfolioController.createPortfolio.bind(portfolioController));

// Update portfolio
router.put('/:id', validateBody(updatePortfolioSchema), portfolioController.updatePortfolio.bind(portfolioController));

// Delete portfolio
router.delete('/:id', portfolioController.deletePortfolio.bind(portfolioController));

// Portfolio summary
router.get('/summary', validateBody(portfolioSummaryQuerySchema), portfolioController.getPortfolioSummary.bind(portfolioController));

// Portfolio performance
router.get('/performance', validateBody(portfolioPerformanceQuerySchema), portfolioController.getPortfolioPerformance.bind(portfolioController));

// Portfolio investments
router.get('/:id/investments', validateBody(portfolioInvestmentQuerySchema), portfolioController.getPortfolioInvestments.bind(portfolioController));

// Add investment to portfolio
router.post('/:id/investments', validateBody(addInvestmentToPortfolioSchema), portfolioController.addInvestmentToPortfolio.bind(portfolioController));

// Update portfolio investment
router.put('/:id/investments/:investmentId', validateBody(updatePortfolioInvestmentSchema), portfolioController.updatePortfolioInvestment.bind(portfolioController));

// Remove investment from portfolio
router.delete('/:id/investments/:investmentId', portfolioController.removeInvestmentFromPortfolio.bind(portfolioController));

// Exit investment
router.post('/:id/exit', validateBody(exitInvestmentSchema), portfolioController.exitInvestment.bind(portfolioController));

// Portfolio analytics
router.post('/:id/analytics', validateBody(portfolioAnalyticsSchema), portfolioController.getPortfolioAnalytics.bind(portfolioController));

// ============================================================================
// PORTFOLIO ANALYTICS ROUTES (NEW)
// ============================================================================

// Get all performance metrics (IRR, MOIC, Sharpe Ratio, etc.)
router.get('/:id/analytics/performance', portfolioAnalyticsController.getPerformanceMetrics.bind(portfolioAnalyticsController));

// Get benchmark comparisons (S&P 500, NASDAQ, peers, sectors)
router.get('/:id/analytics/benchmarks', portfolioAnalyticsController.getBenchmarkComparisons.bind(portfolioAnalyticsController));

// Get risk metrics and analysis
router.get('/:id/analytics/risk-metrics', portfolioAnalyticsController.getRiskMetrics.bind(portfolioAnalyticsController));

// Get historical snapshots and trends
router.get('/:id/analytics/historical', portfolioAnalyticsController.getHistoricalSnapshots.bind(portfolioAnalyticsController));

// Create snapshot (admin only) - moved to root level
router.post('/analytics/snapshot', portfolioAnalyticsController.createSnapshot.bind(portfolioAnalyticsController));

export default router;