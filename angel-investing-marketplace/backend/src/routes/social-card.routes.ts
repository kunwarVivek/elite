import { Router } from 'express';
import { socialCardController } from '../controllers/social-card.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  generateSocialCardSchema,
  previewSocialCardSchema,
  createCustomTemplateSchema,
  trackSocialShareSchema,
  getShareStatsSchema,
  getTemplatesSchema,
  getSocialCardSchema,
  regenerateSocialCardSchema,
} from '../validations/social-card.validation.js';

/**
 * Social Card Routes
 * FR-4.2: Social Card Generation for company updates
 */
const router = Router();

// Public routes - anyone can view templates
router.get(
  '/templates',
  validate(getTemplatesSchema),
  socialCardController.getTemplates.bind(socialCardController)
);

// Authenticated routes
router.use(authenticate);

/**
 * Preview social card (without saving)
 * POST /api/social-cards/preview
 */
router.post(
  '/preview',
  validate(previewSocialCardSchema),
  socialCardController.previewSocialCard.bind(socialCardController)
);

/**
 * Create custom template
 * POST /api/social-cards/templates
 * FR-4.2.3: Custom branding with company colors/logos
 */
router.post(
  '/templates',
  validate(createCustomTemplateSchema),
  socialCardController.createCustomTemplate.bind(socialCardController)
);

/**
 * Batch generate social cards
 * POST /api/social-cards/batch
 */
router.post(
  '/batch',
  socialCardController.batchGenerateCards.bind(socialCardController)
);

export default router;
