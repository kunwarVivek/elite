import { PAYMENT_CONFIG } from '../config/payment.js';
import { logger } from '../config/logger.js';

export interface FeeCalculation {
  investmentAmount: number;
  platformFee: number;
  carryFee: number;
  totalFee: number;
  netAmount: number;
  feeBreakdown: {
    platformFee: number;
    carryFee: number;
    processingFee?: number;
  };
}

export interface CarryCalculation {
  initialInvestment: number;
  currentValue: number;
  performanceMultiple: number;
  carryPercentage: number;
  carryAmount: number;
  netReturn: number;
}

export interface FeeDistribution {
  investmentId: string;
  investorId: string;
  startupId: string;
  totalAmount: number;
  platformFee: number;
  startupReceives: number;
  distributions: {
    toPlatform: number;
    toStartup: number;
    processingFees?: number;
  };
}

export class FeeCalculatorService {
  /**
   * Calculate all fees for an investment
   */
  static calculateInvestmentFees(
    amount: number,
    investmentType: 'DIRECT' | 'SYNDICATE' = 'DIRECT',
    performanceMultiple?: number
  ): FeeCalculation {
    try {
      // Calculate platform fee based on investment type
      const platformFee = this.calculatePlatformFee(amount, investmentType);

      // Calculate carry fee if performance data is available
      const carryFee = performanceMultiple
        ? this.calculateCarryFee(amount, performanceMultiple)
        : 0;

      // Calculate processing fees (Stripe fees, etc.)
      const processingFee = this.calculateProcessingFee(amount);

      const totalFee = platformFee + carryFee + processingFee;
      const netAmount = amount - totalFee;

      const calculation: FeeCalculation = {
        investmentAmount: amount,
        platformFee,
        carryFee,
        totalFee,
        netAmount,
        feeBreakdown: {
          platformFee,
          carryFee,
          processingFee,
        },
      };

      logger.info('Investment fees calculated', {
        amount,
        investmentType,
        totalFee,
        netAmount,
      });

      return calculation;
    } catch (error) {
      logger.error('Failed to calculate investment fees', { error, amount, investmentType });
      throw new Error(`Fee calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate platform fee based on investment type
   */
  static calculatePlatformFee(amount: number, investmentType: 'DIRECT' | 'SYNDICATE' = 'DIRECT'): number {
    const feePercentage = investmentType === 'SYNDICATE'
      ? PAYMENT_CONFIG.FEES.SYNDICATE_INVESTMENT
      : PAYMENT_CONFIG.FEES.DIRECT_INVESTMENT;

    const fee = amount * feePercentage;

    // Ensure minimum fee
    return Math.max(fee, PAYMENT_CONFIG.FEES.MINIMUM_FEE);
  }

  /**
   * Calculate carry fee based on performance
   */
  static calculateCarryFee(initialInvestment: number, performanceMultiple: number): number {
    if (performanceMultiple <= 1) {
      return 0; // No carry on losses or break-even
    }

    const profit = (performanceMultiple - 1) * initialInvestment;
    const carryAmount = profit * PAYMENT_CONFIG.FEES.CARRY_PERCENTAGE;

    return Math.max(carryAmount, 0);
  }

  /**
   * Calculate processing fees (payment processor fees)
   */
  static calculateProcessingFee(amount: number): number {
    // This is a simplified calculation - in production, you'd use actual processor rates
    // For Stripe: 2.9% + $0.30
    const stripeFee = (amount * 0.029) + 0.30;

    // Add any additional processing fees
    const additionalFees = 0.10; // Bank fees, compliance fees, etc.

    return stripeFee + additionalFees;
  }

  /**
   * Calculate carry for investment performance
   */
  static calculateCarry(data: {
    initialInvestment: number;
    currentValue: number;
    carryPercentage?: number;
  }): CarryCalculation {
    try {
      const { initialInvestment, currentValue, carryPercentage = PAYMENT_CONFIG.FEES.CARRY_PERCENTAGE } = data;

      const performanceMultiple = currentValue / initialInvestment;
      const carryAmount = this.calculateCarryFee(initialInvestment, performanceMultiple);
      const netReturn = currentValue - initialInvestment - carryAmount;

      const calculation: CarryCalculation = {
        initialInvestment,
        currentValue,
        performanceMultiple,
        carryPercentage,
        carryAmount,
        netReturn,
      };

      logger.info('Carry calculated', {
        initialInvestment,
        currentValue,
        carryAmount,
        netReturn,
      });

      return calculation;
    } catch (error) {
      logger.error('Failed to calculate carry', { error, data });
      throw new Error(`Carry calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate fee distribution for an investment
   */
  static calculateFeeDistribution(
    investmentId: string,
    investorId: string,
    startupId: string,
    amount: number,
    investmentType: 'DIRECT' | 'SYNDICATE' = 'DIRECT'
  ): FeeDistribution {
    try {
      const fees = this.calculateInvestmentFees(amount, investmentType);

      // Platform gets the platform fee
      const toPlatform = fees.platformFee;

      // Startup receives the net amount (after all fees)
      const toStartup = fees.netAmount;

      const distribution: FeeDistribution = {
        investmentId,
        investorId,
        startupId,
        totalAmount: amount,
        platformFee: fees.platformFee,
        startupReceives: toStartup,
        distributions: {
          toPlatform,
          toStartup,
          processingFees: fees.feeBreakdown.processingFee || 0,
        },
      };

      logger.info('Fee distribution calculated', {
        investmentId,
        totalAmount: amount,
        toPlatform,
        toStartup,
      });

      return distribution;
    } catch (error) {
      logger.error('Failed to calculate fee distribution', { error, investmentId, amount });
      throw new Error(`Fee distribution calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate bulk fees for multiple investments
   */
  static calculateBulkFees(
    investments: Array<{
      amount: number;
      investmentType?: 'DIRECT' | 'SYNDICATE';
      performanceMultiple?: number;
    }>
  ): {
    totalInvestmentAmount: number;
    totalPlatformFees: number;
    totalCarryFees: number;
    totalProcessingFees: number;
    totalFees: number;
    netAmount: number;
    breakdown: FeeCalculation[];
  } {
    try {
      let totalInvestmentAmount = 0;
      let totalPlatformFees = 0;
      let totalCarryFees = 0;
      let totalProcessingFees = 0;
      const breakdown: FeeCalculation[] = [];

      for (const investment of investments) {
        const fees = this.calculateInvestmentFees(
          investment.amount,
          investment.investmentType,
          investment.performanceMultiple
        );

        totalInvestmentAmount += fees.investmentAmount;
        totalPlatformFees += fees.platformFee;
        totalCarryFees += fees.carryFee;
        totalProcessingFees += fees.feeBreakdown.processingFee || 0;
        breakdown.push(fees);
      }

      const totalFees = totalPlatformFees + totalCarryFees + totalProcessingFees;
      const netAmount = totalInvestmentAmount - totalFees;

      logger.info('Bulk fees calculated', {
        investmentCount: investments.length,
        totalInvestmentAmount,
        totalFees,
        netAmount,
      });

      return {
        totalInvestmentAmount,
        totalPlatformFees,
        totalCarryFees,
        totalProcessingFees,
        totalFees,
        netAmount,
        breakdown,
      };
    } catch (error) {
      logger.error('Failed to calculate bulk fees', { error, investmentCount: investments.length });
      throw new Error(`Bulk fee calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate fee calculation inputs
   */
  static validateFeeInputs(amount: number, investmentType?: string): void {
    if (amount <= 0) {
      throw new Error('Investment amount must be greater than 0');
    }

    if (amount < PAYMENT_CONFIG.LIMITS.MINIMUM_INVESTMENT) {
      throw new Error(`Investment amount below minimum: ${PAYMENT_CONFIG.LIMITS.MINIMUM_INVESTMENT}`);
    }

    if (amount > PAYMENT_CONFIG.LIMITS.MAXIMUM_INVESTMENT) {
      throw new Error(`Investment amount above maximum: ${PAYMENT_CONFIG.LIMITS.MAXIMUM_INVESTMENT}`);
    }

    if (investmentType && !['DIRECT', 'SYNDICATE'].includes(investmentType)) {
      throw new Error('Invalid investment type');
    }
  }

  /**
   * Get fee structure information
   */
  static getFeeStructure(): {
    platformFees: {
      direct: number;
      syndicate: number;
      minimum: number;
    };
    carry: {
      percentage: number;
    };
    limits: {
      minimum: number;
      maximum: number;
    };
  } {
    return {
      platformFees: {
        direct: PAYMENT_CONFIG.FEES.DIRECT_INVESTMENT * 100, // Convert to percentage
        syndicate: PAYMENT_CONFIG.FEES.SYNDICATE_INVESTMENT * 100,
        minimum: PAYMENT_CONFIG.FEES.MINIMUM_FEE,
      },
      carry: {
        percentage: PAYMENT_CONFIG.FEES.CARRY_PERCENTAGE * 100,
      },
      limits: {
        minimum: PAYMENT_CONFIG.LIMITS.MINIMUM_INVESTMENT,
        maximum: PAYMENT_CONFIG.LIMITS.MAXIMUM_INVESTMENT,
      },
    };
  }
}

export default FeeCalculatorService;