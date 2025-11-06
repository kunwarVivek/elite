import { logger } from '../config/logger.js';
import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Tax Calculation Service
 * Handles all tax-related calculations for investments
 * - Cost basis tracking
 * - Capital gains/losses calculations
 * - Dividend income tracking
 * - Partnership income (K-1)
 * - Investment sales (Form 8949)
 */

export interface CostBasisCalculation {
  investmentId: string;
  originalInvestment: number;
  platformFees: number;
  adjustedCostBasis: number;
  acquisitionDate: Date;
  method: 'FIFO' | 'LIFO' | 'SPECIFIC_ID' | 'AVERAGE_COST';
}

export interface CapitalGainCalculation {
  investmentId: string;
  costBasis: number;
  saleProceeds: number;
  capitalGain: number;
  gainType: 'SHORT_TERM' | 'LONG_TERM';
  holdingPeriod: number; // days
  acquisitionDate: Date;
  saleDate: Date;
  taxRate: number;
}

export interface DividendIncomeCalculation {
  investmentId: string;
  totalDividends: number;
  qualifiedDividends: number;
  ordinaryDividends: number;
  taxYear: number;
}

export interface PartnershipIncomeCalculation {
  spvId: string;
  syndicateId: string;
  investorShare: number;
  ordinaryIncome: number;
  capitalGains: number;
  distributions: number;
  taxYear: number;
}

export interface TaxSummary {
  userId: string;
  taxYear: number;
  totalInvestments: number;
  totalCostBasis: number;
  totalCapitalGains: number;
  shortTermGains: number;
  longTermGains: number;
  totalDividends: number;
  qualifiedDividends: number;
  partnershipIncome: number;
  totalTaxLiability: number;
  effectiveTaxRate: number;
}

export class TaxCalculationService {
  /**
   * Calculate cost basis for an investment
   * Includes original investment + platform fees
   */
  async calculateCostBasis(investmentId: string): Promise<CostBasisCalculation> {
    try {
      const investment = await prisma.investment.findUnique({
        where: { id: investmentId },
        include: {
          transactions: {
            where: {
              type: { in: ['INVESTMENT', 'FEE'] },
              status: 'COMPLETED',
            },
          },
        },
      });

      if (!investment) {
        throw new AppError('Investment not found', 404, 'INVESTMENT_NOT_FOUND');
      }

      // Calculate original investment amount
      const originalInvestment = Number(investment.amount);

      // Calculate platform fees
      const platformFees = investment.transactions
        .filter((t) => t.type === 'FEE')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      // Adjusted cost basis = original investment + fees
      const adjustedCostBasis = originalInvestment + platformFees;

      return {
        investmentId,
        originalInvestment,
        platformFees,
        adjustedCostBasis,
        acquisitionDate: investment.investmentDate || investment.createdAt,
        method: 'FIFO', // Default to FIFO
      };
    } catch (error) {
      logger.error('Failed to calculate cost basis', { error, investmentId });
      throw error;
    }
  }

  /**
   * Calculate capital gains/losses for a sale
   */
  async calculateCapitalGains(
    investmentId: string,
    saleProceeds: number,
    saleDate: Date
  ): Promise<CapitalGainCalculation> {
    try {
      const costBasis = await this.calculateCostBasis(investmentId);

      // Calculate capital gain/loss
      const capitalGain = saleProceeds - costBasis.adjustedCostBasis;

      // Calculate holding period
      const holdingPeriodMs =
        saleDate.getTime() - costBasis.acquisitionDate.getTime();
      const holdingPeriod = Math.floor(holdingPeriodMs / (1000 * 60 * 60 * 24));

      // Determine if short-term or long-term
      // Long-term = held for more than 365 days
      const gainType = holdingPeriod > 365 ? 'LONG_TERM' : 'SHORT_TERM';

      // Estimate tax rate (simplified)
      // Short-term: ordinary income rate (assume 24%)
      // Long-term: preferential rate (assume 15%)
      const taxRate = gainType === 'SHORT_TERM' ? 0.24 : 0.15;

      return {
        investmentId,
        costBasis: costBasis.adjustedCostBasis,
        saleProceeds,
        capitalGain,
        gainType,
        holdingPeriod,
        acquisitionDate: costBasis.acquisitionDate,
        saleDate,
        taxRate,
      };
    } catch (error) {
      logger.error('Failed to calculate capital gains', { error, investmentId });
      throw error;
    }
  }

  /**
   * Calculate dividend income for a tax year
   */
  async calculateDividendIncome(
    userId: string,
    taxYear: number
  ): Promise<DividendIncomeCalculation[]> {
    try {
      // Get all investments with dividend transactions
      const startDate = new Date(taxYear, 0, 1);
      const endDate = new Date(taxYear, 11, 31, 23, 59, 59);

      const investments = await prisma.investment.findMany({
        where: {
          investorId: userId,
          transactions: {
            some: {
              type: 'INVESTMENT',
              status: 'COMPLETED',
              createdAt: {
                gte: startDate,
                lte: endDate,
              },
            },
          },
        },
        include: {
          transactions: {
            where: {
              type: 'INVESTMENT',
              status: 'COMPLETED',
              createdAt: {
                gte: startDate,
                lte: endDate,
              },
            },
          },
        },
      });

      // Calculate dividend income for each investment
      const dividendCalculations: DividendIncomeCalculation[] = [];

      for (const investment of investments) {
        const totalDividends = investment.transactions.reduce(
          (sum, t) => sum + Number(t.amount),
          0
        );

        // Determine qualified vs ordinary dividends
        // Qualified: held for more than 60 days during 121-day period
        const holdingPeriod = this.calculateHoldingPeriodDays(
          investment.investmentDate || investment.createdAt,
          endDate
        );

        const qualifiedDividends = holdingPeriod > 60 ? totalDividends : 0;
        const ordinaryDividends = totalDividends - qualifiedDividends;

        if (totalDividends > 0) {
          dividendCalculations.push({
            investmentId: investment.id,
            totalDividends,
            qualifiedDividends,
            ordinaryDividends,
            taxYear,
          });
        }
      }

      return dividendCalculations;
    } catch (error) {
      logger.error('Failed to calculate dividend income', { error, userId, taxYear });
      throw error;
    }
  }

  /**
   * Calculate partnership income (K-1) for syndicate investments
   */
  async calculatePartnershipIncome(
    userId: string,
    taxYear: number
  ): Promise<PartnershipIncomeCalculation[]> {
    try {
      const startDate = new Date(taxYear, 0, 1);
      const endDate = new Date(taxYear, 11, 31, 23, 59, 59);

      // Get all syndicate investments
      const syndicateInvestments = await prisma.syndicateInvestment.findMany({
        where: {
          investorId: userId,
          commitmentDate: {
            lte: endDate,
          },
        },
        include: {
          syndicate: {
            include: {
              spvs: true,
            },
          },
        },
      });

      const partnershipCalculations: PartnershipIncomeCalculation[] = [];

      for (const synInv of syndicateInvestments) {
        // Get SPV for this syndicate
        const spv = synInv.syndicate.spvs[0]; // Assume one SPV per syndicate

        if (!spv) continue;

        // Calculate investor's share
        const investorShare = Number(synInv.amount);

        // TODO: These should come from actual SPV distributions
        // For now, use placeholder calculations
        const ordinaryIncome = investorShare * 0.05; // 5% ordinary income
        const capitalGains = investorShare * 0.15; // 15% capital gains
        const distributions = investorShare * 0.1; // 10% distributions

        partnershipCalculations.push({
          spvId: spv.id,
          syndicateId: synInv.syndicateId,
          investorShare,
          ordinaryIncome,
          capitalGains,
          distributions,
          taxYear,
        });
      }

      return partnershipCalculations;
    } catch (error) {
      logger.error('Failed to calculate partnership income', {
        error,
        userId,
        taxYear,
      });
      throw error;
    }
  }

  /**
   * Generate comprehensive tax summary for a user
   */
  async generateTaxSummary(userId: string, taxYear: number): Promise<TaxSummary> {
    try {
      logger.info('Generating tax summary', { userId, taxYear });

      const startDate = new Date(taxYear, 0, 1);
      const endDate = new Date(taxYear, 11, 31, 23, 59, 59);

      // Get all completed investments
      const investments = await prisma.investment.findMany({
        where: {
          investorId: userId,
          status: 'COMPLETED',
          completedAt: {
            lte: endDate,
          },
        },
        include: {
          transactions: {
            where: {
              status: 'COMPLETED',
            },
          },
        },
      });

      // Calculate total cost basis
      let totalCostBasis = 0;
      for (const inv of investments) {
        const costBasis = await this.calculateCostBasis(inv.id);
        totalCostBasis += costBasis.adjustedCostBasis;
      }

      // Get capital gains (from sales in tax year)
      // TODO: Implement actual trade tracking
      const totalCapitalGains = 0;
      const shortTermGains = 0;
      const longTermGains = 0;

      // Get dividend income
      const dividends = await this.calculateDividendIncome(userId, taxYear);
      const totalDividends = dividends.reduce((sum, d) => sum + d.totalDividends, 0);
      const qualifiedDividends = dividends.reduce(
        (sum, d) => sum + d.qualifiedDividends,
        0
      );

      // Get partnership income
      const partnerships = await this.calculatePartnershipIncome(userId, taxYear);
      const partnershipIncome = partnerships.reduce(
        (sum, p) => sum + p.ordinaryIncome + p.capitalGains,
        0
      );

      // Calculate estimated tax liability
      // Simplified calculation
      const shortTermTax = shortTermGains * 0.24; // Ordinary income rate
      const longTermTax = longTermGains * 0.15; // Long-term cap gains rate
      const qualifiedDivTax = qualifiedDividends * 0.15;
      const ordinaryDivTax = (totalDividends - qualifiedDividends) * 0.24;
      const partnershipTax = partnershipIncome * 0.24;

      const totalTaxLiability =
        shortTermTax + longTermTax + qualifiedDivTax + ordinaryDivTax + partnershipTax;

      // Calculate effective tax rate
      const totalIncome =
        totalCapitalGains + totalDividends + partnershipIncome || 1;
      const effectiveTaxRate = (totalTaxLiability / totalIncome) * 100;

      return {
        userId,
        taxYear,
        totalInvestments: investments.length,
        totalCostBasis,
        totalCapitalGains,
        shortTermGains,
        longTermGains,
        totalDividends,
        qualifiedDividends,
        partnershipIncome,
        totalTaxLiability,
        effectiveTaxRate: Math.round(effectiveTaxRate * 100) / 100,
      };
    } catch (error) {
      logger.error('Failed to generate tax summary', { error, userId, taxYear });
      throw error;
    }
  }

  /**
   * Get all investments eligible for Form 8949 (sales/dispositions)
   */
  async getForm8949Transactions(userId: string, taxYear: number) {
    try {
      const startDate = new Date(taxYear, 0, 1);
      const endDate = new Date(taxYear, 11, 31, 23, 59, 59);

      // Get all trades (sales) in the tax year
      const trades = await prisma.trade.findMany({
        where: {
          OR: [{ buyerId: userId }, { order: { sellerId: userId } }],
          status: 'SETTLED',
          settlementDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          order: {
            include: {
              shareCertificate: {
                include: {
                  investment: true,
                },
              },
            },
          },
        },
      });

      const form8949Transactions = [];

      for (const trade of trades) {
        const investment = trade.order.shareCertificate.investment;
        const costBasis = await this.calculateCostBasis(investment.id);

        const capitalGain = await this.calculateCapitalGains(
          investment.id,
          Number(trade.totalAmount),
          trade.settlementDate!
        );

        form8949Transactions.push({
          description: `${investment.pitch?.title || 'Investment'} - ${trade.quantity} shares`,
          dateAcquired: capitalGain.acquisitionDate,
          dateSold: capitalGain.saleDate,
          proceeds: capitalGain.saleProceeds,
          costBasis: capitalGain.costBasis,
          gain: capitalGain.capitalGain,
          gainType: capitalGain.gainType,
        });
      }

      return form8949Transactions;
    } catch (error) {
      logger.error('Failed to get Form 8949 transactions', {
        error,
        userId,
        taxYear,
      });
      throw error;
    }
  }

  /**
   * Helper: Calculate holding period in days
   */
  private calculateHoldingPeriodDays(acquisitionDate: Date, saleDate: Date): number {
    const diffMs = saleDate.getTime() - acquisitionDate.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Helper: Determine tax bracket (simplified)
   */
  private determineTaxBracket(income: number): number {
    if (income <= 10275) return 0.1;
    if (income <= 41775) return 0.12;
    if (income <= 89075) return 0.22;
    if (income <= 170050) return 0.24;
    if (income <= 215950) return 0.32;
    if (income <= 539900) return 0.35;
    return 0.37;
  }
}

// Export singleton instance
export const taxCalculationService = new TaxCalculationService();
