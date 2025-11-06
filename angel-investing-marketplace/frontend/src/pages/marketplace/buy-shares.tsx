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
import { Progress } from '../../components/ui/progress';
import {
  Building2,
  DollarSign,
  ShoppingCart,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  FileText,
  Calendar,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

/**
 * Buy Shares Page
 * Purchase shares from the secondary marketplace
 */

interface OrderDetails {
  id: string;
  quantity: number;
  pricePerShare: number;
  totalAmount: number;
  status: string;
  shareCertificate: {
    investment: {
      pitch: {
        startup: {
          id: string;
          name: string;
          industry: string;
          logoUrl?: string;
        };
      };
    };
  };
}

const buySchema = z.object({
  quantity: z.number().min(1, 'Quantity must be at least 1'),
});

type BuyFormData = z.infer<typeof buySchema>;

export function BuySharesPage() {
  const navigate = useNavigate();
  const { orderId } = useParams({ strict: false });
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<BuyFormData>({
    resolver: zodResolver(buySchema),
  });

  const quantity = watch('quantity');

  useEffect(() => {
    if (orderId) fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:3001/api/marketplace/orders/${orderId}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });
      if (!response.ok) throw new Error('Failed to fetch order');
      const result = await response.json();
      setOrder(result.data.order);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: BuyFormData) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:3001/api/marketplace/trades', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          orderId,
          quantity: data.quantity,
        }),
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || 'Failed to execute trade');
      }
      setSuccess(true);
      setTimeout(() => {
        navigate({ to: '/marketplace/trades' });
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateSubtotal = (): number => {
    if (!order || !quantity) return 0;
    return quantity * parseFloat(order.pricePerShare.toString());
  };

  const calculateFee = (): number => {
    return calculateSubtotal() * 0.02; // 2% platform fee
  };

  const calculateTotal = (): number => {
    return calculateSubtotal() + calculateFee();
  };

  const getSettlementDate = (): Date => {
    const date = new Date();
    date.setDate(date.getDate() + 3); // T+3 settlement
    return date;
  };

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => navigate({ to: '/marketplace' })} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Marketplace
        </Button>
      </div>
    );
  }

  const startup = order?.shareCertificate?.investment?.pitch?.startup;

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <Button variant="ghost" onClick={() => navigate({ to: '/marketplace' })} className="mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Marketplace
      </Button>

      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Purchase Shares</h1>
        <p className="text-lg text-muted-foreground">Complete your share purchase</p>
      </div>

      {/* Progress Indicator */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1 text-center">
              <div
                className={`mb-2 w-8 h-8 rounded-full mx-auto flex items-center justify-center ${
                  currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}
              >
                1
              </div>
              <div className="text-xs font-semibold">Select Quantity</div>
            </div>
            <div className="flex-1 border-t-2"></div>
            <div className="flex-1 text-center">
              <div
                className={`mb-2 w-8 h-8 rounded-full mx-auto flex items-center justify-center ${
                  currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}
              >
                2
              </div>
              <div className="text-xs font-semibold">Review Order</div>
            </div>
            <div className="flex-1 border-t-2"></div>
            <div className="flex-1 text-center">
              <div
                className={`mb-2 w-8 h-8 rounded-full mx-auto flex items-center justify-center ${
                  currentStep >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}
              >
                3
              </div>
              <div className="text-xs font-semibold">Confirm</div>
            </div>
          </div>
          <Progress value={(currentStep / 3) * 100} />
        </CardContent>
      </Card>

      {success && (
        <Alert className="mb-6 border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-600">
            Trade executed successfully! Redirecting to trade history...
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Company Info */}
        <Card>
          <CardHeader>
            <CardTitle>Share Details</CardTitle>
          </CardHeader>
          <CardContent>
            {startup && (
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  {startup.logoUrl ? (
                    <img
                      src={startup.logoUrl}
                      alt={startup.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <Building2 className="h-8 w-8 text-white" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold">{startup.name}</h3>
                  <p className="text-muted-foreground">{startup.industry}</p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t">
              <div>
                <p className="text-sm text-muted-foreground">Available Shares</p>
                <p className="text-xl font-bold">{order?.quantity.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Price Per Share</p>
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(parseFloat(order?.pricePerShare.toString() || '0'))}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Available</p>
                <p className="text-xl font-bold">
                  {formatCurrency(parseFloat(order?.totalAmount.toString() || '0'))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quantity Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Quantity</CardTitle>
            <CardDescription>How many shares would you like to purchase?</CardDescription>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="quantity">Number of Shares</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                max={order?.quantity}
                {...register('quantity', { valueAsNumber: true })}
                placeholder="Enter number of shares"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Maximum: {order?.quantity.toLocaleString()} shares
              </p>
              {errors.quantity && (
                <p className="text-sm text-red-600 mt-1">{errors.quantity.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Order Summary */}
        {quantity > 0 && quantity <= (order?.quantity || 0) && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
                <CardDescription>Review your purchase details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shares ({quantity})</span>
                    <span className="font-semibold">{formatCurrency(calculateSubtotal())}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Platform Fee (2%)</span>
                    <span className="font-semibold text-red-600">
                      +{formatCurrency(calculateFee())}
                    </span>
                  </div>
                  <div className="flex justify-between pt-3 border-t">
                    <span className="text-lg font-semibold">Total Amount</span>
                    <span className="text-2xl font-bold text-green-600">
                      {formatCurrency(calculateTotal())}
                    </span>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-lg space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Expected Settlement</span>
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span className="font-semibold">{formatDate(getSettlementDate())}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    T+3 business days from trade execution
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Important Information */}
            <Card>
              <CardHeader>
                <CardTitle>Important Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Alert>
                    <FileText className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Settlement:</strong> Trades settle within T+3 business days. Share
                      certificates will be transferred upon settlement.
                    </AlertDescription>
                  </Alert>
                  <Alert>
                    <DollarSign className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Payment:</strong> Funds will be held in escrow until settlement
                      completes.
                    </AlertDescription>
                  </Alert>
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Risk:</strong> Investing in private companies involves substantial
                      risk. Please review all documents carefully.
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Submit Buttons */}
        <div className="flex items-center space-x-4">
          <Button
            type="submit"
            disabled={isSubmitting || !quantity || quantity > (order?.quantity || 0)}
            size="lg"
            className="flex-1"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Processing Trade...
              </>
            ) : (
              <>
                <ShoppingCart className="h-4 w-4 mr-2" />
                Confirm Purchase
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate({ to: `/marketplace/orders/${orderId}` })}
            size="lg"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
