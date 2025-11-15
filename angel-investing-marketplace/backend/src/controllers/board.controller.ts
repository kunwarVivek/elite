import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler.js';
import { sendSuccess, sendCreated, sendPaginated, sendNoContent } from '../utils/response.js';
import { logger } from '../config/logger.js';
import { boardService } from '../services/board.service.js';
import {
  CreateBoardMeetingInput,
  UpdateBoardMeetingInput,
  ListMeetingsQuery,
  CreateBoardResolutionInput,
  UpdateBoardResolutionInput,
  ListResolutionsQuery,
  CastVoteInput,
  UpdateVoteInput,
} from '../validations/board.validation.js';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name?: string;
    role: string;
  };
}

// ============================================================================
// BOARD CONTROLLER CLASS
// ============================================================================

class BoardController {
  // ==========================================================================
  // MEETING MANAGEMENT
  // ==========================================================================

  /**
   * Create a new board meeting
   * POST /api/board/meetings
   */
  async createMeeting(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const data: CreateBoardMeetingInput = req.body;

      const meeting = await boardService.createMeeting(data, userId);

      logger.info('Board meeting created via API', { meetingId: meeting.id, userId });

      return sendCreated(res, meeting, 'Board meeting created successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get list of board meetings with filters
   * GET /api/board/meetings
   */
  async listMeetings(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const query: ListMeetingsQuery = req.query as any;

      const { meetings, total, page, limit } = await boardService.getMeetings(query, userId);

      return sendPaginated(res, meetings, page, limit, total, 'Board meetings retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get meeting by ID with resolutions
   * GET /api/board/meetings/:id
   */
  async getMeetingById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params;

      const meeting = await boardService.getMeetingById(id, userId);

      return sendSuccess(res, meeting, 'Board meeting retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update meeting details
   * PUT /api/board/meetings/:id
   */
  async updateMeeting(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params;
      const data: UpdateBoardMeetingInput = req.body;

      const meeting = await boardService.updateMeeting(id, data, userId);

      logger.info('Board meeting updated via API', { meetingId: id, userId });

      return sendSuccess(res, meeting, 'Board meeting updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete meeting
   * DELETE /api/board/meetings/:id
   */
  async deleteMeeting(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params;

      await boardService.deleteMeeting(id, userId);

      logger.info('Board meeting deleted via API', { meetingId: id, userId });

      return sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Start meeting (change status to IN_PROGRESS)
   * POST /api/board/meetings/:id/start
   */
  async startMeeting(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params;

      const meeting = await boardService.startMeeting(id, userId);

      logger.info('Board meeting started via API', { meetingId: id, userId });

      return sendSuccess(res, meeting, 'Board meeting started successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Complete meeting (finalize all resolutions)
   * POST /api/board/meetings/:id/complete
   */
  async completeMeeting(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params;

      const meeting = await boardService.completeMeeting(id, userId);

      logger.info('Board meeting completed via API', { meetingId: id, userId });

      return sendSuccess(res, meeting, 'Board meeting completed successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel meeting
   * POST /api/board/meetings/:id/cancel
   */
  async cancelMeeting(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params;
      const { reason } = req.body;

      const meeting = await boardService.cancelMeeting(id, userId, reason);

      logger.info('Board meeting cancelled via API', { meetingId: id, userId, reason });

      return sendSuccess(res, meeting, 'Board meeting cancelled successfully');
    } catch (error) {
      next(error);
    }
  }

  // ==========================================================================
  // RESOLUTION MANAGEMENT
  // ==========================================================================

  /**
   * Create resolution for a meeting
   * POST /api/board/meetings/:meetingId/resolutions
   */
  async createResolution(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { meetingId } = req.params;
      const data: CreateBoardResolutionInput = req.body;

      const resolution = await boardService.createResolution(meetingId, data, userId);

      logger.info('Board resolution created via API', { resolutionId: resolution.id, meetingId, userId });

      return sendCreated(res, resolution, 'Board resolution created successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get list of resolutions with filters
   * GET /api/board/resolutions
   */
  async listResolutions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const query: ListResolutionsQuery = req.query as any;

      const { resolutions, total, page, limit } = await boardService.getResolutions(query, userId);

      return sendPaginated(res, resolutions, page, limit, total, 'Board resolutions retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get resolution by ID with votes
   * GET /api/board/resolutions/:id
   */
  async getResolutionById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params;

      const resolution = await boardService.getResolutionById(id, userId);

      return sendSuccess(res, resolution, 'Board resolution retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update resolution
   * PUT /api/board/resolutions/:id
   */
  async updateResolution(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params;
      const data: UpdateBoardResolutionInput = req.body;

      const resolution = await boardService.updateResolution(id, data, userId);

      logger.info('Board resolution updated via API', { resolutionId: id, userId });

      return sendSuccess(res, resolution, 'Board resolution updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete resolution
   * DELETE /api/board/resolutions/:id
   */
  async deleteResolution(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params;

      await boardService.deleteResolution(id, userId);

      logger.info('Board resolution deleted via API', { resolutionId: id, userId });

      return sendNoContent(res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Propose resolution for voting
   * POST /api/board/resolutions/:id/propose
   */
  async proposeResolution(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params;

      const resolution = await boardService.proposeResolution(id, userId);

      logger.info('Board resolution proposed via API', { resolutionId: id, userId });

      return sendSuccess(res, resolution, 'Board resolution proposed successfully');
    } catch (error) {
      next(error);
    }
  }

  // ==========================================================================
  // VOTING
  // ==========================================================================

  /**
   * Cast a vote on a resolution
   * POST /api/board/resolutions/:id/vote
   */
  async castVote(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params;
      const data: CastVoteInput = req.body;

      const vote = await boardService.castVote(id, data, userId);

      logger.info('Vote cast via API', { voteId: vote.id, resolutionId: id, userId, vote: data.vote });

      return sendCreated(res, vote, 'Vote cast successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all votes for a resolution
   * GET /api/board/resolutions/:id/votes
   */
  async getVotes(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params;

      const votes = await boardService.getVotes(id, userId);

      return sendSuccess(res, votes, 'Votes retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a vote (before deadline)
   * PUT /api/board/votes/:id
   */
  async updateVote(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params;
      const data: UpdateVoteInput = req.body;

      const vote = await boardService.updateVote(id, data, userId);

      logger.info('Vote updated via API', { voteId: id, userId });

      return sendSuccess(res, vote, 'Vote updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get vote tally for a resolution
   * GET /api/board/resolutions/:id/tally
   */
  async getVoteTally(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params;

      const tally = await boardService.tallyVotes(id);

      return sendSuccess(res, tally, 'Vote tally calculated successfully');
    } catch (error) {
      next(error);
    }
  }

  // ==========================================================================
  // ANALYTICS
  // ==========================================================================

  /**
   * Get startup's board meetings
   * GET /api/board/startups/:startupId/meetings
   */
  async getStartupMeetings(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { startupId } = req.params;

      const meetings = await boardService.getStartupMeetings(startupId, userId);

      return sendSuccess(res, meetings, 'Startup meetings retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get board statistics for a startup
   * GET /api/board/startups/:startupId/stats
   */
  async getStartupStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { startupId } = req.params;

      const stats = await boardService.getStartupStats(startupId, userId);

      return sendSuccess(res, stats, 'Startup board statistics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's upcoming meetings
   * GET /api/board/my-meetings
   */
  async getMyMeetings(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const meetings = await boardService.getUserMeetings(userId);

      return sendSuccess(res, meetings, 'Your upcoming meetings retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const boardController = new BoardController();
