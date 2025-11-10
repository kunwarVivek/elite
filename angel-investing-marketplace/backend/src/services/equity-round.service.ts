import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../config/logger.js';
import { Decimal } from '@prisma/client/runtime/library';

interface CreateEquityRoundData {
  startupId: string;
  roundType: 'SEED' | 'SERIES_A' | 'SERIES_B' | 'SERIES_C' | 'SERIES_D' | 'BRIDGE' | 'PRE_SEED';
  leadInvestorId?: string;
  targetAmount: number;
  minimumInvestment?: number;
  maximumInvestment?: number;
  pricePerShare?: number;
  preMoneyValuation?: number;
  postMoneyValuation?: number;
  shareClassId?: string;
  closingDate?: Date;
  terms?: Record<string, any>;
  documents?: string[];
}

interface UpdateEquityRoundData {
  roundType?: 'SEED' | 'SERIES_A' | 'SERIES_B' | 'SERIES_C' | 'SERIES_D' | 'BRIDGE' | 'PRE_SEED';
  targetAmount?: number;
  minimumInvestment?: number;
  maximumInvestment?: number;
  pricePerShare?: number;
  preMoneyValuation?: number;
  postMoneyValuation?: number;
  totalRaised?: number;
  status?: 'PLANNING' | 'OPEN' | 'ACTIVE' | 'CLOSED' | 'CANCELLED';
  closingDate?: Date;
  terms?: Record<string, any>;
}

export class EquityRoundService {
  /**
   * Create a new equity round
   */
  async createEquityRound(data: CreateEquityRoundData) {
    try {
      // Validate startup exists
      const startup = await prisma.startup.findUnique({
        where: { id: data.startupId },
      });

      if (!startup) {
        throw new AppError('Startup not found', 404, 'STARTUP_NOT_FOUND');
      }

      // Validate lead investor if provided
      if (data.leadInvestorId) {
        const leadInvestor = await prisma.user.findUnique({
          where: { id: data.leadInvestorId },
        });

        if (!leadInvestor) {
          throw new AppError('Lead investor not found', 404, 'INVESTOR_NOT_FOUND');
        }
      }

      // Validate round terms
      this.validateRoundTerms(data);

      // Calculate post-money valuation if not provided
      let postMoneyValuation = data.postMoneyValuation;
      if (!postMoneyValuation && data.preMoneyValuation) {
        postMoneyValuation = data.preMoneyValuation + data.targetAmount;
      }

      // Create equity round
      const equityRound = await prisma.equityRound.create({
        data: {
          startupId: data.startupId,
          roundType: data.roundType,
          leadInvestorId: data.leadInvestorId,
          targetAmount: new Decimal(data.targetAmount),
          minimumInvestment: data.minimumInvestment
            ? new Decimal(data.minimumInvestment)
            : null,
          maximumInvestment: data.maximumInvestment
            ? new Decimal(data.maximumInvestment)
            : null,
          pricePerShare: data.pricePerShare
            ? new Decimal(data.pricePerShare)
            : null,
          preMoneyValuation: data.preMoneyValuation
            ? new Decimal(data.preMoneyValuation)
            : null,
          postMoneyValuation: postMoneyValuation
            ? new Decimal(postMoneyValuation)
            : null,
          shareClassId: data.shareClassId,
          totalRaised: new Decimal(0),
          status: 'PLANNING',
          closingDate: data.closingDate,
          terms: data.terms || {},
          documents: data.documents || [],
        },
        include: {
          startup: true,
          leadInvestor: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          shareClass: true,
        },
      });

      logger.info(`Equity round created: ${equityRound.id} for startup ${startup.name}`);

      return equityRound;
    } catch (error) {
      logger.error('Error creating equity round:', error);
      throw error;
    }
  }

  /**
   * Get equity round by ID
   */
  async getEquityRoundById(roundId: string) {
    return await prisma.equityRound.findUnique({
      where: { id: roundId },
      include: {
        startup: true,
        leadInvestor: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        shareClass: true,
        investments: {
          include: {
            investor: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Get equity rounds by startup
   */
  async getEquityRoundsByStartup(startupId: string) {
    return await prisma.equityRound.findMany({
      where: { startupId },
      include: {
        leadInvestor: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        shareClass: true,
        investments: {
          select: {
            id: true,
            amount: true,
            investor: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get active equity rounds
   */
  async getActiveEquityRounds() {
    return await prisma.equityRound.findMany({
      where: {
        status: {
          in: ['OPEN', 'ACTIVE'],
        },
      },
      include: {
        startup: true,
        leadInvestor: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        shareClass: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update equity round
   */
  async updateEquityRound(roundId: string, data: UpdateEquityRoundData) {
    try {
      const existingRound = await this.getEquityRoundById(roundId);

      if (!existingRound) {
        throw new AppError('Equity round not found', 404, 'ROUND_NOT_FOUND');
      }

      // Validate status transitions
      if (data.status) {
        this.validateStatusTransition(existingRound.status, data.status);
      }

      // Calculate post-money if pre-money is updated
      let postMoneyValuation = data.postMoneyValuation;
      if (!postMoneyValuation && data.preMoneyValuation) {
        const targetAmount = data.targetAmount || Number(existingRound.targetAmount);
        postMoneyValuation = data.preMoneyValuation + targetAmount;
      }

      const updatedRound = await prisma.equityRound.update({
        where: { id: roundId },
        data: {
          roundType: data.roundType,
          targetAmount: data.targetAmount
            ? new Decimal(data.targetAmount)
            : undefined,
          minimumInvestment: data.minimumInvestment
            ? new Decimal(data.minimumInvestment)
            : undefined,
          maximumInvestment: data.maximumInvestment
            ? new Decimal(data.maximumInvestment)
            : undefined,
          pricePerShare: data.pricePerShare
            ? new Decimal(data.pricePerShare)
            : undefined,
          preMoneyValuation: data.preMoneyValuation
            ? new Decimal(data.preMoneyValuation)
            : undefined,
          postMoneyValuation: postMoneyValuation
            ? new Decimal(postMoneyValuation)
            : undefined,
          totalRaised: data.totalRaised
            ? new Decimal(data.totalRaised)
            : undefined,
          status: data.status,
          closingDate: data.closingDate,
          terms: data.terms,
        },
        include: {
          startup: true,
          leadInvestor: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          shareClass: true,
        },
      });

      logger.info(`Equity round updated: ${roundId}`);

      return updatedRound;
    } catch (error) {
      logger.error('Error updating equity round:', error);
      throw error;
    }
  }

  /**
   * Record investment in round
   */
  async recordInvestment(roundId: string, investmentId: string, amount: number) {
    try {
      const round = await this.getEquityRoundById(roundId);

      if (!round) {
        throw new AppError('Equity round not found', 404, 'ROUND_NOT_FOUND');
      }

      if (round.status !== 'OPEN' && round.status !== 'ACTIVE') {
        throw new AppError(
          'Round is not open for investments',
          400,
          'ROUND_NOT_OPEN'
        );
      }

      // Update total raised
      const newTotalRaised = Number(round.totalRaised) + amount;

      await prisma.equityRound.update({
        where: { id: roundId },
        data: {
          totalRaised: new Decimal(newTotalRaised),
        },
      });

      logger.info(`Investment recorded in round ${roundId}: $${amount}`);

      // Check if round target is met
      if (newTotalRaised >= Number(round.targetAmount)) {
        logger.info(`Round ${roundId} has met its target amount`);
        // TODO: Send notification to startup founder
      }

      return newTotalRaised;
    } catch (error) {
      logger.error('Error recording investment:', error);
      throw error;
    }
  }

  /**
   * Close equity round
   */
  async closeEquityRound(roundId: string, finalTerms?: Record<string, any>) {
    try {
      const round = await this.getEquityRoundById(roundId);

      if (!round) {
        throw new AppError('Equity round not found', 404, 'ROUND_NOT_FOUND');
      }

      if (round.status === 'CLOSED') {
        throw new AppError('Round is already closed', 400, 'ROUND_ALREADY_CLOSED');
      }

      // Update round status
      const closedRound = await prisma.equityRound.update({
        where: { id: roundId },
        data: {
          status: 'CLOSED',
          closingDate: new Date(),
          terms: finalTerms || round.terms,
        },
        include: {
          startup: true,
          leadInvestor: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          investments: {
            include: {
              investor: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      logger.info(`Equity round closed: ${roundId}`, {
        totalRaised: Number(closedRound.totalRaised),
        targetAmount: Number(closedRound.targetAmount),
        investorCount: closedRound.investments.length,
      });

      // TODO: Trigger conversion of SAFEs and notes if applicable
      // TODO: Send notifications to all investors

      return closedRound;
    } catch (error) {
      logger.error('Error closing equity round:', error);
      throw error;
    }
  }

  /**
   * Calculate round metrics
   */
  async calculateRoundMetrics(roundId: string) {
    try {
      const round = await this.getEquityRoundById(roundId);

      if (!round) {
        throw new AppError('Equity round not found', 404, 'ROUND_NOT_FOUND');
      }

      const totalRaised = Number(round.totalRaised);
      const targetAmount = Number(round.targetAmount);
      const percentageRaised = (totalRaised / targetAmount) * 100;
      const remainingAmount = targetAmount - totalRaised;

      const investorCount = round.investments?.length || 0;
      const averageInvestment = investorCount > 0 ? totalRaised / investorCount : 0;

      return {
        totalRaised,
        targetAmount,
        percentageRaised,
        remainingAmount,
        investorCount,
        averageInvestment,
        status: round.status,
        pricePerShare: round.pricePerShare ? Number(round.pricePerShare) : null,
        preMoneyValuation: round.preMoneyValuation
          ? Number(round.preMoneyValuation)
          : null,
        postMoneyValuation: round.postMoneyValuation
          ? Number(round.postMoneyValuation)
          : null,
      };
    } catch (error) {
      logger.error('Error calculating round metrics:', error);
      throw error;
    }
  }

  /**
   * Validate round terms
   */
  private validateRoundTerms(data: CreateEquityRoundData) {
    if (data.targetAmount <= 0) {
      throw new AppError(
        'Target amount must be greater than 0',
        400,
        'INVALID_TARGET_AMOUNT'
      );
    }

    if (data.minimumInvestment && data.minimumInvestment <= 0) {
      throw new AppError(
        'Minimum investment must be greater than 0',
        400,
        'INVALID_MINIMUM_INVESTMENT'
      );
    }

    if (
      data.maximumInvestment &&
      data.minimumInvestment &&
      data.maximumInvestment < data.minimumInvestment
    ) {
      throw new AppError(
        'Maximum investment must be greater than minimum investment',
        400,
        'INVALID_INVESTMENT_RANGE'
      );
    }

    if (data.pricePerShare && data.pricePerShare <= 0) {
      throw new AppError(
        'Price per share must be greater than 0',
        400,
        'INVALID_PRICE_PER_SHARE'
      );
    }

    if (data.preMoneyValuation && data.preMoneyValuation <= 0) {
      throw new AppError(
        'Pre-money valuation must be greater than 0',
        400,
        'INVALID_PRE_MONEY_VALUATION'
      );
    }

    if (data.postMoneyValuation && data.postMoneyValuation <= 0) {
      throw new AppError(
        'Post-money valuation must be greater than 0',
        400,
        'INVALID_POST_MONEY_VALUATION'
      );
    }

    // Validate that post-money > pre-money if both provided
    if (data.preMoneyValuation && data.postMoneyValuation) {
      if (data.postMoneyValuation <= data.preMoneyValuation) {
        throw new AppError(
          'Post-money valuation must be greater than pre-money valuation',
          400,
          'INVALID_VALUATION_RELATIONSHIP'
        );
      }
    }
  }

  /**
   * Validate status transitions
   */
  private validateStatusTransition(
    currentStatus: string,
    newStatus: string
  ) {
    const validTransitions: Record<string, string[]> = {
      PLANNING: ['OPEN', 'CANCELLED'],
      OPEN: ['ACTIVE', 'CANCELLED'],
      ACTIVE: ['CLOSED', 'CANCELLED'],
      CLOSED: [], // No transitions from closed
      CANCELLED: [], // No transitions from cancelled
    };

    const allowedTransitions = validTransitions[currentStatus] || [];

    if (!allowedTransitions.includes(newStatus)) {
      throw new AppError(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
        400,
        'INVALID_STATUS_TRANSITION'
      );
    }
  }
}

export const equityRoundService = new EquityRoundService();
