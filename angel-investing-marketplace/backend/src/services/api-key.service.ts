import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * API Key Service
 * Handles API key generation, validation, and management
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface CreateApiKeyData {
  userId: string;
  name: string;
  permissions?: any;
  rateLimit?: number;
  expiresAt?: Date;
}

export interface UpdateApiKeyData {
  name?: string;
  permissions?: any;
  rateLimit?: number;
  isActive?: boolean;
}

export interface ApiKeyUsageData {
  apiKeyId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  timestamp: Date;
}

// ============================================================================
// API Key Service Class
// ============================================================================

class ApiKeyService {
  /**
   * Generate a secure API key
   */
  private generateApiKey(): string {
    // Generate 32 random bytes and convert to hex (64 characters)
    const key = crypto.randomBytes(32).toString('hex');
    return `ak_${key}`; // Prefix with 'ak_' for identification
  }

  /**
   * Hash API key for storage
   */
  private async hashApiKey(apiKey: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(apiKey, salt);
  }

  /**
   * Get key prefix for identification
   */
  private getKeyPrefix(apiKey: string): string {
    // Return first 12 characters for identification (ak_XXXXXXXX)
    return apiKey.substring(0, 12);
  }

  /**
   * Create API key
   */
  async createApiKey(data: CreateApiKeyData) {
    try {
      // Verify user exists
      const user = await prisma.user.findUnique({
        where: { id: data.userId },
      });

      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Generate API key
      const apiKey = this.generateApiKey();
      const keyHash = await this.hashApiKey(apiKey);
      const keyPrefix = this.getKeyPrefix(apiKey);

      // Create API key record
      const apiKeyRecord = await prisma.apiKey.create({
        data: {
          userId: data.userId,
          name: data.name,
          keyHash,
          keyPrefix,
          permissions: data.permissions || {},
          rateLimit: data.rateLimit || 1000,
          expiresAt: data.expiresAt,
          isActive: true,
        },
      });

      logger.info('API key created', { apiKeyId: apiKeyRecord.id, userId: data.userId, name: data.name });

      // Return the plain API key ONLY on creation (cannot be retrieved again)
      return {
        apiKey, // Plain key - show to user only once
        id: apiKeyRecord.id,
        name: apiKeyRecord.name,
        keyPrefix: apiKeyRecord.keyPrefix,
        permissions: apiKeyRecord.permissions,
        rateLimit: apiKeyRecord.rateLimit,
        expiresAt: apiKeyRecord.expiresAt,
        createdAt: apiKeyRecord.createdAt,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error creating API key', { data, error });
      throw new AppError('Failed to create API key', 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Get user's API keys (without plain keys)
   */
  async getApiKeys(userId: string) {
    try {
      const apiKeys = await prisma.apiKey.findMany({
        where: { userId },
        select: {
          id: true,
          name: true,
          keyPrefix: true,
          permissions: true,
          rateLimit: true,
          lastUsedAt: true,
          expiresAt: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return apiKeys;
    } catch (error) {
      logger.error('Error getting API keys', { userId, error });
      throw new AppError('Failed to get API keys', 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Update API key
   */
  async updateApiKey(apiKeyId: string, userId: string, data: UpdateApiKeyData) {
    try {
      // Verify ownership
      const existingKey = await prisma.apiKey.findUnique({
        where: { id: apiKeyId },
      });

      if (!existingKey) {
        throw new AppError('API key not found', 404, 'API_KEY_NOT_FOUND');
      }

      if (existingKey.userId !== userId) {
        throw new AppError('Not authorized to update this API key', 403, 'NOT_AUTHORIZED');
      }

      // Update API key
      const updatedKey = await prisma.apiKey.update({
        where: { id: apiKeyId },
        data: {
          name: data.name,
          permissions: data.permissions,
          rateLimit: data.rateLimit,
          isActive: data.isActive,
        },
        select: {
          id: true,
          name: true,
          keyPrefix: true,
          permissions: true,
          rateLimit: true,
          lastUsedAt: true,
          expiresAt: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      logger.info('API key updated', { apiKeyId, userId });

      return updatedKey;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error updating API key', { apiKeyId, userId, data, error });
      throw new AppError('Failed to update API key', 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Delete/revoke API key
   */
  async deleteApiKey(apiKeyId: string, userId: string) {
    try {
      // Verify ownership
      const existingKey = await prisma.apiKey.findUnique({
        where: { id: apiKeyId },
      });

      if (!existingKey) {
        throw new AppError('API key not found', 404, 'API_KEY_NOT_FOUND');
      }

      if (existingKey.userId !== userId) {
        throw new AppError('Not authorized to delete this API key', 403, 'NOT_AUTHORIZED');
      }

      // Delete API key
      await prisma.apiKey.delete({
        where: { id: apiKeyId },
      });

      logger.info('API key deleted', { apiKeyId, userId });

      return { deleted: true };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error deleting API key', { apiKeyId, userId, error });
      throw new AppError('Failed to delete API key', 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Regenerate API key
   */
  async regenerateApiKey(apiKeyId: string, userId: string) {
    try {
      // Verify ownership
      const existingKey = await prisma.apiKey.findUnique({
        where: { id: apiKeyId },
      });

      if (!existingKey) {
        throw new AppError('API key not found', 404, 'API_KEY_NOT_FOUND');
      }

      if (existingKey.userId !== userId) {
        throw new AppError('Not authorized to regenerate this API key', 403, 'NOT_AUTHORIZED');
      }

      // Generate new API key
      const newApiKey = this.generateApiKey();
      const keyHash = await this.hashApiKey(newApiKey);
      const keyPrefix = this.getKeyPrefix(newApiKey);

      // Update API key
      const updatedKey = await prisma.apiKey.update({
        where: { id: apiKeyId },
        data: {
          keyHash,
          keyPrefix,
          lastUsedAt: null, // Reset usage
        },
      });

      logger.info('API key regenerated', { apiKeyId, userId });

      // Return the new plain API key (only time it can be retrieved)
      return {
        apiKey: newApiKey, // Plain key - show to user only once
        id: updatedKey.id,
        name: updatedKey.name,
        keyPrefix: updatedKey.keyPrefix,
        permissions: updatedKey.permissions,
        rateLimit: updatedKey.rateLimit,
        expiresAt: updatedKey.expiresAt,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error regenerating API key', { apiKeyId, userId, error });
      throw new AppError('Failed to regenerate API key', 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Validate API key (used by middleware)
   */
  async validateApiKey(apiKey: string): Promise<any> {
    try {
      if (!apiKey || !apiKey.startsWith('ak_')) {
        throw new AppError('Invalid API key format', 401, 'INVALID_API_KEY');
      }

      const keyPrefix = this.getKeyPrefix(apiKey);

      // Find API key by prefix first (faster lookup)
      const apiKeys = await prisma.apiKey.findMany({
        where: {
          keyPrefix,
          isActive: true,
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              isActive: true,
            },
          },
        },
      });

      if (apiKeys.length === 0) {
        throw new AppError('API key not found or inactive', 401, 'INVALID_API_KEY');
      }

      // Verify hash for each matching prefix
      let validKey = null;
      for (const key of apiKeys) {
        const isValid = await bcrypt.compare(apiKey, key.keyHash);
        if (isValid) {
          validKey = key;
          break;
        }
      }

      if (!validKey) {
        throw new AppError('Invalid API key', 401, 'INVALID_API_KEY');
      }

      // Check if user is active
      if (!validKey.user.isActive) {
        throw new AppError('User account is inactive', 401, 'USER_INACTIVE');
      }

      // Check expiration
      if (validKey.expiresAt && validKey.expiresAt < new Date()) {
        throw new AppError('API key has expired', 401, 'API_KEY_EXPIRED');
      }

      // Update last used timestamp
      await this.trackUsage(validKey.id);

      return {
        apiKeyId: validKey.id,
        userId: validKey.user.id,
        permissions: validKey.permissions,
        rateLimit: validKey.rateLimit,
        user: validKey.user,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error validating API key', { error });
      throw new AppError('Invalid API key', 401, 'INVALID_API_KEY');
    }
  }

  /**
   * Track API key usage
   */
  async trackUsage(apiKeyId: string) {
    try {
      await prisma.apiKey.update({
        where: { id: apiKeyId },
        data: {
          lastUsedAt: new Date(),
        },
      });
    } catch (error) {
      // Don't throw - usage tracking is non-critical
      logger.error('Error tracking API key usage', { apiKeyId, error });
    }
  }

  /**
   * Get API key usage statistics
   */
  async getUsageStats(apiKeyId: string, userId: string) {
    try {
      // Verify ownership
      const apiKey = await prisma.apiKey.findUnique({
        where: { id: apiKeyId },
      });

      if (!apiKey) {
        throw new AppError('API key not found', 404, 'API_KEY_NOT_FOUND');
      }

      if (apiKey.userId !== userId) {
        throw new AppError('Not authorized to view this API key', 403, 'NOT_AUTHORIZED');
      }

      // Calculate stats
      const now = new Date();
      const daysSinceCreation = Math.ceil(
        (now.getTime() - apiKey.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      const isExpired = apiKey.expiresAt ? apiKey.expiresAt < now : false;
      const daysUntilExpiry = apiKey.expiresAt
        ? Math.ceil((apiKey.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      return {
        id: apiKey.id,
        name: apiKey.name,
        keyPrefix: apiKey.keyPrefix,
        isActive: apiKey.isActive,
        lastUsedAt: apiKey.lastUsedAt,
        createdAt: apiKey.createdAt,
        expiresAt: apiKey.expiresAt,
        isExpired,
        daysSinceCreation,
        daysUntilExpiry,
        rateLimit: apiKey.rateLimit,
        permissions: apiKey.permissions,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error getting usage stats', { apiKeyId, userId, error });
      throw new AppError('Failed to get usage stats', 500, 'DATABASE_ERROR');
    }
  }
}

// Export singleton instance
export const apiKeyService = new ApiKeyService();
export default apiKeyService;
