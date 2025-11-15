import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler.js';
import { sendSuccess } from '../utils/response.js';
import { logger } from '../config/logger.js';
import { messageService } from '../services/message.service.js';

// Types for better type safety
interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name?: string;
    role: string;
  };
}

interface MessageParams {
  id: string;
}

interface SendMessageData {
  receiverId: string;
  pitchId?: string;
  investmentId?: string;
  subject?: string;
  content: string;
  messageType?: string;
}

interface ReplyMessageData {
  content: string;
  subject?: string;
}

class MessageController {
  // Get conversations list
  async getConversations(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const queryParams = req.query;
      const {
        participantId,
        pitchId,
        isArchived,
        hasUnread,
        search,
        page,
        limit,
        sortBy,
        sortOrder,
      } = queryParams as any;

      const result = await this.getConversationsList(userId, {
        participantId,
        pitchId,
        isArchived: isArchived === 'true',
        hasUnread: hasUnread === 'true',
        search,
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
        sortBy,
        sortOrder,
      });

      sendSuccess(res, {
        conversations: result.conversations,
        pagination: result.pagination,
      }, 'Conversations retrieved successfully');

    } catch (error) {
      next(error);
    }
  }

  // Get message by ID
  async getMessage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params as unknown as MessageParams;

      // Find message
      const message = await this.findMessageById(id);
      if (!message) {
        throw new AppError('Message not found', 404, 'MESSAGE_NOT_FOUND');
      }

      // Check if user is sender or receiver
      if (message.senderId !== userId && message.receiverId !== userId) {
        throw new AppError('Not authorized to view this message', 403, 'NOT_AUTHORIZED');
      }

      sendSuccess(res, {
        id: message.id,
        sender_id: message.senderId,
        receiver_id: message.receiverId,
        pitch_id: message.pitchId,
        investment_id: message.investmentId,
        subject: message.subject,
        content: message.content,
        message_type: message.messageType,
        is_read: message.isRead,
        read_at: message.readAt,
        created_at: message.createdAt,
        updated_at: message.updatedAt,
      }, 'Message retrieved successfully');

    } catch (error) {
      next(error);
    }
  }

  // Send message
  async sendMessage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const messageData: SendMessageData = req.body;

      // Verify receiver exists
      const receiver = await this.findUserById(messageData.receiverId);
      if (!receiver) {
        throw new AppError('Receiver not found', 404, 'RECEIVER_NOT_FOUND');
      }

      // Create message
      const message = await this.createMessage({
        senderId: userId,
        receiverId: messageData.receiverId,
        pitchId: messageData.pitchId,
        investmentId: messageData.investmentId,
        subject: messageData.subject,
        content: messageData.content,
        messageType: messageData.messageType || 'GENERAL',
      });

      // Send notifications
      await this.sendMessageNotifications(message);

      logger.info('Message sent', {
        messageId: message.id,
        senderId: userId,
        receiverId: messageData.receiverId,
      });

      sendSuccess(res, {
        id: message.id,
        subject: message.subject,
        created_at: message.createdAt,
      }, 'Message sent successfully', 201);

    } catch (error) {
      next(error);
    }
  }

  // Reply to message
  async replyToMessage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params as unknown as MessageParams;
      const replyData: ReplyMessageData = req.body;

      // Check if original message exists
      const originalMessage = await this.findMessageById(id);
      if (!originalMessage) {
        throw new AppError('Original message not found', 404, 'MESSAGE_NOT_FOUND');
      }

      // Check if user is receiver of the original message
      if (originalMessage.receiverId !== userId) {
        throw new AppError('Not authorized to reply to this message', 403, 'NOT_AUTHORIZED');
      }

      // Create reply message
      const replyMessage = await this.createMessage({
        senderId: userId,
        receiverId: originalMessage.senderId, // Reply to original sender
        pitchId: originalMessage.pitchId,
        investmentId: originalMessage.investmentId,
        subject: replyData.subject || `Re: ${originalMessage.subject || ''}`,
        content: replyData.content,
        messageType: originalMessage.messageType,
      });

      // Send notifications
      await this.sendMessageNotifications(replyMessage);

      logger.info('Reply sent', {
        replyMessageId: replyMessage.id,
        originalMessageId: id,
        senderId: userId,
      });

      sendSuccess(res, {
        id: replyMessage.id,
        subject: replyMessage.subject,
        created_at: replyMessage.createdAt,
      }, 'Reply sent successfully', 201);

    } catch (error) {
      next(error);
    }
  }

  // Mark message as read
  async markAsRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { messageIds } = req.body;

      // Mark messages as read
      await this.markMessagesAsRead(messageIds, userId);

      logger.info('Messages marked as read', { messageIds, userId });

      sendSuccess(res, {
        marked_count: messageIds.length,
      }, 'Messages marked as read successfully');

    } catch (error) {
      next(error);
    }
  }


  // Get messages list
  async getMessages(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const queryParams = req.query;
      const {
        messageType,
        pitchId,
        participantId,
        isRead,
        isArchived,
        isUrgent,
        search,
        startDate,
        endDate,
        page,
        limit,
        sortBy,
        sortOrder,
      } = queryParams as any;

      const result = await this.getMessagesList(userId, {
        messageType,
        pitchId,
        participantId,
        isRead: isRead === 'true',
        isArchived: isArchived === 'true',
        isUrgent: isUrgent === 'true',
        search,
        startDate,
        endDate,
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
        sortBy,
        sortOrder,
      });

      sendSuccess(res, {
        messages: result.messages,
        pagination: result.pagination,
      }, 'Messages retrieved successfully');

    } catch (error) {
      next(error);
    }
  }


  // Helper methods
  private async sendMessageNotifications(message: any): Promise<void> {
    // Messages are already sent via WebSocket in the service
    // Additional notification methods (email, push) can be added here
    logger.debug('Message notifications handled by service', { messageId: message.id });
  }

  // Database operations (delegated to service layer)
  private async findUserById(id: string): Promise<any | null> {
    return await messageService.findUserById(id);
  }

  private async findMessageById(id: string): Promise<any | null> {
    return await messageService.findMessageById(id);
  }

  private async createMessage(messageData: any): Promise<any> {
    return await messageService.createMessage(messageData);
  }

  private async markMessagesAsRead(messageIds: string[], userId: string): Promise<void> {
    await messageService.markMessagesAsRead(messageIds, userId);
  }

  private async getConversationsList(userId: string, filters: any): Promise<any> {
    return await messageService.getConversationsList(userId, filters);
  }

  private async getMessagesList(userId: string, filters: any): Promise<any> {
    return await messageService.getMessagesList(userId, filters);
  }

  // Archive conversation
  async archiveConversation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id: participantId } = req.params;

      await messageService.archiveConversation(userId, participantId);

      logger.info('Conversation archived', { userId, participantId });

      sendSuccess(res, { archived: true, participantId }, 'Conversation archived successfully');
    } catch (error) {
      next(error);
    }
  }

  // Bulk message action
  async bulkMessageAction(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { action, messageIds } = req.body;

      // Validate action
      if (!['read', 'archive', 'delete'].includes(action)) {
        throw new AppError('Invalid action type', 400, 'INVALID_ACTION');
      }

      // Validate messageIds
      if (!Array.isArray(messageIds) || messageIds.length === 0) {
        throw new AppError('Message IDs are required', 400, 'INVALID_REQUEST');
      }

      const processedCount = await messageService.bulkMessageAction(userId, action, messageIds);

      logger.info('Bulk message action completed', { userId, action, processedCount });

      sendSuccess(res, {
        action,
        processed: processedCount,
        requested: messageIds.length
      }, 'Bulk action completed successfully');
    } catch (error) {
      next(error);
    }
  }

  // Create message template
  async createMessageTemplate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { name, category, subject, content } = req.body;

      // Validate required fields
      if (!name || !content) {
        throw new AppError('Name and content are required', 400, 'INVALID_REQUEST');
      }

      const template = await messageService.createMessageTemplate(
        userId,
        name,
        category || 'GENERAL',
        subject,
        content
      );

      logger.info('Message template created', { userId, templateId: template.id });

      sendSuccess(res, template, 'Message template created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  // Use message template
  async useMessageTemplate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { templateId, variables } = req.body;

      // Validate required fields
      if (!templateId) {
        throw new AppError('Template ID is required', 400, 'INVALID_REQUEST');
      }

      const result = await messageService.useMessageTemplate(
        userId,
        templateId,
        variables || {}
      );

      logger.info('Message template used', { userId, templateId });

      sendSuccess(res, result, 'Template retrieved successfully');
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

      const preferences = await messageService.getMessagePreferences(userId);

      sendSuccess(res, preferences, 'Notification preferences retrieved successfully');
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

      const preferences = req.body;

      const updatedPreferences = await messageService.updateMessagePreferences(userId, preferences);

      logger.info('Message preferences updated', { userId });

      sendSuccess(res, updatedPreferences, 'Notification preferences updated successfully');
    } catch (error) {
      next(error);
    }
  }

  // Get conversation by ID (missing method referenced in routes)
  async getConversation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id: participantId } = req.params;
      const { page, limit } = req.query as any;

      const conversation = await messageService.getConversation(
        userId,
        participantId,
        parseInt(page) || 1,
        parseInt(limit) || 50
      );

      sendSuccess(res, {
        participantId,
        participant: conversation.participant,
        messages: conversation.messages,
        unreadCount: conversation.unreadCount,
        pagination: conversation.pagination,
      }, 'Conversation retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  // Search messages
  async searchMessages(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { query, page, limit } = req.query as any;

      if (!query) {
        throw new AppError('Search query is required', 400, 'INVALID_REQUEST');
      }

      const result = await messageService.searchMessages(
        userId,
        query,
        parseInt(page) || 1,
        parseInt(limit) || 20
      );

      sendSuccess(res, {
        query,
        messages: result.messages,
        pagination: result.pagination,
      }, 'Messages searched successfully');
    } catch (error) {
      next(error);
    }
  }

  // Get unread count
  async getUnreadCount(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const unreadCount = await messageService.getUnreadCount(userId);

      sendSuccess(res, { unreadCount }, 'Unread count retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  // Delete conversation
  async deleteConversation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id: participantId } = req.params;

      await messageService.deleteConversation(userId, participantId);

      logger.info('Conversation deleted', { userId, participantId });

      sendSuccess(res, { deleted: true, participantId }, 'Conversation deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  // Block user
  async blockUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { userId: blockedUserId } = req.body;

      if (!blockedUserId) {
        throw new AppError('User ID is required', 400, 'INVALID_REQUEST');
      }

      if (userId === blockedUserId) {
        throw new AppError('Cannot block yourself', 400, 'INVALID_REQUEST');
      }

      await messageService.blockUser(userId, blockedUserId);

      logger.info('User blocked', { userId, blockedUserId });

      sendSuccess(res, { blocked: true, blockedUserId }, 'User blocked successfully');
    } catch (error) {
      next(error);
    }
  }

  // Report message
  async reportMessage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id: messageId } = req.params;
      const { reason } = req.body;

      if (!reason) {
        throw new AppError('Report reason is required', 400, 'INVALID_REQUEST');
      }

      await messageService.reportMessage(userId, messageId, reason);

      logger.info('Message reported', { userId, messageId, reason });

      sendSuccess(res, { reported: true, messageId }, 'Message reported successfully');
    } catch (error) {
      next(error);
    }
  }

  // Get message templates
  async getMessageTemplates(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const templates = await messageService.getMessageTemplates(userId);

      sendSuccess(res, { templates }, 'Message templates retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

// Export singleton instance
export const messageController = new MessageController();
export default messageController;