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

interface StartupParams {
  id: string;
}

interface CreateStartupData {
  name: string;
  slug?: string;
  description: string;
  industry: string;
  stage: string;
  websiteUrl?: string;
  logoUrl?: string;
  foundedDate: string;
  teamSize: number;
  businessModel: string;
  targetMarket: string;
  competitiveAdvantage: string;
  fundingGoal: number;
  currentFunding?: number;
  valuation?: number;
  pitch?: string;
}

interface UpdateStartupData {
  name?: string;
  slug?: string;
  description?: string;
  industry?: string;
  stage?: string;
  websiteUrl?: string;
  logoUrl?: string;
  foundedDate?: string;
  teamSize?: number;
  businessModel?: string;
  targetMarket?: string;
  competitiveAdvantage?: string;
  fundingGoal?: number;
  currentFunding?: number;
  valuation?: number;
  pitch?: string;
}

class StartupController {
  // Create startup
  async createStartup(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const startupData: CreateStartupData = req.body;

      // Generate slug if not provided
      if (!startupData.slug) {
        startupData.slug = this.generateSlug(startupData.name);
      }

      // Check if slug is already taken
      const existingStartup = await this.findStartupBySlug(startupData.slug);
      if (existingStartup) {
        throw new AppError('Startup slug already exists', 409, 'SLUG_EXISTS');
      }

      // Handle logo upload if provided
      if (req.file) {
        const logoUrl = await fileUploadService.uploadFile(req.file, {
          folder: 'startup-logos',
          allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
          maxSize: 5 * 1024 * 1024, // 5MB
        });
        startupData.logoUrl = logoUrl;
      }

      // Create startup
      const startup = await this.createStartupInDb({
        ...startupData,
        founderId: userId,
      });

      logger.info('Startup created', { startupId: startup.id, founderId: userId });

      sendSuccess(res, {
        id: startup.id,
        name: startup.name,
        slug: startup.slug,
        founder_id: startup.founderId,
        is_verified: startup.isVerified,
        created_at: startup.createdAt,
      }, 'Startup created successfully', 201);

    } catch (error) {
      next(error);
    }
  }

  // Get startup by ID
  async getStartupById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as unknown as StartupParams;

      const startup = await this.findStartupById(id);
      if (!startup) {
        throw new AppError('Startup not found', 404, 'STARTUP_NOT_FOUND');
      }

      // Get additional data
      const founder = await this.findUserById(startup.founderId);
      const teamMembers = await this.getStartupTeamMembers(id);
      const fundingProgress = await this.getStartupFundingProgress(id);

      sendSuccess(res, {
        id: startup.id,
        name: startup.name,
        slug: startup.slug,
        description: startup.description,
        industry: startup.industry,
        stage: startup.stage,
        website_url: startup.websiteUrl,
        logo_url: startup.logoUrl,
        founded_date: startup.foundedDate,
        team_size: startup.teamSize,
        business_model: startup.businessModel,
        target_market: startup.targetMarket,
        competitive_advantage: startup.competitiveAdvantage,
        funding_goal: startup.fundingGoal,
        current_funding: startup.currentFunding,
        founder: founder ? {
          id: founder.id,
          name: founder.name,
          avatar_url: founder.avatarUrl,
        } : null,
        team_members: teamMembers,
        funding_progress: fundingProgress,
        is_verified: startup.isVerified,
        created_at: startup.createdAt,
        updated_at: startup.updatedAt,
      }, 'Startup retrieved successfully');

    } catch (error) {
      next(error);
    }
  }

  // Update startup
  async updateStartup(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params as unknown as StartupParams;
      const updateData: UpdateStartupData = req.body;

      // Check if user owns the startup or is admin
      const startup = await this.findStartupById(id);
      if (!startup) {
        throw new AppError('Startup not found', 404, 'STARTUP_NOT_FOUND');
      }

      if (startup.founderId !== userId && req.user?.role !== 'ADMIN') {
        throw new AppError('Not authorized to update this startup', 403, 'NOT_AUTHORIZED');
      }

      // Handle logo upload if provided
      if (req.file) {
        const logoUrl = await fileUploadService.uploadFile(req.file, {
          folder: 'startup-logos',
          allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
          maxSize: 5 * 1024 * 1024, // 5MB
        });
        updateData.logoUrl = logoUrl;
      }

      // Update startup
      const updatedStartup = await this.updateStartupInDb(id, updateData);

      logger.info('Startup updated', { startupId: id, updatedBy: userId });

      sendSuccess(res, {
        id: updatedStartup.id,
        name: updatedStartup.name,
        slug: updatedStartup.slug,
        updated_at: updatedStartup.updatedAt,
      }, 'Startup updated successfully');

    } catch (error) {
      next(error);
    }
  }

  // List startups with filtering
  async listStartups(req: Request, res: Response, next: NextFunction) {
    try {
      const queryParams = req.query;
      const {
        search,
        industry,
        stage,
        minFunding,
        maxFunding,
        minValuation,
        maxValuation,
        isVerified,
        foundedAfter,
        foundedBefore,
        page,
        limit,
        sortBy,
        sortOrder,
      } = queryParams as any;

      const result = await this.getStartupsList({
        search,
        industry,
        stage,
        minFunding: minFunding ? parseFloat(minFunding) : undefined,
        maxFunding: maxFunding ? parseFloat(maxFunding) : undefined,
        minValuation: minValuation ? parseFloat(minValuation) : undefined,
        maxValuation: maxValuation ? parseFloat(maxValuation) : undefined,
        isVerified: isVerified === 'true',
        foundedAfter,
        foundedBefore,
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
        sortBy,
        sortOrder,
      });

      sendSuccess(res, {
        startups: result.startups,
        pagination: result.pagination,
      }, 'Startups retrieved successfully');

    } catch (error) {
      next(error);
    }
  }

  // Delete/Deactivate startup
  async deleteStartup(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params as unknown as StartupParams;

      // Check if user owns the startup or is admin
      const startup = await this.findStartupById(id);
      if (!startup) {
        throw new AppError('Startup not found', 404, 'STARTUP_NOT_FOUND');
      }

      if (startup.founderId !== userId && req.user?.role !== 'ADMIN') {
        throw new AppError('Not authorized to delete this startup', 403, 'NOT_AUTHORIZED');
      }

      await this.deactivateStartup(id, {
        reason: 'User requested deletion',
        deactivatedBy: userId,
      });

      logger.info('Startup deactivated', { startupId: id, deactivatedBy: userId });

      sendSuccess(res, null, 'Startup deactivated successfully');

    } catch (error) {
      next(error);
    }
  }

  // Submit startup for verification
  async submitForVerification(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params as unknown as StartupParams;
      const { isVerified, verificationNotes, verifiedBy, verificationDate, documents } = req.body;

      // Check if user owns the startup or is admin
      const startup = await this.findStartupById(id);
      if (!startup) {
        throw new AppError('Startup not found', 404, 'STARTUP_NOT_FOUND');
      }

      if (startup.founderId !== userId && req.user?.role !== 'ADMIN') {
        throw new AppError('Not authorized to verify this startup', 403, 'NOT_AUTHORIZED');
      }

      // Process document uploads if provided
      let processedDocuments = documents;
      if (req.files && documents && Array.isArray(req.files)) {
        for (let i = 0; i < documents.length; i++) {
          const file = req.files[i];
          if (file) {
            const fileUrl = await fileUploadService.uploadFile(file, {
              folder: 'verification-documents',
              allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
              maxSize: 10 * 1024 * 1024, // 10MB
            });
            processedDocuments[i].fileUrl = fileUrl;
          }
        }
      }

      const verification = await this.verifyStartup(id, {
        isVerified,
        verificationNotes,
        verifiedBy: verifiedBy || userId,
        verificationDate,
        documents: processedDocuments,
      });

      logger.info('Startup verification updated', {
        startupId: id,
        verifiedBy: userId,
        isVerified,
      });

      sendSuccess(res, {
        id: verification.id,
        is_verified: verification.isVerified,
        verified_at: verification.verifiedAt,
        verified_by: verification.verifiedBy,
      }, 'Startup verification updated successfully');

    } catch (error) {
      next(error);
    }
  }

  // Get startup verification status
  async getVerificationStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as unknown as StartupParams;

      const startup = await this.findStartupById(id);
      if (!startup) {
        throw new AppError('Startup not found', 404, 'STARTUP_NOT_FOUND');
      }

      const verificationStatus = await this.getStartupVerificationStatus(id);

      sendSuccess(res, {
        is_verified: verificationStatus.isVerified,
        submitted_at: verificationStatus.submittedAt,
        verified_at: verificationStatus.verifiedAt,
        verified_by: verificationStatus.verifiedBy,
        verification_notes: verificationStatus.verificationNotes,
        documents: verificationStatus.documents,
        rejection_reason: verificationStatus.rejectionReason,
      }, 'Verification status retrieved successfully');

    } catch (error) {
      next(error);
    }
  }

  // Add team member
  async addTeamMember(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id: startupId } = req.params as unknown as StartupParams;
      const { teamMember } = req.body;

      // Check if user owns the startup or is admin
      const startup = await this.findStartupById(startupId);
      if (!startup) {
        throw new AppError('Startup not found', 404, 'STARTUP_NOT_FOUND');
      }

      if (startup.founderId !== userId && req.user?.role !== 'ADMIN') {
        throw new AppError('Not authorized to add team members', 403, 'NOT_AUTHORIZED');
      }

      // Handle avatar upload if provided
      if (req.file) {
        const avatarUrl = await fileUploadService.uploadFile(req.file, {
          folder: 'team-avatars',
          allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
          maxSize: 2 * 1024 * 1024, // 2MB
        });
        teamMember.avatar = avatarUrl;
      }

      const member = await this.addTeamMemberToStartup(startupId, teamMember);

      logger.info('Team member added', { startupId, memberId: member.id, addedBy: userId });

      sendSuccess(res, {
        id: member.id,
        name: member.name,
        title: member.title,
        is_founder: member.isFounder,
        added_at: member.addedAt,
      }, 'Team member added successfully', 201);

    } catch (error) {
      next(error);
    }
  }

  // Update team member
  async updateTeamMember(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id: startupId, memberId } = req.params as unknown as StartupParams & { memberId: string };
      const updateData = req.body;

      // Check if user owns the startup or is admin
      const startup = await this.findStartupById(startupId);
      if (!startup) {
        throw new AppError('Startup not found', 404, 'STARTUP_NOT_FOUND');
      }

      if (startup.founderId !== userId && req.user?.role !== 'ADMIN') {
        throw new AppError('Not authorized to update team members', 403, 'NOT_AUTHORIZED');
      }

      // Handle avatar upload if provided
      if (req.file) {
        const avatarUrl = await fileUploadService.uploadFile(req.file, {
          folder: 'team-avatars',
          allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
          maxSize: 2 * 1024 * 1024, // 2MB
        });
        updateData.avatar = avatarUrl;
      }

      const member = await this.updateTeamMemberInDb(memberId, updateData);

      logger.info('Team member updated', { startupId, memberId, updatedBy: userId });

      sendSuccess(res, {
        id: member.id,
        name: member.name,
        title: member.title,
        updated_at: member.updatedAt,
      }, 'Team member updated successfully');

    } catch (error) {
      next(error);
    }
  }

  // Remove team member
  async removeTeamMember(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id: startupId, memberId } = req.params as unknown as StartupParams & { memberId: string };

      // Check if user owns the startup or is admin
      const startup = await this.findStartupById(startupId);
      if (!startup) {
        throw new AppError('Startup not found', 404, 'STARTUP_NOT_FOUND');
      }

      if (startup.founderId !== userId && req.user?.role !== 'ADMIN') {
        throw new AppError('Not authorized to remove team members', 403, 'NOT_AUTHORIZED');
      }

      await this.removeTeamMemberFromDb(memberId);

      logger.info('Team member removed', { startupId, memberId, removedBy: userId });

      sendSuccess(res, null, 'Team member removed successfully');

    } catch (error) {
      next(error);
    }
  }

  // Helper methods
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  private async getStartupFundingProgress(startupId: string) {
    try {
      // Get all pitches for this startup and calculate total funding
      const pitches = await prisma.pitch.findMany({
        where: { startupId },
        include: { investments: true },
      });

      const totalCurrentFunding = pitches.reduce((sum, pitch) => {
        return sum + pitch.investments
          .filter(inv => inv.status === 'COMPLETED')
          .reduce((invSum, inv) => invSum + Number(inv.amount), 0);
      }, 0);

      const totalFundingGoal = pitches.reduce((sum, pitch) => sum + Number(pitch.fundingAmount), 0);
      const investorCount = new Set(
        pitches.flatMap(pitch =>
          pitch.investments
            .filter(inv => inv.status === 'COMPLETED')
            .map(inv => inv.investorId)
        )
      ).size;

      return {
        current_funding: totalCurrentFunding,
        funding_goal: totalFundingGoal,
        percentage: totalFundingGoal > 0 ? (totalCurrentFunding / totalFundingGoal) * 100 : 0,
        investor_count: investorCount,
      };
    } catch (error) {
      logger.error('Error calculating funding progress', { startupId, error });
      return {
        current_funding: 0,
        funding_goal: 0,
        percentage: 0,
        investor_count: 0,
      };
    }
  }

  private async getStartupTeamMembers(startupId: string) {
    try {
      // For now, we'll return basic team info from the startup founder
      // In a full implementation, you might have a separate TeamMember model
      const startup = await prisma.startup.findUnique({
        where: { id: startupId },
        include: { founder: true },
      });

      if (!startup) return [];

      return [{
        id: startup.founder.id,
        name: startup.founder.name,
        title: 'Founder',
        is_founder: true,
        avatar_url: startup.founder.avatarUrl,
      }];
    } catch (error) {
      logger.error('Error getting startup team members', { startupId, error });
      return [];
    }
  }

  // Database operations (these would typically be in a service layer)
  private async findStartupBySlug(slug: string) {
    try {
      return await prisma.startup.findUnique({
        where: { slug },
      });
    } catch (error) {
      logger.error('Error finding startup by slug', { slug, error });
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

  private async findUserById(id: string) {
    try {
      return await prisma.user.findUnique({
        where: { id },
      });
    } catch (error) {
      logger.error('Error finding user by ID', { id, error });
      throw error;
    }
  }

  private async createStartupInDb(startupData: any) {
    try {
      const { founderId, ...data } = startupData;

      return await prisma.startup.create({
        data: {
          ...data,
          founderId,
        },
      });
    } catch (error) {
      logger.error('Error creating startup in database', { error });
      throw error;
    }
  }

  private async updateStartupInDb(id: string, updateData: any) {
    try {
      return await prisma.startup.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      logger.error('Error updating startup in database', { id, error });
      throw error;
    }
  }

  private async deactivateStartup(id: string, _data: any) {
    try {
      await prisma.startup.update({
        where: { id },
        data: {
          isActive: false,
        },
      });
    } catch (error) {
      logger.error('Error deactivating startup', { id, error });
      throw error;
    }
  }

  private async verifyStartup(id: string, verificationData: any) {
    try {
      const { isVerified, verifiedBy, verificationDate } = verificationData;

      await prisma.startup.update({
        where: { id },
        data: {
          isVerified,
        },
      });

      return {
        id: `verification_${Date.now()}`,
        isVerified,
        verifiedAt: verificationDate || new Date(),
        verifiedBy,
      };
    } catch (error) {
      logger.error('Error verifying startup', { id, error });
      throw error;
    }
  }

  private async getStartupVerificationStatus(id: string) {
    try {
      const startup = await prisma.startup.findUnique({
        where: { id },
      });

      return {
        isVerified: startup?.isVerified || false,
        submittedAt: startup?.createdAt || null,
        verifiedAt: null,
        verifiedBy: null,
        verificationNotes: null,
        documents: [],
        rejectionReason: null,
      };
    } catch (error) {
      logger.error('Error getting startup verification status', { id, error });
      throw error;
    }
  }

  private async addTeamMemberToStartup(startupId: string, teamMemberData: any) {
    try {
      // For now, we'll just return a mock team member
      // In a full implementation, you would have a TeamMember model
      return {
        id: `member_${Date.now()}`,
        ...teamMemberData,
        addedAt: new Date(),
      };
    } catch (error) {
      logger.error('Error adding team member to startup', { startupId, error });
      throw error;
    }
  }

  private async updateTeamMemberInDb(memberId: string, updateData: any) {
    try {
      // For now, we'll just return a mock updated team member
      // In a full implementation, you would update the TeamMember model
      return {
        id: memberId,
        ...updateData,
        updatedAt: new Date(),
      };
    } catch (error) {
      logger.error('Error updating team member in database', { memberId, error });
      throw error;
    }
  }

  private async removeTeamMemberFromDb(memberId: string) {
    try {
      // For now, this is a placeholder
      // In a full implementation, you would delete from the TeamMember model
      logger.info('Team member removed', { memberId });
    } catch (error) {
      logger.error('Error removing team member from database', { memberId, error });
      throw error;
    }
  }

  private async getStartupsList(filters: any) {
    try {
      const {
        page, limit, search, industry, stage,
        isVerified, foundedAfter, foundedBefore,
        sortBy, sortOrder
      } = filters;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {};

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (industry) where.industry = industry;
      if (stage) where.stage = stage;
      if (isVerified !== undefined) where.isVerified = isVerified;
      if (foundedAfter || foundedBefore) {
        where.foundedDate = {};
        if (foundedAfter) where.foundedDate.gte = new Date(foundedAfter);
        if (foundedBefore) where.foundedDate.lte = new Date(foundedBefore);
      }

      // Get startups
      const startups = await prisma.startup.findMany({
        where,
        orderBy: sortBy ? { [sortBy]: sortOrder || 'asc' } : { createdAt: 'desc' },
        skip,
        take: limit,
      });

      // Get total count
      const total = await prisma.startup.count({ where });

      return {
        startups,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error getting startups list', { filters, error });
      throw error;
    }
  }
}

// Export singleton instance
export const startupController = new StartupController();
export default startupController;