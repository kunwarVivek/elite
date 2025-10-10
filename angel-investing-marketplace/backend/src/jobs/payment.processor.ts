import { Job } from 'bullmq';
import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { paymentService } from '../services/payment.service.js';
import { escrowService } from '../services/escrow.service.js';
import { stripeService } from '../services/stripe.service.js';

export interface PaymentJobData {
  operation: 'PROCESS_BANK_TRANSFER' | 'RELEASE_ESCROW' | 'PROCESS_REFUND' | 'UPDATE_PAYMENT_STATUS' |
           'SEND_PAYMENT_NOTIFICATIONS' | 'VALIDATE_KYC' | 'SCREEN_AML' | 'CALCULATE_FEES' |
           'UPDATE_ESCROW_STATUS' | 'PROCESS_DISPUTE' | 'VALIDATE_BANK_ACCOUNT' | 'PROCESS_WITHDRAWAL';
  data: {
    investmentId?: string;
    amount?: number;
    investorId?: string;
    startupId?: string;
    bankAccountId?: string;
    escrowReference?: string;
    releaseType?: 'MILESTONE' | 'FULL' | 'PARTIAL';
    conditions?: Record<string, any>;
    refundAmount?: number;
    reason?: string;
    paymentIntentId?: string;
    status?: string;
    notificationType?: string;
    recipients?: string[];
    userId?: string;
    investmentAmount?: number;
    transactionId?: string;
    disputeId?: string;
    action?: string;
    adminId?: string;
    withdrawalId?: string;
    [key: string]: any;
  };
  priority?: 'high' | 'normal' | 'low';
  retryCount?: number;
}

export interface PaymentJobResult {
  success: boolean;
  transactionId?: string;
  status?: string;
  metadata?: Record<string, any>;
  error?: string;
  processingTime?: number;
}

export class PaymentProcessor {
  static async process(job: Job<PaymentJobData>): Promise<PaymentJobResult> {
    const { operation, data, priority = 'normal' } = job.data;
    const startTime = Date.now();

    logger.info('Processing payment job', {
      jobId: job.id,
      operation,
      priority,
      investmentId: data.investmentId,
      amount: data.amount
    });

    try {
      let result: PaymentJobResult;

      // Process based on operation type
      switch (operation) {
        case 'PROCESS_BANK_TRANSFER':
          result = await this.processBankTransfer(data);
          break;
        case 'RELEASE_ESCROW':
          result = await this.releaseEscrow(data);
          break;
        case 'PROCESS_REFUND':
          result = await this.processRefund(data);
          break;
        case 'UPDATE_PAYMENT_STATUS':
          result = await this.updatePaymentStatus(data);
          break;
        case 'SEND_PAYMENT_NOTIFICATIONS':
          result = await this.sendPaymentNotifications(data);
          break;
        case 'VALIDATE_KYC':
          result = await this.validateKyc(data);
          break;
        case 'SCREEN_AML':
          result = await this.screenAml(data);
          break;
        case 'CALCULATE_FEES':
          result = await this.calculateFees(data);
          break;
        case 'UPDATE_ESCROW_STATUS':
          result = await this.updateEscrowStatus(data);
          break;
        case 'PROCESS_DISPUTE':
          result = await this.processDispute(data);
          break;
        case 'VALIDATE_BANK_ACCOUNT':
          result = await this.validateBankAccount(data);
          break;
        case 'PROCESS_WITHDRAWAL':
          result = await this.processWithdrawal(data);
          break;
        default:
          throw new Error(`Unknown payment operation: ${operation}`);
      }

      // Log success
      logger.info('Payment job completed successfully', {
        jobId: job.id,
        operation,
        transactionId: result.transactionId,
        status: result.status,
        processingTime: Date.now() - startTime
      });

      return {
        ...result,
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      logger.error('Payment job failed', {
        jobId: job.id,
        operation,
        error: error instanceof Error ? error.message : String(error)
      });

      throw error;
    }
  }

  private static async processBankTransfer(data: any): Promise<PaymentJobResult> {
    const { investmentId, amount, investorId, bankAccountId } = data;

    try {
      // Validate investment
      const investment = await prisma.investment.findUnique({
        where: { id: investmentId },
        include: { investor: true, startup: true }
      });

      if (!investment) {
        throw new Error(`Investment not found: ${investmentId}`);
      }

      // Process bank transfer through payment service
      const transferResult = await paymentService.processBankTransfer({
        investmentId,
        amount,
        investorId,
        bankAccountId,
        metadata: {
          investmentReference: investmentId,
          investorEmail: investment.investor.email,
          startupName: investment.startup.name
        }
      });

      // Update investment status
      await prisma.investment.update({
        where: { id: investmentId },
        data: {
          status: 'PROCESSING',
          paymentStatus: 'PROCESSING',
          metadata: {
            ...investment.metadata as Record<string, any>,
            bankTransferId: transferResult.transactionId,
            processedAt: new Date().toISOString()
          }
        }
      });

      return {
        success: true,
        transactionId: transferResult.transactionId,
        status: 'PROCESSING',
        metadata: {
          investmentId,
          amount,
          bankAccountId,
          processedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      throw new Error(`Bank transfer failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private static async releaseEscrow(data: any): Promise<PaymentJobResult> {
    const { escrowReference, releaseType, conditions } = data;

    try {
      // Get escrow details
      const escrow = await prisma.escrow.findUnique({
        where: { reference: escrowReference },
        include: { investment: true }
      });

      if (!escrow) {
        throw new Error(`Escrow not found: ${escrowReference}`);
      }

      // Release escrow funds
      const releaseResult = await escrowService.releaseFunds({
        escrowReference,
        releaseType,
        conditions,
        releasedBy: 'SYSTEM',
        metadata: {
          investmentId: escrow.investmentId,
          releaseReason: `Automated ${releaseType} release`
        }
      });

      return {
        success: true,
        transactionId: releaseResult.transactionId,
        status: 'RELEASED',
        metadata: {
          escrowReference,
          releaseType,
          amount: escrow.amount,
          releasedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      throw new Error(`Escrow release failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private static async processRefund(data: any): Promise<PaymentJobResult> {
    const { investmentId, refundAmount, reason, paymentIntentId } = data;

    try {
      // Process refund through payment service
      const refundResult = await paymentService.processRefund({
        investmentId,
        amount: refundAmount,
        reason,
        paymentIntentId,
        metadata: {
          refundReason: reason,
          processedAt: new Date().toISOString()
        }
      });

      // Update investment status
      await prisma.investment.update({
        where: { id: investmentId },
        data: {
          status: 'REFUNDING',
          paymentStatus: 'REFUNDING',
          metadata: {
            refundId: refundResult.refundId,
            refundAmount,
            refundReason: reason
          }
        }
      });

      return {
        success: true,
        transactionId: refundResult.refundId,
        status: 'REFUNDING',
        metadata: {
          investmentId,
          refundAmount,
          reason,
          processedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      throw new Error(`Refund processing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private static async updatePaymentStatus(data: any): Promise<PaymentJobResult> {
    const { investmentId, status, paymentIntentId } = data;

    try {
      // Update payment status in database
      await prisma.investment.update({
        where: { id: investmentId },
        data: {
          paymentStatus: status,
          updatedAt: new Date(),
          metadata: {
            paymentIntentId,
            statusUpdatedAt: new Date().toISOString()
          }
        }
      });

      // If payment is completed, update overall investment status
      if (status === 'SUCCEEDED') {
        await prisma.investment.update({
          where: { id: investmentId },
          data: {
            status: 'ACTIVE',
            fundedAt: new Date()
          }
        });
      }

      return {
        success: true,
        status,
        metadata: {
          investmentId,
          paymentIntentId,
          updatedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      throw new Error(`Payment status update failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private static async sendPaymentNotifications(data: any): Promise<PaymentJobResult> {
    const { investmentId, notificationType, recipients } = data;

    try {
      // Get investment details
      const investment = await prisma.investment.findUnique({
        where: { id: investmentId },
        include: { investor: true, startup: true }
      });

      if (!investment) {
        throw new Error(`Investment not found: ${investmentId}`);
      }

      // Send notifications based on type
      const notifications = [];

      for (const recipient of recipients || []) {
        const notificationData = {
          userId: recipient,
          type: notificationType,
          title: this.getNotificationTitle(notificationType, investment),
          message: this.getNotificationMessage(notificationType, investment),
          data: {
            investmentId,
            startupName: investment.startup.name,
            amount: investment.amount,
            notificationType
          }
        };

        // Queue notification through notification service
        const { notificationQueue } = await import('../config/queues.js');
        await notificationQueue.add('send-notification', notificationData);

        notifications.push(recipient);
      }

      return {
        success: true,
        status: 'SENT',
        metadata: {
          investmentId,
          notificationType,
          recipientsNotified: notifications.length,
          sentAt: new Date().toISOString()
        }
      };
    } catch (error) {
      throw new Error(`Payment notification failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private static async validateKyc(data: any): Promise<PaymentJobResult> {
    const { userId, investmentAmount } = data;

    try {
      // Get user details
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { kycVerification: true }
      });

      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      // Validate KYC status
      const kycStatus = user.kycVerification?.status || 'PENDING';

      if (kycStatus !== 'VERIFIED') {
        throw new Error(`KYC not verified for user: ${userId}`);
      }

      // Check investment limits based on KYC level
      const investmentLimit = this.getInvestmentLimit(kycStatus);
      if (investmentAmount > investmentLimit) {
        throw new Error(`Investment amount exceeds KYC limit: ${investmentLimit}`);
      }

      return {
        success: true,
        status: 'VERIFIED',
        metadata: {
          userId,
          kycStatus,
          investmentAmount,
          investmentLimit,
          validatedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      throw new Error(`KYC validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private static async screenAml(data: any): Promise<PaymentJobResult> {
    const { transactionId, amount, userId } = data;

    try {
      // Simulate AML screening (in production, integrate with AML service)
      logger.info('Screening AML', { transactionId, amount, userId });

      // Simulate screening process
      await new Promise(resolve => setTimeout(resolve, 1000));

      // For demo purposes, randomly flag some transactions (in production, use real AML service)
      const isFlagged = Math.random() < 0.05; // 5% false positive rate

      if (isFlagged) {
        throw new Error(`Transaction flagged by AML screening: ${transactionId}`);
      }

      return {
        success: true,
        status: 'CLEARED',
        metadata: {
          transactionId,
          amount,
          userId,
          screenedAt: new Date().toISOString(),
          riskScore: Math.floor(Math.random() * 100) // Mock risk score
        }
      };
    } catch (error) {
      throw new Error(`AML screening failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private static async calculateFees(data: any): Promise<PaymentJobResult> {
    const { investmentId, amount, investmentType } = data;

    try {
      // Calculate fees using fee calculator service
      const feeCalculation = await import('../services/fee-calculator.service.js');
      const feeCalculator = new feeCalculation.FeeCalculatorService();

      const fees = feeCalculator.calculateInvestmentFees(amount, investmentType);

      // Store fees in database
      await prisma.fee.create({
        data: {
          investmentId,
          type: 'PLATFORM_FEE',
          amount: fees.platformFee,
          percentage: fees.platformFeePercentage,
          description: 'Platform fee for investment',
          metadata: {
            investmentType,
            totalAmount: amount,
            calculatedAt: new Date().toISOString()
          }
        }
      });

      return {
        success: true,
        status: 'CALCULATED',
        metadata: {
          investmentId,
          totalAmount: amount,
          platformFee: fees.platformFee,
          netAmount: fees.netAmount,
          calculatedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      throw new Error(`Fee calculation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private static async updateEscrowStatus(data: any): Promise<PaymentJobResult> {
    const { escrowReference, status, reason } = data;

    try {
      // Update escrow status in database
      await prisma.escrow.update({
        where: { reference: escrowReference },
        data: {
          status,
          updatedAt: new Date(),
          metadata: {
            statusReason: reason,
            updatedBy: 'SYSTEM',
            updatedAt: new Date().toISOString()
          }
        }
      });

      return {
        success: true,
        status,
        metadata: {
          escrowReference,
          reason,
          updatedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      throw new Error(`Escrow status update failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private static async processDispute(data: any): Promise<PaymentJobResult> {
    const { disputeId, action, adminId } = data;

    try {
      // Process dispute action
      const dispute = await prisma.dispute.findUnique({
        where: { id: disputeId },
        include: { investment: true }
      });

      if (!dispute) {
        throw new Error(`Dispute not found: ${disputeId}`);
      }

      // Update dispute status
      await prisma.dispute.update({
        where: { id: disputeId },
        data: {
          status: action === 'RESOLVE' ? 'RESOLVED' : 'ESCALATED',
          resolvedAt: action === 'RESOLVE' ? new Date() : null,
          resolvedBy: adminId,
          resolution: action === 'RESOLVE' ? 'Dispute resolved by admin' : 'Dispute escalated',
          metadata: {
            action,
            processedBy: adminId,
            processedAt: new Date().toISOString()
          }
        }
      });

      return {
        success: true,
        status: action === 'RESOLVE' ? 'RESOLVED' : 'ESCALATED',
        metadata: {
          disputeId,
          action,
          adminId,
          processedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      throw new Error(`Dispute processing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private static async validateBankAccount(data: any): Promise<PaymentJobResult> {
    const { bankAccountId, userId } = data;

    try {
      // Validate bank account (integrate with bank verification service)
      logger.info('Validating bank account', { bankAccountId, userId });

      // Simulate validation process
      await new Promise(resolve => setTimeout(resolve, 2000));

      return {
        success: true,
        status: 'VALID',
        metadata: {
          bankAccountId,
          userId,
          validatedAt: new Date().toISOString(),
          validationMethod: 'PLAID_VERIFICATION'
        }
      };
    } catch (error) {
      throw new Error(`Bank account validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private static async processWithdrawal(data: any): Promise<PaymentJobResult> {
    const { withdrawalId, amount, userId } = data;

    try {
      // Process withdrawal request
      const withdrawal = await prisma.withdrawal.findUnique({
        where: { id: withdrawalId }
      });

      if (!withdrawal) {
        throw new Error(`Withdrawal not found: ${withdrawalId}`);
      }

      // Process withdrawal through payment service
      const withdrawalResult = await paymentService.processWithdrawal({
        withdrawalId,
        amount,
        userId,
        metadata: {
          withdrawalReference: withdrawalId,
          processedAt: new Date().toISOString()
        }
      });

      return {
        success: true,
        transactionId: withdrawalResult.transactionId,
        status: 'PROCESSED',
        metadata: {
          withdrawalId,
          amount,
          userId,
          processedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      throw new Error(`Withdrawal processing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Helper methods
  private static getNotificationTitle(type: string, investment: any): string {
    const titles = {
      'PAYMENT_SUCCESS': `Investment Confirmed - ${investment.startup.name}`,
      'PAYMENT_FAILED': `Payment Failed - ${investment.startup.name}`,
      'REFUND_PROCESSED': `Refund Processed - ${investment.startup.name}`,
      'ESCROW_RELEASED': `Funds Released - ${investment.startup.name}`,
    };
    return titles[type as keyof typeof titles] || 'Payment Update';
  }

  private static getNotificationMessage(type: string, investment: any): string {
    const messages = {
      'PAYMENT_SUCCESS': `Your investment of ${investment.amount} in ${investment.startup.name} has been processed successfully.`,
      'PAYMENT_FAILED': `Your payment for investment in ${investment.startup.name} has failed. Please try again.`,
      'REFUND_PROCESSED': `Your refund of ${investment.amount} for ${investment.startup.name} has been processed.`,
      'ESCROW_RELEASED': `Funds have been released to ${investment.startup.name} from your investment.`,
    };
    return messages[type as keyof typeof messages] || 'There is an update regarding your investment.';
  }

  private static getInvestmentLimit(kycStatus: string): number {
    const limits = {
      'VERIFIED': 100000, // $100k
      'ENHANCED': 1000000, // $1M
      'ACCREDITED': 10000000, // $10M
    };
    return limits[kycStatus as keyof typeof limits] || 10000; // $10k default
  }

  // Queue payment job
  static async queuePaymentJob(
    operation: PaymentJobData['operation'],
    data: PaymentJobData['data'],
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): Promise<void> {
    const { paymentQueue } = await import('../config/queues.js');

    await paymentQueue.add(operation, {
      operation,
      data,
      priority,
      queuedAt: new Date().toISOString()
    });

    logger.info('Payment job queued', {
      operation,
      priority,
      investmentId: data.investmentId,
      amount: data.amount
    });
  }
}

export default PaymentProcessor;