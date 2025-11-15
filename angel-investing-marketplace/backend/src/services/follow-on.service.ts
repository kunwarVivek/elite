import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { AppError } from '../middleware/errorHandler.js';
import { notificationService } from './notification.service.js';

/**
 * Follow-On Investment Service
 * Handles pro-rata rights and follow-on investment opportunities for investors
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface CreateFollowOnOpportunityData {
  originalInvestmentId: string;
  investorId: string;
  startupId: string;
  roundId?: string;
  proRataRight: boolean;
  entitlement: number;
  notificationDate: Date;
  deadlineDate: Date;
}

export interface OpportunityFilters {
  status?: string;
  startupId?: string;
  expired?: boolean;
  page?: number;
  limit?: number;
}

export interface ExerciseRightData {
  amount: number;
  investmentId?: string;
}

// ============================================================================
// Follow-On Service Class
// ============================================================================

class FollowOnService {
  /**
   * Get follow-on opportunities for a user
   */
  async getOpportunities(userId: string, filters: OpportunityFilters = {}) {
    try {
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const skip = (page - 1) * limit;

      // Build where clause
      const whereClause: any = {
        investorId: userId,
      };

      if (filters.status) {
        whereClause.status = filters.status;
      }

      if (filters.startupId) {
        whereClause.startupId = filters.startupId;
      }

      if (filters.expired === false) {
        whereClause.deadlineDate = {
          gte: new Date(),
        };
      } else if (filters.expired === true) {
        whereClause.deadlineDate = {
          lt: new Date(),
        };
      }

      // Get opportunities
      const opportunities = await prisma.followOnInvestment.findMany({
        where: whereClause,
        include: {
          investor: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          startup: {
            select: {
              id: true,
              companyName: true,
              logo: true,
              industry: true,
            },
          },
        },
        orderBy: {
          deadlineDate: 'asc',
        },
        skip,
        take: limit,
      });

      // Check and update expired opportunities
      const now = new Date();
      for (const opp of opportunities) {
        if (
          opp.deadlineDate < now &&
          opp.status === 'OFFERED' &&
          !opp.exercised &&
          !opp.declined
        ) {
          await this.expireOpportunity(opp.id);
          opp.status = 'EXPIRED' as any;
        }
      }

      // Get total count
      const total = await prisma.followOnInvestment.count({
        where: whereClause,
      });

      return {
        opportunities,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error getting follow-on opportunities', { userId, filters, error });
      throw new AppError('Failed to get opportunities', 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Get opportunity by ID
   */
  async getOpportunityById(opportunityId: string, userId: string) {
    try {
      const opportunity = await prisma.followOnInvestment.findUnique({
        where: { id: opportunityId },
        include: {
          investor: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          startup: {
            select: {
              id: true,
              companyName: true,
              logo: true,
              industry: true,
              description: true,
              website: true,
            },
          },
        },
      });

      if (!opportunity) {
        throw new AppError('Opportunity not found', 404, 'OPPORTUNITY_NOT_FOUND');
      }

      // Check authorization
      if (opportunity.investorId !== userId) {
        throw new AppError('Not authorized to view this opportunity', 403, 'NOT_AUTHORIZED');
      }

      // Check if expired and update status
      if (
        opportunity.deadlineDate < new Date() &&
        opportunity.status === 'OFFERED' &&
        !opportunity.exercised &&
        !opportunity.declined
      ) {
        await this.expireOpportunity(opportunity.id);
        opportunity.status = 'EXPIRED' as any;
      }

      return opportunity;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error getting opportunity by ID', { opportunityId, userId, error });
      throw new AppError('Failed to get opportunity', 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Exercise pro-rata right
   */
  async exerciseRight(opportunityId: string, userId: string, data: ExerciseRightData) {
    try {
      // Get opportunity
      const opportunity = await this.getOpportunityById(opportunityId, userId);

      // Validate opportunity status
      if (opportunity.status !== 'OFFERED') {
        throw new AppError(
          `Cannot exercise opportunity with status ${opportunity.status}`,
          400,
          'INVALID_STATUS'
        );
      }

      if (opportunity.exercised) {
        throw new AppError('Opportunity already exercised', 400, 'ALREADY_EXERCISED');
      }

      if (opportunity.declined) {
        throw new AppError('Cannot exercise declined opportunity', 400, 'ALREADY_DECLINED');
      }

      // Check deadline
      if (opportunity.deadlineDate < new Date()) {
        await this.expireOpportunity(opportunity.id);
        throw new AppError('Opportunity has expired', 400, 'OPPORTUNITY_EXPIRED');
      }

      // Validate amount
      const exerciseAmount = data.amount;
      const maxAllocation = parseFloat(opportunity.entitlement.toString());
      const currentUsed = parseFloat(opportunity.allocationUsed.toString());
      const remaining = maxAllocation - currentUsed;

      if (exerciseAmount <= 0) {
        throw new AppError('Exercise amount must be positive', 400, 'INVALID_AMOUNT');
      }

      if (exerciseAmount > remaining) {
        throw new AppError(
          `Exercise amount exceeds remaining allocation (${remaining})`,
          400,
          'EXCEEDS_ALLOCATION'
        );
      }

      // Update opportunity
      const newUsed = currentUsed + exerciseAmount;
      const newRemaining = maxAllocation - newUsed;
      const fullyExercised = newRemaining <= 0;

      const updatedOpportunity = await prisma.followOnInvestment.update({
        where: { id: opportunityId },
        data: {
          allocationUsed: newUsed,
          allocationRemaining: newRemaining,
          exercised: fullyExercised,
          exercisedDate: fullyExercised ? new Date() : opportunity.exercisedDate,
          status: fullyExercised ? 'EXERCISED' : 'ACCEPTED',
        },
      });

      logger.info('Pro-rata right exercised', {
        opportunityId,
        userId,
        amount: exerciseAmount,
        fullyExercised,
      });

      // Send notification
      await this.sendExerciseNotification(updatedOpportunity, exerciseAmount);

      return updatedOpportunity;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error exercising pro-rata right', { opportunityId, userId, data, error });
      throw new AppError('Failed to exercise right', 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Decline opportunity
   */
  async declineOpportunity(opportunityId: string, userId: string) {
    try {
      // Get opportunity
      const opportunity = await this.getOpportunityById(opportunityId, userId);

      // Validate status
      if (opportunity.status !== 'OFFERED') {
        throw new AppError(
          `Cannot decline opportunity with status ${opportunity.status}`,
          400,
          'INVALID_STATUS'
        );
      }

      if (opportunity.exercised) {
        throw new AppError('Cannot decline exercised opportunity', 400, 'ALREADY_EXERCISED');
      }

      if (opportunity.declined) {
        throw new AppError('Opportunity already declined', 400, 'ALREADY_DECLINED');
      }

      // Update opportunity
      const updatedOpportunity = await prisma.followOnInvestment.update({
        where: { id: opportunityId },
        data: {
          declined: true,
          status: 'DECLINED',
        },
      });

      logger.info('Opportunity declined', { opportunityId, userId });

      // Send notification
      await this.sendDeclineNotification(updatedOpportunity);

      return updatedOpportunity;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error declining opportunity', { opportunityId, userId, error });
      throw new AppError('Failed to decline opportunity', 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Calculate allocation details
   */
  async calculateAllocation(opportunityId: string, userId: string) {
    try {
      const opportunity = await this.getOpportunityById(opportunityId, userId);

      const entitlement = parseFloat(opportunity.entitlement.toString());
      const used = parseFloat(opportunity.allocationUsed.toString());
      const remaining = parseFloat(opportunity.allocationRemaining.toString());

      const allocation = {
        entitlement,
        used,
        remaining,
        percentageUsed: entitlement > 0 ? (used / entitlement) * 100 : 0,
        percentageRemaining: entitlement > 0 ? (remaining / entitlement) * 100 : 0,
        canExercise: remaining > 0 && opportunity.status === 'OFFERED' && !opportunity.declined,
        isExpired: opportunity.deadlineDate < new Date(),
        daysUntilDeadline: Math.ceil(
          (opportunity.deadlineDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        ),
      };

      return allocation;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error calculating allocation', { opportunityId, userId, error });
      throw new AppError('Failed to calculate allocation', 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Create follow-on opportunities (admin only)
   */
  async createOpportunities(data: CreateFollowOnOpportunityData[]) {
    try {
      const opportunities = await prisma.$transaction(
        data.map((item) =>
          prisma.followOnInvestment.create({
            data: {
              originalInvestmentId: item.originalInvestmentId,
              investorId: item.investorId,
              startupId: item.startupId,
              roundId: item.roundId,
              proRataRight: item.proRataRight,
              entitlement: item.entitlement,
              allocationRemaining: item.entitlement,
              notificationDate: item.notificationDate,
              deadlineDate: item.deadlineDate,
              status: 'OFFERED',
            },
          })
        )
      );

      logger.info('Follow-on opportunities created', { count: opportunities.length });

      // Send notifications to investors
      for (const opportunity of opportunities) {
        await this.sendOpportunityNotification(opportunity);
      }

      return opportunities;
    } catch (error) {
      logger.error('Error creating follow-on opportunities', { data, error });
      throw new AppError('Failed to create opportunities', 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Expire an opportunity
   */
  private async expireOpportunity(opportunityId: string) {
    try {
      await prisma.followOnInvestment.update({
        where: { id: opportunityId },
        data: {
          status: 'EXPIRED',
        },
      });

      logger.info('Opportunity expired', { opportunityId });
    } catch (error) {
      logger.error('Error expiring opportunity', { opportunityId, error });
    }
  }

  /**
   * Send opportunity notification to investor
   */
  private async sendOpportunityNotification(opportunity: any) {
    try {
      await notificationService.createNotification({
        userId: opportunity.investorId,
        title: 'New Follow-On Investment Opportunity',
        message: `You have a new pro-rata investment opportunity. Deadline: ${opportunity.deadlineDate.toLocaleDateString()}`,
        type: 'FOLLOW_ON_OPPORTUNITY',
        relatedId: opportunity.id,
        priority: 'HIGH',
      });
    } catch (error) {
      logger.error('Error sending opportunity notification', { opportunityId: opportunity.id, error });
    }
  }

  /**
   * Send exercise notification
   */
  private async sendExerciseNotification(opportunity: any, amount: number) {
    try {
      await notificationService.createNotification({
        userId: opportunity.investorId,
        title: 'Pro-Rata Right Exercised',
        message: `You have exercised $${amount.toLocaleString()} of your pro-rata allocation.`,
        type: 'FOLLOW_ON_EXERCISED',
        relatedId: opportunity.id,
        priority: 'MEDIUM',
      });
    } catch (error) {
      logger.error('Error sending exercise notification', { opportunityId: opportunity.id, error });
    }
  }

  /**
   * Send decline notification
   */
  private async sendDeclineNotification(opportunity: any) {
    try {
      await notificationService.createNotification({
        userId: opportunity.investorId,
        title: 'Opportunity Declined',
        message: 'You have declined your pro-rata investment opportunity.',
        type: 'FOLLOW_ON_DECLINED',
        relatedId: opportunity.id,
        priority: 'LOW',
      });
    } catch (error) {
      logger.error('Error sending decline notification', { opportunityId: opportunity.id, error });
    }
  }
}

// Export singleton instance
export const followOnService = new FollowOnService();
export default followOnService;
