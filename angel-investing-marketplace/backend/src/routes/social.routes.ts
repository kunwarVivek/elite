import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

/**
 * Social Features Routes
 * Handles news feed, forums, and community features
 */

// ============================================================================
// NEWS FEED
// ============================================================================

/**
 * GET /api/social/feed
 * Get personalized news feed for user
 */
router.get('/feed', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { page = '1', limit = '20' } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    // Get user's portfolio companies for personalized feed
    let companyIds: string[] = [];
    if (userId) {
      const investments = await prisma.investment.findMany({
        where: { investorId: userId },
        select: {
          pitch: {
            select: { startupId: true },
          },
        },
      });
      companyIds = investments.map((inv) => inv.pitch.startupId);
    }

    // Fetch updates from portfolio companies + public updates
    const where: any = {
      status: 'PUBLISHED',
      OR: [
        { startupId: { in: companyIds } },
        { isHighlighted: true },
      ],
    };

    const updates = await prisma.companyUpdate.findMany({
      where,
      skip,
      take,
      orderBy: [
        { isPinned: 'desc' },
        { publishedAt: 'desc' },
      ],
      include: {
        startup: {
          select: {
            id: true,
            name: true,
            industry: true,
            logoUrl: true,
          },
        },
        author: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            reactions: true,
            comments: true,
          },
        },
      },
    });

    const total = await prisma.companyUpdate.count({ where });

    return res.status(200).json({
      success: true,
      data: {
        feed: updates,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          totalPages: Math.ceil(total / parseInt(limit as string)),
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching feed:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch news feed',
      error: error.message,
    });
  }
});

/**
 * GET /api/social/trending
 * Get trending topics and updates
 */
router.get('/trending', async (req: Request, res: Response) => {
  try {
    const { limit = '10' } = req.query;

    // Get most engaged updates from last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const trendingUpdates = await prisma.companyUpdate.findMany({
      where: {
        status: 'PUBLISHED',
        publishedAt: {
          gte: sevenDaysAgo,
        },
      },
      take: parseInt(limit as string),
      orderBy: [
        { reactionCount: 'desc' },
        { viewCount: 'desc' },
      ],
      include: {
        startup: {
          select: {
            id: true,
            name: true,
            industry: true,
            logoUrl: true,
          },
        },
        author: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Get trending topics (most used tags)
    const allUpdates = await prisma.companyUpdate.findMany({
      where: {
        status: 'PUBLISHED',
        publishedAt: {
          gte: sevenDaysAgo,
        },
      },
      select: {
        tags: true,
      },
    });

    const tagCounts: Record<string, number> = {};
    allUpdates.forEach((update) => {
      update.tags.forEach((tag) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    const trendingTags = Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));

    return res.status(200).json({
      success: true,
      data: {
        trendingUpdates,
        trendingTags,
      },
    });
  } catch (error: any) {
    console.error('Error fetching trending:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch trending content',
      error: error.message,
    });
  }
});

// ============================================================================
// INVESTOR PROFILES
// ============================================================================

/**
 * GET /api/social/profiles/:userId
 * Get public investor profile
 */
router.get('/profiles/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const profile = await prisma.userProfile.findUnique({
      where: { userId },
    });

    // Get investment statistics
    const investments = await prisma.investment.findMany({
      where: {
        investorId: userId,
        status: 'COMPLETED',
      },
      include: {
        pitch: {
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
        },
      },
    });

    const stats = {
      totalInvestments: investments.length,
      totalInvested: investments.reduce((sum, inv) => sum + parseFloat(inv.amount.toString()), 0),
      industries: [...new Set(investments.map((inv) => inv.pitch.startup.industry))],
      stages: [...new Set(investments.map((inv) => inv.pitch.startup.stage))],
    };

    // Get syndicates led
    const syndicatesLed = await prisma.syndicate.findMany({
      where: { leadInvestorId: userId },
      select: {
        id: true,
        name: true,
        status: true,
        investorCount: true,
        currentAmount: true,
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        user,
        profile,
        stats,
        syndicatesLed,
        recentInvestments: investments.slice(0, 5),
      },
    });
  } catch (error: any) {
    console.error('Error fetching profile:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: error.message,
    });
  }
});

/**
 * PUT /api/social/profiles/me
 * Update current user's profile
 */
router.put('/profiles/me', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const {
      bio,
      location,
      linkedinUrl,
      twitterUrl,
      websiteUrl,
      investmentRangeMin,
      investmentRangeMax,
      preferredIndustries,
    } = req.body;

    // Upsert profile
    const profile = await prisma.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        bio,
        location,
        linkedinUrl,
        twitterUrl,
        websiteUrl,
        investmentRangeMin,
        investmentRangeMax,
        preferredIndustries,
      },
      update: {
        bio,
        location,
        linkedinUrl,
        twitterUrl,
        websiteUrl,
        investmentRangeMin,
        investmentRangeMax,
        preferredIndustries,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: { profile },
    });
  } catch (error: any) {
    console.error('Error updating profile:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message,
    });
  }
});

/**
 * GET /api/social/network
 * Get network of investors with similar interests
 */
router.get('/network', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { page = '1', limit = '20', industry } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    // Get users with public profiles
    const where: any = {
      id: { not: userId },
      role: 'INVESTOR',
    };

    const users = await prisma.user.findMany({
      where,
      skip,
      take,
      select: {
        id: true,
        name: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    // Get profiles for these users
    const userIds = users.map((u) => u.id);
    const profiles = await prisma.userProfile.findMany({
      where: { userId: { in: userIds } },
    });

    // Get investment counts for each user
    const investmentCounts = await prisma.investment.groupBy({
      by: ['investorId'],
      where: {
        investorId: { in: userIds },
        status: 'COMPLETED',
      },
      _count: {
        id: true,
      },
    });

    const network = users.map((user) => {
      const profile = profiles.find((p) => p.userId === user.id);
      const investmentCount =
        investmentCounts.find((ic) => ic.investorId === user.id)?._count.id || 0;

      return {
        ...user,
        profile,
        investmentCount,
      };
    });

    const total = await prisma.user.count({ where });

    return res.status(200).json({
      success: true,
      data: {
        network,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          totalPages: Math.ceil(total / parseInt(limit as string)),
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching network:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch network',
      error: error.message,
    });
  }
});

// ============================================================================
// ACTIVITY & ENGAGEMENT
// ============================================================================

/**
 * GET /api/social/activity/:userId
 * Get user's recent activity
 */
router.get('/activity/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { limit = '20' } = req.query;

    // Get recent investments
    const recentInvestments = await prisma.investment.findMany({
      where: { investorId: userId },
      take: parseInt(limit as string),
      orderBy: { createdAt: 'desc' },
      include: {
        pitch: {
          include: {
            startup: {
              select: {
                id: true,
                name: true,
                logoUrl: true,
                industry: true,
              },
            },
          },
        },
      },
    });

    // Get recent comments
    const recentComments = await prisma.updateComment.findMany({
      where: { userId },
      take: parseInt(limit as string),
      orderBy: { createdAt: 'desc' },
      include: {
        update: {
          include: {
            startup: {
              select: {
                id: true,
                name: true,
                logoUrl: true,
              },
            },
          },
        },
      },
    });

    // Get recent reactions
    const recentReactions = await prisma.updateReaction.findMany({
      where: { userId },
      take: parseInt(limit as string),
      orderBy: { createdAt: 'desc' },
      include: {
        update: {
          include: {
            startup: {
              select: {
                id: true,
                name: true,
                logoUrl: true,
              },
            },
          },
        },
      },
    });

    // Combine and sort by date
    const activity = [
      ...recentInvestments.map((inv) => ({
        type: 'investment',
        data: inv,
        timestamp: inv.createdAt,
      })),
      ...recentComments.map((comment) => ({
        type: 'comment',
        data: comment,
        timestamp: comment.createdAt,
      })),
      ...recentReactions.map((reaction) => ({
        type: 'reaction',
        data: reaction,
        timestamp: reaction.createdAt,
      })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return res.status(200).json({
      success: true,
      data: { activity: activity.slice(0, parseInt(limit as string)) },
    });
  } catch (error: any) {
    console.error('Error fetching activity:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch activity',
      error: error.message,
    });
  }
});

export default router;
