import { Router } from 'express';
import { accreditationController } from '../controllers/accreditation.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validateBody } from '../middleware/validation.js';
import {
  submitAccreditationSchema,
  uploadDocumentsSchema,
  renewAccreditationSchema,
  verifyAccreditationSchema,
} from '../validations/accreditation.validation.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ==================== USER ROUTES ====================

/**
 * Submit accreditation application
 * Requires: method, documents, declaration
 */
router.post(
  '/submit',
  validateBody(submitAccreditationSchema),
  accreditationController.submitAccreditation.bind(accreditationController)
);

/**
 * Get current user's accreditation status
 */
router.get(
  '/status',
  accreditationController.getStatus.bind(accreditationController)
);

/**
 * Quick check if user is accredited (boolean)
 */
router.get(
  '/check',
  accreditationController.checkAccredited.bind(accreditationController)
);

/**
 * Upload accreditation documents
 */
router.post(
  '/documents/upload',
  validateBody(uploadDocumentsSchema),
  accreditationController.uploadDocuments.bind(accreditationController)
);

/**
 * Renew accreditation (annual renewal)
 */
router.post(
  '/renew',
  validateBody(renewAccreditationSchema),
  accreditationController.renewAccreditation.bind(accreditationController)
);

// ==================== ADMIN ROUTES ====================

/**
 * Get pending accreditations for review
 * Admin only
 */
router.get(
  '/admin/pending',
  accreditationController.getPendingAccreditations.bind(
    accreditationController
  )
);

/**
 * Get accreditation statistics
 * Admin only
 */
router.get(
  '/admin/stats',
  accreditationController.getAccreditationStats.bind(accreditationController)
);

/**
 * Get user's accreditation details
 * Admin only
 */
router.get(
  '/admin/:userId',
  accreditationController.getAccreditationDetails.bind(accreditationController)
);

/**
 * Verify or reject accreditation
 * Admin only
 */
router.put(
  '/admin/verify/:profileId',
  validateBody(verifyAccreditationSchema),
  accreditationController.verifyAccreditation.bind(accreditationController)
);

export default router;
