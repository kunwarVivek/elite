import { Request, Response, NextFunction } from 'express';
import { pitchController } from '../../controllers/pitch.controller.js';
import { prismaMock, resetPrismaMock } from '../mocks/prisma.js';
import { AppError } from '../../middleware/errorHandler.js';
import {
  createMockUser,
  createMockStartup,
  createMockPitch,
  createMockInvestment,
  createMockComment,
  createMockDocument,
} from '../fixtures/index.js';

// Mock the response utilities
jest.mock('../../utils/response.js', () => ({
  sendSuccess: jest.fn((res, data, message, statusCode) => {
    res.status(statusCode || 200).json({ success: true, data, message });
  }),
  sendError: jest.fn((res, message, statusCode, errorCode) => {
    res.status(statusCode || 500).json({ success: false, message, errorCode });
  }),
}));

describe('PitchController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    resetPrismaMock();
    
    mockRequest = {
      params: {},
      query: {},
      body: {},
      user: undefined,
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    nextFunction = jest.fn();
  });

  describe('createPitch', () => {
    it('should create a pitch successfully', async () => {
      const founder = createMockUser({ role: 'FOUNDER' });
      const startup = createMockStartup({ founderId: founder.id });
      const pitchData = {
        startupId: startup.id,
        title: 'Revolutionary AI Platform',
        summary: 'Next-gen AI solution',
        problemStatement: 'Current AI is too complex',
        solution: 'Simplified AI platform',
        marketOpportunity: '$100B market',
        product: 'AI-powered SaaS',
        businessModel: 'Subscription-based',
        goToMarket: 'Direct sales',
        competitiveLandscape: 'Few competitors',
        useOfFunds: 'Product development',
        fundingAmount: 1000000,
        equityOffered: 10,
        minimumInvestment: 10000,
      };

      mockRequest.user = founder;
      mockRequest.body = pitchData;

      prismaMock.startup.findUnique.mockResolvedValue(startup);
      prismaMock.pitch.findFirst.mockResolvedValue(null); // No existing active pitch
      
      const createdPitch = createMockPitch({
        ...pitchData,
        status: 'UNDER_REVIEW',
      });
      prismaMock.pitch.create.mockResolvedValue(createdPitch);

      await pitchController.createPitch(
        mockRequest as any,
        mockResponse as Response,
        nextFunction
      );

      expect(prismaMock.startup.findUnique).toHaveBeenCalledWith({
        where: { id: startup.id },
      });
      expect(prismaMock.pitch.findFirst).toHaveBeenCalled();
      expect(prismaMock.pitch.create).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });

    it('should reject pitch creation if user is not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.body = {
        startupId: 'startup-id',
        title: 'Test Pitch',
      };

      await pitchController.createPitch(
        mockRequest as any,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User not authenticated',
          statusCode: 401,
        })
      );
    });

    it('should reject pitch creation if startup not found', async () => {
      const founder = createMockUser({ role: 'FOUNDER' });
      mockRequest.user = founder;
      mockRequest.body = {
        startupId: 'non-existent-startup',
        title: 'Test Pitch',
      };

      prismaMock.startup.findUnique.mockResolvedValue(null);

      await pitchController.createPitch(
        mockRequest as any,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Startup not found',
          statusCode: 404,
        })
      );
    });

    it('should reject pitch creation if user does not own the startup', async () => {
      const founder = createMockUser({ role: 'FOUNDER' });
      const otherFounder = createMockUser({ id: 'other-founder', role: 'FOUNDER' });
      const startup = createMockStartup({ founderId: otherFounder.id });

      mockRequest.user = founder;
      mockRequest.body = {
        startupId: startup.id,
        title: 'Test Pitch',
      };

      prismaMock.startup.findUnique.mockResolvedValue(startup);

      await pitchController.createPitch(
        mockRequest as any,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Not authorized to create pitch for this startup',
          statusCode: 403,
        })
      );
    });

    it('should reject pitch creation if startup already has an active pitch', async () => {
      const founder = createMockUser({ role: 'FOUNDER' });
      const startup = createMockStartup({ founderId: founder.id });
      const existingPitch = createMockPitch({ startupId: startup.id, status: 'ACTIVE' });

      mockRequest.user = founder;
      mockRequest.body = {
        startupId: startup.id,
        title: 'Test Pitch',
      };

      prismaMock.startup.findUnique.mockResolvedValue(startup);
      prismaMock.pitch.findFirst.mockResolvedValue(existingPitch);

      await pitchController.createPitch(
        mockRequest as any,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Startup already has an active pitch',
          statusCode: 409,
        })
      );
    });

    it('should allow admin to create pitch for any startup', async () => {
      const admin = createMockUser({ role: 'ADMIN' });
      const founder = createMockUser({ role: 'FOUNDER' });
      const startup = createMockStartup({ founderId: founder.id });
      const pitchData = {
        startupId: startup.id,
        title: 'Admin Created Pitch',
        summary: 'Summary',
        problemStatement: 'Problem',
        solution: 'Solution',
        marketOpportunity: 'Market',
        product: 'Product',
        businessModel: 'Model',
        goToMarket: 'GTM',
        competitiveLandscape: 'Competitive',
        useOfFunds: 'Use of funds',
        fundingAmount: 500000,
        equityOffered: 5,
        minimumInvestment: 5000,
      };

      mockRequest.user = admin;
      mockRequest.body = pitchData;

      prismaMock.startup.findUnique.mockResolvedValue(startup);
      prismaMock.pitch.findFirst.mockResolvedValue(null);
      
      const createdPitch = createMockPitch(pitchData);
      prismaMock.pitch.create.mockResolvedValue(createdPitch);

      await pitchController.createPitch(
        mockRequest as any,
        mockResponse as Response,
        nextFunction
      );

      expect(prismaMock.pitch.create).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });
  });

  describe('getPitchById', () => {
    it('should retrieve pitch by ID with all related data', async () => {
      const pitch = createMockPitch();
      const startup = createMockStartup({ id: pitch.startupId });
      const investments = [
        createMockInvestment({ pitchId: pitch.id, amount: 50000, status: 'COMPLETED' }),
        createMockInvestment({ pitchId: pitch.id, amount: 30000, status: 'COMPLETED' }),
      ];
      const comments = [createMockComment({ pitchId: pitch.id })];
      const documents = [createMockDocument({ pitchId: pitch.id })];

      mockRequest.params = { id: pitch.id };

      prismaMock.pitch.findUnique.mockResolvedValue(pitch);
      prismaMock.startup.findUnique.mockResolvedValue(startup);
      prismaMock.investment.findMany.mockResolvedValue(investments);
      prismaMock.comment.findMany.mockResolvedValue(comments.map(c => ({
        ...c,
        user: { id: 'user-id', name: 'User Name', avatarUrl: null },
      })) as any);
      prismaMock.document.findMany.mockResolvedValue(documents);

      await pitchController.getPitchById(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(prismaMock.pitch.findUnique).toHaveBeenCalledWith({
        where: { id: pitch.id },
      });
      expect(prismaMock.investment.findMany).toHaveBeenCalledWith({
        where: { pitchId: pitch.id, status: 'COMPLETED' },
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 if pitch not found', async () => {
      mockRequest.params = { id: 'non-existent-pitch' };
      prismaMock.pitch.findUnique.mockResolvedValue(null);

      await pitchController.getPitchById(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Pitch not found',
          statusCode: 404,
        })
      );
    });
  });

  describe('updatePitch', () => {
    it('should update pitch successfully', async () => {
      const founder = createMockUser({ role: 'FOUNDER' });
      const startup = createMockStartup({ founderId: founder.id });
      const pitch = createMockPitch({ startupId: startup.id });
      const updateData = {
        title: 'Updated Pitch Title',
        summary: 'Updated summary',
      };

      mockRequest.user = founder;
      mockRequest.params = { id: pitch.id };
      mockRequest.body = updateData;

      prismaMock.pitch.findUnique.mockResolvedValue(pitch);
      prismaMock.startup.findUnique.mockResolvedValue(startup);
      
      const updatedPitch = { ...pitch, ...updateData };
      prismaMock.pitch.update.mockResolvedValue(updatedPitch);

      await pitchController.updatePitch(
        mockRequest as any,
        mockResponse as Response,
        nextFunction
      );

      expect(prismaMock.pitch.update).toHaveBeenCalledWith({
        where: { id: pitch.id },
        data: updateData,
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should reject update if user not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.params = { id: 'pitch-id' };
      mockRequest.body = { title: 'New Title' };

      await pitchController.updatePitch(
        mockRequest as any,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User not authenticated',
          statusCode: 401,
        })
      );
    });

    it('should reject update if pitch not found', async () => {
      const founder = createMockUser({ role: 'FOUNDER' });
      mockRequest.user = founder;
      mockRequest.params = { id: 'non-existent-pitch' };
      mockRequest.body = { title: 'New Title' };

      prismaMock.pitch.findUnique.mockResolvedValue(null);

      await pitchController.updatePitch(
        mockRequest as any,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Pitch not found',
          statusCode: 404,
        })
      );
    });

    it('should reject update if user does not own the startup', async () => {
      const founder = createMockUser({ role: 'FOUNDER' });
      const otherFounder = createMockUser({ id: 'other-founder', role: 'FOUNDER' });
      const startup = createMockStartup({ founderId: otherFounder.id });
      const pitch = createMockPitch({ startupId: startup.id });

      mockRequest.user = founder;
      mockRequest.params = { id: pitch.id };
      mockRequest.body = { title: 'New Title' };

      prismaMock.pitch.findUnique.mockResolvedValue(pitch);
      prismaMock.startup.findUnique.mockResolvedValue(startup);

      await pitchController.updatePitch(
        mockRequest as any,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Not authorized to update this pitch',
          statusCode: 403,
        })
      );
    });

    it('should allow admin to update any pitch', async () => {
      const admin = createMockUser({ role: 'ADMIN' });
      const founder = createMockUser({ role: 'FOUNDER' });
      const startup = createMockStartup({ founderId: founder.id });
      const pitch = createMockPitch({ startupId: startup.id });
      const updateData = { title: 'Admin Updated' };

      mockRequest.user = admin;
      mockRequest.params = { id: pitch.id };
      mockRequest.body = updateData;

      prismaMock.pitch.findUnique.mockResolvedValue(pitch);
      prismaMock.startup.findUnique.mockResolvedValue(startup);
      prismaMock.pitch.update.mockResolvedValue({ ...pitch, ...updateData });

      await pitchController.updatePitch(
        mockRequest as any,
        mockResponse as Response,
        nextFunction
      );

      expect(prismaMock.pitch.update).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('listPitches', () => {
    it('should list pitches with default pagination', async () => {
      const pitches = [
        createMockPitch({ title: 'Pitch 1' }),
        createMockPitch({ title: 'Pitch 2' }),
      ];

      mockRequest.query = {};

      prismaMock.pitch.findMany.mockResolvedValue(pitches.map(p => ({
        ...p,
        startup: {
          id: p.startupId,
          name: 'Startup Name',
          industry: 'Tech',
          stage: 'SEED',
          logoUrl: null,
        },
      })) as any);
      prismaMock.pitch.count.mockResolvedValue(2);

      await pitchController.listPitches(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(prismaMock.pitch.findMany).toHaveBeenCalled();
      expect(prismaMock.pitch.count).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should filter pitches by search query', async () => {
      mockRequest.query = { search: 'AI platform' };

      prismaMock.pitch.findMany.mockResolvedValue([]);
      prismaMock.pitch.count.mockResolvedValue(0);

      await pitchController.listPitches(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(prismaMock.pitch.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ title: expect.any(Object) }),
              expect.objectContaining({ summary: expect.any(Object) }),
            ]),
          }),
        })
      );
    });

    it('should filter pitches by status', async () => {
      mockRequest.query = { status: 'ACTIVE' };

      prismaMock.pitch.findMany.mockResolvedValue([]);
      prismaMock.pitch.count.mockResolvedValue(0);

      await pitchController.listPitches(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(prismaMock.pitch.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'ACTIVE' }),
        })
      );
    });

    it('should filter pitches by funding amount range', async () => {
      mockRequest.query = { minAmount: '100000', maxAmount: '500000' };

      prismaMock.pitch.findMany.mockResolvedValue([]);
      prismaMock.pitch.count.mockResolvedValue(0);

      await pitchController.listPitches(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(prismaMock.pitch.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            fundingAmount: { gte: 100000, lte: 500000 },
          }),
        })
      );
    });

    it('should paginate results correctly', async () => {
      mockRequest.query = { page: '2', limit: '10' };

      prismaMock.pitch.findMany.mockResolvedValue([]);
      prismaMock.pitch.count.mockResolvedValue(25);

      await pitchController.listPitches(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(prismaMock.pitch.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      );
    });
  });

  describe('updatePitchStatus', () => {
    it('should update pitch status successfully', async () => {
      const founder = createMockUser({ role: 'FOUNDER' });
      const startup = createMockStartup({ founderId: founder.id });
      const pitch = createMockPitch({ startupId: startup.id, status: 'UNDER_REVIEW' });

      mockRequest.user = founder;
      mockRequest.params = { id: pitch.id };
      mockRequest.body = {
        status: 'ACTIVE',
        reason: 'Approved',
      };

      prismaMock.pitch.findUnique.mockResolvedValue(pitch);
      prismaMock.startup.findUnique.mockResolvedValue(startup);
      prismaMock.pitch.update.mockResolvedValue({ ...pitch, status: 'ACTIVE' });

      await pitchController.updatePitchStatus(
        mockRequest as any,
        mockResponse as Response,
        nextFunction
      );

      expect(prismaMock.pitch.update).toHaveBeenCalledWith({
        where: { id: pitch.id },
        data: { status: 'ACTIVE' },
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should allow admin to update any pitch status', async () => {
      const admin = createMockUser({ role: 'ADMIN' });
      const founder = createMockUser({ role: 'FOUNDER' });
      const startup = createMockStartup({ founderId: founder.id });
      const pitch = createMockPitch({ startupId: startup.id });

      mockRequest.user = admin;
      mockRequest.params = { id: pitch.id };
      mockRequest.body = { status: 'REJECTED' };

      prismaMock.pitch.findUnique.mockResolvedValue(pitch);
      prismaMock.startup.findUnique.mockResolvedValue(startup);
      prismaMock.pitch.update.mockResolvedValue({ ...pitch, status: 'REJECTED' });

      await pitchController.updatePitchStatus(
        mockRequest as any,
        mockResponse as Response,
        nextFunction
      );

      expect(prismaMock.pitch.update).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('publishPitch', () => {
    it('should publish pitch successfully', async () => {
      const founder = createMockUser({ role: 'FOUNDER' });
      const startup = createMockStartup({ founderId: founder.id });
      const pitch = createMockPitch({ startupId: startup.id, status: 'UNDER_REVIEW' });

      mockRequest.user = founder;
      mockRequest.params = { id: pitch.id };

      prismaMock.pitch.findUnique.mockResolvedValue(pitch);
      prismaMock.startup.findUnique.mockResolvedValue(startup);
      prismaMock.pitch.update.mockResolvedValue({ ...pitch, status: 'ACTIVE' });

      await pitchController.publishPitch(
        mockRequest as any,
        mockResponse as Response,
        nextFunction
      );

      expect(prismaMock.pitch.update).toHaveBeenCalledWith({
        where: { id: pitch.id },
        data: { status: 'ACTIVE' },
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should reject publish if user does not own startup', async () => {
      const founder = createMockUser({ role: 'FOUNDER' });
      const otherFounder = createMockUser({ id: 'other-founder', role: 'FOUNDER' });
      const startup = createMockStartup({ founderId: otherFounder.id });
      const pitch = createMockPitch({ startupId: startup.id });

      mockRequest.user = founder;
      mockRequest.params = { id: pitch.id };

      prismaMock.pitch.findUnique.mockResolvedValue(pitch);
      prismaMock.startup.findUnique.mockResolvedValue(startup);

      await pitchController.publishPitch(
        mockRequest as any,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Not authorized to publish this pitch',
          statusCode: 403,
        })
      );
    });
  });

  describe('pausePitch', () => {
    it('should pause pitch successfully', async () => {
      const founder = createMockUser({ role: 'FOUNDER' });
      const startup = createMockStartup({ founderId: founder.id });
      const pitch = createMockPitch({ startupId: startup.id, status: 'ACTIVE' });

      mockRequest.user = founder;
      mockRequest.params = { id: pitch.id };

      prismaMock.pitch.findUnique.mockResolvedValue(pitch);
      prismaMock.startup.findUnique.mockResolvedValue(startup);
      prismaMock.pitch.update.mockResolvedValue({ ...pitch, status: 'PAUSED' });

      await pitchController.pausePitch(
        mockRequest as any,
        mockResponse as Response,
        nextFunction
      );

      expect(prismaMock.pitch.update).toHaveBeenCalledWith({
        where: { id: pitch.id },
        data: { status: 'PAUSED' },
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('deletePitch', () => {
    it('should delete pitch successfully', async () => {
      const founder = createMockUser({ role: 'FOUNDER' });
      const startup = createMockStartup({ founderId: founder.id });
      const pitch = createMockPitch({ startupId: startup.id });

      mockRequest.user = founder;
      mockRequest.params = { id: pitch.id };

      prismaMock.pitch.findUnique.mockResolvedValue(pitch);
      prismaMock.startup.findUnique.mockResolvedValue(startup);
      prismaMock.pitch.delete.mockResolvedValue(pitch);

      await pitchController.deletePitch(
        mockRequest as any,
        mockResponse as Response,
        nextFunction
      );

      expect(prismaMock.pitch.delete).toHaveBeenCalledWith({
        where: { id: pitch.id },
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should allow admin to delete any pitch', async () => {
      const admin = createMockUser({ role: 'ADMIN' });
      const founder = createMockUser({ role: 'FOUNDER' });
      const startup = createMockStartup({ founderId: founder.id });
      const pitch = createMockPitch({ startupId: startup.id });

      mockRequest.user = admin;
      mockRequest.params = { id: pitch.id };

      prismaMock.pitch.findUnique.mockResolvedValue(pitch);
      prismaMock.startup.findUnique.mockResolvedValue(startup);
      prismaMock.pitch.delete.mockResolvedValue(pitch);

      await pitchController.deletePitch(
        mockRequest as any,
        mockResponse as Response,
        nextFunction
      );

      expect(prismaMock.pitch.delete).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
  });

  describe('addComment', () => {
    it('should add comment to pitch successfully', async () => {
      const investor = createMockUser({ role: 'INVESTOR' });
      const pitch = createMockPitch();
      const commentData = {
        content: 'Great pitch! Very interested.',
        isPrivate: false,
      };

      mockRequest.user = investor;
      mockRequest.params = { id: pitch.id };
      mockRequest.body = commentData;

      const createdComment = createMockComment({
        pitchId: pitch.id,
        userId: investor.id,
        content: commentData.content,
      });

      prismaMock.pitch.findUnique.mockResolvedValue(pitch);
      prismaMock.comment.create.mockResolvedValue(createdComment);

      await pitchController.addComment(
        mockRequest as any,
        mockResponse as Response,
        nextFunction
      );

      expect(prismaMock.comment.create).toHaveBeenCalledWith({
        data: {
          pitchId: pitch.id,
          userId: investor.id,
          content: commentData.content,
          isApproved: true,
        },
      });
      expect(mockResponse.status).toHaveBeenCalledWith(201);
    });

    it('should reject comment if user not authenticated', async () => {
      mockRequest.user = undefined;
      mockRequest.params = { id: 'pitch-id' };
      mockRequest.body = { content: 'Comment' };

      await pitchController.addComment(
        mockRequest as any,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User not authenticated',
          statusCode: 401,
        })
      );
    });

    it('should reject comment if pitch not found', async () => {
      const investor = createMockUser({ role: 'INVESTOR' });
      mockRequest.user = investor;
      mockRequest.params = { id: 'non-existent-pitch' };
      mockRequest.body = { content: 'Comment' };

      prismaMock.pitch.findUnique.mockResolvedValue(null);

      await pitchController.addComment(
        mockRequest as any,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Pitch not found',
          statusCode: 404,
        })
      );
    });

    it('should create private comment requiring approval', async () => {
      const investor = createMockUser({ role: 'INVESTOR' });
      const pitch = createMockPitch();
      const commentData = {
        content: 'Private feedback',
        isPrivate: true,
      };

      mockRequest.user = investor;
      mockRequest.params = { id: pitch.id };
      mockRequest.body = commentData;

      const createdComment = createMockComment({
        pitchId: pitch.id,
        userId: investor.id,
        content: commentData.content,
      });

      prismaMock.pitch.findUnique.mockResolvedValue(pitch);
      prismaMock.comment.create.mockResolvedValue(createdComment);

      await pitchController.addComment(
        mockRequest as any,
        mockResponse as Response,
        nextFunction
      );

      expect(prismaMock.comment.create).toHaveBeenCalledWith({
        data: {
          pitchId: pitch.id,
          userId: investor.id,
          content: commentData.content,
          isApproved: false, // Private comments need approval
        },
      });
    });
  });

  describe('getPitchAnalytics', () => {
    it('should retrieve pitch analytics successfully', async () => {
      const pitch = createMockPitch();
      const investments = [
        createMockInvestment({ pitchId: pitch.id, amount: 25000 }),
        createMockInvestment({ pitchId: pitch.id, amount: 15000 }),
      ];

      mockRequest.params = { id: pitch.id };
      mockRequest.query = {
        startDate: '2025-01-01',
        endDate: '2025-12-31',
      };

      prismaMock.pitch.findUnique.mockResolvedValue(pitch);
      prismaMock.investment.findMany.mockResolvedValue(investments);
      prismaMock.comment.count.mockResolvedValue(5);

      await pitchController.getPitchAnalytics(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(prismaMock.pitch.findUnique).toHaveBeenCalledWith({
        where: { id: pitch.id },
      });
      expect(prismaMock.investment.findMany).toHaveBeenCalled();
      expect(prismaMock.comment.count).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should return 404 if pitch not found', async () => {
      mockRequest.params = { id: 'non-existent-pitch' };
      mockRequest.query = {};

      prismaMock.pitch.findUnique.mockResolvedValue(null);

      await pitchController.getPitchAnalytics(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(nextFunction).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Pitch not found',
          statusCode: 404,
        })
      );
    });
  });
});
