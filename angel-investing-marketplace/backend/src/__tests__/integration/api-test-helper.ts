import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { testPrisma, testFactory } from '../setup';

export class ApiTestHelper {
  private app: express.Application;
  private prisma: PrismaClient;

  constructor(app: express.Application, prisma: PrismaClient = testPrisma) {
    this.app = app;
    this.prisma = prisma;
  }

  // Authentication helpers
  async login(email: string, password: string) {
    const response = await request(this.app)
      .post('/api/v1/auth/login')
      .send({ email, password });

    if (response.status === 200 && response.body.data?.access_token) {
      return {
        token: response.body.data.access_token,
        refreshToken: response.body.data.refresh_token,
        user: response.body.data.user,
      };
    }

    throw new Error(`Login failed: ${response.body.message}`);
  }

  async register(userData: {
    email: string;
    password: string;
    name: string;
    role: 'FOUNDER' | 'INVESTOR';
  }) {
    const response = await request(this.app)
      .post('/api/v1/auth/register')
      .send(userData);

    if (response.status === 201) {
      return response.body.data;
    }

    throw new Error(`Registration failed: ${response.body.message}`);
  }

  // Request helpers with authentication
  async get(url: string, token?: string) {
    const req = request(this.app).get(url);
    if (token) {
      req.set('Authorization', `Bearer ${token}`);
    }
    return req;
  }

  async post(url: string, data: any, token?: string) {
    const req = request(this.app).post(url).send(data);
    if (token) {
      req.set('Authorization', `Bearer ${token}`);
    }
    return req;
  }

  async put(url: string, data: any, token?: string) {
    const req = request(this.app).put(url).send(data);
    if (token) {
      req.set('Authorization', `Bearer ${token}`);
    }
    return req;
  }

  async delete(url: string, token?: string) {
    const req = request(this.app).delete(url);
    if (token) {
      req.set('Authorization', `Bearer ${token}`);
    }
    return req;
  }

  // Test data creation helpers
  async createTestUser(role: 'FOUNDER' | 'INVESTOR' = 'INVESTOR') {
    const userData = {
      email: `test${Date.now()}@example.com`,
      password: 'TestPassword123',
      name: 'Test User',
      role,
    };

    await this.register(userData);
    return userData;
  }

  async createAuthenticatedUser(role: 'FOUNDER' | 'INVESTOR' = 'INVESTOR') {
    const userData = await this.createTestUser(role);
    const auth = await this.login(userData.email, userData.password);
    return { userData, auth };
  }

  async createTestStartup(founderToken: string) {
    const startupData = {
      name: 'Test Startup Inc',
      description: 'A test startup for testing',
      industry: 'Technology',
      stage: 'MVP',
      funding_goal: 500000,
      website_url: 'https://teststartup.com',
      team_size: 5,
      founded_date: '2023-01-01',
      business_model: 'SaaS platform',
      target_market: 'SMBs',
      competitive_advantage: 'AI-powered automation',
    };

    const response = await this.post('/api/v1/startups', startupData, founderToken);
    if (response.status === 201) {
      return response.body.data;
    }

    throw new Error(`Startup creation failed: ${response.body.message}`);
  }

  async createTestPitch(startupId: string, founderToken: string) {
    const pitchData = {
      startup_id: startupId,
      title: 'Revolutionary SaaS Platform',
      summary: 'AI-powered platform transforming business operations',
      problem_statement: 'Businesses struggle with manual processes',
      solution: 'Automated workflow platform using AI',
      market_opportunity: '$100B market opportunity',
      funding_amount: 500000,
      equity_offered: 10,
      minimum_investment: 10000,
      financial_projections: {
        year1_revenue: 100000,
        year2_revenue: 500000,
        year3_revenue: 2000000,
      },
    };

    const response = await this.post('/api/v1/pitches', pitchData, founderToken);
    if (response.status === 201) {
      return response.body.data;
    }

    throw new Error(`Pitch creation failed: ${response.body.message}`);
  }

  async createTestInvestment(pitchId: string, investorToken: string) {
    const investmentData = {
      pitch_id: pitchId,
      amount: 25000,
      equity_percentage: 0.5,
      payment_method: 'BANK_TRANSFER',
      terms: {
        vesting_period: 48,
        cliff_period: 12,
      },
    };

    const response = await this.post('/api/v1/investments', investmentData, investorToken);
    if (response.status === 201) {
      return response.body.data;
    }

    throw new Error(`Investment creation failed: ${response.body.message}`);
  }

  // Database cleanup
  async cleanup() {
    await testFactory.cleanup();
  }

  // Test scenario helpers
  async setupFounderWithStartup() {
    const { userData: founderData, auth: founderAuth } = await this.createAuthenticatedUser('FOUNDER');
    const startup = await this.createTestStartup(founderAuth.token);
    return { founderData, founderAuth, startup };
  }

  async setupInvestorWithInvestment() {
    const { userData: founderData, auth: founderAuth, startup } = await this.setupFounderWithStartup();
    const pitch = await this.createTestPitch(startup.id, founderAuth.token);

    const { userData: investorData, auth: investorAuth } = await this.createAuthenticatedUser('INVESTOR');
    const investment = await this.createTestInvestment(pitch.id, investorAuth.token);

    return {
      founderData,
      founderAuth,
      startup,
      pitch,
      investorData,
      investorAuth,
      investment,
    };
  }

  // Response assertion helpers
  expectSuccessResponse(response: request.Response) {
    expect(response.status).toBeGreaterThanOrEqual(200);
    expect(response.status).toBeLessThan(300);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toBeDefined();
    return response.body.data;
  }

  expectErrorResponse(response: request.Response, expectedStatus?: number) {
    if (expectedStatus) {
      expect(response.status).toBe(expectedStatus);
    } else {
      expect(response.status).toBeGreaterThanOrEqual(400);
    }
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBeDefined();
    return response.body;
  }

  expectValidationError(response: request.Response) {
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.details).toBeDefined();
    expect(Array.isArray(response.body.details)).toBe(true);
    return response.body;
  }

  expectUnauthorizedError(response: request.Response) {
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    return response.body;
  }

  expectForbiddenError(response: request.Response) {
    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    return response.body;
  }
}

// Export singleton instance
export const apiTestHelper = new ApiTestHelper(
  express(), // We'll need to pass the actual app instance when creating tests
);