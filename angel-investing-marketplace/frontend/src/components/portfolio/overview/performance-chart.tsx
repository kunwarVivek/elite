import React, { useState } from 'react'
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
  ReferenceLine
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TrendingUp, TrendingDown, Calendar } from 'lucide-react'
import { usePortfolioPerformance } from '@/hooks/use-portfolio'
import { PortfolioPerformance } from '@/types/portfolio'
import { formatCurrency, formatDate, formatPercentage, getPerformanceColor } from '@/lib/portfolio-utils'

interface PerformanceChartProps {
  portfolioId: string
  height?: number
}

type ChartType = 'line' | 'area'
type TimeRange = '1M' | '3M' | '6M' | '1Y' | '2Y' | 'ALL'

interface ChartDataPoint {
  date: string
  value: number
  invested: number
  gain_loss: number
  gain_loss_percentage: number
  formattedDate: string
}

function PerformanceChartSkeleton({ height = 400 }: { height?: number }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className={`w-full`} style={{ height: `${height}px` }} />
      </CardContent>
    </Card>
  )
}

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-background border rounded-lg shadow-lg p-3">
        <p className="text-sm font-medium mb-2">{data.formattedDate}</p>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">Portfolio Value:</span>
            <span className="font-medium">{formatCurrency(data.value)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">Invested:</span>
            <span className="font-medium">{formatCurrency(data.invested)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">P&L:</span>
            <span className={`font-medium ${getPerformanceColor(data.gain_loss)}`}>
              {formatCurrency(data.gain_loss)} ({formatPercentage(data.gain_loss_percentage)})
            </span>
          </div>
        </div>
      </div>
    )
  }
  return null
}

export function PerformanceChart({ portfolioId, height = 400 }: PerformanceChartProps) {
  const [chartType, setChartType] = useState<ChartType>('area')
  const [timeRange, setTimeRange] = useState<TimeRange>('1Y')

  const { data: performanceData, isLoading, error } = usePortfolioPerformance(portfolioId, timeRange)

  if (isLoading) {
    return <PerformanceChartSkeleton height={height} />
  }

  if (error || !performanceData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Portfolio Performance
          </CardTitle>
          <CardDescription>
            Track your portfolio value over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-96 text-muted-foreground">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Unable to load performance data</p>
              <p className="text-sm">Please try again later</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Transform data for chart
  const chartData: ChartDataPoint[] = performanceData.map((point: PortfolioPerformance) => ({
    date: point.date,
    value: point.value,
    invested: point.invested_amount,
    gain_loss: point.gain_loss,
    gain_loss_percentage: point.gain_loss_percentage,
    formattedDate: formatDate(point.date)
  }))

  // Calculate key metrics
  const latestData = chartData[chartData.length - 1]
  const previousData = chartData[chartData.length - 2]
  const currentValue = latestData?.value || 0
  const previousValue = previousData?.value || currentValue
  const dailyChange = currentValue - previousValue
  const dailyChangePercentage = previousValue > 0 ? (dailyChange / previousValue) * 100 : 0

  const totalInvested = latestData?.invested || 0
  const totalGainLoss = currentValue - totalInvested
  const totalGainLossPercentage = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0

  const isPositive = dailyChange >= 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Portfolio Performance
            </CardTitle>
            <CardDescription>
              Track your portfolio value over time
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
                variant={chartType === 'area' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setChartType('area')}
                className="rounded-r-none"
              >
                Area
              </Button>
              <Button
                variant={chartType === 'line' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setChartType('line')}
                className="rounded-l-none"
              >
                Line
              </Button>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="flex items-center gap-6 pt-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Current Value:</span>
            <span className="font-semibold">{formatCurrency(currentValue)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Daily Change:</span>
            <Badge variant={isPositive ? 'default' : 'destructive'} className="flex items-center gap-1">
              {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {formatPercentage(dailyChangePercentage)}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Total Return:</span>
            <span className={`font-semibold ${getPerformanceColor(totalGainLoss)}`}>
              {formatCurrency(totalGainLoss)} ({formatPercentage(totalGainLossPercentage)})
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div style={{ height: `${height}px` }}>
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'area' ? (
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
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
                  tickFormatter={(value) => formatCurrency(value)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#portfolioGradient)"
                />
                <ReferenceLine y={totalInvested} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" />
              </AreaChart>
            ) : (
              <LineChart data={chartData}>
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
                  tickFormatter={(value) => formatCurrency(value)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: "hsl(var(--primary))", strokeWidth: 2 }}
                />
                <ReferenceLine y={totalInvested} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}