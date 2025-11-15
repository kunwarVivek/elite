import { Router } from 'express';
import { boardController } from '../controllers/board.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validation.js';
import {
  createBoardMeetingSchema,
  updateBoardMeetingSchema,
  listMeetingsQuerySchema,
  createBoardResolutionSchema,
  updateBoardResolutionSchema,
  listResolutionsQuerySchema,
  castVoteSchema,
  updateVoteSchema,
  boardMeetingIdParamSchema,
  boardResolutionIdParamSchema,
  boardVoteIdParamSchema,
  startupIdParamSchema,
  meetingIdParamSchema,
} from '../validations/board.validation.js';

const router = Router();

// ============================================================================
// ALL ROUTES REQUIRE AUTHENTICATION
// ============================================================================
router.use(authenticate);

// ============================================================================
// MEETING MANAGEMENT ROUTES
// ============================================================================

/**
 * @route   GET /api/board/meetings
 * @desc    List board meetings with filters
 * @access  Private
 */
router.get(
  '/meetings',
  validateQuery(listMeetingsQuerySchema),
  boardController.listMeetings.bind(boardController)
);

/**
 * @route   GET /api/board/meetings/:id
 * @desc    Get meeting details with resolutions
 * @access  Private
 */
router.get(
  '/meetings/:id',
  validateParams(boardMeetingIdParamSchema),
  boardController.getMeetingById.bind(boardController)
);

/**
 * @route   POST /api/board/meetings
 * @desc    Create new board meeting
 * @access  Private (Founder/Admin)
 */
router.post(
  '/meetings',
  validateBody(createBoardMeetingSchema),
  boardController.createMeeting.bind(boardController)
);

/**
 * @route   PUT /api/board/meetings/:id
 * @desc    Update meeting details
 * @access  Private (Founder/Admin)
 */
router.put(
  '/meetings/:id',
  validateParams(boardMeetingIdParamSchema),
  validateBody(updateBoardMeetingSchema),
  boardController.updateMeeting.bind(boardController)
);

/**
 * @route   DELETE /api/board/meetings/:id
 * @desc    Delete meeting
 * @access  Private (Founder/Admin)
 */
router.delete(
  '/meetings/:id',
  validateParams(boardMeetingIdParamSchema),
  boardController.deleteMeeting.bind(boardController)
);

/**
 * @route   POST /api/board/meetings/:id/start
 * @desc    Start meeting (change status to IN_PROGRESS)
 * @access  Private (Founder/Admin)
 */
router.post(
  '/meetings/:id/start',
  validateParams(boardMeetingIdParamSchema),
  boardController.startMeeting.bind(boardController)
);

/**
 * @route   POST /api/board/meetings/:id/complete
 * @desc    Complete meeting and finalize all resolutions
 * @access  Private (Founder/Admin)
 */
router.post(
  '/meetings/:id/complete',
  validateParams(boardMeetingIdParamSchema),
  boardController.completeMeeting.bind(boardController)
);

/**
 * @route   POST /api/board/meetings/:id/cancel
 * @desc    Cancel meeting
 * @access  Private (Founder/Admin)
 */
router.post(
  '/meetings/:id/cancel',
  validateParams(boardMeetingIdParamSchema),
  boardController.cancelMeeting.bind(boardController)
);

// ============================================================================
// RESOLUTION MANAGEMENT ROUTES
// ============================================================================

/**
 * @route   GET /api/board/resolutions
 * @desc    List resolutions with filters
 * @access  Private
 */
router.get(
  '/resolutions',
  validateQuery(listResolutionsQuerySchema),
  boardController.listResolutions.bind(boardController)
);

/**
 * @route   GET /api/board/resolutions/:id
 * @desc    Get resolution details with votes
 * @access  Private
 */
router.get(
  '/resolutions/:id',
  validateParams(boardResolutionIdParamSchema),
  boardController.getResolutionById.bind(boardController)
);

/**
 * @route   POST /api/board/meetings/:meetingId/resolutions
 * @desc    Create resolution for a meeting
 * @access  Private (Founder/Admin)
 */
router.post(
  '/meetings/:meetingId/resolutions',
  validateParams(meetingIdParamSchema),
  validateBody(createBoardResolutionSchema),
  boardController.createResolution.bind(boardController)
);

/**
 * @route   PUT /api/board/resolutions/:id
 * @desc    Update resolution
 * @access  Private (Founder/Admin)
 */
router.put(
  '/resolutions/:id',
  validateParams(boardResolutionIdParamSchema),
  validateBody(updateBoardResolutionSchema),
  boardController.updateResolution.bind(boardController)
);

/**
 * @route   DELETE /api/board/resolutions/:id
 * @desc    Delete resolution
 * @access  Private (Founder/Admin)
 */
router.delete(
  '/resolutions/:id',
  validateParams(boardResolutionIdParamSchema),
  boardController.deleteResolution.bind(boardController)
);

/**
 * @route   POST /api/board/resolutions/:id/propose
 * @desc    Propose resolution for voting
 * @access  Private (Founder/Admin)
 */
router.post(
  '/resolutions/:id/propose',
  validateParams(boardResolutionIdParamSchema),
  boardController.proposeResolution.bind(boardController)
);

// ============================================================================
// VOTING ROUTES
// ============================================================================

/**
 * @route   POST /api/board/resolutions/:id/vote
 * @desc    Cast vote on a resolution
 * @access  Private (Directors only)
 */
router.post(
  '/resolutions/:id/vote',
  validateParams(boardResolutionIdParamSchema),
  validateBody(castVoteSchema),
  boardController.castVote.bind(boardController)
);

/**
 * @route   GET /api/board/resolutions/:id/votes
 * @desc    Get all votes for a resolution
 * @access  Private
 */
router.get(
  '/resolutions/:id/votes',
  validateParams(boardResolutionIdParamSchema),
  boardController.getVotes.bind(boardController)
);

/**
 * @route   PUT /api/board/votes/:id
 * @desc    Update vote (before deadline)
 * @access  Private (Voter only)
 */
router.put(
  '/votes/:id',
  validateParams(boardVoteIdParamSchema),
  validateBody(updateVoteSchema),
  boardController.updateVote.bind(boardController)
);

/**
 * @route   GET /api/board/resolutions/:id/tally
 * @desc    Get vote tally for a resolution
 * @access  Private
 */
router.get(
  '/resolutions/:id/tally',
  validateParams(boardResolutionIdParamSchema),
  boardController.getVoteTally.bind(boardController)
);

// ============================================================================
// ANALYTICS ROUTES
// ============================================================================

/**
 * @route   GET /api/board/startups/:startupId/meetings
 * @desc    Get all meetings for a startup
 * @access  Private
 */
router.get(
  '/startups/:startupId/meetings',
  validateParams(startupIdParamSchema),
  boardController.getStartupMeetings.bind(boardController)
);

/**
 * @route   GET /api/board/startups/:startupId/stats
 * @desc    Get board statistics for a startup
 * @access  Private
 */
router.get(
  '/startups/:startupId/stats',
  validateParams(startupIdParamSchema),
  boardController.getStartupStats.bind(boardController)
);

/**
 * @route   GET /api/board/my-meetings
 * @desc    Get user's upcoming meetings
 * @access  Private
 */
router.get(
  '/my-meetings',
  boardController.getMyMeetings.bind(boardController)
);

export default router;
