import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { AppError } from '../middleware/errorHandler.js';
import { notificationService } from './notification.service.js';

/**
 * Support Ticket Service
 * Handles support ticket creation, management, and messaging
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface CreateTicketData {
  userId: string;
  subject: string;
  description: string;
  category: string;
  priority?: string;
  tags?: string[];
}

export interface TicketFilters {
  status?: string;
  priority?: string;
  category?: string;
  assignedTo?: string;
  userId?: string;
  page?: number;
  limit?: number;
}

export interface CreateMessageData {
  ticketId: string;
  userId: string;
  content: string;
  isInternal?: boolean;
  attachments?: any[];
}

export interface UpdateStatusData {
  status: string;
  userId: string;
}

export interface AssignTicketData {
  assignedTo: string;
  adminId: string;
}

export interface CloseTicketData {
  userId: string;
  resolution?: string;
}

// ============================================================================
// Support Service Class
// ============================================================================

class SupportService {
  /**
   * Create support ticket
   */
  async createTicket(data: CreateTicketData) {
    try {
      // Verify user exists
      const user = await prisma.user.findUnique({
        where: { id: data.userId },
      });

      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Create ticket
      const ticket = await prisma.supportTicket.create({
        data: {
          userId: data.userId,
          subject: data.subject,
          description: data.description,
          category: data.category as any,
          priority: (data.priority as any) || 'MEDIUM',
          status: 'OPEN',
          tags: data.tags || [],
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      logger.info('Support ticket created', { ticketId: ticket.id, userId: data.userId });

      // Send notification to admins
      await this.notifyAdminsNewTicket(ticket);

      return ticket;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error creating ticket', { data, error });
      throw new AppError('Failed to create ticket', 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Get tickets with filters
   */
  async getTickets(filters: TicketFilters = {}) {
    try {
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const skip = (page - 1) * limit;

      // Build where clause
      const whereClause: any = {};

      if (filters.status) {
        whereClause.status = filters.status;
      }

      if (filters.priority) {
        whereClause.priority = filters.priority;
      }

      if (filters.category) {
        whereClause.category = filters.category;
      }

      if (filters.assignedTo) {
        whereClause.assignedTo = filters.assignedTo;
      }

      if (filters.userId) {
        whereClause.userId = filters.userId;
      }

      // Get tickets
      const tickets = await prisma.supportTicket.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              messages: true,
            },
          },
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' },
        ],
        skip,
        take: limit,
      });

      // Get total count
      const total = await prisma.supportTicket.count({
        where: whereClause,
      });

      return {
        tickets,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error getting tickets', { filters, error });
      throw new AppError('Failed to get tickets', 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Get ticket by ID with messages
   */
  async getTicketById(ticketId: string, userId: string, isAdmin: boolean = false) {
    try {
      const ticket = await prisma.supportTicket.findUnique({
        where: { id: ticketId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
          messages: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatarUrl: true,
                  role: true,
                },
              },
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      });

      if (!ticket) {
        throw new AppError('Ticket not found', 404, 'TICKET_NOT_FOUND');
      }

      // Check authorization
      if (!isAdmin && ticket.userId !== userId && ticket.assignedTo !== userId) {
        throw new AppError('Not authorized to view this ticket', 403, 'NOT_AUTHORIZED');
      }

      // Filter internal messages for non-admins
      if (!isAdmin) {
        ticket.messages = ticket.messages.filter((msg) => !msg.isInternal);
      }

      return ticket;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error getting ticket by ID', { ticketId, userId, error });
      throw new AppError('Failed to get ticket', 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Add message to ticket
   */
  async addMessage(data: CreateMessageData) {
    try {
      // Verify ticket exists
      const ticket = await prisma.supportTicket.findUnique({
        where: { id: data.ticketId },
      });

      if (!ticket) {
        throw new AppError('Ticket not found', 404, 'TICKET_NOT_FOUND');
      }

      // Check if ticket is closed
      if (ticket.status === 'CLOSED') {
        throw new AppError('Cannot add message to closed ticket', 400, 'TICKET_CLOSED');
      }

      // Create message
      const message = await prisma.ticketMessage.create({
        data: {
          ticketId: data.ticketId,
          userId: data.userId,
          content: data.content,
          isInternal: data.isInternal || false,
          attachments: data.attachments || [],
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
              role: true,
            },
          },
        },
      });

      // Update ticket status if needed
      if (ticket.status === 'WAITING_ON_USER' && data.userId === ticket.userId) {
        await this.updateStatus(data.ticketId, { status: 'WAITING_ON_STAFF', userId: data.userId });
      } else if (ticket.status === 'WAITING_ON_STAFF' && data.userId !== ticket.userId) {
        await this.updateStatus(data.ticketId, { status: 'WAITING_ON_USER', userId: data.userId });
      }

      logger.info('Message added to ticket', { ticketId: data.ticketId, messageId: message.id });

      // Send notification
      await this.notifyTicketMessage(ticket, message);

      return message;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error adding message', { data, error });
      throw new AppError('Failed to add message', 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Update ticket status
   */
  async updateStatus(ticketId: string, data: UpdateStatusData) {
    try {
      const ticket = await prisma.supportTicket.update({
        where: { id: ticketId },
        data: {
          status: data.status as any,
        },
      });

      logger.info('Ticket status updated', { ticketId, status: data.status });

      return ticket;
    } catch (error) {
      logger.error('Error updating ticket status', { ticketId, data, error });
      throw new AppError('Failed to update ticket status', 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Assign ticket to admin
   */
  async assignTicket(ticketId: string, data: AssignTicketData) {
    try {
      // Verify assignee is an admin
      const assignee = await prisma.user.findUnique({
        where: { id: data.assignedTo },
      });

      if (!assignee || assignee.role !== 'ADMIN') {
        throw new AppError('Assignee must be an admin', 400, 'INVALID_ASSIGNEE');
      }

      // Update ticket
      const ticket = await prisma.supportTicket.update({
        where: { id: ticketId },
        data: {
          assignedTo: data.assignedTo,
          status: 'IN_PROGRESS',
        },
      });

      logger.info('Ticket assigned', { ticketId, assignedTo: data.assignedTo, adminId: data.adminId });

      // Send notification to assignee
      await this.notifyTicketAssignment(ticket, assignee);

      return ticket;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error assigning ticket', { ticketId, data, error });
      throw new AppError('Failed to assign ticket', 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Close ticket
   */
  async closeTicket(ticketId: string, data: CloseTicketData) {
    try {
      const ticket = await prisma.supportTicket.update({
        where: { id: ticketId },
        data: {
          status: 'CLOSED',
          closedAt: new Date(),
          closedBy: data.userId,
        },
      });

      logger.info('Ticket closed', { ticketId, closedBy: data.userId });

      // Add resolution message if provided
      if (data.resolution) {
        await this.addMessage({
          ticketId,
          userId: data.userId,
          content: `Resolution: ${data.resolution}`,
          isInternal: false,
        });
      }

      // Send notification
      await this.notifyTicketClosed(ticket);

      return ticket;
    } catch (error) {
      logger.error('Error closing ticket', { ticketId, data, error });
      throw new AppError('Failed to close ticket', 500, 'DATABASE_ERROR');
    }
  }

  // ============================================================================
  // Notification Methods
  // ============================================================================

  /**
   * Notify admins of new ticket
   */
  private async notifyAdminsNewTicket(ticket: any) {
    try {
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true },
      });

      for (const admin of admins) {
        await notificationService.createNotification({
          userId: admin.id,
          title: 'New Support Ticket',
          message: `New ${ticket.priority} priority ticket: ${ticket.subject}`,
          type: 'SUPPORT_TICKET',
          relatedId: ticket.id,
          priority: ticket.priority === 'URGENT' ? 'HIGH' : 'MEDIUM',
        });
      }
    } catch (error) {
      logger.error('Error notifying admins of new ticket', { ticketId: ticket.id, error });
    }
  }

  /**
   * Notify about new ticket message
   */
  private async notifyTicketMessage(ticket: any, message: any) {
    try {
      // Notify ticket owner if message is from admin
      if (message.userId !== ticket.userId) {
        await notificationService.createNotification({
          userId: ticket.userId,
          title: 'New Message on Support Ticket',
          message: `You have a new message on ticket: ${ticket.subject}`,
          type: 'SUPPORT_MESSAGE',
          relatedId: ticket.id,
          priority: 'MEDIUM',
        });
      }

      // Notify assigned admin if message is from user
      if (ticket.assignedTo && message.userId === ticket.userId) {
        await notificationService.createNotification({
          userId: ticket.assignedTo,
          title: 'User Reply on Support Ticket',
          message: `User replied on ticket: ${ticket.subject}`,
          type: 'SUPPORT_MESSAGE',
          relatedId: ticket.id,
          priority: 'MEDIUM',
        });
      }
    } catch (error) {
      logger.error('Error notifying ticket message', { ticketId: ticket.id, error });
    }
  }

  /**
   * Notify ticket assignment
   */
  private async notifyTicketAssignment(ticket: any, assignee: any) {
    try {
      await notificationService.createNotification({
        userId: assignee.id,
        title: 'Support Ticket Assigned',
        message: `You have been assigned ticket: ${ticket.subject}`,
        type: 'SUPPORT_ASSIGNED',
        relatedId: ticket.id,
        priority: ticket.priority === 'URGENT' ? 'HIGH' : 'MEDIUM',
      });
    } catch (error) {
      logger.error('Error notifying ticket assignment', { ticketId: ticket.id, error });
    }
  }

  /**
   * Notify ticket closed
   */
  private async notifyTicketClosed(ticket: any) {
    try {
      await notificationService.createNotification({
        userId: ticket.userId,
        title: 'Support Ticket Closed',
        message: `Your support ticket has been resolved: ${ticket.subject}`,
        type: 'SUPPORT_CLOSED',
        relatedId: ticket.id,
        priority: 'LOW',
      });
    } catch (error) {
      logger.error('Error notifying ticket closed', { ticketId: ticket.id, error });
    }
  }
}

// Export singleton instance
export const supportService = new SupportService();
export default supportService;
