import { z } from 'zod';

// Base schemas
export const investmentIdSchema = z.string().min(1, 'Investment ID is required');
export const pitchIdSchema = z.string().min(1, 'Pitch ID is required');

// Investment status enum
export const investmentStatusSchema = z.enum([
  'PENDING',
  'PROCESSING',
  'ESCROW',
  'COMPLETED',
  'CANCELLED',
  'FAILED',
  'REFUNDED'
]);

// Investment type enum
export const investmentTypeSchema = z.enum([
  'DIRECT',
  'SYNDICATE'
]);

// Payment method enum
export const paymentMethodSchema = z.enum([
  'BANK_TRANSFER',
  'WIRE_TRANSFER',
  'CRYPTOCURRENCY',
  'CREDIT_CARD',
  'DEBIT_CARD'
]);

// Currency enum
export const currencySchema = z.enum([
  'USD',
  'EUR',
  'GBP',
  'BTC',
  'ETH'
]);

// Create investment schema
export const createInvestmentSchema = z.object({
  pitchId: pitchIdSchema,
  amount: z.number().min(1, 'Investment amount must be at least $1').max(10000000, 'Investment amount cannot exceed $10M'),
  equityPercentage: z.number().min(0.001, 'Equity percentage must be at least 0.001%').max(100, 'Equity percentage cannot exceed 100%'),
  investmentType: investmentTypeSchema.default('DIRECT'),
  paymentMethod: paymentMethodSchema,
  currency: currencySchema.default('USD'),
  terms: z.object({
    vestingPeriod: z.number().min(0, 'Vesting period cannot be negative').max(120, 'Vesting period cannot exceed 120 months').optional(),
    cliffPeriod: z.number().min(0, 'Cliff period cannot be negative').max(60, 'Cliff period cannot exceed 60 months').optional(),
    votingRights: z.boolean().default(false),
    informationRights: z.boolean().default(true),
    proRataRights: z.boolean().default(false),
    dragAlongRights: z.boolean().default(false),
    tagAlongRights: z.boolean().default(false),
    redemptionRights: z.boolean().default(false),
  }).optional(),
  syndicateId: z.string().optional(), // For syndicate investments
  additionalNotes: z.string().max(1000, 'Additional notes must be less than 1000 characters').optional(),
});

// Update investment schema
export const updateInvestmentSchema = z.object({
  amount: z.number().min(1, 'Investment amount must be at least $1').max(10000000, 'Investment amount cannot exceed $10M').optional(),
  equityPercentage: z.number().min(0.001, 'Equity percentage must be at least 0.001%').max(100, 'Equity percentage cannot exceed 100%').optional(),
  paymentMethod: paymentMethodSchema.optional(),
  currency: currencySchema.optional(),
  terms: z.object({
    vestingPeriod: z.number().min(0, 'Vesting period cannot be negative').max(120, 'Vesting period cannot exceed 120 months').optional(),
    cliffPeriod: z.number().min(0, 'Cliff period cannot be negative').max(60, 'Cliff period cannot exceed 60 months').optional(),
    votingRights: z.boolean().optional(),
    informationRights: z.boolean().optional(),
    proRataRights: z.boolean().optional(),
    dragAlongRights: z.boolean().optional(),
    tagAlongRights: z.boolean().optional(),
    redemptionRights: z.boolean().optional(),
  }).optional(),
  additionalNotes: z.string().max(1000, 'Additional notes must be less than 1000 characters').optional(),
});

// Investment status update schema
export const updateInvestmentStatusSchema = z.object({
  status: investmentStatusSchema,
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional(),
  adminNotes: z.string().max(2000, 'Admin notes must be less than 2000 characters').optional(),
  transactionReference: z.string().max(200, 'Transaction reference must be less than 200 characters').optional(),
});

// Cancel investment schema
export const cancelInvestmentSchema = z.object({
  reason: z.enum([
    'CHANGED_MIND',
    'FOUND_BETTER_OPPORTUNITY',
    'DUE_DILIGENCE_CONCERNS',
    'PERSONAL_FINANCIAL_ISSUES',
    'STARTUP_ISSUES',
    'OTHER'
  ]),
  details: z.string().max(1000, 'Details must be less than 1000 characters').optional(),
});

// Investment list query schema
export const investmentListQuerySchema = z.object({
  status: investmentStatusSchema.optional(),
  investmentType: investmentTypeSchema.optional(),
  pitchId: pitchIdSchema.optional(),
  startupId: z.string().optional(),
  minAmount: z.number().min(0, 'Minimum amount must be positive').optional(),
  maxAmount: z.number().min(0, 'Maximum amount must be positive').optional(),
  currency: currencySchema.optional(),
  createdAfter: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  createdBefore: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  page: z.number().min(1, 'Page must be positive').default(1),
  limit: z.number().min(1, 'Limit must be positive').max(100, 'Limit cannot exceed 100').default(20),
  sortBy: z.enum(['createdAt', 'amount', 'equityPercentage', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Investment document schema
export const investmentDocumentSchema = z.object({
  documentType: z.enum([
    'INVESTMENT_AGREEMENT',
    'SHARE_CERTIFICATE',
    'SUBSCRIPTION_AGREEMENT',
    'TERM_SHEET',
    'DUE_DILIGENCE_REPORT',
    'VALUATION_REPORT',
    'LEGAL_OPINION',
    'BANK_STATEMENT',
    'IDENTIFICATION',
    'OTHER'
  ]),
  fileName: z.string().min(1, 'File name is required').max(200, 'File name must be less than 200 characters'),
  fileUrl: z.string().url('Invalid file URL'),
  fileSize: z.number().min(1, 'File size must be positive').max(104857600, 'File size cannot exceed 100MB'), // 100MB limit
  mimeType: z.string().min(1, 'MIME type is required'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  isPublic: z.boolean().default(false),
});

// Escrow information schema
export const escrowInfoSchema = z.object({
  escrowProvider: z.enum(['ESCROW_COM', 'PAYADMIN', 'CUSTOM']),
  escrowAccount: z.string().min(1, 'Escrow account is required'),
  routingNumber: z.string().min(1, 'Routing number is required'),
  accountNumber: z.string().min(1, 'Account number is required'),
  reference: z.string().min(1, 'Reference is required'),
  instructions: z.string().max(2000, 'Instructions must be less than 2000 characters').optional(),
});

// Payment confirmation schema
export const paymentConfirmationSchema = z.object({
  transactionReference: z.string().min(1, 'Transaction reference is required'),
  paymentProof: z.string().url('Invalid payment proof URL').optional(),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional(),
});

// Type exports
export type CreateInvestmentInput = z.infer<typeof createInvestmentSchema>;
export type UpdateInvestmentInput = z.infer<typeof updateInvestmentSchema>;
export type UpdateInvestmentStatusInput = z.infer<typeof updateInvestmentStatusSchema>;
export type CancelInvestmentInput = z.infer<typeof cancelInvestmentSchema>;
export type InvestmentListQueryInput = z.infer<typeof investmentListQuerySchema>;
export type InvestmentDocumentInput = z.infer<typeof investmentDocumentSchema>;
export type EscrowInfoInput = z.infer<typeof escrowInfoSchema>;
export type PaymentConfirmationInput = z.infer<typeof paymentConfirmationSchema>;

export default {
  createInvestment: createInvestmentSchema,
  updateInvestment: updateInvestmentSchema,
  updateInvestmentStatus: updateInvestmentStatusSchema,
  cancelInvestment: cancelInvestmentSchema,
  investmentListQuery: investmentListQuerySchema,
  investmentDocument: investmentDocumentSchema,
  escrowInfo: escrowInfoSchema,
  paymentConfirmation: paymentConfirmationSchema,
};