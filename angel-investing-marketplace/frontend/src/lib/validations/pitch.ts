import { z } from 'zod'

// Enhanced financial projections schema with better validation
export const financialProjectionsSchema = z.object({
  year1_revenue: z
    .number()
    .min(0, 'Year 1 revenue must be positive')
    .max(10000000000, 'Revenue amount seems unrealistic')
    .optional(),
  year2_revenue: z
    .number()
    .min(0, 'Year 2 revenue must be positive')
    .max(10000000000, 'Revenue amount seems unrealistic')
    .optional(),
  year3_revenue: z
    .number()
    .min(0, 'Year 3 revenue must be positive')
    .max(10000000000, 'Revenue amount seems unrealistic')
    .optional(),
  year1_profit: z
    .number()
    .max(10000000000, 'Profit amount seems unrealistic')
    .optional(),
  year2_profit: z
    .number()
    .max(10000000000, 'Profit amount seems unrealistic')
    .optional(),
  year3_profit: z
    .number()
    .max(10000000000, 'Profit amount seems unrealistic')
    .optional(),
  break_even_months: z
    .number()
    .int('Break-even months must be a whole number')
    .min(1, 'Break-even months must be at least 1')
    .max(60, 'Break-even months cannot exceed 60')
    .optional(),
  monthly_burn_rate: z
    .number()
    .min(0, 'Monthly burn rate must be positive')
    .max(100000000, 'Burn rate seems unrealistic')
    .optional(),
  runway_months: z
    .number()
    .int('Runway months must be a whole number')
    .min(0, 'Runway months must be positive')
    .max(120, 'Runway months seems unrealistic')
    .optional(),
}).refine(
  (data) => {
    // Cross-field validation for revenue growth
    const revenues = [data.year1_revenue, data.year2_revenue, data.year3_revenue].filter(Boolean);
    if (revenues.length > 1) {
      for (let i = 1; i < revenues.length; i++) {
        if (revenues[i] && revenues[i-1] && revenues[i] < revenues[i-1] * 0.5) {
          return false; // Revenue shouldn't drop by more than 50%
        }
      }
    }

    // Validate burn rate vs runway
    if (data.monthly_burn_rate && data.runway_months) {
      const calculatedRunway = 1000000 / data.monthly_burn_rate; // Assuming $1M funding for calculation
      if (data.runway_months > calculatedRunway * 1.5) {
        return false; // Runway shouldn't be more than 50% above calculated value
      }
    }

    return true;
  },
  {
    message: 'Financial projections appear unrealistic',
  }
);

// Basic pitch information schema with enhanced validation
export const basicInfoSchema = z.object({
  title: z
    .string()
    .min(10, 'Title must be at least 10 characters')
    .max(200, 'Title cannot exceed 200 characters')
    .regex(/^[^<>\"'&]*$/, 'Title contains invalid characters')
    .trim(),

  summary: z
    .string()
    .min(100, 'Summary must be at least 100 characters')
    .max(1000, 'Summary cannot exceed 1000 characters')
    .regex(/^[^<>\"'&]*$/, 'Summary contains invalid characters'),

  funding_amount: z
    .number()
    .min(10000, 'Funding amount must be at least $10,000')
    .max(100000000, 'Funding amount cannot exceed $100,000,000')
    .multipleOf(1000, 'Funding amount must be in thousands'),

  equity_offered: z
    .number()
    .min(0.1, 'Equity offered must be at least 0.1%')
    .max(50, 'Equity offered cannot exceed 50%'),

  minimum_investment: z
    .number()
    .min(100, 'Minimum investment must be at least $100')
    .max(10000, 'Minimum investment cannot exceed $10,000'),
}).refine(
  (data) => {
    // Cross-field validation
    if (data.minimum_investment > data.funding_amount) {
      return false;
    }

    // Validate that equity offered makes sense for funding amount
    if (data.equity_offered && data.funding_amount) {
      const impliedValuation = (data.funding_amount / data.equity_offered) * 100;
      return impliedValuation >= 100000; // Minimum $100K valuation
    }

    return true;
  },
  {
    message: 'Investment parameters are not valid',
  }
);

// Pitch content schema
export const pitchContentSchema = z.object({
  problem_statement: z.string()
    .min(100, 'Problem statement must be at least 100 characters')
    .max(2000, 'Problem statement cannot exceed 2000 characters'),

  solution: z.string()
    .min(100, 'Solution must be at least 100 characters')
    .max(2000, 'Solution cannot exceed 2000 characters'),

  market_opportunity: z.string()
    .min(100, 'Market opportunity must be at least 100 characters')
    .max(2000, 'Market opportunity cannot exceed 2000 characters'),

  competitive_analysis: z.string()
    .max(2000, 'Competitive analysis cannot exceed 2000 characters')
    .optional(),
})

// Financial information schema
export const financialInfoSchema = z.object({
  financial_projections: financialProjectionsSchema,

  // Additional financial validation
}).refine((data) => {
  const { financial_projections } = data

  // If revenue projections are provided, ensure they make logical sense
  if (financial_projections.year1_revenue && financial_projections.year2_revenue) {
    if (financial_projections.year2_revenue < financial_projections.year1_revenue) {
      return false
    }
  }

  if (financial_projections.year2_revenue && financial_projections.year3_revenue) {
    if (financial_projections.year3_revenue < financial_projections.year2_revenue) {
      return false
    }
  }

  return true
}, {
  message: 'Revenue projections should show growth over time',
  path: ['financial_projections']
})

// Team information schema (for future use)
export const teamMemberSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.string().min(2, 'Role must be at least 2 characters'),
  bio: z.string().min(50, 'Bio must be at least 50 characters'),
  linkedin_url: z.string().url('Must be a valid LinkedIn URL').optional().or(z.literal('')),
  experience_years: z.number().min(0, 'Experience must be positive').optional(),
})

export const teamInfoSchema = z.object({
  team_members: z.array(teamMemberSchema).min(1, 'At least one team member is required'),
  advisors: z.array(teamMemberSchema).optional(),
})

// Enhanced document upload schema with better validation
export const documentUploadSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => file.size <= 50 * 1024 * 1024, 'File size must be less than 50MB')
    .refine((file) => file.size >= 1024, 'File size must be at least 1KB')
    .refine(
      (file) => {
        const allowedTypes = [
          'application/pdf',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'text/plain',
        ];
        return allowedTypes.includes(file.type);
      },
      'File type not allowed. Please upload PDF, Word, Excel, PowerPoint, or image files.'
    )
    .refine(
      (file) => {
        // Check for suspicious file names
        const dangerousPatterns = [
          /\.\./, // Directory traversal
          /^[.-]/, // Hidden files
          /[<>:"/\\|?*]/, // Invalid characters
        ];
        return !dangerousPatterns.some(pattern => pattern.test(file.name));
      },
      'Invalid file name'
    ),

  document_type: z.enum(['PITCH_DECK', 'BUSINESS_PLAN', 'FINANCIAL_STATEMENT', 'LEGAL_DOCUMENT', 'OTHER'], {
    required_error: 'Please select a document type',
  }),

  is_public: z.boolean().default(true),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .regex(/^[^<>\"'&]*$/, 'Description contains invalid characters')
    .optional(),
});

// Complete pitch creation schema (combines all steps)
export const createPitchSchema = z.object({
  // Step 1: Basic Information
  ...basicInfoSchema.shape,

  // Step 2: Pitch Content
  ...pitchContentSchema.shape,

  // Step 3: Financial Information
  ...financialInfoSchema.shape,

  // Step 4: Team Information (optional for now)
  team_members: z.array(teamMemberSchema).optional(),

  // Step 5: Documents (optional)
  documents: z.array(documentUploadSchema).optional(),

  // Additional fields
  tags: z.array(z.string().min(2).max(50)).max(10, 'Cannot have more than 10 tags').optional(),
  expires_at: z.string().datetime().optional(),
})

// Update pitch schema (all fields optional except id)
export const updatePitchSchema = createPitchSchema.partial()

// Pitch status update schema
export const updatePitchStatusSchema = z.object({
  status: z.enum(['DRAFT', 'UNDER_REVIEW', 'ACTIVE', 'FUNDED', 'CLOSED', 'WITHDRAWN']),
  reason: z.string().optional(),
})

// Comment schema
export const commentSchema = z.object({
  content: z.string()
    .min(10, 'Comment must be at least 10 characters')
    .max(1000, 'Comment cannot exceed 1000 characters'),
})

// Pitch filters schema
export const pitchFiltersSchema = z.object({
  status: z.array(z.enum(['DRAFT', 'UNDER_REVIEW', 'ACTIVE', 'FUNDED', 'CLOSED', 'WITHDRAWN'])).optional(),
  industry: z.array(z.string()).optional(),
  stage: z.array(z.enum(['IDEA', 'PROTOTYPE', 'MVP', 'GROWTH', 'SCALE'])).optional(),
  min_amount: z.number().min(0).optional(),
  max_amount: z.number().min(0).optional(),
  search: z.string().optional(),
  sort_by: z.enum(['created_at', 'funding_amount', 'view_count', 'updated_at']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
})

// Export types for use in components
export type BasicInfoFormData = z.infer<typeof basicInfoSchema>
export type PitchContentFormData = z.infer<typeof pitchContentSchema>
export type FinancialInfoFormData = z.infer<typeof financialInfoSchema>
export type TeamInfoFormData = z.infer<typeof teamInfoSchema>
export type DocumentUploadFormData = z.infer<typeof documentUploadSchema>
export type CreatePitchFormData = z.infer<typeof createPitchSchema>
export type UpdatePitchFormData = z.infer<typeof updatePitchSchema>
export type UpdatePitchStatusFormData = z.infer<typeof updatePitchStatusSchema>
export type CommentFormData = z.infer<typeof commentSchema>
export type PitchFiltersFormData = z.infer<typeof pitchFiltersSchema>