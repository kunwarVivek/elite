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
  private async sendMessageNotifications(_message: any): Promise<void> {
    // TODO: Send push notifications, emails, etc.
    // This would integrate with the notification service
  }

  // Database operations (these would typically be in a service layer)
  private async findUserById(_id: string): Promise<any | null> {
    // TODO: Implement database query
    return null;
  }

  private async findMessageById(_id: string): Promise<any | null> {
    // TODO: Implement database query
    return null;
  }

  private async createMessage(_messageData: any): Promise<any> {
    // TODO: Implement database insert
    return {
      id: 'message_123',
      createdAt: new Date(),
    };
  }

  private async markMessagesAsRead(_messageIds: string[], _userId: string): Promise<void> {
    // TODO: Implement database update
  }

  private async getConversationsList(_userId: string, _filters: any): Promise<any> {
    // TODO: Implement database query with filters
    return {
      conversations: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      },
    };
  }

  private async getMessagesList(_userId: string, _filters: any): Promise<any> {
    // TODO: Implement database query with filters
    return {
      messages: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      },
    };
  }

  // Archive conversation
  async archiveConversation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id: _id } = req.params;
      // TODO: Implement conversation archiving logic

      sendSuccess(res, { archived: true }, 'Conversation archived successfully');
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

      const { action: _action, messageIds } = req.body;
      // TODO: Implement bulk action logic

      sendSuccess(res, { processed: messageIds.length }, 'Bulk action completed successfully');
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

      const { name, content } = req.body;
      // TODO: Implement template creation logic

      sendSuccess(res, { id: 'template_123', name, content }, 'Message template created successfully', 201);
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

      const { templateId: _templateId, variables: _variables } = req.body;
      // TODO: Implement template usage logic

      sendSuccess(res, { content: 'Template content with variables' }, 'Template retrieved successfully');
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

      // TODO: Implement preferences retrieval logic

      sendSuccess(res, { emailNotifications: true, pushNotifications: true }, 'Notification preferences retrieved successfully');
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
      // TODO: Implement preferences update logic

      sendSuccess(res, preferences, 'Notification preferences updated successfully');
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

      const { id } = req.params;
      // TODO: Implement conversation retrieval logic

      sendSuccess(res, { id, participants: [], messages: [] }, 'Conversation retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

// Export singleton instance
export const messageController = new MessageController();
export default messageController;