import { logger } from '../config/logger.js';
import { prisma } from '../config/database.js';

export interface EscrowData {
  investmentId: string;
  investorId: string;
  startupId: string;
  amount: number;
  currency: string;
  holdPeriodDays?: number;
}

export interface EscrowResult {
  escrowId: string;
  reference: string;
  status: 'CREATED' | 'HELD' | 'RELEASED' | 'REFUNDED';
  amount: number;
  currency: string;
  releaseDate: Date;
  createdAt: Date;
}

export interface ReleaseConditions {
  escrowReference: string;
  releaseType: 'AUTOMATIC' | 'MANUAL' | 'CONDITIONAL';
  conditions?: {
    minimumFundingReached?: boolean;
    legalReviewCompleted?: boolean;
    founderApproval?: boolean;
    investorApproval?: boolean;
  };
}

export class EscrowService {
  private static escrows = new Map<string, EscrowResult>();

  /**
   * Create a new escrow account for an investment
   */
  static async createEscrow(data: EscrowData): Promise<EscrowResult> {
    try {
      const {
        investmentId,
        amount,
        currency,
        holdPeriodDays = 30, // Default hold period
      } = data;

      // Generate unique escrow reference
      const escrowReference = `escrow_${investmentId}_${Date.now()}`;

      // Calculate release date
      const releaseDate = new Date();
      releaseDate.setDate(releaseDate.getDate() + holdPeriodDays);

      const escrowResult: EscrowResult = {
        escrowId: escrowReference,
        reference: escrowReference,
        status: 'CREATED',
        amount,
        currency,
        releaseDate,
        createdAt: new Date(),
      };

      // Store escrow (in production, this would be in database)
      this.escrows.set(escrowReference, escrowResult);

      logger.info('Escrow account created', {
        escrowReference,
        investmentId,
        amount,
        releaseDate: releaseDate.toISOString(),
      });

      return escrowResult;
    } catch (error) {
      logger.error('Failed to create escrow', { error, data });
      throw new Error(`Escrow creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get escrow details by reference
   */
  static async getEscrow(escrowReference: string): Promise<EscrowResult | null> {
    try {
      return this.escrows.get(escrowReference) || null;
    } catch (error) {
      logger.error('Failed to get escrow', { error, escrowReference });
      throw new Error(`Failed to retrieve escrow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Release funds from escrow
   */
  static async releaseEscrow(conditions: ReleaseConditions): Promise<EscrowResult> {
    try {
      const { escrowReference, releaseType, conditions: releaseConditions } = conditions;

      const escrow = this.escrows.get(escrowReference);
      if (!escrow) {
        throw new Error('Escrow not found');
      }

      if (escrow.status !== 'HELD') {
        throw new Error('Escrow is not in HELD status');
      }

      // Check release conditions based on type
      if (releaseType === 'CONDITIONAL') {
        await this.validateReleaseConditions(releaseConditions);
      } else if (releaseType === 'AUTOMATIC') {
        // Check if hold period has expired
        if (new Date() < escrow.releaseDate) {
          throw new Error('Escrow hold period has not expired');
        }
      }

      // Update escrow status
      escrow.status = 'RELEASED';

      logger.info('Escrow funds released', {
        escrowReference,
        amount: escrow.amount,
        releaseType,
      });

      // TODO: In production, this would trigger actual fund transfer
      // await this.transferFundsToStartup(escrow);

      return escrow;
    } catch (error) {
      logger.error('Failed to release escrow', { error, conditions });
      throw new Error(`Escrow release failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Refund funds from escrow
   */
  static async refundEscrow(escrowReference: string, reason: string): Promise<EscrowResult> {
    try {
      const escrow = this.escrows.get(escrowReference);
      if (!escrow) {
        throw new Error('Escrow not found');
      }

      if (escrow.status === 'RELEASED') {
        throw new Error('Cannot refund released escrow');
      }

      // Check refund window
      const refundWindowDays = 7; // Default 7 days refund window
      const refundDeadline = new Date(escrow.createdAt);
      refundDeadline.setDate(refundDeadline.getDate() + refundWindowDays);

      if (new Date() > refundDeadline) {
        throw new Error('Refund window has expired');
      }

      // Update escrow status
      escrow.status = 'REFUNDED';

      logger.info('Escrow funds refunded', {
        escrowReference,
        amount: escrow.amount,
        reason,
      });

      // TODO: In production, this would trigger actual fund refund
      // await this.refundFundsToInvestor(escrow);

      return escrow;
    } catch (error) {
      logger.error('Failed to refund escrow', { error, escrowReference, reason });
      throw new Error(`Escrow refund failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Hold funds in escrow (mark as HELD status)
   */
  static async holdEscrow(escrowReference: string): Promise<EscrowResult> {
    try {
      const escrow = this.escrows.get(escrowReference);
      if (!escrow) {
        throw new Error('Escrow not found');
      }

      if (escrow.status !== 'CREATED') {
        throw new Error('Can only hold escrow in CREATED status');
      }

      escrow.status = 'HELD';

      logger.info('Escrow funds held', {
        escrowReference,
        amount: escrow.amount,
      });

      return escrow;
    } catch (error) {
      logger.error('Failed to hold escrow', { error, escrowReference });
      throw new Error(`Escrow hold failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all escrows for a specific investment
   */
  static async getEscrowsByInvestment(investmentId: string): Promise<EscrowResult[]> {
    try {
      const escrows: EscrowResult[] = [];

      for (const [reference, escrow] of this.escrows.entries()) {
        if (reference.includes(investmentId)) {
          escrows.push(escrow);
        }
      }

      return escrows;
    } catch (error) {
      logger.error('Failed to get escrows by investment', { error, investmentId });
      throw new Error(`Failed to retrieve escrows: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if escrow can be auto-released
   */
  static async canAutoRelease(escrowReference: string): Promise<boolean> {
    try {
      const escrow = this.escrows.get(escrowReference);
      if (!escrow || escrow.status !== 'HELD') {
        return false;
      }

      return new Date() >= escrow.releaseDate;
    } catch (error) {
      logger.error('Failed to check auto-release eligibility', { error, escrowReference });
      return false;
    }
  }

  /**
   * Get escrow statistics
   */
  static async getEscrowStats(): Promise<{
    total: number;
    held: number;
    released: number;
    refunded: number;
    totalAmount: number;
  }> {
    try {
      let total = 0;
      let held = 0;
      let released = 0;
      let refunded = 0;
      let totalAmount = 0;

      for (const escrow of this.escrows.values()) {
        total++;
        totalAmount += escrow.amount;

        switch (escrow.status) {
          case 'HELD':
            held++;
            break;
          case 'RELEASED':
            released++;
            break;
          case 'REFUNDED':
            refunded++;
            break;
        }
      }

      return { total, held, released, refunded, totalAmount };
    } catch (error) {
      logger.error('Failed to get escrow statistics', { error });
      throw new Error(`Failed to retrieve escrow stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate release conditions for conditional releases
   */
  private static async validateReleaseConditions(conditions?: ReleaseConditions['conditions']): Promise<void> {
    if (!conditions) {
      throw new Error('Release conditions are required for conditional release');
    }

    logger.info('Validating release conditions', { conditions });

    // Check minimum funding threshold if required
    if (conditions.minimumFundingReached) {
      // TODO: Implement funding threshold check
      // This would query investments and check if minimum funding is reached
      logger.info('Checking minimum funding threshold');
    }

    // Check legal review completion if required
    if (conditions.legalReviewCompleted) {
      // TODO: Implement legal review status check
      logger.info('Checking legal review completion');
    }

    // Check founder approval if required
    if (conditions.founderApproval) {
      // TODO: Implement founder approval check
      logger.info('Checking founder approval');
    }

    // Check investor approval if required
    if (conditions.investorApproval) {
      // TODO: Implement investor approval check
      logger.info('Checking investor approval');
    }
  }

  /**
   * Transfer funds to startup (database implementation)
   * Currently unused but kept for future implementation
   */
  private static async _transferFundsToStartup(escrow: EscrowResult): Promise<void> {
    try {
      // Update investment status to completed
      await prisma.investment.updateMany({
        where: {
          // Find investments by escrow reference pattern
          OR: [
            { escrowReference: escrow.reference },
            { id: escrow.reference.split('_')[1] }, // Extract investment ID from escrow reference
          ],
        },
        data: {
          status: 'COMPLETED',
          investmentDate: new Date(),
        },
      });

      logger.info('Funds transferred to startup', {
        escrowReference: escrow.escrowId,
        amount: escrow.amount,
        status: 'COMPLETED',
      });
    } catch (error) {
      logger.error('Failed to transfer funds to startup', { error, escrow });
      throw error;
    }
  }

  /**
   * Refund funds to investor (database implementation)
   * Currently unused but kept for future implementation
   */
  private static async _refundFundsToInvestor(escrow: EscrowResult): Promise<void> {
    try {
      // Update investment status to cancelled
      await prisma.investment.updateMany({
        where: {
          // Find investments by escrow reference pattern
          OR: [
            { escrowReference: escrow.reference },
            { id: escrow.reference.split('_')[1] }, // Extract investment ID from escrow reference
          ],
        },
        data: {
          status: 'CANCELLED',
        },
      });

      logger.info('Funds refunded to investor', {
        escrowReference: escrow.escrowId,
        amount: escrow.amount,
        status: 'REFUNDED',
      });
    } catch (error) {
      logger.error('Failed to refund funds to investor', { error, escrow });
      throw error;
    }
  }
}

export default EscrowService;