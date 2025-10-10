import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import {
  Download,
  FileText,
  FileSpreadsheet,
  File,
  Image,
  Calendar,
  Settings,
  CheckCircle,
  AlertCircle,
  Info,
  RefreshCw
} from 'lucide-react'
import { useExportPortfolioData } from '@/hooks/use-portfolio'
import { downloadFile } from '@/lib/portfolio-utils'

interface ExportReportsProps {
  portfolioId: string
  portfolioName?: string
}

type ExportFormat = 'pdf' | 'csv' | 'xlsx' | 'json'
type ReportType = 'summary' | 'detailed' | 'performance' | 'tax' | 'analytics'

interface ExportOptions {
  format: ExportFormat
  reportType: ReportType
  includeCharts: boolean
  includeTransactions: boolean
  dateRange: {
    start: string
    end: string
  }
  sections: {
    overview: boolean
    investments: boolean
    performance: boolean
    analytics: boolean
    risk: boolean
    tax: boolean
  }
}

function ExportPreview({ options }: { options: ExportOptions }) {
  const getFormatIcon = (format: ExportFormat) => {
    switch (format) {
      case 'pdf': return <FileText className="h-4 w-4" />
      case 'csv': return <FileSpreadsheet className="h-4 w-4" />
      case 'xlsx': return <FileSpreadsheet className="h-4 w-4" />
      case 'json': return <File className="h-4 w-4" />
      default: return <File className="h-4 w-4" />
    }
  }

  const getFormatName = (format: ExportFormat) => {
    switch (format) {
      case 'pdf': return 'PDF Report'
      case 'csv': return 'CSV Data'
      case 'xlsx': return 'Excel Workbook'
      case 'json': return 'JSON Data'
      default: return 'Export File'
    }
  }

  const selectedSections = Object.entries(options.sections)
    .filter(([_, selected]) => selected)
    .map(([section, _]) => section)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Export Preview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          {getFormatIcon(options.format)}
          <div>
            <div className="font-medium">{getFormatName(options.format)}</div>
            <div className="text-sm text-muted-foreground">
              {options.reportType} report • {selectedSections.length} sections included
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-medium">Included Sections:</div>
          <div className="flex flex-wrap gap-2">
            {selectedSections.map(section => (
              <span key={section} className="px-2 py-1 bg-primary/10 text-primary text-xs rounded">
                {section.charAt(0).toUpperCase() + section.slice(1)}
              </span>
            ))}
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          Date Range: {options.dateRange.start} to {options.dateRange.end}
        </div>
      </CardContent>
    </Card>
  )
}

function ExportConfiguration({
  options,
  onOptionsChange
}: {
  options: ExportOptions
  onOptionsChange: (options: ExportOptions) => void
}) {
  const updateSection = (section: keyof ExportOptions['sections'], value: boolean) => {
    onOptionsChange({
      ...options,
      sections: {
        ...options.sections,
        [section]: value
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Export Configuration
        </CardTitle>
        <CardDescription>
          Customize what data to include in your export
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label className="text-base font-medium">Report Type</Label>
            <RadioGroup
              value={options.reportType}
              onValueChange={(value: ReportType) => onOptionsChange({ ...options, reportType: value })}
              className="mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="summary" id="summary" />
                <Label htmlFor="summary">Summary Report</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="detailed" id="detailed" />
                <Label htmlFor="detailed">Detailed Report</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="performance" id="performance" />
                <Label htmlFor="performance">Performance Report</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="tax" id="tax" />
                <Label htmlFor="tax">Tax Report</Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label className="text-base font-medium">Export Format</Label>
            <RadioGroup
              value={options.format}
              onValueChange={(value: ExportFormat) => onOptionsChange({ ...options, format: value })}
              className="mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pdf" id="pdf" />
                <Label htmlFor="pdf">PDF (Formatted Report)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="xlsx" id="xlsx" />
                <Label htmlFor="xlsx">Excel (Data & Charts)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="csv" />
                <Label htmlFor="csv">CSV (Raw Data)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="json" id="json" />
                <Label htmlFor="json">JSON (API Format)</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Label className="text-base font-medium">Include Sections</Label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="overview"
                  checked={options.sections.overview}
                  onCheckedChange={(checked) => updateSection('overview', !!checked)}
                />
                <Label htmlFor="overview">Portfolio Overview</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="investments"
                  checked={options.sections.investments}
                  onCheckedChange={(checked) => updateSection('investments', !!checked)}
                />
                <Label htmlFor="investments">Investment Details</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="performance"
                  checked={options.sections.performance}
                  onCheckedChange={(checked) => updateSection('performance', !!checked)}
                />
                <Label htmlFor="performance">Performance Data</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="analytics"
                  checked={options.sections.analytics}
                  onCheckedChange={(checked) => updateSection('analytics', !!checked)}
                />
                <Label htmlFor="analytics">Analytics & Insights</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="risk"
                  checked={options.sections.risk}
                  onCheckedChange={(checked) => updateSection('risk', !!checked)}
                />
                <Label htmlFor="risk">Risk Analysis</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="tax"
                  checked={options.sections.tax}
                  onCheckedChange={(checked) => updateSection('tax', !!checked)}
                />
                <Label htmlFor="tax">Tax Information</Label>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-base font-medium">Additional Options</Label>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeCharts"
                checked={options.includeCharts}
                onCheckedChange={(checked) => onOptionsChange({ ...options, includeCharts: !!checked })}
              />
              <Label htmlFor="includeCharts">Include Charts & Visualizations</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeTransactions"
                checked={options.includeTransactions}
                onCheckedChange={(checked) => onOptionsChange({ ...options, includeTransactions: !!checked })}
              />
              <Label htmlFor="includeTransactions">Include Transaction History</Label>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function ExportReports({ portfolioId, portfolioName }: ExportReportsProps) {
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'pdf',
    reportType: 'summary',
    includeCharts: true,
    includeTransactions: false,
    dateRange: {
      start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    },
    sections: {
      overview: true,
      investments: true,
      performance: true,
      analytics: false,
      risk: false,
      tax: false
    }
  })

  const [isExporting, setIsExporting] = useState(false)
  const [exportProgress, setExportProgress] = useState(0)

  const exportMutation = useExportPortfolioData()

  const handleExport = async () => {
    setIsExporting(true)
    setExportProgress(0)

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setExportProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 10
        })
      }, 200)

      const response = await exportMutation.mutateAsync({
        portfolioId,
        format: exportOptions.format
      })

      clearInterval(progressInterval)
      setExportProgress(100)

      // Handle file download
      if (response.data) {
        downloadFile(response.data, `${portfolioName || 'portfolio'}-report.${exportOptions.format}`)
      }

      setTimeout(() => {
        setIsExporting(false)
        setExportProgress(0)
      }, 1000)

    } catch (error) {
      console.error('Export failed:', error)
      setIsExporting(false)
      setExportProgress(0)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Portfolio Reports
          </CardTitle>
          <CardDescription>
            Generate and download comprehensive portfolio reports in various formats
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExportConfiguration
          options={exportOptions}
          onOptionsChange={setExportOptions}
        />

        <ExportPreview options={exportOptions} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Export Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isExporting ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                <span>Generating your report...</span>
              </div>
              <Progress value={exportProgress} className="w-full" />
              <p className="text-sm text-muted-foreground">
                This may take a few moments depending on the report size and complexity.
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>Ready to export</span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Large reports may take several minutes to generate. You'll receive a notification when ready.
              </AlertDescription>
            </Alert>

            <Button
              onClick={handleExport}
              disabled={isExporting}
              size="lg"
            >
              {isExporting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export Report
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}