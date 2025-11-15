import { Router } from 'express';
import { supportController } from '../controllers/support.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validation.js';
import {
  sqlInjectionPrevention,
  xssPrevention,
  inputSanitization,
} from '../middleware/security.js';
import { z } from 'zod';

const router = Router();

// Apply security middleware to all routes
router.use(sqlInjectionPrevention);
router.use(xssPrevention);
router.use(inputSanitization);

// ============================================================================
// Validation Schemas
// ============================================================================

const ticketIdParamSchema = z.object({
  id: z.string().cuid(),
});

const ticketsQuerySchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'WAITING_ON_USER', 'WAITING_ON_STAFF', 'RESOLVED', 'CLOSED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  category: z.enum(['GENERAL', 'TECHNICAL', 'BILLING', 'COMPLIANCE', 'FEATURE_REQUEST', 'BUG_REPORT', 'ACCOUNT']).optional(),
  assignedTo: z.string().cuid().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

const createTicketSchema = z.object({
  subject: z.string().min(1).max(200),
  description: z.string().min(1).max(5000),
  category: z.enum(['GENERAL', 'TECHNICAL', 'BILLING', 'COMPLIANCE', 'FEATURE_REQUEST', 'BUG_REPORT', 'ACCOUNT']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  tags: z.array(z.string()).optional(),
});

const addMessageSchema = z.object({
  content: z.string().min(1).max(5000),
  isInternal: z.boolean().optional(),
  attachments: z.array(z.any()).optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'WAITING_ON_USER', 'WAITING_ON_STAFF', 'RESOLVED', 'CLOSED']),
});

const closeTicketSchema = z.object({
  resolution: z.string().max(2000).optional(),
});

const assignTicketSchema = z.object({
  assignedTo: z.string().cuid(),
});

// ============================================================================
// User Support Routes
// ============================================================================

/**
 * Get user's tickets
 * GET /api/support/tickets
 */
router.get(
  '/tickets',
  authenticate,
  validateQuery(ticketsQuerySchema),
  supportController.getTickets.bind(supportController)
);

/**
 * Get ticket by ID with messages
 * GET /api/support/tickets/:id
 */
router.get(
  '/tickets/:id',
  authenticate,
  validateParams(ticketIdParamSchema),
  supportController.getTicketById.bind(supportController)
);

/**
 * Create support ticket
 * POST /api/support/tickets
 */
router.post(
  '/tickets',
  authenticate,
  validateBody(createTicketSchema),
  supportController.createTicket.bind(supportController)
);

/**
 * Add message to ticket
 * POST /api/support/tickets/:id/messages
 */
router.post(
  '/tickets/:id/messages',
  authenticate,
  validateParams(ticketIdParamSchema),
  validateBody(addMessageSchema),
  supportController.addMessage.bind(supportController)
);

/**
 * Update ticket status
 * PUT /api/support/tickets/:id/status
 */
router.put(
  '/tickets/:id/status',
  authenticate,
  validateParams(ticketIdParamSchema),
  validateBody(updateStatusSchema),
  supportController.updateStatus.bind(supportController)
);

/**
 * Close ticket
 * POST /api/support/tickets/:id/close
 */
router.post(
  '/tickets/:id/close',
  authenticate,
  validateParams(ticketIdParamSchema),
  validateBody(closeTicketSchema),
  supportController.closeTicket.bind(supportController)
);

// ============================================================================
// Admin Support Routes
// ============================================================================

/**
 * Get admin ticket queue (admin only)
 * GET /api/admin/support/tickets
 */
router.get(
  '/admin/tickets',
  authenticate,
  requireAdmin,
  validateQuery(ticketsQuerySchema),
  supportController.getAdminQueue.bind(supportController)
);

/**
 * Assign ticket to admin (admin only)
 * PUT /api/admin/support/tickets/:id/assign
 */
router.put(
  '/admin/tickets/:id/assign',
  authenticate,
  requireAdmin,
  validateParams(ticketIdParamSchema),
  validateBody(assignTicketSchema),
  supportController.assignTicket.bind(supportController)
);

export default router;
