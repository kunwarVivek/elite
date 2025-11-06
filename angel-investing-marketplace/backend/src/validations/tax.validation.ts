import { z } from 'zod';

/**
 * Tax Validation Schemas
 */

/**
 * Tax year validation
 */
const taxYearSchema = z
  .number()
  .int()
  .min(2020, 'Tax year must be 2020 or later')
  .max(new Date().getFullYear(), 'Tax year cannot be in the future');

/**
 * Capital gains calculation schema
 */
export const calculateCapitalGainsSchema = z.object({
  saleProceeds: z
    .number()
    .positive('Sale proceeds must be positive')
    .max(1000000000, 'Sale proceeds exceed maximum allowed'),
  saleDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .refine(
      (date) => {
        const saleDate = new Date(date);
        const today = new Date();
        return saleDate <= today;
      },
      {
        message: 'Sale date cannot be in the future',
      }
    ),
});

/**
 * Tax year parameter validation
 */
export const taxYearParamSchema = z.object({
  taxYear: z.string().regex(/^\d{4}$/, 'Tax year must be a 4-digit year').transform((val) => {
    const year = parseInt(val, 10);
    if (year < 2020 || year > new Date().getFullYear()) {
      throw new Error('Invalid tax year');
    }
    return year;
  }),
});

/**
 * Investment ID parameter validation
 */
export const investmentIdParamSchema = z.object({
  investmentId: z
    .string()
    .uuid('Investment ID must be a valid UUID')
    .min(1, 'Investment ID is required'),
});

/**
 * Syndicate ID parameter validation
 */
export const syndicateIdParamSchema = z.object({
  syndicateId: z
    .string()
    .uuid('Syndicate ID must be a valid UUID')
    .min(1, 'Syndicate ID is required'),
});

/**
 * Tax document generation request schema
 */
export const generateTaxDocumentSchema = z.object({
  taxYear: taxYearSchema,
  documentTypes: z
    .array(z.enum(['K1', '1099_DIV', '1099_B', 'FORM_8949', 'TAX_SUMMARY']))
    .optional(),
  includeAllSyndicates: z.boolean().optional().default(true),
  syndicateIds: z.array(z.string().uuid()).optional(),
});

/**
 * Bulk tax document generation schema (Admin)
 */
export const bulkGenerateTaxDocumentsSchema = z.object({
  taxYear: taxYearSchema,
  userIds: z
    .array(z.string().uuid())
    .min(1, 'At least one user ID is required')
    .max(1000, 'Cannot generate documents for more than 1000 users at once'),
  documentTypes: z
    .array(z.enum(['K1', '1099_DIV', '1099_B', 'FORM_8949', 'TAX_SUMMARY']))
    .optional(),
  sendEmail: z.boolean().optional().default(true),
});

/**
 * Tax notification preferences schema
 */
export const taxNotificationPreferencesSchema = z.object({
  emailNotifications: z.boolean().optional().default(true),
  quarterlyReminders: z.boolean().optional().default(true),
  yearEndNotifications: z.boolean().optional().default(true),
  documentReadyAlerts: z.boolean().optional().default(true),
});

/**
 * Cost basis method selection schema
 */
export const costBasisMethodSchema = z.object({
  method: z.enum(['FIFO', 'LIFO', 'SPECIFIC_ID', 'AVERAGE_COST'], {
    required_error: 'Cost basis method is required',
  }),
});

/**
 * Tax document request schema (for manual generation)
 */
export const requestTaxDocumentSchema = z.object({
  taxYear: taxYearSchema,
  documentType: z.enum(['K1', '1099_DIV', '1099_B', 'FORM_8949', 'TAX_SUMMARY'], {
    required_error: 'Document type is required',
  }),
  syndicateId: z.string().uuid().optional(),
  deliveryMethod: z.enum(['EMAIL', 'DOWNLOAD']).optional().default('DOWNLOAD'),
});

/**
 * Tax estimate request schema
 */
export const taxEstimateSchema = z.object({
  taxYear: taxYearSchema,
  filingStatus: z
    .enum(['SINGLE', 'MARRIED_FILING_JOINTLY', 'MARRIED_FILING_SEPARATELY', 'HEAD_OF_HOUSEHOLD'])
    .optional(),
  estimatedOtherIncome: z.number().nonnegative().optional(),
  estimatedDeductions: z.number().nonnegative().optional(),
});

/**
 * Validation helper functions
 */

/**
 * Validate date is in the past
 */
export const validatePastDate = (date: Date): boolean => {
  return date <= new Date();
};

/**
 * Validate tax year is complete (not current year before April 15)
 */
export const validateTaxYearComplete = (taxYear: number): boolean => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();

  // If tax year is in the past, it's complete
  if (taxYear < currentYear) {
    return true;
  }

  // If tax year is current year, check if we're past April 15
  if (taxYear === currentYear) {
    const taxDeadline = new Date(currentYear, 3, 15); // April 15
    return currentDate > taxDeadline;
  }

  // Tax year is in the future
  return false;
};

/**
 * Validate holding period for capital gains classification
 */
export const validateHoldingPeriod = (
  acquisitionDate: Date,
  saleDate: Date
): 'SHORT_TERM' | 'LONG_TERM' => {
  const holdingPeriodMs = saleDate.getTime() - acquisitionDate.getTime();
  const holdingPeriodDays = Math.floor(holdingPeriodMs / (1000 * 60 * 60 * 24));

  return holdingPeriodDays > 365 ? 'LONG_TERM' : 'SHORT_TERM';
};
