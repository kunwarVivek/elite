import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import {
  FileText,
  Download,
  Calculator,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  Info,
  Receipt
} from 'lucide-react'
import { useTaxDocuments, useGenerateTaxReport } from '@/hooks/use-portfolio'
import { TaxDocument, TaxDocumentType } from '@/types/portfolio'
import { formatCurrency, formatDate } from '@/lib/portfolio-utils'

interface TaxReportingProps {
  portfolioId: string
}

interface TaxSummary {
  totalInvested: number
  totalCurrentValue: number
  totalGainLoss: number
  shortTermGains: number
  longTermGains: number
  qualifiedDividends: number
  estimatedTaxLiability: number
}

function TaxSummaryCard({ summary }: { summary: TaxSummary }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="text-sm text-muted-foreground mb-1">Total Invested</div>
            <div className="text-xl font-bold">{formatCurrency(summary.totalInvested)}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="text-sm text-muted-foreground mb-1">Current Value</div>
            <div className="text-xl font-bold">{formatCurrency(summary.totalCurrentValue)}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="text-sm text-muted-foreground mb-1">Total Gain/Loss</div>
            <div className={`text-xl font-bold ${summary.totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(summary.totalGainLoss)}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="text-sm text-muted-foreground mb-1">Est. Tax Liability</div>
            <div className="text-xl font-bold text-orange-600">
              {formatCurrency(summary.estimatedTaxLiability)}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function CapitalGainsTable({ documents }: { documents: TaxDocument[] }) {
  // Mock data for demonstration
  const gainsData = [
    {
      investment: 'TechCorp Inc',
      acquisitionDate: '2023-03-15',
      saleDate: '2024-08-20',
      costBasis: 25000,
      salePrice: 35000,
      gainLoss: 10000,
      holdingPeriod: 'Long-term',
      taxRate: 0.20
    },
    {
      investment: 'HealthTech Ltd',
      acquisitionDate: '2024-01-10',
      saleDate: '2024-06-15',
      costBasis: 15000,
      salePrice: 12000,
      gainLoss: -3000,
      holdingPeriod: 'Short-term',
      taxRate: 0.35
    }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Capital Gains/Losses
        </CardTitle>
        <CardDescription>
          Detailed breakdown of taxable events
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Investment</TableHead>
                <TableHead>Acquisition</TableHead>
                <TableHead>Sale Date</TableHead>
                <TableHead className="text-right">Cost Basis</TableHead>
                <TableHead className="text-right">Sale Price</TableHead>
                <TableHead className="text-right">Gain/Loss</TableHead>
                <TableHead>Tax Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gainsData.map((gain, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{gain.investment}</TableCell>
                  <TableCell>{formatDate(gain.acquisitionDate)}</TableCell>
                  <TableCell>{formatDate(gain.saleDate)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(gain.costBasis)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(gain.salePrice)}</TableCell>
                  <TableCell className={`text-right ${gain.gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(gain.gainLoss)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={gain.holdingPeriod === 'Long-term' ? 'default' : 'secondary'}>
                      {formatPercentage(gain.taxRate)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

function TaxDocumentGenerator({
  portfolioId,
  onDocumentGenerated
}: {
  portfolioId: string
  onDocumentGenerated: () => void
}) {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [documentType, setDocumentType] = useState<TaxDocumentType>(TaxDocumentType.SCHEDULE_K1)

  const generateMutation = useGenerateTaxReport()

  const handleGenerate = async () => {
    try {
      await generateMutation.mutateAsync({
        portfolioId,
        taxYear: selectedYear,
        documentType: documentType
      })
      onDocumentGenerated()
    } catch (error) {
      console.error('Failed to generate tax document:', error)
    }
  }

  const availableYears = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Generate Tax Documents
        </CardTitle>
        <CardDescription>
          Create official tax documents for your investments
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Tax Year</Label>
            <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map(year => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Document Type</Label>
            <Select value={documentType} onValueChange={(value: TaxDocumentType) => setDocumentType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={TaxDocumentType.SCHEDULE_K1}>Schedule K-1</SelectItem>
                <SelectItem value={TaxDocumentType.FORM_1099}>Form 1099</SelectItem>
                <SelectItem value={TaxDocumentType.CAPITAL_GAINS_LOSSES}>Capital Gains/Losses</SelectItem>
                <SelectItem value={TaxDocumentType.ANNUAL_SUMMARY}>Annual Summary</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Tax documents are generated based on your investment activity and may take a few minutes to process.
            You'll be notified when the document is ready for download.
          </AlertDescription>
        </Alert>

        <Button
          onClick={handleGenerate}
          disabled={generateMutation.isPending}
          className="w-full"
        >
          {generateMutation.isPending ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Generating Document...
            </>
          ) : (
            <>
              <Calculator className="h-4 w-4 mr-2" />
              Generate Tax Document
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

function TaxDocumentsList({ portfolioId }: { portfolioId: string }) {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())

  const { data: documentsResponse, isLoading, error, refetch } = useTaxDocuments(portfolioId, selectedYear)

  const documents = documentsResponse?.data || []

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="text-center text-muted-foreground">
            <AlertCircle className="h-6 w-6 mx-auto mb-2" />
            <p>Unable to load tax documents</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Tax Documents
            </CardTitle>
            <CardDescription>
              Your generated tax documents and reports
            </CardDescription>
          </div>

          <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 border rounded">
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                </div>
                <div className="h-8 w-20 bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No tax documents for {selectedYear}</p>
            <p className="text-sm">Generate your first tax document to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((document) => (
              <div key={document.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">
                      {document.document_type.replace(/_/g, ' ')} - {document.tax_year}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Generated {formatDate(document.generated_at)}
                      {document.expires_at && ` • Expires ${formatDate(document.expires_at)}`}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <a href={document.file_url} target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </a>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function TaxReporting({ portfolioId }: TaxReportingProps) {
  const [activeTab, setActiveTab] = useState('summary')

  // Mock tax summary data
  const mockTaxSummary: TaxSummary = {
    totalInvested: 150000,
    totalCurrentValue: 185000,
    totalGainLoss: 35000,
    shortTermGains: 8000,
    longTermGains: 27000,
    qualifiedDividends: 1200,
    estimatedTaxLiability: 6800
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Tax Reporting & Compliance
          </CardTitle>
          <CardDescription>
            Manage your investment tax obligations and generate required documents
          </CardDescription>
        </CardHeader>
      </Card>

      <TaxSummaryCard summary={mockTaxSummary} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TaxDocumentsList portfolioId={portfolioId} />
        <TaxDocumentGenerator
          portfolioId={portfolioId}
          onDocumentGenerated={() => {
            // Refresh documents list
          }}
        />
      </div>

      <CapitalGainsTable documents={[]} />

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Important:</strong> This tool provides estimates for informational purposes only.
          Please consult with a qualified tax professional for accurate tax advice and filing requirements.
          Tax laws and regulations may vary by jurisdiction and are subject to change.
        </AlertDescription>
      </Alert>
    </div>
  )
}