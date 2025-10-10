import { env } from './environment.js';

// Payment method configuration
export const PAYMENT_CONFIG = {
  // Supported payment methods
  METHODS: {
    CARD: {
      id: 'CARD',
      name: 'Credit/Debit Card',
      description: 'Visa, Mastercard, American Express',
      enabled: true,
      providers: ['stripe'],
      currencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'],
      minAmount: 1,
      maxAmount: 100000,
    },
    BANK_TRANSFER: {
      id: 'BANK_TRANSFER',
      name: 'Bank Transfer',
      description: 'ACH (US) / SEPA (Europe)',
      enabled: true,
      providers: ['plaid', 'stripe'],
      currencies: ['USD', 'EUR', 'GBP'],
      minAmount: 100,
      maxAmount: 1000000,
    },
    DIGITAL_WALLET: {
      id: 'DIGITAL_WALLET',
      name: 'Digital Wallet',
      description: 'Apple Pay, Google Pay, Samsung Pay',
      enabled: true,
      providers: ['stripe'],
      currencies: ['USD', 'EUR', 'GBP'],
      minAmount: 1,
      maxAmount: 10000,
    },
    WIRE_TRANSFER: {
      id: 'WIRE_TRANSFER',
      name: 'Wire Transfer',
      description: 'International wire transfer',
      enabled: true,
      providers: ['bank'],
      currencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'],
      minAmount: 1000,
      maxAmount: 10000000,
    },
    CRYPTOCURRENCY: {
      id: 'CRYPTOCURRENCY',
      name: 'Cryptocurrency',
      description: 'Bitcoin, Ethereum',
      enabled: false, // Optional as per requirements
      providers: ['crypto_provider'],
      currencies: ['BTC', 'ETH'],
      minAmount: 100,
      maxAmount: 100000,
    },
  },

  // Platform fee configuration
  FEES: {
    DIRECT_INVESTMENT: env.PLATFORM_FEE_PERCENTAGE / 100, // Convert percentage to decimal
    SYNDICATE_INVESTMENT: env.SYNDICATE_FEE_PERCENTAGE / 100,
    CARRY_PERCENTAGE: 0.20, // 20% carry on profits
    MINIMUM_FEE: 10, // Minimum platform fee in USD
  },

  // Investment limits
  LIMITS: {
    MINIMUM_INVESTMENT: env.MINIMUM_INVESTMENT_AMOUNT,
    MAXIMUM_INVESTMENT: env.MAXIMUM_INVESTMENT_AMOUNT,
    DAILY_LIMIT_PER_USER: 50000,
    MONTHLY_LIMIT_PER_USER: 200000,
  },

  // Escrow configuration
  ESCROW: {
    HOLD_PERIOD_DAYS: env.ESCROW_HOLD_PERIOD_DAYS,
    REFUND_WINDOW_DAYS: env.REFUND_WINDOW_DAYS,
    AUTO_RELEASE_ENABLED: true,
    MULTISIG_THRESHOLD: 10000, // Require multiple approvals for amounts over $10k
  },

  // Compliance settings
  COMPLIANCE: {
    KYC_THRESHOLD: env.KYC_VERIFICATION_THRESHOLD,
    AML_SCREENING_THRESHOLD: env.AML_SCREENING_THRESHOLD,
    PCI_COMPLIANCE_MODE: true,
    AUDIT_LOG_ENABLED: true,
  },

  // Risk management
  RISK: {
    MAX_FAILED_ATTEMPTS: 3,
    FRAUD_DETECTION_ENABLED: true,
    VELOCITY_CHECKS_ENABLED: true,
    GEOLOCATION_CHECKS_ENABLED: true,
  },
} as const;

// Payment status definitions
export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  AUTHORIZED: 'AUTHORIZED',
  CAPTURED: 'CAPTURED',
  SETTLED: 'SETTLED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
  PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED',
  DISPUTED: 'DISPUTED',
} as const;

// Investment status definitions
export const INVESTMENT_STATUS = {
  DRAFT: 'DRAFT',
  PENDING: 'PENDING',
  PAID: 'PAID',
  ESCROW: 'ESCROW',
  DUE_DILIGENCE: 'DUE_DILIGENCE',
  LEGAL_REVIEW: 'LEGAL_REVIEW',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
} as const;

// Helper functions for payment configuration
export class PaymentConfig {
  /**
   * Get enabled payment methods for a specific currency
   */
  static getEnabledMethods(currency?: string) {
    return Object.values(PAYMENT_CONFIG.METHODS).filter(method => {
      if (!method.enabled) return false;
      if (currency && !method.currencies.includes(currency as any)) return false;
      return true;
    });
  }

  /**
   * Check if a payment method is supported for an amount
   */
  static isAmountSupported(paymentMethod: string, amount: number): boolean {
    const method = PAYMENT_CONFIG.METHODS[paymentMethod as keyof typeof PAYMENT_CONFIG.METHODS];
    if (!method) return false;

    return amount >= method.minAmount && amount <= method.maxAmount;
  }

  /**
   * Calculate platform fee for an investment
   */
  static calculatePlatformFee(amount: number, investmentType: 'DIRECT' | 'SYNDICATE' = 'DIRECT'): number {
    const feePercentage = investmentType === 'SYNDICATE'
      ? PAYMENT_CONFIG.FEES.SYNDICATE_INVESTMENT
      : PAYMENT_CONFIG.FEES.DIRECT_INVESTMENT;

    const fee = amount * feePercentage;
    return Math.max(fee, PAYMENT_CONFIG.FEES.MINIMUM_FEE);
  }

  /**
   * Calculate total amount including fees
   */
  static calculateTotalAmount(amount: number, investmentType: 'DIRECT' | 'SYNDICATE' = 'DIRECT'): {
    investmentAmount: number;
    platformFee: number;
    totalAmount: number;
  } {
    const platformFee = this.calculatePlatformFee(amount, investmentType);
    const totalAmount = amount + platformFee;

    return {
      investmentAmount: amount,
      platformFee,
      totalAmount,
    };
  }

  /**
   * Check if KYC is required for an investment
   */
  static isKycRequired(amount: number): boolean {
    return amount >= PAYMENT_CONFIG.COMPLIANCE.KYC_THRESHOLD;
  }

  /**
   * Check if AML screening is required for a transaction
   */
  static isAmlScreeningRequired(amount: number): boolean {
    return amount >= PAYMENT_CONFIG.COMPLIANCE.AML_SCREENING_THRESHOLD;
  }
}

export default PAYMENT_CONFIG;