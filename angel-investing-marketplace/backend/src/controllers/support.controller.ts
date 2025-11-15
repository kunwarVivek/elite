import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler.js';
import { sendSuccess, sendCreated } from '../utils/response.js';
import { logger } from '../config/logger.js';
import { supportService } from '../services/support.service.js';

/**
 * Support Controller
 * Handles all HTTP requests for support ticket operations
 */

// Extend Request interface for authenticated user
interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name?: string;
    role: string;
  };
}

class SupportController {
  /**
   * Get user's tickets
   * GET /api/support/tickets
   */
  async getTickets(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { status, priority, category, page, limit } = req.query;

      const result = await supportService.getTickets({
        userId, // Filter by user's tickets
        status: status as string,
        priority: priority as string,
        category: category as string,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
      });

      sendSuccess(res, result, 'Tickets retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get ticket by ID with messages
   * GET /api/support/tickets/:id
   */
  async getTicketById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params;
      const isAdmin = userRole === 'ADMIN';

      const ticket = await supportService.getTicketById(id, userId, isAdmin);

      sendSuccess(res, { ticket }, 'Ticket retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create support ticket
   * POST /api/support/tickets
   */
  async createTicket(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { subject, description, category, priority, tags } = req.body;

      const ticket = await supportService.createTicket({
        userId,
        subject,
        description,
        category,
        priority,
        tags,
      });

      logger.info('Support ticket created', { ticketId: ticket.id, userId });

      sendCreated(res, { ticket }, 'Ticket created successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add message to ticket
   * POST /api/support/tickets/:id/messages
   */
  async addMessage(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params;
      const { content, isInternal, attachments } = req.body;

      // Only admins can create internal messages
      const isInternalMessage = isInternal && userRole === 'ADMIN';

      const message = await supportService.addMessage({
        ticketId: id,
        userId,
        content,
        isInternal: isInternalMessage,
        attachments,
      });

      logger.info('Message added to ticket', { ticketId: id, messageId: message.id, userId });

      sendCreated(res, { message }, 'Message added successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update ticket status
   * PUT /api/support/tickets/:id/status
   */
  async updateStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params;
      const { status } = req.body;

      const ticket = await supportService.updateStatus(id, {
        status,
        userId,
      });

      logger.info('Ticket status updated', { ticketId: id, status, userId });

      sendSuccess(res, { ticket }, 'Ticket status updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Close ticket
   * POST /api/support/tickets/:id/close
   */
  async closeTicket(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params;
      const { resolution } = req.body;

      const ticket = await supportService.closeTicket(id, {
        userId,
        resolution,
      });

      logger.info('Ticket closed', { ticketId: id, userId });

      sendSuccess(res, { ticket }, 'Ticket closed successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get admin ticket queue (admin only)
   * GET /api/admin/support/tickets
   */
  async getAdminQueue(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { status, priority, category, assignedTo, page, limit } = req.query;

      const result = await supportService.getTickets({
        status: status as string,
        priority: priority as string,
        category: category as string,
        assignedTo: assignedTo as string,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 50,
      });

      sendSuccess(res, result, 'Admin queue retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Assign ticket to admin (admin only)
   * PUT /api/admin/support/tickets/:id/assign
   */
  async assignTicket(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params;
      const { assignedTo } = req.body;

      const ticket = await supportService.assignTicket(id, {
        assignedTo,
        adminId,
      });

      logger.info('Ticket assigned', { ticketId: id, assignedTo, adminId });

      sendSuccess(res, { ticket }, 'Ticket assigned successfully');
    } catch (error) {
      next(error);
    }
  }
}

// Export singleton instance
export const supportController = new SupportController();
export default supportController;
