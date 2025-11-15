import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler.js';
import { sendSuccess, sendCreated } from '../utils/response.js';
import { logger } from '../config/logger.js';
import { apiKeyService } from '../services/api-key.service.js';

/**
 * API Key Controller
 * Handles all HTTP requests for API key management
 */

// Extend Request interface for authenticated user
interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name?: string;
    role: string;
  };
}

class ApiKeyController {
  /**
   * Get user's API keys
   * GET /api/api-keys
   */
  async getApiKeys(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const apiKeys = await apiKeyService.getApiKeys(userId);

      sendSuccess(res, { apiKeys }, 'API keys retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create API key
   * POST /api/api-keys
   */
  async createApiKey(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { name, permissions, rateLimit, expiresAt } = req.body;

      const result = await apiKeyService.createApiKey({
        userId,
        name,
        permissions,
        rateLimit,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      });

      logger.info('API key created', { apiKeyId: result.id, userId });

      // Important: The plain API key is only returned once
      sendCreated(
        res,
        result,
        'API key created successfully. Save this key securely - it cannot be retrieved again.'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update API key
   * PUT /api/api-keys/:id
   */
  async updateApiKey(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params;
      const { name, permissions, rateLimit, isActive } = req.body;

      const apiKey = await apiKeyService.updateApiKey(id, userId, {
        name,
        permissions,
        rateLimit,
        isActive,
      });

      logger.info('API key updated', { apiKeyId: id, userId });

      sendSuccess(res, { apiKey }, 'API key updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete API key
   * DELETE /api/api-keys/:id
   */
  async deleteApiKey(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params;

      const result = await apiKeyService.deleteApiKey(id, userId);

      logger.info('API key deleted', { apiKeyId: id, userId });

      sendSuccess(res, result, 'API key deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Regenerate API key
   * POST /api/api-keys/:id/regenerate
   */
  async regenerateApiKey(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params;

      const result = await apiKeyService.regenerateApiKey(id, userId);

      logger.info('API key regenerated', { apiKeyId: id, userId });

      // Important: The new plain API key is only returned once
      sendSuccess(
        res,
        result,
        'API key regenerated successfully. Save this key securely - it cannot be retrieved again.'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get API key usage statistics
   * GET /api/api-keys/:id/usage
   */
  async getUsageStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params;

      const stats = await apiKeyService.getUsageStats(id, userId);

      sendSuccess(res, { stats }, 'Usage statistics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

// Export singleton instance
export const apiKeyController = new ApiKeyController();
export default apiKeyController;
