import { Router } from 'express';
import { paymentController } from '../controllers/payment.controller.js';
import { validateBody, validateQuery } from '../middleware/validation.js';
import {
  processPaymentSchema,
  refundSchema,
  releaseEscrowSchema,
  calculateFeesSchema,
  createStripeCustomerSchema,
  paymentMethodsQuerySchema,
  paymentStatsQuerySchema,
  batchPaymentSchema,
  createDisputeSchema,
} from '../validations/payment.validation.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All payment routes require authentication
router.use(authenticate);

// POST /api/v1/payments/process - Process investment payment
router.post(
  '/process',
  validateBody(processPaymentSchema),
  paymentController.processPayment.bind(paymentController)
);

// GET /api/v1/payments/:id - Get payment details
router.get(
  '/:id',
  paymentController.getPaymentDetails.bind(paymentController)
);

// POST /api/v1/payments/:id/refund - Process refund
router.post(
  '/:id/refund',
  validateBody(refundSchema),
  paymentController.processRefund.bind(paymentController)
);

// POST /api/v1/payments/escrow/release - Release escrow funds
router.post(
  '/escrow/release',
  validateBody(releaseEscrowSchema),
  paymentController.releaseEscrowFunds.bind(paymentController)
);

// GET /api/v1/payments/methods - Get available payment methods
router.get(
  '/methods',
  validateQuery(paymentMethodsQuerySchema),
  paymentController.getPaymentMethods.bind(paymentController)
);

// POST /api/v1/payments/webhook/stripe - Stripe webhook handler (no auth required)
router.post(
  '/webhook/stripe',
  paymentController.handleStripeWebhook.bind(paymentController)
);

// GET /api/v1/payments/fees/calculate - Calculate fees for investment
router.get(
  '/fees/calculate',
  validateQuery(calculateFeesSchema),
  paymentController.calculateFees.bind(paymentController)
);

// GET /api/v1/payments/stats - Get payment statistics (admin only)
router.get(
  '/stats',
  validateQuery(paymentStatsQuerySchema),
  paymentController.getPaymentStats.bind(paymentController)
);

// POST /api/v1/payments/customer/create - Create Stripe customer
router.post(
  '/customer/create',
  validateBody(createStripeCustomerSchema),
  paymentController.createStripeCustomer.bind(paymentController)
);

// GET /api/v1/payments/customer/payment-methods - Get customer payment methods
router.get(
  '/customer/payment-methods',
  paymentController.getCustomerPaymentMethods.bind(paymentController)
);

// POST /api/v1/payments/batch - Process batch payments (admin only)
router.post(
  '/batch',
  validateBody(batchPaymentSchema),
  paymentController.processBatchPayments.bind(paymentController)
);

// POST /api/v1/payments/dispute - Create payment dispute
router.post(
  '/dispute',
  validateBody(createDisputeSchema),
  paymentController.createDispute.bind(paymentController)
);

export default router;