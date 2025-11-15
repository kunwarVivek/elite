import { prisma } from '../config/database.js';
import { logger } from '../config/logger.js';
import { AppError } from '../middleware/errorHandler.js';
import { notificationService } from './notification.service.js';
import {
  BoardMeeting,
  BoardResolution,
  BoardVote,
  BoardMeetingType,
  MeetingStatus,
  ResolutionResult,
  VoteType,
  Prisma,
} from '@prisma/client';
import {
  CreateBoardMeetingInput,
  UpdateBoardMeetingInput,
  ListMeetingsQuery,
  CreateBoardResolutionInput,
  UpdateBoardResolutionInput,
  ListResolutionsQuery,
  CastVoteInput,
  UpdateVoteInput,
  Participant,
} from '../validations/board.validation.js';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface MeetingWithResolutions extends BoardMeeting {
  resolutions: BoardResolution[];
  startup?: any;
}

export interface ResolutionWithVotes extends BoardResolution {
  votes: BoardVote[];
  meeting?: BoardMeeting;
}

export interface VoteTally {
  totalVotes: number;
  votesFor: number;
  votesAgainst: number;
  abstentions: number;
  result: ResolutionResult;
  percentageFor: number;
  percentageAgainst: number;
  requiredVotes?: number;
  requiresSupermajority: boolean;
}

export interface BoardStats {
  totalMeetings: number;
  upcomingMeetings: number;
  completedMeetings: number;
  totalResolutions: number;
  passedResolutions: number;
  failedResolutions: number;
  averageAttendance: number;
  recentMeetings: BoardMeeting[];
}

// ============================================================================
// BOARD SERVICE CLASS
// ============================================================================

class BoardService {
  // ==========================================================================
  // MEETING OPERATIONS
  // ==========================================================================

  /**
   * Create a new board meeting
   */
  async createMeeting(data: CreateBoardMeetingInput, createdBy: string): Promise<MeetingWithResolutions> {
    try {
      // Verify startup exists and user has permission
      const startup = await prisma.startup.findUnique({
        where: { id: data.startupId },
        include: { founder: true },
      });

      if (!startup) {
        throw new AppError('Startup not found', 404, 'STARTUP_NOT_FOUND');
      }

      // Validate participants exist
      await this.validateParticipants([
        ...data.directors,
        ...(data.observers || []),
        ...(data.management || []),
      ]);

      // Create meeting
      const meeting = await prisma.boardMeeting.create({
        data: {
          startupId: data.startupId,
          meetingDate: new Date(data.meetingDate),
          meetingType: data.meetingType,
          location: data.location,
          directors: data.directors as any,
          observers: (data.observers || []) as any,
          management: (data.management || []) as any,
          agenda: data.agenda,
          materials: data.materials || [],
          status: MeetingStatus.SCHEDULED,
        },
        include: {
          resolutions: true,
          startup: true,
        },
      });

      // Send notifications to all participants
      await this.notifyMeetingScheduled(meeting, [...data.directors, ...(data.observers || []), ...(data.management || [])]);

      logger.info('Board meeting created', { meetingId: meeting.id, startupId: data.startupId, createdBy });

      return meeting;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error creating board meeting', { error, data });
      throw new AppError('Failed to create board meeting', 500, 'MEETING_CREATE_FAILED');
    }
  }

  /**
   * Get meetings with filters
   */
  async getMeetings(query: ListMeetingsQuery, userId: string): Promise<{ meetings: MeetingWithResolutions[]; total: number; page: number; limit: number }> {
    try {
      const { startupId, status, meetingType, fromDate, toDate, page = 1, limit = 20 } = query;

      const where: Prisma.BoardMeetingWhereInput = {};

      if (startupId) {
        // Verify user has access to this startup
        await this.verifyStartupAccess(startupId, userId);
        where.startupId = startupId;
      }

      if (status) {
        where.status = status;
      }

      if (meetingType) {
        where.meetingType = meetingType;
      }

      if (fromDate || toDate) {
        where.meetingDate = {};
        if (fromDate) where.meetingDate.gte = new Date(fromDate);
        if (toDate) where.meetingDate.lte = new Date(toDate);
      }

      const [meetings, total] = await Promise.all([
        prisma.boardMeeting.findMany({
          where,
          include: {
            resolutions: true,
            startup: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
          orderBy: { meetingDate: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.boardMeeting.count({ where }),
      ]);

      return { meetings, total, page, limit };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error getting board meetings', { error, query });
      throw new AppError('Failed to get board meetings', 500, 'MEETINGS_GET_FAILED');
    }
  }

  /**
   * Get meeting by ID with resolutions
   */
  async getMeetingById(id: string, userId: string): Promise<MeetingWithResolutions> {
    try {
      const meeting = await prisma.boardMeeting.findUnique({
        where: { id },
        include: {
          resolutions: {
            include: {
              votes: true,
            },
          },
          startup: {
            select: {
              id: true,
              name: true,
              slug: true,
              founderId: true,
            },
          },
        },
      });

      if (!meeting) {
        throw new AppError('Meeting not found', 404, 'MEETING_NOT_FOUND');
      }

      // Verify user has access
      await this.verifyMeetingAccess(meeting, userId);

      return meeting;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error getting board meeting', { error, id });
      throw new AppError('Failed to get board meeting', 500, 'MEETING_GET_FAILED');
    }
  }

  /**
   * Update meeting
   */
  async updateMeeting(id: string, data: UpdateBoardMeetingInput, userId: string): Promise<MeetingWithResolutions> {
    try {
      const meeting = await this.getMeetingById(id, userId);

      // Cannot update completed or cancelled meetings
      if (meeting.status === MeetingStatus.COMPLETED || meeting.status === MeetingStatus.CANCELLED) {
        throw new AppError('Cannot update completed or cancelled meeting', 400, 'MEETING_IMMUTABLE');
      }

      // Verify user has permission (founder or admin)
      await this.verifyMeetingPermission(meeting, userId);

      // Validate participants if provided
      if (data.directors || data.observers || data.management) {
        const allParticipants = [
          ...(data.directors || meeting.directors as Participant[]),
          ...(data.observers || meeting.observers as Participant[]),
          ...(data.management || meeting.management as Participant[]),
        ];
        await this.validateParticipants(allParticipants);
      }

      const updateData: any = {};
      if (data.meetingDate) updateData.meetingDate = new Date(data.meetingDate);
      if (data.meetingType) updateData.meetingType = data.meetingType;
      if (data.location !== undefined) updateData.location = data.location;
      if (data.directors) updateData.directors = data.directors;
      if (data.observers) updateData.observers = data.observers;
      if (data.management) updateData.management = data.management;
      if (data.agenda !== undefined) updateData.agenda = data.agenda;
      if (data.materials) updateData.materials = data.materials;
      if (data.minutesUrl !== undefined) updateData.minutesUrl = data.minutesUrl;
      if (data.recordingUrl !== undefined) updateData.recordingUrl = data.recordingUrl;

      const updatedMeeting = await prisma.boardMeeting.update({
        where: { id },
        data: updateData,
        include: {
          resolutions: true,
          startup: true,
        },
      });

      logger.info('Board meeting updated', { meetingId: id, userId });

      return updatedMeeting;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error updating board meeting', { error, id });
      throw new AppError('Failed to update board meeting', 500, 'MEETING_UPDATE_FAILED');
    }
  }

  /**
   * Delete meeting
   */
  async deleteMeeting(id: string, userId: string): Promise<void> {
    try {
      const meeting = await this.getMeetingById(id, userId);

      // Only scheduled meetings can be deleted
      if (meeting.status !== MeetingStatus.SCHEDULED) {
        throw new AppError('Only scheduled meetings can be deleted', 400, 'MEETING_DELETE_FORBIDDEN');
      }

      // Verify user has permission
      await this.verifyMeetingPermission(meeting, userId);

      await prisma.boardMeeting.delete({
        where: { id },
      });

      logger.info('Board meeting deleted', { meetingId: id, userId });
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error deleting board meeting', { error, id });
      throw new AppError('Failed to delete board meeting', 500, 'MEETING_DELETE_FAILED');
    }
  }

  /**
   * Start meeting (change status to IN_PROGRESS)
   */
  async startMeeting(id: string, userId: string): Promise<MeetingWithResolutions> {
    try {
      const meeting = await this.getMeetingById(id, userId);

      if (meeting.status !== MeetingStatus.SCHEDULED) {
        throw new AppError('Only scheduled meetings can be started', 400, 'MEETING_NOT_SCHEDULED');
      }

      // Verify user has permission
      await this.verifyMeetingPermission(meeting, userId);

      const updatedMeeting = await prisma.boardMeeting.update({
        where: { id },
        data: { status: MeetingStatus.IN_PROGRESS },
        include: {
          resolutions: true,
          startup: true,
        },
      });

      logger.info('Board meeting started', { meetingId: id, userId });

      return updatedMeeting;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error starting board meeting', { error, id });
      throw new AppError('Failed to start board meeting', 500, 'MEETING_START_FAILED');
    }
  }

  /**
   * Complete meeting (finalize all resolutions)
   */
  async completeMeeting(id: string, userId: string): Promise<MeetingWithResolutions> {
    try {
      const meeting = await this.getMeetingById(id, userId);

      if (meeting.status === MeetingStatus.COMPLETED) {
        throw new AppError('Meeting already completed', 400, 'MEETING_ALREADY_COMPLETED');
      }

      if (meeting.status === MeetingStatus.CANCELLED) {
        throw new AppError('Cannot complete cancelled meeting', 400, 'MEETING_CANCELLED');
      }

      // Verify user has permission
      await this.verifyMeetingPermission(meeting, userId);

      // Tally all resolutions
      for (const resolution of meeting.resolutions) {
        if (!resolution.result) {
          await this.tallyVotes(resolution.id);
        }
      }

      const updatedMeeting = await prisma.boardMeeting.update({
        where: { id },
        data: { status: MeetingStatus.COMPLETED },
        include: {
          resolutions: {
            include: {
              votes: true,
            },
          },
          startup: true,
        },
      });

      // Notify participants
      const participants = [
        ...(meeting.directors as Participant[]),
        ...(meeting.observers as Participant[]),
        ...(meeting.management as Participant[]),
      ];
      await this.notifyMeetingCompleted(updatedMeeting, participants);

      logger.info('Board meeting completed', { meetingId: id, userId });

      return updatedMeeting;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error completing board meeting', { error, id });
      throw new AppError('Failed to complete board meeting', 500, 'MEETING_COMPLETE_FAILED');
    }
  }

  /**
   * Cancel meeting
   */
  async cancelMeeting(id: string, userId: string, reason?: string): Promise<MeetingWithResolutions> {
    try {
      const meeting = await this.getMeetingById(id, userId);

      if (meeting.status === MeetingStatus.COMPLETED) {
        throw new AppError('Cannot cancel completed meeting', 400, 'MEETING_COMPLETED');
      }

      if (meeting.status === MeetingStatus.CANCELLED) {
        throw new AppError('Meeting already cancelled', 400, 'MEETING_ALREADY_CANCELLED');
      }

      // Verify user has permission
      await this.verifyMeetingPermission(meeting, userId);

      const updatedMeeting = await prisma.boardMeeting.update({
        where: { id },
        data: { status: MeetingStatus.CANCELLED },
        include: {
          resolutions: true,
          startup: true,
        },
      });

      // Notify participants
      const participants = [
        ...(meeting.directors as Participant[]),
        ...(meeting.observers as Participant[]),
        ...(meeting.management as Participant[]),
      ];
      await this.notifyMeetingCancelled(updatedMeeting, participants, reason);

      logger.info('Board meeting cancelled', { meetingId: id, userId, reason });

      return updatedMeeting;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error cancelling board meeting', { error, id });
      throw new AppError('Failed to cancel board meeting', 500, 'MEETING_CANCEL_FAILED');
    }
  }

  // ==========================================================================
  // RESOLUTION OPERATIONS
  // ==========================================================================

  /**
   * Create resolution for a meeting
   */
  async createResolution(meetingId: string, data: CreateBoardResolutionInput, userId: string): Promise<ResolutionWithVotes> {
    try {
      const meeting = await this.getMeetingById(meetingId, userId);

      // Cannot add resolutions to completed or cancelled meetings
      if (meeting.status === MeetingStatus.COMPLETED || meeting.status === MeetingStatus.CANCELLED) {
        throw new AppError('Cannot add resolutions to completed or cancelled meeting', 400, 'MEETING_IMMUTABLE');
      }

      // Verify user has permission
      await this.verifyMeetingPermission(meeting, userId);

      // Check if resolution number already exists for this meeting
      const existingResolution = await prisma.boardResolution.findFirst({
        where: {
          meetingId,
          resolutionNumber: data.resolutionNumber,
        },
      });

      if (existingResolution) {
        throw new AppError('Resolution number already exists for this meeting', 409, 'RESOLUTION_NUMBER_EXISTS');
      }

      const resolution = await prisma.boardResolution.create({
        data: {
          meetingId,
          resolutionNumber: data.resolutionNumber,
          title: data.title,
          description: data.description,
          proposedBy: data.proposedBy,
          requiresMajority: data.requiresMajority,
          requiresSupermajority: data.requiresSupermajority,
          requiredVotes: data.requiredVotes,
        },
        include: {
          votes: true,
          meeting: true,
        },
      });

      logger.info('Board resolution created', { resolutionId: resolution.id, meetingId, userId });

      return resolution;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error creating board resolution', { error, meetingId, data });
      throw new AppError('Failed to create board resolution', 500, 'RESOLUTION_CREATE_FAILED');
    }
  }

  /**
   * Get resolutions with filters
   */
  async getResolutions(query: ListResolutionsQuery, userId: string): Promise<{ resolutions: ResolutionWithVotes[]; total: number; page: number; limit: number }> {
    try {
      const { meetingId, startupId, result, proposedBy, page = 1, limit = 20 } = query;

      const where: Prisma.BoardResolutionWhereInput = {};

      if (meetingId) {
        where.meetingId = meetingId;
      }

      if (startupId) {
        where.meeting = {
          startupId,
        };
      }

      if (result) {
        where.result = result;
      }

      if (proposedBy) {
        where.proposedBy = proposedBy;
      }

      const [resolutions, total] = await Promise.all([
        prisma.boardResolution.findMany({
          where,
          include: {
            votes: true,
            meeting: {
              include: {
                startup: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.boardResolution.count({ where }),
      ]);

      return { resolutions, total, page, limit };
    } catch (error) {
      logger.error('Error getting board resolutions', { error, query });
      throw new AppError('Failed to get board resolutions', 500, 'RESOLUTIONS_GET_FAILED');
    }
  }

  /**
   * Get resolution by ID with votes
   */
  async getResolutionById(id: string, userId: string): Promise<ResolutionWithVotes> {
    try {
      const resolution = await prisma.boardResolution.findUnique({
        where: { id },
        include: {
          votes: true,
          meeting: {
            include: {
              startup: true,
            },
          },
        },
      });

      if (!resolution) {
        throw new AppError('Resolution not found', 404, 'RESOLUTION_NOT_FOUND');
      }

      // Verify user has access
      await this.verifyMeetingAccess(resolution.meeting, userId);

      return resolution;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error getting board resolution', { error, id });
      throw new AppError('Failed to get board resolution', 500, 'RESOLUTION_GET_FAILED');
    }
  }

  /**
   * Update resolution
   */
  async updateResolution(id: string, data: UpdateBoardResolutionInput, userId: string): Promise<ResolutionWithVotes> {
    try {
      const resolution = await this.getResolutionById(id, userId);

      // Cannot update if result is already set
      if (resolution.result) {
        throw new AppError('Cannot update resolution with result already set', 400, 'RESOLUTION_FINALIZED');
      }

      // Verify meeting is not completed
      if (resolution.meeting.status === MeetingStatus.COMPLETED || resolution.meeting.status === MeetingStatus.CANCELLED) {
        throw new AppError('Cannot update resolution in completed or cancelled meeting', 400, 'MEETING_IMMUTABLE');
      }

      // Verify user has permission
      await this.verifyMeetingPermission(resolution.meeting, userId);

      const updatedResolution = await prisma.boardResolution.update({
        where: { id },
        data,
        include: {
          votes: true,
          meeting: true,
        },
      });

      logger.info('Board resolution updated', { resolutionId: id, userId });

      return updatedResolution;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error updating board resolution', { error, id });
      throw new AppError('Failed to update board resolution', 500, 'RESOLUTION_UPDATE_FAILED');
    }
  }

  /**
   * Delete resolution
   */
  async deleteResolution(id: string, userId: string): Promise<void> {
    try {
      const resolution = await this.getResolutionById(id, userId);

      // Cannot delete if votes exist
      if (resolution.votes.length > 0) {
        throw new AppError('Cannot delete resolution with votes', 400, 'RESOLUTION_HAS_VOTES');
      }

      // Verify meeting is not completed
      if (resolution.meeting.status === MeetingStatus.COMPLETED || resolution.meeting.status === MeetingStatus.CANCELLED) {
        throw new AppError('Cannot delete resolution from completed or cancelled meeting', 400, 'MEETING_IMMUTABLE');
      }

      // Verify user has permission
      await this.verifyMeetingPermission(resolution.meeting, userId);

      await prisma.boardResolution.delete({
        where: { id },
      });

      logger.info('Board resolution deleted', { resolutionId: id, userId });
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error deleting board resolution', { error, id });
      throw new AppError('Failed to delete board resolution', 500, 'RESOLUTION_DELETE_FAILED');
    }
  }

  /**
   * Propose resolution for voting
   */
  async proposeResolution(id: string, userId: string): Promise<ResolutionWithVotes> {
    try {
      const resolution = await this.getResolutionById(id, userId);

      // Verify user has permission
      await this.verifyMeetingPermission(resolution.meeting, userId);

      // Notify eligible voters
      const directors = resolution.meeting.directors as Participant[];
      await this.notifyResolutionProposed(resolution, directors);

      logger.info('Board resolution proposed', { resolutionId: id, userId });

      return resolution;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error proposing board resolution', { error, id });
      throw new AppError('Failed to propose board resolution', 500, 'RESOLUTION_PROPOSE_FAILED');
    }
  }

  // ==========================================================================
  // VOTING OPERATIONS
  // ==========================================================================

  /**
   * Cast a vote on a resolution
   */
  async castVote(resolutionId: string, data: CastVoteInput, userId: string): Promise<BoardVote> {
    try {
      const resolution = await this.getResolutionById(resolutionId, userId);

      // Verify meeting is in progress or scheduled
      if (resolution.meeting.status === MeetingStatus.COMPLETED) {
        throw new AppError('Cannot vote on completed meeting', 400, 'MEETING_COMPLETED');
      }

      if (resolution.meeting.status === MeetingStatus.CANCELLED) {
        throw new AppError('Cannot vote on cancelled meeting', 400, 'MEETING_CANCELLED');
      }

      // Check voting eligibility (only directors can vote)
      const isEligible = await this.checkVotingEligibility(resolution.meeting, userId);
      if (!isEligible) {
        throw new AppError('User is not eligible to vote', 403, 'NOT_ELIGIBLE');
      }

      // Check if user already voted
      const existingVote = await prisma.boardVote.findFirst({
        where: {
          resolutionId,
          voterId: userId,
        },
      });

      if (existingVote) {
        throw new AppError('User has already voted on this resolution', 409, 'ALREADY_VOTED');
      }

      const vote = await prisma.boardVote.create({
        data: {
          resolutionId,
          voterId: userId,
          vote: data.vote,
          comments: data.comments,
        },
      });

      logger.info('Vote cast', { voteId: vote.id, resolutionId, userId, vote: data.vote });

      return vote;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error casting vote', { error, resolutionId, userId });
      throw new AppError('Failed to cast vote', 500, 'VOTE_CAST_FAILED');
    }
  }

  /**
   * Get all votes for a resolution
   */
  async getVotes(resolutionId: string, userId: string): Promise<BoardVote[]> {
    try {
      const resolution = await this.getResolutionById(resolutionId, userId);

      return resolution.votes;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error getting votes', { error, resolutionId });
      throw new AppError('Failed to get votes', 500, 'VOTES_GET_FAILED');
    }
  }

  /**
   * Update a vote (before meeting completion)
   */
  async updateVote(voteId: string, data: UpdateVoteInput, userId: string): Promise<BoardVote> {
    try {
      const vote = await prisma.boardVote.findUnique({
        where: { id: voteId },
        include: {
          resolution: {
            include: {
              meeting: true,
            },
          },
        },
      });

      if (!vote) {
        throw new AppError('Vote not found', 404, 'VOTE_NOT_FOUND');
      }

      // Verify voter
      if (vote.voterId !== userId) {
        throw new AppError('Cannot update another user\'s vote', 403, 'FORBIDDEN');
      }

      // Cannot update if meeting is completed
      if (vote.resolution.meeting.status === MeetingStatus.COMPLETED) {
        throw new AppError('Cannot update vote after meeting completion', 400, 'MEETING_COMPLETED');
      }

      // Cannot update if result is already set
      if (vote.resolution.result) {
        throw new AppError('Cannot update vote after result is set', 400, 'RESULT_FINALIZED');
      }

      const updatedVote = await prisma.boardVote.update({
        where: { id: voteId },
        data,
      });

      logger.info('Vote updated', { voteId, userId });

      return updatedVote;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error updating vote', { error, voteId });
      throw new AppError('Failed to update vote', 500, 'VOTE_UPDATE_FAILED');
    }
  }

  /**
   * Tally votes for a resolution
   */
  async tallyVotes(resolutionId: string): Promise<VoteTally> {
    try {
      const resolution = await prisma.boardResolution.findUnique({
        where: { id: resolutionId },
        include: {
          votes: true,
          meeting: true,
        },
      });

      if (!resolution) {
        throw new AppError('Resolution not found', 404, 'RESOLUTION_NOT_FOUND');
      }

      const votesFor = resolution.votes.filter(v => v.vote === VoteType.FOR).length;
      const votesAgainst = resolution.votes.filter(v => v.vote === VoteType.AGAINST).length;
      const abstentions = resolution.votes.filter(v => v.vote === VoteType.ABSTAIN).length;
      const totalVotes = votesFor + votesAgainst; // Abstentions don't count toward total

      let result: ResolutionResult;

      // Determine result based on voting rules
      if (totalVotes === 0) {
        result = ResolutionResult.TABLED;
      } else {
        const percentageFor = (votesFor / totalVotes) * 100;

        if (resolution.requiresSupermajority) {
          // Supermajority: >= 66.67%
          result = percentageFor >= 66.67 ? ResolutionResult.PASSED : ResolutionResult.FAILED;
        } else if (resolution.requiresMajority) {
          // Simple majority: > 50%
          result = percentageFor > 50 ? ResolutionResult.PASSED : ResolutionResult.FAILED;
        } else if (resolution.requiredVotes) {
          // Required number of votes
          result = votesFor >= resolution.requiredVotes ? ResolutionResult.PASSED : ResolutionResult.FAILED;
        } else {
          // Default to simple majority
          result = percentageFor > 50 ? ResolutionResult.PASSED : ResolutionResult.FAILED;
        }

        // Special case: all abstain
        if (votesFor === 0 && votesAgainst === 0 && abstentions > 0) {
          result = ResolutionResult.ABSTAINED;
        }
      }

      // Update resolution with result
      await prisma.boardResolution.update({
        where: { id: resolutionId },
        data: {
          result,
          passedDate: result === ResolutionResult.PASSED ? new Date() : null,
        },
      });

      // Notify about result
      const directors = resolution.meeting.directors as Participant[];
      await this.notifyResolutionResult(resolution, result, directors);

      logger.info('Votes tallied', { resolutionId, result, votesFor, votesAgainst, abstentions });

      return {
        totalVotes: votesFor + votesAgainst + abstentions,
        votesFor,
        votesAgainst,
        abstentions,
        result,
        percentageFor: totalVotes > 0 ? (votesFor / totalVotes) * 100 : 0,
        percentageAgainst: totalVotes > 0 ? (votesAgainst / totalVotes) * 100 : 0,
        requiredVotes: resolution.requiredVotes || undefined,
        requiresSupermajority: resolution.requiresSupermajority,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error tallying votes', { error, resolutionId });
      throw new AppError('Failed to tally votes', 500, 'TALLY_FAILED');
    }
  }

  /**
   * Check if user is eligible to vote
   */
  async checkVotingEligibility(meeting: BoardMeeting, userId: string): Promise<boolean> {
    const directors = meeting.directors as Participant[];
    return directors.some(d => d.userId === userId);
  }

  // ==========================================================================
  // ANALYTICS & STATS
  // ==========================================================================

  /**
   * Get startup's board meetings
   */
  async getStartupMeetings(startupId: string, userId: string): Promise<BoardMeeting[]> {
    try {
      // Verify access
      await this.verifyStartupAccess(startupId, userId);

      const meetings = await prisma.boardMeeting.findMany({
        where: { startupId },
        include: {
          resolutions: {
            include: {
              votes: true,
            },
          },
        },
        orderBy: { meetingDate: 'desc' },
      });

      return meetings;
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error getting startup meetings', { error, startupId });
      throw new AppError('Failed to get startup meetings', 500, 'STARTUP_MEETINGS_FAILED');
    }
  }

  /**
   * Get board statistics for a startup
   */
  async getStartupStats(startupId: string, userId: string): Promise<BoardStats> {
    try {
      await this.verifyStartupAccess(startupId, userId);

      const [
        totalMeetings,
        upcomingMeetings,
        completedMeetings,
        totalResolutions,
        passedResolutions,
        failedResolutions,
        recentMeetings,
      ] = await Promise.all([
        prisma.boardMeeting.count({ where: { startupId } }),
        prisma.boardMeeting.count({
          where: {
            startupId,
            status: MeetingStatus.SCHEDULED,
            meetingDate: { gte: new Date() },
          },
        }),
        prisma.boardMeeting.count({
          where: { startupId, status: MeetingStatus.COMPLETED },
        }),
        prisma.boardResolution.count({
          where: { meeting: { startupId } },
        }),
        prisma.boardResolution.count({
          where: {
            meeting: { startupId },
            result: ResolutionResult.PASSED,
          },
        }),
        prisma.boardResolution.count({
          where: {
            meeting: { startupId },
            result: ResolutionResult.FAILED,
          },
        }),
        prisma.boardMeeting.findMany({
          where: { startupId },
          orderBy: { meetingDate: 'desc' },
          take: 5,
          include: {
            resolutions: true,
          },
        }),
      ]);

      return {
        totalMeetings,
        upcomingMeetings,
        completedMeetings,
        totalResolutions,
        passedResolutions,
        failedResolutions,
        averageAttendance: 0, // TODO: Calculate based on actual attendance tracking
        recentMeetings,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error getting startup stats', { error, startupId });
      throw new AppError('Failed to get startup stats', 500, 'STARTUP_STATS_FAILED');
    }
  }

  /**
   * Get user's upcoming meetings
   */
  async getUserMeetings(userId: string): Promise<BoardMeeting[]> {
    try {
      // Get all meetings where user is a participant
      const allMeetings = await prisma.boardMeeting.findMany({
        where: {
          meetingDate: { gte: new Date() },
          status: { in: [MeetingStatus.SCHEDULED, MeetingStatus.IN_PROGRESS] },
        },
        include: {
          startup: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          resolutions: true,
        },
        orderBy: { meetingDate: 'asc' },
      });

      // Filter meetings where user is a participant
      const userMeetings = allMeetings.filter(meeting => {
        const directors = meeting.directors as Participant[];
        const observers = meeting.observers as Participant[];
        const management = meeting.management as Participant[];

        return [...directors, ...observers, ...management].some(p => p.userId === userId);
      });

      return userMeetings;
    } catch (error) {
      logger.error('Error getting user meetings', { error, userId });
      throw new AppError('Failed to get user meetings', 500, 'USER_MEETINGS_FAILED');
    }
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Validate that all participants exist
   */
  private async validateParticipants(participants: Participant[]): Promise<void> {
    const userIds = participants.map(p => p.userId);

    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true },
    });

    const foundUserIds = users.map(u => u.id);
    const missingUserIds = userIds.filter(id => !foundUserIds.includes(id));

    if (missingUserIds.length > 0) {
      throw new AppError(
        `Invalid participant IDs: ${missingUserIds.join(', ')}`,
        400,
        'INVALID_PARTICIPANTS'
      );
    }
  }

  /**
   * Verify user has access to startup
   */
  private async verifyStartupAccess(startupId: string, userId: string): Promise<void> {
    const startup = await prisma.startup.findUnique({
      where: { id: startupId },
      include: {
        founder: true,
        investments: {
          where: { investorId: userId },
        },
      },
    });

    if (!startup) {
      throw new AppError('Startup not found', 404, 'STARTUP_NOT_FOUND');
    }

    // User must be founder, investor, or admin
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const hasAccess =
      startup.founderId === userId ||
      startup.investments.length > 0 ||
      user?.role === 'ADMIN';

    if (!hasAccess) {
      throw new AppError('Access denied to this startup', 403, 'ACCESS_DENIED');
    }
  }

  /**
   * Verify user has access to meeting
   */
  private async verifyMeetingAccess(meeting: BoardMeeting, userId: string): Promise<void> {
    await this.verifyStartupAccess(meeting.startupId, userId);
  }

  /**
   * Verify user has permission to modify meeting
   */
  private async verifyMeetingPermission(meeting: BoardMeeting, userId: string): Promise<void> {
    const startup = await prisma.startup.findUnique({
      where: { id: meeting.startupId },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    const hasPermission = startup?.founderId === userId || user?.role === 'ADMIN';

    if (!hasPermission) {
      throw new AppError('Insufficient permissions to modify meeting', 403, 'INSUFFICIENT_PERMISSIONS');
    }
  }

  // ==========================================================================
  // NOTIFICATION METHODS
  // ==========================================================================

  private async notifyMeetingScheduled(meeting: BoardMeeting, participants: Participant[]): Promise<void> {
    try {
      for (const participant of participants) {
        await notificationService.createNotification({
          recipientId: participant.userId,
          type: 'BOARD_MEETING',
          priority: 'MEDIUM',
          title: 'Board Meeting Scheduled',
          content: `You have been invited to a board meeting scheduled for ${meeting.meetingDate.toLocaleDateString()}`,
          actionUrl: `/board/meetings/${meeting.id}`,
          data: { meetingId: meeting.id },
        });
      }
    } catch (error) {
      logger.error('Error sending meeting scheduled notifications', { error, meetingId: meeting.id });
    }
  }

  private async notifyMeetingCompleted(meeting: MeetingWithResolutions, participants: Participant[]): Promise<void> {
    try {
      for (const participant of participants) {
        await notificationService.createNotification({
          recipientId: participant.userId,
          type: 'BOARD_MEETING',
          priority: 'LOW',
          title: 'Board Meeting Completed',
          content: `The board meeting has been completed. ${meeting.resolutions.length} resolutions were discussed.`,
          actionUrl: `/board/meetings/${meeting.id}`,
          data: { meetingId: meeting.id },
        });
      }
    } catch (error) {
      logger.error('Error sending meeting completed notifications', { error, meetingId: meeting.id });
    }
  }

  private async notifyMeetingCancelled(meeting: BoardMeeting, participants: Participant[], reason?: string): Promise<void> {
    try {
      for (const participant of participants) {
        await notificationService.createNotification({
          recipientId: participant.userId,
          type: 'BOARD_MEETING',
          priority: 'HIGH',
          title: 'Board Meeting Cancelled',
          content: `The board meeting scheduled for ${meeting.meetingDate.toLocaleDateString()} has been cancelled.${reason ? ` Reason: ${reason}` : ''}`,
          actionUrl: `/board/meetings/${meeting.id}`,
          data: { meetingId: meeting.id },
        });
      }
    } catch (error) {
      logger.error('Error sending meeting cancelled notifications', { error, meetingId: meeting.id });
    }
  }

  private async notifyResolutionProposed(resolution: ResolutionWithVotes, directors: Participant[]): Promise<void> {
    try {
      for (const director of directors) {
        await notificationService.createNotification({
          recipientId: director.userId,
          type: 'BOARD_MEETING',
          priority: 'HIGH',
          title: 'New Resolution Proposed',
          content: `A new resolution "${resolution.title}" has been proposed for voting`,
          actionUrl: `/board/resolutions/${resolution.id}`,
          data: { resolutionId: resolution.id },
        });
      }
    } catch (error) {
      logger.error('Error sending resolution proposed notifications', { error, resolutionId: resolution.id });
    }
  }

  private async notifyResolutionResult(resolution: BoardResolution, result: ResolutionResult, directors: Participant[]): Promise<void> {
    try {
      for (const director of directors) {
        await notificationService.createNotification({
          recipientId: director.userId,
          type: 'BOARD_MEETING',
          priority: 'MEDIUM',
          title: `Resolution ${result}`,
          content: `The resolution "${resolution.title}" has ${result.toLowerCase()}`,
          actionUrl: `/board/resolutions/${resolution.id}`,
          data: { resolutionId: resolution.id, result },
        });
      }
    } catch (error) {
      logger.error('Error sending resolution result notifications', { error, resolutionId: resolution.id });
    }
  }
}

export const boardService = new BoardService();
