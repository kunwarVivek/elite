import { Router } from 'express';
import { reputationController } from '../controllers/reputation.controller.js';
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

const userIdParamSchema = z.object({
  userId: z.string().cuid(),
});

const leaderboardQuerySchema = z.object({
  limit: z.string().optional(),
  period: z.enum(['all', 'month', 'week']).optional(),
});

const badgesQuerySchema = z.object({
  category: z.enum(['INVESTMENT', 'CONTRIBUTION', 'EXPERTISE', 'MILESTONE', 'SPECIAL']).optional(),
  tier: z.enum(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND']).optional(),
});

const createBadgeSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  icon: z.string().min(1),
  category: z.enum(['INVESTMENT', 'CONTRIBUTION', 'EXPERTISE', 'MILESTONE', 'SPECIAL']),
  tier: z.enum(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND']),
  criteria: z.object({
    minReputationScore: z.number().optional(),
    minLevel: z.number().optional(),
    minInvestmentScore: z.number().optional(),
    minContributionScore: z.number().optional(),
    minSocialScore: z.number().optional(),
  }),
});

const awardBadgeSchema = z.object({
  badgeId: z.string().cuid(),
});

// ============================================================================
// Reputation Routes
// ============================================================================

/**
 * Get user's own reputation
 * GET /api/reputation/me
 */
router.get(
  '/me',
  authenticate,
  reputationController.getMyReputation.bind(reputationController)
);

/**
 * Get any user's reputation (public)
 * GET /api/reputation/:userId
 */
router.get(
  '/:userId',
  validateParams(userIdParamSchema),
  reputationController.getUserReputation.bind(reputationController)
);

/**
 * Recalculate user's reputation
 * POST /api/reputation/recalculate
 */
router.post(
  '/recalculate',
  authenticate,
  reputationController.recalculateReputation.bind(reputationController)
);

/**
 * Get leaderboard
 * GET /api/reputation/leaderboard
 */
router.get(
  '/leaderboard',
  validateQuery(leaderboardQuerySchema),
  reputationController.getLeaderboard.bind(reputationController)
);

// ============================================================================
// Badge Routes
// ============================================================================

/**
 * Get all badges
 * GET /api/badges
 */
router.get(
  '/badges',
  validateQuery(badgesQuerySchema),
  reputationController.getBadges.bind(reputationController)
);

/**
 * Get user's earned badges
 * GET /api/badges/my-badges
 */
router.get(
  '/badges/my-badges',
  authenticate,
  reputationController.getMyBadges.bind(reputationController)
);

// ============================================================================
// Admin Routes
// ============================================================================

/**
 * Create badge (admin only)
 * POST /api/admin/badges
 */
router.post(
  '/admin/badges',
  authenticate,
  requireAdmin,
  validateBody(createBadgeSchema),
  reputationController.createBadge.bind(reputationController)
);

/**
 * Award badge to user (admin only)
 * POST /api/admin/reputation/:userId/award-badge
 */
router.post(
  '/admin/:userId/award-badge',
  authenticate,
  requireAdmin,
  validateParams(userIdParamSchema),
  validateBody(awardBadgeSchema),
  reputationController.awardBadge.bind(reputationController)
);

export default router;
