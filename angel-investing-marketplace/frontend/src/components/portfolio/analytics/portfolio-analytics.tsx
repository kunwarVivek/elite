import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ScatterChart,
  Scatter
} from 'recharts'
import {
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
  Target,
  Calendar,
  Download,
  RefreshCw,
  AlertCircle,
  Info,
  Award,
  Activity
} from 'lucide-react'
import { usePortfolioAnalytics, useBenchmarkComparison } from '@/hooks/use-portfolio'
import { formatCurrency, formatPercentage, formatDate } from '@/lib/portfolio-utils'

interface PortfolioAnalyticsProps {
  portfolioId: string
}

type TimeRange = '1M' | '3M' | '6M' | '1Y' | '2Y' | 'ALL'
type ChartType = 'performance' | 'distribution' | 'correlation' | 'attribution'

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
]

function PerformanceAttributionChart({ data }: { data: any[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Performance Attribution
        </CardTitle>
        <CardDescription>
          Breakdown of portfolio returns by investment
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                dataKey="investment"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tickFormatter={(value) => formatCurrency(value)} />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), 'Return']}
              />
              <Bar dataKey="return" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

function SectorDistributionChart({ data }: { data: any[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChartIcon className="h-5 w-5" />
          Sector Distribution
        </CardTitle>
        <CardDescription>
          Portfolio allocation by industry sector
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ sector, percentage }) => `${sector}: ${formatPercentage(percentage)}`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

function RiskReturnScatter({ data }: { data: any[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Risk vs Return Analysis
        </CardTitle>
        <CardDescription>
          Risk-return profile of portfolio investments
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis
                type="number"
                dataKey="risk"
                name="Risk"
                tickFormatter={(value) => formatPercentage(value)}
              />
              <YAxis
                type="number"
                dataKey="return"
                name="Return"
                tickFormatter={(value) => formatPercentage(value)}
              />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                formatter={(value: number, name: string) => [
                  name === 'risk' ? formatPercentage(value) : formatPercentage(value),
                  name === 'risk' ? 'Risk' : 'Return'
                ]}
                labelFormatter={(label) => `Investment: ${label}`}
              />
              <Scatter name="Investments" dataKey="return" fill="hsl(var(--primary))" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

function BenchmarkComparisonChart({ portfolioId }: { portfolioId: string }) {
  const { data: benchmarkData, isLoading } = useBenchmarkComparison(portfolioId, 'S_P_500')

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 w-48 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    )
  }

  if (!benchmarkData) return null

  const chartData = [
    {
      name: 'Portfolio',
      return: benchmarkData.data.portfolio_period_return,
      alpha: benchmarkData.data.alpha
    },
    {
      name: 'Benchmark',
      return: benchmarkData.data.period_return,
      alpha: 0
    }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          Benchmark Comparison
        </CardTitle>
        <CardDescription>
          Compare portfolio performance against market benchmarks
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(value) => formatPercentage(value)} />
              <Tooltip formatter={(value: number) => formatPercentage(value)} />
              <Bar dataKey="return" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="text-muted-foreground">Alpha</div>
            <div className={`font-medium ${benchmarkData.data.alpha >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPercentage(benchmarkData.data.alpha)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-muted-foreground">Beta</div>
            <div className="font-medium">{benchmarkData.data.beta.toFixed(2)}</div>
          </div>
          <div className="text-center">
            <div className="text-muted-foreground">Correlation</div>
            <div className="font-medium">{formatPercentage(benchmarkData.data.correlation)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function KeyInsights({ data }: { data: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5" />
          Key Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4">
          {data.top_performer && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-800">Top Performer</span>
              </div>
              <p className="text-sm text-green-700">
                {data.top_performer.name} with {formatPercentage(data.top_performer.return)} return
              </p>
            </div>
          )}

          {data.worst_performer && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />
                <span className="font-medium text-red-800">Underperformer</span>
              </div>
              <p className="text-sm text-red-700">
                {data.worst_performer.name} with {formatPercentage(data.worst_performer.return)} return
              </p>
            </div>
          )}

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-800">Diversification</span>
            </div>
            <p className="text-sm text-blue-700">
              Portfolio is {data.diversification_score > 0.7 ? 'well' : 'moderately'} diversified across {data.sector_count} sectors
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function PortfolioAnalytics({ portfolioId }: PortfolioAnalyticsProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('1Y')
  const [activeTab, setActiveTab] = useState('overview')

  const { data: analyticsData, isLoading, error, refetch } = usePortfolioAnalytics(portfolioId)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 bg-muted animate-pulse rounded" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !analyticsData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Portfolio Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Unable to load analytics data</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Mock data for demonstration - in real app this would come from the API
  const mockAttributionData = [
    { investment: 'TechCorp Inc', return: 15000 },
    { investment: 'HealthTech Ltd', return: 8000 },
    { investment: 'FinTech Solutions', return: -2000 },
    { investment: 'Green Energy Co', return: 5000 },
  ]

  const mockSectorData = [
    { sector: 'SaaS', value: 45000, percentage: 0.45 },
    { sector: 'Healthcare', value: 25000, percentage: 0.25 },
    { sector: 'Fintech', value: 20000, percentage: 0.20 },
    { sector: 'CleanTech', value: 10000, percentage: 0.10 },
  ]

  const mockRiskReturnData = [
    { investment: 'TechCorp Inc', risk: 0.15, return: 0.25 },
    { investment: 'HealthTech Ltd', risk: 0.12, return: 0.18 },
    { investment: 'FinTech Solutions', risk: 0.20, return: 0.08 },
    { investment: 'Green Energy Co', risk: 0.18, return: 0.15 },
  ]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Portfolio Analytics
              </CardTitle>
              <CardDescription>
                Comprehensive analysis of your investment portfolio
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Select value={timeRange} onValueChange={(value: TimeRange) => setTimeRange(value)}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1M">1M</SelectItem>
                  <SelectItem value="3M">3M</SelectItem>
                  <SelectItem value="6M">6M</SelectItem>
                  <SelectItem value="1Y">1Y</SelectItem>
                  <SelectItem value="2Y">2Y</SelectItem>
                  <SelectItem value="ALL">All</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="allocation">Allocation</TabsTrigger>
              <TabsTrigger value="risk">Risk Analysis</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <KeyInsights data={analyticsData} />
                <BenchmarkComparisonChart portfolioId={portfolioId} />
              </div>
            </TabsContent>

            <TabsContent value="performance" className="space-y-6">
              <PerformanceAttributionChart data={mockAttributionData} />
            </TabsContent>

            <TabsContent value="allocation" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SectorDistributionChart data={mockSectorData} />
                <Card>
                  <CardHeader>
                    <CardTitle>Sector Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {mockSectorData.map((sector, index) => (
                        <div key={sector.sector} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span className="font-medium">{sector.sector}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">{formatCurrency(sector.value)}</div>
                            <div className="text-sm text-muted-foreground">
                              {formatPercentage(sector.percentage)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="risk" className="space-y-6">
              <RiskReturnScatter data={mockRiskReturnData} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}