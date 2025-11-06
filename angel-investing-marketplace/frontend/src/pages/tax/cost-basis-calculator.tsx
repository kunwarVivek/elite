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
  ArrowLeft,
  Calculator,
  TrendingUp,
  TrendingDown,
  Info,
  AlertCircle,
  DollarSign,
  Calendar,
  RefreshCw
} from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';

/**
 * Cost Basis Calculator
 * Calculate capital gains/losses for investment sales
 */

interface Investment {
  id: string;
  companyName: string;
  shares: number;
  purchaseDate: string;
  purchasePrice: number;
  currentValue: number;
}

const calculatorSchema = z.object({
  investmentId: z.string().min(1, 'Please select an investment'),
  sharesToSell: z.number().positive('Shares to sell must be positive'),
  salePrice: z.number().positive('Sale price must be positive'),
  saleDate: z.string().min(1, 'Sale date is required'),
});

type CalculatorForm = z.infer<typeof calculatorSchema>;

interface CalculationResult {
  costBasis: number;
  saleProceeds: number;
  capitalGain: number;
  holdingPeriod: number;
  isLongTerm: boolean;
  taxRate: number;
  estimatedTax: number;
}

export function CostBasisCalculatorPage() {
  const navigate = useNavigate();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CalculatorForm>({
    resolver: zodResolver(calculatorSchema),
  });

  const investmentId = watch('investmentId');
  const sharesToSell = watch('sharesToSell');
  const salePrice = watch('salePrice');
  const saleDate = watch('saleDate');

  useEffect(() => {
    fetchInvestments();
  }, []);

  useEffect(() => {
    if (investmentId) {
      const investment = investments.find((inv) => inv.id === investmentId);
      setSelectedInvestment(investment || null);
      // Pre-fill sale price with current value per share
      if (investment) {
        const pricePerShare = investment.currentValue / investment.shares;
        setValue('salePrice', parseFloat(pricePerShare.toFixed(2)));
      }
    } else {
      setSelectedInvestment(null);
    }
  }, [investmentId, investments]);

  const fetchInvestments = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      // TODO: Replace with actual endpoint to fetch user's investments
      const response = await fetch('http://localhost:3001/api/investments', {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch investments');
      }

      const result = await response.json();
      setInvestments(result.data || []);
    } catch (err: any) {
      console.error('Error fetching investments:', err);
      setError(err.message || 'Failed to load investments');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: CalculatorForm) => {
    if (!selectedInvestment) {
      alert('Please select an investment');
      return;
    }

    setIsCalculating(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `http://localhost:3001/api/tax/capital-gains/${data.investmentId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify({
            saleProceeds: data.sharesToSell * data.salePrice,
            saleDate: data.saleDate,
            sharesSold: data.sharesToSell,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to calculate capital gains');
      }

      const apiResult = await response.json();

      // Calculate holding period
      const purchaseDate = new Date(selectedInvestment.purchaseDate);
      const saleDateObj = new Date(data.saleDate);
      const holdingDays = Math.floor(
        (saleDateObj.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      const isLongTerm = holdingDays > 365;
      const taxRate = isLongTerm ? 0.15 : 0.24;
      const costBasis = (selectedInvestment.purchasePrice / selectedInvestment.shares) * data.sharesToSell;
      const saleProceeds = data.sharesToSell * data.salePrice;
      const capitalGain = saleProceeds - costBasis;
      const estimatedTax = Math.max(0, capitalGain * taxRate);

      setResult({
        costBasis,
        saleProceeds,
        capitalGain,
        holdingPeriod: holdingDays,
        isLongTerm,
        taxRate,
        estimatedTax,
      });
    } catch (err: any) {
      console.error('Calculation error:', err);
      setError(err.message || 'Failed to calculate capital gains');
    } finally {
      setIsCalculating(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setValue('investmentId', '');
    setValue('sharesToSell', 0);
    setValue('salePrice', 0);
    setValue('saleDate', '');
    setSelectedInvestment(null);
  };

  if (isLoading) {
    return (
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading investments...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => navigate({ to: '/tax/tax-center' })}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tax Center
        </Button>
        <h1 className="text-3xl font-bold mb-2">Cost Basis Calculator</h1>
        <p className="text-muted-foreground">
          Calculate capital gains and tax implications for investment sales
        </p>
      </div>

      {/* Info Alert */}
      <Alert className="mb-6 border-blue-600 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription>
          <strong>How it works:</strong> Select an investment, enter the sale details, and we'll calculate
          your cost basis, capital gain/loss, and estimated tax liability based on holding period.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calculator Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calculator className="h-5 w-5 mr-2" />
              Sale Information
            </CardTitle>
            <CardDescription>
              Enter the details of your planned or completed sale
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Investment Selection */}
              <div className="space-y-2">
                <Label htmlFor="investmentId">
                  Select Investment <span className="text-red-500">*</span>
                </Label>
                <select
                  id="investmentId"
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  {...register('investmentId')}
                >
                  <option value="">Select an investment...</option>
                  {investments.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.companyName} ({formatNumber(inv.shares)} shares)
                    </option>
                  ))}
                </select>
                {errors.investmentId && (
                  <p className="text-sm text-red-500">{errors.investmentId.message}</p>
                )}
              </div>

              {/* Investment Details (if selected) */}
              {selectedInvestment && (
                <div className="p-4 rounded-lg bg-muted space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Shares:</span>
                    <span className="font-semibold">{formatNumber(selectedInvestment.shares)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Purchase Date:</span>
                    <span className="font-semibold">
                      {new Date(selectedInvestment.purchaseDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Cost Basis per Share:</span>
                    <span className="font-semibold">
                      ${(selectedInvestment.purchasePrice / selectedInvestment.shares).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Current Value per Share:</span>
                    <span className="font-semibold">
                      ${(selectedInvestment.currentValue / selectedInvestment.shares).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Shares to Sell */}
              <div className="space-y-2">
                <Label htmlFor="sharesToSell">
                  Shares to Sell <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="sharesToSell"
                  type="number"
                  step="0.01"
                  placeholder="0"
                  {...register('sharesToSell', { valueAsNumber: true })}
                  disabled={!selectedInvestment}
                />
                {errors.sharesToSell && (
                  <p className="text-sm text-red-500">{errors.sharesToSell.message}</p>
                )}
                {selectedInvestment && sharesToSell > selectedInvestment.shares && (
                  <p className="text-sm text-red-500">
                    Cannot sell more than {formatNumber(selectedInvestment.shares)} shares
                  </p>
                )}
              </div>

              {/* Sale Price */}
              <div className="space-y-2">
                <Label htmlFor="salePrice">
                  Sale Price per Share ($) <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-muted-foreground">$</span>
                  <Input
                    id="salePrice"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="pl-7"
                    {...register('salePrice', { valueAsNumber: true })}
                    disabled={!selectedInvestment}
                  />
                </div>
                {errors.salePrice && (
                  <p className="text-sm text-red-500">{errors.salePrice.message}</p>
                )}
                {selectedInvestment && salePrice && sharesToSell && (
                  <p className="text-sm text-muted-foreground">
                    Total proceeds: ${formatNumber(salePrice * sharesToSell)}
                  </p>
                )}
              </div>

              {/* Sale Date */}
              <div className="space-y-2">
                <Label htmlFor="saleDate">
                  Sale Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="saleDate"
                  type="date"
                  {...register('saleDate')}
                  disabled={!selectedInvestment}
                />
                {errors.saleDate && (
                  <p className="text-sm text-red-500">{errors.saleDate.message}</p>
                )}
              </div>

              {/* Error Display */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Buttons */}
              <div className="flex space-x-3">
                <Button
                  type="submit"
                  disabled={isCalculating || !selectedInvestment}
                  className="flex-1"
                >
                  <Calculator className="h-4 w-4 mr-2" />
                  {isCalculating ? 'Calculating...' : 'Calculate'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                  disabled={isCalculating}
                >
                  Reset
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="space-y-6">
          {result ? (
            <>
              {/* Capital Gain/Loss Card */}
              <Card className={cn('border-2', result.capitalGain >= 0 ? 'border-green-600' : 'border-red-600')}>
                <CardHeader className={cn(result.capitalGain >= 0 ? 'bg-green-50' : 'bg-red-50')}>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center">
                      {result.capitalGain >= 0 ? (
                        <TrendingUp className="h-6 w-6 mr-2 text-green-600" />
                      ) : (
                        <TrendingDown className="h-6 w-6 mr-2 text-red-600" />
                      )}
                      {result.capitalGain >= 0 ? 'Capital Gain' : 'Capital Loss'}
                    </span>
                    <span className={cn('text-3xl', result.capitalGain >= 0 ? 'text-green-600' : 'text-red-600')}>
                      ${formatNumber(Math.abs(result.capitalGain))}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sale Proceeds:</span>
                    <span className="font-semibold">${formatNumber(result.saleProceeds)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cost Basis:</span>
                    <span className="font-semibold">${formatNumber(result.costBasis)}</span>
                  </div>
                  <div className="flex justify-between pt-3 border-t-2 border-dashed">
                    <span className="font-semibold">{result.capitalGain >= 0 ? 'Gain' : 'Loss'}:</span>
                    <span className={cn('font-bold text-lg', result.capitalGain >= 0 ? 'text-green-600' : 'text-red-600')}>
                      ${formatNumber(Math.abs(result.capitalGain))}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Holding Period Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="h-5 w-5 mr-2" />
                    Holding Period
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Days Held</span>
                      <span className="text-2xl font-bold text-blue-600">{result.holdingPeriod}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Classification</span>
                      <span className={cn('font-semibold', result.isLongTerm ? 'text-green-600' : 'text-orange-600')}>
                        {result.isLongTerm ? 'Long-Term' : 'Short-Term'}
                      </span>
                    </div>
                  </div>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      {result.isLongTerm ? (
                        <>
                          <strong>Long-term gain:</strong> Held for more than 1 year (365 days).
                          Qualifies for preferential 15% tax rate.
                        </>
                      ) : (
                        <>
                          <strong>Short-term gain:</strong> Held for 1 year or less.
                          Taxed at ordinary income rate (up to 24%).
                        </>
                      )}
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              {/* Tax Estimate Card */}
              {result.capitalGain > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <DollarSign className="h-5 w-5 mr-2" />
                      Tax Estimate
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 rounded-lg bg-orange-50 border border-orange-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Tax Rate</span>
                        <span className="text-2xl font-bold text-orange-600">
                          {(result.taxRate * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Estimated Tax</span>
                        <span className="font-bold text-lg text-orange-700">
                          ${formatNumber(result.estimatedTax)}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between p-3 rounded-lg bg-gray-100">
                      <span className="font-semibold">Net Proceeds (After Tax)</span>
                      <span className="font-bold text-green-600">
                        ${formatNumber(result.saleProceeds - result.estimatedTax)}
                      </span>
                    </div>

                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        This is an estimate based on {result.isLongTerm ? 'long-term' : 'short-term'} capital
                        gains tax rate. Actual tax may vary based on your total income and filing status.
                        Consult a tax professional for accurate calculations.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Calculator className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-semibold mb-2">Ready to Calculate</p>
                <p className="text-sm text-muted-foreground">
                  Select an investment and enter sale details to calculate capital gains
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Tax Strategies */}
      <Alert className="mt-6">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Tax Strategies:</strong>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
            <li>
              <strong>Hold for 1 year+:</strong> Long-term gains are taxed at 15% vs 24% for short-term
            </li>
            <li>
              <strong>Tax-loss harvesting:</strong> Sell losing positions to offset capital gains
            </li>
            <li>
              <strong>Timing matters:</strong> Consider holding until you cross the 365-day threshold
            </li>
            <li>
              <strong>FIFO method:</strong> First-In, First-Out - shares purchased earliest are sold first
            </li>
            <li>
              <strong>Consult a professional:</strong> Tax laws are complex; seek personalized advice
            </li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}
