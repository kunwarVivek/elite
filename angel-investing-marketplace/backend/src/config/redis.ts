import Redis from 'ioredis';
import { logger } from './logger.js';
import { getSecretOrEnv } from './secrets.js';

/**
 * Get Redis URL with fallback to Docker secrets
 * Priority: REDIS_URL_FILE -> REDIS_URL env var
 */
function getRedisUrl(): string {
  // Try to get from secret file first, then fall back to env var
  const redisUrl = getSecretOrEnv('REDIS_URL', 'redis_url');

  if (!redisUrl) {
    // Fall back to default for development
    logger.warn('REDIS_URL not found, using default localhost URL');
    return 'redis://localhost:6379';
  }

  return redisUrl;
}

// Redis client configuration
export const redis = new Redis(getRedisUrl(), {
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  family: 4,
  connectTimeout: 10000,
  commandTimeout: 5000,
  // Password and other auth handled via URL
});

// Redis event listeners
redis.on('connect', () => {
  logger.info('Redis connecting...');
});

redis.on('ready', () => {
  logger.info('Redis connected successfully');
});

redis.on('error', (error) => {
  logger.error('Redis connection error', { error });
});

redis.on('close', () => {
  logger.warn('Redis connection closed');
});

redis.on('reconnecting', () => {
  logger.info('Redis reconnecting...');
});

// Redis health check
export const checkRedisConnection = async (): Promise<boolean> => {
  try {
    await redis.ping();
    return true;
  } catch (error) {
    logger.error('Redis health check failed', { error });
    return false;
  }
};

// Redis utilities
export const getRedisStats = async () => {
  try {
    const info = await redis.info();
    const ping = await redis.ping();

    return {
      status: 'connected',
      ping: ping === 'PONG' ? 'OK' : 'FAILED',
      info: parseRedisInfo(info),
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Failed to get Redis stats', { error });
    return {
      status: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };
  }
};

// Parse Redis INFO command output
const parseRedisInfo = (info: string) => {
  const lines = info.split('\r\n');
  const stats: Record<string, string> = {};

  lines.forEach(line => {
    if (line && !line.startsWith('#')) {
      const [key, value] = line.split(':');
      if (key && value) {
        stats[key] = value;
      }
    }
  });

  return {
    version: stats.redis_version,
    uptime: stats.uptime_in_days,
    connectedClients: stats.connected_clients,
    usedMemory: stats.used_memory_human,
    keyspaceHits: stats.keyspace_hits,
    keyspaceMisses: stats.keyspace_misses,
  };
};

// Redis key helpers
export const redisKeys = {
  // User sessions
  userSession: (userId: string) => `user:session:${userId}`,
  userSessions: (userId: string) => `user:sessions:${userId}`,

  // Rate limiting
  rateLimit: (identifier: string) => `rate_limit:${identifier}`,

  // Job queues
  jobQueue: (queueName: string) => `bull:${queueName}:`,
  jobQueueWaiting: (queueName: string) => `bull:${queueName}:waiting`,
  jobQueueActive: (queueName: string) => `bull:${queueName}:active`,
  jobQueueCompleted: (queueName: string) => `bull:${queueName}:completed`,
  jobQueueFailed: (queueName: string) => `bull:${queueName}:failed`,

  // Cache keys
  cache: (key: string) => `cache:${key}`,
  userCache: (userId: string) => `cache:user:${userId}`,
  startupCache: (startupId: string) => `cache:startup:${startupId}`,

  // Notifications
  userNotifications: (userId: string) => `notifications:${userId}`,
  unreadNotifications: (userId: string) => `notifications:${userId}:unread`,

  // Real-time
  socketRooms: (roomId: string) => `socket:rooms:${roomId}`,
  userSockets: (userId: string) => `socket:users:${userId}`,
};

// Cache utilities
export const cache = {
  set: async (key: string, value: any, ttl: number = 3600) => {
    try {
      await redis.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      logger.error('Cache set failed', { key, error });
    }
  },

  get: async (key: string) => {
    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Cache get failed', { key, error });
      return null;
    }
  },

  delete: async (key: string) => {
    try {
      await redis.del(key);
    } catch (error) {
      logger.error('Cache delete failed', { key, error });
    }
  },

  exists: async (key: string) => {
    try {
      return await redis.exists(key) > 0;
    } catch (error) {
      logger.error('Cache exists check failed', { key, error });
      return false;
    }
  },
};

// Graceful Redis shutdown
export const closeRedisConnection = async (): Promise<void> => {
  try {
    await redis.quit();
    logger.info('Redis connection closed successfully');
  } catch (error) {
    logger.error('Error closing Redis connection', { error });
    throw error;
  }
};

export default redis;