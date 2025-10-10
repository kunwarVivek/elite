import React from 'react';
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
  CreditCard,
  Building2,
  Wallet,
  RefreshCw,
} from 'lucide-react';
import { formatCurrency, formatCountdownTime } from '../../lib/payment-utils';

interface PaymentStatusProps {
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'REFUNDED';
  amount?: number;
  currency?: string;
  paymentMethod?: string;
  paymentIntentId?: string;
  escrowReference?: string;
  error?: string;
  processingStep?: number;
  totalSteps?: number;
  estimatedTimeRemaining?: number;
  onRetry?: () => void;
  onCancel?: () => void;
  showDetails?: boolean;
}

const PaymentStatusIcon: React.FC<{ status: string; className?: string }> = ({ status, className = "h-8 w-8" }) => {
  switch (status) {
    case 'COMPLETED':
      return <CheckCircle2 className={`${className} text-green-600`} />;
    case 'PROCESSING':
      return <Loader2 className={`${className} text-blue-600 animate-spin`} />;
    case 'PENDING':
      return <Clock className={`${className} text-yellow-600`} />;
    case 'FAILED':
      return <XCircle className={`${className} text-red-600`} />;
    case 'CANCELLED':
      return <XCircle className={`${className} text-gray-600`} />;
    case 'REFUNDED':
      return <RefreshCw className={`${className} text-purple-600`} />;
    default:
      return <Clock className={`${className} text-gray-600`} />;
  }
};

const PaymentMethodIcon: React.FC<{ method?: string; className?: string }> = ({ method, className = "h-5 w-5" }) => {
  switch (method) {
    case 'CARD':
      return <CreditCard className={`${className} text-blue-600`} />;
    case 'BANK_TRANSFER':
      return <Building2 className={`${className} text-green-600`} />;
    case 'DIGITAL_WALLET':
      return <Wallet className={`${className} text-purple-600`} />;
    default:
      return <CreditCard className={`${className} text-gray-600`} />;
  }
};

export function PaymentStatus({
  status,
  amount,
  currency = 'USD',
  paymentMethod,
  paymentIntentId,
  escrowReference,
  error,
  processingStep = 1,
  totalSteps = 3,
  estimatedTimeRemaining,
  onRetry,
  onCancel,
  showDetails = true,
}: PaymentStatusProps) {
  const progressPercentage = (processingStep / totalSteps) * 100;
  const timeRemaining = estimatedTimeRemaining ? formatCountdownTime(estimatedTimeRemaining) : null;

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

  const getStatusColor = () => {
    switch (status) {
      case 'COMPLETED':
        return 'text-green-600';
      case 'PROCESSING':
        return 'text-blue-600';
      case 'PENDING':
        return 'text-yellow-600';
      case 'FAILED':
        return 'text-red-600';
      case 'CANCELLED':
        return 'text-gray-600';
      case 'REFUNDED':
        return 'text-purple-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <PaymentStatusIcon status={status} />
        </div>
        <CardTitle className={getStatusColor()}>
          {status.charAt(0) + status.slice(1).toLowerCase()}
        </CardTitle>
        <CardDescription>
          {getStatusMessage()}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Amount and Payment Method */}
        {showDetails && (amount || paymentMethod) && (
          <div className="space-y-2">
            {amount && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Amount:</span>
                <span className="font-semibold">
                  {formatCurrency(amount, currency).formatted}
                </span>
              </div>
            )}
            {paymentMethod && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Method:</span>
                <div className="flex items-center gap-2">
                  <PaymentMethodIcon method={paymentMethod} />
                  <span className="font-medium">{paymentMethod.replace('_', ' ')}</span>
                </div>
              </div>
            )}
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
            {timeRemaining && (
              <div className="text-center text-sm text-gray-600">
                Estimated time remaining: {timeRemaining.display}
              </div>
            )}
          </div>
        )}

        {/* Payment Intent ID */}
        {showDetails && paymentIntentId && (
          <div className="text-xs text-gray-500 text-center">
            Payment ID: {paymentIntentId}
          </div>
        )}

        {/* Escrow Reference */}
        {showDetails && escrowReference && (
          <div className="text-xs text-gray-500 text-center">
            Escrow Reference: {escrowReference}
          </div>
        )}

        {/* Error Message */}
        {error && status === 'FAILED' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        )}

        {/* Success Message */}
        {status === 'COMPLETED' && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Your investment has been successfully processed and is now held in escrow.
              Funds will be released to the startup once all conditions are met.
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          {status === 'FAILED' && onRetry && (
            <Button onClick={onRetry} className="flex-1">
              Try Again
            </Button>
          )}
          {(status === 'PENDING' || status === 'PROCESSING') && onCancel && (
            <Button variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
          )}
        </div>

        {/* Processing Steps */}
        {status === 'PROCESSING' && showDetails && (
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

// Compact version for inline display
export function PaymentStatusCompact(props: PaymentStatusProps) {
  return <PaymentStatus {...props} showDetails={false} />;
}

// Badge version for tables or lists
export function PaymentStatusBadge({ status, size = 'default' }: { status: string; size?: 'sm' | 'default' }) {
  const badgeVariant = (() => {
    switch (status) {
      case 'COMPLETED':
        return 'default';
      case 'PROCESSING':
        return 'secondary';
      case 'PENDING':
        return 'outline';
      case 'FAILED':
        return 'destructive';
      case 'CANCELLED':
        return 'outline';
      case 'REFUNDED':
        return 'secondary';
      default:
        return 'outline';
    }
  })();

  return (
    <Badge variant={badgeVariant} className={size === 'sm' ? 'text-xs' : ''}>
      <PaymentStatusIcon status={status} className="h-3 w-3 mr-1" />
      {status}
    </Badge>
  );
}

export default PaymentStatus;