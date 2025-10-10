import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger.js';

// Custom error class
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public errorCode?: string;

  constructor(
    message: string,
    statusCode: number = 500,
    errorCode?: string,
    isOperational: boolean = true
  ) {
    super(message);

    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errorCode = errorCode;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Error response interface
interface ErrorResponse {
  success: false;
  error: string;
  message?: string;
  code?: string;
  details?: any;
  requestId?: string;
  timestamp: string;
  path?: string;
  method?: string;
}

// Global error handler middleware
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500;
  let message = 'Internal server error';
  let errorCode: string | undefined;
  let isOperational = false;

  // Log the error
  logger.error('Request error occurred', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    requestId: req.id,
  });

  // Handle different types of errors
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    errorCode = error.errorCode;
    isOperational = error.isOperational;
  } else if (error.name === 'ValidationError') {
    // Mongoose validation error
    statusCode = 400;
    message = 'Validation failed';
    errorCode = 'VALIDATION_ERROR';
  } else if (error.name === 'CastError') {
    // Mongoose cast error
    statusCode = 400;
    message = 'Invalid data format';
    errorCode = 'CAST_ERROR';
  } else if (error.name === 'MongoError' && (error as any).code === 11000) {
    // MongoDB duplicate key error
    statusCode = 409;
    message = 'Duplicate entry';
    errorCode = 'DUPLICATE_ERROR';
  } else if (error.name === 'JsonWebTokenError') {
    // JWT error
    statusCode = 401;
    message = 'Invalid token';
    errorCode = 'INVALID_TOKEN';
  } else if (error.name === 'TokenExpiredError') {
    // JWT expired error
    statusCode = 401;
    message = 'Token expired';
    errorCode = 'TOKEN_EXPIRED';
  } else if (error.name === 'MulterError') {
    // File upload error
    statusCode = 400;
    message = error.message;
    errorCode = 'FILE_UPLOAD_ERROR';
  }

  // Don't expose internal errors in production
  if (!isOperational && process.env.NODE_ENV === 'production') {
    message = 'Something went wrong';
  }

  // Prepare error response
  const errorResponse: ErrorResponse = {
    success: false,
    error: message,
    timestamp: new Date().toISOString(),
    requestId: req.id,
    path: req.path,
    method: req.method,
  };

  // Add error code if available
  if (errorCode) {
    errorResponse.code = errorCode;
  }

  // Add additional details in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.details = {
      stack: error.stack,
      originalMessage: error.message,
    };
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

// 404 handler middleware
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  const error = new AppError(
    `Route ${req.originalUrl} not found`,
    404,
    'ROUTE_NOT_FOUND'
  );
  next(error);
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Validation error handler for Zod and other validation libraries
export const handleValidationError = (error: any) => {
  if (error.name === 'ZodError') {
    const errors = error.errors.map((err: any) => ({
      field: err.path.join('.'),
      message: err.message,
      code: 'VALIDATION_ERROR',
    }));

    return new AppError(
      'Validation failed',
      400,
      'VALIDATION_ERROR',
      true
    );
  }

  return error;
};

export default {
  AppError,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  handleValidationError,
};