import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../config/logger.js';

const prisma = new PrismaClient();

export class SpvController {
  /**
   * Get all SPVs user is part of (via syndicate membership or investments)
   * GET /api/spvs/my-spvs
   */
  async getMySpvs(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { status } = req.query;

      // Get SPVs where user is a syndicate member
      const userSyndicates = await prisma.syndicateMember.findMany({
        where: { userId },
        select: { syndicateId: true },
      });

      const syndicateIds = userSyndicates.map((sm) => sm.syndicateId);

      // Build SPV filter
      const whereClause: any = {
        OR: [
          // SPVs from user's syndicates
          { syndicateId: { in: syndicateIds } },
          // SPVs where user has investments
          {
            investments: {
              some: {
                investment: {
                  userId,
                },
              },
            },
          },
        ],
      };

      if (status) {
        whereClause.status = status;
      }

      const spvs = await prisma.spv.findMany({
        where: whereClause,
        include: {
          syndicate: {
            include: {
              leadInvestor: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          investments: {
            include: {
              investment: {
                select: {
                  userId: true,
                  amount: true,
                  status: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Transform SPVs to frontend format
      const transformedSpvs = spvs.map((spv) => {
        const userInvestment = spv.investments.find(
          (inv) => inv.investment.userId === userId
        );

        // Calculate stats
        const committed = spv.investments.reduce(
          (sum, inv) => sum + Number(inv.capitalCommitment),
          0
        );
        const investorCount = new Set(spv.investments.map((inv) => inv.investment.userId)).size;

        // Determine user role
        let userRole: 'LEAD' | 'INVESTOR' | 'ADMIN' | null = null;
        const isLead = spv.syndicate.leadInvestor.id === userId;
        if (isLead) {
          userRole = 'LEAD';
        } else if (userInvestment) {
          userRole = 'INVESTOR';
        }

        return {
          id: spv.id,
          name: spv.name,
          slug: spv.name.toLowerCase().replace(/\s+/g, '-') + '-' + spv.id.slice(-8),
          targetRaise: Number(spv.totalCapital),
          committed,
          investorCount,
          status: spv.status,
          dealType: 'SPV Investment', // Could be enhanced
          targetCompany: spv.syndicate.name, // Placeholder
          minimumInvestment: 10000, // Could be from syndicate settings
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Placeholder: 30 days from now
          managementFee: Number(spv.managementFee || 0),
          carriedInterest: Number(spv.carriedInterest || 0),
          createdAt: spv.createdAt,
          userRole,
          userCommitment: userInvestment
            ? Number(userInvestment.capitalCommitment)
            : undefined,
        };
      });

      res.json({
        success: true,
        data: transformedSpvs,
      });
    } catch (error) {
      logger.error('Error fetching user SPVs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch SPVs',
      });
    }
  }

  /**
   * Get SPV details by slug
   * GET /api/spvs/:slug
   */
  async getSpvBySlug(req: Request, res: Response) {
    try {
      const { slug } = req.params;
      const userId = (req as any).user?.id;

      // Extract SPV ID from slug (last 8 chars after final dash)
      const spvIdPart = slug.split('-').pop();

      // Find SPV by ID part
      const spv = await prisma.spv.findFirst({
        where: {
          id: {
            endsWith: spvIdPart || '',
          },
        },
        include: {
          syndicate: {
            include: {
              leadInvestor: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatarUrl: true,
                },
              },
            },
          },
          investments: {
            include: {
              investment: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      avatarUrl: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!spv) {
        return res.status(404).json({
          success: false,
          error: 'SPV not found',
        });
      }

      // Calculate stats
      const committed = spv.investments.reduce(
        (sum, inv) => sum + Number(inv.capitalCommitment),
        0
      );
      const investorCount = new Set(spv.investments.map((inv) => inv.investment.userId)).size;

      // Determine user role
      let userRole: 'LEAD' | 'INVESTOR' | 'ADMIN' | null = null;
      const userInvestment = userId
        ? spv.investments.find((inv) => inv.investment.userId === userId)
        : null;

      if (userId && spv.syndicate.leadInvestor.id === userId) {
        userRole = 'LEAD';
      } else if (userInvestment) {
        userRole = 'INVESTOR';
      }

      // Transform investors list
      const investors = spv.investments.map((inv) => ({
        id: inv.investment.user.id,
        name: inv.investment.user.name,
        avatarUrl: inv.investment.user.avatarUrl,
        commitment: Number(inv.capitalCommitment),
        joinedAt: inv.createdAt,
      }));

      const spvDetails = {
        id: spv.id,
        name: spv.name,
        slug,
        description: `SPV for ${spv.syndicate.name}`, // Placeholder
        targetRaise: Number(spv.totalCapital),
        committed,
        minimumInvestment: 10000, // From syndicate settings
        maximumInvestment: undefined,
        status: spv.status,
        dealType: 'SPV Investment',
        targetCompany: spv.syndicate.name,
        targetCompanyDescription: 'Target company description', // Placeholder
        investorCount,
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Placeholder
        closingDate: spv.formationDate || undefined,
        managementFee: Number(spv.managementFee || 0),
        carriedInterest: Number(spv.carriedInterest || 0),
        setupCost: 5000, // Placeholder
        createdAt: spv.createdAt,
        userRole,
        userCommitment: userInvestment
          ? Number(userInvestment.capitalCommitment)
          : undefined,
        leadInvestor: spv.syndicate.leadInvestor,
        documents: [], // Placeholder - could be fetched from document service
        investors,
        updates: [], // Placeholder - could be fetched from updates service
      };

      res.json({
        success: true,
        data: spvDetails,
      });
    } catch (error) {
      logger.error('Error fetching SPV details:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch SPV details',
      });
    }
  }

  /**
   * Create a new SPV
   * POST /api/spvs
   */
  async createSpv(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const {
        name,
        legalName,
        syndicateId,
        jurisdiction,
        totalCapital,
        managementFee,
        carriedInterest,
      } = req.body;

      // Verify user is syndicate lead
      const syndicate = await prisma.syndicate.findUnique({
        where: { id: syndicateId },
        include: { leadInvestor: true },
      });

      if (!syndicate || syndicate.leadInvestor.id !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Only syndicate leads can create SPVs',
        });
      }

      const spv = await prisma.spv.create({
        data: {
          name,
          legalName,
          syndicateId,
          jurisdiction,
          totalCapital,
          managementFee,
          carriedInterest,
          status: 'FORMING',
        },
      });

      res.status(201).json({
        success: true,
        data: spv,
      });
    } catch (error) {
      logger.error('Error creating SPV:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create SPV',
      });
    }
  }

  /**
   * Update SPV
   * PUT /api/spvs/:id
   */
  async updateSpv(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;
      const updateData = req.body;

      // Verify SPV exists and user is syndicate lead
      const spv = await prisma.spv.findUnique({
        where: { id },
        include: {
          syndicate: {
            include: { leadInvestor: true },
          },
        },
      });

      if (!spv) {
        return res.status(404).json({
          success: false,
          error: 'SPV not found',
        });
      }

      if (spv.syndicate.leadInvestor.id !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Only syndicate leads can update SPVs',
        });
      }

      const updatedSpv = await prisma.spv.update({
        where: { id },
        data: updateData,
      });

      res.json({
        success: true,
        data: updatedSpv,
      });
    } catch (error) {
      logger.error('Error updating SPV:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update SPV',
      });
    }
  }
}

export const spvController = new SpvController();
