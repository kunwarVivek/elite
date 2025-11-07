import { Router } from 'express';
import { syndicateController } from '../controllers/syndicate.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validateBody, validateParams } from '../middleware/validation.js';
import {
  createSyndicateSchema,
  updateSyndicateSchema,
  syndicateSettingsSchema,
  joinSyndicateSchema,
  updateMemberRoleSchema,
  syndicateListQuerySchema,
  syndicateMemberQuerySchema,
  syndicateDealSchema,
} from '../validations/syndicate.validation.js';

const router = Router();

// Public routes (no authentication required)
router.get('/', validateBody(syndicateListQuerySchema), syndicateController.listSyndicates.bind(syndicateController));
router.get('/:id', syndicateController.getSyndicateById.bind(syndicateController));

// All other syndicate routes require authentication
router.use(authenticate);

// Create syndicate
router.post('/', validateBody(createSyndicateSchema), syndicateController.createSyndicate.bind(syndicateController));

// Update syndicate
router.put('/:id', validateBody(updateSyndicateSchema), syndicateController.updateSyndicate.bind(syndicateController));

// Update syndicate settings
router.put('/:id/settings', validateBody(syndicateSettingsSchema), syndicateController.updateSyndicateSettings.bind(syndicateController));

// Syndicate membership
router.post('/:id/join', validateBody(joinSyndicateSchema), syndicateController.joinSyndicate.bind(syndicateController));
router.post('/:id/leave', syndicateController.leaveSyndicate.bind(syndicateController));

// Member management (lead investor or admin only)
router.put('/:id/members/:memberId/role', validateBody(updateMemberRoleSchema), syndicateController.updateMemberRole.bind(syndicateController));

// Get syndicate members
router.get('/:id/members', validateBody(syndicateMemberQuerySchema), syndicateController.getSyndicateMembersList.bind(syndicateController));

// Syndicate deals (lead investor only)
router.post('/:id/deals', validateBody(syndicateDealSchema), syndicateController.createSyndicateDeal.bind(syndicateController));

// Apply to syndicate (application-based membership)
router.post('/:id/apply', syndicateController.applySyndicate.bind(syndicateController));

// Commitment flow
router.post('/:id/commit', syndicateController.commitToSyndicate.bind(syndicateController));
router.get('/commitments/:commitmentId/payment-info', syndicateController.getCommitmentPaymentInfo.bind(syndicateController));
router.post('/commitments/:commitmentId/pay', syndicateController.processCommitmentPayment.bind(syndicateController));

export default router;