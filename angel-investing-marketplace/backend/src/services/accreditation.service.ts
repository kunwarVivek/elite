import { logger } from '../config/logger.js';
import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  AccreditationStatus,
  AccreditationMethod,
  KycStatus,
} from '@prisma/client';

export interface AccreditationSubmission {
  userId: string;
  method: AccreditationMethod;
  annualIncome?: number;
  netWorth?: number;
  professionalCertification?: string;
  existingRelationship?: string;
  documents: Array<{
    type: string;
    url: string;
    description?: string;
  }>;
  declaration: {
    iConfirmAccredited: boolean;
    understandRisks: boolean;
    signature: string;
    signatureDate: Date;
  };
}

export interface AccreditationVerificationResult {
  success: boolean;
  status: AccreditationStatus;
  profileId: string;
  expiryDate?: Date;
  message: string;
}

/**
 * Accreditation Service
 * Handles investor accreditation verification per SEC Regulation D requirements
 * - $200K+ annual income OR $1M+ net worth required
 * - 90-day verification expiry for initial, annual re-verification required
 * - Supports multiple verification methods
 */
export class AccreditationService {
  /**
   * Submit accreditation application
   */
  async submitAccreditation(
    data: AccreditationSubmission
  ): Promise<AccreditationVerificationResult> {
    try {
      logger.info('Processing accreditation submission', {
        userId: data.userId,
        method: data.method,
      });

      // Validate user exists
      const user = await prisma.user.findUnique({
        where: { id: data.userId },
        include: { complianceProfile: true },
      });

      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Check if already accredited
      if (
        user.complianceProfile?.accreditedInvestorStatus === 'VERIFIED' &&
        user.complianceProfile.accreditationExpiry &&
        new Date(user.complianceProfile.accreditationExpiry) > new Date()
      ) {
        return {
          success: false,
          status: 'VERIFIED',
          profileId: user.complianceProfile.id,
          expiryDate: user.complianceProfile.accreditationExpiry,
          message:
            'Already accredited. Current accreditation is still valid.',
        };
      }

      // Validate accreditation criteria
      const meetsIncomeCriteria = this.validateIncomeCriteria(
        data.annualIncome
      );
      const meetsNetWorthCriteria = this.validateNetWorthCriteria(
        data.netWorth
      );

      let autoVerify = false;
      let preliminaryStatus: AccreditationStatus = 'PENDING';

      // Determine if criteria met for automatic pending status
      switch (data.method) {
        case 'INCOME':
          if (!meetsIncomeCriteria) {
            throw new AppError(
              'Annual income does not meet accreditation requirement ($200K+)',
              400,
              'INSUFFICIENT_INCOME'
            );
          }
          break;
        case 'NET_WORTH':
          if (!meetsNetWorthCriteria) {
            throw new AppError(
              'Net worth does not meet accreditation requirement ($1M+)',
              400,
              'INSUFFICIENT_NET_WORTH'
            );
          }
          break;
        case 'PROFESSIONAL':
          // Requires manual verification
          break;
        case 'THIRD_PARTY_VERIFICATION':
          // Would integrate with third-party service here
          // For MVP, mark as pending for manual review
          break;
        default:
          break;
      }

      // Calculate expiry date (90 days from now for initial verification)
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 90);

      // Create or update compliance profile
      const complianceProfile = await prisma.complianceProfile.upsert({
        where: { userId: data.userId },
        update: {
          accreditedInvestorStatus: preliminaryStatus,
          accreditationMethod: data.method,
          annualIncome: data.annualIncome,
          netWorth: data.netWorth,
          accreditationExpiry: expiryDate,
          accreditationDocuments: data.documents,
          lastComplianceReview: new Date(),
        },
        create: {
          userId: data.userId,
          accreditedInvestorStatus: preliminaryStatus,
          accreditationMethod: data.method,
          annualIncome: data.annualIncome,
          netWorth: data.netWorth,
          accreditationExpiry: expiryDate,
          accreditationDocuments: data.documents,
          lastComplianceReview: new Date(),
          gdprConsent: false,
        },
      });

      // Store documents in compliance_documents table
      if (data.documents && data.documents.length > 0) {
        await Promise.all(
          data.documents.map((doc) =>
            prisma.complianceDocument.create({
              data: {
                complianceProfileId: complianceProfile.id,
                documentType: this.mapDocumentType(doc.type),
                fileName: doc.url.split('/').pop() || 'document',
                filePath: doc.url,
                fileUrl: doc.url,
                fileSize: 0, // Would be populated from actual file
                notes: doc.description,
                documentStatus: 'PENDING',
              },
            })
          )
        );
      }

      // Create compliance log entry
      await prisma.complianceLog.create({
        data: {
          complianceProfileId: complianceProfile.id,
          action: 'ACCREDITATION_SUBMITTED',
          status: 'PENDING',
          details: {
            method: data.method,
            submittedAt: new Date(),
            declaration: data.declaration,
          },
        },
      });

      // Create notification for admin review
      await this.notifyAdminForReview(user.id, complianceProfile.id);

      // Send confirmation email to user
      await this.sendAccreditationSubmittedEmail(user.email, user.name);

      logger.info('Accreditation submitted successfully', {
        userId: data.userId,
        profileId: complianceProfile.id,
        status: preliminaryStatus,
      });

      return {
        success: true,
        status: preliminaryStatus,
        profileId: complianceProfile.id,
        expiryDate,
        message:
          'Accreditation application submitted successfully. Our team will review within 2-3 business days.',
      };
    } catch (error) {
      logger.error('Failed to submit accreditation', {
        error,
        userId: data.userId,
      });
      throw error;
    }
  }

  /**
   * Get accreditation status for a user
   */
  async getAccreditationStatus(userId: string) {
    try {
      const profile = await prisma.complianceProfile.findUnique({
        where: { userId },
        include: {
          complianceDocuments: {
            where: {
              documentType: {
                in: [
                  'ACCREDITATION_CERTIFICATE',
                  'BANK_STATEMENT',
                  'TAX_RETURN',
                ],
              },
            },
            orderBy: { createdAt: 'desc' },
          },
          complianceLogs: {
            where: {
              action: {
                in: [
                  'ACCREDITATION_SUBMITTED',
                  'ACCREDITATION_VERIFIED',
                  'ACCREDITATION_REJECTED',
                ],
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      });

      if (!profile) {
        return {
          status: 'NOT_SUBMITTED',
          message: 'Accreditation not yet submitted',
        };
      }

      // Check if accreditation expired
      const isExpired =
        profile.accreditationExpiry &&
        new Date(profile.accreditationExpiry) < new Date();

      return {
        status: isExpired ? 'EXPIRED' : profile.accreditedInvestorStatus,
        method: profile.accreditationMethod,
        annualIncome: profile.annualIncome,
        netWorth: profile.netWorth,
        submittedAt: profile.lastComplianceReview,
        verifiedAt: profile.accreditedInvestorVerifiedAt,
        expiryDate: profile.accreditationExpiry,
        documents: profile.complianceDocuments,
        logs: profile.complianceLogs,
        needsRenewal: isExpired || this.needsAnnualRenewal(profile),
      };
    } catch (error) {
      logger.error('Failed to get accreditation status', { error, userId });
      throw error;
    }
  }

  /**
   * Admin: Verify accreditation
   */
  async verifyAccreditation(
    profileId: string,
    adminId: string,
    approved: boolean,
    notes?: string
  ): Promise<AccreditationVerificationResult> {
    try {
      const profile = await prisma.complianceProfile.findUnique({
        where: { id: profileId },
        include: { user: true },
      });

      if (!profile) {
        throw new AppError(
          'Compliance profile not found',
          404,
          'PROFILE_NOT_FOUND'
        );
      }

      const newStatus: AccreditationStatus = approved ? 'VERIFIED' : 'REJECTED';
      const now = new Date();

      // Calculate expiry date for verified accreditation
      let expiryDate: Date | null = null;
      if (approved) {
        expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 1); // Annual renewal
      }

      // Update profile
      const updatedProfile = await prisma.complianceProfile.update({
        where: { id: profileId },
        data: {
          accreditedInvestorStatus: newStatus,
          accreditedInvestorVerifiedAt: approved ? now : null,
          accreditationExpiry: expiryDate,
          complianceNotes: notes,
          lastComplianceReview: now,
        },
      });

      // Update all documents status
      await prisma.complianceDocument.updateMany({
        where: { complianceProfileId: profileId },
        data: {
          documentStatus: approved ? 'VERIFIED' : 'REJECTED',
          verifiedAt: approved ? now : null,
          verifiedBy: adminId,
        },
      });

      // Create compliance log
      await prisma.complianceLog.create({
        data: {
          complianceProfileId: profileId,
          action: approved
            ? 'ACCREDITATION_VERIFIED'
            : 'ACCREDITATION_REJECTED',
          status: approved ? 'COMPLETED' : 'FAILED',
          details: {
            reviewedBy: adminId,
            reviewedAt: now,
            notes,
          },
          performedBy: adminId,
        },
      });

      // Create notification for user
      await prisma.notification.create({
        data: {
          userId: profile.userId,
          type: 'SYSTEM',
          title: approved
            ? 'Accreditation Verified'
            : 'Accreditation Rejected',
          content: approved
            ? `Your accreditation has been verified. You can now invest up to regulatory limits.`
            : `Your accreditation application was not approved. ${notes || 'Please contact support for more information.'}`,
          priority: 'HIGH',
        },
      });

      // Send email notification
      await this.sendAccreditationResultEmail(
        profile.user.email,
        profile.user.name,
        approved,
        notes
      );

      logger.info('Accreditation verification completed', {
        profileId,
        approved,
        adminId,
      });

      return {
        success: true,
        status: newStatus,
        profileId: updatedProfile.id,
        expiryDate: expiryDate || undefined,
        message: approved
          ? 'Accreditation verified successfully'
          : 'Accreditation rejected',
      };
    } catch (error) {
      logger.error('Failed to verify accreditation', {
        error,
        profileId,
        adminId,
      });
      throw error;
    }
  }

  /**
   * Renew expired accreditation
   */
  async renewAccreditation(
    userId: string,
    documents: Array<{ type: string; url: string; description?: string }>
  ) {
    try {
      const profile = await prisma.complianceProfile.findUnique({
        where: { userId },
      });

      if (!profile) {
        throw new AppError(
          'No accreditation profile found',
          404,
          'PROFILE_NOT_FOUND'
        );
      }

      // Mark as pending renewal
      await prisma.complianceProfile.update({
        where: { id: profile.id },
        data: {
          accreditedInvestorStatus: 'PENDING',
          lastComplianceReview: new Date(),
        },
      });

      // Add new documents
      if (documents && documents.length > 0) {
        await Promise.all(
          documents.map((doc) =>
            prisma.complianceDocument.create({
              data: {
                complianceProfileId: profile.id,
                documentType: this.mapDocumentType(doc.type),
                fileName: doc.url.split('/').pop() || 'document',
                filePath: doc.url,
                fileUrl: doc.url,
                fileSize: 0,
                notes: doc.description,
                documentStatus: 'PENDING',
              },
            })
          )
        );
      }

      // Create compliance log
      await prisma.complianceLog.create({
        data: {
          complianceProfileId: profile.id,
          action: 'ACCREDITATION_RENEWAL_SUBMITTED',
          status: 'PENDING',
          details: {
            submittedAt: new Date(),
            documentCount: documents.length,
          },
        },
      });

      logger.info('Accreditation renewal submitted', { userId, profileId: profile.id });

      return {
        success: true,
        message: 'Renewal application submitted successfully',
      };
    } catch (error) {
      logger.error('Failed to renew accreditation', { error, userId });
      throw error;
    }
  }

  /**
   * Check if user is currently accredited
   */
  async isAccredited(userId: string): Promise<boolean> {
    try {
      const profile = await prisma.complianceProfile.findUnique({
        where: { userId },
      });

      if (!profile || profile.accreditedInvestorStatus !== 'VERIFIED') {
        return false;
      }

      // Check expiry
      if (
        profile.accreditationExpiry &&
        new Date(profile.accreditationExpiry) < new Date()
      ) {
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Failed to check accreditation status', { error, userId });
      return false;
    }
  }

  /**
   * Get pending accreditations for admin review
   */
  async getPendingAccreditations(limit = 50, offset = 0) {
    try {
      const [profiles, total] = await Promise.all([
        prisma.complianceProfile.findMany({
          where: {
            accreditedInvestorStatus: 'PENDING',
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
                createdAt: true,
              },
            },
            complianceDocuments: {
              where: { documentStatus: 'PENDING' },
            },
          },
          orderBy: {
            lastComplianceReview: 'asc', // Oldest first
          },
          take: limit,
          skip: offset,
        }),
        prisma.complianceProfile.count({
          where: { accreditedInvestorStatus: 'PENDING' },
        }),
      ]);

      return {
        profiles,
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      };
    } catch (error) {
      logger.error('Failed to get pending accreditations', { error });
      throw error;
    }
  }

  // ==================== PRIVATE HELPER METHODS ====================

  /**
   * Validate income meets SEC requirement
   */
  private validateIncomeCriteria(annualIncome?: number): boolean {
    if (!annualIncome) return false;
    return annualIncome >= 200000; // $200K minimum
  }

  /**
   * Validate net worth meets SEC requirement
   */
  private validateNetWorthCriteria(netWorth?: number): boolean {
    if (!netWorth) return false;
    return netWorth >= 1000000; // $1M minimum
  }

  /**
   * Check if annual renewal is needed
   */
  private needsAnnualRenewal(profile: any): boolean {
    if (!profile.accreditedInvestorVerifiedAt) return false;

    const verifiedDate = new Date(profile.accreditedInvestorVerifiedAt);
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    return verifiedDate < oneYearAgo;
  }

  /**
   * Map document type string to enum
   */
  private mapDocumentType(type: string): any {
    const typeMap: Record<string, any> = {
      bank_statement: 'BANK_STATEMENT',
      tax_return: 'TAX_RETURN',
      accreditation_certificate: 'ACCREDITATION_CERTIFICATE',
      proof_of_address: 'PROOF_OF_ADDRESS',
      other: 'OTHER',
    };

    return typeMap[type.toLowerCase()] || 'OTHER';
  }

  /**
   * Notify admin for pending review
   */
  private async notifyAdminForReview(userId: string, profileId: string) {
    try {
      // Find all admin users
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' },
      });

      // Create notifications for all admins
      await Promise.all(
        admins.map((admin) =>
          prisma.notification.create({
            data: {
              userId: admin.id,
              type: 'SYSTEM',
              title: 'New Accreditation Review Needed',
              content: `A new accreditation application requires review. Profile ID: ${profileId}`,
              priority: 'HIGH',
              actionUrl: `/admin/accreditation/${profileId}`,
            },
          })
        )
      );
    } catch (error) {
      logger.error('Failed to notify admins', { error, profileId });
      // Don't throw, as this is non-critical
    }
  }

  /**
   * Send accreditation submitted email
   */
  private async sendAccreditationSubmittedEmail(
    email: string,
    name: string | null
  ) {
    try {
      // Email service integration would go here
      logger.info('Accreditation submitted email sent', { email });
    } catch (error) {
      logger.error('Failed to send accreditation submitted email', {
        error,
        email,
      });
    }
  }

  /**
   * Send accreditation result email
   */
  private async sendAccreditationResultEmail(
    email: string,
    name: string | null,
    approved: boolean,
    notes?: string
  ) {
    try {
      // Email service integration would go here
      logger.info('Accreditation result email sent', { email, approved });
    } catch (error) {
      logger.error('Failed to send accreditation result email', {
        error,
        email,
      });
    }
  }
}

// Export singleton instance
export const accreditationService = new AccreditationService();
