import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler.js';
import { sendSuccess } from '../utils/response.js';
import { logger } from '../config/logger.js';
import { investorRightsService } from '../services/investor-rights.service.js';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name?: string;
    role: string;
  };
}

class InvestorRightsController {
  /**
   * Create investor rights
   * POST /api/investor-rights
   */
  async createInvestorRights(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const rightsData = req.body;

      // Create investor rights
      const investorRights = await investorRightsService.createInvestorRights(rightsData);

      sendSuccess(res, investorRights, 'Investor rights created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get investor rights by ID
   * GET /api/investor-rights/:id
   */
  async getInvestorRights(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const investorRights = await investorRightsService.getInvestorRightsById(id);

      if (!investorRights) {
        throw new AppError('Investor rights not found', 404, 'RIGHTS_NOT_FOUND');
      }

      sendSuccess(res, investorRights, 'Investor rights retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get investor rights by investment
   * GET /api/investor-rights/investment/:investmentId
   */
  async getInvestorRightsByInvestment(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { investmentId } = req.params;

      const investorRights = await investorRightsService.getInvestorRightsByInvestment(
        investmentId
      );

      sendSuccess(res, investorRights, 'Investor rights retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get investor rights by investor
   * GET /api/investor-rights/investor/:investorId
   */
  async getInvestorRightsByInvestor(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { investorId } = req.params;
      const userId = req.user?.id;

      // Users can only view their own rights unless they're admin
      if (investorId !== userId && req.user?.role !== 'ADMIN') {
        throw new AppError('Unauthorized', 403, 'FORBIDDEN');
      }

      const investorRights = await investorRightsService.getInvestorRightsByInvestor(
        investorId
      );

      sendSuccess(res, investorRights, 'Investor rights retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get investor rights by startup
   * GET /api/investor-rights/startup/:startupId
   */
  async getInvestorRightsByStartup(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { startupId } = req.params;

      const investorRights = await investorRightsService.getInvestorRightsByStartup(
        startupId
      );

      sendSuccess(res, investorRights, 'Investor rights retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update investor rights
   * PUT /api/investor-rights/:id
   */
  async updateInvestorRights(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const updateData = req.body;

      // Get investor rights to check permissions
      const investorRights = await investorRightsService.getInvestorRightsById(id);
      if (!investorRights) {
        throw new AppError('Investor rights not found', 404, 'RIGHTS_NOT_FOUND');
      }

      // Only startup founder or admin can update rights
      const isFounder = investorRights.investment.pitch.startup.founderId === userId;
      const isAdmin = req.user?.role === 'ADMIN';

      if (!isFounder && !isAdmin) {
        throw new AppError(
          'Only startup founders can update investor rights',
          403,
          'FORBIDDEN'
        );
      }

      const updatedRights = await investorRightsService.updateInvestorRights(
        id,
        updateData
      );

      sendSuccess(res, updatedRights, 'Investor rights updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Exercise pro-rata right
   * POST /api/investor-rights/:id/exercise-pro-rata
   */
  async exerciseProRataRight(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { roundId, investmentAmount } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      if (!roundId || !investmentAmount) {
        throw new AppError(
          'Round ID and investment amount are required',
          400,
          'MISSING_REQUIRED_FIELDS'
        );
      }

      // Get investor rights to check permissions
      const investorRights = await investorRightsService.getInvestorRightsById(id);
      if (!investorRights) {
        throw new AppError('Investor rights not found', 404, 'RIGHTS_NOT_FOUND');
      }

      // Only the investor can exercise their rights
      const isInvestor = investorRights.investment.investorId === userId;
      const isAdmin = req.user?.role === 'ADMIN';

      if (!isInvestor && !isAdmin) {
        throw new AppError(
          'Only the investor can exercise their rights',
          403,
          'FORBIDDEN'
        );
      }

      const exercise = await investorRightsService.exerciseProRataRight(
        id,
        roundId,
        userId,
        investmentAmount
      );

      sendSuccess(res, exercise, 'Pro-rata right exercised successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Waive investor right
   * POST /api/investor-rights/:id/waive
   */
  async waiveRight(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { rightType, reason } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      if (!rightType) {
        throw new AppError('Right type is required', 400, 'MISSING_REQUIRED_FIELDS');
      }

      // Get investor rights to check permissions
      const investorRights = await investorRightsService.getInvestorRightsById(id);
      if (!investorRights) {
        throw new AppError('Investor rights not found', 404, 'RIGHTS_NOT_FOUND');
      }

      // Only the investor can waive their rights
      const isInvestor = investorRights.investment.investorId === userId;
      const isAdmin = req.user?.role === 'ADMIN';

      if (!isInvestor && !isAdmin) {
        throw new AppError(
          'Only the investor can waive their rights',
          403,
          'FORBIDDEN'
        );
      }

      const waiver = await investorRightsService.waiveRight(
        id,
        rightType,
        userId,
        reason
      );

      sendSuccess(res, waiver, 'Right waived successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check if investor has specific right
   * GET /api/investor-rights/:id/check/:rightType
   */
  async checkRight(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id, rightType } = req.params;

      const hasRight = await investorRightsService.checkRight(id, rightType);

      sendSuccess(
        res,
        { hasRight, rightType },
        'Right check completed successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get rights summary for investor
   * GET /api/investor-rights/investor/:investorId/summary
   */
  async getRightsSummary(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { investorId } = req.params;
      const userId = req.user?.id;

      // Users can only view their own summary unless they're admin
      if (investorId !== userId && req.user?.role !== 'ADMIN') {
        throw new AppError('Unauthorized', 403, 'FORBIDDEN');
      }

      const summary = await investorRightsService.getRightsSummary(investorId);

      sendSuccess(res, summary, 'Rights summary retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const investorRightsController = new InvestorRightsController();
