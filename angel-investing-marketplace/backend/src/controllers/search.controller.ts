import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../config/logger.js';

const prisma = new PrismaClient();

export class SearchController {
  /**
   * Global search across all entity types
   * GET /api/search?q=query&type=ENTITY_TYPE
   */
  async globalSearch(req: Request, res: Response) {
    try {
      const { q, type } = req.query;

      if (!q || typeof q !== 'string' || q.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Search query is required',
        });
      }

      const query = q.trim();
      const results: any[] = [];

      // Search based on type filter or search all if no type specified
      const searchTypes =
        type && typeof type === 'string'
          ? [type]
          : ['INVESTMENT', 'PITCH', 'SYNDICATE', 'SPV', 'USER', 'UPDATE'];

      // Search Investments
      if (searchTypes.includes('INVESTMENT')) {
        const investments = await prisma.investment.findMany({
          where: {
            OR: [
              { pitch: { title: { contains: query, mode: 'insensitive' } } },
              { pitch: { companyName: { contains: query, mode: 'insensitive' } } },
            ],
          },
          include: {
            pitch: true,
          },
          take: 10,
        });

        investments.forEach((inv) => {
          results.push({
            id: inv.id,
            type: 'INVESTMENT',
            title: inv.pitch?.title || 'Investment',
            description: `Investment of $${Number(inv.amount).toLocaleString()}`,
            url: `/investments/${inv.id}`,
            metadata: {
              amount: Number(inv.amount),
              status: inv.status,
              date: inv.createdAt,
            },
          });
        });
      }

      // Search Pitches
      if (searchTypes.includes('PITCH')) {
        const pitches = await prisma.pitch.findMany({
          where: {
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              { companyName: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } },
              { industry: { contains: query, mode: 'insensitive' } },
            ],
          },
          take: 10,
        });

        pitches.forEach((pitch) => {
          results.push({
            id: pitch.id,
            type: 'PITCH',
            title: pitch.title,
            description: pitch.description || '',
            url: `/pitches/${pitch.slug}`,
            metadata: {
              amount: Number(pitch.fundingGoal),
              status: pitch.status,
              date: pitch.createdAt,
            },
          });
        });
      }

      // Search Syndicates
      if (searchTypes.includes('SYNDICATE')) {
        const syndicates = await prisma.syndicate.findMany({
          where: {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } },
            ],
          },
          include: {
            _count: {
              select: { members: true },
            },
          },
          take: 10,
        });

        syndicates.forEach((syndicate) => {
          results.push({
            id: syndicate.id,
            type: 'SYNDICATE',
            title: syndicate.name,
            description: syndicate.description || '',
            url: `/syndicates/${syndicate.slug}`,
            metadata: {
              memberCount: syndicate._count.members,
              status: syndicate.status,
              date: syndicate.createdAt,
            },
          });
        });
      }

      // Search SPVs
      if (searchTypes.includes('SPV')) {
        const spvs = await prisma.spv.findMany({
          where: {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { legalName: { contains: query, mode: 'insensitive' } },
            ],
          },
          include: {
            _count: {
              select: { investments: true },
            },
          },
          take: 10,
        });

        spvs.forEach((spv) => {
          const slug = spv.name.toLowerCase().replace(/\s+/g, '-') + '-' + spv.id.slice(-8);
          results.push({
            id: spv.id,
            type: 'SPV',
            title: spv.name,
            description: spv.legalName,
            url: `/spvs/${slug}`,
            metadata: {
              amount: Number(spv.totalCapital),
              status: spv.status,
              date: spv.createdAt,
            },
          });
        });
      }

      // Search Users
      if (searchTypes.includes('USER')) {
        const users = await prisma.user.findMany({
          where: {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { email: { contains: query, mode: 'insensitive' } },
            ],
          },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatarUrl: true,
            createdAt: true,
          },
          take: 10,
        });

        users.forEach((user) => {
          results.push({
            id: user.id,
            type: 'USER',
            title: user.name,
            description: `${user.role} • ${user.email}`,
            url: `/users/${user.id}`,
            metadata: {
              avatarUrl: user.avatarUrl,
              date: user.createdAt,
            },
          });
        });
      }

      // Search Updates (Company Updates)
      if (searchTypes.includes('UPDATE')) {
        const updates = await prisma.companyUpdate.findMany({
          where: {
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              { content: { contains: query, mode: 'insensitive' } },
            ],
          },
          include: {
            pitch: {
              select: {
                id: true,
                title: true,
                slug: true,
              },
            },
          },
          take: 10,
        });

        updates.forEach((update) => {
          results.push({
            id: update.id,
            type: 'UPDATE',
            title: update.title,
            description: update.content?.substring(0, 200) + '...' || '',
            url: `/pitches/${update.pitch.slug}/updates/${update.id}`,
            metadata: {
              date: update.createdAt,
            },
          });
        });
      }

      // Sort results by relevance (for now, just by date)
      results.sort((a, b) => {
        const dateA = a.metadata.date ? new Date(a.metadata.date).getTime() : 0;
        const dateB = b.metadata.date ? new Date(b.metadata.date).getTime() : 0;
        return dateB - dateA;
      });

      res.json({
        success: true,
        data: results,
        meta: {
          query,
          totalResults: results.length,
          types: searchTypes,
        },
      });
    } catch (error) {
      logger.error('Error performing global search:', error);
      res.status(500).json({
        success: false,
        error: 'Search failed',
      });
    }
  }
}

export const searchController = new SearchController();
