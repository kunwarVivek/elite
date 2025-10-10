import { Router } from 'express';
import { pitchController } from '../controllers/pitch.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validateBody, validateParams } from '../middleware/validation.js';
import {
  createPitchSchema,
  updatePitchSchema,
  updatePitchStatusSchema,
  pitchListQuerySchema,
  pitchCommentSchema,
  pitchAnalyticsQuerySchema,
} from '../validations/pitch.validation.js';

const router = Router();

// Public routes (no authentication required)
router.get('/', validateBody(pitchListQuerySchema), pitchController.listPitches.bind(pitchController));
router.get('/:id', pitchController.getPitchById.bind(pitchController));
router.get('/:id/analytics', validateBody(pitchAnalyticsQuerySchema), pitchController.getPitchAnalytics.bind(pitchController));

// All other pitch routes require authentication
router.use(authenticate);

// Create pitch
router.post('/', validateBody(createPitchSchema), pitchController.createPitch.bind(pitchController));

// Update pitch
router.put('/:id', validateBody(updatePitchSchema), pitchController.updatePitch.bind(pitchController));

// Pitch status management
router.post('/:id/publish', pitchController.publishPitch.bind(pitchController));
router.post('/:id/pause', pitchController.pausePitch.bind(pitchController));
router.put('/:id/status', validateBody(updatePitchStatusSchema), pitchController.updatePitchStatus.bind(pitchController));

// Delete pitch
router.delete('/:id', pitchController.deletePitch.bind(pitchController));

// Pitch comments
router.post('/:id/comments', validateBody(pitchCommentSchema), pitchController.addComment.bind(pitchController));

export default router;