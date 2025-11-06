import { Router } from 'express';
import { adminApprovalController } from '../controllers/admin-approval.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ==================== USER ENDPOINTS ====================

/**
 * Submit entity for approval
 * Available to all authenticated users
 */
router.post('/', adminApprovalController.submitApproval.bind(adminApprovalController));

// ==================== ADMIN ENDPOINTS ====================

// All subsequent routes require ADMIN role
router.use(requireRole('ADMIN'));

/**
 * Get approval queue with filters
 */
router.get('/', adminApprovalController.getApprovalQueue.bind(adminApprovalController));

/**
 * Get approval statistics
 */
router.get(
  '/stats',
  adminApprovalController.getApprovalStatistics.bind(adminApprovalController)
);

/**
 * Get my assigned approvals
 */
router.get(
  '/my-queue',
  adminApprovalController.getMyApprovals.bind(adminApprovalController)
);

/**
 * Get pending approvals count
 */
router.get(
  '/pending-count',
  adminApprovalController.getPendingCount.bind(adminApprovalController)
);

/**
 * Bulk approve multiple approvals
 */
router.post(
  '/bulk-approve',
  adminApprovalController.bulkApprove.bind(adminApprovalController)
);

/**
 * Get approval history for an entity
 */
router.get(
  '/entity/:entityType/:entityId',
  adminApprovalController.getEntityApprovalHistory.bind(adminApprovalController)
);

/**
 * Get specific approval details
 */
router.get(
  '/:approvalId',
  adminApprovalController.getApprovalDetails.bind(adminApprovalController)
);

/**
 * Process approval decision
 */
router.put(
  '/:approvalId/process',
  adminApprovalController.processApproval.bind(adminApprovalController)
);

/**
 * Reassign approval to different admin
 */
router.put(
  '/:approvalId/reassign',
  adminApprovalController.reassignApproval.bind(adminApprovalController)
);

export default router;
