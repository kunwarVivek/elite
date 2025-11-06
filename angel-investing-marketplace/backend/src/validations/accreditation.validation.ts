import { z } from 'zod';

/**
 * Accreditation Validation Schemas
 * Validates investor accreditation submissions per SEC Regulation D
 */

// Document schema
const documentSchema = z.object({
  type: z.enum([
    'bank_statement',
    'tax_return',
    'accreditation_certificate',
    'proof_of_address',
    'investment_statement',
    'other',
  ]),
  url: z.string().url('Invalid document URL'),
  description: z.string().optional(),
});

// Declaration schema
const declarationSchema = z.object({
  iConfirmAccredited: z
    .boolean()
    .refine((val) => val === true, {
      message: 'Must confirm accredited investor status',
    }),
  understandRisks: z
    .boolean()
    .refine((val) => val === true, {
      message: 'Must acknowledge understanding of investment risks',
    }),
  signature: z
    .string()
    .min(1, 'Signature is required')
    .max(200, 'Signature too long'),
  signatureDate: z.string().or(z.date()),
});

/**
 * Submit accreditation schema
 */
export const submitAccreditationSchema = z
  .object({
    method: z.enum([
      'NET_WORTH',
      'INCOME',
      'PROFESSIONAL',
      'EXISTING_RELATIONSHIP',
      'THIRD_PARTY_VERIFICATION',
    ]),
    annualIncome: z
      .number()
      .positive('Annual income must be positive')
      .optional(),
    netWorth: z.number().positive('Net worth must be positive').optional(),
    professionalCertification: z.string().optional(),
    existingRelationship: z.string().optional(),
    documents: z
      .array(documentSchema)
      .min(1, 'At least one document is required')
      .max(10, 'Maximum 10 documents allowed'),
    declaration: declarationSchema,
  })
  .refine(
    (data) => {
      // If method is INCOME, annualIncome must be >= $200K
      if (data.method === 'INCOME') {
        return data.annualIncome && data.annualIncome >= 200000;
      }
      return true;
    },
    {
      message:
        'Annual income must be at least $200,000 for income-based accreditation',
      path: ['annualIncome'],
    }
  )
  .refine(
    (data) => {
      // If method is NET_WORTH, netWorth must be >= $1M
      if (data.method === 'NET_WORTH') {
        return data.netWorth && data.netWorth >= 1000000;
      }
      return true;
    },
    {
      message:
        'Net worth must be at least $1,000,000 for net worth-based accreditation',
      path: ['netWorth'],
    }
  )
  .refine(
    (data) => {
      // If method is PROFESSIONAL, certification required
      if (data.method === 'PROFESSIONAL') {
        return (
          data.professionalCertification &&
          data.professionalCertification.length > 0
        );
      }
      return true;
    },
    {
      message:
        'Professional certification details required for professional accreditation',
      path: ['professionalCertification'],
    }
  );

/**
 * Upload documents schema
 */
export const uploadDocumentsSchema = z.object({
  documents: z
    .array(documentSchema)
    .min(1, 'At least one document is required')
    .max(10, 'Maximum 10 documents allowed'),
});

/**
 * Renew accreditation schema
 */
export const renewAccreditationSchema = z.object({
  documents: z
    .array(documentSchema)
    .min(1, 'Updated financial documents required for renewal')
    .max(10, 'Maximum 10 documents allowed'),
});

/**
 * Verify accreditation schema (Admin)
 */
export const verifyAccreditationSchema = z.object({
  approved: z.boolean({
    required_error: 'Approval decision is required',
  }),
  notes: z
    .string()
    .max(1000, 'Notes cannot exceed 1000 characters')
    .optional(),
});

/**
 * Query parameters for pending list
 */
export const pendingAccreditationsQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 50)),
  offset: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 0)),
});
