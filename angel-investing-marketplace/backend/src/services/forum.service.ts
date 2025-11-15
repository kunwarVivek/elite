import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Forum Service
 * Handles all forum-related business logic including forums, topics, posts,
 * moderation, and search functionality
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface CreateForumData {
  name: string;
  slug?: string;
  description?: string;
  category: string;
  icon?: string;
  displayOrder?: number;
}

export interface UpdateForumData {
  name?: string;
  description?: string;
  category?: string;
  icon?: string;
  isActive?: boolean;
  displayOrder?: number;
}

export interface ForumFilters {
  category?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: string;
}

export interface CreateTopicData {
  forumId: string;
  userId: string;
  title: string;
  content: string;
  tags?: string[];
}

export interface UpdateTopicData {
  title?: string;
  content?: string;
  tags?: string[];
}

export interface TopicFilters {
  isPinned?: boolean;
  isLocked?: boolean;
  isFeatured?: boolean;
  tag?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
}

export interface CreatePostData {
  topicId: string;
  userId: string;
  content: string;
  parentPostId?: string;
}

export interface UpdatePostData {
  content: string;
}

export interface PostFilters {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
}

export interface ReportData {
  userId: string;
  postId: string;
  reason: string;
  details?: string;
}

export interface ModeratePostData {
  action: string;
  reason: string;
  notes?: string;
  moderatorId: string;
}

export interface SearchFilters {
  query: string;
  searchIn?: string;
  forumId?: string;
  page?: number;
  limit?: number;
}

// ============================================================================
// Forum Service Class
// ============================================================================

class ForumService {
  /**
   * Generate URL-friendly slug from title
   */
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .substring(0, 100); // Limit length
  }

  /**
   * Ensure slug is unique by appending numbers if needed
   */
  private async ensureUniqueSlug(slug: string, existingId?: string): Promise<string> {
    let uniqueSlug = slug;
    let counter = 1;

    while (true) {
      const existing = await prisma.forum.findUnique({
        where: { slug: uniqueSlug },
        select: { id: true },
      });

      if (!existing || (existingId && existing.id === existingId)) {
        break;
      }

      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }

    return uniqueSlug;
  }

  /**
   * Ensure topic slug is unique
   */
  private async ensureUniqueTopicSlug(slug: string, existingId?: string): Promise<string> {
    let uniqueSlug = slug;
    let counter = 1;

    while (true) {
      const existing = await prisma.forumTopic.findUnique({
        where: { slug: uniqueSlug },
        select: { id: true },
      });

      if (!existing || (existingId && existing.id === existingId)) {
        break;
      }

      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }

    return uniqueSlug;
  }

  /**
   * Sanitize content to prevent XSS
   */
  private sanitizeContent(content: string): string {
    // Basic XSS prevention - in production use a library like DOMPurify
    return content
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  // ==========================================================================
  // Forum Management
  // ==========================================================================

  /**
   * Create a new forum
   */
  async createForum(data: CreateForumData) {
    try {
      // Generate slug if not provided
      const slug = data.slug || this.generateSlug(data.name);
      const uniqueSlug = await this.ensureUniqueSlug(slug);

      const forum = await prisma.forum.create({
        data: {
          name: data.name,
          slug: uniqueSlug,
          description: data.description,
          category: data.category as any,
          icon: data.icon,
          displayOrder: data.displayOrder || 0,
        },
      });

      logger.info('Forum created', { forumId: forum.id, name: forum.name, slug: forum.slug });
      return forum;
    } catch (error) {
      logger.error('Error creating forum', { data, error });
      throw new AppError('Failed to create forum', 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Get all forums with optional filters
   */
  async getForums(filters: ForumFilters = {}) {
    try {
      const whereClause: any = {};

      if (filters.category) {
        whereClause.category = filters.category;
      }

      if (filters.isActive !== undefined) {
        whereClause.isActive = filters.isActive;
      }

      const forums = await prisma.forum.findMany({
        where: whereClause,
        orderBy: {
          [filters.sortBy || 'displayOrder']: filters.sortOrder || 'asc',
        },
        include: {
          _count: {
            select: {
              topics: true,
            },
          },
        },
      });

      return forums;
    } catch (error) {
      logger.error('Error getting forums', { filters, error });
      throw new AppError('Failed to get forums', 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Get forum by slug with statistics
   */
  async getForumBySlug(slug: string) {
    try {
      const forum = await prisma.forum.findUnique({
        where: { slug },
        include: {
          _count: {
            select: {
              topics: true,
            },
          },
        },
      });

      if (!forum) {
        throw new AppError('Forum not found', 404, 'FORUM_NOT_FOUND');
      }

      return forum;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error getting forum by slug', { slug, error });
      throw new AppError('Failed to get forum', 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Update forum
   */
  async updateForum(forumId: string, data: UpdateForumData) {
    try {
      // Verify forum exists
      const existingForum = await prisma.forum.findUnique({
        where: { id: forumId },
      });

      if (!existingForum) {
        throw new AppError('Forum not found', 404, 'FORUM_NOT_FOUND');
      }

      const forum = await prisma.forum.update({
        where: { id: forumId },
        data,
      });

      logger.info('Forum updated', { forumId, updates: Object.keys(data) });
      return forum;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error updating forum', { forumId, data, error });
      throw new AppError('Failed to update forum', 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Delete forum
   */
  async deleteForum(forumId: string) {
    try {
      // Check if forum exists
      const forum = await prisma.forum.findUnique({
        where: { id: forumId },
        include: {
          _count: {
            select: {
              topics: true,
            },
          },
        },
      });

      if (!forum) {
        throw new AppError('Forum not found', 404, 'FORUM_NOT_FOUND');
      }

      // Delete forum (cascade will handle topics and posts)
      await prisma.forum.delete({
        where: { id: forumId },
      });

      logger.info('Forum deleted', { forumId, topicCount: forum._count.topics });
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error deleting forum', { forumId, error });
      throw new AppError('Failed to delete forum', 500, 'DATABASE_ERROR');
    }
  }

  // ==========================================================================
  // Topic Management
  // ==========================================================================

  /**
   * Create a new topic
   */
  async createTopic(data: CreateTopicData) {
    try {
      // Verify forum exists and is active
      const forum = await prisma.forum.findUnique({
        where: { id: data.forumId },
      });

      if (!forum) {
        throw new AppError('Forum not found', 404, 'FORUM_NOT_FOUND');
      }

      if (!forum.isActive) {
        throw new AppError('Forum is not active', 400, 'FORUM_INACTIVE');
      }

      // Generate unique slug
      const slug = this.generateSlug(data.title);
      const uniqueSlug = await this.ensureUniqueTopicSlug(slug);

      // Sanitize content
      const sanitizedContent = this.sanitizeContent(data.content);

      // Create topic with first post
      const topic = await prisma.forumTopic.create({
        data: {
          forumId: data.forumId,
          userId: data.userId,
          title: data.title,
          slug: uniqueSlug,
          tags: data.tags || [],
          lastPostAt: new Date(),
          lastPostBy: data.userId,
          posts: {
            create: {
              userId: data.userId,
              content: sanitizedContent,
            },
          },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
          posts: {
            take: 1,
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      // Update forum topic and post counts
      await prisma.forum.update({
        where: { id: data.forumId },
        data: {
          topicCount: { increment: 1 },
          postCount: { increment: 1 },
        },
      });

      logger.info('Topic created', { topicId: topic.id, forumId: data.forumId, userId: data.userId });
      return topic;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error creating topic', { data, error });
      throw new AppError('Failed to create topic', 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Get topics in a forum with filters and pagination
   */
  async getTopics(forumSlug: string, filters: TopicFilters = {}) {
    try {
      // Get forum first
      const forum = await this.getForumBySlug(forumSlug);

      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const skip = (page - 1) * limit;

      // Build where clause
      const whereClause: any = {
        forumId: forum.id,
      };

      if (filters.isPinned !== undefined) {
        whereClause.isPinned = filters.isPinned;
      }

      if (filters.isLocked !== undefined) {
        whereClause.isLocked = filters.isLocked;
      }

      if (filters.isFeatured !== undefined) {
        whereClause.isFeatured = filters.isFeatured;
      }

      if (filters.tag) {
        whereClause.tags = {
          has: filters.tag,
        };
      }

      if (filters.search) {
        whereClause.title = {
          contains: filters.search,
          mode: 'insensitive',
        };
      }

      // Get topics
      const topics = await prisma.forumTopic.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
          _count: {
            select: {
              posts: true,
            },
          },
        },
        orderBy: [
          // Pinned topics first
          { isPinned: 'desc' },
          // Then by specified sort
          { [filters.sortBy || 'lastPostAt']: filters.sortOrder || 'desc' },
        ],
        skip,
        take: limit,
      });

      // Get total count
      const total = await prisma.forumTopic.count({
        where: whereClause,
      });

      return {
        topics,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error getting topics', { forumSlug, filters, error });
      throw new AppError('Failed to get topics', 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Get topic by slug with posts
   */
  async getTopicBySlug(forumSlug: string, topicSlug: string, postFilters: PostFilters = {}) {
    try {
      // Get forum first
      const forum = await this.getForumBySlug(forumSlug);

      const topic = await prisma.forumTopic.findFirst({
        where: {
          slug: topicSlug,
          forumId: forum.id,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
          forum: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });

      if (!topic) {
        throw new AppError('Topic not found', 404, 'TOPIC_NOT_FOUND');
      }

      // Increment view count
      await prisma.forumTopic.update({
        where: { id: topic.id },
        data: { viewCount: { increment: 1 } },
      });

      // Get posts with pagination
      const page = postFilters.page || 1;
      const limit = postFilters.limit || 50;
      const skip = (page - 1) * limit;

      const posts = await prisma.forumPost.findMany({
        where: {
          topicId: topic.id,
          parentPostId: null, // Only get top-level posts
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
              role: true,
            },
          },
          replies: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatarUrl: true,
                  role: true,
                },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: {
          [postFilters.sortBy || 'createdAt']: postFilters.sortOrder || 'asc',
        },
        skip,
        take: limit,
      });

      const totalPosts = await prisma.forumPost.count({
        where: {
          topicId: topic.id,
          parentPostId: null,
        },
      });

      return {
        topic: {
          ...topic,
          viewCount: topic.viewCount + 1, // Return incremented count
        },
        posts,
        pagination: {
          page,
          limit,
          total: totalPosts,
          totalPages: Math.ceil(totalPosts / limit),
        },
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error getting topic by slug', { forumSlug, topicSlug, error });
      throw new AppError('Failed to get topic', 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Update topic (author only)
   */
  async updateTopic(topicId: string, userId: string, data: UpdateTopicData) {
    try {
      // Get topic to verify ownership
      const topic = await prisma.forumTopic.findUnique({
        where: { id: topicId },
        include: {
          posts: {
            take: 1,
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!topic) {
        throw new AppError('Topic not found', 404, 'TOPIC_NOT_FOUND');
      }

      if (topic.userId !== userId) {
        throw new AppError('Not authorized to update this topic', 403, 'NOT_AUTHORIZED');
      }

      if (topic.isLocked) {
        throw new AppError('Cannot update locked topic', 400, 'TOPIC_LOCKED');
      }

      // Update topic
      const updateData: any = {};

      if (data.title) {
        updateData.title = data.title;
        // Regenerate slug if title changed
        const slug = this.generateSlug(data.title);
        updateData.slug = await this.ensureUniqueTopicSlug(slug, topicId);
      }

      if (data.tags !== undefined) {
        updateData.tags = data.tags;
      }

      const updatedTopic = await prisma.forumTopic.update({
        where: { id: topicId },
        data: updateData,
      });

      // Update first post content if provided
      if (data.content && topic.posts.length > 0) {
        const sanitizedContent = this.sanitizeContent(data.content);
        await prisma.forumPost.update({
          where: { id: topic.posts[0].id },
          data: {
            content: sanitizedContent,
            isEdited: true,
            editedAt: new Date(),
          },
        });
      }

      logger.info('Topic updated', { topicId, userId, updates: Object.keys(data) });
      return updatedTopic;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error updating topic', { topicId, userId, data, error });
      throw new AppError('Failed to update topic', 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Delete topic (author or admin)
   */
  async deleteTopic(topicId: string, userId: string, isAdmin: boolean) {
    try {
      const topic = await prisma.forumTopic.findUnique({
        where: { id: topicId },
        include: {
          _count: {
            select: {
              posts: true,
            },
          },
        },
      });

      if (!topic) {
        throw new AppError('Topic not found', 404, 'TOPIC_NOT_FOUND');
      }

      // Check authorization
      if (topic.userId !== userId && !isAdmin) {
        throw new AppError('Not authorized to delete this topic', 403, 'NOT_AUTHORIZED');
      }

      const postCount = topic._count.posts;

      // Delete topic (cascade will handle posts)
      await prisma.forumTopic.delete({
        where: { id: topicId },
      });

      // Update forum counts
      await prisma.forum.update({
        where: { id: topic.forumId },
        data: {
          topicCount: { decrement: 1 },
          postCount: { decrement: postCount },
        },
      });

      logger.info('Topic deleted', { topicId, userId, isAdmin, postCount });
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error deleting topic', { topicId, userId, error });
      throw new AppError('Failed to delete topic', 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Pin/unpin topic (admin only)
   */
  async pinTopic(topicId: string, isPinned: boolean) {
    try {
      const topic = await prisma.forumTopic.update({
        where: { id: topicId },
        data: { isPinned },
      });

      logger.info('Topic pin status updated', { topicId, isPinned });
      return topic;
    } catch (error) {
      logger.error('Error updating topic pin status', { topicId, isPinned, error });
      throw new AppError('Failed to update topic pin status', 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Lock/unlock topic (admin only)
   */
  async lockTopic(topicId: string, isLocked: boolean) {
    try {
      const topic = await prisma.forumTopic.update({
        where: { id: topicId },
        data: { isLocked },
      });

      logger.info('Topic lock status updated', { topicId, isLocked });
      return topic;
    } catch (error) {
      logger.error('Error updating topic lock status', { topicId, isLocked, error });
      throw new AppError('Failed to update topic lock status', 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Feature/unfeature topic (admin only)
   */
  async featureTopic(topicId: string, isFeatured: boolean) {
    try {
      const topic = await prisma.forumTopic.update({
        where: { id: topicId },
        data: { isFeatured },
      });

      logger.info('Topic feature status updated', { topicId, isFeatured });
      return topic;
    } catch (error) {
      logger.error('Error updating topic feature status', { topicId, isFeatured, error });
      throw new AppError('Failed to update topic feature status', 500, 'DATABASE_ERROR');
    }
  }

  // ==========================================================================
  // Post Management
  // ==========================================================================

  /**
   * Create a post/reply in a topic
   */
  async createPost(data: CreatePostData) {
    try {
      // Verify topic exists and is not locked
      const topic = await prisma.forumTopic.findUnique({
        where: { id: data.topicId },
        include: {
          forum: true,
        },
      });

      if (!topic) {
        throw new AppError('Topic not found', 404, 'TOPIC_NOT_FOUND');
      }

      if (topic.isLocked) {
        throw new AppError('Topic is locked', 400, 'TOPIC_LOCKED');
      }

      // Verify parent post exists if replying
      if (data.parentPostId) {
        const parentPost = await prisma.forumPost.findUnique({
          where: { id: data.parentPostId },
        });

        if (!parentPost || parentPost.topicId !== data.topicId) {
          throw new AppError('Parent post not found', 404, 'PARENT_POST_NOT_FOUND');
        }
      }

      // Sanitize content
      const sanitizedContent = this.sanitizeContent(data.content);

      // Create post
      const post = await prisma.forumPost.create({
        data: {
          topicId: data.topicId,
          userId: data.userId,
          content: sanitizedContent,
          parentPostId: data.parentPostId,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
              role: true,
            },
          },
        },
      });

      // Update topic counts and last post info
      await prisma.forumTopic.update({
        where: { id: data.topicId },
        data: {
          replyCount: { increment: 1 },
          lastPostAt: new Date(),
          lastPostBy: data.userId,
        },
      });

      // Update forum post count
      await prisma.forum.update({
        where: { id: topic.forumId },
        data: {
          postCount: { increment: 1 },
        },
      });

      logger.info('Post created', { postId: post.id, topicId: data.topicId, userId: data.userId });
      return post;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error creating post', { data, error });
      throw new AppError('Failed to create post', 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Get posts in a topic
   */
  async getPosts(topicId: string, filters: PostFilters = {}) {
    try {
      const page = filters.page || 1;
      const limit = filters.limit || 50;
      const skip = (page - 1) * limit;

      const posts = await prisma.forumPost.findMany({
        where: {
          topicId,
          parentPostId: null, // Only top-level posts
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
              role: true,
            },
          },
          replies: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatarUrl: true,
                  role: true,
                },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
        orderBy: {
          [filters.sortBy || 'createdAt']: filters.sortOrder || 'asc',
        },
        skip,
        take: limit,
      });

      const total = await prisma.forumPost.count({
        where: {
          topicId,
          parentPostId: null,
        },
      });

      return {
        posts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error getting posts', { topicId, filters, error });
      throw new AppError('Failed to get posts', 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Update post (author only)
   */
  async updatePost(postId: string, userId: string, data: UpdatePostData) {
    try {
      const post = await prisma.forumPost.findUnique({
        where: { id: postId },
        include: {
          topic: true,
        },
      });

      if (!post) {
        throw new AppError('Post not found', 404, 'POST_NOT_FOUND');
      }

      if (post.userId !== userId) {
        throw new AppError('Not authorized to update this post', 403, 'NOT_AUTHORIZED');
      }

      if (post.topic.isLocked) {
        throw new AppError('Cannot update post in locked topic', 400, 'TOPIC_LOCKED');
      }

      if (post.isModerated) {
        throw new AppError('Cannot update moderated post', 400, 'POST_MODERATED');
      }

      // Sanitize content
      const sanitizedContent = this.sanitizeContent(data.content);

      const updatedPost = await prisma.forumPost.update({
        where: { id: postId },
        data: {
          content: sanitizedContent,
          isEdited: true,
          editedAt: new Date(),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
              role: true,
            },
          },
        },
      });

      logger.info('Post updated', { postId, userId });
      return updatedPost;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error updating post', { postId, userId, error });
      throw new AppError('Failed to update post', 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Delete post (author or admin)
   */
  async deletePost(postId: string, userId: string, isAdmin: boolean) {
    try {
      const post = await prisma.forumPost.findUnique({
        where: { id: postId },
        include: {
          topic: {
            include: {
              forum: true,
            },
          },
          _count: {
            select: {
              replies: true,
            },
          },
        },
      });

      if (!post) {
        throw new AppError('Post not found', 404, 'POST_NOT_FOUND');
      }

      // Check authorization
      if (post.userId !== userId && !isAdmin) {
        throw new AppError('Not authorized to delete this post', 403, 'NOT_AUTHORIZED');
      }

      const replyCount = post._count.replies;
      const totalDeleted = replyCount + 1; // Include the post itself

      // Delete post (cascade will handle replies)
      await prisma.forumPost.delete({
        where: { id: postId },
      });

      // Update topic counts
      await prisma.forumTopic.update({
        where: { id: post.topicId },
        data: {
          replyCount: { decrement: totalDeleted },
        },
      });

      // Update forum post count
      await prisma.forum.update({
        where: { id: post.topic.forumId },
        data: {
          postCount: { decrement: totalDeleted },
        },
      });

      logger.info('Post deleted', { postId, userId, isAdmin, repliesDeleted: replyCount });
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error deleting post', { postId, userId, error });
      throw new AppError('Failed to delete post', 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Like/unlike a post
   */
  async togglePostLike(postId: string, userId: string) {
    try {
      const post = await prisma.forumPost.findUnique({
        where: { id: postId },
      });

      if (!post) {
        throw new AppError('Post not found', 404, 'POST_NOT_FOUND');
      }

      // Check if user has liked this post (store in user's profileData)
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { profileData: true },
      });

      const profileData = (user?.profileData as any) || {};
      const likedPosts = profileData.likedForumPosts || [];
      const hasLiked = likedPosts.includes(postId);

      // Toggle like
      if (hasLiked) {
        // Unlike
        const updatedLikes = likedPosts.filter((id: string) => id !== postId);
        await prisma.user.update({
          where: { id: userId },
          data: {
            profileData: {
              ...profileData,
              likedForumPosts: updatedLikes,
            },
          },
        });

        await prisma.forumPost.update({
          where: { id: postId },
          data: { likesCount: { decrement: 1 } },
        });

        logger.info('Post unliked', { postId, userId });
        return { liked: false, likesCount: post.likesCount - 1 };
      } else {
        // Like
        const updatedLikes = [...likedPosts, postId];
        await prisma.user.update({
          where: { id: userId },
          data: {
            profileData: {
              ...profileData,
              likedForumPosts: updatedLikes,
            },
          },
        });

        await prisma.forumPost.update({
          where: { id: postId },
          data: { likesCount: { increment: 1 } },
        });

        logger.info('Post liked', { postId, userId });
        return { liked: true, likesCount: post.likesCount + 1 };
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error toggling post like', { postId, userId, error });
      throw new AppError('Failed to toggle post like', 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Report inappropriate post
   */
  async reportPost(data: ReportData) {
    try {
      const post = await prisma.forumPost.findUnique({
        where: { id: data.postId },
        include: {
          topic: true,
          user: true,
        },
      });

      if (!post) {
        throw new AppError('Post not found', 404, 'POST_NOT_FOUND');
      }

      // Log the report (in production, store in a proper Report model)
      logger.warn('Post reported', {
        postId: data.postId,
        reportedBy: data.userId,
        reason: data.reason,
        details: data.details,
        postContent: post.content.substring(0, 100),
        postAuthor: post.userId,
      });

      // Store report in a simple way using profileData
      // In production, you'd want a dedicated Report model
      const adminUsers = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true, profileData: true },
      });

      for (const admin of adminUsers) {
        const profileData = (admin.profileData as any) || {};
        const reports = profileData.forumReports || [];

        reports.push({
          id: `report_${Date.now()}_${Math.random()}`,
          postId: data.postId,
          reportedBy: data.userId,
          reason: data.reason,
          details: data.details,
          status: 'PENDING',
          createdAt: new Date().toISOString(),
        });

        await prisma.user.update({
          where: { id: admin.id },
          data: {
            profileData: {
              ...profileData,
              forumReports: reports,
            },
          },
        });
      }

      logger.info('Post report created', { postId: data.postId, reportedBy: data.userId });
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error reporting post', { data, error });
      throw new AppError('Failed to report post', 500, 'DATABASE_ERROR');
    }
  }

  // ==========================================================================
  // Moderation
  // ==========================================================================

  /**
   * Moderate a post (admin only)
   */
  async moderatePost(postId: string, data: ModeratePostData) {
    try {
      const post = await prisma.forumPost.findUnique({
        where: { id: postId },
        include: {
          user: true,
          topic: {
            include: {
              forum: true,
            },
          },
        },
      });

      if (!post) {
        throw new AppError('Post not found', 404, 'POST_NOT_FOUND');
      }

      if (data.action === 'APPROVE') {
        await prisma.forumPost.update({
          where: { id: postId },
          data: {
            isModerated: false,
          },
        });
        logger.info('Post approved', { postId, moderatorId: data.moderatorId });
      } else if (data.action === 'REJECT' || data.action === 'DELETE') {
        await prisma.forumPost.update({
          where: { id: postId },
          data: {
            isModerated: true,
            moderatedBy: data.moderatorId,
            moderatedAt: new Date(),
            moderationReason: data.reason,
          },
        });

        if (data.action === 'DELETE') {
          // Soft delete by marking as moderated, or hard delete
          await this.deletePost(postId, data.moderatorId, true);
        }

        logger.info('Post moderated', { postId, action: data.action, moderatorId: data.moderatorId });
      } else if (data.action === 'BAN_USER') {
        // Ban the user (update user status)
        await prisma.user.update({
          where: { id: post.userId },
          data: { isActive: false },
        });

        logger.warn('User banned', { userId: post.userId, moderatorId: data.moderatorId, reason: data.reason });
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error moderating post', { postId, data, error });
      throw new AppError('Failed to moderate post', 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Get moderation queue (admin only)
   */
  async getModerationQueue() {
    try {
      // Get all reported posts from admin users' profileData
      const adminUsers = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { profileData: true },
        take: 1, // Just get first admin to get reports
      });

      if (adminUsers.length === 0) {
        return [];
      }

      const profileData = (adminUsers[0].profileData as any) || {};
      const reports = profileData.forumReports || [];

      // Filter pending reports
      const pendingReports = reports.filter((r: any) => r.status === 'PENDING');

      // Get full post details for each report
      const reportsWithDetails = await Promise.all(
        pendingReports.map(async (report: any) => {
          const post = await prisma.forumPost.findUnique({
            where: { id: report.postId },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              topic: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          });

          return {
            ...report,
            post,
          };
        })
      );

      return reportsWithDetails;
    } catch (error) {
      logger.error('Error getting moderation queue', { error });
      throw new AppError('Failed to get moderation queue', 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Get all reports (admin only)
   */
  async getReports() {
    try {
      const adminUsers = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { profileData: true },
        take: 1,
      });

      if (adminUsers.length === 0) {
        return [];
      }

      const profileData = (adminUsers[0].profileData as any) || {};
      return profileData.forumReports || [];
    } catch (error) {
      logger.error('Error getting reports', { error });
      throw new AppError('Failed to get reports', 500, 'DATABASE_ERROR');
    }
  }

  // ==========================================================================
  // Search & Discovery
  // ==========================================================================

  /**
   * Search topics and posts
   */
  async search(filters: SearchFilters) {
    try {
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const skip = (page - 1) * limit;

      const results: any = {
        topics: [],
        posts: [],
      };

      if (filters.searchIn === 'topics' || filters.searchIn === 'all') {
        const whereClause: any = {
          title: {
            contains: filters.query,
            mode: 'insensitive',
          },
        };

        if (filters.forumId) {
          whereClause.forumId = filters.forumId;
        }

        results.topics = await prisma.forumTopic.findMany({
          where: whereClause,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
            forum: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
          take: limit,
          skip,
        });
      }

      if (filters.searchIn === 'posts' || filters.searchIn === 'all') {
        const whereClause: any = {
          content: {
            contains: filters.query,
            mode: 'insensitive',
          },
        };

        if (filters.forumId) {
          whereClause.topic = {
            forumId: filters.forumId,
          };
        }

        results.posts = await prisma.forumPost.findMany({
          where: whereClause,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
            topic: {
              include: {
                forum: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                  },
                },
              },
            },
          },
          take: limit,
          skip,
        });
      }

      return results;
    } catch (error) {
      logger.error('Error searching forums', { filters, error });
      throw new AppError('Failed to search forums', 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Get trending topics (based on recent activity)
   */
  async getTrendingTopics(limit = 10) {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const topics = await prisma.forumTopic.findMany({
        where: {
          lastPostAt: {
            gte: sevenDaysAgo,
          },
          forum: {
            isActive: true,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
          forum: {
            select: {
              id: true,
              name: true,
              slug: true,
              category: true,
            },
          },
        },
        orderBy: [
          { replyCount: 'desc' },
          { viewCount: 'desc' },
          { lastPostAt: 'desc' },
        ],
        take: limit,
      });

      return topics;
    } catch (error) {
      logger.error('Error getting trending topics', { error });
      throw new AppError('Failed to get trending topics', 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Get recent activity across all forums
   */
  async getRecentActivity(limit = 20) {
    try {
      const topics = await prisma.forumTopic.findMany({
        where: {
          forum: {
            isActive: true,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
          forum: {
            select: {
              id: true,
              name: true,
              slug: true,
              category: true,
            },
          },
        },
        orderBy: {
          lastPostAt: 'desc',
        },
        take: limit,
      });

      return topics;
    } catch (error) {
      logger.error('Error getting recent activity', { error });
      throw new AppError('Failed to get recent activity', 500, 'DATABASE_ERROR');
    }
  }
}

// Export singleton instance
export const forumService = new ForumService();
export default forumService;
