import { z } from 'zod';

// Base schemas
export const pitchIdSchema = z.string().uuid('Invalid pitch ID format');
export const startupIdSchema = z.string().uuid('Invalid startup ID format');

// Import common schemas from auth validation
import { currencyAmountSchema, percentageSchema, urlSchema } from './auth.js';

// Pitch status enum
export const pitchStatusSchema = z.enum([
  'DRAFT',
  'UNDER_REVIEW',
  'ACTIVE',
  'PAUSED',
  'FUNDED',
  'CANCELLED',
  'REJECTED'
]);

// Pitch type enum
export const pitchTypeSchema = z.enum([
  'EQUITY',
  'CONVERTIBLE_NOTE',
  'SAFE',
  'DEBT',
  'REVENUE_SHARE'
]);

// Create pitch schema
export const createPitchSchema = z.object({
  startup_id: startupIdSchema,
  title: z
    .string()
    .min(10, 'Title must be at least 10 characters')
    .max(200, 'Title must be less than 200 characters')
    .regex(/^[^<>\"'&]*$/, 'Title contains invalid characters')
    .trim(),
  summary: z
    .string()
    .min(100, 'Summary must be at least 100 characters')
    .max(1000, 'Summary must be less than 1000 characters')
    .regex(/^[^<>\"'&]*$/, 'Summary contains invalid characters'),
  problem_statement: z
    .string()
    .min(50, 'Problem statement must be at least 50 characters')
    .max(2000, 'Problem statement must be less than 2000 characters')
    .regex(/^[^<>\"'&]*$/, 'Problem statement contains invalid characters'),
  solution: z
    .string()
    .min(50, 'Solution must be at least 50 characters')
    .max(2000, 'Solution must be less than 2000 characters')
    .regex(/^[^<>\"'&]*$/, 'Solution contains invalid characters'),
  market_opportunity: z
    .string()
    .min(50, 'Market opportunity must be at least 50 characters')
    .max(2000, 'Market opportunity must be less than 2000 characters')
    .regex(/^[^<>\"'&]*$/, 'Market opportunity contains invalid characters'),
  product: z
    .string()
    .min(50, 'Product description must be at least 50 characters')
    .max(2000, 'Product description must be less than 2000 characters')
    .regex(/^[^<>\"'&]*$/, 'Product description contains invalid characters'),
  business_model: z
    .string()
    .min(50, 'Business model must be at least 50 characters')
    .max(2000, 'Business model must be less than 2000 characters')
    .regex(/^[^<>\"'&]*$/, 'Business model contains invalid characters'),
  go_to_market: z
    .string()
    .min(50, 'Go-to-market strategy must be at least 50 characters')
    .max(2000, 'Go-to-market strategy must be less than 2000 characters')
    .regex(/^[^<>\"'&]*$/, 'Go-to-market strategy contains invalid characters'),
  competitive_landscape: z
    .string()
    .min(50, 'Competitive landscape must be at least 50 characters')
    .max(2000, 'Competitive landscape must be less than 2000 characters')
    .regex(/^[^<>\"'&]*$/, 'Competitive landscape contains invalid characters'),
  use_of_funds: z
    .string()
    .min(50, 'Use of funds must be at least 50 characters')
    .max(2000, 'Use of funds must be less than 2000 characters')
    .regex(/^[^<>\"'&]*$/, 'Use of funds contains invalid characters'),
  funding_amount: currencyAmountSchema,
  equity_offered: percentageSchema.optional(),
  minimum_investment: z
    .number()
    .min(100, 'Minimum investment is $100')
    .max(10000, 'Maximum minimum investment is $10,000'),
  pitch_type: pitchTypeSchema.default('EQUITY'),
  valuation: z.number().min(0, 'Valuation cannot be negative').optional(),
  pre_money_valuation: z.number().min(0, 'Pre-money valuation cannot be negative').optional(),
  financial_projections: z.object({
    year1_revenue: currencyAmountSchema.optional(),
    year2_revenue: currencyAmountSchema.optional(),
    year3_revenue: currencyAmountSchema.optional(),
    year1_customers: z.number().int().positive().optional(),
    year2_customers: z.number().int().positive().optional(),
    year3_customers: z.number().int().positive().optional(),
    year1_burn_rate: currencyAmountSchema.optional(),
    year2_burn_rate: currencyAmountSchema.optional(),
    year3_burn_rate: currencyAmountSchema.optional(),
  }).optional(),
  milestones: z.array(z.object({
    title: z
      .string()
      .min(1, 'Milestone title is required')
      .max(200, 'Title must be less than 200 characters')
      .regex(/^[^<>\"'&]*$/, 'Title contains invalid characters'),
    description: z
      .string()
      .min(10, 'Description must be at least 10 characters')
      .max(500, 'Description must be less than 500 characters')
      .regex(/^[^<>\"'&]*$/, 'Description contains invalid characters'),
    target_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
      .refine(
        (date) => new Date(date) >= new Date(),
        'Target date must be in the future'
      ),
    funding_required: currencyAmountSchema.optional(),
  })).max(10, 'Maximum 10 milestones allowed').optional(),
  pitch_deck_url: urlSchema,
  video_url: urlSchema,
  tags: z
    .array(z.string().min(2, 'Tag too short').max(30, 'Tag too long').regex(/^[^<>\"'&]*$/, 'Tag contains invalid characters'))
    .max(10, 'Maximum 10 tags allowed')
    .optional(),
});

// Update pitch schema
export const updatePitchSchema = z.object({
  title: z.string().min(10, 'Title must be at least 10 characters').max(200, 'Title must be less than 200 characters').optional(),
  summary: z.string().min(50, 'Summary must be at least 50 characters').max(500, 'Summary must be less than 500 characters').optional(),
  problemStatement: z.string().min(50, 'Problem statement must be at least 50 characters').max(2000, 'Problem statement must be less than 2000 characters').optional(),
  solution: z.string().min(50, 'Solution must be at least 50 characters').max(2000, 'Solution must be less than 2000 characters').optional(),
  marketOpportunity: z.string().min(50, 'Market opportunity must be at least 50 characters').max(2000, 'Market opportunity must be less than 2000 characters').optional(),
  product: z.string().min(50, 'Product description must be at least 50 characters').max(2000, 'Product description must be less than 2000 characters').optional(),
  businessModel: z.string().min(50, 'Business model must be at least 50 characters').max(2000, 'Business model must be less than 2000 characters').optional(),
  goToMarket: z.string().min(50, 'Go-to-market strategy must be at least 50 characters').max(2000, 'Go-to-market strategy must be less than 2000 characters').optional(),
  competitiveLandscape: z.string().min(50, 'Competitive landscape must be at least 50 characters').max(2000, 'Competitive landscape must be less than 2000 characters').optional(),
  useOfFunds: z.string().min(50, 'Use of funds must be at least 50 characters').max(2000, 'Use of funds must be less than 2000 characters').optional(),
  fundingAmount: z.number().min(1000, 'Funding amount must be at least $1,000').max(100000000, 'Funding amount cannot exceed $100M').optional(),
  equityOffered: z.number().min(0.1, 'Equity offered must be at least 0.1%').max(50, 'Equity offered cannot exceed 50%').optional(),
  minimumInvestment: z.number().min(100, 'Minimum investment must be at least $100').max(1000000, 'Minimum investment cannot exceed $1M').optional(),
  pitchType: pitchTypeSchema.optional(),
  valuation: z.number().min(0, 'Valuation cannot be negative').optional(),
  preMoneyValuation: z.number().min(0, 'Pre-money valuation cannot be negative').optional(),
  financialProjections: z.object({
    year1Revenue: z.number().min(0, 'Year 1 revenue cannot be negative').optional(),
    year2Revenue: z.number().min(0, 'Year 2 revenue cannot be negative').optional(),
    year3Revenue: z.number().min(0, 'Year 3 revenue cannot be negative').optional(),
    year1Profit: z.number().optional(),
    year2Profit: z.number().optional(),
    year3Profit: z.number().optional(),
  }).optional(),
  milestones: z.array(z.object({
    title: z.string().min(1, 'Milestone title is required').max(200, 'Title must be less than 200 characters'),
    description: z.string().min(10, 'Description must be at least 10 characters').max(500, 'Description must be less than 500 characters'),
    targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
    fundingRequired: z.number().min(0, 'Funding required cannot be negative').optional(),
  })).max(10, 'Maximum 10 milestones allowed').optional(),
  tags: z.array(z.string().max(50, 'Tag must be less than 50 characters')).max(20, 'Maximum 20 tags allowed').optional(),
});

// Pitch status update schema
export const updatePitchStatusSchema = z.object({
  status: pitchStatusSchema,
  reason: z.string().max(500, 'Reason must be less than 500 characters').optional(),
  adminNotes: z.string().max(1000, 'Admin notes must be less than 1000 characters').optional(),
});

// Pitch list query schema
export const pitchListQuerySchema = z.object({
  search: z.string().max(100, 'Search term too long').optional(),
  status: pitchStatusSchema.optional(),
  pitchType: pitchTypeSchema.optional(),
  industry: z.string().optional(), // From startup industry
  stage: z.string().optional(), // From startup stage
  minAmount: z.number().min(0, 'Minimum amount must be positive').optional(),
  maxAmount: z.number().min(0, 'Maximum amount must be positive').optional(),
  minEquity: z.number().min(0, 'Minimum equity must be positive').optional(),
  maxEquity: z.number().min(0, 'Maximum equity must be positive').optional(),
  minValuation: z.number().min(0, 'Minimum valuation must be positive').optional(),
  maxValuation: z.number().min(0, 'Maximum valuation must be positive').optional(),
  tags: z.array(z.string()).optional(),
  createdAfter: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  createdBefore: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  page: z.number().min(1, 'Page must be positive').default(1),
  limit: z.number().min(1, 'Limit must be positive').max(100, 'Limit cannot exceed 100').default(20),
  sortBy: z.enum(['createdAt', 'title', 'fundingAmount', 'equityOffered', 'minimumInvestment', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Comment schema
export const pitchCommentSchema = z.object({
  content: z.string().min(1, 'Comment content is required').max(1000, 'Comment must be less than 1000 characters'),
  isPrivate: z.boolean().default(false),
});

// Pitch analytics date range schema
export const pitchAnalyticsQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
});

// Investment creation schema
export const investmentCreationSchema = z.object({
  pitch_id: pitchIdSchema,
  amount: currencyAmountSchema,
  equity_percentage: percentageSchema.optional(),
  payment_method: z.enum(['BANK_TRANSFER', 'CARD', 'CRYPTO', 'WIRE']),
  terms_accepted: z.boolean().refine(val => val === true, {
    message: 'You must accept the investment terms'
  }),
  risk_acknowledged: z.boolean().refine(val => val === true, {
    message: 'You must acknowledge the investment risks'
  }),
  syndicate_id: z.string().uuid().optional(),
}).refine(
  (data) => {
    // If syndicate investment, amount must meet minimum
    if (data.syndicate_id) {
      return data.amount >= 100
    }
    return true
  },
  {
    message: 'Syndicate investments must be at least $100',
    path: ['amount']
  }
);

// Pitch engagement schema
export const pitchEngagementSchema = z.object({
  pitch_id: pitchIdSchema,
  engagement_type: z.enum(['VIEW', 'LIKE', 'SHARE', 'COMMENT', 'FOLLOW']),
  metadata: z.record(z.any()).optional(),
});

// Pitch analytics schema
export const pitchAnalyticsSchema = z.object({
  pitch_id: pitchIdSchema,
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  metrics: z.array(z.enum(['views', 'investments', 'funding', 'engagement'])).optional(),
});

// Type exports
export type CreatePitchInput = z.infer<typeof createPitchSchema>;
export type UpdatePitchInput = z.infer<typeof updatePitchSchema>;
export type UpdatePitchStatusInput = z.infer<typeof updatePitchStatusSchema>;
export type PitchListQueryInput = z.infer<typeof pitchListQuerySchema>;
export type PitchCommentInput = z.infer<typeof pitchCommentSchema>;
export type PitchAnalyticsQueryInput = z.infer<typeof pitchAnalyticsQuerySchema>;
export type InvestmentCreationInput = z.infer<typeof investmentCreationSchema>;
export type PitchEngagementInput = z.infer<typeof pitchEngagementSchema>;
export type PitchAnalyticsInput = z.infer<typeof pitchAnalyticsSchema>;

// Export all schemas
export default {
  // Base schemas
  pitchId: pitchIdSchema,
  startupId: startupIdSchema,
  pitchStatus: pitchStatusSchema,
  pitchType: pitchTypeSchema,

  // Main schemas
  createPitch: createPitchSchema,
  updatePitch: updatePitchSchema,
  updatePitchStatus: updatePitchStatusSchema,
  pitchListQuery: pitchListQuerySchema,
  pitchComment: pitchCommentSchema,
  pitchAnalyticsQuery: pitchAnalyticsQuerySchema,
  investmentCreation: investmentCreationSchema,
  pitchEngagement: pitchEngagementSchema,
  pitchAnalytics: pitchAnalyticsSchema,
};