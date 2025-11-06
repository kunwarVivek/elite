import React, { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Alert, AlertDescription } from '../../components/ui/alert';
import {
  Building2,
  DollarSign,
  Calendar,
  ArrowLeft,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

/**
 * Create Sell Order
 * List shares for sale on the secondary marketplace
 */

interface ShareCertificate {
  id: string;
  certificateNumber: string;
  totalShares: number;
  sharePrice: number;
  totalValue: number;
  issuedDate: string;
  isTransferable: boolean;
  investment: {
    id: string;
    amount: number;
    investmentDate: string;
    pitch: {
      title: string;
      startup: {
        id: string;
        name: string;
        industry: string;
        logoUrl?: string;
      };
    };
  };
}

const sellOrderSchema = z.object({
  shareCertificateId: z.string().min(1, 'Please select a share certificate'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  pricePerShare: z.number().min(0.01, 'Price must be greater than 0'),
  expiresInDays: z.number().min(30).max(90),
});

type SellOrderFormData = z.infer<typeof sellOrderSchema>;

export function CreateSellOrderPage() {
  const navigate = useNavigate();
  const [certificates, setCertificates] = useState<ShareCertificate[]>([]);
  const [selectedCert, setSelectedCert] = useState<ShareCertificate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SellOrderFormData>({
    resolver: zodResolver(sellOrderSchema),
    defaultValues: {
      expiresInDays: 60,
    },
  });

  const quantity = watch('quantity');
  const pricePerShare = watch('pricePerShare');
  const shareCertificateId = watch('shareCertificateId');

  useEffect(() => {
    fetchUserShareCertificates();
  }, []);

  useEffect(() => {
    if (shareCertificateId) {
      const cert = certificates.find((c) => c.id === shareCertificateId);
      setSelectedCert(cert || null);
    }
  }, [shareCertificateId, certificates]);

  const fetchUserShareCertificates = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:3001/api/portfolio/share-certificates', {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch share certificates');
      }

      const result = await response.json();
      setCertificates(result.data.certificates || []);
    } catch (err: any) {
      console.error('Error fetching certificates:', err);
      setError(err.message || 'Failed to load your share certificates');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: SellOrderFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Calculate expiration date
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + data.expiresInDays);

      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:3001/api/marketplace/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          shareCertificateId: data.shareCertificateId,
          quantity: data.quantity,
          pricePerShare: data.pricePerShare,
          expiresAt: expiresAt.toISOString(),
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || 'Failed to create sell order');
      }

      const result = await response.json();
      setSuccess(true);

      // Navigate to order details after success
      setTimeout(() => {
        navigate({ to: `/marketplace/my-orders` });
      }, 2000);
    } catch (err: any) {
      console.error('Error creating sell order:', err);
      setError(err.message || 'Failed to create sell order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateTotalValue = (): number => {
    if (!quantity || !pricePerShare) return 0;
    return quantity * pricePerShare;
  };

  const calculatePlatformFee = (): number => {
    return calculateTotalValue() * 0.02; // 2% fee
  };

  const calculateNetProceeds = (): number => {
    return calculateTotalValue() - calculatePlatformFee();
  };

  const checkHoldingPeriod = (certif: ShareCertificate): boolean => {
    const investmentDate = new Date(certif.investment.investmentDate);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return investmentDate <= sixMonthsAgo;
  };

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <Button variant="ghost" onClick={() => navigate({ to: '/marketplace' })} className="mb-6">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Marketplace
      </Button>

      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">List Shares for Sale</h1>
        <p className="text-lg text-muted-foreground">
          Create a sell order for your shares on the secondary marketplace
        </p>
      </div>

      {/* Success Message */}
      {success && (
        <Alert className="mb-6 border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-600">
            Sell order created successfully! Redirecting...
          </AlertDescription>
        </Alert>
      )}

      {/* Error Message */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {certificates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Share Certificates</h3>
            <p className="text-muted-foreground mb-6">
              You don't have any share certificates to sell yet.
            </p>
            <Button onClick={() => navigate({ to: '/portfolio' })}>View Portfolio</Button>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Select Share Certificate */}
          <Card>
            <CardHeader>
              <CardTitle>Select Shares to Sell</CardTitle>
              <CardDescription>Choose which share certificate you want to list</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="shareCertificateId">Share Certificate</Label>
                  <select
                    id="shareCertificateId"
                    {...register('shareCertificateId')}
                    className="w-full mt-1 px-3 py-2 border rounded-md"
                  >
                    <option value="">Select a certificate...</option>
                    {certificates.map((cert) => {
                      const canSell = checkHoldingPeriod(cert);
                      return (
                        <option key={cert.id} value={cert.id} disabled={!canSell}>
                          {cert.investment.pitch.startup.name} - {cert.totalShares} shares
                          {!canSell && ' (6-month hold required)'}
                        </option>
                      );
                    })}
                  </select>
                  {errors.shareCertificateId && (
                    <p className="text-sm text-red-600 mt-1">{errors.shareCertificateId.message}</p>
                  )}
                </div>

                {/* Certificate Details */}
                {selectedCert && (
                  <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                        {selectedCert.investment.pitch.startup.logoUrl ? (
                          <img
                            src={selectedCert.investment.pitch.startup.logoUrl}
                            alt={selectedCert.investment.pitch.startup.name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <Building2 className="h-6 w-6 text-white" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold">{selectedCert.investment.pitch.startup.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {selectedCert.investment.pitch.startup.industry}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 pt-3 border-t">
                      <div>
                        <p className="text-xs text-muted-foreground">Total Shares</p>
                        <p className="font-semibold">{selectedCert.totalShares.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Original Price</p>
                        <p className="font-semibold">
                          {formatCurrency(parseFloat(selectedCert.sharePrice.toString()))}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Invested</p>
                        <p className="font-semibold">
                          {formatDate(selectedCert.investment.investmentDate)}
                        </p>
                      </div>
                    </div>

                    {!checkHoldingPeriod(selectedCert) && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          This certificate requires a 6-month holding period before selling
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Pricing */}
          {selectedCert && (
            <Card>
              <CardHeader>
                <CardTitle>Set Pricing</CardTitle>
                <CardDescription>Determine the price and quantity for your listing</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min={1}
                      max={selectedCert.totalShares}
                      {...register('quantity', { valueAsNumber: true })}
                      placeholder="Number of shares to sell"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Max: {selectedCert.totalShares.toLocaleString()} shares
                    </p>
                    {errors.quantity && (
                      <p className="text-sm text-red-600 mt-1">{errors.quantity.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="pricePerShare">Price Per Share</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="pricePerShare"
                        type="number"
                        step="0.01"
                        min={0.01}
                        {...register('pricePerShare', { valueAsNumber: true })}
                        className="pl-10"
                        placeholder="0.00"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Original: {formatCurrency(parseFloat(selectedCert.sharePrice.toString()))}
                    </p>
                    {errors.pricePerShare && (
                      <p className="text-sm text-red-600 mt-1">{errors.pricePerShare.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="expiresInDays">Listing Duration</Label>
                    <select
                      id="expiresInDays"
                      {...register('expiresInDays', { valueAsNumber: true })}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value={30}>30 days</option>
                      <option value={60}>60 days</option>
                      <option value={90}>90 days</option>
                    </select>
                    {errors.expiresInDays && (
                      <p className="text-sm text-red-600 mt-1">{errors.expiresInDays.message}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Summary */}
          {selectedCert && quantity > 0 && pricePerShare > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
                <CardDescription>Review your sell order details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Total Value</span>
                    <span className="font-semibold">{formatCurrency(calculateTotalValue())}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Platform Fee (2%)</span>
                    <span className="font-semibold text-red-600">
                      -{formatCurrency(calculatePlatformFee())}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t">
                    <span className="text-lg font-semibold">Net Proceeds</span>
                    <span className="text-2xl font-bold text-green-600">
                      {formatCurrency(calculateNetProceeds())}
                    </span>
                  </div>
                </div>

                <Alert className="mt-6">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Your shares will be locked once this order is created. Settlement occurs within
                    T+3 business days after a trade is executed.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}

          {/* Submit */}
          <div className="flex items-center space-x-4">
            <Button type="submit" disabled={isSubmitting || !selectedCert} size="lg" className="flex-1">
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Creating Order...
                </>
              ) : (
                'Create Sell Order'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate({ to: '/marketplace' })}
              size="lg"
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
