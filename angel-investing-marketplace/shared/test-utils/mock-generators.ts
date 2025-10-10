// Mock generators for testing external services and APIs

export interface MockApiResponse {
  success: boolean;
  data?: any;
  message?: string;
  errors?: Array<{
    field: string;
    message: string;
    code: string;
  }>;
  meta?: {
    timestamp: string;
    version: string;
    request_id: string;
  };
}

export interface MockPaymentData {
  paymentIntentId: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: 'requires_payment_method' | 'succeeded' | 'failed';
}

export interface MockWebhookData {
  eventType: string;
  eventId: string;
  timestamp: string;
  data: any;
}

export class MockGenerator {
  /**
   * Generate mock API response
   */
  static generateApiResponse(data: any, success = true): MockApiResponse {
    return {
      success,
      data: success ? data : null,
      message: success ? 'Success' : 'Error occurred',
      errors: success ? null : [
        {
          field: 'general',
          message: 'Mock error',
          code: 'MOCK_ERROR',
        },
      ],
      meta: {
        timestamp: new Date().toISOString(),
        version: 'v1',
        request_id: `mock_${Date.now()}`,
      },
    };
  }

  /**
   * Generate mock payment data
   */
  static generatePaymentData(overrides: Partial<MockPaymentData> = {}): MockPaymentData {
    return {
      paymentIntentId: `pi_mock_${Date.now()}`,
      clientSecret: `pi_mock_${Date.now()}_secret_${Math.random().toString(36).substring(7)}`,
      amount: overrides.amount || 25000,
      currency: overrides.currency || 'USD',
      status: overrides.status || 'requires_payment_method',
      ...overrides,
    };
  }

  /**
   * Generate mock webhook data
   */
  static generateWebhookData(eventType: string, data: any): MockWebhookData {
    return {
      eventType,
      eventId: `evt_mock_${Date.now()}`,
      timestamp: new Date().toISOString(),
      data,
    };
  }

  /**
   * Generate mock Stripe webhook
   */
  static generateStripeWebhook(eventType: string, paymentIntentId: string) {
    const baseData = {
      id: paymentIntentId,
      object: 'payment_intent',
      amount: 25000,
      currency: 'usd',
      status: 'succeeded',
      client_secret: `pi_secret_${paymentIntentId}`,
    };

    if (eventType === 'payment_intent.succeeded') {
      return this.generateWebhookData('payment_intent.succeeded', baseData);
    }

    if (eventType === 'payment_intent.payment_failed') {
      return this.generateWebhookData('payment_intent.payment_failed', {
        ...baseData,
        status: 'failed',
        last_payment_error: {
          code: 'card_declined',
          message: 'Your card was declined.',
        },
      });
    }

    return this.generateWebhookData(eventType, baseData);
  }

  /**
   * Generate mock email service response
   */
  static generateEmailResponse(success = true) {
    return {
      success,
      messageId: success ? `msg_${Date.now()}` : null,
      error: success ? null : 'Email delivery failed',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Generate mock file upload response
   */
  static generateFileUploadResponse(fileName: string, success = true) {
    return {
      success,
      fileId: success ? `file_${Date.now()}` : null,
      fileName,
      fileUrl: success ? `https://cdn.example.com/${fileName}` : null,
      fileSize: success ? Math.floor(Math.random() * 1000000) : null,
      error: success ? null : 'File upload failed',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Generate mock real-time event
   */
  static generateRealtimeEvent(eventType: string, data: any) {
    return {
      type: eventType,
      data,
      timestamp: new Date().toISOString(),
      id: `event_${Date.now()}`,
    };
  }

  /**
   * Generate mock notification
   */
  static generateNotification(userId: string, type: string, overrides = {}) {
    const notifications = {
      investment_update: {
        title: 'Investment Update',
        content: 'Your investment status has been updated',
      },
      payment_success: {
        title: 'Payment Successful',
        content: 'Your payment has been processed successfully',
      },
      new_message: {
        title: 'New Message',
        content: 'You have received a new message',
      },
      pitch_update: {
        title: 'Pitch Update',
        content: 'A pitch you are following has been updated',
      },
    };

    const defaultNotification = notifications[type as keyof typeof notifications] || {
      title: 'Notification',
      content: 'You have a new notification',
    };

    return {
      id: `notif_${Date.now()}`,
      user_id: userId,
      type,
      title: defaultNotification.title,
      content: defaultNotification.content,
      data: {},
      is_read: false,
      created_at: new Date().toISOString(),
      ...overrides,
    };
  }

  /**
   * Generate mock error responses
   */
  static generateErrorResponses() {
    return {
      validationError: {
        success: false,
        message: 'Validation failed',
        errors: [
          {
            field: 'email',
            message: 'Invalid email format',
            code: 'invalid_format',
          },
        ],
      },
      authenticationError: {
        success: false,
        message: 'Authentication failed',
        errors: [
          {
            field: 'token',
            message: 'Invalid or expired token',
            code: 'invalid_token',
          },
        ],
      },
      authorizationError: {
        success: false,
        message: 'Access denied',
        errors: [
          {
            field: 'role',
            message: 'Insufficient permissions',
            code: 'insufficient_permissions',
          },
        ],
      },
      paymentError: {
        success: false,
        message: 'Payment processing failed',
        errors: [
          {
            field: 'payment_method',
            message: 'Payment method declined',
            code: 'payment_declined',
          },
        ],
      },
      networkError: {
        success: false,
        message: 'Network error',
        errors: [
          {
            field: 'connection',
            message: 'Unable to connect to server',
            code: 'network_error',
          },
        ],
      },
    };
  }

  /**
   * Generate mock external service responses
   */
  static generateExternalServiceMocks() {
    return {
      stripe: {
        paymentIntent: {
          id: 'pi_mock_stripe',
          client_secret: 'pi_secret_mock',
          status: 'succeeded',
          amount: 25000,
          currency: 'usd',
        },
        refund: {
          id: 'pr_mock_refund',
          amount: 25000,
          status: 'succeeded',
        },
      },
      plaid: {
        linkToken: {
          link_token: 'link-sandbox-mock-token',
          expiration: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        },
        accounts: [
          {
            account_id: 'acc_mock_1',
            name: 'Checking Account',
            type: 'depository',
            balances: {
              available: 5000,
              current: 5000,
            },
          },
        ],
      },
      sendgrid: {
        emailSent: {
          success: true,
          messageId: 'msg_mock_sendgrid',
          timestamp: new Date().toISOString(),
        },
      },
    };
  }

  /**
   * Generate mock performance metrics
   */
  static generatePerformanceMetrics() {
    return {
      responseTime: Math.random() * 1000, // 0-1000ms
      memoryUsage: Math.random() * 100, // 0-100MB
      cpuUsage: Math.random() * 100, // 0-100%
      errorRate: Math.random() * 5, // 0-5%
      throughput: Math.random() * 1000, // requests per second
    };
  }

  /**
   * Generate mock load testing scenarios
   */
  static generateLoadTestScenarios() {
    return {
      lightLoad: {
        users: 10,
        duration: 60, // seconds
        requestsPerSecond: 5,
      },
      mediumLoad: {
        users: 50,
        duration: 300,
        requestsPerSecond: 25,
      },
      heavyLoad: {
        users: 200,
        duration: 600,
        requestsPerSecond: 100,
      },
      stressTest: {
        users: 1000,
        duration: 1800,
        requestsPerSecond: 500,
      },
    };
  }
}

export default MockGenerator;