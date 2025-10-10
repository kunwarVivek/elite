import { z } from 'zod';

// Base schemas
export const userIdSchema = z.string().min(1, 'User ID is required');
export const phoneSchema = z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number format').optional();

// KYC validation schemas
export const kycDocumentSchema = z.object({
  documentType: z.enum(['PASSPORT', 'DRIVERS_LICENSE', 'NATIONAL_ID', 'UTILITY_BILL']),
  documentNumber: z.string().min(1, 'Document number is required'),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  issuingCountry: z.string().length(2, 'Country code must be 2 characters'),
  fileUrl: z.string().url('Invalid document URL'),
});

export const kycSubmissionSchema = z.object({
  personalInfo: z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
    nationality: z.string().length(2, 'Country code must be 2 characters'),
    address: z.object({
      street: z.string().min(1, 'Street address is required'),
      city: z.string().min(1, 'City is required'),
      state: z.string().min(1, 'State is required'),
      country: z.string().length(2, 'Country code must be 2 characters'),
      postalCode: z.string().min(1, 'Postal code is required'),
    }),
  }),
  documents: z.array(kycDocumentSchema).min(1, 'At least one document is required'),
  additionalInfo: z.string().max(1000, 'Additional info must be less than 1000 characters').optional(),
});

// Accreditation validation schemas
export const accreditationSchema = z.object({
  accreditationType: z.enum(['ACCREDITED_INVESTOR', 'QUALIFIED_CLIENT', 'INSTITUTIONAL_INVESTOR']),
  verificationMethod: z.enum(['INCOME', 'NET_WORTH', 'LICENSE', 'THIRD_PARTY']),
  documents: z.array(z.object({
    documentType: z.enum(['TAX_RETURN', 'FINANCIAL_STATEMENT', 'LICENSE', 'VERIFICATION_LETTER']),
    fileUrl: z.string().url('Invalid document URL'),
    description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  })).min(1, 'At least one document is required'),
  declaration: z.object({
    iConfirmAccredited: z.boolean().refine(val => val === true, 'Must confirm accredited status'),
    understandRisks: z.boolean().refine(val => val === true, 'Must confirm understanding of risks'),
    signature: z.string().min(1, 'Signature is required'),
    signatureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  }),
});

// User profile schemas
export const userProfileSchema = z.object({
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
  location: z.string().max(100, 'Location must be less than 100 characters').optional(),
  website: z.string().url('Invalid website URL').optional(),
  linkedin: z.string().url('Invalid LinkedIn URL').optional(),
  twitter: z.string().url('Invalid Twitter URL').optional(),
  avatar: z.string().url('Invalid avatar URL').optional(),
  phone: phoneSchema,
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  nationality: z.string().length(2, 'Country code must be 2 characters').optional(),
  timezone: z.string().max(50, 'Invalid timezone').optional(),
  language: z.string().length(2, 'Language code must be 2 characters').default('en'),
  investmentRange: z.object({
    min: z.number().min(0, 'Minimum investment must be positive').optional(),
    max: z.number().min(0, 'Maximum investment must be positive').optional(),
  }).optional(),
  investmentFocus: z.array(z.string()).max(10, 'Maximum 10 investment focuses allowed').optional(),
  portfolioSize: z.number().min(0, 'Portfolio size must be positive').optional(),
  yearsExperience: z.number().min(0, 'Years of experience must be positive').optional(),
});

// Admin user management schemas
export const updateUserStatusSchema = z.object({
  isActive: z.boolean(),
  reason: z.string().max(500, 'Reason must be less than 500 characters').optional(),
  adminNotes: z.string().max(1000, 'Admin notes must be less than 1000 characters').optional(),
});

export const userListQuerySchema = z.object({
  role: z.enum(['INVESTOR', 'FOUNDER', 'ADMIN']).optional(),
  isVerified: z.boolean().optional(),
  isActive: z.boolean().optional(),
  kycStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'NOT_SUBMITTED']).optional(),
  accreditationStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'NOT_SUBMITTED']).optional(),
  search: z.string().max(100, 'Search term too long').optional(),
  page: z.number().min(1, 'Page must be positive').default(1),
  limit: z.number().min(1, 'Limit must be positive').max(100, 'Limit cannot exceed 100').default(20),
  sortBy: z.enum(['createdAt', 'name', 'email', 'lastLogin']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Type exports
export type KycSubmissionInput = z.infer<typeof kycSubmissionSchema>;
export type AccreditationInput = z.infer<typeof accreditationSchema>;
export type UserProfileInput = z.infer<typeof userProfileSchema>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
export type UserListQueryInput = z.infer<typeof userListQuerySchema>;

export default {
  kycSubmission: kycSubmissionSchema,
  accreditation: accreditationSchema,
  userProfile: userProfileSchema,
  updateUserStatus: updateUserStatusSchema,
  userListQuery: userListQuerySchema,
};