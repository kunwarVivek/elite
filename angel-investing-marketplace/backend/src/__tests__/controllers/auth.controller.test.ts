import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { authController } from '../../controllers/auth.controller';
import { prismaMock } from '../mocks/prisma';
import { createMockUser } from '../fixtures/users';
import { emailService } from '../../services/email.service';

// Mock dependencies
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

describe('AuthController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      body: {},
      headers: {},
      user: undefined,
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();

    // Reset all mocks
    jest.clearAllMocks();

    // Set default environment variables
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
    process.env.JWT_RESET_SECRET = 'test-reset-secret';
    process.env.JWT_EMAIL_SECRET = 'test-email-secret';
    process.env.JWT_EXPIRES_IN = '1h';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const mockUserData = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
        role: 'investor',
      };

      const mockUser = createMockUser({
        email: mockUserData.email,
        name: mockUserData.name,
        role: mockUserData.role,
        is_verified: false,
      });

      mockRequest.body = mockUserData;

      // Mock bcrypt hash
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      // Mock Prisma operations
      prismaMock.user.findUnique.mockResolvedValue(null); // No existing user
      prismaMock.user.create.mockResolvedValue(mockUser as any);

      // Mock JWT sign
      (jwt.sign as jest.Mock).mockReturnValue('mock-token');

      // Mock email service
      (emailService.sendTemplateEmail as jest.Mock).mockResolvedValue(undefined);

      await authController.register(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { email: mockUserData.email },
        include: {
          userProfile: true,
          complianceProfile: true,
        },
      });

      expect(bcrypt.hash).toHaveBeenCalledWith(mockUserData.password, 12);

      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: {
          email: mockUserData.email,
          password: 'hashed-password',
          name: mockUserData.name,
          role: mockUserData.role,
        },
        include: {
          userProfile: true,
        },
      });

      expect(jwt.sign).toHaveBeenCalledTimes(3); // access, refresh, verification tokens
      expect(emailService.sendTemplateEmail).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            user: expect.objectContaining({
              email: mockUserData.email,
            }),
            access_token: 'mock-token',
            refresh_token: 'mock-token',
          }),
        })
      );
    });

    it('should fail if user already exists', async () => {
      const mockUserData = {
        email: 'existing@example.com',
        password: 'Password123!',
        name: 'Existing User',
        role: 'investor',
      };

      const existingUser = createMockUser({ email: mockUserData.email });

      mockRequest.body = mockUserData;

      prismaMock.user.findUnique.mockResolvedValue(existingUser as any);

      await authController.register(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User already exists with this email',
          statusCode: 409,
          code: 'USER_EXISTS',
        })
      );
    });

    it('should include profile data if provided', async () => {
      const mockUserData = {
        email: 'test@example.com',
        password: 'Password123!',
        name: 'Test User',
        role: 'investor',
        profile_data: {
          bio: 'Test bio',
          location: 'Test Location',
        },
      };

      const mockUser = createMockUser({ email: mockUserData.email });

      mockRequest.body = mockUserData;

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue(mockUser as any);
      (jwt.sign as jest.Mock).mockReturnValue('mock-token');
      (emailService.sendTemplateEmail as jest.Mock).mockResolvedValue(undefined);

      await authController.register(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: {
          email: mockUserData.email,
          password: 'hashed-password',
          name: mockUserData.name,
          role: mockUserData.role,
          userProfile: {
            create: {
              bio: 'Test bio',
              location: 'Test Location',
            },
          },
        },
        include: {
          userProfile: true,
        },
      });
    });
  });

  describe('login', () => {
    it('should successfully log in a verified user', async () => {
      const mockLoginData = {
        email: 'test@example.com',
        password: 'placeholder',
        rememberMe: false,
      };

      const mockUser = createMockUser({
        email: mockLoginData.email,
        is_verified: true,
      });

      mockRequest.body = mockLoginData;

      prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
      prismaMock.user.update.mockResolvedValue(mockUser as any);
      (jwt.sign as jest.Mock).mockReturnValue('mock-token');

      await authController.login(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { email: mockLoginData.email },
        include: {
          userProfile: true,
          complianceProfile: true,
        },
      });

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          lastLogin: expect.any(Date),
        },
      });

      expect(jwt.sign).toHaveBeenCalledTimes(2); // access and refresh tokens
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            user: expect.objectContaining({
              email: mockLoginData.email,
            }),
            access_token: 'mock-token',
          }),
        })
      );
    });

    it('should fail if user does not exist', async () => {
      const mockLoginData = {
        email: 'nonexistent@example.com',
        password: 'placeholder',
      };

      mockRequest.body = mockLoginData;

      prismaMock.user.findUnique.mockResolvedValue(null);

      await authController.login(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid credentials',
          statusCode: 401,
          code: 'INVALID_CREDENTIALS',
        })
      );
    });

    it('should fail if user email is not verified', async () => {
      const mockLoginData = {
        email: 'test@example.com',
        password: 'placeholder',
      };

      const mockUser = createMockUser({
        email: mockLoginData.email,
        is_verified: false,
      });

      mockRequest.body = mockLoginData;

      prismaMock.user.findUnique.mockResolvedValue(mockUser as any);

      await authController.login(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Please verify your email address.',
          statusCode: 401,
          code: 'EMAIL_NOT_VERIFIED',
        })
      );
    });

    it('should fail if password is invalid', async () => {
      const mockLoginData = {
        email: 'test@example.com',
        password: 'wrong-password',
      };

      const mockUser = createMockUser({
        email: mockLoginData.email,
        is_verified: true,
      });

      mockRequest.body = mockLoginData;

      prismaMock.user.findUnique.mockResolvedValue(mockUser as any);

      await authController.login(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid credentials',
          statusCode: 401,
          code: 'INVALID_CREDENTIALS',
        })
      );
    });

    it('should set refresh token cookie if rememberMe is true', async () => {
      const mockLoginData = {
        email: 'test@example.com',
        password: 'placeholder',
        rememberMe: true,
      };

      const mockUser = createMockUser({
        email: mockLoginData.email,
        is_verified: true,
      });

      mockRequest.body = mockLoginData;

      prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
      prismaMock.user.update.mockResolvedValue(mockUser as any);
      (jwt.sign as jest.Mock).mockReturnValue('mock-token');

      await authController.login(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'mock-token',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000,
        })
      );
    });
  });

  describe('logout', () => {
    it('should successfully log out user', async () => {
      const mockUser = createMockUser();

      mockRequest.user = {
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
      };
      mockRequest.headers = {
        authorization: 'Bearer mock-token',
      };

      await authController.logout(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.clearCookie).toHaveBeenCalledWith('refreshToken');
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Logout successful',
        })
      );
    });

    it('should clear refresh token cookie even without authorization header', async () => {
      mockRequest.user = {
        id: 'user-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'investor',
      };

      await authController.logout(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.clearCookie).toHaveBeenCalledWith('refreshToken');
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Logout successful',
        })
      );
    });
  });

  describe('refresh', () => {
    it('should successfully refresh tokens', async () => {
      const mockUser = createMockUser({ is_verified: true });

      mockRequest.body = {
        refresh_token: 'valid-refresh-token',
      };

      (jwt.verify as jest.Mock).mockReturnValue({
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
      (jwt.sign as jest.Mock).mockReturnValue('new-mock-token');

      prismaMock.user.findUnique.mockResolvedValue(mockUser as any);

      await authController.refresh(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(jwt.verify).toHaveBeenCalledWith(
        'valid-refresh-token',
        'test-refresh-secret'
      );

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            access_token: 'new-mock-token',
            refresh_token: 'new-mock-token',
          }),
        })
      );
    });

    it('should fail if refresh token is not provided', async () => {
      mockRequest.body = {};

      await authController.refresh(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Refresh token is required',
          statusCode: 401,
          code: 'REFRESH_TOKEN_REQUIRED',
        })
      );
    });

    it('should fail if user is not verified', async () => {
      const mockUser = createMockUser({ is_verified: false });

      mockRequest.body = {
        refresh_token: 'valid-refresh-token',
      };

      (jwt.verify as jest.Mock).mockReturnValue({
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });

      prismaMock.user.findUnique.mockResolvedValue(mockUser as any);

      await authController.refresh(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid refresh token',
          statusCode: 401,
          code: 'INVALID_REFRESH_TOKEN',
        })
      );
    });

    it('should fail if user does not exist', async () => {
      mockRequest.body = {
        refresh_token: 'valid-refresh-token',
      };

      (jwt.verify as jest.Mock).mockReturnValue({
        userId: 'non-existent-id',
        email: 'test@example.com',
        role: 'investor',
      });

      prismaMock.user.findUnique.mockResolvedValue(null);

      await authController.refresh(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Invalid refresh token',
          statusCode: 401,
          code: 'INVALID_REFRESH_TOKEN',
        })
      );
    });
  });

  describe('getProfile', () => {
    it('should successfully retrieve user profile', async () => {
      const mockUser = createMockUser();

      mockRequest.user = {
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        role: mockUser.role,
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser as any);

      await authController.getProfile(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        include: {
          userProfile: true,
          complianceProfile: true,
        },
      });

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            id: mockUser.id,
            email: mockUser.email,
            name: mockUser.name,
            role: mockUser.role,
          }),
        })
      );
    });

    it('should fail if user is not authenticated', async () => {
      mockRequest.user = undefined;

      await authController.getProfile(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User not authenticated',
          statusCode: 401,
          code: 'NOT_AUTHENTICATED',
        })
      );
    });

    it('should fail if user does not exist', async () => {
      mockRequest.user = {
        id: 'non-existent-id',
        email: 'test@example.com',
        name: 'Test User',
        role: 'investor',
      };

      prismaMock.user.findUnique.mockResolvedValue(null);

      await authController.getProfile(
        mockRequest as any,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User not found',
          statusCode: 404,
          code: 'USER_NOT_FOUND',
        })
      );
    });
  });

  describe('verifyEmail', () => {
    it('should successfully verify user email', async () => {
      const mockUser = createMockUser({ is_verified: false });

      mockRequest.body = {
        token: 'valid-verification-token',
      };

      (jwt.verify as jest.Mock).mockReturnValue({
        userId: mockUser.id,
        email: mockUser.email,
      });

      prismaMock.user.update.mockResolvedValue({
        ...mockUser,
        isVerified: true,
      } as any);

      await authController.verifyEmail(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(jwt.verify).toHaveBeenCalledWith(
        'valid-verification-token',
        'test-email-secret'
      );

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          isVerified: true,
        },
      });

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Email verified successfully',
        })
      );
    });

    it('should fail if verification token is invalid', async () => {
      mockRequest.body = {
        token: 'invalid-token',
      };

      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await authController.verifyEmail(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('forgotPassword', () => {
    it('should send password reset email if user exists', async () => {
      const mockUser = createMockUser();

      mockRequest.body = {
        email: mockUser.email,
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
      (jwt.sign as jest.Mock).mockReturnValue('reset-token');
      (emailService.sendTemplateEmail as jest.Mock).mockResolvedValue(undefined);

      await authController.forgotPassword(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(jwt.sign).toHaveBeenCalledWith(
        { userId: mockUser.id, email: mockUser.email },
        'test-reset-secret',
        { expiresIn: '1h' }
      );

      expect(emailService.sendTemplateEmail).toHaveBeenCalledWith(
        [mockUser.email],
        'passwordReset',
        { token: 'reset-token' }
      );

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Password reset email sent if account exists',
        })
      );
    });

    it('should return success even if user does not exist (prevent enumeration)', async () => {
      mockRequest.body = {
        email: 'nonexistent@example.com',
      };

      prismaMock.user.findUnique.mockResolvedValue(null);

      await authController.forgotPassword(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(emailService.sendTemplateEmail).not.toHaveBeenCalled();

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Password reset email sent if account exists',
        })
      );
    });
  });

  describe('resetPassword', () => {
    it('should successfully reset password with valid token', async () => {
      const mockUser = createMockUser();

      mockRequest.body = {
        token: 'valid-reset-token',
        password: 'NewPassword123!',
      };

      (jwt.verify as jest.Mock).mockReturnValue({
        userId: mockUser.id,
        email: mockUser.email,
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');
      prismaMock.user.update.mockResolvedValue(mockUser as any);

      await authController.resetPassword(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(jwt.verify).toHaveBeenCalledWith(
        'valid-reset-token',
        'test-reset-secret'
      );

      expect(bcrypt.hash).toHaveBeenCalledWith('NewPassword123!', 12);

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          password: 'new-hashed-password',
        },
      });

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Password reset successfully',
        })
      );
    });

    it('should fail if reset token is invalid', async () => {
      mockRequest.body = {
        token: 'invalid-token',
        password: 'NewPassword123!',
      };

      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await authController.resetPassword(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
    });
  });
});
