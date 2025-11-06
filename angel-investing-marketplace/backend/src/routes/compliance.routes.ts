import { Router } from 'express';
import { amlController } from '../controllers/aml.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validateBody } from '../middleware/validation.js';
import {
  submitKycSchema,
  reviewComplianceSchema,
} from '../validations/compliance.validation.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ==================== USER ROUTES ====================

/**
 * Submit KYC verification with comprehensive AML screening
 * Includes PEP, Sanctions, and Adverse Media checks
 */
router.post(
  '/kyc/submit',
  validateBody(submitKycSchema),
  amlController.submitKyc.bind(amlController)
);

/**
 * Get current user's compliance status
 */
router.get('/status', amlController.getComplianceStatus.bind(amlController));

/**
 * Get screening history for current user
 */
router.get('/history', amlController.getScreeningHistory.bind(amlController));

/**
 * Request re-screening (for periodic compliance updates)
 */
router.post('/rescreen', amlController.requestRescreen.bind(amlController));

// ==================== ADMIN ROUTES ====================

/**
 * Get pending compliance reviews
 * Admin only
 */
router.get(
  '/admin/pending',
  amlController.getPendingReviews.bind(amlController)
);

/**
 * Get compliance statistics
 * Admin only
 */
router.get(
  '/admin/stats',
  amlController.getComplianceStats.bind(amlController)
);

/**
 * Get detailed screening results for a user
 * Admin only
 */
router.get(
  '/admin/:userId/details',
  amlController.getScreeningDetails.bind(amlController)
);

/**
 * Review and approve/reject compliance
 * Admin only
 */
router.put(
  '/admin/:userId/review',
  validateBody(reviewComplianceSchema),
  amlController.reviewCompliance.bind(amlController)
);

export default router;
