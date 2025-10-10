import { z } from 'zod';
import {
  uuidSchema,
  emailSchema,
  nameSchema,
  phoneSchema,
  urlSchema,
  currencyAmountSchema,
  percentageSchema,
  addressSchema,
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
import { paginatedResponseSchema, errorResponseSchema, successResponseSchema } from './schemas.js';

// Query parameter schemas
export const paginationQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sort_by: z.string().optional(),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});

export const searchQuerySchema = z.object({
  q: z.string().min(1).max(100),
  filters: z.record(z.any()).optional(),
});

export const dateRangeQuerySchema = z.object({
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
});

// User API schemas
export const userListQuerySchema = z.object({
  role: userRoleSchema.optional(),
  is_verified: z.boolean().optional(),
  is_active: z.boolean().optional(),
  search: z.string().max(100, 'Search term too long').optional(),
  ...paginationQuerySchema.shape,
});

export const userUpdateRequestSchema = z.object({
  name: nameSchema.optional(),
  email: emailSchema.optional(),
  phone: phoneSchema,
  avatar_url: urlSchema,
  bio: z.string().max(500).optional(),
  location: z.string().max(100).optional(),
  website_url: urlSchema,
  linkedin_url: urlSchema,
  twitter_url: urlSchema,
});

export const userProfileResponseSchema = z.object({
  id: uuidSchema,
  email: emailSchema,
  name: nameSchema,
  role: userRoleSchema,
  avatar_url: urlSchema,
  phone: phoneSchema,
  bio: z.string().max(500).optional(),
  location: z.string().max(100).optional(),
  website_url: urlSchema,
  linkedin_url: urlSchema,
  twitter_url: urlSchema,
  is_verified: z.boolean(),
  is_active: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Startup API schemas
export const startupListQuerySchema = z.object({
  search: z.string().max(100, 'Search term too long').optional(),
  industry: industrySchema.optional(),
  stage: startupStageSchema.optional(),
  min_funding: z.number().min(0, 'Minimum funding must be positive').optional(),
  max_funding: z.number().min(0, 'Maximum funding must be positive').optional(),
  min_valuation: z.number().min(0, 'Minimum valuation must be positive').optional(),
  max_valuation: z.number().min(0, 'Maximum valuation must be positive').optional(),
  is_verified: z.boolean().optional(),
  founded_after: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  founded_before: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  ...paginationQuerySchema.shape,
});

export const startupCreationRequestSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(50).max(5000),
  industry: industrySchema,
  stage: startupStageSchema,
  website_url: urlSchema,
  logo_url: urlSchema,
  founded_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  team_size: z.number().int().min(1).max(10000),
  business_model: businessModelSchema,
  target_market: z.string().min(20).max(1000),
  competitive_advantage: z.string().min(20).max(1000),
  funding_goal: currencyAmountSchema,
  current_funding: currencyAmountSchema.optional(),
  valuation: currencyAmountSchema.optional(),
  pitch: z.string().max(1000).optional(),
  tags: z.array(z.string().min(2).max(30)).max(10).optional(),
});

export const startupResponseSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  industry: industrySchema,
  stage: startupStageSchema,
  website_url: urlSchema,
  logo_url: urlSchema,
  founded_date: z.string(),
  team_size: z.number().int(),
  business_model: businessModelSchema,
  target_market: z.string(),
  competitive_advantage: z.string(),
  funding_goal: currencyAmountSchema,
  current_funding: currencyAmountSchema,
  valuation: currencyAmountSchema.optional(),
  founder: z.object({
    id: uuidSchema,
    name: nameSchema,
    avatar_url: urlSchema,
  }),
  is_verified: z.boolean(),
  is_active: z.boolean(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Pitch API schemas
export const pitchListQuerySchema = z.object({
  search: z.string().max(100, 'Search term too long').optional(),
  status: pitchStatusSchema.optional(),
  pitch_type: pitchTypeSchema.optional(),
  industry: z.string().optional(),
  stage: z.string().optional(),
  min_amount: z.number().min(0, 'Minimum amount must be positive').optional(),
  max_amount: z.number().min(0, 'Maximum amount must be positive').optional(),
  min_equity: z.number().min(0, 'Minimum equity must be positive').optional(),
  max_equity: z.number().min(0, 'Maximum equity must be positive').optional(),
  min_valuation: z.number().min(0, 'Minimum valuation must be positive').optional(),
  max_valuation: z.number().min(0, 'Maximum valuation must be positive').optional(),
  tags: z.array(z.string()).optional(),
  created_after: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  created_before: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  ...paginationQuerySchema.shape,
});

export const pitchCreationRequestSchema = z.object({
  startup_id: uuidSchema,
  title: z.string().min(10).max(200),
  summary: z.string().min(100).max(1000),
  problem_statement: z.string().min(50).max(2000),
  solution: z.string().min(50).max(2000),
  market_opportunity: z.string().min(50).max(2000),
  funding_amount: currencyAmountSchema,
  equity_offered: percentageSchema.optional(),
  minimum_investment: z.number().min(100).max(10000),
  pitch_type: pitchTypeSchema.default('EQUITY'),
  pitch_deck_url: urlSchema,
  video_url: urlSchema,
  tags: z.array(z.string().min(2).max(30)).max(10).optional(),
});

export const pitchResponseSchema = z.object({
  id: uuidSchema,
  startup_id: uuidSchema,
  title: z.string(),
  summary: z.string(),
  problem_statement: z.string(),
  solution: z.string(),
  market_opportunity: z.string(),
  funding_amount: currencyAmountSchema,
  equity_offered: percentageSchema.optional(),
  minimum_investment: currencyAmountSchema,
  pitch_type: pitchTypeSchema,
  status: pitchStatusSchema,
  pitch_deck_url: urlSchema,
  video_url: urlSchema,
  startup: z.object({
    id: uuidSchema,
    name: z.string(),
    logo_url: urlSchema,
  }).optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Investment API schemas
export const investmentListQuerySchema = z.object({
  status: investmentStatusSchema.optional(),
  type: z.enum(['DIRECT', 'SYNDICATE']).optional(),
  pitch_id: uuidSchema.optional(),
  investor_id: uuidSchema.optional(),
  ...paginationQuerySchema.shape,
});

export const investmentCreationRequestSchema = z.object({
  pitch_id: uuidSchema,
  amount: currencyAmountSchema,
  equity_percentage: percentageSchema.optional(),
  payment_method: paymentMethodSchema,
  terms_accepted: z.boolean().refine(val => val === true),
  risk_acknowledged: z.boolean().refine(val => val === true),
  syndicate_id: uuidSchema.optional(),
});

export const investmentResponseSchema = z.object({
  id: uuidSchema,
  investor_id: uuidSchema,
  pitch_id: uuidSchema,
  amount: currencyAmountSchema,
  equity_percentage: percentageSchema.optional(),
  status: investmentStatusSchema,
  investment_type: z.enum(['DIRECT', 'SYNDICATE']),
  payment_method: paymentMethodSchema,
  investment_date: z.string().datetime().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Message API schemas
export const messageListQuerySchema = z.object({
  pitch_id: uuidSchema.optional(),
  user_id: uuidSchema.optional(),
  message_type: z.enum(['GENERAL', 'PITCH_INQUIRY', 'INVESTMENT_DISCUSSION', 'SUPPORT']).optional(),
  is_read: z.boolean().optional(),
  ...paginationQuerySchema.shape,
});

export const messageCreationRequestSchema = z.object({
  receiver_id: uuidSchema,
  pitch_id: uuidSchema.optional(),
  investment_id: uuidSchema.optional(),
  subject: z.string().min(5).max(200),
  content: z.string().min(10).max(10000),
  message_type: z.enum(['GENERAL', 'PITCH_INQUIRY', 'INVESTMENT_DISCUSSION', 'SUPPORT']).default('GENERAL'),
});

export const messageResponseSchema = z.object({
  id: uuidSchema,
  sender_id: uuidSchema,
  receiver_id: uuidSchema,
  pitch_id: uuidSchema.optional(),
  investment_id: uuidSchema.optional(),
  subject: z.string(),
  content: z.string(),
  message_type: z.enum(['GENERAL', 'PITCH_INQUIRY', 'INVESTMENT_DISCUSSION', 'SUPPORT']),
  is_read: z.boolean(),
  read_at: z.string().datetime().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// Document API schemas
export const documentUploadRequestSchema = z.object({
  file: z.instanceof(File),
  startup_id: uuidSchema.optional(),
  pitch_id: uuidSchema.optional(),
  file_type: documentTypeSchema,
  is_public: z.boolean().default(false),
});

export const documentResponseSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  file_url: z.string().url(),
  file_type: documentTypeSchema,
  file_size: z.number(),
  mime_type: z.string(),
  is_public: z.boolean(),
  download_count: z.number(),
  uploaded_by: uuidSchema,
  created_at: z.string().datetime(),
});

// Notification API schemas
export const notificationListQuerySchema = z.object({
  is_read: z.boolean().optional(),
  type: notificationTypeSchema.optional(),
  ...paginationQuerySchema.shape,
});

export const notificationResponseSchema = z.object({
  id: uuidSchema,
  user_id: uuidSchema,
  type: notificationTypeSchema,
  title: z.string(),
  content: z.string(),
  data: z.record(z.any()).optional(),
  is_read: z.boolean(),
  read_at: z.string().datetime().optional(),
  action_url: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  created_at: z.string().datetime(),
});

// Analytics API schemas
export const analyticsDateRangeSchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
}).refine(
  (data) => new Date(data.start_date) <= new Date(data.end_date),
  {
    message: 'Start date must be before end date',
    path: ['end_date']
  }
);

// Type exports
export type UserListQueryInput = z.infer<typeof userListQuerySchema>;
export type UserUpdateRequestInput = z.infer<typeof userUpdateRequestSchema>;
export type UserProfileResponseInput = z.infer<typeof userProfileResponseSchema>;
export type StartupListQueryInput = z.infer<typeof startupListQuerySchema>;
export type StartupCreationRequestInput = z.infer<typeof startupCreationRequestSchema>;
export type StartupResponseInput = z.infer<typeof startupResponseSchema>;
export type PitchListQueryInput = z.infer<typeof pitchListQuerySchema>;
export type PitchCreationRequestInput = z.infer<typeof pitchCreationRequestSchema>;
export type PitchResponseInput = z.infer<typeof pitchResponseSchema>;
export type InvestmentListQueryInput = z.infer<typeof investmentListQuerySchema>;
export type InvestmentCreationRequestInput = z.infer<typeof investmentCreationRequestSchema>;
export type InvestmentResponseInput = z.infer<typeof investmentResponseSchema>;
export type MessageListQueryInput = z.infer<typeof messageListQuerySchema>;
export type MessageCreationRequestInput = z.infer<typeof messageCreationRequestSchema>;
export type MessageResponseInput = z.infer<typeof messageResponseSchema>;
export type DocumentUploadRequestInput = z.infer<typeof documentUploadRequestSchema>;
export type DocumentResponseInput = z.infer<typeof documentResponseSchema>;
export type NotificationListQueryInput = z.infer<typeof notificationListQuerySchema>;
export type NotificationResponseInput = z.infer<typeof notificationResponseSchema>;
export type AnalyticsDateRangeInput = z.infer<typeof analyticsDateRangeSchema>;

// Export all schemas
export default {
  // Query schemas
  paginationQuery: paginationQuerySchema,
  searchQuery: searchQuerySchema,
  dateRangeQuery: dateRangeQuerySchema,

  // User API schemas
  userListQuery: userListQuerySchema,
  userUpdateRequest: userUpdateRequestSchema,
  userProfileResponse: userProfileResponseSchema,

  // Startup API schemas
  startupListQuery: startupListQuerySchema,
  startupCreationRequest: startupCreationRequestSchema,
  startupResponse: startupResponseSchema,

  // Pitch API schemas
  pitchListQuery: pitchListQuerySchema,
  pitchCreationRequest: pitchCreationRequestSchema,
  pitchResponse: pitchResponseSchema,

  // Investment API schemas
  investmentListQuery: investmentListQuerySchema,
  investmentCreationRequest: investmentCreationRequestSchema,
  investmentResponse: investmentResponseSchema,

  // Message API schemas
  messageListQuery: messageListQuerySchema,
  messageCreationRequest: messageCreationRequestSchema,
  messageResponse: messageResponseSchema,

  // Document API schemas
  documentUploadRequest: documentUploadRequestSchema,
  documentResponse: documentResponseSchema,

  // Notification API schemas
  notificationListQuery: notificationListQuerySchema,
  notificationResponse: notificationResponseSchema,

  // Analytics schemas
  analyticsDateRange: analyticsDateRangeSchema,
};