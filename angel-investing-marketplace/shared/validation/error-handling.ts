import { ZodError } from 'zod';

// Enhanced error types for different validation scenarios
export class ValidationError extends Error {
  public code: string;
  public statusCode: number;
  public details: Array<{
    field: string;
    message: string;
    code: string;
    value?: any;
  }>;
  public timestamp: string;
  public requestId?: string;

  constructor(
    message: string,
    errors: Array<{
      field: string;
      message: string;
      code: string;
      value?: any;
    }>,
    statusCode: number = 400,
    code: string = 'VALIDATION_ERROR'
  ) {
    super(message);
    this.name = 'ValidationError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = errors;
    this.timestamp = new Date().toISOString();
  }

  static fromZodError(zodError: ZodError, statusCode: number = 400): ValidationError {
    const errors = zodError.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
      value: err.code === 'invalid_type' ? err.received : undefined,
    }));

    return new ValidationError(
      'Validation failed',
      errors,
      statusCode,
      'ZOD_VALIDATION_ERROR'
    );
  }

  getFieldError(fieldName: string): string | undefined {
    return this.details.find(error => error.field === fieldName)?.message;
  }

  hasFieldError(fieldName: string): boolean {
    return this.details.some(error => error.field === fieldName);
  }

  toJSON() {
    return {
      success: false,
      error: this.message,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp,
      requestId: this.requestId,
    };
  }

  toFormErrors(): Record<string, string> {
    const formErrors: Record<string, string> = {};

    this.details.forEach(error => {
      const fieldName = error.field;
      if (!formErrors[fieldName]) {
        formErrors[fieldName] = error.message;
      }
    });

    return formErrors;
  }
}

export class BusinessLogicError extends Error {
  public code: string;
  public statusCode: number;
  public context?: Record<string, any>;

  constructor(
    message: string,
    code: string = 'BUSINESS_LOGIC_ERROR',
    statusCode: number = 400,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = 'BusinessLogicError';
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
  }

  toJSON() {
    return {
      success: false,
      error: this.message,
      code: this.code,
      context: this.context,
      timestamp: new Date().toISOString(),
    };
  }
}

export class SecurityError extends Error {
  public code: string;
  public statusCode: number;
  public securityContext?: Record<string, any>;

  constructor(
    message: string,
    code: string = 'SECURITY_ERROR',
    statusCode: number = 403,
    securityContext?: Record<string, any>
  ) {
    super(message);
    this.name = 'SecurityError';
    this.code = code;
    this.statusCode = statusCode;
    this.securityContext = securityContext;
  }

  toJSON() {
    return {
      success: false,
      error: 'Security validation failed',
      code: this.code,
      timestamp: new Date().toISOString(),
    };
  }
}

// Error response formatters
export const formatValidationErrorResponse = (error: ValidationError | Error) => {
  if (error instanceof ValidationError) {
    return {
      success: false,
      error: 'Validation failed',
      code: error.code,
      details: error.details,
      timestamp: error.timestamp,
    };
  }

  return {
    success: false,
    error: error.message,
    code: 'UNKNOWN_ERROR',
    timestamp: new Date().toISOString(),
  };
};

export const formatBusinessErrorResponse = (error: BusinessLogicError) => {
  return {
    success: false,
    error: error.message,
    code: error.code,
    context: error.context,
    timestamp: new Date().toISOString(),
  };
};

export const formatSecurityErrorResponse = (error: SecurityError) => {
  return {
    success: false,
    error: 'Security validation failed',
    code: error.code,
    timestamp: new Date().toISOString(),
  };
};

// Error boundary for React applications
export const createErrorBoundary = (fallbackComponent?: React.ComponentType) => {
  return class ValidationErrorBoundary extends React.Component<
    { children: React.ReactNode; fallback?: React.ComponentType },
    { hasError: boolean; error?: Error }
  > {
    constructor(props: any) {
      super(props);
      this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error) {
      return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
      console.error('Validation error boundary caught an error:', error, errorInfo);
    }

    render() {
      if (this.state.hasError) {
        if (this.props.fallback) {
          const FallbackComponent = this.props.fallback;
          return <FallbackComponent />;
        }

        if (fallbackComponent) {
          const FallbackComponent = fallbackComponent;
          return <FallbackComponent />;
        }

        return (
          <div className="error-fallback">
            <h2>Something went wrong</h2>
            <p>There was an error processing your request. Please try again.</p>
          </div>
        );
      }

      return this.props.children;
    }
  };
};

// Error recovery utilities
export const createErrorRecovery = <T>(
  operation: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000
) => {
  return async (): Promise<T> => {
    let lastError: Error;

    for (let i = 0; i <= retries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (i === retries) break;

        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }

    throw lastError!;
  };
};

// Validation error display components (React)
export const ValidationErrorDisplay = ({
  error,
  className = '',
}: {
  error?: ValidationError | Error;
  className?: string;
}) => {
  if (!error) return null;

  const validationError = error instanceof ValidationError ? error : null;

  return (
    <div className={`validation-error ${className}`}>
      <h3>{validationError?.message || error.message}</h3>
      {validationError?.details && (
        <ul>
          {validationError.details.map((detail, index) => (
            <li key={index}>
              <strong>{detail.field}:</strong> {detail.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// Field-level error display
export const FieldErrorDisplay = ({
  error,
  fieldName,
  className = '',
}: {
  error?: ValidationError;
  fieldName: string;
  className?: string;
}) => {
  if (!error) return null;

  const fieldError = error.getFieldError(fieldName);

  if (!fieldError) return null;

  return (
    <div className={`field-error ${className}`}>
      <span>{fieldError}</span>
    </div>
  );
};

// Toast notification for validation errors
export const createValidationToast = (
  error: ValidationError | Error,
  toast: (message: string, options?: any) => void
) => {
  if (error instanceof ValidationError) {
    const primaryError = error.details[0];
    toast(primaryError?.message || error.message, {
      type: 'error',
      duration: 5000,
    });
  } else {
    toast(error.message, {
      type: 'error',
      duration: 5000,
    });
  }
};

// Logging utilities for validation errors
export const logValidationError = (
  error: ValidationError | Error,
  context?: Record<string, any>
) => {
  const logData = {
    error: error.message,
    type: error.constructor.name,
    context,
    timestamp: new Date().toISOString(),
  };

  if (error instanceof ValidationError) {
    console.error('Validation Error:', {
      ...logData,
      details: error.details,
      code: error.code,
    });
  } else {
    console.error('Error:', logData);
  }
};

// Error categorization
export const categorizeError = (error: Error): {
  category: 'validation' | 'business' | 'security' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
} => {
  if (error instanceof ValidationError) {
    return { category: 'validation', severity: 'low' };
  }

  if (error instanceof BusinessLogicError) {
    return { category: 'business', severity: 'medium' };
  }

  if (error instanceof SecurityError) {
    return { category: 'security', severity: 'high' };
  }

  return { category: 'system', severity: 'medium' };
};

// Error metrics collection
export const collectErrorMetrics = (error: Error, context?: Record<string, any>) => {
  const { category, severity } = categorizeError(error);

  return {
    category,
    severity,
    message: error.message,
    type: error.constructor.name,
    context,
    timestamp: new Date().toISOString(),
  };
};

// Graceful degradation for validation failures
export const createFallbackHandler = <T>(
  primaryOperation: () => T,
  fallbackOperation: () => T,
  shouldUseFallback: (error: Error) => boolean = () => true
) => {
  return (): T => {
    try {
      return primaryOperation();
    } catch (error) {
      if (shouldUseFallback(error as Error)) {
        try {
          return fallbackOperation();
        } catch (fallbackError) {
          throw fallbackError;
        }
      }
      throw error;
    }
  };
};

// Validation error transformation for different contexts
export const transformErrorForContext = (
  error: ValidationError,
  context: 'api' | 'form' | 'toast' | 'log'
): any => {
  switch (context) {
    case 'api':
      return formatValidationErrorResponse(error);
    case 'form':
      return error.toFormErrors();
    case 'toast':
      return error.details[0]?.message || error.message;
    case 'log':
      return {
        message: error.message,
        details: error.details,
        code: error.code,
      };
    default:
      return error.toJSON();
  }
};

// Export error handling utilities
export default {
  ValidationError,
  BusinessLogicError,
  SecurityError,
  formatValidationErrorResponse,
  formatBusinessErrorResponse,
  formatSecurityErrorResponse,
  createErrorBoundary,
  createErrorRecovery,
  ValidationErrorDisplay,
  FieldErrorDisplay,
  createValidationToast,
  logValidationError,
  categorizeError,
  collectErrorMetrics,
  createFallbackHandler,
  transformErrorForContext,
};