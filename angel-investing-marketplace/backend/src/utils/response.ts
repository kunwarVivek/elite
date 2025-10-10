import { Response } from 'express';

// Standard API response interface
export interface ApiResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  meta?: {
    timestamp: string;
    version: string;
    requestId: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

// Error response interface
export interface ApiErrorResponse {
  success: false;
  error: string;
  message?: string;
  code?: string;
  details?: any;
  meta?: {
    timestamp: string;
    version: string;
    requestId: string;
  };
}

// Success response helper
export const sendSuccess = <T>(
  res: Response,
  data: T,
  message?: string,
  statusCode: number = 200
): Response<ApiResponse<T>> => {
  const response: ApiResponse<T> = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      version: 'v1',
      requestId: res.get('X-Request-ID') || '',
    },
  };

  if (message) {
    response.message = message;
  }

  return res.status(statusCode).json(response);
};

// Created response helper
export const sendCreated = <T>(
  res: Response,
  data: T,
  message?: string
): Response<ApiResponse<T>> => {
  return sendSuccess(res, data, message || 'Resource created successfully', 201);
};

// Pagination helper
export const sendPaginated = <T>(
  res: Response,
  data: T[],
  page: number,
  limit: number,
  total: number,
  message?: string
): Response<ApiResponse<T[]>> => {
  const totalPages = Math.ceil(total / limit);

  const response: ApiResponse<T[]> = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      version: 'v1',
      requestId: res.get('X-Request-ID') || '',
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    },
  };

  if (message) {
    response.message = message;
  }

  return res.status(200).json(response);
};

// No content response helper
export const sendNoContent = (res: Response): Response => {
  return res.status(204).send();
};

// Error response helper
export const sendError = (
  res: Response,
  error: string,
  statusCode: number = 500,
  code?: string,
  message?: string,
  details?: any
): Response<ApiErrorResponse> => {
  const response: ApiErrorResponse = {
    success: false,
    error,
    meta: {
      timestamp: new Date().toISOString(),
      version: 'v1',
      requestId: res.get('X-Request-ID') || '',
    },
  };

  if (code) {
    response.code = code;
  }

  if (message) {
    response.message = message;
  }

  if (details) {
    response.details = details;
  }

  return res.status(statusCode).json(response);
};

// Validation error response helper
export const sendValidationError = (
  res: Response,
  errors: Array<{ field: string; message: string; code?: string }>
): Response<ApiErrorResponse> => {
  return sendError(
    res,
    'Validation failed',
    400,
    'VALIDATION_ERROR',
    'Please check your input and try again',
    { errors }
  );
};

export default {
  sendSuccess,
  sendCreated,
  sendPaginated,
  sendNoContent,
  sendError,
  sendValidationError,
};