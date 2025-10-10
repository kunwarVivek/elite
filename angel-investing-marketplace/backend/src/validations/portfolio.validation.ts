import { z } from 'zod';

// Base schemas
export const portfolioIdSchema = z.string().min(1, 'Portfolio ID is required');
export const investmentIdSchema = z.string().min(1, 'Investment ID is required');

// Portfolio type enum
export const portfolioTypeSchema = z.enum([
  'PERSONAL',
  'SYNDICATE',
  'FUND'
]);

// Portfolio visibility enum
export const portfolioVisibilitySchema = z.enum([
  'PRIVATE',
  'INVESTORS_ONLY',
  'PUBLIC'
]);

// Create portfolio schema
export const createPortfolioSchema = z.object({
  name: z.string().min(1, 'Portfolio name is required').max(100, 'Name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  type: portfolioTypeSchema.default('PERSONAL'),
  visibility: portfolioVisibilitySchema.default('PRIVATE'),
  targetAllocation: z.object({
    earlyStage: z.number().min(0, 'Early stage allocation cannot be negative').max(100, 'Allocation cannot exceed 100%').optional(),
    growthStage: z.number().min(0, 'Growth stage allocation cannot be negative').max(100, 'Allocation cannot exceed 100%').optional(),
    lateStage: z.number().min(0, 'Late stage allocation cannot be negative').max(100, 'Allocation cannot exceed 100%').optional(),
    sectors: z.record(z.string(), z.number().min(0).max(100)).optional(), // sector -> percentage
  }).optional(),
  riskTolerance: z.enum(['CONSERVATIVE', 'MODERATE', 'AGGRESSIVE']).optional(),
  targetReturn: z.number().min(0, 'Target return cannot be negative').optional(),
  investmentHorizon: z.number().min(1, 'Investment horizon must be at least 1 year').max(20, 'Investment horizon cannot exceed 20 years').optional(),
});

// Update portfolio schema
export const updatePortfolioSchema = z.object({
  name: z.string().min(1, 'Portfolio name is required').max(100, 'Name must be less than 100 characters').optional(),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  visibility: portfolioVisibilitySchema.optional(),
  targetAllocation: z.object({
    earlyStage: z.number().min(0, 'Early stage allocation cannot be negative').max(100, 'Allocation cannot exceed 100%').optional(),
    growthStage: z.number().min(0, 'Growth stage allocation cannot be negative').max(100, 'Allocation cannot exceed 100%').optional(),
    lateStage: z.number().min(0, 'Late stage allocation cannot be negative').max(100, 'Allocation cannot exceed 100%').optional(),
    sectors: z.record(z.string(), z.number().min(0).max(100)).optional(), // sector -> percentage
  }).optional(),
  riskTolerance: z.enum(['CONSERVATIVE', 'MODERATE', 'AGGRESSIVE']).optional(),
  targetReturn: z.number().min(0, 'Target return cannot be negative').optional(),
  investmentHorizon: z.number().min(1, 'Investment horizon must be at least 1 year').max(20, 'Investment horizon cannot exceed 20 years').optional(),
});

// Portfolio summary query schema
export const portfolioSummaryQuerySchema = z.object({
  includeUnrealized: z.boolean().default(true),
  includeRealized: z.boolean().default(true),
  asOfDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  currency: z.enum(['USD', 'EUR', 'GBP']).default('USD'),
});

// Portfolio performance query schema
export const portfolioPerformanceQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  interval: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']).default('MONTHLY'),
  includeDividends: z.boolean().default(true),
  includeFees: z.boolean().default(true),
  benchmark: z.enum(['NASDAQ', 'S&P500', 'DOW_JONES', 'RUSSELL2000', 'NONE']).default('NASDAQ'),
  currency: z.enum(['USD', 'EUR', 'GBP']).default('USD'),
});

// Exit investment schema
export const exitInvestmentSchema = z.object({
  exitType: z.enum([
    'IPO',
    'ACQUISITION',
    'SECONDARY_SALE',
    'BUYBACK',
    'LIQUIDATION',
    'OTHER'
  ]),
  exitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  exitAmount: z.number().min(0, 'Exit amount cannot be negative'),
  currency: z.enum(['USD', 'EUR', 'GBP']).default('USD'),
  fees: z.number().min(0, 'Fees cannot be negative').optional(),
  taxes: z.number().min(0, 'Taxes cannot be negative').optional(),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional(),
  documents: z.array(z.object({
    documentType: z.enum(['EXIT_AGREEMENT', 'SALE_CONFIRMATION', 'TAX_DOCUMENT', 'OTHER']),
    fileUrl: z.string().url('Invalid file URL'),
    description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  })).optional(),
});

// Portfolio investment query schema
export const portfolioInvestmentQuerySchema = z.object({
  portfolioId: portfolioIdSchema.optional(),
  status: z.enum(['ACTIVE', 'EXITED', 'WRITE_OFF']).optional(),
  sector: z.string().optional(),
  stage: z.string().optional(),
  minAmount: z.number().min(0, 'Minimum amount must be positive').optional(),
  maxAmount: z.number().min(0, 'Maximum amount must be positive').optional(),
  exitStatus: z.enum(['REALIZED', 'UNREALIZED', 'PARTIAL']).optional(),
  page: z.number().min(1, 'Page must be positive').default(1),
  limit: z.number().min(1, 'Limit must be positive').max(100, 'Limit cannot exceed 100').default(20),
  sortBy: z.enum(['investmentDate', 'amount', 'currentValue', 'performance', 'exitDate']).default('investmentDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Add investment to portfolio schema
export const addInvestmentToPortfolioSchema = z.object({
  investmentId: investmentIdSchema,
  allocationPercentage: z.number().min(0.01, 'Allocation percentage must be at least 0.01%').max(100, 'Allocation percentage cannot exceed 100%'),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
});

// Update portfolio investment schema
export const updatePortfolioInvestmentSchema = z.object({
  allocationPercentage: z.number().min(0.01, 'Allocation percentage must be at least 0.01%').max(100, 'Allocation percentage cannot exceed 100%').optional(),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
});

// Portfolio analytics schema
export const portfolioAnalyticsSchema = z.object({
  metrics: z.array(z.enum([
    'TOTAL_RETURN',
    'ANNUALIZED_RETURN',
    'VOLATILITY',
    'SHARPE_RATIO',
    'MAX_DRAWDOWN',
    'WIN_RATE',
    'AVERAGE_HOLDING_PERIOD',
    'DIVERSIFICATION_RATIO',
    'SECTOR_ALLOCATION',
    'STAGE_ALLOCATION'
  ])).default(['TOTAL_RETURN', 'ANNUALIZED_RETURN', 'VOLATILITY']),
  compareWithBenchmark: z.boolean().default(true),
  includeCashFlows: z.boolean().default(true),
  riskFreeRate: z.number().min(0, 'Risk-free rate cannot be negative').max(1, 'Risk-free rate cannot exceed 100%').default(0.02),
});

// Type exports
export type CreatePortfolioInput = z.infer<typeof createPortfolioSchema>;
export type UpdatePortfolioInput = z.infer<typeof updatePortfolioSchema>;
export type PortfolioSummaryQueryInput = z.infer<typeof portfolioSummaryQuerySchema>;
export type PortfolioPerformanceQueryInput = z.infer<typeof portfolioPerformanceQuerySchema>;
export type ExitInvestmentInput = z.infer<typeof exitInvestmentSchema>;
export type PortfolioInvestmentQueryInput = z.infer<typeof portfolioInvestmentQuerySchema>;
export type AddInvestmentToPortfolioInput = z.infer<typeof addInvestmentToPortfolioSchema>;
export type UpdatePortfolioInvestmentInput = z.infer<typeof updatePortfolioInvestmentSchema>;
export type PortfolioAnalyticsInput = z.infer<typeof portfolioAnalyticsSchema>;

export default {
  createPortfolio: createPortfolioSchema,
  updatePortfolio: updatePortfolioSchema,
  portfolioSummaryQuery: portfolioSummaryQuerySchema,
  portfolioPerformanceQuery: portfolioPerformanceQuerySchema,
  exitInvestment: exitInvestmentSchema,
  portfolioInvestmentQuery: portfolioInvestmentQuerySchema,
  addInvestmentToPortfolio: addInvestmentToPortfolioSchema,
  updatePortfolioInvestment: updatePortfolioInvestmentSchema,
  portfolioAnalytics: portfolioAnalyticsSchema,
};