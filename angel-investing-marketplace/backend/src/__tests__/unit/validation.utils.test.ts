import {
  ValidationError,
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
} from '../../utils/validation';
import { z, ZodError } from 'zod';

describe('Validation Utils', () => {
  describe('ValidationError', () => {
    it('should create ValidationError from ZodError', () => {
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['email'],
          message: 'Expected string, received number',
        },
      ]);

      const validationError = new ValidationError(zodError);

      expect(validationError).toBeInstanceOf(Error);
      expect(validationError.errors).toHaveLength(1);
      expect(validationError.errors[0]?.field).toBe('email');
      expect(validationError.errors[0]?.message).toBe('Expected string, received number');
      expect(validationError.errors[0]?.code).toBe('invalid_type');
      expect(validationError.statusCode).toBe(400);
    });

    it('should get field error correctly', () => {
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['email'],
          message: 'Invalid email',
        },
        {
          code: 'too_small',
          minimum: 8,
          type: 'string',
          inclusive: true,
          exact: false,
          message: 'Password too short',
          path: ['password'],
        },
      ]);

      const validationError = new ValidationError(zodError);

      expect(validationError.getFieldError('email')).toBe('Invalid email');
      expect(validationError.getFieldError('password')).toBe('Password too short');
      expect(validationError.getFieldError('nonexistent')).toBeUndefined();
    });

    it('should check if field has error correctly', () => {
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['email'],
          message: 'Invalid email',
        },
      ]);

      const validationError = new ValidationError(zodError);

      expect(validationError.hasFieldError('email')).toBe(true);
      expect(validationError.hasFieldError('password')).toBe(false);
    });

    it('should convert to JSON correctly', () => {
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['email'],
          message: 'Invalid email',
        },
      ]);

      const validationError = new ValidationError(zodError);
      const json = validationError.toJSON();

      expect(json.success).toBe(false);
      expect(json.error).toBe('Validation failed');
      expect(json.details).toHaveLength(1);
      expect(json.timestamp).toBeDefined();
    });
  });

  describe('sanitizeString', () => {
    it('should trim whitespace', () => {
      expect(sanitizeString('  test  ')).toBe('test');
    });

    it('should remove HTML tags', () => {
      expect(sanitizeString('<script>alert("xss")</script>hello')).toBe('hello');
    });

    it('should remove javascript: URLs', () => {
      expect(sanitizeString('javascript:alert("xss")')).toBe('');
    });

    it('should remove event handlers', () => {
      expect(sanitizeString('onclick=alert("xss")')).toBe('');
    });

    it('should limit length', () => {
      const longString = 'a'.repeat(2000);
      expect(sanitizeString(longString)).toHaveLength(1000);
    });

    it('should handle non-string input', () => {
      expect(sanitizeString(123 as any)).toBe(123);
    });
  });

  describe('sanitizeHtml', () => {
    it('should remove script tags', () => {
      const html = '<p>Hello <script>alert("xss")</script>world</p>';
      expect(sanitizeHtml(html)).toBe('<p>Hello world</p>');
    });

    it('should remove iframe tags', () => {
      const html = '<p>Hello <iframe src="evil.com"></iframe>world</p>';
      expect(sanitizeHtml(html)).toBe('<p>Hello world</p>');
    });

    it('should remove event handlers', () => {
      const html = '<p onclick="alert(\'xss\')">Hello</p>';
      expect(sanitizeHtml(html)).toBe('<p>Hello</p>');
    });

    it('should limit length for HTML content', () => {
      const longHtml = '<p>' + 'a'.repeat(60000) + '</p>';
      expect(sanitizeHtml(longHtml)).toHaveLength(50000);
    });
  });

  describe('file validation utilities', () => {
    const mockFile = {
      mimetype: 'image/jpeg',
      size: 1024 * 1024, // 1MB
      originalname: 'test.jpg',
    } as Express.Multer.File;

    describe('validateFileType', () => {
      it('should return true for allowed file types', () => {
        expect(validateFileType(mockFile, ['image/jpeg', 'image/png'])).toBe(true);
      });

      it('should return false for disallowed file types', () => {
        expect(validateFileType(mockFile, ['image/png', 'application/pdf'])).toBe(false);
      });
    });

    describe('validateFileSize', () => {
      it('should return true for file within size limit', () => {
        expect(validateFileSize(mockFile, 2)).toBe(true); // 2MB limit
      });

      it('should return false for file exceeding size limit', () => {
        expect(validateFileSize(mockFile, 0.5)).toBe(false); // 0.5MB limit
      });
    });

    describe('validateFileName', () => {
      it('should return true for valid file names', () => {
        expect(validateFileName('document.pdf')).toBe(true);
        expect(validateFileName('my-document_v2.pdf')).toBe(true);
      });

      it('should return false for dangerous file names', () => {
        expect(validateFileName('../../../etc/passwd')).toBe(false); // Directory traversal
        expect(validateFileName('.hidden-file')).toBe(false); // Hidden file
        expect(validateFileName('file<name>.txt')).toBe(false); // Invalid characters
      });
    });
  });

  describe('business logic validation', () => {
    describe('validateInvestmentAmount', () => {
      it('should return true for valid investment amount', () => {
        expect(validateInvestmentAmount(10000)).toBe(true);
      });

      it('should return false for negative amount', () => {
        expect(validateInvestmentAmount(-100)).toBe(false);
      });

      it('should return false for zero amount', () => {
        expect(validateInvestmentAmount(0)).toBe(false);
      });

      it('should return false for amount below minimum', () => {
        expect(validateInvestmentAmount(100, { minInvestment: 1000 })).toBe(false);
      });

      it('should return false for amount above maximum', () => {
        expect(validateInvestmentAmount(100000, { maxInvestment: 50000 })).toBe(false);
      });

      it('should return false for extremely large amount', () => {
        expect(validateInvestmentAmount(20000000)).toBe(false); // Above $10M limit
      });
    });

    describe('validateEquityPercentage', () => {
      it('should return true for valid equity percentage', () => {
        expect(validateEquityPercentage(10, 100000, 1000000)).toBe(true);
      });

      it('should return false for negative equity', () => {
        expect(validateEquityPercentage(-5, 100000)).toBe(false);
      });

      it('should return false for equity over 100%', () => {
        expect(validateEquityPercentage(150, 100000)).toBe(false);
      });

      it('should return false for unrealistic valuation', () => {
        // $100k for 10% equity implies $1M valuation, but stated valuation is $100k
        expect(validateEquityPercentage(10, 100000, 100000)).toBe(false);
      });
    });

    describe('validateStartupStageProgression', () => {
      it('should return true for reasonable stage progression', () => {
        const foundedDate = new Date();
        foundedDate.setMonth(foundedDate.getMonth() - 6); // 6 months ago

        expect(validateStartupStageProgression('MVP', foundedDate.toISOString())).toBe(true);
      });

      it('should return false for unrealistic stage progression', () => {
        const foundedDate = new Date();
        foundedDate.setMonth(foundedDate.getMonth() - 1); // 1 month ago

        // Can't be at SCALE stage after only 1 month
        expect(validateStartupStageProgression('SCALE', foundedDate.toISOString())).toBe(false);
      });

      it('should return false for invalid stage', () => {
        const foundedDate = new Date();
        foundedDate.setFullYear(foundedDate.getFullYear() - 1);

        expect(validateStartupStageProgression('INVALID_STAGE' as any, foundedDate.toISOString())).toBe(false);
      });
    });
  });

  describe('rate limiting validation', () => {
    let storage: Map<string, { count: number; resetTime: number }>;

    beforeEach(() => {
      storage = new Map();
    });

    it('should allow first request', () => {
      const result = validateRateLimit('user123', 5, 60000, storage);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
      expect(result.resetTime).toBeGreaterThan(Date.now());
    });

    it('should track multiple requests correctly', () => {
      const identifier = 'user123';

      // First request
      const result1 = validateRateLimit(identifier, 3, 60000, storage);
      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(2);

      // Second request
      const result2 = validateRateLimit(identifier, 3, 60000, storage);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(1);

      // Third request (should be last allowed)
      const result3 = validateRateLimit(identifier, 3, 60000, storage);
      expect(result3.allowed).toBe(true);
      expect(result3.remaining).toBe(0);

      // Fourth request (should be blocked)
      const result4 = validateRateLimit(identifier, 3, 60000, storage);
      expect(result4.allowed).toBe(false);
      expect(result4.remaining).toBe(0);
    });

    it('should reset after window expires', () => {
      const identifier = 'user123';
      const now = Date.now();

      // Set up expired record
      storage.set(identifier, {
        count: 3,
        resetTime: now - 1000, // Expired 1 second ago
      });

      const result = validateRateLimit(identifier, 3, 60000, storage);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2);
    });
  });

  describe('schema composition utilities', () => {
    it('should combine schemas correctly', () => {
      const schema1 = z.object({ name: z.string() });
      const schema2 = z.object({ age: z.number() });
      const combined = combineSchemas(schema1, schema2);

      const validData = { name: 'John', age: 30 };
      expect(() => combined.parse(validData)).not.toThrow();

      const invalidData = { name: 'John' }; // Missing age
      expect(() => combined.parse(invalidData)).toThrow();
    });

    it('should create optional schema correctly', () => {
      const baseSchema = z.object({ name: z.string() });
      const optionalSchema = createOptionalSchema(baseSchema);

      // Should pass with valid data
      expect(() => optionalSchema.parse({ name: 'John' })).not.toThrow();

      // Should pass with undefined
      expect(() => optionalSchema.parse(undefined)).not.toThrow();

      // Should fail with invalid data
      expect(() => optionalSchema.parse({ name: 123 })).toThrow();
    });

    it('should create nullable schema correctly', () => {
      const baseSchema = z.object({ name: z.string() });
      const nullableSchema = createNullableSchema(baseSchema);

      // Should pass with valid data
      expect(() => nullableSchema.parse({ name: 'John' })).not.toThrow();

      // Should pass with null
      expect(() => nullableSchema.parse(null)).not.toThrow();

      // Should fail with invalid data
      expect(() => nullableSchema.parse({ name: 123 })).toThrow();
    });
  });

  describe('error formatting utilities', () => {
    it('should format ZodError correctly', () => {
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['email'],
          message: 'Invalid email',
        },
      ]);

      const formatted = formatValidationErrors(zodError);

      expect(formatted).toBeInstanceOf(ValidationError);
      expect(formatted?.errors).toHaveLength(1);
    });

    it('should return ValidationError as-is', () => {
      const validationError = new ValidationError(
        new ZodError([
          {
            code: 'invalid_type',
            expected: 'string',
            received: 'number',
            path: ['email'],
            message: 'Invalid email',
          },
        ])
      );

      const formatted = formatValidationErrors(validationError);
      expect(formatted).toBe(validationError);
    });

    it('should return null for non-validation errors', () => {
      const error = new Error('Generic error');
      const formatted = formatValidationErrors(error);
      expect(formatted).toBeNull();
    });
  });

  describe('type guards', () => {
    it('should identify ValidationError correctly', () => {
      const validationError = new ValidationError(
        new ZodError([
          {
            code: 'invalid_type',
            expected: 'string',
            received: 'number',
            path: ['email'],
            message: 'Invalid email',
          },
        ])
      );

      expect(isValidationError(validationError)).toBe(true);
      expect(isValidationError(new Error('Generic error'))).toBe(false);
    });

    it('should identify ZodError correctly', () => {
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['email'],
          message: 'Invalid email',
        },
      ]);

      expect(isZodError(zodError)).toBe(true);
      expect(isZodError(new Error('Generic error'))).toBe(false);
    });
  });

  describe('cross-field validation', () => {
    it('should create cross-field validator correctly', () => {
      const validator = createCrossFieldValidator<{ startDate: string; endDate: string }>((data) => {
        const start = new Date(data.startDate);
        const end = new Date(data.endDate);

        if (end <= start) {
          return {
            isValid: false,
            message: 'End date must be after start date',
            field: 'endDate',
          };
        }

        return { isValid: true };
      });

      const validData = { startDate: '2024-01-01', endDate: '2024-01-02' };
      expect(validator(validData).success).toBe(true);

      const invalidData = { startDate: '2024-01-02', endDate: '2024-01-01' };
      const result = validator(invalidData);
      expect(result.success).toBe(false);
      expect(result.error).toBe('End date must be after start date');
      expect(result.field).toBe('endDate');
    });
  });

  describe('middleware shortcuts', () => {
    it('should create body validator', () => {
      const schema = z.object({ name: z.string() });
      const middleware = validateBody(schema);

      expect(typeof middleware).toBe('function');
    });

    it('should create query validator', () => {
      const schema = z.object({ page: z.number() });
      const middleware = validateQuery(schema);

      expect(typeof middleware).toBe('function');
    });

    it('should create params validator', () => {
      const schema = z.object({ id: z.string() });
      const middleware = validateParams(schema);

      expect(typeof middleware).toBe('function');
    });
  });
});