import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler.js';
import { sendSuccess } from '../utils/response.js';
import { logger } from '../config/logger.js';
import { capTableService } from '../services/cap-table.service.js';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name?: string;
    role: string;
  };
}

class CapTableController {
  /**
   * Create a new cap table snapshot
   * POST /api/cap-tables
   */
  async createCapTable(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { startupId, asOfDate } = req.body;

      if (!startupId) {
        throw new AppError('Startup ID is required', 400, 'MISSING_STARTUP_ID');
      }

      // TODO: Check if user is founder or admin
      // For now, allowing any authenticated user

      const capTable = await capTableService.createCapTable({
        startupId,
        asOfDate: asOfDate ? new Date(asOfDate) : new Date(),
      });

      sendSuccess(res, capTable, 'Cap table created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get cap table by ID
   * GET /api/cap-tables/:id
   */
  async getCapTable(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const capTable = await capTableService.getCapTableById(id);

      if (!capTable) {
        throw new AppError('Cap table not found', 404, 'CAP_TABLE_NOT_FOUND');
      }

      sendSuccess(res, capTable, 'Cap table retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get latest cap table for startup
   * GET /api/cap-tables/startup/:startupId/latest
   */
  async getLatestCapTable(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { startupId } = req.params;

      const capTable = await capTableService.getLatestCapTable(startupId);

      if (!capTable) {
        throw new AppError(
          'No cap table found for this startup',
          404,
          'CAP_TABLE_NOT_FOUND'
        );
      }

      sendSuccess(res, capTable, 'Latest cap table retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get cap table history for startup
   * GET /api/cap-tables/startup/:startupId/history
   */
  async getCapTableHistory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { startupId } = req.params;

      const history = await capTableService.getCapTableHistory(startupId);

      sendSuccess(res, history, 'Cap table history retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add stakeholder to cap table
   * POST /api/cap-tables/:id/stakeholders
   */
  async addStakeholder(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const stakeholderData = req.body;
      const userId = req.user?.id;

      // Get cap table to check permissions
      const capTable = await capTableService.getCapTableById(id);
      if (!capTable) {
        throw new AppError('Cap table not found', 404, 'CAP_TABLE_NOT_FOUND');
      }

      // Only startup founders or admins can add stakeholders
      const isFounder = capTable.startup.founderId === userId;
      const isAdmin = req.user?.role === 'ADMIN';

      if (!isFounder && !isAdmin) {
        throw new AppError(
          'Only startup founders can add stakeholders',
          403,
          'FORBIDDEN'
        );
      }

      const stakeholder = await capTableService.addStakeholder({
        capTableId: id,
        ...stakeholderData,
      });

      sendSuccess(res, stakeholder, 'Stakeholder added successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Calculate dilution from new round
   * POST /api/cap-tables/startup/:startupId/dilution
   */
  async calculateDilution(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { startupId } = req.params;
      const { newInvestmentAmount, preMoneyValuation } = req.body;

      if (!newInvestmentAmount || !preMoneyValuation) {
        throw new AppError(
          'Investment amount and pre-money valuation are required',
          400,
          'MISSING_REQUIRED_FIELDS'
        );
      }

      const dilutionAnalysis = await capTableService.calculateDilution(
        startupId,
        newInvestmentAmount,
        preMoneyValuation
      );

      sendSuccess(
        res,
        dilutionAnalysis,
        'Dilution calculated successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Calculate exit waterfall
   * POST /api/cap-tables/startup/:startupId/waterfall
   */
  async calculateWaterfall(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { startupId } = req.params;
      const { exitProceeds } = req.body;

      if (!exitProceeds) {
        throw new AppError(
          'Exit proceeds amount is required',
          400,
          'MISSING_REQUIRED_FIELDS'
        );
      }

      const waterfallAnalysis = await capTableService.calculateWaterfall(
        startupId,
        exitProceeds
      );

      sendSuccess(
        res,
        waterfallAnalysis,
        'Waterfall calculated successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export cap table to Carta format
   * GET /api/cap-tables/:id/export
   */
  async exportToCartaFormat(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      // Get cap table to check permissions
      const capTable = await capTableService.getCapTableById(id);
      if (!capTable) {
        throw new AppError('Cap table not found', 404, 'CAP_TABLE_NOT_FOUND');
      }

      // Only startup founders or admins can export
      const isFounder = capTable.startup.founderId === userId;
      const isAdmin = req.user?.role === 'ADMIN';

      if (!isFounder && !isAdmin) {
        throw new AppError(
          'Only startup founders can export cap table',
          403,
          'FORBIDDEN'
        );
      }

      const cartaFormat = await capTableService.exportToCartaFormat(id);

      sendSuccess(
        res,
        cartaFormat,
        'Cap table exported to Carta format successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Record cap table event
   * POST /api/cap-tables/:id/events
   */
  async recordEvent(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const {
        eventType,
        description,
        sharesBefore,
        sharesAfter,
        roundId,
        transactionId,
      } = req.body;
      const userId = req.user?.id;

      if (!eventType || !description || !sharesBefore || !sharesAfter) {
        throw new AppError(
          'Event type, description, and shares data are required',
          400,
          'MISSING_REQUIRED_FIELDS'
        );
      }

      // Get cap table to check permissions
      const capTable = await capTableService.getCapTableById(id);
      if (!capTable) {
        throw new AppError('Cap table not found', 404, 'CAP_TABLE_NOT_FOUND');
      }

      // Only startup founders or admins can record events
      const isFounder = capTable.startup.founderId === userId;
      const isAdmin = req.user?.role === 'ADMIN';

      if (!isFounder && !isAdmin) {
        throw new AppError(
          'Only startup founders can record cap table events',
          403,
          'FORBIDDEN'
        );
      }

      const event = await capTableService.recordEvent(
        id,
        eventType,
        description,
        sharesBefore,
        sharesAfter,
        roundId,
        transactionId
      );

      sendSuccess(res, event, 'Cap table event recorded successfully', 201);
    } catch (error) {
      next(error);
    }
  }
}

export const capTableController = new CapTableController();
