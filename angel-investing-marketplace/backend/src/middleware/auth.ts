import { NextFunction, Request, Response } from 'express';
import { auth } from '../config/auth.js';
import { prisma } from '../config/database.js';
import { AppError } from './errorHandler.js';
import { logger } from '../config/logger.js';

// Extend Express Request interface for authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name?: string;
        role: string;
      };
    }
  }
}

// Authentication middleware
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionToken = req.headers.authorization?.replace('Bearer ', '');

    if (!sessionToken) {
      throw new AppError('Authentication required', 401, 'AUTHENTICATION_REQUIRED');
    }

    // Get session from database
    const session = await prisma.session.findUnique({
      where: { sessionToken },
      include: { user: true },
    });

    if (!session || session.expires < new Date()) {
      throw new AppError('Invalid or expired session', 401, 'INVALID_SESSION');
    }

    // Attach user to request object
    req.user = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name || undefined,
      role: session.user.role,
    };

    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      logger.error('Authentication middleware error', { error });
      next(new AppError('Authentication failed', 401, 'AUTHENTICATION_ERROR'));
    }
  }
};

// Role-based authorization middleware
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError('Authentication required', 401, 'AUTHENTICATION_REQUIRED');
    }

    if (!roles.includes(req.user.role)) {
      throw new AppError('Insufficient permissions', 403, 'INSUFFICIENT_PERMISSIONS');
    }

    next();
  };
};

// Alias for authorize - requires specific role(s)
export const requireRole = (...roles: string[]) => authorize(...roles);

// Optional authentication middleware (doesn't fail if no auth)
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionToken = req.headers.authorization?.replace('Bearer ', '');

    if (!sessionToken) {
      return next();
    }

    const session = await prisma.session.findUnique({
      where: { sessionToken },
      include: { user: true },
    });

    if (session && session.expires >= new Date()) {
      req.user = {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name || undefined,
        role: session.user.role,
      };
    }

    next();
  } catch (error) {
    // Log error but don't fail the request
    logger.warn('Optional authentication failed', { error });
    next();
  }
};

// Admin only middleware
export const requireAdmin = authorize('ADMIN');

// Investor only middleware
export const requireInvestor = authorize('INVESTOR');

// Founder only middleware
export const requireFounder = authorize('FOUNDER');

// Admin or Founder middleware
export const requireAdminOrFounder = authorize('ADMIN', 'FOUNDER');

// Socket.IO authentication middleware
export const socketAuth = async (socket: any, next: any) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return next(new Error('Authentication required'));
    }

    const session = await prisma.session.findUnique({
      where: { sessionToken: token },
      include: { user: true },
    });

    if (!session || session.expires < new Date()) {
      return next(new Error('Invalid or expired session'));
    }

    // Attach user to socket
    socket.user = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name || undefined,
      role: session.user.role,
    };

    next();
  } catch (error) {
    logger.error('Socket authentication failed', { error });
    next(new Error('Authentication failed'));
  }
};

// Rate limiting for authentication endpoints
export const authRateLimit = (req: Request, res: Response, next: NextFunction) => {
  // Implement rate limiting logic for auth endpoints
  // This is a simple in-memory implementation
  // In production, use Redis for distributed rate limiting

  const clientIP = req.ip;
  const key = `auth_attempts:${clientIP}`;
  const maxAttempts = 5;
  const windowMs = 15 * 60 * 1000; // 15 minutes

  // TODO: Implement proper rate limiting with Redis
  // For now, we'll just log the attempts

  logger.debug('Authentication attempt', {
    ip: clientIP,
    userAgent: req.get('User-Agent'),
    endpoint: req.path,
  });

  next();
};

export default {
  authenticate,
  authorize,
  optionalAuth,
  requireAdmin,
  requireInvestor,
  requireFounder,
  requireAdminOrFounder,
  socketAuth,
  authRateLimit,
};