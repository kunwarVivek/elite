import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler.js';
import { sendSuccess } from '../utils/response.js';
import { logger } from '../config/logger.js';
import { convertibleNoteService } from '../services/convertible-note.service.js';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name?: string;
    role: string;
  };
}

class ConvertibleNoteController {
  /**
   * Create a new convertible note
   * POST /api/notes
   */
  async createNote(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const noteData = req.body;

      // Create convertible note
      const note = await convertibleNoteService.createConvertibleNote(noteData);

      sendSuccess(res, note, 'Convertible note created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get note by ID
   * GET /api/notes/:id
   */
  async getNote(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const note = await convertibleNoteService.getNoteById(id);

      if (!note) {
        throw new AppError('Convertible note not found', 404, 'NOTE_NOT_FOUND');
      }

      sendSuccess(res, note, 'Convertible note retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get notes by startup
   * GET /api/notes/startup/:startupId
   */
  async getNotesByStartup(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { startupId } = req.params;

      const notes = await convertibleNoteService.getNotesByStartup(startupId);

      sendSuccess(res, notes, 'Convertible notes retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get notes by investor
   * GET /api/notes/investor/:investorId
   */
  async getNotesByInvestor(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { investorId } = req.params;
      const userId = req.user?.id;

      // Users can only view their own notes unless they're admin
      if (investorId !== userId && req.user?.role !== 'ADMIN') {
        throw new AppError('Unauthorized', 403, 'FORBIDDEN');
      }

      const notes = await convertibleNoteService.getNotesByInvestor(investorId);

      sendSuccess(res, notes, 'Convertible notes retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get maturing notes (within 30 days)
   * GET /api/notes/maturing
   */
  async getMaturingNotes(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;

      // Only admins can view all maturing notes
      if (req.user?.role !== 'ADMIN') {
        throw new AppError('Unauthorized', 403, 'FORBIDDEN');
      }

      const notes = await convertibleNoteService.getMaturingNotes();

      sendSuccess(res, notes, 'Maturing notes retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Accrue interest on note
   * POST /api/notes/:id/accrue
   */
  async accrueInterest(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      // Get note to check permissions
      const note = await convertibleNoteService.getNoteById(id);
      if (!note) {
        throw new AppError('Convertible note not found', 404, 'NOTE_NOT_FOUND');
      }

      // Only startup founders or admins can accrue interest
      const isFounder = note.investment.pitch.startup.founderId === userId;
      const isAdmin = req.user?.role === 'ADMIN';

      if (!isFounder && !isAdmin) {
        throw new AppError(
          'Only startup founders can accrue interest',
          403,
          'FORBIDDEN'
        );
      }

      const updatedNote = await convertibleNoteService.accrueInterest(id);

      sendSuccess(res, updatedNote, 'Interest accrued successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Calculate accrued interest (read-only)
   * GET /api/notes/:id/interest
   */
  async calculateInterest(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const accruedInterest = await convertibleNoteService.calculateAccruedInterest(id);

      sendSuccess(
        res,
        { accruedInterest },
        'Interest calculated successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Convert note to equity
   * POST /api/notes/:id/convert
   */
  async convertNote(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { pricePerShare } = req.body;
      const userId = req.user?.id;

      if (!pricePerShare) {
        throw new AppError(
          'Price per share is required',
          400,
          'MISSING_REQUIRED_FIELDS'
        );
      }

      // Get note to check permissions
      const note = await convertibleNoteService.getNoteById(id);
      if (!note) {
        throw new AppError('Convertible note not found', 404, 'NOTE_NOT_FOUND');
      }

      // Only startup founders or admins can convert notes
      const isFounder = note.investment.pitch.startup.founderId === userId;
      const isAdmin = req.user?.role === 'ADMIN';

      if (!isFounder && !isAdmin) {
        throw new AppError(
          'Only startup founders can convert notes',
          403,
          'FORBIDDEN'
        );
      }

      const result = await convertibleNoteService.convertNote(id, pricePerShare);

      sendSuccess(res, result, 'Convertible note converted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Repay note at maturity
   * POST /api/notes/:id/repay
   */
  async repayNote(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { repaymentAmount } = req.body;
      const userId = req.user?.id;

      if (!repaymentAmount) {
        throw new AppError(
          'Repayment amount is required',
          400,
          'MISSING_REQUIRED_FIELDS'
        );
      }

      // Get note to check permissions
      const note = await convertibleNoteService.getNoteById(id);
      if (!note) {
        throw new AppError('Convertible note not found', 404, 'NOTE_NOT_FOUND');
      }

      // Only startup founders or admins can repay notes
      const isFounder = note.investment.pitch.startup.founderId === userId;
      const isAdmin = req.user?.role === 'ADMIN';

      if (!isFounder && !isAdmin) {
        throw new AppError(
          'Only startup founders can repay notes',
          403,
          'FORBIDDEN'
        );
      }

      const result = await convertibleNoteService.repayNote(id, repaymentAmount);

      sendSuccess(res, result, 'Convertible note repaid successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Calculate conversion price
   * POST /api/notes/:id/calculate-conversion
   */
  async calculateConversion(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id } = req.params;
      const { pricePerShare } = req.body;

      if (!pricePerShare) {
        throw new AppError(
          'Price per share is required',
          400,
          'MISSING_REQUIRED_FIELDS'
        );
      }

      const conversionPrice = await convertibleNoteService.calculateConversionPrice(
        id,
        pricePerShare
      );

      // Get note for total amount calculation
      const note = await convertibleNoteService.getNoteById(id);
      if (!note) {
        throw new AppError('Note not found', 404, 'NOTE_NOT_FOUND');
      }

      const accruedInterest = await convertibleNoteService.calculateAccruedInterest(id);
      const totalAmount = Number(note.principalAmount) + accruedInterest;
      const shares = Math.floor(totalAmount / conversionPrice);

      sendSuccess(
        res,
        {
          conversionPrice,
          shares,
          principalAmount: Number(note.principalAmount),
          accruedInterest,
          totalAmount,
        },
        'Conversion calculated successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check if financing is qualified
   * POST /api/notes/:id/check-qualified-financing
   */
  async checkQualifiedFinancing(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id } = req.params;
      const { roundAmount } = req.body;

      if (!roundAmount) {
        throw new AppError(
          'Round amount is required',
          400,
          'MISSING_REQUIRED_FIELDS'
        );
      }

      const isQualified = await convertibleNoteService.checkQualifiedFinancing(
        id,
        roundAmount
      );

      sendSuccess(
        res,
        { isQualified, roundAmount },
        'Qualified financing check completed'
      );
    } catch (error) {
      next(error);
    }
  }
}

export const convertibleNoteController = new ConvertibleNoteController();
