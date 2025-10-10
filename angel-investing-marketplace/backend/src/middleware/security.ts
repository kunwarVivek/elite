import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { Request, Response, NextFunction } from 'express';
import { env } from '../config/environment.js';
import { logger } from '../config/logger.js';

// General API rate limiting
export const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per 15 minutes
  message: {
    success: false,
    error: 'Too many API requests, please try again later.',
    retryAfter: 900, // 15 minutes in seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('General rate limit exceeded', {
      ip: req.ip,
      url: req.url,
      method: req.method,
    });
    res.status(429).json({
      success: false,
      error: 'Too many API requests, please try again later.',
      retryAfter: 900,
    });
  },
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.url === '/health' || req.url === '/api/health';
  },
});

// Authentication endpoints rate limiting (more restrictive)
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 auth requests per 15 minutes
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: 900,
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      url: req.url,
      method: req.method,
    });
    res.status(429).json({
      success: false,
      error: 'Too many authentication attempts, please try again later.',
      retryAfter: 900,
    });
  },
});

// File upload rate limiting (very restrictive)
export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 uploads per hour
  message: {
    success: false,
    error: 'Too many file uploads, please try again later.',
    retryAfter: 3600,
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Upload rate limit exceeded', {
      ip: req.ip,
      url: req.url,
      method: req.method,
    });
    res.status(429).json({
      success: false,
      error: 'Too many file uploads, please try again later.',
      retryAfter: 3600,
    });
  },
});

// Admin endpoints rate limiting (restrictive)
export const adminRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60, // 60 admin requests per 15 minutes
  message: {
    success: false,
    error: 'Too many admin requests, please try again later.',
    retryAfter: 900,
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Admin rate limit exceeded', {
      ip: req.ip,
      url: req.url,
      method: req.method,
    });
    res.status(429).json({
      success: false,
      error: 'Too many admin requests, please try again later.',
      retryAfter: 900,
    });
  },
});

// Speed limiting - slow down requests after certain threshold
export const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 100, // Start slowing after 100 requests
  delayMs: (hits) => hits * 50, // Add 50ms delay per request after threshold
});

// CORS configuration
export const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = [
      env.FRONTEND_URL,
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
    ];

    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      logger.warn('CORS blocked request from origin', { origin });
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Authorization',
    'Accept',
    'X-Request-ID',
  ],
};

// Security headers middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Basic security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  // Remove server information
  res.removeHeader('X-Powered-By');

  next();
};

// Request timeout middleware
export const requestTimeout = (req: Request, res: Response, next: NextFunction) => {
  const timeout = setTimeout(() => {
    res.status(408).json({
      success: false,
      error: 'Request timeout',
    });
  }, 30000); // 30 seconds

  res.on('finish', () => {
    clearTimeout(timeout);
  });

  next();
};

// Request size limiting middleware
export const requestSizeLimit = (req: Request, res: Response, next: NextFunction) => {
  let data = '';

  req.setEncoding('utf8');

  req.on('data', (chunk) => {
    data += chunk;

    // Check if request size exceeds limit (10MB)
    if (data.length > 10 * 1024 * 1024) {
      res.status(413).json({
        success: false,
        error: 'Request entity too large',
      });
      return;
    }
  });

  req.on('end', () => {
    (req as any).rawBody = data;
    next();
  });
};

// SQL injection prevention middleware
export const sqlInjectionPrevention = (req: Request, res: Response, next: NextFunction) => {
  const sqlPatterns = [
    /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/gi,
    /(--|#|\/\*|\*\/)/g,
    /(\bor\b\s+\d+\s*=\s*\d+)/gi,
    /(\band\b\s+\d+\s*=\s*\d+)/gi,
    /('|(\\')|(\|\|))/g,
  ];

  const checkValue = (value: any): boolean => {
    if (typeof value === 'string') {
      return sqlPatterns.some(pattern => pattern.test(value));
    }
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).some(checkValue);
    }
    return false;
  };

  const hasSqlInjection = checkValue(req.body) || checkValue(req.query) || checkValue(req.params);

  if (hasSqlInjection) {
    logger.warn('Potential SQL injection attempt blocked', {
      ip: req.ip,
      url: req.url,
      method: req.method,
      body: req.body,
      query: req.query,
      params: req.params,
    });

    return res.status(400).json({
      success: false,
      error: 'Invalid input detected',
      code: 'INVALID_INPUT',
    });
  }

  next();
};

// XSS prevention middleware
export const xssPrevention = (req: Request, res: Response, next: NextFunction) => {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe\b[^>]*>/gi,
    /<object\b[^>]*>/gi,
    /<embed\b[^>]*>/gi,
    /<link\b[^>]*>/gi,
    /<meta\b[^>]*>/gi,
  ];

  const checkValue = (value: any): boolean => {
    if (typeof value === 'string') {
      return xssPatterns.some(pattern => pattern.test(value));
    }
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).some(checkValue);
    }
    return false;
  };

  const hasXSS = checkValue(req.body) || checkValue(req.query);

  if (hasXSS) {
    logger.warn('Potential XSS attempt blocked', {
      ip: req.ip,
      url: req.url,
      method: req.method,
      body: req.body,
      query: req.query,
    });

    return res.status(400).json({
      success: false,
      error: 'Invalid input detected',
      code: 'INVALID_INPUT',
    });
  }

  next();
};

// Input sanitization middleware
export const inputSanitization = (req: Request, res: Response, next: NextFunction) => {
  const sanitizeString = (str: string): string => {
    return str
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: URLs
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  };

  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return sanitizeString(obj);
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeObject(value);
      }
      return sanitized;
    }
    return obj;
  };

  // Sanitize request body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  next();
};

// API key validation middleware (for external API access)
export const apiKeyValidation = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API key required',
      code: 'API_KEY_REQUIRED',
    });
  }

  // TODO: Validate API key against database
  // For now, just check if it exists
  const keyLength = typeof apiKey === 'string' ? apiKey.length : 0;
  if (keyLength < 32) {
    return res.status(401).json({
      success: false,
      error: 'Invalid API key',
      code: 'INVALID_API_KEY',
    });
  }

  next();
};

// Content Security Policy middleware
export const cspHeaders = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' data:; " +
    "connect-src 'self'; " +
    "frame-ancestors 'none';"
  );
  next();
};

export default {
  generalRateLimiter,
  authRateLimiter,
  uploadRateLimiter,
  adminRateLimiter,
  speedLimiter,
  corsOptions,
  securityHeaders,
  cspHeaders,
  requestTimeout,
  requestSizeLimit,
  sqlInjectionPrevention,
  xssPrevention,
  inputSanitization,
  apiKeyValidation,
};