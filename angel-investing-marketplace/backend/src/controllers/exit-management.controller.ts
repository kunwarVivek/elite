import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler.js';
import { sendSuccess } from '../utils/response.js';
import { logger } from '../config/logger.js';
import { exitManagementService } from '../services/exit-management.service.js';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name?: string;
    role: string;
  };
}

class ExitManagementController {
  /**
   * Create exit event
   * POST /api/exit-events
   */
  async createExitEvent(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const exitEventData = req.body;

      // Create exit event
      const exitEvent = await exitManagementService.createExitEvent(exitEventData);

      sendSuccess(res, exitEvent, 'Exit event created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get exit event by ID
   * GET /api/exit-events/:id
   */
  async getExitEvent(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const exitEvent = await exitManagementService.getExitEventById(id);

      if (!exitEvent) {
        throw new AppError('Exit event not found', 404, 'EXIT_EVENT_NOT_FOUND');
      }

      sendSuccess(res, exitEvent, 'Exit event retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get exit events by startup
   * GET /api/exit-events/startup/:startupId
   */
  async getExitEventsByStartup(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { startupId } = req.params;

      const exitEvents = await exitManagementService.getExitEventsByStartup(startupId);

      sendSuccess(res, exitEvents, 'Exit events retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all exit events
   * GET /api/exit-events
   */
  async getAllExitEvents(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { status } = req.query;

      const exitEvents = await exitManagementService.getAllExitEvents(
        status as string
      );

      sendSuccess(res, exitEvents, 'Exit events retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update exit event
   * PUT /api/exit-events/:id
   */
  async updateExitEvent(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const updateData = req.body;

      // Get exit event to check permissions
      const exitEvent = await exitManagementService.getExitEventById(id);
      if (!exitEvent) {
        throw new AppError('Exit event not found', 404, 'EXIT_EVENT_NOT_FOUND');
      }

      // Only startup founder or admin can update
      const isFounder = exitEvent.startup.founderId === userId;
      const isAdmin = req.user?.role === 'ADMIN';

      if (!isFounder && !isAdmin) {
        throw new AppError(
          'Only startup founders can update exit events',
          403,
          'FORBIDDEN'
        );
      }

      const updatedEvent = await exitManagementService.updateExitEvent(id, updateData);

      sendSuccess(res, updatedEvent, 'Exit event updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Calculate exit distributions
   * GET /api/exit-events/:id/calculate-distributions
   */
  async calculateDistributions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const distributions = await exitManagementService.calculateExitDistributions(id);

      sendSuccess(res, distributions, 'Exit distributions calculated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create distribution
   * POST /api/exit-events/:id/distributions
   */
  async createDistribution(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const distributionData = {
        ...req.body,
        exitEventId: id,
      };

      // Get exit event to check permissions
      const exitEvent = await exitManagementService.getExitEventById(id);
      if (!exitEvent) {
        throw new AppError('Exit event not found', 404, 'EXIT_EVENT_NOT_FOUND');
      }

      // Only startup founder or admin can create distributions
      const isFounder = exitEvent.startup.founderId === userId;
      const isAdmin = req.user?.role === 'ADMIN';

      if (!isFounder && !isAdmin) {
        throw new AppError(
          'Only startup founders can create distributions',
          403,
          'FORBIDDEN'
        );
      }

      const distribution = await exitManagementService.createDistribution(
        distributionData
      );

      sendSuccess(res, distribution, 'Distribution created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get distributions by exit event
   * GET /api/exit-events/:id/distributions
   */
  async getDistributionsByExitEvent(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id } = req.params;

      const distributions = await exitManagementService.getDistributionsByExitEvent(
        id
      );

      sendSuccess(res, distributions, 'Distributions retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get distributions by investor
   * GET /api/exit-events/investor/:investorId/distributions
   */
  async getDistributionsByInvestor(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { investorId } = req.params;
      const userId = req.user?.id;

      // Users can only view their own distributions unless they're admin
      if (investorId !== userId && req.user?.role !== 'ADMIN') {
        throw new AppError('Unauthorized', 403, 'FORBIDDEN');
      }

      const distributions = await exitManagementService.getDistributionsByInvestor(
        investorId
      );

      sendSuccess(res, distributions, 'Distributions retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Process distribution
   * POST /api/exit-events/distributions/:distributionId/process
   */
  async processDistribution(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { distributionId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      // Only admin can process distributions
      if (req.user?.role !== 'ADMIN') {
        throw new AppError(
          'Only admins can process distributions',
          403,
          'FORBIDDEN'
        );
      }

      const distribution = await exitManagementService.processDistribution(
        distributionId,
        userId
      );

      sendSuccess(res, distribution, 'Distribution processing started');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Complete distribution
   * POST /api/exit-events/distributions/:distributionId/complete
   */
  async completeDistribution(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { distributionId } = req.params;
      const { transactionRef } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      // Only admin can complete distributions
      if (req.user?.role !== 'ADMIN') {
        throw new AppError(
          'Only admins can complete distributions',
          403,
          'FORBIDDEN'
        );
      }

      const distribution = await exitManagementService.completeDistribution(
        distributionId,
        userId,
        transactionRef
      );

      sendSuccess(res, distribution, 'Distribution completed successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get exit metrics for startup
   * GET /api/exit-events/startup/:startupId/metrics
   */
  async getExitMetrics(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { startupId } = req.params;

      const metrics = await exitManagementService.getExitMetrics(startupId);

      sendSuccess(res, metrics, 'Exit metrics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const exitManagementController = new ExitManagementController();
