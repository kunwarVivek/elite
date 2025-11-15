import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Reputation Service
 * Handles user reputation scoring, badges, and leaderboard
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface CreateBadgeData {
  name: string;
  slug: string;
  description: string;
  icon: string;
  category: string;
  tier: string;
  criteria: any;
}

export interface ReputationFilters {
  minScore?: number;
  maxScore?: number;
  level?: number;
}

export interface LeaderboardFilters {
  limit?: number;
  period?: 'all' | 'month' | 'week';
}

// ============================================================================
// Reputation Service Class
// ============================================================================

class ReputationService {
  /**
   * Get user's reputation
   */
  async getUserReputation(userId: string) {
    try {
      let reputation = await prisma.userReputation.findUnique({
        where: { userId },
      });

      // Create reputation if doesn't exist
      if (!reputation) {
        reputation = await this.initializeReputation(userId);
      }

      // Get badge details
      const badgeIds = (reputation.badges as any) || [];
      const badges = await prisma.badge.findMany({
        where: {
          id: {
            in: badgeIds,
          },
        },
      });

      return {
        ...reputation,
        badgeDetails: badges,
      };
    } catch (error) {
      logger.error('Error getting user reputation', { userId, error });
      throw new AppError('Failed to get reputation', 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Initialize reputation for new user
   */
  private async initializeReputation(userId: string) {
    try {
      const reputation = await prisma.userReputation.create({
        data: {
          userId,
          reputationScore: 0,
          level: 1,
          contributionScore: 0,
          investmentScore: 0,
          socialScore: 0,
          badges: [],
          achievements: [],
        },
      });

      logger.info('Reputation initialized', { userId });
      return reputation;
    } catch (error) {
      logger.error('Error initializing reputation', { userId, error });
      throw new AppError('Failed to initialize reputation', 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Calculate and update user reputation
   */
  async calculateReputation(userId: string) {
    try {
      // Get user data
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          investments: true,
          forumTopics: true,
          forumPosts: true,
          _count: {
            select: {
              investments: true,
              forumTopics: true,
              forumPosts: true,
            },
          },
        },
      });

      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Calculate investment score
      const totalInvested = user.investments.reduce(
        (sum, inv) => sum + parseFloat(inv.amount?.toString() || '0'),
        0
      );
      const investmentCount = user._count.investments;
      const investmentScore = Math.floor(
        (investmentCount * 10) + (totalInvested / 1000) // Points for investments
      );

      // Calculate contribution score
      const topicCount = user._count.forumTopics;
      const postCount = user._count.forumPosts;
      const contributionScore = (topicCount * 20) + (postCount * 5); // Points for forum activity

      // Calculate social score (likes, followers, etc.)
      const socialScore = 0; // Placeholder - can be enhanced with actual social metrics

      // Calculate total reputation score
      const reputationScore = investmentScore + contributionScore + socialScore;

      // Calculate level (every 100 points = 1 level)
      const level = Math.floor(reputationScore / 100) + 1;

      // Update reputation
      const reputation = await prisma.userReputation.upsert({
        where: { userId },
        create: {
          userId,
          reputationScore,
          level,
          investmentScore,
          contributionScore,
          socialScore,
          badges: [],
          achievements: [],
        },
        update: {
          reputationScore,
          level,
          investmentScore,
          contributionScore,
          socialScore,
          lastCalculatedAt: new Date(),
        },
      });

      logger.info('Reputation calculated', { userId, reputationScore, level });

      // Check for badge eligibility
      await this.checkBadgeEligibility(userId, reputation);

      return reputation;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error calculating reputation', { userId, error });
      throw new AppError('Failed to calculate reputation', 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Award badge to user
   */
  async awardBadge(userId: string, badgeId: string) {
    try {
      // Get badge
      const badge = await prisma.badge.findUnique({
        where: { id: badgeId },
      });

      if (!badge) {
        throw new AppError('Badge not found', 404, 'BADGE_NOT_FOUND');
      }

      if (!badge.isActive) {
        throw new AppError('Badge is not active', 400, 'BADGE_INACTIVE');
      }

      // Get user reputation
      let reputation = await prisma.userReputation.findUnique({
        where: { userId },
      });

      if (!reputation) {
        reputation = await this.initializeReputation(userId);
      }

      const currentBadges = (reputation.badges as any) || [];

      // Check if user already has badge
      if (currentBadges.includes(badgeId)) {
        throw new AppError('User already has this badge', 400, 'BADGE_ALREADY_AWARDED');
      }

      // Award badge
      const updatedReputation = await prisma.userReputation.update({
        where: { userId },
        data: {
          badges: [...currentBadges, badgeId],
        },
      });

      logger.info('Badge awarded', { userId, badgeId, badgeName: badge.name });

      return updatedReputation;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error awarding badge', { userId, badgeId, error });
      throw new AppError('Failed to award badge', 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Check badge eligibility and auto-award
   */
  async checkBadgeEligibility(userId: string, reputation?: any) {
    try {
      if (!reputation) {
        reputation = await this.getUserReputation(userId);
      }

      // Get all active badges
      const allBadges = await prisma.badge.findMany({
        where: { isActive: true },
      });

      const currentBadgeIds = (reputation.badges as any) || [];

      for (const badge of allBadges) {
        // Skip if already awarded
        if (currentBadgeIds.includes(badge.id)) {
          continue;
        }

        // Check criteria
        const criteria = badge.criteria as any;
        let eligible = false;

        if (criteria.minReputationScore && reputation.reputationScore >= criteria.minReputationScore) {
          eligible = true;
        }

        if (criteria.minLevel && reputation.level >= criteria.minLevel) {
          eligible = true;
        }

        if (criteria.minInvestmentScore && reputation.investmentScore >= criteria.minInvestmentScore) {
          eligible = true;
        }

        if (criteria.minContributionScore && reputation.contributionScore >= criteria.minContributionScore) {
          eligible = true;
        }

        // Auto-award if eligible
        if (eligible) {
          await this.awardBadge(userId, badge.id);
        }
      }
    } catch (error) {
      logger.error('Error checking badge eligibility', { userId, error });
      // Don't throw - this is a background check
    }
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(filters: LeaderboardFilters = {}) {
    try {
      const limit = filters.limit || 50;

      // For now, get all-time leaderboard
      // Can be enhanced with period filtering
      const leaderboard = await prisma.userReputation.findMany({
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: {
          reputationScore: 'desc',
        },
        take: limit,
      });

      // Get badge details for each user
      const leaderboardWithBadges = await Promise.all(
        leaderboard.map(async (entry) => {
          const badgeIds = (entry.badges as any) || [];
          const badges = await prisma.badge.findMany({
            where: {
              id: {
                in: badgeIds,
              },
            },
          });

          return {
            ...entry,
            badgeDetails: badges,
          };
        })
      );

      return leaderboardWithBadges;
    } catch (error) {
      logger.error('Error getting leaderboard', { filters, error });
      throw new AppError('Failed to get leaderboard', 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Get all badges
   */
  async getBadges(category?: string, tier?: string) {
    try {
      const whereClause: any = {
        isActive: true,
      };

      if (category) {
        whereClause.category = category;
      }

      if (tier) {
        whereClause.tier = tier;
      }

      const badges = await prisma.badge.findMany({
        where: whereClause,
        orderBy: [
          { tier: 'asc' },
          { name: 'asc' },
        ],
      });

      return badges;
    } catch (error) {
      logger.error('Error getting badges', { category, tier, error });
      throw new AppError('Failed to get badges', 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Get user's earned badges
   */
  async getUserBadges(userId: string) {
    try {
      const reputation = await this.getUserReputation(userId);
      const badgeIds = (reputation.badges as any) || [];

      const badges = await prisma.badge.findMany({
        where: {
          id: {
            in: badgeIds,
          },
        },
        orderBy: [
          { tier: 'desc' },
          { name: 'asc' },
        ],
      });

      return {
        badges,
        count: badges.length,
      };
    } catch (error) {
      logger.error('Error getting user badges', { userId, error });
      throw new AppError('Failed to get user badges', 500, 'DATABASE_ERROR');
    }
  }

  /**
   * Create badge (admin only)
   */
  async createBadge(data: CreateBadgeData) {
    try {
      const badge = await prisma.badge.create({
        data: {
          name: data.name,
          slug: data.slug,
          description: data.description,
          icon: data.icon,
          category: data.category as any,
          tier: data.tier as any,
          criteria: data.criteria,
          isActive: true,
        },
      });

      logger.info('Badge created', { badgeId: badge.id, name: badge.name });
      return badge;
    } catch (error) {
      logger.error('Error creating badge', { data, error });
      throw new AppError('Failed to create badge', 500, 'DATABASE_ERROR');
    }
  }
}

// Export singleton instance
export const reputationService = new ReputationService();
export default reputationService;
