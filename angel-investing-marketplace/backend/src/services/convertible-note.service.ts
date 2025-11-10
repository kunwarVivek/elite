import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { logger } from '../config/logger.js';
import { Decimal } from '@prisma/client/runtime/library';

interface CreateConvertibleNoteData {
  investmentId: string;
  principalAmount: number;
  interestRate: number;
  maturityDate: Date;
  discountRate?: number;
  valuationCap?: number;
  autoConversion?: boolean;
  qualifiedFinancingThreshold?: number;
  securityType?: string;
  compounding?: 'SIMPLE' | 'COMPOUND';
  documentUrl?: string;
}

export class ConvertibleNoteService {
  /**
   * Create a new convertible note
   */
  async createConvertibleNote(data: CreateConvertibleNoteData) {
    try {
      // Validate investment exists
      const investment = await prisma.investment.findUnique({
        where: { id: data.investmentId },
        include: { pitch: true },
      });

      if (!investment) {
        throw new AppError('Investment not found', 404, 'INVESTMENT_NOT_FOUND');
      }

      // Validate note terms
      this.validateNoteTerms(data);

      // Create convertible note
      const note = await prisma.convertibleNote.create({
        data: {
          investmentId: data.investmentId,
          principalAmount: new Decimal(data.principalAmount),
          interestRate: new Decimal(data.interestRate),
          maturityDate: data.maturityDate,
          discountRate: data.discountRate
            ? new Decimal(data.discountRate)
            : null,
          valuationCap: data.valuationCap
            ? new Decimal(data.valuationCap)
            : null,
          autoConversion: data.autoConversion ?? true,
          qualifiedFinancingThreshold: data.qualifiedFinancingThreshold
            ? new Decimal(data.qualifiedFinancingThreshold)
            : null,
          securityType: data.securityType || 'Preferred',
          compounding: data.compounding || 'SIMPLE',
          documentUrl: data.documentUrl,
          status: 'ACTIVE',
          accruedInterest: new Decimal(0),
          lastAccrualDate: new Date(),
        },
      });

      logger.info(`Convertible note created: ${note.id} for investment ${investment.id}`);

      return note;
    } catch (error) {
      logger.error('Error creating convertible note:', error);
      throw error;
    }
  }

  /**
   * Calculate accrued interest
   */
  async calculateAccruedInterest(noteId: string): Promise<number> {
    const note = await this.getNoteById(noteId);

    if (!note) {
      throw new AppError('Convertible note not found', 404, 'NOTE_NOT_FOUND');
    }

    const lastAccrualDate = note.lastAccrualDate || note.issueDate;
    const daysSinceLastAccrual = Math.floor(
      (Date.now() - lastAccrualDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const annualRate = Number(note.interestRate) / 100;
    const principal = Number(note.principalAmount);
    const existingAccruedInterest = Number(note.accruedInterest);

    let newInterest = 0;

    if (note.compounding === 'SIMPLE') {
      // Simple interest: I = P * r * t
      newInterest = (principal * annualRate * daysSinceLastAccrual) / 365;
    } else {
      // Compound interest: A = P * (1 + r)^t - P
      const periods = daysSinceLastAccrual / 365;
      newInterest = principal * Math.pow(1 + annualRate, periods) - principal - existingAccruedInterest;
    }

    return existingAccruedInterest + newInterest;
  }

  /**
   * Accrue interest for a note (updates the database)
   */
  async accrueInterest(noteId: string) {
    try {
      const accruedInterest = await this.calculateAccruedInterest(noteId);

      const updatedNote = await prisma.convertibleNote.update({
        where: { id: noteId },
        data: {
          accruedInterest: new Decimal(accruedInterest),
          lastAccrualDate: new Date(),
        },
      });

      logger.info(`Interest accrued for note ${noteId}: $${accruedInterest.toFixed(2)}`);

      return updatedNote;
    } catch (error) {
      logger.error('Error accruing interest:', error);
      throw error;
    }
  }

  /**
   * Calculate conversion price
   */
  async calculateConversionPrice(
    noteId: string,
    pricePerShare: number
  ): Promise<number> {
    const note = await this.getNoteById(noteId);

    if (!note) {
      throw new AppError('Convertible note not found', 404, 'NOTE_NOT_FOUND');
    }

    // If there's a valuation cap, calculate the cap price
    let capPrice = Infinity;
    if (note.valuationCap) {
      // This is a simplified calculation - in reality would need round details
      capPrice = Number(note.valuationCap) / 10000000; // Assuming 10M shares
    }

    // Apply discount if available
    let discountPrice = pricePerShare;
    if (note.discountRate) {
      discountPrice = pricePerShare * (1 - Number(note.discountRate) / 100);
    }

    // Use the lower of cap price and discount price
    return Math.min(capPrice, discountPrice, pricePerShare);
  }

  /**
   * Convert note to equity
   */
  async convertNote(noteId: string, pricePerShare: number) {
    try {
      const note = await this.getNoteById(noteId);

      if (!note) {
        throw new AppError('Convertible note not found', 404, 'NOTE_NOT_FOUND');
      }

      if (note.status !== 'ACTIVE') {
        throw new AppError(
          'Note is not active',
          400,
          'NOTE_NOT_ACTIVE'
        );
      }

      // Accrue any remaining interest
      await this.accrueInterest(noteId);

      // Get updated note with accrued interest
      const updatedNote = await this.getNoteById(noteId);
      if (!updatedNote) throw new AppError('Note not found', 404, 'NOTE_NOT_FOUND');

      // Calculate total amount to convert (principal + interest)
      const totalAmount =
        Number(updatedNote.principalAmount) + Number(updatedNote.accruedInterest);

      // Calculate conversion price
      const conversionPrice = await this.calculateConversionPrice(
        noteId,
        pricePerShare
      );

      // Calculate shares
      const shares = Math.floor(totalAmount / conversionPrice);

      // Update note status
      const convertedNote = await prisma.convertibleNote.update({
        where: { id: noteId },
        data: {
          status: 'CONVERTED',
          conversionPrice: new Decimal(conversionPrice),
        },
      });

      logger.info(
        `Convertible note ${noteId} converted to ${shares} shares at $${conversionPrice} per share`
      );

      return {
        note: convertedNote,
        shares,
        conversionPrice,
        totalAmount,
      };
    } catch (error) {
      logger.error('Error converting note:', error);
      throw error;
    }
  }

  /**
   * Repay note at maturity
   */
  async repayNote(noteId: string, repaymentAmount: number) {
    try {
      const note = await this.getNoteById(noteId);

      if (!note) {
        throw new AppError('Convertible note not found', 404, 'NOTE_NOT_FOUND');
      }

      if (note.status !== 'ACTIVE') {
        throw new AppError(
          'Note is not active',
          400,
          'NOTE_NOT_ACTIVE'
        );
      }

      // Accrue final interest
      await this.accrueInterest(noteId);

      // Get updated note
      const updatedNote = await this.getNoteById(noteId);
      if (!updatedNote) throw new AppError('Note not found', 404, 'NOTE_NOT_FOUND');

      const totalOwed =
        Number(updatedNote.principalAmount) + Number(updatedNote.accruedInterest);

      if (repaymentAmount < totalOwed) {
        throw new AppError(
          `Repayment amount ($${repaymentAmount}) is less than total owed ($${totalOwed})`,
          400,
          'INSUFFICIENT_REPAYMENT'
        );
      }

      // Mark note as repaid
      const repaidNote = await prisma.convertibleNote.update({
        where: { id: noteId },
        data: {
          status: 'REPAID',
        },
      });

      logger.info(`Convertible note ${noteId} repaid: $${repaymentAmount}`);

      return {
        note: repaidNote,
        totalOwed,
        repaymentAmount,
      };
    } catch (error) {
      logger.error('Error repaying note:', error);
      throw error;
    }
  }

  /**
   * Get note by ID
   */
  async getNoteById(noteId: string) {
    return await prisma.convertibleNote.findUnique({
      where: { id: noteId },
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
   * Get notes by startup
   */
  async getNotesByStartup(startupId: string) {
    return await prisma.convertibleNote.findMany({
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
   * Get notes by investor
   */
  async getNotesByInvestor(investorId: string) {
    return await prisma.convertibleNote.findMany({
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
   * Get maturing notes (within 30 days)
   */
  async getMaturingNotes() {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    return await prisma.convertibleNote.findMany({
      where: {
        status: 'ACTIVE',
        maturityDate: {
          lte: thirtyDaysFromNow,
        },
      },
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
      orderBy: {
        maturityDate: 'asc',
      },
    });
  }

  /**
   * Check for qualified financing events
   */
  async checkQualifiedFinancing(noteId: string, roundAmount: number): Promise<boolean> {
    const note = await this.getNoteById(noteId);

    if (!note) {
      throw new AppError('Convertible note not found', 404, 'NOTE_NOT_FOUND');
    }

    if (!note.qualifiedFinancingThreshold) {
      // If no threshold specified, any round qualifies
      return true;
    }

    return roundAmount >= Number(note.qualifiedFinancingThreshold);
  }

  /**
   * Validate note terms
   */
  private validateNoteTerms(data: CreateConvertibleNoteData) {
    if (data.principalAmount <= 0) {
      throw new AppError(
        'Principal amount must be greater than 0',
        400,
        'INVALID_PRINCIPAL'
      );
    }

    if (data.interestRate < 0 || data.interestRate > 100) {
      throw new AppError(
        'Interest rate must be between 0 and 100',
        400,
        'INVALID_INTEREST_RATE'
      );
    }

    if (data.maturityDate <= new Date()) {
      throw new AppError(
        'Maturity date must be in the future',
        400,
        'INVALID_MATURITY_DATE'
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

    if (data.valuationCap && data.valuationCap <= 0) {
      throw new AppError(
        'Valuation cap must be greater than 0',
        400,
        'INVALID_VALUATION_CAP'
      );
    }
  }
}

export const convertibleNoteService = new ConvertibleNoteService();
