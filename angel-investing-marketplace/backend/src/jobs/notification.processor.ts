import { Job } from 'bullmq';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { getSocketService } from '../services/socketService.js';

export interface NotificationJobData {
  userId: string;
  type: 'INVESTMENT_UPDATE' | 'PITCH_UPDATE' | 'PAYMENT_STATUS' | 'SYSTEM_ALERT' |
        'MENTION' | 'FOLLOW' | 'LIKE' | 'COMMENT' | 'ACHIEVEMENT' | 'REMINDER' |
        'SECURITY_ALERT' | 'MAINTENANCE' | 'FEATURE_ANNOUNCEMENT' | 'CUSTOM';
  title: string;
  message: string;
  data?: Record<string, any>;
  channels?: ('DATABASE' | 'WEBSOCKET' | 'EMAIL' | 'SMS' | 'PUSH')[];
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  scheduledFor?: Date;
  expiresAt?: Date;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export interface NotificationJobResult {
  success: boolean;
  notificationId?: string;
  channelsDelivered?: string[];
  error?: string;
  metadata?: Record<string, any>;
  processingTime?: number;
}

export class NotificationProcessor {
  static async process(job: Job<NotificationJobData>): Promise<NotificationJobResult> {
    const {
      userId,
      type,
      title,
      message,
      data = {},
      channels = ['DATABASE', 'WEBSOCKET'],
      priority = 'normal',
      actionUrl,
      metadata = {}
    } = job.data;

    const startTime = Date.now();

    logger.info('Processing notification job', {
      jobId: job.id,
      userId,
      type,
      title,
      channels,
      priority
    });

    try {
      // Create notification record in database
      const notification = await this.createNotificationRecord({
        jobId: job.id!,
        userId,
        type,
        title,
        message,
        data,
        priority,
        actionUrl,
        metadata,
        expiresAt: job.data.expiresAt
      });

      // Deliver notification through specified channels
      const deliveryResults = await this.deliverNotification(notification, channels);

      // Update notification with delivery status
      await this.updateNotificationDeliveryStatus(notification.id, deliveryResults);

      logger.info('Notification job completed successfully', {
        jobId: job.id,
        notificationId: notification.id,
        userId,
        type,
        channelsDelivered: deliveryResults.successful,
        processingTime: Date.now() - startTime
      });

      return {
        success: true,
        notificationId: notification.id,
        channelsDelivered: deliveryResults.successful,
        metadata: {
          type,
          priority,
          channels,
          deliveredAt: new Date().toISOString()
        },
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      logger.error('Notification job failed', {
        jobId: job.id,
        userId,
        type,
        error: error instanceof Error ? error.message : String(error)
      });

      throw error;
    }
  }

  private static async createNotificationRecord(data: {
    jobId: string;
    userId: string;
    type: string;
    title: string;
    message: string;
    data: Record<string, any>;
    priority: string;
    actionUrl?: string;
    metadata: Record<string, any>;
    expiresAt?: Date;
  }): Promise<any> {
    return await prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        data: data.data,
        priority: data.priority,
        actionUrl: data.actionUrl,
        metadata: data.metadata,
        expiresAt: data.expiresAt,
        status: 'PENDING',
        createdAt: new Date()
      }
    });
  }

  private static async deliverNotification(
    notification: any,
    channels: string[]
  ): Promise<{ successful: string[]; failed: string[]; errors: Record<string, string> }> {
    const results = {
      successful: [] as string[],
      failed: [] as string[],
      errors: {} as Record<string, string>
    };

    // Deliver through each channel
    for (const channel of channels) {
      try {
        await this.deliverThroughChannel(notification, channel);
        results.successful.push(channel);
      } catch (error) {
        results.failed.push(channel);
        results.errors[channel] = error instanceof Error ? error.message : String(error);
      }
    }

    return results;
  }

  private static async deliverThroughChannel(notification: any, channel: string): Promise<void> {
    switch (channel) {
      case 'DATABASE':
        await this.deliverDatabaseNotification(notification);
        break;
      case 'WEBSOCKET':
        await this.deliverWebSocketNotification(notification);
        break;
      case 'EMAIL':
        await this.deliverEmailNotification(notification);
        break;
      case 'SMS':
        await this.deliverSMSNotification(notification);
        break;
      case 'PUSH':
        await this.deliverPushNotification(notification);
        break;
      default:
        throw new Error(`Unknown notification channel: ${channel}`);
    }
  }

  private static async deliverDatabaseNotification(notification: any): Promise<void> {
    // Database delivery is already handled by creating the record
    // Just update the status
    await prisma.notification.update({
      where: { id: notification.id },
      data: {
        status: 'DELIVERED',
        deliveredAt: new Date(),
        channels: {
          push: 'DATABASE'
        }
      }
    });
  }

  private static async deliverWebSocketNotification(notification: any): Promise<void> {
    try {
      const socketService = getSocketService();
      if (!socketService) {
        throw new Error('Socket service not initialized');
      }

      // Send real-time notification to user
      await socketService.sendToUser(notification.userId, 'notification', {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        actionUrl: notification.actionUrl,
        priority: notification.priority,
        createdAt: notification.createdAt
      });

      // Update notification status
      await prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: 'DELIVERED',
          deliveredAt: new Date(),
          channels: {
            push: 'WEBSOCKET'
          }
        }
      });

    } catch (error) {
      logger.error('WebSocket notification delivery failed', {
        notificationId: notification.id,
        userId: notification.userId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  private static async deliverEmailNotification(notification: any): Promise<void> {
    try {
      // Get user email
      const user = await prisma.user.findUnique({
        where: { id: notification.userId },
        select: { email: true, name: true }
      });

      if (!user?.email) {
        throw new Error('User email not found');
      }

      // Queue email notification
      const { emailQueue } = await import('../config/queues.js');
      await emailQueue.add('notification-email', {
        to: user.email,
        subject: notification.title,
        template: this.getEmailTemplateForNotification(notification.type),
        data: {
          userName: user.name || 'User',
          title: notification.title,
          message: notification.message,
          actionUrl: notification.actionUrl,
          type: notification.type
        },
        priority: notification.priority === 'urgent' ? 'high' : 'normal'
      });

      // Update notification status
      await prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: 'DELIVERED',
          deliveredAt: new Date(),
          channels: {
            push: 'EMAIL'
          }
        }
      });

    } catch (error) {
      logger.error('Email notification delivery failed', {
        notificationId: notification.id,
        userId: notification.userId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  private static async deliverSMSNotification(notification: any): Promise<void> {
    try {
      // Get user phone number
      const user = await prisma.user.findUnique({
        where: { id: notification.userId },
        select: { phoneNumber: true, name: true }
      });

      if (!user?.phoneNumber) {
        throw new Error('User phone number not found');
      }

      // Queue SMS notification (implement SMS service integration)
      logger.info('SMS notification queued', {
        notificationId: notification.id,
        userId: notification.userId,
        phoneNumber: user.phoneNumber
      });

      // Update notification status
      await prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: 'DELIVERED',
          deliveredAt: new Date(),
          channels: {
            push: 'SMS'
          }
        }
      });

    } catch (error) {
      logger.error('SMS notification delivery failed', {
        notificationId: notification.id,
        userId: notification.userId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  private static async deliverPushNotification(notification: any): Promise<void> {
    try {
      // Get user push tokens
      const pushTokens = await prisma.pushToken.findMany({
        where: { userId: notification.userId, active: true }
      });

      if (pushTokens.length === 0) {
        throw new Error('No active push tokens found for user');
      }

      // Queue push notifications (implement push service integration)
      logger.info('Push notification queued', {
        notificationId: notification.id,
        userId: notification.userId,
        tokenCount: pushTokens.length
      });

      // Update notification status
      await prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: 'DELIVERED',
          deliveredAt: new Date(),
          channels: {
            push: 'PUSH'
          }
        }
      });

    } catch (error) {
      logger.error('Push notification delivery failed', {
        notificationId: notification.id,
        userId: notification.userId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  private static async updateNotificationDeliveryStatus(
    notificationId: string,
    deliveryResults: { successful: string[]; failed: string[]; errors: Record<string, string> }
  ): Promise<void> {
    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: deliveryResults.failed.length === 0 ? 'DELIVERED' : 'PARTIALLY_DELIVERED',
        deliveredAt: new Date(),
        deliveryMetadata: {
          successfulChannels: deliveryResults.successful,
          failedChannels: deliveryResults.failed,
          errors: deliveryResults.errors,
          deliveredAt: new Date().toISOString()
        }
      }
    });
  }

  private static getEmailTemplateForNotification(type: string): string {
    const templateMap: Record<string, string> = {
      'INVESTMENT_UPDATE': 'investmentNotification',
      'PITCH_UPDATE': 'pitchNotification',
      'PAYMENT_STATUS': 'paymentNotification',
      'SYSTEM_ALERT': 'systemAlert',
      'SECURITY_ALERT': 'securityAlert',
      'ACHIEVEMENT': 'achievementNotification',
      'REMINDER': 'reminderNotification',
      'FEATURE_ANNOUNCEMENT': 'featureAnnouncement'
    };

    return templateMap[type] || 'generalNotification';
  }

  // Queue notification job
  static async queueNotification(
    userId: string,
    type: NotificationJobData['type'],
    title: string,
    message: string,
    options: {
      data?: Record<string, any>;
      channels?: NotificationJobData['channels'];
      priority?: NotificationJobData['priority'];
      scheduledFor?: Date;
      expiresAt?: Date;
      actionUrl?: string;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<void> {
    const { notificationQueue } = await import('../config/queues.js');

    await notificationQueue.add('send-notification', {
      userId,
      type,
      title,
      message,
      data: options.data,
      channels: options.channels,
      priority: options.priority,
      scheduledFor: options.scheduledFor,
      expiresAt: options.expiresAt,
      actionUrl: options.actionUrl,
      metadata: options.metadata,
      queuedAt: new Date().toISOString()
    });

    logger.info('Notification queued', {
      userId,
      type,
      title,
      channels: options.channels,
      priority: options.priority
    });
  }

  // Send immediate notification
  static async sendNotification(
    userId: string,
    type: NotificationJobData['type'],
    title: string,
    message: string,
    options: Parameters<typeof NotificationProcessor.queueNotification>[4] = {}
  ): Promise<NotificationJobResult> {
    const { notificationQueue } = await import('../config/queues.js');

    const job = await notificationQueue.add('immediate-notification', {
      userId,
      type,
      title,
      message,
      data: options.data,
      channels: options.channels,
      priority: options.priority,
      actionUrl: options.actionUrl,
      metadata: options.metadata,
      queuedAt: new Date().toISOString()
    });

    logger.info('Immediate notification queued', {
      jobId: job.id,
      userId,
      type,
      title
    });

    // Wait for completion
    const result = await job.waitUntilFinished(notificationQueue.opts);

    return result as NotificationJobResult;
  }

  // Send notification to multiple users
  static async sendBulkNotification(
    userIds: string[],
    type: NotificationJobData['type'],
    title: string,
    message: string,
    options: Parameters<typeof NotificationProcessor.queueNotification>[4] = {}
  ): Promise<void> {
    const { notificationQueue } = await import('../config/queues.js');

    // Add batch notification job
    const batchJob = await notificationQueue.add('bulk-notification', {
      userIds,
      type,
      title,
      message,
      data: options.data,
      channels: options.channels,
      priority: options.priority,
      scheduledFor: options.scheduledFor,
      expiresAt: options.expiresAt,
      actionUrl: options.actionUrl,
      metadata: {
        ...options.metadata,
        isBulk: true,
        totalUsers: userIds.length
      },
      queuedAt: new Date().toISOString()
    });

    // Add individual notification jobs as children
    const childJobs = await Promise.all(
      userIds.map(userId =>
        notificationQueue.add('send-notification', {
          userId,
          type,
          title,
          message,
          data: options.data,
          channels: options.channels,
          priority: options.priority,
          scheduledFor: options.scheduledFor,
          expiresAt: options.expiresAt,
          actionUrl: options.actionUrl,
          metadata: {
            ...options.metadata,
            parentJobId: batchJob.id
          },
          queuedAt: new Date().toISOString()
        })
      )
    );

    logger.info('Bulk notification queued', {
      batchJobId: batchJob.id,
      userCount: userIds.length,
      type,
      title,
      childJobIds: childJobs.map(job => job.id)
    });
  }

  // Mark notifications as read
  static async markAsRead(userId: string, notificationIds: string[]): Promise<void> {
    await prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
        userId
      },
      data: {
        read: true,
        readAt: new Date()
      }
    });

    logger.info('Notifications marked as read', {
      userId,
      notificationCount: notificationIds.length
    });
  }

  // Get user notifications
  static async getUserNotifications(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
      type?: string;
    } = {}
  ): Promise<any[]> {
    const { limit = 50, offset = 0, unreadOnly = false, type } = options;

    return await prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly && { read: false }),
        ...(type && { type }),
        expiresAt: { gte: new Date() }
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ],
      take: limit,
      skip: offset
    });
  }

  // Clean up expired notifications
  static async cleanupExpiredNotifications(): Promise<number> {
    const result = await prisma.notification.deleteMany({
      where: {
        expiresAt: { lt: new Date() }
      }
    });

    logger.info('Expired notifications cleaned up', {
      deletedCount: result.count
    });

    return result.count;
  }
}

export default NotificationProcessor;