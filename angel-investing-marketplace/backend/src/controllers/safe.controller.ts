import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler.js';
import { sendSuccess } from '../utils/response.js';
import { logger } from '../config/logger.js';
import { safeService } from '../services/safe.service.js';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name?: string;
    role: string;
  };
}

class SafeController {
  /**
   * Create a new SAFE agreement
   * POST /api/safes
   */
  async createSafe(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const safeData = req.body;

      // Create SAFE
      const safe = await safeService.createSafe(safeData);

      sendSuccess(res, safe, 'SAFE agreement created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get SAFE by ID
   * GET /api/safes/:id
   */
  async getSafe(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const safe = await safeService.getSafeById(id);

      if (!safe) {
        throw new AppError('SAFE not found', 404, 'SAFE_NOT_FOUND');
      }

      sendSuccess(res, safe, 'SAFE retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get SAFEs by startup
   * GET /api/safes/startup/:startupId
   */
  async getSafesByStartup(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { startupId } = req.params;

      const safes = await safeService.getSafesByStartup(startupId);

      sendSuccess(res, safes, 'SAFEs retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get SAFEs by investor
   * GET /api/safes/investor/:investorId
   */
  async getSafesByInvestor(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { investorId } = req.params;
      const userId = req.user?.id;

      // Users can only view their own SAFEs unless they're admin
      if (investorId !== userId && req.user?.role !== 'ADMIN') {
        throw new AppError('Unauthorized', 403, 'FORBIDDEN');
      }

      const safes = await safeService.getSafesByInvestor(investorId);

      sendSuccess(res, safes, 'SAFEs retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update SAFE terms
   * PUT /api/safes/:id
   */
  async updateSafe(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const userId = req.user?.id;

      // Get SAFE to check ownership
      const safe = await safeService.getSafeById(id);
      if (!safe) {
        throw new AppError('SAFE not found', 404, 'SAFE_NOT_FOUND');
      }

      // Only startup founders or admins can update SAFE terms
      const isFounder = safe.investment.pitch.startup.founderId === userId;
      const isAdmin = req.user?.role === 'ADMIN';

      if (!isFounder && !isAdmin) {
        throw new AppError(
          'Only startup founders can update SAFE terms',
          403,
          'FORBIDDEN'
        );
      }

      const updatedSafe = await safeService.updateSafe(id, updateData);

      sendSuccess(res, updatedSafe, 'SAFE updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Convert SAFE to equity
   * POST /api/safes/:id/convert
   */
  async convertSafe(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { roundId, pricePerShare } = req.body;
      const userId = req.user?.id;

      if (!roundId || !pricePerShare) {
        throw new AppError(
          'Round ID and price per share are required',
          400,
          'MISSING_REQUIRED_FIELDS'
        );
      }

      // Get SAFE to check permissions
      const safe = await safeService.getSafeById(id);
      if (!safe) {
        throw new AppError('SAFE not found', 404, 'SAFE_NOT_FOUND');
      }

      // Only startup founders or admins can convert SAFEs
      const isFounder = safe.investment.pitch.startup.founderId === userId;
      const isAdmin = req.user?.role === 'ADMIN';

      if (!isFounder && !isAdmin) {
        throw new AppError(
          'Only startup founders can convert SAFEs',
          403,
          'FORBIDDEN'
        );
      }

      const result = await safeService.convertSafe(id, roundId, pricePerShare);

      sendSuccess(res, result, 'SAFE converted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Calculate conversion price for SAFE
   * POST /api/safes/:id/calculate-conversion
   */
  async calculateConversion(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id } = req.params;
      const { roundValuation, pricePerShare } = req.body;

      if (!roundValuation || !pricePerShare) {
        throw new AppError(
          'Round valuation and price per share are required',
          400,
          'MISSING_REQUIRED_FIELDS'
        );
      }

      const conversionPrice = await safeService.calculateConversionPrice(
        id,
        roundValuation,
        pricePerShare
      );

      const shares = await safeService.calculateConversionShares(
        id,
        conversionPrice
      );

      sendSuccess(
        res,
        { conversionPrice, shares },
        'Conversion calculated successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Dissolve SAFE
   * POST /api/safes/:id/dissolve
   */
  async dissolveSafe(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const userId = req.user?.id;

      // Get SAFE to check permissions
      const safe = await safeService.getSafeById(id);
      if (!safe) {
        throw new AppError('SAFE not found', 404, 'SAFE_NOT_FOUND');
      }

      // Only startup founders or admins can dissolve SAFEs
      const isFounder = safe.investment.pitch.startup.founderId === userId;
      const isAdmin = req.user?.role === 'ADMIN';

      if (!isFounder && !isAdmin) {
        throw new AppError(
          'Only startup founders can dissolve SAFEs',
          403,
          'FORBIDDEN'
        );
      }

      const dissolvedSafe = await safeService.dissolveSafe(id, reason);

      sendSuccess(res, dissolvedSafe, 'SAFE dissolved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check conversion triggers for a startup
   * GET /api/safes/startup/:startupId/triggers
   */
  async checkConversionTriggers(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { startupId } = req.params;

      const triggers = await safeService.checkConversionTriggers(startupId);

      sendSuccess(res, triggers, 'Conversion triggers checked successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const safeController = new SafeController();
