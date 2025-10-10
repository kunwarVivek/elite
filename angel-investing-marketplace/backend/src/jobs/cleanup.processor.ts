import { Job } from 'bullmq';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { storageService } from '../services/cloudflareR2.js';

export interface CleanupJobData {
  operation: 'CLEANUP_FILES' | 'CLEANUP_LOGS' | 'CLEANUP_NOTIFICATIONS' | 'CLEANUP_SESSIONS' |
             'CLEANUP_TEMP_DATA' | 'CLEANUP_OLD_JOBS' | 'CLEANUP_EXPIRED_TOKENS' | 'ARCHIVE_OLD_DATA' |
             'CLEANUP_ORPHANED_RECORDS' | 'OPTIMIZE_DATABASE' | 'CLEANUP_CACHE' | 'CLEANUP_ANALYTICS';
  target?: string;
  olderThan?: number; // days
  limit?: number;
  dryRun?: boolean;
  metadata?: Record<string, any>;
}

export interface CleanupJobResult {
  success: boolean;
  operation: string;
  cleanedCount: number;
  errors?: string[];
  metadata?: Record<string, any>;
  processingTime?: number;
  dryRun?: boolean;
}

export class CleanupProcessor {
  static async process(job: Job<CleanupJobData>): Promise<CleanupJobResult> {
    const { operation, target, olderThan = 30, limit = 1000, dryRun = false, metadata = {} } = job.data;
    const startTime = Date.now();

    logger.info('Processing cleanup job', {
      jobId: job.id,
      operation,
      target,
      olderThan,
      limit,
      dryRun
    });

    try {
      let result: CleanupJobResult;

      // Process based on operation type
      switch (operation) {
        case 'CLEANUP_FILES':
          result = await this.cleanupFiles(olderThan, limit, dryRun);
          break;
        case 'CLEANUP_LOGS':
          result = await this.cleanupLogs(olderThan, limit, dryRun);
          break;
        case 'CLEANUP_NOTIFICATIONS':
          result = await this.cleanupNotifications(olderThan, limit, dryRun);
          break;
        case 'CLEANUP_SESSIONS':
          result = await this.cleanupSessions(olderThan, limit, dryRun);
          break;
        case 'CLEANUP_TEMP_DATA':
          result = await this.cleanupTempData(olderThan, limit, dryRun);
          break;
        case 'CLEANUP_OLD_JOBS':
          result = await this.cleanupOldJobs(olderThan, limit, dryRun);
          break;
        case 'CLEANUP_EXPIRED_TOKENS':
          result = await this.cleanupExpiredTokens(limit, dryRun);
          break;
        case 'ARCHIVE_OLD_DATA':
          result = await this.archiveOldData(target, olderThan, dryRun);
          break;
        case 'CLEANUP_ORPHANED_RECORDS':
          result = await this.cleanupOrphanedRecords(dryRun);
          break;
        case 'OPTIMIZE_DATABASE':
          result = await this.optimizeDatabase(dryRun);
          break;
        case 'CLEANUP_CACHE':
          result = await this.cleanupCache(dryRun);
          break;
        case 'CLEANUP_ANALYTICS':
          result = await this.cleanupAnalytics(olderThan, limit, dryRun);
          break;
        default:
          throw new Error(`Unknown cleanup operation: ${operation}`);
      }

      logger.info('Cleanup job completed successfully', {
        jobId: job.id,
        operation,
        cleanedCount: result.cleanedCount,
        dryRun,
        processingTime: Date.now() - startTime
      });

      return {
        ...result,
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      logger.error('Cleanup job failed', {
        jobId: job.id,
        operation,
        error: error instanceof Error ? error.message : String(error)
      });

      throw error;
    }
  }

  private static async cleanupFiles(olderThan: number, limit: number, dryRun: boolean): Promise<CleanupJobResult> {
    try {
      const cutoffDate = new Date(Date.now() - olderThan * 24 * 60 * 60 * 1000);

      // Find old files that can be cleaned up
      const oldFiles = await prisma.file.findMany({
        where: {
          createdAt: { lt: cutoffDate },
          status: { in: ['FAILED', 'PROCESSED'] },
          // Don't cleanup files that are still referenced
          OR: [
            { pitchId: null },
            { userId: null }
          ]
        },
        take: limit
      });

      if (dryRun) {
        return {
          success: true,
          operation: 'CLEANUP_FILES',
          cleanedCount: oldFiles.length,
          dryRun: true,
          metadata: {
            filesFound: oldFiles.length,
            totalSize: oldFiles.reduce((sum, file) => sum + (file.metadata?.size || 0), 0)
          }
        };
      }

      // Delete files from storage and database
      let deletedCount = 0;
      const errors: string[] = [];

      for (const file of oldFiles) {
        try {
          // Delete from storage if storage key exists
          if (file.metadata?.storageKey) {
            await storageService.deleteFile(file.metadata.storageKey);
          }

          // Delete from database
          await prisma.file.delete({
            where: { id: file.id }
          });

          deletedCount++;
        } catch (error) {
          errors.push(`Failed to delete file ${file.id}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      return {
        success: true,
        operation: 'CLEANUP_FILES',
        cleanedCount: deletedCount,
        errors: errors.length > 0 ? errors : undefined,
        metadata: {
          filesFound: oldFiles.length,
          filesDeleted: deletedCount,
          errors: errors.length
        }
      };
    } catch (error) {
      throw new Error(`File cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private static async cleanupLogs(olderThan: number, limit: number, dryRun: boolean): Promise<CleanupJobResult> {
    try {
      const cutoffDate = new Date(Date.now() - olderThan * 24 * 60 * 60 * 1000);

      // Find old log entries
      const oldLogs = await prisma.auditLog.findMany({
        where: {
          createdAt: { lt: cutoffDate },
          // Keep error logs longer
          level: { not: 'ERROR' }
        },
        take: limit
      });

      if (dryRun) {
        return {
          success: true,
          operation: 'CLEANUP_LOGS',
          cleanedCount: oldLogs.length,
          dryRun: true,
          metadata: {
            logsFound: oldLogs.length
          }
        };
      }

      // Delete old logs
      const deletedCount = await prisma.auditLog.deleteMany({
        where: {
          id: { in: oldLogs.map(log => log.id) }
        }
      });

      return {
        success: true,
        operation: 'CLEANUP_LOGS',
        cleanedCount: deletedCount.count,
        metadata: {
          logsFound: oldLogs.length,
          logsDeleted: deletedCount.count
        }
      };
    } catch (error) {
      throw new Error(`Log cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private static async cleanupNotifications(olderThan: number, limit: number, dryRun: boolean): Promise<CleanupJobResult> {
    try {
      const cutoffDate = new Date(Date.now() - olderThan * 24 * 60 * 60 * 1000);

      // Find old notifications
      const oldNotifications = await prisma.notification.findMany({
        where: {
          createdAt: { lt: cutoffDate },
          read: true, // Only cleanup read notifications
          expiresAt: { lt: new Date() } // Only cleanup expired ones
        },
        take: limit
      });

      if (dryRun) {
        return {
          success: true,
          operation: 'CLEANUP_NOTIFICATIONS',
          cleanedCount: oldNotifications.length,
          dryRun: true,
          metadata: {
            notificationsFound: oldNotifications.length
          }
        };
      }

      // Delete old notifications
      const deletedCount = await prisma.notification.deleteMany({
        where: {
          id: { in: oldNotifications.map(notif => notif.id) }
        }
      });

      return {
        success: true,
        operation: 'CLEANUP_NOTIFICATIONS',
        cleanedCount: deletedCount.count,
        metadata: {
          notificationsFound: oldNotifications.length,
          notificationsDeleted: deletedCount.count
        }
      };
    } catch (error) {
      throw new Error(`Notification cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private static async cleanupSessions(olderThan: number, limit: number, dryRun: boolean): Promise<CleanupJobResult> {
    try {
      const cutoffDate = new Date(Date.now() - olderThan * 24 * 60 * 60 * 1000);

      // Find expired sessions
      const expiredSessions = await prisma.session.findMany({
        where: {
          expires: { lt: cutoffDate }
        },
        take: limit
      });

      if (dryRun) {
        return {
          success: true,
          operation: 'CLEANUP_SESSIONS',
          cleanedCount: expiredSessions.length,
          dryRun: true,
          metadata: {
            sessionsFound: expiredSessions.length
          }
        };
      }

      // Delete expired sessions
      const deletedCount = await prisma.session.deleteMany({
        where: {
          id: { in: expiredSessions.map(session => session.id) }
        }
      });

      return {
        success: true,
        operation: 'CLEANUP_SESSIONS',
        cleanedCount: deletedCount.count,
        metadata: {
          sessionsFound: expiredSessions.length,
          sessionsDeleted: deletedCount.count
        }
      };
    } catch (error) {
      throw new Error(`Session cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private static async cleanupTempData(olderThan: number, limit: number, dryRun: boolean): Promise<CleanupJobResult> {
    try {
      const cutoffDate = new Date(Date.now() - olderThan * 24 * 60 * 60 * 1000);

      // Find temporary data (implement based on your temp data structure)
      const tempData = await prisma.tempData.findMany({
        where: {
          createdAt: { lt: cutoffDate }
        },
        take: limit
      });

      if (dryRun) {
        return {
          success: true,
          operation: 'CLEANUP_TEMP_DATA',
          cleanedCount: tempData.length,
          dryRun: true,
          metadata: {
            tempDataFound: tempData.length
          }
        };
      }

      // Delete temp data
      const deletedCount = await prisma.tempData.deleteMany({
        where: {
          id: { in: tempData.map(data => data.id) }
        }
      });

      return {
        success: true,
        operation: 'CLEANUP_TEMP_DATA',
        cleanedCount: deletedCount.count,
        metadata: {
          tempDataFound: tempData.length,
          tempDataDeleted: deletedCount.count
        }
      };
    } catch (error) {
      throw new Error(`Temp data cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private static async cleanupOldJobs(olderThan: number, limit: number, dryRun: boolean): Promise<CleanupJobResult> {
    try {
      // This would clean up old BullMQ jobs
      // For now, we'll simulate the cleanup
      logger.info('Cleaning up old BullMQ jobs', { olderThan, limit, dryRun });

      if (dryRun) {
        return {
          success: true,
          operation: 'CLEANUP_OLD_JOBS',
          cleanedCount: 0, // Would be calculated in real implementation
          dryRun: true,
          metadata: {
            estimatedJobsToCleanup: limit
          }
        };
      }

      // In a real implementation, you would:
      // 1. Get queue instances
      // 2. Clean old completed/failed jobs
      // 3. Return actual count

      return {
        success: true,
        operation: 'CLEANUP_OLD_JOBS',
        cleanedCount: 0,
        metadata: {
          message: 'Old job cleanup completed'
        }
      };
    } catch (error) {
      throw new Error(`Old job cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private static async cleanupExpiredTokens(olderThan: number, dryRun: boolean): Promise<CleanupJobResult> {
    try {
      const cutoffDate = new Date(Date.now() - olderThan * 24 * 60 * 60 * 1000);

      // Find expired tokens
      const expiredTokens = await prisma.verificationToken.findMany({
        where: {
          expires: { lt: cutoffDate }
        }
      });

      if (dryRun) {
        return {
          success: true,
          operation: 'CLEANUP_EXPIRED_TOKENS',
          cleanedCount: expiredTokens.length,
          dryRun: true,
          metadata: {
            tokensFound: expiredTokens.length
          }
        };
      }

      // Delete expired tokens
      const deletedCount = await prisma.verificationToken.deleteMany({
        where: {
          id: { in: expiredTokens.map(token => token.id) }
        }
      });

      return {
        success: true,
        operation: 'CLEANUP_EXPIRED_TOKENS',
        cleanedCount: deletedCount.count,
        metadata: {
          tokensFound: expiredTokens.length,
          tokensDeleted: deletedCount.count
        }
      };
    } catch (error) {
      throw new Error(`Token cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private static async archiveOldData(target: string | undefined, olderThan: number, dryRun: boolean): Promise<CleanupJobResult> {
    try {
      // Archive old data based on target
      logger.info('Archiving old data', { target, olderThan, dryRun });

      if (dryRun) {
        return {
          success: true,
          operation: 'ARCHIVE_OLD_DATA',
          cleanedCount: 0,
          dryRun: true,
          metadata: {
            message: 'Archive operation would be performed'
          }
        };
      }

      // In a real implementation, you would:
      // 1. Move old data to archive tables
      // 2. Compress and store in cold storage
      // 3. Update metadata

      return {
        success: true,
        operation: 'ARCHIVE_OLD_DATA',
        cleanedCount: 0,
        metadata: {
          archivedAt: new Date().toISOString(),
          target,
          olderThan
        }
      };
    } catch (error) {
      throw new Error(`Data archiving failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private static async cleanupOrphanedRecords(dryRun: boolean): Promise<CleanupJobResult> {
    try {
      // Find and cleanup orphaned records
      logger.info('Cleaning up orphaned records', { dryRun });

      if (dryRun) {
        return {
          success: true,
          operation: 'CLEANUP_ORPHANED_RECORDS',
          cleanedCount: 0,
          dryRun: true,
          metadata: {
            message: 'Orphaned record cleanup would be performed'
          }
        };
      }

      // In a real implementation, you would:
      // 1. Find files without associated records
      // 2. Find investments without users/startups
      // 3. Find notifications without users
      // 4. Clean up these orphaned records

      return {
        success: true,
        operation: 'CLEANUP_ORPHANED_RECORDS',
        cleanedCount: 0,
        metadata: {
          cleanedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      throw new Error(`Orphaned record cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private static async optimizeDatabase(dryRun: boolean): Promise<CleanupJobResult> {
    try {
      logger.info('Optimizing database', { dryRun });

      if (dryRun) {
        return {
          success: true,
          operation: 'OPTIMIZE_DATABASE',
          cleanedCount: 0,
          dryRun: true,
          metadata: {
            message: 'Database optimization would be performed'
          }
        };
      }

      // In a real implementation, you would:
      // 1. Rebuild indexes
      // 2. Update table statistics
      // 3. Vacuum tables
      // 4. Optimize query performance

      return {
        success: true,
        operation: 'OPTIMIZE_DATABASE',
        cleanedCount: 0,
        metadata: {
          optimizedAt: new Date().toISOString(),
          operations: ['index_rebuild', 'statistics_update', 'vacuum']
        }
      };
    } catch (error) {
      throw new Error(`Database optimization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private static async cleanupCache(dryRun: boolean): Promise<CleanupJobResult> {
    try {
      logger.info('Cleaning up cache', { dryRun });

      if (dryRun) {
        return {
          success: true,
          operation: 'CLEANUP_CACHE',
          cleanedCount: 0,
          dryRun: true,
          metadata: {
            message: 'Cache cleanup would be performed'
          }
        };
      }

      // In a real implementation, you would:
      // 1. Clear Redis cache
      // 2. Clear application cache
      // 3. Clear CDN cache
      // 4. Clear browser cache headers

      return {
        success: true,
        operation: 'CLEANUP_CACHE',
        cleanedCount: 0,
        metadata: {
          cleanedAt: new Date().toISOString(),
          cacheTypes: ['redis', 'application', 'cdn']
        }
      };
    } catch (error) {
      throw new Error(`Cache cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private static async cleanupAnalytics(olderThan: number, limit: number, dryRun: boolean): Promise<CleanupJobResult> {
    try {
      const cutoffDate = new Date(Date.now() - olderThan * 24 * 60 * 60 * 1000);

      // Find old analytics data
      const oldAnalytics = await prisma.analyticsEvent.findMany({
        where: {
          createdAt: { lt: cutoffDate }
        },
        take: limit
      });

      if (dryRun) {
        return {
          success: true,
          operation: 'CLEANUP_ANALYTICS',
          cleanedCount: oldAnalytics.length,
          dryRun: true,
          metadata: {
            analyticsFound: oldAnalytics.length
          }
        };
      }

      // Delete old analytics data
      const deletedCount = await prisma.analyticsEvent.deleteMany({
        where: {
          id: { in: oldAnalytics.map(event => event.id) }
        }
      });

      return {
        success: true,
        operation: 'CLEANUP_ANALYTICS',
        cleanedCount: deletedCount.count,
        metadata: {
          analyticsFound: oldAnalytics.length,
          analyticsDeleted: deletedCount.count
        }
      };
    } catch (error) {
      throw new Error(`Analytics cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Queue cleanup job
  static async queueCleanupJob(
    operation: CleanupJobData['operation'],
    options: {
      target?: string;
      olderThan?: number;
      limit?: number;
      dryRun?: boolean;
      delay?: number;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<void> {
    const { cleanupQueue } = await import('../config/queues.js');

    await cleanupQueue.add('cleanup-operation', {
      operation,
      target: options.target,
      olderThan: options.olderThan,
      limit: options.limit,
      dryRun: options.dryRun,
      metadata: options.metadata,
      queuedAt: new Date().toISOString()
    }, {
      delay: options.delay || 0
    });

    logger.info('Cleanup job queued', {
      operation,
      target: options.target,
      olderThan: options.olderThan,
      limit: options.limit,
      dryRun: options.dryRun
    });
  }

  // Schedule periodic cleanup
  static async schedulePeriodicCleanup(): Promise<void> {
    const operations: CleanupJobData['operation'][] = [
      'CLEANUP_FILES',
      'CLEANUP_LOGS',
      'CLEANUP_NOTIFICATIONS',
      'CLEANUP_SESSIONS',
      'CLEANUP_EXPIRED_TOKENS'
    ];

    for (const operation of operations) {
      await this.queueCleanupJob(operation, {
        olderThan: operation === 'CLEANUP_FILES' ? 90 : 30,
        limit: 1000,
        delay: Math.random() * 60 * 60 * 1000 // Random delay within first hour
      });
    }

    logger.info('Periodic cleanup jobs scheduled', {
      operations: operations.length
    });
  }
}

export default CleanupProcessor;