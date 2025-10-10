// Custom assertion helpers for testing

export interface ApiResponseAssertion {
  status: number;
  success: boolean;
  hasData: boolean;
  hasErrors: boolean;
  responseTime?: number;
}

export interface PerformanceAssertion {
  maxResponseTime: number;
  maxMemoryUsage: number;
  maxErrorRate: number;
}

export class AssertionHelpers {
  /**
   * Assert API response structure
   */
  static assertApiResponse(
    response: any,
    expected: Partial<ApiResponseAssertion>
  ): void {
    if (expected.status) {
      expect(response.status).toBe(expected.status);
    }

    if (typeof expected.success === 'boolean') {
      expect(response.body.success).toBe(expected.success);
    }

    if (expected.hasData) {
      expect(response.body.data).toBeDefined();
    }

    if (expected.hasErrors) {
      expect(response.body.errors).toBeDefined();
      expect(Array.isArray(response.body.errors)).toBe(true);
    }

    if (expected.responseTime) {
      expect(response.responseTime).toBeLessThan(expected.responseTime);
    }
  }

  /**
   * Assert successful API response
   */
  static assertSuccessResponse(response: any, responseTime?: number): void {
    this.assertApiResponse(response, {
      status: 200,
      success: true,
      hasData: true,
      hasErrors: false,
      responseTime,
    });
  }

  /**
   * Assert error API response
   */
  static assertErrorResponse(
    response: any,
    expectedStatus = 400,
    responseTime?: number
  ): void {
    this.assertApiResponse(response, {
      status: expectedStatus,
      success: false,
      hasErrors: true,
      responseTime,
    });
  }

  /**
   * Assert validation error response
   */
  static assertValidationError(response: any): void {
    this.assertErrorResponse(response, 400);
    expect(response.body.errors.length).toBeGreaterThan(0);
    expect(response.body.message).toContain('validation');
  }

  /**
   * Assert authentication error response
   */
  static assertAuthError(response: any): void {
    this.assertErrorResponse(response, 401);
    expect(response.body.message).toMatch(/auth|token|credential/i);
  }

  /**
   * Assert authorization error response
   */
  static assertForbiddenError(response: any): void {
    this.assertErrorResponse(response, 403);
    expect(response.body.message).toMatch(/permission|access|forbidden/i);
  }

  /**
   * Assert performance metrics
   */
  static assertPerformance(
    metrics: any,
    expected: PerformanceAssertion
  ): void {
    if (expected.maxResponseTime) {
      expect(metrics.responseTime).toBeLessThan(expected.maxResponseTime);
    }

    if (expected.maxMemoryUsage) {
      expect(metrics.memoryUsage).toBeLessThan(expected.maxMemoryUsage);
    }

    if (expected.maxErrorRate) {
      expect(metrics.errorRate).toBeLessThan(expected.maxErrorRate);
    }
  }

  /**
   * Assert data integrity
   */
  static assertDataIntegrity(data: any, schema: any): void {
    // Basic structure validation
    expect(data).toBeDefined();
    expect(typeof data).toBe('object');

    // Schema validation (if schema provided)
    if (schema) {
      Object.keys(schema).forEach(key => {
        if (schema[key].required && !(key in data)) {
          throw new Error(`Missing required field: ${key}`);
        }

        if (key in data && schema[key].type) {
          expect(typeof data[key]).toBe(schema[key].type);
        }
      });
    }
  }

  /**
   * Assert pagination structure
   */
  static assertPagination(response: any): void {
    expect(response.body.data.pagination).toBeDefined();
    expect(response.body.data.pagination.page).toBeDefined();
    expect(response.body.data.pagination.limit).toBeDefined();
    expect(response.body.data.pagination.total).toBeDefined();
    expect(response.body.data.pagination.total_pages).toBeDefined();
  }

  /**
   * Assert file upload response
   */
  static assertFileUpload(response: any): void {
    this.assertSuccessResponse(response);
    expect(response.body.data.fileId).toBeDefined();
    expect(response.body.data.fileName).toBeDefined();
    expect(response.body.data.fileUrl).toBeDefined();
    expect(response.body.data.fileSize).toBeDefined();
  }

  /**
   * Assert email sending response
   */
  static assertEmailSent(response: any): void {
    this.assertSuccessResponse(response);
    expect(response.body.data.messageId).toBeDefined();
    expect(response.body.data.timestamp).toBeDefined();
  }

  /**
   * Assert payment processing response
   */
  static assertPaymentProcessed(response: any): void {
    this.assertSuccessResponse(response);
    expect(response.body.data.paymentIntentId).toBeDefined();
    expect(response.body.data.clientSecret).toBeDefined();
    expect(response.body.data.amount).toBeDefined();
    expect(response.body.data.currency).toBeDefined();
  }

  /**
   * Assert investment creation response
   */
  static assertInvestmentCreated(response: any): void {
    this.assertSuccessResponse(response);
    expect(response.body.data.investmentId).toBeDefined();
    expect(response.body.data.amount).toBeDefined();
    expect(response.body.data.status).toBeDefined();
    expect(response.body.data.escrowReference).toBeDefined();
  }

  /**
   * Assert real-time event structure
   */
  static assertRealtimeEvent(event: any): void {
    expect(event.type).toBeDefined();
    expect(event.data).toBeDefined();
    expect(event.timestamp).toBeDefined();
    expect(event.id).toBeDefined();
  }

  /**
   * Assert notification structure
   */
  static assertNotification(notification: any): void {
    expect(notification.id).toBeDefined();
    expect(notification.user_id).toBeDefined();
    expect(notification.type).toBeDefined();
    expect(notification.title).toBeDefined();
    expect(notification.content).toBeDefined();
    expect(notification.created_at).toBeDefined();
    expect(typeof notification.is_read).toBe('boolean');
  }

  /**
   * Assert user authentication state
   */
  static assertUserAuthenticated(user: any): void {
    expect(user.id).toBeDefined();
    expect(user.email).toBeDefined();
    expect(user.role).toBeDefined();
    expect(user.is_verified).toBeDefined();
    expect(user.created_at).toBeDefined();
  }

  /**
   * Assert startup data structure
   */
  static assertStartupData(startup: any): void {
    expect(startup.id).toBeDefined();
    expect(startup.name).toBeDefined();
    expect(startup.slug).toBeDefined();
    expect(startup.founder_id).toBeDefined();
    expect(startup.funding_goal).toBeDefined();
    expect(startup.current_funding).toBeDefined();
    expect(startup.created_at).toBeDefined();
    expect(typeof startup.is_verified).toBe('boolean');
  }

  /**
   * Assert pitch data structure
   */
  static assertPitchData(pitch: any): void {
    expect(pitch.id).toBeDefined();
    expect(pitch.startup_id).toBeDefined();
    expect(pitch.title).toBeDefined();
    expect(pitch.funding_amount).toBeDefined();
    expect(pitch.equity_offered).toBeDefined();
    expect(pitch.minimum_investment).toBeDefined();
    expect(pitch.status).toBeDefined();
    expect(pitch.created_at).toBeDefined();
  }

  /**
   * Assert investment data structure
   */
  static assertInvestmentData(investment: any): void {
    expect(investment.id).toBeDefined();
    expect(investment.investor_id).toBeDefined();
    expect(investment.pitch_id).toBeDefined();
    expect(investment.amount).toBeDefined();
    expect(investment.equity_percentage).toBeDefined();
    expect(investment.status).toBeDefined();
    expect(investment.created_at).toBeDefined();
  }

  /**
   * Assert error message format
   */
  static assertErrorMessage(error: any): void {
    expect(error.message).toBeDefined();
    expect(typeof error.message).toBe('string');
    expect(error.message.length).toBeGreaterThan(0);

    if (error.code) {
      expect(typeof error.code).toBe('string');
    }

    if (error.field) {
      expect(typeof error.field).toBe('string');
    }
  }

  /**
   * Assert array contains objects with required fields
   */
  static assertArrayOfObjects(
    array: any[],
    requiredFields: string[]
  ): void {
    expect(Array.isArray(array)).toBe(true);
    expect(array.length).toBeGreaterThan(0);

    array.forEach(item => {
      expect(typeof item).toBe('object');
      requiredFields.forEach(field => {
        expect(item[field]).toBeDefined();
      });
    });
  }

  /**
   * Assert date format
   */
  static assertDateFormat(dateString: string): void {
    const date = new Date(dateString);
    expect(date.toString()).not.toBe('Invalid Date');
    expect(dateString).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  }

  /**
   * Assert currency format
   */
  static assertCurrencyFormat(amount: any): void {
    expect(typeof amount).toBe('number');
    expect(amount).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(amount)).toBe(true);
  }

  /**
   * Assert percentage format
   */
  static assertPercentageFormat(percentage: any): void {
    expect(typeof percentage).toBe('number');
    expect(percentage).toBeGreaterThanOrEqual(0);
    expect(percentage).toBeLessThanOrEqual(100);
    expect(Number.isFinite(percentage)).toBe(true);
  }

  /**
   * Assert URL format
   */
  static assertUrlFormat(url: string): void {
    expect(typeof url).toBe('string');
    expect(url.length).toBeGreaterThan(0);

    try {
      new URL(url);
    } catch {
      throw new Error(`Invalid URL format: ${url}`);
    }
  }

  /**
   * Assert email format
   */
  static assertEmailFormat(email: string): void {
    expect(typeof email).toBe('string');
    expect(email.length).toBeGreaterThan(0);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    expect(emailRegex.test(email)).toBe(true);
  }

  /**
   * Assert phone number format (basic)
   */
  static assertPhoneFormat(phone: string): void {
    expect(typeof phone).toBe('string');
    expect(phone.length).toBeGreaterThan(0);

    // Basic phone validation (can be enhanced)
    const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
    expect(phoneRegex.test(phone)).toBe(true);
  }
}

export default AssertionHelpers;