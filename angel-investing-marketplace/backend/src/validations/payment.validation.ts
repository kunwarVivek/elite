import { z } from 'zod';

// Payment method enum (updated to match PaymentConfig)
export const paymentMethodSchema = z.enum([
  'CARD',
  'BANK_TRANSFER',
  'DIGITAL_WALLET',
  'WIRE_TRANSFER',
  'CRYPTOCURRENCY'
]);

// Currency enum (updated to match PaymentConfig)
export const currencySchema = z.enum([
  'USD',
  'EUR',
  'GBP',
  'CAD',
  'AUD',
  'BTC',
  'ETH'
]);

// Investment type enum
export const investmentTypeSchema = z.enum([
  'DIRECT',
  'SYNDICATE'
]);

// Release type enum for escrow
export const releaseTypeSchema = z.enum([
  'AUTOMATIC',
  'MANUAL',
  'CONDITIONAL'
]);

// Refund reason enum
export const refundReasonSchema = z.enum([
  'CHANGED_MIND',
  'FOUND_BETTER_OPPORTUNITY',
  'DUE_DILIGENCE_CONCERNS',
  'PERSONAL_FINANCIAL_ISSUES',
  'STARTUP_ISSUES',
  'PAYMENT_FAILED',
  'FRAUD_SUSPECTED',
  'OTHER'
]);

// Process payment schema
export const processPaymentSchema = z.object({
  investmentId: z.string().min(1, 'Investment ID is required'),
  amount: z.number()
    .min(1, 'Amount must be greater than 0')
    .max(10000000, 'Amount cannot exceed $10M'),
  currency: currencySchema.default('USD'),
  paymentMethod: paymentMethodSchema,
  investmentType: investmentTypeSchema.default('DIRECT'),
});

// Refund schema
export const refundSchema = z.object({
  investmentId: z.string().min(1, 'Investment ID is required'),
  reason: refundReasonSchema,
  amount: z.number()
    .min(0.01, 'Refund amount must be greater than 0')
    .max(10000000, 'Refund amount cannot exceed $10M')
    .optional(),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional(),
});

// Release escrow schema
export const releaseEscrowSchema = z.object({
  escrowReference: z.string().min(1, 'Escrow reference is required'),
  releaseType: releaseTypeSchema.default('MANUAL'),
  conditions: z.object({
    minimumFundingReached: z.boolean().optional(),
    legalReviewCompleted: z.boolean().optional(),
    founderApproval: z.boolean().optional(),
    investorApproval: z.boolean().optional(),
  }).optional(),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional(),
});

// Calculate fees schema
export const calculateFeesSchema = z.object({
  amount: z.number()
    .min(1, 'Amount must be greater than 0')
    .max(10000000, 'Amount cannot exceed $10M'),
  investmentType: investmentTypeSchema.default('DIRECT'),
  performanceMultiple: z.number()
    .min(0.1, 'Performance multiple must be greater than 0.1')
    .max(100, 'Performance multiple cannot exceed 100')
    .optional(),
  currency: currencySchema.default('USD'),
});

// Create Stripe customer schema
export const createStripeCustomerSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters'),
  phone: z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
    .optional(),
  address: z.object({
    line1: z.string().min(1, 'Address line 1 is required'),
    line2: z.string().optional(),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    postal_code: z.string().min(1, 'Postal code is required'),
    country: z.string().length(2, 'Country must be 2 characters').default('US'),
  }).optional(),
});

// Webhook validation schema
export const stripeWebhookSchema = z.object({
  id: z.string().min(1, 'Event ID is required'),
  object: z.literal('event'),
  type: z.string().min(1, 'Event type is required'),
  data: z.object({
    object: z.record(z.any()),
  }),
  created: z.number().min(1, 'Created timestamp is required'),
});

// Payment status query schema
export const paymentStatusQuerySchema = z.object({
  investmentId: z.string().min(1, 'Investment ID is required'),
  includeEscrowDetails: z.boolean().default(false),
  includeFeeBreakdown: z.boolean().default(true),
});

// Payment methods query schema
export const paymentMethodsQuerySchema = z.object({
  amount: z.number()
    .min(1, 'Amount must be greater than 0')
    .max(10000000, 'Amount cannot exceed $10M')
    .default(1000),
  currency: currencySchema.default('USD'),
  investmentType: investmentTypeSchema.default('DIRECT'),
});

// Payment stats query schema
export const paymentStatsQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid start date format (YYYY-MM-DD)').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid end date format (YYYY-MM-DD)').optional(),
  groupBy: z.enum(['day', 'week', 'month']).default('day'),
  paymentMethod: paymentMethodSchema.optional(),
  investmentType: investmentTypeSchema.optional(),
});

// Batch payment processing schema
export const batchPaymentSchema = z.object({
  payments: z.array(z.object({
    investmentId: z.string().min(1, 'Investment ID is required'),
    amount: z.number().min(1, 'Amount must be greater than 0'),
    paymentMethod: paymentMethodSchema,
  })).min(1, 'At least one payment is required').max(100, 'Cannot process more than 100 payments at once'),
  batchReference: z.string().max(100, 'Batch reference must be less than 100 characters').optional(),
});

// Dispute creation schema
export const createDisputeSchema = z.object({
  investmentId: z.string().min(1, 'Investment ID is required'),
  reason: z.enum([
    'PAYMENT_FAILED',
    'STARTUP_MISREPRESENTATION',
    'BREACH_OF_CONTRACT',
    'REGULATORY_ISSUES',
    'FRAUD_SUSPECTED',
    'OTHER'
  ]),
  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(2000, 'Description must be less than 2000 characters'),
  evidence: z.array(z.object({
    type: z.enum(['DOCUMENT', 'COMMUNICATION', 'FINANCIAL', 'OTHER']),
    description: z.string().max(500, 'Evidence description must be less than 500 characters'),
    fileUrl: z.string().url('Invalid file URL').optional(),
    notes: z.string().max(1000, 'Evidence notes must be less than 1000 characters').optional(),
  })).max(10, 'Cannot upload more than 10 pieces of evidence').optional(),
});

// Payment confirmation schema (for webhook responses)
export const paymentConfirmationSchema = z.object({
  paymentIntentId: z.string().min(1, 'Payment intent ID is required'),
  investmentId: z.string().min(1, 'Investment ID is required'),
  status: z.enum(['succeeded', 'failed', 'canceled', 'processing']),
  amount: z.number().min(0, 'Amount must be non-negative'),
  currency: z.string().length(3, 'Currency must be 3 characters'),
  metadata: z.record(z.any()).optional(),
});

// Type exports
export type ProcessPaymentInput = z.infer<typeof processPaymentSchema>;
export type RefundInput = z.infer<typeof refundSchema>;
export type ReleaseEscrowInput = z.infer<typeof releaseEscrowSchema>;
export type CalculateFeesInput = z.infer<typeof calculateFeesSchema>;
export type CreateStripeCustomerInput = z.infer<typeof createStripeCustomerSchema>;
export type StripeWebhookInput = z.infer<typeof stripeWebhookSchema>;
export type PaymentStatusQueryInput = z.infer<typeof paymentStatusQuerySchema>;
export type PaymentMethodsQueryInput = z.infer<typeof paymentMethodsQuerySchema>;
export type PaymentStatsQueryInput = z.infer<typeof paymentStatsQuerySchema>;
export type BatchPaymentInput = z.infer<typeof batchPaymentSchema>;
export type CreateDisputeInput = z.infer<typeof createDisputeSchema>;
export type PaymentConfirmationInput = z.infer<typeof paymentConfirmationSchema>;

export default {
  processPayment: processPaymentSchema,
  refund: refundSchema,
  releaseEscrow: releaseEscrowSchema,
  calculateFees: calculateFeesSchema,
  createStripeCustomer: createStripeCustomerSchema,
  stripeWebhook: stripeWebhookSchema,
  paymentStatusQuery: paymentStatusQuerySchema,
  paymentMethodsQuery: paymentMethodsQuerySchema,
  paymentStatsQuery: paymentStatsQuerySchema,
  batchPayment: batchPaymentSchema,
  createDispute: createDisputeSchema,
  paymentConfirmation: paymentConfirmationSchema,
};