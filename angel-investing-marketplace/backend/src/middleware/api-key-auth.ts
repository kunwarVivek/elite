import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler.js';
import { apiKeyService } from '../services/api-key.service.js';
import { logger } from '../config/logger.js';

/**
 * API Key Authentication Middleware
 * Validates API keys and enforces rate limiting
 */

// Extend Request interface to include API key data
interface ApiKeyRequest extends Request {
  apiKey?: {
    id: string;
    userId: string;
    permissions: any;
    rateLimit: number;
  };
  user?: {
    id: string;
    email: string;
    name?: string;
    role: string;
  };
}

// Simple in-memory rate limiter
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Clean up expired rate limit entries
 */
function cleanupRateLimitStore() {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupRateLimitStore, 5 * 60 * 1000);

/**
 * Check rate limit for API key
 */
function checkRateLimit(apiKeyId: string, rateLimit: number): boolean {
  const now = Date.now();
  const hourInMs = 60 * 60 * 1000;

  const current = rateLimitStore.get(apiKeyId);

  if (!current || now > current.resetTime) {
    // Start new rate limit window
    rateLimitStore.set(apiKeyId, {
      count: 1,
      resetTime: now + hourInMs,
    });
    return true;
  }

  if (current.count >= rateLimit) {
    // Rate limit exceeded
    return false;
  }

  // Increment count
  current.count++;
  rateLimitStore.set(apiKeyId, current);
  return true;
}

/**
 * Middleware to validate API key
 * Checks API key in X-API-Key header
 */
export async function validateApiKey(
  req: ApiKeyRequest,
  res: Response,
  next: NextFunction
) {
  try {
    // Extract API key from header
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      throw new AppError('API key is required', 401, 'API_KEY_REQUIRED');
    }

    // Validate API key
    const validationResult = await apiKeyService.validateApiKey(apiKey);

    // Check rate limit
    const isWithinLimit = checkRateLimit(
      validationResult.apiKeyId,
      validationResult.rateLimit
    );

    if (!isWithinLimit) {
      const current = rateLimitStore.get(validationResult.apiKeyId);
      const resetTime = current ? new Date(current.resetTime).toISOString() : 'unknown';

      throw new AppError(
        `Rate limit exceeded. Limit: ${validationResult.rateLimit} requests/hour. Resets at: ${resetTime}`,
        429,
        'RATE_LIMIT_EXCEEDED'
      );
    }

    // Attach API key data to request
    req.apiKey = {
      id: validationResult.apiKeyId,
      userId: validationResult.userId,
      permissions: validationResult.permissions,
      rateLimit: validationResult.rateLimit,
    };

    // Also attach user data for compatibility with existing auth
    req.user = {
      id: validationResult.user.id,
      email: validationResult.user.email,
      name: validationResult.user.name || undefined,
      role: validationResult.user.role,
    };

    // Set rate limit headers
    const current = rateLimitStore.get(validationResult.apiKeyId);
    if (current) {
      res.setHeader('X-RateLimit-Limit', validationResult.rateLimit);
      res.setHeader('X-RateLimit-Remaining', validationResult.rateLimit - current.count);
      res.setHeader('X-RateLimit-Reset', new Date(current.resetTime).toISOString());
    }

    logger.debug('API key validated', {
      apiKeyId: validationResult.apiKeyId,
      userId: validationResult.userId,
    });

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware to check specific permission
 */
export function requirePermission(resource: string, action: 'read' | 'write') {
  return (req: ApiKeyRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.apiKey) {
        throw new AppError('API key authentication required', 401, 'API_KEY_REQUIRED');
      }

      const permissions = req.apiKey.permissions as any;

      // Check if permission exists
      if (!permissions[resource]) {
        throw new AppError(
          `No permissions for resource: ${resource}`,
          403,
          'INSUFFICIENT_PERMISSIONS'
        );
      }

      // Check specific action
      if (!permissions[resource][action]) {
        throw new AppError(
          `No ${action} permission for resource: ${resource}`,
          403,
          'INSUFFICIENT_PERMISSIONS'
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Optional API key authentication
 * Validates if present, but doesn't require it
 */
export async function optionalApiKey(
  req: ApiKeyRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      // No API key provided - continue without authentication
      return next();
    }

    // Validate if provided
    const validationResult = await apiKeyService.validateApiKey(apiKey);

    // Check rate limit
    const isWithinLimit = checkRateLimit(
      validationResult.apiKeyId,
      validationResult.rateLimit
    );

    if (!isWithinLimit) {
      const current = rateLimitStore.get(validationResult.apiKeyId);
      const resetTime = current ? new Date(current.resetTime).toISOString() : 'unknown';

      throw new AppError(
        `Rate limit exceeded. Limit: ${validationResult.rateLimit} requests/hour. Resets at: ${resetTime}`,
        429,
        'RATE_LIMIT_EXCEEDED'
      );
    }

    // Attach API key data to request
    req.apiKey = {
      id: validationResult.apiKeyId,
      userId: validationResult.userId,
      permissions: validationResult.permissions,
      rateLimit: validationResult.rateLimit,
    };

    req.user = {
      id: validationResult.user.id,
      email: validationResult.user.email,
      name: validationResult.user.name || undefined,
      role: validationResult.user.role,
    };

    next();
  } catch (error) {
    // If validation fails, continue without authentication
    // This allows the route to handle authentication separately if needed
    next();
  }
}

export default {
  validateApiKey,
  requirePermission,
  optionalApiKey,
};
