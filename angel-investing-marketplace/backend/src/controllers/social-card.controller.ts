import { Request, Response, NextFunction } from 'express';
import { socialCardService } from '../services/social-card.service.js';
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
 * Social Card Controller
 * FR-4.2: Social Card Generation for company updates
 */
export class SocialCardController {
  /**
   * Generate social card for an update
   * POST /api/updates/:updateId/social-card
   * FR-4.2.1: Auto-generate cards from update content
   */
  async generateSocialCard(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { updateId } = req.params;
      const {
        template,
        size,
        language,
        customization,
        metrics,
        titleOverride,
        contentOverride,
        includeCompanyName,
        includeDate,
        includeCTA,
        ctaText,
        format,
        quality,
      } = req.body;

      logger.info('Generating social card', { updateId, template, size });

      const card = await socialCardService.generateCard(updateId, {
        template,
        size,
        language,
        customization,
        content: {
          title: titleOverride,
          content: contentOverride,
          companyName: '', // Will be filled from update
          metrics,
          ctaText,
        },
        format,
        quality,
      });

      // Get share URLs
      const update = await socialCardService['prisma'].companyUpdate.findUnique({
        where: { id: updateId },
      });

      const shareUrls = socialCardService.generateShareUrls(updateId, card.imageUrl, update);

      sendSuccess(
        res,
        {
          card,
          shareUrls,
        },
        'Social card generated successfully',
        201
      );

      logger.info('Social card generated', { updateId, cardId: card.id });
    } catch (error) {
      logger.error('Failed to generate social card', { error });
      next(error);
    }
  }

  /**
   * Get existing social card for an update
   * GET /api/updates/:updateId/social-card
   */
  async getSocialCard(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { updateId } = req.params;
      const { size, language } = req.query;

      const card = await socialCardService.getSocialCard(
        updateId,
        size as any,
        language as any
      );

      if (!card) {
        throw new AppError('Social card not found', 404, 'SOCIAL_CARD_NOT_FOUND');
      }

      sendSuccess(res, card, 'Social card retrieved successfully');
    } catch (error) {
      logger.error('Failed to get social card', { error });
      next(error);
    }
  }

  /**
   * Regenerate social card for an update
   * PUT /api/updates/:updateId/social-card
   */
  async regenerateSocialCard(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { updateId } = req.params;
      const { template, size, language, customization } = req.body;

      logger.info('Regenerating social card', { updateId });

      const card = await socialCardService.generateCard(updateId, {
        template,
        size,
        language,
        customization,
      });

      sendSuccess(res, card, 'Social card regenerated successfully');
    } catch (error) {
      logger.error('Failed to regenerate social card', { error });
      next(error);
    }
  }

  /**
   * Preview social card (without saving)
   * POST /api/social-cards/preview
   */
  async previewSocialCard(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const {
        template,
        size,
        language,
        customization,
        title,
        content,
        companyName,
        logoUrl,
        metrics,
      } = req.body;

      logger.info('Generating social card preview', { template, size });

      // Create a temporary update ID for preview
      const tempUpdateId = `preview_${Date.now()}`;

      const card = await socialCardService.generateCard(tempUpdateId, {
        template,
        size,
        language,
        customization,
        content: {
          title,
          content,
          companyName,
          logoUrl,
          metrics,
        },
      });

      sendSuccess(res, card, 'Social card preview generated successfully');
    } catch (error) {
      logger.error('Failed to generate preview', { error });
      next(error);
    }
  }

  /**
   * Get available templates
   * GET /api/social-cards/templates
   * FR-4.2.2: Multiple card templates
   */
  async getTemplates(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { type } = req.query;

      const templates = socialCardService.getTemplates(type as any);

      sendSuccess(res, { templates }, 'Templates retrieved successfully');
    } catch (error) {
      logger.error('Failed to get templates', { error });
      next(error);
    }
  }

  /**
   * Create custom template
   * POST /api/social-cards/templates
   * FR-4.2.3: Custom branding with company colors/logos
   */
  async createCustomTemplate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) throw new AppError('Not authenticated', 401, 'NOT_AUTHENTICATED');

      const { name, description, baseTemplate, customization, isDefault, isPublic } = req.body;

      logger.info('Creating custom template', { userId, name });

      const template = await socialCardService.createCustomTemplate(userId, {
        name,
        description,
        baseTemplate,
        customization,
        isDefault,
        isPublic,
      });

      sendSuccess(res, template, 'Custom template created successfully', 201);
    } catch (error) {
      logger.error('Failed to create custom template', { error });
      next(error);
    }
  }

  /**
   * Track social share
   * POST /api/updates/:updateId/social-share
   * FR-4.2.5: Track social engagement metrics
   */
  async trackShare(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { updateId } = req.params;
      const { platform, shareUrl, metadata } = req.body;
      const userId = req.user?.id;

      logger.info('Tracking social share', { updateId, platform, userId });

      await socialCardService.trackShare(updateId, platform, userId, metadata);

      sendSuccess(res, null, 'Social share tracked successfully', 201);
    } catch (error) {
      logger.error('Failed to track social share', { error });
      next(error);
    }
  }

  /**
   * Get share statistics
   * GET /api/updates/:updateId/social-stats
   * FR-4.2.5: Track social engagement metrics
   */
  async getShareStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { updateId } = req.params;
      const { platform } = req.query;

      const stats = await socialCardService.getShareStats(updateId, platform as any);

      sendSuccess(res, stats, 'Share statistics retrieved successfully');
    } catch (error) {
      logger.error('Failed to get share stats', { error });
      next(error);
    }
  }

  /**
   * Generate share URLs for an update
   * GET /api/updates/:updateId/share-urls
   * FR-4.2.4: One-click sharing to social platforms
   */
  async getShareUrls(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { updateId } = req.params;

      // Get update and social card
      const card = await socialCardService.getSocialCard(updateId);

      if (!card) {
        throw new AppError('Social card not found. Generate one first.', 404, 'SOCIAL_CARD_NOT_FOUND');
      }

      // Get update details
      const update = await socialCardService['prisma'].companyUpdate.findUnique({
        where: { id: updateId },
        include: {
          startup: true,
        },
      });

      if (!update) {
        throw new AppError('Update not found', 404, 'UPDATE_NOT_FOUND');
      }

      const shareUrls = socialCardService.generateShareUrls(updateId, card.imageUrl, update);

      sendSuccess(res, shareUrls, 'Share URLs generated successfully');
    } catch (error) {
      logger.error('Failed to generate share URLs', { error });
      next(error);
    }
  }

  /**
   * Generate card from template
   * POST /api/updates/:updateId/social-card/from-template
   */
  async generateFromTemplate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { updateId } = req.params;
      const { templateId, size, language } = req.body;

      logger.info('Generating card from template', { updateId, templateId });

      const card = await socialCardService.generateFromTemplate(updateId, templateId, {
        size,
        language,
      });

      sendSuccess(res, card, 'Social card generated from template successfully', 201);
    } catch (error) {
      logger.error('Failed to generate from template', { error });
      next(error);
    }
  }

  /**
   * Batch generate social cards for multiple updates
   * POST /api/social-cards/batch
   */
  async batchGenerateCards(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { updateIds, template, size, language, customization } = req.body;

      logger.info('Batch generating social cards', { count: updateIds.length });

      const results = await Promise.allSettled(
        updateIds.map((updateId: string) =>
          socialCardService.generateCard(updateId, {
            template,
            size,
            language,
            customization,
          })
        )
      );

      const successful = results.filter((r) => r.status === 'fulfilled');
      const failed = results.filter((r) => r.status === 'rejected');

      sendSuccess(
        res,
        {
          successful: successful.length,
          failed: failed.length,
          cards: successful.map((r) => (r as any).value),
          errors: failed.map((r) => (r as any).reason?.message),
        },
        `Batch generation completed: ${successful.length} successful, ${failed.length} failed`
      );
    } catch (error) {
      logger.error('Failed to batch generate cards', { error });
      next(error);
    }
  }
}

export const socialCardController = new SocialCardController();
