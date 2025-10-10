import { Job, Queue } from 'bullmq';
import { logger } from '../config/logger.js';
import { prisma } from '../config/database.js';
import { getEnhancedWebSocketService, RoomTypes } from './websocket.service.js';

export interface ErrorContext {
  jobId?: string;
  queueName?: string;
  operation?: string;
  userId?: string;
  investmentId?: string;
  startupId?: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'network' | 'database' | 'external_service' | 'validation' | 'system' | 'unknown';
  metadata?: Record<string, any>;
}

export interface RetryStrategy {
  maxAttempts: number;
  backoffType: 'fixed' | 'exponential' | 'linear' | 'fibonacci';
  initialDelay: number;
  maxDelay: number;
  multiplier?: number;
  jitter: boolean;
}

export interface CircuitBreakerState {
  failureCount: number;
  lastFailureTime: Date;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  nextAttemptTime: Date;
}

export interface DeadLetterJob {
  id: string;
  jobId: string;
  queueName: string;
  error: string;
  errorContext: ErrorContext;
  retryCount: number;
  maxRetries: number;
  deadLetterAt: string;
  canRetry: boolean;
  retryAfter?: string;
  metadata?: Record<string, any>;
}

export class ErrorRecoveryService {
  private wsService = getEnhancedWebSocketService();
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private retryStrategies: Map<string, RetryStrategy> = new Map();
  private deadLetterQueue: DeadLetterJob[] = [];
  private isRunning = false;

  constructor() {
    this.initializeErrorRecovery();
  }

  private async initializeErrorRecovery(): Promise<void> {
    this.isRunning = true;
    this.setupDefaultRetryStrategies();
    this.startCircuitBreakerMonitoring();
    this.startDeadLetterProcessing();

    logger.info('Error recovery service initialized');
  }

  private setupDefaultRetryStrategies(): void {
    // Email retry strategy - more aggressive for important notifications
    this.retryStrategies.set('email', {
      maxAttempts: 5,
      backoffType: 'exponential',
      initialDelay: 2000,
      maxDelay: 300000, // 5 minutes
      multiplier: 2,
      jitter: true
    });

    // Payment retry strategy - critical for financial operations
    this.retryStrategies.set('payment', {
      maxAttempts: 3,
      backoffType: 'exponential',
      initialDelay: 5000,
      maxDelay: 600000, // 10 minutes
      multiplier: 2.5,
      jitter: true
    });

    // File processing - moderate retry for resource-intensive operations
    this.retryStrategies.set('file', {
      maxAttempts: 2,
      backoffType: 'linear',
      initialDelay: 10000,
      maxDelay: 120000, // 2 minutes
      multiplier: 1.5,
      jitter: false
    });

    // Analytics - high volume, low criticality
    this.retryStrategies.set('analytics', {
      maxAttempts: 2,
      backoffType: 'fixed',
      initialDelay: 5000,
      maxDelay: 30000,
      jitter: true
    });

    // Notifications - moderate retry
    this.retryStrategies.set('notification', {
      maxAttempts: 3,
      backoffType: 'exponential',
      initialDelay: 3000,
      maxDelay: 180000, // 3 minutes
      multiplier: 2,
      jitter: true
    });

    // Cleanup - low retry for maintenance tasks
    this.retryStrategies.set('cleanup', {
      maxAttempts: 1,
      backoffType: 'fixed',
      initialDelay: 60000,
      maxDelay: 60000,
      jitter: false
    });
  }

  // Enhanced error handling with categorization
  async handleJobError(job: Job, error: Error, context?: Partial<ErrorContext>): Promise<boolean> {
    try {
      const errorContext = await this.buildErrorContext(job, error, context);

      // Log the error with full context
      logger.error('Job error occurred', {
        jobId: job.id,
        queueName: job.queue.name,
        error: error.message,
        stack: error.stack,
        context: errorContext
      });

      // Store error in database
      await this.storeJobError(job, error, errorContext);

      // Check circuit breaker
      const shouldRetry = await this.checkCircuitBreaker(job.queue.name);

      if (shouldRetry && job.attemptsMade < job.opts.attempts) {
        // Calculate retry delay
        const retryDelay = this.calculateRetryDelay(job);

        logger.info('Retrying job after error', {
          jobId: job.id,
          attempt: job.attemptsMade + 1,
          maxAttempts: job.opts.attempts,
          retryDelay
        });

        // Schedule retry with calculated delay
        await job.moveToDelayed(retryDelay);

        return true;
      } else {
        // Move to dead letter queue
        await this.moveToDeadLetterQueue(job, error, errorContext);

        // Send alert for critical failures
        if (errorContext.severity === 'critical') {
          await this.sendCriticalErrorAlert(errorContext);
        }

        return false;
      }
    } catch (recoveryError) {
      logger.error('Error recovery failed', {
        jobId: job.id,
        originalError: error.message,
        recoveryError: recoveryError instanceof Error ? recoveryError.message : String(recoveryError)
      });

      return false;
    }
  }

  // Build comprehensive error context
  private async buildErrorContext(job: Job, error: Error, context?: Partial<ErrorContext>): Promise<ErrorContext> {
    const errorCategory = this.categorizeError(error);
    const severity = this.determineSeverity(error, errorCategory);

    // Extract additional context from job data
    const jobData = job.data;
    const userId = jobData.userId || jobData.investorId;
    const investmentId = jobData.investmentId;
    const startupId = jobData.startupId;

    // Get queue-specific context
    const queueContext = await this.getQueueContext(job.queue.name);

    return {
      jobId: job.id,
      queueName: job.queue.name,
      operation: job.name,
      userId,
      investmentId,
      startupId,
      timestamp: new Date().toISOString(),
      severity,
      category: errorCategory,
      metadata: {
        attemptNumber: job.attemptsMade,
        maxAttempts: job.opts.attempts,
        jobAge: Date.now() - job.timestamp,
        queueContext,
        errorType: error.constructor.name,
        errorCode: (error as any).code,
        ...context?.metadata
      }
    };
  }

  // Categorize error types for better handling
  private categorizeError(error: Error): ErrorContext['category'] {
    const message = error.message.toLowerCase();
    const name = error.constructor.name.toLowerCase();

    if (message.includes('network') || message.includes('timeout') || message.includes('connection')) {
      return 'network';
    }

    if (message.includes('database') || message.includes('prisma') || message.includes('sql')) {
      return 'database';
    }

    if (message.includes('stripe') || message.includes('payment') || message.includes('api')) {
      return 'external_service';
    }

    if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
      return 'validation';
    }

    if (message.includes('memory') || message.includes('cpu') || message.includes('resource')) {
      return 'system';
    }

    return 'unknown';
  }

  // Determine error severity
  private determineSeverity(error: Error, category: ErrorContext['category']): ErrorContext['severity'] {
    const message = error.message.toLowerCase();

    // Critical errors
    if (category === 'system' || message.includes('out of memory') || message.includes('disk space')) {
      return 'critical';
    }

    // High severity errors
    if (category === 'database' || message.includes('connection lost') || message.includes('corruption')) {
      return 'high';
    }

    // Medium severity errors
    if (category === 'external_service' || message.includes('rate limit') || message.includes('unauthorized')) {
      return 'medium';
    }

    // Low severity errors
    return 'low';
  }

  // Check circuit breaker state
  private async checkCircuitBreaker(queueName: string): Promise<boolean> {
    const circuitBreaker = this.circuitBreakers.get(queueName);

    if (!circuitBreaker) {
      // No circuit breaker, allow retry
      return true;
    }

    const now = new Date();

    switch (circuitBreaker.state) {
      case 'CLOSED':
        return true;

      case 'OPEN':
        if (now >= circuitBreaker.nextAttemptTime) {
          // Transition to half-open
          circuitBreaker.state = 'HALF_OPEN';
          return true;
        }
        return false;

      case 'HALF_OPEN':
        return true;

      default:
        return true;
    }
  }

  // Update circuit breaker state
  private updateCircuitBreaker(queueName: string, success: boolean): void {
    let circuitBreaker = this.circuitBreakers.get(queueName);

    if (!circuitBreaker) {
      circuitBreaker = {
        failureCount: 0,
        lastFailureTime: new Date(),
        state: 'CLOSED',
        nextAttemptTime: new Date()
      };
      this.circuitBreakers.set(queueName, circuitBreaker);
    }

    if (success) {
      if (circuitBreaker.state === 'HALF_OPEN') {
        // Success in half-open state, close circuit
        circuitBreaker.state = 'CLOSED';
        circuitBreaker.failureCount = 0;
      }
    } else {
      circuitBreaker.failureCount++;
      circuitBreaker.lastFailureTime = new Date();

      // Open circuit after 5 failures
      if (circuitBreaker.failureCount >= 5) {
        circuitBreaker.state = 'OPEN';
        circuitBreaker.nextAttemptTime = new Date(Date.now() + 60000); // 1 minute timeout
      }
    }
  }

  // Calculate retry delay based on strategy
  private calculateRetryDelay(job: Job): number {
    const strategy = this.retryStrategies.get(job.queue.name) || this.getDefaultRetryStrategy();
    const attempt = job.attemptsMade;

    let delay: number;

    switch (strategy.backoffType) {
      case 'fixed':
        delay = strategy.initialDelay;
        break;

      case 'linear':
        delay = strategy.initialDelay * attempt * (strategy.multiplier || 1);
        break;

      case 'exponential':
        delay = strategy.initialDelay * Math.pow(strategy.multiplier || 2, attempt - 1);
        break;

      case 'fibonacci':
        delay = this.fibonacci(attempt) * strategy.initialDelay;
        break;

      default:
        delay = strategy.initialDelay;
    }

    // Apply max delay cap
    delay = Math.min(delay, strategy.maxDelay);

    // Add jitter if enabled
    if (strategy.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }

    return Math.floor(delay);
  }

  private fibonacci(n: number): number {
    if (n <= 1) return 1;
    let a = 1, b = 1;
    for (let i = 2; i <= n; i++) {
      const temp = a + b;
      a = b;
      b = temp;
    }
    return b;
  }

  private getDefaultRetryStrategy(): RetryStrategy {
    return {
      maxAttempts: 3,
      backoffType: 'exponential',
      initialDelay: 2000,
      maxDelay: 300000,
      multiplier: 2,
      jitter: true
    };
  }

  // Move failed job to dead letter queue
  private async moveToDeadLetterQueue(job: Job, error: Error, context: ErrorContext): Promise<void> {
    try {
      const deadLetterJob: DeadLetterJob = {
        id: `dl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        jobId: job.id || '',
        queueName: job.queue.name,
        error: error.message,
        errorContext: context,
        retryCount: job.attemptsMade,
        maxRetries: job.opts.attempts,
        deadLetterAt: new Date().toISOString(),
        canRetry: await this.canRetryDeadLetterJob(job, context),
        retryAfter: await this.calculateDeadLetterRetryTime(job, context),
        metadata: {
          jobName: job.name,
          jobData: job.data,
          failedAt: new Date().toISOString()
        }
      };

      this.deadLetterQueue.push(deadLetterJob);

      // Store in database
      await this.storeDeadLetterJob(deadLetterJob);

      logger.info('Job moved to dead letter queue', {
        jobId: job.id,
        queueName: job.queue.name,
        canRetry: deadLetterJob.canRetry,
        retryAfter: deadLetterJob.retryAfter
      });
    } catch (dlError) {
      logger.error('Failed to move job to dead letter queue', {
        jobId: job.id,
        error: dlError instanceof Error ? dlError.message : String(dlError)
      });
    }
  }

  // Check if dead letter job can be retried
  private async canRetryDeadLetterJob(job: Job, context: ErrorContext): Promise<boolean> {
    // Don't retry validation errors
    if (context.category === 'validation') {
      return false;
    }

    // Don't retry system resource errors
    if (context.category === 'system' && context.severity === 'critical') {
      return false;
    }

    // Check if job is too old (older than 24 hours)
    const jobAge = Date.now() - job.timestamp;
    if (jobAge > 24 * 60 * 60 * 1000) {
      return false;
    }

    return true;
  }

  // Calculate when dead letter job can be retried
  private async calculateDeadLetterRetryTime(job: Job, context: ErrorContext): Promise<string | undefined> {
    if (!this.canRetryDeadLetterJob(job, context)) {
      return undefined;
    }

    // Base retry time on error category and severity
    let baseDelay: number;

    switch (context.category) {
      case 'network':
        baseDelay = 5 * 60 * 1000; // 5 minutes
        break;
      case 'external_service':
        baseDelay = 10 * 60 * 1000; // 10 minutes
        break;
      case 'database':
        baseDelay = 2 * 60 * 1000; // 2 minutes
        break;
      default:
        baseDelay = 15 * 60 * 1000; // 15 minutes
    }

    // Increase delay for critical errors
    if (context.severity === 'critical') {
      baseDelay *= 2;
    }

    const retryTime = new Date(Date.now() + baseDelay);
    return retryTime.toISOString();
  }

  // Store job error in database
  private async storeJobError(job: Job, error: Error, context: ErrorContext): Promise<void> {
    try {
      await prisma.jobError.create({
        data: {
          jobId: job.id || '',
          queueName: job.queue.name,
          errorMessage: error.message,
          errorStack: error.stack,
          errorCategory: context.category,
          severity: context.severity,
          context: context,
          occurredAt: new Date(),
          retryCount: job.attemptsMade,
          metadata: {
            jobName: job.name,
            jobData: job.data,
            workerId: (job as any).workerId
          }
        }
      });
    } catch (storageError) {
      logger.error('Failed to store job error', {
        jobId: job.id,
        error: storageError instanceof Error ? storageError.message : String(storageError)
      });
    }
  }

  // Store dead letter job in database
  private async storeDeadLetterJob(deadLetterJob: DeadLetterJob): Promise<void> {
    try {
      await prisma.deadLetterJob.create({
        data: {
          id: deadLetterJob.id,
          jobId: deadLetterJob.jobId,
          queueName: deadLetterJob.queueName,
          error: deadLetterJob.error,
          errorContext: deadLetterJob.errorContext,
          retryCount: deadLetterJob.retryCount,
          maxRetries: deadLetterJob.maxRetries,
          deadLetterAt: deadLetterJob.deadLetterAt,
          canRetry: deadLetterJob.canRetry,
          retryAfter: deadLetterJob.retryAfter,
          metadata: deadLetterJob.metadata
        }
      });
    } catch (storageError) {
      logger.error('Failed to store dead letter job', {
        jobId: deadLetterJob.jobId,
        error: storageError instanceof Error ? storageError.message : String(storageError)
      });
    }
  }

  // Get queue-specific context
  private async getQueueContext(queueName: string): Promise<Record<string, any>> {
    try {
      const { getQueueByName } = await import('../config/queues.js');
      const queue = getQueueByName(queueName);

      if (!queue) return {};

      const [waiting, active, completed, failed] = await Promise.all([
        queue.getWaiting(),
        queue.getActive(),
        queue.getCompleted(),
        queue.getFailed()
      ]);

      return {
        waitingCount: waiting.length,
        activeCount: active.length,
        completedCount: completed.length,
        failedCount: failed.length,
        queueStatus: await queue.isPaused() ? 'paused' : 'active'
      };
    } catch (error) {
      return {};
    }
  }

  // Send critical error alert
  private async sendCriticalErrorAlert(context: ErrorContext): Promise<void> {
    try {
      if (!this.wsService) return;

      await this.wsService.sendToRoom(
        `${RoomTypes.ADMIN}:alerts`,
        'critical_error',
        {
          type: 'critical_error',
          context,
          timestamp: new Date().toISOString()
        }
      );

      // Also send email alert for critical errors
      const { emailQueue } = await import('../config/queues.js');
      await emailQueue.add('critical-error-alert', {
        to: ['admin@angelinvesting.com'], // Configure admin emails
        subject: `CRITICAL ERROR: ${context.queueName} - ${context.operation}`,
        template: 'criticalErrorAlert',
        data: {
          errorContext: context,
          errorMessage: context.metadata?.errorMessage || 'Unknown error',
          timestamp: context.timestamp
        },
        priority: 'high'
      });

      logger.error('Critical error alert sent', { context });
    } catch (alertError) {
      logger.error('Failed to send critical error alert', {
        context,
        alertError: alertError instanceof Error ? alertError.message : String(alertError)
      });
    }
  }

  // Start circuit breaker monitoring
  private startCircuitBreakerMonitoring(): void {
    setInterval(() => {
      const now = new Date();

      for (const [queueName, circuitBreaker] of this.circuitBreakers) {
        // Auto-close circuit breakers after timeout
        if (circuitBreaker.state === 'OPEN' && now >= circuitBreaker.nextAttemptTime) {
          circuitBreaker.state = 'HALF_OPEN';
          circuitBreaker.failureCount = 0;

          logger.info('Circuit breaker auto-closed', { queueName });
        }
      }
    }, 30000); // Check every 30 seconds
  }

  // Start dead letter processing
  private startDeadLetterProcessing(): void {
    setInterval(async () => {
      const now = new Date();

      for (let i = this.deadLetterQueue.length - 1; i >= 0; i--) {
        const deadLetterJob = this.deadLetterQueue[i];

        if (deadLetterJob.canRetry && deadLetterJob.retryAfter) {
          const retryTime = new Date(deadLetterJob.retryAfter);

          if (now >= retryTime) {
            try {
              await this.retryDeadLetterJob(deadLetterJob);
              this.deadLetterQueue.splice(i, 1); // Remove from memory
            } catch (retryError) {
              logger.error('Failed to retry dead letter job', {
                deadLetterJobId: deadLetterJob.id,
                error: retryError instanceof Error ? retryError.message : String(retryError)
              });
            }
          }
        }
      }
    }, 60000); // Check every minute
  }

  // Retry dead letter job
  private async retryDeadLetterJob(deadLetterJob: DeadLetterJob): Promise<void> {
    try {
      const { getQueueByName } = await import('../config/queues.js');
      const queue = getQueueByName(deadLetterJob.queueName);

      if (!queue) {
        throw new Error(`Queue not found: ${deadLetterJob.queueName}`);
      }

      // Create new job with original data
      const newJob = await queue.add(
        deadLetterJob.metadata?.jobName || 'retry_job',
        deadLetterJob.metadata?.jobData || {},
        {
          attempts: Math.max(1, deadLetterJob.maxRetries - deadLetterJob.retryCount),
          backoff: {
            type: 'exponential',
            delay: 5000
          }
        }
      );

      // Update database record
      await prisma.deadLetterJob.update({
        where: { id: deadLetterJob.id },
        data: {
          retriedAt: new Date().toISOString(),
          retriedJobId: newJob.id,
          status: 'RETRIED'
        }
      });

      logger.info('Dead letter job retried successfully', {
        deadLetterJobId: deadLetterJob.id,
        newJobId: newJob.id,
        queueName: deadLetterJob.queueName
      });
    } catch (error) {
      logger.error('Failed to retry dead letter job', {
        deadLetterJobId: deadLetterJob.id,
        error: error instanceof Error ? error.message : String(error)
      });

      // Update retry failure in database
      await prisma.deadLetterJob.update({
        where: { id: deadLetterJob.id },
        data: {
          retryFailedAt: new Date().toISOString(),
          retryError: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }

  // Public methods for external use
  public async getDeadLetterJobs(limit: number = 50): Promise<DeadLetterJob[]> {
    try {
      const deadLetterJobs = await prisma.deadLetterJob.findMany({
        orderBy: { deadLetterAt: 'desc' },
        take: limit
      });

      return deadLetterJobs.map(job => ({
        id: job.id,
        jobId: job.jobId,
        queueName: job.queueName,
        error: job.error,
        errorContext: job.errorContext as ErrorContext,
        retryCount: job.retryCount,
        maxRetries: job.maxRetries,
        deadLetterAt: job.deadLetterAt.toISOString(),
        canRetry: job.canRetry,
        retryAfter: job.retryAfter?.toISOString(),
        metadata: job.metadata as Record<string, any>
      }));
    } catch (error) {
      logger.error('Failed to get dead letter jobs', {
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  public async retryDeadLetterJobById(deadLetterJobId: string): Promise<boolean> {
    try {
      const deadLetterJob = this.deadLetterQueue.find(job => job.id === deadLetterJobId) ||
                           await prisma.deadLetterJob.findUnique({
                             where: { id: deadLetterJobId }
                           });

      if (!deadLetterJob) {
        return false;
      }

      await this.retryDeadLetterJob(deadLetterJob as DeadLetterJob);

      // Remove from memory queue if present
      const memoryIndex = this.deadLetterQueue.findIndex(job => job.id === deadLetterJobId);
      if (memoryIndex >= 0) {
        this.deadLetterQueue.splice(memoryIndex, 1);
      }

      return true;
    } catch (error) {
      logger.error('Failed to retry dead letter job by ID', {
        deadLetterJobId,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  public async getCircuitBreakerStatus(): Promise<Record<string, CircuitBreakerState>> {
    return Object.fromEntries(this.circuitBreakers);
  }

  public async resetCircuitBreaker(queueName: string): Promise<boolean> {
    try {
      const circuitBreaker = this.circuitBreakers.get(queueName);
      if (circuitBreaker) {
        circuitBreaker.state = 'CLOSED';
        circuitBreaker.failureCount = 0;
        circuitBreaker.lastFailureTime = new Date();

        logger.info('Circuit breaker reset', { queueName });
      }
      return true;
    } catch (error) {
      logger.error('Failed to reset circuit breaker', {
        queueName,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  public getRetryStrategy(queueName: string): RetryStrategy | null {
    return this.retryStrategies.get(queueName) || null;
  }

  public updateRetryStrategy(queueName: string, strategy: Partial<RetryStrategy>): void {
    const existingStrategy = this.retryStrategies.get(queueName) || this.getDefaultRetryStrategy();
    this.retryStrategies.set(queueName, { ...existingStrategy, ...strategy });

    logger.info('Retry strategy updated', { queueName, strategy });
  }

  public stopErrorRecovery(): void {
    this.isRunning = false;
    logger.info('Error recovery service stopped');
  }

  public isErrorRecoveryRunning(): boolean {
    return this.isRunning;
  }
}

// Export singleton instance
export const errorRecoveryService = new ErrorRecoveryService();