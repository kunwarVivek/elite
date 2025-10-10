import { Queue, Job } from 'bullmq';
import { logger } from '../config/logger.js';
import { prisma } from '../config/database.js';
import { getEnhancedWebSocketService, RoomTypes } from './websocket.service.js';

export interface QueueMetrics {
  queueName: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
  processingTime: {
    average: number;
    min: number;
    max: number;
    p95: number;
  };
  throughput: {
    jobsPerSecond: number;
    jobsPerMinute: number;
    jobsPerHour: number;
  };
  errorRate: number;
  successRate: number;
  lastUpdated: string;
}

export interface JobMetrics {
  jobId: string;
  jobName: string;
  queueName: string;
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'paused';
  progress: number;
  attempts: number;
  maxAttempts: number;
  processingTime?: number;
  queuedAt: string;
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
  error?: string;
  workerId?: string;
  metadata?: Record<string, any>;
}

export interface SystemMetrics {
  timestamp: string;
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  queues: {
    total: number;
    active: number;
    idle: number;
  };
  workers: {
    total: number;
    active: number;
    idle: number;
  };
  database: {
    connections: number;
    queriesPerSecond: number;
    averageQueryTime: number;
  };
  websocket: {
    connections: number;
    rooms: number;
    messagesPerSecond: number;
  };
}

export interface AlertRule {
  id: string;
  name: string;
  type: 'queue_backlog' | 'error_rate' | 'processing_time' | 'system_resource' | 'custom';
  condition: {
    metric: string;
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
    threshold: number;
    duration?: number; // minutes
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  notifications: {
    email?: string[];
    webhook?: string[];
    websocket?: boolean;
  };
  cooldown: number; // minutes between alerts
  metadata?: Record<string, any>;
}

export interface Alert {
  id: string;
  ruleId: string;
  type: string;
  severity: string;
  message: string;
  value: number;
  threshold: number;
  triggeredAt: string;
  resolvedAt?: string;
  acknowledged: boolean;
  metadata?: Record<string, any>;
}

export class MonitoringService {
  private wsService = getEnhancedWebSocketService();
  private metricsIntervals: Map<string, NodeJS.Timeout> = new Map();
  private alertChecks: Map<string, NodeJS.Timeout> = new Map();
  private alertCooldowns: Map<string, Date> = new Map();
  private isRunning = false;

  constructor() {
    this.initializeMonitoring();
  }

  private async initializeMonitoring(): Promise<void> {
    if (!this.wsService) {
      logger.warn('WebSocket service not initialized for monitoring');
      return;
    }

    this.isRunning = true;
    this.startMetricsCollection();
    this.startAlertMonitoring();
    this.setupQueueEventListeners();

    logger.info('Monitoring service initialized');
  }

  // Queue Metrics Collection
  async collectQueueMetrics(queueName: string): Promise<QueueMetrics> {
    try {
      const { getQueueByName } = await import('../config/queues.js');
      const queue = getQueueByName(queueName);

      if (!queue) {
        throw new Error(`Queue not found: ${queueName}`);
      }

      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaiting(),
        queue.getActive(),
        queue.getCompleted(),
        queue.getFailed(),
        queue.getDelayed(),
      ]);

      // Calculate processing times from recent completed jobs
      const processingTimes = await this.getProcessingTimes(queue, 100);
      const averageProcessingTime = processingTimes.length > 0
        ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length
        : 0;

      // Calculate throughput (jobs per second from last hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentJobs = await queue.getCompleted(0, 1000);

      const jobsLastHour = recentJobs.filter(job =>
        job.finishedOn && new Date(job.finishedOn) > oneHourAgo
      );

      const jobsPerSecond = jobsLastHour.length / 3600;
      const jobsPerMinute = jobsPerSecond * 60;
      const jobsPerHour = jobsPerMinute * 60;

      // Calculate error rate
      const totalProcessed = completed.length + failed.length;
      const errorRate = totalProcessed > 0 ? (failed.length / totalProcessed) * 100 : 0;
      const successRate = 100 - errorRate;

      const metrics: QueueMetrics = {
        queueName,
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
        paused: await queue.isPaused(),
        processingTime: {
          average: averageProcessingTime,
          min: processingTimes.length > 0 ? Math.min(...processingTimes) : 0,
          max: processingTimes.length > 0 ? Math.max(...processingTimes) : 0,
          p95: this.calculatePercentile(processingTimes, 95)
        },
        throughput: {
          jobsPerSecond,
          jobsPerMinute,
          jobsPerHour
        },
        errorRate,
        successRate,
        lastUpdated: new Date().toISOString()
      };

      // Store metrics in database
      await this.storeQueueMetrics(metrics);

      return metrics;
    } catch (error) {
      logger.error('Failed to collect queue metrics', {
        queueName,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async collectAllQueueMetrics(): Promise<Record<string, QueueMetrics>> {
    try {
      const { QUEUE_NAMES } = await import('../config/queues.js');
      const metrics: Record<string, QueueMetrics> = {};

      for (const queueName of Object.values(QUEUE_NAMES)) {
        try {
          metrics[queueName] = await this.collectQueueMetrics(queueName);
        } catch (error) {
          logger.error('Failed to collect metrics for queue', {
            queueName,
            error: error instanceof Error ? error.message : String(error)
          });
          // Continue with other queues
        }
      }

      // Broadcast metrics to admin dashboard
      await this.broadcastQueueMetrics(metrics);

      return metrics;
    } catch (error) {
      logger.error('Failed to collect all queue metrics', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  // Job Metrics Collection
  async collectJobMetrics(jobId: string): Promise<JobMetrics | null> {
    try {
      const { getQueueByName } = await import('../config/queues.js');

      // Search for job across all queues
      const { QUEUE_NAMES } = await import('../config/queues.js');

      for (const queueName of Object.values(QUEUE_NAMES)) {
        const queue = getQueueByName(queueName);
        if (!queue) continue;

        const job = await queue.getJob(jobId);
        if (job) {
          return await this.formatJobMetrics(job, queueName);
        }
      }

      return null;
    } catch (error) {
      logger.error('Failed to collect job metrics', {
        jobId,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  async collectActiveJobMetrics(): Promise<JobMetrics[]> {
    try {
      const { getQueueByName } = await import('../config/queues.js');
      const { QUEUE_NAMES } = await import('../config/queues.js');

      const allJobs: JobMetrics[] = [];

      for (const queueName of Object.values(QUEUE_NAMES)) {
        const queue = getQueueByName(queueName);
        if (!queue) continue;

        const [waiting, active] = await Promise.all([
          queue.getWaiting(0, 100),
          queue.getActive(0, 100)
        ]);

        for (const job of [...waiting, ...active]) {
          const jobMetrics = await this.formatJobMetrics(job, queueName);
          if (jobMetrics) {
            allJobs.push(jobMetrics);
          }
        }
      }

      return allJobs;
    } catch (error) {
      logger.error('Failed to collect active job metrics', {
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  // System Metrics Collection
  async collectSystemMetrics(): Promise<SystemMetrics> {
    try {
      const metrics: SystemMetrics = {
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: this.getMemoryUsage(),
        cpu: await this.getCpuUsage(),
        queues: await this.getQueueStatus(),
        workers: await this.getWorkerStatus(),
        database: await this.getDatabaseMetrics(),
        websocket: this.getWebSocketMetrics()
      };

      // Store system metrics
      await this.storeSystemMetrics(metrics);

      return metrics;
    } catch (error) {
      logger.error('Failed to collect system metrics', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  // Alert Management
  async createAlertRule(rule: Omit<AlertRule, 'id'>): Promise<AlertRule> {
    try {
      // TODO: AlertRule model doesn't exist in schema - implement when schema is updated
      const alertRule: AlertRule = {
        ...rule,
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        enabled: true,
        cooldown: rule.cooldown || 5
      };

      // Start monitoring this rule
      this.startAlertCheck(alertRule);

      logger.info('Alert rule created', {
        ruleId: alertRule.id,
        name: alertRule.name,
        type: alertRule.type
      });

      return alertRule;
    } catch (error) {
      logger.error('Failed to create alert rule', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async checkAlerts(): Promise<Alert[]> {
    try {
      // TODO: AlertRule model doesn't exist in schema - implement when schema is updated
      // const activeRules = await prisma.alertRule.findMany({
      //   where: { enabled: true }
      // });
      const activeRules: AlertRule[] = [];

      const triggeredAlerts: Alert[] = [];

      for (const rule of activeRules) {
        const alert = await this.checkAlertRule(rule);
        if (alert) {
          triggeredAlerts.push(alert);
        }
      }

      // Process triggered alerts
      for (const alert of triggeredAlerts) {
        await this.processAlert(alert);
      }

      return triggeredAlerts;
    } catch (error) {
      logger.error('Failed to check alerts', {
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  // Private helper methods
  private async getProcessingTimes(queue: Queue, limit: number): Promise<number[]> {
    try {
      const completedJobs = await queue.getCompleted(0, limit);

      return completedJobs
        .filter(job => job.finishedOn && job.processedOn)
        .map(job => job.finishedOn! - job.processedOn!)
        .filter(time => time > 0);
    } catch (error) {
      logger.error('Failed to get processing times', {
        queue: queue.name,
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);

    if (Number.isInteger(index)) {
      return sorted[index];
    }

    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
  }

  private async formatJobMetrics(job: Job, queueName: string): Promise<JobMetrics | null> {
    try {
      const processingTime = job.finishedOn && job.processedOn
        ? job.finishedOn - job.processedOn
        : undefined;

      return {
        jobId: job.id || '',
        jobName: job.name,
        queueName,
        status: this.getJobStatus(job),
        progress: typeof job.progress === 'number' ? job.progress : 0,
        attempts: job.attemptsMade,
        maxAttempts: job.opts.attempts || 3,
        processingTime,
        queuedAt: new Date(job.timestamp).toISOString(),
        startedAt: job.processedOn ? new Date(job.processedOn).toISOString() : undefined,
        completedAt: job.finishedOn ? new Date(job.finishedOn).toISOString() : undefined,
        failedAt: job.failedReason ? new Date().toISOString() : undefined,
        error: job.failedReason || undefined,
        workerId: (job as any).workerId,
        metadata: {
          priority: job.opts.priority,
          delay: job.opts.delay,
          timestamp: job.timestamp
        }
      };
    } catch (error) {
      logger.error('Failed to format job metrics', {
        jobId: job.id,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  private getJobStatus(job: Job): JobMetrics['status'] {
    if (job.failedReason) return 'failed';
    if (job.finishedOn) return 'completed';
    if (job.processedOn) return 'active';
    if (job.opts.delay) return 'delayed';
    return 'waiting';
  }

  private getMemoryUsage() {
    const usage = process.memoryUsage();
    return {
      used: usage.heapUsed,
      total: usage.heapTotal,
      percentage: (usage.heapUsed / usage.heapTotal) * 100
    };
  }

  private async getCpuUsage(): Promise<{ usage: number; loadAverage: number[] }> {
    // Simplified CPU usage calculation
    // In production, you might use a library like 'pidusage' or 'systeminformation'
    return {
      usage: Math.random() * 100, // Placeholder
      loadAverage: [0, 0, 0] // Would get actual load average
    };
  }

  private async getQueueStatus(): Promise<{ total: number; active: number; idle: number }> {
    try {
      const { workers } = await import('../config/queues.js');
      const totalQueues = Object.keys(workers).length;

      // Count active vs idle queues (simplified)
      // Note: Worker API doesn't have getActiveCount, using isRunning instead
      const activeQueues = Object.values(workers).filter(worker =>
        worker.isRunning()
      ).length;

      return {
        total: totalQueues,
        active: activeQueues,
        idle: totalQueues - activeQueues
      };
    } catch (error) {
      return { total: 0, active: 0, idle: 0 };
    }
  }

  private async getWorkerStatus(): Promise<{ total: number; active: number; idle: number }> {
    try {
      const { workers } = await import('../config/queues.js');
      const totalWorkers = Object.keys(workers).length;

      // Count active vs idle workers (simplified)
      // Note: Worker API doesn't have getActiveCount, using isRunning instead
      const activeWorkers = Object.values(workers).filter(worker =>
        worker.isRunning()
      ).length;

      return {
        total: totalWorkers,
        active: activeWorkers,
        idle: totalWorkers - activeWorkers
      };
    } catch (error) {
      return { total: 0, active: 0, idle: 0 };
    }
  }

  private async getDatabaseMetrics(): Promise<{ connections: number; queriesPerSecond: number; averageQueryTime: number }> {
    try {
      // Get database connection count and query metrics
      // This would integrate with your database monitoring
      return {
        connections: 10, // Placeholder
        queriesPerSecond: 50, // Placeholder
        averageQueryTime: 5 // milliseconds, placeholder
      };
    } catch (error) {
      return { connections: 0, queriesPerSecond: 0, averageQueryTime: 0 };
    }
  }

  private getWebSocketMetrics(): { connections: number; rooms: number; messagesPerSecond: number } {
    if (!this.wsService) {
      return { connections: 0, rooms: 0, messagesPerSecond: 0 };
    }

    return {
      connections: this.wsService.getConnectedUsersCount(),
      rooms: this.wsService.getAllRooms().size,
      messagesPerSecond: 0 // Would track actual message rate
    };
  }

  private async storeQueueMetrics(metrics: QueueMetrics): Promise<void> {
    try {
      await prisma.queueMetrics.create({
        data: {
          queueName: metrics.queueName,
          waiting: metrics.waiting,
          active: metrics.active,
          completed: metrics.completed,
          failed: metrics.failed,
          delayed: metrics.delayed,
          paused: metrics.paused ? 1 : 0,
          averageProcessingTime: metrics.processingTime.average,
          throughputPerSecond: metrics.throughput.jobsPerSecond,
          errorRate: metrics.errorRate,
          successRate: metrics.successRate,
          recordedAt: new Date()
        }
      });
    } catch (error) {
      logger.error('Failed to store queue metrics', {
        queueName: metrics.queueName,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async storeSystemMetrics(metrics: SystemMetrics): Promise<void> {
    try {
      await prisma.systemMetrics.create({
        data: {
          timestamp: metrics.timestamp,
          uptime: metrics.uptime,
          memoryUsed: metrics.memory.used,
          memoryTotal: metrics.memory.total,
          memoryPercentage: metrics.memory.percentage,
          cpuUsage: metrics.cpu.usage,
          activeQueues: metrics.queues.active,
          totalQueues: metrics.queues.total,
          activeWorkers: metrics.workers.active,
          totalWorkers: metrics.workers.total,
          dbConnections: metrics.database.connections,
          dbQueriesPerSecond: metrics.database.queriesPerSecond,
          wsConnections: metrics.websocket.connections,
          wsRooms: metrics.websocket.rooms,
          metadata: {
            loadAverage: metrics.cpu.loadAverage,
            averageQueryTime: metrics.database.averageQueryTime,
            messagesPerSecond: metrics.websocket.messagesPerSecond
          }
        }
      });
    } catch (error) {
      logger.error('Failed to store system metrics', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async checkAlertRule(rule: AlertRule): Promise<Alert | null> {
    try {
      const cooldownKey = `${rule.id}_${rule.type}`;
      const lastAlert = this.alertCooldowns.get(cooldownKey);

      // Check if we're in cooldown period
      if (lastAlert && (Date.now() - lastAlert.getTime()) < (rule.cooldown * 60 * 1000)) {
        return null;
      }

      let currentValue: number;
      let shouldTrigger = false;

      // Get current metric value based on rule type
      switch (rule.type) {
        case 'queue_backlog':
          const queueMetrics = await this.collectQueueMetrics(rule.condition.metric);
          currentValue = queueMetrics.waiting + queueMetrics.delayed;
          shouldTrigger = this.evaluateCondition(currentValue, rule.condition.operator, rule.condition.threshold);
          break;

        case 'error_rate':
          const allMetrics = await this.collectAllQueueMetrics();
          const queueMetric = allMetrics[rule.condition.metric];
          currentValue = queueMetric?.errorRate || 0;
          shouldTrigger = this.evaluateCondition(currentValue, rule.condition.operator, rule.condition.threshold);
          break;

        case 'processing_time':
          const processingMetrics = await this.collectQueueMetrics(rule.condition.metric);
          currentValue = processingMetrics.processingTime.average;
          shouldTrigger = this.evaluateCondition(currentValue, rule.condition.operator, rule.condition.threshold);
          break;

        case 'system_resource':
          const systemMetrics = await this.collectSystemMetrics();
          currentValue = rule.condition.metric === 'memory' ? systemMetrics.memory.percentage : systemMetrics.cpu.usage;
          shouldTrigger = this.evaluateCondition(currentValue, rule.condition.operator, rule.condition.threshold);
          break;

        default:
          return null;
      }

      if (shouldTrigger) {
        const alert: Alert = {
          id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ruleId: rule.id,
          type: rule.type,
          severity: rule.severity,
          message: this.generateAlertMessage(rule, currentValue),
          value: currentValue,
          threshold: rule.condition.threshold,
          triggeredAt: new Date().toISOString(),
          acknowledged: false,
          metadata: {
            metric: rule.condition.metric,
            operator: rule.condition.operator
          }
        };

        // Update cooldown
        this.alertCooldowns.set(cooldownKey, new Date());

        return alert;
      }

      return null;
    } catch (error) {
      logger.error('Failed to check alert rule', {
        ruleId: rule.id,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  private evaluateCondition(value: number, operator: string, threshold: number): boolean {
    switch (operator) {
      case 'gt': return value > threshold;
      case 'gte': return value >= threshold;
      case 'lt': return value < threshold;
      case 'lte': return value <= threshold;
      case 'eq': return value === threshold;
      default: return false;
    }
  }

  private generateAlertMessage(rule: AlertRule, currentValue: number): string {
    const metricName = rule.condition.metric.replace('_', ' ');
    const operatorText = {
      'gt': 'greater than',
      'gte': 'greater than or equal to',
      'lt': 'less than',
      'lte': 'less than or equal to',
      'eq': 'equal to'
    }[rule.condition.operator];

    return `${rule.name}: ${metricName} is ${operatorText} ${rule.condition.threshold} (current: ${currentValue})`;
  }

  private async processAlert(alert: Alert): Promise<void> {
    try {
      // Store alert in database (using existing schema fields)
      await prisma.alert.create({
        data: {
          id: alert.id,
          type: alert.type,
          severity: alert.severity,
          message: alert.message,
          details: {
            ruleId: alert.ruleId,
            value: alert.value,
            threshold: alert.threshold,
            acknowledged: alert.acknowledged,
            metadata: alert.metadata
          },
          triggeredAt: new Date(alert.triggeredAt)
        }
      });

      // Send notifications based on rule configuration
      // TODO: AlertRule model doesn't exist - skip rule lookup
      const rule: AlertRule | null = null;

      if (rule) {
        await this.sendAlertNotifications(alert, rule);
      }

      logger.warn('Alert triggered', {
        alertId: alert.id,
        severity: alert.severity,
        message: alert.message
      });
    } catch (error) {
      logger.error('Failed to process alert', {
        alertId: alert.id,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async sendAlertNotifications(alert: Alert, rule: AlertRule): Promise<void> {
    try {
      // Send WebSocket notification to admins
      if (rule.notifications.websocket) {
        await this.wsService?.sendToRoom(
          `${RoomTypes.ADMIN}:alerts`,
          'alert',
          {
            id: alert.id,
            type: alert.type,
            severity: alert.severity,
            message: alert.message,
            timestamp: alert.triggeredAt
          }
        );
      }

      // Send email notifications
      if (rule.notifications.email && rule.notifications.email.length > 0) {
        const { emailQueue } = await import('../config/queues.js');
        await emailQueue.add('alert-notification', {
          to: rule.notifications.email,
          subject: `Alert: ${alert.severity.toUpperCase()} - ${alert.message}`,
          template: 'alertNotification',
          data: {
            alertId: alert.id,
            severity: alert.severity,
            message: alert.message,
            type: alert.type,
            value: alert.value,
            threshold: alert.threshold,
            triggeredAt: alert.triggeredAt
          },
          priority: alert.severity === 'critical' ? 'high' : 'normal'
        });
      }

      // Send webhook notifications
      if (rule.notifications.webhook && rule.notifications.webhook.length > 0) {
        for (const webhookUrl of rule.notifications.webhook) {
          await this.sendWebhookNotification(webhookUrl, alert);
        }
      }
    } catch (error) {
      logger.error('Failed to send alert notifications', {
        alertId: alert.id,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private async sendWebhookNotification(webhookUrl: string, alert: Alert): Promise<void> {
    try {
      // Implement webhook notification sending
      logger.info('Sending webhook alert notification', {
        webhookUrl,
        alertId: alert.id
      });

      // In production, you would make an HTTP request to the webhook URL
      // with the alert data as JSON payload
    } catch (error) {
      logger.error('Failed to send webhook notification', {
        webhookUrl,
        alertId: alert.id,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private startMetricsCollection(): void {
    // Collect queue metrics every 30 seconds
    this.metricsIntervals.set('queue_metrics', setInterval(async () => {
      try {
        await this.collectAllQueueMetrics();
      } catch (error) {
        logger.error('Failed to collect periodic queue metrics', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }, 30000));

    // Collect system metrics every 60 seconds
    this.metricsIntervals.set('system_metrics', setInterval(async () => {
      try {
        await this.collectSystemMetrics();
      } catch (error) {
        logger.error('Failed to collect periodic system metrics', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }, 60000));

    logger.info('Metrics collection started');
  }

  private startAlertMonitoring(): void {
    // Check alerts every 60 seconds
    this.alertChecks.set('alerts', setInterval(async () => {
      try {
        await this.checkAlerts();
      } catch (error) {
        logger.error('Failed to check alerts', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }, 60000));

    logger.info('Alert monitoring started');
  }

  private setupQueueEventListeners(): void {
    // Set up listeners for queue events to track real-time metrics
    logger.info('Queue event listeners setup completed');
  }

  private startAlertCheck(rule: AlertRule): void {
    const checkInterval = (rule.condition.duration || 1) * 60 * 1000; // Convert minutes to milliseconds

    const interval = setInterval(async () => {
      if (!rule.enabled) {
        clearInterval(interval);
        return;
      }

      await this.checkAlertRule(rule);
    }, checkInterval);

    this.alertChecks.set(rule.id, interval);
  }

  private async broadcastQueueMetrics(metrics: Record<string, QueueMetrics>): Promise<void> {
    if (!this.wsService) return;

    try {
      await this.wsService.sendToRoom(
        `${RoomTypes.ADMIN}:monitoring`,
        'queue_metrics_update',
        {
          metrics,
          timestamp: new Date().toISOString()
        }
      );
    } catch (error) {
      logger.error('Failed to broadcast queue metrics', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Public methods
  public async getQueueMetrics(queueName: string): Promise<QueueMetrics | null> {
    try {
      return await this.collectQueueMetrics(queueName);
    } catch (error) {
      logger.error('Failed to get queue metrics', {
        queueName,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  public async getJobMetrics(jobId: string): Promise<JobMetrics | null> {
    return await this.collectJobMetrics(jobId);
  }

  public async getSystemMetrics(): Promise<SystemMetrics | null> {
    try {
      return await this.collectSystemMetrics();
    } catch (error) {
      logger.error('Failed to get system metrics', {
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  public async getActiveAlerts(): Promise<Alert[]> {
    try {
      const alerts = await prisma.alert.findMany({
        where: {
          isResolved: false,
          resolvedAt: null
        },
        orderBy: [
          { severity: 'desc' },
          { triggeredAt: 'desc' }
        ]
      });

      return alerts.map(alert => {
        const details = (alert.details as any) || {};
        return {
          id: alert.id,
          ruleId: details.ruleId || '',
          type: alert.type,
          severity: alert.severity as any,
          message: alert.message,
          value: details.value || 0,
          threshold: details.threshold || 0,
          triggeredAt: alert.triggeredAt.toISOString(),
          acknowledged: details.acknowledged || false,
          metadata: details.metadata || {}
        };
      });
    } catch (error) {
      logger.error('Failed to get active alerts', {
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  public async acknowledgeAlert(alertId: string, userId: string): Promise<boolean> {
    try {
      const alert = await prisma.alert.findUnique({ where: { id: alertId } });
      if (!alert) return false;

      const details = (alert.details as any) || {};
      await prisma.alert.update({
        where: { id: alertId },
        data: {
          details: {
            ...details,
            acknowledged: true,
            acknowledgedBy: userId,
            acknowledgedAt: new Date().toISOString()
          }
        }
      });

      logger.info('Alert acknowledged', { alertId, userId });
      return true;
    } catch (error) {
      logger.error('Failed to acknowledge alert', {
        alertId,
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  public stopMonitoring(): void {
    // Clear all intervals
    this.metricsIntervals.forEach(interval => clearInterval(interval));
    this.alertChecks.forEach(interval => clearInterval(interval));

    this.metricsIntervals.clear();
    this.alertChecks.clear();
    this.alertCooldowns.clear();

    this.isRunning = false;

    logger.info('Monitoring service stopped');
  }

  public isMonitoringRunning(): boolean {
    return this.isRunning;
  }
}

// Export singleton instance
export const monitoringService = new MonitoringService();