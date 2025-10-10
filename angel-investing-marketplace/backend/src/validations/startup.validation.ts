import { z } from 'zod';

// Base schemas
export const startupIdSchema = z.string().uuid('Invalid startup ID format');
export const urlSchema = z.string().url('Invalid URL format').optional();
export const slugSchema = z
  .string()
  .min(2, 'Slug must be at least 2 characters')
  .max(50, 'Slug cannot exceed 50 characters')
  .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens');

// File schema for document uploads
export const fileSchema = z.object({
  name: z.string().min(1, 'File name is required').max(255, 'File name too long'),
  size: z.number().positive('File size must be positive'),
  type: z.string().min(1, 'File type is required'),
  lastModified: z.number().optional(),
});

// Industry enum with comprehensive options
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


// Startup creation schema
export const createStartupSchema = z.object({
  name: z
    .string()
    .min(1, 'Startup name is required')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[^<>\"'&]*$/, 'Name contains invalid characters')
    .trim(),
  slug: slugSchema.optional(),
  description: z
    .string()
    .min(50, 'Description must be at least 50 characters')
    .max(5000, 'Description must be less than 5000 characters')
    .regex(/^[^<>\"'&]*$/, 'Description contains invalid characters'),
  industry: industrySchema,
  stage: startupStageSchema,
  website_url: z.string().url('Invalid website URL').optional(),
  logo_url: z.string().url('Invalid logo URL').optional(),
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
    linkedin: z.string().url('Invalid LinkedIn URL').optional(),
    twitter: z.string().url('Invalid Twitter URL').optional(),
    facebook: z.string().url('Invalid Facebook URL').optional(),
    instagram: z.string().url('Invalid Instagram URL').optional(),
  }).optional(),
});

// Startup update schema
export const updateStartupSchema = z.object({
  name: z
    .string()
    .min(1, 'Startup name is required')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[^<>\"'&]*$/, 'Name contains invalid characters')
    .trim()
    .optional(),
  slug: slugSchema.optional(),
  description: z
    .string()
    .min(50, 'Description must be at least 50 characters')
    .max(5000, 'Description must be less than 5000 characters')
    .regex(/^[^<>\"'&]*$/, 'Description contains invalid characters')
    .optional(),
  industry: industrySchema.optional(),
  stage: startupStageSchema.optional(),
  website_url: z.string().url('Invalid website URL').optional(),
  logo_url: z.string().url('Invalid logo URL').optional(),
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
    )
    .optional(),
  team_size: z
    .number()
    .int('Team size must be a whole number')
    .min(1, 'Team size must be at least 1')
    .max(10000, 'Team size seems unrealistic')
    .optional(),
  business_model: businessModelSchema.optional(),
  target_market: z
    .string()
    .min(20, 'Target market must be at least 20 characters')
    .max(1000, 'Target market must be less than 1000 characters')
    .regex(/^[^<>\"'&]*$/, 'Target market contains invalid characters')
    .optional(),
  competitive_advantage: z
    .string()
    .min(20, 'Competitive advantage must be at least 20 characters')
    .max(1000, 'Competitive advantage must be less than 1000 characters')
    .regex(/^[^<>\"'&]*$/, 'Competitive advantage contains invalid characters')
    .optional(),
  funding_goal: z
    .number()
    .min(10000, 'Minimum funding goal is $10,000')
    .max(100000000, 'Maximum funding goal is $100,000,000')
    .optional(),
  current_funding: z
    .number()
    .min(0, 'Current funding cannot be negative')
    .optional(),
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
    linkedin: z.string().url('Invalid LinkedIn URL').optional(),
    twitter: z.string().url('Invalid Twitter URL').optional(),
    facebook: z.string().url('Invalid Facebook URL').optional(),
    instagram: z.string().url('Invalid Instagram URL').optional(),
  }).optional(),
}).superRefine((data, ctx) => {
  // Cross-field validation: current funding cannot exceed funding goal
  if (data.current_funding && data.funding_goal && data.current_funding > data.funding_goal) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Current funding cannot exceed funding goal',
      path: ['current_funding'],
    });
  }
});

// Startup verification schema
export const startupVerificationSchema = z.object({
  isVerified: z.boolean(),
  verificationNotes: z.string().max(1000, 'Verification notes must be less than 1000 characters').optional(),
  verifiedBy: z.string().min(1, 'Verified by is required'),
  verificationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  documents: z.array(z.object({
    documentType: z.enum(['BUSINESS_LICENSE', 'INCORPORATION_CERT', 'TAX_ID', 'FINANCIAL_STATEMENT', 'OTHER']),
    fileUrl: z.string().url('Invalid document URL'),
    description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  })).optional(),
});

// Startup list query schema
export const startupListQuerySchema = z.object({
  search: z.string().max(100, 'Search term too long').optional(),
  industry: industrySchema.optional(),
  stage: startupStageSchema.optional(),
  minFunding: z.number().min(0, 'Minimum funding must be positive').optional(),
  maxFunding: z.number().min(0, 'Maximum funding must be positive').optional(),
  minValuation: z.number().min(0, 'Minimum valuation must be positive').optional(),
  maxValuation: z.number().min(0, 'Maximum valuation must be positive').optional(),
  isVerified: z.boolean().optional(),
  foundedAfter: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  foundedBefore: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  page: z.number().min(1, 'Page must be positive').default(1),
  limit: z.number().min(1, 'Limit must be positive').max(100, 'Limit cannot exceed 100').default(20),
  sortBy: z.enum(['createdAt', 'name', 'fundingGoal', 'currentFunding', 'valuation', 'teamSize']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Team member schema
export const teamMemberSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
  linkedin: urlSchema.optional(),
  avatar: urlSchema.optional(),
  isFounder: z.boolean().default(false),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
});

// Add team member schema
export const addTeamMemberSchema = z.object({
  startupId: startupIdSchema,
  teamMember: teamMemberSchema,
});

// Update team member schema
export const updateTeamMemberSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters').optional(),
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters').optional(),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
  linkedin: urlSchema.optional(),
  avatar: urlSchema.optional(),
  isFounder: z.boolean().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
});

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
  file_type: z.enum(['PITCH_DECK', 'BUSINESS_PLAN', 'FINANCIAL', 'LEGAL', 'OTHER']),
  is_public: z.boolean().default(false),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
});


// Financial projections schema
export const financialProjectionsSchema = z.object({
  year1_revenue: z.number().min(0, 'Revenue cannot be negative').optional(),
  year2_revenue: z.number().min(0, 'Revenue cannot be negative').optional(),
  year3_revenue: z.number().min(0, 'Revenue cannot be negative').optional(),
  year1_customers: z.number().int().min(0, 'Customer count cannot be negative').optional(),
  year2_customers: z.number().int().min(0, 'Customer count cannot be negative').optional(),
  year3_customers: z.number().int().min(0, 'Customer count cannot be negative').optional(),
  year1_burn_rate: z.number().min(0, 'Burn rate cannot be negative').optional(),
  year2_burn_rate: z.number().min(0, 'Burn rate cannot be negative').optional(),
  year3_burn_rate: z.number().min(0, 'Burn rate cannot be negative').optional(),
}).refine(
  (data) => {
    const revenues = [data.year1_revenue, data.year2_revenue, data.year3_revenue].filter(Boolean);

    // If providing revenue projections, should be realistic growth
    if (revenues.length > 1) {
      for (let i = 1; i < revenues.length; i++) {
        const currentRevenue = revenues[i];
        const previousRevenue = revenues[i-1];
        if (currentRevenue !== undefined && previousRevenue !== undefined && currentRevenue < previousRevenue * 0.5) {
          return false; // Revenue shouldn't drop by more than 50%
        }
      }
    }

    return true;
  },
  {
    message: 'Financial projections appear unrealistic',
  }
);

// Startup analytics query schema
export const startupAnalyticsQuerySchema = z.object({
  startup_id: startupIdSchema,
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  metrics: z.array(z.enum(['views', 'investments', 'funding', 'engagement'])).optional(),
});

// Type exports
export type CreateStartupInput = z.infer<typeof createStartupSchema>;
export type UpdateStartupInput = z.infer<typeof updateStartupSchema>;
export type StartupVerificationInput = z.infer<typeof startupVerificationSchema>;
export type StartupListQueryInput = z.infer<typeof startupListQuerySchema>;
export type TeamMemberInput = z.infer<typeof teamMemberSchema>;
export type AddTeamMemberInput = z.infer<typeof addTeamMemberSchema>;
export type UpdateTeamMemberInput = z.infer<typeof updateTeamMemberSchema>;
export type DocumentUploadInput = z.infer<typeof documentUploadSchema>;
export type FinancialProjectionsInput = z.infer<typeof financialProjectionsSchema>;
export type StartupAnalyticsQueryInput = z.infer<typeof startupAnalyticsQuerySchema>;

// Export all schemas
export default {
  // Base schemas
  startupId: startupIdSchema,
  url: urlSchema,
  slug: slugSchema,
  file: fileSchema,
  industry: industrySchema,
  startupStage: startupStageSchema,
  businessModel: businessModelSchema,

  // Main schemas
  createStartup: createStartupSchema,
  updateStartup: updateStartupSchema,
  startupVerification: startupVerificationSchema,
  startupListQuery: startupListQuerySchema,
  teamMember: teamMemberSchema,
  addTeamMember: addTeamMemberSchema,
  updateTeamMember: updateTeamMemberSchema,
  documentUpload: documentUploadSchema,
  financialProjections: financialProjectionsSchema,
  startupAnalyticsQuery: startupAnalyticsQuerySchema,
};