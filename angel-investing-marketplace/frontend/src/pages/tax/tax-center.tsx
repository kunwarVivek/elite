import React, { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Alert, AlertDescription } from '../../components/ui/alert';
import {
  Download,
  FileText,
  Calendar,
  RefreshCw,
  AlertCircle,
  Info,
  TrendingUp,
  DollarSign,
  Archive,
  CheckCircle
} from 'lucide-react';
import { cn, formatNumber, formatDate } from '@/lib/utils';

/**
 * Tax Center Dashboard
 * Central hub for tax documents and information
 */

interface TaxYear {
  year: number;
  hasInvestments: boolean;
  totalIncome: number;
  totalCapitalGains: number;
  documentsAvailable: boolean;
}

interface TaxDocument {
  type: 'K1' | '1099_DIV' | '1099_B' | 'FORM_8949' | 'SUMMARY';
  year: number;
  available: boolean;
  generatedAt?: string;
}

const DOCUMENT_INFO = {
  K1: {
    name: 'Schedule K-1',
    description: 'Partnership Income (for syndicate investments)',
    icon: FileText,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  '1099_DIV': {
    name: 'Form 1099-DIV',
    description: 'Dividend and Distribution Income',
    icon: DollarSign,
    color: 'text-green-600',
    bg: 'bg-green-50',
  },
  '1099_B': {
    name: 'Form 1099-B',
    description: 'Proceeds from Broker Transactions',
    icon: TrendingUp,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
  FORM_8949: {
    name: 'Form 8949',
    description: 'Sales and Dispositions of Capital Assets',
    icon: FileText,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
  },
  SUMMARY: {
    name: 'Tax Summary',
    description: 'Comprehensive tax overview and calculations',
    icon: FileText,
    color: 'text-gray-600',
    bg: 'bg-gray-50',
  },
};

export function TaxCenterPage() {
  const navigate = useNavigate();
  const [availableYears, setAvailableYears] = useState<TaxYear[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingDoc, setDownloadingDoc] = useState<string | null>(null);

  useEffect(() => {
    fetchAvailableYears();
  }, []);

  const fetchAvailableYears = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:3001/api/tax/years', {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tax years');
      }

      const result = await response.json();
      const years = result.data.years || [];

      setAvailableYears(years);

      // Auto-select most recent year
      if (years.length > 0) {
        setSelectedYear(years[0].year);
      }
    } catch (err: any) {
      console.error('Error fetching tax years:', err);
      setError(err.message || 'Failed to load tax information');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadDocument = async (docType: string, year: number) => {
    setDownloadingDoc(`${docType}-${year}`);

    try {
      const token = localStorage.getItem('auth_token');
      const endpoints: Record<string, string> = {
        K1: `/api/tax/download/k1/${year}`,
        '1099_DIV': `/api/tax/download/1099-div/${year}`,
        '1099_B': `/api/tax/download/1099-b/${year}`,
        FORM_8949: `/api/tax/download/form8949/${year}`,
        SUMMARY: `/api/tax/download/summary/${year}`,
      };

      const response = await fetch(`http://localhost:3001${endpoints[docType]}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download document');
      }

      // Download the PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${docType}_${year}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('Download error:', err);
      alert(err.message || 'Failed to download document');
    } finally {
      setDownloadingDoc(null);
    }
  };

  const downloadAllDocuments = async (year: number) => {
    setDownloadingDoc(`ALL-${year}`);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:3001/api/tax/download/all/${year}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download documents');
      }

      // Download the ZIP file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tax_documents_${year}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('Download error:', err);
      alert(err.message || 'Failed to download documents');
    } finally {
      setDownloadingDoc(null);
    }
  };

  if (isLoading) {
    return (
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading tax center...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={fetchAvailableYears} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (availableYears.length === 0) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Card>
          <CardHeader>
            <CardTitle>Tax Center</CardTitle>
            <CardDescription>No tax documents available yet</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Tax documents are generated annually after the end of each tax year.
                Once you have investment activity, your documents will appear here.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedYearData = availableYears.find((y) => y.year === selectedYear);

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Tax Center</h1>
        <p className="text-muted-foreground">
          Download your tax documents and view investment tax information
        </p>
      </div>

      {/* Important Notice */}
      <Alert className="mb-6 border-blue-600 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription>
          <strong>Tax Filing Deadline:</strong> April 15, {new Date().getFullYear()}
          <br />
          <span className="text-sm">
            Tax documents are typically available by January 31st each year. Please consult with a tax professional
            for filing assistance.
          </span>
        </AlertDescription>
      </Alert>

      {/* Year Selector */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Select Tax Year
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {availableYears.map((yearData) => (
              <button
                key={yearData.year}
                onClick={() => setSelectedYear(yearData.year)}
                className={cn(
                  'px-6 py-3 rounded-lg border-2 transition-all font-semibold',
                  selectedYear === yearData.year
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-muted hover:border-primary/50'
                )}
              >
                {yearData.year}
                {yearData.documentsAvailable && (
                  <CheckCircle className="inline-block ml-2 h-4 w-4" />
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedYearData && (
        <>
          {/* Tax Summary Card */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Tax Year {selectedYear} Summary</CardTitle>
                <Button
                  variant="outline"
                  onClick={() => navigate({ to: `/tax/summary/${selectedYear}` })}
                >
                  View Detailed Summary
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                  <p className="text-sm text-muted-foreground">Total Income</p>
                  <p className="text-2xl font-bold text-green-700">
                    ${formatNumber(selectedYearData.totalIncome)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Dividends & Distributions</p>
                </div>
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                  <p className="text-sm text-muted-foreground">Capital Gains</p>
                  <p className="text-2xl font-bold text-blue-700">
                    ${formatNumber(selectedYearData.totalCapitalGains)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Short & Long-term</p>
                </div>
                <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
                  <p className="text-sm text-muted-foreground">Documents Available</p>
                  <p className="text-2xl font-bold text-purple-700">
                    {selectedYearData.documentsAvailable ? 'Yes' : 'Pending'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedYearData.documentsAvailable ? 'Ready to download' : 'Being generated'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tax Documents */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Tax Documents</h2>
              {selectedYearData.documentsAvailable && (
                <Button
                  onClick={() => downloadAllDocuments(selectedYear!)}
                  disabled={downloadingDoc === `ALL-${selectedYear}`}
                >
                  <Archive className="h-4 w-4 mr-2" />
                  {downloadingDoc === `ALL-${selectedYear}` ? 'Downloading...' : 'Download All (ZIP)'}
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(DOCUMENT_INFO).map(([type, info]) => {
                const Icon = info.icon;
                const isDownloading = downloadingDoc === `${type}-${selectedYear}`;

                return (
                  <Card key={type} className="hover:shadow-md transition-shadow">
                    <CardHeader className={info.bg}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={cn('p-2 rounded-lg', info.bg, 'border-2 border-white')}>
                            <Icon className={cn('h-5 w-5', info.color)} />
                          </div>
                          <div>
                            <CardTitle className="text-base">{info.name}</CardTitle>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground mb-4 min-h-[40px]">
                        {info.description}
                      </p>

                      {selectedYearData.documentsAvailable ? (
                        <Button
                          onClick={() => downloadDocument(type, selectedYear!)}
                          disabled={isDownloading}
                          className="w-full"
                          variant="outline"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          {isDownloading ? 'Downloading...' : 'Download PDF'}
                        </Button>
                      ) : (
                        <Button disabled className="w-full" variant="outline">
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Being Generated
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Tools */}
          <Card>
            <CardHeader>
              <CardTitle>Tax Tools</CardTitle>
              <CardDescription>Additional resources for tax planning</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-start"
                  onClick={() => navigate({ to: '/tax/cost-basis-calculator' })}
                >
                  <TrendingUp className="h-6 w-6 mb-2" />
                  <span className="font-semibold">Cost Basis Calculator</span>
                  <span className="text-xs text-muted-foreground mt-1">
                    Calculate capital gains for investment sales
                  </span>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-start"
                  onClick={() => navigate({ to: `/tax/summary/${selectedYear}` })}
                >
                  <FileText className="h-6 w-6 mb-2" />
                  <span className="font-semibold">Detailed Tax Summary</span>
                  <span className="text-xs text-muted-foreground mt-1">
                    View comprehensive breakdown of all tax items
                  </span>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-start"
                  onClick={() => window.open('https://www.irs.gov', '_blank')}
                >
                  <Info className="h-6 w-6 mb-2" />
                  <span className="font-semibold">Tax Resources</span>
                  <span className="text-xs text-muted-foreground mt-1">
                    IRS guidelines and tax filing information
                  </span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Important Information */}
          <Alert className="mt-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important Tax Information:</strong>
              <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
                <li>Tax documents are generated based on your investment activity during the calendar year</li>
                <li>Forms are typically available by January 31st of the following year</li>
                <li>Please consult with a qualified tax professional for filing assistance</li>
                <li>Keep copies of all tax documents for at least 7 years (IRS recommendation)</li>
                <li>Capital gains rates depend on holding period: short-term (24%) vs long-term (15%)</li>
              </ul>
            </AlertDescription>
          </Alert>
        </>
      )}
    </div>
  );
}
