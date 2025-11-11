import { z } from 'zod';

/**
 * Round Type Enum
 */
export const RoundTypeSchema = z.enum([
  'PRE_SEED',
  'SEED',
  'SERIES_A',
  'SERIES_B',
  'SERIES_C',
  'SERIES_D',
  'BRIDGE',
]);

/**
 * Round Status Enum
 */
export const RoundStatusSchema = z.enum([
  'PLANNING',
  'OPEN',
  'ACTIVE',
  'CLOSED',
  'CANCELLED',
]);

/**
 * Create Equity Round Schema
 */
export const createEquityRoundSchema = z.object({
  body: z.object({
    startupId: z.string().cuid('Invalid startup ID format'),
    roundType: RoundTypeSchema,
    leadInvestorId: z.string().cuid('Invalid investor ID format').optional(),
    targetAmount: z
      .number()
      .positive('Target amount must be positive')
      .min(10000, 'Minimum target amount is $10,000'),
    minimumInvestment: z
      .number()
      .positive('Minimum investment must be positive')
      .optional(),
    maximumInvestment: z
      .number()
      .positive('Maximum investment must be positive')
      .optional(),
    pricePerShare: z
      .number()
      .positive('Price per share must be positive')
      .optional(),
    preMoneyValuation: z
      .number()
      .positive('Pre-money valuation must be positive')
      .optional(),
    postMoneyValuation: z
      .number()
      .positive('Post-money valuation must be positive')
      .optional(),
    shareClassId: z.string().cuid('Invalid share class ID format').optional(),
    closingDate: z
      .string()
      .datetime('Invalid closing date format')
      .transform((val) => new Date(val))
      .optional(),
    terms: z.record(z.string(), z.any()).optional(),
    documents: z.array(z.string().url('Invalid document URL')).optional(),
  }).refine(
    (data) => {
      if (data.minimumInvestment && data.maximumInvestment) {
        return data.maximumInvestment >= data.minimumInvestment;
      }
      return true;
    },
    {
      message: 'Maximum investment must be greater than or equal to minimum investment',
      path: ['maximumInvestment'],
    }
  ).refine(
    (data) => {
      if (data.preMoneyValuation && data.postMoneyValuation) {
        return data.postMoneyValuation > data.preMoneyValuation;
      }
      return true;
    },
    {
      message: 'Post-money valuation must be greater than pre-money valuation',
      path: ['postMoneyValuation'],
    }
  ),
});

/**
 * Update Equity Round Schema
 */
export const updateEquityRoundSchema = z.object({
  params: z.object({
    id: z.string().cuid('Invalid equity round ID format'),
  }),
  body: z.object({
    roundType: RoundTypeSchema.optional(),
    targetAmount: z
      .number()
      .positive('Target amount must be positive')
      .optional(),
    minimumInvestment: z
      .number()
      .positive('Minimum investment must be positive')
      .optional(),
    maximumInvestment: z
      .number()
      .positive('Maximum investment must be positive')
      .optional(),
    pricePerShare: z
      .number()
      .positive('Price per share must be positive')
      .optional(),
    preMoneyValuation: z
      .number()
      .positive('Pre-money valuation must be positive')
      .optional(),
    postMoneyValuation: z
      .number()
      .positive('Post-money valuation must be positive')
      .optional(),
    totalRaised: z
      .number()
      .nonnegative('Total raised cannot be negative')
      .optional(),
    status: RoundStatusSchema.optional(),
    closingDate: z
      .string()
      .datetime('Invalid closing date format')
      .transform((val) => new Date(val))
      .optional(),
    terms: z.record(z.string(), z.any()).optional(),
  }).partial(),
});

/**
 * Get Equity Round by ID Schema
 */
export const getEquityRoundByIdSchema = z.object({
  params: z.object({
    id: z.string().cuid('Invalid equity round ID format'),
  }),
});

/**
 * Get Equity Rounds by Startup Schema
 */
export const getEquityRoundsByStartupSchema = z.object({
  params: z.object({
    startupId: z.string().cuid('Invalid startup ID format'),
  }),
});

/**
 * Close Equity Round Schema
 */
export const closeEquityRoundSchema = z.object({
  params: z.object({
    id: z.string().cuid('Invalid equity round ID format'),
  }),
  body: z.object({
    finalTerms: z.record(z.string(), z.any()).optional(),
  }).optional(),
});

/**
 * Get Round Metrics Schema
 */
export const getRoundMetricsSchema = z.object({
  params: z.object({
    id: z.string().cuid('Invalid equity round ID format'),
  }),
});

/**
 * Record Investment Schema
 */
export const recordInvestmentSchema = z.object({
  params: z.object({
    id: z.string().cuid('Invalid equity round ID format'),
  }),
  body: z.object({
    investmentId: z.string().cuid('Invalid investment ID format'),
    amount: z
      .number()
      .positive('Investment amount must be positive'),
  }),
});

/**
 * Type exports
 */
export type CreateEquityRoundInput = z.infer<typeof createEquityRoundSchema>;
export type UpdateEquityRoundInput = z.infer<typeof updateEquityRoundSchema>;
export type GetEquityRoundByIdInput = z.infer<typeof getEquityRoundByIdSchema>;
export type GetEquityRoundsByStartupInput = z.infer<typeof getEquityRoundsByStartupSchema>;
export type CloseEquityRoundInput = z.infer<typeof closeEquityRoundSchema>;
export type GetRoundMetricsInput = z.infer<typeof getRoundMetricsSchema>;
export type RecordInvestmentInput = z.infer<typeof recordInvestmentSchema>;
