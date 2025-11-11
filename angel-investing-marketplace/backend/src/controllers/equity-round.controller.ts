import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler.js';
import { sendSuccess } from '../utils/response.js';
import { logger } from '../config/logger.js';
import { equityRoundService } from '../services/equity-round.service.js';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name?: string;
    role: string;
  };
}

class EquityRoundController {
  /**
   * Create a new equity round
   * POST /api/equity-rounds
   */
  async createEquityRound(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const roundData = req.body;

      // Create equity round
      const equityRound = await equityRoundService.createEquityRound(roundData);

      sendSuccess(res, equityRound, 'Equity round created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get equity round by ID
   * GET /api/equity-rounds/:id
   */
  async getEquityRound(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const equityRound = await equityRoundService.getEquityRoundById(id);

      if (!equityRound) {
        throw new AppError('Equity round not found', 404, 'ROUND_NOT_FOUND');
      }

      sendSuccess(res, equityRound, 'Equity round retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get equity rounds by startup
   * GET /api/equity-rounds/startup/:startupId
   */
  async getEquityRoundsByStartup(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { startupId } = req.params;

      const equityRounds = await equityRoundService.getEquityRoundsByStartup(
        startupId
      );

      sendSuccess(res, equityRounds, 'Equity rounds retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get active equity rounds
   * GET /api/equity-rounds/active
   */
  async getActiveEquityRounds(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const equityRounds = await equityRoundService.getActiveEquityRounds();

      sendSuccess(res, equityRounds, 'Active equity rounds retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update equity round
   * PUT /api/equity-rounds/:id
   */
  async updateEquityRound(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const updateData = req.body;

      // Get equity round to check permissions
      const equityRound = await equityRoundService.getEquityRoundById(id);
      if (!equityRound) {
        throw new AppError('Equity round not found', 404, 'ROUND_NOT_FOUND');
      }

      // Only startup founders or admins can update rounds
      const isFounder = equityRound.startup.founderId === userId;
      const isAdmin = req.user?.role === 'ADMIN';

      if (!isFounder && !isAdmin) {
        throw new AppError(
          'Only startup founders can update equity rounds',
          403,
          'FORBIDDEN'
        );
      }

      const updatedRound = await equityRoundService.updateEquityRound(
        id,
        updateData
      );

      sendSuccess(res, updatedRound, 'Equity round updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Close equity round
   * POST /api/equity-rounds/:id/close
   */
  async closeEquityRound(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const { finalTerms } = req.body;

      // Get equity round to check permissions
      const equityRound = await equityRoundService.getEquityRoundById(id);
      if (!equityRound) {
        throw new AppError('Equity round not found', 404, 'ROUND_NOT_FOUND');
      }

      // Only startup founders or admins can close rounds
      const isFounder = equityRound.startup.founderId === userId;
      const isAdmin = req.user?.role === 'ADMIN';

      if (!isFounder && !isAdmin) {
        throw new AppError(
          'Only startup founders can close equity rounds',
          403,
          'FORBIDDEN'
        );
      }

      const closedRound = await equityRoundService.closeEquityRound(
        id,
        finalTerms
      );

      sendSuccess(res, closedRound, 'Equity round closed successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get round metrics
   * GET /api/equity-rounds/:id/metrics
   */
  async getRoundMetrics(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const metrics = await equityRoundService.calculateRoundMetrics(id);

      sendSuccess(res, metrics, 'Round metrics calculated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Record investment in round
   * POST /api/equity-rounds/:id/investments
   */
  async recordInvestment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { investmentId, amount } = req.body;
      const userId = req.user?.id;

      if (!investmentId || !amount) {
        throw new AppError(
          'Investment ID and amount are required',
          400,
          'MISSING_REQUIRED_FIELDS'
        );
      }

      // Get equity round to check permissions
      const equityRound = await equityRoundService.getEquityRoundById(id);
      if (!equityRound) {
        throw new AppError('Equity round not found', 404, 'ROUND_NOT_FOUND');
      }

      // Only startup founders or admins can record investments
      const isFounder = equityRound.startup.founderId === userId;
      const isAdmin = req.user?.role === 'ADMIN';

      if (!isFounder && !isAdmin) {
        throw new AppError(
          'Only startup founders can record investments',
          403,
          'FORBIDDEN'
        );
      }

      const newTotalRaised = await equityRoundService.recordInvestment(
        id,
        investmentId,
        amount
      );

      sendSuccess(
        res,
        { totalRaised: newTotalRaised },
        'Investment recorded successfully'
      );
    } catch (error) {
      next(error);
    }
  }
}

export const equityRoundController = new EquityRoundController();
