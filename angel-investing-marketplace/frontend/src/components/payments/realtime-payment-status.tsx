import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { formatCurrency, formatCountdownTime } from '../../lib/payment-utils';
import { useEscrow } from '../../hooks/use-escrow';

interface RealtimePaymentStatusProps {
  investmentId: string;
  initialStatus?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'REFUNDED';
  initialAmount?: number;
  currency?: string;
  onStatusChange?: (status: string, data?: any) => void;
  onEscrowUpdate?: (escrowInfo: any) => void;
  autoRefresh?: boolean;
  showEscrowInfo?: boolean;
  compact?: boolean;
}

interface PaymentUpdate {
  type: 'PAYMENT_UPDATE' | 'ESCROW_UPDATE' | 'ERROR';
  investmentId: string;
  status?: string;
  amount?: number;
  currency?: string;
  paymentIntentId?: string;
  escrowReference?: string;
  escrowStatus?: string;
  error?: string;
  timestamp: string;
}

export function RealtimePaymentStatus({
  investmentId,
  initialStatus = 'PENDING',
  initialAmount,
  currency = 'USD',
  onStatusChange,
  onEscrowUpdate,
  autoRefresh = true,
  showEscrowInfo = true,
  compact = false,
}: RealtimePaymentStatusProps) {
  const [status, setStatus] = useState(initialStatus);
  const [amount] = useState(initialAmount);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [processingStep, setProcessingStep] = useState(1);
  const [totalSteps] = useState(3);

  const {
    escrowInfo,
    isLoading: escrowLoading,
    error: escrowError,
    fetchEscrowInfo,
    canAutoRelease,
    timeUntilRelease,
  } = useEscrow({
    investmentId,
    autoRefresh: false, // We'll handle refreshing manually for real-time updates
    onError: (error) => {
      console.error('Escrow error:', error);
    },
  });

  // Simulate WebSocket connection for real-time updates
  useEffect(() => {
    if (!autoRefresh) return;

    // Simulate connection
    setIsConnected(true);

    // Simulate real-time updates
    const interval = setInterval(() => {
      // Simulate status updates
      if (status === 'PENDING' && Math.random() > 0.7) {
        updateStatus('PROCESSING');
        setProcessingStep(1);
      } else if (status === 'PROCESSING' && Math.random() > 0.8) {
        if (processingStep < totalSteps) {
          setProcessingStep(prev => prev + 1);
        } else {
          updateStatus('COMPLETED');
        }
      }

      setLastUpdate(new Date());

      // Refresh escrow info periodically
      if (showEscrowInfo) {
        fetchEscrowInfo();
      }
    }, 3000); // Update every 3 seconds for demo

    return () => clearInterval(interval);
  }, [status, processingStep, autoRefresh, showEscrowInfo, fetchEscrowInfo]);

  // Handle status updates
  const updateStatus = (newStatus: string, data?: any) => {
    setStatus(newStatus);
    setLastUpdate(new Date());
    onStatusChange?.(newStatus, data);
  };

  // Handle WebSocket message (placeholder for actual WebSocket integration)
  const handleWebSocketMessage = (message: PaymentUpdate) => {
    if (message.investmentId !== investmentId) return;

    switch (message.type) {
      case 'PAYMENT_UPDATE':
        if (message.status) {
          updateStatus(message.status, message);
        }
        break;
      case 'ESCROW_UPDATE':
        if (message.escrowStatus && escrowInfo) {
          const updatedEscrow = { ...escrowInfo, status: message.escrowStatus };
          onEscrowUpdate?.(updatedEscrow);
        }
        break;
      case 'ERROR':
        updateStatus('FAILED', { error: message.error });
        break;
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle2 className="h-6 w-6 text-green-600" />;
      case 'PROCESSING':
        return <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />;
      case 'PENDING':
        return <Clock className="h-6 w-6 text-yellow-600" />;
      case 'FAILED':
        return <XCircle className="h-6 w-6 text-red-600" />;
      case 'CANCELLED':
        return <XCircle className="h-6 w-6 text-gray-600" />;
      case 'REFUNDED':
        return <RefreshCw className="h-6 w-6 text-purple-600" />;
      default:
        return <Clock className="h-6 w-6 text-gray-600" />;
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'PENDING':
        return 'Your payment is pending confirmation';
      case 'PROCESSING':
        return 'Your payment is being processed';
      case 'COMPLETED':
        return 'Your payment has been completed successfully';
      case 'FAILED':
        return 'Your payment has failed';
      case 'CANCELLED':
        return 'Your payment has been cancelled';
      case 'REFUNDED':
        return 'Your payment has been refunded';
      default:
        return 'Payment status unknown';
    }
  };

  const progressPercentage = (processingStep / totalSteps) * 100;

  return (
    <Card className={`w-full ${compact ? 'max-w-sm' : 'max-w-md'} mx-auto`}>
      <CardHeader className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          {getStatusIcon()}
          <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          {!compact && (
            <span className="text-xs text-gray-500">
              {isConnected ? 'Live' : 'Offline'}
            </span>
          )}
        </div>

        <CardTitle className="capitalize">
          {status.replace('_', ' ')}
        </CardTitle>

        {!compact && (
          <CardDescription>
            {getStatusMessage()}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Wifi className="h-4 w-4 text-green-600" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-600" />
            )}
            <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
              {isConnected ? 'Real-time updates active' : 'Connection lost'}
            </span>
          </div>
          <span className="text-gray-500">
            Updated {formatCountdownTime(Date.now() - lastUpdate.getTime()).display} ago
          </span>
        </div>

        {/* Amount Display */}
        {amount && (
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600">Amount</div>
            <div className="text-xl font-bold">
              {formatCurrency(amount, currency).formatted}
            </div>
          </div>
        )}

        {/* Processing Progress */}
        {status === 'PROCESSING' && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{processingStep} of {totalSteps}</span>
            </div>
            <Progress value={progressPercentage} className="w-full" />
          </div>
        )}

        {/* Escrow Information */}
        {showEscrowInfo && escrowInfo && (
          <div className="space-y-2 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Escrow Status</span>
              <Badge variant={escrowInfo.status === 'HELD' ? 'default' : 'secondary'}>
                {escrowInfo.status}
              </Badge>
            </div>

            {escrowInfo.status === 'HELD' && timeUntilRelease && (
              <div className="text-sm text-gray-600">
                Auto-release in: {timeUntilRelease.display}
              </div>
            )}

            {canAutoRelease && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Funds are ready for release! Conditions have been met.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Error Display */}
        {status === 'FAILED' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Payment processing failed. Please try again or contact support.
            </AlertDescription>
          </Alert>
        )}

        {/* Success Message */}
        {status === 'COMPLETED' && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Your investment is now active and funds are held securely in escrow.
            </AlertDescription>
          </Alert>
        )}

        {/* Manual Refresh Button */}
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchEscrowInfo();
              setLastUpdate(new Date());
            }}
            disabled={isConnected}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Status
          </Button>
        </div>

        {/* Processing Steps */}
        {status === 'PROCESSING' && !compact && (
          <div className="space-y-2 pt-4 border-t">
            <div className="text-sm font-medium text-gray-700">Processing Steps:</div>
            <div className="space-y-1">
              <div className={`text-sm flex items-center gap-2 ${
                processingStep >= 1 ? 'text-green-600' : 'text-gray-400'
              }`}>
                <CheckCircle2 className="h-4 w-4" />
                Payment verification
              </div>
              <div className={`text-sm flex items-center gap-2 ${
                processingStep >= 2 ? 'text-green-600' : processingStep === 1 ? 'text-blue-600' : 'text-gray-400'
              }`}>
                {processingStep >= 2 ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : processingStep === 1 ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Clock className="h-4 w-4" />
                )}
                Escrow creation
              </div>
              <div className={`text-sm flex items-center gap-2 ${
                processingStep >= 3 ? 'text-green-600' : 'text-gray-400'
              }`}>
                <Clock className="h-4 w-4" />
                Confirmation
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Floating notification version for real-time updates
export function PaymentStatusNotification({
  investmentId,
  position = 'bottom-right',
  onDismiss,
}: {
  investmentId: string;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  onDismiss?: () => void;
}) {
  const [latestUpdate, setLatestUpdate] = useState<PaymentUpdate | null>(null);

  useEffect(() => {
    // Simulate WebSocket listener
    const handleUpdate = (update: PaymentUpdate) => {
      if (update.investmentId === investmentId) {
        setLatestUpdate(update);
      }
    };

    // Simulate receiving updates
    const interval = setInterval(() => {
      if (Math.random() > 0.8) {
        handleUpdate({
          type: 'PAYMENT_UPDATE',
          investmentId,
          status: 'PROCESSING',
          timestamp: new Date().toISOString(),
        });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [investmentId]);

  if (!latestUpdate) return null;

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-50 max-w-sm`}>
      <Card className="shadow-lg border-green-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div className="flex-1">
              <div className="font-medium text-sm">Payment Update</div>
              <div className="text-xs text-gray-600">
                Status: {latestUpdate.status}
              </div>
            </div>
            {onDismiss && (
              <Button variant="ghost" size="sm" onClick={onDismiss}>
                ×
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default RealtimePaymentStatus;