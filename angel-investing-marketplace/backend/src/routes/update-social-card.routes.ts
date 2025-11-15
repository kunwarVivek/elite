import { Router } from 'express';
import { socialCardController } from '../controllers/social-card.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  generateSocialCardSchema,
  trackSocialShareSchema,
  getShareStatsSchema,
  getSocialCardSchema,
  regenerateSocialCardSchema,
} from '../validations/social-card.validation.js';

/**
 * Update-specific Social Card Routes
 * Routes that are nested under /api/updates/:updateId
 */
const router = Router({ mergeParams: true });

// All routes require authentication
router.use(authenticate);

/**
 * Generate social card for an update
 * POST /api/updates/:updateId/social-card
 * FR-4.2.1: Auto-generate cards from update content
 */
router.post(
  '/',
  validate(generateSocialCardSchema),
  socialCardController.generateSocialCard.bind(socialCardController)
);

/**
 * Get existing social card for an update
 * GET /api/updates/:updateId/social-card
 */
router.get(
  '/',
  validate(getSocialCardSchema),
  socialCardController.getSocialCard.bind(socialCardController)
);

/**
 * Regenerate social card for an update
 * PUT /api/updates/:updateId/social-card
 */
router.put(
  '/',
  validate(regenerateSocialCardSchema),
  socialCardController.regenerateSocialCard.bind(socialCardController)
);

/**
 * Generate card from custom template
 * POST /api/updates/:updateId/social-card/from-template
 */
router.post(
  '/from-template',
  socialCardController.generateFromTemplate.bind(socialCardController)
);

/**
 * Track social share
 * POST /api/updates/:updateId/social-share
 * FR-4.2.5: Track social engagement metrics
 */
router.post(
  '/social-share',
  validate(trackSocialShareSchema),
  socialCardController.trackShare.bind(socialCardController)
);

/**
 * Get share statistics
 * GET /api/updates/:updateId/social-stats
 * FR-4.2.5: Track social engagement metrics
 */
router.get(
  '/social-stats',
  validate(getShareStatsSchema),
  socialCardController.getShareStats.bind(socialCardController)
);

/**
 * Get share URLs for an update
 * GET /api/updates/:updateId/share-urls
 * FR-4.2.4: One-click sharing to social platforms
 */
router.get(
  '/share-urls',
  socialCardController.getShareUrls.bind(socialCardController)
);

export default router;
