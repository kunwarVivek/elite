import { z } from 'zod';

/**
 * Compounding Type Enum
 */
export const CompoundingTypeSchema = z.enum(['SIMPLE', 'COMPOUND']);

/**
 * Create Convertible Note Schema
 */
export const createNoteSchema = z.object({
  body: z.object({
    investmentId: z.string().cuid('Invalid investment ID format'),
    principalAmount: z
      .number()
      .positive('Principal amount must be positive')
      .min(1000, 'Minimum principal amount is $1,000'),
    interestRate: z
      .number()
      .min(0, 'Interest rate cannot be negative')
      .max(100, 'Interest rate cannot exceed 100%'),
    maturityDate: z
      .string()
      .datetime('Invalid maturity date format')
      .transform((val) => new Date(val))
      .refine((date) => date > new Date(), {
        message: 'Maturity date must be in the future',
      }),
    discountRate: z
      .number()
      .min(0, 'Discount rate cannot be negative')
      .max(100, 'Discount rate cannot exceed 100%')
      .optional(),
    valuationCap: z
      .number()
      .positive('Valuation cap must be positive')
      .optional(),
    autoConversion: z.boolean().optional().default(true),
    qualifiedFinancingThreshold: z
      .number()
      .positive('Qualified financing threshold must be positive')
      .optional(),
    securityType: z
      .string()
      .min(1, 'Security type is required')
      .optional()
      .default('Preferred'),
    compounding: CompoundingTypeSchema.optional().default('SIMPLE'),
    documentUrl: z.string().url('Invalid document URL').optional(),
  }),
});

/**
 * Get Note by ID Schema
 */
export const getNoteByIdSchema = z.object({
  params: z.object({
    id: z.string().cuid('Invalid note ID format'),
  }),
});

/**
 * Get Notes by Startup Schema
 */
export const getNotesByStartupSchema = z.object({
  params: z.object({
    startupId: z.string().cuid('Invalid startup ID format'),
  }),
});

/**
 * Get Notes by Investor Schema
 */
export const getNotesByInvestorSchema = z.object({
  params: z.object({
    investorId: z.string().cuid('Invalid investor ID format'),
  }),
});

/**
 * Accrue Interest Schema
 */
export const accrueInterestSchema = z.object({
  params: z.object({
    id: z.string().cuid('Invalid note ID format'),
  }),
});

/**
 * Calculate Interest Schema
 */
export const calculateInterestSchema = z.object({
  params: z.object({
    id: z.string().cuid('Invalid note ID format'),
  }),
});

/**
 * Convert Note Schema
 */
export const convertNoteSchema = z.object({
  params: z.object({
    id: z.string().cuid('Invalid note ID format'),
  }),
  body: z.object({
    pricePerShare: z
      .number()
      .positive('Price per share must be positive'),
    roundValuation: z
      .number()
      .positive('Round valuation must be positive')
      .optional(),
  }),
});

/**
 * Repay Note Schema
 */
export const repayNoteSchema = z.object({
  params: z.object({
    id: z.string().cuid('Invalid note ID format'),
  }),
  body: z.object({
    repaymentAmount: z
      .number()
      .positive('Repayment amount must be positive'),
  }),
});

/**
 * Calculate Conversion Schema
 */
export const calculateConversionSchema = z.object({
  params: z.object({
    id: z.string().cuid('Invalid note ID format'),
  }),
  body: z.object({
    pricePerShare: z
      .number()
      .positive('Price per share must be positive'),
  }),
});

/**
 * Check Qualified Financing Schema
 */
export const checkQualifiedFinancingSchema = z.object({
  params: z.object({
    id: z.string().cuid('Invalid note ID format'),
  }),
  body: z.object({
    roundAmount: z
      .number()
      .positive('Round amount must be positive'),
  }),
});

/**
 * Get Maturing Notes Schema
 */
export const getMaturingNotesSchema = z.object({
  query: z.object({
    days: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive('Days must be a positive integer'))
      .optional()
      .default('30'),
  }).optional(),
});

/**
 * Type exports
 */
export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type GetNoteByIdInput = z.infer<typeof getNoteByIdSchema>;
export type GetNotesByStartupInput = z.infer<typeof getNotesByStartupSchema>;
export type GetNotesByInvestorInput = z.infer<typeof getNotesByInvestorSchema>;
export type AccrueInterestInput = z.infer<typeof accrueInterestSchema>;
export type CalculateInterestInput = z.infer<typeof calculateInterestSchema>;
export type ConvertNoteInput = z.infer<typeof convertNoteSchema>;
export type RepayNoteInput = z.infer<typeof repayNoteSchema>;
export type CalculateConversionInput = z.infer<typeof calculateConversionSchema>;
export type CheckQualifiedFinancingInput = z.infer<typeof checkQualifiedFinancingSchema>;
export type GetMaturingNotesInput = z.infer<typeof getMaturingNotesSchema>;
