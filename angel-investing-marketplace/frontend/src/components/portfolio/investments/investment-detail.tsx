import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Building,
  Users,
  ExternalLink,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  Target,
  BarChart3,
  Globe,
  Mail,
  Phone
} from 'lucide-react'
import { useInvestment, useInvestmentPerformance } from '@/hooks/use-portfolio'
import { Investment } from '@/types/portfolio'
import { formatCurrency, formatPercentage, formatDate, getStatusColor, getStageColor, getPerformanceColor } from '@/lib/portfolio-utils'

interface InvestmentDetailProps {
  investmentId: string
  onClose?: () => void
}

function InvestmentHeader({ investment }: { investment: Investment }) {
  const performance = investment.performance
  const isPositive = (performance?.total_return || 0) >= 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{investment.pitch?.startup?.name}</h2>
          <p className="text-muted-foreground">{investment.pitch?.title}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor(investment.status)}>
            {investment.status.replace(/_/g, ' ')}
          </Badge>
          <Badge variant="outline" className={getStageColor(investment.pitch?.startup?.stage || 'IDEA')}>
            {investment.pitch?.startup?.stage}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-4 bg-muted/50 rounded-lg">
          <div className="text-sm text-muted-foreground">Invested Amount</div>
          <div className="text-xl font-bold">{formatCurrency(investment.amount)}</div>
        </div>

        <div className="text-center p-4 bg-muted/50 rounded-lg">
          <div className="text-sm text-muted-foreground">Equity Stake</div>
          <div className="text-xl font-bold">{formatPercentage(investment.equity_percentage || 0)}</div>
        </div>

        <div className="text-center p-4 bg-muted/50 rounded-lg">
          <div className="text-sm text-muted-foreground">Current Value</div>
          <div className="text-xl font-bold">{formatCurrency(performance?.current_value || 0)}</div>
        </div>

        <div className="text-center p-4 bg-muted/50 rounded-lg">
          <div className="text-sm text-muted-foreground">Total Return</div>
          <div className={`text-xl font-bold ${getPerformanceColor(performance?.total_return || 0)}`}>
            {formatCurrency(performance?.total_return || 0)}
          </div>
        </div>
      </div>
    </div>
  )
}

function CompanyInfo({ investment }: { investment: Investment }) {
  const startup = investment.pitch?.startup

  if (!startup) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="h-5 w-5" />
          Company Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-medium text-muted-foreground">Industry</div>
            <div>{startup.industry || 'Not specified'}</div>
          </div>

          <div>
            <div className="text-sm font-medium text-muted-foreground">Founded</div>
            <div>{startup.founded_date ? formatDate(startup.founded_date) : 'Not specified'}</div>
          </div>

          <div>
            <div className="text-sm font-medium text-muted-foreground">Team Size</div>
            <div>{startup.team_size || 'Not specified'} employees</div>
          </div>

          <div>
            <div className="text-sm font-medium text-muted-foreground">Website</div>
            <div className="flex items-center gap-2">
              {startup.website_url ? (
                <a
                  href={startup.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1"
                >
                  Visit Website <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                'Not available'
              )}
            </div>
          </div>
        </div>

        {startup.description && (
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-2">Description</div>
            <p className="text-sm">{startup.description}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function InvestmentTerms({ investment }: { investment: Investment }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Investment Terms
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm font-medium text-muted-foreground">Investment Date</div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {formatDate(investment.investment_date || investment.created_at)}
            </div>
          </div>

          <div>
            <div className="text-sm font-medium text-muted-foreground">Investment Type</div>
            <div className="capitalize">{investment.investment_type.replace(/_/g, ' ').toLowerCase()}</div>
          </div>

          {investment.share_price && (
            <div>
              <div className="text-sm font-medium text-muted-foreground">Share Price</div>
              <div>{formatCurrency(investment.share_price)}</div>
            </div>
          )}

          {investment.payment_method && (
            <div>
              <div className="text-sm font-medium text-muted-foreground">Payment Method</div>
              <div className="capitalize">{investment.payment_method.replace(/_/g, ' ')}</div>
            </div>
          )}
        </div>

        {investment.terms && (
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-2">Additional Terms</div>
            <div className="text-sm bg-muted/50 p-3 rounded">
              <pre className="whitespace-pre-wrap">{JSON.stringify(investment.terms, null, 2)}</pre>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function PerformanceMetrics({ investment }: { investment: Investment }) {
  const performance = investment.performance

  if (!performance) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Performance Metrics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="text-center p-4 border rounded-lg">
            <div className="text-sm text-muted-foreground">Unrealized P&L</div>
            <div className={`text-2xl font-bold ${getPerformanceColor(performance.unrealized_gain_loss)}`}>
              {formatCurrency(performance.unrealized_gain_loss)}
            </div>
            <div className={`text-sm ${getPerformanceColor(performance.unrealized_gain_loss_percentage)}`}>
              {formatPercentage(performance.unrealized_gain_loss_percentage)}
            </div>
          </div>

          <div className="text-center p-4 border rounded-lg">
            <div className="text-sm text-muted-foreground">Realized P&L</div>
            <div className={`text-2xl font-bold ${getPerformanceColor(performance.realized_gain_loss)}`}>
              {formatCurrency(performance.realized_gain_loss)}
            </div>
            <div className={`text-sm ${getPerformanceColor(performance.realized_gain_loss_percentage)}`}>
              {formatPercentage(performance.realized_gain_loss_percentage)}
            </div>
          </div>

          <div className="text-center p-4 border rounded-lg">
            <div className="text-sm text-muted-foreground">Multiple</div>
            <div className={`text-2xl font-bold ${getPerformanceColor(performance.multiple - 1)}`}>
              {performance.multiple.toFixed(2)}x
            </div>
          </div>

          {performance.irr && (
            <div className="text-center p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground">IRR</div>
              <div className={`text-2xl font-bold ${getPerformanceColor(performance.irr)}`}>
                {formatPercentage(performance.irr)}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function FounderContact({ investment }: { investment: Investment }) {
  // This would typically come from the startup/founder data
  const founder = investment.pitch?.startup?.founder_id

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Founder Contact
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Founder contact information will be available after investment completion</p>
        </div>
      </CardContent>
    </Card>
  )
}

export function InvestmentDetail({ investmentId, onClose }: InvestmentDetailProps) {
  const { data: investment, isLoading, error } = useInvestment(investmentId)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="space-y-2">
              <div className="h-8 w-64 bg-muted animate-pulse rounded" />
              <div className="h-4 w-96 bg-muted animate-pulse rounded" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 bg-muted animate-pulse rounded" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !investment) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <div className="text-center text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>Unable to load investment details</p>
            {onClose && (
              <Button variant="outline" size="sm" onClick={onClose} className="mt-2">
                Close
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Investment Details</h1>
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        )}
      </div>

      <InvestmentHeader investment={investment} />

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <InvestmentTerms investment={investment} />
          <FounderContact investment={investment} />
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <PerformanceMetrics investment={investment} />
        </TabsContent>

        <TabsContent value="company" className="space-y-6">
          <CompanyInfo investment={investment} />
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Investment Documents</CardTitle>
              <CardDescription>
                Legal documents and agreements related to this investment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Documents will be available after investment completion</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}