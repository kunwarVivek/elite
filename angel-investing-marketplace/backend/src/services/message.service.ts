import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { AppError } from '../middleware/errorHandler.js';
import { getEnhancedWebSocketService, WebSocketEvents } from './websocket.service.js';

/**
 * Message Service
 * Handles all message-related business logic including conversations,
 * templates, preferences, and real-time messaging
 */

// Types
export interface MessageFilters {
  messageType?: string;
  pitchId?: string;
  participantId?: string;
  isRead?: boolean;
  isArchived?: boolean;
  isUrgent?: boolean;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
}

export interface ConversationFilters {
  participantId?: string;
  pitchId?: string;
  isArchived?: boolean;
  hasUnread?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
}

export interface CreateMessageData {
  senderId: string;
  receiverId: string;
  pitchId?: string;
  investmentId?: string;
  subject?: string;
  content: string;
  messageType?: string;
}

export interface MessageTemplate {
  id: string;
  userId: string;
  name: string;
  category: string;
  subject?: string;
  content: string;
  variables: string[];
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MessagePreferences {
  userId: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  notificationFrequency: 'INSTANT' | 'DAILY' | 'WEEKLY';
  mutedConversations: string[];
  blockedUsers: string[];
}

export interface ConversationParticipant {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  role: string;
}

export interface ConversationPreview {
  participantId: string;
  participant: ConversationParticipant;
  lastMessage: {
    id: string;
    content: string;
    subject?: string;
    createdAt: Date;
    isRead: boolean;
    senderId: string;
  };
  unreadCount: number;
  totalMessages: number;
  pitchId?: string;
  investmentId?: string;
}

class MessageService {
  /**
   * Find user by ID
   */
  async findUserById(userId: string) {
    try {
      return await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          role: true,
          isActive: true,
        },
      });
    } catch (error) {
      logger.error('Error finding user by ID', { userId, error });
      throw new AppError('Failed to find user', 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Find message by ID
   */
  async findMessageById(messageId: string) {
    try {
      return await prisma.message.findUnique({
        where: { id: messageId },
        include: {
          sender: {
            select: {
              id: true,
              email: true,
              name: true,
              avatarUrl: true,
              role: true,
            },
          },
          receiver: {
            select: {
              id: true,
              email: true,
              name: true,
              avatarUrl: true,
              role: true,
            },
          },
          pitch: {
            select: {
              id: true,
              title: true,
            },
          },
          investment: {
            select: {
              id: true,
              amount: true,
            },
          },
        },
      });
    } catch (error) {
      logger.error('Error finding message by ID', { messageId, error });
      throw new AppError('Failed to find message', 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Create a new message
   */
  async createMessage(messageData: CreateMessageData) {
    try {
      // Validate receiver exists and is active
      const receiver = await this.findUserById(messageData.receiverId);
      if (!receiver) {
        throw new AppError('Receiver not found', 404, 'RECEIVER_NOT_FOUND');
      }

      if (!receiver.isActive) {
        throw new AppError('Receiver account is not active', 400, 'RECEIVER_INACTIVE');
      }

      // Check if sender is blocked by receiver
      const isBlocked = await this.isUserBlocked(messageData.senderId, messageData.receiverId);
      if (isBlocked) {
        throw new AppError('Cannot send message to this user', 403, 'USER_BLOCKED');
      }

      // Validate content (basic XSS prevention)
      const sanitizedContent = this.sanitizeContent(messageData.content);
      const sanitizedSubject = messageData.subject ? this.sanitizeContent(messageData.subject) : undefined;

      // Create message
      const message = await prisma.message.create({
        data: {
          senderId: messageData.senderId,
          receiverId: messageData.receiverId,
          pitchId: messageData.pitchId,
          investmentId: messageData.investmentId,
          subject: sanitizedSubject,
          content: sanitizedContent,
          messageType: messageData.messageType || 'GENERAL',
          isRead: false,
        },
        include: {
          sender: {
            select: {
              id: true,
              email: true,
              name: true,
              avatarUrl: true,
              role: true,
            },
          },
          receiver: {
            select: {
              id: true,
              email: true,
              name: true,
              avatarUrl: true,
              role: true,
            },
          },
        },
      });

      // Send real-time notification via WebSocket
      await this.broadcastNewMessage(message);

      logger.info('Message created successfully', {
        messageId: message.id,
        senderId: messageData.senderId,
        receiverId: messageData.receiverId,
      });

      return message;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error creating message', { messageData, error });
      throw new AppError('Failed to create message', 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(messageIds: string[], userId: string): Promise<number> {
    try {
      // Update messages where user is the receiver
      const result = await prisma.message.updateMany({
        where: {
          id: { in: messageIds },
          receiverId: userId,
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      });

      // Broadcast read receipts via WebSocket
      if (result.count > 0) {
        await this.broadcastReadReceipts(messageIds, userId);
      }

      logger.info('Messages marked as read', {
        userId,
        count: result.count,
        messageIds,
      });

      return result.count;
    } catch (error) {
      logger.error('Error marking messages as read', { messageIds, userId, error });
      throw new AppError('Failed to mark messages as read', 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Get conversations list with last message preview
   */
  async getConversationsList(userId: string, filters: ConversationFilters) {
    try {
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const skip = (page - 1) * limit;

      // Build where clause for messages
      const whereClause: any = {
        OR: [
          { senderId: userId },
          { receiverId: userId },
        ],
      };

      // Apply filters
      if (filters.participantId) {
        whereClause.OR = [
          { senderId: userId, receiverId: filters.participantId },
          { senderId: filters.participantId, receiverId: userId },
        ];
      }

      if (filters.pitchId) {
        whereClause.pitchId = filters.pitchId;
      }

      if (filters.search) {
        whereClause.OR = [
          ...(whereClause.OR || []),
          { content: { contains: filters.search, mode: 'insensitive' } },
          { subject: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      // Get all messages for the user
      const messages = await prisma.message.findMany({
        where: whereClause,
        include: {
          sender: {
            select: {
              id: true,
              email: true,
              name: true,
              avatarUrl: true,
              role: true,
            },
          },
          receiver: {
            select: {
              id: true,
              email: true,
              name: true,
              avatarUrl: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Group messages by conversation (other participant)
      const conversationMap = new Map<string, any[]>();

      for (const message of messages) {
        const otherParticipantId = message.senderId === userId
          ? message.receiverId
          : message.senderId;

        if (!conversationMap.has(otherParticipantId)) {
          conversationMap.set(otherParticipantId, []);
        }

        conversationMap.get(otherParticipantId)!.push(message);
      }

      // Build conversation previews
      const conversations: ConversationPreview[] = [];

      for (const [participantId, conversationMessages] of conversationMap) {
        const lastMessage = conversationMessages[0];
        const participant = lastMessage.senderId === userId
          ? lastMessage.receiver
          : lastMessage.sender;

        // Calculate unread count (messages where user is receiver and not read)
        const unreadCount = conversationMessages.filter(
          msg => msg.receiverId === userId && !msg.isRead
        ).length;

        // Apply hasUnread filter
        if (filters.hasUnread !== undefined && filters.hasUnread !== (unreadCount > 0)) {
          continue;
        }

        conversations.push({
          participantId,
          participant,
          lastMessage: {
            id: lastMessage.id,
            content: lastMessage.content,
            subject: lastMessage.subject || undefined,
            createdAt: lastMessage.createdAt,
            isRead: lastMessage.isRead,
            senderId: lastMessage.senderId,
          },
          unreadCount,
          totalMessages: conversationMessages.length,
          pitchId: lastMessage.pitchId || undefined,
          investmentId: lastMessage.investmentId || undefined,
        });
      }

      // Sort conversations
      const sortBy = filters.sortBy || 'lastMessage';
      const sortOrder = filters.sortOrder || 'desc';

      conversations.sort((a, b) => {
        if (sortBy === 'lastMessage') {
          const dateA = a.lastMessage.createdAt.getTime();
          const dateB = b.lastMessage.createdAt.getTime();
          return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        }
        if (sortBy === 'unreadCount') {
          return sortOrder === 'desc'
            ? b.unreadCount - a.unreadCount
            : a.unreadCount - b.unreadCount;
        }
        return 0;
      });

      // Apply pagination
      const total = conversations.length;
      const paginatedConversations = conversations.slice(skip, skip + limit);

      return {
        conversations: paginatedConversations,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error getting conversations list', { userId, filters, error });
      throw new AppError('Failed to get conversations', 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Get conversation by participant ID with pagination
   */
  async getConversation(userId: string, participantId: string, page = 1, limit = 50) {
    try {
      const skip = (page - 1) * limit;

      // Verify participant exists
      const participant = await this.findUserById(participantId);
      if (!participant) {
        throw new AppError('Participant not found', 404, 'PARTICIPANT_NOT_FOUND');
      }

      // Get messages between the two users
      const messages = await prisma.message.findMany({
        where: {
          OR: [
            { senderId: userId, receiverId: participantId },
            { senderId: participantId, receiverId: userId },
          ],
        },
        include: {
          sender: {
            select: {
              id: true,
              email: true,
              name: true,
              avatarUrl: true,
              role: true,
            },
          },
          receiver: {
            select: {
              id: true,
              email: true,
              name: true,
              avatarUrl: true,
              role: true,
            },
          },
          pitch: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      });

      // Get total count
      const total = await prisma.message.count({
        where: {
          OR: [
            { senderId: userId, receiverId: participantId },
            { senderId: participantId, receiverId: userId },
          ],
        },
      });

      // Calculate unread count
      const unreadCount = await prisma.message.count({
        where: {
          senderId: participantId,
          receiverId: userId,
          isRead: false,
        },
      });

      return {
        participant,
        messages,
        unreadCount,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error getting conversation', { userId, participantId, error });
      throw new AppError('Failed to get conversation', 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Get messages list with filters
   */
  async getMessagesList(userId: string, filters: MessageFilters) {
    try {
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const skip = (page - 1) * limit;

      // Build where clause
      const whereClause: any = {
        OR: [
          { senderId: userId },
          { receiverId: userId },
        ],
      };

      if (filters.messageType) {
        whereClause.messageType = filters.messageType;
      }

      if (filters.pitchId) {
        whereClause.pitchId = filters.pitchId;
      }

      if (filters.participantId) {
        whereClause.OR = [
          { senderId: userId, receiverId: filters.participantId },
          { senderId: filters.participantId, receiverId: userId },
        ];
      }

      if (filters.isRead !== undefined) {
        whereClause.receiverId = userId;
        whereClause.isRead = filters.isRead;
      }

      if (filters.search) {
        whereClause.AND = [
          {
            OR: [
              { content: { contains: filters.search, mode: 'insensitive' } },
              { subject: { contains: filters.search, mode: 'insensitive' } },
            ],
          },
        ];
      }

      if (filters.startDate || filters.endDate) {
        whereClause.createdAt = {};
        if (filters.startDate) {
          whereClause.createdAt.gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
          whereClause.createdAt.lte = new Date(filters.endDate);
        }
      }

      // Get messages
      const messages = await prisma.message.findMany({
        where: whereClause,
        include: {
          sender: {
            select: {
              id: true,
              email: true,
              name: true,
              avatarUrl: true,
              role: true,
            },
          },
          receiver: {
            select: {
              id: true,
              email: true,
              name: true,
              avatarUrl: true,
              role: true,
            },
          },
          pitch: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: {
          [filters.sortBy || 'createdAt']: filters.sortOrder || 'desc',
        },
        skip,
        take: limit,
      });

      // Get total count
      const total = await prisma.message.count({
        where: whereClause,
      });

      return {
        messages,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error getting messages list', { userId, filters, error });
      throw new AppError('Failed to get messages', 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Search messages with full-text search
   */
  async searchMessages(userId: string, query: string, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;

      const messages = await prisma.message.findMany({
        where: {
          OR: [
            { senderId: userId },
            { receiverId: userId },
          ],
          AND: [
            {
              OR: [
                { content: { contains: query, mode: 'insensitive' } },
                { subject: { contains: query, mode: 'insensitive' } },
              ],
            },
          ],
        },
        include: {
          sender: {
            select: {
              id: true,
              email: true,
              name: true,
              avatarUrl: true,
            },
          },
          receiver: {
            select: {
              id: true,
              email: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      });

      const total = await prisma.message.count({
        where: {
          OR: [
            { senderId: userId },
            { receiverId: userId },
          ],
          AND: [
            {
              OR: [
                { content: { contains: query, mode: 'insensitive' } },
                { subject: { contains: query, mode: 'insensitive' } },
              ],
            },
          ],
        },
      });

      return {
        messages,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error searching messages', { userId, query, error });
      throw new AppError('Failed to search messages', 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Get unread message count
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      return await prisma.message.count({
        where: {
          receiverId: userId,
          isRead: false,
        },
      });
    } catch (error) {
      logger.error('Error getting unread count', { userId, error });
      throw new AppError('Failed to get unread count', 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Archive conversation (soft delete by marking messages)
   * Note: We'll use the user's profile to store archived conversations
   */
  async archiveConversation(userId: string, participantId: string): Promise<void> {
    try {
      // Verify participant exists
      const participant = await this.findUserById(participantId);
      if (!participant) {
        throw new AppError('Participant not found', 404, 'PARTICIPANT_NOT_FOUND');
      }

      // Get or create user preferences
      const preferences = await this.getOrCreatePreferences(userId);

      // Add to archived conversations (we'll store this in profileData JSON)
      const archivedConversations = preferences.archivedConversations || [];
      if (!archivedConversations.includes(participantId)) {
        archivedConversations.push(participantId);
        await this.updatePreferences(userId, { archivedConversations });
      }

      logger.info('Conversation archived', { userId, participantId });
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error archiving conversation', { userId, participantId, error });
      throw new AppError('Failed to archive conversation', 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Delete conversation (soft delete)
   */
  async deleteConversation(userId: string, participantId: string): Promise<void> {
    try {
      // Verify participant exists
      const participant = await this.findUserById(participantId);
      if (!participant) {
        throw new AppError('Participant not found', 404, 'PARTICIPANT_NOT_FOUND');
      }

      // Mark messages as deleted for this user by storing in preferences
      const preferences = await this.getOrCreatePreferences(userId);
      const deletedConversations = preferences.deletedConversations || [];
      if (!deletedConversations.includes(participantId)) {
        deletedConversations.push(participantId);
        await this.updatePreferences(userId, { deletedConversations });
      }

      logger.info('Conversation deleted', { userId, participantId });
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error deleting conversation', { userId, participantId, error });
      throw new AppError('Failed to delete conversation', 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Bulk message actions
   */
  async bulkMessageAction(
    userId: string,
    action: 'read' | 'archive' | 'delete',
    messageIds: string[]
  ): Promise<number> {
    try {
      let processedCount = 0;

      if (action === 'read') {
        processedCount = await this.markMessagesAsRead(messageIds, userId);
      } else if (action === 'archive' || action === 'delete') {
        // Get unique participant IDs from messages
        const messages = await prisma.message.findMany({
          where: {
            id: { in: messageIds },
            OR: [
              { senderId: userId },
              { receiverId: userId },
            ],
          },
          select: {
            senderId: true,
            receiverId: true,
          },
        });

        const participantIds = new Set<string>();
        messages.forEach(msg => {
          const otherUserId = msg.senderId === userId ? msg.receiverId : msg.senderId;
          participantIds.add(otherUserId);
        });

        // Archive or delete conversations
        for (const participantId of participantIds) {
          if (action === 'archive') {
            await this.archiveConversation(userId, participantId);
          } else {
            await this.deleteConversation(userId, participantId);
          }
          processedCount++;
        }
      }

      logger.info('Bulk message action completed', { userId, action, processedCount });
      return processedCount;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error performing bulk message action', { userId, action, error });
      throw new AppError('Failed to perform bulk action', 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Block user from messaging
   */
  async blockUser(userId: string, blockedUserId: string): Promise<void> {
    try {
      // Verify user exists
      const userToBlock = await this.findUserById(blockedUserId);
      if (!userToBlock) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Get or create preferences
      const preferences = await this.getOrCreatePreferences(userId);
      const blockedUsers = preferences.blockedUsers || [];

      if (!blockedUsers.includes(blockedUserId)) {
        blockedUsers.push(blockedUserId);
        await this.updatePreferences(userId, { blockedUsers });
      }

      logger.info('User blocked', { userId, blockedUserId });
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error blocking user', { userId, blockedUserId, error });
      throw new AppError('Failed to block user', 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Check if user is blocked
   */
  async isUserBlocked(userId: string, otherUserId: string): Promise<boolean> {
    try {
      const preferences = await this.getOrCreatePreferences(otherUserId);
      const blockedUsers = preferences.blockedUsers || [];
      return blockedUsers.includes(userId);
    } catch (error) {
      logger.error('Error checking if user is blocked', { userId, otherUserId, error });
      return false;
    }
  }

  /**
   * Report inappropriate message
   */
  async reportMessage(userId: string, messageId: string, reason: string): Promise<void> {
    try {
      // Verify message exists
      const message = await this.findMessageById(messageId);
      if (!message) {
        throw new AppError('Message not found', 404, 'MESSAGE_NOT_FOUND');
      }

      // Verify user is involved in the conversation
      if (message.senderId !== userId && message.receiverId !== userId) {
        throw new AppError('Not authorized to report this message', 403, 'NOT_AUTHORIZED');
      }

      // Create a report record (we'll store this in a generic way for now)
      // In production, you'd want a proper Report model
      logger.warn('Message reported', {
        messageId,
        reportedBy: userId,
        reason,
        messageContent: message.content.substring(0, 100),
      });

      // You could also notify admins via WebSocket
      const wsService = getEnhancedWebSocketService();
      if (wsService) {
        await wsService.sendToRoom('admin', 'message_reported', {
          messageId,
          reportedBy: userId,
          reason,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error reporting message', { userId, messageId, error });
      throw new AppError('Failed to report message', 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Create message template
   */
  async createMessageTemplate(
    userId: string,
    name: string,
    category: string,
    subject: string | undefined,
    content: string
  ): Promise<any> {
    try {
      // Extract variables from content ({{variable}})
      const variables = this.extractTemplateVariables(content);

      // Store template in user's profile data
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { profileData: true },
      });

      const profileData = (user?.profileData as any) || {};
      const templates = profileData.messageTemplates || [];

      const newTemplate = {
        id: `template_${Date.now()}`,
        userId,
        name,
        category,
        subject,
        content,
        variables,
        isSystem: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      templates.push(newTemplate);

      await prisma.user.update({
        where: { id: userId },
        data: {
          profileData: {
            ...profileData,
            messageTemplates: templates,
          },
        },
      });

      logger.info('Message template created', { userId, templateId: newTemplate.id, name });
      return newTemplate;
    } catch (error) {
      logger.error('Error creating message template', { userId, name, error });
      throw new AppError('Failed to create message template', 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Get message templates for user
   */
  async getMessageTemplates(userId: string): Promise<any[]> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { profileData: true },
      });

      const profileData = (user?.profileData as any) || {};
      return profileData.messageTemplates || [];
    } catch (error) {
      logger.error('Error getting message templates', { userId, error });
      throw new AppError('Failed to get message templates', 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Use message template with variable substitution
   */
  async useMessageTemplate(
    userId: string,
    templateId: string,
    variables: Record<string, string>
  ): Promise<{ subject?: string; content: string }> {
    try {
      const templates = await this.getMessageTemplates(userId);
      const template = templates.find(t => t.id === templateId);

      if (!template) {
        throw new AppError('Template not found', 404, 'TEMPLATE_NOT_FOUND');
      }

      // Substitute variables
      let content = template.content;
      let subject = template.subject;

      for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        content = content.replace(regex, value);
        if (subject) {
          subject = subject.replace(regex, value);
        }
      }

      return { subject, content };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error using message template', { userId, templateId, error });
      throw new AppError('Failed to use message template', 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Get message preferences
   */
  async getMessagePreferences(userId: string): Promise<any> {
    try {
      const preferences = await this.getOrCreatePreferences(userId);
      return {
        emailNotifications: preferences.emailNotifications ?? true,
        pushNotifications: preferences.pushNotifications ?? true,
        notificationFrequency: preferences.notificationFrequency || 'INSTANT',
        mutedConversations: preferences.mutedConversations || [],
        blockedUsers: preferences.blockedUsers || [],
      };
    } catch (error) {
      logger.error('Error getting message preferences', { userId, error });
      throw new AppError('Failed to get message preferences', 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Update message preferences
   */
  async updateMessagePreferences(userId: string, preferences: Partial<any>): Promise<any> {
    try {
      await this.updatePreferences(userId, preferences);
      return await this.getMessagePreferences(userId);
    } catch (error) {
      logger.error('Error updating message preferences', { userId, error });
      throw new AppError('Failed to update message preferences', 500, 'DATABASE_ERROR');
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Get or create user preferences
   */
  private async getOrCreatePreferences(userId: string): Promise<any> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { profileData: true },
    });

    const profileData = (user?.profileData as any) || {};
    return profileData.messagePreferences || {};
  }

  /**
   * Update user preferences
   */
  private async updatePreferences(userId: string, preferences: Partial<any>): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { profileData: true },
    });

    const profileData = (user?.profileData as any) || {};
    const currentPreferences = profileData.messagePreferences || {};

    await prisma.user.update({
      where: { id: userId },
      data: {
        profileData: {
          ...profileData,
          messagePreferences: {
            ...currentPreferences,
            ...preferences,
          },
        },
      },
    });
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

  /**
   * Extract template variables from content
   */
  private extractTemplateVariables(content: string): string[] {
    const regex = /{{\\s*(\\w+)\\s*}}/g;
    const variables: string[] = [];
    let match;

    while ((match = regex.exec(content)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }

    return variables;
  }

  /**
   * Broadcast new message via WebSocket
   */
  private async broadcastNewMessage(message: any): Promise<void> {
    try {
      const wsService = getEnhancedWebSocketService();
      if (!wsService) return;

      // Send to receiver
      await wsService.sendToUser(message.receiverId, WebSocketEvents.NOTIFICATION, {
        type: 'new_message',
        message: {
          id: message.id,
          senderId: message.senderId,
          sender: message.sender,
          subject: message.subject,
          content: message.content.substring(0, 100) + '...',
          createdAt: message.createdAt,
        },
      });

      logger.debug('New message broadcast via WebSocket', {
        messageId: message.id,
        receiverId: message.receiverId,
      });
    } catch (error) {
      logger.error('Error broadcasting new message', { messageId: message.id, error });
    }
  }

  /**
   * Broadcast read receipts via WebSocket
   */
  private async broadcastReadReceipts(messageIds: string[], userId: string): Promise<void> {
    try {
      const wsService = getEnhancedWebSocketService();
      if (!wsService) return;

      // Get senders of these messages
      const messages = await prisma.message.findMany({
        where: { id: { in: messageIds } },
        select: { senderId: true },
      });

      const senderIds = [...new Set(messages.map(m => m.senderId))];

      // Notify all senders
      for (const senderId of senderIds) {
        await wsService.sendToUser(senderId, 'message_read', {
          messageIds,
          readBy: userId,
          readAt: new Date().toISOString(),
        });
      }

      logger.debug('Read receipts broadcast via WebSocket', { messageIds, userId });
    } catch (error) {
      logger.error('Error broadcasting read receipts', { messageIds, error });
    }
  }
}

// Export singleton instance
export const messageService = new MessageService();
export default messageService;
