import { z } from 'zod';

/**
 * SAFE Type Enum
 */
export const SafeTypeSchema = z.enum(['POST_MONEY', 'PRE_MONEY']);

/**
 * Create SAFE Agreement Schema
 */
export const createSafeSchema = z.object({
  body: z.object({
    investmentId: z.string().cuid('Invalid investment ID format'),
    type: SafeTypeSchema,
    investmentAmount: z
      .number()
      .positive('Investment amount must be positive')
      .min(1000, 'Minimum investment amount is $1,000'),
    valuationCap: z
      .number()
      .positive('Valuation cap must be positive')
      .optional(),
    discountRate: z
      .number()
      .min(0, 'Discount rate cannot be negative')
      .max(100, 'Discount rate cannot exceed 100%')
      .optional(),
    proRataRight: z.boolean().optional().default(false),
    mfnProvision: z.boolean().optional().default(false),
    documentUrl: z.string().url('Invalid document URL').optional(),
  }).refine(
    (data) => data.valuationCap || data.discountRate,
    {
      message: 'Either valuation cap or discount rate must be provided',
      path: ['valuationCap'],
    }
  ),
});

/**
 * Update SAFE Agreement Schema
 */
export const updateSafeSchema = z.object({
  params: z.object({
    id: z.string().cuid('Invalid SAFE ID format'),
  }),
  body: z.object({
    valuationCap: z
      .number()
      .positive('Valuation cap must be positive')
      .optional(),
    discountRate: z
      .number()
      .min(0, 'Discount rate cannot be negative')
      .max(100, 'Discount rate cannot exceed 100%')
      .optional(),
    proRataRight: z.boolean().optional(),
    mfnProvision: z.boolean().optional(),
    documentUrl: z.string().url('Invalid document URL').optional(),
  }).partial(),
});

/**
 * Get SAFE by ID Schema
 */
export const getSafeByIdSchema = z.object({
  params: z.object({
    id: z.string().cuid('Invalid SAFE ID format'),
  }),
});

/**
 * Get SAFEs by Startup Schema
 */
export const getSafesByStartupSchema = z.object({
  params: z.object({
    startupId: z.string().cuid('Invalid startup ID format'),
  }),
});

/**
 * Get SAFEs by Investor Schema
 */
export const getSafesByInvestorSchema = z.object({
  params: z.object({
    investorId: z.string().cuid('Invalid investor ID format'),
  }),
});

/**
 * Convert SAFE Schema
 */
export const convertSafeSchema = z.object({
  params: z.object({
    id: z.string().cuid('Invalid SAFE ID format'),
  }),
  body: z.object({
    roundId: z.string().cuid('Invalid round ID format'),
    pricePerShare: z
      .number()
      .positive('Price per share must be positive'),
    roundValuation: z
      .number()
      .positive('Round valuation must be positive'),
  }),
});

/**
 * Calculate Conversion Schema
 */
export const calculateConversionSchema = z.object({
  params: z.object({
    id: z.string().cuid('Invalid SAFE ID format'),
  }),
  body: z.object({
    roundValuation: z
      .number()
      .positive('Round valuation must be positive'),
    pricePerShare: z
      .number()
      .positive('Price per share must be positive'),
  }),
});

/**
 * Dissolve SAFE Schema
 */
export const dissolveSafeSchema = z.object({
  params: z.object({
    id: z.string().cuid('Invalid SAFE ID format'),
  }),
  body: z.object({
    reason: z
      .string()
      .min(10, 'Reason must be at least 10 characters')
      .max(500, 'Reason cannot exceed 500 characters'),
  }),
});

/**
 * Check Conversion Triggers Schema
 */
export const checkConversionTriggersSchema = z.object({
  params: z.object({
    startupId: z.string().cuid('Invalid startup ID format'),
  }),
  query: z.object({
    roundAmount: z
      .string()
      .transform((val) => parseFloat(val))
      .pipe(z.number().positive('Round amount must be positive'))
      .optional(),
  }).optional(),
});

/**
 * Type exports
 */
export type CreateSafeInput = z.infer<typeof createSafeSchema>;
export type UpdateSafeInput = z.infer<typeof updateSafeSchema>;
export type GetSafeByIdInput = z.infer<typeof getSafeByIdSchema>;
export type GetSafesByStartupInput = z.infer<typeof getSafesByStartupSchema>;
export type GetSafesByInvestorInput = z.infer<typeof getSafesByInvestorSchema>;
export type ConvertSafeInput = z.infer<typeof convertSafeSchema>;
export type CalculateConversionInput = z.infer<typeof calculateConversionSchema>;
export type DissolveSafeInput = z.infer<typeof dissolveSafeSchema>;
export type CheckConversionTriggersInput = z.infer<typeof checkConversionTriggersSchema>;
