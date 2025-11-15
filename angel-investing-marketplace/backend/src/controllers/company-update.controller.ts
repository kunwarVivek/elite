import { Request, Response, NextFunction } from 'express';
import { companyUpdateService } from '../services/company-update.service.js';
import { AppError } from '../middleware/errorHandler.js';
import { sendSuccess } from '../utils/response.js';
import { logger } from '../config/logger.js';

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name?: string;
    role: string;
  };
}

/**
 * Company Update Controller
 */
export class CompanyUpdateController {
  async createUpdate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new AppError('Not authenticated', 401, 'NOT_AUTHENTICATED');

      const update = await companyUpdateService.createUpdate({
        ...req.body,
        authorId: userId,
      });

      sendSuccess(res, update, 'Update created successfully', 201);
      logger.info('Update created', { updateId: update.id });
    } catch (error) {
      next(error);
    }
  }

  async getUpdates(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { limit = '20', offset = '0', ...filters } = req.query;

      const result = await companyUpdateService.getUpdates(
        filters as any,
        parseInt(limit as string),
        parseInt(offset as string)
      );

      sendSuccess(res, result, 'Updates retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getUpdate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const update = await companyUpdateService.getUpdateById(id, userId);
      sendSuccess(res, update, 'Update retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateUpdate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new AppError('Not authenticated', 401, 'NOT_AUTHENTICATED');

      const { id } = req.params;
      const update = await companyUpdateService.updateUpdate(id, userId, req.body);

      sendSuccess(res, update, 'Update updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async publishUpdate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new AppError('Not authenticated', 401, 'NOT_AUTHENTICATED');

      const { id } = req.params;
      const update = await companyUpdateService.publishUpdate(id, userId);

      sendSuccess(res, update, 'Update published successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteUpdate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new AppError('Not authenticated', 401, 'NOT_AUTHENTICATED');

      const { id } = req.params;
      await companyUpdateService.deleteUpdate(id, userId);

      sendSuccess(res, null, 'Update deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  async togglePin(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new AppError('Not authenticated', 401, 'NOT_AUTHENTICATED');

      const { id } = req.params;
      const update = await companyUpdateService.togglePin(id, userId);

      sendSuccess(res, update, 'Pin status toggled successfully');
    } catch (error) {
      next(error);
    }
  }

  async addReaction(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new AppError('Not authenticated', 401, 'NOT_AUTHENTICATED');

      const { id } = req.params;
      const { type } = req.body;

      const reaction = await companyUpdateService.addReaction(id, userId, type);
      sendSuccess(res, reaction, 'Reaction added successfully');
    } catch (error) {
      next(error);
    }
  }

  async removeReaction(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new AppError('Not authenticated', 401, 'NOT_AUTHENTICATED');

      const { id } = req.params;
      await companyUpdateService.removeReaction(id, userId);

      sendSuccess(res, null, 'Reaction removed successfully');
    } catch (error) {
      next(error);
    }
  }

  async addComment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new AppError('Not authenticated', 401, 'NOT_AUTHENTICATED');

      const { id } = req.params;
      const { content, parentCommentId } = req.body;

      const comment = await companyUpdateService.addComment(id, userId, content, parentCommentId);
      sendSuccess(res, comment, 'Comment added successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get update with social card
   * Convenience method that includes social card data in the response
   */
  async getUpdateWithSocialCard(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const update = await companyUpdateService.getUpdateById(id, userId);

      // Check if update has social card in metadata
      const metadata = (update as any).metadata || {};
      const socialCard = metadata.socialCard || null;

      sendSuccess(res, {
        ...update,
        socialCard,
      }, 'Update retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get updates with social engagement stats
   * Convenience method that includes social share counts
   */
  async getUpdatesWithSocialStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { limit = '20', offset = '0', ...filters } = req.query;

      const result = await companyUpdateService.getUpdates(
        filters as any,
        parseInt(limit as string),
        parseInt(offset as string)
      );

      // Enhance updates with social stats
      const updatesWithStats = result.updates.map((update: any) => {
        const metadata = update.metadata || {};
        const socialShares = metadata.socialShares || {};

        let totalShares = 0;
        for (const platform in socialShares) {
          totalShares += socialShares[platform]?.count || 0;
        }

        return {
          ...update,
          socialStats: {
            totalShares,
            hasSocialCard: !!metadata.socialCard,
            platforms: Object.keys(socialShares),
          },
        };
      });

      sendSuccess(res, {
        ...result,
        updates: updatesWithStats,
      }, 'Updates retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const companyUpdateController = new CompanyUpdateController();
