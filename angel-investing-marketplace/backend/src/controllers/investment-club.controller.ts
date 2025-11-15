import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler.js';
import { sendSuccess, sendCreated } from '../utils/response.js';
import { logger } from '../config/logger.js';
import { investmentClubService } from '../services/investment-club.service.js';

/**
 * Investment Club Controller
 * Handles all HTTP requests for investment club operations
 */

// Extend Request interface for authenticated user
interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name?: string;
    role: string;
  };
  params: any;
  query: any;
  body: any;
}

class InvestmentClubController {
  // ==========================================================================
  // Club Management
  // ==========================================================================

  /**
   * Get all clubs
   * GET /api/clubs
   */
  async getClubs(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const {
        isPrivate,
        investmentFocus,
        tags,
        minMembers,
        maxMembers,
        search,
        page,
        limit,
        sortBy,
        sortOrder,
      } = req.query;

      const result = await investmentClubService.getClubs(
        {
          isPrivate: isPrivate === 'true' ? true : isPrivate === 'false' ? false : undefined,
          investmentFocus: investmentFocus as string,
          tags: tags ? (tags as string).split(',') : undefined,
          minMembers: minMembers ? parseInt(minMembers as string) : undefined,
          maxMembers: maxMembers ? parseInt(maxMembers as string) : undefined,
          search: search as string,
          page: page ? parseInt(page as string) : 1,
          limit: limit ? parseInt(limit as string) : 20,
          sortBy: sortBy as string,
          sortOrder: sortOrder as string,
        },
        userId
      );

      sendSuccess(res, {
        clubs: result.clubs,
        pagination: result.pagination,
      }, 'Clubs retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get club by slug
   * GET /api/clubs/:slug
   */
  async getClubBySlug(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { slug } = req.params;
      const userId = req.user?.id;

      const club = await investmentClubService.getClubBySlug(slug, userId);

      sendSuccess(res, { club }, 'Club retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create club
   * POST /api/clubs
   */
  async createClub(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const {
        name,
        description,
        isPrivate,
        requiresApproval,
        maxMembers,
        investmentFocus,
        minimumInvestment,
        tags,
      } = req.body;

      const club = await investmentClubService.createClub({
        name,
        description,
        leaderId: userId,
        isPrivate,
        requiresApproval,
        maxMembers,
        investmentFocus,
        minimumInvestment,
        tags,
      });

      logger.info('Club created', { clubId: club.id, userId });

      sendCreated(res, { club }, 'Club created successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update club
   * PUT /api/clubs/:id
   */
  async updateClub(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params;
      const {
        name,
        description,
        isPrivate,
        requiresApproval,
        maxMembers,
        investmentFocus,
        minimumInvestment,
        tags,
      } = req.body;

      const club = await investmentClubService.updateClub(id, userId, {
        name,
        description,
        isPrivate,
        requiresApproval,
        maxMembers,
        investmentFocus,
        minimumInvestment,
        tags,
      });

      logger.info('Club updated', { clubId: id, userId });

      sendSuccess(res, { club }, 'Club updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete club
   * DELETE /api/clubs/:id
   */
  async deleteClub(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params;

      await investmentClubService.deleteClub(id, userId);

      logger.info('Club deleted', { clubId: id, userId });

      sendSuccess(res, { deleted: true }, 'Club deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  // ==========================================================================
  // Membership Management
  // ==========================================================================

  /**
   * Join club
   * POST /api/clubs/:id/join
   */
  async joinClub(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params;

      const membership = await investmentClubService.joinClub(id, userId);

      logger.info('User joined club', { clubId: id, userId, status: membership.status });

      const message = membership.status === 'PENDING'
        ? 'Membership request submitted. Awaiting approval.'
        : 'Successfully joined club';

      sendCreated(res, { membership }, message);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Leave club
   * POST /api/clubs/:id/leave
   */
  async leaveClub(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params;

      await investmentClubService.leaveClub(id, userId);

      logger.info('User left club', { clubId: id, userId });

      sendSuccess(res, { left: true }, 'Successfully left club');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Invite user to club
   * POST /api/clubs/:id/invite
   */
  async inviteToClub(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params;
      const { userId: invitedUserId, message } = req.body;

      const membership = await investmentClubService.inviteToClub({
        clubId: id,
        userId: invitedUserId,
        invitedBy: userId,
        message,
      });

      logger.info('User invited to club', { clubId: id, invitedUserId, userId });

      sendCreated(res, { membership }, 'User invited successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get club members
   * GET /api/clubs/:id/members
   */
  async getMembers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const { role, status, page, limit, sortBy, sortOrder } = req.query;

      const result = await investmentClubService.getMembers(
        id,
        {
          role: role as any,
          status: status as any,
          page: page ? parseInt(page as string) : 1,
          limit: limit ? parseInt(limit as string) : 50,
          sortBy: sortBy as string,
          sortOrder: sortOrder as string,
        },
        userId
      );

      sendSuccess(res, {
        members: result.members,
        pagination: result.pagination,
      }, 'Members retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update member role
   * PUT /api/clubs/:id/members/:userId/role
   */
  async updateMemberRole(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const currentUserId = req.user?.id;
      if (!currentUserId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id, userId } = req.params;
      const { role } = req.body;

      const membership = await investmentClubService.updateMemberRole(
        id,
        userId,
        role,
        currentUserId
      );

      logger.info('Member role updated', { clubId: id, userId, role, currentUserId });

      sendSuccess(res, { membership }, 'Member role updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove member
   * DELETE /api/clubs/:id/members/:userId
   */
  async removeMember(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const currentUserId = req.user?.id;
      if (!currentUserId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id, userId } = req.params;

      await investmentClubService.removeMember(id, userId, currentUserId);

      logger.info('Member removed', { clubId: id, userId, currentUserId });

      sendSuccess(res, { removed: true }, 'Member removed successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Suspend member
   * POST /api/clubs/:id/members/:userId/suspend
   */
  async suspendMember(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const currentUserId = req.user?.id;
      if (!currentUserId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id, userId } = req.params;
      const { reason } = req.body;

      await investmentClubService.suspendMember(id, userId, reason, currentUserId);

      logger.info('Member suspended', { clubId: id, userId, reason, currentUserId });

      sendSuccess(res, { suspended: true }, 'Member suspended successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Approve member
   * POST /api/clubs/:id/members/:userId/approve
   */
  async approveMember(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const currentUserId = req.user?.id;
      if (!currentUserId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id, userId } = req.params;

      const membership = await investmentClubService.approveMember(id, userId, currentUserId);

      logger.info('Member approved', { clubId: id, userId, currentUserId });

      sendSuccess(res, { membership }, 'Member approved successfully');
    } catch (error) {
      next(error);
    }
  }

  // ==========================================================================
  // Discovery & Search
  // ==========================================================================

  /**
   * Discover clubs
   * GET /api/clubs/discover
   */
  async discoverClubs(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { limit } = req.query;

      const clubs = await investmentClubService.discoverClubs(
        userId,
        limit ? parseInt(limit as string) : 10
      );

      sendSuccess(res, { clubs }, 'Clubs discovered successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's clubs
   * GET /api/clubs/my-clubs
   */
  async getUserClubs(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const clubs = await investmentClubService.getUserClubs(userId);

      sendSuccess(res, { clubs }, 'User clubs retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Search clubs
   * GET /api/clubs/search
   */
  async searchClubs(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { q, page, limit } = req.query;
      const userId = req.user?.id;

      if (!q) {
        throw new AppError('Search query is required', 400, 'INVALID_REQUEST');
      }

      const result = await investmentClubService.searchClubs(
        q as string,
        page ? parseInt(page as string) : 1,
        limit ? parseInt(limit as string) : 20,
        userId
      );

      sendSuccess(res, {
        clubs: result.clubs,
        pagination: result.pagination,
      }, 'Search completed successfully');
    } catch (error) {
      next(error);
    }
  }

  // ==========================================================================
  // Analytics
  // ==========================================================================

  /**
   * Get club activity
   * GET /api/clubs/:id/activity
   */
  async getClubActivity(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const { type, page, limit } = req.query;

      const result = await investmentClubService.getClubActivity(
        id,
        {
          type: type as string,
          page: page ? parseInt(page as string) : 1,
          limit: limit ? parseInt(limit as string) : 50,
        },
        userId
      );

      sendSuccess(res, {
        activities: result.activities,
        pagination: result.pagination,
      }, 'Club activity retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get club investments
   * GET /api/clubs/:id/investments
   */
  async getClubInvestments(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const investments = await investmentClubService.getClubInvestments(id, userId);

      sendSuccess(res, { investments }, 'Club investments retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get club statistics
   * GET /api/clubs/:id/stats
   */
  async getClubStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const stats = await investmentClubService.getClubStats(id, userId);

      sendSuccess(res, { stats }, 'Club statistics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

// Export singleton instance
export const investmentClubController = new InvestmentClubController();
export default investmentClubController;
