import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../config/logger.js';
import { Decimal } from '@prisma/client/runtime/library';

interface CreateCapTableData {
  startupId: string;
  asOfDate: Date;
}

interface AddStakeholderData {
  capTableId: string;
  stakeholderType: 'FOUNDER' | 'EMPLOYEE' | 'INVESTOR' | 'ADVISOR' | 'CONSULTANT';
  userId?: string;
  entityName: string;
  commonShares?: number;
  preferredShares?: Record<string, number>;
  options?: number;
  warrants?: number;
  boardSeat?: boolean;
  observer?: boolean;
  proRataRights?: boolean;
}

interface WaterfallLayer {
  layer: number;
  type: 'LIQUIDATION_PREF' | 'PARTICIPATING_PREF' | 'COMMON';
  class?: string;
  amount?: number;
  proRata?: boolean;
}

export class CapTableService {
  /**
   * Create a new cap table snapshot
   */
  async createCapTable(data: CreateCapTableData) {
    try {
      // Get latest version for this startup
      const latestCapTable = await prisma.capTable.findFirst({
        where: { startupId: data.startupId },
        orderBy: { version: 'desc' },
      });

      const version = latestCapTable ? latestCapTable.version + 1 : 1;

      // Calculate totals from existing investments
      const totals = await this.calculateTotals(data.startupId);

      const capTable = await prisma.capTable.create({
        data: {
          startupId: data.startupId,
          asOfDate: data.asOfDate,
          version,
          fullyDilutedShares: new Decimal(totals.fullyDiluted),
          totalCommon: new Decimal(totals.common),
          totalPreferred: new Decimal(totals.preferred),
          totalOptions: new Decimal(totals.options),
          optionPool: new Decimal(totals.optionPool),
        },
      });

      logger.info(`Cap table created: ${capTable.id} version ${version}`);

      return capTable;
    } catch (error) {
      logger.error('Error creating cap table:', error);
      throw error;
    }
  }

  /**
   * Calculate totals for a startup
   */
  private async calculateTotals(startupId: string) {
    const shares = await prisma.shareCertificate.findMany({
      where: {
        spv: {
          syndicate: {
            leadInvestor: {
              foundedStartups: {
                some: {
                  id: startupId,
                },
              },
            },
          },
        },
      },
    });

    let common = 0;
    let preferred = 0;
    let options = 0;
    let optionPool = 0;

    for (const share of shares) {
      // Simplified - in reality would need share class info
      common += Number(share.totalShares);
    }

    const fullyDiluted = common + preferred + options + optionPool;

    return { common, preferred, options, optionPool, fullyDiluted };
  }

  /**
   * Add stakeholder to cap table
   */
  async addStakeholder(data: AddStakeholderData) {
    try {
      // Calculate ownership percentages
      const capTable = await prisma.capTable.findUnique({
        where: { id: data.capTableId },
        include: { stakeholders: true },
      });

      if (!capTable) {
        throw new AppError('Cap table not found', 404, 'CAP_TABLE_NOT_FOUND');
      }

      const totalShares = Number(capTable.fullyDilutedShares);
      const stakeholderShares =
        (data.commonShares || 0) +
        Object.values(data.preferredShares || {}).reduce((a, b) => a + b, 0) +
        (data.options || 0) +
        (data.warrants || 0);

      const fullyDilutedOwnership = (stakeholderShares / totalShares) * 100;
      const currentOwnership = (stakeholderShares / totalShares) * 100; // Simplified

      const stakeholder = await prisma.capTableStakeholder.create({
        data: {
          capTableId: data.capTableId,
          stakeholderType: data.stakeholderType,
          userId: data.userId,
          entityName: data.entityName,
          commonShares: new Decimal(data.commonShares || 0),
          preferredShares: data.preferredShares || {},
          options: new Decimal(data.options || 0),
          warrants: new Decimal(data.warrants || 0),
          fullyDilutedOwnership: new Decimal(fullyDilutedOwnership),
          currentOwnership: new Decimal(currentOwnership),
          boardSeat: data.boardSeat || false,
          observer: data.observer || false,
          proRataRights: data.proRataRights || false,
        },
      });

      logger.info(`Stakeholder added to cap table: ${stakeholder.id}`);

      return stakeholder;
    } catch (error) {
      logger.error('Error adding stakeholder:', error);
      throw error;
    }
  }

  /**
   * Calculate dilution from new round
   */
  async calculateDilution(
    startupId: string,
    newInvestmentAmount: number,
    preMoneyValuation: number
  ) {
    try {
      // Get latest cap table
      const latestCapTable = await prisma.capTable.findFirst({
        where: { startupId },
        orderBy: { version: 'desc' },
        include: { stakeholders: true },
      });

      if (!latestCapTable) {
        throw new AppError('No cap table found', 404, 'CAP_TABLE_NOT_FOUND');
      }

      const postMoneyValuation = preMoneyValuation + newInvestmentAmount;
      const newShares = Number(latestCapTable.fullyDilutedShares) * (newInvestmentAmount / preMoneyValuation);
      const totalSharesAfter = Number(latestCapTable.fullyDilutedShares) + newShares;

      // Calculate dilution for each stakeholder
      const dilutionImpact = latestCapTable.stakeholders.map((stakeholder) => {
        const currentOwnership = Number(stakeholder.fullyDilutedOwnership);
        const newOwnership = (currentOwnership / 100 * Number(latestCapTable.fullyDilutedShares)) / totalSharesAfter * 100;
        const dilution = currentOwnership - newOwnership;

        return {
          stakeholderId: stakeholder.id,
          entityName: stakeholder.entityName,
          currentOwnership,
          newOwnership,
          dilution,
          dilutionPercentage: (dilution / currentOwnership) * 100,
        };
      });

      return {
        preMoneyValuation,
        newInvestmentAmount,
        postMoneyValuation,
        currentShares: Number(latestCapTable.fullyDilutedShares),
        newShares,
        totalSharesAfter,
        pricePerShare: newInvestmentAmount / newShares,
        dilutionImpact,
      };
    } catch (error) {
      logger.error('Error calculating dilution:', error);
      throw error;
    }
  }

  /**
   * Calculate exit waterfall (liquidation preferences)
   */
  async calculateWaterfall(startupId: string, exitProceeds: number) {
    try {
      // Get latest cap table
      const latestCapTable = await prisma.capTable.findFirst({
        where: { startupId },
        orderBy: { version: 'desc' },
        include: {
          stakeholders: true,
          shareClasses: {
            orderBy: { seniorityRank: 'asc' },
          },
        },
      });

      if (!latestCapTable) {
        throw new AppError('No cap table found', 404, 'CAP_TABLE_NOT_FOUND');
      }

      const distributions: Record<string, number> = {};
      let remainingProceeds = exitProceeds;

      // Layer 1: Liquidation preferences (by seniority)
      for (const shareClass of latestCapTable.shareClasses) {
        if (shareClass.type === 'PREFERRED' && Number(shareClass.liquidationPreference) > 0) {
          const liquidationAmount =
            Number(shareClass.liquidationPreference) *
            Number(shareClass.liquidationMultiple);

          const amountToPay = Math.min(liquidationAmount, remainingProceeds);

          // Distribute to holders of this class
          for (const stakeholder of latestCapTable.stakeholders) {
            const preferredShares = stakeholder.preferredShares as Record<string, number>;
            const sharesInClass = preferredShares[shareClass.name] || 0;

            if (sharesInClass > 0) {
              const proportion = sharesInClass / Number(shareClass.sharesOutstanding);
              const stakeholderAmount = amountToPay * proportion;

              distributions[stakeholder.id] =
                (distributions[stakeholder.id] || 0) + stakeholderAmount;
            }
          }

          remainingProceeds -= amountToPay;

          if (remainingProceeds <= 0) break;
        }
      }

      // Layer 2: Participating preferred (pro-rata distribution)
      if (remainingProceeds > 0) {
        for (const shareClass of latestCapTable.shareClasses) {
          if (shareClass.type === 'PREFERRED' && shareClass.participating) {
            const proRataShare =
              Number(shareClass.sharesOutstanding) /
              Number(latestCapTable.fullyDilutedShares);
            const classAmount = remainingProceeds * proRataShare;

            // Distribute to holders
            for (const stakeholder of latestCapTable.stakeholders) {
              const preferredShares = stakeholder.preferredShares as Record<string, number>;
              const sharesInClass = preferredShares[shareClass.name] || 0;

              if (sharesInClass > 0) {
                const proportion = sharesInClass / Number(shareClass.sharesOutstanding);
                const stakeholderAmount = classAmount * proportion;

                distributions[stakeholder.id] =
                  (distributions[stakeholder.id] || 0) + stakeholderAmount;
              }
            }
          }
        }
      }

      // Layer 3: Common stock (remaining proceeds)
      if (remainingProceeds > 0) {
        for (const stakeholder of latestCapTable.stakeholders) {
          const commonShares = Number(stakeholder.commonShares);
          if (commonShares > 0) {
            const proportion = commonShares / Number(latestCapTable.totalCommon);
            const stakeholderAmount = remainingProceeds * proportion;

            distributions[stakeholder.id] =
              (distributions[stakeholder.id] || 0) + stakeholderAmount;
          }
        }
      }

      // Calculate returns
      const waterfallResults = latestCapTable.stakeholders.map((stakeholder) => {
        const distribution = distributions[stakeholder.id] || 0;
        const investment = stakeholder.acquisitionPrice
          ? Number(stakeholder.acquisitionPrice)
          : 0;
        const returnMultiple = investment > 0 ? distribution / investment : 0;

        return {
          stakeholderId: stakeholder.id,
          entityName: stakeholder.entityName,
          stakeholderType: stakeholder.stakeholderType,
          investment,
          distribution,
          returnMultiple,
          ownership: Number(stakeholder.fullyDilutedOwnership),
        };
      });

      return {
        exitProceeds,
        totalDistributed: Object.values(distributions).reduce((a, b) => a + b, 0),
        distributions: waterfallResults,
      };
    } catch (error) {
      logger.error('Error calculating waterfall:', error);
      throw error;
    }
  }

  /**
   * Get cap table by ID
   */
  async getCapTableById(capTableId: string) {
    return await prisma.capTable.findUnique({
      where: { id: capTableId },
      include: {
        startup: true,
        shareClasses: true,
        stakeholders: {
          include: {
            user: true,
          },
        },
        events: {
          orderBy: { eventDate: 'desc' },
          take: 20,
        },
      },
    });
  }

  /**
   * Get latest cap table for startup
   */
  async getLatestCapTable(startupId: string) {
    return await prisma.capTable.findFirst({
      where: { startupId },
      orderBy: { version: 'desc' },
      include: {
        startup: true,
        shareClasses: true,
        stakeholders: {
          include: {
            user: true,
          },
        },
        events: {
          orderBy: { eventDate: 'desc' },
          take: 20,
        },
      },
    });
  }

  /**
   * Get cap table history
   */
  async getCapTableHistory(startupId: string) {
    return await prisma.capTable.findMany({
      where: { startupId },
      orderBy: { version: 'desc' },
      include: {
        shareClasses: true,
        stakeholders: true,
      },
    });
  }

  /**
   * Record cap table event
   */
  async recordEvent(
    capTableId: string,
    eventType: 'FUNDING' | 'CONVERSION' | 'OPTION_GRANT' | 'OPTION_EXERCISE' | 'TRANSFER' | 'REPURCHASE' | 'CANCELLATION',
    description: string,
    sharesBefore: Record<string, any>,
    sharesAfter: Record<string, any>,
    roundId?: string,
    transactionId?: string
  ) {
    try {
      const event = await prisma.capTableEvent.create({
        data: {
          capTableId,
          eventDate: new Date(),
          eventType,
          description,
          sharesBefore,
          sharesAfter,
          roundId,
          transactionId,
        },
      });

      logger.info(`Cap table event recorded: ${event.id} - ${eventType}`);

      return event;
    } catch (error) {
      logger.error('Error recording cap table event:', error);
      throw error;
    }
  }

  /**
   * Export cap table to Carta format
   */
  async exportToCartaFormat(capTableId: string) {
    const capTable = await this.getCapTableById(capTableId);

    if (!capTable) {
      throw new AppError('Cap table not found', 404, 'CAP_TABLE_NOT_FOUND');
    }

    // Format for Carta import
    const cartaFormat = {
      companyName: capTable.startup.name,
      asOfDate: capTable.asOfDate.toISOString(),
      shareClasses: capTable.shareClasses.map((sc) => ({
        name: sc.name,
        type: sc.type,
        sharesAuthorized: Number(sc.sharesAuthorized),
        sharesIssued: Number(sc.sharesIssued),
        pricePerShare: Number(sc.pricePerShare || 0),
        liquidationPreference: Number(sc.liquidationPreference),
        liquidationMultiple: Number(sc.liquidationMultiple),
        participating: sc.participating,
        votesPerShare: Number(sc.votesPerShare),
      })),
      stakeholders: capTable.stakeholders.map((s) => ({
        name: s.entityName,
        email: s.user?.email || '',
        type: s.stakeholderType,
        commonShares: Number(s.commonShares),
        preferredShares: s.preferredShares,
        options: Number(s.options),
        ownership: Number(s.fullyDilutedOwnership),
      })),
    };

    return cartaFormat;
  }
}

export const capTableService = new CapTableService();
