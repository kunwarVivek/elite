import { Request, Response } from 'express';
import { monitoringService } from '../services/monitoring.service.js';
import { logger } from '../config/logger.js';

export class MonitoringController {
  // Get all queue metrics
  static async getQueueMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { queueName } = req.query;

      if (queueName && typeof queueName === 'string') {
        const metrics = await monitoringService.getQueueMetrics(queueName);
        if (!metrics) {
          res.status(404).json({
            success: false,
            error: 'Queue not found'
          });
          return;
        }

        res.json({
          success: true,
          data: metrics
        });
      } else {
        // Get all queue metrics (this would need to be implemented in monitoring service)
        const metrics = await monitoringService.collectAllQueueMetrics();

        res.json({
          success: true,
          data: metrics
        });
      }
    } catch (error) {
      logger.error('Failed to get queue metrics', {
        error: error instanceof Error ? error.message : String(error)
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve queue metrics'
      });
    }
  }

  // Get job metrics
  static async getJobMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;

      if (!jobId) {
        res.status(400).json({
          success: false,
          error: 'Job ID is required'
        });
        return;
      }

      const metrics = await monitoringService.getJobMetrics(jobId);

      if (!metrics) {
        res.status(404).json({
          success: false,
          error: 'Job not found'
        });
        return;
      }

      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      logger.error('Failed to get job metrics', {
        jobId: req.params.jobId,
        error: error instanceof Error ? error.message : String(error)
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve job metrics'
      });
    }
  }

  // Get active job metrics
  static async getActiveJobMetrics(_req: Request, res: Response): Promise<void> {
    try {
      const metrics = await monitoringService.collectActiveJobMetrics();

      res.json({
        success: true,
        data: metrics,
        count: metrics.length
      });
    } catch (error) {
      logger.error('Failed to get active job metrics', {
        error: error instanceof Error ? error.message : String(error)
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve active job metrics'
      });
    }
  }

  // Get system metrics
  static async getSystemMetrics(_req: Request, res: Response): Promise<void> {
    try {
      const metrics = await monitoringService.getSystemMetrics();

      if (!metrics) {
        res.status(500).json({
          success: false,
          error: 'Failed to retrieve system metrics'
        });
        return;
      }

      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      logger.error('Failed to get system metrics', {
        error: error instanceof Error ? error.message : String(error)
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve system metrics'
      });
    }
  }

  // Get active alerts
  static async getActiveAlerts(_req: Request, res: Response): Promise<void> {
    try {
      const alerts = await monitoringService.getActiveAlerts();

      res.json({
        success: true,
        data: alerts,
        count: alerts.length
      });
    } catch (error) {
      logger.error('Failed to get active alerts', {
        error: error instanceof Error ? error.message : String(error)
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve active alerts'
      });
    }
  }

  // Acknowledge alert
  static async acknowledgeAlert(req: Request, res: Response): Promise<void> {
    try {
      const { alertId } = req.params;
      const { userId } = req.body;

      if (!alertId) {
        res.status(400).json({
          success: false,
          error: 'Alert ID is required'
        });
        return;
      }

      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
        return;
      }

      const success = await monitoringService.acknowledgeAlert(alertId, userId);

      if (!success) {
        res.status(404).json({
          success: false,
          error: 'Alert not found or already acknowledged'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Alert acknowledged successfully'
      });
    } catch (error) {
      logger.error('Failed to acknowledge alert', {
        alertId: req.params.alertId,
        userId: req.body.userId,
        error: error instanceof Error ? error.message : String(error)
      });

      res.status(500).json({
        success: false,
        error: 'Failed to acknowledge alert'
      });
    }
  }

  // Create alert rule
  static async createAlertRule(req: Request, res: Response): Promise<void> {
    try {
      const ruleData = req.body;

      if (!ruleData.name || !ruleData.type || !ruleData.condition) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: name, type, condition'
        });
        return;
      }

      const rule = await monitoringService.createAlertRule(ruleData);

      res.status(201).json({
        success: true,
        data: rule
      });
    } catch (error) {
      logger.error('Failed to create alert rule', {
        error: error instanceof Error ? error.message : String(error)
      });

      res.status(500).json({
        success: false,
        error: 'Failed to create alert rule'
      });
    }
  }

  // Get monitoring dashboard data
  static async getDashboardData(_req: Request, res: Response): Promise<void> {
    try {
      const [queueMetrics, systemMetrics, activeAlerts, activeJobs] = await Promise.all([
        monitoringService.collectAllQueueMetrics(),
        monitoringService.getSystemMetrics(),
        monitoringService.getActiveAlerts(),
        monitoringService.collectActiveJobMetrics()
      ]);

      res.json({
        success: true,
        data: {
          queues: queueMetrics,
          system: systemMetrics,
          alerts: activeAlerts,
          activeJobs,
          timestamp: new Date().toISOString(),
          monitoringStatus: monitoringService.isMonitoringRunning() ? 'active' : 'inactive'
        }
      });
    } catch (error) {
      logger.error('Failed to get dashboard data', {
        error: error instanceof Error ? error.message : String(error)
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve dashboard data'
      });
    }
  }

  // Health check endpoint
  static async healthCheck(_req: Request, res: Response): Promise<void> {
    try {
      const isHealthy = monitoringService.isMonitoringRunning();

      res.json({
        success: true,
        data: {
          status: isHealthy ? 'healthy' : 'unhealthy',
          monitoring: isHealthy ? 'active' : 'inactive',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Health check failed', {
        error: error instanceof Error ? error.message : String(error)
      });

      res.status(500).json({
        success: false,
        error: 'Health check failed'
      });
    }
  }

  // Get queue performance trends
  static async getQueueTrends(req: Request, res: Response): Promise<void> {
    try {
      const { queueName } = req.query;
      const { hours = 24 } = req.query;

      if (!queueName || typeof queueName !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Queue name is required'
        });
        return;
      }

      const hoursNum = parseInt(hours as string, 10);
      if (isNaN(hoursNum) || hoursNum <= 0 || hoursNum > 168) { // Max 1 week
        res.status(400).json({
          success: false,
          error: 'Hours must be between 1 and 168 (1 week)'
        });
        return;
      }

      // Get historical metrics from database
      // TODO: queueMetrics model does not exist in schema - see TASK3
      // Returning mock data for now to maintain API contract
      const trends: any[] = [];
      // const trends = await prisma.queueMetrics.findMany({
      //   where: {
      //     queueName,
      //     recordedAt: { gte: cutoffDate }
      //   },
      //   orderBy: { recordedAt: 'asc' }
      // });

      res.json({
        success: true,
        data: {
          queueName,
          hours: hoursNum,
          trends: trends.map((trend: any) => ({
            timestamp: trend.recordedAt.toISOString(),
            waiting: trend.waiting,
            active: trend.active,
            completed: trend.completed,
            failed: trend.failed,
            throughput: trend.throughputPerSecond,
            errorRate: trend.errorRate,
            averageProcessingTime: trend.averageProcessingTime
          }))
        }
      });
    } catch (error) {
      logger.error('Failed to get queue trends', {
        queueName: req.query.queueName,
        hours: req.query.hours,
        error: error instanceof Error ? error.message : String(error)
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve queue trends'
      });
    }
  }

  // Get system performance trends
  static async getSystemTrends(req: Request, res: Response): Promise<void> {
    try {
      const { hours = 24 } = req.query;

      const hoursNum = parseInt(hours as string, 10);
      if (isNaN(hoursNum) || hoursNum <= 0 || hoursNum > 168) {
        res.status(400).json({
          success: false,
          error: 'Hours must be between 1 and 168 (1 week)'
        });
        return;
      }

      // TODO: systemMetrics model does not exist in schema - see TASK3
      // Returning mock data for now to maintain API contract
      const trends: any[] = [];
      // const trends = await prisma.systemMetrics.findMany({
      //   where: {
      //     timestamp: { gte: cutoffDate }
      //   },
      //   orderBy: { timestamp: 'asc' }
      // });

      res.json({
        success: true,
        data: {
          hours: hoursNum,
          trends: trends.map((trend: any) => ({
            timestamp: trend.timestamp,
            uptime: trend.uptime,
            memoryUsage: trend.memoryPercentage,
            cpuUsage: trend.cpuUsage,
            activeQueues: trend.activeQueues,
            activeWorkers: trend.activeWorkers,
            wsConnections: trend.wsConnections,
            dbQueriesPerSecond: trend.dbQueriesPerSecond
          }))
        }
      });
    } catch (error) {
      logger.error('Failed to get system trends', {
        hours: req.query.hours,
        error: error instanceof Error ? error.message : String(error)
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve system trends'
      });
    }
  }

  // Force refresh metrics
  static async refreshMetrics(_req: Request, res: Response): Promise<void> {
    try {
      const [queueMetrics, systemMetrics] = await Promise.all([
        monitoringService.collectAllQueueMetrics(),
        monitoringService.getSystemMetrics()
      ]);

      res.json({
        success: true,
        data: {
          queues: queueMetrics,
          system: systemMetrics,
          refreshedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Failed to refresh metrics', {
        error: error instanceof Error ? error.message : String(error)
      });

      res.status(500).json({
        success: false,
        error: 'Failed to refresh metrics'
      });
    }
  }

  // Get monitoring statistics
  static async getMonitoringStats(req: Request, res: Response): Promise<void> {
    try {
      const { days = 7 } = req.query;

      const daysNum = parseInt(days as string, 10);
      if (isNaN(daysNum) || daysNum <= 0 || daysNum > 30) {
        res.status(400).json({
          success: false,
          error: 'Days must be between 1 and 30'
        });
        return;
      }

      // Get aggregated statistics
      // TODO: queueMetrics, systemMetrics, and alert models do not exist in schema - see TASK3
      // Returning mock data for now to maintain API contract
      const queueStats = null;
      const systemStats = null;
      const alertStats: any[] = [];
      // const [queueStats, systemStats, alertStats] = await Promise.all([
      //   prisma.queueMetrics.aggregate({
      //     where: { recordedAt: { gte: cutoffDate } },
      //     _avg: {
      //       waiting: true,
      //       active: true,
      //       errorRate: true,
      //       averageProcessingTime: true
      //     },
      //     _max: {
      //       waiting: true,
      //       active: true,
      //       errorRate: true
      //     },
      //     _min: {
      //       averageProcessingTime: true
      //     }
      //   }),
      //   prisma.systemMetrics.aggregate({
      //     where: { timestamp: { gte: cutoffDate } },
      //     _avg: {
      //       memoryPercentage: true,
      //       cpuUsage: true,
      //       activeQueues: true,
      //       activeWorkers: true
      //     },
      //     _max: {
      //       memoryPercentage: true,
      //       cpuUsage: true
      //     }
      //   }),
      //   prisma.alert.groupBy({
      //     by: ['severity'],
      //     where: {
      //       triggeredAt: { gte: cutoffDate }
      //     },
      //     _count: true
      //   })
      // ]);

      res.json({
        success: true,
        data: {
          period: `${daysNum} days`,
          queueStats,
          systemStats,
          alertStats: alertStats.reduce((acc: any, stat: any) => {
            acc[stat.severity] = stat._count;
            return acc;
          }, {} as Record<string, number>)
        }
      });
    } catch (error) {
      logger.error('Failed to get monitoring statistics', {
        days: req.query.days,
        error: error instanceof Error ? error.message : String(error)
      });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve monitoring statistics'
      });
    }
  }
}

export default MonitoringController;