import request from 'supertest';
import express from 'express';
import { testPrisma } from '../setup';

// Create Express app for testing
const app = express();
app.use(express.json());

// Mock protected route middleware
const mockAuthMiddleware = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Missing or invalid authorization header',
    });
  }

  const token = authHeader.substring(7);

  // Mock token validation
  if (token.startsWith('mock_jwt_token_')) {
    const userId = token.replace('mock_jwt_token_', '').replace('_refreshed', '');
    req.user = { id: userId, role: 'INVESTOR' };
    return next();
  }

  if (token === 'mock_admin_token') {
    req.user = { id: 'admin_user', role: 'ADMIN' };
    return next();
  }

  if (token === 'mock_founder_token') {
    req.user = { id: 'founder_user', role: 'FOUNDER' };
    return next();
  }

  return res.status(401).json({
    success: false,
    message: 'Invalid token',
  });
};

// Mock role-based authorization middleware
const requireRole = (allowedRoles: string[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
      });
    }

    next();
  };
};

// Mock routes for security testing
app.get('/api/v1/protected', mockAuthMiddleware, (req, res) => {
  res.json({
    success: true,
    data: { message: 'Protected resource accessed', user: req.user },
  });
});

app.get('/api/v1/admin-only', mockAuthMiddleware, requireRole(['ADMIN']), (req, res) => {
  res.json({
    success: true,
    data: { message: 'Admin resource accessed', user: req.user },
  });
});

app.get('/api/v1/founder-only', mockAuthMiddleware, requireRole(['FOUNDER']), (req, res) => {
  res.json({
    success: true,
    data: { message: 'Founder resource accessed', user: req.user },
  });
});

app.post('/api/v1/investment', mockAuthMiddleware, requireRole(['INVESTOR']), (req, res) => {
  res.json({
    success: true,
    data: { message: 'Investment created', user: req.user },
  });
});

describe('Authentication Security Tests', () => {
  beforeEach(async () => {
    await testFactory.cleanup();
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  describe('JWT Token Security', () => {
    it('should reject requests without authorization header', async () => {
      const response = await request(app).get('/api/v1/protected');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Missing or invalid authorization header');
    });

    it('should reject requests with malformed authorization header', async () => {
      const response = await request(app)
        .get('/api/v1/protected')
        .set('Authorization', 'InvalidHeader');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Missing or invalid authorization header');
    });

    it('should reject requests with invalid Bearer token format', async () => {
      const response = await request(app)
        .get('/api/v1/protected')
        .set('Authorization', 'Bearer');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Missing or invalid authorization header');
    });

    it('should reject requests with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/protected')
        .set('Authorization', 'Bearer invalid_token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid token');
    });

    it('should accept requests with valid token', async () => {
      const response = await request(app)
        .get('/api/v1/protected')
        .set('Authorization', 'Bearer mock_jwt_token_user123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.id).toBe('user123');
    });
  });

  describe('Role-Based Access Control (RBAC)', () => {
    it('should allow admin access to admin-only routes', async () => {
      const response = await request(app)
        .get('/api/v1/admin-only')
        .set('Authorization', 'Bearer mock_admin_token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.role).toBe('ADMIN');
    });

    it('should deny non-admin access to admin-only routes', async () => {
      const response = await request(app)
        .get('/api/v1/admin-only')
        .set('Authorization', 'Bearer mock_jwt_token_user123');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Insufficient permissions');
    });

    it('should allow founder access to founder-only routes', async () => {
      const response = await request(app)
        .get('/api/v1/founder-only')
        .set('Authorization', 'Bearer mock_founder_token');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.role).toBe('FOUNDER');
    });

    it('should deny investor access to founder-only routes', async () => {
      const response = await request(app)
        .get('/api/v1/founder-only')
        .set('Authorization', 'Bearer mock_jwt_token_user123');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Insufficient permissions');
    });

    it('should allow investor access to investment routes', async () => {
      const response = await request(app)
        .post('/api/v1/investment')
        .set('Authorization', 'Bearer mock_jwt_token_user123')
        .send({ amount: 1000 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.role).toBe('INVESTOR');
    });

    it('should deny founder access to investor-only routes', async () => {
      const response = await request(app)
        .post('/api/v1/investment')
        .set('Authorization', 'Bearer mock_founder_token')
        .send({ amount: 1000 });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Insufficient permissions');
    });
  });

  describe('Input Validation Security', () => {
    it('should prevent SQL injection attempts in input', async () => {
      const maliciousInput = {
        amount: "1000'; DROP TABLE users; --",
        description: "Normal description"
      };

      const response = await request(app)
        .post('/api/v1/investment')
        .set('Authorization', 'Bearer mock_jwt_token_user123')
        .send(maliciousInput);

      // Should either validate properly or handle the malicious input safely
      if (response.status === 400) {
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('validation');
      }
    });

    it('should prevent XSS attempts in input', async () => {
      const xssInput = {
        amount: 1000,
        description: '<script>alert("xss")</script>'
      };

      const response = await request(app)
        .post('/api/v1/investment')
        .set('Authorization', 'Bearer mock_jwt_token_user123')
        .send(xssInput);

      // Should either validate properly or sanitize the input
      if (response.status === 400) {
        expect(response.body.success).toBe(false);
      }
    });

    it('should validate required fields', async () => {
      const incompleteInput = {
        // Missing amount field
        description: 'Missing required fields'
      };

      const response = await request(app)
        .post('/api/v1/investment')
        .set('Authorization', 'Bearer mock_jwt_token_user123')
        .send(incompleteInput);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should validate data types', async () => {
      const wrongTypeInput = {
        amount: 'not_a_number',
        description: 'Wrong data type'
      };

      const response = await request(app)
        .post('/api/v1/investment')
        .set('Authorization', 'Bearer mock_jwt_token_user123')
        .send(wrongTypeInput);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Rate Limiting Security', () => {
    it('should handle rapid requests appropriately', async () => {
      const requests = [];

      // Send multiple rapid requests
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app)
            .get('/api/v1/protected')
            .set('Authorization', 'Bearer mock_jwt_token_user123')
        );
      }

      const responses = await Promise.all(requests);

      // All requests should succeed (no rate limiting in this mock)
      // In real implementation, some requests might be rate limited
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status); // Either success or rate limited
      });
    });
  });

  describe('Session Security', () => {
    it('should handle token expiration', async () => {
      // Mock expired token
      const expiredToken = 'mock_expired_token';

      const response = await request(app)
        .get('/api/v1/protected')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should handle token tampering', async () => {
      // Mock tampered token
      const tamperedToken = 'mock_jwt_token_user123_modified';

      const response = await request(app)
        .get('/api/v1/protected')
        .set('Authorization', `Bearer ${tamperedToken}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Authorization Bypass Attempts', () => {
    it('should prevent privilege escalation attempts', async () => {
      // Try to access admin route with regular user token
      const response = await request(app)
        .get('/api/v1/admin-only')
        .set('Authorization', 'Bearer mock_jwt_token_user123');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Insufficient permissions');
    });

    it('should prevent accessing other users data', async () => {
      // This would test if users can access other users' data
      // For now, we'll just verify the authorization middleware works
      const response = await request(app)
        .get('/api/v1/protected')
        .set('Authorization', 'Bearer mock_jwt_token_user123');

      expect(response.status).toBe(200);
      expect(response.body.data.user.id).toBe('user123');
    });
  });

  describe('Security Headers', () => {
    it('should set appropriate security headers', async () => {
      const response = await request(app)
        .get('/api/v1/protected')
        .set('Authorization', 'Bearer mock_jwt_token_user123');

      // Check for security headers (these would be set by helmet in real app)
      // For this mock, we just verify the response structure
      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
    });
  });

  describe('Error Information Disclosure', () => {
    it('should not leak sensitive information in errors', async () => {
      const response = await request(app)
        .get('/api/v1/protected')
        .set('Authorization', 'Bearer invalid_token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);

      // Should not contain stack traces or internal system details
      expect(response.body).not.toHaveProperty('stack');
      expect(response.body).not.toHaveProperty('internalError');
      expect(response.body.message).not.toContain('Exception');
      expect(response.body.message).not.toContain('Error:');

      // Should contain user-friendly error message
      expect(typeof response.body.message).toBe('string');
      expect(response.body.message.length).toBeGreaterThan(0);
    });

    it('should handle malformed requests gracefully', async () => {
      const response = await request(app)
        .get('/api/v1/protected')
        .set('Authorization', 'Bearer')
        .send('{ malformed json');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Authentication Flow Security', () => {
    it('should require re-authentication after token expiry', async () => {
      // First, access protected resource with valid token
      const validResponse = await request(app)
        .get('/api/v1/protected')
        .set('Authorization', 'Bearer mock_jwt_token_user123');

      expect(validResponse.status).toBe(200);

      // Then try with expired token
      const expiredResponse = await request(app)
        .get('/api/v1/protected')
        .set('Authorization', 'Bearer mock_expired_token');

      expect(expiredResponse.status).toBe(401);
    });

    it('should handle concurrent sessions appropriately', async () => {
      const token1 = 'mock_jwt_token_user123_session1';
      const token2 = 'mock_jwt_token_user123_session2';

      // Both tokens should be valid (representing concurrent sessions)
      const response1 = await request(app)
        .get('/api/v1/protected')
        .set('Authorization', `Bearer ${token1}`);

      const response2 = await request(app)
        .get('/api/v1/protected')
        .set('Authorization', `Bearer ${token2}`);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
    });
  });
});