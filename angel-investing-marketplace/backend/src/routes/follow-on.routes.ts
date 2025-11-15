import { Router } from 'express';
import { followOnController } from '../controllers/follow-on.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validation.js';
import {
  sqlInjectionPrevention,
  xssPrevention,
  inputSanitization,
} from '../middleware/security.js';
import { z } from 'zod';

const router = Router();

// Apply security middleware to all routes
router.use(sqlInjectionPrevention);
router.use(xssPrevention);
router.use(inputSanitization);

// ============================================================================
// Validation Schemas
// ============================================================================

const opportunityIdParamSchema = z.object({
  id: z.string().cuid(),
});

const opportunitiesQuerySchema = z.object({
  status: z.enum(['OFFERED', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'EXERCISED']).optional(),
  startupId: z.string().cuid().optional(),
  expired: z.enum(['true', 'false']).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

const exerciseRightSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  investmentId: z.string().cuid().optional(),
});

const createOpportunitiesSchema = z.object({
  opportunities: z.array(
    z.object({
      originalInvestmentId: z.string().cuid(),
      investorId: z.string().cuid(),
      startupId: z.string().cuid(),
      roundId: z.string().cuid().optional(),
      proRataRight: z.boolean(),
      entitlement: z.number().positive(),
      notificationDate: z.string().transform((val) => new Date(val)),
      deadlineDate: z.string().transform((val) => new Date(val)),
    })
  ).min(1, 'At least one opportunity is required'),
});

// ============================================================================
// Follow-On Investment Routes
// ============================================================================

/**
 * Get user's follow-on opportunities
 * GET /api/follow-on/opportunities
 */
router.get(
  '/opportunities',
  authenticate,
  validateQuery(opportunitiesQuerySchema),
  followOnController.getOpportunities.bind(followOnController)
);

/**
 * Get opportunity details
 * GET /api/follow-on/:id
 */
router.get(
  '/:id',
  authenticate,
  validateParams(opportunityIdParamSchema),
  followOnController.getOpportunityById.bind(followOnController)
);

/**
 * Exercise pro-rata right
 * POST /api/follow-on/:id/exercise
 */
router.post(
  '/:id/exercise',
  authenticate,
  validateParams(opportunityIdParamSchema),
  validateBody(exerciseRightSchema),
  followOnController.exerciseRight.bind(followOnController)
);

/**
 * Decline opportunity
 * POST /api/follow-on/:id/decline
 */
router.post(
  '/:id/decline',
  authenticate,
  validateParams(opportunityIdParamSchema),
  followOnController.declineOpportunity.bind(followOnController)
);

/**
 * Get allocation details
 * GET /api/follow-on/:id/allocation
 */
router.get(
  '/:id/allocation',
  authenticate,
  validateParams(opportunityIdParamSchema),
  followOnController.getAllocation.bind(followOnController)
);

// ============================================================================
// Admin Routes
// ============================================================================

/**
 * Create follow-on opportunities (admin only)
 * POST /api/admin/follow-on/create
 */
router.post(
  '/admin/create',
  authenticate,
  requireAdmin,
  validateBody(createOpportunitiesSchema),
  followOnController.createOpportunities.bind(followOnController)
);

export default router;
