import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler.js';
import { sendSuccess, sendCreated } from '../utils/response.js';
import { logger } from '../config/logger.js';
import { forumService } from '../services/forum.service.js';

/**
 * Forum Controller
 * Handles all HTTP requests for forum operations
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

class ForumController {
  // ==========================================================================
  // Forum Management
  // ==========================================================================

  /**
   * Get all forums
   * GET /api/forums
   */
  async getForums(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { category, isActive, sortBy, sortOrder } = req.query;

      const forums = await forumService.getForums({
        category: category as string,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
        sortBy: sortBy as string,
        sortOrder: sortOrder as string,
      });

      sendSuccess(res, { forums }, 'Forums retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get forum by slug
   * GET /api/forums/:slug
   */
  async getForumBySlug(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { slug } = req.params;

      const forum = await forumService.getForumBySlug(slug);

      sendSuccess(res, { forum }, 'Forum retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create forum (admin only)
   * POST /api/forums
   */
  async createForum(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { name, slug, description, category, icon, displayOrder } = req.body;

      const forum = await forumService.createForum({
        name,
        slug,
        description,
        category,
        icon,
        displayOrder,
      });

      logger.info('Forum created', { forumId: forum.id, userId });

      sendCreated(res, { forum }, 'Forum created successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update forum (admin only)
   * PUT /api/forums/:id
   */
  async updateForum(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params;
      const { name, description, category, icon, isActive, displayOrder } = req.body;

      const forum = await forumService.updateForum(id, {
        name,
        description,
        category,
        icon,
        isActive,
        displayOrder,
      });

      logger.info('Forum updated', { forumId: id, userId });

      sendSuccess(res, { forum }, 'Forum updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete forum (admin only)
   * DELETE /api/forums/:id
   */
  async deleteForum(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params;

      await forumService.deleteForum(id);

      logger.info('Forum deleted', { forumId: id, userId });

      sendSuccess(res, { deleted: true }, 'Forum deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  // ==========================================================================
  // Topic Management
  // ==========================================================================

  /**
   * Get topics in a forum
   * GET /api/forums/:forumSlug/topics
   */
  async getTopics(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { forumSlug } = req.params;
      const {
        isPinned,
        isLocked,
        isFeatured,
        tag,
        search,
        page,
        limit,
        sortBy,
        sortOrder,
      } = req.query;

      const result = await forumService.getTopics(forumSlug, {
        isPinned: isPinned === 'true' ? true : isPinned === 'false' ? false : undefined,
        isLocked: isLocked === 'true' ? true : isLocked === 'false' ? false : undefined,
        isFeatured: isFeatured === 'true' ? true : isFeatured === 'false' ? false : undefined,
        tag: tag as string,
        search: search as string,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
        sortBy: sortBy as string,
        sortOrder: sortOrder as string,
      });

      sendSuccess(res, {
        topics: result.topics,
        pagination: result.pagination,
      }, 'Topics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get topic with posts
   * GET /api/forums/:forumSlug/topics/:topicSlug
   */
  async getTopicBySlug(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { forumSlug, topicSlug } = req.params;
      const { page, limit, sortBy, sortOrder } = req.query;

      const result = await forumService.getTopicBySlug(forumSlug, topicSlug, {
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 50,
        sortBy: sortBy as string,
        sortOrder: sortOrder as string,
      });

      sendSuccess(res, {
        topic: result.topic,
        posts: result.posts,
        pagination: result.pagination,
      }, 'Topic retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create topic
   * POST /api/forums/:forumSlug/topics
   */
  async createTopic(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { forumSlug } = req.params;
      const { title, content, tags } = req.body;

      // Get forum ID from slug
      const forum = await forumService.getForumBySlug(forumSlug);

      const topic = await forumService.createTopic({
        forumId: forum.id,
        userId,
        title,
        content,
        tags,
      });

      logger.info('Topic created', { topicId: topic.id, forumSlug, userId });

      sendCreated(res, { topic }, 'Topic created successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update topic (author only)
   * PUT /api/topics/:id
   */
  async updateTopic(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params;
      const { title, content, tags } = req.body;

      const topic = await forumService.updateTopic(id, userId, {
        title,
        content,
        tags,
      });

      logger.info('Topic updated', { topicId: id, userId });

      sendSuccess(res, { topic }, 'Topic updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete topic (author or admin)
   * DELETE /api/topics/:id
   */
  async deleteTopic(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params;
      const isAdmin = userRole === 'ADMIN';

      await forumService.deleteTopic(id, userId, isAdmin);

      logger.info('Topic deleted', { topicId: id, userId, isAdmin });

      sendSuccess(res, { deleted: true }, 'Topic deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Pin/unpin topic (admin only)
   * POST /api/topics/:id/pin
   */
  async pinTopic(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params;
      const { isPinned } = req.body;

      const topic = await forumService.pinTopic(id, isPinned);

      logger.info('Topic pin status updated', { topicId: id, isPinned, userId });

      sendSuccess(res, { topic }, `Topic ${isPinned ? 'pinned' : 'unpinned'} successfully`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Lock/unlock topic (admin only)
   * POST /api/topics/:id/lock
   */
  async lockTopic(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params;
      const { isLocked } = req.body;

      const topic = await forumService.lockTopic(id, isLocked);

      logger.info('Topic lock status updated', { topicId: id, isLocked, userId });

      sendSuccess(res, { topic }, `Topic ${isLocked ? 'locked' : 'unlocked'} successfully`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Feature/unfeature topic (admin only)
   * POST /api/topics/:id/feature
   */
  async featureTopic(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params;
      const { isFeatured } = req.body;

      const topic = await forumService.featureTopic(id, isFeatured);

      logger.info('Topic feature status updated', { topicId: id, isFeatured, userId });

      sendSuccess(res, { topic }, `Topic ${isFeatured ? 'featured' : 'unfeatured'} successfully`);
    } catch (error) {
      next(error);
    }
  }

  // ==========================================================================
  // Post Management
  // ==========================================================================

  /**
   * Get posts in a topic
   * GET /api/topics/:topicId/posts
   */
  async getPosts(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { topicId } = req.params;
      const { page, limit, sortBy, sortOrder } = req.query;

      const result = await forumService.getPosts(topicId, {
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 50,
        sortBy: sortBy as string,
        sortOrder: sortOrder as string,
      });

      sendSuccess(res, {
        posts: result.posts,
        pagination: result.pagination,
      }, 'Posts retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create post/reply
   * POST /api/topics/:topicId/posts
   */
  async createPost(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { topicId } = req.params;
      const { content, parentPostId } = req.body;

      const post = await forumService.createPost({
        topicId,
        userId,
        content,
        parentPostId,
      });

      logger.info('Post created', { postId: post.id, topicId, userId });

      sendCreated(res, { post }, 'Post created successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update post (author only)
   * PUT /api/posts/:id
   */
  async updatePost(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params;
      const { content } = req.body;

      const post = await forumService.updatePost(id, userId, { content });

      logger.info('Post updated', { postId: id, userId });

      sendSuccess(res, { post }, 'Post updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete post (author or admin)
   * DELETE /api/posts/:id
   */
  async deletePost(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params;
      const isAdmin = userRole === 'ADMIN';

      await forumService.deletePost(id, userId, isAdmin);

      logger.info('Post deleted', { postId: id, userId, isAdmin });

      sendSuccess(res, { deleted: true }, 'Post deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Like/unlike post
   * POST /api/posts/:id/like
   */
  async likePost(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params;

      const result = await forumService.togglePostLike(id, userId);

      logger.info('Post like toggled', { postId: id, userId, liked: result.liked });

      sendSuccess(res, result, `Post ${result.liked ? 'liked' : 'unliked'} successfully`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Report inappropriate post
   * POST /api/posts/:id/report
   */
  async reportPost(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params;
      const { reason, details } = req.body;

      await forumService.reportPost({
        userId,
        postId: id,
        reason,
        details,
      });

      logger.info('Post reported', { postId: id, userId });

      sendSuccess(res, { reported: true }, 'Post reported successfully');
    } catch (error) {
      next(error);
    }
  }

  // ==========================================================================
  // Moderation
  // ==========================================================================

  /**
   * Get moderation queue (admin only)
   * GET /api/forums/moderation/queue
   */
  async getModerationQueue(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const queue = await forumService.getModerationQueue();

      sendSuccess(res, { queue }, 'Moderation queue retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Moderate post (admin only)
   * POST /api/posts/:id/moderate
   */
  async moderatePost(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params;
      const { action, reason, notes } = req.body;

      await forumService.moderatePost(id, {
        action,
        reason,
        notes,
        moderatorId: userId,
      });

      logger.info('Post moderated', { postId: id, action, userId });

      sendSuccess(res, { moderated: true }, 'Post moderated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all reports (admin only)
   * GET /api/forums/moderation/reports
   */
  async getReports(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const reports = await forumService.getReports();

      sendSuccess(res, { reports }, 'Reports retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  // ==========================================================================
  // Search & Discovery
  // ==========================================================================

  /**
   * Search topics and posts
   * GET /api/forums/search
   */
  async search(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { query, searchIn, forumId, page, limit } = req.query;

      if (!query) {
        throw new AppError('Search query is required', 400, 'INVALID_REQUEST');
      }

      const results = await forumService.search({
        query: query as string,
        searchIn: searchIn as string,
        forumId: forumId as string,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
      });

      sendSuccess(res, results, 'Search completed successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get trending topics
   * GET /api/forums/trending
   */
  async getTrendingTopics(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { limit } = req.query;

      const topics = await forumService.getTrendingTopics(
        limit ? parseInt(limit as string) : 10
      );

      sendSuccess(res, { topics }, 'Trending topics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get recent activity
   * GET /api/forums/recent
   */
  async getRecentActivity(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { limit } = req.query;

      const topics = await forumService.getRecentActivity(
        limit ? parseInt(limit as string) : 20
      );

      sendSuccess(res, { topics }, 'Recent activity retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

// Export singleton instance
export const forumController = new ForumController();
export default forumController;
