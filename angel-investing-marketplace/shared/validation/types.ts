import { z } from 'zod';

// Base validation schemas shared between frontend and backend
export const uuidSchema = z.string().uuid('Invalid UUID format');

export const emailSchema = z
  .string()
  .email('Invalid email format')
  .min(5, 'Email must be at least 5 characters')
  .max(255, 'Email cannot exceed 255 characters')
  .toLowerCase()
  .trim();

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .max(128, 'Password cannot exceed 128 characters')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
  .refine(password => !/\s/.test(password), 'Password cannot contain spaces');

export const nameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters long')
  .max(100, 'Name must be less than 100 characters')
  .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes')
  .trim()
  .transform(val => val.replace(/\s+/g, ' ')); // Normalize multiple spaces

export const phoneSchema = z
  .string()
  .regex(/^[\+]?[1-9][\d]{0,15}$/, 'Invalid phone number format')
  .optional();

export const urlSchema = z
  .string()
  .url('Invalid URL format')
  .optional();

export const currencyAmountSchema = z
  .number()
  .positive('Amount must be positive')
  .multipleOf(0.01, 'Amount must be in cents');

export const percentageSchema = z
  .number()
  .min(0, 'Percentage cannot be negative')
  .max(100, 'Percentage cannot exceed 100');

// Date schemas
export const dateSchema = z.date();
export const futureDateSchema = z.date().refine(
  (date) => date > new Date(),
  'Date must be in the future'
);

// Pagination schema
export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sort_by: z.string().optional(),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

// Date range schema
export const dateRangeSchema = z.object({
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional()
}).refine(
  (data) => {
    if (data.start_date && data.end_date) {
      return new Date(data.start_date) <= new Date(data.end_date)
    }
    return true
  },
  {
    message: 'Start date must be before end date',
    path: ['end_date']
  }
);

// Address schema
export const addressSchema = z.object({
  street: z.string().min(1, 'Street address is required').max(255, 'Street address too long'),
  city: z.string().min(1, 'City is required').max(100, 'City name too long'),
  state: z.string().min(2, 'State is required').max(100, 'State name too long'),
  country: z.string().length(2, 'Country code must be 2 characters'),
  postal_code: z.string().min(3, 'Postal code too short').max(20, 'Postal code too long'),
}).optional();

// File schema
export const fileSchema = z.object({
  name: z.string().min(1, 'File name is required').max(255, 'File name too long'),
  size: z.number().positive('File size must be positive'),
  type: z.string().min(1, 'File type is required'),
  lastModified: z.number().optional(),
});

// User role enum
export const userRoleSchema = z.enum(['INVESTOR', 'FOUNDER', 'SYNDICATE_LEAD', 'ADMIN'], {
  errorMap: () => ({ message: 'Invalid user role specified' })
});

// Startup stage enum
export const startupStageSchema = z.enum([
  'IDEA',
  'PROTOTYPE',
  'MVP',
  'BETA',
  'LAUNCHED',
  'GROWTH',
  'SCALE'
], {
  errorMap: () => ({ message: 'Please select a valid startup stage' })
});

// Industry enum
export const industrySchema = z.enum([
  'SAAS',
  'FINTECH',
  'HEALTHCARE',
  'EDUCATION',
  'E_COMMERCE',
  'AI_ML',
  'BLOCKCHAIN',
  'CLEANTECH',
  'BIOTECH',
  'HARDWARE',
  'MOBILE',
  'ENTERPRISE',
  'CONSUMER',
  'MARKETPLACE',
  'OTHER'
], {
  errorMap: () => ({ message: 'Please select a valid industry' })
});

// Business model enum
export const businessModelSchema = z.enum([
  'SUBSCRIPTION',
  'MARKETPLACE',
  'E_COMMERCE',
  'ADVERTISING',
  'LICENSING',
  'HARDWARE',
  'SERVICES',
  'OTHER'
], {
  errorMap: () => ({ message: 'Please select a valid business model' })
});

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

// Investment status enum
export const investmentStatusSchema = z.enum([
  'PENDING',
  'ESCROW',
  'DUE_DILIGENCE',
  'LEGAL_REVIEW',
  'COMPLETED',
  'CANCELLED'
]);

// Payment method enum
export const paymentMethodSchema = z.enum([
  'BANK_TRANSFER',
  'CARD',
  'CRYPTO',
  'WIRE'
]);

// Document type enum
export const documentTypeSchema = z.enum([
  'PITCH_DECK',
  'BUSINESS_PLAN',
  'FINANCIAL_STATEMENT',
  'LEGAL_DOCUMENT',
  'KYC_DOCUMENT',
  'OTHER'
]);

// Notification type enum
export const notificationTypeSchema = z.enum([
  'INVESTMENT_UPDATE',
  'MESSAGE',
  'PITCH_UPDATE',
  'SYSTEM',
  'PAYMENT'
]);

// Type exports for all schemas
export type UUIDInput = z.infer<typeof uuidSchema>;
export type EmailInput = z.infer<typeof emailSchema>;
export type PasswordInput = z.infer<typeof passwordSchema>;
export type NameInput = z.infer<typeof nameSchema>;
export type PhoneInput = z.infer<typeof phoneSchema>;
export type URLInput = z.infer<typeof urlSchema>;
export type CurrencyAmountInput = z.infer<typeof currencyAmountSchema>;
export type PercentageInput = z.infer<typeof percentageSchema>;
export type DateInput = z.infer<typeof dateSchema>;
export type FutureDateInput = z.infer<typeof futureDateSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type DateRangeInput = z.infer<typeof dateRangeSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
export type FileInput = z.infer<typeof fileSchema>;
export type UserRoleInput = z.infer<typeof userRoleSchema>;
export type StartupStageInput = z.infer<typeof startupStageSchema>;
export type IndustryInput = z.infer<typeof industrySchema>;
export type BusinessModelInput = z.infer<typeof businessModelSchema>;
export type PitchStatusInput = z.infer<typeof pitchStatusSchema>;
export type PitchTypeInput = z.infer<typeof pitchTypeSchema>;
export type InvestmentStatusInput = z.infer<typeof investmentStatusSchema>;
export type PaymentMethodInput = z.infer<typeof paymentMethodSchema>;
export type DocumentTypeInput = z.infer<typeof documentTypeSchema>;
export type NotificationTypeInput = z.infer<typeof notificationTypeSchema>;

// Export all schemas as a collection
export const baseSchemas = {
  uuid: uuidSchema,
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
  phone: phoneSchema,
  url: urlSchema,
  currencyAmount: currencyAmountSchema,
  percentage: percentageSchema,
  date: dateSchema,
  futureDate: futureDateSchema,
  pagination: paginationSchema,
  dateRange: dateRangeSchema,
  address: addressSchema,
  file: fileSchema,
};

export const enumSchemas = {
  userRole: userRoleSchema,
  startupStage: startupStageSchema,
  industry: industrySchema,
  businessModel: businessModelSchema,
  pitchStatus: pitchStatusSchema,
  pitchType: pitchTypeSchema,
  investmentStatus: investmentStatusSchema,
  paymentMethod: paymentMethodSchema,
  documentType: documentTypeSchema,
  notificationType: notificationTypeSchema,
};

export default {
  ...baseSchemas,
  ...enumSchemas,
};