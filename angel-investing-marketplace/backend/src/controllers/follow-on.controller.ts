import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler.js';
import { sendSuccess, sendCreated } from '../utils/response.js';
import { logger } from '../config/logger.js';
import { followOnService } from '../services/follow-on.service.js';

/**
 * Follow-On Investment Controller
 * Handles all HTTP requests for follow-on investment operations
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

class FollowOnController {
  /**
   * Get user's follow-on opportunities
   * GET /api/follow-on/opportunities
   */
  async getOpportunities(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { status, startupId, expired, page, limit } = req.query;

      const result = await followOnService.getOpportunities(userId, {
        status: status as string,
        startupId: startupId as string,
        expired: expired === 'true' ? true : expired === 'false' ? false : undefined,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
      });

      sendSuccess(res, result, 'Opportunities retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get opportunity details
   * GET /api/follow-on/:id
   */
  async getOpportunityById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params;

      const opportunity = await followOnService.getOpportunityById(id, userId);

      sendSuccess(res, { opportunity }, 'Opportunity retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Exercise pro-rata right
   * POST /api/follow-on/:id/exercise
   */
  async exerciseRight(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params;
      const { amount, investmentId } = req.body;

      const opportunity = await followOnService.exerciseRight(id, userId, {
        amount,
        investmentId,
      });

      logger.info('Pro-rata right exercised', { opportunityId: id, userId, amount });

      sendSuccess(res, { opportunity }, 'Pro-rata right exercised successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Decline opportunity
   * POST /api/follow-on/:id/decline
   */
  async declineOpportunity(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params;

      const opportunity = await followOnService.declineOpportunity(id, userId);

      logger.info('Opportunity declined', { opportunityId: id, userId });

      sendSuccess(res, { opportunity }, 'Opportunity declined successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get allocation details
   * GET /api/follow-on/:id/allocation
   */
  async getAllocation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params;

      const allocation = await followOnService.calculateAllocation(id, userId);

      sendSuccess(res, { allocation }, 'Allocation calculated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create follow-on opportunities (admin only)
   * POST /api/admin/follow-on/create
   */
  async createOpportunities(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { opportunities } = req.body;

      if (!Array.isArray(opportunities) || opportunities.length === 0) {
        throw new AppError('Opportunities array is required', 400, 'INVALID_REQUEST');
      }

      const created = await followOnService.createOpportunities(opportunities);

      logger.info('Follow-on opportunities created', { count: created.length, userId });

      sendCreated(res, { opportunities: created }, 'Opportunities created successfully');
    } catch (error) {
      next(error);
    }
  }
}

// Export singleton instance
export const followOnController = new FollowOnController();
export default followOnController;
