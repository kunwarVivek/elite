import { useState, useCallback, useEffect } from 'react';
import { apiClient } from '../lib/api-client';

export interface EscrowInfo {
  escrow_reference: string;
  status: 'CREATED' | 'HELD' | 'RELEASED' | 'REFUNDED';
  amount: number;
  currency: string;
  release_date: string;
  created_at: string;
  conditions?: {
    minimum_funding_reached?: boolean;
    legal_review_completed?: boolean;
    founder_approval?: boolean;
    investor_approval?: boolean;
  };
}

export interface EscrowReleaseConditions {
  escrowReference: string;
  releaseType?: 'AUTOMATIC' | 'MANUAL' | 'CONDITIONAL';
  conditions?: {
    minimumFundingReached?: boolean;
    legalReviewCompleted?: boolean;
    founderApproval?: boolean;
    investorApproval?: boolean;
  };
  notes?: string;
}

export interface UseEscrowOptions {
  investmentId?: string;
  escrowReference?: string;
  onEscrowReleased?: (escrowInfo: EscrowInfo) => void;
  onEscrowRefunded?: (escrowInfo: EscrowInfo) => void;
  onError?: (error: string) => void;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useEscrow(options: UseEscrowOptions = {}) {
  const {
    investmentId,
    escrowReference,
    onEscrowReleased,
    onEscrowRefunded,
    onError,
    autoRefresh = false,
    refreshInterval = 30000, // 30 seconds
  } = options;

  const [escrowInfo, setEscrowInfo] = useState<EscrowInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Fetch escrow information
  const fetchEscrowInfo = useCallback(async () => {
    if (!investmentId && !escrowReference) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      let response;
      if (escrowReference) {
        // If we have escrow reference, we'd need an endpoint to get escrow by reference
        // For now, we'll use investment ID
        response = await apiClient.get(`/payments/${investmentId}`);
      } else {
        response = await apiClient.get(`/payments/${investmentId}`);
      }

      // Extract escrow information from payment status
      if (response.data.escrow_status) {
        const escrowData: EscrowInfo = {
          escrow_reference: response.data.escrow_reference || `escrow_${investmentId}`,
          status: response.data.escrow_status,
          amount: response.data.fees?.net_amount || response.data.amount,
          currency: response.data.currency,
          release_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
          created_at: new Date().toISOString(),
        };
        setEscrowInfo(escrowData);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch escrow information';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [investmentId, escrowReference, onError]);

  // Release escrow funds
  const releaseEscrow = useCallback(async (conditions: EscrowReleaseConditions) => {
    if (!conditions.escrowReference) {
      const errorMsg = 'Escrow reference is required';
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await apiClient.post('/payments/escrow/release', conditions);

      if (escrowInfo) {
        const updatedEscrow = {
          ...escrowInfo,
          status: 'RELEASED' as const,
        };
        setEscrowInfo(updatedEscrow);
        onEscrowReleased?.(updatedEscrow);
      }

      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to release escrow';
      setError(errorMessage);
      onError?.(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [escrowInfo, onEscrowReleased, onError]);

  // Check if escrow can be auto-released
  const canAutoRelease = useCallback(() => {
    if (!escrowInfo || escrowInfo.status !== 'HELD') {
      return false;
    }

    const releaseDate = new Date(escrowInfo.release_date);
    const now = new Date();
    return now >= releaseDate;
  }, [escrowInfo]);

  // Get time remaining until auto-release
  const getTimeUntilRelease = useCallback(() => {
    if (!escrowInfo || escrowInfo.status !== 'HELD') {
      return null;
    }

    const releaseDate = new Date(escrowInfo.release_date);
    const now = new Date();
    const timeDiff = releaseDate.getTime() - now.getTime();

    if (timeDiff <= 0) {
      return null; // Already eligible for release
    }

    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

    return { days, hours, minutes };
  }, [escrowInfo]);

  // Get escrow status color for UI
  const getEscrowStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'CREATED':
        return 'blue';
      case 'HELD':
        return 'yellow';
      case 'RELEASED':
        return 'green';
      case 'REFUNDED':
        return 'red';
      default:
        return 'gray';
    }
  }, []);

  // Get escrow status text
  const getEscrowStatusText = useCallback((status: string) => {
    switch (status) {
      case 'CREATED':
        return 'Escrow Created';
      case 'HELD':
        return 'Funds Held in Escrow';
      case 'RELEASED':
        return 'Funds Released to Startup';
      case 'REFUNDED':
        return 'Funds Refunded to Investor';
      default:
        return 'Unknown Status';
    }
  }, []);

  // Auto-refresh escrow information
  useEffect(() => {
    if (autoRefresh && (investmentId || escrowReference)) {
      fetchEscrowInfo();

      const interval = setInterval(fetchEscrowInfo, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, investmentId, escrowReference, fetchEscrowInfo, refreshInterval]);

  // Initial fetch
  useEffect(() => {
    if (investmentId || escrowReference) {
      fetchEscrowInfo();
    }
  }, [investmentId, escrowReference, fetchEscrowInfo]);

  return {
    // State
    escrowInfo,
    isLoading,
    error,

    // Actions
    fetchEscrowInfo,
    releaseEscrow,

    // Computed values
    canAutoRelease: canAutoRelease(),
    timeUntilRelease: getTimeUntilRelease(),
    statusColor: escrowInfo ? getEscrowStatusColor(escrowInfo.status) : 'gray',
    statusText: escrowInfo ? getEscrowStatusText(escrowInfo.status) : 'Loading...',

    // Status checks
    isCreated: escrowInfo?.status === 'CREATED',
    isHeld: escrowInfo?.status === 'HELD',
    isReleased: escrowInfo?.status === 'RELEASED',
    isRefunded: escrowInfo?.status === 'REFUNDED',
  };
}

export default useEscrow;