import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

// Extend Express Request interface to include id
declare global {
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

// Generate unique request ID middleware
export const requestId = (req: Request, res: Response, next: NextFunction) => {
  // Check if request ID already exists (from load balancer, etc.)
  const existingId = req.get('X-Request-ID') || req.get('X-Trace-ID');

  if (existingId) {
    req.id = existingId;
  } else {
    req.id = randomUUID();
  }

  // Add request ID to response headers
  res.setHeader('X-Request-ID', req.id);

  next();
};

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // Log request start
  console.log(`${new Date().toISOString()} [${req.method}] ${req.originalUrl} - ${req.ip} - ${req.id}`);

  // Override res.end to log response
  const originalEnd = res.end.bind(res);
  res.end = function(this: Response, ...args: any[]) {
    const duration = Date.now() - startTime;

    console.log(`${new Date().toISOString()} [${req.method}] ${req.originalUrl} - ${res.statusCode} - ${duration}ms - ${req.id}`);

    // Call original end method with all arguments
    return originalEnd(...args);
  } as typeof res.end;

  next();
};

export default {
  requestId,
  requestLogger,
};