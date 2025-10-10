import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Loader2, CreditCard, Building2, Wallet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { usePayment } from '../../hooks/use-payment';
import { useEscrow } from '../../hooks/use-escrow';
import {
  formatCurrency,
  formatFeeBreakdown,
  validatePaymentForm,
  getPaymentMethodDescription,
  getEstimatedProcessingTime,
} from '../../lib/payment-utils';

interface PaymentFormProps {
  investmentId: string;
  investmentAmount: number;
  startupName: string;
  onPaymentSuccess?: (paymentIntent: any) => void;
  onPaymentError?: (error: string) => void;
}

export function PaymentForm({
  investmentId,
  investmentAmount,
  startupName,
  onPaymentSuccess,
  onPaymentError,
}: PaymentFormProps) {
  const [amount, setAmount] = useState(investmentAmount.toString());
  const [paymentMethod, setPaymentMethod] = useState('');
  const [investmentType, setInvestmentType] = useState<'DIRECT' | 'SYNDICATE'>('DIRECT');
  const [currency, setCurrency] = useState('USD');
  const [fees, setFees] = useState<any>(null);

  const {
    paymentMethods,
    selectedPaymentMethod,
    isProcessing,
    paymentIntent,
    error,
    setSelectedPaymentMethod,
    processPayment,
    calculateFees,
    selectedMethod,
  } = usePayment({
    investmentId,
    amount: parseFloat(amount) || 0,
    currency,
    onPaymentSuccess,
    onPaymentError,
  });

  // Calculate fees when amount or investment type changes
  useEffect(() => {
    const numericAmount = parseFloat(amount) || 0;
    if (numericAmount > 0) {
      calculateFees(numericAmount, investmentType).then(setFees).catch(console.error);
    }
  }, [amount, investmentType, calculateFees]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const numericAmount = parseFloat(amount);
    if (!numericAmount || numericAmount <= 0) {
      onPaymentError?.('Please enter a valid amount');
      return;
    }

    const validation = validatePaymentForm({
      amount: numericAmount,
      paymentMethod,
      currency,
      investmentType,
    });

    if (!validation.isValid) {
      onPaymentError?.(validation.errors.join(', '));
      return;
    }

    await processPayment({
      investmentId,
      amount: numericAmount,
      paymentMethod,
      investmentType,
    });
  };

  const feeBreakdown = fees ? formatFeeBreakdown(fees) : [];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Investment Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Investment Summary
          </CardTitle>
          <CardDescription>
            Review your investment in {startupName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Investment Amount:</span>
              <span className="font-semibold">
                {formatCurrency(parseFloat(amount) || 0, currency).formatted}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Investment Type:</span>
              <Badge variant={investmentType === 'DIRECT' ? 'default' : 'secondary'}>
                {investmentType}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Form */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Information</CardTitle>
          <CardDescription>
            Choose your preferred payment method
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Amount Input */}
            <div className="space-y-2">
              <Label htmlFor="amount">Investment Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  {formatCurrency(0, currency).symbol}
                </span>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-8"
                  placeholder="Enter amount"
                  required
                />
              </div>
            </div>

            {/* Currency Selection */}
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  <SelectItem value="CAD">CAD (C$)</SelectItem>
                  <SelectItem value="AUD">AUD (A$)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Investment Type */}
            <div className="space-y-2">
              <Label htmlFor="investmentType">Investment Type</Label>
              <Select value={investmentType} onValueChange={(value: 'DIRECT' | 'SYNDICATE') => setInvestmentType(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select investment type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DIRECT">Direct Investment</SelectItem>
                  <SelectItem value="SYNDICATE">Syndicate Investment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Payment Method Selection */}
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <div className="grid gap-3">
                {paymentMethods.map((method) => (
                  <div
                    key={method.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedPaymentMethod === method.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => {
                      setPaymentMethod(method.id);
                      setSelectedPaymentMethod(method.id);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {method.id === 'CARD' && <CreditCard className="h-5 w-5" />}
                        {method.id === 'BANK_TRANSFER' && <Building2 className="h-5 w-5" />}
                        {method.id === 'DIGITAL_WALLET' && <Wallet className="h-5 w-5" />}
                        <div>
                          <div className="font-medium">{method.name}</div>
                          <div className="text-sm text-gray-500">
                            {getPaymentMethodDescription(method.id)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">
                          Processing: {getEstimatedProcessingTime(method.id)}
                        </div>
                        <div className="text-sm font-medium">
                          Fee: {formatCurrency(method.fees.platform_fee + method.fees.processing_fee, currency).formatted}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isProcessing || !paymentMethod || !amount}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing Payment...
                </>
              ) : (
                `Pay ${formatCurrency(parseFloat(amount) || 0, currency).formatted}`
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Fee Breakdown */}
      {fees && (
        <Card>
          <CardHeader>
            <CardTitle>Fee Breakdown</CardTitle>
            <CardDescription>
              Detailed breakdown of all fees and charges
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {feeBreakdown.map((fee, index) => (
                <div key={index} className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">{fee.label}</div>
                    {fee.description && (
                      <div className="text-sm text-gray-500">{fee.description}</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {formatCurrency(fee.amount, currency).formatted}
                    </div>
                    {fee.percentage && (
                      <div className="text-sm text-gray-500">
                        {fee.percentage.toFixed(2)}%
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between items-center font-semibold">
                <span>Total Amount</span>
                <span>{formatCurrency(fees.totalAmount, currency).formatted}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security Notice */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Your payment information is encrypted and secure. We never store your payment details.
          All investments are held in escrow until the funding round completes successfully.
        </AlertDescription>
      </Alert>
    </div>
  );
}

export default PaymentForm;