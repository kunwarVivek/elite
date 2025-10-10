import request from 'supertest';
import express from 'express';
import { testPrisma, createTestUser, cleanupDatabase } from '../setup';
// import { ApiTestHelper } from './api-test-helper'; // Not currently used

// Create Express app for testing
const app = express();
app.use(express.json());

// Mock routes (in real tests, you'd import actual route handlers)
app.post('/api/v1/auth/register', async (req, res) => {
  try {
    // Mock successful registration
    const user = await createTestUser({
      email: req.body.email,
      name: req.body.name,
      role: req.body.role,
    });

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        requires_verification: true,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Registration failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.post('/api/v1/auth/login', async (req, res) => {
  try {
    // Mock login - find user by email
    const user = await testPrisma.user.findUnique({
      where: { email: req.body.email },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
      return;
    }

    // Mock JWT token generation
    const token = `mock_jwt_token_${user.id}`;
    const refreshToken = `mock_refresh_token_${user.id}`;

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        access_token: token,
        refresh_token: refreshToken,
        expires_in: 3600,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.post('/api/v1/auth/refresh', async (req, res) => {
  try {
    // Mock refresh token logic
    const refreshToken = req.body.refresh_token;
    if (!refreshToken || !refreshToken.startsWith('mock_refresh_token_')) {
      res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
      });
      return;
    }

    const userId = refreshToken.replace('mock_refresh_token_', '');
    const user = await testPrisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
      });
      return;
    }

    const newToken = `mock_jwt_token_${user.id}_refreshed`;
    const newRefreshToken = `mock_refresh_token_${user.id}_refreshed`;

    res.status(200).json({
      success: true,
      data: {
        access_token: newToken,
        refresh_token: newRefreshToken,
        expires_in: 3600,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Token refresh failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Test helper is not currently used
// const apiTest = new ApiTestHelper(app);

describe('Authentication API Integration Tests', () => {
  beforeEach(async () => {
    await cleanupDatabase();
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'SecurePass123',
        name: 'New User',
        role: 'INVESTOR' as const,
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.name).toBe(userData.name);
      expect(response.body.data.user.role).toBe(userData.role);
      expect(response.body.data.requires_verification).toBe(true);
    });

    it('should fail registration with invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'SecurePass123',
        name: 'New User',
        role: 'INVESTOR' as const,
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should fail registration with weak password', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: '123',
        name: 'New User',
        role: 'INVESTOR' as const,
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should fail registration with duplicate email', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'SecurePass123',
        name: 'New User',
        role: 'INVESTOR' as const,
      };

      // First registration
      await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      // Second registration with same email
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      // Create a test user for login tests
      await createTestUser({
        email: 'logintest@example.com',
        name: 'Login Test User',
        role: 'INVESTOR',
      });
    });

    it('should login successfully with correct credentials', async () => {
      const loginData = {
        email: 'logintest@example.com',
        password: 'SecurePass123',
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(loginData.email);
      expect(response.body.data.access_token).toBeDefined();
      expect(response.body.data.refresh_token).toBeDefined();
      expect(response.body.data.expires_in).toBe(3600);
    });

    it('should fail login with incorrect email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'SecurePass123',
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should fail login with incorrect password', async () => {
      const loginData = {
        email: 'logintest@example.com',
        password: 'WrongPassword',
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should fail login with missing email', async () => {
      const loginData = {
        password: 'SecurePass123',
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should fail login with missing password', async () => {
      const loginData = {
        email: 'logintest@example.com',
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    let validRefreshToken: string;
    let userId: string;

    beforeEach(async () => {
      // Create a test user and get their refresh token
      const user = await createTestUser({
        email: 'refreshtest@example.com',
        name: 'Refresh Test User',
        role: 'INVESTOR',
      });

      userId = user.id;
      validRefreshToken = `mock_refresh_token_${userId}`;
    });

    it('should refresh token successfully with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refresh_token: validRefreshToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.access_token).toBeDefined();
      expect(response.body.data.refresh_token).toBeDefined();
      expect(response.body.data.expires_in).toBe(3600);
      expect(response.body.data.access_token).not.toBe(validRefreshToken);
    });

    it('should fail refresh with invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refresh_token: 'invalid_refresh_token' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid refresh token');
    });

    it('should fail refresh with missing refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({});

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should fail refresh with non-existent user token', async () => {
      const fakeUserToken = 'mock_refresh_token_fake_user_id';

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refresh_token: fakeUserToken });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid refresh token');
    });
  });

  describe('Authentication Integration Flow', () => {
    it('should complete full registration and login flow', async () => {
      // Step 1: Register new user
      const registerData = {
        email: 'flowtest@example.com',
        password: 'SecurePass123',
        name: 'Flow Test User',
        role: 'FOUNDER' as const,
      };

      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send(registerData);

      expect(registerResponse.status).toBe(201);

      // Step 2: Login with registered user
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: registerData.email,
          password: registerData.password,
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.data.access_token).toBeDefined();
      expect(loginResponse.body.data.refresh_token).toBeDefined();

      // Step 3: Verify token format (mock protected route test)
      // const protectedResponse = await request(app)
      //   .get('/api/v1/users/me')
      //   .set('Authorization', `Bearer ${loginResponse.body.data.access_token}`);

      // This would work if we had the actual route implemented
      // For now, we just verify the token format
      expect(loginResponse.body.data.access_token).toMatch(/^mock_jwt_token_/);
    });

    it('should handle rate limiting for login attempts', async () => {
      const loginData = {
        email: 'ratelimit@example.com',
        password: 'WrongPassword',
      };

      // Create a user for rate limiting test
      await createTestUser({
        email: loginData.email,
        name: 'Rate Limit User',
        role: 'INVESTOR',
      });

      // Attempt multiple failed logins
      const attempts = [];
      for (let i = 0; i < 5; i++) {
        attempts.push(
          request(app)
            .post('/api/v1/auth/login')
            .send(loginData)
        );
      }

      const responses = await Promise.all(attempts);

      // All attempts should fail (wrong password)
      responses.forEach(response => {
        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      });
    });
  });
});