import React, { useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PieChart as PieChartIcon, BarChart3, TrendingUp, AlertCircle } from 'lucide-react'
import { useAssetAllocation } from '@/hooks/use-portfolio'
import { AssetAllocation as AllocationData } from '@/types/portfolio'
import { formatCurrency, formatPercentage } from '@/lib/portfolio-utils'

interface AssetAllocationProps {
  portfolioId: string
}

type ChartType = 'pie' | 'bar'

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(var(--accent))',
]

function CustomTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-background border rounded-lg shadow-lg p-3">
        <p className="font-medium mb-2">{data.sector}</p>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">Invested:</span>
            <span className="font-medium">{formatCurrency(data.amount_invested)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">Current Value:</span>
            <span className="font-medium">{formatCurrency(data.current_value)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">Allocation:</span>
            <span className="font-medium">{formatPercentage(data.percentage)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">Investments:</span>
            <span className="font-medium">{data.investment_count}</span>
          </div>
        </div>
      </div>
    )
  }
  return null
}

function CustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percentage }: any) {
  if (percentage < 5) return null // Don't show labels for slices smaller than 5%

  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      className="text-xs font-medium"
    >
      {`${formatPercentage(percentage)}`}
    </text>
  )
}

function AllocationTable({ data }: { data: AllocationData[] }) {
  return (
    <div className="space-y-3">
      {data.map((allocation, index) => (
        <div key={allocation.sector} className="flex items-center justify-between p-3 rounded-lg border">
          <div className="flex items-center space-x-3">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <div>
              <p className="font-medium">{allocation.sector}</p>
              <p className="text-sm text-muted-foreground">
                {allocation.investment_count} investment{allocation.investment_count !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="font-medium">{formatCurrency(allocation.current_value)}</p>
            <p className="text-sm text-muted-foreground">
              {formatPercentage(allocation.percentage)}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

function AllocationChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-40 mb-2" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-80 w-full" />
      </CardContent>
    </Card>
  )
}

export function AssetAllocation({ portfolioId }: AssetAllocationProps) {
  const [chartType, setChartType] = useState<ChartType>('pie')
  const { data: allocationData, isLoading, error } = useAssetAllocation(portfolioId)

  if (isLoading) {
    return <AllocationChartSkeleton />
  }

  if (error || !allocationData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5" />
            Asset Allocation
          </CardTitle>
          <CardDescription>
            Diversification breakdown by sector
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Unable to load allocation data</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Prepare data for charts
  const chartData = allocationData.map((allocation, index) => ({
    ...allocation,
    fill: COLORS[index % COLORS.length]
  }))

  // Calculate total portfolio value
  const totalValue = allocationData.reduce((sum, allocation) => sum + allocation.current_value, 0)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              Asset Allocation
            </CardTitle>
            <CardDescription>
              Diversification breakdown by sector
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total Value</p>
              <p className="text-lg font-semibold">{formatCurrency(totalValue)}</p>
            </div>
            <div className="flex rounded-lg border">
              <Button
                variant={chartType === 'pie' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setChartType('pie')}
                className="rounded-r-none"
              >
                <PieChartIcon className="h-4 w-4" />
              </Button>
              <Button
                variant={chartType === 'bar' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setChartType('bar')}
                className="rounded-l-none"
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="chart" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="chart">Chart View</TabsTrigger>
            <TabsTrigger value="table">Table View</TabsTrigger>
          </TabsList>

          <TabsContent value="chart" className="space-y-4">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'pie' ? (
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={CustomLabel}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="current_value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      verticalAlign="bottom"
                      height={36}
                      formatter={(value, entry: any) => (
                        <span style={{ color: entry.color }}>{value}</span>
                      )}
                    />
                  </PieChart>
                ) : (
                  <BarChart data={chartData} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
                    <YAxis dataKey="sector" type="category" width={80} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="current_value" fill="hsl(var(--primary))" />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="table">
            <AllocationTable data={allocationData} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}