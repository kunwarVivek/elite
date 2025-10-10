import { z, ZodError } from 'zod';

// Enhanced validation error class for frontend
export class ValidationError extends Error {
  public errors: Array<{
    field: string;
    message: string;
    code: string;
  }>;

  constructor(zodError: ZodError) {
    super('Validation failed');

    this.errors = zodError.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
    }));
  }

  getFieldError(fieldName: string): string | undefined {
    return this.errors.find(error => error.field === fieldName)?.message;
  }

  hasFieldError(fieldName: string): boolean {
    return this.errors.some(error => error.field === fieldName);
  }

  toFormErrors(): Record<string, string> {
    const formErrors: Record<string, string> = {};

    this.errors.forEach(error => {
      const fieldName = error.field;
      if (!formErrors[fieldName]) {
        formErrors[fieldName] = error.message;
      }
    });

    return formErrors;
  }
}

// Real-time validation hook utilities
export const validateField = <T>(
  schema: z.ZodSchema<T>,
  fieldName: string,
  value: any
): { isValid: boolean; error?: string } => {
  try {
    // Create a partial schema for single field validation
    const fieldSchema = schema.pick({ [fieldName]: true } as any);
    fieldSchema.parse({ [fieldName]: value });
    return { isValid: true };
  } catch (error) {
    if (error instanceof ZodError) {
      const fieldError = error.errors.find(err =>
        err.path.includes(fieldName)
      );

      if (fieldError) {
        return { isValid: false, error: fieldError.message };
      }
    }
    return { isValid: false, error: 'Invalid value' };
  }
};

// Debounced validation for real-time feedback
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Async validation for server-side checks
export const validateAsync = async <T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  asyncValidator?: (data: T) => Promise<void>
): Promise<{ isValid: boolean; errors: string[]; data?: T }> => {
  try {
    const result = schema.parse(data);

    if (asyncValidator) {
      try {
        await asyncValidator(result);
      } catch (error: any) {
        return {
          isValid: false,
          errors: [error.message || 'Async validation failed'],
        };
      }
    }

    return { isValid: true, errors: [], data: result };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        isValid: false,
        errors: error.errors.map(err => err.message),
      };
    }
    return { isValid: false, errors: ['Validation failed'] };
  }
};

// Form validation utilities
export const validateForm = <T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { isValid: boolean; errors: Record<string, string>; data?: T } => {
  try {
    const result = schema.parse(data);
    return { isValid: true, errors: {}, data: result };
  } catch (error) {
    if (error instanceof ZodError) {
      const fieldErrors: Record<string, string> = {};

      error.errors.forEach(err => {
        const fieldName = err.path[0] as string;
        fieldErrors[fieldName] = err.message;
      });

      return { isValid: false, errors: fieldErrors };
    }
    return { isValid: false, errors: { general: 'Validation failed' } };
  }
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

export const sanitizeNumber = (value: string | number): number | null => {
  if (typeof value === 'number') return value;

  if (typeof value !== 'string') return null;

  // Remove any non-numeric characters except decimal point and minus
  const cleaned = value.replace(/[^0-9.-]/g, '');

  const parsed = parseFloat(cleaned);

  return isNaN(parsed) ? null : parsed;
};

export const sanitizeEmail = (email: string): string => {
  if (typeof email !== 'string') return '';

  return email
    .toLowerCase()
    .trim()
    .replace(/[<>\s]/g, ''); // Remove spaces, angle brackets
};

// File validation utilities
export const validateFileType = (file: File, allowedTypes: string[]): boolean => {
  return allowedTypes.includes(file.type);
};

export const validateFileSize = (file: File, maxSizeInMB: number): boolean => {
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
export const validateInvestmentAmount = (
  amount: number,
  pitchData?: {
    minInvestment?: number;
    maxInvestment?: number;
    fundingAmount?: number;
  }
): { isValid: boolean; error?: string } => {
  if (amount <= 0) {
    return { isValid: false, error: 'Investment amount must be positive' };
  }

  if (amount > 10000000) {
    return { isValid: false, error: 'Investment amount cannot exceed $10,000,000' };
  }

  if (pitchData?.minInvestment && amount < pitchData.minInvestment) {
    return { isValid: false, error: `Minimum investment is $${pitchData.minInvestment.toLocaleString()}` };
  }

  if (pitchData?.maxInvestment && amount > pitchData.maxInvestment) {
    return { isValid: false, error: `Maximum investment is $${pitchData.maxInvestment.toLocaleString()}` };
  }

  if (pitchData?.fundingAmount && amount > pitchData.fundingAmount) {
    return { isValid: false, error: 'Investment amount cannot exceed funding goal' };
  }

  return { isValid: true };
};

export const validateEquityPercentage = (
  equity: number,
  fundingAmount: number,
  valuation?: number
): { isValid: boolean; error?: string } => {
  if (equity <= 0 || equity > 100) {
    return { isValid: false, error: 'Equity percentage must be between 0 and 100' };
  }

  if (valuation && fundingAmount) {
    const impliedValuation = (fundingAmount / equity) * 100;
    if (impliedValuation > valuation * 2) {
      return { isValid: false, error: 'Implied valuation seems unrealistic' };
    }
  }

  return { isValid: true };
};

// Cross-field validation utilities
export const createCrossFieldValidator = <T extends Record<string, any>>(
  validator: (data: T) => { isValid: boolean; message?: string; field?: string }
) => {
  return (data: T): { isValid: boolean; error?: string; field?: string } => {
    try {
      const result = validator(data);
      return result;
    } catch (error: any) {
      return {
        isValid: false,
        error: error.message || 'Cross-field validation failed',
        field: error.field || 'general',
      };
    }
  };
};

// Conditional validation based on form state
export const createConditionalValidator = <T extends Record<string, any>>(
  condition: (data: T) => boolean,
  schema: z.ZodSchema,
  fieldName: keyof T
) => {
  return (data: T): { isValid: boolean; error?: string } => {
    if (!condition(data)) {
      return { isValid: true }; // Skip validation if condition not met
    }

    const fieldValue = data[fieldName];
    const result = schema.safeParse(fieldValue);

    if (!result.success) {
      const error = result.error.errors[0];
      return { isValid: false, error: error.message };
    }

    return { isValid: true };
  };
};

// Validation result formatter for UI
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

// Schema composition utilities
export const combineSchemas = <T extends z.ZodRawShape, U extends z.ZodRawShape>(
  schema1: z.ZodObject<T>,
  schema2: z.ZodObject<U>
): z.ZodObject<T & U> => {
  return schema1.merge(schema2);
};

export const createOptionalSchema = <T extends z.ZodTypeAny>(schema: T): z.ZodOptional<T> => {
  return schema.optional();
};

export const createNullableSchema = <T extends z.ZodTypeAny>(schema: T): z.ZodNullable<T> => {
  return schema.nullable();
};

// Export utility functions for React Hook Form integration
export const zodResolver = <T extends z.ZodTypeAny>(schema: T) => {
  return async (data: unknown) => {
    const result = await schema.safeParseAsync(data);

    if (!result.success) {
      return {
        values: {},
        errors: result.error.errors.reduce((acc, error) => {
          const path = error.path.join('.');
          acc[path] = {
            type: error.code,
            message: error.message,
          };
          return acc;
        }, {} as Record<string, { type: string; message: string }>),
      };
    }

    return {
      values: result.data,
      errors: {},
    };
  };
};

export default {
  ValidationError,
  validateField,
  debounce,
  validateAsync,
  validateForm,
  sanitizeString,
  sanitizeHtml,
  sanitizeNumber,
  sanitizeEmail,
  validateFileType,
  validateFileSize,
  validateFileName,
  validateInvestmentAmount,
  validateEquityPercentage,
  createCrossFieldValidator,
  createConditionalValidator,
  formatValidationErrors,
  isValidationError,
  isZodError,
  combineSchemas,
  createOptionalSchema,
  createNullableSchema,
  zodResolver,
};