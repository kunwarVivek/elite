import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  Target,
  Award,
  Calendar,
  RefreshCw,
  AlertCircle,
  Info,
  BarChart3
} from 'lucide-react'
import { useBenchmarkComparison } from '@/hooks/use-portfolio'
import { BenchmarkType, BenchmarkComparison } from '@/types/portfolio'
import { formatPercentage, formatDate, getPerformanceColor } from '@/lib/portfolio-utils'

interface BenchmarkComparisonProps {
  portfolioId: string
}

type TimeRange = '1M' | '3M' | '6M' | '1Y' | '2Y' | '5Y'

function BenchmarkChart({
  portfolioData,
  benchmarkData,
  timeRange
}: {
  portfolioData: any[]
  benchmarkData: any[]
  timeRange: TimeRange
}) {
  // Combine portfolio and benchmark data
  const chartData = portfolioData.map((portfolioPoint, index) => ({
    date: portfolioPoint.date,
    portfolio: portfolioPoint.value,
    benchmark: benchmarkData[index]?.value || 0,
    formattedDate: formatDate(portfolioPoint.date)
  }))

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
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
            tickFormatter={(value) => formatPercentage(value)}
          />
          <Tooltip
            formatter={(value: number, name: string) => [
              formatPercentage(value),
              name === 'portfolio' ? 'Portfolio' : 'Benchmark'
            ]}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="portfolio"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            name="Portfolio"
          />
          <Line
            type="monotone"
            dataKey="benchmark"
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={2}
            strokeDasharray="5 5"
            name="Benchmark"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function MetricsTable({ comparisons }: { comparisons: BenchmarkComparison[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Benchmark Metrics</CardTitle>
        <CardDescription>
          Detailed comparison metrics across different benchmarks
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Benchmark</TableHead>
                <TableHead className="text-right">Portfolio Return</TableHead>
                <TableHead className="text-right">Benchmark Return</TableHead>
                <TableHead className="text-right">Alpha</TableHead>
                <TableHead className="text-right">Beta</TableHead>
                <TableHead className="text-right">Correlation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparisons.map((comparison, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">
                    {comparison.benchmark_name}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={getPerformanceColor(comparison.portfolio_period_return)}>
                      {formatPercentage(comparison.portfolio_period_return)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={getPerformanceColor(comparison.period_return)}>
                      {formatPercentage(comparison.period_return)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={getPerformanceColor(comparison.alpha)}>
                      {formatPercentage(comparison.alpha)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {comparison.beta.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatPercentage(comparison.correlation)}
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

function BenchmarkSelector({
  selectedBenchmark,
  onBenchmarkChange,
  timeRange,
  onTimeRangeChange
}: {
  selectedBenchmark: BenchmarkType
  onBenchmarkChange: (benchmark: BenchmarkType) => void
  timeRange: TimeRange
  onTimeRangeChange: (range: TimeRange) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Benchmark Selection
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Benchmark</label>
            <Select value={selectedBenchmark} onValueChange={onBenchmarkChange}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={BenchmarkType.S_P_500}>S&P 500</SelectItem>
                <SelectItem value={BenchmarkType.NASDAQ}>NASDAQ Composite</SelectItem>
                <SelectItem value={BenchmarkType.DOW_JONES}>Dow Jones</SelectItem>
                <SelectItem value={BenchmarkType.RUSSELL_2000}>Russell 2000</SelectItem>
                <SelectItem value={BenchmarkType.VC_INDEX}>VC Index</SelectItem>
                <SelectItem value={BenchmarkType.ANGEL_INDEX}>Angel Index</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Time Period</label>
            <Select value={timeRange} onValueChange={onTimeRangeChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1M">1 Month</SelectItem>
                <SelectItem value="3M">3 Months</SelectItem>
                <SelectItem value="6M">6 Months</SelectItem>
                <SelectItem value="1Y">1 Year</SelectItem>
                <SelectItem value="2Y">2 Years</SelectItem>
                <SelectItem value="5Y">5 Years</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function PerformanceSummary({ comparison }: { comparison: BenchmarkComparison }) {
  const isOutperforming = comparison.alpha > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5" />
          Performance Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="text-center p-4 border rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">Portfolio Return</div>
            <div className={`text-2xl font-bold ${getPerformanceColor(comparison.portfolio_period_return)}`}>
              {formatPercentage(comparison.portfolio_period_return)}
            </div>
          </div>

          <div className="text-center p-4 border rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">Benchmark Return</div>
            <div className={`text-2xl font-bold ${getPerformanceColor(comparison.period_return)}`}>
              {formatPercentage(comparison.period_return)}
            </div>
          </div>
        </div>

        <div className="p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            {isOutperforming ? (
              <TrendingUp className="h-5 w-5 text-green-600" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-600" />
            )}
            <span className="font-medium">
              {isOutperforming ? 'Outperforming' : 'Underperforming'} Benchmark
            </span>
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="text-muted-foreground">Alpha</div>
              <div className={`font-medium ${getPerformanceColor(comparison.alpha)}`}>
                {formatPercentage(comparison.alpha)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-muted-foreground">Beta</div>
              <div className="font-medium">{comparison.beta.toFixed(2)}</div>
            </div>
            <div className="text-center">
              <div className="text-muted-foreground">Correlation</div>
              <div className="font-medium">{formatPercentage(comparison.correlation)}</div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium">Key Insights</h4>
          <div className="space-y-1 text-sm text-muted-foreground">
            {isOutperforming ? (
              <p className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-500" />
                Portfolio is generating positive alpha relative to the benchmark
              </p>
            ) : (
              <p className="flex items-center gap-2">
                <AlertCircle className="h-3 w-3 text-yellow-500" />
                Portfolio is underperforming the benchmark - consider rebalancing
              </p>
            )}

            {Math.abs(comparison.beta) > 1.5 && (
              <p className="flex items-center gap-2">
                <Info className="h-3 w-3 text-blue-500" />
                High beta indicates above-average market sensitivity
              </p>
            )}

            {comparison.correlation > 0.8 && (
              <p className="flex items-center gap-2">
                <Info className="h-3 w-3 text-purple-500" />
                Strong correlation with benchmark suggests market-driven returns
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function BenchmarkComparisonTools({ portfolioId }: BenchmarkComparisonProps) {
  const [selectedBenchmark, setSelectedBenchmark] = useState<BenchmarkType>(BenchmarkType.S_P_500)
  const [timeRange, setTimeRange] = useState<TimeRange>('1Y')

  const { data: comparisonData, isLoading, error, refetch } = useBenchmarkComparison(
    portfolioId,
    selectedBenchmark,
    timeRange
  )

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 w-48 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    )
  }

  if (error || !comparisonData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Benchmark Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Unable to load benchmark data</p>
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

  // Mock historical data for chart - in real app this would come from API
  const mockPortfolioData = [
    { date: '2024-01-01', value: 100000 },
    { date: '2024-02-01', value: 105000 },
    { date: '2024-03-01', value: 108000 },
    { date: '2024-04-01', value: 112000 },
    { date: '2024-05-01', value: 115000 },
    { date: '2024-06-01', value: 118000 },
  ]

  const mockBenchmarkData = [
    { date: '2024-01-01', value: 100 },
    { date: '2024-02-01', value: 102 },
    { date: '2024-03-01', value: 105 },
    { date: '2024-04-01', value: 107 },
    { date: '2024-05-01', value: 109 },
    { date: '2024-06-01', value: 111 },
  ]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Benchmark Comparison Tools
          </CardTitle>
          <CardDescription>
            Compare your portfolio performance against market benchmarks
          </CardDescription>
        </CardHeader>
      </Card>

      <BenchmarkSelector
        selectedBenchmark={selectedBenchmark}
        onBenchmarkChange={setSelectedBenchmark}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Performance Comparison</CardTitle>
            <CardDescription>
              Portfolio vs {comparisonData.data.benchmark_name} over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BenchmarkChart
              portfolioData={mockPortfolioData}
              benchmarkData={mockBenchmarkData}
              timeRange={timeRange}
            />
          </CardContent>
        </Card>

        <PerformanceSummary comparison={comparisonData.data} />
      </div>

      <MetricsTable comparisons={[comparisonData.data]} />
    </div>
  )
}