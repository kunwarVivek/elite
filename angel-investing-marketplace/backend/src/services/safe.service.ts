import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../config/logger.js';
import { Decimal } from '@prisma/client/runtime/library';

interface CreateSafeData {
  investmentId: string;
  type: 'POST_MONEY' | 'PRE_MONEY';
  investmentAmount: number;
  valuationCap?: number;
  discountRate?: number;
  proRataRight?: boolean;
  mfnProvision?: boolean;
  documentUrl?: string;
}

interface ConversionTrigger {
  type: 'EQUITY_FINANCING' | 'LIQUIDITY' | 'DISSOLUTION';
  threshold?: number;
  date?: Date;
}

export class SafeService {
  /**
   * Create a new SAFE agreement
   */
  async createSafe(data: CreateSafeData) {
    try {
      // Validate investment exists
      const investment = await prisma.investment.findUnique({
        where: { id: data.investmentId },
        include: { pitch: true },
      });

      if (!investment) {
        throw new AppError('Investment not found', 404, 'INVESTMENT_NOT_FOUND');
      }

      // Validate SAFE terms
      this.validateSafeTerms(data);

      // Create SAFE agreement
      const safe = await prisma.safeAgreement.create({
        data: {
          investmentId: data.investmentId,
          type: data.type,
          investmentAmount: new Decimal(data.investmentAmount),
          valuationCap: data.valuationCap
            ? new Decimal(data.valuationCap)
            : null,
          discountRate: data.discountRate
            ? new Decimal(data.discountRate)
            : null,
          proRataRight: data.proRataRight || false,
          mfnProvision: data.mfnProvision || false,
          documentUrl: data.documentUrl,
          status: 'ACTIVE',
        },
      });

      logger.info(`SAFE agreement created: ${safe.id} for investment ${investment.id}`);

      return safe;
    } catch (error) {
      logger.error('Error creating SAFE agreement:', error);
      throw error;
    }
  }

  /**
   * Calculate conversion price for SAFE
   */
  async calculateConversionPrice(
    safeId: string,
    roundValuation: number,
    pricePerShare: number
  ): Promise<number> {
    const safe = await this.getSafeById(safeId);

    if (!safe) {
      throw new AppError('SAFE not found', 404, 'SAFE_NOT_FOUND');
    }

    let conversionPrice: number;

    if (safe.type === 'POST_MONEY') {
      // Post-money SAFE: conversion price = min(valuation cap / post-money valuation, price per share * (1 - discount))
      const capPrice = safe.valuationCap
        ? Number(safe.valuationCap) / roundValuation
        : Infinity;
      const discountPrice = safe.discountRate
        ? pricePerShare * (1 - Number(safe.discountRate) / 100)
        : Infinity;
      conversionPrice = Math.min(capPrice, discountPrice, pricePerShare);
    } else {
      // Pre-money SAFE: conversion price = min(valuation cap / pre-money valuation, price per share * (1 - discount))
      const capPrice = safe.valuationCap
        ? Number(safe.valuationCap) / roundValuation
        : Infinity;
      const discountPrice = safe.discountRate
        ? pricePerShare * (1 - Number(safe.discountRate) / 100)
        : Infinity;
      conversionPrice = Math.min(capPrice, discountPrice, pricePerShare);
    }

    return conversionPrice;
  }

  /**
   * Calculate shares from conversion
   */
  async calculateConversionShares(
    safeId: string,
    conversionPrice: number
  ): Promise<number> {
    const safe = await this.getSafeById(safeId);

    if (!safe) {
      throw new AppError('SAFE not found', 404, 'SAFE_NOT_FOUND');
    }

    const shares = Number(safe.investmentAmount) / conversionPrice;
    return Math.floor(shares);
  }

  /**
   * Convert SAFE to equity
   */
  async convertSafe(safeId: string, roundId: string, pricePerShare: number) {
    try {
      const safe = await this.getSafeById(safeId);

      if (!safe) {
        throw new AppError('SAFE not found', 404, 'SAFE_NOT_FOUND');
      }

      if (safe.status !== 'ACTIVE') {
        throw new AppError(
          'SAFE is not active',
          400,
          'SAFE_NOT_ACTIVE'
        );
      }

      // Get round details
      const round = await prisma.equityRound.findUnique({
        where: { id: roundId },
      });

      if (!round) {
        throw new AppError('Equity round not found', 404, 'ROUND_NOT_FOUND');
      }

      // Calculate conversion price
      const conversionPrice = await this.calculateConversionPrice(
        safeId,
        Number(round.postMoneyValuation),
        pricePerShare
      );

      // Calculate shares
      const shares = await this.calculateConversionShares(
        safeId,
        conversionPrice
      );

      // Update SAFE status
      const updatedSafe = await prisma.safeAgreement.update({
        where: { id: safeId },
        data: {
          status: 'CONVERTED',
          conversionPrice: new Decimal(conversionPrice),
          conversionDate: new Date(),
        },
      });

      logger.info(
        `SAFE ${safeId} converted to ${shares} shares at $${conversionPrice} per share`
      );

      return {
        safe: updatedSafe,
        shares,
        conversionPrice,
      };
    } catch (error) {
      logger.error('Error converting SAFE:', error);
      throw error;
    }
  }

  /**
   * Get SAFE by ID
   */
  async getSafeById(safeId: string) {
    return await prisma.safeAgreement.findUnique({
      where: { id: safeId },
      include: {
        investment: {
          include: {
            investor: true,
            pitch: {
              include: {
                startup: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Get SAFEs by investment ID
   */
  async getSafeByInvestmentId(investmentId: string) {
    return await prisma.safeAgreement.findUnique({
      where: { investmentId },
      include: {
        investment: {
          include: {
            investor: true,
            pitch: {
              include: {
                startup: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Get all SAFEs for a startup
   */
  async getSafesByStartup(startupId: string) {
    return await prisma.safeAgreement.findMany({
      where: {
        investment: {
          pitch: {
            startupId,
          },
        },
      },
      include: {
        investment: {
          include: {
            investor: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get all SAFEs for an investor
   */
  async getSafesByInvestor(investorId: string) {
    return await prisma.safeAgreement.findMany({
      where: {
        investment: {
          investorId,
        },
      },
      include: {
        investment: {
          include: {
            pitch: {
              include: {
                startup: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Update SAFE terms
   */
  async updateSafe(safeId: string, data: Partial<CreateSafeData>) {
    try {
      const safe = await this.getSafeById(safeId);

      if (!safe) {
        throw new AppError('SAFE not found', 404, 'SAFE_NOT_FOUND');
      }

      if (safe.status !== 'ACTIVE') {
        throw new AppError(
          'Cannot update converted or dissolved SAFE',
          400,
          'SAFE_NOT_EDITABLE'
        );
      }

      const updatedSafe = await prisma.safeAgreement.update({
        where: { id: safeId },
        data: {
          ...(data.valuationCap !== undefined && {
            valuationCap: new Decimal(data.valuationCap),
          }),
          ...(data.discountRate !== undefined && {
            discountRate: new Decimal(data.discountRate),
          }),
          ...(data.proRataRight !== undefined && {
            proRataRight: data.proRataRight,
          }),
          ...(data.mfnProvision !== undefined && {
            mfnProvision: data.mfnProvision,
          }),
          ...(data.documentUrl !== undefined && {
            documentUrl: data.documentUrl,
          }),
        },
      });

      logger.info(`SAFE ${safeId} updated`);

      return updatedSafe;
    } catch (error) {
      logger.error('Error updating SAFE:', error);
      throw error;
    }
  }

  /**
   * Validate SAFE terms
   */
  private validateSafeTerms(data: CreateSafeData) {
    if (data.investmentAmount <= 0) {
      throw new AppError(
        'Investment amount must be greater than 0',
        400,
        'INVALID_AMOUNT'
      );
    }

    if (data.valuationCap && data.valuationCap <= 0) {
      throw new AppError(
        'Valuation cap must be greater than 0',
        400,
        'INVALID_VALUATION_CAP'
      );
    }

    if (data.discountRate !== undefined) {
      if (data.discountRate < 0 || data.discountRate > 100) {
        throw new AppError(
          'Discount rate must be between 0 and 100',
          400,
          'INVALID_DISCOUNT_RATE'
        );
      }
    }

    // SAFE should have at least valuation cap or discount rate
    if (!data.valuationCap && !data.discountRate) {
      throw new AppError(
        'SAFE must have either a valuation cap or discount rate (or both)',
        400,
        'INVALID_SAFE_TERMS'
      );
    }
  }

  /**
   * Dissolve SAFE (cancel/terminate)
   */
  async dissolveSafe(safeId: string, reason?: string) {
    try {
      const safe = await this.getSafeById(safeId);

      if (!safe) {
        throw new AppError('SAFE not found', 404, 'SAFE_NOT_FOUND');
      }

      const updatedSafe = await prisma.safeAgreement.update({
        where: { id: safeId },
        data: {
          status: 'DISSOLVED',
        },
      });

      logger.info(`SAFE ${safeId} dissolved. Reason: ${reason || 'Not specified'}`);

      return updatedSafe;
    } catch (error) {
      logger.error('Error dissolving SAFE:', error);
      throw error;
    }
  }

  /**
   * Check for conversion triggers
   */
  async checkConversionTriggers(startupId: string) {
    // Get all active SAFEs for this startup
    const safes = await this.getSafesByStartup(startupId);

    const activeSafes = safes.filter((safe) => safe.status === 'ACTIVE');

    if (activeSafes.length === 0) {
      return [];
    }

    // Check for equity financing rounds
    const recentRounds = await prisma.equityRound.findMany({
      where: {
        startupId,
        status: 'OPEN',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const triggered = [];

    for (const round of recentRounds) {
      for (const safe of activeSafes) {
        // Check if this is a qualified financing event
        const isQualified = Number(round.targetAmount) >= 1000000; // $1M minimum threshold

        if (isQualified) {
          triggered.push({
            safeId: safe.id,
            roundId: round.id,
            trigger: 'EQUITY_FINANCING',
            ready: true,
          });
        }
      }
    }

    return triggered;
  }
}

export const safeService = new SafeService();
