// Validation helpers for testing

export interface ValidationTestCase {
  input: any;
  expected: boolean;
  description: string;
}

export interface PerformanceTestCase {
  name: string;
  input: any;
  expectedTime: number; // milliseconds
}

export class ValidationHelpers {
  /**
   * Test validation function with multiple test cases
   */
  static testValidationFunction(
    validator: (input: any) => boolean,
    testCases: ValidationTestCase[]
  ): void {
    testCases.forEach(({ input, expected, description }) => {
      test(description, () => {
        const result = validator(input);
        expect(result).toBe(expected);
      });
    });
  }

  /**
   * Test async validation function
   */
  static async testAsyncValidationFunction(
    validator: (input: any) => Promise<boolean>,
    testCases: ValidationTestCase[]
  ): Promise<void> {
    for (const { input, expected, description } of testCases) {
      await test(description, async () => {
        const result = await validator(input);
        expect(result).toBe(expected);
      });
    }
  }

  /**
   * Test performance of function
   */
  static async testPerformance(
    testFunction: () => void | Promise<void>,
    testCases: PerformanceTestCase[]
  ): Promise<void> {
    for (const { name, input, expectedTime } of testCases) {
      await test(name, async () => {
        const start = performance.now();

        if (testFunction.constructor.name === 'AsyncFunction') {
          await testFunction();
        } else {
          testFunction();
        }

        const end = performance.now();
        const duration = end - start;

        expect(duration).toBeLessThan(expectedTime);
      });
    }
  }

  /**
   * Generate validation test cases for common patterns
   */
  static generateCommonValidationTestCases() {
    return {
      email: [
        { input: 'test@example.com', expected: true, description: 'Valid email' },
        { input: 'user.name@domain.co.uk', expected: true, description: 'Valid email with subdomain' },
        { input: 'invalid-email', expected: false, description: 'Invalid email format' },
        { input: '@domain.com', expected: false, description: 'Email without username' },
        { input: 'user@', expected: false, description: 'Email without domain' },
        { input: '', expected: false, description: 'Empty email' },
        { input: null, expected: false, description: 'Null email' },
      ],

      amount: [
        { input: 1000, expected: true, description: 'Valid amount' },
        { input: 0, expected: false, description: 'Zero amount' },
        { input: -100, expected: false, description: 'Negative amount' },
        { input: '1000', expected: false, description: 'String amount' },
        { input: null, expected: false, description: 'Null amount' },
      ],

      percentage: [
        { input: 50, expected: true, description: 'Valid percentage' },
        { input: 0, expected: true, description: 'Zero percentage' },
        { input: 100, expected: true, description: 'Max percentage' },
        { input: -10, expected: false, description: 'Negative percentage' },
        { input: 150, expected: false, description: 'Percentage over 100' },
      ],

      url: [
        { input: 'https://example.com', expected: true, description: 'Valid HTTPS URL' },
        { input: 'http://example.com', expected: true, description: 'Valid HTTP URL' },
        { input: 'example.com', expected: false, description: 'URL without protocol' },
        { input: 'not-a-url', expected: false, description: 'Invalid URL format' },
      ],

      phone: [
        { input: '+1234567890', expected: true, description: 'Valid phone with country code' },
        { input: '123-456-7890', expected: true, description: 'Valid phone with dashes' },
        { input: '(123) 456-7890', expected: true, description: 'Valid phone with parentheses' },
        { input: '1234567890', expected: true, description: 'Valid phone digits only' },
        { input: 'abc', expected: false, description: 'Invalid phone letters' },
      ],

      date: [
        { input: '2024-01-15', expected: true, description: 'Valid date' },
        { input: '2024-02-30', expected: false, description: 'Invalid date' },
        { input: 'not-a-date', expected: false, description: 'Invalid date format' },
      ],

      uuid: [
        { input: '123e4567-e89b-12d3-a456-426614174000', expected: true, description: 'Valid UUID' },
        { input: 'invalid-uuid', expected: false, description: 'Invalid UUID format' },
      ],
    };
  }

  /**
   * Generate performance test cases
   */
  static generatePerformanceTestCases() {
    return [
      {
        name: 'Small data processing',
        input: { size: 'small', count: 10 },
        expectedTime: 100,
      },
      {
        name: 'Medium data processing',
        input: { size: 'medium', count: 100 },
        expectedTime: 500,
      },
      {
        name: 'Large data processing',
        input: { size: 'large', count: 1000 },
        expectedTime: 2000,
      },
    ];
  }

  /**
   * Test error handling in validation functions
   */
  static testErrorHandling(
    validator: (input: any) => boolean,
    errorInputs: any[]
  ): void {
    errorInputs.forEach(input => {
      test(`should handle error for input: ${JSON.stringify(input)}`, () => {
        expect(() => validator(input)).not.toThrow();
      });
    });
  }

  /**
   * Test edge cases for validation functions
   */
  static testEdgeCases(
    validator: (input: any) => boolean,
    edgeCases: Array<{ input: any; expected: boolean; description: string }>
  ): void {
    edgeCases.forEach(({ input, expected, description }) => {
      test(description, () => {
        const result = validator(input);
        expect(result).toBe(expected);
      });
    });
  }

  /**
   * Generate edge cases for common data types
   */
  static generateEdgeCases() {
    return {
      strings: [
        { input: '', expected: false, description: 'Empty string' },
        { input: '   ', expected: false, description: 'Whitespace only' },
        { input: 'a'.repeat(10000), expected: false, description: 'Very long string' },
        { input: 'test@example.com', expected: true, description: 'Valid email string' },
      ],

      numbers: [
        { input: 0, expected: true, description: 'Zero' },
        { input: Number.MAX_SAFE_INTEGER, expected: false, description: 'Very large number' },
        { input: Number.MIN_SAFE_INTEGER, expected: false, description: 'Very small number' },
        { input: NaN, expected: false, description: 'NaN value' },
        { input: Infinity, expected: false, description: 'Infinity value' },
      ],

      arrays: [
        { input: [], expected: false, description: 'Empty array' },
        { input: new Array(10000), expected: false, description: 'Very large array' },
        { input: ['item1', 'item2'], expected: true, description: 'Valid array' },
      ],

      objects: [
        { input: {}, expected: false, description: 'Empty object' },
        { input: { key: 'value' }, expected: true, description: 'Valid object' },
        { input: null, expected: false, description: 'Null value' },
        { input: undefined, expected: false, description: 'Undefined value' },
      ],

      booleans: [
        { input: true, expected: true, description: 'True value' },
        { input: false, expected: true, description: 'False value' },
      ],
    };
  }

  /**
   * Test validation with boundary values
   */
  static testBoundaryValues(
    validator: (input: number) => boolean,
    min: number,
    max: number
  ): void {
    const testCases = [
      { input: min - 1, expected: false, description: `Below minimum (${min - 1})` },
      { input: min, expected: true, description: `At minimum (${min})` },
      { input: (min + max) / 2, expected: true, description: `Middle value (${(min + max) / 2})` },
      { input: max, expected: true, description: `At maximum (${max})` },
      { input: max + 1, expected: false, description: `Above maximum (${max + 1})` },
    ];

    testCases.forEach(({ input, expected, description }) => {
      test(description, () => {
        const result = validator(input);
        expect(result).toBe(expected);
      });
    });
  }

  /**
   * Test validation with internationalization
   */
  static testInternationalization(
    validator: (input: string) => boolean,
    internationalValues: Array<{ input: string; expected: boolean; description: string }>
  ): void {
    internationalValues.forEach(({ input, expected, description }) => {
      test(description, () => {
        const result = validator(input);
        expect(result).toBe(expected);
      });
    });
  }

  /**
   * Generate internationalization test cases
   */
  static generateInternationalizationCases() {
    return [
      { input: 'josé@example.com', expected: true, description: 'Email with accents' },
      { input: '用户@example.com', expected: true, description: 'Email with Chinese characters' },
      { input: 'test@пример.рф', expected: true, description: 'Email with Cyrillic domain' },
      { input: 'test@例え.テスト', expected: true, description: 'Email with Japanese characters' },
      { input: 'José María', expected: true, description: 'Name with Spanish characters' },
      { input: 'François Müller', expected: true, description: 'Name with French and German characters' },
    ];
  }
}

export default ValidationHelpers;