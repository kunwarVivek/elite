import { z, ZodError, ZodSchema } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger.js';

// Enhanced validation error class
export class ValidationError extends Error {
  public errors: Array<{
    field: string;
    message: string;
    code: string;
    value?: any;
  }>;
  public statusCode: number;

  constructor(zodError: ZodError, statusCode: number = 400) {
    super('Validation failed');

    this.errors = zodError.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
      value: err.code === 'invalid_type' ? err.received : undefined,
    }));
    this.statusCode = statusCode;
  }

  getFieldError(fieldName: string): string | undefined {
    return this.errors.find(error => error.field === fieldName)?.message;
  }

  hasFieldError(fieldName: string): boolean {
    return this.errors.some(error => error.field === fieldName);
  }

  toJSON() {
    return {
      success: false,
      error: this.message,
      details: this.errors,
      timestamp: new Date().toISOString(),
    };
  }
}

// Validation middleware factory with enhanced features
export const validate = (schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req[source];
      const result = schema.safeParse(data);

      if (!result.success) {
        const validationError = new ValidationError(result.error);

        logger.warn('Validation failed', {
          errors: validationError.errors,
          source,
          url: req.url,
          method: req.method,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
        });

        res.status(validationError.statusCode).json(validationError.toJSON());
        return;
      }

      // Attach validated data to request object
      if (!req.validated) {
        req.validated = {};
      }
      req.validated[source] = result.data;

      next();
    } catch (error) {
      logger.error('Validation middleware error', { error, source });
      next(error);
    }
  };
};

// Async validation middleware for complex business rules
export const validateAsync = (
  schema: ZodSchema,
  source: 'body' | 'query' | 'params' = 'body',
  asyncValidator?: (data: any) => Promise<void>
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req[source];
      const result = schema.safeParse(data);

      if (!result.success) {
        const validationError = new ValidationError(result.error);
        res.status(validationError.statusCode).json(validationError.toJSON());
        return;
      }

      // Run async validation if provided
      if (asyncValidator) {
        try {
          await asyncValidator(result.data);
        } catch (asyncError: any) {
          logger.warn('Async validation failed', {
            error: asyncError.message,
            source,
            url: req.url,
            method: req.method,
          });

          res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: [{
              field: asyncError.field || 'general',
              message: asyncError.message,
              code: 'ASYNC_VALIDATION_ERROR',
            }],
            timestamp: new Date().toISOString(),
          });
          return;
        }
      }

      // Attach validated data to request object
      if (!req.validated) {
        req.validated = {};
      }
      req.validated[source] = result.data;

      next();
    } catch (error) {
      logger.error('Async validation middleware error', { error, source });
      next(error);
    }
  };
};

// Conditional validation based on request context
export const validateConditional = (
  schema: ZodSchema,
  condition: (req: Request) => boolean,
  source: 'body' | 'query' | 'params' = 'body'
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!condition(req)) {
      return next(); // Skip validation if condition not met
    }

    return validate(schema, source)(req, res, next);
  };
};

// Cross-field validation utility
export const createCrossFieldValidator = <T extends Record<string, any>>(
  validator: (data: T) => { isValid: boolean; message?: string; field?: string }
) => {
  return (data: T) => {
    const result = validator(data);
    if (!result.isValid) {
      return {
        success: false,
        error: result.message || 'Cross-field validation failed',
        field: result.field || 'general',
      };
    }
    return { success: true };
  };
};

// Input sanitization utilities
export const sanitizeString = (value: string): string => {
  if (typeof value !== 'string') return value;

  return value
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/on\w+=/gi, '') // Remove event handlers
    .slice(0, 1000); // Limit length
};

export const sanitizeHtml = (value: string): string => {
  if (typeof value !== 'string') return value;

  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remove iframe tags
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '') // Remove object tags
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '') // Remove embed tags
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .slice(0, 50000); // Limit length for HTML content
};

// File validation utilities
export const validateFileType = (file: Express.Multer.File, allowedTypes: string[]): boolean => {
  return allowedTypes.includes(file.mimetype);
};

export const validateFileSize = (file: Express.Multer.File, maxSizeInMB: number): boolean => {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return file.size <= maxSizeInBytes;
};

export const validateFileName = (fileName: string): boolean => {
  // Check for malicious file names
  const dangerousPatterns = [
    /\.\./, // Directory traversal
    /^[.-]/, // Hidden files or files starting with dash/period
    /[<>:"/\\|?*]/, // Invalid characters for file systems
  ];

  return !dangerousPatterns.some(pattern => pattern.test(fileName));
};

// Business logic validation utilities
export const validateInvestmentAmount = (amount: number, pitchData?: { minInvestment?: number; maxInvestment?: number }): boolean => {
  if (pitchData?.minInvestment && amount < pitchData.minInvestment) {
    return false;
  }
  if (pitchData?.maxInvestment && amount > pitchData.maxInvestment) {
    return false;
  }
  return amount > 0 && amount <= 10000000; // Max $10M per investment
};

export const validateEquityPercentage = (equity: number, fundingAmount: number, valuation?: number): boolean => {
  if (equity <= 0 || equity > 100) return false;

  if (valuation && fundingAmount) {
    const impliedValuation = (fundingAmount / equity) * 100;
    return impliedValuation <= valuation * 2; // Implied valuation shouldn't be more than 2x stated valuation
  }

  return true;
};

export const validateStartupStageProgression = (currentStage: string, foundedDate: string): boolean => {
  const stages = ['IDEA', 'PROTOTYPE', 'MVP', 'BETA', 'LAUNCHED', 'GROWTH', 'SCALE'];
  const stageIndex = stages.indexOf(currentStage);

  if (stageIndex === -1) return false;

  const foundedDateObj = new Date(foundedDate);
  const now = new Date();
  const monthsSinceFounded = (now.getTime() - foundedDateObj.getTime()) / (1000 * 60 * 60 * 24 * 30);

  // Basic validation: earlier stages should be reached sooner
  const maxMonthsForStage = [6, 12, 18, 24, 36, 60, 120]; // Max months for each stage

  return monthsSinceFounded <= maxMonthsForStage[stageIndex];
};

// Rate limiting validation
export const validateRateLimit = (
  identifier: string,
  maxRequests: number,
  windowMs: number,
  storage: Map<string, { count: number; resetTime: number }>
): { allowed: boolean; remaining: number; resetTime: number } => {
  const now = Date.now();
  const key = identifier;
  const record = storage.get(key);

  if (!record || now > record.resetTime) {
    // First request or window expired
    storage.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    return { allowed: true, remaining: maxRequests - 1, resetTime: now + windowMs };
  }

  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }

  record.count++;
  storage.set(key, record);

  return {
    allowed: true,
    remaining: maxRequests - record.count,
    resetTime: record.resetTime,
  };
};

// Schema composition utilities
export const combineSchemas = <T extends ZodSchema, U extends ZodSchema>(
  schema1: T,
  schema2: U
): z.ZodIntersection<T, U> => {
  return schema1.and(schema2);
};

export const createOptionalSchema = <T extends ZodSchema>(schema: T): z.ZodOptional<T> => {
  return schema.optional();
};

export const createNullableSchema = <T extends ZodSchema>(schema: T): z.ZodNullable<T> => {
  return schema.nullable();
};

// Validation result formatter
export const formatValidationErrors = (error: unknown): ValidationError | null => {
  if (error instanceof ZodError) {
    return new ValidationError(error);
  }

  if (error instanceof ValidationError) {
    return error;
  }

  return null;
};

// Type guards
export const isValidationError = (error: any): error is ValidationError => {
  return error instanceof ValidationError;
};

export const isZodError = (error: any): error is ZodError => {
  return error instanceof ZodError;
};

// Export validation middleware shortcuts
export const validateBody = (schema: ZodSchema) => validate(schema, 'body');
export const validateQuery = (schema: ZodSchema) => validate(schema, 'query');
export const validateParams = (schema: ZodSchema) => validate(schema, 'params');

// Export async validation middleware shortcuts
export const validateBodyAsync = (schema: ZodSchema, asyncValidator?: (data: any) => Promise<void>) =>
  validateAsync(schema, 'body', asyncValidator);
export const validateQueryAsync = (schema: ZodSchema, asyncValidator?: (data: any) => Promise<void>) =>
  validateAsync(schema, 'query', asyncValidator);
export const validateParamsAsync = (schema: ZodSchema, asyncValidator?: (data: any) => Promise<void>) =>
  validateAsync(schema, 'params', asyncValidator);

export default {
  ValidationError,
  validate,
  validateAsync,
  validateConditional,
  createCrossFieldValidator,
  sanitizeString,
  sanitizeHtml,
  validateFileType,
  validateFileSize,
  validateFileName,
  validateInvestmentAmount,
  validateEquityPercentage,
  validateStartupStageProgression,
  validateRateLimit,
  combineSchemas,
  createOptionalSchema,
  createNullableSchema,
  formatValidationErrors,
  isValidationError,
  isZodError,
  validateBody,
  validateQuery,
  validateParams,
  validateBodyAsync,
  validateQueryAsync,
  validateParamsAsync,
};