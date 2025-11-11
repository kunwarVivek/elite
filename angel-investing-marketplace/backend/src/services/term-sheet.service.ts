import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../config/logger.js';
import { Decimal } from '@prisma/client/runtime/library';

interface CreateTermSheetData {
  equityRoundId: string;
  investorId: string;
  version: number;
  investmentAmount: number;
  valuation: number;
  pricePerShare: number;
  boardSeats?: number;
  proRataRights?: boolean;
  liquidationPreference?: number;
  dividendRate?: number;
  antidilutionProvision?: 'FULL_RATCHET' | 'WEIGHTED_AVERAGE' | 'NONE';
  votingRights?: Record<string, any>;
  dragAlongRights?: boolean;
  tagAlongRights?: boolean;
  redemptionRights?: boolean;
  conversionRights?: Record<string, any>;
  informationRights?: Record<string, any>;
  preemptiveRights?: boolean;
  coSaleRights?: boolean;
  noShopClause?: boolean;
  exclusivityPeriod?: number;
  closingConditions?: string[];
  otherTerms?: Record<string, any>;
  expiryDate?: Date;
}

interface UpdateTermSheetData {
  investmentAmount?: number;
  valuation?: number;
  pricePerShare?: number;
  boardSeats?: number;
  proRataRights?: boolean;
  liquidationPreference?: number;
  dividendRate?: number;
  antidilutionProvision?: 'FULL_RATCHET' | 'WEIGHTED_AVERAGE' | 'NONE';
  votingRights?: Record<string, any>;
  dragAlongRights?: boolean;
  tagAlongRights?: boolean;
  redemptionRights?: boolean;
  conversionRights?: Record<string, any>;
  informationRights?: Record<string, any>;
  preemptiveRights?: boolean;
  coSaleRights?: boolean;
  noShopClause?: boolean;
  exclusivityPeriod?: number;
  closingConditions?: string[];
  otherTerms?: Record<string, any>;
  expiryDate?: Date;
  status?: 'DRAFT' | 'PROPOSED' | 'UNDER_NEGOTIATION' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
}

export class TermSheetService {
  /**
   * Create a new term sheet
   */
  async createTermSheet(data: CreateTermSheetData) {
    try {
      // Validate equity round exists
      const equityRound = await prisma.equityRound.findUnique({
        where: { id: data.equityRoundId },
        include: { startup: true },
      });

      if (!equityRound) {
        throw new AppError('Equity round not found', 404, 'ROUND_NOT_FOUND');
      }

      // Validate investor exists
      const investor = await prisma.user.findUnique({
        where: { id: data.investorId },
      });

      if (!investor) {
        throw new AppError('Investor not found', 404, 'INVESTOR_NOT_FOUND');
      }

      // Validate term sheet data
      this.validateTermSheetData(data);

      // Create term sheet
      const termSheet = await prisma.termSheet.create({
        data: {
          equityRoundId: data.equityRoundId,
          investorId: data.investorId,
          version: data.version || 1,
          investmentAmount: new Decimal(data.investmentAmount),
          valuation: new Decimal(data.valuation),
          pricePerShare: new Decimal(data.pricePerShare),
          boardSeats: data.boardSeats || 0,
          proRataRights: data.proRataRights ?? false,
          liquidationPreference: data.liquidationPreference
            ? new Decimal(data.liquidationPreference)
            : new Decimal(1),
          dividendRate: data.dividendRate
            ? new Decimal(data.dividendRate)
            : null,
          antidilutionProvision: data.antidilutionProvision || 'NONE',
          votingRights: data.votingRights || {},
          dragAlongRights: data.dragAlongRights ?? false,
          tagAlongRights: data.tagAlongRights ?? false,
          redemptionRights: data.redemptionRights ?? false,
          conversionRights: data.conversionRights || {},
          informationRights: data.informationRights || {},
          preemptiveRights: data.preemptiveRights ?? false,
          coSaleRights: data.coSaleRights ?? false,
          noShopClause: data.noShopClause ?? false,
          exclusivityPeriod: data.exclusivityPeriod || 0,
          closingConditions: data.closingConditions || [],
          otherTerms: data.otherTerms || {},
          status: 'DRAFT',
          expiryDate: data.expiryDate,
        },
        include: {
          equityRound: {
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

      logger.info(`Term sheet created: ${termSheet.id} for round ${equityRound.id}`);

      return termSheet;
    } catch (error) {
      logger.error('Error creating term sheet:', error);
      throw error;
    }
  }

  /**
   * Get term sheet by ID
   */
  async getTermSheetById(termSheetId: string) {
    return await prisma.termSheet.findUnique({
      where: { id: termSheetId },
      include: {
        equityRound: {
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
        negotiations: {
          orderBy: { createdAt: 'desc' },
          include: {
            proposedBy: {
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
   * Get term sheets by equity round
   */
  async getTermSheetsByRound(equityRoundId: string) {
    return await prisma.termSheet.findMany({
      where: { equityRoundId },
      include: {
        investor: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        negotiations: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get term sheets by investor
   */
  async getTermSheetsByInvestor(investorId: string) {
    return await prisma.termSheet.findMany({
      where: { investorId },
      include: {
        equityRound: {
          include: {
            startup: true,
          },
        },
        negotiations: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update term sheet
   */
  async updateTermSheet(termSheetId: string, data: UpdateTermSheetData) {
    try {
      const existingTermSheet = await this.getTermSheetById(termSheetId);

      if (!existingTermSheet) {
        throw new AppError('Term sheet not found', 404, 'TERM_SHEET_NOT_FOUND');
      }

      // Validate status transition if status is being updated
      if (data.status) {
        this.validateStatusTransition(existingTermSheet.status, data.status);
      }

      const updatedTermSheet = await prisma.termSheet.update({
        where: { id: termSheetId },
        data: {
          investmentAmount: data.investmentAmount
            ? new Decimal(data.investmentAmount)
            : undefined,
          valuation: data.valuation
            ? new Decimal(data.valuation)
            : undefined,
          pricePerShare: data.pricePerShare
            ? new Decimal(data.pricePerShare)
            : undefined,
          boardSeats: data.boardSeats,
          proRataRights: data.proRataRights,
          liquidationPreference: data.liquidationPreference
            ? new Decimal(data.liquidationPreference)
            : undefined,
          dividendRate: data.dividendRate
            ? new Decimal(data.dividendRate)
            : undefined,
          antidilutionProvision: data.antidilutionProvision,
          votingRights: data.votingRights,
          dragAlongRights: data.dragAlongRights,
          tagAlongRights: data.tagAlongRights,
          redemptionRights: data.redemptionRights,
          conversionRights: data.conversionRights,
          informationRights: data.informationRights,
          preemptiveRights: data.preemptiveRights,
          coSaleRights: data.coSaleRights,
          noShopClause: data.noShopClause,
          exclusivityPeriod: data.exclusivityPeriod,
          closingConditions: data.closingConditions,
          otherTerms: data.otherTerms,
          expiryDate: data.expiryDate,
          status: data.status,
        },
        include: {
          equityRound: {
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

      logger.info(`Term sheet updated: ${termSheetId}`);

      return updatedTermSheet;
    } catch (error) {
      logger.error('Error updating term sheet:', error);
      throw error;
    }
  }

  /**
   * Propose term sheet (move to PROPOSED status)
   */
  async proposeTermSheet(termSheetId: string) {
    try {
      const termSheet = await this.getTermSheetById(termSheetId);

      if (!termSheet) {
        throw new AppError('Term sheet not found', 404, 'TERM_SHEET_NOT_FOUND');
      }

      if (termSheet.status !== 'DRAFT') {
        throw new AppError(
          'Only draft term sheets can be proposed',
          400,
          'INVALID_STATUS'
        );
      }

      const proposedTermSheet = await prisma.termSheet.update({
        where: { id: termSheetId },
        data: {
          status: 'PROPOSED',
        },
        include: {
          equityRound: {
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

      logger.info(`Term sheet proposed: ${termSheetId}`);

      // TODO: Send notification to startup founder

      return proposedTermSheet;
    } catch (error) {
      logger.error('Error proposing term sheet:', error);
      throw error;
    }
  }

  /**
   * Accept term sheet
   */
  async acceptTermSheet(termSheetId: string, acceptedBy: string) {
    try {
      const termSheet = await this.getTermSheetById(termSheetId);

      if (!termSheet) {
        throw new AppError('Term sheet not found', 404, 'TERM_SHEET_NOT_FOUND');
      }

      if (termSheet.status !== 'PROPOSED' && termSheet.status !== 'UNDER_NEGOTIATION') {
        throw new AppError(
          'Only proposed or negotiating term sheets can be accepted',
          400,
          'INVALID_STATUS'
        );
      }

      const acceptedTermSheet = await prisma.termSheet.update({
        where: { id: termSheetId },
        data: {
          status: 'ACCEPTED',
          acceptedAt: new Date(),
        },
        include: {
          equityRound: {
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

      logger.info(`Term sheet accepted: ${termSheetId} by user ${acceptedBy}`);

      // TODO: Send notifications to both parties
      // TODO: Trigger document generation

      return acceptedTermSheet;
    } catch (error) {
      logger.error('Error accepting term sheet:', error);
      throw error;
    }
  }

  /**
   * Reject term sheet
   */
  async rejectTermSheet(termSheetId: string, rejectedBy: string, reason?: string) {
    try {
      const termSheet = await this.getTermSheetById(termSheetId);

      if (!termSheet) {
        throw new AppError('Term sheet not found', 404, 'TERM_SHEET_NOT_FOUND');
      }

      if (termSheet.status === 'ACCEPTED' || termSheet.status === 'REJECTED') {
        throw new AppError(
          'Cannot reject an already finalized term sheet',
          400,
          'INVALID_STATUS'
        );
      }

      const rejectedTermSheet = await prisma.termSheet.update({
        where: { id: termSheetId },
        data: {
          status: 'REJECTED',
          rejectionReason: reason,
        },
        include: {
          equityRound: {
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

      logger.info(`Term sheet rejected: ${termSheetId} by user ${rejectedBy}`);

      // TODO: Send notifications to both parties

      return rejectedTermSheet;
    } catch (error) {
      logger.error('Error rejecting term sheet:', error);
      throw error;
    }
  }

  /**
   * Create new version of term sheet
   */
  async createNewVersion(termSheetId: string, changes: UpdateTermSheetData) {
    try {
      const originalTermSheet = await this.getTermSheetById(termSheetId);

      if (!originalTermSheet) {
        throw new AppError('Term sheet not found', 404, 'TERM_SHEET_NOT_FOUND');
      }

      // Create new version
      const newVersion = await prisma.termSheet.create({
        data: {
          equityRoundId: originalTermSheet.equityRoundId,
          investorId: originalTermSheet.investorId,
          version: originalTermSheet.version + 1,
          investmentAmount: changes.investmentAmount
            ? new Decimal(changes.investmentAmount)
            : originalTermSheet.investmentAmount,
          valuation: changes.valuation
            ? new Decimal(changes.valuation)
            : originalTermSheet.valuation,
          pricePerShare: changes.pricePerShare
            ? new Decimal(changes.pricePerShare)
            : originalTermSheet.pricePerShare,
          boardSeats: changes.boardSeats ?? originalTermSheet.boardSeats,
          proRataRights: changes.proRataRights ?? originalTermSheet.proRataRights,
          liquidationPreference: changes.liquidationPreference
            ? new Decimal(changes.liquidationPreference)
            : originalTermSheet.liquidationPreference,
          dividendRate: changes.dividendRate
            ? new Decimal(changes.dividendRate)
            : originalTermSheet.dividendRate,
          antidilutionProvision: changes.antidilutionProvision ?? originalTermSheet.antidilutionProvision,
          votingRights: changes.votingRights ?? originalTermSheet.votingRights,
          dragAlongRights: changes.dragAlongRights ?? originalTermSheet.dragAlongRights,
          tagAlongRights: changes.tagAlongRights ?? originalTermSheet.tagAlongRights,
          redemptionRights: changes.redemptionRights ?? originalTermSheet.redemptionRights,
          conversionRights: changes.conversionRights ?? originalTermSheet.conversionRights,
          informationRights: changes.informationRights ?? originalTermSheet.informationRights,
          preemptiveRights: changes.preemptiveRights ?? originalTermSheet.preemptiveRights,
          coSaleRights: changes.coSaleRights ?? originalTermSheet.coSaleRights,
          noShopClause: changes.noShopClause ?? originalTermSheet.noShopClause,
          exclusivityPeriod: changes.exclusivityPeriod ?? originalTermSheet.exclusivityPeriod,
          closingConditions: changes.closingConditions ?? originalTermSheet.closingConditions,
          otherTerms: changes.otherTerms ?? originalTermSheet.otherTerms,
          status: 'DRAFT',
          expiryDate: changes.expiryDate ?? originalTermSheet.expiryDate,
        },
        include: {
          equityRound: {
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

      logger.info(`New term sheet version created: ${newVersion.id} (v${newVersion.version})`);

      return newVersion;
    } catch (error) {
      logger.error('Error creating new term sheet version:', error);
      throw error;
    }
  }

  /**
   * Validate term sheet data
   */
  private validateTermSheetData(data: CreateTermSheetData) {
    if (data.investmentAmount <= 0) {
      throw new AppError(
        'Investment amount must be greater than 0',
        400,
        'INVALID_INVESTMENT_AMOUNT'
      );
    }

    if (data.valuation <= 0) {
      throw new AppError(
        'Valuation must be greater than 0',
        400,
        'INVALID_VALUATION'
      );
    }

    if (data.pricePerShare <= 0) {
      throw new AppError(
        'Price per share must be greater than 0',
        400,
        'INVALID_PRICE_PER_SHARE'
      );
    }

    if (data.liquidationPreference && data.liquidationPreference < 0) {
      throw new AppError(
        'Liquidation preference cannot be negative',
        400,
        'INVALID_LIQUIDATION_PREFERENCE'
      );
    }

    if (data.boardSeats && data.boardSeats < 0) {
      throw new AppError(
        'Board seats cannot be negative',
        400,
        'INVALID_BOARD_SEATS'
      );
    }
  }

  /**
   * Validate status transitions
   */
  private validateStatusTransition(currentStatus: string, newStatus: string) {
    const validTransitions: Record<string, string[]> = {
      DRAFT: ['PROPOSED', 'REJECTED'],
      PROPOSED: ['UNDER_NEGOTIATION', 'ACCEPTED', 'REJECTED'],
      UNDER_NEGOTIATION: ['ACCEPTED', 'REJECTED', 'PROPOSED'],
      ACCEPTED: [], // Terminal state
      REJECTED: [], // Terminal state
      EXPIRED: [], // Terminal state
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

export const termSheetService = new TermSheetService();
