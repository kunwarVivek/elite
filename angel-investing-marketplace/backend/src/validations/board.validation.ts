import { z } from 'zod';

// ============================================================================
// BASE SCHEMAS
// ============================================================================

export const participantSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  role: z.string().optional(),
});

export const participantListSchema = z.array(participantSchema).min(1, 'At least one participant is required');

// ============================================================================
// BOARD MEETING SCHEMAS
// ============================================================================

export const boardMeetingTypeSchema = z.enum(['REGULAR', 'SPECIAL', 'ANNUAL', 'EMERGENCY'], {
  errorMap: () => ({ message: 'Please select a valid meeting type' })
});

export const meetingStatusSchema = z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'], {
  errorMap: () => ({ message: 'Please select a valid meeting status' })
});

// Create board meeting schema
export const createBoardMeetingSchema = z.object({
  startupId: z.string().min(1, 'Startup ID is required'),
  meetingDate: z.string().datetime('Invalid date format').or(z.date()),
  meetingType: boardMeetingTypeSchema,
  location: z.string().optional(),
  directors: participantListSchema,
  observers: z.array(participantSchema).optional().default([]),
  management: z.array(participantSchema).optional().default([]),
  agenda: z.string().max(10000, 'Agenda is too long').optional(),
  materials: z.array(z.string().url('Invalid material URL')).optional().default([]),
}).refine(
  (data) => {
    const meetingDate = new Date(data.meetingDate);
    return meetingDate > new Date();
  },
  {
    message: 'Meeting date must be in the future',
    path: ['meetingDate'],
  }
);

// Update board meeting schema
export const updateBoardMeetingSchema = z.object({
  meetingDate: z.string().datetime('Invalid date format').or(z.date()).optional(),
  meetingType: boardMeetingTypeSchema.optional(),
  location: z.string().optional(),
  directors: participantListSchema.optional(),
  observers: z.array(participantSchema).optional(),
  management: z.array(participantSchema).optional(),
  agenda: z.string().max(10000, 'Agenda is too long').optional(),
  materials: z.array(z.string().url('Invalid material URL')).optional(),
  minutesUrl: z.string().url('Invalid minutes URL').optional(),
  recordingUrl: z.string().url('Invalid recording URL').optional(),
}).partial();

// List meetings query schema
export const listMeetingsQuerySchema = z.object({
  startupId: z.string().optional(),
  status: meetingStatusSchema.optional(),
  meetingType: boardMeetingTypeSchema.optional(),
  fromDate: z.string().datetime('Invalid date format').or(z.date()).optional(),
  toDate: z.string().datetime('Invalid date format').or(z.date()).optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).optional().default('20'),
}).refine(
  (data) => {
    if (data.fromDate && data.toDate) {
      return new Date(data.fromDate) <= new Date(data.toDate);
    }
    return true;
  },
  {
    message: 'fromDate must be before or equal to toDate',
    path: ['toDate'],
  }
);

// ============================================================================
// BOARD RESOLUTION SCHEMAS
// ============================================================================

export const resolutionResultSchema = z.enum(['PASSED', 'FAILED', 'ABSTAINED', 'TABLED'], {
  errorMap: () => ({ message: 'Please select a valid resolution result' })
});

// Create board resolution schema
export const createBoardResolutionSchema = z.object({
  resolutionNumber: z.string().min(1, 'Resolution number is required').max(50, 'Resolution number too long'),
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title too long'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(50000, 'Description too long'),
  proposedBy: z.string().min(1, 'Proposer ID is required'),
  requiresMajority: z.boolean().default(true),
  requiresSupermajority: z.boolean().default(false),
  requiredVotes: z.number().int().positive('Required votes must be positive').optional(),
}).refine(
  (data) => {
    // If supermajority is required, majority must also be required
    if (data.requiresSupermajority) {
      return data.requiresMajority;
    }
    return true;
  },
  {
    message: 'Supermajority requires majority to be enabled',
    path: ['requiresSupermajority'],
  }
);

// Update board resolution schema
export const updateBoardResolutionSchema = z.object({
  resolutionNumber: z.string().min(1, 'Resolution number is required').max(50, 'Resolution number too long').optional(),
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title too long').optional(),
  description: z.string().min(10, 'Description must be at least 10 characters').max(50000, 'Description too long').optional(),
  requiresMajority: z.boolean().optional(),
  requiresSupermajority: z.boolean().optional(),
  requiredVotes: z.number().int().positive('Required votes must be positive').optional(),
}).partial();

// List resolutions query schema
export const listResolutionsQuerySchema = z.object({
  meetingId: z.string().optional(),
  startupId: z.string().optional(),
  result: resolutionResultSchema.optional(),
  proposedBy: z.string().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).optional().default('20'),
});

// ============================================================================
// BOARD VOTE SCHEMAS
// ============================================================================

export const voteTypeSchema = z.enum(['FOR', 'AGAINST', 'ABSTAIN'], {
  errorMap: () => ({ message: 'Please select a valid vote type' })
});

// Cast vote schema
export const castVoteSchema = z.object({
  vote: voteTypeSchema,
  comments: z.string().max(1000, 'Comments too long').optional(),
});

// Update vote schema
export const updateVoteSchema = z.object({
  vote: voteTypeSchema,
  comments: z.string().max(1000, 'Comments too long').optional(),
}).partial();

// ============================================================================
// PARAMETER SCHEMAS
// ============================================================================

export const boardMeetingIdParamSchema = z.object({
  id: z.string().min(1, 'Meeting ID is required'),
});

export const boardResolutionIdParamSchema = z.object({
  id: z.string().min(1, 'Resolution ID is required'),
});

export const boardVoteIdParamSchema = z.object({
  id: z.string().min(1, 'Vote ID is required'),
});

export const startupIdParamSchema = z.object({
  startupId: z.string().min(1, 'Startup ID is required'),
});

export const meetingIdParamSchema = z.object({
  meetingId: z.string().min(1, 'Meeting ID is required'),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CreateBoardMeetingInput = z.infer<typeof createBoardMeetingSchema>;
export type UpdateBoardMeetingInput = z.infer<typeof updateBoardMeetingSchema>;
export type ListMeetingsQuery = z.infer<typeof listMeetingsQuerySchema>;

export type CreateBoardResolutionInput = z.infer<typeof createBoardResolutionSchema>;
export type UpdateBoardResolutionInput = z.infer<typeof updateBoardResolutionSchema>;
export type ListResolutionsQuery = z.infer<typeof listResolutionsQuerySchema>;

export type CastVoteInput = z.infer<typeof castVoteSchema>;
export type UpdateVoteInput = z.infer<typeof updateVoteSchema>;

export type Participant = z.infer<typeof participantSchema>;
