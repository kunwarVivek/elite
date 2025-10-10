/**
 * User Controller Tests
 *
 * Tests cover:
 * - Profile retrieval (getProfile, getUserById)
 * - Profile updates (updateProfile)
 * - KYC submission and status (submitKyc, getKycStatus)
 * - Accreditation submission and status (submitAccreditation, getAccreditationStatus)
 * - Admin operations (listUsers, updateUserStatus, deleteUser)
 *
 * IMPORTANT: All tests use MOCKED data only. No real database connections.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { userController } from '../../controllers/user.controller';
import { prismaMock, createMockRequest, createMockResponse, createMockNext } from '../setup';
import { createMockUser } from '../fixtures/users';

describe('UserController', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: any;

  beforeEach(() => {
    mockReq = createMockRequest();
    mockRes = createMockResponse();
    mockNext = createMockNext();
  });

  describe('getProfile', () => {
    it('should return user profile successfully', async () => {
      const mockUser = createMockUser({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'INVESTOR' as any,
        avatarUrl: 'https://example.com/avatar.jpg',
        profileData: { bio: 'Test bio', location: 'Test location' },
        isVerified: true,
        createdAt: new Date('2024-01-01'),
      });

      mockReq.user = { id: 'user-123' };

      prismaMock.user.findUnique.mockResolvedValue(mockUser as any);

      await userController.getProfile(mockReq, mockRes, mockNext);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        include: {
          userProfile: true,
          complianceProfile: true,
        },
      });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            id: 'user-123',
            email: 'test@example.com',
            name: 'Test User',
          }),
        })
      );
    });

    it('should return 401 if user not authenticated', async () => {
      mockReq.user = undefined;

      await userController.getProfile(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User not authenticated',
          statusCode: 401,
        })
      );
    });

    it('should return 404 if user not found', async () => {
      mockReq.user = { id: 'nonexistent-user' };

      prismaMock.user.findUnique.mockResolvedValue(null);

      await userController.getProfile(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User not found',
          statusCode: 404,
        })
      );
    });
  });

  describe('getUserById', () => {
    it('should return public user profile successfully', async () => {
      const mockUser = createMockUser({
        id: 'user-456',
        name: 'Public User',
        avatarUrl: 'https://example.com/avatar.jpg',
        role: 'INVESTOR' as any,
        isVerified: true,
        profileData: { bio: 'Test bio', location: 'San Francisco' },
        createdAt: new Date('2024-01-01'),
      });

      mockReq.params = { id: 'user-456' };

      prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
      prismaMock.investment.findMany.mockResolvedValue([]);

      await userController.getUserById(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            id: 'user-456',
            name: 'Public User',
            is_verified: true,
          }),
        })
      );
    });

    it('should return 404 if user not found', async () => {
      mockReq.params = { id: 'nonexistent-user' };

      prismaMock.user.findUnique.mockResolvedValue(null);

      await userController.getUserById(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User not found',
          statusCode: 404,
        })
      );
    });

    it('should include portfolio summary in public profile', async () => {
      const mockUser = createMockUser({
        id: 'user-789',
        name: 'Investor User',
      });

      const mockInvestments = [
        {
          id: 'inv-1',
          investorId: 'user-789',
          amount: 10000,
          status: 'COMPLETED',
          pitch: { id: 'pitch-1' },
        },
        {
          id: 'inv-2',
          investorId: 'user-789',
          amount: 5000,
          status: 'COMPLETED',
          pitch: { id: 'pitch-2' },
        },
      ];

      mockReq.params = { id: 'user-789' };

      prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
      prismaMock.investment.findMany.mockResolvedValue(mockInvestments as any);

      await userController.getUserById(mockReq, mockRes, mockNext);

      expect(prismaMock.investment.findMany).toHaveBeenCalledWith({
        where: { investorId: 'user-789' },
        include: { pitch: true },
      });

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            portfolio_summary: expect.objectContaining({
              total_investments: 2,
              total_amount_invested: 15000,
              active_investments: 2,
            }),
          }),
        })
      );
    });
  });

  describe('updateProfile', () => {
    it('should update user profile successfully', async () => {
      const mockUser = createMockUser({
        id: 'user-update-1',
        name: 'Updated Name',
        avatarUrl: 'https://example.com/new-avatar.jpg',
        profileData: { bio: 'Updated bio', location: 'New York' },
      });

      mockReq.user = { id: 'user-update-1' };
      mockReq.body = {
        name: 'Updated Name',
        profile_data: {
          bio: 'Updated bio',
          location: 'New York',
        },
      };

      prismaMock.user.update.mockResolvedValue(mockUser as any);

      await userController.updateProfile(mockReq, mockRes, mockNext);

      expect(prismaMock.user.update).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            name: 'Updated Name',
          }),
        })
      );
    });

    it('should handle avatar upload in profile update', async () => {
      const mockUser = createMockUser({
        id: 'user-avatar-1',
        avatarUrl: 'https://example.com/uploaded-avatar.jpg',
      });

      mockReq.user = { id: 'user-avatar-1' };
      mockReq.body = { name: 'User Name' };
      mockReq.file = { originalname: 'avatar.jpg' };
      mockReq.processedFiles = [{ url: 'https://example.com/uploaded-avatar.jpg' }];

      prismaMock.user.update.mockResolvedValue(mockUser as any);

      await userController.updateProfile(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            avatar_url: 'https://example.com/uploaded-avatar.jpg',
          }),
        })
      );
    });

    it('should return 401 if user not authenticated', async () => {
      mockReq.user = undefined;
      mockReq.body = { name: 'New Name' };

      await userController.updateProfile(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User not authenticated',
          statusCode: 401,
        })
      );
    });
  });

  describe('submitKyc', () => {
    it('should submit KYC verification successfully', async () => {
      const mockUser = createMockUser({
        id: 'user-kyc-1',
      });

      mockReq.user = { id: 'user-kyc-1' };
      mockReq.body = {
        personalInfo: {
          firstName: 'John',
          lastName: 'Doe',
          dateOfBirth: '1990-01-01',
          nationality: 'US',
          address: {
            street: '123 Main St',
            city: 'San Francisco',
            state: 'CA',
            country: 'US',
            postalCode: '94102',
          },
        },
        documents: [
          {
            documentType: 'PASSPORT',
            documentNumber: 'P123456',
            expiryDate: '2030-12-31',
            issuingCountry: 'US',
            fileUrl: 'https://example.com/passport.pdf',
          },
        ],
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
      prismaMock.userProfile.update.mockResolvedValue({} as any);
      // Note: complianceLog.create is called in the controller, but we don't mock it here
      // as it's not critical for the test's success path

      await userController.submitKyc(mockReq, mockRes, mockNext);

      expect(prismaMock.userProfile.update).toHaveBeenCalled();

      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            status: 'PENDING',
          }),
        })
      );
    });

    it('should return 400 if KYC already approved', async () => {
      const mockUser = createMockUser({
        id: 'user-kyc-approved',
      });

      // Mock the user with approved KYC status via relation
      (mockUser as any).kycStatus = 'APPROVED';

      mockReq.user = { id: 'user-kyc-approved' };
      mockReq.body = { personalInfo: {}, documents: [] };

      prismaMock.user.findUnique.mockResolvedValue(mockUser as any);

      await userController.submitKyc(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'KYC is already approved',
          statusCode: 400,
        })
      );
    });

    it('should return 401 if user not authenticated', async () => {
      mockReq.user = undefined;
      mockReq.body = { personalInfo: {}, documents: [] };

      await userController.submitKyc(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User not authenticated',
          statusCode: 401,
        })
      );
    });
  });

  describe('getKycStatus', () => {
    it('should return KYC status successfully', async () => {
      const mockUserProfile = {
        userId: 'user-kyc-status',
        kycStatus: 'PENDING',
        createdAt: new Date('2024-01-01'),
      };

      mockReq.user = { id: 'user-kyc-status' };

      prismaMock.userProfile.findUnique.mockResolvedValue(mockUserProfile as any);

      await userController.getKycStatus(mockReq, mockRes, mockNext);

      expect(prismaMock.userProfile.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-kyc-status' },
      });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            status: 'PENDING',
          }),
        })
      );
    });

    it('should return 401 if user not authenticated', async () => {
      mockReq.user = undefined;

      await userController.getKycStatus(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User not authenticated',
          statusCode: 401,
        })
      );
    });
  });

  describe('submitAccreditation', () => {
    it('should submit accreditation verification successfully', async () => {
      const mockUser = createMockUser({
        id: 'user-accred-1',
      });

      mockReq.user = { id: 'user-accred-1' };
      mockReq.body = {
        accreditationType: 'INCOME_BASED',
        verificationMethod: 'TAX_RETURNS',
        documents: [
          {
            documentType: 'TAX_RETURN',
            fileUrl: 'https://example.com/tax-return.pdf',
            description: '2023 Tax Return',
          },
        ],
        declaration: {
          iConfirmAccredited: true,
          understandRisks: true,
          signature: 'John Doe',
          signatureDate: '2024-01-01',
        },
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
      prismaMock.userProfile.update.mockResolvedValue({} as any);

      await userController.submitAccreditation(mockReq, mockRes, mockNext);

      expect(prismaMock.userProfile.update).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            status: 'PENDING',
          }),
        })
      );
    });

    it('should return 400 if accreditation already approved', async () => {
      const mockUser = createMockUser({
        id: 'user-accred-approved',
      });

      // Mock the user with approved accreditation status via relation
      (mockUser as any).accreditationStatus = 'APPROVED';

      mockReq.user = { id: 'user-accred-approved' };
      mockReq.body = { accreditationType: 'INCOME_BASED', documents: [] };

      prismaMock.user.findUnique.mockResolvedValue(mockUser as any);

      await userController.submitAccreditation(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Accreditation is already approved',
          statusCode: 400,
        })
      );
    });

    it('should return 401 if user not authenticated', async () => {
      mockReq.user = undefined;
      mockReq.body = { accreditationType: 'INCOME_BASED', documents: [] };

      await userController.submitAccreditation(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User not authenticated',
          statusCode: 401,
        })
      );
    });
  });

  describe('getAccreditationStatus', () => {
    it('should return accreditation status successfully', async () => {
      const mockUserProfile = {
        userId: 'user-accred-status',
        accreditationStatus: 'APPROVED',
        createdAt: new Date('2024-01-01'),
      };

      mockReq.user = { id: 'user-accred-status' };

      prismaMock.userProfile.findUnique.mockResolvedValue(mockUserProfile as any);

      await userController.getAccreditationStatus(mockReq, mockRes, mockNext);

      expect(prismaMock.userProfile.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-accred-status' },
      });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            status: 'APPROVED',
          }),
        })
      );
    });

    it('should return 401 if user not authenticated', async () => {
      mockReq.user = undefined;

      await userController.getAccreditationStatus(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User not authenticated',
          statusCode: 401,
        })
      );
    });
  });

  describe('listUsers (Admin)', () => {
    it('should list users successfully for admin', async () => {
      const mockUsersList = [
        createMockUser({ id: 'user-1', name: 'User One' }),
        createMockUser({ id: 'user-2', name: 'User Two' }),
      ];

      mockReq.user = { id: 'admin-1', role: 'ADMIN' };
      mockReq.query = { page: '1', limit: '20' };

      prismaMock.user.findMany.mockResolvedValue(mockUsersList as any);
      prismaMock.user.count.mockResolvedValue(2);

      await userController.listUsers(mockReq, mockRes, mockNext);

      expect(prismaMock.user.findMany).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            users: expect.arrayContaining([
              expect.objectContaining({ id: 'user-1' }),
              expect.objectContaining({ id: 'user-2' }),
            ]),
            pagination: expect.objectContaining({
              page: 1,
              limit: 20,
              total: 2,
            }),
          }),
        })
      );
    });

    it('should filter users by role', async () => {
      mockReq.user = { id: 'admin-1', role: 'ADMIN' };
      mockReq.query = { role: 'INVESTOR', page: '1', limit: '20' };

      prismaMock.user.findMany.mockResolvedValue([]);
      prismaMock.user.count.mockResolvedValue(0);

      await userController.listUsers(mockReq, mockRes, mockNext);

      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            role: 'INVESTOR',
          }),
        })
      );
    });

    it('should filter users by search term', async () => {
      mockReq.user = { id: 'admin-1', role: 'ADMIN' };
      mockReq.query = { search: 'john', page: '1', limit: '20' };

      prismaMock.user.findMany.mockResolvedValue([]);
      prismaMock.user.count.mockResolvedValue(0);

      await userController.listUsers(mockReq, mockRes, mockNext);

      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ name: expect.anything() }),
              expect.objectContaining({ email: expect.anything() }),
            ]),
          }),
        })
      );
    });

    it('should return 403 if user is not admin', async () => {
      mockReq.user = { id: 'user-1', role: 'INVESTOR' };
      mockReq.query = { page: '1', limit: '20' };

      await userController.listUsers(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Admin access required',
          statusCode: 403,
        })
      );
    });
  });

  describe('updateUserStatus (Admin)', () => {
    it('should update user status successfully for admin', async () => {
      const updatedUser = createMockUser({
        id: 'user-to-update',
      });
      // Add isActive property for the response
      (updatedUser as any).isActive = false;

      mockReq.user = { id: 'admin-1', role: 'ADMIN' };
      mockReq.params = { id: 'user-to-update' };
      mockReq.body = {
        isActive: false,
        reason: 'Suspicious activity',
        adminNotes: 'Flagged for review',
      };

      prismaMock.user.update.mockResolvedValue(updatedUser as any);

      await userController.updateUserStatus(mockReq, mockRes, mockNext);

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'user-to-update' },
        data: expect.objectContaining({
          isActive: false,
        }),
      });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        })
      );
    });

    it('should return 403 if user is not admin', async () => {
      mockReq.user = { id: 'user-1', role: 'INVESTOR' };
      mockReq.params = { id: 'user-to-update' };
      mockReq.body = { isActive: false };

      await userController.updateUserStatus(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Admin access required',
          statusCode: 403,
        })
      );
    });
  });

  describe('deleteUser (Admin)', () => {
    it('should deactivate user successfully for admin', async () => {
      mockReq.user = { id: 'admin-1', role: 'ADMIN' };
      mockReq.params = { id: 'user-to-delete' };
      mockReq.body = {
        reason: 'Terms violation',
        adminNotes: 'Multiple warnings issued',
      };

      prismaMock.user.update.mockResolvedValue({} as any);

      await userController.deleteUser(mockReq, mockRes, mockNext);

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'user-to-delete' },
        data: expect.objectContaining({
          isActive: false,
        }),
      });

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'User deactivated successfully',
        })
      );
    });

    it('should return 403 if user is not admin', async () => {
      mockReq.user = { id: 'user-1', role: 'INVESTOR' };
      mockReq.params = { id: 'user-to-delete' };
      mockReq.body = { reason: 'Test' };

      await userController.deleteUser(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Admin access required',
          statusCode: 403,
        })
      );
    });
  });

  describe('getUserPortfolioSummary', () => {
    it('should calculate portfolio summary correctly', async () => {
      const mockInvestments = [
        {
          id: 'inv-1',
          investorId: 'user-portfolio',
          amount: 10000,
          status: 'COMPLETED',
          pitch: { id: 'pitch-1' },
        },
        {
          id: 'inv-2',
          investorId: 'user-portfolio',
          amount: 5000,
          status: 'COMPLETED',
          pitch: { id: 'pitch-2' },
        },
        {
          id: 'inv-3',
          investorId: 'user-portfolio',
          amount: 3000,
          status: 'PENDING',
          pitch: { id: 'pitch-3' },
        },
      ];

      prismaMock.investment.findMany.mockResolvedValue(mockInvestments as any);

      const summary = await userController.getUserPortfolioSummary('user-portfolio');

      expect(summary).toEqual({
        total_investments: 3,
        total_amount_invested: 18000,
        active_investments: 2,
        realized_returns: 1500, // (10000 + 5000) * 0.1
      });
    });

    it('should return zero values on error', async () => {
      prismaMock.investment.findMany.mockRejectedValue(new Error('Database error'));

      const summary = await userController.getUserPortfolioSummary('user-error');

      expect(summary).toEqual({
        total_investments: 0,
        total_amount_invested: 0,
        active_investments: 0,
        realized_returns: 0,
      });
    });
  });
});
