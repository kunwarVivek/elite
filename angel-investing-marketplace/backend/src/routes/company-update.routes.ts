import { Router } from 'express';
import { companyUpdateController } from '../controllers/company-update.controller.js';
import { authenticate } from '../middleware/auth.js';
import updateSocialCardRoutes from './update-social-card.routes.js';

const router = Router();

// Public routes
router.get('/', companyUpdateController.getUpdates.bind(companyUpdateController));
router.get('/:id', companyUpdateController.getUpdate.bind(companyUpdateController));

// Authenticated routes
router.use(authenticate);

router.post('/', companyUpdateController.createUpdate.bind(companyUpdateController));
router.put('/:id', companyUpdateController.updateUpdate.bind(companyUpdateController));
router.post('/:id/publish', companyUpdateController.publishUpdate.bind(companyUpdateController));
router.delete('/:id', companyUpdateController.deleteUpdate.bind(companyUpdateController));
router.post('/:id/pin', companyUpdateController.togglePin.bind(companyUpdateController));
router.post('/:id/reactions', companyUpdateController.addReaction.bind(companyUpdateController));
router.delete('/:id/reactions', companyUpdateController.removeReaction.bind(companyUpdateController));
router.post('/:id/comments', companyUpdateController.addComment.bind(companyUpdateController));

// Social card routes - FR-4.2: Social Card Generation
router.use('/:updateId/social-card', updateSocialCardRoutes);
router.use('/:updateId/social-share', updateSocialCardRoutes);
router.use('/:updateId/social-stats', updateSocialCardRoutes);
router.use('/:updateId/share-urls', updateSocialCardRoutes);

export default router;
