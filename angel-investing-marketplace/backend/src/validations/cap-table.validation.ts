import { z } from 'zod';

/**
 * Stakeholder Type Enum
 */
export const StakeholderTypeSchema = z.enum([
  'FOUNDER',
  'EMPLOYEE',
  'INVESTOR',
  'ADVISOR',
  'CONSULTANT',
]);

/**
 * Cap Table Event Type Enum
 */
export const CapTableEventTypeSchema = z.enum([
  'FUNDING',
  'CONVERSION',
  'OPTION_GRANT',
  'OPTION_EXERCISE',
  'TRANSFER',
  'REPURCHASE',
  'CANCELLATION',
]);

/**
 * Create Cap Table Schema
 */
export const createCapTableSchema = z.object({
  body: z.object({
    startupId: z.string().cuid('Invalid startup ID format'),
    asOfDate: z
      .string()
      .datetime('Invalid date format')
      .transform((val) => new Date(val))
      .optional()
      .default(new Date().toISOString()),
  }),
});

/**
 * Get Cap Table by ID Schema
 */
export const getCapTableByIdSchema = z.object({
  params: z.object({
    id: z.string().cuid('Invalid cap table ID format'),
  }),
});

/**
 * Get Latest Cap Table Schema
 */
export const getLatestCapTableSchema = z.object({
  params: z.object({
    startupId: z.string().cuid('Invalid startup ID format'),
  }),
});

/**
 * Get Cap Table History Schema
 */
export const getCapTableHistorySchema = z.object({
  params: z.object({
    startupId: z.string().cuid('Invalid startup ID format'),
  }),
  query: z.object({
    limit: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive('Limit must be a positive integer'))
      .optional(),
    offset: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().nonnegative('Offset cannot be negative'))
      .optional(),
  }).optional(),
});

/**
 * Add Stakeholder Schema
 */
export const addStakeholderSchema = z.object({
  params: z.object({
    id: z.string().cuid('Invalid cap table ID format'),
  }),
  body: z.object({
    stakeholderType: StakeholderTypeSchema,
    userId: z.string().cuid('Invalid user ID format').optional(),
    entityName: z
      .string()
      .min(1, 'Entity name is required')
      .max(255, 'Entity name cannot exceed 255 characters'),
    commonShares: z
      .number()
      .int()
      .nonnegative('Common shares cannot be negative')
      .optional()
      .default(0),
    preferredShares: z
      .record(z.string(), z.number().int().nonnegative())
      .optional()
      .default({}),
    options: z
      .number()
      .int()
      .nonnegative('Options cannot be negative')
      .optional()
      .default(0),
    warrants: z
      .number()
      .int()
      .nonnegative('Warrants cannot be negative')
      .optional()
      .default(0),
    boardSeat: z.boolean().optional().default(false),
    observer: z.boolean().optional().default(false),
    proRataRights: z.boolean().optional().default(false),
  }).refine(
    (data) =>
      data.commonShares > 0 ||
      Object.keys(data.preferredShares || {}).length > 0 ||
      data.options > 0 ||
      data.warrants > 0,
    {
      message: 'Stakeholder must have at least one type of security',
      path: ['commonShares'],
    }
  ),
});

/**
 * Calculate Dilution Schema
 */
export const calculateDilutionSchema = z.object({
  params: z.object({
    startupId: z.string().cuid('Invalid startup ID format'),
  }),
  body: z.object({
    newInvestmentAmount: z
      .number()
      .positive('Investment amount must be positive'),
    preMoneyValuation: z
      .number()
      .positive('Pre-money valuation must be positive'),
  }),
});

/**
 * Calculate Waterfall Schema
 */
export const calculateWaterfallSchema = z.object({
  params: z.object({
    startupId: z.string().cuid('Invalid startup ID format'),
  }),
  body: z.object({
    exitProceeds: z
      .number()
      .positive('Exit proceeds must be positive'),
    exitType: z
      .enum(['ACQUISITION', 'IPO', 'MERGER', 'LIQUIDATION'])
      .optional(),
  }),
});

/**
 * Export to Carta Format Schema
 */
export const exportToCartaFormatSchema = z.object({
  params: z.object({
    id: z.string().cuid('Invalid cap table ID format'),
  }),
  query: z.object({
    format: z
      .enum(['json', 'csv'])
      .optional()
      .default('json'),
  }).optional(),
});

/**
 * Record Event Schema
 */
export const recordEventSchema = z.object({
  params: z.object({
    id: z.string().cuid('Invalid cap table ID format'),
  }),
  body: z.object({
    eventType: CapTableEventTypeSchema,
    description: z
      .string()
      .min(1, 'Description is required')
      .max(1000, 'Description cannot exceed 1000 characters'),
    sharesBefore: z.record(z.string(), z.any()),
    sharesAfter: z.record(z.string(), z.any()),
    roundId: z.string().cuid('Invalid round ID format').optional(),
    transactionId: z.string().cuid('Invalid transaction ID format').optional(),
  }),
});

/**
 * Share Class Schema (for nested validation)
 */
export const shareClassSchema = z.object({
  name: z.string().min(1, 'Share class name is required'),
  type: z.enum(['COMMON', 'PREFERRED', 'OPTION', 'WARRANT']),
  sharesAuthorized: z.number().int().positive('Shares authorized must be positive'),
  sharesIssued: z.number().int().nonnegative('Shares issued cannot be negative'),
  sharesOutstanding: z.number().int().nonnegative('Shares outstanding cannot be negative'),
  pricePerShare: z.number().nonnegative('Price per share cannot be negative').optional(),
  liquidationPreference: z.number().nonnegative('Liquidation preference cannot be negative'),
  liquidationMultiple: z.number().positive('Liquidation multiple must be positive').default(1),
  participating: z.boolean().default(false),
  seniorityRank: z.number().int().nonnegative('Seniority rank cannot be negative'),
  votesPerShare: z.number().nonnegative('Votes per share cannot be negative').default(1),
});

/**
 * Update Stakeholder Schema
 */
export const updateStakeholderSchema = z.object({
  params: z.object({
    id: z.string().cuid('Invalid cap table ID format'),
    stakeholderId: z.string().cuid('Invalid stakeholder ID format'),
  }),
  body: z.object({
    commonShares: z
      .number()
      .int()
      .nonnegative('Common shares cannot be negative')
      .optional(),
    preferredShares: z
      .record(z.string(), z.number().int().nonnegative())
      .optional(),
    options: z
      .number()
      .int()
      .nonnegative('Options cannot be negative')
      .optional(),
    warrants: z
      .number()
      .int()
      .nonnegative('Warrants cannot be negative')
      .optional(),
    boardSeat: z.boolean().optional(),
    observer: z.boolean().optional(),
    proRataRights: z.boolean().optional(),
  }).partial(),
});

/**
 * Type exports
 */
export type CreateCapTableInput = z.infer<typeof createCapTableSchema>;
export type GetCapTableByIdInput = z.infer<typeof getCapTableByIdSchema>;
export type GetLatestCapTableInput = z.infer<typeof getLatestCapTableSchema>;
export type GetCapTableHistoryInput = z.infer<typeof getCapTableHistorySchema>;
export type AddStakeholderInput = z.infer<typeof addStakeholderSchema>;
export type CalculateDilutionInput = z.infer<typeof calculateDilutionSchema>;
export type CalculateWaterfallInput = z.infer<typeof calculateWaterfallSchema>;
export type ExportToCartaFormatInput = z.infer<typeof exportToCartaFormatSchema>;
export type RecordEventInput = z.infer<typeof recordEventSchema>;
export type ShareClassInput = z.infer<typeof shareClassSchema>;
export type UpdateStakeholderInput = z.infer<typeof updateStakeholderSchema>;
