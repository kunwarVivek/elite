import { Router } from 'express';
import { userController } from '../controllers/user.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validateBody, validateParams } from '../middleware/validation.js';
import { uploadSingle, uploadFields } from '../middleware/fileUpload.js';
import {
  adminRateLimiter,
  sqlInjectionPrevention,
  xssPrevention,
  inputSanitization
} from '../middleware/security.js';
import {
  kycSubmissionSchema,
  accreditationSchema,
  userProfileSchema,
  updateUserStatusSchema,
  userListQuerySchema,
} from '../validations/user.validation.js';

const router = Router();

// Apply security middleware
router.use(sqlInjectionPrevention);
router.use(xssPrevention);
router.use(inputSanitization);

// All user routes require authentication
router.use(authenticate);

// Admin routes get additional rate limiting
router.get('/', adminRateLimiter);
router.put('/:id/status', adminRateLimiter);
router.delete('/:id', adminRateLimiter);

// Get current user profile
router.get('/me', userController.getProfile.bind(userController));

// Update current user profile
router.put('/me', uploadSingle('avatar'), validateBody(userProfileSchema), userController.updateProfile.bind(userController));

// Submit KYC verification
router.post('/:id/kyc', uploadFields([
  { name: 'document1', maxCount: 1 },
  { name: 'document2', maxCount: 1 },
  { name: 'document3', maxCount: 1 },
]), validateBody(kycSubmissionSchema), userController.submitKyc.bind(userController));

// Get KYC status
router.get('/:id/kyc-status', userController.getKycStatus.bind(userController));

// Submit accreditation
router.post('/:id/accreditation', uploadFields([
  { name: 'document1', maxCount: 1 },
  { name: 'document2', maxCount: 1 },
  { name: 'document3', maxCount: 1 },
]), validateBody(accreditationSchema), userController.submitAccreditation.bind(userController));

// Get accreditation status
router.get('/:id/accreditation-status', userController.getAccreditationStatus.bind(userController));

// Admin routes
router.get('/', validateBody(userListQuerySchema), userController.listUsers.bind(userController));
router.put('/:id/status', validateBody(updateUserStatusSchema), userController.updateUserStatus.bind(userController));
router.delete('/:id', userController.deleteUser.bind(userController));

// Public routes (no authentication required)
router.get('/:id', userController.getUserById.bind(userController));

export default router;