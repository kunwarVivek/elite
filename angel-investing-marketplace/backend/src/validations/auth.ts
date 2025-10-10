import { z } from 'zod';

// Base validation schemas
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

// User role enum with enhanced validation
export const userRoleSchema = z.enum(['INVESTOR', 'FOUNDER', 'SYNDICATE_LEAD', 'ADMIN'], {
  errorMap: () => ({ message: 'Invalid user role specified' })
});

// Phone number schema
export const phoneSchema = z
  .string()
  .regex(/^[\+]?[1-9][\d]{0,15}$/, 'Invalid phone number format')
  .optional();

// URL schema
export const urlSchema = z
  .string()
  .url('Invalid URL format')
  .optional();

// UUID schema
export const uuidSchema = z.string().uuid('Invalid UUID format');

// Date schemas
export const dateSchema = z.date();
export const futureDateSchema = z.date().refine(
  (date) => date > new Date(),
  'Date must be in the future'
);

// Monetary value schemas
export const currencyAmountSchema = z
  .number()
  .positive('Amount must be positive')
  .multipleOf(0.01, 'Amount must be in cents');

export const percentageSchema = z
  .number()
  .min(0, 'Percentage cannot be negative')
  .max(100, 'Percentage cannot exceed 100');

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

// Authentication schemas
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
  role: userRoleSchema.default('INVESTOR'),
  phone: phoneSchema,
  agreed_to_terms: z.boolean().refine(val => val === true, {
    message: 'You must agree to the terms and conditions'
  }),
  agreed_to_privacy: z.boolean().refine(val => val === true, {
    message: 'You must agree to the privacy policy'
  }),
  referral_code: z.string().max(50, 'Referral code too long').optional(),
  marketing_opt_in: z.boolean().default(false),
}).refine(
  (data) => {
    // Additional validation for specific roles
    if (data.role === 'INVESTOR') {
      return true; // No additional requirements for basic investors
    }
    return true;
  },
  {
    message: 'Invalid registration data for specified role',
  }
);

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  remember_me: z.boolean().default(false),
  two_factor_code: z.string().length(6, 'Two-factor code must be 6 digits').optional(),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10, 'Reset token is invalid'),
  password: passwordSchema,
  confirm_password: z.string(),
}).refine(
  (data) => data.password === data.confirm_password,
  {
    message: 'Passwords do not match',
    path: ['confirm_password']
  }
).refine(
  (data) => {
    // Ensure new password is different from common patterns
    const commonPasswords = ['password', '123456', 'password123', 'admin', 'qwerty'];
    return !commonPasswords.includes(data.password.toLowerCase());
  },
  {
    message: 'Password is too common, please choose a stronger password',
    path: ['password']
  }
);

export const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: passwordSchema,
  confirm_password: z.string(),
}).refine(
  (data) => data.new_password === data.confirm_password,
  {
    message: 'Passwords do not match',
    path: ['confirm_password']
  }
).refine(
  (data) => data.current_password !== data.new_password,
  {
    message: 'New password must be different from current password',
    path: ['new_password']
  }
);

export const verifyEmailSchema = z.object({
  token: z.string().min(10, 'Verification token is invalid'),
});

export const resendVerificationSchema = z.object({
  email: emailSchema,
});

// Social login schemas
export const socialLoginSchema = z.object({
  provider: z.enum(['google', 'github', 'linkedin'], {
    errorMap: () => ({ message: 'Unsupported social login provider' })
  }),
  token: z.string().min(1, 'Provider token is required'),
  id_token: z.string().optional(), // For OIDC providers
});

// Profile update schemas
export const updateProfileSchema = z.object({
  name: nameSchema.optional(),
  bio: z.string()
    .max(500, 'Bio must be less than 500 characters')
    .regex(/^[^<>\"'&]*$/, 'Bio contains invalid characters')
    .optional(),
  avatar_url: urlSchema,
  location: z.string()
    .max(100, 'Location must be less than 100 characters')
    .regex(/^[^<>\"'&]*$/, 'Location contains invalid characters')
    .optional(),
  website_url: urlSchema,
  linkedin_url: urlSchema,
  twitter_url: urlSchema,
  phone: phoneSchema,
  date_of_birth: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
    .refine(
      (date) => {
        const birthDate = new Date(date);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        return age >= 18 && age <= 120;
      },
      'Must be between 18 and 120 years old'
    )
    .optional(),
  nationality: z.string().length(2, 'Country code must be 2 characters').optional(),
  timezone: z.string().max(50, 'Invalid timezone').optional(),
  language: z.string().length(2, 'Language code must be 2 characters').default('en'),
});

// Address schema for KYC
export const addressSchema = z.object({
  street: z.string().min(1, 'Street address is required').max(255, 'Street address too long'),
  city: z.string().min(1, 'City is required').max(100, 'City name too long'),
  state: z.string().min(2, 'State is required').max(100, 'State name too long'),
  country: z.string().length(2, 'Country code must be 2 characters'),
  postal_code: z.string().min(3, 'Postal code too short').max(20, 'Postal code too long'),
}).optional();

// Investor accreditation schema
export const accreditationSchema = z.object({
  annual_income: currencyAmountSchema,
  net_worth: currencyAmountSchema,
  liquid_assets: currencyAmountSchema.optional(),
  accreditation_method: z.enum([
    'INCOME',
    'NET_WORTH',
    'LICENSED_INVESTOR',
    'ENTITY'
  ]),
  documents: z.array(z.object({
    type: z.enum(['TAX_RETURN', 'BANK_STATEMENT', 'LICENSE', 'ENTITY_DOCS']),
    file_url: z.string().url(),
    uploaded_at: z.string().datetime()
  })).min(1, 'At least one supporting document is required'),
  verified_by: uuidSchema.optional(),
  verified_at: z.string().datetime().optional(),
  expires_at: z.string().datetime()
}).refine(
  (data) => {
    if (data.accreditation_method === 'INCOME') {
      return data.annual_income >= 200000
    }
    if (data.accreditation_method === 'NET_WORTH') {
      return data.net_worth >= 1000000
    }
    return true
  },
  {
    message: 'Income or net worth does not meet accreditation requirements'
  }
);

// KYC document schema
export const kycDocumentSchema = z.object({
  document_type: z.enum(['PASSPORT', 'DRIVERS_LICENSE', 'NATIONAL_ID', 'UTILITY_BILL']),
  document_number: z.string().min(1, 'Document number is required'),
  expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  issuing_country: z.string().length(2, 'Country code must be 2 characters'),
  file_url: z.string().url(),
});

// KYC submission schema
export const kycSubmissionSchema = z.object({
  personal_info: z.object({
    first_name: z.string().min(1, 'First name is required').max(100, 'First name too long'),
    last_name: z.string().min(1, 'Last name is required').max(100, 'Last name too long'),
    date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
    nationality: z.string().length(2, 'Country code must be 2 characters'),
    address: addressSchema,
  }),
  documents: z.array(kycDocumentSchema).min(1, 'At least one document is required'),
  additional_info: z.string().max(1000, 'Additional info must be less than 1000 characters').optional(),
});

// Two-factor authentication schemas
export const enable2FASchema = z.object({
  password: z.string().min(1, 'Password is required to enable 2FA'),
});

export const verify2FASchema = z.object({
  token: z.string().length(6, '2FA token must be 6 digits'),
});

export const disable2FASchema = z.object({
  password: z.string().min(1, 'Password is required to disable 2FA'),
  token: z.string().length(6, '2FA token must be 6 digits'),
});

// Session management schemas
export const refreshTokenSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token is required'),
});

export const logoutSchema = z.object({
  logout_all: z.boolean().default(false),
});

// Type exports
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
export type SocialLoginInput = z.infer<typeof socialLoginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type AccreditationInput = z.infer<typeof accreditationSchema>;
export type KycSubmissionInput = z.infer<typeof kycSubmissionSchema>;
export type Enable2FAInput = z.infer<typeof enable2FASchema>;
export type Verify2FAInput = z.infer<typeof verify2FASchema>;
export type Disable2FAInput = z.infer<typeof disable2FASchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;

// Export all schemas
export default {
  // Base schemas
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
  phone: phoneSchema,
  url: urlSchema,
  uuid: uuidSchema,
  currencyAmount: currencyAmountSchema,
  percentage: percentageSchema,
  pagination: paginationSchema,
  dateRange: dateRangeSchema,
  address: addressSchema,

  // Authentication schemas
  register: registerSchema,
  login: loginSchema,
  forgotPassword: forgotPasswordSchema,
  resetPassword: resetPasswordSchema,
  changePassword: changePasswordSchema,
  verifyEmail: verifyEmailSchema,
  resendVerification: resendVerificationSchema,
  socialLogin: socialLoginSchema,
  updateProfile: updateProfileSchema,

  // Enhanced security schemas
  accreditation: accreditationSchema,
  kycSubmission: kycSubmissionSchema,
  enable2FA: enable2FASchema,
  verify2FA: verify2FASchema,
  disable2FA: disable2FASchema,
  refreshToken: refreshTokenSchema,
  logout: logoutSchema,
};