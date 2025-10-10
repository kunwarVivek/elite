export interface PaymentValidation {
  isValid: boolean;
  errors: string[];
}

export interface FormattedAmount {
  amount: number;
  currency: string;
  formatted: string;
  symbol: string;
}

export interface FeeDisplay {
  label: string;
  amount: number;
  percentage?: number;
  description?: string;
}

/**
 * Format currency amount for display
 */
export function formatCurrency(
  amount: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): FormattedAmount {
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const formatted = formatter.format(amount);
  const symbol = getCurrencySymbol(currency);

  return {
    amount,
    currency,
    formatted,
    symbol,
  };
}

/**
 * Get currency symbol
 */
export function getCurrencySymbol(currency: string): string {
  const symbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    CAD: 'C$',
    AUD: 'A$',
    BTC: '₿',
    ETH: 'Ξ',
  };

  return symbols[currency] || currency;
}

/**
 * Format fee breakdown for display
 */
export function formatFeeBreakdown(fees: {
  investmentAmount: number;
  platformFee: number;
  carryFee: number;
  processingFee: number;
  totalFee: number;
  netAmount: number;
}): FeeDisplay[] {
  const feeDisplays: FeeDisplay[] = [
    {
      label: 'Investment Amount',
      amount: fees.investmentAmount,
      description: 'Amount you are investing',
    },
  ];

  if (fees.platformFee > 0) {
    feeDisplays.push({
      label: 'Platform Fee',
      amount: fees.platformFee,
      percentage: (fees.platformFee / fees.investmentAmount) * 100,
      description: 'Platform service fee',
    });
  }

  if (fees.carryFee > 0) {
    feeDisplays.push({
      label: 'Carry Fee',
      amount: fees.carryFee,
      percentage: (fees.carryFee / fees.investmentAmount) * 100,
      description: 'Performance-based fee',
    });
  }

  if (fees.processingFee > 0) {
    feeDisplays.push({
      label: 'Processing Fee',
      amount: fees.processingFee,
      description: 'Payment processing fee',
    });
  }

  feeDisplays.push({
    label: 'Total Fees',
    amount: fees.totalFee,
    description: 'Sum of all fees',
  });

  feeDisplays.push({
    label: 'Startup Receives',
    amount: fees.netAmount,
    description: 'Amount transferred to startup after fees',
  });

  return feeDisplays;
}

/**
 * Validate payment amount
 */
export function validatePaymentAmount(
  amount: number,
  paymentMethod: string,
  currency: string = 'USD'
): PaymentValidation {
  const errors: string[] = [];

  // Basic amount validation
  if (!amount || amount <= 0) {
    errors.push('Amount must be greater than 0');
  }

  // Payment method specific limits
  const methodLimits = getPaymentMethodLimits(paymentMethod, currency);

  if (amount < methodLimits.minimum) {
    errors.push(`Minimum amount for ${paymentMethod} is ${formatCurrency(methodLimits.minimum, currency).formatted}`);
  }

  if (amount > methodLimits.maximum) {
    errors.push(`Maximum amount for ${paymentMethod} is ${formatCurrency(methodLimits.maximum, currency).formatted}`);
  }

  // Currency validation
  if (!isValidCurrency(currency)) {
    errors.push('Invalid currency');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get payment method limits
 */
export function getPaymentMethodLimits(
  paymentMethod: string,
  currency: string
): { minimum: number; maximum: number } {
  const limits: Record<string, { minimum: number; maximum: number }> = {
    CARD: { minimum: 1, maximum: 100000 },
    BANK_TRANSFER: { minimum: 100, maximum: 1000000 },
    DIGITAL_WALLET: { minimum: 1, maximum: 10000 },
    WIRE_TRANSFER: { minimum: 1000, maximum: 10000000 },
    CRYPTOCURRENCY: { minimum: 100, maximum: 100000 },
  };

  return limits[paymentMethod] || { minimum: 1, maximum: 100000 };
}

/**
 * Validate currency
 */
export function isValidCurrency(currency: string): boolean {
  const validCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'BTC', 'ETH'];
  return validCurrencies.includes(currency);
}

/**
 * Get supported currencies for payment method
 */
export function getSupportedCurrencies(paymentMethod: string): string[] {
  const currencies: Record<string, string[]> = {
    CARD: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'],
    BANK_TRANSFER: ['USD', 'EUR', 'GBP'],
    DIGITAL_WALLET: ['USD', 'EUR', 'GBP'],
    WIRE_TRANSFER: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'],
    CRYPTOCURRENCY: ['BTC', 'ETH'],
  };

  return currencies[paymentMethod] || ['USD'];
}

/**
 * Calculate total amount including fees
 */
export function calculateTotalWithFees(
  investmentAmount: number,
  platformFeePercentage: number = 0.05,
  processingFee: number = 0
): {
  investmentAmount: number;
  platformFee: number;
  processingFee: number;
  totalAmount: number;
} {
  const platformFee = investmentAmount * platformFeePercentage;
  const totalAmount = investmentAmount + platformFee + processingFee;

  return {
    investmentAmount,
    platformFee,
    processingFee,
    totalAmount,
  };
}

/**
 * Format payment method name for display
 */
export function formatPaymentMethodName(method: string): string {
  const names: Record<string, string> = {
    CARD: 'Credit/Debit Card',
    BANK_TRANSFER: 'Bank Transfer',
    DIGITAL_WALLET: 'Digital Wallet',
    WIRE_TRANSFER: 'Wire Transfer',
    CRYPTOCURRENCY: 'Cryptocurrency',
  };

  return names[method] || method;
}

/**
 * Get payment method description
 */
export function getPaymentMethodDescription(method: string): string {
  const descriptions: Record<string, string> = {
    CARD: 'Pay securely with your credit or debit card',
    BANK_TRANSFER: 'Transfer directly from your bank account',
    DIGITAL_WALLET: 'Pay using Apple Pay, Google Pay, or Samsung Pay',
    WIRE_TRANSFER: 'International wire transfer for large investments',
    CRYPTOCURRENCY: 'Pay with Bitcoin or Ethereum',
  };

  return descriptions[method] || 'Secure payment method';
}

/**
 * Validate payment form data
 */
export function validatePaymentForm(data: {
  amount: number;
  paymentMethod: string;
  currency: string;
  investmentType: 'DIRECT' | 'SYNDICATE';
}): PaymentValidation {
  const errors: string[] = [];

  // Amount validation
  const amountValidation = validatePaymentAmount(data.amount, data.paymentMethod, data.currency);
  errors.push(...amountValidation.errors);

  // Payment method validation
  if (!data.paymentMethod) {
    errors.push('Payment method is required');
  }

  // Currency validation
  if (!isValidCurrency(data.currency)) {
    errors.push('Invalid currency selected');
  }

  // Investment type validation
  if (!['DIRECT', 'SYNDICATE'].includes(data.investmentType)) {
    errors.push('Invalid investment type');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Generate payment reference
 */
export function generatePaymentReference(investmentId: string): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `PAY_${investmentId}_${timestamp}_${random}`;
}

/**
 * Parse payment error message
 */
export function parsePaymentError(error: any): string {
  if (typeof error === 'string') {
    return error;
  }

  if (error?.message) {
    return error.message;
  }

  if (error?.response?.data?.message) {
    return error.response.data.message;
  }

  if (error?.response?.data?.error) {
    return error.response.data.error;
  }

  return 'An unexpected error occurred during payment processing';
}

/**
 * Get countdown time display
 */
export function formatCountdownTime(milliseconds: number): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  display: string;
} {
  const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24));
  const hours = Math.floor((milliseconds % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);

  let display = '';
  if (days > 0) display += `${days}d `;
  if (hours > 0 || days > 0) display += `${hours}h `;
  if (minutes > 0 || hours > 0 || days > 0) display += `${minutes}m `;
  display += `${seconds}s`;

  return { days, hours, minutes, seconds, display: display.trim() };
}

/**
 * Check if payment method supports currency
 */
export function supportsCurrency(paymentMethod: string, currency: string): boolean {
  const supportedCurrencies = getSupportedCurrencies(paymentMethod);
  return supportedCurrencies.includes(currency);
}

/**
 * Get estimated processing time for payment method
 */
export function getEstimatedProcessingTime(paymentMethod: string): string {
  const times: Record<string, string> = {
    CARD: 'Instant',
    DIGITAL_WALLET: 'Instant',
    BANK_TRANSFER: '1-3 business days',
    WIRE_TRANSFER: '2-5 business days',
    CRYPTOCURRENCY: '10-60 minutes',
  };

  return times[paymentMethod] || '1-2 business days';
}

/**
 * Format transaction ID for display
 */
export function formatTransactionId(transactionId: string): string {
  if (transactionId.length <= 12) {
    return transactionId;
  }

  return `${transactionId.substring(0, 6)}...${transactionId.substring(transactionId.length - 6)}`;
}

/**
 * Validate credit card number using Luhn algorithm
 */
export function validateCreditCard(cardNumber: string): boolean {
  // Remove spaces and non-numeric characters
  const cleanNumber = cardNumber.replace(/\D/g, '');

  if (cleanNumber.length < 13 || cleanNumber.length > 19) {
    return false;
  }

  // Luhn algorithm
  let sum = 0;
  let isEven = false;

  for (let i = cleanNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cleanNumber.charAt(i), 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

/**
 * Get card type from card number
 */
export function getCardType(cardNumber: string): string | null {
  const cleanNumber = cardNumber.replace(/\D/g, '');

  const patterns: Record<string, RegExp> = {
    visa: /^4[0-9]{12}(?:[0-9]{3})?$/,
    mastercard: /^5[1-5][0-9]{14}$/,
    amex: /^3[47][0-9]{13}$/,
    discover: /^6(?:011|5[0-9]{2})[0-9]{12}$/,
  };

  for (const [type, pattern] of Object.entries(patterns)) {
    if (pattern.test(cleanNumber)) {
      return type;
    }
  }

  return null;
}