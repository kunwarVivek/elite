import { PrismaClient } from '@prisma/client';
import { isDevelopment, isProduction } from './environment.js';
import { logger } from './logger.js';
import { getSecretOrEnv } from './secrets.js';

// Define the log configuration type
type LogConfig = Array<{
  emit: 'event';
  level: 'query' | 'info' | 'warn' | 'error';
}>;

// Create a type for PrismaClient with event-based logging
type PrismaClientWithEvents = PrismaClient<{
  log: LogConfig;
}>;

// Global Prisma client instance
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientWithEvents | undefined;
};

/**
 * Get database URL with fallback to Docker secrets
 * Priority: DATABASE_URL_FILE -> DATABASE_URL env var
 */
function getDatabaseUrl(): string {
  // Try to get from secret file first, then fall back to env var
  const databaseUrl = getSecretOrEnv('DATABASE_URL', 'database_url');

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required but not found in environment or secrets');
  }

  return databaseUrl;
}

// Create Prisma client with configuration
export const prisma: PrismaClientWithEvents = globalForPrisma.prisma ?? new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'info' },
    { emit: 'event', level: 'warn' },
  ],
  errorFormat: 'pretty',
  datasources: {
    db: {
      url: getDatabaseUrl(),
    },
  },
}) as PrismaClientWithEvents;

// Log Prisma queries in development
if (isDevelopment) {
  prisma.$on('query', (e) => {
    logger.debug('Prisma Query', {
      query: e.query,
      params: e.params,
      duration: e.duration,
      timestamp: e.timestamp,
    });
  });
}

// Log Prisma errors
prisma.$on('error', (e) => {
  logger.error('Prisma Error', {
    message: e.message,
    target: e.target,
    timestamp: e.timestamp,
  });
});

// Log Prisma warnings
prisma.$on('warn', (e) => {
  logger.warn('Prisma Warning', {
    message: e.message,
    target: e.target,
    timestamp: e.timestamp,
  });
});

// Log Prisma info
prisma.$on('info', (e) => {
  logger.info('Prisma Info', {
    message: e.message,
    target: e.target,
    timestamp: e.timestamp,
  });
});

// Keep reference in development to avoid multiple instances
if (isDevelopment) {
  globalForPrisma.prisma = prisma;
}

/**
 * Retry database connection with exponential backoff
 * @param maxRetries Maximum number of retry attempts
 * @param initialDelay Initial delay in milliseconds
 */
export const connectWithRetry = async (
  maxRetries: number = 5,
  initialDelay: number = 1000
): Promise<boolean> => {
  let retries = 0;
  let delay = initialDelay;

  while (retries < maxRetries) {
    try {
      logger.info(`Attempting database connection (attempt ${retries + 1}/${maxRetries})...`);
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1 as health_check`;
      logger.info('Database connection established successfully');
      return true;
    } catch (error) {
      retries++;
      if (retries >= maxRetries) {
        logger.error('Max database connection retries reached', { error });
        return false;
      }

      logger.warn(`Database connection failed, retrying in ${delay}ms...`, {
        error,
        attempt: retries,
        maxRetries,
      });

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));

      // Exponential backoff: double the delay for next retry
      delay *= 2;
    }
  }

  return false;
};

// Database health check function
export const checkDatabaseConnection = async (): Promise<boolean> => {
  try {
    // Execute a simple query to test the connection
    await prisma.$queryRaw`SELECT 1 as health_check`;

    logger.info('Database connection verified');
    return true;
  } catch (error) {
    logger.error('Database connection failed', { error });
    return false;
  }
};

// Database connection pool management
export const getDatabaseStats = async () => {
  try {
    // Get connection pool statistics (Prisma doesn't expose this directly)
    // We'll use a simple query to check if the connection is alive
    const startTime = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const responseTime = Date.now() - startTime;

    return {
      status: 'connected',
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Failed to get database stats', { error });
    return {
      status: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };
  }
};

// Graceful database disconnection
export const disconnectDatabase = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
    logger.info('Database disconnected successfully');
  } catch (error) {
    logger.error('Error disconnecting from database', { error });
    throw error;
  }
};

// Database migration helper
export const runMigrations = async (): Promise<void> => {
  if (isProduction) {
    logger.info('Running database migrations...');
    // In production, you might want to use prisma migrate deploy
    // For now, we'll use db push for simplicity
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    try {
      await execAsync('npx prisma db push');
      logger.info('Database migrations completed successfully');
    } catch (error) {
      logger.error('Database migration failed', { error });
      throw error;
    }
  }
};

// Initialize database connection
export const initializeDatabase = async (): Promise<void> => {
  try {
    logger.info('Initializing database connection...');

    // Test the connection
    await checkDatabaseConnection();

    // Run migrations in production
    if (isProduction) {
      await runMigrations();
    }

    // Generate Prisma client
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    try {
      await execAsync('npx prisma generate');
      logger.info('Prisma client generated successfully');
    } catch (error) {
      logger.warn('Failed to generate Prisma client', { error });
      // Don't throw here as the client might already be generated
    }

    logger.info('Database initialization completed');
  } catch (error) {
    logger.error('Database initialization failed', { error });
    throw error;
  }
};

export default prisma;