import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  BarChart,
  Bar
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  Target,
  Calendar,
  DollarSign,
  Percent,
  BarChart3,
  Activity,
  AlertCircle,
  RefreshCw
} from 'lucide-react'
import { useInvestmentPerformance } from '@/hooks/use-portfolio'
import { InvestmentPerformance } from '@/types/portfolio'
import { formatCurrency, formatPercentage, formatDate, getPerformanceColor } from '@/lib/portfolio-utils'

interface PerformanceTrackingProps {
  investmentId: string
  investmentName: string
}

type TimeRange = '1M' | '3M' | '6M' | '1Y' | '2Y' | 'ALL'
type ChartType = 'value' | 'returns' | 'multiple'

interface PerformanceDataPoint {
  date: string
  value: number
  invested: number
  gain_loss: number
  gain_loss_percentage: number
  multiple: number
  formattedDate: string
}

function PerformanceChart({
  data,
  type,
  timeRange
}: {
  data: PerformanceDataPoint[]
  type: ChartType
  timeRange: TimeRange
}) {
  const getDataKey = () => {
    switch (type) {
      case 'value':
        return 'value'
      case 'returns':
        return 'gain_loss'
      case 'multiple':
        return 'multiple'
      default:
        return 'value'
    }
  }

  const getYAxisFormatter = () => {
    switch (type) {
      case 'value':
        return (value: number) => formatCurrency(value)
      case 'returns':
        return (value: number) => formatCurrency(value)
      case 'multiple':
        return (value: number) => `${value.toFixed(2)}x`
      default:
        return (value: number) => value.toString()
    }
  }

  const getTooltipFormatter = (value: number, name: string) => {
    switch (type) {
      case 'value':
        return [formatCurrency(value), 'Portfolio Value']
      case 'returns':
        return [formatCurrency(value), 'Gain/Loss']
      case 'multiple':
        return [`${value.toFixed(2)}x`, 'Multiple']
      default:
        return [value, name]
    }
  }

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id={`performanceGradient-${type}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis
            dataKey="formattedDate"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={getYAxisFormatter()}
          />
          <Tooltip
            formatter={getTooltipFormatter}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Area
            type="monotone"
            dataKey={getDataKey()}
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fill={`url(#performanceGradient-${type})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function PerformanceMetricsGrid({ performance }: { performance: InvestmentPerformance }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="text-sm text-muted-foreground mb-1">Current Value</div>
            <div className="text-2xl font-bold">{formatCurrency(performance.current_value)}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="text-sm text-muted-foreground mb-1">Unrealized P&L</div>
            <div className={`text-2xl font-bold ${getPerformanceColor(performance.unrealized_gain_loss)}`}>
              {formatCurrency(performance.unrealized_gain_loss)}
            </div>
            <div className={`text-sm ${getPerformanceColor(performance.unrealized_gain_loss_percentage)}`}>
              {formatPercentage(performance.unrealized_gain_loss_percentage)}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="text-sm text-muted-foreground mb-1">Total Return</div>
            <div className={`text-2xl font-bold ${getPerformanceColor(performance.total_return)}`}>
              {formatCurrency(performance.total_return)}
            </div>
            <div className={`text-sm ${getPerformanceColor(performance.total_return_percentage)}`}>
              {formatPercentage(performance.total_return_percentage)}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="text-sm text-muted-foreground mb-1">Multiple</div>
            <div className={`text-2xl font-bold ${getPerformanceColor(performance.multiple - 1)}`}>
              {performance.multiple.toFixed(2)}x
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function IRRCalculation({ performance }: { performance: InvestmentPerformance }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          IRR Analysis
        </CardTitle>
        <CardDescription>
          Internal Rate of Return calculation and breakdown
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {performance.irr ? (
          <div className="text-center">
            <div className="text-4xl font-bold text-primary mb-2">
              {formatPercentage(performance.irr)}
            </div>
            <div className="text-sm text-muted-foreground">Annual IRR</div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>IRR calculation requires more data points</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="text-center p-3 bg-muted/50 rounded">
            <div className="font-medium">Investment Period</div>
            <div className="text-muted-foreground">24 months</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded">
            <div className="font-medium">Cash Flow Timing</div>
            <div className="text-muted-foreground">Monthly tracking</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded">
            <div className="font-medium">Calculation Method</div>
            <div className="text-muted-foreground">XIRR formula</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function PerformanceTracking({ investmentId, investmentName }: PerformanceTrackingProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('1Y')
  const [chartType, setChartType] = useState<ChartType>('value')

  const { data: performanceData, isLoading, error, refetch } = useInvestmentPerformance(investmentId)

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 w-48 bg-muted animate-pulse rounded mb-2" />
          <div className="h-4 w-64 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    )
  }

  if (error || !performanceData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Performance Tracking
          </CardTitle>
          <CardDescription>
            Track performance for {investmentName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Unable to load performance data</p>
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

  // Transform performance data for charts
  const chartData: PerformanceDataPoint[] = [
    {
      date: performanceData.last_updated,
      value: performanceData.current_value,
      invested: performanceData.current_value - performanceData.unrealized_gain_loss,
      gain_loss: performanceData.unrealized_gain_loss,
      gain_loss_percentage: performanceData.unrealized_gain_loss_percentage,
      multiple: performanceData.multiple,
      formattedDate: formatDate(performanceData.last_updated)
    }
  ]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Performance Tracking
              </CardTitle>
              <CardDescription>
                Track performance for {investmentName}
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

              <div className="flex rounded-lg border">
                <Button
                  variant={chartType === 'value' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setChartType('value')}
                  className="rounded-r-none"
                >
                  Value
                </Button>
                <Button
                  variant={chartType === 'returns' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setChartType('returns')}
                  className="rounded-l-none rounded-r-none"
                >
                  Returns
                </Button>
                <Button
                  variant={chartType === 'multiple' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setChartType('multiple')}
                  className="rounded-l-none"
                >
                  Multiple
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <PerformanceChart data={chartData} type={chartType} timeRange={timeRange} />
        </CardContent>
      </Card>

      <PerformanceMetricsGrid performance={performanceData} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <IRRCalculation performance={performanceData} />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Performance Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Unrealized Gains</span>
                <span className={`font-medium ${getPerformanceColor(performanceData.unrealized_gain_loss)}`}>
                  {formatCurrency(performanceData.unrealized_gain_loss)}
                </span>
              </div>
              <Progress
                value={Math.min(Math.abs(performanceData.unrealized_gain_loss_percentage) * 10, 100)}
                className="h-2"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Realized Gains</span>
                <span className={`font-medium ${getPerformanceColor(performanceData.realized_gain_loss)}`}>
                  {formatCurrency(performanceData.realized_gain_loss)}
                </span>
              </div>
              <Progress
                value={Math.min(Math.abs(performanceData.realized_gain_loss_percentage) * 10, 100)}
                className="h-2"
              />
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center justify-between font-medium">
                <span>Total Return</span>
                <span className={getPerformanceColor(performanceData.total_return)}>
                  {formatCurrency(performanceData.total_return)} ({formatPercentage(performanceData.total_return_percentage)})
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}