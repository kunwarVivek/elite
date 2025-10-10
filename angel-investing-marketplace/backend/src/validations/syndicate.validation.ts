import { z } from 'zod';

// Base schemas
export const syndicateIdSchema = z.string().min(1, 'Syndicate ID is required');
export const userIdSchema = z.string().min(1, 'User ID is required');

// Syndicate status enum
export const syndicateStatusSchema = z.enum([
  'FORMING',
  'ACTIVE',
  'FULL',
  'CLOSED',
  'DISSOLVED'
]);

// Syndicate type enum
export const syndicateTypeSchema = z.enum([
  'DEAL_BY_DEAL',
  'BLIND_POOL',
  'HYBRID'
]);

// Member role enum
export const syndicateMemberRoleSchema = z.enum([
  'LEAD',
  'CO_LEAD',
  'MEMBER'
]);

// Investment focus enum
export const investmentFocusSchema = z.enum([
  'EARLY_STAGE',
  'GROWTH_STAGE',
  'LATE_STAGE',
  'SECTOR_FOCUSED',
  'GENERAL'
]);

// Create syndicate schema
export const createSyndicateSchema = z.object({
  name: z.string().min(1, 'Syndicate name is required').max(100, 'Name must be less than 100 characters'),
  description: z.string().min(50, 'Description must be at least 50 characters').max(2000, 'Description must be less than 2000 characters'),
  type: syndicateTypeSchema,
  investmentFocus: investmentFocusSchema,
  targetDealSize: z.object({
    min: z.number().min(1000, 'Minimum deal size must be at least $1,000'),
    max: z.number().min(1000, 'Maximum deal size must be at least $1,000'),
  }),
  targetEquity: z.object({
    min: z.number().min(0.1, 'Minimum equity must be at least 0.1%'),
    max: z.number().min(0.1, 'Maximum equity must be at least 0.1%'),
  }),
  maxMembers: z.number().min(2, 'Syndicate must have at least 2 members').max(100, 'Syndicate cannot exceed 100 members'),
  minimumCommitment: z.number().min(1000, 'Minimum commitment must be at least $1,000'),
  carryPercentage: z.number().min(0, 'Carry percentage cannot be negative').max(30, 'Carry percentage cannot exceed 30%').default(20),
  managementFee: z.number().min(0, 'Management fee cannot be negative').max(5, 'Management fee cannot exceed 5%').default(2),
  investmentCriteria: z.string().min(50, 'Investment criteria must be at least 50 characters').max(2000, 'Investment criteria must be less than 2000 characters'),
  sectors: z.array(z.string().min(1, 'Sector name is required')).min(1, 'At least one sector is required').max(10, 'Maximum 10 sectors allowed'),
  geographies: z.array(z.string().min(1, 'Geography is required')).min(1, 'At least one geography is required').max(20, 'Maximum 20 geographies allowed'),
  leadInvestorId: userIdSchema,
  coLeadInvestorIds: z.array(userIdSchema).max(5, 'Maximum 5 co-lead investors allowed').optional(),
});

// Update syndicate schema
export const updateSyndicateSchema = z.object({
  name: z.string().min(1, 'Syndicate name is required').max(100, 'Name must be less than 100 characters').optional(),
  description: z.string().min(50, 'Description must be at least 50 characters').max(2000, 'Description must be less than 2000 characters').optional(),
  investmentFocus: investmentFocusSchema.optional(),
  targetDealSize: z.object({
    min: z.number().min(1000, 'Minimum deal size must be at least $1,000').optional(),
    max: z.number().min(1000, 'Maximum deal size must be at least $1,000').optional(),
  }).optional(),
  targetEquity: z.object({
    min: z.number().min(0.1, 'Minimum equity must be at least 0.1%').optional(),
    max: z.number().min(0.1, 'Maximum equity must be at least 0.1%').optional(),
  }).optional(),
  maxMembers: z.number().min(2, 'Syndicate must have at least 2 members').max(100, 'Syndicate cannot exceed 100 members').optional(),
  minimumCommitment: z.number().min(1000, 'Minimum commitment must be at least $1,000').optional(),
  carryPercentage: z.number().min(0, 'Carry percentage cannot be negative').max(30, 'Carry percentage cannot exceed 30%').optional(),
  managementFee: z.number().min(0, 'Management fee cannot be negative').max(5, 'Management fee cannot exceed 5%').optional(),
  investmentCriteria: z.string().min(50, 'Investment criteria must be at least 50 characters').max(2000, 'Investment criteria must be less than 2000 characters').optional(),
  sectors: z.array(z.string().min(1, 'Sector name is required')).min(1, 'At least one sector is required').max(10, 'Maximum 10 sectors allowed').optional(),
  geographies: z.array(z.string().min(1, 'Geography is required')).min(1, 'At least one geography is required').max(20, 'Maximum 20 geographies allowed').optional(),
});

// Syndicate settings schema
export const syndicateSettingsSchema = z.object({
  isPublic: z.boolean().default(false),
  allowNewMembers: z.boolean().default(true),
  requireApproval: z.boolean().default(true),
  votingRequired: z.boolean().default(false),
  minimumVotes: z.number().min(1, 'Minimum votes must be at least 1').optional(),
  dealDiscussionEnabled: z.boolean().default(true),
  documentSharingEnabled: z.boolean().default(true),
  performanceTrackingEnabled: z.boolean().default(true),
  notifications: z.object({
    newDeals: z.boolean().default(true),
    dealUpdates: z.boolean().default(true),
    memberChanges: z.boolean().default(true),
    performanceReports: z.boolean().default(true),
  }).optional(),
});

// Join syndicate schema
export const joinSyndicateSchema = z.object({
  commitmentAmount: z.number().min(1000, 'Commitment amount must be at least $1,000'),
  message: z.string().max(1000, 'Message must be less than 1000 characters').optional(),
  agreedToTerms: z.boolean().refine(val => val === true, 'Must agree to syndicate terms'),
});

// Update member role schema
export const updateMemberRoleSchema = z.object({
  memberId: userIdSchema,
  role: syndicateMemberRoleSchema,
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
});

// Syndicate list query schema
export const syndicateListQuerySchema = z.object({
  status: syndicateStatusSchema.optional(),
  type: syndicateTypeSchema.optional(),
  investmentFocus: investmentFocusSchema.optional(),
  minCommitment: z.number().min(0, 'Minimum commitment must be positive').optional(),
  maxCommitment: z.number().min(0, 'Maximum commitment must be positive').optional(),
  sectors: z.array(z.string()).optional(),
  geographies: z.array(z.string()).optional(),
  isPublic: z.boolean().optional(),
  search: z.string().max(100, 'Search term too long').optional(),
  page: z.number().min(1, 'Page must be positive').default(1),
  limit: z.number().min(1, 'Limit must be positive').max(100, 'Limit cannot exceed 100').default(20),
  sortBy: z.enum(['createdAt', 'name', 'memberCount', 'totalCommitment', 'performance']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Syndicate member query schema
export const syndicateMemberQuerySchema = z.object({
  role: syndicateMemberRoleSchema.optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING']).optional(),
  minCommitment: z.number().min(0, 'Minimum commitment must be positive').optional(),
  joinedAfter: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  joinedBefore: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  page: z.number().min(1, 'Page must be positive').default(1),
  limit: z.number().min(1, 'Limit must be positive').max(100, 'Limit cannot exceed 100').default(20),
  sortBy: z.enum(['joinedAt', 'commitmentAmount', 'role']).default('joinedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Syndicate deal schema
export const syndicateDealSchema = z.object({
  pitchId: z.string().min(1, 'Pitch ID is required'),
  syndicateAllocation: z.number().min(0.01, 'Allocation must be at least 0.01%').max(100, 'Allocation cannot exceed 100%'),
  leadInvestorId: userIdSchema,
  terms: z.object({
    targetAmount: z.number().min(1000, 'Target amount must be at least $1,000'),
    minimumInvestment: z.number().min(100, 'Minimum investment must be at least $100'),
    carryPercentage: z.number().min(0, 'Carry percentage cannot be negative').max(30, 'Carry percentage cannot exceed 30%'),
    managementFee: z.number().min(0, 'Management fee cannot be negative').max(5, 'Management fee cannot exceed 5%'),
  }),
  votingRequired: z.boolean().default(true),
  votingDeadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  notes: z.string().max(2000, 'Notes must be less than 2000 characters').optional(),
});

// Type exports
export type CreateSyndicateInput = z.infer<typeof createSyndicateSchema>;
export type UpdateSyndicateInput = z.infer<typeof updateSyndicateSchema>;
export type SyndicateSettingsInput = z.infer<typeof syndicateSettingsSchema>;
export type JoinSyndicateInput = z.infer<typeof joinSyndicateSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
export type SyndicateListQueryInput = z.infer<typeof syndicateListQuerySchema>;
export type SyndicateMemberQueryInput = z.infer<typeof syndicateMemberQuerySchema>;
export type SyndicateDealInput = z.infer<typeof syndicateDealSchema>;

export default {
  createSyndicate: createSyndicateSchema,
  updateSyndicate: updateSyndicateSchema,
  syndicateSettings: syndicateSettingsSchema,
  joinSyndicate: joinSyndicateSchema,
  updateMemberRole: updateMemberRoleSchema,
  syndicateListQuery: syndicateListQuerySchema,
  syndicateMemberQuery: syndicateMemberQuerySchema,
  syndicateDeal: syndicateDealSchema,
};