import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { AppError } from '../middleware/errorHandler.js';
import { ClubMemberRole, ClubMemberStatus, Prisma } from '@prisma/client';

/**
 * Investment Club Service
 * Handles all investment club-related business logic including club management,
 * membership, discovery, and analytics
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface CreateClubData {
  name: string;
  description?: string;
  leaderId: string;
  isPrivate?: boolean;
  requiresApproval?: boolean;
  maxMembers?: number;
  investmentFocus?: string;
  minimumInvestment?: number;
  tags?: string[];
}

export interface UpdateClubData {
  name?: string;
  description?: string;
  isPrivate?: boolean;
  requiresApproval?: boolean;
  maxMembers?: number;
  investmentFocus?: string;
  minimumInvestment?: number;
  tags?: string[];
}

export interface ClubFilters {
  isPrivate?: boolean;
  investmentFocus?: string;
  tags?: string[];
  minMembers?: number;
  maxMembers?: number;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
}

export interface MemberFilters {
  role?: ClubMemberRole;
  status?: ClubMemberStatus;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
}

export interface ActivityFilters {
  type?: string;
  page?: number;
  limit?: number;
}

export interface InviteMemberData {
  clubId: string;
  userId: string;
  invitedBy: string;
  message?: string;
}

export interface ClubActivity {
  type: string;
  userId?: string;
  userName?: string;
  message: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// ============================================================================
// Investment Club Service Class
// ============================================================================

class InvestmentClubService {
  /**
   * Generate URL-friendly slug from club name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .substring(0, 100); // Limit length
  }

  /**
   * Ensure slug is unique by appending numbers if needed
   */
  private async ensureUniqueSlug(slug: string, existingId?: string): Promise<string> {
    let uniqueSlug = slug;
    let counter = 1;

    while (true) {
      const existing = await prisma.investmentClub.findUnique({
        where: { slug: uniqueSlug },
        select: { id: true },
      });

      if (!existing || (existingId && existing.id === existingId)) {
        break;
      }

      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }

    return uniqueSlug;
  }

  /**
   * Check if user has permission to perform action
   */
  private async checkPermission(
    clubId: string,
    userId: string,
    requiredRoles: ClubMemberRole[]
  ): Promise<void> {
    const membership = await prisma.clubMember.findUnique({
      where: {
        clubId_userId: {
          clubId,
          userId,
        },
      },
      select: {
        role: true,
        status: true,
      },
    });

    if (!membership || membership.status !== 'ACTIVE') {
      throw new AppError('Not a member of this club', 403, 'FORBIDDEN');
    }

    if (!requiredRoles.includes(membership.role)) {
      throw new AppError('Insufficient permissions', 403, 'FORBIDDEN');
    }
  }

  /**
   * Log club activity
   */
  private async logActivity(
    clubId: string,
    type: string,
    userId: string,
    message: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    // This would ideally be stored in a separate activity table
    // For now, we'll just log it
    logger.info('Club activity', { clubId, type, userId, message, metadata });
  }

  // ==========================================================================
  // Club Management
  // ==========================================================================

  /**
   * Create a new investment club
   */
  async createClub(data: CreateClubData) {
    try {
      // Verify leader exists
      const leader = await prisma.user.findUnique({
        where: { id: data.leaderId },
        select: { id: true, name: true, email: true },
      });

      if (!leader) {
        throw new AppError('Leader not found', 404, 'NOT_FOUND');
      }

      // Generate unique slug
      const slug = this.generateSlug(data.name);
      const uniqueSlug = await this.ensureUniqueSlug(slug);

      // Create club with leader as first member
      const club = await prisma.investmentClub.create({
        data: {
          name: data.name,
          slug: uniqueSlug,
          description: data.description,
          leaderId: data.leaderId,
          isPrivate: data.isPrivate ?? true,
          requiresApproval: data.requiresApproval ?? true,
          maxMembers: data.maxMembers,
          investmentFocus: data.investmentFocus,
          minimumInvestment: data.minimumInvestment ? new Prisma.Decimal(data.minimumInvestment) : null,
          tags: data.tags || [],
          memberCount: 1,
          members: {
            create: {
              userId: data.leaderId,
              role: 'LEADER',
              status: 'ACTIVE',
              joinedAt: new Date(),
            },
          },
        },
        include: {
          leader: {
            select: {
              id: true,
              name: true,
              email: true,
              profilePictureUrl: true,
            },
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  profilePictureUrl: true,
                },
              },
            },
          },
        },
      });

      logger.info('Investment club created', { clubId: club.id, leaderId: data.leaderId });

      return club;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error creating investment club', { error, data });
      throw new AppError('Failed to create investment club', 500, 'INTERNAL_ERROR');
    }
  }

  /**
   * Get clubs with filters
   */
  async getClubs(filters: ClubFilters, userId?: string) {
    try {
      const {
        isPrivate,
        investmentFocus,
        tags,
        minMembers,
        maxMembers,
        search,
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = filters;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: Prisma.InvestmentClubWhereInput = {};

      // Public clubs or clubs the user is a member of
      if (!userId) {
        where.isPrivate = false;
      } else {
        where.OR = [
          { isPrivate: false },
          {
            members: {
              some: {
                userId,
                status: 'ACTIVE',
              },
            },
          },
        ];
      }

      if (isPrivate !== undefined) {
        where.isPrivate = isPrivate;
      }

      if (investmentFocus) {
        where.investmentFocus = {
          contains: investmentFocus,
          mode: 'insensitive',
        };
      }

      if (tags && tags.length > 0) {
        where.tags = {
          hasSome: tags,
        };
      }

      if (minMembers !== undefined) {
        where.memberCount = {
          ...where.memberCount,
          gte: minMembers,
        };
      }

      if (maxMembers !== undefined) {
        where.memberCount = {
          ...where.memberCount,
          lte: maxMembers,
        };
      }

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { investmentFocus: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Get clubs and total count
      const [clubs, total] = await Promise.all([
        prisma.investmentClub.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            leader: {
              select: {
                id: true,
                name: true,
                email: true,
                profilePictureUrl: true,
              },
            },
            _count: {
              select: {
                members: true,
              },
            },
          },
        }),
        prisma.investmentClub.count({ where }),
      ]);

      return {
        clubs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error getting clubs', { error, filters });
      throw new AppError('Failed to retrieve clubs', 500, 'INTERNAL_ERROR');
    }
  }

  /**
   * Get club by slug
   */
  async getClubBySlug(slug: string, userId?: string) {
    try {
      const club = await prisma.investmentClub.findUnique({
        where: { slug },
        include: {
          leader: {
            select: {
              id: true,
              name: true,
              email: true,
              profilePictureUrl: true,
            },
          },
          members: {
            where: { status: 'ACTIVE' },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  profilePictureUrl: true,
                },
              },
            },
            orderBy: [
              { role: 'asc' },
              { joinedAt: 'asc' },
            ],
          },
        },
      });

      if (!club) {
        throw new AppError('Club not found', 404, 'NOT_FOUND');
      }

      // Check access for private clubs
      if (club.isPrivate && userId) {
        const isMember = club.members.some((m: any) => m.userId === userId);
        if (!isMember) {
          throw new AppError('Access denied to private club', 403, 'FORBIDDEN');
        }
      } else if (club.isPrivate && !userId) {
        throw new AppError('Access denied to private club', 403, 'FORBIDDEN');
      }

      return club;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error getting club by slug', { error, slug });
      throw new AppError('Failed to retrieve club', 500, 'INTERNAL_ERROR');
    }
  }

  /**
   * Get club by ID
   */
  async getClubById(id: string, userId?: string) {
    try {
      const club = await prisma.investmentClub.findUnique({
        where: { id },
        include: {
          leader: {
            select: {
              id: true,
              name: true,
              email: true,
              profilePictureUrl: true,
            },
          },
          members: {
            where: { status: 'ACTIVE' },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  profilePictureUrl: true,
                },
              },
            },
            orderBy: [
              { role: 'asc' },
              { joinedAt: 'asc' },
            ],
          },
        },
      });

      if (!club) {
        throw new AppError('Club not found', 404, 'NOT_FOUND');
      }

      // Check access for private clubs
      if (club.isPrivate && userId) {
        const isMember = club.members.some((m: any) => m.userId === userId);
        if (!isMember) {
          throw new AppError('Access denied to private club', 403, 'FORBIDDEN');
        }
      } else if (club.isPrivate && !userId) {
        throw new AppError('Access denied to private club', 403, 'FORBIDDEN');
      }

      return club;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error getting club by ID', { error, id });
      throw new AppError('Failed to retrieve club', 500, 'INTERNAL_ERROR');
    }
  }

  /**
   * Update club
   */
  async updateClub(id: string, userId: string, data: UpdateClubData) {
    try {
      // Check permissions - only leader can update
      await this.checkPermission(id, userId, ['LEADER']);

      const updateData: Prisma.InvestmentClubUpdateInput = {};

      if (data.name !== undefined) {
        updateData.name = data.name;
        // Update slug if name changed
        const slug = this.generateSlug(data.name);
        updateData.slug = await this.ensureUniqueSlug(slug, id);
      }

      if (data.description !== undefined) updateData.description = data.description;
      if (data.isPrivate !== undefined) updateData.isPrivate = data.isPrivate;
      if (data.requiresApproval !== undefined) updateData.requiresApproval = data.requiresApproval;
      if (data.maxMembers !== undefined) updateData.maxMembers = data.maxMembers;
      if (data.investmentFocus !== undefined) updateData.investmentFocus = data.investmentFocus;
      if (data.minimumInvestment !== undefined) {
        updateData.minimumInvestment = new Prisma.Decimal(data.minimumInvestment);
      }
      if (data.tags !== undefined) updateData.tags = data.tags;

      const club = await prisma.investmentClub.update({
        where: { id },
        data: updateData,
        include: {
          leader: {
            select: {
              id: true,
              name: true,
              email: true,
              profilePictureUrl: true,
            },
          },
          members: {
            where: { status: 'ACTIVE' },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  profilePictureUrl: true,
                },
              },
            },
          },
        },
      });

      await this.logActivity(id, 'club_update', userId, 'Club details updated');

      logger.info('Club updated', { clubId: id, userId });

      return club;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error updating club', { error, id, userId });
      throw new AppError('Failed to update club', 500, 'INTERNAL_ERROR');
    }
  }

  /**
   * Delete club
   */
  async deleteClub(id: string, userId: string) {
    try {
      // Check permissions - only leader can delete
      await this.checkPermission(id, userId, ['LEADER']);

      // Delete club (cascade will handle members)
      await prisma.investmentClub.delete({
        where: { id },
      });

      logger.info('Club deleted', { clubId: id, userId });

      return { deleted: true };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error deleting club', { error, id, userId });
      throw new AppError('Failed to delete club', 500, 'INTERNAL_ERROR');
    }
  }

  // ==========================================================================
  // Member Management
  // ==========================================================================

  /**
   * Join club
   */
  async joinClub(clubId: string, userId: string) {
    try {
      const club = await prisma.investmentClub.findUnique({
        where: { id: clubId },
        select: {
          requiresApproval: true,
          maxMembers: true,
          memberCount: true,
          name: true,
        },
      });

      if (!club) {
        throw new AppError('Club not found', 404, 'NOT_FOUND');
      }

      // Check if already a member
      const existingMembership = await prisma.clubMember.findUnique({
        where: {
          clubId_userId: {
            clubId,
            userId,
          },
        },
      });

      if (existingMembership) {
        if (existingMembership.status === 'ACTIVE') {
          throw new AppError('Already a member of this club', 400, 'BAD_REQUEST');
        } else if (existingMembership.status === 'PENDING') {
          throw new AppError('Membership request already pending', 400, 'BAD_REQUEST');
        } else if (existingMembership.status === 'SUSPENDED') {
          throw new AppError('You are suspended from this club', 403, 'FORBIDDEN');
        }
      }

      // Check member limit
      if (club.maxMembers && club.memberCount >= club.maxMembers) {
        throw new AppError('Club has reached maximum members', 400, 'BAD_REQUEST');
      }

      const status: ClubMemberStatus = club.requiresApproval ? 'PENDING' : 'ACTIVE';
      const joinedAt = status === 'ACTIVE' ? new Date() : null;

      // Create membership
      const membership = await prisma.$transaction(async (tx: any) => {
        const newMembership = await tx.clubMember.create({
          data: {
            clubId,
            userId,
            role: 'MEMBER',
            status,
            joinedAt,
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                profilePictureUrl: true,
              },
            },
            club: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        });

        // Increment member count if approved
        if (status === 'ACTIVE') {
          await tx.investmentClub.update({
            where: { id: clubId },
            data: { memberCount: { increment: 1 } },
          });
        }

        return newMembership;
      });

      if (status === 'ACTIVE') {
        await this.logActivity(clubId, 'member_join', userId, 'Joined the club');
      }

      logger.info('User joined club', { clubId, userId, status });

      return membership;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error joining club', { error, clubId, userId });
      throw new AppError('Failed to join club', 500, 'INTERNAL_ERROR');
    }
  }

  /**
   * Leave club
   */
  async leaveClub(clubId: string, userId: string) {
    try {
      const membership = await prisma.clubMember.findUnique({
        where: {
          clubId_userId: {
            clubId,
            userId,
          },
        },
      });

      if (!membership) {
        throw new AppError('Not a member of this club', 404, 'NOT_FOUND');
      }

      if (membership.role === 'LEADER') {
        throw new AppError('Club leader cannot leave. Transfer leadership or delete the club.', 400, 'BAD_REQUEST');
      }

      // Delete membership and decrement count
      await prisma.$transaction(async (tx: any) => {
        await tx.clubMember.delete({
          where: {
            clubId_userId: {
              clubId,
              userId,
            },
          },
        });

        if (membership.status === 'ACTIVE') {
          await tx.investmentClub.update({
            where: { id: clubId },
            data: { memberCount: { decrement: 1 } },
          });
        }
      });

      await this.logActivity(clubId, 'member_leave', userId, 'Left the club');

      logger.info('User left club', { clubId, userId });

      return { left: true };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error leaving club', { error, clubId, userId });
      throw new AppError('Failed to leave club', 500, 'INTERNAL_ERROR');
    }
  }

  /**
   * Invite user to club
   */
  async inviteToClub(data: InviteMemberData) {
    try {
      const { clubId, userId, invitedBy } = data;

      // Check permissions - leader or co-leader can invite
      await this.checkPermission(clubId, invitedBy, ['LEADER', 'CO_LEADER']);

      // Verify invited user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true },
      });

      if (!user) {
        throw new AppError('User not found', 404, 'NOT_FOUND');
      }

      // Check if already a member
      const existingMembership = await prisma.clubMember.findUnique({
        where: {
          clubId_userId: {
            clubId,
            userId,
          },
        },
      });

      if (existingMembership) {
        throw new AppError('User is already a member or has a pending request', 400, 'BAD_REQUEST');
      }

      // For now, create a pending membership
      // In a full implementation, this would create an invitation record
      const membership = await this.joinClub(clubId, userId);

      logger.info('User invited to club', { clubId, userId, invitedBy });

      return membership;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error inviting to club', { error, data });
      throw new AppError('Failed to invite user', 500, 'INTERNAL_ERROR');
    }
  }

  /**
   * Approve member
   */
  async approveMember(clubId: string, userId: string, approverId: string) {
    try {
      // Check permissions - leader or co-leader can approve
      await this.checkPermission(clubId, approverId, ['LEADER', 'CO_LEADER']);

      const membership = await prisma.clubMember.findUnique({
        where: {
          clubId_userId: {
            clubId,
            userId,
          },
        },
      });

      if (!membership) {
        throw new AppError('Membership not found', 404, 'NOT_FOUND');
      }

      if (membership.status !== 'PENDING') {
        throw new AppError('Membership is not pending approval', 400, 'BAD_REQUEST');
      }

      // Check member limit
      const club = await prisma.investmentClub.findUnique({
        where: { id: clubId },
        select: { maxMembers: true, memberCount: true },
      });

      if (club?.maxMembers && club.memberCount >= club.maxMembers) {
        throw new AppError('Club has reached maximum members', 400, 'BAD_REQUEST');
      }

      // Approve membership
      const updatedMembership = await prisma.$transaction(async (tx: any) => {
        const updated = await tx.clubMember.update({
          where: {
            clubId_userId: {
              clubId,
              userId,
            },
          },
          data: {
            status: 'ACTIVE',
            joinedAt: new Date(),
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                profilePictureUrl: true,
              },
            },
          },
        });

        await tx.investmentClub.update({
          where: { id: clubId },
          data: { memberCount: { increment: 1 } },
        });

        return updated;
      });

      await this.logActivity(clubId, 'member_join', userId, 'Membership approved');

      logger.info('Member approved', { clubId, userId, approverId });

      return updatedMembership;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error approving member', { error, clubId, userId });
      throw new AppError('Failed to approve member', 500, 'INTERNAL_ERROR');
    }
  }

  /**
   * Update member role
   */
  async updateMemberRole(clubId: string, userId: string, role: ClubMemberRole, updatedBy: string) {
    try {
      // Only leader can change roles
      await this.checkPermission(clubId, updatedBy, ['LEADER']);

      // Cannot change leader's role
      const club = await prisma.investmentClub.findUnique({
        where: { id: clubId },
        select: { leaderId: true },
      });

      if (club?.leaderId === userId) {
        throw new AppError('Cannot change club leader role', 400, 'BAD_REQUEST');
      }

      const membership = await prisma.clubMember.update({
        where: {
          clubId_userId: {
            clubId,
            userId,
          },
        },
        data: { role },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              profilePictureUrl: true,
            },
          },
        },
      });

      await this.logActivity(clubId, 'role_change', userId, `Role changed to ${role}`);

      logger.info('Member role updated', { clubId, userId, role, updatedBy });

      return membership;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error updating member role', { error, clubId, userId });
      throw new AppError('Failed to update member role', 500, 'INTERNAL_ERROR');
    }
  }

  /**
   * Remove member
   */
  async removeMember(clubId: string, userId: string, removedBy: string) {
    try {
      // Leader or co-leader can remove
      await this.checkPermission(clubId, removedBy, ['LEADER', 'CO_LEADER']);

      // Cannot remove leader
      const club = await prisma.investmentClub.findUnique({
        where: { id: clubId },
        select: { leaderId: true },
      });

      if (club?.leaderId === userId) {
        throw new AppError('Cannot remove club leader', 400, 'BAD_REQUEST');
      }

      const membership = await prisma.clubMember.findUnique({
        where: {
          clubId_userId: {
            clubId,
            userId,
          },
        },
      });

      if (!membership) {
        throw new AppError('Member not found', 404, 'NOT_FOUND');
      }

      // Update status to REMOVED and decrement count
      await prisma.$transaction(async (tx: any) => {
        await tx.clubMember.update({
          where: {
            clubId_userId: {
              clubId,
              userId,
            },
          },
          data: { status: 'REMOVED' },
        });

        if (membership.status === 'ACTIVE') {
          await tx.investmentClub.update({
            where: { id: clubId },
            data: { memberCount: { decrement: 1 } },
          });
        }
      });

      await this.logActivity(clubId, 'member_leave', userId, 'Member removed from club');

      logger.info('Member removed', { clubId, userId, removedBy });

      return { removed: true };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error removing member', { error, clubId, userId });
      throw new AppError('Failed to remove member', 500, 'INTERNAL_ERROR');
    }
  }

  /**
   * Suspend member
   */
  async suspendMember(clubId: string, userId: string, reason: string, suspendedBy: string) {
    try {
      // Only leader can suspend
      await this.checkPermission(clubId, suspendedBy, ['LEADER']);

      // Cannot suspend leader
      const club = await prisma.investmentClub.findUnique({
        where: { id: clubId },
        select: { leaderId: true },
      });

      if (club?.leaderId === userId) {
        throw new AppError('Cannot suspend club leader', 400, 'BAD_REQUEST');
      }

      const membership = await prisma.clubMember.findUnique({
        where: {
          clubId_userId: {
            clubId,
            userId,
          },
        },
      });

      if (!membership) {
        throw new AppError('Member not found', 404, 'NOT_FOUND');
      }

      // Update status to SUSPENDED and decrement count if was active
      await prisma.$transaction(async (tx: any) => {
        await tx.clubMember.update({
          where: {
            clubId_userId: {
              clubId,
              userId,
            },
          },
          data: { status: 'SUSPENDED' },
        });

        if (membership.status === 'ACTIVE') {
          await tx.investmentClub.update({
            where: { id: clubId },
            data: { memberCount: { decrement: 1 } },
          });
        }
      });

      await this.logActivity(clubId, 'member_leave', userId, `Member suspended: ${reason}`);

      logger.info('Member suspended', { clubId, userId, reason, suspendedBy });

      return { suspended: true };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error suspending member', { error, clubId, userId });
      throw new AppError('Failed to suspend member', 500, 'INTERNAL_ERROR');
    }
  }

  /**
   * Get club members
   */
  async getMembers(clubId: string, filters: MemberFilters, userId?: string) {
    try {
      // Verify club exists and check access
      await this.getClubById(clubId, userId);

      const {
        role,
        status,
        page = 1,
        limit = 50,
        sortBy = 'joinedAt',
        sortOrder = 'desc',
      } = filters;

      const skip = (page - 1) * limit;

      const where: Prisma.ClubMemberWhereInput = { clubId };

      if (role) where.role = role;
      if (status) where.status = status;

      const [members, total] = await Promise.all([
        prisma.clubMember.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                profilePictureUrl: true,
              },
            },
          },
        }),
        prisma.clubMember.count({ where }),
      ]);

      return {
        members,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error getting members', { error, clubId });
      throw new AppError('Failed to retrieve members', 500, 'INTERNAL_ERROR');
    }
  }

  // ==========================================================================
  // Discovery & Search
  // ==========================================================================

  /**
   * Discover clubs
   */
  async discoverClubs(userId: string, limit: number = 10) {
    try {
      // Get clubs user is not a member of
      const clubs = await prisma.investmentClub.findMany({
        where: {
          isPrivate: false,
          members: {
            none: {
              userId,
            },
          },
        },
        take: limit,
        orderBy: {
          memberCount: 'desc',
        },
        include: {
          leader: {
            select: {
              id: true,
              name: true,
              email: true,
              profilePictureUrl: true,
            },
          },
          _count: {
            select: {
              members: true,
            },
          },
        },
      });

      return clubs;
    } catch (error) {
      logger.error('Error discovering clubs', { error, userId });
      throw new AppError('Failed to discover clubs', 500, 'INTERNAL_ERROR');
    }
  }

  /**
   * Search clubs
   */
  async searchClubs(query: string, page: number = 1, limit: number = 20, userId?: string) {
    try {
      const skip = (page - 1) * limit;

      const where: Prisma.InvestmentClubWhereInput = {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { investmentFocus: { contains: query, mode: 'insensitive' } },
        ],
      };

      // Only show public clubs or clubs user is a member of
      if (!userId) {
        where.isPrivate = false;
      } else {
        where.AND = [
          {
            OR: [
              { isPrivate: false },
              {
                members: {
                  some: {
                    userId,
                    status: 'ACTIVE',
                  },
                },
              },
            ],
          },
        ];
      }

      const [clubs, total] = await Promise.all([
        prisma.investmentClub.findMany({
          where,
          skip,
          take: limit,
          orderBy: {
            memberCount: 'desc',
          },
          include: {
            leader: {
              select: {
                id: true,
                name: true,
                email: true,
                profilePictureUrl: true,
              },
            },
            _count: {
              select: {
                members: true,
              },
            },
          },
        }),
        prisma.investmentClub.count({ where }),
      ]);

      return {
        clubs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error searching clubs', { error, query });
      throw new AppError('Failed to search clubs', 500, 'INTERNAL_ERROR');
    }
  }

  /**
   * Get user's clubs
   */
  async getUserClubs(userId: string) {
    try {
      const memberships = await prisma.clubMember.findMany({
        where: {
          userId,
          status: 'ACTIVE',
        },
        include: {
          club: {
            include: {
              leader: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  profilePictureUrl: true,
                },
              },
              _count: {
                select: {
                  members: true,
                },
              },
            },
          },
        },
        orderBy: {
          joinedAt: 'desc',
        },
      });

      return memberships.map((m: any) => ({
        ...m.club,
        userRole: m.role,
        joinedAt: m.joinedAt,
      }));
    } catch (error) {
      logger.error('Error getting user clubs', { error, userId });
      throw new AppError('Failed to retrieve user clubs', 500, 'INTERNAL_ERROR');
    }
  }

  // ==========================================================================
  // Analytics
  // ==========================================================================

  /**
   * Get club activity feed
   */
  async getClubActivity(clubId: string, filters: ActivityFilters, userId?: string) {
    try {
      // Verify access
      await this.getClubById(clubId, userId);

      // In a full implementation, this would fetch from an activity table
      // For now, return a placeholder
      return {
        activities: [],
        pagination: {
          page: filters.page || 1,
          limit: filters.limit || 50,
          total: 0,
          totalPages: 0,
        },
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error getting club activity', { error, clubId });
      throw new AppError('Failed to retrieve club activity', 500, 'INTERNAL_ERROR');
    }
  }

  /**
   * Get club investments
   */
  async getClubInvestments(clubId: string, userId?: string) {
    try {
      // Verify access
      await this.getClubById(clubId, userId);

      // Get all investments made by club members
      // This would need to be enhanced based on how club investments are tracked
      const club = await prisma.investmentClub.findUnique({
        where: { id: clubId },
        include: {
          members: {
            where: { status: 'ACTIVE' },
            select: { userId: true },
          },
        },
      });

      if (!club) {
        throw new AppError('Club not found', 404, 'NOT_FOUND');
      }

      const memberIds = club.members.map((m: any) => m.userId);

      const investments = await prisma.investment.findMany({
        where: {
          investorId: {
            in: memberIds,
          },
        },
        include: {
          startup: {
            select: {
              id: true,
              name: true,
              industry: true,
              stage: true,
            },
          },
          investor: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return investments;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error getting club investments', { error, clubId });
      throw new AppError('Failed to retrieve club investments', 500, 'INTERNAL_ERROR');
    }
  }

  /**
   * Get club statistics
   */
  async getClubStats(clubId: string, userId?: string) {
    try {
      // Verify access
      const club = await this.getClubById(clubId, userId);

      // Get member statistics
      const memberStats = await prisma.clubMember.groupBy({
        by: ['status'],
        where: { clubId },
        _count: true,
      });

      // Get role distribution
      const roleStats = await prisma.clubMember.groupBy({
        by: ['role'],
        where: {
          clubId,
          status: 'ACTIVE',
        },
        _count: true,
      });

      // Calculate investment stats
      const memberIds = club.members.map((m: any) => m.userId);
      const investmentStats = await prisma.investment.aggregate({
        where: {
          investorId: {
            in: memberIds,
          },
        },
        _sum: {
          amount: true,
        },
        _count: true,
      });

      return {
        members: {
          total: club.memberCount,
          byStatus: memberStats.reduce((acc: any, stat: any) => {
            acc[stat.status] = stat._count;
            return acc;
          }, {} as Record<string, number>),
          byRole: roleStats.reduce((acc: any, stat: any) => {
            acc[stat.role] = stat._count;
            return acc;
          }, {} as Record<string, number>),
        },
        investments: {
          total: investmentStats._count,
          totalAmount: investmentStats._sum.amount?.toString() || '0',
        },
        club: {
          createdAt: club.createdAt,
          daysActive: Math.floor((Date.now() - club.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
        },
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error getting club stats', { error, clubId });
      throw new AppError('Failed to retrieve club statistics', 500, 'INTERNAL_ERROR');
    }
  }
}

// Export singleton instance
export const investmentClubService = new InvestmentClubService();
export default investmentClubService;
