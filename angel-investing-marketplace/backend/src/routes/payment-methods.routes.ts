import { Router } from 'express';
import { paymentMethodsController } from '../controllers/payment-methods.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All payment methods routes require authentication
router.use(authenticate);

// Get all payment methods
router.get('/', paymentMethodsController.getPaymentMethods.bind(paymentMethodsController));

// Add bank account
router.post('/bank', paymentMethodsController.addBankAccount.bind(paymentMethodsController));

// Add card
router.post('/card', paymentMethodsController.addCard.bind(paymentMethodsController));

// Set default payment method
router.post('/:id/set-default', paymentMethodsController.setDefaultPaymentMethod.bind(paymentMethodsController));

// Delete payment method
router.delete('/:id', paymentMethodsController.deletePaymentMethod.bind(paymentMethodsController));

// Verify bank account
router.post('/bank/:id/verify', paymentMethodsController.verifyBankAccount.bind(paymentMethodsController));

export default router;
