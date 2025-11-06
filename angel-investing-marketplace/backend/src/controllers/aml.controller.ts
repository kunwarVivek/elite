import { Request, Response, NextFunction } from 'express';
import { amlKycService } from '../services/aml-kyc.service.js';
import { AppError } from '../middleware/errorHandler.js';
import { sendSuccess } from '../utils/response.js';
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
 * AML/KYC Controller
 * Handles Anti-Money Laundering and Know Your Customer endpoints
 */
export class AmlController {
  /**
   * Submit KYC verification
   * POST /api/compliance/kyc/submit
   */
  async submitKyc(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const {
        firstName,
        lastName,
        dateOfBirth,
        nationality,
        address,
        identification,
        phoneNumber,
        occupation,
        sourceOfFunds,
      } = req.body;

      // Validate required fields
      if (
        !firstName ||
        !lastName ||
        !dateOfBirth ||
        !nationality ||
        !address ||
        !identification
      ) {
        throw new AppError(
          'Missing required KYC fields',
          400,
          'MISSING_REQUIRED_FIELDS'
        );
      }

      // Perform comprehensive screening
      const result = await amlKycService.performComprehensiveScreening({
        userId,
        firstName,
        lastName,
        dateOfBirth,
        nationality,
        address,
        identification,
        phoneNumber,
        occupation,
        sourceOfFunds,
      });

      // Determine message based on result
      let message = 'KYC verification completed successfully';
      if (result.kycStatus === 'MANUAL_REVIEW') {
        message =
          'KYC verification requires manual review. Our compliance team will review within 24 hours.';
      } else if (result.kycStatus === 'FAILED') {
        message = 'KYC verification failed. Please contact support.';
      }

      sendSuccess(
        res,
        {
          screeningId: result.screeningId,
          kycStatus: result.kycStatus,
          amlStatus: result.amlStatus,
          riskLevel: result.riskAssessment.riskLevel,
          recommendation: result.riskAssessment.recommendation,
          requiresReview:
            result.kycStatus === 'MANUAL_REVIEW' ||
            result.riskAssessment.recommendation === 'MANUAL_REVIEW',
        },
        message,
        201
      );

      logger.info('KYC submitted successfully', {
        userId,
        screeningId: result.screeningId,
        riskLevel: result.riskAssessment.riskLevel,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get KYC/AML status for current user
   * GET /api/compliance/status
   */
  async getComplianceStatus(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      // Get compliance profile
      const profile = await prisma.complianceProfile.findUnique({
        where: { userId },
        include: {
          complianceLogs: {
            where: {
              action: 'COMPREHENSIVE_SCREENING',
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      if (!profile) {
        return sendSuccess(
          res,
          {
            kycStatus: 'NOT_SUBMITTED',
            amlStatus: 'PENDING',
            message: 'KYC/AML verification not yet submitted',
          },
          'No compliance data found'
        );
      }

      // Check if screening is expired
      const needsRescreening =
        profile.nextComplianceReview &&
        new Date(profile.nextComplianceReview) < new Date();

      sendSuccess(
        res,
        {
          kycStatus: profile.kycStatus,
          kycVerifiedAt: profile.kycVerifiedAt,
          amlStatus: profile.amlStatus,
          amlVerifiedAt: profile.amlVerifiedAt,
          riskScore: profile.riskScore,
          pepStatus: profile.pepStatus,
          sanctionStatus: profile.sanctionStatus,
          lastReview: profile.lastComplianceReview,
          nextReview: profile.nextComplianceReview,
          needsRescreening,
          latestScreening: profile.complianceLogs[0] || null,
        },
        'Compliance status retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get screening history for current user
   * GET /api/compliance/history
   */
  async getScreeningHistory(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const history = await amlKycService.getScreeningHistory(userId);

      sendSuccess(
        res,
        { screenings: history, total: history.length },
        'Screening history retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Request re-screening (periodic compliance)
   * POST /api/compliance/rescreen
   */
  async requestRescreen(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const result = await amlKycService.rescreenUser(userId);

      sendSuccess(
        res,
        {
          screeningId: result.screeningId,
          kycStatus: result.kycStatus,
          amlStatus: result.amlStatus,
          riskLevel: result.riskAssessment.riskLevel,
        },
        'Re-screening completed successfully'
      );

      logger.info('User rescreened', {
        userId,
        screeningId: result.screeningId,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== ADMIN ENDPOINTS ====================

  /**
   * Get pending compliance reviews (Admin only)
   * GET /api/compliance/admin/pending
   */
  async getPendingReviews(req: AuthRequest, res: Response, next: NextFunction) {
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

      const [profiles, total] = await Promise.all([
        prisma.complianceProfile.findMany({
          where: {
            OR: [
              { kycStatus: 'PENDING' },
              { amlStatus: 'REQUIRES_REVIEW' },
              { riskScore: { gte: 60 } }, // High risk
            ],
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
              },
            },
            complianceLogs: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
          orderBy: {
            riskScore: 'desc', // Highest risk first
          },
          take: limit,
          skip: offset,
        }),
        prisma.complianceProfile.count({
          where: {
            OR: [
              { kycStatus: 'PENDING' },
              { amlStatus: 'REQUIRES_REVIEW' },
              { riskScore: { gte: 60 } },
            ],
          },
        }),
      ]);

      sendSuccess(
        res,
        {
          profiles,
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
        'Pending reviews retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get detailed screening results (Admin only)
   * GET /api/compliance/admin/:userId/details
   */
  async getScreeningDetails(
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

      const profile = await prisma.complianceProfile.findUnique({
        where: { userId: targetUserId },
        include: {
          user: true,
          complianceLogs: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
          complianceDocuments: true,
        },
      });

      if (!profile) {
        throw new AppError(
          'Compliance profile not found',
          404,
          'PROFILE_NOT_FOUND'
        );
      }

      sendSuccess(res, profile, 'Screening details retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Approve or reject compliance (Admin only)
   * PUT /api/compliance/admin/:userId/review
   */
  async reviewCompliance(req: AuthRequest, res: Response, next: NextFunction) {
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
      const { decision, notes } = req.body;

      if (!['APPROVED', 'REJECTED', 'REQUEST_MORE_INFO'].includes(decision)) {
        throw new AppError('Invalid decision', 400, 'INVALID_DECISION');
      }

      const profile = await prisma.complianceProfile.findUnique({
        where: { userId: targetUserId },
      });

      if (!profile) {
        throw new AppError(
          'Compliance profile not found',
          404,
          'PROFILE_NOT_FOUND'
        );
      }

      // Update profile based on decision
      const updatedProfile = await prisma.complianceProfile.update({
        where: { userId: targetUserId },
        data: {
          kycStatus:
            decision === 'APPROVED'
              ? 'VERIFIED'
              : decision === 'REJECTED'
              ? 'REJECTED'
              : profile.kycStatus,
          kycVerifiedAt: decision === 'APPROVED' ? new Date() : null,
          amlStatus:
            decision === 'APPROVED'
              ? 'PASSED'
              : decision === 'REJECTED'
              ? 'FAILED'
              : profile.amlStatus,
          amlVerifiedAt: decision === 'APPROVED' ? new Date() : null,
          complianceNotes: notes,
          lastComplianceReview: new Date(),
        },
      });

      // Create compliance log
      await prisma.complianceLog.create({
        data: {
          complianceProfileId: profile.id,
          action: 'MANUAL_REVIEW_COMPLETED',
          status:
            decision === 'APPROVED'
              ? 'COMPLETED'
              : decision === 'REJECTED'
              ? 'FAILED'
              : 'REQUIRES_REVIEW',
          details: {
            reviewedBy: userId,
            decision,
            notes,
            timestamp: new Date(),
          },
          performedBy: userId,
        },
      });

      // Notify user
      await prisma.notification.create({
        data: {
          userId: targetUserId,
          type: 'SYSTEM',
          title:
            decision === 'APPROVED'
              ? 'Compliance Verification Approved'
              : decision === 'REJECTED'
              ? 'Compliance Verification Rejected'
              : 'Additional Information Required',
          content:
            decision === 'APPROVED'
              ? 'Your compliance verification has been approved. You can now proceed with investments.'
              : decision === 'REJECTED'
              ? `Your compliance verification was not approved. ${notes || 'Please contact support for more information.'}`
              : `Additional information is required for your compliance verification. ${notes || ''}`,
          priority: decision === 'REJECTED' ? 'HIGH' : 'MEDIUM',
        },
      });

      sendSuccess(
        res,
        updatedProfile,
        `Compliance review completed: ${decision}`
      );

      logger.info('Compliance review completed', {
        adminId: userId,
        targetUserId,
        decision,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get compliance statistics (Admin only)
   * GET /api/compliance/admin/stats
   */
  async getComplianceStats(
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

      const [
        totalProfiles,
        kycVerified,
        kycPending,
        kycRejected,
        amlPassed,
        amlRequiresReview,
        amlFailed,
        pepMatches,
        sanctionMatches,
        highRiskProfiles,
      ] = await Promise.all([
        prisma.complianceProfile.count(),
        prisma.complianceProfile.count({ where: { kycStatus: 'VERIFIED' } }),
        prisma.complianceProfile.count({ where: { kycStatus: 'PENDING' } }),
        prisma.complianceProfile.count({ where: { kycStatus: 'REJECTED' } }),
        prisma.complianceProfile.count({ where: { amlStatus: 'PASSED' } }),
        prisma.complianceProfile.count({
          where: { amlStatus: 'REQUIRES_REVIEW' },
        }),
        prisma.complianceProfile.count({ where: { amlStatus: 'FAILED' } }),
        prisma.complianceProfile.count({
          where: { pepStatus: { in: ['PEP', 'FAMILY_MEMBER', 'CLOSE_ASSOCIATE'] } },
        }),
        prisma.complianceProfile.count({
          where: { sanctionStatus: { in: ['PARTIAL_MATCH', 'FULL_MATCH'] } },
        }),
        prisma.complianceProfile.count({ where: { riskScore: { gte: 70 } } }),
      ]);

      const stats = {
        totalProfiles,
        kyc: {
          verified: kycVerified,
          pending: kycPending,
          rejected: kycRejected,
        },
        aml: {
          passed: amlPassed,
          requiresReview: amlRequiresReview,
          failed: amlFailed,
        },
        alerts: {
          pepMatches,
          sanctionMatches,
          highRiskProfiles,
        },
      };

      sendSuccess(
        res,
        stats,
        'Compliance statistics retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }
}

// Add prisma import
import { prisma } from '../config/database.js';

// Export singleton instance
export const amlController = new AmlController();
