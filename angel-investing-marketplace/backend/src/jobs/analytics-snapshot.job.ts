import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { analyticsSnapshotService } from '../services/analytics-snapshot.service.js';

/**
 * Analytics Snapshot Background Job
 *
 * Runs daily at midnight to create performance snapshots for all active portfolios
 * This ensures that:
 * - Historical performance data is captured daily
 * - Trend analysis can be performed
 * - Monthly summaries are available at month-end
 *
 * Job Schedule: Daily at 00:00 (midnight)
 */

interface JobResult {
  success: boolean;
  totalPortfolios: number;
  dailySnapshotsCreated: number;
  monthlySnapshotsCreated: number;
  errorCount: number;
  duration: number;
  errors?: Array<{ portfolioId: string; error: string }>;
}

/**
 * Main job function - creates daily snapshots for all portfolios
 */
export async function analyticsSnapshotJob(): Promise<JobResult> {
  const startTime = Date.now();
  let dailySnapshotsCreated = 0;
  let monthlySnapshotsCreated = 0;
  let errorCount = 0;
  const errors: Array<{ portfolioId: string; error: string }> = [];

  try {
    logger.info('Starting analytics snapshot job...');

    // Get all active portfolios
    const portfolios = await prisma.portfolio.findMany({
      where: {
        // Only process portfolios with at least some investment activity
        totalInvested: {
          gt: 0,
        },
      },
      include: {
        investor: {
          select: {
            id: true,
            email: true,
            name: true,
            isActive: true,
          },
        },
      },
    });

    logger.info(`Found ${portfolios.length} active portfolios to process`);

    // Check if today is the last day of the month
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isMonthEnd = tomorrow.getDate() === 1;

    // Process each portfolio
    for (const portfolio of portfolios) {
      try {
        // Skip inactive investors
        if (!portfolio.investor.isActive) {
          logger.debug('Skipping inactive investor portfolio', {
            portfolioId: portfolio.id,
            investorId: portfolio.investorId,
          });
          continue;
        }

        // Create daily snapshot
        logger.debug('Creating daily snapshot', {
          portfolioId: portfolio.id,
          portfolioName: portfolio.name,
          investorEmail: portfolio.investor.email,
        });

        const dailySnapshot = await analyticsSnapshotService.createDailySnapshot(
          portfolio.id
        );

        dailySnapshotsCreated++;

        logger.debug('Daily snapshot created', {
          portfolioId: portfolio.id,
          snapshotId: dailySnapshot.id,
          totalValue: (dailySnapshot.data as any).totalValue,
        });

        // Create monthly snapshot if month-end
        if (isMonthEnd) {
          logger.debug('Creating monthly snapshot (month-end)', {
            portfolioId: portfolio.id,
            portfolioName: portfolio.name,
          });

          const monthlySnapshot = await analyticsSnapshotService.createMonthlySnapshot(
            portfolio.id
          );

          monthlySnapshotsCreated++;

          logger.debug('Monthly snapshot created', {
            portfolioId: portfolio.id,
            snapshotId: monthlySnapshot.id,
          });
        }
      } catch (error: any) {
        errorCount++;
        errors.push({
          portfolioId: portfolio.id,
          error: error.message || 'Unknown error',
        });

        logger.error('Error processing portfolio in analytics snapshot job', {
          portfolioId: portfolio.id,
          portfolioName: portfolio.name,
          investorEmail: portfolio.investor.email,
          error: error.message,
          stack: error.stack,
        });
      }
    }

    // Cleanup old daily snapshots (keep last 90 days)
    try {
      logger.info('Cleaning up old daily snapshots...');
      const cleanupResult = await analyticsSnapshotService.cleanupOldSnapshots(90);
      logger.info('Old snapshots cleaned up', {
        deletedCount: cleanupResult.count,
      });
    } catch (error: any) {
      logger.error('Error cleaning up old snapshots', {
        error: error.message,
        stack: error.stack,
      });
      // Don't fail the job for cleanup errors
    }

    const duration = Date.now() - startTime;

    logger.info('Analytics snapshot job completed', {
      totalPortfolios: portfolios.length,
      dailySnapshotsCreated,
      monthlySnapshotsCreated,
      errorCount,
      duration: `${duration}ms`,
      isMonthEnd,
      errors: errorCount > 0 ? errors : undefined,
    });

    // Return summary for monitoring
    return {
      success: true,
      totalPortfolios: portfolios.length,
      dailySnapshotsCreated,
      monthlySnapshotsCreated,
      errorCount,
      duration,
      errors: errorCount > 0 ? errors : undefined,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;

    logger.error('Analytics snapshot job failed', {
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`,
      dailySnapshotsCreated,
      monthlySnapshotsCreated,
      errorCount,
    });

    throw error;
  }
}

/**
 * Create snapshots for a specific portfolio (manual trigger)
 *
 * @param portfolioId - Portfolio to create snapshots for
 * @param includeMonthly - Whether to create monthly snapshot as well
 */
export async function createPortfolioSnapshots(
  portfolioId: string,
  includeMonthly: boolean = false
): Promise<{
  dailySnapshot: any;
  monthlySnapshot?: any;
}> {
  try {
    logger.info('Creating snapshots for specific portfolio', {
      portfolioId,
      includeMonthly,
    });

    // Verify portfolio exists
    const portfolio = await prisma.portfolio.findUnique({
      where: { id: portfolioId },
    });

    if (!portfolio) {
      throw new Error('Portfolio not found');
    }

    // Create daily snapshot
    const dailySnapshot = await analyticsSnapshotService.createDailySnapshot(portfolioId);

    logger.info('Daily snapshot created', {
      portfolioId,
      snapshotId: dailySnapshot.id,
    });

    let monthlySnapshot;
    if (includeMonthly) {
      // Create monthly snapshot
      monthlySnapshot = await analyticsSnapshotService.createMonthlySnapshot(portfolioId);

      logger.info('Monthly snapshot created', {
        portfolioId,
        snapshotId: monthlySnapshot.id,
      });
    }

    return {
      dailySnapshot,
      monthlySnapshot,
    };
  } catch (error: any) {
    logger.error('Error creating portfolio snapshots', {
      portfolioId,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Create monthly snapshots for all portfolios (manual trigger)
 *
 * Used for month-end processing or backfilling
 */
export async function createMonthlySnapshotsForAll(): Promise<JobResult> {
  const startTime = Date.now();
  let monthlySnapshotsCreated = 0;
  let errorCount = 0;
  const errors: Array<{ portfolioId: string; error: string }> = [];

  try {
    logger.info('Creating monthly snapshots for all portfolios...');

    // Get all active portfolios
    const portfolios = await prisma.portfolio.findMany({
      where: {
        totalInvested: {
          gt: 0,
        },
      },
    });

    logger.info(`Found ${portfolios.length} portfolios for monthly snapshots`);

    // Process each portfolio
    for (const portfolio of portfolios) {
      try {
        const snapshot = await analyticsSnapshotService.createMonthlySnapshot(
          portfolio.id
        );

        monthlySnapshotsCreated++;

        logger.debug('Monthly snapshot created', {
          portfolioId: portfolio.id,
          snapshotId: snapshot.id,
        });
      } catch (error: any) {
        errorCount++;
        errors.push({
          portfolioId: portfolio.id,
          error: error.message || 'Unknown error',
        });

        logger.error('Error creating monthly snapshot', {
          portfolioId: portfolio.id,
          error: error.message,
        });
      }
    }

    const duration = Date.now() - startTime;

    logger.info('Monthly snapshots creation completed', {
      totalPortfolios: portfolios.length,
      monthlySnapshotsCreated,
      errorCount,
      duration: `${duration}ms`,
    });

    return {
      success: true,
      totalPortfolios: portfolios.length,
      dailySnapshotsCreated: 0,
      monthlySnapshotsCreated,
      errorCount,
      duration,
      errors: errorCount > 0 ? errors : undefined,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;

    logger.error('Monthly snapshots creation failed', {
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`,
    });

    throw error;
  }
}
