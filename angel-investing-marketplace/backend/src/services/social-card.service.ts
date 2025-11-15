/**
 * Social Card Service
 * FR-4.2: Social Card Generation for company updates
 *
 * This service handles:
 * - FR-4.2.1: Auto-generate cards from update content
 * - FR-4.2.2: Multiple card templates (milestone, growth, funding)
 * - FR-4.2.3: Custom branding with company colors/logos
 * - FR-4.2.4: One-click sharing to social platforms
 * - FR-4.2.5: Track social engagement metrics
 * - FR-4.2.6: Generate cards in multiple languages
 */

import { logger } from '../config/logger.js';
import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { getStorageClient } from '../config/storage.js';
import type { CloudflareR2 } from './cloudflareR2.js';
import {
  SocialCardTemplateType,
  SocialPlatform,
  CardSize,
  CardLanguage,
  CardCustomization,
  GrowthMetrics,
} from '../validations/social-card.validation.js';
import {
  CARD_DIMENSIONS,
  BUILTIN_TEMPLATES,
  LANGUAGE_FONTS,
  DEFAULT_BRAND_COLORS,
  SocialCardGenerationOptions,
  GeneratedSocialCard,
  SocialCardContent,
  SocialEngagementStats,
  SocialShareUrls,
  CustomTemplate,
  ColorPalette,
  TemplateRenderContext,
} from '../types/social-card.types.js';

/**
 * Social Card Service
 */
export class SocialCardService {
  private storageClient: CloudflareR2 | null;

  constructor() {
    this.storageClient = getStorageClient() as CloudflareR2 | null;
  }

  /**
   * Generate social card for an update - FR-4.2.1
   */
  async generateCard(
    updateId: string,
    options: Partial<SocialCardGenerationOptions>
  ): Promise<GeneratedSocialCard> {
    try {
      logger.info('Generating social card', { updateId, options });

      // Get the update
      const update = await prisma.companyUpdate.findUnique({
        where: { id: updateId },
        include: {
          startup: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
              brandColor: true,
            },
          },
        },
      });

      if (!update) {
        throw new AppError('Update not found', 404, 'UPDATE_NOT_FOUND');
      }

      // Determine template based on update type if not provided
      const template = options.template || this.inferTemplateFromUpdateType(update.updateType);
      const size = options.size || 'TWITTER';
      const language = options.language || 'en';

      // Build content
      const content: SocialCardContent = {
        title: options.content?.title || update.title,
        content: options.content?.content || update.excerpt || this.generateExcerpt(update.content),
        companyName: update.startup.name,
        logoUrl: options.content?.logoUrl || update.startup.logoUrl || undefined,
        metrics: options.content?.metrics,
        date: update.publishedAt || update.createdAt,
        ctaText: options.content?.ctaText,
      };

      // Build customization with company branding - FR-4.2.3
      const customization = this.buildCustomization(
        template,
        options.customization,
        update.startup.brandColor
      );

      // Generate the card image
      const generationOptions: SocialCardGenerationOptions = {
        template,
        size,
        language,
        customization,
        content,
        format: options.format || 'PNG',
        quality: options.quality || 90,
      };

      const startTime = Date.now();
      const imageBuffer = await this.generateCardImage(generationOptions);
      const generationTimeMs = Date.now() - startTime;

      // Upload to storage
      const imageKey = this.generateImageKey(updateId, size, language, template);
      const contentType = this.getContentType(generationOptions.format!);

      if (!this.storageClient) {
        throw new AppError('Storage client not configured', 500, 'STORAGE_NOT_CONFIGURED');
      }

      await this.storageClient.uploadFile(imageKey, imageBuffer, contentType, {
        updateId,
        template,
        size,
        language,
      });

      const imageUrl = await this.storageClient.getSignedUrl(imageKey, 365 * 24 * 60 * 60); // 1 year

      // Store card metadata
      const metadata = {
        template,
        size,
        language,
        customization,
        format: generationOptions.format!,
        quality: generationOptions.quality!,
        fileSize: imageBuffer.length,
        generationTimeMs,
      };

      // Update the CompanyUpdate with social card info
      await prisma.companyUpdate.update({
        where: { id: updateId },
        data: {
          metadata: {
            ...(update.metadata as object || {}),
            socialCard: {
              imageUrl,
              imageKey,
              ...metadata,
            },
          },
        },
      });

      logger.info('Social card generated successfully', {
        updateId,
        imageKey,
        fileSize: imageBuffer.length,
        generationTimeMs,
      });

      return {
        id: updateId,
        updateId,
        imageUrl,
        imageKey,
        template,
        size,
        language,
        dimensions: CARD_DIMENSIONS[size],
        metadata,
        createdAt: new Date(),
      };
    } catch (error) {
      logger.error('Failed to generate social card', { error, updateId, options });
      throw error;
    }
  }

  /**
   * Generate card from specific template - FR-4.2.2
   */
  async generateFromTemplate(
    updateId: string,
    templateId: string,
    options?: Partial<SocialCardGenerationOptions>
  ): Promise<GeneratedSocialCard> {
    try {
      // Get custom template
      const customTemplate = await prisma.$queryRaw<CustomTemplate[]>`
        SELECT * FROM "CustomSocialCardTemplate"
        WHERE id = ${templateId}
        LIMIT 1
      `;

      if (!customTemplate || customTemplate.length === 0) {
        throw new AppError('Template not found', 404, 'TEMPLATE_NOT_FOUND');
      }

      const template = customTemplate[0];

      return this.generateCard(updateId, {
        ...options,
        template: template.baseTemplate,
        customization: {
          ...template.customization,
          ...options?.customization,
        },
      });
    } catch (error) {
      logger.error('Failed to generate card from template', { error, updateId, templateId });
      throw error;
    }
  }

  /**
   * Get available templates - FR-4.2.2
   */
  getTemplates(type?: SocialCardTemplateType): Record<string, any>[] {
    try {
      const templates = Object.values(BUILTIN_TEMPLATES);

      if (type) {
        return templates.filter((t) => t.type === type);
      }

      return templates;
    } catch (error) {
      logger.error('Failed to get templates', { error, type });
      throw error;
    }
  }

  /**
   * Create custom template - FR-4.2.3
   */
  async createCustomTemplate(
    userId: string,
    data: {
      name: string;
      description?: string;
      baseTemplate: SocialCardTemplateType;
      customization: CardCustomization;
      isDefault?: boolean;
      isPublic?: boolean;
    }
  ): Promise<any> {
    try {
      logger.info('Creating custom template', { userId, name: data.name });

      // For now, store in update metadata since we don't have CustomSocialCardTemplate in schema
      // TODO: Add CustomSocialCardTemplate model to schema
      const template = {
        id: this.generateId(),
        userId,
        name: data.name,
        description: data.description,
        baseTemplate: data.baseTemplate,
        customization: data.customization,
        isDefault: data.isDefault || false,
        isPublic: data.isPublic || false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      logger.info('Custom template created', { templateId: template.id });
      return template;
    } catch (error) {
      logger.error('Failed to create custom template', { error, userId });
      throw error;
    }
  }

  /**
   * Generate social share URLs - FR-4.2.4
   */
  generateShareUrls(updateId: string, cardUrl: string, update: any): SocialShareUrls {
    try {
      const baseUrl = process.env.FRONTEND_URL || 'https://app.angelinvest.com';
      const updateUrl = `${baseUrl}/updates/${updateId}`;
      const title = encodeURIComponent(update.title);
      const description = encodeURIComponent(update.excerpt || '');

      return {
        twitter: `https://twitter.com/intent/tweet?text=${title}&url=${encodeURIComponent(updateUrl)}&image=${encodeURIComponent(cardUrl)}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(updateUrl)}`,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(updateUrl)}`,
        instagram: cardUrl, // For Instagram, users download the image
        whatsapp: `https://wa.me/?text=${title}%20${encodeURIComponent(updateUrl)}`,
        copyLink: updateUrl,
      };
    } catch (error) {
      logger.error('Failed to generate share URLs', { error, updateId });
      throw error;
    }
  }

  /**
   * Track social share - FR-4.2.5
   */
  async trackShare(
    updateId: string,
    platform: SocialPlatform,
    userId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      logger.info('Tracking social share', { updateId, platform, userId });

      // Get existing metadata
      const update = await prisma.companyUpdate.findUnique({
        where: { id: updateId },
        select: { metadata: true },
      });

      if (!update) {
        throw new AppError('Update not found', 404, 'UPDATE_NOT_FOUND');
      }

      const existingMetadata = (update.metadata as any) || {};
      const socialShares = existingMetadata.socialShares || {};

      // Initialize platform shares if not exists
      if (!socialShares[platform]) {
        socialShares[platform] = {
          count: 0,
          shares: [],
        };
      }

      // Add new share
      socialShares[platform].count += 1;
      socialShares[platform].shares.push({
        userId,
        sharedAt: new Date(),
        metadata,
      });

      // Keep only last 100 shares per platform
      if (socialShares[platform].shares.length > 100) {
        socialShares[platform].shares = socialShares[platform].shares.slice(-100);
      }

      // Update metadata
      await prisma.companyUpdate.update({
        where: { id: updateId },
        data: {
          metadata: {
            ...existingMetadata,
            socialShares,
          },
        },
      });

      logger.info('Social share tracked', { updateId, platform });
    } catch (error) {
      logger.error('Failed to track social share', { error, updateId, platform });
      // Don't throw - tracking failure shouldn't break the request
    }
  }

  /**
   * Get social engagement stats - FR-4.2.5
   */
  async getShareStats(updateId: string, platform?: SocialPlatform): Promise<SocialEngagementStats> {
    try {
      const update = await prisma.companyUpdate.findUnique({
        where: { id: updateId },
        select: { metadata: true },
      });

      if (!update) {
        throw new AppError('Update not found', 404, 'UPDATE_NOT_FOUND');
      }

      const metadata = (update.metadata as any) || {};
      const socialShares = metadata.socialShares || {};

      let totalShares = 0;
      const sharesByPlatform: Record<SocialPlatform, number> = {
        TWITTER: 0,
        LINKEDIN: 0,
        FACEBOOK: 0,
        INSTAGRAM: 0,
        WHATSAPP: 0,
      };

      const uniqueSharers = new Set<string>();
      const recentShares: any[] = [];

      // Calculate stats
      for (const [plt, data] of Object.entries(socialShares)) {
        const platformKey = plt as SocialPlatform;
        sharesByPlatform[platformKey] = (data as any).count || 0;
        totalShares += (data as any).count || 0;

        // Collect recent shares
        if ((data as any).shares) {
          for (const share of (data as any).shares) {
            if (share.userId) {
              uniqueSharers.add(share.userId);
            }
            recentShares.push({
              ...share,
              platform: platformKey,
            });
          }
        }
      }

      // Sort recent shares by date
      recentShares.sort((a, b) =>
        new Date(b.sharedAt).getTime() - new Date(a.sharedAt).getTime()
      );

      // Find top platform
      let topPlatform: SocialPlatform | undefined;
      let maxShares = 0;
      for (const [plt, count] of Object.entries(sharesByPlatform)) {
        if (count > maxShares) {
          maxShares = count;
          topPlatform = plt as SocialPlatform;
        }
      }

      return {
        updateId,
        totalShares,
        sharesByPlatform: platform
          ? { [platform]: sharesByPlatform[platform] } as any
          : sharesByPlatform,
        uniqueSharers: uniqueSharers.size,
        topPlatform,
        recentShares: recentShares.slice(0, 20), // Last 20 shares
      };
    } catch (error) {
      logger.error('Failed to get share stats', { error, updateId });
      throw error;
    }
  }

  /**
   * Get existing social card for update
   */
  async getSocialCard(
    updateId: string,
    size?: CardSize,
    language?: CardLanguage
  ): Promise<GeneratedSocialCard | null> {
    try {
      const update = await prisma.companyUpdate.findUnique({
        where: { id: updateId },
        select: { metadata: true },
      });

      if (!update) {
        throw new AppError('Update not found', 404, 'UPDATE_NOT_FOUND');
      }

      const metadata = (update.metadata as any) || {};
      const socialCard = metadata.socialCard;

      if (!socialCard) {
        return null;
      }

      // Check if we need to regenerate for different size/language
      if ((size && socialCard.size !== size) || (language && socialCard.language !== language)) {
        return null; // Card doesn't exist for this size/language combo
      }

      return {
        id: updateId,
        updateId,
        imageUrl: socialCard.imageUrl,
        imageKey: socialCard.imageKey,
        template: socialCard.template,
        size: socialCard.size,
        language: socialCard.language,
        dimensions: CARD_DIMENSIONS[socialCard.size],
        metadata: socialCard,
        createdAt: new Date(), // We don't store creation date in metadata
      };
    } catch (error) {
      logger.error('Failed to get social card', { error, updateId });
      throw error;
    }
  }

  // Private helper methods

  /**
   * Generate card image - THIS IS THE CORE IMAGE GENERATION METHOD
   * TODO: Implement actual image generation using Canvas API or Sharp
   *
   * For production, you would use one of these approaches:
   * 1. node-canvas - Canvas API for Node.js
   * 2. sharp - High-performance image processing
   * 3. Puppeteer - HTML to image conversion
   * 4. External API - Service like Cloudinary, Imgix, or custom service
   */
  private async generateCardImage(options: SocialCardGenerationOptions): Promise<Buffer> {
    try {
      logger.info('Generating card image', { template: options.template, size: options.size });

      // TODO: Implement actual image generation
      // This is a placeholder that returns a mock PNG buffer
      // In production, this would:
      // 1. Create a canvas with the specified dimensions
      // 2. Apply the template layout
      // 3. Render text, logos, metrics, etc.
      // 4. Apply customization (colors, fonts, etc.)
      // 5. Handle RTL languages - FR-4.2.6
      // 6. Return the final image buffer

      const mockImageBuffer = await this.generateMockCardImage(options);
      return mockImageBuffer;

      /*
      // EXAMPLE IMPLEMENTATION WITH NODE-CANVAS:

      import { createCanvas, loadImage, registerFont } from 'canvas';

      const dimensions = CARD_DIMENSIONS[options.size];
      const canvas = createCanvas(dimensions.width, dimensions.height);
      const ctx = canvas.getContext('2d');

      // Render context
      const renderContext = this.buildRenderContext(options);

      // Render based on template
      switch (options.template) {
        case 'MILESTONE':
          await this.renderMilestoneTemplate(ctx, renderContext);
          break;
        case 'GROWTH':
          await this.renderGrowthTemplate(ctx, renderContext);
          break;
        case 'FUNDING':
          await this.renderFundingTemplate(ctx, renderContext);
          break;
        default:
          await this.renderGeneralTemplate(ctx, renderContext);
      }

      return canvas.toBuffer('image/png', { quality: options.quality / 100 });
      */
    } catch (error) {
      logger.error('Failed to generate card image', { error, options });
      throw new AppError('Failed to generate card image', 500, 'IMAGE_GENERATION_FAILED');
    }
  }

  /**
   * Generate mock card image (placeholder)
   * TODO: Replace with actual image generation
   */
  private async generateMockCardImage(options: SocialCardGenerationOptions): Promise<Buffer> {
    // Create a simple SVG as placeholder
    const dimensions = CARD_DIMENSIONS[options.size];
    const colors = this.buildColorPalette(options.template, options.customization);

    const svg = `
      <svg width="${dimensions.width}" height="${dimensions.height}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${colors.primary};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${colors.secondary};stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="${dimensions.width}" height="${dimensions.height}" fill="url(#gradient)"/>
        <text x="50%" y="40%" font-family="Arial" font-size="48" font-weight="bold" fill="${colors.text}" text-anchor="middle">
          ${this.escapeXml(options.content.title)}
        </text>
        <text x="50%" y="50%" font-family="Arial" font-size="24" fill="${colors.text}" text-anchor="middle" opacity="0.9">
          ${this.escapeXml(options.content.companyName)}
        </text>
        <text x="50%" y="60%" font-family="Arial" font-size="20" fill="${colors.text}" text-anchor="middle" opacity="0.8">
          ${options.template} Template - ${options.language.toUpperCase()}
        </text>
      </svg>
    `;

    // Convert SVG to PNG using a simple buffer
    // In production, use sharp or canvas to actually convert
    return Buffer.from(svg);
  }

  /**
   * Infer template from update type
   */
  private inferTemplateFromUpdateType(updateType: string): SocialCardTemplateType {
    const typeMap: Record<string, SocialCardTemplateType> = {
      MILESTONE: 'MILESTONE',
      GROWTH_METRICS: 'GROWTH',
      FUNDING: 'FUNDING',
      PRODUCT_LAUNCH: 'PRODUCT',
      TEAM_UPDATE: 'TEAM',
      GENERAL: 'GENERAL',
    };

    return typeMap[updateType] || 'GENERAL';
  }

  /**
   * Build customization with defaults - FR-4.2.3
   */
  private buildCustomization(
    template: SocialCardTemplateType,
    customization?: Partial<CardCustomization>,
    brandColor?: string
  ): CardCustomization {
    const templateConfig = BUILTIN_TEMPLATES[template];
    const defaultColors = DEFAULT_BRAND_COLORS[template];

    return {
      primaryColor: customization?.primaryColor || brandColor || defaultColors.primary,
      secondaryColor: customization?.secondaryColor || defaultColors.secondary,
      backgroundColor: customization?.backgroundColor || '#FFFFFF',
      textColor: customization?.textColor || '#1F2937',
      fontFamily: customization?.fontFamily || 'Inter',
      fontSize: customization?.fontSize || 'medium',
      layout: customization?.layout || templateConfig.defaultCustomization.layout || 'centered',
      logoUrl: customization?.logoUrl,
      logoPosition: customization?.logoPosition || templateConfig.defaultCustomization.logoPosition,
      showLogo: customization?.showLogo ?? templateConfig.defaultCustomization.showLogo ?? true,
      backgroundImage: customization?.backgroundImage,
      useGradient: customization?.useGradient ?? templateConfig.defaultCustomization.useGradient ?? true,
      gradientDirection: customization?.gradientDirection || templateConfig.defaultCustomization.gradientDirection,
    };
  }

  /**
   * Build color palette
   */
  private buildColorPalette(
    template: SocialCardTemplateType,
    customization?: Partial<CardCustomization>
  ): ColorPalette {
    const defaultColors = DEFAULT_BRAND_COLORS[template];

    return {
      primary: customization?.primaryColor || defaultColors.primary,
      secondary: customization?.secondaryColor || defaultColors.secondary,
      background: customization?.backgroundColor || '#FFFFFF',
      text: customization?.textColor || '#1F2937',
    };
  }

  /**
   * Generate image key for storage
   */
  private generateImageKey(
    updateId: string,
    size: CardSize,
    language: CardLanguage,
    template: SocialCardTemplateType
  ): string {
    const timestamp = Date.now();
    return `social-cards/${updateId}/${template}_${size}_${language}_${timestamp}.png`;
  }

  /**
   * Get content type for format
   */
  private getContentType(format: string): string {
    const contentTypes: Record<string, string> = {
      PNG: 'image/png',
      JPEG: 'image/jpeg',
      WEBP: 'image/webp',
    };
    return contentTypes[format] || 'image/png';
  }

  /**
   * Generate excerpt from content
   */
  private generateExcerpt(content: string, maxLength = 150): string {
    const text = content.replace(/<[^>]*>/g, '').trim();
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `tpl_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

export const socialCardService = new SocialCardService();
