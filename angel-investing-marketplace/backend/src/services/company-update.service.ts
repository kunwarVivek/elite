import { logger } from '../config/logger.js';
import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Company Update Service
 * Handles company update creation, publishing, engagement tracking
 */

export interface CreateUpdateInput {
  startupId: string;
  authorId: string;
  title: string;
  content: string;
  excerpt?: string;
  updateType: string;
  category?: string;
  tags?: string[];
  coverImageUrl?: string;
  attachments?: any[];
  status?: 'DRAFT' | 'PUBLISHED';
  scheduledFor?: Date;
  notifyInvestors?: boolean;
}

export interface UpdateFilters {
  startupId?: string;
  authorId?: string;
  status?: string;
  updateType?: string;
  category?: string;
  isPinned?: boolean;
  search?: string;
}

export class CompanyUpdateService {
  /**
   * Create a new company update
   */
  async createUpdate(input: CreateUpdateInput) {
    try {
      logger.info('Creating company update', { startupId: input.startupId });

      // Generate slug from title
      const slug = this.generateSlug(input.title);

      // Check for slug uniqueness
      const existingUpdate = await prisma.companyUpdate.findUnique({
        where: { slug },
      });

      if (existingUpdate) {
        throw new AppError('Update with this title already exists', 400, 'DUPLICATE_SLUG');
      }

      const update = await prisma.companyUpdate.create({
        data: {
          startupId: input.startupId,
          authorId: input.authorId,
          title: input.title,
          slug,
          content: input.content,
          excerpt: input.excerpt || this.generateExcerpt(input.content),
          updateType: input.updateType,
          category: input.category,
          tags: input.tags || [],
          coverImageUrl: input.coverImageUrl,
          attachments: input.attachments || [],
          status: input.status || 'DRAFT',
          scheduledFor: input.scheduledFor,
          publishedAt: input.status === 'PUBLISHED' ? new Date() : null,
          notifyInvestors: input.notifyInvestors ?? true,
        },
        include: {
          startup: true,
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      });

      // If published immediately, notify investors
      if (update.status === 'PUBLISHED' && update.notifyInvestors) {
        await this.notifyInvestors(update);
      }

      logger.info('Company update created', { updateId: update.id });
      return update;
    } catch (error) {
      logger.error('Failed to create update', { error, input });
      throw error;
    }
  }

  /**
   * Update existing company update
   */
  async updateUpdate(updateId: string, userId: string, data: Partial<CreateUpdateInput>) {
    try {
      // Verify ownership
      const existing = await prisma.companyUpdate.findUnique({
        where: { id: updateId },
      });

      if (!existing) {
        throw new AppError('Update not found', 404, 'UPDATE_NOT_FOUND');
      }

      if (existing.authorId !== userId) {
        throw new AppError('Unauthorized to edit this update', 403, 'FORBIDDEN');
      }

      const update = await prisma.companyUpdate.update({
        where: { id: updateId },
        data: {
          ...data,
          excerpt: data.excerpt || (data.content ? this.generateExcerpt(data.content) : undefined),
        },
        include: {
          startup: true,
          author: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
      });

      logger.info('Company update updated', { updateId });
      return update;
    } catch (error) {
      logger.error('Failed to update', { error, updateId });
      throw error;
    }
  }

  /**
   * Publish a draft update
   */
  async publishUpdate(updateId: string, userId: string) {
    try {
      const update = await prisma.companyUpdate.findUnique({
        where: { id: updateId },
      });

      if (!update) {
        throw new AppError('Update not found', 404, 'UPDATE_NOT_FOUND');
      }

      if (update.authorId !== userId) {
        throw new AppError('Unauthorized', 403, 'FORBIDDEN');
      }

      const published = await prisma.companyUpdate.update({
        where: { id: updateId },
        data: {
          status: 'PUBLISHED',
          publishedAt: new Date(),
        },
        include: {
          startup: true,
          author: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      // Notify investors
      if (published.notifyInvestors) {
        await this.notifyInvestors(published);
      }

      logger.info('Update published', { updateId });
      return published;
    } catch (error) {
      logger.error('Failed to publish', { error, updateId });
      throw error;
    }
  }

  /**
   * Get updates with filters
   */
  async getUpdates(filters: UpdateFilters, limit = 20, offset = 0) {
    try {
      const where: any = {};

      if (filters.startupId) where.startupId = filters.startupId;
      if (filters.authorId) where.authorId = filters.authorId;
      if (filters.status) where.status = filters.status;
      if (filters.updateType) where.updateType = filters.updateType;
      if (filters.category) where.category = filters.category;
      if (filters.isPinned !== undefined) where.isPinned = filters.isPinned;

      if (filters.search) {
        where.OR = [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { content: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      const [updates, total] = await Promise.all([
        prisma.companyUpdate.findMany({
          where,
          take: limit,
          skip: offset,
          orderBy: [
            { isPinned: 'desc' },
            { publishedAt: 'desc' },
          ],
          include: {
            startup: {
              select: {
                id: true,
                name: true,
                slug: true,
                logoUrl: true,
              },
            },
            author: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
            _count: {
              select: {
                comments: true,
                reactions: true,
              },
            },
          },
        }),
        prisma.companyUpdate.count({ where }),
      ]);

      return { updates, total, limit, offset, hasMore: offset + limit < total };
    } catch (error) {
      logger.error('Failed to get updates', { error, filters });
      throw error;
    }
  }

  /**
   * Get single update by ID
   */
  async getUpdateById(updateId: string, userId?: string) {
    try {
      const update = await prisma.companyUpdate.findUnique({
        where: { id: updateId },
        include: {
          startup: true,
          author: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
          reactions: {
            include: {
              user: {
                select: { id: true, name: true, avatarUrl: true },
              },
            },
          },
          comments: {
            where: { parentCommentId: null },
            orderBy: { createdAt: 'desc' },
            take: 10,
            include: {
              user: {
                select: { id: true, name: true, avatarUrl: true },
              },
              replies: {
                include: {
                  user: {
                    select: { id: true, name: true, avatarUrl: true },
                  },
                },
              },
            },
          },
          _count: {
            select: {
              comments: true,
              reactions: true,
              engagements: true,
            },
          },
        },
      });

      if (!update) {
        throw new AppError('Update not found', 404, 'UPDATE_NOT_FOUND');
      }

      // Track view if userId provided
      if (userId) {
        await this.trackEngagement(updateId, userId);
      }

      return update;
    } catch (error) {
      logger.error('Failed to get update', { error, updateId });
      throw error;
    }
  }

  /**
   * Track user engagement (view)
   */
  async trackEngagement(updateId: string, userId: string) {
    try {
      await prisma.updateEngagement.upsert({
        where: {
          updateId_userId: {
            updateId,
            userId,
          },
        },
        create: {
          updateId,
          userId,
        },
        update: {
          viewedAt: new Date(),
        },
      });

      // Increment view count
      await prisma.companyUpdate.update({
        where: { id: updateId },
        data: { viewCount: { increment: 1 } },
      });
    } catch (error) {
      logger.error('Failed to track engagement', { error, updateId, userId });
      // Don't throw - engagement tracking failure shouldn't break the request
    }
  }

  /**
   * Add reaction to update
   */
  async addReaction(updateId: string, userId: string, type: string) {
    try {
      const reaction = await prisma.updateReaction.upsert({
        where: {
          updateId_userId: {
            updateId,
            userId,
          },
        },
        create: {
          updateId,
          userId,
          type: type as any,
        },
        update: {
          type: type as any,
        },
      });

      // Update reaction count
      const count = await prisma.updateReaction.count({
        where: { updateId },
      });

      await prisma.companyUpdate.update({
        where: { id: updateId },
        data: { reactionCount: count },
      });

      return reaction;
    } catch (error) {
      logger.error('Failed to add reaction', { error, updateId, userId });
      throw error;
    }
  }

  /**
   * Remove reaction
   */
  async removeReaction(updateId: string, userId: string) {
    try {
      await prisma.updateReaction.delete({
        where: {
          updateId_userId: {
            updateId,
            userId,
          },
        },
      });

      // Update reaction count
      const count = await prisma.updateReaction.count({
        where: { updateId },
      });

      await prisma.companyUpdate.update({
        where: { id: updateId },
        data: { reactionCount: count },
      });
    } catch (error) {
      logger.error('Failed to remove reaction', { error, updateId, userId });
      throw error;
    }
  }

  /**
   * Add comment to update
   */
  async addComment(updateId: string, userId: string, content: string, parentCommentId?: string) {
    try {
      const comment = await prisma.updateComment.create({
        data: {
          updateId,
          userId,
          content,
          parentCommentId,
        },
        include: {
          user: {
            select: { id: true, name: true, avatarUrl: true },
          },
        },
      });

      // Update comment count
      const count = await prisma.updateComment.count({
        where: { updateId },
      });

      await prisma.companyUpdate.update({
        where: { id: updateId },
        data: { commentCount: count },
      });

      return comment;
    } catch (error) {
      logger.error('Failed to add comment', { error, updateId });
      throw error;
    }
  }

  /**
   * Delete update
   */
  async deleteUpdate(updateId: string, userId: string) {
    try {
      const update = await prisma.companyUpdate.findUnique({
        where: { id: updateId },
      });

      if (!update) {
        throw new AppError('Update not found', 404, 'UPDATE_NOT_FOUND');
      }

      if (update.authorId !== userId) {
        throw new AppError('Unauthorized', 403, 'FORBIDDEN');
      }

      await prisma.companyUpdate.delete({
        where: { id: updateId },
      });

      logger.info('Update deleted', { updateId });
    } catch (error) {
      logger.error('Failed to delete update', { error, updateId });
      throw error;
    }
  }

  /**
   * Pin/unpin update
   */
  async togglePin(updateId: string, userId: string) {
    try {
      const update = await prisma.companyUpdate.findUnique({
        where: { id: updateId },
      });

      if (!update) {
        throw new AppError('Update not found', 404, 'UPDATE_NOT_FOUND');
      }

      if (update.authorId !== userId) {
        throw new AppError('Unauthorized', 403, 'FORBIDDEN');
      }

      const updated = await prisma.companyUpdate.update({
        where: { id: updateId },
        data: { isPinned: !update.isPinned },
      });

      return updated;
    } catch (error) {
      logger.error('Failed to toggle pin', { error, updateId });
      throw error;
    }
  }

  // Helper methods

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 100) + '-' + Date.now();
  }

  private generateExcerpt(content: string, maxLength = 200): string {
    // Strip HTML tags and get first maxLength characters
    const text = content.replace(/<[^>]*>/g, '').trim();
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }

  /**
   * Notify investors about new update
   */
  private async notifyInvestors(update: any) {
    try {
      // Get all investors who have invested in this startup
      const investments = await prisma.investment.findMany({
        where: {
          pitch: {
            startupId: update.startupId,
          },
          status: 'COMPLETED',
        },
        select: {
          investorId: true,
        },
        distinct: ['investorId'],
      });

      const investorIds = investments.map((inv) => inv.investorId);

      // Create notifications
      const notifications = investorIds.map((investorId) => ({
        userId: investorId,
        type: 'INVESTMENT_UPDATE',
        title: `New update from ${update.startup.name}`,
        content: update.title,
        data: {
          updateId: update.id,
          startupId: update.startupId,
          updateType: update.updateType,
        },
        actionUrl: `/updates/${update.id}`,
        priority: 'MEDIUM',
      }));

      await prisma.notification.createMany({
        data: notifications as any,
      });

      logger.info('Investors notified', {
        updateId: update.id,
        investorCount: investorIds.length,
      });
    } catch (error) {
      logger.error('Failed to notify investors', { error, updateId: update.id });
      // Don't throw - notification failure shouldn't break update creation
    }
  }
}

export const companyUpdateService = new CompanyUpdateService();
