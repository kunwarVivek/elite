import { Router } from 'express';
import { forumController } from '../controllers/forum.controller.js';
import { authenticate, requireAdmin, optionalAuth } from '../middleware/auth.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validation.js';
import {
  sqlInjectionPrevention,
  xssPrevention,
  inputSanitization
} from '../middleware/security.js';
import {
  createForumSchema,
  updateForumSchema,
  forumListQuerySchema,
  createTopicSchema,
  updateTopicSchema,
  topicListQuerySchema,
  createPostSchema,
  updatePostSchema,
  postListQuerySchema,
  likePostSchema,
  reportPostSchema,
  moderatePostSchema,
  moderationQueueQuerySchema,
  searchForumSchema,
  forumSlugParamSchema,
  topicSlugParamSchema,
  topicIdParamSchema,
  postIdParamSchema,
  forumIdParamSchema,
  pinTopicSchema,
  lockTopicSchema,
  featureTopicSchema,
} from '../validations/forum.validation.js';

const router = Router();

// Apply security middleware to all routes
router.use(sqlInjectionPrevention);
router.use(xssPrevention);
router.use(inputSanitization);

// ============================================================================
// Public Routes (no authentication required)
// ============================================================================

// Get all forums
router.get(
  '/',
  optionalAuth,
  validateQuery(forumListQuerySchema),
  forumController.getForums.bind(forumController)
);

// Get forum by slug
router.get(
  '/:slug',
  optionalAuth,
  forumController.getForumBySlug.bind(forumController)
);

// ============================================================================
// Forum Management (Admin Only)
// ============================================================================

// Create forum
router.post(
  '/',
  authenticate,
  requireAdmin,
  validateBody(createForumSchema),
  forumController.createForum.bind(forumController)
);

// Update forum
router.put(
  '/:id',
  authenticate,
  requireAdmin,
  validateParams(forumIdParamSchema),
  validateBody(updateForumSchema),
  forumController.updateForum.bind(forumController)
);

// Delete forum
router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  validateParams(forumIdParamSchema),
  forumController.deleteForum.bind(forumController)
);

// ============================================================================
// Topic Management
// ============================================================================

// Get topics in a forum
router.get(
  '/:forumSlug/topics',
  optionalAuth,
  validateParams(forumSlugParamSchema),
  validateQuery(topicListQuerySchema),
  forumController.getTopics.bind(forumController)
);

// Get topic with posts
router.get(
  '/:forumSlug/topics/:topicSlug',
  optionalAuth,
  validateQuery(postListQuerySchema),
  forumController.getTopicBySlug.bind(forumController)
);

// Create topic
router.post(
  '/:forumSlug/topics',
  authenticate,
  validateParams(forumSlugParamSchema),
  validateBody(createTopicSchema),
  forumController.createTopic.bind(forumController)
);

// Update topic (author only)
router.put(
  '/topics/:id',
  authenticate,
  validateParams(topicIdParamSchema),
  validateBody(updateTopicSchema),
  forumController.updateTopic.bind(forumController)
);

// Delete topic (author or admin)
router.delete(
  '/topics/:id',
  authenticate,
  validateParams(topicIdParamSchema),
  forumController.deleteTopic.bind(forumController)
);

// Pin topic (admin only)
router.post(
  '/topics/:id/pin',
  authenticate,
  requireAdmin,
  validateParams(topicIdParamSchema),
  validateBody(pinTopicSchema),
  forumController.pinTopic.bind(forumController)
);

// Lock topic (admin only)
router.post(
  '/topics/:id/lock',
  authenticate,
  requireAdmin,
  validateParams(topicIdParamSchema),
  validateBody(lockTopicSchema),
  forumController.lockTopic.bind(forumController)
);

// Feature topic (admin only)
router.post(
  '/topics/:id/feature',
  authenticate,
  requireAdmin,
  validateParams(topicIdParamSchema),
  validateBody(featureTopicSchema),
  forumController.featureTopic.bind(forumController)
);

// ============================================================================
// Post Management
// ============================================================================

// Get posts in a topic
router.get(
  '/topics/:topicId/posts',
  optionalAuth,
  validateParams(topicIdParamSchema),
  validateQuery(postListQuerySchema),
  forumController.getPosts.bind(forumController)
);

// Create post/reply
router.post(
  '/topics/:topicId/posts',
  authenticate,
  validateParams(topicIdParamSchema),
  validateBody(createPostSchema),
  forumController.createPost.bind(forumController)
);

// Update post (author only)
router.put(
  '/posts/:id',
  authenticate,
  validateParams(postIdParamSchema),
  validateBody(updatePostSchema),
  forumController.updatePost.bind(forumController)
);

// Delete post (author or admin)
router.delete(
  '/posts/:id',
  authenticate,
  validateParams(postIdParamSchema),
  forumController.deletePost.bind(forumController)
);

// Like/unlike post
router.post(
  '/posts/:id/like',
  authenticate,
  validateParams(postIdParamSchema),
  validateBody(likePostSchema),
  forumController.likePost.bind(forumController)
);

// Report post
router.post(
  '/posts/:id/report',
  authenticate,
  validateParams(postIdParamSchema),
  validateBody(reportPostSchema),
  forumController.reportPost.bind(forumController)
);

// ============================================================================
// Moderation (Admin Only)
// ============================================================================

// Get moderation queue
router.get(
  '/moderation/queue',
  authenticate,
  requireAdmin,
  validateQuery(moderationQueueQuerySchema),
  forumController.getModerationQueue.bind(forumController)
);

// Moderate post
router.post(
  '/posts/:id/moderate',
  authenticate,
  requireAdmin,
  validateParams(postIdParamSchema),
  validateBody(moderatePostSchema),
  forumController.moderatePost.bind(forumController)
);

// Get all reports
router.get(
  '/moderation/reports',
  authenticate,
  requireAdmin,
  forumController.getReports.bind(forumController)
);

// ============================================================================
// Search & Discovery
// ============================================================================

// Search topics and posts
router.get(
  '/search',
  optionalAuth,
  validateQuery(searchForumSchema),
  forumController.search.bind(forumController)
);

// Get trending topics
router.get(
  '/trending',
  optionalAuth,
  forumController.getTrendingTopics.bind(forumController)
);

// Get recent activity
router.get(
  '/recent',
  optionalAuth,
  forumController.getRecentActivity.bind(forumController)
);

export default router;
