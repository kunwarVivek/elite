import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler.js';
import { sendSuccess, sendCreated } from '../utils/response.js';
import { logger } from '../config/logger.js';
import { reputationService } from '../services/reputation.service.js';

/**
 * Reputation Controller
 * Handles all HTTP requests for reputation and badge operations
 */

// Extend Request interface for authenticated user
interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name?: string;
    role: string;
  };
}

class ReputationController {
  /**
   * Get user's own reputation
   * GET /api/reputation/me
   */
  async getMyReputation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const reputation = await reputationService.getUserReputation(userId);

      sendSuccess(res, { reputation }, 'Reputation retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get any user's reputation (public)
   * GET /api/reputation/:userId
   */
  async getUserReputation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;

      const reputation = await reputationService.getUserReputation(userId);

      sendSuccess(res, { reputation }, 'Reputation retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Recalculate user's reputation
   * POST /api/reputation/recalculate
   */
  async recalculateReputation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const reputation = await reputationService.calculateReputation(userId);

      logger.info('Reputation recalculated', { userId });

      sendSuccess(res, { reputation }, 'Reputation recalculated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get leaderboard
   * GET /api/reputation/leaderboard
   */
  async getLeaderboard(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { limit, period } = req.query;

      const leaderboard = await reputationService.getLeaderboard({
        limit: limit ? parseInt(limit as string) : 50,
        period: period as any,
      });

      sendSuccess(res, { leaderboard }, 'Leaderboard retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all badges
   * GET /api/badges
   */
  async getBadges(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { category, tier } = req.query;

      const badges = await reputationService.getBadges(
        category as string,
        tier as string
      );

      sendSuccess(res, { badges }, 'Badges retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's earned badges
   * GET /api/badges/my-badges
   */
  async getMyBadges(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const result = await reputationService.getUserBadges(userId);

      sendSuccess(res, result, 'User badges retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create badge (admin only)
   * POST /api/admin/badges
   */
  async createBadge(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { name, slug, description, icon, category, tier, criteria } = req.body;

      const badge = await reputationService.createBadge({
        name,
        slug,
        description,
        icon,
        category,
        tier,
        criteria,
      });

      logger.info('Badge created', { badgeId: badge.id, userId });

      sendCreated(res, { badge }, 'Badge created successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Award badge to user (admin only)
   * POST /api/admin/reputation/:userId/award-badge
   */
  async awardBadge(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const adminUserId = req.user?.id;
      if (!adminUserId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { userId } = req.params;
      const { badgeId } = req.body;

      const reputation = await reputationService.awardBadge(userId, badgeId);

      logger.info('Badge awarded by admin', { userId, badgeId, adminUserId });

      sendSuccess(res, { reputation }, 'Badge awarded successfully');
    } catch (error) {
      next(error);
    }
  }
}

// Export singleton instance
export const reputationController = new ReputationController();
export default reputationController;
