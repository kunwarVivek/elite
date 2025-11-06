import { z } from 'zod';

/**
 * Admin Approval Validation Schemas
 */

/**
 * Entity type validation
 */
const entityTypeSchema = z.enum([
  'INVESTMENT',
  'PITCH',
  'SYNDICATE',
  'USER',
  'KYC',
  'ACCREDITATION',
  'SPV',
  'DOCUMENT',
]);

/**
 * Approval status validation
 */
const approvalStatusSchema = z.enum([
  'PENDING',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'REQUIRES_MORE_INFO',
  'ESCALATED',
]);

/**
 * Approval priority validation
 */
const approvalPrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);

/**
 * Submit approval request schema
 */
export const submitApprovalSchema = z.object({
  entityType: entityTypeSchema,
  entityId: z.string().uuid('Entity ID must be a valid UUID'),
  priority: approvalPrioritySchema.optional(),
  reason: z.string().max(1000, 'Reason must not exceed 1000 characters').optional(),
  metadata: z.record(z.any()).optional(),
  autoApprove: z.boolean().optional().default(false),
});

/**
 * Process approval decision schema
 */
export const processApprovalSchema = z.object({
  approved: z.boolean({
    required_error: 'Approval decision is required',
  }),
  notes: z.string().max(2000, 'Notes must not exceed 2000 characters').optional(),
  requiresMoreInfo: z.boolean().optional().default(false),
  escalate: z.boolean().optional().default(false),
  tags: z.array(z.string()).max(10, 'Maximum 10 tags allowed').optional(),
}).refine(
  (data) => {
    // If approved is false, at least one of requiresMoreInfo or escalate should be considered
    // But it's valid to just reject without either
    if (data.approved === false && data.requiresMoreInfo && data.escalate) {
      return false; // Cannot both require more info AND escalate
    }
    return true;
  },
  {
    message: 'Cannot both require more information and escalate',
  }
);

/**
 * Reassign approval schema
 */
export const reassignApprovalSchema = z.object({
  newAdminId: z.string().uuid('Admin ID must be a valid UUID'),
});

/**
 * Approval queue filter schema
 */
export const approvalQueueFilterSchema = z.object({
  entityType: entityTypeSchema.optional(),
  status: approvalStatusSchema.optional(),
  priority: approvalPrioritySchema.optional(),
  assignedTo: z.string().uuid().optional(),
  createdAfter: z.string().datetime().optional(),
  createdBefore: z.string().datetime().optional(),
  slaBreached: z
    .string()
    .refine((val) => val === 'true' || val === 'false', {
      message: 'slaBreached must be "true" or "false"',
    })
    .optional(),
  limit: z.string().regex(/^\d+$/).optional(),
  offset: z.string().regex(/^\d+$/).optional(),
});

/**
 * Approval statistics filter schema
 */
export const approvalStatsFilterSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

/**
 * Bulk approve schema
 */
export const bulkApproveSchema = z.object({
  approvalIds: z
    .array(z.string().uuid())
    .min(1, 'At least one approval ID is required')
    .max(100, 'Cannot approve more than 100 items at once'),
  notes: z.string().max(1000, 'Notes must not exceed 1000 characters').optional(),
});

/**
 * Entity approval history params schema
 */
export const entityApprovalHistorySchema = z.object({
  entityType: entityTypeSchema,
  entityId: z.string().uuid('Entity ID must be a valid UUID'),
});

/**
 * Approval ID param schema
 */
export const approvalIdParamSchema = z.object({
  approvalId: z.string().uuid('Approval ID must be a valid UUID'),
});

/**
 * My queue filter schema
 */
export const myQueueFilterSchema = z.object({
  status: approvalStatusSchema.optional(),
  limit: z.string().regex(/^\d+$/).optional(),
  offset: z.string().regex(/^\d+$/).optional(),
});

/**
 * Helper validation functions
 */

/**
 * Validate SLA deadline based on priority
 */
export const validateSlaDeadline = (
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
  createdAt: Date
): Date => {
  const slaHours = {
    URGENT: 4,
    HIGH: 24,
    MEDIUM: 72,
    LOW: 168,
  };

  const deadline = new Date(createdAt);
  deadline.setHours(deadline.getHours() + slaHours[priority]);
  return deadline;
};

/**
 * Check if approval is past SLA deadline
 */
export const isSlaBreached = (slaDeadline: Date): boolean => {
  return slaDeadline < new Date();
};

/**
 * Calculate time remaining until SLA breach
 */
export const calculateTimeRemaining = (slaDeadline: Date): number => {
  return slaDeadline.getTime() - Date.now(); // milliseconds
};

/**
 * Format time remaining as human-readable string
 */
export const formatTimeRemaining = (milliseconds: number): string => {
  if (milliseconds < 0) {
    return 'SLA breached';
  }

  const hours = Math.floor(milliseconds / (1000 * 60 * 60));
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days} day${days !== 1 ? 's' : ''} remaining`;
  }

  if (hours > 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} min remaining`;
  }

  return `${minutes} minute${minutes !== 1 ? 's' : ''} remaining`;
};
