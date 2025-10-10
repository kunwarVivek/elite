import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import { logger } from '../config/logger.js';
import { sendValidationError } from '../utils/response.js';

// Extend Request interface to include validated data
declare global {
  namespace Express {
    interface Request {
      validated?: {
        body?: any;
        query?: any;
        params?: any;
      };
    }
  }
}

// Validation middleware factory
export const validate = (schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req[source];
      const result = schema.safeParse(data);

      if (!result.success) {
        const errors = result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: 'VALIDATION_ERROR',
        }));

        logger.warn('Validation failed', {
          errors,
          source,
          url: req.url,
          method: req.method,
          ip: req.ip,
        });

        return sendValidationError(res, errors);
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

// Body validation middleware
export const validateBody = (schema: ZodSchema) => validate(schema, 'body');

// Query validation middleware
export const validateQuery = (schema: ZodSchema) => validate(schema, 'query');

// Params validation middleware
export const validateParams = (schema: ZodSchema) => validate(schema, 'params');

// Common validation schemas
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const searchSchema = z.object({
  q: z.string().min(1).max(100),
  filters: z.record(z.any()).optional(),
});

export const idSchema = z.object({
  id: z.string().cuid('Invalid ID format'),
});

export const uuidSchema = z.object({
  id: z.string().uuid('Invalid UUID format'),
});

// Pagination validation middleware
export const validatePagination = validateQuery(paginationSchema);

// Search validation middleware
export const validateSearch = validateQuery(searchSchema);

// ID validation middleware
export const validateId = validateParams(idSchema);

// UUID validation middleware
export const validateUUID = validateParams(uuidSchema);

// File upload validation schema
export const fileUploadSchema = z.object({
  files: z.array(z.object({
    fieldname: z.string(),
    originalname: z.string(),
    encoding: z.string(),
    mimetype: z.string(),
    size: z.number(),
    destination: z.string(),
    filename: z.string(),
    path: z.string(),
  })).optional(),
});

// Custom validation helpers
export const validateEnum = <T extends string>(values: readonly T[]) => {
  return z.enum(values as [T, ...T[]]);
};

export const validateOptionalString = (min?: number, max?: number) => {
  let schema = z.string();

  if (min !== undefined) {
    schema = schema.min(min, `Must be at least ${min} characters long`);
  }

  if (max !== undefined) {
    schema = schema.max(max, `Must be less than ${max} characters long`);
  }

  return schema.optional();
};

export const validateOptionalEmail = () => {
  return z.string().email('Invalid email format').optional().or(z.literal(''));
};

export const validateOptionalUrl = () => {
  return z.string().url('Invalid URL format').optional().or(z.literal(''));
};

export const validatePhoneNumber = () => {
  return z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number format');
};

export const validateCurrency = () => {
  return z.number().positive('Amount must be positive');
};

export const validatePercentage = () => {
  return z.number().min(0).max(100, 'Percentage must be between 0 and 100');
};

// Date validation helpers
export const validateDateString = () => {
  return z.string().datetime('Invalid date format');
};

export const validateOptionalDateString = () => {
  return z.string().datetime('Invalid date format').optional().or(z.literal(''));
};

// Array validation helpers
export const validateStringArray = (min?: number, max?: number) => {
  let schema = z.array(z.string());

  if (min !== undefined) {
    schema = schema.min(min, `Must have at least ${min} items`);
  }

  if (max !== undefined) {
    schema = schema.max(max, `Must have at most ${max} items`);
  }

  return schema;
};

// Complex validation helper for nested objects
export const validateNested = (schema: ZodSchema, field: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req.body[field];
      if (data === undefined) {
        return next();
      }

      const result = schema.safeParse(data);

      if (!result.success) {
        const errors = result.error.errors.map(err => ({
          field: `${field}.${err.path.join('.')}`,
          message: err.message,
          code: 'VALIDATION_ERROR',
        }));

        logger.warn('Nested validation failed', {
          errors,
          field,
          url: req.url,
          method: req.method,
        });

        return sendValidationError(res, errors);
      }

      // Attach validated nested data to request object
      if (!req.validated) {
        req.validated = {};
      }
      (req.validated as any)[field] = result.data;

      next();
    } catch (error) {
      logger.error('Nested validation middleware error', { error, field });
      next(error);
    }
  };
};

export default {
  validate,
  validateBody,
  validateQuery,
  validateParams,
  validatePagination,
  validateSearch,
  validateId,
  validateUUID,
  validateEnum,
  validateOptionalString,
  validateOptionalEmail,
  validateOptionalUrl,
  validatePhoneNumber,
  validateCurrency,
  validatePercentage,
  validateDateString,
  validateOptionalDateString,
  validateStringArray,
  validateNested,
};