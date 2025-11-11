import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler.js';
import { sendSuccess } from '../utils/response.js';
import { logger } from '../config/logger.js';
import { termSheetService } from '../services/term-sheet.service.js';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name?: string;
    role: string;
  };
}

class TermSheetController {
  /**
   * Create a new term sheet
   * POST /api/term-sheets
   */
  async createTermSheet(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const termSheetData = req.body;

      // Create term sheet
      const termSheet = await termSheetService.createTermSheet(termSheetData);

      sendSuccess(res, termSheet, 'Term sheet created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get term sheet by ID
   * GET /api/term-sheets/:id
   */
  async getTermSheet(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const termSheet = await termSheetService.getTermSheetById(id);

      if (!termSheet) {
        throw new AppError('Term sheet not found', 404, 'TERM_SHEET_NOT_FOUND');
      }

      sendSuccess(res, termSheet, 'Term sheet retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get term sheets by equity round
   * GET /api/term-sheets/round/:roundId
   */
  async getTermSheetsByRound(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { roundId } = req.params;

      const termSheets = await termSheetService.getTermSheetsByRound(roundId);

      sendSuccess(res, termSheets, 'Term sheets retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get term sheets by investor
   * GET /api/term-sheets/investor/:investorId
   */
  async getTermSheetsByInvestor(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { investorId } = req.params;
      const userId = req.user?.id;

      // Users can only view their own term sheets unless they're admin
      if (investorId !== userId && req.user?.role !== 'ADMIN') {
        throw new AppError('Unauthorized', 403, 'FORBIDDEN');
      }

      const termSheets = await termSheetService.getTermSheetsByInvestor(investorId);

      sendSuccess(res, termSheets, 'Term sheets retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update term sheet
   * PUT /api/term-sheets/:id
   */
  async updateTermSheet(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const updateData = req.body;

      // Get term sheet to check permissions
      const termSheet = await termSheetService.getTermSheetById(id);
      if (!termSheet) {
        throw new AppError('Term sheet not found', 404, 'TERM_SHEET_NOT_FOUND');
      }

      // Only the investor or startup founder or admins can update
      const isInvestor = termSheet.investorId === userId;
      const isFounder = termSheet.equityRound.startup.founderId === userId;
      const isAdmin = req.user?.role === 'ADMIN';

      if (!isInvestor && !isFounder && !isAdmin) {
        throw new AppError(
          'Only involved parties can update term sheets',
          403,
          'FORBIDDEN'
        );
      }

      const updatedTermSheet = await termSheetService.updateTermSheet(
        id,
        updateData
      );

      sendSuccess(res, updatedTermSheet, 'Term sheet updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Propose term sheet
   * POST /api/term-sheets/:id/propose
   */
  async proposeTermSheet(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      // Get term sheet to check permissions
      const termSheet = await termSheetService.getTermSheetById(id);
      if (!termSheet) {
        throw new AppError('Term sheet not found', 404, 'TERM_SHEET_NOT_FOUND');
      }

      // Only the investor can propose
      const isInvestor = termSheet.investorId === userId;
      const isAdmin = req.user?.role === 'ADMIN';

      if (!isInvestor && !isAdmin) {
        throw new AppError(
          'Only the investor can propose term sheets',
          403,
          'FORBIDDEN'
        );
      }

      const proposedTermSheet = await termSheetService.proposeTermSheet(id);

      sendSuccess(res, proposedTermSheet, 'Term sheet proposed successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Accept term sheet
   * POST /api/term-sheets/:id/accept
   */
  async acceptTermSheet(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      // Get term sheet to check permissions
      const termSheet = await termSheetService.getTermSheetById(id);
      if (!termSheet) {
        throw new AppError('Term sheet not found', 404, 'TERM_SHEET_NOT_FOUND');
      }

      // Only the startup founder can accept
      const isFounder = termSheet.equityRound.startup.founderId === userId;
      const isAdmin = req.user?.role === 'ADMIN';

      if (!isFounder && !isAdmin) {
        throw new AppError(
          'Only the startup founder can accept term sheets',
          403,
          'FORBIDDEN'
        );
      }

      const acceptedTermSheet = await termSheetService.acceptTermSheet(id, userId);

      sendSuccess(res, acceptedTermSheet, 'Term sheet accepted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reject term sheet
   * POST /api/term-sheets/:id/reject
   */
  async rejectTermSheet(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      // Get term sheet to check permissions
      const termSheet = await termSheetService.getTermSheetById(id);
      if (!termSheet) {
        throw new AppError('Term sheet not found', 404, 'TERM_SHEET_NOT_FOUND');
      }

      // Both investor and founder can reject
      const isInvestor = termSheet.investorId === userId;
      const isFounder = termSheet.equityRound.startup.founderId === userId;
      const isAdmin = req.user?.role === 'ADMIN';

      if (!isInvestor && !isFounder && !isAdmin) {
        throw new AppError(
          'Only involved parties can reject term sheets',
          403,
          'FORBIDDEN'
        );
      }

      const rejectedTermSheet = await termSheetService.rejectTermSheet(
        id,
        userId,
        reason
      );

      sendSuccess(res, rejectedTermSheet, 'Term sheet rejected successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new version of term sheet
   * POST /api/term-sheets/:id/version
   */
  async createNewVersion(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const changes = req.body;

      // Get term sheet to check permissions
      const termSheet = await termSheetService.getTermSheetById(id);
      if (!termSheet) {
        throw new AppError('Term sheet not found', 404, 'TERM_SHEET_NOT_FOUND');
      }

      // Both parties can create new versions
      const isInvestor = termSheet.investorId === userId;
      const isFounder = termSheet.equityRound.startup.founderId === userId;
      const isAdmin = req.user?.role === 'ADMIN';

      if (!isInvestor && !isFounder && !isAdmin) {
        throw new AppError(
          'Only involved parties can create new versions',
          403,
          'FORBIDDEN'
        );
      }

      const newVersion = await termSheetService.createNewVersion(id, changes);

      sendSuccess(res, newVersion, 'New term sheet version created successfully', 201);
    } catch (error) {
      next(error);
    }
  }
}

export const termSheetController = new TermSheetController();
