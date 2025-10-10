import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import {
  CreditCard,
  Building2,
  Wallet,
  Globe,
  Bitcoin,
  Clock,
  Shield,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { formatCurrency, getPaymentMethodDescription, getEstimatedProcessingTime } from '../../lib/payment-utils';

interface PaymentMethod {
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
  enabled: boolean;
}

interface PaymentMethodsProps {
  methods: PaymentMethod[];
  selectedMethod?: string;
  onMethodSelect: (methodId: string) => void;
  amount: number;
  currency: string;
  showFees?: boolean;
  compact?: boolean;
}

const PaymentMethodIcon: React.FC<{ methodId: string }> = ({ methodId }) => {
  const iconClass = "h-6 w-6";

  switch (methodId) {
    case 'CARD':
      return <CreditCard className={`${iconClass} text-blue-600`} />;
    case 'BANK_TRANSFER':
      return <Building2 className={`${iconClass} text-green-600`} />;
    case 'DIGITAL_WALLET':
      return <Wallet className={`${iconClass} text-purple-600`} />;
    case 'WIRE_TRANSFER':
      return <Globe className={`${iconClass} text-gray-600`} />;
    case 'CRYPTOCURRENCY':
      return <Bitcoin className={`${iconClass} text-orange-600`} />;
    default:
      return <CreditCard className={`${iconClass} text-gray-600`} />;
  }
};

export function PaymentMethods({
  methods,
  selectedMethod,
  onMethodSelect,
  amount,
  currency,
  showFees = true,
  compact = false,
}: PaymentMethodsProps) {
  const enabledMethods = methods.filter(method => method.enabled);

  if (enabledMethods.length === 0) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No payment methods are currently available. Please contact support for assistance.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
      {enabledMethods.map((method) => {
        const isSelected = selectedMethod === method.id;
        const totalFee = method.fees.platform_fee + method.fees.processing_fee;
        const isAmountSupported = amount >= method.limits.minimum && amount <= method.limits.maximum;

        return (
          <Card
            key={method.id}
            className={`cursor-pointer transition-all duration-200 ${
              isSelected
                ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50'
                : 'hover:shadow-md hover:border-gray-300'
            } ${!isAmountSupported ? 'opacity-50' : ''}`}
            onClick={() => isAmountSupported && onMethodSelect(method.id)}
          >
            <CardHeader className={compact ? 'pb-3' : ''}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <PaymentMethodIcon methodId={method.id} />
                  <div>
                    <CardTitle className={compact ? 'text-lg' : 'text-xl'}>
                      {method.name}
                    </CardTitle>
                    {!compact && (
                      <CardDescription className="mt-1">
                        {getPaymentMethodDescription(method.id)}
                      </CardDescription>
                    )}
                  </div>
                </div>
                {isSelected && (
                  <CheckCircle2 className="h-5 w-5 text-blue-600" />
                )}
              </div>
            </CardHeader>

            <CardContent className={compact ? 'pt-0' : ''}>
              {/* Processing Time */}
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  Processing: {getEstimatedProcessingTime(method.id)}
                </span>
              </div>

              {/* Amount Limits */}
              <div className="mb-3">
                <div className="text-sm text-gray-600 mb-1">Amount Range:</div>
                <div className="flex gap-2">
                  <Badge variant="outline">
                    Min: {formatCurrency(method.limits.minimum, currency).formatted}
                  </Badge>
                  <Badge variant="outline">
                    Max: {formatCurrency(method.limits.maximum, currency).formatted}
                  </Badge>
                </div>
              </div>

              {/* Fees */}
              {showFees && (
                <div className="mb-3">
                  <div className="text-sm text-gray-600 mb-1">Fees:</div>
                  <div className="space-y-1">
                    {method.fees.platform_fee > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Platform Fee:</span>
                        <span>{formatCurrency(method.fees.platform_fee, currency).formatted}</span>
                      </div>
                    )}
                    {method.fees.processing_fee > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Processing Fee:</span>
                        <span>{formatCurrency(method.fees.processing_fee, currency).formatted}</span>
                      </div>
                    )}
                    {totalFee > 0 && (
                      <div className="flex justify-between text-sm font-medium border-t pt-1">
                        <span>Total Fees:</span>
                        <span>{formatCurrency(totalFee, currency).formatted}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Supported Currencies */}
              <div className="mb-3">
                <div className="text-sm text-gray-600 mb-1">Supported Currencies:</div>
                <div className="flex flex-wrap gap-1">
                  {method.supported_currencies.slice(0, 3).map((curr) => (
                    <Badge key={curr} variant="secondary" className="text-xs">
                      {curr}
                    </Badge>
                  ))}
                  {method.supported_currencies.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{method.supported_currencies.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>

              {/* Security Badge */}
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-600">Secure & Encrypted</span>
              </div>

              {/* Amount Support Warning */}
              {!isAmountSupported && (
                <Alert variant="destructive" className="mt-3">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    Amount {formatCurrency(amount, currency).formatted} is outside the supported range for this payment method.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// Compact version for mobile or smaller spaces
export function PaymentMethodsCompact(props: PaymentMethodsProps) {
  return <PaymentMethods {...props} compact={true} />;
}

// Grid version for larger displays
export function PaymentMethodsGrid(props: PaymentMethodsProps) {
  return <PaymentMethods {...props} compact={false} />;
}

export default PaymentMethods;