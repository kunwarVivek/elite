import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { AppError } from './errorHandler.js';
import { logger } from '../config/logger.js';

/**
 * Validation middleware factory
 *
 * Creates middleware that validates request data against a Zod schema
 *
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 *
 * @example
 * router.post('/', validate(createSafeSchema), safeController.createSafe);
 */
export const validate = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request data (params, query, body)
      const validatedData = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      // Replace request data with validated and transformed data
      req.body = validatedData.body || req.body;
      req.query = validatedData.query || req.query;
      req.params = validatedData.params || req.params;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Format Zod errors into a more readable format
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        logger.warn('Validation failed', {
          path: req.path,
          method: req.method,
          errors: formattedErrors,
        });

        return next(
          new AppError(
            'Validation failed',
            400,
            'VALIDATION_ERROR',
            formattedErrors
          )
        );
      }

      // Handle unexpected errors
      logger.error('Unexpected error in validation middleware', error);
      next(error);
    }
  };
};

/**
 * Optional validation middleware factory
 *
 * Similar to validate() but allows requests to pass even if validation fails
 * Useful for optional query parameters or backward compatibility
 *
 * @param schema - Zod schema to validate against
 * @returns Express middleware function
 */
export const validateOptional = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      req.body = validatedData.body || req.body;
      req.query = validatedData.query || req.query;
      req.params = validatedData.params || req.params;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        logger.debug('Optional validation failed, allowing request to proceed', {
          path: req.path,
          errors: error.errors,
        });
      }
      // Allow request to proceed even if validation fails
      next();
    }
  };
};

/**
 * Validation error formatter
 *
 * Formats Zod validation errors into a standardized error response
 *
 * @param error - Zod validation error
 * @returns Formatted error object
 */
export const formatValidationError = (error: ZodError) => {
  return {
    message: 'Validation failed',
    errors: error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
    })),
  };
};
