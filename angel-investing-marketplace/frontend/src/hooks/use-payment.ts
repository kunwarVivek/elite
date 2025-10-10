import { useState, useCallback, useEffect } from 'react';
import { apiClient } from '../lib/api-client';

export interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  fees: {
    platform_fee: number;
    processing_fee: number;
  };
  limits: {
    minimum: number;
    maximum: number;
  };
  supported_currencies: string[];
}

export interface PaymentIntent {
  payment_intent_id: string;
  client_secret: string;
  amount: number;
  currency: string;
  fees: {
    platform_fee: number;
    total_amount: number;
  };
  escrow_reference?: string;
  status: string;
}

export interface PaymentStatus {
  investment_id: string;
  payment_status: string;
  escrow_status?: string;
  amount: number;
  currency: string;
  fees: {
    investment_amount: number;
    platform_fee: number;
    carry_fee: number;
    total_fee: number;
    net_amount: number;
  };
}

export interface FeeCalculation {
  investment_amount: number;
  fees: {
    platform_fee: number;
    carry_fee: number;
    processing_fee: number;
    total_fee: number;
  };
  net_amount: number;
  breakdown: {
    platformFee: number;
    carryFee: number;
    processingFee: number;
  };
}

export interface UsePaymentOptions {
  investmentId?: string;
  amount?: number;
  currency?: string;
  onPaymentSuccess?: (paymentIntent: PaymentIntent) => void;
  onPaymentError?: (error: string) => void;
}

export function usePayment(options: UsePaymentOptions = {}) {
  const { investmentId, amount, currency = 'USD', onPaymentSuccess, onPaymentError } = options;

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntent | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [error, setError] = useState<string>('');

  // Fetch available payment methods
  const fetchPaymentMethods = useCallback(async () => {
    try {
      const response = await apiClient.get('/payments/methods', {
        params: { amount, currency }
      });
      setPaymentMethods(response.data.methods);
      if (response.data.methods.length > 0) {
        setSelectedPaymentMethod(response.data.methods[0].id);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch payment methods';
      setError(errorMessage);
      onPaymentError?.(errorMessage);
    }
  }, [amount, currency, onPaymentError]);

  // Process payment
  const processPayment = useCallback(async (paymentData: {
    investmentId: string;
    amount: number;
    paymentMethod: string;
    investmentType?: 'DIRECT' | 'SYNDICATE';
  }) => {
    if (!paymentData.investmentId || !paymentData.amount || !paymentData.paymentMethod) {
      const errorMsg = 'Investment ID, amount, and payment method are required';
      setError(errorMsg);
      onPaymentError?.(errorMsg);
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const response = await apiClient.post('/payments/process', paymentData);
      const paymentResult: PaymentIntent = response.data;

      setPaymentIntent(paymentResult);
      onPaymentSuccess?.(paymentResult);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment processing failed';
      setError(errorMessage);
      onPaymentError?.(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, [onPaymentSuccess, onPaymentError]);

  // Get payment status
  const getPaymentStatus = useCallback(async (paymentId: string) => {
    try {
      const response = await apiClient.get(`/payments/${paymentId}`);
      setPaymentStatus(response.data);
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get payment status';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  // Calculate fees
  const calculateFees = useCallback(async (feeAmount: number, investmentType: 'DIRECT' | 'SYNDICATE' = 'DIRECT') => {
    try {
      const response = await apiClient.get('/payments/fees/calculate', {
        params: { amount: feeAmount, investment_type: investmentType }
      });
      return response.data as FeeCalculation;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to calculate fees';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  // Confirm payment (for webhooks or manual confirmation)
  const confirmPayment = useCallback(async (paymentIntentId: string) => {
    try {
      // This would typically be called by webhook handler
      // For manual confirmation, you might expose this through an admin interface
      const response = await apiClient.post(`/payments/confirm/${paymentIntentId}`);
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to confirm payment';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  // Initialize payment methods on mount
  useEffect(() => {
    fetchPaymentMethods();
  }, [fetchPaymentMethods]);

  return {
    // State
    paymentMethods,
    selectedPaymentMethod,
    isProcessing,
    paymentIntent,
    paymentStatus,
    error,

    // Actions
    setSelectedPaymentMethod,
    processPayment,
    getPaymentStatus,
    calculateFees,
    confirmPayment,
    fetchPaymentMethods,

    // Computed values
    selectedMethod: paymentMethods.find(method => method.id === selectedPaymentMethod),
    canProceed: selectedPaymentMethod && !isProcessing && !error,
  };
}

export default usePayment;