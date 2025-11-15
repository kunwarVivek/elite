import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler.js';
import { sendSuccess } from '../utils/response.js';
import { logger } from '../config/logger.js';
import { prisma } from '../config/database.js';
import { notificationService } from '../services/notification.service.js';
import { NotificationType, NotificationPriority } from '@prisma/client';

// Types for better type safety
interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name?: string;
    role: string;
  };
}

interface NotificationParams {
  id: string;
}

interface CreateNotificationData {
  recipientId: string;
  type: string;
  priority?: string;
  title: string;
  content: string;
  actionUrl?: string;
  imageUrl?: string;
  data?: Record<string, any>;
  channels?: string[];
  scheduledFor?: string;
}

interface NotificationPreferencesData {
  email?: {
    enabled?: boolean;
    frequency?: string;
    types?: string[];
  };
  push?: {
    enabled?: boolean;
    types?: string[];
  };
  sms?: {
    enabled?: boolean;
    types?: string[];
  };
  inApp?: {
    enabled?: boolean;
    showBadge?: boolean;
    soundEnabled?: boolean;
    types?: string[];
  };
  quietHours?: {
    enabled?: boolean;
    startTime?: string;
    endTime?: string;
    timezone?: string;
    daysOfWeek?: number[];
  };
  weeklyDigest?: {
    enabled?: boolean;
    dayOfWeek?: number;
    time?: string;
    includePortfolio?: boolean;
    includeMarketNews?: boolean;
  };
}

class NotificationController {
  // Get user notifications
  async getNotifications(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const queryParams = req.query;
      const {
        isRead,
        type,
        priority,
        channel,
        search,
        startDate,
        endDate,
        page,
        limit,
        sortBy,
        sortOrder,
      } = queryParams as any;

      const result = await this.getNotificationsList(userId, {
        isRead: isRead === 'true',
        type,
        priority,
        channel,
        search,
        startDate,
        endDate,
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
        sortBy,
        sortOrder,
      });

      sendSuccess(res, {
        notifications: result.notifications,
        pagination: result.pagination,
        unread_count: result.unreadCount,
      }, 'Notifications retrieved successfully');

    } catch (error) {
      next(error);
    }
  }

  // Get notification by ID
  async getNotificationById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params as unknown as NotificationParams;

      const notification = await this.findNotificationById(id);
      if (!notification) {
        throw new AppError('Notification not found', 404, 'NOTIFICATION_NOT_FOUND');
      }

      // Check if user owns the notification
      if (notification.userId !== userId) {
        throw new AppError('Not authorized to view this notification', 403, 'NOT_AUTHORIZED');
      }

      // Mark as read if not already read
      if (!notification.isRead) {
        await this.markNotificationAsRead(id, userId);
      }

      sendSuccess(res, {
        id: notification.id,
        type: notification.type,
        priority: notification.priority,
        title: notification.title,
        content: notification.content,
        action_url: notification.actionUrl,
        // image_url: notification.imageUrl, // Field not in schema
        is_read: notification.isRead,
        read_at: notification.readAt,
        // channels: notification.channels, // Field not in schema
        created_at: notification.createdAt,
      }, 'Notification retrieved successfully');

    } catch (error) {
      next(error);
    }
  }

  // Mark notification as read
  async markAsRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { notificationIds } = req.body;

      // Mark notifications as read
      await this.markNotificationsAsRead(notificationIds, userId);

      logger.info('Notifications marked as read', { notificationIds, userId });

      sendSuccess(res, {
        marked_count: notificationIds.length,
      }, 'Notifications marked as read successfully');

    } catch (error) {
      next(error);
    }
  }

  // Mark all notifications as read
  async markAllAsRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { beforeDate } = req.body;

      const markedCount = await this.markAllNotificationsAsRead(userId, beforeDate);

      logger.info('All notifications marked as read', { userId, beforeDate, markedCount });

      sendSuccess(res, {
        marked_count: markedCount,
      }, 'All notifications marked as read successfully');

    } catch (error) {
      next(error);
    }
  }

  // Delete notification
  async deleteNotification(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params as unknown as NotificationParams;

      // Check if user owns the notification
      const notification = await this.findNotificationById(id);
      if (!notification) {
        throw new AppError('Notification not found', 404, 'NOTIFICATION_NOT_FOUND');
      }

      if (notification.userId !== userId) {
        throw new AppError('Not authorized to delete this notification', 403, 'NOT_AUTHORIZED');
      }

      await this.deleteNotificationFromDb(id);

      logger.info('Notification deleted', { notificationId: id, userId });

      sendSuccess(res, null, 'Notification deleted successfully');

    } catch (error) {
      next(error);
    }
  }

  // Bulk notification action
  async bulkNotificationAction(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { notificationIds, action } = req.body;

      // Perform bulk action
      const result = await this.performBulkNotificationAction(notificationIds, action, userId);

      logger.info('Bulk notification action performed', {
        notificationIds,
        action,
        userId,
        affectedCount: result.affectedCount,
      });

      sendSuccess(res, {
        action,
        affected_count: result.affectedCount,
      }, `Bulk ${action.toLowerCase()} completed successfully`);

    } catch (error) {
      next(error);
    }
  }

  // Get notification preferences
  async getNotificationPreferences(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const preferences = await this.getUserNotificationPreferences(userId);

      sendSuccess(res, {
        preferences: preferences,
        updated_at: preferences.updatedAt,
      }, 'Notification preferences retrieved successfully');

    } catch (error) {
      next(error);
    }
  }

  // Update notification preferences
  async updateNotificationPreferences(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const preferencesData: NotificationPreferencesData = req.body;

      // Update preferences
      await this.updateUserNotificationPreferences(userId, preferencesData);

      logger.info('Notification preferences updated', { userId });

      sendSuccess(res, {
        updated_at: new Date(),
      }, 'Notification preferences updated successfully');

    } catch (error) {
      next(error);
    }
  }

  // Create notification (admin/system use)
  async createNotification(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // Check if user is admin
      if (req.user?.role !== 'ADMIN') {
        throw new AppError('Admin access required', 403, 'ADMIN_ACCESS_REQUIRED');
      }

      const notificationData: CreateNotificationData = req.body;

      // Verify recipient exists
      const recipient = await this.findUserById(notificationData.recipientId);
      if (!recipient) {
        throw new AppError('Recipient not found', 404, 'RECIPIENT_NOT_FOUND');
      }

      // Create notification
      const notification = await this.createNotificationInDb({
        ...notificationData,
        createdBy: req.user!.id,
      });

      // Send notification through configured channels
      await this.sendNotification(notification);

      logger.info('Notification created', {
        notificationId: notification.id,
        recipientId: notificationData.recipientId,
        type: notificationData.type,
        createdBy: req.user!.id,
      });

      sendSuccess(res, {
        id: notification.id,
        recipient_id: notification.recipientId,
        type: notification.type,
        title: notification.title,
        created_at: notification.createdAt,
      }, 'Notification created successfully', 201);

    } catch (error) {
      next(error);
    }
  }

  // Create notification template (admin use)
  async createNotificationTemplate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // Check if user is admin
      if (req.user?.role !== 'ADMIN') {
        throw new AppError('Admin access required', 403, 'ADMIN_ACCESS_REQUIRED');
      }

      const templateData = req.body;

      const template = await this.createNotificationTemplateInDb({
        ...templateData,
        createdBy: req.user!.id,
      });

      logger.info('Notification template created', {
        templateId: template.id,
        createdBy: req.user!.id,
      });

      sendSuccess(res, {
        id: template.id,
        name: template.name,
        type: template.type,
        is_active: template.isActive,
        created_at: template.createdAt,
      }, 'Notification template created successfully', 201);

    } catch (error) {
      next(error);
    }
  }

  // Get notification analytics (admin use)
  async getNotificationAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      // Check if user is admin
      if (req.user?.role !== 'ADMIN') {
        throw new AppError('Admin access required', 403, 'ADMIN_ACCESS_REQUIRED');
      }

      const queryParams = req.query;
      const {
        startDate,
        endDate,
        groupBy,
        types,
        channels,
      } = queryParams as any;

      const analytics = await this.getNotificationAnalyticsData({
        startDate,
        endDate,
        groupBy: groupBy || 'DAY',
        types: types ? (Array.isArray(types) ? types : [types]) : undefined,
        channels: channels ? (Array.isArray(channels) ? channels : [channels]) : undefined,
      });

      sendSuccess(res, {
        period: {
          start_date: startDate,
          end_date: endDate,
        },
        group_by: groupBy || 'DAY',
        total_sent: analytics.totalSent,
        total_delivered: analytics.totalDelivered,
        total_read: analytics.totalRead,
        delivery_rate: analytics.deliveryRate,
        read_rate: analytics.readRate,
        channel_breakdown: analytics.channelBreakdown,
        type_breakdown: analytics.typeBreakdown,
        daily_stats: analytics.dailyStats,
        top_performers: analytics.topPerformers,
      }, 'Notification analytics retrieved successfully');

    } catch (error) {
      next(error);
    }
  }

  // Send test notification
  async sendTestNotification(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { type, channel } = req.body;

      // Create test notification
      const testNotification = await this.createTestNotification(userId, {
        type: type || 'SYSTEM_ANNOUNCEMENT',
        channel: channel || 'IN_APP',
        title: 'Test Notification',
        content: 'This is a test notification to verify your notification settings.',
      });

      // Send test notification
      await this.sendNotification(testNotification);

      logger.info('Test notification sent', { userId, type, channel });

      sendSuccess(res, {
        notification_id: testNotification.id,
        sent_at: testNotification.createdAt,
      }, 'Test notification sent successfully');

    } catch (error) {
      next(error);
    }
  }

  // Get notification summary
  async getNotificationSummary(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const summary = await this.getUserNotificationSummary(userId);

      sendSuccess(res, {
        total_notifications: summary.total,
        unread_notifications: summary.unread,
        notifications_by_type: summary.byType,
        notifications_by_priority: summary.byPriority,
        recent_notifications: summary.recent,
        preferences_summary: summary.preferencesSummary,
      }, 'Notification summary retrieved successfully');

    } catch (error) {
      next(error);
    }
  }

  // Helper methods

  /**
   * Send notification through various channels (email, push, SMS, in-app)
   * This delegates to the notification service for multi-channel delivery
   */
  private async sendNotification(notification: any) {
    // The notification service handles multi-channel delivery automatically
    // based on user preferences and notification priority
    logger.debug('Notification will be delivered via notification service', {
      notificationId: notification.id
    });
  }

  // Database operations (these would typically be in a service layer)

  /**
   * Find notification by ID
   */
  private async findNotificationById(id: string): Promise<any | null> {
    try {
      return await prisma.notification.findUnique({
        where: { id }
      });
    } catch (error) {
      logger.error('Failed to find notification by ID', {
        id,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * Find user by ID
   */
  private async findUserById(id: string) {
    try {
      return await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true
        }
      });
    } catch (error) {
      logger.error('Failed to find user by ID', {
        id,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * Get paginated notifications list with filters
   */
  private async getNotificationsList(userId: string, filters: any) {
    try {
      const {
        isRead,
        type,
        priority,
        search,
        startDate,
        endDate,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = filters;

      // Build where clause
      const where: any = { userId };

      if (isRead !== undefined) {
        where.isRead = isRead;
      }

      if (type) {
        where.type = type;
      }

      if (priority) {
        where.priority = priority;
      }

      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { content: { contains: search, mode: 'insensitive' } }
        ];
      }

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt.gte = new Date(startDate);
        }
        if (endDate) {
          where.createdAt.lte = new Date(endDate);
        }
      }

      // Calculate pagination
      const skip = (page - 1) * limit;

      // Get total count
      const total = await prisma.notification.count({ where });

      // Get notifications
      const notifications = await prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder }
      });

      // Get unread count
      const unreadCount = await prisma.notification.count({
        where: {
          userId,
          isRead: false
        }
      });

      return {
        notifications,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        },
        unreadCount
      };
    } catch (error) {
      logger.error('Failed to get notifications list', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Mark single notification as read
   */
  private async markNotificationAsRead(notificationId: string, userId: string) {
    try {
      await notificationService.markAsRead(notificationId, userId);
    } catch (error) {
      logger.error('Failed to mark notification as read', {
        notificationId,
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Mark multiple notifications as read
   */
  private async markNotificationsAsRead(notificationIds: string[], userId: string) {
    try {
      await notificationService.markMultipleAsRead(notificationIds, userId);
    } catch (error) {
      logger.error('Failed to mark notifications as read', {
        notificationIds,
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   */
  private async markAllNotificationsAsRead(userId: string, beforeDate?: string): Promise<number> {
    try {
      const date = beforeDate ? new Date(beforeDate) : undefined;
      return await notificationService.markAllAsRead(userId, date);
    } catch (error) {
      logger.error('Failed to mark all notifications as read', {
        userId,
        beforeDate,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Delete notification from database
   */
  private async deleteNotificationFromDb(id: string) {
    try {
      await prisma.notification.delete({
        where: { id }
      });
    } catch (error) {
      logger.error('Failed to delete notification', {
        id,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Perform bulk notification actions
   */
  private async performBulkNotificationAction(
    notificationIds: string[],
    action: string,
    userId: string
  ) {
    try {
      let affectedCount = 0;

      switch (action.toUpperCase()) {
        case 'READ':
          affectedCount = await notificationService.markMultipleAsRead(notificationIds, userId);
          break;

        case 'DELETE':
          affectedCount = await notificationService.deleteMultiple(notificationIds, userId);
          break;

        case 'ARCHIVE':
          // Archive functionality can be added later
          logger.warn('Archive action not yet implemented');
          break;

        default:
          throw new AppError(`Invalid bulk action: ${action}`, 400, 'INVALID_ACTION');
      }

      return { affectedCount };
    } catch (error) {
      logger.error('Failed to perform bulk notification action', {
        notificationIds,
        action,
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get user notification preferences
   */
  private async getUserNotificationPreferences(userId: string) {
    try {
      const preferences = await notificationService.getUserPreferences(userId);
      return {
        ...preferences,
        updatedAt: new Date()
      };
    } catch (error) {
      logger.error('Failed to get user notification preferences', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Update user notification preferences
   */
  private async updateUserNotificationPreferences(
    userId: string,
    preferences: NotificationPreferencesData
  ) {
    try {
      await notificationService.updateUserPreferences(userId, preferences);
    } catch (error) {
      logger.error('Failed to update user notification preferences', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Create notification in database and send through channels
   */
  private async createNotificationInDb(notificationData: any) {
    try {
      const { recipientId, type, priority, title, content, actionUrl, data, channels } = notificationData;

      // Validate notification type
      if (!Object.values(NotificationType).includes(type)) {
        throw new AppError(`Invalid notification type: ${type}`, 400, 'INVALID_TYPE');
      }

      // Create and send notification
      const notification = await notificationService.createNotification({
        recipientId,
        type,
        priority: priority || NotificationPriority.MEDIUM,
        title,
        content,
        actionUrl,
        data,
        channels
      });

      return notification;
    } catch (error) {
      logger.error('Failed to create notification', {
        notificationData,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Create notification template in database
   */
  private async createNotificationTemplateInDb(templateData: any) {
    try {
      // For now, we'll store templates in the database as a JSON document
      // In a production system, you might want a separate NotificationTemplate table
      const template = await prisma.user.update({
        where: { id: templateData.createdBy },
        data: {
          profileData: {
            notificationTemplates: {
              ...(templateData as any),
              id: `template_${Date.now()}`,
              createdAt: new Date()
            }
          }
        }
      });

      return {
        id: `template_${Date.now()}`,
        ...templateData,
        createdAt: new Date(),
        isActive: true
      };
    } catch (error) {
      logger.error('Failed to create notification template', {
        templateData,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Create test notification
   */
  private async createTestNotification(userId: string, testData: any) {
    try {
      const notification = await notificationService.createNotification({
        recipientId: userId,
        type: testData.type || NotificationType.SYSTEM,
        priority: NotificationPriority.LOW,
        title: testData.title || 'Test Notification',
        content: testData.content || 'This is a test notification to verify your notification settings.',
        actionUrl: testData.actionUrl,
        data: { test: true }
      });

      return notification;
    } catch (error) {
      logger.error('Failed to create test notification', {
        userId,
        testData,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get notification analytics data
   */
  private async getNotificationAnalyticsData(filters: any) {
    try {
      const { startDate, endDate, groupBy, types, channels } = filters;

      // Build where clause
      const where: any = {};

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt.gte = new Date(startDate);
        }
        if (endDate) {
          where.createdAt.lte = new Date(endDate);
        }
      }

      if (types && types.length > 0) {
        where.type = { in: types };
      }

      // Get total counts
      const totalSent = await prisma.notification.count({ where });
      const totalRead = await prisma.notification.count({
        where: { ...where, isRead: true }
      });

      // Calculate rates
      const readRate = totalSent > 0 ? (totalRead / totalSent) * 100 : 0;

      // Get type breakdown
      const typeBreakdown = await prisma.notification.groupBy({
        by: ['type'],
        where,
        _count: {
          id: true
        }
      });

      // Get priority breakdown
      const priorityBreakdown = await prisma.notification.groupBy({
        by: ['priority'],
        where,
        _count: {
          id: true
        }
      });

      // Get daily stats (simplified)
      const dailyStats = await this.getDailyNotificationStats(where, groupBy);

      return {
        totalSent,
        totalDelivered: totalSent, // Assuming all are delivered for now
        totalRead,
        deliveryRate: 100, // Assuming 100% delivery rate
        readRate: Math.round(readRate * 100) / 100,
        channelBreakdown: {
          // This would require storing channel delivery info
          IN_APP: totalSent,
          EMAIL: 0,
          PUSH: 0
        },
        typeBreakdown: typeBreakdown.reduce((acc, item) => {
          acc[item.type] = item._count.id;
          return acc;
        }, {} as Record<string, number>),
        priorityBreakdown: priorityBreakdown.reduce((acc, item) => {
          acc[item.priority] = item._count.id;
          return acc;
        }, {} as Record<string, number>),
        dailyStats,
        topPerformers: []
      };
    } catch (error) {
      logger.error('Failed to get notification analytics', {
        filters,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get daily notification statistics
   */
  private async getDailyNotificationStats(where: any, _groupBy: string) {
    try {
      // This is a simplified version - in production you'd use proper date grouping
      const notifications = await prisma.notification.findMany({
        where,
        select: {
          createdAt: true,
          isRead: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 1000 // Limit for performance
      });

      // Group by date
      const dailyStats: Record<string, any> = {};

      notifications.forEach(notification => {
        const date = notification.createdAt.toISOString().split('T')[0];
        if (!dailyStats[date]) {
          dailyStats[date] = {
            date,
            sent: 0,
            read: 0
          };
        }
        dailyStats[date].sent++;
        if (notification.isRead) {
          dailyStats[date].read++;
        }
      });

      return Object.values(dailyStats);
    } catch (error) {
      logger.error('Failed to get daily notification stats', {
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  /**
   * Get user notification summary
   */
  private async getUserNotificationSummary(userId: string) {
    try {
      // Get total count
      const total = await prisma.notification.count({
        where: { userId }
      });

      // Get unread count
      const unread = await prisma.notification.count({
        where: { userId, isRead: false }
      });

      // Get breakdown by type
      const byType = await prisma.notification.groupBy({
        by: ['type'],
        where: { userId },
        _count: {
          id: true
        }
      });

      // Get breakdown by priority
      const byPriority = await prisma.notification.groupBy({
        by: ['priority'],
        where: { userId },
        _count: {
          id: true
        }
      });

      // Get recent notifications
      const recent = await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          type: true,
          title: true,
          content: true,
          isRead: true,
          createdAt: true
        }
      });

      // Get preferences summary
      const preferences = await notificationService.getUserPreferences(userId);

      return {
        total,
        unread,
        byType: byType.reduce((acc, item) => {
          acc[item.type] = item._count.id;
          return acc;
        }, {} as Record<string, number>),
        byPriority: byPriority.reduce((acc, item) => {
          acc[item.priority] = item._count.id;
          return acc;
        }, {} as Record<string, number>),
        recent,
        preferencesSummary: {
          emailEnabled: preferences.email?.enabled || false,
          pushEnabled: preferences.push?.enabled || false,
          quietHoursEnabled: preferences.quietHours?.enabled || false,
          weeklyDigestEnabled: preferences.weeklyDigest?.enabled || false
        }
      };
    } catch (error) {
      logger.error('Failed to get user notification summary', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}

// Export singleton instance
export const notificationController = new NotificationController();
export default notificationController;