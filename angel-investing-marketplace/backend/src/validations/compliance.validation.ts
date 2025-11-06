import { z } from 'zod';

/**
 * Compliance/KYC/AML Validation Schemas
 */

// Address schema
const addressSchema = z.object({
  street: z.string().min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State/Province is required'),
  postalCode: z.string().min(1, 'Postal code is required'),
  country: z
    .string()
    .length(2, 'Country must be 2-letter ISO code')
    .regex(/^[A-Z]{2}$/, 'Country must be uppercase ISO code'),
});

// Identification schema
const identificationSchema = z.object({
  type: z.enum(['PASSPORT', 'DRIVERS_LICENSE', 'NATIONAL_ID']),
  number: z.string().min(5, 'ID number must be at least 5 characters'),
  issuedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
  issuingCountry: z
    .string()
    .length(2, 'Country must be 2-letter ISO code')
    .regex(/^[A-Z]{2}$/, 'Country must be uppercase ISO code'),
  frontImageUrl: z.string().url('Invalid image URL').optional(),
  backImageUrl: z.string().url('Invalid image URL').optional(),
  selfieUrl: z.string().url('Invalid selfie URL').optional(),
});

/**
 * Submit KYC schema
 */
export const submitKycSchema = z
  .object({
    firstName: z
      .string()
      .min(1, 'First name is required')
      .max(100, 'First name too long'),
    lastName: z
      .string()
      .min(1, 'Last name is required')
      .max(100, 'Last name too long'),
    dateOfBirth: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
    nationality: z
      .string()
      .length(2, 'Nationality must be 2-letter ISO code')
      .regex(/^[A-Z]{2}$/, 'Nationality must be uppercase ISO code'),
    address: addressSchema,
    identification: identificationSchema,
    phoneNumber: z
      .string()
      .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
      .optional(),
    occupation: z.string().max(200, 'Occupation too long').optional(),
    sourceOfFunds: z
      .string()
      .max(500, 'Source of funds description too long')
      .optional(),
  })
  .refine(
    (data) => {
      // Validate date of birth is at least 18 years ago
      const dob = new Date(data.dateOfBirth);
      const eighteenYearsAgo = new Date();
      eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
      return dob <= eighteenYearsAgo;
    },
    {
      message: 'Must be at least 18 years old',
      path: ['dateOfBirth'],
    }
  )
  .refine(
    (data) => {
      // Validate ID expiry date is in the future
      const expiry = new Date(data.identification.expiryDate);
      return expiry > new Date();
    },
    {
      message: 'Identification document has expired',
      path: ['identification', 'expiryDate'],
    }
  );

/**
 * Review compliance schema (Admin)
 */
export const reviewComplianceSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED', 'REQUEST_MORE_INFO'], {
    required_error: 'Decision is required',
  }),
  notes: z
    .string()
    .max(2000, 'Notes cannot exceed 2000 characters')
    .optional(),
});

/**
 * Rescreen request schema
 */
export const rescreenRequestSchema = z.object({
  reason: z
    .string()
    .max(500, 'Reason cannot exceed 500 characters')
    .optional(),
});
