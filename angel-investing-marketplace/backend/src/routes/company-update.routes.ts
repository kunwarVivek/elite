import { Router } from 'express';
import { companyUpdateController } from '../controllers/company-update.controller.js';
import { authenticate } from '../middleware/auth.js';

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

export default router;
