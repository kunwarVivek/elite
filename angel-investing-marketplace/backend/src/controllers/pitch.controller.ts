import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler.js';
import { sendSuccess } from '../utils/response.js';
import { logger } from '../config/logger.js';
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

interface PitchParams {
  id: string;
}

interface CreatePitchData {
  startupId: string;
  title: string;
  summary: string;
  problemStatement: string;
  solution: string;
  marketOpportunity: string;
  product: string;
  businessModel: string;
  goToMarket: string;
  competitiveLandscape: string;
  useOfFunds: string;
  fundingAmount: number;
  equityOffered: number;
  minimumInvestment: number;
  pitchType?: string;
  valuation?: number;
  preMoneyValuation?: number;
  financialProjections?: {
    year1Revenue?: number;
    year2Revenue?: number;
    year3Revenue?: number;
    year1Profit?: number;
    year2Profit?: number;
    year3Profit?: number;
  };
  milestones?: Array<{
    title: string;
    description: string;
    targetDate: string;
    fundingRequired?: number;
  }>;
  tags?: string[];
}

interface UpdatePitchData {
  title?: string;
  summary?: string;
  problemStatement?: string;
  solution?: string;
  marketOpportunity?: string;
  product?: string;
  businessModel?: string;
  goToMarket?: string;
  competitiveLandscape?: string;
  useOfFunds?: string;
  fundingAmount?: number;
  equityOffered?: number;
  minimumInvestment?: number;
  pitchType?: string;
  valuation?: number;
  preMoneyValuation?: number;
  financialProjections?: {
    year1Revenue?: number;
    year2Revenue?: number;
    year3Revenue?: number;
    year1Profit?: number;
    year2Profit?: number;
    year3Profit?: number;
  };
  milestones?: Array<{
    title: string;
    description: string;
    targetDate: string;
    fundingRequired?: number;
  }>;
  tags?: string[];
}

class PitchController {
  // Create pitch
  async createPitch(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const pitchData: CreatePitchData = req.body;

      // Verify user owns the startup or is admin
      const startup = await this.findStartupById(pitchData.startupId);
      if (!startup) {
        throw new AppError('Startup not found', 404, 'STARTUP_NOT_FOUND');
      }

      if (startup.founderId !== userId && req.user?.role !== 'ADMIN') {
        throw new AppError('Not authorized to create pitch for this startup', 403, 'NOT_AUTHORIZED');
      }

      // Check if startup already has an active pitch
      const existingPitch = await this.findActivePitchByStartupId(pitchData.startupId);
      if (existingPitch) {
        throw new AppError('Startup already has an active pitch', 409, 'ACTIVE_PITCH_EXISTS');
      }

      // Create pitch
      const pitch = await this.createPitchInDb({
        ...pitchData,
        createdBy: userId,
        status: 'UNDER_REVIEW',
      });

      logger.info('Pitch created', { pitchId: pitch.id, startupId: pitchData.startupId, createdBy: userId });

      sendSuccess(res, {
        id: pitch.id,
        startup_id: pitch.startupId,
        title: pitch.title,
        status: pitch.status,
        created_at: pitch.createdAt,
      }, 'Pitch created successfully', 201);

    } catch (error) {
      next(error);
    }
  }

  // Get pitch by ID
  async getPitchById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as unknown as PitchParams;

      const pitch = await this.findPitchById(id);
      if (!pitch) {
        throw new AppError('Pitch not found', 404, 'PITCH_NOT_FOUND');
      }

      // Get additional data
      const startup = await this.findStartupById(pitch.startupId);
      const comments = await this.getPitchComments(id);
      const documents = await this.getPitchDocuments(id);
      const fundingProgress = await this.getPitchFundingProgress(id);

      sendSuccess(res, {
        id: pitch.id,
        title: pitch.title,
        summary: pitch.summary,
        startup: startup ? {
          id: startup.id,
          name: startup.name,
          description: startup.description,
          logo_url: startup.logoUrl,
          founder: {
            id: startup.founderId,
            name: 'Founder Name', // TODO: Get from user table
          },
        } : null,
        problem_statement: pitch.problemStatement,
        solution: pitch.solution,
        market_opportunity: pitch.marketOpportunity,
        competitive_analysis: pitch.competitiveAnalysis,
        // use_of_funds: pitch.useOfFunds, // TODO: Add to schema in TASK3
        funding_amount: pitch.fundingAmount,
        current_funding: fundingProgress.current_funding,
        equity_offered: pitch.equityOffered,
        minimum_investment: pitch.minimumInvestment,
        // pitch_type: pitch.pitchType, // TODO: Add to schema in TASK3
        // valuation: pitch.valuation, // TODO: Add to schema in TASK3
        // pre_money_valuation: pitch.preMoneyValuation, // TODO: Add to schema in TASK3
        financial_projections: pitch.financialProjections,
        // milestones: pitch.milestones, // TODO: Add to schema in TASK3
        tags: pitch.tags,
        status: pitch.status,
        funding_progress: fundingProgress,
        comments: comments,
        documents: documents,
        created_at: pitch.createdAt,
        updated_at: pitch.updatedAt,
      }, 'Pitch retrieved successfully');

    } catch (error) {
      next(error);
    }
  }

  // Update pitch
  async updatePitch(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params as unknown as PitchParams;
      const updateData: UpdatePitchData = req.body;

      // Check if user owns the pitch or is admin
      const pitch = await this.findPitchById(id);
      if (!pitch) {
        throw new AppError('Pitch not found', 404, 'PITCH_NOT_FOUND');
      }

      const startup = await this.findStartupById(pitch.startupId);
      if (!startup) {
        throw new AppError('Startup not found', 404, 'STARTUP_NOT_FOUND');
      }

      if (startup.founderId !== userId && req.user?.role !== 'ADMIN') {
        throw new AppError('Not authorized to update this pitch', 403, 'NOT_AUTHORIZED');
      }

      // Update pitch
      const updatedPitch = await this.updatePitchInDb(id, updateData);

      logger.info('Pitch updated', { pitchId: id, updatedBy: userId });

      sendSuccess(res, {
        id: updatedPitch.id,
        title: updatedPitch.title,
        updated_at: updatedPitch.updatedAt,
      }, 'Pitch updated successfully');

    } catch (error) {
      next(error);
    }
  }

  // List pitches with filtering
  async listPitches(req: Request, res: Response, next: NextFunction) {
    try {
      const queryParams = req.query;
      const {
        search,
        status,
        pitchType,
        industry,
        stage,
        minAmount,
        maxAmount,
        minEquity,
        maxEquity,
        minValuation,
        maxValuation,
        tags,
        createdAfter,
        createdBefore,
        page,
        limit,
        sortBy,
        sortOrder,
      } = queryParams as any;

      const result = await this.getPitchesList({
        search,
        status,
        pitchType,
        industry,
        stage,
        minAmount: minAmount ? parseFloat(minAmount) : undefined,
        maxAmount: maxAmount ? parseFloat(maxAmount) : undefined,
        minEquity: minEquity ? parseFloat(minEquity) : undefined,
        maxEquity: maxEquity ? parseFloat(maxEquity) : undefined,
        minValuation: minValuation ? parseFloat(minValuation) : undefined,
        maxValuation: maxValuation ? parseFloat(maxValuation) : undefined,
        tags: tags ? (Array.isArray(tags) ? tags : [tags]) : undefined,
        createdAfter,
        createdBefore,
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
        sortBy,
        sortOrder,
      });

      sendSuccess(res, {
        pitches: result.pitches,
        pagination: result.pagination,
      }, 'Pitches retrieved successfully');

    } catch (error) {
      next(error);
    }
  }

  // Update pitch status
  async updatePitchStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params as unknown as PitchParams;
      const { status, reason, adminNotes } = req.body;

      // Check if user is admin or owns the startup
      const pitch = await this.findPitchById(id);
      if (!pitch) {
        throw new AppError('Pitch not found', 404, 'PITCH_NOT_FOUND');
      }

      const startup = await this.findStartupById(pitch.startupId);
      if (!startup) {
        throw new AppError('Startup not found', 404, 'STARTUP_NOT_FOUND');
      }

      if (req.user?.role !== 'ADMIN' && startup.founderId !== userId) {
        throw new AppError('Not authorized to update pitch status', 403, 'NOT_AUTHORIZED');
      }

      // Update pitch status
      const updatedPitch = await this.updatePitchStatusInDb(id, {
        status,
        reason,
        adminNotes,
        updatedBy: userId,
      });

      logger.info('Pitch status updated', { pitchId: id, status, updatedBy: userId });

      sendSuccess(res, {
        id: updatedPitch.id,
        status: updatedPitch.status,
        updated_at: updatedPitch.updatedAt,
      }, 'Pitch status updated successfully');

    } catch (error) {
      next(error);
    }
  }

  // Publish pitch
  async publishPitch(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params as unknown as PitchParams;

      // Check if user owns the startup
      const pitch = await this.findPitchById(id);
      if (!pitch) {
        throw new AppError('Pitch not found', 404, 'PITCH_NOT_FOUND');
      }

      const startup = await this.findStartupById(pitch.startupId);
      if (!startup) {
        throw new AppError('Startup not found', 404, 'STARTUP_NOT_FOUND');
      }

      if (startup.founderId !== userId) {
        throw new AppError('Not authorized to publish this pitch', 403, 'NOT_AUTHORIZED');
      }

      // Update pitch status to ACTIVE
      const updatedPitch = await this.updatePitchStatusInDb(id, {
        status: 'ACTIVE',
        updatedBy: userId,
      });

      logger.info('Pitch published', { pitchId: id, publishedBy: userId });

      sendSuccess(res, {
        id: updatedPitch.id,
        status: updatedPitch.status,
        published_at: updatedPitch.updatedAt,
      }, 'Pitch published successfully');

    } catch (error) {
      next(error);
    }
  }

  // Pause pitch
  async pausePitch(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params as unknown as PitchParams;

      // Check if user owns the startup
      const pitch = await this.findPitchById(id);
      if (!pitch) {
        throw new AppError('Pitch not found', 404, 'PITCH_NOT_FOUND');
      }

      const startup = await this.findStartupById(pitch.startupId);
      if (!startup) {
        throw new AppError('Startup not found', 404, 'STARTUP_NOT_FOUND');
      }

      if (startup.founderId !== userId) {
        throw new AppError('Not authorized to pause this pitch', 403, 'NOT_AUTHORIZED');
      }

      // Update pitch status to PAUSED
      const updatedPitch = await this.updatePitchStatusInDb(id, {
        status: 'PAUSED',
        updatedBy: userId,
      });

      logger.info('Pitch paused', { pitchId: id, pausedBy: userId });

      sendSuccess(res, {
        id: updatedPitch.id,
        status: updatedPitch.status,
        paused_at: updatedPitch.updatedAt,
      }, 'Pitch paused successfully');

    } catch (error) {
      next(error);
    }
  }

  // Delete pitch
  async deletePitch(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params as unknown as PitchParams;

      // Check if user owns the startup
      const pitch = await this.findPitchById(id);
      if (!pitch) {
        throw new AppError('Pitch not found', 404, 'PITCH_NOT_FOUND');
      }

      const startup = await this.findStartupById(pitch.startupId);
      if (!startup) {
        throw new AppError('Startup not found', 404, 'STARTUP_NOT_FOUND');
      }

      if (startup.founderId !== userId && req.user?.role !== 'ADMIN') {
        throw new AppError('Not authorized to delete this pitch', 403, 'NOT_AUTHORIZED');
      }

      await this.deletePitchFromDb(id);

      logger.info('Pitch deleted', { pitchId: id, deletedBy: userId });

      sendSuccess(res, null, 'Pitch deleted successfully');

    } catch (error) {
      next(error);
    }
  }

  // Add comment to pitch
  async addComment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params as unknown as PitchParams;
      const { content, isPrivate } = req.body;

      // Check if pitch exists
      const pitch = await this.findPitchById(id);
      if (!pitch) {
        throw new AppError('Pitch not found', 404, 'PITCH_NOT_FOUND');
      }

      const comment = await this.addCommentToPitch(id, {
        content,
        isPrivate: isPrivate || false,
        userId,
      });

      logger.info('Comment added to pitch', { pitchId: id, commentId: comment.id, userId });

      sendSuccess(res, {
        id: comment.id,
        content: comment.content,
        // is_private: comment.isPrivate, // TODO: Add to schema in TASK3
        created_at: comment.createdAt,
      }, 'Comment added successfully', 201);

    } catch (error) {
      next(error);
    }
  }

  // Get pitch analytics
  async getPitchAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as unknown as PitchParams;
      const { startDate, endDate } = req.query as any;

      // Check if pitch exists
      const pitch = await this.findPitchById(id);
      if (!pitch) {
        throw new AppError('Pitch not found', 404, 'PITCH_NOT_FOUND');
      }

      const analytics = await this.getPitchAnalyticsData(id, {
        startDate,
        endDate,
      });

      sendSuccess(res, {
        pitch_id: id,
        period: {
          start_date: startDate,
          end_date: endDate,
        },
        views: analytics.views,
        unique_viewers: analytics.uniqueViewers,
        average_time_spent: analytics.averageTimeSpent,
        bounce_rate: analytics.bounceRate,
        comments_count: analytics.commentsCount,
        shares_count: analytics.sharesCount,
        funding_progress: analytics.fundingProgress,
        investor_interest: analytics.investorInterest,
        top_referrers: analytics.topReferrers,
        viewer_demographics: analytics.viewerDemographics,
      }, 'Pitch analytics retrieved successfully');

    } catch (error) {
      next(error);
    }
  }

  // Helper methods
  private async getPitchFundingProgress(pitchId: string) {
    try {
      const investments = await prisma.investment.findMany({
        where: { pitchId, status: 'COMPLETED' },
      });

      const currentFunding = investments.reduce((sum, inv) => sum + Number(inv.amount), 0);
      const investorCount = investments.length;

      const pitch = await prisma.pitch.findUnique({
        where: { id: pitchId },
      });

      const fundingGoal = pitch ? Number(pitch.fundingAmount) : 0;
      const percentage = fundingGoal > 0 ? (currentFunding / fundingGoal) * 100 : 0;

      return {
        current_funding: currentFunding,
        funding_goal: fundingGoal,
        percentage,
        investor_count: investorCount,
      };
    } catch (error) {
      logger.error('Error calculating pitch funding progress', { pitchId, error });
      return {
        current_funding: 0,
        funding_goal: 0,
        percentage: 0,
        investor_count: 0,
      };
    }
  }

  private async getPitchComments(pitchId: string) {
    try {
      const comments = await prisma.comment.findMany({
        where: { pitchId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return comments.map(comment => ({
        id: comment.id,
        content: comment.content,
        user: comment.user,
        created_at: comment.createdAt,
      }));
    } catch (error) {
      logger.error('Error getting pitch comments', { pitchId, error });
      return [];
    }
  }

  private async getPitchDocuments(pitchId: string) {
    try {
      const documents = await prisma.document.findMany({
        where: { pitchId },
        orderBy: { createdAt: 'desc' },
      });

      return documents.map(doc => ({
        id: doc.id,
        name: doc.name,
        file_url: doc.fileUrl,
        file_type: doc.fileType,
        file_size: doc.fileSize,
        uploaded_at: doc.createdAt,
      }));
    } catch (error) {
      logger.error('Error getting pitch documents', { pitchId, error });
      return [];
    }
  }

  // Database operations (these would typically be in a service layer)
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

  private async findStartupById(id: string) {
    try {
      return await prisma.startup.findUnique({
        where: { id },
      });
    } catch (error) {
      logger.error('Error finding startup by ID', { id, error });
      throw error;
    }
  }

  private async findActivePitchByStartupId(startupId: string) {
    try {
      return await prisma.pitch.findFirst({
        where: {
          startupId,
          status: {
            in: ['ACTIVE', 'UNDER_REVIEW'],
          },
        },
      });
    } catch (error) {
      logger.error('Error finding active pitch by startup ID', { startupId, error });
      throw error;
    }
  }

  private async createPitchInDb(pitchData: any) {
    try {
      const { createdBy, ...data } = pitchData;

      return await prisma.pitch.create({
        data: {
          ...data,
          // Map the data to match the Prisma schema field names
          problemStatement: data.problemStatement,
          marketOpportunity: data.marketOpportunity,
          fundingAmount: data.fundingAmount,
          equityOffered: data.equityOffered,
          minimumInvestment: data.minimumInvestment,
          pitchDeckUrl: data.pitchDeckUrl,
          videoUrl: data.videoUrl,
        },
      });
    } catch (error) {
      logger.error('Error creating pitch in database', { error });
      throw error;
    }
  }

  private async updatePitchInDb(id: string, updateData: any) {
    try {
      return await prisma.pitch.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      logger.error('Error updating pitch in database', { id, error });
      throw error;
    }
  }

  private async updatePitchStatusInDb(id: string, statusData: any) {
    try {
      return await prisma.pitch.update({
        where: { id },
        data: {
          status: statusData.status,
        },
      });
    } catch (error) {
      logger.error('Error updating pitch status in database', { id, error });
      throw error;
    }
  }

  private async deletePitchFromDb(id: string) {
    try {
      await prisma.pitch.delete({
        where: { id },
      });
    } catch (error) {
      logger.error('Error deleting pitch from database', { id, error });
      throw error;
    }
  }

  private async addCommentToPitch(pitchId: string, commentData: any) {
    try {
      const { userId, content, isPrivate } = commentData;

      return await prisma.comment.create({
        data: {
          pitchId,
          userId,
          content,
          isApproved: !isPrivate, // Private comments need approval
        },
      });
    } catch (error) {
      logger.error('Error adding comment to pitch', { pitchId, error });
      throw error;
    }
  }

  private async getPitchAnalyticsData(pitchId: string, _filters: any) {
    try {
      // This is a simplified implementation
      // In a full implementation, you would track views, analytics, etc.
      const investments = await prisma.investment.findMany({
        where: { pitchId },
      });

      const comments = await prisma.comment.count({
        where: { pitchId },
      });

      return {
        views: 0, // Would need analytics tracking
        uniqueViewers: 0,
        averageTimeSpent: 0,
        bounceRate: 0,
        commentsCount: comments,
        sharesCount: 0,
        fundingProgress: {
          current: investments.reduce((sum, inv) => sum + Number(inv.amount), 0),
          goal: 0, // Would need to get from pitch
          percentage: 0,
        },
        investorInterest: {
          inquiries: 0,
          meetings: 0,
          investments: investments.length,
        },
        topReferrers: [],
        viewerDemographics: {
          investorTypes: [],
          geographies: [],
          industries: [],
        },
      };
    } catch (error) {
      logger.error('Error getting pitch analytics data', { pitchId, error });
      throw error;
    }
  }

  private async getPitchesList(filters: any) {
    try {
      const {
        page, limit, search, status,
        minAmount, maxAmount, minEquity, maxEquity,
        createdAfter, createdBefore, sortBy, sortOrder
      } = filters;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {};

      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { summary: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (status) where.status = status;
      // if (pitchType) where.pitchType = pitchType; // TODO: Add pitchType to schema in TASK3

      // Amount range filters
      if (minAmount !== undefined || maxAmount !== undefined) {
        where.fundingAmount = {};
        if (minAmount !== undefined) where.fundingAmount.gte = minAmount;
        if (maxAmount !== undefined) where.fundingAmount.lte = maxAmount;
      }

      if (minEquity !== undefined || maxEquity !== undefined) {
        where.equityOffered = {};
        if (minEquity !== undefined) where.equityOffered.gte = minEquity;
        if (maxEquity !== undefined) where.equityOffered.lte = maxEquity;
      }

      // Date range filters
      if (createdAfter || createdBefore) {
        where.createdAt = {};
        if (createdAfter) where.createdAt.gte = new Date(createdAfter);
        if (createdBefore) where.createdAt.lte = new Date(createdBefore);
      }

      // Get pitches with startup data
      const pitches = await prisma.pitch.findMany({
        where,
        include: {
          startup: {
            select: {
              id: true,
              name: true,
              industry: true,
              stage: true,
              logoUrl: true,
            },
          },
        },
        orderBy: sortBy ? { [sortBy]: sortOrder || 'asc' } : { createdAt: 'desc' },
        skip,
        take: limit,
      });

      // Get total count
      const total = await prisma.pitch.count({ where });

      return {
        pitches,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error getting pitches list', { filters, error });
      throw error;
    }
  }
}

// Export singleton instance
export const pitchController = new PitchController();
export default pitchController;