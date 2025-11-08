import { Router } from 'express';
import { spvController } from '../controllers/spv.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All SPV routes require authentication
router.use(authenticate);

// Get user's SPVs
router.get('/my-spvs', spvController.getMySpvs.bind(spvController));

// Get SPV by slug
router.get('/:slug', spvController.getSpvBySlug.bind(spvController));

// Create SPV (lead investors only)
router.post('/', spvController.createSpv.bind(spvController));

// Update SPV (lead investors only)
router.put('/:id', spvController.updateSpv.bind(spvController));

export default router;
