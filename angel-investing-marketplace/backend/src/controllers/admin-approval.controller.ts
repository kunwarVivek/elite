import { Request, Response, NextFunction } from 'express';
import {
  adminApprovalService,
  ApprovalEntityType,
  ApprovalStatus,
  ApprovalPriority,
} from '../services/admin-approval.service.js';
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
 * Admin Approval Controller
 * Handles all administrative approval workflow endpoints
 */
export class AdminApprovalController {
  /**
   * Submit entity for approval
   * POST /api/admin/approvals
   */
  async submitApproval(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { entityType, entityId, priority, reason, metadata, autoApprove } = req.body;

      const approval = await adminApprovalService.submitForApproval({
        entityType,
        entityId,
        requestedBy: userId,
        priority,
        reason,
        metadata,
        autoApprove,
      });

      sendSuccess(res, approval, 'Approval request submitted successfully');

      logger.info('Approval submitted', { userId, entityType, entityId });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get approval queue with filters
   * GET /api/admin/approvals
   */
  async getApprovalQueue(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || userRole !== 'ADMIN') {
        throw new AppError('Unauthorized access', 403, 'FORBIDDEN');
      }

      const {
        entityType,
        status,
        priority,
        assignedTo,
        createdAfter,
        createdBefore,
        slaBreached,
        limit = '50',
        offset = '0',
      } = req.query;

      const filters: any = {};

      if (entityType) filters.entityType = entityType as ApprovalEntityType;
      if (status) filters.status = status as ApprovalStatus;
      if (priority) filters.priority = priority as ApprovalPriority;
      if (assignedTo) filters.assignedTo = assignedTo as string;
      if (createdAfter) filters.createdAfter = new Date(createdAfter as string);
      if (createdBefore) filters.createdBefore = new Date(createdBefore as string);
      if (slaBreached) filters.slaBreached = slaBreached === 'true';

      const queue = await adminApprovalService.getApprovalQueue(
        filters,
        parseInt(limit as string),
        parseInt(offset as string)
      );

      sendSuccess(res, queue, 'Approval queue retrieved successfully');

      logger.info('Approval queue fetched', { userId, filters });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get approval statistics
   * GET /api/admin/approvals/stats
   */
  async getApprovalStatistics(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || userRole !== 'ADMIN') {
        throw new AppError('Unauthorized access', 403, 'FORBIDDEN');
      }

      const { startDate, endDate } = req.query;

      const stats = await adminApprovalService.getApprovalStatistics(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      sendSuccess(res, stats, 'Approval statistics retrieved successfully');

      logger.info('Approval statistics fetched', { userId });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get specific approval details
   * GET /api/admin/approvals/:approvalId
   */
  async getApprovalDetails(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || userRole !== 'ADMIN') {
        throw new AppError('Unauthorized access', 403, 'FORBIDDEN');
      }

      const { approvalId } = req.params;

      const approval = await prisma.adminApproval.findUnique({
        where: { id: approvalId },
        include: {
          requester: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          reviewer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          auditLogs: {
            orderBy: {
              createdAt: 'desc',
            },
          },
        },
      });

      if (!approval) {
        throw new AppError('Approval not found', 404, 'APPROVAL_NOT_FOUND');
      }

      // Enrich with entity details based on type
      let entityDetails = null;
      try {
        switch (approval.entityType) {
          case 'INVESTMENT':
            entityDetails = await prisma.investment.findUnique({
              where: { id: approval.entityId },
              include: {
                investor: {
                  select: { id: true, name: true, email: true },
                },
                pitch: {
                  select: { id: true, title: true, companyName: true },
                },
              },
            });
            break;

          case 'PITCH':
            entityDetails = await prisma.pitch.findUnique({
              where: { id: approval.entityId },
              include: {
                startup: {
                  select: {
                    id: true,
                    companyName: true,
                    founder: {
                      select: { id: true, name: true, email: true },
                    },
                  },
                },
              },
            });
            break;

          case 'SYNDICATE':
            entityDetails = await prisma.syndicate.findUnique({
              where: { id: approval.entityId },
              include: {
                leadInvestor: {
                  select: { id: true, name: true, email: true },
                },
              },
            });
            break;

          case 'USER':
            entityDetails = await prisma.user.findUnique({
              where: { id: approval.entityId },
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
              },
            });
            break;
        }
      } catch (error) {
        logger.warn('Failed to fetch entity details', { error, entityType: approval.entityType });
      }

      const enrichedApproval = {
        ...approval,
        entityDetails,
        slaBreached: approval.slaDeadline < new Date(),
        timeRemaining: approval.slaDeadline.getTime() - Date.now(),
        waitingTime: Date.now() - approval.createdAt.getTime(),
      };

      sendSuccess(res, enrichedApproval, 'Approval details retrieved successfully');

      logger.info('Approval details fetched', { userId, approvalId });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Process approval decision
   * PUT /api/admin/approvals/:approvalId/process
   */
  async processApproval(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || userRole !== 'ADMIN') {
        throw new AppError('Unauthorized access', 403, 'FORBIDDEN');
      }

      const { approvalId } = req.params;
      const { approved, notes, requiresMoreInfo, escalate, tags } = req.body;

      const decision = {
        approved: approved === true,
        adminId: userId,
        notes,
        requiresMoreInfo,
        escalate,
        tags,
      };

      const updatedApproval = await adminApprovalService.processApproval(
        approvalId,
        decision
      );

      sendSuccess(
        res,
        updatedApproval,
        `Approval ${approved ? 'approved' : 'processed'} successfully`
      );

      logger.info('Approval processed', { userId, approvalId, approved });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reassign approval to different admin
   * PUT /api/admin/approvals/:approvalId/reassign
   */
  async reassignApproval(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || userRole !== 'ADMIN') {
        throw new AppError('Unauthorized access', 403, 'FORBIDDEN');
      }

      const { approvalId } = req.params;
      const { newAdminId } = req.body;

      if (!newAdminId) {
        throw new AppError('New admin ID is required', 400, 'MISSING_ADMIN_ID');
      }

      const approval = await adminApprovalService.reassignApproval(
        approvalId,
        newAdminId,
        userId
      );

      sendSuccess(res, approval, 'Approval reassigned successfully');

      logger.info('Approval reassigned', { userId, approvalId, newAdminId });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get my assigned approvals
   * GET /api/admin/approvals/my-queue
   */
  async getMyApprovals(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || userRole !== 'ADMIN') {
        throw new AppError('Unauthorized access', 403, 'FORBIDDEN');
      }

      const { status, limit = '50', offset = '0' } = req.query;

      const filters: any = {
        assignedTo: userId,
      };

      if (status) {
        filters.status = status as ApprovalStatus;
      }

      const queue = await adminApprovalService.getApprovalQueue(
        filters,
        parseInt(limit as string),
        parseInt(offset as string)
      );

      sendSuccess(res, queue, 'My approvals retrieved successfully');

      logger.info('My approvals fetched', { userId });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get approval history for an entity
   * GET /api/admin/approvals/entity/:entityType/:entityId
   */
  async getEntityApprovalHistory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || userRole !== 'ADMIN') {
        throw new AppError('Unauthorized access', 403, 'FORBIDDEN');
      }

      const { entityType, entityId } = req.params;

      const approvals = await prisma.adminApproval.findMany({
        where: {
          entityType: entityType as ApprovalEntityType,
          entityId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          requester: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          reviewer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      sendSuccess(res, approvals, 'Entity approval history retrieved successfully');

      logger.info('Entity approval history fetched', { userId, entityType, entityId });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get pending approvals count (for dashboard badge)
   * GET /api/admin/approvals/pending-count
   */
  async getPendingCount(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || userRole !== 'ADMIN') {
        throw new AppError('Unauthorized access', 403, 'FORBIDDEN');
      }

      const [totalPending, myPending, slaBreached] = await Promise.all([
        prisma.adminApproval.count({
          where: {
            status: {
              in: ['PENDING', 'UNDER_REVIEW', 'REQUIRES_MORE_INFO'],
            },
          },
        }),
        prisma.adminApproval.count({
          where: {
            assignedTo: userId,
            status: {
              in: ['PENDING', 'UNDER_REVIEW', 'REQUIRES_MORE_INFO'],
            },
          },
        }),
        prisma.adminApproval.count({
          where: {
            status: {
              in: ['PENDING', 'UNDER_REVIEW'],
            },
            slaDeadline: {
              lt: new Date(),
            },
          },
        }),
      ]);

      sendSuccess(
        res,
        {
          totalPending,
          myPending,
          slaBreached,
        },
        'Pending count retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk approve multiple approvals
   * POST /api/admin/approvals/bulk-approve
   */
  async bulkApprove(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId || userRole !== 'ADMIN') {
        throw new AppError('Unauthorized access', 403, 'FORBIDDEN');
      }

      const { approvalIds, notes } = req.body;

      if (!Array.isArray(approvalIds) || approvalIds.length === 0) {
        throw new AppError('Approval IDs array is required', 400, 'INVALID_INPUT');
      }

      if (approvalIds.length > 100) {
        throw new AppError(
          'Cannot bulk approve more than 100 items at once',
          400,
          'LIMIT_EXCEEDED'
        );
      }

      const results = [];
      const errors = [];

      for (const approvalId of approvalIds) {
        try {
          const approval = await adminApprovalService.processApproval(approvalId, {
            approved: true,
            adminId: userId,
            notes,
          });
          results.push({ approvalId, success: true, approval });
        } catch (error: any) {
          errors.push({ approvalId, success: false, error: error.message });
        }
      }

      sendSuccess(
        res,
        {
          results,
          errors,
          successCount: results.length,
          errorCount: errors.length,
        },
        `Bulk approval completed: ${results.length} succeeded, ${errors.length} failed`
      );

      logger.info('Bulk approve completed', {
        userId,
        total: approvalIds.length,
        succeeded: results.length,
        failed: errors.length,
      });
    } catch (error) {
      next(error);
    }
  }
}

// Add prisma import
import { prisma } from '../config/database.js';

// Export singleton instance
export const adminApprovalController = new AdminApprovalController();
