import { z } from 'zod';

// Enhanced user registration schema with better validation
export const userRegistrationSchema = z.object({
  email: z
    .string()
    .email('Please enter a valid email address')
    .min(5, 'Email must be at least 5 characters')
    .max(255, 'Email cannot exceed 255 characters')
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password cannot exceed 128 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
    .refine(password => !/\s/.test(password), 'Password cannot contain spaces'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  firstName: z
    .string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'First name can only contain letters, spaces, hyphens, and apostrophes')
    .trim(),
  lastName: z
    .string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Last name can only contain letters, spaces, hyphens, and apostrophes')
    .trim(),
  phone: z
    .string()
    .regex(/^[\+]?[1-9][\d]{0,15}$/, 'Invalid phone number format')
    .optional(),
  role: z.enum(['investor', 'founder'], {
    required_error: 'Please select a role',
  }),
  agreedToTerms: z.boolean().refine(val => val === true, 'You must agree to the terms of service'),
  agreedToPrivacy: z.boolean().refine(val => val === true, 'You must agree to the privacy policy'),
  marketingOptIn: z.boolean().default(false),
  referralCode: z.string().max(50, 'Referral code too long').optional(),
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  }
);

export const roleSelectionSchema = z.object({
  role: z.enum(['investor', 'founder'], {
    required_error: 'Please select a role',
  }),
});

export const investorPersonalInfoSchema = z.object({
  dateOfBirth: z
    .string()
    .min(1, 'Date of birth is required')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
    .refine(
      (date) => {
        const birthDate = new Date(date);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        return age >= 18 && age <= 120;
      },
      'Must be between 18 and 120 years old'
    ),
  address: z.object({
    street: z
      .string()
      .min(5, 'Street address must be at least 5 characters')
      .max(255, 'Street address too long')
      .regex(/^[^<>\"'&]*$/, 'Street address contains invalid characters'),
    city: z
      .string()
      .min(2, 'City must be at least 2 characters')
      .max(100, 'City name too long')
      .regex(/^[^<>\"'&]*$/, 'City contains invalid characters'),
    state: z
      .string()
      .min(2, 'State must be at least 2 characters')
      .max(100, 'State name too long')
      .regex(/^[^<>\"'&]*$/, 'State contains invalid characters'),
    zipCode: z
      .string()
      .min(5, 'ZIP code must be at least 5 characters')
      .max(20, 'ZIP code too long')
      .regex(/^[^<>\"'&\s]*$/, 'ZIP code contains invalid characters'),
    country: z
      .string()
      .length(2, 'Country code must be 2 characters')
      .regex(/^[A-Z]{2}$/, 'Country code must be uppercase letters only'),
  }),
  citizenship: z
    .string()
    .length(2, 'Citizenship must be 2 characters')
    .regex(/^[A-Z]{2}$/, 'Citizenship must be uppercase letters only'),
  phone: z
    .string()
    .regex(/^[\+]?[1-9][\d]{0,15}$/, 'Invalid phone number format')
    .optional(),
});

export const investorFinancialInfoSchema = z.object({
  annualIncome: z
    .number()
    .min(1, 'Annual income must be greater than 0')
    .max(1000000000, 'Annual income seems unrealistic'),
  netWorth: z
    .number()
    .min(1, 'Net worth must be greater than 0')
    .max(10000000000, 'Net worth seems unrealistic'),
  liquidNetWorth: z
    .number()
    .min(0, 'Liquid net worth must be 0 or greater')
    .max(10000000000, 'Liquid net worth seems unrealistic')
    .refine(
      (liquid, ctx) => {
        const { netWorth } = ctx.parent as { netWorth: number };
        return liquid <= netWorth;
      },
      'Liquid net worth cannot exceed total net worth'
    ),
  investmentExperience: z.enum(['none', 'limited', 'moderate', 'extensive'], {
    required_error: 'Please select your investment experience level',
  }),
  riskTolerance: z.enum(['conservative', 'moderate', 'aggressive'], {
    required_error: 'Please select your risk tolerance level',
  }),
  accreditedInvestor: z.boolean().default(false),
});

export const investorAccreditationSchema = z.object({
  accreditationMethod: z.enum(['income', 'net-worth', 'license', 'entity']),
  // For income method
  incomeDocuments: z.array(z.instanceof(File)).optional(),
  // For net worth method
  netWorthDocuments: z.array(z.instanceof(File)).optional(),
  // For license method
  licenseDocuments: z.array(z.instanceof(File)).optional(),
  // For entity method
  entityDocuments: z.array(z.instanceof(File)).optional(),
});

export const investorPreferencesSchema = z.object({
  preferredInvestmentRange: z.object({
    min: z.number().min(1000, 'Minimum investment must be at least $1,000'),
    max: z.number().min(1000, 'Maximum investment must be at least $1,000'),
  }).refine(data => data.max >= data.min, {
    message: 'Maximum investment must be greater than or equal to minimum investment',
  }),
  preferredSectors: z.array(z.string()).min(1, 'Please select at least one sector'),
  preferredStages: z.array(z.string()).min(1, 'Please select at least one stage'),
  geographicPreferences: z.array(z.string()).min(1, 'Please select at least one geographic preference'),
});

export const founderCompanyInfoSchema = z.object({
  companyName: z.string().min(2, 'Company name must be at least 2 characters'),
  companyWebsite: z.string().url().optional().or(z.literal('')),
  foundingDate: z.string().min(1, 'Founding date is required'),
  businessStage: z.enum(['idea', 'mvp', 'early-traction', 'scaling', 'mature']),
  industry: z.string().min(2, 'Industry is required'),
  description: z.string().min(50, 'Description must be at least 50 characters').max(1000, 'Description must be less than 1000 characters'),
});

export const founderInfoSchema = z.object({
  title: z.string().min(2, 'Title is required'),
  linkedIn: z.string().url().optional().or(z.literal('')),
  yearsOfExperience: z.number().min(0, 'Years of experience must be 0 or greater'),
  previousCompanies: z.array(z.string()).optional(),
  education: z.string().optional(),
});

export const founderCompanyVerificationSchema = z.object({
  businessRegistrationNumber: z.string().min(5, 'Business registration number is required'),
  taxId: z.string().min(5, 'Tax ID is required'),
  legalStructure: z.enum(['llc', 'corporation', 'partnership', 'sole-proprietorship']),
  incorporationState: z.string().min(2, 'Incorporation state is required'),
  companyDocuments: z.array(z.instanceof(File)).min(1, 'At least one company document is required'),
});

export const founderTeamInfoSchema = z.object({
  teamMembers: z.array(z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    title: z.string().min(2, 'Title is required'),
    email: z.string().email('Please enter a valid email address'),
    linkedIn: z.string().url().optional().or(z.literal('')),
  })).min(1, 'At least one team member is required'),
});

export const documentUploadSchema = z.object({
  type: z.enum(['identity', 'address', 'financial', 'accreditation', 'company', 'other']),
  file: z.instanceof(File)
    .refine(file => file.size <= 10 * 1024 * 1024, 'File size must be less than 10MB')
    .refine(
      file => ['image/jpeg', 'image/png', 'application/pdf'].includes(file.type),
      'File must be a JPEG, PNG, or PDF'
    ),
});

export const kycVerificationSchema = z.object({
  identityDocument: z.instanceof(File),
  proofOfAddress: z.instanceof(File),
  additionalDocuments: z.array(z.instanceof(File)).optional(),
});

export const emailVerificationSchema = z.object({
  token: z.string().min(6, 'Verification token must be at least 6 characters'),
});

// Type exports for form data
export type UserRegistrationFormData = z.infer<typeof userRegistrationSchema>;
export type RoleSelectionFormData = z.infer<typeof roleSelectionSchema>;
export type InvestorPersonalInfoFormData = z.infer<typeof investorPersonalInfoSchema>;
export type InvestorFinancialInfoFormData = z.infer<typeof investorFinancialInfoSchema>;
export type InvestorAccreditationFormData = z.infer<typeof investorAccreditationSchema>;
export type InvestorPreferencesFormData = z.infer<typeof investorPreferencesSchema>;
export type FounderCompanyInfoFormData = z.infer<typeof founderCompanyInfoSchema>;
export type FounderInfoFormData = z.infer<typeof founderInfoSchema>;
export type FounderCompanyVerificationFormData = z.infer<typeof founderCompanyVerificationSchema>;
export type FounderTeamInfoFormData = z.infer<typeof founderTeamInfoSchema>;
export type DocumentUploadFormData = z.infer<typeof documentUploadSchema>;
export type KycVerificationFormData = z.infer<typeof kycVerificationSchema>;
export type EmailVerificationFormData = z.infer<typeof emailVerificationSchema>;