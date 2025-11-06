import { Request, Response, NextFunction } from 'express';
import { accreditationService } from '../services/accreditation.service.js';
import { AppError } from '../middleware/errorHandler.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { logger } from '../config/logger.js';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name?: string;
    role: string;
  };
}

/**
 * Accreditation Controller
 * Handles investor accreditation verification endpoints
 */
export class AccreditationController {
  /**
   * Submit accreditation application
   * POST /api/accreditation/submit
   */
  async submitAccreditation(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const {
        method,
        annualIncome,
        netWorth,
        professionalCertification,
        existingRelationship,
        documents,
        declaration,
      } = req.body;

      // Validate required fields
      if (!method || !documents || !declaration) {
        throw new AppError(
          'Missing required fields: method, documents, declaration',
          400,
          'MISSING_REQUIRED_FIELDS'
        );
      }

      // Validate declaration
      if (
        !declaration.iConfirmAccredited ||
        !declaration.understandRisks ||
        !declaration.signature
      ) {
        throw new AppError(
          'Declaration must confirm accreditation status and risk understanding',
          400,
          'INVALID_DECLARATION'
        );
      }

      const result = await accreditationService.submitAccreditation({
        userId,
        method,
        annualIncome: annualIncome ? parseFloat(annualIncome) : undefined,
        netWorth: netWorth ? parseFloat(netWorth) : undefined,
        professionalCertification,
        existingRelationship,
        documents,
        declaration: {
          ...declaration,
          signatureDate: new Date(declaration.signatureDate),
        },
      });

      sendSuccess(res, result, result.message, 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current accreditation status
   * GET /api/accreditation/status
   */
  async getStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const status = await accreditationService.getAccreditationStatus(userId);

      sendSuccess(res, status, 'Accreditation status retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check if user is accredited (simple boolean check)
   * GET /api/accreditation/check
   */
  async checkAccredited(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const isAccredited = await accreditationService.isAccredited(userId);

      sendSuccess(
        res,
        { isAccredited },
        isAccredited
          ? 'User is accredited'
          : 'User is not accredited or accreditation expired'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload accreditation documents
   * POST /api/accreditation/documents/upload
   */
  async uploadDocuments(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { documents } = req.body;

      if (!documents || !Array.isArray(documents) || documents.length === 0) {
        throw new AppError(
          'At least one document is required',
          400,
          'NO_DOCUMENTS'
        );
      }

      // In a real implementation, this would handle file uploads
      // For now, we expect pre-uploaded file URLs

      sendSuccess(
        res,
        { documentCount: documents.length },
        'Documents uploaded successfully',
        201
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Renew accreditation (annual renewal)
   * POST /api/accreditation/renew
   */
  async renewAccreditation(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { documents } = req.body;

      if (!documents || !Array.isArray(documents) || documents.length === 0) {
        throw new AppError(
          'Updated financial documents required for renewal',
          400,
          'NO_DOCUMENTS'
        );
      }

      const result = await accreditationService.renewAccreditation(
        userId,
        documents
      );

      sendSuccess(res, result, result.message, 200);
    } catch (error) {
      next(error);
    }
  }

  // ==================== ADMIN ENDPOINTS ====================

  /**
   * Get pending accreditations for review (Admin only)
   * GET /api/accreditation/admin/pending
   */
  async getPendingAccreditations(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || userRole !== 'ADMIN') {
        throw new AppError(
          'Unauthorized. Admin access required.',
          403,
          'FORBIDDEN'
        );
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await accreditationService.getPendingAccreditations(
        limit,
        offset
      );

      sendSuccess(
        res,
        result,
        'Pending accreditations retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify or reject accreditation (Admin only)
   * PUT /api/accreditation/admin/verify/:profileId
   */
  async verifyAccreditation(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || userRole !== 'ADMIN') {
        throw new AppError(
          'Unauthorized. Admin access required.',
          403,
          'FORBIDDEN'
        );
      }

      const { profileId } = req.params;
      const { approved, notes } = req.body;

      if (typeof approved !== 'boolean') {
        throw new AppError(
          'Approved field is required and must be boolean',
          400,
          'INVALID_INPUT'
        );
      }

      const result = await accreditationService.verifyAccreditation(
        profileId,
        userId,
        approved,
        notes
      );

      sendSuccess(res, result, result.message, 200);

      logger.info('Accreditation verification action completed', {
        adminId: userId,
        profileId,
        approved,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get accreditation details (Admin only)
   * GET /api/accreditation/admin/:userId
   */
  async getAccreditationDetails(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || userRole !== 'ADMIN') {
        throw new AppError(
          'Unauthorized. Admin access required.',
          403,
          'FORBIDDEN'
        );
      }

      const { userId: targetUserId } = req.params;

      const status = await accreditationService.getAccreditationStatus(
        targetUserId
      );

      sendSuccess(
        res,
        status,
        'Accreditation details retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get accreditation statistics (Admin only)
   * GET /api/accreditation/admin/stats
   */
  async getAccreditationStats(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || userRole !== 'ADMIN') {
        throw new AppError(
          'Unauthorized. Admin access required.',
          403,
          'FORBIDDEN'
        );
      }

      // Get statistics from database
      const [
        totalPending,
        totalVerified,
        totalRejected,
        expiringThisMonth,
      ] = await Promise.all([
        prisma.complianceProfile.count({
          where: { accreditedInvestorStatus: 'PENDING' },
        }),
        prisma.complianceProfile.count({
          where: { accreditedInvestorStatus: 'VERIFIED' },
        }),
        prisma.complianceProfile.count({
          where: { accreditedInvestorStatus: 'REJECTED' },
        }),
        prisma.complianceProfile.count({
          where: {
            accreditedInvestorStatus: 'VERIFIED',
            accreditationExpiry: {
              lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
              gte: new Date(),
            },
          },
        }),
      ]);

      const stats = {
        totalPending,
        totalVerified,
        totalRejected,
        expiringThisMonth,
        total: totalPending + totalVerified + totalRejected,
      };

      sendSuccess(
        res,
        stats,
        'Accreditation statistics retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }
}

// Add prisma import
import { prisma } from '../config/database.js';

// Export singleton instance
export const accreditationController = new AccreditationController();
