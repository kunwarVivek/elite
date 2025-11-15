import { z } from 'zod';

/**
 * Forum Validation Schemas
 * Comprehensive validation for all forum-related operations
 */

// ============================================================================
// Enums
// ============================================================================

export const forumCategorySchema = z.enum([
  'GENERAL',
  'STARTUPS',
  'INVESTING',
  'LEGAL',
  'TAX',
  'TECHNICAL',
  'ANNOUNCEMENTS',
]);

export const moderationActionSchema = z.enum([
  'APPROVE',
  'REJECT',
  'DELETE',
  'BAN_USER',
]);

export const sortOrderSchema = z.enum(['asc', 'desc']);

// ============================================================================
// Forum Schemas
// ============================================================================

export const createForumSchema = z.object({
  name: z.string()
    .min(3, 'Forum name must be at least 3 characters')
    .max(100, 'Forum name must be less than 100 characters'),
  slug: z.string()
    .min(3, 'Slug must be at least 3 characters')
    .max(100, 'Slug must be less than 100 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .optional(),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  category: forumCategorySchema,
  icon: z.string().max(50, 'Icon name must be less than 50 characters').optional(),
  displayOrder: z.number().int().min(0).optional(),
});

export const updateForumSchema = z.object({
  name: z.string()
    .min(3, 'Forum name must be at least 3 characters')
    .max(100, 'Forum name must be less than 100 characters')
    .optional(),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  category: forumCategorySchema.optional(),
  icon: z.string().max(50, 'Icon name must be less than 50 characters').optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
});

export const forumListQuerySchema = z.object({
  category: forumCategorySchema.optional(),
  isActive: z.coerce.boolean().optional(),
  sortBy: z.enum(['name', 'category', 'topicCount', 'postCount', 'displayOrder', 'createdAt']).default('displayOrder'),
  sortOrder: sortOrderSchema.default('asc'),
});

// ============================================================================
// Topic Schemas
// ============================================================================

export const createTopicSchema = z.object({
  title: z.string()
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title must be less than 200 characters'),
  content: z.string()
    .min(10, 'Content must be at least 10 characters')
    .max(50000, 'Content must be less than 50,000 characters'),
  tags: z.array(z.string().max(30, 'Tag must be less than 30 characters'))
    .max(5, 'Maximum 5 tags allowed')
    .optional(),
});

export const updateTopicSchema = z.object({
  title: z.string()
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title must be less than 200 characters')
    .optional(),
  content: z.string()
    .min(10, 'Content must be at least 10 characters')
    .max(50000, 'Content must be less than 50,000 characters')
    .optional(),
  tags: z.array(z.string().max(30, 'Tag must be less than 30 characters'))
    .max(5, 'Maximum 5 tags allowed')
    .optional(),
});

export const topicListQuerySchema = z.object({
  isPinned: z.coerce.boolean().optional(),
  isLocked: z.coerce.boolean().optional(),
  isFeatured: z.coerce.boolean().optional(),
  tag: z.string().max(30).optional(),
  search: z.string().max(100, 'Search term too long').optional(),
  page: z.coerce.number().min(1, 'Page must be positive').default(1),
  limit: z.coerce.number().min(1, 'Limit must be positive').max(100, 'Limit cannot exceed 100').default(20),
  sortBy: z.enum(['createdAt', 'updatedAt', 'viewCount', 'replyCount', 'lastPostAt', 'title']).default('lastPostAt'),
  sortOrder: sortOrderSchema.default('desc'),
});

export const pinTopicSchema = z.object({
  isPinned: z.boolean(),
});

export const lockTopicSchema = z.object({
  isLocked: z.boolean(),
});

export const featureTopicSchema = z.object({
  isFeatured: z.boolean(),
});

// ============================================================================
// Post Schemas
// ============================================================================

export const createPostSchema = z.object({
  content: z.string()
    .min(1, 'Content is required')
    .max(50000, 'Content must be less than 50,000 characters'),
  parentPostId: z.string().cuid('Invalid parent post ID').optional(),
});

export const updatePostSchema = z.object({
  content: z.string()
    .min(1, 'Content is required')
    .max(50000, 'Content must be less than 50,000 characters'),
});

export const postListQuerySchema = z.object({
  page: z.coerce.number().min(1, 'Page must be positive').default(1),
  limit: z.coerce.number().min(1, 'Limit must be positive').max(100, 'Limit cannot exceed 100').default(50),
  sortBy: z.enum(['createdAt', 'likesCount']).default('createdAt'),
  sortOrder: sortOrderSchema.default('asc'),
});

export const likePostSchema = z.object({
  like: z.boolean().optional(),
});

export const reportPostSchema = z.object({
  reason: z.string()
    .min(10, 'Report reason must be at least 10 characters')
    .max(500, 'Report reason must be less than 500 characters'),
  details: z.string()
    .max(2000, 'Details must be less than 2000 characters')
    .optional(),
});

// ============================================================================
// Moderation Schemas
// ============================================================================

export const moderatePostSchema = z.object({
  action: moderationActionSchema,
  reason: z.string()
    .min(10, 'Moderation reason must be at least 10 characters')
    .max(500, 'Moderation reason must be less than 500 characters'),
  notes: z.string()
    .max(2000, 'Notes must be less than 2000 characters')
    .optional(),
});

export const moderationQueueQuerySchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  page: z.coerce.number().min(1, 'Page must be positive').default(1),
  limit: z.coerce.number().min(1, 'Limit must be positive').max(100, 'Limit cannot exceed 100').default(20),
  sortBy: z.enum(['createdAt', 'updatedAt']).default('createdAt'),
  sortOrder: sortOrderSchema.default('desc'),
});

// ============================================================================
// Search Schemas
// ============================================================================

export const searchForumSchema = z.object({
  query: z.string()
    .min(2, 'Search query must be at least 2 characters')
    .max(100, 'Search query must be less than 100 characters'),
  searchIn: z.enum(['topics', 'posts', 'all']).default('all'),
  forumId: z.string().cuid('Invalid forum ID').optional(),
  page: z.coerce.number().min(1, 'Page must be positive').default(1),
  limit: z.coerce.number().min(1, 'Limit must be positive').max(100, 'Limit cannot exceed 100').default(20),
});

// ============================================================================
// Parameter Schemas
// ============================================================================

export const forumSlugParamSchema = z.object({
  forumSlug: z.string().min(1, 'Forum slug is required'),
});

export const topicSlugParamSchema = z.object({
  topicSlug: z.string().min(1, 'Topic slug is required'),
});

export const topicIdParamSchema = z.object({
  topicId: z.string().cuid('Invalid topic ID'),
});

export const postIdParamSchema = z.object({
  postId: z.string().cuid('Invalid post ID'),
});

export const forumIdParamSchema = z.object({
  id: z.string().cuid('Invalid forum ID'),
});

// ============================================================================
// Type Exports
// ============================================================================

export type CreateForumInput = z.infer<typeof createForumSchema>;
export type UpdateForumInput = z.infer<typeof updateForumSchema>;
export type ForumListQueryInput = z.infer<typeof forumListQuerySchema>;
export type CreateTopicInput = z.infer<typeof createTopicSchema>;
export type UpdateTopicInput = z.infer<typeof updateTopicSchema>;
export type TopicListQueryInput = z.infer<typeof topicListQuerySchema>;
export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type PostListQueryInput = z.infer<typeof postListQuerySchema>;
export type LikePostInput = z.infer<typeof likePostSchema>;
export type ReportPostInput = z.infer<typeof reportPostSchema>;
export type ModeratePostInput = z.infer<typeof moderatePostSchema>;
export type ModerationQueueQueryInput = z.infer<typeof moderationQueueQuerySchema>;
export type SearchForumInput = z.infer<typeof searchForumSchema>;

export default {
  createForum: createForumSchema,
  updateForum: updateForumSchema,
  forumListQuery: forumListQuerySchema,
  createTopic: createTopicSchema,
  updateTopic: updateTopicSchema,
  topicListQuery: topicListQuerySchema,
  createPost: createPostSchema,
  updatePost: updatePostSchema,
  postListQuery: postListQuerySchema,
  likePost: likePostSchema,
  reportPost: reportPostSchema,
  moderatePost: moderatePostSchema,
  moderationQueueQuery: moderationQueueQuerySchema,
  searchForum: searchForumSchema,
  forumSlugParam: forumSlugParamSchema,
  topicSlugParam: topicSlugParamSchema,
  topicIdParam: topicIdParamSchema,
  postIdParam: postIdParamSchema,
  forumIdParam: forumIdParamSchema,
};
