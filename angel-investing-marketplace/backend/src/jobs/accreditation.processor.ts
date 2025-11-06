import { Job } from 'bullmq';
import { logger } from '../config/logger.js';
import { prisma } from '../config/database.js';
import { accreditationService } from '../services/accreditation.service.js';

/**
 * Accreditation Job Processor
 * Handles background jobs for accreditation management:
 * - Expiry notifications (30 days, 7 days before)
 * - Automatic status updates for expired accreditations
 * - Annual re-verification reminders
 */

/**
 * Process expiry notification job
 * Sends notifications to users whose accreditation is expiring soon
 */
export async function processExpiryNotifications(job: Job) {
  try {
    logger.info('Processing accreditation expiry notifications', {
      jobId: job.id,
    });

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Find accreditations expiring in 30 days
    const expiring30Days = await prisma.complianceProfile.findMany({
      where: {
        accreditedInvestorStatus: 'VERIFIED',
        accreditationExpiry: {
          gte: now,
          lte: thirtyDaysFromNow,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    // Find accreditations expiring in 7 days
    const expiring7Days = await prisma.complianceProfile.findMany({
      where: {
        accreditedInvestorStatus: 'VERIFIED',
        accreditationExpiry: {
          gte: now,
          lte: sevenDaysFromNow,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    // Send 30-day notifications
    for (const profile of expiring30Days) {
      await prisma.notification.create({
        data: {
          userId: profile.userId,
          type: 'SYSTEM',
          title: 'Accreditation Expiring Soon',
          content: `Your accredited investor status will expire in 30 days. Please renew your accreditation to continue investing.`,
          priority: 'MEDIUM',
          actionUrl: '/accreditation/renew',
        },
      });

      // Log the notification
      await prisma.complianceLog.create({
        data: {
          complianceProfileId: profile.id,
          action: 'EXPIRY_NOTIFICATION_30_DAYS',
          status: 'COMPLETED',
          details: {
            expiryDate: profile.accreditationExpiry,
            notifiedAt: now,
          },
        },
      });
    }

    // Send 7-day notifications (more urgent)
    for (const profile of expiring7Days) {
      await prisma.notification.create({
        data: {
          userId: profile.userId,
          type: 'SYSTEM',
          title: 'Urgent: Accreditation Expiring in 7 Days',
          content: `Your accredited investor status will expire in 7 days. Renew now to avoid investment restrictions.`,
          priority: 'HIGH',
          actionUrl: '/accreditation/renew',
        },
      });

      // Log the notification
      await prisma.complianceLog.create({
        data: {
          complianceProfileId: profile.id,
          action: 'EXPIRY_NOTIFICATION_7_DAYS',
          status: 'COMPLETED',
          details: {
            expiryDate: profile.accreditationExpiry,
            notifiedAt: now,
          },
        },
      });
    }

    logger.info('Expiry notifications processed', {
      jobId: job.id,
      expiring30Days: expiring30Days.length,
      expiring7Days: expiring7Days.length,
    });

    return {
      success: true,
      expiring30Days: expiring30Days.length,
      expiring7Days: expiring7Days.length,
    };
  } catch (error) {
    logger.error('Failed to process expiry notifications', {
      error,
      jobId: job.id,
    });
    throw error;
  }
}

/**
 * Process expired accreditations
 * Automatically updates status for expired accreditations
 */
export async function processExpiredAccreditations(job: Job) {
  try {
    logger.info('Processing expired accreditations', { jobId: job.id });

    const now = new Date();

    // Find all expired accreditations that are still marked as VERIFIED
    const expiredProfiles = await prisma.complianceProfile.findMany({
      where: {
        accreditedInvestorStatus: 'VERIFIED',
        accreditationExpiry: {
          lt: now,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    // Update each expired profile
    for (const profile of expiredProfiles) {
      // Update status to PENDING (requires renewal)
      await prisma.complianceProfile.update({
        where: { id: profile.id },
        data: {
          accreditedInvestorStatus: 'PENDING',
          complianceNotes: `Accreditation expired on ${profile.accreditationExpiry?.toISOString()}. Renewal required.`,
        },
      });

      // Create notification
      await prisma.notification.create({
        data: {
          userId: profile.userId,
          type: 'SYSTEM',
          title: 'Accreditation Expired',
          content: `Your accredited investor status has expired. You must renew to continue making investments. Please submit renewal documents.`,
          priority: 'HIGH',
          actionUrl: '/accreditation/renew',
        },
      });

      // Create compliance log
      await prisma.complianceLog.create({
        data: {
          complianceProfileId: profile.id,
          action: 'ACCREDITATION_EXPIRED',
          status: 'COMPLETED',
          details: {
            expiredAt: now,
            originalExpiryDate: profile.accreditationExpiry,
          },
        },
      });
    }

    logger.info('Expired accreditations processed', {
      jobId: job.id,
      count: expiredProfiles.length,
    });

    return {
      success: true,
      expiredCount: expiredProfiles.length,
    };
  } catch (error) {
    logger.error('Failed to process expired accreditations', {
      error,
      jobId: job.id,
    });
    throw error;
  }
}

/**
 * Process annual re-verification reminders
 * Sends reminders for users who need annual re-verification
 */
export async function processAnnualReverificationReminders(job: Job) {
  try {
    logger.info('Processing annual re-verification reminders', {
      jobId: job.id,
    });

    const now = new Date();
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

    // Find profiles verified more than 1 year ago
    const profilesNeedingReverification = await prisma.complianceProfile.findMany({
      where: {
        accreditedInvestorStatus: 'VERIFIED',
        accreditedInvestorVerifiedAt: {
          lte: oneYearAgo,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    // Send reminders
    for (const profile of profilesNeedingReverification) {
      await prisma.notification.create({
        data: {
          userId: profile.userId,
          type: 'SYSTEM',
          title: 'Annual Accreditation Re-verification Required',
          content: `Your annual accreditation re-verification is due. Please submit updated financial documents to maintain your accredited investor status.`,
          priority: 'MEDIUM',
          actionUrl: '/accreditation/renew',
        },
      });

      // Log the reminder
      await prisma.complianceLog.create({
        data: {
          complianceProfileId: profile.id,
          action: 'ANNUAL_REVERIFICATION_REMINDER',
          status: 'COMPLETED',
          details: {
            lastVerifiedAt: profile.accreditedInvestorVerifiedAt,
            reminderSentAt: now,
          },
        },
      });
    }

    logger.info('Annual re-verification reminders processed', {
      jobId: job.id,
      count: profilesNeedingReverification.length,
    });

    return {
      success: true,
      reminderCount: profilesNeedingReverification.length,
    };
  } catch (error) {
    logger.error('Failed to process annual re-verification reminders', {
      error,
      jobId: job.id,
    });
    throw error;
  }
}

/**
 * Clean up old compliance logs
 * Removes logs older than 7 years (regulatory requirement)
 */
export async function cleanupOldComplianceLogs(job: Job) {
  try {
    logger.info('Cleaning up old compliance logs', { jobId: job.id });

    const sevenYearsAgo = new Date();
    sevenYearsAgo.setFullYear(sevenYearsAgo.getFullYear() - 7);

    const result = await prisma.complianceLog.deleteMany({
      where: {
        createdAt: {
          lt: sevenYearsAgo,
        },
      },
    });

    logger.info('Old compliance logs cleaned up', {
      jobId: job.id,
      deletedCount: result.count,
    });

    return {
      success: true,
      deletedCount: result.count,
    };
  } catch (error) {
    logger.error('Failed to clean up old compliance logs', {
      error,
      jobId: job.id,
    });
    throw error;
  }
}

/**
 * Generate accreditation compliance report
 * Creates periodic compliance reports for audit purposes
 */
export async function generateComplianceReport(job: Job) {
  try {
    logger.info('Generating accreditation compliance report', {
      jobId: job.id,
    });

    const now = new Date();

    // Get statistics
    const [
      totalVerified,
      totalPending,
      totalRejected,
      expiringThisMonth,
      expiredNotRenewed,
    ] = await Promise.all([
      prisma.complianceProfile.count({
        where: { accreditedInvestorStatus: 'VERIFIED' },
      }),
      prisma.complianceProfile.count({
        where: { accreditedInvestorStatus: 'PENDING' },
      }),
      prisma.complianceProfile.count({
        where: { accreditedInvestorStatus: 'REJECTED' },
      }),
      prisma.complianceProfile.count({
        where: {
          accreditedInvestorStatus: 'VERIFIED',
          accreditationExpiry: {
            gte: now,
            lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.complianceProfile.count({
        where: {
          accreditationExpiry: {
            lt: now,
          },
          accreditedInvestorStatus: {
            not: 'VERIFIED',
          },
        },
      }),
    ]);

    const report = {
      generatedAt: now,
      statistics: {
        totalVerified,
        totalPending,
        totalRejected,
        expiringThisMonth,
        expiredNotRenewed,
        total: totalVerified + totalPending + totalRejected,
      },
    };

    logger.info('Compliance report generated', {
      jobId: job.id,
      report,
    });

    // Store report in analytics snapshot
    await prisma.analyticsSnapshot.create({
      data: {
        snapshotType: 'COMPLIANCE_ANALYTICS',
        data: report,
        snapshotDate: now,
      },
    });

    return {
      success: true,
      report,
    };
  } catch (error) {
    logger.error('Failed to generate compliance report', {
      error,
      jobId: job.id,
    });
    throw error;
  }
}
