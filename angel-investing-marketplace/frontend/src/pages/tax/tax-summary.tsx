import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Alert, AlertDescription } from '../../components/ui/alert';
import {
  ArrowLeft,
  Download,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  FileText,
  Info,
  Printer
} from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';

/**
 * Tax Summary View
 * Detailed breakdown of tax information for a specific year
 */

interface TaxSummary {
  taxYear: number;
  totalIncome: number;
  totalCapitalGains: number;
  shortTermGains: number;
  longTermGains: number;
  qualifiedDividends: number;
  ordinaryDividends: number;
  partnershipIncome: number;
  estimatedTaxLiability: number;
  investments: Array<{
    id: string;
    companyName: string;
    shares: number;
    costBasis: number;
    currentValue: number;
    unrealizedGainLoss: number;
  }>;
  transactions: Array<{
    id: string;
    date: string;
    type: string;
    description: string;
    amount: number;
    taxCategory: string;
  }>;
}

export function TaxSummaryPage() {
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const taxYear = params.taxYear ? parseInt(params.taxYear as string) : new Date().getFullYear() - 1;

  const [summary, setSummary] = useState<TaxSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    fetchTaxSummary();
  }, [taxYear]);

  const fetchTaxSummary = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:3001/api/tax/summary/${taxYear}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tax summary');
      }

      const result = await response.json();
      setSummary(result.data);
    } catch (err: any) {
      console.error('Error fetching tax summary:', err);
      setError(err.message || 'Failed to load tax summary');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    setIsDownloading(true);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:3001/api/tax/download/summary/${taxYear}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download tax summary');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tax_summary_${taxYear}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('Download error:', err);
      alert(err.message || 'Failed to download PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="container max-w-7xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading tax summary...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-7xl mx-auto py-8 px-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={fetchTaxSummary} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="container max-w-7xl mx-auto py-8 px-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>No tax data available for {taxYear}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const totalGains = summary.shortTermGains + summary.longTermGains;
  const totalDividends = summary.qualifiedDividends + summary.ordinaryDividends;

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8 print:mb-4">
        <Button
          variant="ghost"
          onClick={() => navigate({ to: '/tax/tax-center' })}
          className="mb-4 print:hidden"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tax Center
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Tax Summary {taxYear}</h1>
            <p className="text-muted-foreground">Comprehensive tax overview and calculations</p>
          </div>
          <div className="flex space-x-3 print:hidden">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button onClick={handleDownloadPDF} disabled={isDownloading}>
              <Download className="h-4 w-4 mr-2" />
              {isDownloading ? 'Downloading...' : 'Download PDF'}
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Income</CardDescription>
            <CardTitle className="text-2xl text-green-600">
              ${formatNumber(summary.totalIncome)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Dividends & Distributions
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Capital Gains</CardDescription>
            <CardTitle className={cn('text-2xl', totalGains >= 0 ? 'text-blue-600' : 'text-red-600')}>
              ${formatNumber(Math.abs(totalGains))}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {totalGains >= 0 ? 'Gains' : 'Losses'}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Partnership Income</CardDescription>
            <CardTitle className="text-2xl text-purple-600">
              ${formatNumber(summary.partnershipIncome)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Schedule K-1
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Est. Tax Liability</CardDescription>
            <CardTitle className="text-2xl text-orange-600">
              ${formatNumber(summary.estimatedTaxLiability)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Approximate
          </CardContent>
        </Card>
      </div>

      {/* Detailed Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Capital Gains Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Capital Gains Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-200">
              <div>
                <p className="text-sm font-medium">Short-Term Gains</p>
                <p className="text-xs text-muted-foreground">Held ≤ 1 year (24% rate)</p>
              </div>
              <p className={cn('text-xl font-bold', summary.shortTermGains >= 0 ? 'text-blue-600' : 'text-red-600')}>
                ${formatNumber(Math.abs(summary.shortTermGains))}
              </p>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
              <div>
                <p className="text-sm font-medium">Long-Term Gains</p>
                <p className="text-xs text-muted-foreground">Held &gt; 1 year (15% rate)</p>
              </div>
              <p className={cn('text-xl font-bold', summary.longTermGains >= 0 ? 'text-green-600' : 'text-red-600')}>
                ${formatNumber(Math.abs(summary.longTermGains))}
              </p>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-100 border-2 border-gray-300">
              <p className="font-semibold">Total Capital Gains</p>
              <p className={cn('text-xl font-bold', totalGains >= 0 ? 'text-blue-600' : 'text-red-600')}>
                ${formatNumber(Math.abs(totalGains))}
              </p>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Short-term gains are taxed at your ordinary income rate (up to 24%).
                Long-term gains benefit from preferential 15% rate.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Dividend Income Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="h-5 w-5 mr-2" />
              Dividend Income Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
              <div>
                <p className="text-sm font-medium">Qualified Dividends</p>
                <p className="text-xs text-muted-foreground">Held 60+ days (15% rate)</p>
              </div>
              <p className="text-xl font-bold text-green-600">
                ${formatNumber(summary.qualifiedDividends)}
              </p>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-50 border border-yellow-200">
              <div>
                <p className="text-sm font-medium">Ordinary Dividends</p>
                <p className="text-xs text-muted-foreground">Ordinary income rate</p>
              </div>
              <p className="text-xl font-bold text-yellow-700">
                ${formatNumber(summary.ordinaryDividends)}
              </p>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-100 border-2 border-gray-300">
              <p className="font-semibold">Total Dividends</p>
              <p className="text-xl font-bold text-green-600">
                ${formatNumber(totalDividends)}
              </p>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Qualified dividends receive preferential 15% tax rate. Holding requirement: 60 days
                during 121-day period around ex-dividend date.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>

      {/* Current Holdings */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <PieChart className="h-5 w-5 mr-2" />
            Current Holdings (Unrealized Gains/Losses)
          </CardTitle>
          <CardDescription>
            Positions held as of December 31, {taxYear}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {summary.investments && summary.investments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Company</th>
                    <th className="text-right py-2">Shares</th>
                    <th className="text-right py-2">Cost Basis</th>
                    <th className="text-right py-2">Current Value</th>
                    <th className="text-right py-2">Unrealized Gain/Loss</th>
                    <th className="text-right py-2">%</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.investments.map((investment) => {
                    const gainLossPercent = investment.costBasis > 0
                      ? ((investment.unrealizedGainLoss / investment.costBasis) * 100)
                      : 0;

                    return (
                      <tr key={investment.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 font-medium">{investment.companyName}</td>
                        <td className="text-right">{formatNumber(investment.shares)}</td>
                        <td className="text-right">${formatNumber(investment.costBasis)}</td>
                        <td className="text-right">${formatNumber(investment.currentValue)}</td>
                        <td className={cn('text-right font-semibold', investment.unrealizedGainLoss >= 0 ? 'text-green-600' : 'text-red-600')}>
                          ${formatNumber(Math.abs(investment.unrealizedGainLoss))}
                          {investment.unrealizedGainLoss >= 0 ? (
                            <TrendingUp className="inline-block ml-1 h-3 w-3" />
                          ) : (
                            <TrendingDown className="inline-block ml-1 h-3 w-3" />
                          )}
                        </td>
                        <td className={cn('text-right font-semibold', gainLossPercent >= 0 ? 'text-green-600' : 'text-red-600')}>
                          {gainLossPercent >= 0 ? '+' : ''}{gainLossPercent.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No holdings data available</p>
          )}
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Transaction History
          </CardTitle>
          <CardDescription>
            All taxable events during {taxYear}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {summary.transactions && summary.transactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Date</th>
                    <th className="text-left py-2">Type</th>
                    <th className="text-left py-2">Description</th>
                    <th className="text-left py-2">Tax Category</th>
                    <th className="text-right py-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.transactions.map((transaction) => (
                    <tr key={transaction.id} className="border-b hover:bg-muted/50">
                      <td className="py-3">{new Date(transaction.date).toLocaleDateString()}</td>
                      <td>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {transaction.type}
                        </span>
                      </td>
                      <td>{transaction.description}</td>
                      <td className="text-muted-foreground">{transaction.taxCategory}</td>
                      <td className="text-right font-semibold">${formatNumber(transaction.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No transactions for this year</p>
          )}
        </CardContent>
      </Card>

      {/* Tax Planning Tips */}
      <Alert className="print:hidden">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Tax Planning Tips:</strong>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
            <li>Hold investments for more than 1 year to qualify for long-term capital gains rate (15% vs 24%)</li>
            <li>Consider tax-loss harvesting to offset capital gains</li>
            <li>Qualified dividends require 60-day holding period</li>
            <li>Partnership income (K-1) may have special deductions available</li>
            <li>Consult with a tax professional for personalized advice</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* Disclaimer */}
      <Alert className="mt-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          <strong>Disclaimer:</strong> This summary is provided for informational purposes only and should not be
          considered tax advice. Tax calculations are estimates based on general rates and may not reflect your actual
          tax liability. Please consult with a qualified tax professional for filing assistance. Rates shown are
          approximate and may vary based on your total income and filing status.
        </AlertDescription>
      </Alert>
    </div>
  );
}
