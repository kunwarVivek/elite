import { z } from 'zod';
import {
  emailSchema,
  passwordSchema,
  nameSchema,
  phoneSchema,
  urlSchema,
  uuidSchema,
  currencyAmountSchema,
  percentageSchema,
  addressSchema,
  fileSchema,
  userRoleSchema,
  startupStageSchema,
  industrySchema,
  businessModelSchema,
  pitchStatusSchema,
  pitchTypeSchema,
  investmentStatusSchema,
  paymentMethodSchema,
  documentTypeSchema,
  notificationTypeSchema,
} from './types.js';

// User registration schema
export const userRegistrationSchema = z.object({
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
});

// User login schema
export const userLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  remember_me: z.boolean().default(false),
  two_factor_code: z.string().length(6, 'Two-factor code must be 6 digits').optional(),
});

// User profile schema
export const userProfileSchema = z.object({
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
  investment_range: z.object({
    min: z.number().min(0, 'Minimum investment must be positive').optional(),
    max: z.number().min(0, 'Maximum investment must be positive').optional(),
  }).optional(),
  investment_focus: z.array(z.string()).max(10, 'Maximum 10 investment focuses allowed').optional(),
  portfolio_size: z.number().min(0, 'Portfolio size must be positive').optional(),
  years_experience: z.number().min(0, 'Years of experience must be positive').optional(),
});

// Startup creation schema
export const startupCreationSchema = z.object({
  name: z
    .string()
    .min(1, 'Startup name is required')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[^<>\"'&]*$/, 'Name contains invalid characters')
    .trim(),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(50, 'Slug cannot exceed 50 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens')
    .optional(),
  description: z
    .string()
    .min(50, 'Description must be at least 50 characters')
    .max(5000, 'Description must be less than 5000 characters')
    .regex(/^[^<>\"'&]*$/, 'Description contains invalid characters'),
  industry: industrySchema,
  stage: startupStageSchema,
  website_url: urlSchema,
  logo_url: urlSchema,
  founded_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)')
    .refine(
      (date) => {
        const foundedDate = new Date(date);
        const today = new Date();
        const hundredYearsAgo = new Date(today.getFullYear() - 100, today.getMonth(), today.getDate());
        return foundedDate >= hundredYearsAgo && foundedDate <= today;
      },
      'Founded date must be within the last 100 years and not in the future'
    ),
  team_size: z
    .number()
    .int('Team size must be a whole number')
    .min(1, 'Team size must be at least 1')
    .max(10000, 'Team size seems unrealistic'),
  business_model: businessModelSchema,
  target_market: z
    .string()
    .min(20, 'Target market must be at least 20 characters')
    .max(1000, 'Target market must be less than 1000 characters')
    .regex(/^[^<>\"'&]*$/, 'Target market contains invalid characters'),
  competitive_advantage: z
    .string()
    .min(20, 'Competitive advantage must be at least 20 characters')
    .max(1000, 'Competitive advantage must be less than 1000 characters')
    .regex(/^[^<>\"'&]*$/, 'Competitive advantage contains invalid characters'),
  funding_goal: z
    .number()
    .min(10000, 'Minimum funding goal is $10,000')
    .max(100000000, 'Maximum funding goal is $100,000,000'),
  current_funding: z
    .number()
    .min(0, 'Current funding cannot be negative')
    .default(0),
  valuation: z
    .number()
    .min(0, 'Valuation cannot be negative')
    .optional(),
  pitch: z
    .string()
    .max(1000, 'Pitch must be less than 1000 characters')
    .regex(/^[^<>\"'&]*$/, 'Pitch contains invalid characters')
    .optional(),
  tags: z
    .array(z.string().min(2, 'Tag too short').max(30, 'Tag too long'))
    .max(10, 'Maximum 10 tags allowed')
    .optional(),
  social_links: z.object({
    linkedin: urlSchema,
    twitter: urlSchema,
    facebook: urlSchema,
    instagram: urlSchema,
  }).optional(),
});

// Pitch creation schema
export const pitchCreationSchema = z.object({
  startup_id: uuidSchema,
  title: z
    .string()
    .min(10, 'Title must be at least 10 characters')
    .max(200, 'Title must be less than 200 characters')
    .regex(/^[^<>\"'&]*$/, 'Title contains invalid characters')
    .trim(),
  summary: z
    .string()
    .min(100, 'Summary must be at least 100 characters')
    .max(1000, 'Summary must be less than 1000 characters')
    .regex(/^[^<>\"'&]*$/, 'Summary contains invalid characters'),
  problem_statement: z
    .string()
    .min(50, 'Problem statement must be at least 50 characters')
    .max(2000, 'Problem statement must be less than 2000 characters')
    .regex(/^[^<>\"'&]*$/, 'Problem statement contains invalid characters'),
  solution: z
    .string()
    .min(50, 'Solution must be at least 50 characters')
    .max(2000, 'Solution must be less than 2000 characters')
    .regex(/^[^<>\"'&]*$/, 'Solution contains invalid characters'),
  market_opportunity: z
    .string()
    .min(50, 'Market opportunity must be at least 50 characters')
    .max(2000, 'Market opportunity must be less than 2000 characters')
    .regex(/^[^<>\"'&]*$/, 'Market opportunity contains invalid characters'),
  funding_amount: currencyAmountSchema,
  equity_offered: percentageSchema.optional(),
  minimum_investment: z
    .number()
    .min(100, 'Minimum investment is $100')
    .max(10000, 'Maximum minimum investment is $10,000'),
  pitch_type: pitchTypeSchema.default('EQUITY'),
  pitch_deck_url: urlSchema,
  video_url: urlSchema,
  tags: z
    .array(z.string().min(2, 'Tag too short').max(30, 'Tag too long'))
    .max(10, 'Maximum 10 tags allowed')
    .optional(),
});

// Investment creation schema
export const investmentCreationSchema = z.object({
  pitch_id: uuidSchema,
  amount: currencyAmountSchema,
  equity_percentage: percentageSchema.optional(),
  payment_method: paymentMethodSchema,
  terms_accepted: z.boolean().refine(val => val === true, {
    message: 'You must accept the investment terms'
  }),
  risk_acknowledged: z.boolean().refine(val => val === true, {
    message: 'You must acknowledge the investment risks'
  }),
  syndicate_id: uuidSchema.optional(),
}).refine(
  (data) => {
    // If syndicate investment, amount must meet minimum
    if (data.syndicate_id) {
      return data.amount >= 100
    }
    return true
  },
  {
    message: 'Syndicate investments must be at least $100',
    path: ['amount']
  }
);

// Document upload schema
export const documentUploadSchema = z.object({
  file: fileSchema.refine(
    (file) => file.size <= 50 * 1024 * 1024, // 50MB
    'File size must be less than 50MB'
  ).refine(
    (file) => {
      const allowedTypes = [
        'application/pdf',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp'
      ];
      return allowedTypes.includes(file.type);
    },
    'File type not allowed'
  ),
  file_type: documentTypeSchema,
  is_public: z.boolean().default(false),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
});

// Message schema
export const messageSchema = z.object({
  receiver_id: uuidSchema,
  subject: z
    .string()
    .min(5, 'Subject must be at least 5 characters')
    .max(200, 'Subject cannot exceed 200 characters')
    .regex(/^[^<>\"'&]*$/, 'Subject contains invalid characters'),
  content: z
    .string()
    .min(10, 'Message must be at least 10 characters')
    .max(10000, 'Message cannot exceed 10,000 characters')
    .regex(/^[^<>\"'&]*$/, 'Content contains invalid characters'),
  message_type: z.enum([
    'GENERAL',
    'PITCH_INQUIRY',
    'INVESTMENT_DISCUSSION',
    'SUPPORT'
  ]).default('GENERAL'),
  pitch_id: uuidSchema.optional(),
  investment_id: uuidSchema.optional(),
  attachments: z.array(z.object({
    name: z.string(),
    url: z.string().url(),
    size: z.number().positive(),
    type: z.string()
  })).max(5).optional(),
});

// Comment schema
export const commentSchema = z.object({
  content: z
    .string()
    .min(1, 'Comment content is required')
    .max(1000, 'Comment must be less than 1000 characters')
    .regex(/^[^<>\"'&]*$/, 'Content contains invalid characters'),
  is_private: z.boolean().default(false),
});

// API response schemas
export const paginatedResponseSchema = <T extends z.ZodType>(itemSchema: T) => z.object({
  data: z.array(itemSchema),
  pagination: z.object({
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    total: z.number().int().min(0),
    total_pages: z.number().int().min(0),
    has_next: z.boolean(),
    has_prev: z.boolean()
  }),
  success: z.boolean(),
  message: z.string().optional()
});

export const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  code: z.string().optional(),
  details: z.record(z.any()).optional(),
  timestamp: z.string().datetime()
});

export const successResponseSchema = <T extends z.ZodType>(dataSchema: T) => z.object({
  success: z.literal(true),
  data: dataSchema,
  message: z.string().optional(),
  timestamp: z.string().datetime()
});

// Type exports
export type UserRegistrationInput = z.infer<typeof userRegistrationSchema>;
export type UserLoginInput = z.infer<typeof userLoginSchema>;
export type UserProfileInput = z.infer<typeof userProfileSchema>;
export type StartupCreationInput = z.infer<typeof startupCreationSchema>;
export type PitchCreationInput = z.infer<typeof pitchCreationSchema>;
export type InvestmentCreationInput = z.infer<typeof investmentCreationSchema>;
export type DocumentUploadInput = z.infer<typeof documentUploadSchema>;
export type MessageInput = z.infer<typeof messageSchema>;
export type CommentInput = z.infer<typeof commentSchema>;

// Export all schemas
export default {
  // Authentication schemas
  userRegistration: userRegistrationSchema,
  userLogin: userLoginSchema,
  userProfile: userProfileSchema,

  // Business schemas
  startupCreation: startupCreationSchema,
  pitchCreation: pitchCreationSchema,
  investmentCreation: investmentCreationSchema,
  documentUpload: documentUploadSchema,
  message: messageSchema,
  comment: commentSchema,

  // API schemas
  paginatedResponse: paginatedResponseSchema,
  errorResponse: errorResponseSchema,
  successResponse: successResponseSchema,
};