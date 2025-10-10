import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validateBody, validateParams } from '../middleware/validation.js';
import {
  adminRateLimiter,
  sqlInjectionPrevention,
  xssPrevention,
  inputSanitization
} from '../middleware/security.js';
import {
  markNotificationReadSchema,
  markAllNotificationsReadSchema,
  notificationListQuerySchema,
  notificationPreferencesSchema,
  bulkNotificationActionSchema,
  notificationTemplateSchema,
  createNotificationSchema,
  notificationAnalyticsQuerySchema,
} from '../validations/notification.validation.js';

const router = Router();

// Apply security middleware
router.use(sqlInjectionPrevention);
router.use(xssPrevention);
router.use(inputSanitization);

// All notification routes require authentication
router.use(authenticate);

// Admin routes get additional rate limiting
router.post('/admin/create', adminRateLimiter);
router.post('/admin/templates', adminRateLimiter);
router.get('/admin/analytics', adminRateLimiter);

// Get notifications
router.get('/', validateBody(notificationListQuerySchema), notificationController.getNotifications.bind(notificationController));

// Get notification by ID
router.get('/:id', notificationController.getNotificationById.bind(notificationController));

// Mark as read
router.put('/:id/read', notificationController.markAsRead.bind(notificationController));

// Mark all as read
router.put('/mark-all-read', validateBody(markAllNotificationsReadSchema), notificationController.markAllAsRead.bind(notificationController));

// Delete notification
router.delete('/:id', notificationController.deleteNotification.bind(notificationController));

// Bulk notification actions
router.post('/bulk-action', validateBody(bulkNotificationActionSchema), notificationController.bulkNotificationAction.bind(notificationController));

// Notification preferences
router.get('/preferences', notificationController.getNotificationPreferences.bind(notificationController));
router.put('/preferences', validateBody(notificationPreferencesSchema), notificationController.updateNotificationPreferences.bind(notificationController));

// Send test notification
router.post('/test', notificationController.sendTestNotification.bind(notificationController));

// Notification summary
router.get('/summary', notificationController.getNotificationSummary.bind(notificationController));

// Admin routes
router.post('/admin/create', validateBody(createNotificationSchema), notificationController.createNotification.bind(notificationController));
router.post('/admin/templates', validateBody(notificationTemplateSchema), notificationController.createNotificationTemplate.bind(notificationController));
router.get('/admin/analytics', validateBody(notificationAnalyticsQuerySchema), notificationController.getNotificationAnalytics.bind(notificationController));

export default router;