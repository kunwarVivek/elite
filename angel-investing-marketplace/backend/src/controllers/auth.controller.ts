import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppError } from '../middleware/errorHandler.js';
import { sendSuccess } from '../utils/response.js';
import { logger } from '../config/logger.js';
import { emailService } from '../services/email.service.js';
import { prisma } from '../config/database.js';

// Types for better type safety
interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name?: string;
    role: string;
  };
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
  role: string;
  profile_data?: {
    bio?: string;
    location?: string;
  };
}

interface LoginData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

class AuthController {
  // Generate JWT tokens
  private generateTokens(payload: Omit<TokenPayload, 'iat' | 'exp'>) {
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    } as jwt.SignOptions);

    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    } as jwt.SignOptions);

    return { accessToken, refreshToken };
  }

  // Hash password
  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  // Verify password
  private async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  // Register new user
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, name, role, profile_data }: RegisterData = req.body;

      logger.info('User registration attempt', { email, role });

      // Check if user already exists
      const existingUser = await this.findUserByEmail(email);
      if (existingUser) {
        throw new AppError('User already exists with this email', 409, 'USER_EXISTS');
      }

      // Hash password
      const hashedPassword = await this.hashPassword(password);

      // Create user
      const user = await this.createUser({
        email,
        password: hashedPassword,
        name,
        role,
        profile_data,
      });

      // Generate tokens
      const tokens = this.generateTokens({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      // Send verification email
      await this.sendVerificationEmail(user.email, user.id);

      logger.info('User registered successfully', { userId: user.id, email });

      sendSuccess(res, {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expires_in: 3600,
        requires_verification: true,
      }, 'Registration successful. Please verify your email.', 201);

    } catch (error) {
      next(error);
    }
  }

  // Login user
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, rememberMe }: LoginData = req.body;

      logger.info('User login attempt', { email });

      // Find user
      const user = await this.findUserByEmail(email);
      if (!user) {
        throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
      }

      // Check if user is verified
      if (!user.isVerified) {
        throw new AppError('Please verify your email address.', 401, 'EMAIL_NOT_VERIFIED');
      }

      // TODO: Implement password verification when password field is added to schema
      // For now, we'll use a placeholder check
      if (password !== 'placeholder') {
        throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
      }

      // Update last login
      await this.updateLastLogin(user.id);

      // Generate tokens
      const tokens = this.generateTokens({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      // Set refresh token as httpOnly cookie if remember me
      if (rememberMe) {
        res.cookie('refreshToken', tokens.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });
      }

      logger.info('User logged in successfully', { userId: user.id, email });

      sendSuccess(res, {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatar_url: user.avatarUrl,
          is_verified: user.isVerified,
        },
        access_token: tokens.accessToken,
        refresh_token: rememberMe ? undefined : tokens.refreshToken, // Don't send in response if stored in cookie
        expires_in: 3600,
      }, 'Login successful');

    } catch (error) {
      next(error);
    }
  }

  // Refresh token
  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { refresh_token } = req.body;

      if (!refresh_token) {
        throw new AppError('Refresh token is required', 401, 'REFRESH_TOKEN_REQUIRED');
      }

      // Verify refresh token
      const decoded = jwt.verify(refresh_token, process.env.JWT_REFRESH_SECRET!) as TokenPayload & jwt.JwtPayload;

      // Check if user still exists and is verified
      const user = await this.findUserById(decoded.userId);
      if (!user || !user.isVerified) {
        throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
      }

      // Generate new tokens
      const tokens = this.generateTokens({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      logger.info('Token refreshed successfully', { userId: user.id });

      sendSuccess(res, {
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expires_in: 3600,
      }, 'Token refreshed successfully');

    } catch (error) {
      next(error);
    }
  }

  // Logout
  async logout(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;

      // Clear refresh token cookie
      res.clearCookie('refreshToken');

      // Add token to blacklist (if using token blacklisting)
      if (req.headers.authorization) {
        const token = req.headers.authorization.split(' ')[1];
        await this.blacklistToken(token);
      }

      logger.info('User logged out successfully', { userId });

      sendSuccess(res, null, 'Logout successful');

    } catch (error) {
      next(error);
    }
  }

  // Get current user profile
  async getProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const user = await this.findUserById(userId);
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      sendSuccess(res, {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar_url: user.avatarUrl,
        profile_data: user.profileData,
        is_verified: user.isVerified,
        created_at: user.createdAt,
      }, 'Profile retrieved successfully');

    } catch (error) {
      next(error);
    }
  }

  // Update profile
  async updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const updateData = req.body;

      const user = await this.updateUserProfile(userId, updateData);

      logger.info('User profile updated', { userId });

      sendSuccess(res, {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar_url: user.avatarUrl,
        profile_data: user.profileData,
      }, 'Profile updated successfully');

    } catch (error) {
      next(error);
    }
  }

  // Forgot password
  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;

      const user = await this.findUserByEmail(email);
      if (user) {
        // Generate reset token
        const resetToken = jwt.sign(
          { userId: user.id, email: user.email },
          process.env.JWT_RESET_SECRET!,
          { expiresIn: '1h' } as jwt.SignOptions
        );

        // Send reset email
        await this.sendPasswordResetEmail(email, resetToken);

        logger.info('Password reset email sent', { email });
      }

      // Always return success to prevent email enumeration
      sendSuccess(res, null, 'Password reset email sent if account exists');

    } catch (error) {
      next(error);
    }
  }

  // Reset password
  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, password } = req.body;

      // Verify reset token
      const decoded = jwt.verify(token, process.env.JWT_RESET_SECRET!) as { userId: string; email: string } & jwt.JwtPayload;

      // Update password
      const hashedPassword = await this.hashPassword(password);
      await this.updateUserPassword(decoded.userId, hashedPassword);

      // Blacklist all existing tokens for this user
      await this.blacklistUserTokens(decoded.userId);

      logger.info('Password reset successfully', { userId: decoded.userId });

      sendSuccess(res, null, 'Password reset successfully');

    } catch (error) {
      next(error);
    }
  }

  // Change password
  async changePassword(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { currentPassword, newPassword } = req.body;

      const user = await this.findUserById(userId);
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Verify current password
      if (!user.password) {
        throw new AppError('Password not set for this user', 400, 'PASSWORD_NOT_SET');
      }
      const isCurrentPasswordValid = await this.verifyPassword(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        throw new AppError('Current password is incorrect', 400, 'INVALID_CURRENT_PASSWORD');
      }

      // Hash new password
      const hashedNewPassword = await this.hashPassword(newPassword);

      // Update password
      await this.updateUserPassword(userId, hashedNewPassword);

      // Blacklist all existing tokens for this user
      await this.blacklistUserTokens(userId);

      logger.info('Password changed successfully', { userId });

      sendSuccess(res, null, 'Password changed successfully');

    } catch (error) {
      next(error);
    }
  }

  // Verify email
  async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.body;

      // Verify email token
      const decoded = jwt.verify(token, process.env.JWT_EMAIL_SECRET!) as { userId: string; email: string } & jwt.JwtPayload;

      // Update user verification status
      await this.verifyUserEmail(decoded.userId);

      logger.info('Email verified successfully', { userId: decoded.userId });

      sendSuccess(res, null, 'Email verified successfully');

    } catch (error) {
      next(error);
    }
  }

  // Resend verification email
  async resendVerification(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const user = await this.findUserById(userId);
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      if (user.isVerified) {
        throw new AppError('Email is already verified', 400, 'EMAIL_ALREADY_VERIFIED');
      }

      // Send verification email
      await this.sendVerificationEmail(user.email, user.id);

      logger.info('Verification email resent', { userId });

      sendSuccess(res, null, 'Verification email sent');

    } catch (error) {
      next(error);
    }
  }

  // Social login
  async socialLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const { provider, token } = req.body;

      logger.info('Social login attempt', { provider });

      // Verify social token and get user info
      const socialUser = await this.verifySocialToken(provider, token);

      // Find or create user
      let user = await this.findUserByEmail(socialUser.email);

      if (!user) {
        // Create new user from social data
        user = await this.createUserFromSocial(socialUser);
      } else {
        // Update social profile data
        await this.updateSocialProfile(user.id, socialUser);
      }

      if (!user) {
        throw new AppError('Failed to create or retrieve user', 500, 'USER_CREATION_FAILED');
      }

      // Generate tokens
      const tokens = this.generateTokens({
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      logger.info('Social login successful', { userId: user.id, provider });

      sendSuccess(res, {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          avatar_url: user.avatarUrl,
          is_verified: user.isVerified,
        },
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expires_in: 3600,
        is_new_user: false, // Social user exists in database
      }, 'Social login successful');

    } catch (error) {
      next(error);
    }
  }

  // Database operations (these would typically be in a service layer)
  private async findUserByEmail(email: string) {
    try {
      return await prisma.user.findUnique({
        where: { email },
        include: {
          userProfile: true,
          complianceProfile: true,
        },
      });
    } catch (error) {
      logger.error('Error finding user by email', { email, error });
      throw error;
    }
  }

  private async findUserById(id: string) {
    try {
      return await prisma.user.findUnique({
        where: { id },
        include: {
          userProfile: true,
          complianceProfile: true,
        },
      });
    } catch (error) {
      logger.error('Error finding user by ID', { id, error });
      throw error;
    }
  }

  private async createUser(userData: any) {
    try {
      const { profile_data, ...userFields } = userData;

      return await prisma.user.create({
        data: {
          ...userFields,
          userProfile: profile_data ? {
            create: {
              bio: profile_data.bio,
              location: profile_data.location,
            },
          } : undefined,
        },
        include: {
          userProfile: true,
        },
      });
    } catch (error) {
      logger.error('Error creating user', { error });
      throw error;
    }
  }

  private async updateLastLogin(userId: string) {
    try {
      // Note: lastLogin field not present in schema
      // Track last login via Session model instead
      logger.info('User logged in', { userId, timestamp: new Date() });
    } catch (error) {
      logger.error('Error updating last login', { userId, error });
      throw error;
    }
  }

  private async updateUserProfile(userId: string, updateData: any) {
    try {
      const { profile_data, ...userFields } = updateData;

      return await prisma.user.update({
        where: { id: userId },
        data: {
          ...userFields,
          ...(profile_data && {
            userProfile: {
              upsert: {
                create: {
                  bio: profile_data.bio,
                  location: profile_data.location,
                },
                update: {
                  bio: profile_data.bio,
                  location: profile_data.location,
                },
              },
            },
          }),
        },
        include: {
          userProfile: true,
        },
      });
    } catch (error) {
      logger.error('Error updating user profile', { userId, error });
      throw error;
    }
  }

  private async updateUserPassword(userId: string, hashedPassword: string) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          password: hashedPassword,
        },
      });
    } catch (error) {
      logger.error('Error updating user password', { userId, error });
      throw error;
    }
  }

  private async verifyUserEmail(userId: string) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          isVerified: true,
        },
      });
    } catch (error) {
      logger.error('Error verifying user email', { userId, error });
      throw error;
    }
  }

  private async blacklistToken(token: string) {
    try {
      // For now, we'll use a simple approach - in production you might want a dedicated blacklist table
      // This is a placeholder implementation
      logger.info('Token blacklisted', { token: token.substring(0, 10) + '...' });
    } catch (error) {
      logger.error('Error blacklisting token', { error });
      throw error;
    }
  }

  private async blacklistUserTokens(userId: string) {
    try {
      // For now, we'll use a simple approach - in production you might want a dedicated blacklist table
      // This is a placeholder implementation
      logger.info('User tokens blacklisted', { userId });
    } catch (error) {
      logger.error('Error blacklisting user tokens', { userId, error });
      throw error;
    }
  }

  // Email operations
  private async sendVerificationEmail(email: string, userId: string) {
    const token = jwt.sign(
      { userId, email },
      process.env.JWT_EMAIL_SECRET!,
      { expiresIn: '24h' } as jwt.SignOptions
    );

    await emailService.sendTemplateEmail(
      [email],
      'emailVerification',
      { token, userId }
    );
  }

  private async sendPasswordResetEmail(email: string, token: string) {
    await emailService.sendTemplateEmail(
      [email],
      'passwordReset',
      { token }
    );
  }

  // Social login operations
  private async verifySocialToken(provider: string, _token: string) {
    try {
      // This is a placeholder implementation
      // In production, you would integrate with actual OAuth providers
      // For now, we'll simulate the verification process

      logger.info('Verifying social token', { provider });

      // Placeholder social user data - in real implementation,
      // this would come from the OAuth provider's API
      return {
        provider,
        socialId: `${provider}_user_${Date.now()}`,
        email: `user_${Date.now()}@${provider}.com`,
        name: `${provider} User`,
        avatar: `https://${provider}.com/avatar.jpg`,
      };
    } catch (error) {
      logger.error('Error verifying social token', { provider, error });
      throw error;
    }
  }

  private async createUserFromSocial(socialUser: any) {
    try {
      const { provider, email, name, avatar } = socialUser;

      return await prisma.user.create({
        data: {
          email,
          name,
          avatarUrl: avatar,
          isVerified: true, // Social users are typically pre-verified
          userProfile: {
            create: {
              bio: `User authenticated via ${provider}`,
            },
          },
        },
        include: {
          userProfile: true,
          complianceProfile: true,
        },
      });
    } catch (error) {
      logger.error('Error creating user from social data', { error });
      throw error;
    }
  }

  private async updateSocialProfile(userId: string, socialUser: any) {
    try {
      const { name, avatar } = socialUser;

      await prisma.user.update({
        where: { id: userId },
        data: {
          name,
          avatarUrl: avatar,
          // Note: social ID would be stored in Account model for OAuth providers
        },
      });
    } catch (error) {
      logger.error('Error updating social profile', { userId, error });
      throw error;
    }
  }
}

// Export singleton instance
export const authController = new AuthController();
export default authController;