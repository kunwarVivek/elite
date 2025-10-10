import { logger } from '../config/logger.js';
import { PaymentConfig } from '../config/payment.js';
import { prisma } from '../config/database.js';

export interface KycVerificationData {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
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
  };
  investmentAmount: number;
}

export interface KycVerificationResult {
  success: boolean;
  verificationId?: string;
  status: 'PENDING' | 'VERIFIED' | 'FAILED' | 'EXPIRED';
  provider?: string;
  verifiedAt?: Date;
  expiryDate?: Date;
  error?: string;
  documents?: string[];
}

export interface AmlScreeningData {
  userId: string;
  investmentId: string;
  amount: number;
  currency: string;
  userProfile: {
    name: string;
    email: string;
    address: string;
    dateOfBirth?: string;
  };
}

export interface AmlScreeningResult {
  success: boolean;
  screeningId?: string;
  status: 'CLEARED' | 'PENDING' | 'FLAGGED' | 'FAILED';
  riskScore?: number;
  matches?: Array<{
    type: 'SANCTION' | 'PEP' | 'ADVERSE_MEDIA';
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    description: string;
    source: string;
  }>;
  clearedAt?: Date;
  error?: string;
}

export interface PciComplianceData {
  operation: string;
  dataType: 'CARD_DATA' | 'PAYMENT_INFO' | 'USER_DATA';
  userId?: string;
  investmentId?: string;
  sanitizedData?: any;
  originalDataHash?: string;
}

export interface PciComplianceResult {
  success: boolean;
  operationId: string;
  dataSanitized: boolean;
  storedSecurely: boolean;
  auditTrail: {
    timestamp: Date;
    operation: string;
    userId?: string;
    complianceOfficer?: string;
  };
}

export class ComplianceService {
  /**
   * Verify user identity through KYC provider
   */
  static async verifyKyc(data: KycVerificationData): Promise<KycVerificationResult> {
    try {
      logger.info('Starting KYC verification', {
        userId: data.userId,
        investmentAmount: data.investmentAmount,
      });

      // Check if KYC is required based on amount
      if (data.investmentAmount < PaymentConfig.COMPLIANCE.KYC_THRESHOLD) {
        return {
          success: true,
          status: 'VERIFIED',
          verificationId: `kyc_exempt_${Date.now()}`,
        };
      }

      // TODO: Integrate with actual KYC provider (e.g., Jumio, Onfido, Persona)
      // For now, simulate KYC verification
      const isVerified = await this.simulateKycVerification(data);

      if (isVerified) {
        return {
          success: true,
          verificationId: `kyc_${data.userId}_${Date.now()}`,
          status: 'VERIFIED',
          provider: 'mock_kyc_provider',
          verifiedAt: new Date(),
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        };
      } else {
        return {
          success: false,
          status: 'FAILED',
          error: 'KYC verification failed - documents could not be verified',
        };
      }
    } catch (error) {
      logger.error('KYC verification failed', { error, userId: data.userId });
      return {
        success: false,
        status: 'FAILED',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Screen transaction for AML compliance
   */
  static async screenAml(data: AmlScreeningData): Promise<AmlScreeningResult> {
    try {
      logger.info('Starting AML screening', {
        userId: data.userId,
        investmentId: data.investmentId,
        amount: data.amount,
      });

      // Check if AML screening is required based on amount
      if (data.amount < PaymentConfig.COMPLIANCE.AML_SCREENING_THRESHOLD) {
        return {
          success: true,
          status: 'CLEARED',
          screeningId: `aml_exempt_${Date.now()}`,
        };
      }

      // TODO: Integrate with actual AML provider (e.g., Chainalysis, Elliptic, ComplyAdvantage)
      // For now, simulate AML screening
      const screeningResult = await this.simulateAmlScreening(data);

      return {
        success: screeningResult.cleared,
        screeningId: `aml_${data.userId}_${Date.now()}`,
        status: screeningResult.cleared ? 'CLEARED' : 'FLAGGED',
        riskScore: screeningResult.riskScore,
        matches: screeningResult.matches,
        clearedAt: screeningResult.cleared ? new Date() : undefined,
        error: screeningResult.cleared ? undefined : 'Transaction flagged for AML concerns',
      };
    } catch (error) {
      logger.error('AML screening failed', { error, userId: data.userId });
      return {
        success: false,
        status: 'FAILED',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Ensure PCI compliance for payment data handling
   */
  static async ensurePciCompliance(data: PciComplianceData): Promise<PciComplianceResult> {
    try {
      logger.info('Ensuring PCI compliance', {
        operation: data.operation,
        dataType: data.dataType,
      });

      const operationId = `pci_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Sanitize sensitive data
      const sanitizedData = this.sanitizePaymentData(data);

      // Log compliance operation for audit trail
      await this.logComplianceOperation({
        operationId,
        operation: data.operation,
        dataType: data.dataType,
        userId: data.userId,
        investmentId: data.investmentId,
        timestamp: new Date(),
        status: 'COMPLIANT',
      });

      return {
        success: true,
        operationId,
        dataSanitized: true,
        storedSecurely: true,
        auditTrail: {
          timestamp: new Date(),
          operation: data.operation,
          userId: data.userId,
          complianceOfficer: 'SYSTEM',
        },
      };
    } catch (error) {
      logger.error('PCI compliance check failed', { error, operation: data.operation });
      return {
        success: false,
        operationId: `pci_failed_${Date.now()}`,
        dataSanitized: false,
        storedSecurely: false,
        auditTrail: {
          timestamp: new Date(),
          operation: data.operation,
          userId: data.userId,
        },
      };
    }
  }

  /**
   * Check if user needs KYC verification for investment
   */
  static requiresKyc(amount: number): boolean {
    return amount >= PaymentConfig.COMPLIANCE.KYC_THRESHOLD;
  }

  /**
   * Check if transaction needs AML screening
   */
  static requiresAmlScreening(amount: number): boolean {
    return amount >= PaymentConfig.COMPLIANCE.AML_SCREENING_THRESHOLD;
  }

  /**
   * Get compliance status for user
   */
  static async getUserComplianceStatus(userId: string): Promise<{
    kycStatus: 'NOT_REQUIRED' | 'PENDING' | 'VERIFIED' | 'EXPIRED' | 'FAILED';
    amlStatus: 'NOT_REQUIRED' | 'CLEARED' | 'PENDING' | 'FLAGGED';
    lastVerified?: Date;
    nextVerificationDue?: Date;
  }> {
    try {
      logger.info('Getting user compliance status', { userId });

      // Get user profile with compliance data
      const userProfile = await prisma.userProfile.findUnique({
        where: { userId },
      });

      // Get compliance profile
      const complianceProfile = await prisma.complianceProfile.findUnique({
        where: { userId },
      });

      // Map database status to API status
      const kycStatus = this.mapKycStatus(userProfile?.kycStatus, complianceProfile?.kycVerifiedAt);
      const amlStatus = this.mapAmlStatus(complianceProfile?.amlStatus, complianceProfile?.amlVerifiedAt);

      return {
        kycStatus,
        amlStatus,
        lastVerified: complianceProfile?.kycVerifiedAt || complianceProfile?.amlVerifiedAt,
        nextVerificationDue: this.calculateNextVerificationDue(complianceProfile?.kycVerifiedAt),
      };
    } catch (error) {
      logger.error('Failed to get user compliance status', { error, userId });
      throw new Error(`Compliance status check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate payment data for PCI compliance
   */
  private static sanitizePaymentData(data: PciComplianceData): any {
    const { dataType, sanitizedData } = data;

    if (!sanitizedData) {
      return {};
    }

    const sanitized = { ...sanitizedData };

    switch (dataType) {
      case 'CARD_DATA':
        // Remove sensitive card information
        delete sanitized.cardNumber;
        delete sanitized.cvv;
        delete sanitized.expiryDate;
        delete sanitized.cardholderName;
        break;

      case 'PAYMENT_INFO':
        // Remove payment method details
        delete sanitized.paymentMethodDetails;
        delete sanitized.bankAccountNumber;
        delete sanitized.routingNumber;
        break;

      case 'USER_DATA':
        // Remove PII that shouldn't be logged
        delete sanitized.ssn;
        delete sanitized.taxId;
        delete sanitized.dateOfBirth;
        break;
    }

    return sanitized;
  }

  /**
   * Log compliance operation for audit trail
   */
  private static async logComplianceOperation(auditData: any): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          userId: auditData.userId,
          action: auditData.operation,
          entityType: auditData.dataType,
          entityId: auditData.investmentId || auditData.userId,
          newValues: {
            operationId: auditData.operationId,
            status: auditData.status,
            timestamp: auditData.timestamp,
          },
        },
      });
    } catch (error) {
      logger.error('Failed to log compliance operation', { error, auditData });
      // Don't throw error to avoid breaking the main flow
    }
  }

  /**
   * Simulate KYC verification (placeholder for actual implementation)
   */
  private static async simulateKycVerification(data: KycVerificationData): Promise<boolean> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simulate 90% success rate
    return Math.random() > 0.1;
  }

  /**
   * Simulate AML screening (placeholder for actual implementation)
   */
  private static async simulateAmlScreening(data: AmlScreeningData): Promise<{
    cleared: boolean;
    riskScore: number;
    matches: any[];
  }> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Simulate 95% clear rate
    const cleared = Math.random() > 0.05;
    const riskScore = cleared ? Math.floor(Math.random() * 30) : Math.floor(Math.random() * 100) + 70;

    return {
      cleared,
      riskScore,
      matches: cleared ? [] : [
        {
          type: 'ADVERSE_MEDIA',
          severity: 'MEDIUM',
          description: 'Found in news articles related to business practices',
          source: 'Media Search',
        },
      ],
    };
  }

  /**
   * Generate compliance report for audit purposes
   */
  static async generateComplianceReport(dateRange: { start: Date; end: Date }): Promise<{
    totalTransactions: number;
    kycVerifications: number;
    amlScreenings: number;
    flaggedTransactions: number;
    complianceRate: number;
    reportGeneratedAt: Date;
  }> {
    try {
      logger.info('Generating compliance report', { dateRange });

      // Get total transactions (investments) in date range
      const totalTransactions = await prisma.investment.count({
        where: {
          createdAt: {
            gte: dateRange.start,
            lte: dateRange.end,
          },
        },
      });

      // Get KYC verifications in date range
      const kycVerifications = await prisma.userProfile.count({
        where: {
          kycStatus: 'VERIFIED',
          updatedAt: {
            gte: dateRange.start,
            lte: dateRange.end,
          },
        },
      });

      // Get AML screenings in date range
      const amlScreenings = await prisma.complianceProfile.count({
        where: {
          amlStatus: 'PASSED',
          amlVerifiedAt: {
            gte: dateRange.start,
            lte: dateRange.end,
          },
        },
      });

      // Get flagged transactions (high risk score)
      const flaggedTransactions = await prisma.complianceProfile.count({
        where: {
          riskScore: {
            gte: 70, // High risk threshold
          },
          updatedAt: {
            gte: dateRange.start,
            lte: dateRange.end,
          },
        },
      });

      // Calculate compliance rate
      const verifiedTransactions = totalTransactions > 0 ?
        ((kycVerifications + amlScreenings) / (totalTransactions * 2)) * 100 : 100;

      return {
        totalTransactions,
        kycVerifications,
        amlScreenings,
        flaggedTransactions,
        complianceRate: Math.round(verifiedTransactions),
        reportGeneratedAt: new Date(),
      };
    } catch (error) {
      logger.error('Failed to generate compliance report', { error, dateRange });
      throw new Error(`Compliance report generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Map database KYC status to API status
   */
  private static mapKycStatus(dbStatus?: string, verifiedAt?: Date | null): 'NOT_REQUIRED' | 'PENDING' | 'VERIFIED' | 'EXPIRED' | 'FAILED' {
    if (!dbStatus) return 'NOT_REQUIRED';

    switch (dbStatus) {
      case 'PENDING':
        return 'PENDING';
      case 'VERIFIED':
        // Check if verification has expired (1 year)
        if (verifiedAt && verifiedAt < new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)) {
          return 'EXPIRED';
        }
        return 'VERIFIED';
      case 'REJECTED':
        return 'FAILED';
      default:
        return 'NOT_REQUIRED';
    }
  }

  /**
   * Map database AML status to API status
   */
  private static mapAmlStatus(dbStatus?: string, verifiedAt?: Date | null): 'NOT_REQUIRED' | 'CLEARED' | 'PENDING' | 'FLAGGED' {
    if (!dbStatus) return 'NOT_REQUIRED';

    switch (dbStatus) {
      case 'PENDING':
        return 'PENDING';
      case 'PASSED':
        return 'CLEARED';
      case 'FAILED':
      case 'REQUIRES_REVIEW':
        return 'FLAGGED';
      default:
        return 'NOT_REQUIRED';
    }
  }

  /**
   * Calculate next verification due date
   */
  private static calculateNextVerificationDue(lastVerified?: Date | null): Date | undefined {
    if (!lastVerified) return undefined;

    // KYC verification expires after 1 year
    return new Date(lastVerified.getTime() + 365 * 24 * 60 * 60 * 1000);
  }
}

export default ComplianceService;