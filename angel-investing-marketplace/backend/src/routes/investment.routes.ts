import { Router } from 'express';
import { investmentController } from '../controllers/investment.controller.js';
import { authenticate } from '../middleware/auth.js';
import { validateBody, validateParams } from '../middleware/validation.js';
import { upload } from '../middleware/fileUpload.js';
import {
  createInvestmentSchema,
  updateInvestmentSchema,
  updateInvestmentStatusSchema,
  cancelInvestmentSchema,
  investmentListQuerySchema,
  investmentDocumentSchema,
  escrowInfoSchema,
  paymentConfirmationSchema,
} from '../validations/investment.validation.js';

const router = Router();

// All investment routes require authentication
router.use(authenticate);

// Create investment
router.post('/', validateBody(createInvestmentSchema), investmentController.createInvestment.bind(investmentController));

// List investments
router.get('/', validateBody(investmentListQuerySchema), investmentController.listInvestments.bind(investmentController));

// Get investment by ID
router.get('/:id', investmentController.getInvestmentById.bind(investmentController));

// Update investment
router.put('/:id', validateBody(updateInvestmentSchema), investmentController.updateInvestment.bind(investmentController));

// Cancel investment
router.post('/:id/cancel', validateBody(cancelInvestmentSchema), investmentController.cancelInvestment.bind(investmentController));

// Upload investment document
router.post('/:id/documents', upload.single('document'), validateBody(investmentDocumentSchema), investmentController.uploadDocument.bind(investmentController));

// Get investment documents
router.get('/:id/documents', investmentController.getDocuments.bind(investmentController));

// Confirm payment
router.post('/:id/confirm-payment', upload.single('paymentProof'), validateBody(paymentConfirmationSchema), investmentController.confirmPayment.bind(investmentController));

export default router;