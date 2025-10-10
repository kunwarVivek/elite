import StripeService from './stripe.service.js';
import EscrowService from './escrow.service.js';
import FeeCalculatorService from './fee-calculator.service.js';
import { PaymentConfig } from '../config/payment.js';
import { logger } from '../config/logger.js';
import { prisma } from '../config/database.js';

export interface PaymentData {
  investmentId: string;
  investorId: string;
  startupId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  investmentType?: 'DIRECT' | 'SYNDICATE';
}

export interface PaymentResult {
  success: boolean;
  paymentIntentId?: string;
  clientSecret?: string;
  amount: number;
  currency: string;
  fees: {
    platformFee: number;
    totalAmount: number;
  };
  escrowReference?: string;
  status: string;
  error?: string;
}

export interface RefundData {
  investmentId: string;
  reason: string;
  amount?: number; // Partial refund if specified
}

export interface RefundResult {
  success: boolean;
  refundId?: string;
  amount: number;
  status: string;
  error?: string;
}

export class PaymentService {
  /**
   * Process a new investment payment
   */
  static async processInvestmentPayment(data: PaymentData): Promise<PaymentResult> {
    try {
      const { investmentId, investorId, startupId, amount, currency, paymentMethod, investmentType = 'DIRECT' } = data;

      // Validate payment data
      this.validatePaymentData(data);

      // Check if KYC is required
      if (PaymentConfig.isKycRequired(amount)) {
        logger.info('KYC verification required for investment', { investmentId, amount });
        // TODO: Check KYC status and throw error if not verified
      }

      // Calculate fees
      const feeCalculation = FeeCalculatorService.calculateInvestmentFees(amount, investmentType);
      const totalAmount = amount + feeCalculation.totalFee;

      // Create Stripe payment intent
      const paymentIntentData = {
        amount: totalAmount,
        currency,
        investmentId,
        investorId,
        startupId,
        paymentMethod,
      };

      const paymentIntentResult = await StripeService.createPaymentIntent(paymentIntentData);

      // Create escrow account
      const escrowData = {
        investmentId,
        investorId,
        startupId,
        amount: feeCalculation.netAmount, // Amount that goes to startup
        currency,
      };

      const escrowResult = await EscrowService.createEscrow(escrowData);

      logger.info('Investment payment processed successfully', {
        investmentId,
        amount: totalAmount,
        fees: feeCalculation,
        escrowReference: escrowResult.escrowId,
      });

      return {
        success: true,
        paymentIntentId: paymentIntentResult.paymentIntentId,
        clientSecret: paymentIntentResult.clientSecret,
        amount: totalAmount,
        currency,
        fees: {
          platformFee: feeCalculation.platformFee,
          totalAmount,
        },
        escrowReference: escrowResult.escrowId,
        status: 'PENDING',
      };
    } catch (error) {
      logger.error('Failed to process investment payment', { error, data });
      throw new Error(`Payment processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Confirm a completed payment
   */
  static async confirmPayment(paymentIntentId: string, investmentId: string): Promise<PaymentResult> {
    try {
      // Confirm payment with Stripe
      const confirmationResult = await StripeService.confirmPayment(paymentIntentId);

      if (!confirmationResult.success) {
        return {
          success: false,
          amount: 0,
          currency: 'USD',
          fees: { platformFee: 0, totalAmount: 0 },
          status: confirmationResult.status,
          error: confirmationResult.error,
        };
      }

      // Update escrow status to HELD
      const escrows = await EscrowService.getEscrowsByInvestment(investmentId);
      if (escrows.length > 0) {
        await EscrowService.holdEscrow(escrows[0].reference);
      }

      logger.info('Payment confirmed successfully', { paymentIntentId, investmentId });

      return {
        success: true,
        paymentIntentId,
        amount: confirmationResult.amount || 0,
        currency: confirmationResult.currency || 'USD',
        fees: { platformFee: 0, totalAmount: confirmationResult.amount || 0 }, // TODO: Get actual fees
        status: 'COMPLETED',
      };
    } catch (error) {
      logger.error('Failed to confirm payment', { error, paymentIntentId, investmentId });
      throw new Error(`Payment confirmation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process a refund
   */
  static async processRefund(data: RefundData): Promise<RefundResult> {
    try {
      const { investmentId, reason, amount } = data;

      // Get investment details
      const investment = await this.getInvestmentById(investmentId);
      if (!investment) {
        throw new Error('Investment not found');
      }

      // Check if refund is allowed
      if (investment.status === 'COMPLETED') {
        throw new Error('Cannot refund completed investment');
      }

      // Process refund with Stripe
      const refundData = {
        paymentIntentId: investment.paymentReference!,
        amount,
        reason,
      };

      const refundResult = await StripeService.processRefund(refundData);

      // Update escrow status
      const escrows = await EscrowService.getEscrowsByInvestment(investmentId);
      if (escrows.length > 0) {
        await EscrowService.refundEscrow(escrows[0].reference, reason);
      }

      logger.info('Refund processed successfully', {
        investmentId,
        refundId: refundResult.refundId,
        amount: refundResult.amount,
      });

      return {
        success: true,
        refundId: refundResult.refundId,
        amount: refundResult.amount,
        status: refundResult.status,
      };
    } catch (error) {
      logger.error('Failed to process refund', { error, data });
      throw new Error(`Refund processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Release escrow funds
   */
  static async releaseEscrowFunds(
    escrowReference: string,
    releaseType: 'AUTOMATIC' | 'MANUAL' | 'CONDITIONAL' = 'AUTOMATIC',
    conditions?: any
  ): Promise<void> {
    try {
      const releaseConditions = {
        escrowReference,
        releaseType,
        conditions,
      };

      await EscrowService.releaseEscrow(releaseConditions);

      logger.info('Escrow funds released', { escrowReference, releaseType });
    } catch (error) {
      logger.error('Failed to release escrow funds', { error, escrowReference });
      throw new Error(`Escrow release failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get payment status for an investment
   */
  static async getPaymentStatus(investmentId: string): Promise<{
    investmentId: string;
    paymentStatus: string;
    escrowStatus?: string;
    amount: number;
    currency: string;
    fees: any;
  }> {
    try {
      // Get investment details
      const investment = await this.getInvestmentById(investmentId);
      if (!investment) {
        throw new Error('Investment not found');
      }

      // Get escrow details
      const escrows = await EscrowService.getEscrowsByInvestment(investmentId);
      const escrow = escrows.length > 0 ? escrows[0] : null;

      // Calculate fees
      const fees = FeeCalculatorService.calculateInvestmentFees(
        investment.amount,
        investment.investmentType || 'DIRECT'
      );

      return {
        investmentId,
        paymentStatus: investment.status,
        escrowStatus: escrow?.status,
        amount: investment.amount,
        currency: investment.currency || 'USD',
        fees,
      };
    } catch (error) {
      logger.error('Failed to get payment status', { error, investmentId });
      throw new Error(`Failed to get payment status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get available payment methods for an amount and currency
   */
  static getAvailablePaymentMethods(amount: number, currency?: string) {
    return PaymentConfig.getEnabledMethods(currency).filter(method =>
      PaymentConfig.isAmountSupported(method.id, amount)
    );
  }

  /**
   * Validate payment data
   */
  private static validatePaymentData(data: PaymentData): void {
    const { amount, currency, paymentMethod, investmentType } = data;

    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    if (!PaymentConfig.getEnabledMethods(currency).some(m => m.id === paymentMethod)) {
      throw new Error('Payment method not available');
    }

    if (!PaymentConfig.isAmountSupported(paymentMethod, amount)) {
      throw new Error('Amount not supported for this payment method');
    }

    if (investmentType && !['DIRECT', 'SYNDICATE'].includes(investmentType)) {
      throw new Error('Invalid investment type');
    }
  }

  /**
   * Get investment by ID (database query)
   */
  private static async getInvestmentById(investmentId: string): Promise<any> {
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
        paymentReference: investment.paymentReference,
        investmentType: investment.investmentType,
      };
    } catch (error) {
      logger.error('Error getting investment by ID', { investmentId, error });
      throw error;
    }
  }

  /**
   * Get payment statistics
   */
  static async getPaymentStats(): Promise<{
    totalPayments: number;
    totalAmount: number;
    totalFees: number;
    escrowStats: any;
    paymentMethodBreakdown: any;
  }> {
    try {
      // Get payment statistics from database
      const totalPayments = await prisma.investment.count({
        where: { status: 'COMPLETED' },
      });

      const investments = await prisma.investment.findMany({
        where: { status: 'COMPLETED' },
        select: { amount: true, paymentMethod: true },
      });

      const totalAmount = investments.reduce((sum, inv) => sum + Number(inv.amount), 0);

      // Calculate total fees (simplified calculation)
      const totalFees = investments.reduce((sum, inv) => {
        const amount = Number(inv.amount);
        return sum + (amount * 0.05); // Assuming 5% platform fee
      }, 0);

      // Get payment method breakdown
      const paymentMethodBreakdown = investments.reduce((acc, inv) => {
        const method = inv.paymentMethod || 'unknown';
        acc[method] = (acc[method] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const escrowStats = await EscrowService.getEscrowStats();

      return {
        totalPayments,
        totalAmount,
        totalFees,
        escrowStats,
        paymentMethodBreakdown,
      };
    } catch (error) {
      logger.error('Failed to get payment statistics', { error });
      throw new Error(`Failed to get payment stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export default PaymentService;