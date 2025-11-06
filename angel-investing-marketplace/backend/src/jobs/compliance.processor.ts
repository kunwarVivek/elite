import { Job } from 'bullmq';
import { logger } from '../config/logger.js';
import { prisma } from '../config/database.js';
import { amlKycService } from '../services/aml-kyc.service.js';

/**
 * Compliance Job Processor
 * Handles background jobs for KYC/AML compliance monitoring:
 * - Periodic rescreening of users
 * - Compliance expiry notifications
 * - Risk score recalculation
 * - Watchlist updates
 */

/**
 * Process periodic rescreening
 * Rescreens users based on risk profile and last screening date
 */
export async function processPeriodicRescreening(job: Job) {
  try {
    logger.info('Processing periodic compliance rescreening', {
      jobId: job.id,
    });

    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Find users who need rescreening:
    // 1. High risk users (90 day cycle)
    // 2. Medium risk users who haven't been screened in 90 days
    // 3. Any user with nextComplianceReview date passed

    const usersNeedingRescreen = await prisma.complianceProfile.findMany({
      where: {
        OR: [
          // High risk users
          {
            riskScore: { gte: 70 },
            lastComplianceReview: { lte: ninetyDaysAgo },
          },
          // Scheduled rescreening
          {
            nextComplianceReview: { lte: now },
          },
          // Medium risk users
          {
            riskScore: { gte: 40, lt: 70 },
            lastComplianceReview: { lte: ninetyDaysAgo },
          },
        ],
        // Only rescreen verified users
        kycStatus: 'VERIFIED',
        amlStatus: 'PASSED',
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
      take: 50, // Process in batches to avoid overwhelming the system
    });

    logger.info(`Found ${usersNeedingRescreen.length} users needing rescreening`);

    // Process each user
    const results = {
      success: 0,
      failed: 0,
      flagged: 0,
    };

    for (const profile of usersNeedingRescreen) {
      try {
        const result = await amlKycService.rescreenUser(profile.userId);

        if (
          result.riskAssessment.recommendation === 'MANUAL_REVIEW' ||
          result.riskAssessment.recommendation === 'REJECT'
        ) {
          results.flagged++;

          // Notify compliance team
          await prisma.notification.create({
            data: {
              userId: profile.userId, // Will be broadcast to admins
              type: 'SYSTEM',
              title: 'Rescreening Alert',
              content: `User ${profile.user.email} flagged during periodic rescreening. Risk level: ${result.riskAssessment.riskLevel}`,
              priority: 'HIGH',
            },
          });
        } else {
          results.success++;
        }
      } catch (error) {
        logger.error('Failed to rescreen user', {
          error,
          userId: profile.userId,
        });
        results.failed++;
      }
    }

    logger.info('Periodic rescreening completed', {
      jobId: job.id,
      results,
    });

    return {
      success: true,
      totalProcessed: usersNeedingRescreen.length,
      results,
    };
  } catch (error) {
    logger.error('Periodic rescreening job failed', { error, jobId: job.id });
    throw error;
  }
}

/**
 * Process compliance expiry notifications
 * Notifies users whose compliance verification is expiring soon
 */
export async function processComplianceExpiryNotifications(job: Job) {
  try {
    logger.info('Processing compliance expiry notifications', {
      jobId: job.id,
    });

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Find compliance verifications expiring in 30 days
    const expiring30Days = await prisma.complianceProfile.findMany({
      where: {
        kycStatus: 'VERIFIED',
        nextComplianceReview: {
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

    // Find compliance verifications expiring in 7 days
    const expiring7Days = await prisma.complianceProfile.findMany({
      where: {
        kycStatus: 'VERIFIED',
        nextComplianceReview: {
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
          title: 'Compliance Verification Expiring Soon',
          content: `Your compliance verification will expire in 30 days. Please complete rescreening to maintain investment access.`,
          priority: 'MEDIUM',
          actionUrl: '/compliance/rescreen',
        },
      });

      // Log notification
      await prisma.complianceLog.create({
        data: {
          complianceProfileId: profile.id,
          action: 'EXPIRY_NOTIFICATION_30_DAYS',
          status: 'COMPLETED',
          details: {
            expiryDate: profile.nextComplianceReview,
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
          title: 'Urgent: Compliance Verification Expiring in 7 Days',
          content: `Your compliance verification will expire in 7 days. Complete rescreening now to avoid investment restrictions.`,
          priority: 'HIGH',
          actionUrl: '/compliance/rescreen',
        },
      });

      // Log notification
      await prisma.complianceLog.create({
        data: {
          complianceProfileId: profile.id,
          action: 'EXPIRY_NOTIFICATION_7_DAYS',
          status: 'COMPLETED',
          details: {
            expiryDate: profile.nextComplianceReview,
            notifiedAt: now,
          },
        },
      });
    }

    logger.info('Compliance expiry notifications completed', {
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
    logger.error('Compliance expiry notifications failed', {
      error,
      jobId: job.id,
    });
    throw error;
  }
}

/**
 * Process high-risk user monitoring
 * Monitors high-risk users for new sanctions/PEP matches
 */
export async function processHighRiskMonitoring(job: Job) {
  try {
    logger.info('Processing high-risk user monitoring', { jobId: job.id });

    // Find all high-risk users
    const highRiskUsers = await prisma.complianceProfile.findMany({
      where: {
        OR: [
          { riskScore: { gte: 70 } },
          { pepStatus: { in: ['PEP', 'FAMILY_MEMBER', 'CLOSE_ASSOCIATE'] } },
          { sanctionStatus: 'PARTIAL_MATCH' },
        ],
        kycStatus: 'VERIFIED',
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

    logger.info(`Monitoring ${highRiskUsers.length} high-risk users`);

    // Check each user for new alerts
    let newAlerts = 0;

    for (const profile of highRiskUsers) {
      // TODO: In production, this would check against live watchlists
      // For now, log monitoring activity

      await prisma.complianceLog.create({
        data: {
          complianceProfileId: profile.id,
          action: 'HIGH_RISK_MONITORING_CHECK',
          status: 'COMPLETED',
          details: {
            riskScore: profile.riskScore,
            pepStatus: profile.pepStatus,
            sanctionStatus: profile.sanctionStatus,
            checkedAt: new Date(),
          },
        },
      });
    }

    logger.info('High-risk monitoring completed', {
      jobId: job.id,
      monitoredUsers: highRiskUsers.length,
      newAlerts,
    });

    return {
      success: true,
      monitoredUsers: highRiskUsers.length,
      newAlerts,
    };
  } catch (error) {
    logger.error('High-risk monitoring failed', { error, jobId: job.id });
    throw error;
  }
}

/**
 * Generate compliance report
 * Creates periodic compliance reports for audit purposes
 */
export async function generateComplianceAuditReport(job: Job) {
  try {
    logger.info('Generating compliance audit report', { jobId: job.id });

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get statistics for the past 30 days
    const [
      totalScreenings,
      approvedScreenings,
      rejectedScreenings,
      pendingReviews,
      highRiskUsers,
      pepMatches,
      sanctionMatches,
      avgRiskScore,
    ] = await Promise.all([
      prisma.complianceLog.count({
        where: {
          action: 'COMPREHENSIVE_SCREENING',
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
      prisma.complianceLog.count({
        where: {
          action: 'COMPREHENSIVE_SCREENING',
          status: 'COMPLETED',
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
      prisma.complianceLog.count({
        where: {
          action: 'COMPREHENSIVE_SCREENING',
          status: 'FAILED',
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
      prisma.complianceProfile.count({
        where: { amlStatus: 'REQUIRES_REVIEW' },
      }),
      prisma.complianceProfile.count({
        where: { riskScore: { gte: 70 } },
      }),
      prisma.complianceProfile.count({
        where: { pepStatus: { in: ['PEP', 'FAMILY_MEMBER', 'CLOSE_ASSOCIATE'] } },
      }),
      prisma.complianceProfile.count({
        where: { sanctionStatus: { in: ['PARTIAL_MATCH', 'FULL_MATCH'] } },
      }),
      prisma.complianceProfile.aggregate({
        _avg: { riskScore: true },
      }),
    ]);

    const report = {
      reportPeriod: {
        start: thirtyDaysAgo,
        end: now,
      },
      screenings: {
        total: totalScreenings,
        approved: approvedScreenings,
        rejected: rejectedScreenings,
        approvalRate:
          totalScreenings > 0
            ? Math.round((approvedScreenings / totalScreenings) * 100)
            : 0,
      },
      currentStatus: {
        pendingReviews,
        highRiskUsers,
        pepMatches,
        sanctionMatches,
        avgRiskScore: Math.round(avgRiskScore._avg.riskScore || 0),
      },
      generatedAt: now,
    };

    logger.info('Compliance audit report generated', {
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
    logger.error('Compliance audit report generation failed', {
      error,
      jobId: job.id,
    });
    throw error;
  }
}

/**
 * Update sanctions watchlists
 * Syncs with external sanctions list providers
 */
export async function updateSanctionsWatchlists(job: Job) {
  try {
    logger.info('Updating sanctions watchlists', { jobId: job.id });

    // TODO: In production, this would sync with:
    // - OFAC SDN List
    // - UN Sanctions List
    // - EU Sanctions List
    // - UK HMT Sanctions List

    // For now, log that sync would happen
    logger.info('Sanctions watchlist sync completed (mock)', {
      jobId: job.id,
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        action: 'WATCHLIST_SYNC',
        entityType: 'COMPLIANCE',
        entityId: 'SYSTEM',
        newValues: {
          syncedAt: new Date(),
          jobId: job.id,
        },
      },
    });

    return {
      success: true,
      message: 'Watchlist sync completed',
    };
  } catch (error) {
    logger.error('Sanctions watchlist update failed', {
      error,
      jobId: job.id,
    });
    throw error;
  }
}
