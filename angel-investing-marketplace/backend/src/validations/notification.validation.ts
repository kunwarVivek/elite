import { z } from 'zod';

// Base schemas
export const notificationIdSchema = z.string().min(1, 'Notification ID is required');

// Notification type enum
export const notificationTypeSchema = z.enum([
  // Investment related
  'INVESTMENT_UPDATE',
  'INVESTMENT_COMPLETED',
  'INVESTMENT_CANCELLED',
  'INVESTMENT_OVERDUE',
  'PAYMENT_RECEIVED',
  'PAYMENT_FAILED',

  // Pitch related
  'PITCH_PUBLISHED',
  'PITCH_FUNDED',
  'PITCH_UPDATED',
  'PITCH_COMMENT',
  'PITCH_MILESTONE',

  // Syndicate related
  'SYNDICATE_INVITATION',
  'SYNDICATE_JOINED',
  'SYNDICATE_DEAL',
  'SYNDICATE_UPDATE',

  // User related
  'KYC_APPROVED',
  'KYC_REJECTED',
  'ACCREDITATION_APPROVED',
  'ACCREDITATION_REJECTED',
  'PROFILE_VERIFIED',

  // Document related
  'DOCUMENT_SHARED',
  'DOCUMENT_SIGNED',
  'DOCUMENT_EXPIRED',

  // Message related
  'NEW_MESSAGE',
  'MESSAGE_REPLY',

  // System related
  'SYSTEM_ANNOUNCEMENT',
  'MAINTENANCE_SCHEDULED',
  'SECURITY_ALERT',

  // Portfolio related
  'PORTFOLIO_UPDATE',
  'EXIT_OPPORTUNITY',
  'PERFORMANCE_MILESTONE'
]);

// Notification priority enum
export const notificationPrioritySchema = z.enum([
  'LOW',
  'MEDIUM',
  'HIGH',
  'URGENT'
]);

// Notification channel enum
export const notificationChannelSchema = z.enum([
  'IN_APP',
  'EMAIL',
  'SMS',
  'PUSH'
]);

// Mark notification as read schema
export const markNotificationReadSchema = z.object({
  notificationIds: z.array(notificationIdSchema).min(1, 'At least one notification ID is required'),
});

// Mark all notifications as read schema
export const markAllNotificationsReadSchema = z.object({
  beforeDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
});

// Notification list query schema
export const notificationListQuerySchema = z.object({
  isRead: z.boolean().optional(),
  type: notificationTypeSchema.optional(),
  priority: notificationPrioritySchema.optional(),
  channel: notificationChannelSchema.optional(),
  search: z.string().max(100, 'Search term too long').optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  page: z.number().min(1, 'Page must be positive').default(1),
  limit: z.number().min(1, 'Limit must be positive').max(100, 'Limit cannot exceed 100').default(20),
  sortBy: z.enum(['createdAt', 'priority', 'type', 'isRead']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Notification preferences schema
export const notificationPreferencesSchema = z.object({
  // Email preferences
  email: z.object({
    enabled: z.boolean().default(true),
    frequency: z.enum(['IMMEDIATE', 'DAILY', 'WEEKLY']).default('IMMEDIATE'),
    types: z.array(notificationTypeSchema).default([
      'INVESTMENT_UPDATE',
      'INVESTMENT_COMPLETED',
      'KYC_APPROVED',
      'ACCREDITATION_APPROVED',
      'SYSTEM_ANNOUNCEMENT'
    ]),
  }),

  // Push notification preferences
  push: z.object({
    enabled: z.boolean().default(true),
    types: z.array(notificationTypeSchema).default([
      'NEW_MESSAGE',
      'INVESTMENT_UPDATE',
      'PITCH_PUBLISHED'
    ]),
  }),

  // SMS preferences
  sms: z.object({
    enabled: z.boolean().default(false),
    types: z.array(notificationTypeSchema).default([
      'INVESTMENT_COMPLETED',
      'KYC_APPROVED',
      'SECURITY_ALERT'
    ]),
  }),

  // In-app preferences
  inApp: z.object({
    enabled: z.boolean().default(true),
    showBadge: z.boolean().default(true),
    soundEnabled: z.boolean().default(true),
    types: z.array(notificationTypeSchema).default([
      'INVESTMENT_UPDATE',
      'NEW_MESSAGE',
      'PITCH_COMMENT',
      'SYNDICATE_INVITATION'
    ]),
  }),

  // Quiet hours
  quietHours: z.object({
    enabled: z.boolean().default(false),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)').optional(),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)').optional(),
    timezone: z.string().max(50, 'Invalid timezone').optional(),
    daysOfWeek: z.array(z.number().min(0).max(6)).default([0, 6]), // 0 = Sunday, 6 = Saturday
  }),

  // Investment-specific preferences
  investmentNotifications: z.object({
    pitchUpdates: z.boolean().default(true),
    fundingProgress: z.boolean().default(true),
    investmentCompleted: z.boolean().default(true),
    paymentReminders: z.boolean().default(true),
    documentUpdates: z.boolean().default(true),
  }),

  // Syndicate-specific preferences
  syndicateNotifications: z.object({
    newDeals: z.boolean().default(true),
    memberChanges: z.boolean().default(true),
    votingRequired: z.boolean().default(true),
    performanceUpdates: z.boolean().default(true),
  }),

  // Weekly digest
  weeklyDigest: z.object({
    enabled: z.boolean().default(true),
    dayOfWeek: z.number().min(0).max(6).default(1), // 0 = Sunday, 1 = Monday
    time: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)').default('09:00'),
    includePortfolio: z.boolean().default(true),
    includeMarketNews: z.boolean().default(false),
  }),
});

// Bulk notification action schema
export const bulkNotificationActionSchema = z.object({
  notificationIds: z.array(notificationIdSchema).min(1, 'At least one notification ID is required'),
  action: z.enum(['READ', 'UNREAD', 'DELETE', 'ARCHIVE']),
});

// Notification template schema
export const notificationTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(100, 'Name must be less than 100 characters'),
  type: notificationTypeSchema,
  priority: notificationPrioritySchema.default('MEDIUM'),
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  content: z.object({
    text: z.string().min(1, 'Text content is required').max(1000, 'Text content must be less than 1000 characters'),
    html: z.string().max(5000, 'HTML content must be less than 5000 characters').optional(),
  }),
  variables: z.array(z.object({
    name: z.string().min(1, 'Variable name is required'),
    description: z.string().max(200, 'Description must be less than 200 characters').optional(),
    defaultValue: z.string().optional(),
  })).max(20, 'Maximum 20 variables allowed'),
  channels: z.array(notificationChannelSchema).min(1, 'At least one channel is required'),
  isActive: z.boolean().default(true),
});

// Create notification schema (admin/system use)
export const createNotificationSchema = z.object({
  recipientId: z.string().min(1, 'Recipient ID is required'),
  type: notificationTypeSchema,
  priority: notificationPrioritySchema.default('MEDIUM'),
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  content: z.string().min(1, 'Content is required').max(5000, 'Content must be less than 5000 characters'),
  actionUrl: z.string().url('Invalid action URL').optional(),
  imageUrl: z.string().url('Invalid image URL').optional(),
  data: z.record(z.any()).optional(), // Additional structured data
  channels: z.array(notificationChannelSchema).default(['IN_APP']),
  scheduledFor: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/, 'Invalid ISO datetime format').optional(),
});

// Notification analytics query schema
export const notificationAnalyticsQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  groupBy: z.enum(['DAY', 'WEEK', 'MONTH', 'TYPE', 'CHANNEL']).default('DAY'),
  types: z.array(notificationTypeSchema).optional(),
  channels: z.array(notificationChannelSchema).optional(),
});

// Type exports
export type MarkNotificationReadInput = z.infer<typeof markNotificationReadSchema>;
export type MarkAllNotificationsReadInput = z.infer<typeof markAllNotificationsReadSchema>;
export type NotificationListQueryInput = z.infer<typeof notificationListQuerySchema>;
export type NotificationPreferencesInput = z.infer<typeof notificationPreferencesSchema>;
export type BulkNotificationActionInput = z.infer<typeof bulkNotificationActionSchema>;
export type NotificationTemplateInput = z.infer<typeof notificationTemplateSchema>;
export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
export type NotificationAnalyticsQueryInput = z.infer<typeof notificationAnalyticsQuerySchema>;

export default {
  markNotificationRead: markNotificationReadSchema,
  markAllNotificationsRead: markAllNotificationsReadSchema,
  notificationListQuery: notificationListQuerySchema,
  notificationPreferences: notificationPreferencesSchema,
  bulkNotificationAction: bulkNotificationActionSchema,
  notificationTemplate: notificationTemplateSchema,
  createNotification: createNotificationSchema,
  notificationAnalyticsQuery: notificationAnalyticsQuerySchema,
};