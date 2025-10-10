import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler.js';
import { sendSuccess } from '../utils/response.js';
import { logger } from '../config/logger.js';
import { fileUploadService } from '../services/fileUploadService.js';
import { prisma } from '../config/database.js';

// Types for better type safety
interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name?: string;
    role: string;
  };
}

interface InvestmentParams {
  id?: string;
}

interface CreateInvestmentData {
  pitchId: string;
  amount: number;
  equityPercentage: number;
  investmentType?: string;
  paymentMethod: string;
  currency?: string;
  terms?: {
    vestingPeriod?: number;
    cliffPeriod?: number;
    votingRights?: boolean;
    informationRights?: boolean;
    proRataRights?: boolean;
    dragAlongRights?: boolean;
    tagAlongRights?: boolean;
    redemptionRights?: boolean;
  };
  syndicateId?: string;
  additionalNotes?: string;
}

interface UpdateInvestmentData {
  amount?: number;
  equityPercentage?: number;
  paymentMethod?: string;
  currency?: string;
  terms?: {
    vestingPeriod?: number;
    cliffPeriod?: number;
    votingRights?: boolean;
    informationRights?: boolean;
    proRataRights?: boolean;
    dragAlongRights?: boolean;
    tagAlongRights?: boolean;
    redemptionRights?: boolean;
  };
  additionalNotes?: string;
}

class InvestmentController {
  // Create investment
  async createInvestment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const investmentData: CreateInvestmentData = req.body;

      // Verify pitch exists and is active
      const pitch = await this.findPitchById(investmentData.pitchId);
      if (!pitch) {
        throw new AppError('Pitch not found', 404, 'PITCH_NOT_FOUND');
      }

      if (pitch.status !== 'ACTIVE') {
        throw new AppError('Pitch is not active for investments', 400, 'PITCH_NOT_ACTIVE');
      }

      // Check if user is accredited (if required)
      const user = await this.findUserWithProfile(userId);
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      if (investmentData.amount >= 100000) {
        const accreditationStatus = user.userProfile?.accreditationStatus;
        if (!accreditationStatus || accreditationStatus !== 'VERIFIED') {
          throw new AppError('Accreditation required for investments of $100,000 or more', 403, 'ACCREDITATION_REQUIRED');
        }
      }

      // Validate investment amount
      if (investmentData.amount < Number(pitch.minimumInvestment)) {
        throw new AppError(`Minimum investment amount is $${pitch.minimumInvestment}`, 400, 'AMOUNT_TOO_LOW');
      }

      // Check if pitch funding goal would be exceeded
      const currentFunding = await this.getPitchCurrentFunding(investmentData.pitchId);
      if (currentFunding + investmentData.amount > Number(pitch.fundingAmount)) {
        throw new AppError('Investment would exceed pitch funding goal', 400, 'EXCEEDS_FUNDING_GOAL');
      }

      // Create investment
      const investment = await this.createInvestmentInDb({
        ...investmentData,
        investorId: userId,
        status: 'PENDING',
      });

      // Generate escrow information
      const escrowInfo = await this.generateEscrowInfo(investment);

      logger.info('Investment created', {
        investmentId: investment.id,
        pitchId: investmentData.pitchId,
        investorId: userId,
        amount: investmentData.amount,
      });

      sendSuccess(res, {
        id: investment.id,
        pitch_id: investment.pitchId,
        investor_id: investment.investorId,
        amount: investment.amount,
        status: investment.status,
        escrow_reference: escrowInfo.escrowReference,
        payment_instructions: escrowInfo.paymentInstructions,
        next_steps: [
          'Complete bank transfer to escrow account',
          'Upload investment agreement',
          'Complete KYC verification if not already done',
        ],
      }, 'Investment created successfully', 201);

    } catch (error) {
      next(error);
    }
  }

  // Get investment by ID
  async getInvestmentById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as InvestmentParams;
      if (!id) {
        throw new AppError('Investment ID is required', 400, 'INVALID_ID');
      }

      const investment = await this.findInvestmentById(id);
      if (!investment) {
        throw new AppError('Investment not found', 404, 'INVESTMENT_NOT_FOUND');
      }

      // Get additional data
      const pitch = await this.findPitchById(investment.pitchId);
      const documents = await this.getInvestmentDocuments(id);

      sendSuccess(res, {
        id: investment.id,
        pitch: pitch ? {
          id: pitch.id,
          title: pitch.title,
          startup: {
            name: 'Startup Name', // TODO: Get from startup table
          },
        } : null,
        investor_id: investment.investorId,
        amount: investment.amount,
        equity_percentage: investment.equityPercentage,
        investment_type: investment.investmentType,
        payment_method: investment.paymentMethod,
        currency: investment.currency,
        terms: investment.terms,
        status: investment.status,
        escrow_info: investment.escrowInfo,
        documents: documents,
        investment_date: investment.investmentDate,
        completed_at: investment.completedAt,
        created_at: investment.createdAt,
        updated_at: investment.updatedAt,
      }, 'Investment retrieved successfully');

    } catch (error) {
      next(error);
    }
  }

  // List investments
  async listInvestments(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const queryParams = req.query;
      const {
        status,
        investmentType,
        pitchId,
        startupId,
        minAmount,
        maxAmount,
        currency,
        createdAfter,
        createdBefore,
        page,
        limit,
        sortBy,
        sortOrder,
      } = queryParams as any;

      const result = await this.getInvestmentsList({
        investorId: userId,
        status,
        investmentType,
        pitchId,
        startupId,
        minAmount: minAmount ? parseFloat(minAmount) : undefined,
        maxAmount: maxAmount ? parseFloat(maxAmount) : undefined,
        currency,
        createdAfter,
        createdBefore,
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
        sortBy,
        sortOrder,
      });

      sendSuccess(res, {
        investments: result.investments,
        pagination: result.pagination,
      }, 'Investments retrieved successfully');

    } catch (error) {
      next(error);
    }
  }

  // Update investment
  async updateInvestment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params as InvestmentParams;
      if (!id) {
        throw new AppError('Investment ID is required', 400, 'INVALID_ID');
      }
      const updateData: UpdateInvestmentData = req.body;

      // Check if user owns the investment or is admin
      const investment = await this.findInvestmentById(id);
      if (!investment) {
        throw new AppError('Investment not found', 404, 'INVESTMENT_NOT_FOUND');
      }

      if (investment.investorId !== userId && req.user?.role !== 'ADMIN') {
        throw new AppError('Not authorized to update this investment', 403, 'NOT_AUTHORIZED');
      }

      // Check if investment can be updated (not completed or cancelled)
      if (['COMPLETED', 'CANCELLED'].includes(investment.status)) {
        throw new AppError('Cannot update completed or cancelled investment', 400, 'INVESTMENT_NOT_UPDATEABLE');
      }

      // Update investment
      const updatedInvestment = await this.updateInvestmentInDb(id, updateData);

      logger.info('Investment updated', { investmentId: id, updatedBy: userId });

      sendSuccess(res, {
        id: updatedInvestment.id,
        amount: updatedInvestment.amount,
        equity_percentage: updatedInvestment.equityPercentage,
        updated_at: updatedInvestment.updatedAt,
      }, 'Investment updated successfully');

    } catch (error) {
      next(error);
    }
  }

  // Cancel investment
  async cancelInvestment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params as InvestmentParams;
      if (!id) {
        throw new AppError('Investment ID is required', 400, 'INVALID_ID');
      }
      const { reason, details } = req.body;

      // Check if user owns the investment or is admin
      const investment = await this.findInvestmentById(id);
      if (!investment) {
        throw new AppError('Investment not found', 404, 'INVESTMENT_NOT_FOUND');
      }

      if (investment.investorId !== userId && req.user?.role !== 'ADMIN') {
        throw new AppError('Not authorized to cancel this investment', 403, 'NOT_AUTHORIZED');
      }

      // Check if investment can be cancelled
      if (['COMPLETED', 'CANCELLED'].includes(investment.status)) {
        throw new AppError('Cannot cancel completed or already cancelled investment', 400, 'INVESTMENT_NOT_CANCELLABLE');
      }

      // Cancel investment
      const cancelledInvestment = await this.cancelInvestmentInDb(id, {
        reason,
        details,
        cancelledBy: userId,
      });

      logger.info('Investment cancelled', { investmentId: id, reason, cancelledBy: userId });

      sendSuccess(res, {
        id: cancelledInvestment.id,
        status: cancelledInvestment.status,
        cancelled_at: cancelledInvestment.updatedAt,
      }, 'Investment cancelled successfully');

    } catch (error) {
      next(error);
    }
  }

  // Upload investment document
  async uploadDocument(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params as InvestmentParams;
      if (!id) {
        throw new AppError('Investment ID is required', 400, 'INVALID_ID');
      }
      const {
        documentType,
        description,
        isPublic,
      } = req.body;

      // Check if user owns the investment or is admin
      const investment = await this.findInvestmentById(id);
      if (!investment) {
        throw new AppError('Investment not found', 404, 'INVESTMENT_NOT_FOUND');
      }

      if (investment.investorId !== userId && req.user?.role !== 'ADMIN') {
        throw new AppError('Not authorized to upload documents for this investment', 403, 'NOT_AUTHORIZED');
      }

      if (!req.file) {
        throw new AppError('Document file is required', 400, 'FILE_REQUIRED');
      }

      // Upload file
      const fileUrl = await fileUploadService.uploadFile(req.file, {
        folder: 'investment-documents',
        allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
        maxSize: 10 * 1024 * 1024, // 10MB
      });

      // Create document record
      const document = await this.createInvestmentDocument(id, {
        documentType,
        fileName: req.file.originalname,
        fileUrl,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        description,
        isPublic: isPublic || false,
        uploadedBy: userId,
      });

      logger.info('Investment document uploaded', {
        investmentId: id,
        documentId: document.id,
        uploadedBy: userId,
      });

      sendSuccess(res, {
        id: document.id,
        document_type: document.documentType,
        file_name: document.fileName,
        file_url: document.fileUrl,
        uploaded_at: document.uploadedAt,
      }, 'Document uploaded successfully', 201);

    } catch (error) {
      next(error);
    }
  }

  // Get investment documents
  async getDocuments(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as InvestmentParams;
      if (!id) {
        throw new AppError('Investment ID is required', 400, 'INVALID_ID');
      }

      const investment = await this.findInvestmentById(id);
      if (!investment) {
        throw new AppError('Investment not found', 404, 'INVESTMENT_NOT_FOUND');
      }

      const documents = await this.getInvestmentDocuments(id);

      sendSuccess(res, {
        documents: documents,
      }, 'Investment documents retrieved successfully');

    } catch (error) {
      next(error);
    }
  }

  // Confirm payment
  async confirmPayment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params as InvestmentParams;
      if (!id) {
        throw new AppError('Investment ID is required', 400, 'INVALID_ID');
      }
      const { transactionReference, paymentProof, notes } = req.body;

      // Check if user owns the investment or is admin
      const investment = await this.findInvestmentById(id);
      if (!investment) {
        throw new AppError('Investment not found', 404, 'INVESTMENT_NOT_FOUND');
      }

      if (investment.investorId !== userId && req.user?.role !== 'ADMIN') {
        throw new AppError('Not authorized to confirm payment for this investment', 403, 'NOT_AUTHORIZED');
      }

      // Handle payment proof upload if provided
      let paymentProofUrl = paymentProof;
      if (req.file) {
        paymentProofUrl = await fileUploadService.uploadFile(req.file, {
          folder: 'payment-proofs',
          allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
          maxSize: 5 * 1024 * 1024, // 5MB
        });
      }

      // Update investment with payment confirmation
      const updatedInvestment = await this.confirmInvestmentPayment(id, {
        transactionReference,
        paymentProof: paymentProofUrl,
        notes,
        confirmedBy: userId,
      });

      logger.info('Investment payment confirmed', {
        investmentId: id,
        transactionReference,
        confirmedBy: userId,
      });

      sendSuccess(res, {
        id: updatedInvestment.id,
        status: updatedInvestment.status,
        updated_at: updatedInvestment.updatedAt,
      }, 'Payment confirmed successfully');

    } catch (error) {
      next(error);
    }
  }

  // Helper methods
  private async getPitchCurrentFunding(pitchId: string): Promise<number> {
    try {
      const investments = await prisma.investment.findMany({
        where: { pitchId, status: 'COMPLETED' },
      });

      return investments.reduce((sum, inv) => sum + Number(inv.amount), 0);
    } catch (error) {
      logger.error('Error calculating pitch current funding', { pitchId, error });
      return 0;
    }
  }

  private async generateEscrowInfo(investment: any) {
    try {
      // Generate escrow reference and payment instructions
      const escrowReference = `ESC_${investment.id}_${Date.now()}`;

      return {
        escrowReference,
        paymentInstructions: {
          bankAccount: '****1234', // In real implementation, get from escrow service
          routingNumber: '****5678',
          reference: `INV_${investment.id}`,
          amount: investment.amount,
          currency: investment.currency || 'USD',
        },
      };
    } catch (error) {
      logger.error('Error generating escrow info', { investmentId: investment.id, error });
      throw error;
    }
  }

  private async getInvestmentDocuments(investmentId: string) {
    try {
      // For now, return empty array as investment documents might be stored differently
      // In a full implementation, you might have an InvestmentDocument model
      return [];
    } catch (error) {
      logger.error('Error getting investment documents', { investmentId, error });
      return [];
    }
  }

  // Database operations (these would typically be in a service layer)
  private async findInvestmentById(id: string) {
    try {
      return await prisma.investment.findUnique({
        where: { id },
      });
    } catch (error) {
      logger.error('Error finding investment by ID', { id, error });
      throw error;
    }
  }

  private async findPitchById(id: string) {
    try {
      return await prisma.pitch.findUnique({
        where: { id },
      });
    } catch (error) {
      logger.error('Error finding pitch by ID', { id, error });
      throw error;
    }
  }

  private async findUserWithProfile(id: string) {
    try {
      return await prisma.user.findUnique({
        where: { id },
        include: {
          userProfile: true,
        },
      });
    } catch (error) {
      logger.error('Error finding user with profile by ID', { id, error });
      throw error;
    }
  }

  private async createInvestmentInDb(investmentData: any) {
    try {
      const { investorId, ...data } = investmentData;

      return await prisma.investment.create({
        data: {
          ...data,
          investorId,
          // Map the data to match the Prisma schema field names
          equityPercentage: data.equityPercentage,
          investmentType: data.investmentType || 'DIRECT',
          paymentMethod: data.paymentMethod,
        },
      });
    } catch (error) {
      logger.error('Error creating investment in database', { error });
      throw error;
    }
  }

  private async updateInvestmentInDb(id: string, updateData: any) {
    try {
      return await prisma.investment.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      logger.error('Error updating investment in database', { id, error });
      throw error;
    }
  }

  private async cancelInvestmentInDb(id: string, _cancelData: any) {
    try {
      return await prisma.investment.update({
        where: { id },
        data: {
          status: 'CANCELLED',
        },
      });
    } catch (error) {
      logger.error('Error cancelling investment in database', { id, error });
      throw error;
    }
  }

  private async createInvestmentDocument(investmentId: string, documentData: any) {
    try {
      // For now, return a mock document
      // In a full implementation, you would create an InvestmentDocument record
      return {
        id: `doc_${Date.now()}`,
        ...documentData,
        uploadedAt: new Date(),
      };
    } catch (error) {
      logger.error('Error creating investment document', { investmentId, error });
      throw error;
    }
  }

  private async confirmInvestmentPayment(id: string, paymentData: any) {
    try {
      return await prisma.investment.update({
        where: { id },
        data: {
          status: 'ESCROW',
          paymentReference: paymentData.transactionReference,
        },
      });
    } catch (error) {
      logger.error('Error confirming investment payment', { id, error });
      throw error;
    }
  }

  private async getInvestmentsList(filters: any) {
    try {
      const {
        page, limit, investorId, status, investmentType, pitchId,
        minAmount, maxAmount, currency, createdAfter, createdBefore,
        sortBy, sortOrder
      } = filters;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {};

      if (investorId) where.investorId = investorId;
      if (status) where.status = status;
      if (investmentType) where.investmentType = investmentType;
      if (pitchId) where.pitchId = pitchId;

      // Amount range filters
      if (minAmount !== undefined || maxAmount !== undefined) {
        where.amount = {};
        if (minAmount !== undefined) where.amount.gte = minAmount;
        if (maxAmount !== undefined) where.amount.lte = maxAmount;
      }

      if (currency) where.currency = currency;

      // Date range filters
      if (createdAfter || createdBefore) {
        where.createdAt = {};
        if (createdAfter) where.createdAt.gte = new Date(createdAfter);
        if (createdBefore) where.createdAt.lte = new Date(createdBefore);
      }

      // Get investments with related data
      const investments = await prisma.investment.findMany({
        where,
        include: {
          pitch: {
            select: {
              id: true,
              title: true,
              startup: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: sortBy ? { [sortBy]: sortOrder || 'asc' } : { createdAt: 'desc' },
        skip,
        take: limit,
      });

      // Get total count
      const total = await prisma.investment.count({ where });

      return {
        investments,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error getting investments list', { filters, error });
      throw error;
    }
  }
}

// Export singleton instance
export const investmentController = new InvestmentController();
export default investmentController;