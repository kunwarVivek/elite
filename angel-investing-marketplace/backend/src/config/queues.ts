import { Queue, Worker, Job } from 'bullmq';
import { redis } from './redis.js';
import { logger } from './logger.js';

// Queue names
export const QUEUE_NAMES = {
  EMAIL: 'email',
  NOTIFICATIONS: 'notifications',
  FILE_PROCESSING: 'file-processing',
  DATA_EXPORT: 'data-export',
  PAYMENT_PROCESSING: 'payment-processing',
  ANALYTICS: 'analytics',
  CLEANUP: 'cleanup',
} as const;

// Queue configurations
export const queueConfigs = {
  defaultJobOptions: {
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 50, // Keep last 50 failed jobs
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000, // 2 seconds
    },
  },

  connection: redis,
};

// Create queues
export const emailQueue = new Queue(QUEUE_NAMES.EMAIL, {
  ...queueConfigs,
  defaultJobOptions: {
    ...queueConfigs.defaultJobOptions,
    attempts: 5, // Emails are important, try more times
  },
});

export const notificationQueue = new Queue(QUEUE_NAMES.NOTIFICATIONS, {
  ...queueConfigs,
  defaultJobOptions: {
    ...queueConfigs.defaultJobOptions,
    attempts: 3,
  },
});

export const fileProcessingQueue = new Queue(QUEUE_NAMES.FILE_PROCESSING, {
  ...queueConfigs,
  defaultJobOptions: {
    ...queueConfigs.defaultJobOptions,
    attempts: 2, // File processing might fail due to size/format issues
  },
});

export const dataExportQueue = new Queue(QUEUE_NAMES.DATA_EXPORT, {
  ...queueConfigs,
  defaultJobOptions: {
    ...queueConfigs.defaultJobOptions,
    attempts: 1, // Data exports should be handled carefully
  },
});

export const paymentQueue = new Queue(QUEUE_NAMES.PAYMENT_PROCESSING, {
  ...queueConfigs,
  defaultJobOptions: {
    ...queueConfigs.defaultJobOptions,
    attempts: 3,
  },
});

export const analyticsQueue = new Queue(QUEUE_NAMES.ANALYTICS, {
  ...queueConfigs,
  defaultJobOptions: {
    ...queueConfigs.defaultJobOptions,
    attempts: 2,
  },
});

export const cleanupQueue = new Queue(QUEUE_NAMES.CLEANUP, {
  ...queueConfigs,
  defaultJobOptions: {
    ...queueConfigs.defaultJobOptions,
    attempts: 1,
  },
});

// Queue schedulers are no longer needed in BullMQ v5

// Job processor functions
export const jobProcessors = {
  // Email processing
  [QUEUE_NAMES.EMAIL]: async (job: Job) => {
    logger.info('Processing email job', { jobId: job.id, type: job.name });

    const { to, subject, template: _template, data: _data } = job.data;

    try {
      // TODO: Implement email sending logic
      logger.info('Email sent successfully', { to, subject });

      return { success: true, messageId: 'mock-id' };
    } catch (error) {
      logger.error('Email job failed', { jobId: job.id, error });
      throw error;
    }
  },

  // Notification processing
  [QUEUE_NAMES.NOTIFICATIONS]: async (job: Job) => {
    logger.info('Processing notification job', { jobId: job.id, type: job.name });

    const { userId, type, title: _title, message: _message, data: _data } = job.data;

    try {
      // TODO: Implement notification sending logic
      logger.info('Notification sent successfully', { userId, type });

      return { success: true, notificationId: 'mock-id' };
    } catch (error) {
      logger.error('Notification job failed', { jobId: job.id, error });
      throw error;
    }
  },

  // File processing
  [QUEUE_NAMES.FILE_PROCESSING]: async (job: Job) => {
    logger.info('Processing file job', { jobId: job.id, type: job.name });

    const { fileId, operation, options: _options } = job.data;

    try {
      // TODO: Implement file processing logic (resize, convert, etc.)
      logger.info('File processed successfully', { fileId, operation });

      return { success: true, processedFileId: 'mock-id' };
    } catch (error) {
      logger.error('File processing job failed', { jobId: job.id, error });
      throw error;
    }
  },

  // Data export
  [QUEUE_NAMES.DATA_EXPORT]: async (job: Job) => {
    logger.info('Processing data export job', { jobId: job.id, type: job.name });

    const { userId, exportType, format, filters: _filters } = job.data;

    try {
      // TODO: Implement data export logic
      logger.info('Data export completed', { userId, exportType, format });

      return { success: true, downloadUrl: 'mock-url' };
    } catch (error) {
      logger.error('Data export job failed', { jobId: job.id, error });
      throw error;
    }
  },

  // Payment processing
  [QUEUE_NAMES.PAYMENT_PROCESSING]: async (job: Job) => {
    logger.info('Processing payment job', { jobId: job.id, type: job.name });

    const { operation, data } = job.data;

    try {
      switch (operation) {
        case 'PROCESS_BANK_TRANSFER':
          return await processBankTransferJob(data);
        case 'RELEASE_ESCROW':
          return await releaseEscrowJob(data);
        case 'PROCESS_REFUND':
          return await processRefundJob(data);
        case 'UPDATE_PAYMENT_STATUS':
          return await updatePaymentStatusJob(data);
        case 'SEND_PAYMENT_NOTIFICATIONS':
          return await sendPaymentNotificationsJob(data);
        case 'VALIDATE_KYC':
          return await validateKycJob(data);
        case 'SCREEN_AML':
          return await screenAmlJob(data);
        case 'CALCULATE_FEES':
          return await calculateFeesJob(data);
        case 'UPDATE_ESCROW_STATUS':
          return await updateEscrowStatusJob(data);
        case 'PROCESS_DISPUTE':
          return await processDisputeJob(data);
        default:
          throw new Error(`Unknown payment operation: ${operation}`);
      }
    } catch (error) {
      logger.error('Payment processing job failed', { jobId: job.id, operation, error });
      throw error;
    }
  },

  // Analytics processing
  [QUEUE_NAMES.ANALYTICS]: async (job: Job) => {
    logger.info('Processing analytics job', { jobId: job.id, type: job.name });

    const { eventType, data: _data, timestamp: _timestamp } = job.data;

    try {
      // TODO: Implement analytics processing logic
      logger.info('Analytics processed successfully', { eventType });

      return { success: true };
    } catch (error) {
      logger.error('Analytics job failed', { jobId: job.id, error });
      throw error;
    }
  },

  // Cleanup processing
  [QUEUE_NAMES.CLEANUP]: async (job: Job) => {
    logger.info('Processing cleanup job', { jobId: job.id, type: job.name });

    const { operation, target, olderThan: _olderThan } = job.data;

    try {
      // TODO: Implement cleanup logic (old files, logs, etc.)
      logger.info('Cleanup completed successfully', { operation, target });

      return { success: true, cleanedCount: 0 };
    } catch (error) {
      logger.error('Cleanup job failed', { jobId: job.id, error });
      throw error;
    }
  },
};

// Create workers
export const workers = {
  emailWorker: new Worker(QUEUE_NAMES.EMAIL, jobProcessors[QUEUE_NAMES.EMAIL], {
    connection: redis,
    concurrency: 5,
  }),

  notificationWorker: new Worker(QUEUE_NAMES.NOTIFICATIONS, jobProcessors[QUEUE_NAMES.NOTIFICATIONS], {
    connection: redis,
    concurrency: 10,
  }),

  fileProcessingWorker: new Worker(QUEUE_NAMES.FILE_PROCESSING, jobProcessors[QUEUE_NAMES.FILE_PROCESSING], {
    connection: redis,
    concurrency: 2,
  }),

  dataExportWorker: new Worker(QUEUE_NAMES.DATA_EXPORT, jobProcessors[QUEUE_NAMES.DATA_EXPORT], {
    connection: redis,
    concurrency: 1,
  }),

  paymentWorker: new Worker(QUEUE_NAMES.PAYMENT_PROCESSING, jobProcessors[QUEUE_NAMES.PAYMENT_PROCESSING], {
    connection: redis,
    concurrency: 3,
  }),

  analyticsWorker: new Worker(QUEUE_NAMES.ANALYTICS, jobProcessors[QUEUE_NAMES.ANALYTICS], {
    connection: redis,
    concurrency: 5,
  }),

  cleanupWorker: new Worker(QUEUE_NAMES.CLEANUP, jobProcessors[QUEUE_NAMES.CLEANUP], {
    connection: redis,
    concurrency: 1,
  }),
};

// Worker event listeners
Object.values(workers).forEach((worker) => {
  worker.on('completed', (job) => {
    logger.info('Job completed', {
      queue: worker.name,
      jobId: job.id,
      jobName: job.name,
    });
  });

  worker.on('failed', (job, err) => {
    logger.error('Job failed', {
      queue: worker.name,
      jobId: job?.id,
      jobName: job?.name,
      error: err.message,
    });
  });

  worker.on('error', (err) => {
    logger.error('Worker error', {
      queue: worker.name,
      error: err.message,
    });
  });
});

// Queue management utilities
export const queueUtils = {
  // Get queue stats
  getQueueStats: async (queueName: string) => {
    const queue = getQueueByName(queueName);
    if (!queue) return null;

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed(),
      queue.getDelayed(),
    ]);

    return {
      queue: queueName,
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
    };
  },

  // Clean up old jobs
  cleanupQueue: async (queueName: string, graceDays: number = 7) => {
    const queue = getQueueByName(queueName);
    if (!queue) return;

    const graceTime = graceDays * 24 * 60 * 60 * 1000; // Convert to milliseconds

    await Promise.all([
      queue.clean(graceTime, 1000, 'completed'),
      queue.clean(graceTime, 1000, 'failed'),
    ]);

    logger.info('Queue cleaned up', { queueName, graceDays });
  },

  // Pause queue
  pauseQueue: async (queueName: string) => {
    const queue = getQueueByName(queueName);
    if (!queue) return;

    await queue.pause();
    logger.info('Queue paused', { queueName });
  },

  // Resume queue
  resumeQueue: async (queueName: string) => {
    const queue = getQueueByName(queueName);
    if (!queue) return;

    await queue.resume();
    logger.info('Queue resumed', { queueName });
  },
};

// Helper function to get queue by name
export const getQueueByName = (queueName: string): Queue | null => {
  switch (queueName) {
    case QUEUE_NAMES.EMAIL:
      return emailQueue;
    case QUEUE_NAMES.NOTIFICATIONS:
      return notificationQueue;
    case QUEUE_NAMES.FILE_PROCESSING:
      return fileProcessingQueue;
    case QUEUE_NAMES.DATA_EXPORT:
      return dataExportQueue;
    case QUEUE_NAMES.PAYMENT_PROCESSING:
      return paymentQueue;
    case QUEUE_NAMES.ANALYTICS:
      return analyticsQueue;
    case QUEUE_NAMES.CLEANUP:
      return cleanupQueue;
    default:
      return null;
  }
};

// Graceful shutdown
export const closeQueues = async (): Promise<void> => {
  try {
    // Close all workers
    await Promise.all(Object.values(workers).map(worker => worker.close()));

    // Close all queues
    await Promise.all([
      emailQueue.close(),
      notificationQueue.close(),
      fileProcessingQueue.close(),
      dataExportQueue.close(),
      paymentQueue.close(),
      analyticsQueue.close(),
      cleanupQueue.close(),
    ]);

    // Schedulers are no longer needed in BullMQ v5

    logger.info('All queues and workers closed successfully');
  } catch (error) {
    logger.error('Error closing queues', { error });
    throw error;
  }
};

// Payment job processor functions
async function processBankTransferJob(data: any) {
  const { investmentId, amount, investorId: _investorId, bankAccountId: _bankAccountId } = data;

  logger.info('Processing bank transfer', { investmentId, amount });

  // TODO: Implement actual bank transfer processing
  // This would integrate with Plaid or direct bank APIs

  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 2000));

  return {
    success: true,
    transactionId: `bt_${Date.now()}`,
    status: 'COMPLETED',
    processedAt: new Date().toISOString(),
  };
}

async function releaseEscrowJob(data: any) {
  const { escrowReference, releaseType, conditions: _conditions } = data;

  logger.info('Releasing escrow funds', { escrowReference, releaseType });

  // TODO: Implement actual escrow release
  // This would transfer funds from escrow to startup

  return {
    success: true,
    escrowReference,
    status: 'RELEASED',
    releasedAt: new Date().toISOString(),
  };
}

async function processRefundJob(data: any) {
  const { investmentId, refundAmount, reason, paymentIntentId: _paymentIntentId } = data;

  logger.info('Processing refund', { investmentId, refundAmount, reason });

  // TODO: Implement actual refund processing
  // This would initiate refund through payment processor

  return {
    success: true,
    refundId: `ref_${Date.now()}`,
    amount: refundAmount,
    status: 'PROCESSED',
    processedAt: new Date().toISOString(),
  };
}

async function updatePaymentStatusJob(data: any) {
  const { investmentId, status, paymentIntentId: _paymentIntentId } = data;

  logger.info('Updating payment status', { investmentId, status });

  // TODO: Update investment status in database
  // TODO: Trigger appropriate notifications

  return {
    success: true,
    investmentId,
    status,
    updatedAt: new Date().toISOString(),
  };
}

async function sendPaymentNotificationsJob(data: any) {
  const { investmentId, notificationType, recipients } = data;

  logger.info('Sending payment notifications', { investmentId, notificationType });

  // TODO: Send notifications to relevant parties
  // This would use the notification queue

  return {
    success: true,
    investmentId,
    notificationType,
    sentTo: recipients,
    sentAt: new Date().toISOString(),
  };
}

async function validateKycJob(data: any) {
  const { userId, investmentAmount } = data;

  logger.info('Validating KYC', { userId, investmentAmount });

  // TODO: Implement KYC validation
  // This would integrate with KYC providers

  return {
    success: true,
    userId,
    kycStatus: 'VERIFIED',
    validatedAt: new Date().toISOString(),
  };
}

async function screenAmlJob(data: any) {
  const { transactionId, amount, userId: _userId } = data;

  logger.info('Screening AML', { transactionId, amount });

  // TODO: Implement AML screening
  // This would integrate with AML services

  return {
    success: true,
    transactionId,
    amlStatus: 'CLEARED',
    screenedAt: new Date().toISOString(),
  };
}

async function calculateFeesJob(data: any) {
  const { investmentId, amount, investmentType } = data;

  logger.info('Calculating fees', { investmentId, amount, investmentType });

  // TODO: Calculate and store fees in database
  // This would use the FeeCalculatorService

  return {
    success: true,
    investmentId,
    platformFee: amount * 0.05, // Example calculation
    totalFees: amount * 0.05,
    calculatedAt: new Date().toISOString(),
  };
}

async function updateEscrowStatusJob(data: any) {
  const { escrowReference, status, reason: _reason } = data;

  logger.info('Updating escrow status', { escrowReference, status });

  // TODO: Update escrow status in database
  // TODO: Trigger appropriate actions based on status

  return {
    success: true,
    escrowReference,
    status,
    updatedAt: new Date().toISOString(),
  };
}

async function processDisputeJob(data: any) {
  const { disputeId, action, adminId } = data;

  logger.info('Processing dispute', { disputeId, action });

  // TODO: Process dispute action (resolve, escalate, etc.)
  // This would update dispute status and notify parties

  return {
    success: true,
    disputeId,
    action,
    processedBy: adminId,
    processedAt: new Date().toISOString(),
  };
}

export default {
  queues: {
    email: emailQueue,
    notifications: notificationQueue,
    fileProcessing: fileProcessingQueue,
    dataExport: dataExportQueue,
    payments: paymentQueue,
    analytics: analyticsQueue,
    cleanup: cleanupQueue,
  },
  workers,
  utils: queueUtils,
};