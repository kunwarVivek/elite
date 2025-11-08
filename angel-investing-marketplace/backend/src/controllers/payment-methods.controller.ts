import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../config/logger.js';

const prisma = new PrismaClient();

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name?: string;
    role: string;
  };
}

export class PaymentMethodsController {
  /**
   * Get all payment methods for user
   * GET /api/payment-methods
   */
  async getPaymentMethods(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
      }

      // In a real implementation, this would fetch from Stripe
      // For now, return mock data structure
      const paymentMethods = [
        // Mock bank account
        {
          id: 'pm_bank_1',
          type: 'BANK_ACCOUNT',
          bankName: 'Chase Bank',
          accountType: 'CHECKING',
          last4: '1234',
          isDefault: true,
          isVerified: true,
          addedAt: new Date('2024-01-01'),
        },
        // Mock card
        {
          id: 'pm_card_1',
          type: 'CARD',
          brand: 'VISA',
          last4: '4242',
          expiryMonth: 12,
          expiryYear: 2028,
          isDefault: false,
          addedAt: new Date('2024-02-01'),
        },
      ];

      res.json({
        success: true,
        data: paymentMethods,
      });
    } catch (error) {
      logger.error('Error fetching payment methods:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch payment methods',
      });
    }
  }

  /**
   * Add bank account
   * POST /api/payment-methods/bank
   */
  async addBankAccount(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
      }

      const { routingNumber, accountNumber, accountType } = req.body;

      // Validate input
      if (!routingNumber || !accountNumber || !accountType) {
        return res.status(400).json({
          success: false,
          error: 'Routing number, account number, and account type are required',
        });
      }

      if (routingNumber.length !== 9) {
        return res.status(400).json({
          success: false,
          error: 'Routing number must be 9 digits',
        });
      }

      if (!['CHECKING', 'SAVINGS'].includes(accountType)) {
        return res.status(400).json({
          success: false,
          error: 'Account type must be CHECKING or SAVINGS',
        });
      }

      // In a real implementation:
      // 1. Create Stripe bank account token
      // 2. Attach to Stripe customer
      // 3. Store payment method reference in database
      // 4. Initiate micro-deposits for verification

      // Mock response
      const paymentMethod = {
        id: `pm_bank_${Date.now()}`,
        type: 'BANK_ACCOUNT',
        bankName: 'Unknown Bank', // Would be resolved via routing number lookup
        accountType,
        last4: accountNumber.slice(-4),
        isDefault: false,
        isVerified: false, // Requires micro-deposit verification
        addedAt: new Date(),
      };

      logger.info('Bank account added', { userId, last4: paymentMethod.last4 });

      res.status(201).json({
        success: true,
        data: paymentMethod,
        message: 'Bank account added. Please verify via micro-deposits.',
      });
    } catch (error) {
      logger.error('Error adding bank account:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add bank account',
      });
    }
  }

  /**
   * Add card
   * POST /api/payment-methods/card
   */
  async addCard(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
      }

      const { cardNumber, expiryMonth, expiryYear, cvv, zipCode } = req.body;

      // Validate input
      if (!cardNumber || !expiryMonth || !expiryYear || !cvv || !zipCode) {
        return res.status(400).json({
          success: false,
          error: 'All card details are required',
        });
      }

      // Basic validation
      if (cardNumber.replace(/\s/g, '').length < 13) {
        return res.status(400).json({
          success: false,
          error: 'Invalid card number',
        });
      }

      const month = parseInt(expiryMonth);
      const year = parseInt(expiryYear);

      if (month < 1 || month > 12) {
        return res.status(400).json({
          success: false,
          error: 'Invalid expiry month',
        });
      }

      if (year < new Date().getFullYear()) {
        return res.status(400).json({
          success: false,
          error: 'Card is expired',
        });
      }

      // In a real implementation:
      // 1. Use Stripe.js on frontend to tokenize card (NEVER send raw card data to backend)
      // 2. Receive token on backend
      // 3. Attach token to Stripe customer
      // 4. Store payment method reference in database

      // Detect card brand (simple detection)
      const cleanNumber = cardNumber.replace(/\s/g, '');
      let brand = 'UNKNOWN';
      if (cleanNumber.startsWith('4')) brand = 'VISA';
      else if (/^5[1-5]/.test(cleanNumber)) brand = 'MASTERCARD';
      else if (/^3[47]/.test(cleanNumber)) brand = 'AMEX';
      else if (cleanNumber.startsWith('6')) brand = 'DISCOVER';

      // Mock response
      const paymentMethod = {
        id: `pm_card_${Date.now()}`,
        type: 'CARD',
        brand,
        last4: cleanNumber.slice(-4),
        expiryMonth: month,
        expiryYear: year,
        isDefault: false,
        addedAt: new Date(),
      };

      logger.info('Card added', { userId, last4: paymentMethod.last4, brand });

      res.status(201).json({
        success: true,
        data: paymentMethod,
      });
    } catch (error) {
      logger.error('Error adding card:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to add card',
      });
    }
  }

  /**
   * Set default payment method
   * POST /api/payment-methods/:id/set-default
   */
  async setDefaultPaymentMethod(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
      }

      const { id } = req.params;

      // In a real implementation:
      // 1. Verify payment method belongs to user
      // 2. Update Stripe customer default payment method
      // 3. Update database

      logger.info('Default payment method updated', { userId, paymentMethodId: id });

      res.json({
        success: true,
        message: 'Default payment method updated',
      });
    } catch (error) {
      logger.error('Error setting default payment method:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to set default payment method',
      });
    }
  }

  /**
   * Delete payment method
   * DELETE /api/payment-methods/:id
   */
  async deletePaymentMethod(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
      }

      const { id } = req.params;

      // In a real implementation:
      // 1. Verify payment method belongs to user
      // 2. Check if it's the default method (require user to set a new default first)
      // 3. Detach from Stripe customer
      // 4. Delete from database

      logger.info('Payment method deleted', { userId, paymentMethodId: id });

      res.json({
        success: true,
        message: 'Payment method deleted',
      });
    } catch (error) {
      logger.error('Error deleting payment method:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete payment method',
      });
    }
  }

  /**
   * Verify bank account with micro-deposits
   * POST /api/payment-methods/bank/:id/verify
   */
  async verifyBankAccount(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated',
        });
      }

      const { id } = req.params;
      const { amount1, amount2 } = req.body;

      if (!amount1 || !amount2) {
        return res.status(400).json({
          success: false,
          error: 'Both micro-deposit amounts are required',
        });
      }

      // In a real implementation:
      // 1. Verify the two micro-deposit amounts with Stripe
      // 2. Mark bank account as verified in database

      logger.info('Bank account verification attempted', { userId, paymentMethodId: id });

      res.json({
        success: true,
        message: 'Bank account verified successfully',
      });
    } catch (error) {
      logger.error('Error verifying bank account:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to verify bank account',
      });
    }
  }
}

export const paymentMethodsController = new PaymentMethodsController();
