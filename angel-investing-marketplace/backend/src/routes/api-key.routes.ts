import { Router } from 'express';
import { apiKeyController } from '../controllers/api-key.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validateBody, validateParams } from '../middleware/validation.js';
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

const apiKeyIdParamSchema = z.object({
  id: z.string().cuid(),
});

const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  permissions: z.object({}).optional().default({}),
  rateLimit: z.number().int().positive().max(10000).optional(),
  expiresAt: z.string().optional(), // ISO date string
});

const updateApiKeySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  permissions: z.object({}).optional(),
  rateLimit: z.number().int().positive().max(10000).optional(),
  isActive: z.boolean().optional(),
});

// ============================================================================
// API Key Routes
// ============================================================================

/**
 * Get user's API keys
 * GET /api/api-keys
 */
router.get(
  '/',
  authenticate,
  apiKeyController.getApiKeys.bind(apiKeyController)
);

/**
 * Create API key
 * POST /api/api-keys
 */
router.post(
  '/',
  authenticate,
  validateBody(createApiKeySchema),
  apiKeyController.createApiKey.bind(apiKeyController)
);

/**
 * Update API key
 * PUT /api/api-keys/:id
 */
router.put(
  '/:id',
  authenticate,
  validateParams(apiKeyIdParamSchema),
  validateBody(updateApiKeySchema),
  apiKeyController.updateApiKey.bind(apiKeyController)
);

/**
 * Delete API key
 * DELETE /api/api-keys/:id
 */
router.delete(
  '/:id',
  authenticate,
  validateParams(apiKeyIdParamSchema),
  apiKeyController.deleteApiKey.bind(apiKeyController)
);

/**
 * Regenerate API key
 * POST /api/api-keys/:id/regenerate
 */
router.post(
  '/:id/regenerate',
  authenticate,
  validateParams(apiKeyIdParamSchema),
  apiKeyController.regenerateApiKey.bind(apiKeyController)
);

/**
 * Get API key usage statistics
 * GET /api/api-keys/:id/usage
 */
router.get(
  '/:id/usage',
  authenticate,
  validateParams(apiKeyIdParamSchema),
  apiKeyController.getUsageStats.bind(apiKeyController)
);

export default router;
