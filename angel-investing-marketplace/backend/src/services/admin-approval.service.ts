import { logger } from '../config/logger.js';
import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Admin Approval Service
 * Handles all administrative approval workflows across the platform
 * - Investment approvals
 * - Pitch approvals
 * - Syndicate approvals
 * - User account approvals
 * - KYC/AML review (already implemented, integration here)
 * - Accreditation verification (already implemented, integration here)
 */

export type ApprovalEntityType =
  | 'INVESTMENT'
  | 'PITCH'
  | 'SYNDICATE'
  | 'USER'
  | 'KYC'
  | 'ACCREDITATION'
  | 'SPV'
  | 'DOCUMENT';

export type ApprovalStatus =
  | 'PENDING'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'REQUIRES_MORE_INFO'
  | 'ESCALATED';

export type ApprovalPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface ApprovalRequest {
  entityType: ApprovalEntityType;
  entityId: string;
  requestedBy: string;
  priority?: ApprovalPriority;
  reason?: string;
  metadata?: Record<string, any>;
  autoApprove?: boolean;
}

export interface ApprovalDecision {
  approved: boolean;
  adminId: string;
  notes?: string;
  requiresMoreInfo?: boolean;
  escalate?: boolean;
  tags?: string[];
}

export interface ApprovalQueueFilters {
  entityType?: ApprovalEntityType;
  status?: ApprovalStatus;
  priority?: ApprovalPriority;
  assignedTo?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  slaBreached?: boolean;
}

export interface ApprovalStatistics {
  total: number;
  pending: number;
  underReview: number;
  approved: number;
  rejected: number;
  requiresMoreInfo: number;
  escalated: number;
  avgProcessingTime: number;
  slaBreached: number;
  byEntityType: Record<ApprovalEntityType, number>;
  byPriority: Record<ApprovalPriority, number>;
}

export class AdminApprovalService {
  // SLA times in hours
  private readonly SLA_TIMES = {
    URGENT: 4, // 4 hours
    HIGH: 24, // 1 day
    MEDIUM: 72, // 3 days
    LOW: 168, // 7 days
  };

  /**
   * Submit an entity for admin approval
   */
  async submitForApproval(request: ApprovalRequest) {
    try {
      logger.info('Submitting entity for approval', {
        entityType: request.entityType,
        entityId: request.entityId,
      });

      // Check if already has pending approval
      const existingApproval = await prisma.adminApproval.findFirst({
        where: {
          entityType: request.entityType,
          entityId: request.entityId,
          status: {
            in: ['PENDING', 'UNDER_REVIEW', 'REQUIRES_MORE_INFO'],
          },
        },
      });

      if (existingApproval) {
        throw new AppError(
          'Entity already has a pending approval request',
          400,
          'APPROVAL_ALREADY_EXISTS'
        );
      }

      // Determine priority if not specified
      const priority = request.priority || this.determinePriority(request);

      // Calculate SLA deadline
      const slaDeadline = this.calculateSlaDeadline(priority);

      // Auto-approve logic
      if (request.autoApprove && this.canAutoApprove(request)) {
        return await this.autoApprove(request);
      }

      // Create approval request
      const approval = await prisma.adminApproval.create({
        data: {
          entityType: request.entityType,
          entityId: request.entityId,
          requestedBy: request.requestedBy,
          status: 'PENDING',
          priority,
          reason: request.reason,
          metadata: request.metadata || {},
          slaDeadline,
        },
      });

      // Create audit log
      await this.createAuditLog({
        approvalId: approval.id,
        action: 'SUBMITTED',
        performedBy: request.requestedBy,
        details: { priority, reason: request.reason },
      });

      // Assign to available admin
      await this.assignToAdmin(approval.id, priority);

      // Send notification to admins
      await this.notifyAdmins(approval);

      logger.info('Approval request created', { approvalId: approval.id });

      return approval;
    } catch (error) {
      logger.error('Failed to submit for approval', { error, request });
      throw error;
    }
  }

  /**
   * Process approval decision
   */
  async processApproval(approvalId: string, decision: ApprovalDecision) {
    try {
      logger.info('Processing approval decision', { approvalId, decision });

      // Get approval request
      const approval = await prisma.adminApproval.findUnique({
        where: { id: approvalId },
      });

      if (!approval) {
        throw new AppError('Approval request not found', 404, 'APPROVAL_NOT_FOUND');
      }

      if (approval.status === 'APPROVED' || approval.status === 'REJECTED') {
        throw new AppError(
          'Approval request already processed',
          400,
          'APPROVAL_ALREADY_PROCESSED'
        );
      }

      // Handle escalation
      if (decision.escalate) {
        return await this.escalateApproval(approvalId, decision);
      }

      // Handle requires more info
      if (decision.requiresMoreInfo) {
        return await this.requestMoreInfo(approvalId, decision);
      }

      // Determine new status
      const newStatus: ApprovalStatus = decision.approved ? 'APPROVED' : 'REJECTED';

      // Update approval
      const updatedApproval = await prisma.adminApproval.update({
        where: { id: approvalId },
        data: {
          status: newStatus,
          reviewedBy: decision.adminId,
          reviewedAt: new Date(),
          reviewNotes: decision.notes,
          tags: decision.tags || [],
        },
      });

      // Create audit log
      await this.createAuditLog({
        approvalId,
        action: decision.approved ? 'APPROVED' : 'REJECTED',
        performedBy: decision.adminId,
        details: { notes: decision.notes, tags: decision.tags },
      });

      // Execute approval action on the entity
      await this.executeApprovalAction(updatedApproval, decision.approved);

      // Send notification to requester
      await this.notifyRequester(updatedApproval, decision.approved);

      logger.info('Approval decision processed', {
        approvalId,
        status: newStatus,
        adminId: decision.adminId,
      });

      return updatedApproval;
    } catch (error) {
      logger.error('Failed to process approval', { error, approvalId });
      throw error;
    }
  }

  /**
   * Get approval queue with filters
   */
  async getApprovalQueue(
    filters: ApprovalQueueFilters = {},
    limit = 50,
    offset = 0
  ) {
    try {
      const where: any = {};

      if (filters.entityType) {
        where.entityType = filters.entityType;
      }

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.priority) {
        where.priority = filters.priority;
      }

      if (filters.assignedTo) {
        where.assignedTo = filters.assignedTo;
      }

      if (filters.createdAfter || filters.createdBefore) {
        where.createdAt = {};
        if (filters.createdAfter) where.createdAt.gte = filters.createdAfter;
        if (filters.createdBefore) where.createdAt.lte = filters.createdBefore;
      }

      if (filters.slaBreached) {
        where.slaDeadline = { lt: new Date() };
        where.status = { in: ['PENDING', 'UNDER_REVIEW'] };
      }

      const [approvals, total] = await Promise.all([
        prisma.adminApproval.findMany({
          where,
          take: limit,
          skip: offset,
          orderBy: [
            { priority: 'desc' }, // URGENT > HIGH > MEDIUM > LOW
            { createdAt: 'asc' }, // Oldest first
          ],
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
            assignee: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        }),
        prisma.adminApproval.count({ where }),
      ]);

      // Add SLA breach flag and time remaining
      const enrichedApprovals = approvals.map((approval) => ({
        ...approval,
        slaBreached: approval.slaDeadline < new Date(),
        timeRemaining: this.calculateTimeRemaining(approval.slaDeadline),
        waitingTime: Date.now() - approval.createdAt.getTime(),
      }));

      return {
        approvals: enrichedApprovals,
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      };
    } catch (error) {
      logger.error('Failed to get approval queue', { error, filters });
      throw error;
    }
  }

  /**
   * Get approval statistics
   */
  async getApprovalStatistics(
    startDate?: Date,
    endDate?: Date
  ): Promise<ApprovalStatistics> {
    try {
      const where: any = {};

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      const approvals = await prisma.adminApproval.findMany({
        where,
        select: {
          status: true,
          entityType: true,
          priority: true,
          createdAt: true,
          reviewedAt: true,
          slaDeadline: true,
        },
      });

      const total = approvals.length;
      const pending = approvals.filter((a) => a.status === 'PENDING').length;
      const underReview = approvals.filter((a) => a.status === 'UNDER_REVIEW').length;
      const approved = approvals.filter((a) => a.status === 'APPROVED').length;
      const rejected = approvals.filter((a) => a.status === 'REJECTED').length;
      const requiresMoreInfo = approvals.filter(
        (a) => a.status === 'REQUIRES_MORE_INFO'
      ).length;
      const escalated = approvals.filter((a) => a.status === 'ESCALATED').length;

      // Calculate average processing time
      const processedApprovals = approvals.filter((a) => a.reviewedAt);
      const totalProcessingTime = processedApprovals.reduce(
        (sum, a) => sum + (a.reviewedAt!.getTime() - a.createdAt.getTime()),
        0
      );
      const avgProcessingTime =
        processedApprovals.length > 0
          ? totalProcessingTime / processedApprovals.length / 1000 / 60 / 60
          : 0; // in hours

      // Calculate SLA breaches
      const slaBreached = approvals.filter(
        (a) =>
          ['PENDING', 'UNDER_REVIEW'].includes(a.status) && a.slaDeadline < new Date()
      ).length;

      // Group by entity type
      const byEntityType = approvals.reduce((acc, a) => {
        acc[a.entityType] = (acc[a.entityType] || 0) + 1;
        return acc;
      }, {} as Record<ApprovalEntityType, number>);

      // Group by priority
      const byPriority = approvals.reduce((acc, a) => {
        acc[a.priority] = (acc[a.priority] || 0) + 1;
        return acc;
      }, {} as Record<ApprovalPriority, number>);

      return {
        total,
        pending,
        underReview,
        approved,
        rejected,
        requiresMoreInfo,
        escalated,
        avgProcessingTime,
        slaBreached,
        byEntityType,
        byPriority,
      };
    } catch (error) {
      logger.error('Failed to get approval statistics', { error });
      throw error;
    }
  }

  /**
   * Assign approval to admin
   */
  async assignToAdmin(approvalId: string, priority: ApprovalPriority) {
    try {
      // Get available admins (those with fewest pending assignments)
      const admins = await prisma.user.findMany({
        where: {
          role: 'ADMIN',
          isActive: true,
        },
        select: {
          id: true,
          assignedApprovals: {
            where: {
              status: {
                in: ['PENDING', 'UNDER_REVIEW', 'REQUIRES_MORE_INFO'],
              },
            },
            select: {
              id: true,
            },
          },
        },
      });

      if (admins.length === 0) {
        logger.warn('No available admins for assignment', { approvalId });
        return;
      }

      // Find admin with least pending approvals
      const leastBusyAdmin = admins.reduce((prev, curr) =>
        curr.assignedApprovals.length < prev.assignedApprovals.length ? curr : prev
      );

      // Assign to admin
      await prisma.adminApproval.update({
        where: { id: approvalId },
        data: { assignedTo: leastBusyAdmin.id },
      });

      logger.info('Approval assigned to admin', {
        approvalId,
        adminId: leastBusyAdmin.id,
        pendingCount: leastBusyAdmin.assignedApprovals.length,
      });
    } catch (error) {
      logger.error('Failed to assign to admin', { error, approvalId });
      // Don't throw - assignment is not critical
    }
  }

  /**
   * Reassign approval to different admin
   */
  async reassignApproval(approvalId: string, newAdminId: string, reassignedBy: string) {
    try {
      const approval = await prisma.adminApproval.update({
        where: { id: approvalId },
        data: { assignedTo: newAdminId },
      });

      await this.createAuditLog({
        approvalId,
        action: 'REASSIGNED',
        performedBy: reassignedBy,
        details: { newAdminId },
      });

      return approval;
    } catch (error) {
      logger.error('Failed to reassign approval', { error, approvalId });
      throw error;
    }
  }

  /**
   * Escalate approval to higher level
   */
  private async escalateApproval(approvalId: string, decision: ApprovalDecision) {
    const approval = await prisma.adminApproval.update({
      where: { id: approvalId },
      data: {
        status: 'ESCALATED',
        priority: 'URGENT', // Escalations become urgent
        reviewNotes: decision.notes,
      },
    });

    await this.createAuditLog({
      approvalId,
      action: 'ESCALATED',
      performedBy: decision.adminId,
      details: { reason: decision.notes },
    });

    // Notify senior admins
    await this.notifySeniorAdmins(approval);

    return approval;
  }

  /**
   * Request more information
   */
  private async requestMoreInfo(approvalId: string, decision: ApprovalDecision) {
    const approval = await prisma.adminApproval.update({
      where: { id: approvalId },
      data: {
        status: 'REQUIRES_MORE_INFO',
        reviewedBy: decision.adminId,
        reviewNotes: decision.notes,
      },
    });

    await this.createAuditLog({
      approvalId,
      action: 'MORE_INFO_REQUESTED',
      performedBy: decision.adminId,
      details: { notes: decision.notes },
    });

    // Notify requester
    await this.notifyRequesterMoreInfo(approval, decision.notes || '');

    return approval;
  }

  /**
   * Execute approval action on the entity
   */
  private async executeApprovalAction(
    approval: any,
    approved: boolean
  ): Promise<void> {
    try {
      switch (approval.entityType) {
        case 'INVESTMENT':
          await this.processInvestmentApproval(approval.entityId, approved);
          break;

        case 'PITCH':
          await this.processPitchApproval(approval.entityId, approved);
          break;

        case 'SYNDICATE':
          await this.processSyndicateApproval(approval.entityId, approved);
          break;

        case 'USER':
          await this.processUserApproval(approval.entityId, approved);
          break;

        case 'SPV':
          await this.processSpvApproval(approval.entityId, approved);
          break;

        case 'KYC':
        case 'ACCREDITATION':
          // Already handled by their respective services
          break;

        default:
          logger.warn('Unknown entity type for approval action', {
            entityType: approval.entityType,
          });
      }
    } catch (error) {
      logger.error('Failed to execute approval action', { error, approval });
      throw error;
    }
  }

  /**
   * Process investment approval
   */
  private async processInvestmentApproval(investmentId: string, approved: boolean) {
    await prisma.investment.update({
      where: { id: investmentId },
      data: {
        status: approved ? 'APPROVED' : 'REJECTED',
        approvedAt: approved ? new Date() : null,
      },
    });

    // Create notification for investor
    const investment = await prisma.investment.findUnique({
      where: { id: investmentId },
      include: { investor: true, pitch: true },
    });

    if (investment) {
      await prisma.notification.create({
        data: {
          userId: investment.investorId,
          type: 'INVESTMENT',
          title: approved
            ? 'Investment Approved'
            : 'Investment Rejected',
          content: approved
            ? `Your investment of $${investment.amount} in ${investment.pitch.companyName} has been approved and is now being processed.`
            : `Your investment of $${investment.amount} in ${investment.pitch.companyName} was not approved. Please contact support for more information.`,
          priority: 'HIGH',
        },
      });
    }
  }

  /**
   * Process pitch approval
   */
  private async processPitchApproval(pitchId: string, approved: boolean) {
    await prisma.pitch.update({
      where: { id: pitchId },
      data: {
        status: approved ? 'ACTIVE' : 'REJECTED',
        approvedAt: approved ? new Date() : null,
      },
    });

    // Create notification for founder
    const pitch = await prisma.pitch.findUnique({
      where: { id: pitchId },
      include: { startup: { include: { founder: true } } },
    });

    if (pitch?.startup.founder) {
      await prisma.notification.create({
        data: {
          userId: pitch.startup.founder.id,
          type: 'PITCH',
          title: approved ? 'Pitch Approved' : 'Pitch Rejected',
          content: approved
            ? `Your pitch for ${pitch.companyName} has been approved and is now live on the platform!`
            : `Your pitch for ${pitch.companyName} requires revisions. Please check your email for feedback.`,
          priority: 'HIGH',
        },
      });
    }
  }

  /**
   * Process syndicate approval
   */
  private async processSyndicateApproval(syndicateId: string, approved: boolean) {
    await prisma.syndicate.update({
      where: { id: syndicateId },
      data: {
        status: approved ? 'ACTIVE' : 'REJECTED',
        approvedAt: approved ? new Date() : null,
      },
    });

    // Create notification for lead
    const syndicate = await prisma.syndicate.findUnique({
      where: { id: syndicateId },
      include: { leadInvestor: true },
    });

    if (syndicate?.leadInvestor) {
      await prisma.notification.create({
        data: {
          userId: syndicate.leadInvestor.id,
          type: 'SYNDICATE',
          title: approved ? 'Syndicate Approved' : 'Syndicate Rejected',
          content: approved
            ? `Your syndicate "${syndicate.name}" has been approved and is ready for investors!`
            : `Your syndicate "${syndicate.name}" requires additional information before approval.`,
          priority: 'HIGH',
        },
      });
    }
  }

  /**
   * Process user approval
   */
  private async processUserApproval(userId: string, approved: boolean) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: approved,
        approvedAt: approved ? new Date() : null,
      },
    });

    // Send welcome or rejection email
    // TODO: Email integration
  }

  /**
   * Process SPV approval
   */
  private async processSpvApproval(spvId: string, approved: boolean) {
    await prisma.spv.update({
      where: { id: spvId },
      data: {
        status: approved ? 'ACTIVE' : 'REJECTED',
      },
    });
  }

  /**
   * Auto-approve logic
   */
  private canAutoApprove(request: ApprovalRequest): boolean {
    // Define auto-approval rules
    const autoApprovalRules: Record<ApprovalEntityType, boolean> = {
      INVESTMENT: false, // Always require manual review
      PITCH: false, // Always require manual review
      SYNDICATE: false, // Always require manual review
      USER: false, // Always require manual review
      KYC: false, // Handled by KYC service
      ACCREDITATION: false, // Handled by accreditation service
      SPV: false, // Always require manual review
      DOCUMENT: true, // Can auto-approve documents
    };

    return autoApprovalRules[request.entityType] || false;
  }

  /**
   * Auto-approve entity
   */
  private async autoApprove(request: ApprovalRequest) {
    const approval = await prisma.adminApproval.create({
      data: {
        entityType: request.entityType,
        entityId: request.entityId,
        requestedBy: request.requestedBy,
        status: 'APPROVED',
        priority: 'LOW',
        reason: 'Auto-approved',
        metadata: request.metadata || {},
        reviewedBy: 'SYSTEM',
        reviewedAt: new Date(),
        slaDeadline: new Date(),
      },
    });

    await this.createAuditLog({
      approvalId: approval.id,
      action: 'AUTO_APPROVED',
      performedBy: 'SYSTEM',
      details: { reason: 'Auto-approval rule matched' },
    });

    return approval;
  }

  /**
   * Determine priority based on entity type and context
   */
  private determinePriority(request: ApprovalRequest): ApprovalPriority {
    // Priority rules
    const priorityMap: Record<ApprovalEntityType, ApprovalPriority> = {
      INVESTMENT: 'HIGH', // Money involved
      PITCH: 'MEDIUM',
      SYNDICATE: 'HIGH',
      USER: 'LOW',
      KYC: 'URGENT', // Compliance critical
      ACCREDITATION: 'URGENT', // Compliance critical
      SPV: 'HIGH',
      DOCUMENT: 'LOW',
    };

    return priorityMap[request.entityType] || 'MEDIUM';
  }

  /**
   * Calculate SLA deadline
   */
  private calculateSlaDeadline(priority: ApprovalPriority): Date {
    const hours = this.SLA_TIMES[priority];
    const deadline = new Date();
    deadline.setHours(deadline.getHours() + hours);
    return deadline;
  }

  /**
   * Calculate time remaining until SLA breach
   */
  private calculateTimeRemaining(slaDeadline: Date): number {
    return slaDeadline.getTime() - Date.now(); // milliseconds
  }

  /**
   * Create audit log entry
   */
  private async createAuditLog(log: {
    approvalId: string;
    action: string;
    performedBy: string;
    details: any;
  }) {
    try {
      await prisma.approvalAuditLog.create({
        data: {
          approvalId: log.approvalId,
          action: log.action,
          performedBy: log.performedBy,
          details: log.details,
        },
      });
    } catch (error) {
      logger.error('Failed to create approval audit log', { error, log });
      // Don't throw - audit log failure shouldn't block approval
    }
  }

  /**
   * Notify admins of new approval request
   */
  private async notifyAdmins(approval: any) {
    try {
      const admins = await prisma.user.findMany({
        where: {
          role: 'ADMIN',
          isActive: true,
        },
        select: { id: true },
      });

      const notifications = admins.map((admin) => {
        const priority = approval.priority === 'URGENT' ? 'HIGH' : 'MEDIUM';
        return {
          userId: admin.id,
          type: 'SYSTEM' as const,
          title: `New ${approval.entityType} Approval Required`,
          content: `A new ${approval.entityType.toLowerCase()} approval request has been submitted. Priority: ${approval.priority}`,
          priority: priority as 'HIGH' | 'MEDIUM',
          metadata: {
            approvalId: approval.id,
            entityType: approval.entityType,
            entityId: approval.entityId,
          },
        };
      });

      await prisma.notification.createMany({
        data: notifications,
      });
    } catch (error) {
      logger.error('Failed to notify admins', { error, approval });
    }
  }

  /**
   * Notify senior admins of escalation
   */
  private async notifySeniorAdmins(approval: any) {
    // TODO: Implement senior admin notification
    logger.info('Escalation notification sent', { approvalId: approval.id });
  }

  /**
   * Notify requester of decision
   */
  private async notifyRequester(approval: any, approved: boolean) {
    try {
      await prisma.notification.create({
        data: {
          userId: approval.requestedBy,
          type: 'SYSTEM',
          title: approved
            ? `${approval.entityType} Approved`
            : `${approval.entityType} Rejected`,
          content: approved
            ? `Your ${approval.entityType.toLowerCase()} request has been approved!`
            : `Your ${approval.entityType.toLowerCase()} request requires attention. ${approval.reviewNotes || ''}`,
          priority: 'HIGH',
          metadata: {
            approvalId: approval.id,
            entityType: approval.entityType,
            entityId: approval.entityId,
          },
        },
      });
    } catch (error) {
      logger.error('Failed to notify requester', { error, approval });
    }
  }

  /**
   * Notify requester that more info is needed
   */
  private async notifyRequesterMoreInfo(approval: any, notes: string) {
    try {
      await prisma.notification.create({
        data: {
          userId: approval.requestedBy,
          type: 'SYSTEM',
          title: `More Information Required`,
          content: `Your ${approval.entityType.toLowerCase()} request requires additional information: ${notes}`,
          priority: 'MEDIUM',
          metadata: {
            approvalId: approval.id,
            entityType: approval.entityType,
            entityId: approval.entityId,
          },
        },
      });
    } catch (error) {
      logger.error('Failed to notify requester about more info', { error, approval });
    }
  }
}

// Export singleton instance
export const adminApprovalService = new AdminApprovalService();
