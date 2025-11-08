import { logger } from '../config/logger.js';
import { prisma } from '../config/database.js';
import { AppError } from '../middleware/errorHandler.js';
import { AmlStatus, PepStatus, SanctionStatus } from '@prisma/client';

/**
 * Enhanced AML/KYC Service
 * Comprehensive Anti-Money Laundering and Know Your Customer screening
 * Includes PEP, Sanctions, Adverse Media, and Risk Scoring
 */

export interface EnhancedKycData {
  userId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  nationality: string;
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  identification: {
    type: 'PASSPORT' | 'DRIVERS_LICENSE' | 'NATIONAL_ID';
    number: string;
    issuedDate: string;
    expiryDate: string;
    issuingCountry: string;
    frontImageUrl?: string;
    backImageUrl?: string;
    selfieUrl?: string;
  };
  phoneNumber?: string;
  occupation?: string;
  sourceOfFunds?: string;
}

export interface PepScreeningResult {
  isPep: boolean;
  pepStatus: PepStatus;
  matches: Array<{
    name: string;
    position: string;
    country: string;
    dateOfBirth?: string;
    matchScore: number;
    category: 'FOREIGN_PEP' | 'DOMESTIC_PEP' | 'INTERNATIONAL_ORG' | 'FAMILY_MEMBER' | 'CLOSE_ASSOCIATE';
  }>;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface SanctionsScreeningResult {
  isSanctioned: boolean;
  sanctionStatus: SanctionStatus;
  matches: Array<{
    name: string;
    listName: string;
    country: string;
    dateAdded: string;
    matchScore: number;
    listSource: 'OFAC' | 'UN' | 'EU' | 'UK_HMT' | 'OTHER';
  }>;
  riskLevel: 'CLEAR' | 'PARTIAL_MATCH' | 'FULL_MATCH';
}

export interface AdverseMediaScreeningResult {
  hasAdverseMedia: boolean;
  matches: Array<{
    title: string;
    source: string;
    date: string;
    summary: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    categories: string[];
  }>;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface RiskAssessment {
  overallRiskScore: number; // 0-100
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  factors: Array<{
    factor: string;
    score: number;
    weight: number;
    description: string;
  }>;
  recommendation: 'APPROVE' | 'MANUAL_REVIEW' | 'REJECT';
  reasoning: string;
}

export interface ComprehensiveScreeningResult {
  success: boolean;
  screeningId: string;
  pepScreening: PepScreeningResult;
  sanctionsScreening: SanctionsScreeningResult;
  adverseMedia: AdverseMediaScreeningResult;
  riskAssessment: RiskAssessment;
  kycStatus: 'PASSED' | 'FAILED' | 'MANUAL_REVIEW';
  amlStatus: AmlStatus;
  screenedAt: Date;
  expiryDate: Date;
}

export class AmlKycService {
  /**
   * Perform comprehensive KYC/AML screening
   */
  async performComprehensiveScreening(
    data: EnhancedKycData
  ): Promise<ComprehensiveScreeningResult> {
    try {
      logger.info('Starting comprehensive KYC/AML screening', {
        userId: data.userId,
        nationality: data.nationality,
      });

      const screeningId = `screen_${data.userId}_${Date.now()}`;

      // Run all screenings in parallel
      const [pepResult, sanctionsResult, adverseMediaResult] = await Promise.all([
        this.screenPep(data),
        this.screenSanctions(data),
        this.screenAdverseMedia(data),
      ]);

      // Calculate risk assessment
      const riskAssessment = this.calculateRiskAssessment(
        pepResult,
        sanctionsResult,
        adverseMediaResult,
        data
      );

      // Determine overall status
      const kycStatus = this.determineKycStatus(riskAssessment);
      const amlStatus = this.determineAmlStatus(riskAssessment);

      // Calculate expiry date (1 year from now)
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);

      // Store screening results in database
      await this.storeScreeningResults(
        data.userId,
        screeningId,
        pepResult,
        sanctionsResult,
        adverseMediaResult,
        riskAssessment,
        kycStatus,
        amlStatus
      );

      logger.info('Comprehensive screening completed', {
        userId: data.userId,
        screeningId,
        riskLevel: riskAssessment.riskLevel,
        recommendation: riskAssessment.recommendation,
      });

      return {
        success: true,
        screeningId,
        pepScreening: pepResult,
        sanctionsScreening: sanctionsResult,
        adverseMedia: adverseMediaResult,
        riskAssessment,
        kycStatus,
        amlStatus,
        screenedAt: new Date(),
        expiryDate,
      };
    } catch (error) {
      logger.error('Comprehensive screening failed', {
        error,
        userId: data.userId,
      });
      throw new AppError(
        'Screening failed. Please try again.',
        500,
        'SCREENING_FAILED'
      );
    }
  }

  /**
   * Screen for Politically Exposed Persons (PEP)
   */
  private async screenPep(data: EnhancedKycData): Promise<PepScreeningResult> {
    try {
      // TODO: Integrate with real PEP database (e.g., Dow Jones, LexisNexis, ComplyAdvantage)
      // For now, simulate PEP screening

      const fullName = `${data.firstName} ${data.lastName}`;

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      // Mock PEP screening - 5% chance of match
      const isPep = Math.random() < 0.05;

      const matches = isPep
        ? [
            {
              name: fullName,
              position: 'Former Government Official',
              country: data.nationality,
              matchScore: 85,
              category: 'DOMESTIC_PEP' as const,
            },
          ]
        : [];

      const pepStatus: PepStatus = isPep ? 'PEP' : 'NOT_PEP';
      const riskLevel = isPep ? 'HIGH' : 'LOW';

      return {
        isPep,
        pepStatus,
        matches,
        riskLevel,
      };
    } catch (error) {
      logger.error('PEP screening failed', { error, userId: data.userId });
      // Return safe default
      return {
        isPep: false,
        pepStatus: 'NOT_PEP',
        matches: [],
        riskLevel: 'LOW',
      };
    }
  }

  /**
   * Screen against sanctions lists (OFAC, UN, EU, etc.)
   */
  private async screenSanctions(
    data: EnhancedKycData
  ): Promise<SanctionsScreeningResult> {
    try {
      // TODO: Integrate with sanctions list provider (e.g., Dow Jones, ComplyAdvantage)
      // Check OFAC, UN, EU, UK HMT lists

      const fullName = `${data.firstName} ${data.lastName}`;

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      // Mock sanctions screening - 1% chance of partial match
      const hasMatch = Math.random() < 0.01;

      const matches = hasMatch
        ? [
            {
              name: fullName,
              listName: 'OFAC SDN List',
              country: data.nationality,
              dateAdded: '2020-01-15',
              matchScore: 65,
              listSource: 'OFAC' as const,
            },
          ]
        : [];

      const isSanctioned = hasMatch && matches[0].matchScore > 80;
      const sanctionStatus: SanctionStatus = isSanctioned
        ? 'FULL_MATCH'
        : hasMatch
        ? 'PARTIAL_MATCH'
        : 'CLEAR';
      const riskLevel = isSanctioned
        ? 'FULL_MATCH'
        : hasMatch
        ? 'PARTIAL_MATCH'
        : 'CLEAR';

      return {
        isSanctioned,
        sanctionStatus,
        matches,
        riskLevel,
      };
    } catch (error) {
      logger.error('Sanctions screening failed', { error, userId: data.userId });
      // Return safe default
      return {
        isSanctioned: false,
        sanctionStatus: 'CLEAR',
        matches: [],
        riskLevel: 'CLEAR',
      };
    }
  }

  /**
   * Screen for adverse media
   */
  private async screenAdverseMedia(
    data: EnhancedKycData
  ): Promise<AdverseMediaScreeningResult> {
    try {
      // TODO: Integrate with adverse media provider

      const fullName = `${data.firstName} ${data.lastName}`;

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      // Mock adverse media screening - 10% chance of findings
      const hasAdverseMedia = Math.random() < 0.1;

      const matchSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
      const matches = hasAdverseMedia
        ? [
            {
              title: 'Business Lawsuit Settlement',
              source: 'Financial Times',
              date: '2023-06-15',
              summary:
                'Settled civil lawsuit related to business practices. No criminal charges filed.',
              severity: matchSeverity,
              categories: ['Civil Litigation', 'Business Disputes'],
            },
          ]
        : [];

      const riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = hasAdverseMedia
        ? matchSeverity
        : 'LOW';

      return {
        hasAdverseMedia,
        matches,
        riskLevel,
      };
    } catch (error) {
      logger.error('Adverse media screening failed', {
        error,
        userId: data.userId,
      });
      // Return safe default
      return {
        hasAdverseMedia: false,
        matches: [],
        riskLevel: 'LOW',
      };
    }
  }

  /**
   * Calculate comprehensive risk assessment
   */
  private calculateRiskAssessment(
    pepResult: PepScreeningResult,
    sanctionsResult: SanctionsScreeningResult,
    adverseMedia: AdverseMediaScreeningResult,
    data: EnhancedKycData
  ): RiskAssessment {
    const factors: Array<{
      factor: string;
      score: number;
      weight: number;
      description: string;
    }> = [];

    // PEP Risk (30% weight)
    let pepScore = 0;
    if (pepResult.isPep) {
      pepScore = pepResult.riskLevel === 'CRITICAL' ? 100 : pepResult.riskLevel === 'HIGH' ? 80 : 60;
      factors.push({
        factor: 'PEP Status',
        score: pepScore,
        weight: 0.3,
        description: `Identified as Politically Exposed Person: ${pepResult.matches[0]?.position || 'Unknown'}`,
      });
    } else {
      factors.push({
        factor: 'PEP Status',
        score: 0,
        weight: 0.3,
        description: 'No PEP matches found',
      });
    }

    // Sanctions Risk (40% weight) - Most critical
    let sanctionsScore = 0;
    if (sanctionsResult.isSanctioned) {
      sanctionsScore = 100;
      factors.push({
        factor: 'Sanctions List',
        score: sanctionsScore,
        weight: 0.4,
        description: `Found on sanctions list: ${sanctionsResult.matches[0]?.listName}`,
      });
    } else if (sanctionsResult.matches.length > 0) {
      sanctionsScore = 50;
      factors.push({
        factor: 'Sanctions List',
        score: sanctionsScore,
        weight: 0.4,
        description: 'Partial name match on sanctions list - requires review',
      });
    } else {
      factors.push({
        factor: 'Sanctions List',
        score: 0,
        weight: 0.4,
        description: 'No sanctions matches found',
      });
    }

    // Adverse Media Risk (20% weight)
    let mediaScore = 0;
    if (adverseMedia.hasAdverseMedia) {
      mediaScore =
        adverseMedia.riskLevel === 'HIGH'
          ? 80
          : adverseMedia.riskLevel === 'MEDIUM'
          ? 50
          : 30;
      factors.push({
        factor: 'Adverse Media',
        score: mediaScore,
        weight: 0.2,
        description: `Found ${adverseMedia.matches.length} adverse media article(s)`,
      });
    } else {
      factors.push({
        factor: 'Adverse Media',
        score: 0,
        weight: 0.2,
        description: 'No adverse media found',
      });
    }

    // High-risk geography (10% weight)
    const highRiskCountries = [
      'AF', 'BY', 'CF', 'CU', 'CD', 'ER', 'IR', 'IQ', 'KP', 'LY', 'ML', 'MM',
      'NI', 'PK', 'RU', 'SO', 'SS', 'SD', 'SY', 'UA', 'VE', 'YE', 'ZW',
    ];
    const geoScore = highRiskCountries.includes(data.nationality) ? 70 : 0;
    factors.push({
      factor: 'Geographic Risk',
      score: geoScore,
      weight: 0.1,
      description: highRiskCountries.includes(data.nationality)
        ? 'High-risk jurisdiction'
        : 'Standard jurisdiction',
    });

    // Calculate weighted overall score
    const overallRiskScore = Math.round(
      factors.reduce((sum, f) => sum + f.score * f.weight, 0)
    );

    // Determine risk level
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    if (overallRiskScore >= 80) riskLevel = 'CRITICAL';
    else if (overallRiskScore >= 60) riskLevel = 'HIGH';
    else if (overallRiskScore >= 30) riskLevel = 'MEDIUM';
    else riskLevel = 'LOW';

    // Determine recommendation
    let recommendation: 'APPROVE' | 'MANUAL_REVIEW' | 'REJECT';
    let reasoning: string;

    if (sanctionsResult.isSanctioned) {
      recommendation = 'REJECT';
      reasoning = 'Found on sanctions list - cannot proceed';
    } else if (overallRiskScore >= 70) {
      recommendation = 'MANUAL_REVIEW';
      reasoning = 'High risk score requires compliance officer review';
    } else if (overallRiskScore >= 40) {
      recommendation = 'MANUAL_REVIEW';
      reasoning = 'Moderate risk - manual review recommended';
    } else {
      recommendation = 'APPROVE';
      reasoning = 'Low risk - eligible for automatic approval';
    }

    return {
      overallRiskScore,
      riskLevel,
      factors,
      recommendation,
      reasoning,
    };
  }

  /**
   * Determine KYC status from risk assessment
   */
  private determineKycStatus(
    riskAssessment: RiskAssessment
  ): 'PASSED' | 'FAILED' | 'MANUAL_REVIEW' {
    if (riskAssessment.recommendation === 'REJECT') return 'FAILED';
    if (riskAssessment.recommendation === 'MANUAL_REVIEW') return 'MANUAL_REVIEW';
    return 'PASSED';
  }

  /**
   * Determine AML status from risk assessment
   */
  private determineAmlStatus(riskAssessment: RiskAssessment): AmlStatus {
    if (riskAssessment.recommendation === 'REJECT') return 'FAILED';
    if (riskAssessment.recommendation === 'MANUAL_REVIEW')
      return 'REQUIRES_REVIEW';
    return 'PASSED';
  }

  /**
   * Store screening results in database
   */
  private async storeScreeningResults(
    userId: string,
    screeningId: string,
    pepResult: PepScreeningResult,
    sanctionsResult: SanctionsScreeningResult,
    adverseMedia: AdverseMediaScreeningResult,
    riskAssessment: RiskAssessment,
    kycStatus: string,
    amlStatus: AmlStatus
  ) {
    try {
      // Update or create compliance profile
      await prisma.complianceProfile.upsert({
        where: { userId },
        update: {
          kycStatus: kycStatus === 'PASSED' ? 'VERIFIED' : 'PENDING',
          kycVerifiedAt: kycStatus === 'PASSED' ? new Date() : null,
          amlStatus,
          amlVerifiedAt: amlStatus === 'PASSED' ? new Date() : null,
          riskScore: riskAssessment.overallRiskScore,
          pepStatus: pepResult.pepStatus,
          sanctionStatus: sanctionsResult.sanctionStatus,
          lastComplianceReview: new Date(),
          nextComplianceReview: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        },
        create: {
          userId,
          kycStatus: kycStatus === 'PASSED' ? 'VERIFIED' : 'PENDING',
          kycVerifiedAt: kycStatus === 'PASSED' ? new Date() : null,
          amlStatus,
          amlVerifiedAt: amlStatus === 'PASSED' ? new Date() : null,
          riskScore: riskAssessment.overallRiskScore,
          pepStatus: pepResult.pepStatus,
          sanctionStatus: sanctionsResult.sanctionStatus,
          lastComplianceReview: new Date(),
          nextComplianceReview: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          accreditedInvestorStatus: 'PENDING',
          gdprConsent: false,
        },
      });

      // Create compliance log
      await prisma.complianceLog.create({
        data: {
          complianceProfileId: userId,
          action: 'COMPREHENSIVE_SCREENING',
          status:
            kycStatus === 'FAILED' || amlStatus === 'FAILED'
              ? 'FAILED'
              : kycStatus === 'MANUAL_REVIEW' || amlStatus === 'REQUIRES_REVIEW'
              ? 'REQUIRES_REVIEW'
              : 'COMPLETED',
          details: {
            screeningId,
            pepScreening: pepResult,
            sanctionsScreening: sanctionsResult,
            adverseMedia,
            riskAssessment,
            timestamp: new Date(),
          } as any,
        },
      });

      // Create notification if manual review needed
      if (
        riskAssessment.recommendation === 'MANUAL_REVIEW' ||
        riskAssessment.recommendation === 'REJECT'
      ) {
        await this.notifyComplianceTeam(userId, screeningId, riskAssessment);
      }
    } catch (error) {
      logger.error('Failed to store screening results', {
        error,
        userId,
        screeningId,
      });
      // Don't throw - screening succeeded even if storage failed
    }
  }

  /**
   * Notify compliance team for manual review
   */
  private async notifyComplianceTeam(
    userId: string,
    screeningId: string,
    riskAssessment: RiskAssessment
  ) {
    try {
      // Find all admin users (compliance team)
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' },
      });

      // Create notification for each admin
      await Promise.all(
        admins.map((admin) =>
          prisma.notification.create({
            data: {
              userId: admin.id,
              type: 'SYSTEM',
              title: 'Manual Compliance Review Required',
              content: `User ${userId} requires manual compliance review. Risk Level: ${riskAssessment.riskLevel}. Screening ID: ${screeningId}`,
              priority: riskAssessment.riskLevel === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
              actionUrl: `/admin/compliance/review/${userId}`,
            },
          })
        )
      );
    } catch (error) {
      logger.error('Failed to notify compliance team', { error, userId });
    }
  }

  /**
   * Re-screen user (periodic compliance check)
   */
  async rescreenUser(userId: string): Promise<ComprehensiveScreeningResult> {
    try {
      logger.info('Re-screening user for compliance', { userId });

      // Get user data
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { complianceProfile: true },
      });

      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Get user profile data
      const userProfile = await prisma.userProfile.findUnique({
        where: { userId },
      });

      if (!userProfile) {
        throw new AppError('User profile not found', 404, 'PROFILE_NOT_FOUND');
      }

      // Reconstruct KYC data for rescreening
      // TODO: This should be stored more comprehensively
      const kycData: EnhancedKycData = {
        userId,
        firstName: user.name?.split(' ')[0] || 'Unknown',
        lastName: user.name?.split(' ').slice(1).join(' ') || 'Unknown',
        dateOfBirth: '1990-01-01', // TODO: Store properly
        nationality: 'US', // TODO: Store properly
        address: {
          street: '',
          city: userProfile.location || '',
          state: '',
          postalCode: '',
          country: 'US',
        },
        identification: {
          type: 'PASSPORT',
          number: '',
          issuedDate: '',
          expiryDate: '',
          issuingCountry: 'US',
        },
      };

      return await this.performComprehensiveScreening(kycData);
    } catch (error) {
      logger.error('User rescreening failed', { error, userId });
      throw error;
    }
  }

  /**
   * Get screening history for user
   */
  async getScreeningHistory(userId: string) {
    try {
      const logs = await prisma.complianceLog.findMany({
        where: {
          complianceProfileId: userId,
          action: {
            in: ['COMPREHENSIVE_SCREENING', 'PEP_SCREENING', 'SANCTIONS_SCREENING'],
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });

      return logs;
    } catch (error) {
      logger.error('Failed to get screening history', { error, userId });
      throw error;
    }
  }
}

// Export singleton instance
export const amlKycService = new AmlKycService();
