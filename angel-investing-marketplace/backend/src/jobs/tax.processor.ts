import { Job, Worker, Queue } from 'bullmq';
import { logger } from '../config/logger.js';
import { prisma } from '../config/database.js';
import { taxCalculationService } from '../services/tax-calculation.service.js';
import { taxPdfService } from '../services/tax-pdf.service.js';
import IORedis from 'ioredis';

/**
 * Tax Document Processing Jobs
 * Handles automated tax document generation, notifications, and reminders
 */

// Redis connection for BullMQ
const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
});

// Create tax job queue
export const taxQueue = new Queue('tax-processing', { connection });

/**
 * Job: Generate year-end tax documents for all users
 * Runs annually on January 20th
 */
async function processYearEndTaxGeneration(job: Job) {
  const { taxYear } = job.data;
  logger.info('Starting year-end tax document generation', { taxYear });

  try {
    // Get all users with completed investments in the tax year
    const startDate = new Date(taxYear, 0, 1);
    const endDate = new Date(taxYear, 11, 31, 23, 59, 59);

    const usersWithActivity = await prisma.investment.findMany({
      where: {
        OR: [
          {
            status: 'COMPLETED',
            completedAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          {
            investmentDate: {
              gte: startDate,
              lte: endDate,
            },
          },
        ],
      },
      select: {
        investorId: true,
        investor: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      distinct: ['investorId'],
    });

    const uniqueUsers = new Map();
    usersWithActivity.forEach((inv) => {
      if (!uniqueUsers.has(inv.investorId)) {
        uniqueUsers.set(inv.investorId, inv.investor);
      }
    });

    logger.info(`Found ${uniqueUsers.size} users with tax activity`, { taxYear });

    let generated = 0;
    let failed = 0;

    // Generate documents for each user
    for (const [userId, user] of uniqueUsers) {
      try {
        // Generate all tax documents
        const documents = await taxPdfService.generateAllTaxDocuments(userId, taxYear);

        // Create notification for user
        await prisma.notification.create({
          data: {
            userId,
            type: 'SYSTEM',
            title: `${taxYear} Tax Documents Ready`,
            content: `Your tax documents for ${taxYear} are now available for download. Visit the Tax Center to access your K-1, 1099-DIV, 1099-B, and other tax forms.`,
            priority: 'HIGH',
            metadata: {
              taxYear,
              documentCount: Object.keys(documents).length,
              documentTypes: Object.keys(documents),
            },
          },
        });

        // TODO: Send email with tax documents
        // await emailService.sendTaxDocumentsEmail(user.email, taxYear, documents);

        generated++;

        // Update progress
        await job.updateProgress((generated / uniqueUsers.size) * 100);

        logger.info('Tax documents generated for user', {
          userId,
          taxYear,
          documentCount: Object.keys(documents).length,
        });
      } catch (error) {
        logger.error('Failed to generate tax documents for user', {
          error,
          userId,
          taxYear,
        });
        failed++;
      }
    }

    logger.info('Year-end tax generation completed', {
      taxYear,
      total: uniqueUsers.size,
      generated,
      failed,
    });

    return { taxYear, total: uniqueUsers.size, generated, failed };
  } catch (error) {
    logger.error('Year-end tax generation failed', { error, taxYear });
    throw error;
  }
}

/**
 * Job: Send quarterly tax reminders
 * Runs quarterly (April 15, June 15, September 15, January 15)
 */
async function processQuarterlyTaxReminders(job: Job) {
  const { quarter, year } = job.data;
  logger.info('Sending quarterly tax reminders', { quarter, year });

  try {
    // Get all active investors
    const investors = await prisma.user.findMany({
      where: {
        role: 'INVESTOR',
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        investments: {
          where: {
            status: 'COMPLETED',
          },
          select: {
            id: true,
          },
        },
      },
    });

    // Filter investors with active investments
    const activeInvestors = investors.filter((inv) => inv.investments.length > 0);

    logger.info(`Sending reminders to ${activeInvestors.length} active investors`);

    let sent = 0;

    for (const investor of activeInvestors) {
      try {
        // Create notification
        await prisma.notification.create({
          data: {
            userId: investor.id,
            type: 'SYSTEM',
            title: `Q${quarter} ${year} Tax Reminder`,
            content: `This is a reminder that Q${quarter} estimated tax payments are due. If you have realized gains or received distributions this quarter, you may need to make an estimated tax payment. Visit the Tax Center for more information.`,
            priority: 'MEDIUM',
            metadata: {
              quarter,
              year,
              type: 'QUARTERLY_REMINDER',
            },
          },
        });

        // TODO: Send email reminder
        // await emailService.sendQuarterlyTaxReminder(investor.email, quarter, year);

        sent++;
      } catch (error) {
        logger.error('Failed to send quarterly reminder', {
          error,
          userId: investor.id,
        });
      }
    }

    logger.info('Quarterly tax reminders sent', { quarter, year, sent });

    return { quarter, year, sent };
  } catch (error) {
    logger.error('Quarterly tax reminders failed', { error, quarter, year });
    throw error;
  }
}

/**
 * Job: Send tax document availability notifications
 * Runs on January 31st to notify users that tax documents will be available soon
 */
async function processTaxDocumentAvailabilityNotification(job: Job) {
  const { taxYear } = job.data;
  logger.info('Sending tax document availability notifications', { taxYear });

  try {
    // Get all users with investment activity in the tax year
    const startDate = new Date(taxYear, 0, 1);
    const endDate = new Date(taxYear, 11, 31, 23, 59, 59);

    const usersWithActivity = await prisma.investment.findMany({
      where: {
        OR: [
          {
            status: 'COMPLETED',
            completedAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          {
            investmentDate: {
              gte: startDate,
              lte: endDate,
            },
          },
        ],
      },
      select: {
        investorId: true,
        investor: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      distinct: ['investorId'],
    });

    const uniqueUsers = new Map();
    usersWithActivity.forEach((inv) => {
      if (!uniqueUsers.has(inv.investorId)) {
        uniqueUsers.set(inv.investorId, inv.investor);
      }
    });

    logger.info(`Notifying ${uniqueUsers.size} users about upcoming tax documents`);

    let notified = 0;

    for (const [userId, user] of uniqueUsers) {
      try {
        await prisma.notification.create({
          data: {
            userId,
            type: 'SYSTEM',
            title: `${taxYear} Tax Documents Coming Soon`,
            content: `Your ${taxYear} tax documents (K-1, 1099-DIV, 1099-B) will be available by February 15th. We're working with our fund administrators to finalize all documents. You'll receive another notification when your documents are ready for download.`,
            priority: 'MEDIUM',
            metadata: {
              taxYear,
              expectedDate: new Date(taxYear + 1, 1, 15).toISOString(),
            },
          },
        });

        notified++;
      } catch (error) {
        logger.error('Failed to send availability notification', {
          error,
          userId,
        });
      }
    }

    logger.info('Tax document availability notifications sent', { taxYear, notified });

    return { taxYear, notified };
  } catch (error) {
    logger.error('Tax document availability notifications failed', { error, taxYear });
    throw error;
  }
}

/**
 * Job: Generate tax documents for a specific user (on-demand)
 */
async function processUserTaxDocumentGeneration(job: Job) {
  const { userId, taxYear, documentTypes } = job.data;
  logger.info('Generating tax documents for user', { userId, taxYear, documentTypes });

  try {
    const documents: Record<string, Buffer> = {};

    if (!documentTypes || documentTypes.length === 0) {
      // Generate all documents
      const allDocs = await taxPdfService.generateAllTaxDocuments(userId, taxYear);
      Object.assign(documents, allDocs);
    } else {
      // Generate specific documents
      for (const docType of documentTypes) {
        try {
          switch (docType) {
            case 'TAX_SUMMARY':
              documents.taxSummary = await taxPdfService.generateTaxSummary(
                userId,
                taxYear
              );
              break;
            case '1099_DIV':
              documents['1099_div'] = await taxPdfService.generate1099DivForm(
                userId,
                taxYear
              );
              break;
            case '1099_B':
              documents['1099_b'] = await taxPdfService.generate1099BForm(
                userId,
                taxYear
              );
              break;
            case 'FORM_8949':
              documents.form8949 = await taxPdfService.generateForm8949(userId, taxYear);
              break;
            // K-1 requires syndicateId, handle separately
            default:
              logger.warn('Unknown document type', { docType });
          }
        } catch (error) {
          logger.error('Failed to generate document', { error, docType, userId, taxYear });
        }
      }
    }

    // Create notification
    await prisma.notification.create({
      data: {
        userId,
        type: 'SYSTEM',
        title: 'Tax Documents Ready',
        content: `Your requested tax documents for ${taxYear} are now ready for download.`,
        priority: 'MEDIUM',
        metadata: {
          taxYear,
          documentCount: Object.keys(documents).length,
        },
      },
    });

    logger.info('User tax documents generated', {
      userId,
      taxYear,
      documentCount: Object.keys(documents).length,
    });

    return { userId, taxYear, documentCount: Object.keys(documents).length };
  } catch (error) {
    logger.error('Failed to generate user tax documents', { error, userId, taxYear });
    throw error;
  }
}

/**
 * Job: Bulk generate tax documents (Admin)
 */
async function processBulkTaxDocumentGeneration(job: Job) {
  const { userIds, taxYear, documentTypes } = job.data;
  logger.info('Starting bulk tax document generation', {
    userCount: userIds.length,
    taxYear,
  });

  try {
    let generated = 0;
    let failed = 0;

    for (const userId of userIds) {
      try {
        await processUserTaxDocumentGeneration({
          data: { userId, taxYear, documentTypes },
          updateProgress: async () => {},
        } as Job);

        generated++;
        await job.updateProgress((generated / userIds.length) * 100);
      } catch (error) {
        logger.error('Failed to generate documents for user in bulk', {
          error,
          userId,
          taxYear,
        });
        failed++;
      }
    }

    logger.info('Bulk tax document generation completed', {
      taxYear,
      total: userIds.length,
      generated,
      failed,
    });

    return { taxYear, total: userIds.length, generated, failed };
  } catch (error) {
    logger.error('Bulk tax document generation failed', { error, taxYear });
    throw error;
  }
}

/**
 * Job: Clean up old tax documents
 * Runs monthly to remove tax documents older than 7 years (IRS retention requirement)
 */
async function processOldTaxDocumentCleanup(job: Job) {
  logger.info('Starting old tax document cleanup');

  try {
    const currentYear = new Date().getFullYear();
    const retentionYears = 7;
    const cutoffYear = currentYear - retentionYears;

    logger.info(`Cleaning up tax documents older than ${cutoffYear}`);

    // TODO: Implement when we have tax document storage
    // For now, just log the action
    logger.info('Tax document cleanup completed', { cutoffYear });

    return { cutoffYear, cleaned: 0 };
  } catch (error) {
    logger.error('Tax document cleanup failed', { error });
    throw error;
  }
}

/**
 * Job: Calculate aggregate tax statistics (Admin)
 */
async function processTaxStatisticsCalculation(job: Job) {
  const { taxYear } = job.data;
  logger.info('Calculating tax statistics', { taxYear });

  try {
    const startDate = new Date(taxYear, 0, 1);
    const endDate = new Date(taxYear, 11, 31, 23, 59, 59);

    // Get all users with tax activity
    const usersWithActivity = await prisma.investment.findMany({
      where: {
        OR: [
          {
            status: 'COMPLETED',
            completedAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          {
            investmentDate: {
              gte: startDate,
              lte: endDate,
            },
          },
        ],
      },
      select: {
        investorId: true,
      },
      distinct: ['investorId'],
    });

    const totalUsers = usersWithActivity.length;
    let totalCapitalGains = 0;
    let totalDividends = 0;
    let totalPartnershipIncome = 0;

    // Calculate aggregates
    for (const user of usersWithActivity) {
      try {
        const summary = await taxCalculationService.generateTaxSummary(
          user.investorId,
          taxYear
        );
        totalCapitalGains += summary.totalCapitalGains;
        totalDividends += summary.totalDividends;
        totalPartnershipIncome += summary.partnershipIncome;
      } catch (error) {
        logger.warn('Failed to calculate summary for user', {
          error,
          userId: user.investorId,
        });
      }
    }

    const stats = {
      taxYear,
      totalUsers,
      totalCapitalGains,
      totalDividends,
      totalPartnershipIncome,
      averageCapitalGains: totalUsers > 0 ? totalCapitalGains / totalUsers : 0,
      averageDividends: totalUsers > 0 ? totalDividends / totalUsers : 0,
      averagePartnershipIncome: totalUsers > 0 ? totalPartnershipIncome / totalUsers : 0,
    };

    logger.info('Tax statistics calculated', stats);

    return stats;
  } catch (error) {
    logger.error('Tax statistics calculation failed', { error, taxYear });
    throw error;
  }
}

// Create worker to process tax jobs
export const taxWorker = new Worker(
  'tax-processing',
  async (job: Job) => {
    switch (job.name) {
      case 'year-end-tax-generation':
        return processYearEndTaxGeneration(job);

      case 'quarterly-tax-reminders':
        return processQuarterlyTaxReminders(job);

      case 'tax-document-availability-notification':
        return processTaxDocumentAvailabilityNotification(job);

      case 'user-tax-document-generation':
        return processUserTaxDocumentGeneration(job);

      case 'bulk-tax-document-generation':
        return processBulkTaxDocumentGeneration(job);

      case 'old-tax-document-cleanup':
        return processOldTaxDocumentCleanup(job);

      case 'tax-statistics-calculation':
        return processTaxStatisticsCalculation(job);

      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }
  },
  {
    connection,
    concurrency: 3, // Process up to 3 jobs concurrently
  }
);

// Worker event listeners
taxWorker.on('completed', (job) => {
  logger.info('Tax job completed', { jobId: job.id, jobName: job.name });
});

taxWorker.on('failed', (job, err) => {
  logger.error('Tax job failed', {
    jobId: job?.id,
    jobName: job?.name,
    error: err.message,
  });
});

taxWorker.on('error', (err) => {
  logger.error('Tax worker error', { error: err.message });
});

/**
 * Helper functions to schedule tax jobs
 */

/**
 * Schedule year-end tax document generation
 * Runs on January 20th of each year
 */
export async function scheduleYearEndTaxGeneration(taxYear: number) {
  const jobDate = new Date(taxYear + 1, 0, 20); // January 20th of next year

  await taxQueue.add(
    'year-end-tax-generation',
    { taxYear },
    {
      delay: jobDate.getTime() - Date.now(),
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 60000, // 1 minute
      },
    }
  );

  logger.info('Scheduled year-end tax generation', { taxYear, scheduledFor: jobDate });
}

/**
 * Schedule quarterly tax reminders
 */
export async function scheduleQuarterlyTaxReminders(quarter: number, year: number) {
  const quarterDates = [
    new Date(year, 0, 15), // Q1: January 15
    new Date(year, 3, 15), // Q2: April 15
    new Date(year, 5, 15), // Q3: June 15
    new Date(year, 8, 15), // Q4: September 15
  ];

  const jobDate = quarterDates[quarter - 1];

  await taxQueue.add(
    'quarterly-tax-reminders',
    { quarter, year },
    {
      delay: jobDate.getTime() - Date.now(),
      attempts: 2,
    }
  );

  logger.info('Scheduled quarterly tax reminder', { quarter, year, scheduledFor: jobDate });
}

/**
 * Trigger immediate tax document generation for a user
 */
export async function triggerUserTaxDocumentGeneration(
  userId: string,
  taxYear: number,
  documentTypes?: string[]
) {
  await taxQueue.add(
    'user-tax-document-generation',
    { userId, taxYear, documentTypes },
    {
      attempts: 2,
    }
  );

  logger.info('Triggered user tax document generation', { userId, taxYear });
}

logger.info('Tax processor initialized');
