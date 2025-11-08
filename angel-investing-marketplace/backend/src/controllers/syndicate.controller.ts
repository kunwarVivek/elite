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

interface SyndicateParams {
  id: string;
}

interface CreateSyndicateData {
  name: string;
  description: string;
  type: string;
  investmentFocus: string;
  targetDealSize: {
    min: number;
    max: number;
  };
  targetEquity: {
    min: number;
    max: number;
  };
  maxMembers: number;
  minimumCommitment: number;
  carryPercentage?: number;
  managementFee?: number;
  investmentCriteria: string;
  sectors: string[];
  geographies: string[];
  leadInvestorId: string;
  coLeadInvestorIds?: string[];
}

interface UpdateSyndicateData {
  name?: string;
  description?: string;
  investmentFocus?: string;
  targetDealSize?: {
    min?: number;
    max?: number;
  };
  targetEquity?: {
    min?: number;
    max?: number;
  };
  maxMembers?: number;
  minimumCommitment?: number;
  carryPercentage?: number;
  managementFee?: number;
  investmentCriteria?: string;
  sectors?: string[];
  geographies?: string[];
}

class SyndicateController {
  // Create syndicate
  async createSyndicate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const syndicateData: CreateSyndicateData = req.body;

      // Verify user is accredited (required for syndicate creation)
      const user = await this.findUserById(userId);
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      if (user.userProfile?.accreditationStatus !== 'VERIFIED') {
        throw new AppError('Accreditation required to create syndicate', 403, 'ACCREDITATION_REQUIRED');
      }

      // Verify lead investor exists and is accredited
      const leadInvestor = await this.findUserById(syndicateData.leadInvestorId);
      if (!leadInvestor) {
        throw new AppError('Lead investor not found', 404, 'LEAD_INVESTOR_NOT_FOUND');
      }

      if (leadInvestor.userProfile?.accreditationStatus !== 'VERIFIED') {
        throw new AppError('Lead investor must be accredited', 400, 'LEAD_INVESTOR_NOT_ACCREDITED');
      }

      // Verify co-lead investors if provided
      if (syndicateData.coLeadInvestorIds) {
        for (const coLeadId of syndicateData.coLeadInvestorIds) {
          const coLead = await this.findUserById(coLeadId);
          if (!coLead) {
            throw new AppError(`Co-lead investor ${coLeadId} not found`, 404, 'CO_LEAD_INVESTOR_NOT_FOUND');
          }
          if (coLead.userProfile?.accreditationStatus !== 'VERIFIED') {
            throw new AppError(`Co-lead investor ${coLeadId} must be accredited`, 400, 'CO_LEAD_INVESTOR_NOT_ACCREDITED');
          }
        }
      }

      // Create syndicate
      const syndicate = await this.createSyndicateInDb({
        ...syndicateData,
        createdBy: userId,
        status: 'FORMING',
      });

      // Add lead investor as syndicate member
      await this.addSyndicateMember(syndicate.id, {
        userId: syndicateData.leadInvestorId,
        role: 'LEAD',
        commitmentAmount: 0, // Will be set when joining deals
        joinedAt: new Date(),
        addedBy: userId,
      });

      // Add co-lead investors if provided
      if (syndicateData.coLeadInvestorIds) {
        for (const coLeadId of syndicateData.coLeadInvestorIds) {
          await this.addSyndicateMember(syndicate.id, {
            userId: coLeadId,
            role: 'CO_LEAD',
            commitmentAmount: 0,
            joinedAt: new Date(),
            addedBy: userId,
          });
        }
      }

      logger.info('Syndicate created', {
        syndicateId: syndicate.id,
        createdBy: userId,
        leadInvestorId: syndicateData.leadInvestorId,
      });

      sendSuccess(res, {
        id: syndicate.id,
        name: syndicate.name,
        status: syndicate.status,
        lead_investor_id: syndicateData.leadInvestorId,
        created_at: syndicate.createdAt,
      }, 'Syndicate created successfully', 201);

    } catch (error) {
      next(error);
    }
  }

  // Get syndicate by ID
  async getSyndicateById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as unknown as SyndicateParams;

      const syndicate = await this.findSyndicateById(id);
      if (!syndicate) {
        throw new AppError('Syndicate not found', 404, 'SYNDICATE_NOT_FOUND');
      }

      // Get syndicate members
      const members = await this.getSyndicateMembers(id);
      const deals = await this.getSyndicateDeals(id);
      const performance = await this.getSyndicatePerformance(id);

      sendSuccess(res, {
        id: syndicate.id,
        name: syndicate.name,
        description: syndicate.description,
        status: syndicate.status,
        target_amount: syndicate.targetAmount,
        minimum_investment: syndicate.minimumInvestment,
        max_investors: syndicate.maxInvestors,
        current_amount: syndicate.currentAmount,
        investor_count: syndicate.investorCount,
        investment_terms: syndicate.investmentTerms,
        legal_structure: syndicate.legalStructure,
        is_active: syndicate.isActive,
        lead_investor_id: syndicate.leadInvestorId,
        members: members,
        deals: deals,
        performance: performance,
        created_at: syndicate.createdAt,
        updated_at: syndicate.updatedAt,
      }, 'Syndicate retrieved successfully');

    } catch (error) {
      next(error);
    }
  }

  // List syndicates
  async listSyndicates(req: Request, res: Response, next: NextFunction) {
    try {
      const queryParams = req.query;
      const {
        status,
        type,
        investmentFocus,
        minCommitment,
        maxCommitment,
        sectors,
        geographies,
        isPublic,
        search,
        page,
        limit,
        sortBy,
        sortOrder,
      } = queryParams as any;

      const result = await this.getSyndicatesList({
        status,
        type,
        investmentFocus,
        minCommitment: minCommitment ? parseFloat(minCommitment) : undefined,
        maxCommitment: maxCommitment ? parseFloat(maxCommitment) : undefined,
        sectors: sectors ? (Array.isArray(sectors) ? sectors : [sectors]) : undefined,
        geographies: geographies ? (Array.isArray(geographies) ? geographies : [geographies]) : undefined,
        isPublic: isPublic === 'true',
        search,
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
        sortBy,
        sortOrder,
      });

      sendSuccess(res, {
        syndicates: result.syndicates,
        pagination: result.pagination,
      }, 'Syndicates retrieved successfully');

    } catch (error) {
      next(error);
    }
  }

  // Update syndicate
  async updateSyndicate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params as unknown as SyndicateParams;
      const updateData: UpdateSyndicateData = req.body;

      // Check if user is lead investor or admin
      const syndicate = await this.findSyndicateById(id);
      if (!syndicate) {
        throw new AppError('Syndicate not found', 404, 'SYNDICATE_NOT_FOUND');
      }

      if (syndicate.leadInvestorId !== userId && req.user?.role !== 'ADMIN') {
        throw new AppError('Not authorized to update this syndicate', 403, 'NOT_AUTHORIZED');
      }

      // Update syndicate
      const updatedSyndicate = await this.updateSyndicateInDb(id, updateData);

      logger.info('Syndicate updated', { syndicateId: id, updatedBy: userId });

      sendSuccess(res, {
        id: updatedSyndicate.id,
        name: updatedSyndicate.name,
        updated_at: updatedSyndicate.updatedAt,
      }, 'Syndicate updated successfully');

    } catch (error) {
      next(error);
    }
  }

  // Update syndicate settings
  async updateSyndicateSettings(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params as unknown as SyndicateParams;
      const settingsData = req.body;

      // Check if user is lead investor or admin
      const syndicate = await this.findSyndicateById(id);
      if (!syndicate) {
        throw new AppError('Syndicate not found', 404, 'SYNDICATE_NOT_FOUND');
      }

      if (syndicate.leadInvestorId !== userId && req.user?.role !== 'ADMIN') {
        throw new AppError('Not authorized to update syndicate settings', 403, 'NOT_AUTHORIZED');
      }

      // Update syndicate settings
      const updatedSyndicate = await this.updateSyndicateSettingsInDb(id, settingsData);

      logger.info('Syndicate settings updated', { syndicateId: id, updatedBy: userId });

      sendSuccess(res, {
        id: updatedSyndicate.id,
        investment_terms: updatedSyndicate.investmentTerms,
        updated_at: updatedSyndicate.updatedAt,
      }, 'Syndicate settings updated successfully');

    } catch (error) {
      next(error);
    }
  }

  // Join syndicate
  async joinSyndicate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params as unknown as SyndicateParams;
      const { commitmentAmount, message, agreedToTerms } = req.body;

      // Check if user is accredited
      const user = await this.findUserById(userId);
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      if (user.userProfile?.accreditationStatus !== 'VERIFIED') {
        throw new AppError('Accreditation required to join syndicate', 403, 'ACCREDITATION_REQUIRED');
      }

      // Check if syndicate exists and is accepting members
      const syndicate = await this.findSyndicateById(id);
      if (!syndicate) {
        throw new AppError('Syndicate not found', 404, 'SYNDICATE_NOT_FOUND');
      }

      if (syndicate.status !== 'FORMING' && syndicate.status !== 'ACTIVE') {
        throw new AppError('Syndicate is not accepting new members', 400, 'SYNDICATE_NOT_ACCEPTING_MEMBERS');
      }

      // Check if user is already a member
      const existingMembership = await this.findSyndicateMembership(id, userId);
      if (existingMembership) {
        throw new AppError('Already a member of this syndicate', 409, 'ALREADY_MEMBER');
      }

      // Check if syndicate is at max capacity
      const memberCount = await this.getSyndicateMemberCount(id);
      const maxInvestors = syndicate.maxInvestors || 100; // Default to 100 if not set
      if (memberCount >= maxInvestors) {
        throw new AppError('Syndicate is at maximum capacity', 400, 'SYNDICATE_FULL');
      }

      // Create membership request
      const membership = await this.createSyndicateMembership(id, {
        userId,
        role: 'MEMBER',
        commitmentAmount,
        status: 'COMMITTED', // Default status from schema
        message,
        agreedToTerms,
        joinedAt: new Date(),
      });

      logger.info('User joined syndicate', {
        syndicateId: id,
        userId,
        commitmentAmount,
        status: membership.status,
      });

      sendSuccess(res, {
        id: membership.id,
        syndicate_id: id,
        status: membership.status,
        joined_at: membership.commitmentDate,
      }, 'Syndicate membership request submitted successfully', 201);

    } catch (error) {
      next(error);
    }
  }

  // Leave syndicate
  async leaveSyndicate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params as unknown as SyndicateParams;

      // Check if user is a member
      const membership = await this.findSyndicateMembership(id, userId);
      if (!membership) {
        throw new AppError('Not a member of this syndicate', 404, 'NOT_MEMBER');
      }

      // Check if user is lead investor (cannot leave)
      const syndicate = await this.findSyndicateById(id);
      if (syndicate?.leadInvestorId === userId) {
        throw new AppError('Lead investor cannot leave syndicate', 400, 'LEAD_CANNOT_LEAVE');
      }

      // Remove membership
      await this.removeSyndicateMembership(id, userId);

      logger.info('User left syndicate', { syndicateId: id, userId });

      sendSuccess(res, null, 'Successfully left syndicate');

    } catch (error) {
      next(error);
    }
  }

  // Update member role
  async updateMemberRole(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id, memberId } = req.params as unknown as SyndicateParams & { memberId: string };
      const { role, notes } = req.body;

      // Check if user is lead investor or admin
      const syndicate = await this.findSyndicateById(id);
      if (!syndicate) {
        throw new AppError('Syndicate not found', 404, 'SYNDICATE_NOT_FOUND');
      }

      if (syndicate.leadInvestorId !== userId && req.user?.role !== 'ADMIN') {
        throw new AppError('Not authorized to update member roles', 403, 'NOT_AUTHORIZED');
      }

      // Update member role
      const updatedMembership = await this.updateSyndicateMemberRole(memberId, {
        role,
        notes,
        updatedBy: userId,
      });

      logger.info('Syndicate member role updated', {
        syndicateId: id,
        memberId,
        newRole: role,
        updatedBy: userId,
      });

      sendSuccess(res, {
        id: updatedMembership.id,
        role: updatedMembership.role,
        updated_at: updatedMembership.updatedAt,
      }, 'Member role updated successfully');

    } catch (error) {
      next(error);
    }
  }

  // Get syndicate members
  async getSyndicateMembersList(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as unknown as SyndicateParams;
      const queryParams = req.query;

      const {
        role,
        status,
        minCommitment,
        joinedAfter,
        joinedBefore,
        page,
        limit,
        sortBy,
        sortOrder,
      } = queryParams as any;

      // Check if syndicate exists
      const syndicate = await this.findSyndicateById(id);
      if (!syndicate) {
        throw new AppError('Syndicate not found', 404, 'SYNDICATE_NOT_FOUND');
      }

      const result = await this.getSyndicateMembersWithFilters(id, {
        role,
        status,
        minCommitment: minCommitment ? parseFloat(minCommitment) : undefined,
        joinedAfter,
        joinedBefore,
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
        sortBy,
        sortOrder,
      });

      sendSuccess(res, {
        members: result.members,
        pagination: result.pagination,
      }, 'Syndicate members retrieved successfully');

    } catch (error) {
      next(error);
    }
  }

  // Create syndicate deal
  async createSyndicateDeal(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params as unknown as SyndicateParams;
      const dealData = req.body;

      // Check if user is lead investor
      const syndicate = await this.findSyndicateById(id);
      if (!syndicate) {
        throw new AppError('Syndicate not found', 404, 'SYNDICATE_NOT_FOUND');
      }

      if (syndicate.leadInvestorId !== userId) {
        throw new AppError('Only lead investor can create syndicate deals', 403, 'NOT_AUTHORIZED');
      }

      // Check if pitch exists and is active
      const pitch = await this.findPitchById(dealData.pitchId);
      if (!pitch) {
        throw new AppError('Pitch not found', 404, 'PITCH_NOT_FOUND');
      }

      if (pitch.status !== 'ACTIVE') {
        throw new AppError('Pitch is not active', 400, 'PITCH_NOT_ACTIVE');
      }

      // Create syndicate deal
      const deal = await this.createSyndicateDealInDb({
        ...dealData,
        syndicateId: id,
        createdBy: userId,
      });

      logger.info('Syndicate deal created', {
        syndicateId: id,
        dealId: deal.id,
        pitchId: dealData.pitchId,
        createdBy: userId,
      });

      sendSuccess(res, {
        id: deal.id,
        syndicate_id: id,
        pitch_id: deal.pitchId,
        target_amount: deal.terms.targetAmount,
        voting_deadline: deal.votingDeadline,
        created_at: deal.createdAt,
      }, 'Syndicate deal created successfully', 201);

    } catch (error) {
      next(error);
    }
  }

  // Helper methods
  private async getSyndicatePerformance(syndicateId: string) {
    try {
      // Get syndicate investments
      const investments = await prisma.syndicateInvestment.findMany({
        where: { syndicateId },
        include: { investor: true },
      });

      const totalInvested = investments.reduce((sum, inv) => sum + Number(inv.amount), 0);
      const totalDeals = new Set(investments.map(inv => inv.id)).size;

      return {
        totalDeals,
        totalInvested,
        activeDeals: totalDeals, // Simplified - would need more complex logic
        exitedDeals: 0,
        totalReturn: 0, // Would need to calculate based on exits
        averageReturn: 0,
      };
    } catch (error) {
      logger.error('Error calculating syndicate performance', { syndicateId, error });
      return {
        totalDeals: 0,
        totalInvested: 0,
        activeDeals: 0,
        exitedDeals: 0,
        totalReturn: 0,
        averageReturn: 0,
      };
    }
  }

  private async getSyndicateDeals(syndicateId: string) {
    try {
      // For now, return empty array as syndicate deals might be stored differently
      // In a full implementation, you might have a SyndicateDeal model
      return [];
    } catch (error) {
      logger.error('Error getting syndicate deals', { syndicateId, error });
      return [];
    }
  }

  private async getSyndicateMemberCount(syndicateId: string): Promise<number> {
    try {
      return await prisma.syndicateInvestment.count({
        where: { syndicateId },
      });
    } catch (error) {
      logger.error('Error getting syndicate member count', { syndicateId, error });
      return 0;
    }
  }

  // Database operations (these would typically be in a service layer)
  private async findSyndicateById(id: string) {
    try {
      return await prisma.syndicate.findUnique({
        where: { id },
      });
    } catch (error) {
      logger.error('Error finding syndicate by ID', { id, error });
      throw error;
    }
  }

  private async findUserById(id: string) {
    try {
      return await prisma.user.findUnique({
        where: { id },
        include: {
          userProfile: true,
        },
      });
    } catch (error) {
      logger.error('Error finding user by ID', { id, error });
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

  private async findSyndicateMembership(syndicateId: string, userId: string) {
    try {
      return await prisma.syndicateInvestment.findFirst({
        where: {
          syndicateId,
          investorId: userId,
        },
      });
    } catch (error) {
      logger.error('Error finding syndicate membership', { syndicateId, userId, error });
      throw error;
    }
  }

  private async createSyndicateInDb(syndicateData: any) {
    try {
      const { createdBy, leadInvestorId, ...data } = syndicateData;

      return await prisma.syndicate.create({
        data: {
          ...data,
          leadInvestorId,
        },
      });
    } catch (error) {
      logger.error('Error creating syndicate in database', { error });
      throw error;
    }
  }

  private async updateSyndicateInDb(id: string, updateData: any) {
    try {
      return await prisma.syndicate.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      logger.error('Error updating syndicate in database', { id, error });
      throw error;
    }
  }

  private async updateSyndicateSettingsInDb(id: string, settingsData: any) {
    try {
      return await prisma.syndicate.update({
        where: { id },
        data: {
          investmentTerms: settingsData,
        },
      });
    } catch (error) {
      logger.error('Error updating syndicate settings in database', { id, error });
      throw error;
    }
  }

  private async addSyndicateMember(syndicateId: string, memberData: any) {
    try {
      const { userId, commitmentAmount } = memberData;

      await prisma.syndicateInvestment.create({
        data: {
          syndicateId,
          investorId: userId,
          amount: commitmentAmount,
          status: 'COMMITTED',
        },
      });
    } catch (error) {
      logger.error('Error adding syndicate member', { syndicateId, error });
      throw error;
    }
  }

  private async createSyndicateMembership(syndicateId: string, membershipData: any) {
    try {
      const { userId, commitmentAmount, status } = membershipData;

      return await prisma.syndicateInvestment.create({
        data: {
          syndicateId,
          investorId: userId,
          amount: commitmentAmount,
          status: status || 'COMMITTED',
        },
      });
    } catch (error) {
      logger.error('Error creating syndicate membership', { syndicateId, error });
      throw error;
    }
  }

  private async removeSyndicateMembership(syndicateId: string, userId: string) {
    try {
      await prisma.syndicateInvestment.deleteMany({
        where: {
          syndicateId,
          investorId: userId,
        },
      });
    } catch (error) {
      logger.error('Error removing syndicate membership', { syndicateId, userId, error });
      throw error;
    }
  }

  private async updateSyndicateMemberRole(memberId: string, updateData: any) {
    try {
      // For now, this is a placeholder as we don't have a separate member role field
      // In a full implementation, you might have a SyndicateMember model
      return {
        id: memberId,
        ...updateData,
        updatedAt: new Date(),
      };
    } catch (error) {
      logger.error('Error updating syndicate member role', { memberId, error });
      throw error;
    }
  }

  private async getSyndicateMembers(syndicateId: string) {
    try {
      const members = await prisma.syndicateInvestment.findMany({
        where: { syndicateId },
        include: {
          investor: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              email: true,
            },
          },
        },
      });

      return members.map(member => ({
        id: member.investor.id,
        name: member.investor.name,
        avatar_url: member.investor.avatarUrl,
        email: member.investor.email,
        role: 'MEMBER', // Would need to be stored separately
        commitment_amount: member.amount,
        joined_at: member.commitmentDate,
        status: member.status,
      }));
    } catch (error) {
      logger.error('Error getting syndicate members', { syndicateId, error });
      return [];
    }
  }

  private async getSyndicateMembersWithFilters(syndicateId: string, filters: any) {
    try {
      const { page, limit, status, minCommitment, joinedAfter, joinedBefore, sortBy, sortOrder } = filters;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = { syndicateId };

      if (status) where.status = status;
      if (minCommitment !== undefined) where.amount = { gte: minCommitment };

      if (joinedAfter || joinedBefore) {
        where.commitmentDate = {};
        if (joinedAfter) where.commitmentDate.gte = new Date(joinedAfter);
        if (joinedBefore) where.commitmentDate.lte = new Date(joinedBefore);
      }

      const members = await prisma.syndicateInvestment.findMany({
        where,
        include: {
          investor: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              email: true,
            },
          },
        },
        orderBy: sortBy ? { [sortBy]: sortOrder || 'asc' } : { commitmentDate: 'desc' },
        skip,
        take: limit,
      });

      const total = await prisma.syndicateInvestment.count({ where });

      return {
        members: members.map(member => ({
          id: member.investor.id,
          name: member.investor.name,
          avatar_url: member.investor.avatarUrl,
          email: member.investor.email,
          commitment_amount: member.amount,
          joined_at: member.commitmentDate,
          status: member.status,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error getting syndicate members with filters', { syndicateId, filters, error });
      throw error;
    }
  }

  private async createSyndicateDealInDb(dealData: any) {
    try {
      // For now, return a mock deal
      // In a full implementation, you would create a SyndicateDeal record
      return {
        id: `syndicate_deal_${Date.now()}`,
        ...dealData,
        createdAt: new Date(),
      };
    } catch (error) {
      logger.error('Error creating syndicate deal in database', { error });
      throw error;
    }
  }

  private async getSyndicatesList(filters: any) {
    try {
      const {
        page, limit, status, type, investmentFocus, minCommitment, maxCommitment,
        isPublic, search, sortBy, sortOrder
      } = filters;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {};

      if (status) where.status = status;
      if (type) where.legalStructure = type; // Map to legalStructure field
      if (investmentFocus) where.investmentFocus = investmentFocus;
      if (isPublic !== undefined) where.isActive = isPublic;

      if (minCommitment !== undefined || maxCommitment !== undefined) {
        where.minimumInvestment = {};
        if (minCommitment !== undefined) where.minimumInvestment.gte = minCommitment;
        if (maxCommitment !== undefined) where.minimumInvestment.lte = maxCommitment;
      }

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }

      const syndicates = await prisma.syndicate.findMany({
        where,
        orderBy: sortBy ? { [sortBy]: sortOrder || 'asc' } : { createdAt: 'desc' },
        skip,
        take: limit,
      });

      const total = await prisma.syndicate.count({ where });

      return {
        syndicates,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error getting syndicates list', { filters, error });
      throw error;
    }
  }

  /**
   * Apply to join syndicate (for application-required syndicates)
   * POST /api/syndicates/:id/apply
   */
  async applySyndicate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params;

      // Check if syndicate exists
      const syndicate = await prisma.syndicate.findUnique({
        where: { id },
      });

      if (!syndicate) {
        throw new AppError('Syndicate not found', 404, 'SYNDICATE_NOT_FOUND');
      }

      // Check if already a member
      const existingMember = await prisma.syndicateMember.findFirst({
        where: {
          syndicateId: id,
          userId,
        },
      });

      if (existingMember) {
        throw new AppError('Already a member of this syndicate', 400, 'ALREADY_MEMBER');
      }

      // Create application record (in a real app, this would be a separate ApplicationRequest model)
      // For now, just create the member with PENDING status
      const application = await prisma.syndicateMember.create({
        data: {
          syndicateId: id,
          userId,
          role: 'MEMBER',
          status: 'PENDING',
          joinedAt: new Date(),
        },
      });

      logger.info('Syndicate application submitted', { userId, syndicateId: id });

      sendSuccess(res, {
        applicationId: application.id,
        status: 'PENDING',
        message: 'Application submitted successfully',
      }, 'Application submitted', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Commit to syndicate investment
   * POST /api/syndicates/:id/commit
   */
  async commitToSyndicate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { id } = req.params;
      const { amount } = req.body;

      if (!amount || amount <= 0) {
        throw new AppError('Valid commitment amount is required', 400, 'INVALID_AMOUNT');
      }

      // Get syndicate details
      const syndicate = await prisma.syndicate.findUnique({
        where: { id },
      });

      if (!syndicate) {
        throw new AppError('Syndicate not found', 404, 'SYNDICATE_NOT_FOUND');
      }

      // Validate against minimum investment
      if (amount < Number(syndicate.minimumInvestment)) {
        throw new AppError(
          `Minimum commitment is ${syndicate.minimumInvestment}`,
          400,
          'BELOW_MINIMUM'
        );
      }

      // Calculate fees
      const managementFee = Number(syndicate.managementFee || 0);
      const setupFee = 500; // Could be configurable
      const managementFeeAmount = (amount * managementFee) / 100;
      const totalDue = amount + setupFee + managementFeeAmount;

      // Create commitment record (in a real app, use a Commitment model)
      // For now, store as JSON in syndicateMember
      const member = await prisma.syndicateMember.upsert({
        where: {
          syndicateId_userId: {
            syndicateId: id,
            userId,
          },
        },
        create: {
          syndicateId: id,
          userId,
          role: 'MEMBER',
          status: 'ACTIVE',
          joinedAt: new Date(),
          commitment: amount,
        },
        update: {
          commitment: amount,
        },
      });

      logger.info('Syndicate commitment created', { userId, syndicateId: id, amount });

      sendSuccess(res, {
        commitmentId: member.id,
        amount,
        setupFee,
        managementFee: managementFeeAmount,
        totalDue,
      }, 'Commitment created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get payment info for commitment
   * GET /api/syndicates/commitments/:commitmentId/payment-info
   */
  async getCommitmentPaymentInfo(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { commitmentId } = req.params;

      // Get commitment (syndicateMember)
      const commitment = await prisma.syndicateMember.findUnique({
        where: { id: commitmentId },
        include: {
          syndicate: true,
          user: true,
        },
      });

      if (!commitment) {
        throw new AppError('Commitment not found', 404, 'COMMITMENT_NOT_FOUND');
      }

      if (commitment.userId !== userId) {
        throw new AppError('Not authorized', 403, 'NOT_AUTHORIZED');
      }

      const amount = Number(commitment.commitment || 0);
      const managementFee = Number(commitment.syndicate.managementFee || 0);
      const setupFee = 500;
      const managementFeeAmount = (amount * managementFee) / 100;
      const totalDue = amount + setupFee + managementFeeAmount;

      // Mock payment methods (in real app, fetch from payment service)
      const paymentMethods = [
        {
          id: 'pm_bank_1',
          type: 'BANK_ACCOUNT',
          bankName: 'Chase Bank',
          accountType: 'CHECKING',
          last4: '1234',
          isDefault: true,
        },
      ];

      sendSuccess(res, {
        commitment: {
          id: commitment.id,
          amount,
          setupFee,
          managementFee: managementFeeAmount,
          totalDue,
        },
        syndicate: {
          id: commitment.syndicate.id,
          name: commitment.syndicate.name,
          slug: commitment.syndicate.slug,
        },
        paymentMethods,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Process payment for commitment
   * POST /api/syndicates/commitments/:commitmentId/pay
   */
  async processCommitmentPayment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { commitmentId } = req.params;
      const { paymentMethodId } = req.body;

      if (!paymentMethodId) {
        throw new AppError('Payment method is required', 400, 'MISSING_PAYMENT_METHOD');
      }

      // Get commitment
      const commitment = await prisma.syndicateMember.findUnique({
        where: { id: commitmentId },
        include: {
          syndicate: true,
        },
      });

      if (!commitment) {
        throw new AppError('Commitment not found', 404, 'COMMITMENT_NOT_FOUND');
      }

      if (commitment.userId !== userId) {
        throw new AppError('Not authorized', 403, 'NOT_AUTHORIZED');
      }

      const amount = Number(commitment.commitment || 0);
      const managementFee = Number(commitment.syndicate.managementFee || 0);
      const setupFee = 500;
      const managementFeeAmount = (amount * managementFee) / 100;
      const totalDue = amount + setupFee + managementFeeAmount;

      // In a real implementation:
      // 1. Process payment via Stripe
      // 2. Create Payment record in database
      // 3. Update commitment status to PAID
      // 4. Send confirmation email

      // Mock payment processing
      const paymentId = `pay_${Date.now()}`;

      logger.info('Commitment payment processed', {
        userId,
        commitmentId,
        amount: totalDue,
        paymentMethodId,
      });

      sendSuccess(res, {
        paymentId,
        status: 'PROCESSING',
        message: 'Payment initiated successfully',
      }, 'Payment processed successfully', 201);
    } catch (error) {
      next(error);
    }
  }
}

// Export singleton instance
export const syndicateController = new SyndicateController();
export default syndicateController;