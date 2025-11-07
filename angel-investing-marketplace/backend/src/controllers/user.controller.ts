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

interface UserParams {
  id: string;
}

interface KycSubmissionData {
  personalInfo: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    nationality: string;
    address: {
      street: string;
      city: string;
      state: string;
      country: string;
      postalCode: string;
    };
  };
  documents: Array<{
    documentType: string;
    documentNumber: string;
    expiryDate: string;
    issuingCountry: string;
    fileUrl: string;
  }>;
  additionalInfo?: string;
}

interface AccreditationData {
  accreditationType: string;
  verificationMethod: string;
  documents: Array<{
    documentType: string;
    fileUrl: string;
    description?: string;
  }>;
  declaration: {
    iConfirmAccredited: boolean;
    understandRisks: boolean;
    signature: string;
    signatureDate: string;
  };
}

class UserController {
  // Get current user profile
  async getProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const user = await this.findUserById(userId);
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      sendSuccess(res, {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar_url: user.avatarUrl,
        profile_data: user.profileData,
        is_verified: user.isVerified,
        created_at: user.createdAt,
      }, 'Profile retrieved successfully');

    } catch (error) {
      next(error);
    }
  }

  // Get user by ID (public profile)
  async getUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as unknown as UserParams;

      const user = await this.findUserById(id);
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Return public profile data
      const publicProfile = {
        id: user.id,
        name: user.name,
        avatar_url: user.avatarUrl,
        role: user.role,
        public_profile: {
          bio: user.userProfile?.bio,
          location: user.userProfile?.location,
          investment_focus: user.profileData,
        },
        portfolio_summary: await this.getUserPortfolioSummary(id),
        is_verified: user.isVerified,
        member_since: user.createdAt,
      };

      sendSuccess(res, publicProfile, 'User profile retrieved successfully');

    } catch (error) {
      next(error);
    }
  }

  // Update user profile
  async updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const updateData = req.body;

      // Handle avatar upload if provided
      if (req.file) {
        // File upload is handled by the middleware, get the URL from processed files
        if (req.processedFiles && req.processedFiles.length > 0) {
          updateData.avatarUrl = req.processedFiles[0].url;
        }
      }

      const user = await this.updateUserProfile(userId, updateData);

      logger.info('User profile updated', { userId });

      sendSuccess(res, {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar_url: user.avatarUrl,
        profile_data: user.profileData,
      }, 'Profile updated successfully');

    } catch (error) {
      next(error);
    }
  }

  // Submit KYC verification
  async submitKyc(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const kycData: KycSubmissionData = req.body;

      // Validate user is eligible for KYC submission
      const user = await this.findUserById(userId);
      if (user?.userProfile?.kycStatus === 'VERIFIED') {
        throw new AppError('KYC is already approved', 400, 'KYC_ALREADY_APPROVED');
      }

      // Process document uploads if provided
      if (req.processedFiles && req.processedFiles.length > 0) {
        for (let i = 0; i < Math.min(kycData.documents.length, req.processedFiles.length); i++) {
          kycData.documents[i].fileUrl = req.processedFiles[i].url;
        }
      }

      // Submit KYC
      const kycSubmission = await this.submitKycVerification(userId, kycData);

      logger.info('KYC submitted', { userId, submissionId: kycSubmission.id });

      sendSuccess(res, {
        id: kycSubmission.id,
        status: kycSubmission.status,
        submitted_at: kycSubmission.submittedAt,
        estimated_completion: kycSubmission.estimatedCompletion,
      }, 'KYC verification submitted successfully', 201);

    } catch (error) {
      next(error);
    }
  }

  // Get KYC status
  async getKycStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const kycStatus = await this.getUserKycStatus(userId);

      sendSuccess(res, {
        status: kycStatus.status,
        submitted_at: kycStatus.submittedAt,
        reviewed_at: kycStatus.reviewedAt,
        reviewed_by: kycStatus.reviewedBy,
        notes: kycStatus.notes,
        documents: kycStatus.documents,
        rejection_reason: kycStatus.rejectionReason,
      }, 'KYC status retrieved successfully');

    } catch (error) {
      next(error);
    }
  }

  // Submit accreditation
  async submitAccreditation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const accreditationData: AccreditationData = req.body;

      // Validate user is eligible for accreditation submission
      const user = await this.findUserById(userId);
      if (user?.userProfile?.accreditationStatus === 'VERIFIED') {
        throw new AppError('Accreditation is already approved', 400, 'ACCREDITATION_ALREADY_APPROVED');
      }

      // Process document uploads if provided
      if (req.processedFiles && req.processedFiles.length > 0) {
        for (let i = 0; i < Math.min(accreditationData.documents.length, req.processedFiles.length); i++) {
          accreditationData.documents[i].fileUrl = req.processedFiles[i].url;
        }
      }

      // Submit accreditation
      const accreditationSubmission = await this.submitAccreditationVerification(userId, accreditationData);

      logger.info('Accreditation submitted', { userId, submissionId: accreditationSubmission.id });

      sendSuccess(res, {
        id: accreditationSubmission.id,
        status: accreditationSubmission.status,
        submitted_at: accreditationSubmission.submittedAt,
        estimated_completion: accreditationSubmission.estimatedCompletion,
      }, 'Accreditation submitted successfully', 201);

    } catch (error) {
      next(error);
    }
  }

  // Get accreditation status
  async getAccreditationStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const accreditationStatus = await this.getUserAccreditationStatus(userId);

      sendSuccess(res, {
        status: accreditationStatus.status,
        submitted_at: accreditationStatus.submittedAt,
        reviewed_at: accreditationStatus.reviewedAt,
        reviewed_by: accreditationStatus.reviewedBy,
        notes: accreditationStatus.notes,
        documents: accreditationStatus.documents,
        rejection_reason: accreditationStatus.rejectionReason,
        accreditation_type: accreditationStatus.accreditationType,
      }, 'Accreditation status retrieved successfully');

    } catch (error) {
      next(error);
    }
  }

  // List users (admin only)
  async listUsers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // Check if user is admin
      if (req.user?.role !== 'ADMIN') {
        throw new AppError('Admin access required', 403, 'ADMIN_ACCESS_REQUIRED');
      }

      const queryParams = req.query;
      const {
        role,
        isVerified,
        isActive,
        kycStatus,
        accreditationStatus,
        search,
        page,
        limit,
        sortBy,
        sortOrder,
      } = queryParams as any;

      const result = await this.getUsersList({
        role,
        isVerified: isVerified === 'true',
        isActive: isActive === 'true',
        kycStatus,
        accreditationStatus,
        search,
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
        sortBy,
        sortOrder,
      });

      sendSuccess(res, {
        users: result.users,
        pagination: result.pagination,
      }, 'Users retrieved successfully');

    } catch (error) {
      next(error);
    }
  }

  // Update user status (admin only)
  async updateUserStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // Check if user is admin
      if (req.user?.role !== 'ADMIN') {
        throw new AppError('Admin access required', 403, 'ADMIN_ACCESS_REQUIRED');
      }

      const { id } = req.params as unknown as UserParams;
      const { isActive, reason, adminNotes } = req.body;

      const user = await this.updateUserStatusByAdmin(id, {
        isActive,
        reason,
        adminNotes,
        updatedBy: req.user!.id,
      });

      logger.info('User status updated by admin', {
        userId: id,
        adminId: req.user!.id,
        isActive,
      });

      sendSuccess(res, {
        id: user.id,
        is_verified: user.isVerified,
        updated_at: user.updatedAt,
      }, 'User status updated successfully');

    } catch (error) {
      next(error);
    }
  }

  // Delete/Deactivate user (admin only)
  async deleteUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // Check if user is admin
      if (req.user?.role !== 'ADMIN') {
        throw new AppError('Admin access required', 403, 'ADMIN_ACCESS_REQUIRED');
      }

      const { id } = req.params as unknown as UserParams;
      const { reason, adminNotes } = req.body;

      await this.deactivateUser(id, {
        reason,
        adminNotes,
        deactivatedBy: req.user!.id,
      });

      logger.info('User deactivated by admin', {
        userId: id,
        adminId: req.user!.id,
      });

      sendSuccess(res, null, 'User deactivated successfully');

    } catch (error) {
      next(error);
    }
  }

  // Get user portfolio summary (public)
  async getUserPortfolioSummary(userId: string) {
    try {
      const investments = await prisma.investment.findMany({
        where: { investorId: userId },
        include: { pitch: true },
      });

      const totalInvestments = investments.length;
      const totalAmountInvested = investments.reduce((sum, inv) => sum + Number(inv.amount), 0);
      const activeInvestments = investments.filter(inv => inv.status === 'COMPLETED').length;

      // Calculate realized returns (simplified calculation)
      const realizedReturns = investments
        .filter(inv => inv.status === 'COMPLETED')
        .reduce((sum, inv) => sum + (Number(inv.amount) * 0.1), 0); // Assuming 10% average return

      return {
        total_investments: totalInvestments,
        total_amount_invested: totalAmountInvested,
        active_investments: activeInvestments,
        realized_returns: realizedReturns,
      };
    } catch (error) {
      logger.error('Error calculating portfolio summary', { userId, error });
      return {
        total_investments: 0,
        total_amount_invested: 0,
        active_investments: 0,
        realized_returns: 0,
      };
    }
  }

  // Database operations (these would typically be in a service layer)
  private async findUserById(id: string) {
    try {
      return await prisma.user.findUnique({
        where: { id },
        include: {
          userProfile: true,
          complianceProfile: true,
        },
      });
    } catch (error) {
      logger.error('Error finding user by ID', { id, error });
      throw error;
    }
  }

  private async updateUserProfile(userId: string, updateData: any) {
    try {
      const { profile_data, ...userFields } = updateData;

      return await prisma.user.update({
        where: { id: userId },
        data: {
          ...userFields,
          ...(profile_data && {
            userProfile: {
              upsert: {
                create: {
                  bio: profile_data.bio,
                  location: profile_data.location,
                },
                update: {
                  bio: profile_data.bio,
                  location: profile_data.location,
                },
              },
            },
          }),
        },
        include: {
          userProfile: true,
        },
      });
    } catch (error) {
      logger.error('Error updating user profile', { userId, error });
      throw error;
    }
  }

  private async submitKycVerification(userId: string, kycData: KycSubmissionData) {
    try {
      // Update user profile with KYC data
      await prisma.userProfile.update({
        where: { userId },
        data: {
          kycStatus: 'PENDING',
        },
      });

      // Create compliance profile if it doesn't exist and log entry
      const complianceProfile = await prisma.complianceProfile.upsert({
        where: { userId },
        create: { userId },
        update: {},
      });

      await prisma.complianceLog.create({
        data: {
          complianceProfileId: complianceProfile.id,
          action: 'KYC_SUBMITTED',
          details: kycData as any,
        },
      });

      return {
        id: `kyc_${Date.now()}`,
        status: 'PENDING',
        submittedAt: new Date(),
        estimatedCompletion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      };
    } catch (error) {
      logger.error('Error submitting KYC verification', { userId, error });
      throw error;
    }
  }

  private async getUserKycStatus(userId: string) {
    try {
      const userProfile = await prisma.userProfile.findUnique({
        where: { userId },
      });

      return {
        status: userProfile?.kycStatus || 'PENDING',
        submittedAt: userProfile?.createdAt || new Date(),
        reviewedAt: null,
        reviewedBy: null,
        notes: null,
        documents: [],
        rejectionReason: null,
      };
    } catch (error) {
      logger.error('Error getting KYC status', { userId, error });
      throw error;
    }
  }

  private async submitAccreditationVerification(userId: string, _accreditationData: AccreditationData) {
    try {
      // Update user profile with accreditation data
      await prisma.userProfile.update({
        where: { userId },
        data: {
          accreditationStatus: 'PENDING',
        },
      });

      return {
        id: `accreditation_${Date.now()}`,
        status: 'PENDING',
        submittedAt: new Date(),
        estimatedCompletion: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days
      };
    } catch (error) {
      logger.error('Error submitting accreditation verification', { userId, error });
      throw error;
    }
  }

  private async getUserAccreditationStatus(userId: string) {
    try {
      const userProfile = await prisma.userProfile.findUnique({
        where: { userId },
      });

      return {
        status: userProfile?.accreditationStatus || 'PENDING',
        submittedAt: userProfile?.createdAt || new Date(),
        reviewedAt: null,
        reviewedBy: null,
        notes: null,
        documents: [],
        rejectionReason: null,
        accreditationType: null,
      };
    } catch (error) {
      logger.error('Error getting accreditation status', { userId, error });
      throw error;
    }
  }

  private async getUsersList(filters: any) {
    try {
      const { page, limit, search, role, isVerified, sortBy, sortOrder } = filters;

      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {};

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (role) where.role = role;
      if (isVerified !== undefined) where.isVerified = isVerified;

      // Get users
      const users = await prisma.user.findMany({
        where,
        include: {
          userProfile: true,
          complianceProfile: true,
        },
        orderBy: sortBy ? { [sortBy]: sortOrder || 'asc' } : { createdAt: 'desc' },
        skip,
        take: limit,
      });

      // Get total count
      const total = await prisma.user.count({ where });

      return {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error getting users list', { filters, error });
      throw error;
    }
  }

  private async updateUserStatusByAdmin(userId: string, updateData: any) {
    try {
      return await prisma.user.update({
        where: { id: userId },
        data: {
          isVerified: updateData.isActive,
        },
      });
    } catch (error) {
      logger.error('Error updating user status by admin', { userId, error });
      throw error;
    }
  }

  private async deactivateUser(userId: string, _data: any) {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          isVerified: false,
        },
      });
    } catch (error) {
      logger.error('Error deactivating user', { userId, error });
      throw error;
    }
  }

  /**
   * Get account settings
   * GET /api/users/account-settings
   */
  async getAccountSettings(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const user = await this.findUserById(userId);
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Parse profile data for privacy settings
      const profileData = user.profileData as any || {};
      const privacy = profileData.privacy || {
        profileVisibility: 'PUBLIC',
        showInvestmentHistory: true,
        showPortfolio: true,
        allowMessaging: true,
      };

      sendSuccess(res, {
        email: user.email,
        username: user.name || user.email.split('@')[0],
        emailVerified: user.isVerified,
        accountCreatedAt: user.createdAt,
        privacy,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update account settings
   * PUT /api/users/account-settings
   */
  async updateAccountSettings(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { username, privacy } = req.body;

      const user = await this.findUserById(userId);
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Update user data
      const profileData = user.profileData as any || {};
      if (privacy) {
        profileData.privacy = {
          ...profileData.privacy,
          ...privacy,
        };
      }

      const updateData: any = {
        profileData,
      };

      if (username) {
        updateData.name = username;
      }

      await prisma.user.update({
        where: { id: userId },
        data: updateData,
      });

      logger.info('Account settings updated', { userId });

      sendSuccess(res, {
        message: 'Account settings updated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export user data
   * POST /api/users/export-data
   */
  async exportUserData(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      // In a real implementation:
      // 1. Fetch all user data (profile, investments, messages, etc.)
      // 2. Generate JSON export
      // 3. Create downloadable file
      // 4. Return file URL or direct file download

      const user = await this.findUserById(userId);
      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      const exportData = {
        profile: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: user.createdAt,
          profileData: user.profileData,
        },
        // Add more data here in real implementation
        exportedAt: new Date().toISOString(),
      };

      logger.info('User data exported', { userId });

      // Return JSON directly
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="user-data-${userId}.json"`);
      res.send(JSON.stringify(exportData, null, 2));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload avatar
   * POST /api/users/avatar
   */
  async uploadAvatar(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      // In a real implementation with multer:
      // const file = req.file;
      // if (!file) {
      //   throw new AppError('No file uploaded', 400, 'NO_FILE');
      // }

      // Mock avatar URL
      const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`;

      await prisma.user.update({
        where: { id: userId },
        data: { avatarUrl },
      });

      logger.info('Avatar uploaded', { userId });

      sendSuccess(res, {
        avatarUrl,
      }, 'Avatar uploaded successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete user account
   * DELETE /api/users/me
   */
  async deleteAccount(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        throw new AppError('User not authenticated', 401, 'NOT_AUTHENTICATED');
      }

      const { confirmation } = req.body;
      if (confirmation !== 'DELETE MY ACCOUNT') {
        throw new AppError('Invalid confirmation text', 400, 'INVALID_CONFIRMATION');
      }

      // In a real implementation:
      // 1. Soft delete or hard delete based on requirements
      // 2. Cancel all active investments/commitments
      // 3. Remove from syndicates
      // 4. Delete or anonymize data per GDPR
      // 5. Send confirmation email

      await prisma.user.update({
        where: { id: userId },
        data: {
          isVerified: false,
          // Could add a deletedAt field for soft delete
        },
      });

      logger.info('User account deleted', { userId });

      sendSuccess(res, {
        message: 'Account deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

// Export singleton instance
export const userController = new UserController();
export default userController;