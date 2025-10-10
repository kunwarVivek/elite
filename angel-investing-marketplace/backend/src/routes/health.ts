import { Router, Request, Response } from 'express';
import { checkDatabaseConnection, getDatabaseStats } from '../config/database.js';
import { checkRedisConnection, getRedisStats } from '../config/redis.js';
import { logger } from '../config/logger.js';
import { sendSuccess, sendError } from '../utils/response.js';

const router = Router();

/**
 * Basic health check endpoint
 * Returns 200 OK if server is running
 *
 * @route GET /health
 * @access Public
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    sendSuccess(res, {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
    }, 'Server is healthy');
  } catch (error) {
    logger.error('Health check failed', { error });
    sendError(res, 'Health check failed', 503);
  }
});

/**
 * Comprehensive health check endpoint with dependency checks
 * Returns detailed status of all services
 *
 * @route GET /health/detailed
 * @access Public
 */
router.get('/detailed', async (req: Request, res: Response) => {
  try {
    // Check database connection
    const databaseHealthy = await checkDatabaseConnection();
    const databaseStats = await getDatabaseStats();

    // Check Redis connection
    const redisHealthy = await checkRedisConnection();
    const redisStats = await getRedisStats();

    // Determine overall health status
    const allHealthy = databaseHealthy && redisHealthy;
    const status = allHealthy ? 'healthy' : (databaseHealthy || redisHealthy) ? 'degraded' : 'unhealthy';

    const responseData = {
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      dependencies: {
        database: {
          healthy: databaseHealthy,
          ...databaseStats,
        },
        redis: {
          healthy: redisHealthy,
          ...redisStats,
        },
      },
      system: {
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
      },
    };

    // Return 503 if any critical dependency is unhealthy
    if (!allHealthy) {
      res.status(503).json({
        success: false,
        data: responseData,
        message: 'Service unhealthy - one or more dependencies are down',
      });
      return;
    }

    sendSuccess(res, responseData, 'All services are healthy');
  } catch (error) {
    logger.error('Detailed health check failed', { error });
    res.status(503).json({
      success: false,
      error: 'Health check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Readiness probe endpoint for container orchestration
 * Returns 200 when service is ready to accept traffic
 *
 * @route GET /health/ready
 * @access Public
 */
router.get('/ready', async (req: Request, res: Response) => {
  try {
    // Check if critical dependencies are available
    const databaseHealthy = await checkDatabaseConnection();
    const redisHealthy = await checkRedisConnection();

    if (databaseHealthy && redisHealthy) {
      sendSuccess(res, {
        ready: true,
        timestamp: new Date().toISOString(),
      }, 'Service is ready');
    } else {
      res.status(503).json({
        success: false,
        data: {
          ready: false,
          timestamp: new Date().toISOString(),
          database: databaseHealthy,
          redis: redisHealthy,
        },
        message: 'Service is not ready',
      });
    }
  } catch (error) {
    logger.error('Readiness check failed', { error });
    res.status(503).json({
      success: false,
      error: 'Readiness check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Liveness probe endpoint for container orchestration
 * Returns 200 if server process is alive
 *
 * @route GET /health/alive
 * @access Public
 */
router.get('/alive', (req: Request, res: Response) => {
  try {
    sendSuccess(res, {
      alive: true,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    }, 'Service is alive');
  } catch (error) {
    logger.error('Liveness check failed', { error });
    res.status(503).json({
      success: false,
      error: 'Liveness check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Database-specific health check endpoint
 *
 * @route GET /health/database
 * @access Public
 */
router.get('/database', async (req: Request, res: Response) => {
  try {
    const healthy = await checkDatabaseConnection();
    const stats = await getDatabaseStats();

    if (healthy) {
      sendSuccess(res, {
        healthy: true,
        ...stats,
      }, 'Database is healthy');
    } else {
      res.status(503).json({
        success: false,
        data: {
          healthy: false,
          ...stats,
        },
        message: 'Database is unhealthy',
      });
    }
  } catch (error) {
    logger.error('Database health check failed', { error });
    res.status(503).json({
      success: false,
      error: 'Database health check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Redis-specific health check endpoint
 *
 * @route GET /health/redis
 * @access Public
 */
router.get('/redis', async (req: Request, res: Response) => {
  try {
    const healthy = await checkRedisConnection();
    const stats = await getRedisStats();

    if (healthy) {
      sendSuccess(res, {
        healthy: true,
        ...stats,
      }, 'Redis is healthy');
    } else {
      res.status(503).json({
        success: false,
        data: {
          healthy: false,
          ...stats,
        },
        message: 'Redis is unhealthy',
      });
    }
  } catch (error) {
    logger.error('Redis health check failed', { error });
    res.status(503).json({
      success: false,
      error: 'Redis health check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
