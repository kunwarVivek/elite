import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../config/logger.js';

interface CreateInvestorRightsData {
  investmentId: string;
  proRataRights?: boolean;
  proRataPercentage?: number;
  rightOfFirstRefusal?: boolean;
  rofrDuration?: number;
  coSaleRights?: boolean;
  dragAlongRights?: boolean;
  tagAlongRights?: boolean;
  informationRights?: boolean;
  informationFrequency?: 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
  boardObserverRights?: boolean;
  boardSeatRights?: boolean;
  antiDilutionRights?: boolean;
  antiDilutionType?: 'FULL_RATCHET' | 'WEIGHTED_AVERAGE' | 'NARROW_BASED' | 'BROAD_BASED';
  redemptionRights?: boolean;
  redemptionPeriod?: number;
  conversionRights?: boolean;
  votingRights?: Record<string, any>;
  participationRights?: boolean;
  preemptiveRights?: boolean;
  registrationRights?: Record<string, any>;
  customRights?: Record<string, any>;
  expiryDate?: Date;
}

interface UpdateInvestorRightsData {
  proRataRights?: boolean;
  proRataPercentage?: number;
  rightOfFirstRefusal?: boolean;
  rofrDuration?: number;
  coSaleRights?: boolean;
  dragAlongRights?: boolean;
  tagAlongRights?: boolean;
  informationRights?: boolean;
  informationFrequency?: 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
  boardObserverRights?: boolean;
  boardSeatRights?: boolean;
  antiDilutionRights?: boolean;
  antiDilutionType?: 'FULL_RATCHET' | 'WEIGHTED_AVERAGE' | 'NARROW_BASED' | 'BROAD_BASED';
  redemptionRights?: boolean;
  redemptionPeriod?: number;
  conversionRights?: boolean;
  votingRights?: Record<string, any>;
  participationRights?: boolean;
  preemptiveRights?: boolean;
  registrationRights?: Record<string, any>;
  customRights?: Record<string, any>;
  expiryDate?: Date;
  status?: 'ACTIVE' | 'EXERCISED' | 'WAIVED' | 'EXPIRED';
}

export class InvestorRightsService {
  /**
   * Create investor rights
   */
  async createInvestorRights(data: CreateInvestorRightsData) {
    try {
      // Validate investment exists
      const investment = await prisma.investment.findUnique({
        where: { id: data.investmentId },
        include: {
          investor: true,
          pitch: {
            include: {
              startup: true,
            },
          },
        },
      });

      if (!investment) {
        throw new AppError('Investment not found', 404, 'INVESTMENT_NOT_FOUND');
      }

      // Create investor rights
      const investorRights = await prisma.investorRights.create({
        data: {
          investmentId: data.investmentId,
          proRataRights: data.proRataRights ?? false,
          proRataPercentage: data.proRataPercentage,
          rightOfFirstRefusal: data.rightOfFirstRefusal ?? false,
          rofrDuration: data.rofrDuration,
          coSaleRights: data.coSaleRights ?? false,
          dragAlongRights: data.dragAlongRights ?? false,
          tagAlongRights: data.tagAlongRights ?? false,
          informationRights: data.informationRights ?? false,
          informationFrequency: data.informationFrequency,
          boardObserverRights: data.boardObserverRights ?? false,
          boardSeatRights: data.boardSeatRights ?? false,
          antiDilutionRights: data.antiDilutionRights ?? false,
          antiDilutionType: data.antiDilutionType,
          redemptionRights: data.redemptionRights ?? false,
          redemptionPeriod: data.redemptionPeriod,
          conversionRights: data.conversionRights ?? false,
          votingRights: data.votingRights || {},
          participationRights: data.participationRights ?? false,
          preemptiveRights: data.preemptiveRights ?? false,
          registrationRights: data.registrationRights || {},
          customRights: data.customRights || {},
          status: 'ACTIVE',
          expiryDate: data.expiryDate,
        },
        include: {
          investment: {
            include: {
              investor: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                },
              },
              pitch: {
                include: {
                  startup: true,
                },
              },
            },
          },
        },
      });

      logger.info(`Investor rights created: ${investorRights.id} for investment ${investment.id}`);

      return investorRights;
    } catch (error) {
      logger.error('Error creating investor rights:', error);
      throw error;
    }
  }

  /**
   * Get investor rights by ID
   */
  async getInvestorRightsById(rightsId: string) {
    return await prisma.investorRights.findUnique({
      where: { id: rightsId },
      include: {
        investment: {
          include: {
            investor: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
            pitch: {
              include: {
                startup: true,
              },
            },
          },
        },
        exerciseHistory: {
          orderBy: { exercisedAt: 'desc' },
        },
      },
    });
  }

  /**
   * Get investor rights by investment
   */
  async getInvestorRightsByInvestment(investmentId: string) {
    return await prisma.investorRights.findUnique({
      where: { investmentId },
      include: {
        investment: {
          include: {
            investor: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
            pitch: {
              include: {
                startup: true,
              },
            },
          },
        },
        exerciseHistory: {
          orderBy: { exercisedAt: 'desc' },
        },
      },
    });
  }

  /**
   * Get investor rights by investor
   */
  async getInvestorRightsByInvestor(investorId: string) {
    return await prisma.investorRights.findMany({
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
        exerciseHistory: {
          orderBy: { exercisedAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get investor rights by startup
   */
  async getInvestorRightsByStartup(startupId: string) {
    return await prisma.investorRights.findMany({
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
            investor: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
        exerciseHistory: {
          orderBy: { exercisedAt: 'desc' },
          take: 3,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update investor rights
   */
  async updateInvestorRights(rightsId: string, data: UpdateInvestorRightsData) {
    try {
      const existingRights = await this.getInvestorRightsById(rightsId);

      if (!existingRights) {
        throw new AppError('Investor rights not found', 404, 'RIGHTS_NOT_FOUND');
      }

      const updatedRights = await prisma.investorRights.update({
        where: { id: rightsId },
        data: {
          proRataRights: data.proRataRights,
          proRataPercentage: data.proRataPercentage,
          rightOfFirstRefusal: data.rightOfFirstRefusal,
          rofrDuration: data.rofrDuration,
          coSaleRights: data.coSaleRights,
          dragAlongRights: data.dragAlongRights,
          tagAlongRights: data.tagAlongRights,
          informationRights: data.informationRights,
          informationFrequency: data.informationFrequency,
          boardObserverRights: data.boardObserverRights,
          boardSeatRights: data.boardSeatRights,
          antiDilutionRights: data.antiDilutionRights,
          antiDilutionType: data.antiDilutionType,
          redemptionRights: data.redemptionRights,
          redemptionPeriod: data.redemptionPeriod,
          conversionRights: data.conversionRights,
          votingRights: data.votingRights,
          participationRights: data.participationRights,
          preemptiveRights: data.preemptiveRights,
          registrationRights: data.registrationRights,
          customRights: data.customRights,
          expiryDate: data.expiryDate,
          status: data.status,
        },
        include: {
          investment: {
            include: {
              investor: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                },
              },
              pitch: {
                include: {
                  startup: true,
                },
              },
            },
          },
        },
      });

      logger.info(`Investor rights updated: ${rightsId}`);

      return updatedRights;
    } catch (error) {
      logger.error('Error updating investor rights:', error);
      throw error;
    }
  }

  /**
   * Exercise pro-rata right
   */
  async exerciseProRataRight(
    rightsId: string,
    roundId: string,
    exercisedBy: string,
    investmentAmount: number
  ) {
    try {
      const rights = await this.getInvestorRightsById(rightsId);

      if (!rights) {
        throw new AppError('Investor rights not found', 404, 'RIGHTS_NOT_FOUND');
      }

      if (!rights.proRataRights) {
        throw new AppError(
          'Investor does not have pro-rata rights',
          400,
          'NO_PRO_RATA_RIGHTS'
        );
      }

      if (rights.status !== 'ACTIVE') {
        throw new AppError('Rights are not active', 400, 'RIGHTS_NOT_ACTIVE');
      }

      // Record the exercise
      const exercise = await prisma.rightsExercise.create({
        data: {
          investorRightsId: rightsId,
          rightType: 'PRO_RATA',
          exercisedBy,
          exercisedAt: new Date(),
          roundId,
          investmentAmount,
        },
      });

      logger.info(`Pro-rata right exercised: ${exercise.id} for rights ${rightsId}`);

      // TODO: Create follow-on investment

      return exercise;
    } catch (error) {
      logger.error('Error exercising pro-rata right:', error);
      throw error;
    }
  }

  /**
   * Waive investor right
   */
  async waiveRight(
    rightsId: string,
    rightType: string,
    waivedBy: string,
    reason?: string
  ) {
    try {
      const rights = await this.getInvestorRightsById(rightsId);

      if (!rights) {
        throw new AppError('Investor rights not found', 404, 'RIGHTS_NOT_FOUND');
      }

      // Record the waiver
      const waiver = await prisma.rightsExercise.create({
        data: {
          investorRightsId: rightsId,
          rightType,
          exercisedBy: waivedBy,
          exercisedAt: new Date(),
          waived: true,
          notes: reason,
        },
      });

      logger.info(`Right waived: ${rightType} for rights ${rightsId}`);

      return waiver;
    } catch (error) {
      logger.error('Error waiving right:', error);
      throw error;
    }
  }

  /**
   * Check if investor has specific right
   */
  async checkRight(rightsId: string, rightType: string): Promise<boolean> {
    const rights = await this.getInvestorRightsById(rightsId);

    if (!rights || rights.status !== 'ACTIVE') {
      return false;
    }

    // Check expiry
    if (rights.expiryDate && new Date() > rights.expiryDate) {
      return false;
    }

    switch (rightType) {
      case 'PRO_RATA':
        return rights.proRataRights;
      case 'ROFR':
        return rights.rightOfFirstRefusal;
      case 'CO_SALE':
        return rights.coSaleRights;
      case 'DRAG_ALONG':
        return rights.dragAlongRights;
      case 'TAG_ALONG':
        return rights.tagAlongRights;
      case 'INFORMATION':
        return rights.informationRights;
      case 'BOARD_OBSERVER':
        return rights.boardObserverRights;
      case 'BOARD_SEAT':
        return rights.boardSeatRights;
      case 'ANTI_DILUTION':
        return rights.antiDilutionRights;
      case 'REDEMPTION':
        return rights.redemptionRights;
      case 'CONVERSION':
        return rights.conversionRights;
      case 'PARTICIPATION':
        return rights.participationRights;
      case 'PREEMPTIVE':
        return rights.preemptiveRights;
      default:
        return false;
    }
  }

  /**
   * Get rights summary for investor
   */
  async getRightsSummary(investorId: string) {
    const allRights = await this.getInvestorRightsByInvestor(investorId);

    const summary = {
      totalInvestments: allRights.length,
      activeRights: allRights.filter((r) => r.status === 'ACTIVE').length,
      byRightType: {
        proRata: allRights.filter((r) => r.proRataRights && r.status === 'ACTIVE').length,
        rofr: allRights.filter((r) => r.rightOfFirstRefusal && r.status === 'ACTIVE').length,
        coSale: allRights.filter((r) => r.coSaleRights && r.status === 'ACTIVE').length,
        dragAlong: allRights.filter((r) => r.dragAlongRights && r.status === 'ACTIVE').length,
        tagAlong: allRights.filter((r) => r.tagAlongRights && r.status === 'ACTIVE').length,
        information: allRights.filter((r) => r.informationRights && r.status === 'ACTIVE').length,
        boardObserver: allRights.filter((r) => r.boardObserverRights && r.status === 'ACTIVE').length,
        boardSeat: allRights.filter((r) => r.boardSeatRights && r.status === 'ACTIVE').length,
      },
      investments: allRights.map((r) => ({
        investmentId: r.investmentId,
        startup: r.investment.pitch.startup.name,
        rights: {
          proRata: r.proRataRights,
          rofr: r.rightOfFirstRefusal,
          information: r.informationRights,
          boardObserver: r.boardObserverRights,
          boardSeat: r.boardSeatRights,
        },
        status: r.status,
      })),
    };

    return summary;
  }
}

export const investorRightsService = new InvestorRightsService();
