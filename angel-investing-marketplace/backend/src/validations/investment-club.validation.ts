import { z } from 'zod';

/**
 * Investment Club Validation Schemas
 * Comprehensive validation for all investment club operations
 */

// ============================================================================
// Enums
// ============================================================================

export const clubMemberRoleSchema = z.enum(['LEADER', 'CO_LEADER', 'MEMBER']);

export const clubMemberStatusSchema = z.enum(['PENDING', 'ACTIVE', 'SUSPENDED', 'REMOVED']);

export const sortOrderSchema = z.enum(['asc', 'desc']);

// ============================================================================
// Club Schemas
// ============================================================================

export const createClubSchema = z.object({
  name: z.string()
    .min(3, 'Club name must be at least 3 characters')
    .max(100, 'Club name must be less than 100 characters'),
  description: z.string()
    .max(1000, 'Description must be less than 1000 characters')
    .optional(),
  isPrivate: z.boolean().default(true),
  requiresApproval: z.boolean().default(true),
  maxMembers: z.number()
    .int()
    .min(2, 'Maximum members must be at least 2')
    .max(1000, 'Maximum members cannot exceed 1000')
    .optional(),
  investmentFocus: z.string()
    .max(200, 'Investment focus must be less than 200 characters')
    .optional(),
  minimumInvestment: z.number()
    .min(0, 'Minimum investment must be positive')
    .optional(),
  tags: z.array(z.string().max(30, 'Tag must be less than 30 characters'))
    .max(10, 'Maximum 10 tags allowed')
    .optional(),
});

export const updateClubSchema = z.object({
  name: z.string()
    .min(3, 'Club name must be at least 3 characters')
    .max(100, 'Club name must be less than 100 characters')
    .optional(),
  description: z.string()
    .max(1000, 'Description must be less than 1000 characters')
    .optional(),
  isPrivate: z.boolean().optional(),
  requiresApproval: z.boolean().optional(),
  maxMembers: z.number()
    .int()
    .min(2, 'Maximum members must be at least 2')
    .max(1000, 'Maximum members cannot exceed 1000')
    .optional(),
  investmentFocus: z.string()
    .max(200, 'Investment focus must be less than 200 characters')
    .optional(),
  minimumInvestment: z.number()
    .min(0, 'Minimum investment must be positive')
    .optional(),
  tags: z.array(z.string().max(30, 'Tag must be less than 30 characters'))
    .max(10, 'Maximum 10 tags allowed')
    .optional(),
});

export const clubListQuerySchema = z.object({
  isPrivate: z.coerce.boolean().optional(),
  investmentFocus: z.string().optional(),
  tags: z.string().optional(), // comma-separated tags
  minMembers: z.coerce.number().int().min(0).optional(),
  maxMembers: z.coerce.number().int().min(0).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['name', 'memberCount', 'createdAt', 'updatedAt']).default('createdAt'),
  sortOrder: sortOrderSchema.default('desc'),
});

export const clubDiscoverQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
  excludeJoined: z.coerce.boolean().default(true),
});

export const clubSearchQuerySchema = z.object({
  q: z.string().min(2, 'Search query must be at least 2 characters'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const clubActivityQuerySchema = z.object({
  type: z.enum(['member_join', 'member_leave', 'role_change', 'investment', 'club_update']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const clubStatsQuerySchema = z.object({
  period: z.enum(['week', 'month', 'quarter', 'year', 'all']).default('month'),
});

// ============================================================================
// Member Schemas
// ============================================================================

export const inviteMemberSchema = z.object({
  userId: z.string().cuid('Invalid user ID'),
  message: z.string()
    .max(500, 'Message must be less than 500 characters')
    .optional(),
});

export const updateMemberRoleSchema = z.object({
  role: clubMemberRoleSchema,
});

export const suspendMemberSchema = z.object({
  reason: z.string()
    .min(10, 'Reason must be at least 10 characters')
    .max(500, 'Reason must be less than 500 characters'),
  duration: z.number()
    .int()
    .min(1, 'Duration must be at least 1 day')
    .max(365, 'Duration cannot exceed 365 days')
    .optional(),
});

export const memberListQuerySchema = z.object({
  role: clubMemberRoleSchema.optional(),
  status: clubMemberStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  sortBy: z.enum(['joinedAt', 'createdAt', 'role', 'status']).default('joinedAt'),
  sortOrder: sortOrderSchema.default('desc'),
});

// ============================================================================
// Parameter Schemas
// ============================================================================

export const clubIdParamSchema = z.object({
  id: z.string().cuid('Invalid club ID'),
});

export const clubSlugParamSchema = z.object({
  slug: z.string()
    .min(3, 'Slug must be at least 3 characters')
    .max(100, 'Slug must be less than 100 characters'),
});

export const userIdParamSchema = z.object({
  userId: z.string().cuid('Invalid user ID'),
});

export const clubAndUserParamSchema = z.object({
  id: z.string().cuid('Invalid club ID'),
  userId: z.string().cuid('Invalid user ID'),
});

// ============================================================================
// Type Exports
// ============================================================================

export type CreateClubInput = z.infer<typeof createClubSchema>;
export type UpdateClubInput = z.infer<typeof updateClubSchema>;
export type ClubListQuery = z.infer<typeof clubListQuerySchema>;
export type ClubDiscoverQuery = z.infer<typeof clubDiscoverQuerySchema>;
export type ClubSearchQuery = z.infer<typeof clubSearchQuerySchema>;
export type ClubActivityQuery = z.infer<typeof clubActivityQuerySchema>;
export type ClubStatsQuery = z.infer<typeof clubStatsQuerySchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
export type SuspendMemberInput = z.infer<typeof suspendMemberSchema>;
export type MemberListQuery = z.infer<typeof memberListQuerySchema>;
