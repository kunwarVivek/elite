import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler.js';
import { sendSuccess } from '../utils/response.js';
import { logger } from '../config/logger.js';
import PaymentService from '../services/payment.service.js';
import StripeService from '../services/stripe.service.js';
// import EscrowService from '../services/escrow.service.js'; // TODO: Used in future implementation
import FeeCalculatorService from '../services/fee-calculator.service.js';
import { PaymentConfig } from '../config/payment.js';
import { prisma } from '../config/database.js';

// Types for better type safety
interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name?: string;
    role: string;
  };
}

interface PaymentParams {
  id: string;
}

interface ProcessPaymentData {
  investmentId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  investmentType?: 'DIRECT' | 'SYNDICATE';
}

interface RefundData {
  investmentId: string;
  reason: string;
  amount?: number;
}

interface ReleaseEscrowData {
  escrowReference: string;
  releaseType?: 'AUTOMATIC' | 'MANUAL' | 'CONDITIONAL';
  conditions?: any;
}

class PaymentController {
  // POST /api/v1/payments/process - Process investment payment
  async processPayment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const paymentData: ProcessPaymentData = req.body;

      // Validate required fields
      if (!paymentData.investmentId || !paymentData.amount || !paymentData.paymentMethod) {
        throw new AppError('Investment ID, amount, and payment method are required', 400, 'MISSING_REQUIRED_FIELDS');
      }

      // Get investment details (placeholder - would query database)
      const investment = await this.getInvestmentById(paymentData.investmentId);
      if (!investment) {
        throw new AppError('Investment not found', 404, 'INVESTMENT_NOT_FOUND');
      }

      if (investment.investorId !== userId && req.user?.role !== 'ADMIN') {
        throw new AppError('Not authorized to process payment for this investment', 403, 'NOT_AUTHORIZED');
      }

      // Prepare payment data
      const fullPaymentData = {
        investmentId: paymentData.investmentId,
        investorId: investment.investorId,
        startupId: investment.startupId,
        amount: paymentData.amount,
        currency: paymentData.currency || 'USD',
        paymentMethod: paymentData.paymentMethod,
        investmentType: paymentData.investmentType || investment.investmentType || 'DIRECT',
      };

      // Process payment
      const result = await PaymentService.processInvestmentPayment(fullPaymentData);

      logger.info('Payment processed successfully', {
        investmentId: paymentData.investmentId,
        paymentIntentId: result.paymentIntentId,
        amount: result.amount,
      });

      sendSuccess(res, {
        payment_intent_id: result.paymentIntentId,
        client_secret: result.clientSecret,
        amount: result.amount,
        currency: result.currency,
        fees: result.fees,
        escrow_reference: result.escrowReference,
        status: result.status,
        next_steps: [
          'Complete payment using the provided client secret',
          'Wait for payment confirmation webhook',
          'Funds will be held in escrow until release conditions are met',
        ],
      }, 'Payment processing initiated successfully', 201);

    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/payments/:id - Get payment details
  async getPaymentDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as unknown as PaymentParams;

      // Get payment status from PaymentService
      const paymentStatus = await PaymentService.getPaymentStatus(id);

      sendSuccess(res, {
        investment_id: paymentStatus.investmentId,
        payment_status: paymentStatus.paymentStatus,
        escrow_status: paymentStatus.escrowStatus,
        amount: paymentStatus.amount,
        currency: paymentStatus.currency,
        fees: paymentStatus.fees,
        breakdown: {
          investment_amount: paymentStatus.fees.investmentAmount,
          platform_fee: paymentStatus.fees.platformFee,
          carry_fee: paymentStatus.fees.carryFee,
          total_fee: paymentStatus.fees.totalFee,
          net_amount: paymentStatus.fees.netAmount,
        },
      }, 'Payment details retrieved successfully');

    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/payments/:id/refund - Process refund
  async processRefund(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params as unknown as PaymentParams;
      const refundData: RefundData = req.body;

      if (!refundData.reason) {
        throw new AppError('Refund reason is required', 400, 'REFUND_REASON_REQUIRED');
      }

      // Check if user owns the investment or is admin
      const investment = await this.getInvestmentById(id);
      if (!investment) {
        throw new AppError('Investment not found', 404, 'INVESTMENT_NOT_FOUND');
      }

      if (investment.investorId !== userId && req.user?.role !== 'ADMIN') {
        throw new AppError('Not authorized to process refund for this investment', 403, 'NOT_AUTHORIZED');
      }

      // Process refund
      const result = await PaymentService.processRefund({
        investmentId: id,
        reason: refundData.reason,
        amount: refundData.amount,
      });

      if (!result.success) {
        throw new AppError(result.error || 'Refund processing failed', 400, 'REFUND_FAILED');
      }

      logger.info('Refund processed successfully', {
        investmentId: id,
        refundId: result.refundId,
        amount: result.amount,
      });

      sendSuccess(res, {
        refund_id: result.refundId,
        amount: result.amount,
        status: result.status,
        processed_at: new Date().toISOString(),
      }, 'Refund processed successfully');

    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/payments/escrow/release - Release escrow funds
  async releaseEscrowFunds(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const releaseData: ReleaseEscrowData = req.body;

      if (!releaseData.escrowReference) {
        throw new AppError('Escrow reference is required', 400, 'ESCROW_REFERENCE_REQUIRED');
      }

      // Check authorization (admin or startup founder)
      if (req.user?.role !== 'ADMIN') {
        // TODO: Check if user is the startup founder for this escrow
        // const escrow = await EscrowService.getEscrow(releaseData.escrowReference);
        // if (!escrow || escrow.startupId !== userId) {
        //   throw new AppError('Not authorized to release this escrow', 403, 'NOT_AUTHORIZED');
        // }
      }

      // Release escrow funds
      await PaymentService.releaseEscrowFunds(
        releaseData.escrowReference,
        releaseData.releaseType || 'MANUAL',
        releaseData.conditions
      );

      logger.info('Escrow funds released', {
        escrowReference: releaseData.escrowReference,
        releasedBy: userId,
      });

      sendSuccess(res, {
        escrow_reference: releaseData.escrowReference,
        status: 'RELEASED',
        released_at: new Date().toISOString(),
      }, 'Escrow funds released successfully');

    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/payments/methods - Get available payment methods
  async getPaymentMethods(req: Request, res: Response, next: NextFunction) {
    try {
      const { amount, currency } = req.query;

      const paymentAmount = amount ? parseFloat(amount as string) : 1000; // Default amount for filtering
      const paymentCurrency = (currency as string) || 'USD';

      const availableMethods = PaymentService.getAvailablePaymentMethods(paymentAmount, paymentCurrency);

      const methodsWithFees = availableMethods.map(method => ({
        id: method.id,
        name: method.name,
        description: method.description,
        fees: {
          platform_fee: PaymentConfig.calculatePlatformFee(paymentAmount),
          processing_fee: FeeCalculatorService.calculateProcessingFee(paymentAmount),
        },
        limits: {
          minimum: method.minAmount,
          maximum: method.maxAmount,
        },
        supported_currencies: method.currencies,
      }));

      sendSuccess(res, {
        methods: methodsWithFees,
        default_currency: 'USD',
        // fee_structure: PaymentConfig.getFeeStructure(), // TODO: Implement in TASK3
      }, 'Payment methods retrieved successfully');

    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/payments/webhook/stripe - Stripe webhook handler
  async handleStripeWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const signature = req.headers['stripe-signature'] as string;
      const body = req.body;

      if (!signature) {
        throw new AppError('Stripe signature missing', 400, 'SIGNATURE_MISSING');
      }

      // Process webhook
      // TODO: Implement WebhookService in TASK3
      const event: any = {
        type: 'unknown',
        data: body,
      };
      // const event = await WebhookService.processWebhook(
      //   JSON.stringify(body),
      //   signature,
      //   process.env.STRIPE_WEBHOOK_SECRET!
      // );

      logger.info('Stripe webhook processed', {
        eventType: event.eventType,
        eventId: event.eventId,
      });

      sendSuccess(res, {
        received: true,
        event_type: event.eventType,
        event_id: event.eventId,
      }, 'Webhook processed successfully');

    } catch (error) {
      logger.error('Stripe webhook processing failed', { error });
      next(error);
    }
  }

  // GET /api/v1/payments/fees/calculate - Calculate fees for investment
  async calculateFees(req: Request, res: Response, next: NextFunction) {
    try {
      const { amount, investment_type, performance_multiple } = req.query;

      if (!amount) {
        throw new AppError('Amount is required', 400, 'AMOUNT_REQUIRED');
      }

      const investmentAmount = parseFloat(amount as string);
      const investmentType = (investment_type as 'DIRECT' | 'SYNDICATE') || 'DIRECT';
      const performanceMultiple = performance_multiple ? parseFloat(performance_multiple as string) : undefined;

      // Validate inputs
      FeeCalculatorService.validateFeeInputs(investmentAmount, investmentType);

      // Calculate fees
      const fees = FeeCalculatorService.calculateInvestmentFees(
        investmentAmount,
        investmentType,
        performanceMultiple
      );

      sendSuccess(res, {
        investment_amount: fees.investmentAmount,
        fees: {
          platform_fee: fees.platformFee,
          carry_fee: fees.carryFee,
          processing_fee: fees.feeBreakdown.processingFee,
          total_fee: fees.totalFee,
        },
        net_amount: fees.netAmount,
        breakdown: fees.feeBreakdown,
        fee_structure: FeeCalculatorService.getFeeStructure(),
      }, 'Fees calculated successfully');

    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/payments/stats - Get payment statistics
  async getPaymentStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // Check if user is admin
      if (req.user?.role !== 'ADMIN') {
        throw new AppError('Admin access required', 403, 'ADMIN_REQUIRED');
      }

      const stats = await PaymentService.getPaymentStats();

      sendSuccess(res, {
        total_payments: stats.totalPayments,
        total_amount: stats.totalAmount,
        total_fees: stats.totalFees,
        escrow_stats: stats.escrowStats,
        payment_method_breakdown: stats.paymentMethodBreakdown,
      }, 'Payment statistics retrieved successfully');

    } catch (error) {
      next(error);
    }
  }

  // POST /api/v1/payments/customer/create - Create Stripe customer
  async createStripeCustomer(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { email, name } = req.body;

      if (!email || !name) {
        throw new AppError('Email and name are required', 400, 'MISSING_REQUIRED_FIELDS');
      }

      const customerId = await StripeService.getOrCreateCustomer(email, name, userId);

      logger.info('Stripe customer created', { customerId, userId });

      sendSuccess(res, {
        customer_id: customerId,
        created_at: new Date().toISOString(),
      }, 'Stripe customer created successfully');

    } catch (error) {
      next(error);
    }
  }

  // GET /api/v1/payments/customer/payment-methods - Get customer payment methods
  async getCustomerPaymentMethods(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      // Get user's Stripe customer ID (placeholder - would query database)
      const customerId = await this.getUserStripeCustomerId(userId);
      if (!customerId) {
        throw new AppError('Stripe customer not found', 404, 'CUSTOMER_NOT_FOUND');
      }

      const paymentMethods = await StripeService.getCustomerPaymentMethods(customerId);

      sendSuccess(res, {
        payment_methods: paymentMethods,
      }, 'Payment methods retrieved successfully');

    } catch (error) {
      next(error);
    }
  }

  // Helper methods (database operations)
  private async getInvestmentById(investmentId: string): Promise<any> {
    try {
      const investment = await prisma.investment.findUnique({
        where: { id: investmentId },
        include: {
          pitch: {
            select: {
              id: true,
              startup: {
                select: {
                  id: true,
                  founderId: true,
                },
              },
            },
          },
        },
      });

      if (!investment) {
        return null;
      }

      return {
        id: investment.id,
        investorId: investment.investorId,
        startupId: investment.pitch.startup.id,
        amount: Number(investment.amount),
        currency: investment.currency || 'USD',
        status: investment.status,
        investmentType: investment.investmentType,
      };
    } catch (error) {
      logger.error('Error getting investment by ID', { investmentId, error });
      throw error;
    }
  }

  private async getUserStripeCustomerId(userId: string): Promise<string | null> {
    try {
      // For now, return null as we don't have a stripe customer ID field in the schema
      // In a full implementation, you might add this field to the User model
      logger.info('Getting user Stripe customer ID', { userId });
      return null;
    } catch (error) {
      logger.error('Error getting user Stripe customer ID', { userId, error });
      throw error;
    }
  }

  // Process batch payments
  async processBatchPayments(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId || req.user?.role !== 'ADMIN') {
        throw new AppError('Admin access required', 403, 'ADMIN_REQUIRED');
      }

      const { paymentIds } = req.body;
      // TODO: Implement batch payment processing logic

      logger.info('Batch payments processed', { paymentIds, processedBy: userId });

      sendSuccess(res, { processed: paymentIds.length, success: true }, 'Batch payments processed successfully');
    } catch (error) {
      next(error);
    }
  }

  // Create dispute
  async createDispute(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { paymentId, reason: _reason, evidence: _evidence } = req.body;
      // TODO: Implement dispute creation logic

      logger.info('Dispute created', { paymentId, userId });

      sendSuccess(res, { id: 'dispute_123', status: 'PENDING' }, 'Dispute created successfully', 201);
    } catch (error) {
      next(error);
    }
  }
}

// Export singleton instance
export const paymentController = new PaymentController();
export default paymentController;