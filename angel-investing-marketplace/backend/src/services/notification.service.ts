import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { emailService } from './email.service.js';
import { getEnhancedWebSocketService, WebSocketEvents } from './websocket.service.js';
import { NotificationType, NotificationPriority, Prisma } from '@prisma/client';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface NotificationData {
  recipientId: string;
  type: NotificationType;
  priority?: NotificationPriority;
  title: string;
  content: string;
  actionUrl?: string;
  data?: Record<string, any>;
  metadata?: Record<string, any>;
  channels?: NotificationChannel[];
  scheduledFor?: Date;
  expiresAt?: Date;
}

export enum NotificationChannel {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
  PUSH = 'PUSH',
  SMS = 'SMS'
}

export interface NotificationPreferences {
  email?: {
    enabled: boolean;
    frequency: 'IMMEDIATE' | 'DAILY' | 'WEEKLY';
    types: NotificationType[];
  };
  push?: {
    enabled: boolean;
    types: NotificationType[];
  };
  sms?: {
    enabled: boolean;
    types: NotificationType[];
  };
  inApp?: {
    enabled: boolean;
    showBadge: boolean;
    soundEnabled: boolean;
    types: NotificationType[];
  };
  quietHours?: {
    enabled: boolean;
    startTime?: string;
    endTime?: string;
    timezone?: string;
    daysOfWeek?: number[];
  };
  weeklyDigest?: {
    enabled: boolean;
    dayOfWeek?: number;
    time?: string;
    includePortfolio?: boolean;
    includeMarketNews?: boolean;
  };
}

export interface NotificationTemplate {
  type: NotificationType;
  priority: NotificationPriority;
  titleTemplate: string;
  contentTemplate: string;
  emailTemplate?: string;
  actionUrlTemplate?: string;
}

export interface BulkNotificationData {
  recipients: string[];
  type: NotificationType;
  priority?: NotificationPriority;
  titleTemplate: string;
  contentTemplate: string;
  actionUrlTemplate?: string;
  data?: Record<string, any>;
  channels?: NotificationChannel[];
}

// ============================================================================
// NOTIFICATION TEMPLATES
// ============================================================================

const NOTIFICATION_TEMPLATES: Record<NotificationType, NotificationTemplate> = {
  INVESTMENT_UPDATE: {
    type: 'INVESTMENT_UPDATE',
    priority: 'MEDIUM',
    titleTemplate: 'Investment Update: {{startupName}}',
    contentTemplate: '{{updateMessage}}',
    emailTemplate: 'investment-update',
    actionUrlTemplate: '/investments/{{investmentId}}'
  },
  INVESTMENT: {
    type: 'INVESTMENT',
    priority: 'HIGH',
    titleTemplate: 'New Investment Opportunity',
    contentTemplate: '{{message}}',
    emailTemplate: 'investment',
    actionUrlTemplate: '/startups/{{startupId}}'
  },
  MESSAGE: {
    type: 'MESSAGE',
    priority: 'MEDIUM',
    titleTemplate: 'New Message from {{senderName}}',
    contentTemplate: '{{messagePreview}}',
    emailTemplate: 'message',
    actionUrlTemplate: '/messages/{{conversationId}}'
  },
  PITCH_UPDATE: {
    type: 'PITCH_UPDATE',
    priority: 'MEDIUM',
    titleTemplate: 'Pitch Update: {{pitchName}}',
    contentTemplate: '{{updateMessage}}',
    emailTemplate: 'pitch-update',
    actionUrlTemplate: '/pitches/{{pitchId}}'
  },
  PITCH: {
    type: 'PITCH',
    priority: 'HIGH',
    titleTemplate: 'New Pitch Available',
    contentTemplate: '{{message}}',
    emailTemplate: 'pitch',
    actionUrlTemplate: '/pitches/{{pitchId}}'
  },
  SYNDICATE: {
    type: 'SYNDICATE',
    priority: 'MEDIUM',
    titleTemplate: 'Syndicate Update: {{syndicateName}}',
    contentTemplate: '{{message}}',
    emailTemplate: 'syndicate',
    actionUrlTemplate: '/syndicates/{{syndicateId}}'
  },
  SYSTEM: {
    type: 'SYSTEM',
    priority: 'LOW',
    titleTemplate: 'System Announcement',
    contentTemplate: '{{message}}',
    emailTemplate: 'system',
    actionUrlTemplate: '{{actionUrl}}'
  },
  PAYMENT: {
    type: 'PAYMENT',
    priority: 'HIGH',
    titleTemplate: 'Payment {{status}}',
    contentTemplate: '{{message}}',
    emailTemplate: 'payment',
    actionUrlTemplate: '/payments/{{paymentId}}'
  },
  BOARD_MEETING: {
    type: 'BOARD_MEETING',
    priority: 'MEDIUM',
    titleTemplate: 'Board Meeting: {{meetingTitle}}',
    contentTemplate: '{{message}}',
    emailTemplate: 'board-meeting',
    actionUrlTemplate: '/board/meetings/{{meetingId}}'
  }
};

// ============================================================================
// DEFAULT NOTIFICATION PREFERENCES
// ============================================================================

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  email: {
    enabled: true,
    frequency: 'IMMEDIATE',
    types: []
  },
  push: {
    enabled: true,
    types: []
  },
  sms: {
    enabled: false,
    types: []
  },
  inApp: {
    enabled: true,
    showBadge: true,
    soundEnabled: true,
    types: []
  },
  quietHours: {
    enabled: false,
    startTime: '22:00',
    endTime: '08:00',
    timezone: 'UTC',
    daysOfWeek: []
  },
  weeklyDigest: {
    enabled: true,
    dayOfWeek: 1,
    time: '09:00',
    includePortfolio: true,
    includeMarketNews: true
  }
};

// ============================================================================
// NOTIFICATION SERVICE CLASS
// ============================================================================

export class NotificationService {
  /**
   * Create and send a notification
   */
  async createNotification(data: NotificationData): Promise<any> {
    try {
      // Get user preferences
      const preferences = await this.getUserPreferences(data.recipientId);

      // Check if user wants this type of notification
      if (!this.shouldSendNotification(data, preferences)) {
        logger.debug('Notification blocked by user preferences', {
          recipientId: data.recipientId,
          type: data.type
        });
        return null;
      }

      // Check for duplicates
      const isDuplicate = await this.checkDuplicate(data);
      if (isDuplicate) {
        logger.debug('Duplicate notification detected, skipping', {
          recipientId: data.recipientId,
          type: data.type
        });
        return null;
      }

      // Determine priority
      const priority = data.priority || NOTIFICATION_TEMPLATES[data.type]?.priority || 'MEDIUM';

      // Create notification in database
      const notification = await prisma.notification.create({
        data: {
          userId: data.recipientId,
          type: data.type,
          priority,
          title: data.title,
          content: data.content,
          actionUrl: data.actionUrl,
          data: data.data as Prisma.JsonObject,
          metadata: data.metadata as Prisma.JsonObject,
          expiresAt: data.expiresAt,
          isRead: false
        }
      });

      logger.info('Notification created', {
        id: notification.id,
        recipientId: data.recipientId,
        type: data.type,
        priority
      });

      // Send notification through configured channels
      await this.deliverNotification(notification, preferences, data.channels);

      return notification;
    } catch (error) {
      logger.error('Failed to create notification', {
        error: error instanceof Error ? error.message : String(error),
        data
      });
      throw error;
    }
  }

  /**
   * Create notification from template
   */
  async createFromTemplate(
    recipientId: string,
    type: NotificationType,
    templateData: Record<string, any>,
    options?: {
      priority?: NotificationPriority;
      channels?: NotificationChannel[];
      expiresAt?: Date;
    }
  ): Promise<any> {
    const template = NOTIFICATION_TEMPLATES[type];
    if (!template) {
      throw new Error(`Template not found for notification type: ${type}`);
    }

    const title = this.interpolateTemplate(template.titleTemplate, templateData);
    const content = this.interpolateTemplate(template.contentTemplate, templateData);
    const actionUrl = template.actionUrlTemplate
      ? this.interpolateTemplate(template.actionUrlTemplate, templateData)
      : undefined;

    return this.createNotification({
      recipientId,
      type,
      priority: options?.priority || template.priority,
      title,
      content,
      actionUrl,
      data: templateData,
      channels: options?.channels,
      expiresAt: options?.expiresAt
    });
  }

  /**
   * Send bulk notifications
   */
  async createBulkNotifications(data: BulkNotificationData): Promise<any[]> {
    const notifications: any[] = [];

    for (const recipientId of data.recipients) {
      try {
        const notification = await this.createFromTemplate(
          recipientId,
          data.type,
          data.data || {},
          {
            priority: data.priority,
            channels: data.channels
          }
        );

        if (notification) {
          notifications.push(notification);
        }
      } catch (error) {
        logger.error('Failed to create bulk notification for user', {
          recipientId,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    logger.info('Bulk notifications created', {
      total: data.recipients.length,
      successful: notifications.length,
      failed: data.recipients.length - notifications.length
    });

    return notifications;
  }

  /**
   * Deliver notification through multiple channels
   */
  private async deliverNotification(
    notification: any,
    preferences: NotificationPreferences,
    requestedChannels?: NotificationChannel[]
  ): Promise<void> {
    const channels = requestedChannels || this.getDefaultChannels(notification.priority);

    // In-App Notification (always deliver if enabled)
    if (
      channels.includes(NotificationChannel.IN_APP) &&
      preferences.inApp?.enabled !== false
    ) {
      await this.deliverInApp(notification);
    }

    // Email Notification
    if (
      channels.includes(NotificationChannel.EMAIL) &&
      preferences.email?.enabled &&
      this.shouldSendEmail(notification, preferences)
    ) {
      await this.deliverEmail(notification);
    }

    // Push Notification
    if (
      channels.includes(NotificationChannel.PUSH) &&
      preferences.push?.enabled
    ) {
      await this.deliverPush(notification);
    }

    // SMS Notification
    if (
      channels.includes(NotificationChannel.SMS) &&
      preferences.sms?.enabled
    ) {
      await this.deliverSMS(notification);
    }
  }

  /**
   * Deliver in-app notification via WebSocket
   */
  private async deliverInApp(notification: any): Promise<void> {
    try {
      const wsService = getEnhancedWebSocketService();
      if (!wsService) {
        logger.warn('WebSocket service not available, skipping in-app notification');
        return;
      }

      await wsService.sendToUser(notification.userId, WebSocketEvents.NOTIFICATION, {
        id: notification.id,
        type: notification.type,
        priority: notification.priority,
        title: notification.title,
        content: notification.content,
        actionUrl: notification.actionUrl,
        data: notification.data,
        isRead: notification.isRead,
        createdAt: notification.createdAt
      });

      logger.debug('In-app notification delivered', {
        notificationId: notification.id,
        userId: notification.userId
      });
    } catch (error) {
      logger.error('Failed to deliver in-app notification', {
        notificationId: notification.id,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Deliver email notification
   */
  private async deliverEmail(notification: any): Promise<void> {
    try {
      // Get user email
      const user = await prisma.user.findUnique({
        where: { id: notification.userId },
        select: { email: true, name: true }
      });

      if (!user) {
        logger.warn('User not found for email notification', {
          userId: notification.userId
        });
        return;
      }

      const template = NOTIFICATION_TEMPLATES[notification.type as NotificationType];
      const emailHtml = this.generateEmailHtml(notification, user.name);

      await emailService.sendEmail({
        to: [user.email],
        subject: notification.title,
        html: emailHtml,
        priority: notification.priority === 'HIGH' ? 'high' : 'normal'
      });

      logger.debug('Email notification delivered', {
        notificationId: notification.id,
        userId: notification.userId,
        email: user.email
      });
    } catch (error) {
      logger.error('Failed to deliver email notification', {
        notificationId: notification.id,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Deliver push notification
   */
  private async deliverPush(notification: any): Promise<void> {
    // TODO: Implement push notification delivery
    // This would integrate with Firebase Cloud Messaging, OneSignal, or similar service
    logger.debug('Push notification delivery not yet implemented', {
      notificationId: notification.id,
      userId: notification.userId
    });

    // Store notification in metadata for future push delivery
    await prisma.notification.update({
      where: { id: notification.id },
      data: {
        metadata: {
          ...(notification.metadata as any || {}),
          pushQueued: true,
          pushQueuedAt: new Date().toISOString()
        } as Prisma.JsonObject
      }
    });
  }

  /**
   * Deliver SMS notification
   */
  private async deliverSMS(notification: any): Promise<void> {
    // TODO: Implement SMS notification delivery
    // This would integrate with Twilio, SNS, or similar service
    logger.debug('SMS notification delivery not yet implemented', {
      notificationId: notification.id,
      userId: notification.userId
    });
  }

  /**
   * Get user notification preferences
   */
  async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { profileData: true }
      });

      if (!user || !user.profileData) {
        return DEFAULT_NOTIFICATION_PREFERENCES;
      }

      const profileData = user.profileData as any;
      const preferences = profileData.notificationPreferences || DEFAULT_NOTIFICATION_PREFERENCES;

      // Merge with defaults to ensure all fields are present
      return {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        ...preferences,
        email: { ...DEFAULT_NOTIFICATION_PREFERENCES.email, ...preferences.email },
        push: { ...DEFAULT_NOTIFICATION_PREFERENCES.push, ...preferences.push },
        sms: { ...DEFAULT_NOTIFICATION_PREFERENCES.sms, ...preferences.sms },
        inApp: { ...DEFAULT_NOTIFICATION_PREFERENCES.inApp, ...preferences.inApp },
        quietHours: { ...DEFAULT_NOTIFICATION_PREFERENCES.quietHours, ...preferences.quietHours },
        weeklyDigest: { ...DEFAULT_NOTIFICATION_PREFERENCES.weeklyDigest, ...preferences.weeklyDigest }
      };
    } catch (error) {
      logger.error('Failed to get user notification preferences', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      return DEFAULT_NOTIFICATION_PREFERENCES;
    }
  }

  /**
   * Update user notification preferences
   */
  async updateUserPreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<void> {
    try {
      const currentPreferences = await this.getUserPreferences(userId);
      const updatedPreferences = {
        ...currentPreferences,
        ...preferences,
        email: { ...currentPreferences.email, ...preferences.email },
        push: { ...currentPreferences.push, ...preferences.push },
        sms: { ...currentPreferences.sms, ...preferences.sms },
        inApp: { ...currentPreferences.inApp, ...preferences.inApp },
        quietHours: { ...currentPreferences.quietHours, ...preferences.quietHours },
        weeklyDigest: { ...currentPreferences.weeklyDigest, ...preferences.weeklyDigest }
      };

      // Get current profileData
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { profileData: true }
      });

      const profileData = (user?.profileData as any) || {};

      await prisma.user.update({
        where: { id: userId },
        data: {
          profileData: {
            ...profileData,
            notificationPreferences: updatedPreferences
          } as Prisma.JsonObject
        }
      });

      logger.info('User notification preferences updated', { userId });
    } catch (error) {
      logger.error('Failed to update user notification preferences', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Check if notification should be sent based on preferences
   */
  private shouldSendNotification(
    data: NotificationData,
    preferences: NotificationPreferences
  ): boolean {
    // Check in-app preferences
    if (preferences.inApp?.enabled === false) {
      return false;
    }

    // Check if type is in disabled types
    if (preferences.inApp?.types && preferences.inApp.types.length > 0) {
      if (!preferences.inApp.types.includes(data.type)) {
        return false;
      }
    }

    // Check quiet hours
    if (preferences.quietHours?.enabled) {
      if (this.isQuietHours(preferences.quietHours)) {
        // Only block non-critical notifications during quiet hours
        if (data.priority !== 'HIGH') {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Check if should send email based on preferences
   */
  private shouldSendEmail(
    notification: any,
    preferences: NotificationPreferences
  ): boolean {
    if (!preferences.email?.enabled) {
      return false;
    }

    // Check if type is in disabled types
    if (preferences.email.types && preferences.email.types.length > 0) {
      if (!preferences.email.types.includes(notification.type)) {
        return false;
      }
    }

    // Check frequency (for IMMEDIATE only)
    if (preferences.email.frequency !== 'IMMEDIATE') {
      // For DAILY/WEEKLY, emails will be sent via digest
      return false;
    }

    // Always send HIGH priority emails
    if (notification.priority === 'HIGH') {
      return true;
    }

    return true;
  }

  /**
   * Check if current time is within quiet hours
   */
  private isQuietHours(quietHours: NotificationPreferences['quietHours']): boolean {
    if (!quietHours?.enabled || !quietHours.startTime || !quietHours.endTime) {
      return false;
    }

    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

    // Check if current day is in quiet days
    if (quietHours.daysOfWeek && quietHours.daysOfWeek.length > 0) {
      if (!quietHours.daysOfWeek.includes(currentDay)) {
        return false;
      }
    }

    // Check if current time is in quiet hours
    if (quietHours.startTime <= quietHours.endTime) {
      // Same day range (e.g., 09:00 - 17:00)
      return currentTime >= quietHours.startTime && currentTime <= quietHours.endTime;
    } else {
      // Overnight range (e.g., 22:00 - 08:00)
      return currentTime >= quietHours.startTime || currentTime <= quietHours.endTime;
    }
  }

  /**
   * Check for duplicate notifications
   */
  private async checkDuplicate(data: NotificationData): Promise<boolean> {
    try {
      // Check for similar notifications in the last 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      const existingNotification = await prisma.notification.findFirst({
        where: {
          userId: data.recipientId,
          type: data.type,
          title: data.title,
          createdAt: {
            gte: fiveMinutesAgo
          }
        }
      });

      return !!existingNotification;
    } catch (error) {
      logger.error('Failed to check duplicate notification', {
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * Get default channels based on priority
   */
  private getDefaultChannels(priority: NotificationPriority): NotificationChannel[] {
    switch (priority) {
      case 'HIGH':
        return [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.PUSH];
      case 'MEDIUM':
        return [NotificationChannel.IN_APP, NotificationChannel.EMAIL];
      case 'LOW':
        return [NotificationChannel.IN_APP];
      default:
        return [NotificationChannel.IN_APP];
    }
  }

  /**
   * Interpolate template with data
   */
  private interpolateTemplate(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? String(data[key]) : match;
    });
  }

  /**
   * Generate email HTML
   */
  private generateEmailHtml(notification: any, userName?: string | null): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${notification.title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 10px 10px 0 0;
      text-align: center;
    }
    .content {
      background: #f9fafb;
      padding: 30px;
      border-radius: 0 0 10px 10px;
    }
    .notification-type {
      display: inline-block;
      background: #667eea;
      color: white;
      padding: 5px 15px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
      margin-bottom: 15px;
    }
    .notification-content {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
      border-left: 4px solid #667eea;
    }
    .button {
      display: inline-block;
      background: #667eea;
      color: white;
      padding: 12px 30px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: bold;
      margin-top: 20px;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 14px;
    }
    .priority-high {
      border-left-color: #ef4444;
    }
    .priority-medium {
      border-left-color: #f59e0b;
    }
    .priority-low {
      border-left-color: #10b981;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Angel Investing Marketplace</h1>
  </div>
  <div class="content">
    ${userName ? `<p>Hi ${userName},</p>` : '<p>Hello,</p>'}

    <span class="notification-type">${this.formatNotificationType(notification.type)}</span>

    <div class="notification-content priority-${notification.priority.toLowerCase()}">
      <h2>${notification.title}</h2>
      <p>${notification.content}</p>
    </div>

    ${notification.actionUrl ? `
      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}${notification.actionUrl}" class="button">
        View Details
      </a>
    ` : ''}

    <div class="footer">
      <p>You received this email because you have notifications enabled.</p>
      <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/settings/notifications">Manage notification preferences</a></p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Format notification type for display
   */
  private formatNotificationType(type: NotificationType): string {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Get unread notification count for user
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      return await prisma.notification.count({
        where: {
          userId,
          isRead: false
        }
      });
    } catch (error) {
      logger.error('Failed to get unread notification count', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      return 0;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    try {
      await prisma.notification.updateMany({
        where: {
          id: notificationId,
          userId
        },
        data: {
          isRead: true,
          readAt: new Date()
        }
      });

      logger.debug('Notification marked as read', { notificationId, userId });
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
  async markMultipleAsRead(notificationIds: string[], userId: string): Promise<number> {
    try {
      const result = await prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
          userId
        },
        data: {
          isRead: true,
          readAt: new Date()
        }
      });

      logger.debug('Multiple notifications marked as read', {
        count: result.count,
        userId
      });

      return result.count;
    } catch (error) {
      logger.error('Failed to mark multiple notifications as read', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string, beforeDate?: Date): Promise<number> {
    try {
      const where: any = {
        userId,
        isRead: false
      };

      if (beforeDate) {
        where.createdAt = { lte: beforeDate };
      }

      const result = await prisma.notification.updateMany({
        where,
        data: {
          isRead: true,
          readAt: new Date()
        }
      });

      logger.info('All notifications marked as read', {
        count: result.count,
        userId,
        beforeDate
      });

      return result.count;
    } catch (error) {
      logger.error('Failed to mark all notifications as read', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    try {
      await prisma.notification.deleteMany({
        where: {
          id: notificationId,
          userId
        }
      });

      logger.debug('Notification deleted', { notificationId, userId });
    } catch (error) {
      logger.error('Failed to delete notification', {
        notificationId,
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Delete multiple notifications
   */
  async deleteMultiple(notificationIds: string[], userId: string): Promise<number> {
    try {
      const result = await prisma.notification.deleteMany({
        where: {
          id: { in: notificationIds },
          userId
        }
      });

      logger.debug('Multiple notifications deleted', {
        count: result.count,
        userId
      });

      return result.count;
    } catch (error) {
      logger.error('Failed to delete multiple notifications', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Delete all notifications for user
   */
  async deleteAll(userId: string): Promise<number> {
    try {
      const result = await prisma.notification.deleteMany({
        where: { userId }
      });

      logger.info('All notifications deleted', {
        count: result.count,
        userId
      });

      return result.count;
    } catch (error) {
      logger.error('Failed to delete all notifications', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Delete notifications by type
   */
  async deleteByType(userId: string, type: NotificationType): Promise<number> {
    try {
      const result = await prisma.notification.deleteMany({
        where: {
          userId,
          type
        }
      });

      logger.debug('Notifications deleted by type', {
        count: result.count,
        userId,
        type
      });

      return result.count;
    } catch (error) {
      logger.error('Failed to delete notifications by type', {
        userId,
        type,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  // ============================================================================
  // HELPER METHODS FOR CREATING SPECIFIC NOTIFICATION TYPES
  // ============================================================================

  /**
   * Create investment notification
   */
  async createInvestmentNotification(
    recipientId: string,
    data: {
      investmentId: string;
      startupId: string;
      startupName: string;
      amount: number;
      status: string;
      message?: string;
    }
  ): Promise<any> {
    return this.createFromTemplate(recipientId, NotificationType.INVESTMENT, {
      investmentId: data.investmentId,
      startupId: data.startupId,
      startupName: data.startupName,
      amount: data.amount,
      status: data.status,
      message: data.message || `Investment of $${data.amount.toLocaleString()} in ${data.startupName}`
    }, {
      priority: NotificationPriority.HIGH
    });
  }

  /**
   * Create investment update notification
   */
  async createInvestmentUpdateNotification(
    recipientId: string,
    data: {
      investmentId: string;
      startupName: string;
      updateMessage: string;
      updateType?: string;
    }
  ): Promise<any> {
    return this.createFromTemplate(recipientId, NotificationType.INVESTMENT_UPDATE, {
      investmentId: data.investmentId,
      startupName: data.startupName,
      updateMessage: data.updateMessage,
      updateType: data.updateType || 'general'
    }, {
      priority: NotificationPriority.MEDIUM
    });
  }

  /**
   * Create pitch notification
   */
  async createPitchNotification(
    recipientId: string,
    data: {
      pitchId: string;
      pitchName: string;
      startupName: string;
      message: string;
    }
  ): Promise<any> {
    return this.createFromTemplate(recipientId, NotificationType.PITCH, {
      pitchId: data.pitchId,
      pitchName: data.pitchName,
      startupName: data.startupName,
      message: data.message
    }, {
      priority: NotificationPriority.HIGH
    });
  }

  /**
   * Create pitch update notification
   */
  async createPitchUpdateNotification(
    recipientId: string,
    data: {
      pitchId: string;
      pitchName: string;
      updateMessage: string;
    }
  ): Promise<any> {
    return this.createFromTemplate(recipientId, NotificationType.PITCH_UPDATE, {
      pitchId: data.pitchId,
      pitchName: data.pitchName,
      updateMessage: data.updateMessage
    }, {
      priority: NotificationPriority.MEDIUM
    });
  }

  /**
   * Create message notification
   */
  async createMessageNotification(
    recipientId: string,
    data: {
      conversationId: string;
      senderId: string;
      senderName: string;
      messagePreview: string;
    }
  ): Promise<any> {
    return this.createFromTemplate(recipientId, NotificationType.MESSAGE, {
      conversationId: data.conversationId,
      senderId: data.senderId,
      senderName: data.senderName,
      messagePreview: data.messagePreview
    }, {
      priority: NotificationPriority.MEDIUM
    });
  }

  /**
   * Create payment notification
   */
  async createPaymentNotification(
    recipientId: string,
    data: {
      paymentId: string;
      amount: number;
      status: string;
      message: string;
    }
  ): Promise<any> {
    return this.createFromTemplate(recipientId, NotificationType.PAYMENT, {
      paymentId: data.paymentId,
      amount: data.amount,
      status: data.status,
      message: data.message
    }, {
      priority: NotificationPriority.HIGH
    });
  }

  /**
   * Create syndicate notification
   */
  async createSyndicateNotification(
    recipientId: string,
    data: {
      syndicateId: string;
      syndicateName: string;
      message: string;
    }
  ): Promise<any> {
    return this.createFromTemplate(recipientId, NotificationType.SYNDICATE, {
      syndicateId: data.syndicateId,
      syndicateName: data.syndicateName,
      message: data.message
    }, {
      priority: NotificationPriority.MEDIUM
    });
  }

  /**
   * Create system notification
   */
  async createSystemNotification(
    recipientId: string,
    data: {
      message: string;
      actionUrl?: string;
      priority?: NotificationPriority;
    }
  ): Promise<any> {
    return this.createFromTemplate(recipientId, NotificationType.SYSTEM, {
      message: data.message,
      actionUrl: data.actionUrl || ''
    }, {
      priority: data.priority || NotificationPriority.LOW
    });
  }

  /**
   * Broadcast system notification to all users
   */
  async broadcastSystemNotification(
    data: {
      message: string;
      actionUrl?: string;
      priority?: NotificationPriority;
      filters?: {
        role?: string[];
        isActive?: boolean;
      };
    }
  ): Promise<any[]> {
    try {
      // Get all users matching filters
      const where: any = {};

      if (data.filters?.role) {
        where.role = { in: data.filters.role };
      }

      if (data.filters?.isActive !== undefined) {
        where.isActive = data.filters.isActive;
      }

      const users = await prisma.user.findMany({
        where,
        select: { id: true }
      });

      const recipientIds = users.map(u => u.id);

      logger.info('Broadcasting system notification', {
        recipientCount: recipientIds.length,
        filters: data.filters
      });

      return this.createBulkNotifications({
        recipients: recipientIds,
        type: NotificationType.SYSTEM,
        priority: data.priority || NotificationPriority.LOW,
        titleTemplate: 'System Announcement',
        contentTemplate: data.message,
        actionUrlTemplate: data.actionUrl,
        data: { message: data.message, actionUrl: data.actionUrl }
      });
    } catch (error) {
      logger.error('Failed to broadcast system notification', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Clean up expired notifications
   */
  async cleanupExpiredNotifications(): Promise<number> {
    try {
      const result = await prisma.notification.deleteMany({
        where: {
          expiresAt: {
            lte: new Date()
          }
        }
      });

      logger.info('Expired notifications cleaned up', {
        count: result.count
      });

      return result.count;
    } catch (error) {
      logger.error('Failed to cleanup expired notifications', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(userId?: string): Promise<any> {
    try {
      const where: any = userId ? { userId } : {};

      const total = await prisma.notification.count({ where });
      const unread = await prisma.notification.count({
        where: { ...where, isRead: false }
      });
      const read = await prisma.notification.count({
        where: { ...where, isRead: true }
      });

      const byType = await prisma.notification.groupBy({
        by: ['type'],
        where,
        _count: { id: true }
      });

      const byPriority = await prisma.notification.groupBy({
        by: ['priority'],
        where,
        _count: { id: true }
      });

      return {
        total,
        unread,
        read,
        readRate: total > 0 ? (read / total) * 100 : 0,
        byType: byType.reduce((acc, item) => {
          acc[item.type] = item._count.id;
          return acc;
        }, {} as Record<string, number>),
        byPriority: byPriority.reduce((acc, item) => {
          acc[item.priority] = item._count.id;
          return acc;
        }, {} as Record<string, number>)
      };
    } catch (error) {
      logger.error('Failed to get notification stats', {
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;
