import { Queue, Worker, QueueScheduler } from 'bullmq';
import IORedis from 'ioredis';
import { logger } from '../config/logger.js';
import { env } from '../config/environment.js';
import { interestAccrualJob } from './interest-accrual.job.js';
import { conversionTriggerJob } from './conversion-trigger.job.js';

/**
 * Redis connection for BullMQ
 */
const redisConnection = new IORedis({
  host: env.REDIS_HOST || 'localhost',
  port: env.REDIS_PORT || 6379,
  password: env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
});

/**
 * Job Queues
 */
export const interestAccrualQueue = new Queue('interest-accrual', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      count: 100, // Keep last 100 completed jobs
      age: 7 * 24 * 3600, // Keep for 7 days
    },
    removeOnFail: {
      count: 500, // Keep last 500 failed jobs
      age: 30 * 24 * 3600, // Keep for 30 days
    },
  },
});

export const conversionTriggerQueue = new Queue('conversion-trigger', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      count: 100,
      age: 7 * 24 * 3600,
    },
    removeOnFail: {
      count: 500,
      age: 30 * 24 * 3600,
    },
  },
});

/**
 * Job Scheduler
 *
 * Manages all scheduled background jobs for the application using BullMQ
 */
export class JobScheduler {
  private workers: Worker[] = [];
  private schedulers: QueueScheduler[] = [];
  private initialized = false;

  /**
   * Initialize all scheduled jobs and workers
   */
  async initializeJobs() {
    if (this.initialized) {
      logger.warn('Job scheduler already initialized');
      return;
    }

    logger.info('🕐 Initializing scheduled jobs...');

    try {
      // Initialize queue schedulers (for delayed/repeated jobs)
      const interestAccrualScheduler = new QueueScheduler('interest-accrual', {
        connection: redisConnection,
      });
      this.schedulers.push(interestAccrualScheduler);

      const conversionTriggerScheduler = new QueueScheduler('conversion-trigger', {
        connection: redisConnection,
      });
      this.schedulers.push(conversionTriggerScheduler);

      // Initialize workers
      const interestAccrualWorker = new Worker(
        'interest-accrual',
        async (job) => {
          logger.info('Processing interest accrual job', { jobId: job.id });
          const result = await interestAccrualJob();
          return result;
        },
        {
          connection: redisConnection,
          concurrency: 1, // Process one job at a time
        }
      );

      const conversionTriggerWorker = new Worker(
        'conversion-trigger',
        async (job) => {
          logger.info('Processing conversion trigger job', { jobId: job.id });
          const result = await conversionTriggerJob();
          return result;
        },
        {
          connection: redisConnection,
          concurrency: 1,
        }
      );

      // Set up event handlers for interest accrual worker
      interestAccrualWorker.on('completed', (job, result) => {
        logger.info('Interest accrual job completed', {
          jobId: job.id,
          result,
        });
      });

      interestAccrualWorker.on('failed', (job, error) => {
        logger.error('Interest accrual job failed', {
          jobId: job?.id,
          error: error.message,
          stack: error.stack,
        });
      });

      // Set up event handlers for conversion trigger worker
      conversionTriggerWorker.on('completed', (job, result) => {
        logger.info('Conversion trigger job completed', {
          jobId: job.id,
          result,
        });
      });

      conversionTriggerWorker.on('failed', (job, error) => {
        logger.error('Conversion trigger job failed', {
          jobId: job?.id,
          error: error.message,
          stack: error.stack,
        });
      });

      this.workers.push(interestAccrualWorker, conversionTriggerWorker);

      // Schedule recurring jobs
      // Interest accrual: Daily at 1:00 AM EST (0 1 * * *)
      await interestAccrualQueue.add(
        'daily-interest-accrual',
        {},
        {
          repeat: {
            pattern: '0 1 * * *',
            tz: 'America/New_York',
          },
          jobId: 'daily-interest-accrual', // Prevents duplicate jobs
        }
      );
      logger.info('✅ Interest accrual job scheduled (daily at 1:00 AM EST)');

      // Conversion trigger: Every 6 hours (0 */6 * * *)
      await conversionTriggerQueue.add(
        'conversion-trigger-check',
        {},
        {
          repeat: {
            pattern: '0 */6 * * *',
            tz: 'America/New_York',
          },
          jobId: 'conversion-trigger-check',
        }
      );
      logger.info('✅ Conversion trigger job scheduled (every 6 hours)');

      this.initialized = true;
      logger.info(`🎯 Job scheduler initialized with ${this.workers.length} workers`);
    } catch (error) {
      logger.error('❌ Failed to initialize scheduled jobs', { error });
      throw error;
    }
  }

  /**
   * Stop all workers and close connections
   */
  async stopAllJobs() {
    logger.info('Stopping all scheduled jobs...');

    try {
      // Close all workers
      await Promise.all(this.workers.map((worker) => worker.close()));
      logger.info(`Closed ${this.workers.length} workers`);

      // Close all schedulers
      await Promise.all(this.schedulers.map((scheduler) => scheduler.close()));
      logger.info(`Closed ${this.schedulers.length} schedulers`);

      // Close Redis connection
      await redisConnection.quit();
      logger.info('Closed Redis connection');

      this.workers = [];
      this.schedulers = [];
      this.initialized = false;

      logger.info('✅ All scheduled jobs stopped');
    } catch (error) {
      logger.error('Error stopping jobs', { error });
      throw error;
    }
  }

  /**
   * Get job status from all queues
   */
  async getJobStatus() {
    try {
      const [interestAccrualCounts, conversionTriggerCounts] = await Promise.all([
        interestAccrualQueue.getJobCounts(),
        conversionTriggerQueue.getJobCounts(),
      ]);

      return {
        initialized: this.initialized,
        workers: this.workers.length,
        queues: {
          interestAccrual: {
            name: 'interest-accrual',
            counts: interestAccrualCounts,
          },
          conversionTrigger: {
            name: 'conversion-trigger',
            counts: conversionTriggerCounts,
          },
        },
      };
    } catch (error) {
      logger.error('Error getting job status', { error });
      throw error;
    }
  }

  /**
   * Run a job manually (for testing/admin)
   */
  async runJobManually(jobName: string) {
    logger.info(`Manually running job: ${jobName}`);

    try {
      let result;

      switch (jobName) {
        case 'interestAccrual':
          result = await interestAccrualQueue.add('manual-run', {}, { priority: 1 });
          break;
        case 'conversionTrigger':
          result = await conversionTriggerQueue.add('manual-run', {}, { priority: 1 });
          break;
        default:
          throw new Error(`Unknown job: ${jobName}`);
      }

      logger.info(`✅ Job ${jobName} queued successfully`, { jobId: result.id });
      return result;
    } catch (error) {
      logger.error(`Error queuing job ${jobName}`, { error });
      throw error;
    }
  }

  /**
   * Clear all jobs from a queue
   */
  async clearQueue(queueName: string) {
    logger.warn(`Clearing queue: ${queueName}`);

    try {
      let queue: Queue;

      switch (queueName) {
        case 'interestAccrual':
          queue = interestAccrualQueue;
          break;
        case 'conversionTrigger':
          queue = conversionTriggerQueue;
          break;
        default:
          throw new Error(`Unknown queue: ${queueName}`);
      }

      await queue.obliterate({ force: true });
      logger.info(`✅ Queue ${queueName} cleared successfully`);
    } catch (error) {
      logger.error(`Error clearing queue ${queueName}`, { error });
      throw error;
    }
  }
}

// Export singleton instance
export const jobScheduler = new JobScheduler();
