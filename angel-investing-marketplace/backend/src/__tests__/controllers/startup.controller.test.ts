/**
 * Startup Controller Tests
 *
 * Tests for CRUD operations and verification functionality
 * All tests use MOCKED data only - no real database connections
 */

// Mock file upload service BEFORE importing controller
// Controller imports from '../services/fileUploadService.js' which doesn't exist
const mockFileUploadService = {
  uploadFile: jest.fn(),
};

jest.mock('../../services/fileUploadService', () => ({
  fileUploadService: mockFileUploadService,
}));

import { startupController } from '../../controllers/startup.controller';
import { prismaMock, createMockRequest, createMockResponse, createMockNext } from '../setup';
import { mockUsers, mockStartups, createMockStartup } from '../fixtures';

describe('StartupController', () => {
  let mockRequest: any;
  let mockResponse: any;
  let mockNext: any;

  beforeEach(() => {
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();
    mockNext = createMockNext();
  });

  describe('createStartup', () => {
    it('should create a startup successfully', async () => {
      const startupData = {
        name: 'Test Startup',
        description: 'A test startup',
        industry: 'Technology',
        stage: 'MVP',
        foundedDate: '2024-01-01',
        teamSize: 5,
        businessModel: 'SaaS',
        targetMarket: 'SMBs',
        competitiveAdvantage: 'AI-powered',
        fundingGoal: 500000,
      };

      mockRequest.user = { id: mockUsers.founder.id, role: 'FOUNDER' };
      mockRequest.body = startupData;

      const mockStartup = createMockStartup({
        id: 'startup-new-1',
        name: startupData.name,
        slug: 'test-startup',
        founderId: mockUsers.founder.id,
        description: startupData.description,
        industry: startupData.industry,
        stage: startupData.stage,
        teamSize: startupData.teamSize,
        businessModel: startupData.businessModel,
        targetMarket: startupData.targetMarket,
        competitiveAdvantage: startupData.competitiveAdvantage,
        fundingGoal: startupData.fundingGoal,
        isVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      prismaMock.startup.findUnique.mockResolvedValue(null); // No existing startup with slug
      prismaMock.startup.create.mockResolvedValue(mockStartup as any);

      await startupController.createStartup(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            id: mockStartup.id,
            name: mockStartup.name,
            slug: mockStartup.slug,
          }),
        })
      );
    });

    it('should throw error if user not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.body = { name: 'Test Startup' };

      await startupController.createStartup(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User not authenticated',
          statusCode: 401,
        })
      );
    });

    it('should throw error if slug already exists', async () => {
      mockRequest.user = { id: mockUsers.founder.id, role: 'FOUNDER' };
      mockRequest.body = {
        name: 'Test Startup',
        slug: 'test-startup',
        description: 'A test startup',
        industry: 'Technology',
        stage: 'MVP',
        fundingGoal: 500000,
      };

      prismaMock.startup.findUnique.mockResolvedValue(mockStartups.mvp as any);

      await startupController.createStartup(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Startup slug already exists',
          statusCode: 409,
        })
      );
    });

    it('should handle logo upload if file provided', async () => {
      const startupData = {
        name: 'Test Startup',
        description: 'A test startup',
        industry: 'Technology',
        stage: 'MVP',
        fundingGoal: 500000,
      };

      mockRequest.user = { id: mockUsers.founder.id, role: 'FOUNDER' };
      mockRequest.body = startupData;
      mockRequest.file = {
        originalname: 'logo.png',
        mimetype: 'image/png',
        buffer: Buffer.from('test'),
      };

      const mockLogoUrl = 'https://storage.example.com/startup-logos/logo.png';
      mockFileUploadService.uploadFile.mockResolvedValue(mockLogoUrl);

      const mockStartup = {
        ...createMockStartup(),
        id: 'startup-new-1',
        logoUrl: mockLogoUrl,
      };

      prismaMock.startup.findUnique.mockResolvedValue(null);
      prismaMock.startup.create.mockResolvedValue(mockStartup as any);

      await startupController.createStartup(mockRequest, mockResponse, mockNext);

      expect(mockFileUploadService.uploadFile).toHaveBeenCalledWith(
        mockRequest.file,
        expect.objectContaining({
          folder: 'startup-logos',
          allowedTypes: expect.arrayContaining(['image/png']),
        })
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });
  });

  describe('getStartupById', () => {
    it('should return startup details successfully', async () => {
      mockRequest.params = { id: mockStartups.verified.id };

      prismaMock.startup.findUnique.mockResolvedValue(mockStartups.verified as any);
      prismaMock.user.findUnique.mockResolvedValue(mockUsers.founder as any);
      prismaMock.pitch.findMany.mockResolvedValue([]);

      await startupController.getStartupById(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            id: mockStartups.verified.id,
            name: mockStartups.verified.name,
          }),
        })
      );
    });

    it('should throw error if startup not found', async () => {
      mockRequest.params = { id: 'non-existent-id' };

      prismaMock.startup.findUnique.mockResolvedValue(null);

      await startupController.getStartupById(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Startup not found',
          statusCode: 404,
        })
      );
    });

    it('should include founder and team member information', async () => {
      mockRequest.params = { id: mockStartups.verified.id };

      prismaMock.startup.findUnique
        .mockResolvedValueOnce(mockStartups.verified as any)
        .mockResolvedValueOnce({
          ...mockStartups.verified,
          founder: mockUsers.founder,
        } as any);
      prismaMock.user.findUnique.mockResolvedValue(mockUsers.founder as any);
      prismaMock.pitch.findMany.mockResolvedValue([]);

      await startupController.getStartupById(mockRequest, mockResponse, mockNext);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            founder: expect.objectContaining({
              id: mockUsers.founder.id,
              name: mockUsers.founder.name,
            }),
            team_members: expect.any(Array),
            funding_progress: expect.any(Object),
          }),
        })
      );
    });
  });

  describe('updateStartup', () => {
    it('should update startup successfully', async () => {
      const updateData = {
        name: 'Updated Startup Name',
        description: 'Updated description',
      };

      mockRequest.user = { id: mockUsers.founder.id, role: 'FOUNDER' };
      mockRequest.params = { id: mockStartups.mvp.id };
      mockRequest.body = updateData;

      const updatedStartup = {
        ...mockStartups.mvp,
        ...updateData,
        updatedAt: new Date(),
      };

      prismaMock.startup.findUnique.mockResolvedValue(mockStartups.mvp as any);
      prismaMock.startup.update.mockResolvedValue(updatedStartup as any);

      await startupController.updateStartup(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            id: mockStartups.mvp.id,
            name: updateData.name,
          }),
        })
      );
    });

    it('should throw error if user not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.params = { id: mockStartups.mvp.id };
      mockRequest.body = { name: 'Updated Name' };

      await startupController.updateStartup(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User not authenticated',
          statusCode: 401,
        })
      );
    });

    it('should throw error if startup not found', async () => {
      mockRequest.user = { id: mockUsers.founder.id, role: 'FOUNDER' };
      mockRequest.params = { id: 'non-existent-id' };
      mockRequest.body = { name: 'Updated Name' };

      prismaMock.startup.findUnique.mockResolvedValue(null);

      await startupController.updateStartup(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Startup not found',
          statusCode: 404,
        })
      );
    });

    it('should throw error if user not authorized', async () => {
      mockRequest.user = { id: 'different-user-id', role: 'FOUNDER' };
      mockRequest.params = { id: mockStartups.mvp.id };
      mockRequest.body = { name: 'Updated Name' };

      prismaMock.startup.findUnique.mockResolvedValue(mockStartups.mvp as any);

      await startupController.updateStartup(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Not authorized to update this startup',
          statusCode: 403,
        })
      );
    });

    it('should allow admin to update any startup', async () => {
      const updateData = { name: 'Admin Updated Name' };

      mockRequest.user = { id: 'admin-user-id', role: 'ADMIN' };
      mockRequest.params = { id: mockStartups.mvp.id };
      mockRequest.body = updateData;

      const updatedStartup = {
        ...mockStartups.mvp,
        ...updateData,
        updatedAt: new Date(),
      };

      prismaMock.startup.findUnique.mockResolvedValue(mockStartups.mvp as any);
      prismaMock.startup.update.mockResolvedValue(updatedStartup as any);

      await startupController.updateStartup(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('listStartups', () => {
    it('should return paginated list of startups', async () => {
      mockRequest.query = { page: '1', limit: '20' };

      const mockStartupsList = [mockStartups.mvp, mockStartups.growthStage, mockStartups.verified];

      prismaMock.startup.findMany.mockResolvedValue(mockStartupsList as any);
      prismaMock.startup.count.mockResolvedValue(mockStartupsList.length);

      await startupController.listStartups(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            startups: expect.any(Array),
            pagination: expect.objectContaining({
              page: 1,
              limit: 20,
              total: mockStartupsList.length,
            }),
          }),
        })
      );
    });

    it('should filter startups by industry', async () => {
      mockRequest.query = { industry: 'Technology', page: '1', limit: '20' };

      const filteredStartups = [mockStartups.mvp];

      prismaMock.startup.findMany.mockResolvedValue(filteredStartups as any);
      prismaMock.startup.count.mockResolvedValue(filteredStartups.length);

      await startupController.listStartups(mockRequest, mockResponse, mockNext);

      expect(prismaMock.startup.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            industry: 'Technology',
          }),
        })
      );
    });

    it('should filter startups by stage', async () => {
      mockRequest.query = { stage: 'mvp', page: '1', limit: '20' };

      const filteredStartups = [mockStartups.mvp];

      prismaMock.startup.findMany.mockResolvedValue(filteredStartups as any);
      prismaMock.startup.count.mockResolvedValue(filteredStartups.length);

      await startupController.listStartups(mockRequest, mockResponse, mockNext);

      expect(prismaMock.startup.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            stage: 'mvp',
          }),
        })
      );
    });

    it('should filter startups by verification status', async () => {
      mockRequest.query = { isVerified: 'true', page: '1', limit: '20' };

      const verifiedStartups = [mockStartups.verified, mockStartups.growthStage];

      prismaMock.startup.findMany.mockResolvedValue(verifiedStartups as any);
      prismaMock.startup.count.mockResolvedValue(verifiedStartups.length);

      await startupController.listStartups(mockRequest, mockResponse, mockNext);

      expect(prismaMock.startup.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isVerified: true,
          }),
        })
      );
    });

    it('should search startups by name or description', async () => {
      mockRequest.query = { search: 'test', page: '1', limit: '20' };

      const searchResults = [mockStartups.mvp, mockStartups.growthStage];

      prismaMock.startup.findMany.mockResolvedValue(searchResults as any);
      prismaMock.startup.count.mockResolvedValue(searchResults.length);

      await startupController.listStartups(mockRequest, mockResponse, mockNext);

      expect(prismaMock.startup.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { name: expect.objectContaining({ contains: 'test' }) },
              { description: expect.objectContaining({ contains: 'test' }) },
            ]),
          }),
        })
      );
    });
  });

  describe('deleteStartup', () => {
    it('should deactivate startup successfully', async () => {
      mockRequest.user = { id: mockUsers.founder.id, role: 'FOUNDER' };
      mockRequest.params = { id: mockStartups.mvp.id };

      prismaMock.startup.findUnique.mockResolvedValue(mockStartups.mvp as any);
      prismaMock.startup.update.mockResolvedValue({
        ...mockStartups.mvp,
        isActive: false,
      } as any);

      await startupController.deleteStartup(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Startup deactivated successfully',
        })
      );
    });

    it('should throw error if user not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.params = { id: mockStartups.mvp.id };

      await startupController.deleteStartup(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User not authenticated',
          statusCode: 401,
        })
      );
    });

    it('should throw error if startup not found', async () => {
      mockRequest.user = { id: mockUsers.founder.id, role: 'FOUNDER' };
      mockRequest.params = { id: 'non-existent-id' };

      prismaMock.startup.findUnique.mockResolvedValue(null);

      await startupController.deleteStartup(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Startup not found',
          statusCode: 404,
        })
      );
    });

    it('should throw error if user not authorized', async () => {
      mockRequest.user = { id: 'different-user-id', role: 'FOUNDER' };
      mockRequest.params = { id: mockStartups.mvp.id };

      prismaMock.startup.findUnique.mockResolvedValue(mockStartups.mvp as any);

      await startupController.deleteStartup(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Not authorized to delete this startup',
          statusCode: 403,
        })
      );
    });
  });

  describe('submitForVerification', () => {
    it('should submit startup for verification successfully', async () => {
      mockRequest.user = { id: mockUsers.founder.id, role: 'FOUNDER' };
      mockRequest.params = { id: mockStartups.mvp.id };
      mockRequest.body = {
        isVerified: true,
        verificationNotes: 'All documents verified',
      };

      prismaMock.startup.findUnique.mockResolvedValue(mockStartups.mvp as any);
      prismaMock.startup.update.mockResolvedValue({
        ...mockStartups.mvp,
        isVerified: true,
      } as any);

      await startupController.submitForVerification(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            is_verified: true,
          }),
        })
      );
    });

    it('should throw error if user not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.params = { id: mockStartups.mvp.id };
      mockRequest.body = { isVerified: true };

      await startupController.submitForVerification(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User not authenticated',
          statusCode: 401,
        })
      );
    });

    it('should throw error if startup not found', async () => {
      mockRequest.user = { id: mockUsers.founder.id, role: 'FOUNDER' };
      mockRequest.params = { id: 'non-existent-id' };
      mockRequest.body = { isVerified: true };

      prismaMock.startup.findUnique.mockResolvedValue(null);

      await startupController.submitForVerification(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Startup not found',
          statusCode: 404,
        })
      );
    });
  });

  describe('getVerificationStatus', () => {
    it('should return verification status successfully', async () => {
      mockRequest.params = { id: mockStartups.verified.id };

      prismaMock.startup.findUnique.mockResolvedValue(mockStartups.verified as any);

      await startupController.getVerificationStatus(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            is_verified: true,
          }),
        })
      );
    });

    it('should throw error if startup not found', async () => {
      mockRequest.params = { id: 'non-existent-id' };

      prismaMock.startup.findUnique.mockResolvedValue(null);

      await startupController.getVerificationStatus(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Startup not found',
          statusCode: 404,
        })
      );
    });
  });

  describe('addTeamMember', () => {
    it('should add team member successfully', async () => {
      const teamMemberData = {
        name: 'John Doe',
        title: 'CTO',
        isFounder: false,
      };

      mockRequest.user = { id: mockUsers.founder.id, role: 'FOUNDER' };
      mockRequest.params = { id: mockStartups.mvp.id };
      mockRequest.body = { teamMember: teamMemberData };

      prismaMock.startup.findUnique.mockResolvedValue(mockStartups.mvp as any);

      await startupController.addTeamMember(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            name: teamMemberData.name,
            title: teamMemberData.title,
          }),
        })
      );
    });

    it('should throw error if user not authorized', async () => {
      mockRequest.user = { id: 'different-user-id', role: 'FOUNDER' };
      mockRequest.params = { id: mockStartups.mvp.id };
      mockRequest.body = { teamMember: { name: 'John Doe' } };

      prismaMock.startup.findUnique.mockResolvedValue(mockStartups.mvp as any);

      await startupController.addTeamMember(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Not authorized to add team members',
          statusCode: 403,
        })
      );
    });
  });

  describe('updateTeamMember', () => {
    it('should update team member successfully', async () => {
      const updateData = {
        title: 'VP of Engineering',
      };

      mockRequest.user = { id: mockUsers.founder.id, role: 'FOUNDER' };
      mockRequest.params = { id: mockStartups.mvp.id, memberId: 'member-1' };
      mockRequest.body = updateData;

      prismaMock.startup.findUnique.mockResolvedValue(mockStartups.mvp as any);

      await startupController.updateTeamMember(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            title: updateData.title,
          }),
        })
      );
    });
  });

  describe('removeTeamMember', () => {
    it('should remove team member successfully', async () => {
      mockRequest.user = { id: mockUsers.founder.id, role: 'FOUNDER' };
      mockRequest.params = { id: mockStartups.mvp.id, memberId: 'member-1' };

      prismaMock.startup.findUnique.mockResolvedValue(mockStartups.mvp as any);

      await startupController.removeTeamMember(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Team member removed successfully',
        })
      );
    });

    it('should throw error if user not authorized', async () => {
      mockRequest.user = { id: 'different-user-id', role: 'FOUNDER' };
      mockRequest.params = { id: mockStartups.mvp.id, memberId: 'member-1' };

      prismaMock.startup.findUnique.mockResolvedValue(mockStartups.mvp as any);

      await startupController.removeTeamMember(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Not authorized to remove team members',
          statusCode: 403,
        })
      );
    });
  });
});
