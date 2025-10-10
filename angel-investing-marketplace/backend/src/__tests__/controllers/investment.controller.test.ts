/**
 * Investment Controller Tests
 *
 * Tests for create, status updates, refunds, and document management
 * All tests use MOCKED data only - no real database connections
 */

// Mock file upload service BEFORE importing controller
const mockFileUploadService = {
  uploadFile: jest.fn(),
};

jest.mock('../../services/fileUploadService', () => ({
  fileUploadService: mockFileUploadService,
}));

import { investmentController } from '../../controllers/investment.controller';
import { prismaMock, createMockRequest, createMockResponse, createMockNext } from '../setup';
import { mockUsers, mockPitches, mockInvestments, createMockInvestment } from '../fixtures';

describe('InvestmentController', () => {
  let mockRequest: any;
  let mockResponse: any;
  let mockNext: any;

  beforeEach(() => {
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();
    mockNext = createMockNext();
  });

  describe('createInvestment', () => {
    it('should create an investment successfully', async () => {
      const investmentData = {
        pitchId: mockPitches.active.id,
        amount: 50000,
        equityPercentage: 0.5,
        investmentType: 'DIRECT',
        paymentMethod: 'bank_transfer',
        currency: 'USD',
        terms: {
          vestingPeriod: 48,
          cliffPeriod: 12,
          votingRights: true,
          informationRights: true,
        },
      };

      mockRequest.user = { id: mockUsers.investor.id, email: 'investor@example.com', role: 'INVESTOR' };
      mockRequest.body = investmentData;

      // Mock pitch lookup (active pitch)
      prismaMock.pitch.findUnique.mockResolvedValue({
        ...mockPitches.active,
        status: 'ACTIVE' as any,
        minimumInvestment: 10000,
        fundingAmount: 1000000,
      } as any);

      // Mock user lookup (accredited investor)
      prismaMock.user.findUnique.mockResolvedValue({
        ...mockUsers.investor,
        accreditationStatus: 'APPROVED' as any,
      } as any);

      // Mock current funding calculation
      prismaMock.investment.findMany.mockResolvedValue([
        { amount: 100000, status: 'COMPLETED' } as any,
        { amount: 50000, status: 'COMPLETED' } as any,
      ]);

      // Mock investment creation
      const mockInvestment = createMockInvestment({
        id: 'investment-new-1',
        investor_id: mockUsers.investor.id,
        pitch_id: investmentData.pitchId,
        amount: investmentData.amount,
        equity_percentage: investmentData.equityPercentage,
        investment_type: investmentData.investmentType as any,
        payment_method: investmentData.paymentMethod,
        currency: investmentData.currency,
        status: 'PENDING' as any,
      });

      prismaMock.investment.create.mockResolvedValue({
        ...mockInvestment,
        investorId: mockInvestment.investor_id,
        pitchId: mockInvestment.pitch_id,
        equityPercentage: mockInvestment.equity_percentage,
        investmentType: mockInvestment.investment_type,
        paymentMethod: mockInvestment.payment_method,
        terms: investmentData.terms,
        escrowInfo: null,
        syndicateId: null,
        paymentReference: null,
        investmentDate: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      await investmentController.createInvestment(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            id: expect.any(String),
            pitch_id: investmentData.pitchId,
            investor_id: mockUsers.investor.id,
            amount: investmentData.amount,
            status: 'PENDING',
            escrow_reference: expect.any(String),
            payment_instructions: expect.any(Object),
          }),
        })
      );
    });

    it('should throw error if user not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.body = { pitchId: mockPitches.active.id, amount: 50000 };

      await investmentController.createInvestment(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User not authenticated',
          statusCode: 401,
        })
      );
    });

    it('should throw error if pitch not found', async () => {
      mockRequest.user = { id: mockUsers.investor.id, email: 'investor@example.com', role: 'INVESTOR' };
      mockRequest.body = { pitchId: 'non-existent-pitch', amount: 50000 };

      prismaMock.pitch.findUnique.mockResolvedValue(null);

      await investmentController.createInvestment(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Pitch not found',
          statusCode: 404,
        })
      );
    });

    it('should throw error if pitch not active', async () => {
      mockRequest.user = { id: mockUsers.investor.id, email: 'investor@example.com', role: 'INVESTOR' };
      mockRequest.body = { pitchId: mockPitches.draft.id, amount: 50000 };

      prismaMock.pitch.findUnique.mockResolvedValue({
        ...mockPitches.draft,
        status: 'DRAFT' as any,
      } as any);

      await investmentController.createInvestment(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Pitch is not active for investments',
          statusCode: 400,
        })
      );
    });

    it('should throw error if user not accredited for large investments', async () => {
      mockRequest.user = { id: mockUsers.investor.id, email: 'investor@example.com', role: 'INVESTOR' };
      mockRequest.body = { pitchId: mockPitches.active.id, amount: 150000 };

      prismaMock.pitch.findUnique.mockResolvedValue({
        ...mockPitches.active,
        status: 'ACTIVE' as any,
        minimumInvestment: 10000,
        fundingAmount: 1000000,
      } as any);

      prismaMock.user.findUnique.mockResolvedValue({
        ...mockUsers.investor,
        accreditationStatus: 'PENDING' as any,
      } as any);

      await investmentController.createInvestment(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Accreditation required for investments of $100,000 or more',
          statusCode: 403,
        })
      );
    });

    it('should throw error if amount below minimum', async () => {
      mockRequest.user = { id: mockUsers.investor.id, email: 'investor@example.com', role: 'INVESTOR' };
      mockRequest.body = { pitchId: mockPitches.active.id, amount: 5000 };

      prismaMock.pitch.findUnique.mockResolvedValue({
        ...mockPitches.active,
        status: 'ACTIVE' as any,
        minimumInvestment: 10000,
        fundingAmount: 1000000,
      } as any);

      prismaMock.user.findUnique.mockResolvedValue({
        ...mockUsers.investor,
        accreditationStatus: 'APPROVED' as any,
      } as any);

      await investmentController.createInvestment(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Minimum investment amount is $10000',
          statusCode: 400,
        })
      );
    });

    it('should throw error if investment exceeds funding goal', async () => {
      mockRequest.user = { id: mockUsers.investor.id, email: 'investor@example.com', role: 'INVESTOR' };
      mockRequest.body = { pitchId: mockPitches.active.id, amount: 500000 };

      prismaMock.pitch.findUnique.mockResolvedValue({
        ...mockPitches.active,
        status: 'ACTIVE' as any,
        minimumInvestment: 10000,
        fundingAmount: 1000000,
      } as any);

      prismaMock.user.findUnique.mockResolvedValue({
        ...mockUsers.investor,
        accreditationStatus: 'APPROVED' as any,
      } as any);

      // Mock current funding at 700k, new investment would make it 1.2M
      prismaMock.investment.findMany.mockResolvedValue([
        { amount: 700000, status: 'COMPLETED' } as any,
      ]);

      await investmentController.createInvestment(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Investment would exceed pitch funding goal',
          statusCode: 400,
        })
      );
    });
  });

  describe('getInvestmentById', () => {
    it('should retrieve investment by ID successfully', async () => {
      mockRequest.params = { id: mockInvestments.completed.id };

      prismaMock.investment.findUnique.mockResolvedValue({
        ...mockInvestments.completed,
        investorId: mockInvestments.completed.investor_id,
        pitchId: mockInvestments.completed.pitch_id,
        equityPercentage: mockInvestments.completed.equity_percentage,
        paymentMethod: mockInvestments.completed.payment_method,
        investmentType: 'DIRECT' as any,
        currency: 'USD',
        terms: null,
        escrowInfo: null,
        syndicateId: null,
        paymentReference: mockInvestments.completed.payment_intent_id,
        investmentDate: new Date(),
        completedAt: new Date(),
        createdAt: mockInvestments.completed.created_at,
        updatedAt: mockInvestments.completed.updated_at,
      } as any);

      prismaMock.pitch.findUnique.mockResolvedValue({
        ...mockPitches.active,
        startup: { name: 'Test Startup' },
      } as any);

      await investmentController.getInvestmentById(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            id: mockInvestments.completed.id,
            investor_id: mockInvestments.completed.investor_id,
            amount: mockInvestments.completed.amount,
            status: mockInvestments.completed.status,
          }),
        })
      );
    });

    it('should throw error if investment not found', async () => {
      mockRequest.params = { id: 'non-existent-investment' };

      prismaMock.investment.findUnique.mockResolvedValue(null);

      await investmentController.getInvestmentById(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Investment not found',
          statusCode: 404,
        })
      );
    });
  });

  describe('listInvestments', () => {
    it('should list investments for authenticated user', async () => {
      mockRequest.user = { id: mockUsers.investor.id, email: 'investor@example.com', role: 'INVESTOR' };
      mockRequest.query = { page: '1', limit: '20' };

      const mockInvestmentsList = [
        {
          ...mockInvestments.completed,
          investorId: mockInvestments.completed.investor_id,
          pitchId: mockInvestments.completed.pitch_id,
          equityPercentage: mockInvestments.completed.equity_percentage,
          paymentMethod: mockInvestments.completed.payment_method,
          investmentType: 'DIRECT' as any,
          currency: 'USD',
          pitch: {
            id: mockPitches.active.id,
            title: mockPitches.active.title,
            startup: {
              id: 'startup-1',
              name: 'Test Startup',
            },
          },
        },
      ];

      prismaMock.investment.findMany.mockResolvedValue(mockInvestmentsList as any);
      prismaMock.investment.count.mockResolvedValue(1);

      await investmentController.listInvestments(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            investments: expect.arrayContaining([
              expect.objectContaining({
                id: mockInvestments.completed.id,
              }),
            ]),
            pagination: expect.objectContaining({
              page: 1,
              limit: 20,
              total: 1,
              totalPages: 1,
            }),
          }),
        })
      );
    });

    it('should throw error if user not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.query = {};

      await investmentController.listInvestments(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User not authenticated',
          statusCode: 401,
        })
      );
    });
  });

  describe('updateInvestment', () => {
    it('should update investment successfully', async () => {
      mockRequest.user = { id: mockUsers.investor.id, email: 'investor@example.com', role: 'INVESTOR' };
      mockRequest.params = { id: mockInvestments.pending.id };
      mockRequest.body = { amount: 30000, equityPercentage: 0.3 };

      prismaMock.investment.findUnique.mockResolvedValue({
        ...mockInvestments.pending,
        investorId: mockInvestments.pending.investor_id,
        pitchId: mockInvestments.pending.pitch_id,
        equityPercentage: mockInvestments.pending.equity_percentage,
        paymentMethod: mockInvestments.pending.payment_method,
        investmentType: 'DIRECT' as any,
      } as any);

      prismaMock.investment.update.mockResolvedValue({
        ...mockInvestments.pending,
        investorId: mockInvestments.pending.investor_id,
        pitchId: mockInvestments.pending.pitch_id,
        amount: 30000,
        equityPercentage: 0.3,
        paymentMethod: mockInvestments.pending.payment_method,
        updatedAt: new Date(),
      } as any);

      await investmentController.updateInvestment(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            id: mockInvestments.pending.id,
            amount: 30000,
            equity_percentage: 0.3,
          }),
        })
      );
    });

    it('should throw error if user not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.params = { id: mockInvestments.pending.id };
      mockRequest.body = { amount: 30000 };

      await investmentController.updateInvestment(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User not authenticated',
          statusCode: 401,
        })
      );
    });

    it('should throw error if investment not found', async () => {
      mockRequest.user = { id: mockUsers.investor.id, email: 'investor@example.com', role: 'INVESTOR' };
      mockRequest.params = { id: 'non-existent-investment' };
      mockRequest.body = { amount: 30000 };

      prismaMock.investment.findUnique.mockResolvedValue(null);

      await investmentController.updateInvestment(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Investment not found',
          statusCode: 404,
        })
      );
    });

    it('should throw error if user not authorized', async () => {
      mockRequest.user = { id: 'different-user-id', email: 'other@example.com', role: 'INVESTOR' };
      mockRequest.params = { id: mockInvestments.pending.id };
      mockRequest.body = { amount: 30000 };

      prismaMock.investment.findUnique.mockResolvedValue({
        ...mockInvestments.pending,
        investorId: mockInvestments.pending.investor_id,
      } as any);

      await investmentController.updateInvestment(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Not authorized to update this investment',
          statusCode: 403,
        })
      );
    });

    it('should throw error if investment is completed or cancelled', async () => {
      mockRequest.user = { id: mockUsers.investor.id, email: 'investor@example.com', role: 'INVESTOR' };
      mockRequest.params = { id: mockInvestments.completed.id };
      mockRequest.body = { amount: 60000 };

      prismaMock.investment.findUnique.mockResolvedValue({
        ...mockInvestments.completed,
        investorId: mockInvestments.completed.investor_id,
        status: 'COMPLETED' as any,
      } as any);

      await investmentController.updateInvestment(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Cannot update completed or cancelled investment',
          statusCode: 400,
        })
      );
    });
  });

  describe('cancelInvestment', () => {
    it('should cancel investment successfully', async () => {
      mockRequest.user = { id: mockUsers.investor.id, email: 'investor@example.com', role: 'INVESTOR' };
      mockRequest.params = { id: mockInvestments.pending.id };
      mockRequest.body = { reason: 'Changed my mind', details: 'Found better opportunity' };

      prismaMock.investment.findUnique.mockResolvedValue({
        ...mockInvestments.pending,
        investorId: mockInvestments.pending.investor_id,
        status: 'PENDING' as any,
      } as any);

      prismaMock.investment.update.mockResolvedValue({
        ...mockInvestments.pending,
        investorId: mockInvestments.pending.investor_id,
        status: 'CANCELLED' as any,
        updatedAt: new Date(),
      } as any);

      await investmentController.cancelInvestment(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            id: mockInvestments.pending.id,
            status: 'CANCELLED',
          }),
        })
      );
    });

    it('should throw error if user not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.params = { id: mockInvestments.pending.id };
      mockRequest.body = { reason: 'Changed my mind' };

      await investmentController.cancelInvestment(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User not authenticated',
          statusCode: 401,
        })
      );
    });

    it('should throw error if investment not found', async () => {
      mockRequest.user = { id: mockUsers.investor.id, email: 'investor@example.com', role: 'INVESTOR' };
      mockRequest.params = { id: 'non-existent-investment' };
      mockRequest.body = { reason: 'Changed my mind' };

      prismaMock.investment.findUnique.mockResolvedValue(null);

      await investmentController.cancelInvestment(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Investment not found',
          statusCode: 404,
        })
      );
    });

    it('should throw error if user not authorized', async () => {
      mockRequest.user = { id: 'different-user-id', email: 'other@example.com', role: 'INVESTOR' };
      mockRequest.params = { id: mockInvestments.pending.id };
      mockRequest.body = { reason: 'Changed my mind' };

      prismaMock.investment.findUnique.mockResolvedValue({
        ...mockInvestments.pending,
        investorId: mockInvestments.pending.investor_id,
      } as any);

      await investmentController.cancelInvestment(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Not authorized to cancel this investment',
          statusCode: 403,
        })
      );
    });

    it('should throw error if investment already completed or cancelled', async () => {
      mockRequest.user = { id: mockUsers.investor.id, email: 'investor@example.com', role: 'INVESTOR' };
      mockRequest.params = { id: mockInvestments.completed.id };
      mockRequest.body = { reason: 'Changed my mind' };

      prismaMock.investment.findUnique.mockResolvedValue({
        ...mockInvestments.completed,
        investorId: mockInvestments.completed.investor_id,
        status: 'COMPLETED' as any,
      } as any);

      await investmentController.cancelInvestment(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Cannot cancel completed or already cancelled investment',
          statusCode: 400,
        })
      );
    });
  });

  describe('uploadDocument', () => {
    it('should upload investment document successfully', async () => {
      mockRequest.user = { id: mockUsers.investor.id, email: 'investor@example.com', role: 'INVESTOR' };
      mockRequest.params = { id: mockInvestments.pending.id };
      mockRequest.body = {
        documentType: 'agreement',
        description: 'Investment Agreement',
        isPublic: false,
      };
      mockRequest.file = {
        originalname: 'agreement.pdf',
        mimetype: 'application/pdf',
        size: 1024000,
        buffer: Buffer.from('mock file content'),
      } as any;

      prismaMock.investment.findUnique.mockResolvedValue({
        ...mockInvestments.pending,
        investorId: mockInvestments.pending.investor_id,
      } as any);

      mockFileUploadService.uploadFile.mockResolvedValue('https://storage.example.com/agreement.pdf');

      await investmentController.uploadDocument(mockRequest, mockResponse, mockNext);

      expect(mockFileUploadService.uploadFile).toHaveBeenCalledWith(
        mockRequest.file,
        expect.objectContaining({
          folder: 'investment-documents',
          allowedTypes: expect.arrayContaining(['application/pdf']),
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            document_type: 'agreement',
            file_name: 'agreement.pdf',
            file_url: 'https://storage.example.com/agreement.pdf',
          }),
        })
      );
    });

    it('should throw error if user not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.params = { id: mockInvestments.pending.id };
      mockRequest.file = { originalname: 'agreement.pdf' } as any;

      await investmentController.uploadDocument(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User not authenticated',
          statusCode: 401,
        })
      );
    });

    it('should throw error if investment not found', async () => {
      mockRequest.user = { id: mockUsers.investor.id, email: 'investor@example.com', role: 'INVESTOR' };
      mockRequest.params = { id: 'non-existent-investment' };
      mockRequest.file = { originalname: 'agreement.pdf' } as any;

      prismaMock.investment.findUnique.mockResolvedValue(null);

      await investmentController.uploadDocument(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Investment not found',
          statusCode: 404,
        })
      );
    });

    it('should throw error if file not provided', async () => {
      mockRequest.user = { id: mockUsers.investor.id, email: 'investor@example.com', role: 'INVESTOR' };
      mockRequest.params = { id: mockInvestments.pending.id };
      mockRequest.file = undefined;

      prismaMock.investment.findUnique.mockResolvedValue({
        ...mockInvestments.pending,
        investorId: mockInvestments.pending.investor_id,
      } as any);

      await investmentController.uploadDocument(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Document file is required',
          statusCode: 400,
        })
      );
    });
  });

  describe('confirmPayment', () => {
    it('should confirm payment successfully', async () => {
      mockRequest.user = { id: mockUsers.investor.id, email: 'investor@example.com', role: 'INVESTOR' };
      mockRequest.params = { id: mockInvestments.pending.id };
      mockRequest.body = {
        transactionReference: 'TXN123456',
        paymentProof: 'https://storage.example.com/proof.pdf',
        notes: 'Payment completed via bank transfer',
      };

      prismaMock.investment.findUnique.mockResolvedValue({
        ...mockInvestments.pending,
        investorId: mockInvestments.pending.investor_id,
        status: 'PENDING' as any,
      } as any);

      prismaMock.investment.update.mockResolvedValue({
        ...mockInvestments.pending,
        investorId: mockInvestments.pending.investor_id,
        status: 'ESCROW' as any,
        paymentReference: 'TXN123456',
        paymentConfirmedAt: new Date(),
        updatedAt: new Date(),
      } as any);

      await investmentController.confirmPayment(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            id: mockInvestments.pending.id,
            status: 'ESCROW',
          }),
        })
      );
    });

    it('should upload payment proof file if provided', async () => {
      mockRequest.user = { id: mockUsers.investor.id, email: 'investor@example.com', role: 'INVESTOR' };
      mockRequest.params = { id: mockInvestments.pending.id };
      mockRequest.body = {
        transactionReference: 'TXN123456',
        notes: 'Payment completed',
      };
      mockRequest.file = {
        originalname: 'payment-proof.pdf',
        mimetype: 'application/pdf',
        size: 512000,
        buffer: Buffer.from('mock payment proof'),
      } as any;

      prismaMock.investment.findUnique.mockResolvedValue({
        ...mockInvestments.pending,
        investorId: mockInvestments.pending.investor_id,
      } as any);

      mockFileUploadService.uploadFile.mockResolvedValue('https://storage.example.com/payment-proof.pdf');

      prismaMock.investment.update.mockResolvedValue({
        ...mockInvestments.pending,
        investorId: mockInvestments.pending.investor_id,
        status: 'ESCROW' as any,
        paymentReference: 'TXN123456',
      } as any);

      await investmentController.confirmPayment(mockRequest, mockResponse, mockNext);

      expect(mockFileUploadService.uploadFile).toHaveBeenCalledWith(
        mockRequest.file,
        expect.objectContaining({
          folder: 'payment-proofs',
        })
      );
    });

    it('should throw error if user not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.params = { id: mockInvestments.pending.id };
      mockRequest.body = { transactionReference: 'TXN123456' };

      await investmentController.confirmPayment(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User not authenticated',
          statusCode: 401,
        })
      );
    });
  });

  describe('getDocuments', () => {
    it('should retrieve investment documents successfully', async () => {
      mockRequest.params = { id: mockInvestments.completed.id };

      prismaMock.investment.findUnique.mockResolvedValue({
        ...mockInvestments.completed,
        investorId: mockInvestments.completed.investor_id,
      } as any);

      await investmentController.getDocuments(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            documents: expect.any(Array),
          }),
        })
      );
    });

    it('should throw error if investment not found', async () => {
      mockRequest.params = { id: 'non-existent-investment' };

      prismaMock.investment.findUnique.mockResolvedValue(null);

      await investmentController.getDocuments(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Investment not found',
          statusCode: 404,
        })
      );
    });
  });
});
