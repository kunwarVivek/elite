import { Router } from 'express';
import { startupController } from '../controllers/startup.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validateBody, validateParams } from '../middleware/validation.js';
import { upload } from '../middleware/fileUpload.js';
import {
  createStartupSchema,
  updateStartupSchema,
  startupVerificationSchema,
  startupListQuerySchema,
  teamMemberSchema,
  addTeamMemberSchema,
  updateTeamMemberSchema,
} from '../validations/startup.validation.js';

const router = Router();

// Public routes (no authentication required)
router.get('/', validateBody(startupListQuerySchema), startupController.listStartups.bind(startupController));
router.get('/:id', startupController.getStartupById.bind(startupController));

// All other startup routes require authentication
router.use(authenticate);

// Create startup
router.post('/', upload.single('logo'), validateBody(createStartupSchema), startupController.createStartup.bind(startupController));

// Update startup
router.put('/:id', upload.single('logo'), validateBody(updateStartupSchema), startupController.updateStartup.bind(startupController));

// Delete startup
router.delete('/:id', startupController.deleteStartup.bind(startupController));

// Startup verification
router.post('/:id/verify', validateBody(startupVerificationSchema), startupController.submitForVerification.bind(startupController));
router.get('/:id/verification-status', startupController.getVerificationStatus.bind(startupController));

// Team management
router.post('/:id/team', upload.single('avatar'), validateBody(addTeamMemberSchema), startupController.addTeamMember.bind(startupController));
router.put('/:id/team/:memberId', upload.single('avatar'), validateBody(updateTeamMemberSchema), startupController.updateTeamMember.bind(startupController));
router.delete('/:id/team/:memberId', startupController.removeTeamMember.bind(startupController));

export default router;