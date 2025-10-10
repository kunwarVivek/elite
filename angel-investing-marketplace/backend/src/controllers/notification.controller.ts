import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler.js';
import { sendSuccess } from '../utils/response.js';
import { logger } from '../config/logger.js';

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
  private async sendNotification(_notification: any) {
    // TODO: Send notification through various channels (email, push, SMS, in-app)
    // This would integrate with email service, push notification service, etc.
  }

  // Database operations (these would typically be in a service layer)
  private async findNotificationById(_id: string): Promise<any | null> {
    // TODO: Implement database query
    return null;
  }

  private async findUserById(_id: string) {
    // TODO: Implement database query
    return null;
  }

  private async getNotificationsList(_userId: string, _filters: any) {
    // TODO: Implement database query with filters
    return {
      notifications: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      },
      unreadCount: 0,
    };
  }

  private async markNotificationAsRead(_notificationId: string, _userId: string) {
    // TODO: Implement database update
  }

  private async markNotificationsAsRead(_notificationIds: string[], _userId: string) {
    // TODO: Implement database update
  }

  private async markAllNotificationsAsRead(_userId: string, _beforeDate?: string): Promise<number> {
    // TODO: Implement database update
    return 0;
  }

  private async deleteNotificationFromDb(_id: string) {
    // TODO: Implement database delete
  }

  private async performBulkNotificationAction(notificationIds: string[], _action: string, _userId: string) {
    // TODO: Implement bulk operations
    return {
      affectedCount: notificationIds.length,
    };
  }

  private async getUserNotificationPreferences(_userId: string) {
    // TODO: Implement database query
    return {
      email: { enabled: true, frequency: 'IMMEDIATE', types: [] },
      push: { enabled: true, types: [] },
      sms: { enabled: false, types: [] },
      inApp: { enabled: true, showBadge: true, soundEnabled: true, types: [] },
      quietHours: { enabled: false },
      weeklyDigest: { enabled: true, dayOfWeek: 1, time: '09:00' },
      updatedAt: new Date(),
    };
  }

  private async updateUserNotificationPreferences(_userId: string, _preferences: NotificationPreferencesData) {
    // TODO: Implement database update
  }

  private async createNotificationInDb(notificationData: any) {
    // TODO: Implement database insert
    return {
      id: 'notification_123',
      ...notificationData,
      createdAt: new Date(),
    };
  }

  private async createNotificationTemplateInDb(templateData: any) {
    // TODO: Implement database insert
    return {
      id: 'template_123',
      ...templateData,
      createdAt: new Date(),
    };
  }

  private async createTestNotification(userId: string, testData: any) {
    // TODO: Create test notification
    return {
      id: 'test_notification_123',
      recipientId: userId,
      ...testData,
      createdAt: new Date(),
    };
  }

  private async getNotificationAnalyticsData(_filters: any) {
    // TODO: Calculate notification analytics
    return {
      totalSent: 0,
      totalDelivered: 0,
      totalRead: 0,
      deliveryRate: 0,
      readRate: 0,
      channelBreakdown: {},
      typeBreakdown: {},
      dailyStats: [],
      topPerformers: [],
    };
  }

  private async getUserNotificationSummary(_userId: string) {
    // TODO: Get notification summary for user
    return {
      total: 0,
      unread: 0,
      byType: {},
      byPriority: {},
      recent: [],
      preferencesSummary: {},
    };
  }
}

// Export singleton instance
export const notificationController = new NotificationController();
export default notificationController;