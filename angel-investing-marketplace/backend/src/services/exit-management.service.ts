import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../config/logger.js';
import { Decimal } from '@prisma/client/runtime/library';
import { capTableService } from './cap-table.service.js';

interface CreateExitEventData {
  startupId: string;
  exitType: 'ACQUISITION' | 'IPO' | 'MERGER' | 'LIQUIDATION' | 'SECONDARY_SALE' | 'BUYBACK';
  exitDate: Date;
  exitAmount: number;
  acquirerName?: string;
  acquirerType?: string;
  stockSymbol?: string;
  stockExchange?: string;
  sharePrice?: number;
  terms?: Record<string, any>;
  documentUrls?: string[];
}

interface UpdateExitEventData {
  exitType?: 'ACQUISITION' | 'IPO' | 'MERGER' | 'LIQUIDATION' | 'SECONDARY_SALE' | 'BUYBACK';
  exitDate?: Date;
  exitAmount?: number;
  acquirerName?: string;
  acquirerType?: string;
  stockSymbol?: string;
  stockExchange?: string;
  sharePrice?: number;
  terms?: Record<string, any>;
  documentUrls?: string[];
  status?: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
}

interface CreateDistributionData {
  exitEventId: string;
  investorId: string;
  distributionAmount: number;
  distributionDate: Date;
  distributionMethod?: 'WIRE' | 'CHECK' | 'STOCK' | 'CRYPTO';
  taxWithheld?: number;
  notes?: string;
}

export class ExitManagementService {
  /**
   * Create exit event
   */
  async createExitEvent(data: CreateExitEventData) {
    try {
      // Validate startup exists
      const startup = await prisma.startup.findUnique({
        where: { id: data.startupId },
      });

      if (!startup) {
        throw new AppError('Startup not found', 404, 'STARTUP_NOT_FOUND');
      }

      // Validate exit data
      this.validateExitData(data);

      // Create exit event
      const exitEvent = await prisma.exitEvent.create({
        data: {
          startupId: data.startupId,
          exitType: data.exitType,
          exitDate: data.exitDate,
          exitAmount: new Decimal(data.exitAmount),
          acquirerName: data.acquirerName,
          acquirerType: data.acquirerType,
          stockSymbol: data.stockSymbol,
          stockExchange: data.stockExchange,
          sharePrice: data.sharePrice ? new Decimal(data.sharePrice) : null,
          terms: data.terms || {},
          documentUrls: data.documentUrls || [],
          status: 'PLANNED',
        },
        include: {
          startup: true,
        },
      });

      logger.info(`Exit event created: ${exitEvent.id} for startup ${startup.name} (${data.exitType})`);

      return exitEvent;
    } catch (error) {
      logger.error('Error creating exit event:', error);
      throw error;
    }
  }

  /**
   * Get exit event by ID
   */
  async getExitEventById(exitEventId: string) {
    return await prisma.exitEvent.findUnique({
      where: { id: exitEventId },
      include: {
        startup: true,
        distributions: {
          include: {
            investor: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
          orderBy: { distributionDate: 'desc' },
        },
      },
    });
  }

  /**
   * Get exit events by startup
   */
  async getExitEventsByStartup(startupId: string) {
    return await prisma.exitEvent.findMany({
      where: { startupId },
      include: {
        distributions: {
          select: {
            id: true,
            distributionAmount: true,
            distributionDate: true,
            status: true,
          },
        },
      },
      orderBy: { exitDate: 'desc' },
    });
  }

  /**
   * Get all exit events
   */
  async getAllExitEvents(status?: string) {
    const whereClause = status ? { status } : {};

    return await prisma.exitEvent.findMany({
      where: whereClause,
      include: {
        startup: true,
        distributions: {
          select: {
            id: true,
            distributionAmount: true,
          },
        },
      },
      orderBy: { exitDate: 'desc' },
    });
  }

  /**
   * Update exit event
   */
  async updateExitEvent(exitEventId: string, data: UpdateExitEventData) {
    try {
      const existingEvent = await this.getExitEventById(exitEventId);

      if (!existingEvent) {
        throw new AppError('Exit event not found', 404, 'EXIT_EVENT_NOT_FOUND');
      }

      // Validate status transition if status is being updated
      if (data.status) {
        this.validateStatusTransition(existingEvent.status, data.status);
      }

      const updatedEvent = await prisma.exitEvent.update({
        where: { id: exitEventId },
        data: {
          exitType: data.exitType,
          exitDate: data.exitDate,
          exitAmount: data.exitAmount ? new Decimal(data.exitAmount) : undefined,
          acquirerName: data.acquirerName,
          acquirerType: data.acquirerType,
          stockSymbol: data.stockSymbol,
          stockExchange: data.stockExchange,
          sharePrice: data.sharePrice ? new Decimal(data.sharePrice) : undefined,
          terms: data.terms,
          documentUrls: data.documentUrls,
          status: data.status,
        },
        include: {
          startup: true,
          distributions: {
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

      logger.info(`Exit event updated: ${exitEventId}`);

      return updatedEvent;
    } catch (error) {
      logger.error('Error updating exit event:', error);
      throw error;
    }
  }

  /**
   * Calculate exit distributions using cap table waterfall
   */
  async calculateExitDistributions(exitEventId: string) {
    try {
      const exitEvent = await this.getExitEventById(exitEventId);

      if (!exitEvent) {
        throw new AppError('Exit event not found', 404, 'EXIT_EVENT_NOT_FOUND');
      }

      const exitProceeds = Number(exitEvent.exitAmount);

      // Use cap table service to calculate waterfall distribution
      const waterfallAnalysis = await capTableService.calculateWaterfall(
        exitEvent.startupId,
        exitProceeds
      );

      logger.info(`Exit distributions calculated for event ${exitEventId}`, {
        exitProceeds,
        totalDistributed: waterfallAnalysis.totalDistributed,
        stakeholderCount: waterfallAnalysis.distributions.length,
      });

      return waterfallAnalysis;
    } catch (error) {
      logger.error('Error calculating exit distributions:', error);
      throw error;
    }
  }

  /**
   * Create distribution to investor
   */
  async createDistribution(data: CreateDistributionData) {
    try {
      // Validate exit event exists
      const exitEvent = await this.getExitEventById(data.exitEventId);

      if (!exitEvent) {
        throw new AppError('Exit event not found', 404, 'EXIT_EVENT_NOT_FOUND');
      }

      // Validate investor exists
      const investor = await prisma.user.findUnique({
        where: { id: data.investorId },
      });

      if (!investor) {
        throw new AppError('Investor not found', 404, 'INVESTOR_NOT_FOUND');
      }

      // Create distribution
      const distribution = await prisma.exitDistribution.create({
        data: {
          exitEventId: data.exitEventId,
          investorId: data.investorId,
          distributionAmount: new Decimal(data.distributionAmount),
          distributionDate: data.distributionDate,
          distributionMethod: data.distributionMethod || 'WIRE',
          taxWithheld: data.taxWithheld ? new Decimal(data.taxWithheld) : null,
          netAmount: new Decimal(
            data.distributionAmount - (data.taxWithheld || 0)
          ),
          status: 'PENDING',
          notes: data.notes,
        },
        include: {
          exitEvent: {
            include: {
              startup: true,
            },
          },
          investor: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

      logger.info(`Distribution created: ${distribution.id} for investor ${investor.name}`);

      // TODO: Send notification to investor

      return distribution;
    } catch (error) {
      logger.error('Error creating distribution:', error);
      throw error;
    }
  }

  /**
   * Get distributions by exit event
   */
  async getDistributionsByExitEvent(exitEventId: string) {
    return await prisma.exitDistribution.findMany({
      where: { exitEventId },
      include: {
        investor: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { distributionDate: 'desc' },
    });
  }

  /**
   * Get distributions by investor
   */
  async getDistributionsByInvestor(investorId: string) {
    return await prisma.exitDistribution.findMany({
      where: { investorId },
      include: {
        exitEvent: {
          include: {
            startup: true,
          },
        },
      },
      orderBy: { distributionDate: 'desc' },
    });
  }

  /**
   * Process distribution (mark as processing)
   */
  async processDistribution(distributionId: string, processedBy: string) {
    try {
      const distribution = await prisma.exitDistribution.findUnique({
        where: { id: distributionId },
      });

      if (!distribution) {
        throw new AppError('Distribution not found', 404, 'DISTRIBUTION_NOT_FOUND');
      }

      if (distribution.status !== 'PENDING') {
        throw new AppError(
          'Only pending distributions can be processed',
          400,
          'INVALID_STATUS'
        );
      }

      const processedDistribution = await prisma.exitDistribution.update({
        where: { id: distributionId },
        data: {
          status: 'PROCESSING',
        },
      });

      logger.info(`Distribution processing: ${distributionId}`);

      return processedDistribution;
    } catch (error) {
      logger.error('Error processing distribution:', error);
      throw error;
    }
  }

  /**
   * Complete distribution (mark as completed)
   */
  async completeDistribution(
    distributionId: string,
    completedBy: string,
    transactionRef?: string
  ) {
    try {
      const distribution = await prisma.exitDistribution.findUnique({
        where: { id: distributionId },
      });

      if (!distribution) {
        throw new AppError('Distribution not found', 404, 'DISTRIBUTION_NOT_FOUND');
      }

      if (distribution.status !== 'PROCESSING') {
        throw new AppError(
          'Only processing distributions can be completed',
          400,
          'INVALID_STATUS'
        );
      }

      const completedDistribution = await prisma.exitDistribution.update({
        where: { id: distributionId },
        data: {
          status: 'COMPLETED',
          paidDate: new Date(),
        },
        include: {
          exitEvent: {
            include: {
              startup: true,
            },
          },
          investor: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

      logger.info(`Distribution completed: ${distributionId}`);

      // TODO: Send confirmation notification to investor

      return completedDistribution;
    } catch (error) {
      logger.error('Error completing distribution:', error);
      throw error;
    }
  }

  /**
   * Get exit metrics for startup
   */
  async getExitMetrics(startupId: string) {
    const exitEvents = await this.getExitEventsByStartup(startupId);

    const totalExits = exitEvents.length;
    const completedExits = exitEvents.filter((e) => e.status === 'COMPLETED').length;
    const totalExitValue = exitEvents
      .filter((e) => e.status === 'COMPLETED')
      .reduce((sum, e) => sum + Number(e.exitAmount), 0);

    const exitsByType = {
      acquisition: exitEvents.filter((e) => e.exitType === 'ACQUISITION').length,
      ipo: exitEvents.filter((e) => e.exitType === 'IPO').length,
      merger: exitEvents.filter((e) => e.exitType === 'MERGER').length,
      liquidation: exitEvents.filter((e) => e.exitType === 'LIQUIDATION').length,
      secondarySale: exitEvents.filter((e) => e.exitType === 'SECONDARY_SALE').length,
      buyback: exitEvents.filter((e) => e.exitType === 'BUYBACK').length,
    };

    return {
      totalExits,
      completedExits,
      totalExitValue,
      exitsByType,
      latestExit: exitEvents[0] || null,
    };
  }

  /**
   * Validate exit data
   */
  private validateExitData(data: CreateExitEventData) {
    if (data.exitAmount <= 0) {
      throw new AppError(
        'Exit amount must be greater than 0',
        400,
        'INVALID_EXIT_AMOUNT'
      );
    }

    if (data.exitDate > new Date()) {
      // Allow future dates for planned exits
      logger.info('Exit date is in the future - this is a planned exit');
    }

    if (data.exitType === 'ACQUISITION' && !data.acquirerName) {
      throw new AppError(
        'Acquirer name is required for acquisitions',
        400,
        'MISSING_ACQUIRER_NAME'
      );
    }

    if (data.exitType === 'IPO' && !data.stockSymbol) {
      throw new AppError(
        'Stock symbol is required for IPOs',
        400,
        'MISSING_STOCK_SYMBOL'
      );
    }
  }

  /**
   * Validate status transitions
   */
  private validateStatusTransition(currentStatus: string, newStatus: string) {
    const validTransitions: Record<string, string[]> = {
      PLANNED: ['IN_PROGRESS', 'CANCELLED'],
      IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
      COMPLETED: [], // Terminal state
      CANCELLED: [], // Terminal state
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

export const exitManagementService = new ExitManagementService();
