import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Alert, AlertDescription } from '../../components/ui/alert';
import {
  CreditCard,
  Building2,
  CheckCircle,
  AlertCircle,
  Info,
  RefreshCw,
  Shield,
  Lock,
  DollarSign,
  Calendar,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';

/**
 * Payment Processing Page
 * Handles investment payment with Stripe integration
 * Supports credit card, ACH, and wire transfer methods
 */

const paymentSchema = z.object({
  paymentMethod: z.enum(['CARD', 'ACH', 'WIRE']),
  // Card fields
  cardNumber: z.string().optional(),
  cardExpiry: z.string().optional(),
  cardCvc: z.string().optional(),
  cardName: z.string().optional(),
  // ACH fields
  routingNumber: z.string().optional(),
  accountNumber: z.string().optional(),
  accountType: z.enum(['CHECKING', 'SAVINGS']).optional(),
  accountName: z.string().optional(),
  // Billing address
  billingZip: z.string().min(5, 'ZIP code is required'),
  billingAddress: z.string().min(1, 'Address is required'),
  billingCity: z.string().min(1, 'City is required'),
  billingState: z.string().min(2, 'State is required'),
  // Agreement
  termsAccepted: z.boolean().refine((val) => val === true, {
    message: 'You must accept the terms',
  }),
}).refine((data) => {
  // Validate card fields if payment method is CARD
  if (data.paymentMethod === 'CARD') {
    return data.cardNumber && data.cardExpiry && data.cardCvc && data.cardName;
  }
  // Validate ACH fields if payment method is ACH
  if (data.paymentMethod === 'ACH') {
    return data.routingNumber && data.accountNumber && data.accountType && data.accountName;
  }
  return true;
}, {
  message: 'Please complete all required payment fields',
  path: ['paymentMethod'],
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface InvestmentSummary {
  id: string;
  amount: number;
  pitch: {
    id: string;
    startup: {
      name: string;
      logo?: string;
    };
    title: string;
    equityOffered: number;
    fundingGoal: number;
  };
  status: string;
  createdAt: string;
}

interface PaymentFees {
  platformFee: number;
  processingFee: number;
  totalFees: number;
  netAmount: number;
}

const PAYMENT_METHODS = [
  {
    value: 'CARD',
    name: 'Credit/Debit Card',
    description: 'Instant processing with Stripe',
    icon: CreditCard,
    fee: '2.9% + $0.30',
    processingTime: 'Instant',
  },
  {
    value: 'ACH',
    name: 'Bank Transfer (ACH)',
    description: 'Direct bank account transfer',
    icon: Building2,
    fee: '0.8% (max $5)',
    processingTime: '3-5 business days',
  },
  {
    value: 'WIRE',
    name: 'Wire Transfer',
    description: 'Manual wire transfer',
    icon: DollarSign,
    fee: '$0 platform fee',
    processingTime: '1-2 business days',
  },
];

export function PaymentProcessingPage() {
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const investmentId = (params as any).investmentId;

  const [investment, setInvestment] = useState<InvestmentSummary | null>(null);
  const [fees, setFees] = useState<PaymentFees | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paymentMethod: 'CARD',
      termsAccepted: false,
    },
  });

  const paymentMethod = watch('paymentMethod');

  useEffect(() => {
    if (investmentId) {
      fetchInvestmentDetails();
    }
  }, [investmentId]);

  useEffect(() => {
    if (investment) {
      calculateFees();
    }
  }, [investment, paymentMethod]);

  const fetchInvestmentDetails = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:3001/api/investments/${investmentId}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch investment details');
      }

      const result = await response.json();
      setInvestment(result.data.investment);
    } catch (err: any) {
      console.error('Error fetching investment:', err);
      setError(err.message || 'Failed to load investment');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateFees = async () => {
    if (!investment) return;

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `http://localhost:3001/api/payments/fees/calculate?amount=${investment.amount}&method=${paymentMethod}`,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        setFees(result.data);
      }
    } catch (err: any) {
      console.error('Error calculating fees:', err);
    }
  };

  const onSubmit = async (data: PaymentFormData) => {
    setIsProcessing(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');

      // Process payment based on method
      if (data.paymentMethod === 'CARD' || data.paymentMethod === 'ACH') {
        // Call Stripe/payment processing endpoint
        const response = await fetch('http://localhost:3001/api/payments/process', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            investmentId,
            paymentMethod: data.paymentMethod,
            amount: investment?.amount,
            paymentDetails: {
              cardNumber: data.cardNumber,
              cardExpiry: data.cardExpiry,
              cardCvc: data.cardCvc,
              cardName: data.cardName,
              routingNumber: data.routingNumber,
              accountNumber: data.accountNumber,
              accountType: data.accountType,
              accountName: data.accountName,
            },
            billingAddress: {
              address: data.billingAddress,
              city: data.billingCity,
              state: data.billingState,
              zip: data.billingZip,
            },
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Payment failed');
        }

        const result = await response.json();

        // Handle payment success
        setPaymentSuccess(true);

        // Redirect to success page after 2 seconds
        setTimeout(() => {
          navigate({ to: `/investments/${investmentId}/success` });
        }, 2000);
      } else if (data.paymentMethod === 'WIRE') {
        // For wire transfer, just mark as pending and show instructions
        const response = await fetch(`http://localhost:3001/api/investments/${investmentId}/confirm-payment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            paymentMethod: 'WIRE',
            status: 'PENDING_WIRE',
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to process wire transfer request');
        }

        navigate({ to: `/investments/${investmentId}/wire-instructions` });
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.message || 'Payment processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container max-w-5xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading payment details...</span>
        </div>
      </div>
    );
  }

  if (error && !investment) {
    return (
      <div className="container max-w-5xl mx-auto py-8 px-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => navigate({ to: '/investments' })} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Marketplace
        </Button>
      </div>
    );
  }

  if (paymentSuccess) {
    return (
      <div className="container max-w-5xl mx-auto py-8 px-4">
        <Card>
          <CardContent className="text-center py-12">
            <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold mb-3">Payment Successful!</h2>
            <p className="text-muted-foreground mb-6">
              Your investment has been processed successfully.
            </p>
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground mt-2">Redirecting...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!investment) return null;

  const totalAmount = fees ? investment.amount + fees.totalFees : investment.amount;

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4">
      {/* Header */}
      <Button
        variant="ghost"
        onClick={() => navigate({ to: `/investments/${investment.pitch.id}/commit` })}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Complete Your Investment</h1>
        <p className="text-muted-foreground">Secure payment processing powered by Stripe</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Payment Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Payment Method Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Select Payment Method</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {PAYMENT_METHODS.map((method) => {
                    const Icon = method.icon;
                    return (
                      <button
                        key={method.value}
                        type="button"
                        onClick={() => setValue('paymentMethod', method.value as any)}
                        className={cn(
                          'w-full p-4 border-2 rounded-lg text-left transition-all',
                          paymentMethod === method.value
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 hover:border-gray-300'
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1">
                            <Icon className={cn('h-6 w-6 mt-0.5', paymentMethod === method.value ? 'text-primary' : 'text-muted-foreground')} />
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-semibold">{method.name}</span>
                                {paymentMethod === method.value && (
                                  <CheckCircle className="h-5 w-5 text-primary" />
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">{method.description}</p>
                              <div className="flex items-center space-x-4 text-xs">
                                <span className="text-muted-foreground">Fee: {method.fee}</span>
                                <span className="text-muted-foreground">•</span>
                                <span className="text-muted-foreground">Processing: {method.processingTime}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Payment Details */}
            {paymentMethod === 'CARD' && (
              <Card>
                <CardHeader>
                  <CardTitle>Card Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="cardNumber">Card Number</Label>
                      <Input
                        id="cardNumber"
                        {...register('cardNumber')}
                        placeholder="1234 5678 9012 3456"
                        maxLength={19}
                        className="mt-1"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="cardExpiry">Expiry Date</Label>
                        <Input
                          id="cardExpiry"
                          {...register('cardExpiry')}
                          placeholder="MM/YY"
                          maxLength={5}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="cardCvc">CVC</Label>
                        <Input
                          id="cardCvc"
                          {...register('cardCvc')}
                          placeholder="123"
                          maxLength={4}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="cardName">Cardholder Name</Label>
                      <Input
                        id="cardName"
                        {...register('cardName')}
                        placeholder="John Doe"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {paymentMethod === 'ACH' && (
              <Card>
                <CardHeader>
                  <CardTitle>Bank Account Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="accountName">Account Holder Name</Label>
                      <Input
                        id="accountName"
                        {...register('accountName')}
                        placeholder="John Doe"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="routingNumber">Routing Number</Label>
                      <Input
                        id="routingNumber"
                        {...register('routingNumber')}
                        placeholder="123456789"
                        maxLength={9}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="accountNumber">Account Number</Label>
                      <Input
                        id="accountNumber"
                        {...register('accountNumber')}
                        placeholder="000123456789"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label>Account Type</Label>
                      <div className="grid grid-cols-2 gap-3 mt-2">
                        <button
                          type="button"
                          onClick={() => setValue('accountType', 'CHECKING')}
                          className={cn(
                            'p-3 border-2 rounded-lg text-center transition-all',
                            watch('accountType') === 'CHECKING'
                              ? 'border-primary bg-primary/5'
                              : 'border-gray-200 hover:border-gray-300'
                          )}
                        >
                          <span className="font-semibold">Checking</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setValue('accountType', 'SAVINGS')}
                          className={cn(
                            'p-3 border-2 rounded-lg text-center transition-all',
                            watch('accountType') === 'SAVINGS'
                              ? 'border-primary bg-primary/5'
                              : 'border-gray-200 hover:border-gray-300'
                          )}
                        >
                          <span className="font-semibold">Savings</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {paymentMethod === 'WIRE' && (
              <Card>
                <CardHeader>
                  <CardTitle>Wire Transfer Instructions</CardTitle>
                </CardHeader>
                <CardContent>
                  <Alert className="border-blue-600 bg-blue-50">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                      After submitting, you will receive detailed wire transfer instructions via email.
                      Your investment will be confirmed once we receive your wire transfer.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            )}

            {/* Billing Address */}
            <Card>
              <CardHeader>
                <CardTitle>Billing Address</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="billingAddress">Street Address</Label>
                    <Input
                      id="billingAddress"
                      {...register('billingAddress')}
                      placeholder="123 Main St"
                      className={cn('mt-1', errors.billingAddress && 'border-red-600')}
                    />
                    {errors.billingAddress && (
                      <p className="text-sm text-red-600 mt-1">{errors.billingAddress.message}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="billingCity">City</Label>
                      <Input
                        id="billingCity"
                        {...register('billingCity')}
                        placeholder="San Francisco"
                        className={cn('mt-1', errors.billingCity && 'border-red-600')}
                      />
                      {errors.billingCity && (
                        <p className="text-sm text-red-600 mt-1">{errors.billingCity.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="billingState">State</Label>
                      <Input
                        id="billingState"
                        {...register('billingState')}
                        placeholder="CA"
                        maxLength={2}
                        className={cn('mt-1', errors.billingState && 'border-red-600')}
                      />
                      {errors.billingState && (
                        <p className="text-sm text-red-600 mt-1">{errors.billingState.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="billingZip">ZIP Code</Label>
                    <Input
                      id="billingZip"
                      {...register('billingZip')}
                      placeholder="94102"
                      maxLength={10}
                      className={cn('mt-1', errors.billingZip && 'border-red-600')}
                    />
                    {errors.billingZip && (
                      <p className="text-sm text-red-600 mt-1">{errors.billingZip.message}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Terms Agreement */}
            <Card>
              <CardContent className="pt-6">
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('termsAccepted')}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <p className="text-sm">
                      I authorize Elite Angel Fund to charge my payment method for the total amount shown.
                      I agree to the{' '}
                      <a href="#" className="text-blue-600 underline">Payment Terms</a> and{' '}
                      <a href="#" className="text-blue-600 underline">Refund Policy</a>.
                    </p>
                  </div>
                </label>
                {errors.termsAccepted && (
                  <p className="text-sm text-red-600 mt-2">{errors.termsAccepted.message}</p>
                )}
              </CardContent>
            </Card>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Processing Payment...
                </>
              ) : (
                <>
                  <Lock className="h-5 w-5 mr-2" />
                  Pay ${formatNumber(totalAmount)}
                </>
              )}
            </Button>
          </div>

          {/* Sidebar - Order Summary */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-3 pb-4 border-b mb-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    {investment.pitch.startup.logo ? (
                      <img src={investment.pitch.startup.logo} alt={investment.pitch.startup.name} className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <Building2 className="h-6 w-6 text-white" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold">{investment.pitch.startup.name}</p>
                    <p className="text-xs text-muted-foreground">{investment.pitch.title}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Investment Amount</span>
                    <span className="font-semibold">${formatNumber(investment.amount)}</span>
                  </div>

                  {fees && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Platform Fee (5%)</span>
                        <span className="font-semibold">${formatNumber(fees.platformFee)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Processing Fee</span>
                        <span className="font-semibold">${formatNumber(fees.processingFee)}</span>
                      </div>
                      <div className="pt-3 border-t">
                        <div className="flex justify-between">
                          <span className="font-bold">Total Amount</span>
                          <span className="text-xl font-bold text-green-600">
                            ${formatNumber(totalAmount)}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Secure Payment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start space-x-2">
                    <Shield className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Bank-Level Security</p>
                      <p className="text-xs text-muted-foreground">256-bit SSL encryption</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <Lock className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">PCI DSS Compliant</p>
                      <p className="text-xs text-muted-foreground">Stripe certified processing</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Escrow Protected</p>
                      <p className="text-xs text-muted-foreground">Funds secured until close</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Alert className="border-orange-600 bg-orange-50">
              <Info className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800 text-sm">
                <strong>Escrow Notice:</strong> Your payment will be held in escrow and released to the company
                only when the funding round successfully closes.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </form>
    </div>
  );
}
