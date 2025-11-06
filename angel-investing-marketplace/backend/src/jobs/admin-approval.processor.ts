import { Job, Worker, Queue } from 'bullmq';
import { logger } from '../config/logger.js';
import { prisma } from '../config/database.js';
import IORedis from 'ioredis';

/**
 * Admin Approval Background Jobs
 * - SLA monitoring and breach notifications
 * - Escalation for overdue approvals
 * - Daily digest for pending approvals
 * - Cleanup old processed approvals
 */

// Redis connection for BullMQ
const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
});

// Create admin approval job queue
export const adminApprovalQueue = new Queue('admin-approval-processing', { connection });

/**
 * Job: Monitor SLA breaches and send notifications
 * Runs every hour
 */
async function processSlaBreach Monitoring(job: Job) {
  logger.info('Starting SLA breach monitoring');

  try {
    // Get all pending/under review approvals that are past SLA deadline
    const breachedApprovals = await prisma.adminApproval.findMany({
      where: {
        status: {
          in: ['PENDING', 'UNDER_REVIEW'],
        },
        slaDeadline: {
          lt: new Date(),
        },
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (breachedApprovals.length === 0) {
      logger.info('No SLA breaches found');
      return { breachedCount: 0 };
    }

    logger.warn(`Found ${breachedApprovals.length} SLA breaches`);

    // Send notifications to assigned admins
    for (const approval of breachedApprovals) {
      if (approval.assignee) {
        await prisma.notification.create({
          data: {
            userId: approval.assignee.id,
            type: 'SYSTEM',
            title: `SLA Breach: ${approval.entityType} Approval`,
            content: `The ${approval.entityType.toLowerCase()} approval request has breached its SLA deadline. Priority: ${approval.priority}. Please review immediately.`,
            priority: 'URGENT',
            metadata: {
              approvalId: approval.id,
              entityType: approval.entityType,
              entityId: approval.entityId,
              slaBreach: true,
            },
          },
        });
      }
    }

    // Notify senior admins about critical breaches
    const criticalBreaches = breachedApprovals.filter(
      (a) => a.priority === 'URGENT' || a.priority === 'HIGH'
    );

    if (criticalBreaches.length > 0) {
      const seniorAdmins = await prisma.user.findMany({
        where: {
          role: 'ADMIN',
          isActive: true,
        },
        select: {
          id: true,
        },
      });

      for (const admin of seniorAdmins) {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            type: 'SYSTEM',
            title: `Critical SLA Breaches: ${criticalBreaches.length}`,
            content: `There are ${criticalBreaches.length} critical approval requests that have breached their SLA deadlines. Immediate attention required.`,
            priority: 'HIGH',
            metadata: {
              breachedCount: criticalBreaches.length,
              criticalBreaches: criticalBreaches.map((a) => ({
                id: a.id,
                entityType: a.entityType,
                priority: a.priority,
              })),
            },
          },
        });
      }
    }

    return {
      breachedCount: breachedApprovals.length,
      criticalCount: criticalBreaches.length,
    };
  } catch (error) {
    logger.error('SLA breach monitoring failed', { error });
    throw error;
  }
}

/**
 * Job: Auto-escalate approvals that are significantly overdue
 * Runs every 6 hours
 */
async function processAutoEscalation(job: Job) {
  logger.info('Starting auto-escalation check');

  try {
    const now = new Date();
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);

    // Find approvals that are 12+ hours past SLA and not yet escalated
    const overdueApprovals = await prisma.adminApproval.findMany({
      where: {
        status: {
          in: ['PENDING', 'UNDER_REVIEW'],
        },
        slaDeadline: {
          lt: twelveHoursAgo,
        },
      },
      include: {
        assignee: true,
        requester: true,
      },
    });

    if (overdueApprovals.length === 0) {
      logger.info('No approvals require auto-escalation');
      return { escalatedCount: 0 };
    }

    logger.warn(`Auto-escalating ${overdueApprovals.length} overdue approvals`);

    let escalatedCount = 0;

    for (const approval of overdueApprovals) {
      // Escalate to URGENT priority and mark as ESCALATED
      await prisma.adminApproval.update({
        where: { id: approval.id },
        data: {
          status: 'ESCALATED',
          priority: 'URGENT',
          reviewNotes: `Auto-escalated due to SLA breach of 12+ hours`,
        },
      });

      // Create audit log
      await prisma.approvalAuditLog.create({
        data: {
          approvalId: approval.id,
          action: 'AUTO_ESCALATED',
          performedBy: 'SYSTEM',
          details: {
            reason: 'SLA breach exceeded 12 hours',
            originalPriority: approval.priority,
            newPriority: 'URGENT',
          },
        },
      });

      // Notify all admins
      const admins = await prisma.user.findMany({
        where: {
          role: 'ADMIN',
          isActive: true,
        },
        select: { id: true },
      });

      for (const admin of admins) {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            type: 'SYSTEM',
            title: `Auto-Escalated: ${approval.entityType} Approval`,
            content: `A ${approval.entityType.toLowerCase()} approval has been auto-escalated due to extended SLA breach. Requires immediate attention.`,
            priority: 'URGENT',
            metadata: {
              approvalId: approval.id,
              entityType: approval.entityType,
              autoEscalated: true,
            },
          },
        });
      }

      escalatedCount++;
    }

    return { escalatedCount };
  } catch (error) {
    logger.error('Auto-escalation failed', { error });
    throw error;
  }
}

/**
 * Job: Send daily digest of pending approvals to admins
 * Runs daily at 9 AM
 */
async function processDailyDigest(job: Job) {
  logger.info('Generating daily approval digest');

  try {
    // Get all admins
    const admins = await prisma.user.findMany({
      where: {
        role: 'ADMIN',
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    for (const admin of admins) {
      // Get admin's assigned pending approvals
      const assignedApprovals = await prisma.adminApproval.findMany({
        where: {
          assignedTo: admin.id,
          status: {
            in: ['PENDING', 'UNDER_REVIEW', 'REQUIRES_MORE_INFO'],
          },
        },
        orderBy: {
          priority: 'desc',
        },
      });

      if (assignedApprovals.length === 0) {
        continue; // No need to send digest if no pending approvals
      }

      // Group by priority
      const byPriority = {
        URGENT: assignedApprovals.filter((a) => a.priority === 'URGENT').length,
        HIGH: assignedApprovals.filter((a) => a.priority === 'HIGH').length,
        MEDIUM: assignedApprovals.filter((a) => a.priority === 'MEDIUM').length,
        LOW: assignedApprovals.filter((a) => a.priority === 'LOW').length,
      };

      // Count SLA breaches
      const breached = assignedApprovals.filter((a) => a.slaDeadline < new Date()).length;

      // Create digest notification
      await prisma.notification.create({
        data: {
          userId: admin.id,
          type: 'SYSTEM',
          title: `Daily Approval Digest: ${assignedApprovals.length} Pending`,
          content: `You have ${assignedApprovals.length} pending approval requests. URGENT: ${byPriority.URGENT}, HIGH: ${byPriority.HIGH}, MEDIUM: ${byPriority.MEDIUM}, LOW: ${byPriority.LOW}. ${breached > 0 ? `⚠️ ${breached} have breached SLA.` : ''}`,
          priority: breached > 0 ? 'HIGH' : 'MEDIUM',
          metadata: {
            digest: true,
            totalPending: assignedApprovals.length,
            byPriority,
            breachedCount: breached,
          },
        },
      });

      logger.info('Daily digest sent', {
        adminId: admin.id,
        pendingCount: assignedApprovals.length,
        breachedCount: breached,
      });
    }

    return { adminsNotified: admins.length };
  } catch (error) {
    logger.error('Daily digest failed', { error });
    throw error;
  }
}

/**
 * Job: Cleanup old processed approvals
 * Runs weekly on Sunday
 */
async function processCleanupOldApprovals(job: Job) {
  logger.info('Starting old approval cleanup');

  try {
    const retentionDays = 365; // Keep approvals for 1 year
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // Delete old processed approvals
    const result = await prisma.adminApproval.deleteMany({
      where: {
        status: {
          in: ['APPROVED', 'REJECTED'],
        },
        updatedAt: {
          lt: cutoffDate,
        },
      },
    });

    logger.info('Old approval cleanup completed', { deletedCount: result.count });

    return { deletedCount: result.count };
  } catch (error) {
    logger.error('Approval cleanup failed', { error });
    throw error;
  }
}

/**
 * Job: Reassign stale approvals from inactive admins
 * Runs daily
 */
async function processReassignStaleApprovals(job: Job) {
  logger.info('Starting stale approval reassignment');

  try {
    // Find approvals assigned to inactive admins
    const staleApprovals = await prisma.adminApproval.findMany({
      where: {
        status: {
          in: ['PENDING', 'UNDER_REVIEW'],
        },
        assignee: {
          isActive: false,
        },
      },
      include: {
        assignee: true,
      },
    });

    if (staleApprovals.length === 0) {
      logger.info('No stale approvals found');
      return { reassignedCount: 0 };
    }

    // Get active admins
    const activeAdmins = await prisma.user.findMany({
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

    if (activeAdmins.length === 0) {
      logger.warn('No active admins available for reassignment');
      return { reassignedCount: 0 };
    }

    let reassignedCount = 0;

    for (const approval of staleApprovals) {
      // Find admin with least pending approvals
      const leastBusyAdmin = activeAdmins.reduce((prev, curr) =>
        curr.assignedApprovals.length < prev.assignedApprovals.length ? curr : prev
      );

      // Reassign
      await prisma.adminApproval.update({
        where: { id: approval.id },
        data: {
          assignedTo: leastBusyAdmin.id,
        },
      });

      // Create audit log
      await prisma.approvalAuditLog.create({
        data: {
          approvalId: approval.id,
          action: 'AUTO_REASSIGNED',
          performedBy: 'SYSTEM',
          details: {
            reason: 'Previous admin became inactive',
            previousAdminId: approval.assignedTo,
            newAdminId: leastBusyAdmin.id,
          },
        },
      });

      // Update admin's pending count for next iteration
      leastBusyAdmin.assignedApprovals.push({ id: approval.id });

      reassignedCount++;
    }

    logger.info('Stale approvals reassigned', { reassignedCount });

    return { reassignedCount };
  } catch (error) {
    logger.error('Stale approval reassignment failed', { error });
    throw error;
  }
}

/**
 * Job: Generate weekly approval statistics report
 * Runs weekly on Monday
 */
async function processWeeklyStatisticsReport(job: Job) {
  logger.info('Generating weekly approval statistics');

  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Get statistics for the past week
    const approvals = await prisma.adminApproval.findMany({
      where: {
        createdAt: {
          gte: oneWeekAgo,
        },
      },
      select: {
        status: true,
        priority: true,
        entityType: true,
        createdAt: true,
        reviewedAt: true,
        slaDeadline: true,
      },
    });

    const stats = {
      total: approvals.length,
      approved: approvals.filter((a) => a.status === 'APPROVED').length,
      rejected: approvals.filter((a) => a.status === 'REJECTED').length,
      pending: approvals.filter((a) =>
        ['PENDING', 'UNDER_REVIEW', 'REQUIRES_MORE_INFO'].includes(a.status)
      ).length,
      avgProcessingTime: 0,
      slaBreachRate: 0,
    };

    // Calculate average processing time
    const processedApprovals = approvals.filter((a) => a.reviewedAt);
    if (processedApprovals.length > 0) {
      const totalTime = processedApprovals.reduce(
        (sum, a) => sum + (a.reviewedAt!.getTime() - a.createdAt.getTime()),
        0
      );
      stats.avgProcessingTime = totalTime / processedApprovals.length / 1000 / 60 / 60; // hours
    }

    // Calculate SLA breach rate
    const breachedCount = approvals.filter((a) => a.slaDeadline < new Date()).length;
    stats.slaBreachRate = approvals.length > 0 ? (breachedCount / approvals.length) * 100 : 0;

    // Notify all admins
    const admins = await prisma.user.findMany({
      where: {
        role: 'ADMIN',
        isActive: true,
      },
      select: { id: true },
    });

    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          type: 'SYSTEM',
          title: `Weekly Approval Report`,
          content: `Weekly Stats: ${stats.total} total requests, ${stats.approved} approved, ${stats.rejected} rejected, ${stats.pending} pending. Avg processing time: ${stats.avgProcessingTime.toFixed(1)}h. SLA breach rate: ${stats.slaBreachRate.toFixed(1)}%.`,
          priority: 'LOW',
          metadata: {
            weeklyReport: true,
            stats,
          },
        },
      });
    }

    logger.info('Weekly statistics report generated', stats);

    return stats;
  } catch (error) {
    logger.error('Weekly statistics report failed', { error });
    throw error;
  }
}

// Create worker to process admin approval jobs
export const adminApprovalWorker = new Worker(
  'admin-approval-processing',
  async (job: Job) => {
    switch (job.name) {
      case 'sla-breach-monitoring':
        return processSlaBreach Monitoring(job);

      case 'auto-escalation':
        return processAutoEscalation(job);

      case 'daily-digest':
        return processDailyDigest(job);

      case 'cleanup-old-approvals':
        return processCleanupOldApprovals(job);

      case 'reassign-stale-approvals':
        return processReassignStaleApprovals(job);

      case 'weekly-statistics-report':
        return processWeeklyStatisticsReport(job);

      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }
  },
  {
    connection,
    concurrency: 2,
  }
);

// Worker event listeners
adminApprovalWorker.on('completed', (job) => {
  logger.info('Admin approval job completed', { jobId: job.id, jobName: job.name });
});

adminApprovalWorker.on('failed', (job, err) => {
  logger.error('Admin approval job failed', {
    jobId: job?.id,
    jobName: job?.name,
    error: err.message,
  });
});

adminApprovalWorker.on('error', (err) => {
  logger.error('Admin approval worker error', { error: err.message });
});

/**
 * Schedule recurring jobs
 */

// SLA breach monitoring - every hour
export async function scheduleSlaMonitoring() {
  await adminApprovalQueue.add(
    'sla-breach-monitoring',
    {},
    {
      repeat: {
        pattern: '0 * * * *', // Every hour
      },
    }
  );
  logger.info('Scheduled SLA breach monitoring');
}

// Auto-escalation - every 6 hours
export async function scheduleAutoEscalation() {
  await adminApprovalQueue.add(
    'auto-escalation',
    {},
    {
      repeat: {
        pattern: '0 */6 * * *', // Every 6 hours
      },
    }
  );
  logger.info('Scheduled auto-escalation');
}

// Daily digest - every day at 9 AM
export async function scheduleDailyDigest() {
  await adminApprovalQueue.add(
    'daily-digest',
    {},
    {
      repeat: {
        pattern: '0 9 * * *', // 9 AM daily
      },
    }
  );
  logger.info('Scheduled daily digest');
}

// Cleanup - every Sunday at 2 AM
export async function scheduleCleanup() {
  await adminApprovalQueue.add(
    'cleanup-old-approvals',
    {},
    {
      repeat: {
        pattern: '0 2 * * 0', // Sunday at 2 AM
      },
    }
  );
  logger.info('Scheduled approval cleanup');
}

// Reassign stale - daily at 3 AM
export async function scheduleReassignStale() {
  await adminApprovalQueue.add(
    'reassign-stale-approvals',
    {},
    {
      repeat: {
        pattern: '0 3 * * *', // 3 AM daily
      },
    }
  );
  logger.info('Scheduled stale approval reassignment');
}

// Weekly report - Monday at 8 AM
export async function scheduleWeeklyReport() {
  await adminApprovalQueue.add(
    'weekly-statistics-report',
    {},
    {
      repeat: {
        pattern: '0 8 * * 1', // Monday at 8 AM
      },
    }
  );
  logger.info('Scheduled weekly statistics report');
}

logger.info('Admin approval processor initialized');
