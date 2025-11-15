import { Router } from 'express';
import { investmentClubController } from '../controllers/investment-club.controller.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validation.js';
import {
  sqlInjectionPrevention,
  xssPrevention,
  inputSanitization
} from '../middleware/security.js';
import {
  createClubSchema,
  updateClubSchema,
  clubListQuerySchema,
  clubDiscoverQuerySchema,
  clubSearchQuerySchema,
  clubActivityQuerySchema,
  clubStatsQuerySchema,
  inviteMemberSchema,
  updateMemberRoleSchema,
  suspendMemberSchema,
  memberListQuerySchema,
  clubIdParamSchema,
  clubSlugParamSchema,
  userIdParamSchema,
  clubAndUserParamSchema,
} from '../validations/investment-club.validation.js';

const router = Router();

// Apply security middleware to all routes
router.use(sqlInjectionPrevention);
router.use(xssPrevention);
router.use(inputSanitization);

// ============================================================================
// Discovery Routes (must come before /:slug to avoid route conflicts)
// ============================================================================

// Discover clubs to join
router.get(
  '/discover',
  authenticate,
  validateQuery(clubDiscoverQuerySchema),
  investmentClubController.discoverClubs.bind(investmentClubController)
);

// Get user's clubs
router.get(
  '/my-clubs',
  authenticate,
  investmentClubController.getUserClubs.bind(investmentClubController)
);

// Search clubs
router.get(
  '/search',
  optionalAuth,
  validateQuery(clubSearchQuerySchema),
  investmentClubController.searchClubs.bind(investmentClubController)
);

// ============================================================================
// Club Management Routes
// ============================================================================

// Get all clubs
router.get(
  '/',
  optionalAuth,
  validateQuery(clubListQuerySchema),
  investmentClubController.getClubs.bind(investmentClubController)
);

// Get club by slug
router.get(
  '/:slug',
  optionalAuth,
  validateParams(clubSlugParamSchema),
  investmentClubController.getClubBySlug.bind(investmentClubController)
);

// Create club (authenticated)
router.post(
  '/',
  authenticate,
  validateBody(createClubSchema),
  investmentClubController.createClub.bind(investmentClubController)
);

// Update club (leader only)
router.put(
  '/:id',
  authenticate,
  validateParams(clubIdParamSchema),
  validateBody(updateClubSchema),
  investmentClubController.updateClub.bind(investmentClubController)
);

// Delete club (leader only)
router.delete(
  '/:id',
  authenticate,
  validateParams(clubIdParamSchema),
  investmentClubController.deleteClub.bind(investmentClubController)
);

// ============================================================================
// Membership Routes
// ============================================================================

// Join club
router.post(
  '/:id/join',
  authenticate,
  validateParams(clubIdParamSchema),
  investmentClubController.joinClub.bind(investmentClubController)
);

// Leave club
router.post(
  '/:id/leave',
  authenticate,
  validateParams(clubIdParamSchema),
  investmentClubController.leaveClub.bind(investmentClubController)
);

// Invite user to club (leader/co-leader only)
router.post(
  '/:id/invite',
  authenticate,
  validateParams(clubIdParamSchema),
  validateBody(inviteMemberSchema),
  investmentClubController.inviteToClub.bind(investmentClubController)
);

// Get club members
router.get(
  '/:id/members',
  optionalAuth,
  validateParams(clubIdParamSchema),
  validateQuery(memberListQuerySchema),
  investmentClubController.getMembers.bind(investmentClubController)
);

// Approve member (leader/co-leader only)
router.post(
  '/:id/members/:userId/approve',
  authenticate,
  validateParams(clubAndUserParamSchema),
  investmentClubController.approveMember.bind(investmentClubController)
);

// Update member role (leader only)
router.put(
  '/:id/members/:userId/role',
  authenticate,
  validateParams(clubAndUserParamSchema),
  validateBody(updateMemberRoleSchema),
  investmentClubController.updateMemberRole.bind(investmentClubController)
);

// Remove member (leader/co-leader only)
router.delete(
  '/:id/members/:userId',
  authenticate,
  validateParams(clubAndUserParamSchema),
  investmentClubController.removeMember.bind(investmentClubController)
);

// Suspend member (leader only)
router.post(
  '/:id/members/:userId/suspend',
  authenticate,
  validateParams(clubAndUserParamSchema),
  validateBody(suspendMemberSchema),
  investmentClubController.suspendMember.bind(investmentClubController)
);

// ============================================================================
// Activity & Analytics Routes
// ============================================================================

// Get club activity feed
router.get(
  '/:id/activity',
  optionalAuth,
  validateParams(clubIdParamSchema),
  validateQuery(clubActivityQuerySchema),
  investmentClubController.getClubActivity.bind(investmentClubController)
);

// Get club's collective investments
router.get(
  '/:id/investments',
  optionalAuth,
  validateParams(clubIdParamSchema),
  investmentClubController.getClubInvestments.bind(investmentClubController)
);

// Get club statistics
router.get(
  '/:id/stats',
  optionalAuth,
  validateParams(clubIdParamSchema),
  validateQuery(clubStatsQuerySchema),
  investmentClubController.getClubStats.bind(investmentClubController)
);

export default router;
