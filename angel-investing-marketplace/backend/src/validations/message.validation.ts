import { z } from 'zod';

// Base schemas
export const messageIdSchema = z.string().min(1, 'Message ID is required');
export const conversationIdSchema = z.string().min(1, 'Conversation ID is required');
export const userIdSchema = z.string().min(1, 'User ID is required');
export const pitchIdSchema = z.string().min(1, 'Pitch ID is required').optional();

// Message type enum
export const messageTypeSchema = z.enum([
  'PITCH_INQUIRY',
  'INVESTMENT_DISCUSSION',
  'DUE_DILIGENCE',
  'TERMS_NEGOTIATION',
  'POST_INVESTMENT',
  'GENERAL',
  'SYSTEM'
]);

// Message status enum
export const messageStatusSchema = z.enum([
  'SENT',
  'DELIVERED',
  'READ',
  'ARCHIVED'
]);

// Send message schema
export const sendMessageSchema = z.object({
  receiverId: userIdSchema,
  pitchId: pitchIdSchema,
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject must be less than 200 characters'),
  content: z.string().min(1, 'Message content is required').max(10000, 'Message content must be less than 10,000 characters'),
  messageType: messageTypeSchema.default('GENERAL'),
  isUrgent: z.boolean().default(false),
  attachments: z.array(z.object({
    fileName: z.string().min(1, 'File name is required').max(200, 'File name must be less than 200 characters'),
    fileUrl: z.string().url('Invalid file URL'),
    fileSize: z.number().min(1, 'File size must be positive').max(10485760, 'File size cannot exceed 10MB'), // 10MB limit
    mimeType: z.string().min(1, 'MIME type is required'),
  })).max(5, 'Maximum 5 attachments allowed').optional(),
  parentMessageId: messageIdSchema.optional(), // For replies
});

// Reply to message schema
export const replyMessageSchema = z.object({
  content: z.string().min(1, 'Reply content is required').max(10000, 'Reply content must be less than 10,000 characters'),
  isUrgent: z.boolean().default(false),
  attachments: z.array(z.object({
    fileName: z.string().min(1, 'File name is required').max(200, 'File name must be less than 200 characters'),
    fileUrl: z.string().url('Invalid file URL'),
    fileSize: z.number().min(1, 'File size must be positive').max(10485760, 'File size cannot exceed 10MB'), // 10MB limit
    mimeType: z.string().min(1, 'MIME type is required'),
  })).max(5, 'Maximum 5 attachments allowed').optional(),
});

// Mark message as read schema
export const markMessageReadSchema = z.object({
  messageIds: z.array(messageIdSchema).min(1, 'At least one message ID is required'),
});

// Archive conversation schema
export const archiveConversationSchema = z.object({
  archive: z.boolean().default(true),
});

// Message list query schema
export const messageListQuerySchema = z.object({
  messageType: messageTypeSchema.optional(),
  pitchId: pitchIdSchema,
  participantId: userIdSchema.optional(),
  isRead: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  isUrgent: z.boolean().optional(),
  search: z.string().max(100, 'Search term too long').optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  page: z.number().min(1, 'Page must be positive').default(1),
  limit: z.number().min(1, 'Limit must be positive').max(100, 'Limit cannot exceed 100').default(20),
  sortBy: z.enum(['createdAt', 'subject', 'messageType', 'isRead', 'isUrgent']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Conversation list query schema
export const conversationListQuerySchema = z.object({
  participantId: userIdSchema.optional(),
  pitchId: pitchIdSchema,
  isArchived: z.boolean().optional(),
  hasUnread: z.boolean().optional(),
  search: z.string().max(100, 'Search term too long').optional(),
  page: z.number().min(1, 'Page must be positive').default(1),
  limit: z.number().min(1, 'Limit must be positive').max(100, 'Limit cannot exceed 100').default(20),
  sortBy: z.enum(['lastMessageAt', 'createdAt', 'participantCount', 'unreadCount']).default('lastMessageAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Bulk message action schema
export const bulkMessageActionSchema = z.object({
  messageIds: z.array(messageIdSchema).min(1, 'At least one message ID is required'),
  action: z.enum(['READ', 'UNREAD', 'ARCHIVE', 'UNARCHIVE', 'DELETE']),
});

// Message template schema
export const messageTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(100, 'Name must be less than 100 characters'),
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject must be less than 200 characters'),
  content: z.string().min(1, 'Content is required').max(10000, 'Content must be less than 10,000 characters'),
  messageType: messageTypeSchema.default('GENERAL'),
  category: z.enum(['PITCH', 'INVESTMENT', 'DUE_DILIGENCE', 'FOLLOW_UP', 'GENERAL']),
  isPublic: z.boolean().default(false),
});

// Use message template schema
export const useMessageTemplateSchema = z.object({
  templateId: z.string().min(1, 'Template ID is required'),
  customizations: z.object({
    subject: z.string().max(200, 'Subject must be less than 200 characters').optional(),
    content: z.string().max(10000, 'Content must be less than 10,000 characters').optional(),
  }).optional(),
});

// Message notification preferences schema
export const messageNotificationPreferencesSchema = z.object({
  emailNotifications: z.boolean().default(true),
  pushNotifications: z.boolean().default(true),
  smsNotifications: z.boolean().default(false),
  notifyOnNewMessage: z.boolean().default(true),
  notifyOnReply: z.boolean().default(true),
  notifyOnMention: z.boolean().default(true),
  quietHours: z.object({
    enabled: z.boolean().default(false),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)').optional(),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)').optional(),
    timezone: z.string().max(50, 'Invalid timezone').optional(),
  }).optional(),
});

// Type exports
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type ReplyMessageInput = z.infer<typeof replyMessageSchema>;
export type MarkMessageReadInput = z.infer<typeof markMessageReadSchema>;
export type ArchiveConversationInput = z.infer<typeof archiveConversationSchema>;
export type MessageListQueryInput = z.infer<typeof messageListQuerySchema>;
export type ConversationListQueryInput = z.infer<typeof conversationListQuerySchema>;
export type BulkMessageActionInput = z.infer<typeof bulkMessageActionSchema>;
export type MessageTemplateInput = z.infer<typeof messageTemplateSchema>;
export type UseMessageTemplateInput = z.infer<typeof useMessageTemplateSchema>;
export type MessageNotificationPreferencesInput = z.infer<typeof messageNotificationPreferencesSchema>;

export default {
  sendMessage: sendMessageSchema,
  replyMessage: replyMessageSchema,
  markMessageRead: markMessageReadSchema,
  archiveConversation: archiveConversationSchema,
  messageListQuery: messageListQuerySchema,
  conversationListQuery: conversationListQuerySchema,
  bulkMessageAction: bulkMessageActionSchema,
  messageTemplate: messageTemplateSchema,
  useMessageTemplate: useMessageTemplateSchema,
  messageNotificationPreferences: messageNotificationPreferencesSchema,
};