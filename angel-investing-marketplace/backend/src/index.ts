import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';

// Import configurations and middleware
import { env, isDevelopment, isProduction } from './config/environment.js';
import { logger, morganStream } from './config/logger.js';
import { corsOptions, securityHeaders, speedLimiter, requestTimeout, generalRateLimiter } from './middleware/security.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { requestId, requestLogger } from './middleware/requestId.js';
import { sendSuccess } from './utils/response.js';

// Import services and configurations
import { connectWithRetry, disconnectDatabase } from './config/database.js';

const app = express();
const server = createServer(app);

// Socket.IO setup with authentication middleware
const io = new Server(server, {
  cors: {
    origin: env.SOCKET_IO_CORS_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Global Prisma client
export const prisma = new PrismaClient({
  log: isDevelopment ? ['query', 'error', 'warn'] : ['error'],
  errorFormat: 'pretty',
});

// Trust proxy for accurate IP addresses (important for rate limiting)
app.set('trust proxy', 1);

// Global middleware
app.use(requestId);
app.use(requestLogger);
app.use(securityHeaders);
app.use(requestTimeout);

// CORS configuration
app.use(cors(corsOptions));

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// Rate limiting and speed limiting
app.use('/api', generalRateLimiter);
app.use('/api', speedLimiter);

// Body parsing middleware
app.use(express.json({
  limit: '10mb',
  strict: true,
}));
app.use(express.urlencoded({
  extended: true,
  limit: '10mb',
}));

// Logging middleware
if (isDevelopment) {
  app.use(morgan('dev', { stream: morganStream }));
} else {
  app.use(morgan('combined', { stream: morganStream }));
}

// Health check endpoints
app.get('/health', (_req, res) => {
  sendSuccess(res, {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
  }, 'Server is healthy');
});

app.get('/api/health', async (_req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;

    // Check Redis connection (will be implemented later)
    // const redisHealth = await checkRedisConnection();

    sendSuccess(res, {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0',
      database: 'connected',
      // redis: redisHealth,
    }, 'API is healthy');
  } catch (error) {
    logger.error('Health check failed', { error });
    res.status(503).json({
      success: false,
      error: 'Service unhealthy',
      timestamp: new Date().toISOString(),
    });
  }
});

// API routes
import router from './routes/index.js';
app.use('/api', router);

// Initialize Socket.IO service with authentication and room management
import { initializeSocketService } from './services/socketService.js';
initializeSocketService(io);

// Socket.IO connection handling is now managed by SocketService
// The service handles authentication, room management, and real-time events

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Graceful shutdown handling
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received, starting graceful shutdown`);

  // Stop accepting new connections
  server.close(async () => {
    logger.info('HTTP server closed');

    try {
      // Close database connections
      await disconnectDatabase();
      logger.info('Database connections closed');

      // Close Socket.IO connections
      io.close();
      logger.info('Socket.IO server closed');

      // TODO: Close Redis connections
      // TODO: Close job queues

      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown', { error });
      process.exit(1);
    }
  });

  // Force close server after 30 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  });
};

// Handle different termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error });
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at', { promise, reason });
  gracefulShutdown('unhandledRejection');
});

// Initialize database and start server
async function startServer() {
  try {
    logger.info('🔌 Connecting to database...');

    // Connect to database with retry logic
    const dbConnected = await connectWithRetry(5, 1000);

    if (!dbConnected) {
      logger.error('❌ Failed to connect to database after multiple retries');
      process.exit(1);
    }

    // Run migrations in production
    if (isProduction) {
      logger.info('🔄 Running database migrations...');
      try {
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);
        await execAsync('npx prisma migrate deploy');
        logger.info('✅ Database migrations completed successfully');
      } catch (error) {
        logger.error('❌ Database migration failed', { error });
        process.exit(1);
      }
    }

    // Start server
    const PORT = env.PORT;

    server.listen(PORT, () => {
      logger.info('🚀 Server started successfully', {
        port: PORT,
        environment: env.NODE_ENV,
        timestamp: new Date().toISOString(),
      });

      if (isDevelopment) {
        logger.info(`📱 Frontend URL: ${env.FRONTEND_URL}`);
        logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
        logger.info(`🔗 API health check: http://localhost:${PORT}/api/health`);
      }
    });
  } catch (error) {
    logger.error('❌ Failed to start server', { error });
    process.exit(1);
  }
}

// Start the application
startServer();

// Export for testing
export { app, server, io };