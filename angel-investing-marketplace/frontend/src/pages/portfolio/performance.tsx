import React, { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Alert, AlertDescription } from '../../components/ui/alert';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  DollarSign,
  Calendar,
  RefreshCw,
  AlertCircle,
  Award,
  Target,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';

/**
 * Portfolio Performance Page
 * Detailed analytics and performance metrics
 * Charts, benchmarking, and sector allocation
 */

interface PerformanceData {
  totalReturn: number;
  totalReturnPercent: number;
  annualizedReturn: number;
  irr: number;
  moic: number;
  volatility: number;
  sharpeRatio: number;
  bestPerformer: {
    name: string;
    return: number;
  };
  worstPerformer: {
    name: string;
    return: number;
  };
}

interface TimeSeriesData {
  period: string;
  portfolioValue: number;
  invested: number;
  return: number;
}

interface SectorAllocation {
  sector: string;
  value: number;
  percentage: number;
  count: number;
  avgReturn: number;
}

interface Benchmark {
  name: string;
  return: number;
  volatility: number;
}

export function PortfolioPerformancePage() {
  const navigate = useNavigate();
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [timeSeries, setTimeSeries] = useState<TimeSeriesData[]>([]);
  const [sectorAllocation, setSectorAllocation] = useState<SectorAllocation[]>([]);
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'1M' | '3M' | '6M' | '1Y' | 'ALL'>('6M');

  useEffect(() => {
    fetchPerformanceData();
  }, [timeRange]);

  const fetchPerformanceData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');

      // Fetch performance metrics
      const performanceResponse = await fetch(
        `http://localhost:3001/api/portfolio/performance?period=${timeRange}`,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      if (!performanceResponse.ok) {
        throw new Error('Failed to fetch performance data');
      }

      const performanceResult = await performanceResponse.json();
      setPerformance(performanceResult.data.performance);
      setTimeSeries(performanceResult.data.timeSeries || []);
      setSectorAllocation(performanceResult.data.sectorAllocation || []);
      setBenchmarks(performanceResult.data.benchmarks || []);
    } catch (err: any) {
      console.error('Error fetching performance:', err);
      setError(err.message || 'Failed to load performance data');
    } finally {
      setIsLoading(false);
    }
  };

  const getReturnColor = (value: number): string => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getColorBySector = (sector: string): string => {
    const colors: { [key: string]: string } = {
      SaaS: 'bg-blue-500',
      Fintech: 'bg-green-500',
      Healthcare: 'bg-red-500',
      'E-commerce': 'bg-yellow-500',
      'AI/ML': 'bg-purple-500',
      EdTech: 'bg-pink-500',
      CleanTech: 'bg-teal-500',
      Biotech: 'bg-orange-500',
      Consumer: 'bg-indigo-500',
      Enterprise: 'bg-cyan-500',
    };
    return colors[sector] || 'bg-gray-500';
  };

  if (isLoading) {
    return (
      <div className="container max-w-7xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading performance data...</span>
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
        <Button onClick={fetchPerformanceData} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (!performance) {
    return (
      <div className="container max-w-7xl mx-auto py-8 px-4">
        <Card>
          <CardContent className="text-center py-12">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Performance Data</h3>
            <p className="text-muted-foreground">
              Start investing to track your portfolio performance
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Portfolio Performance</h1>
          <p className="text-muted-foreground">Detailed analytics and metrics</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            {(['1M', '3M', '6M', '1Y', 'ALL'] as const).map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange(range)}
              >
                {range}
              </Button>
            ))}
          </div>
          <Button variant="outline" onClick={fetchPerformanceData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Return</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn('text-3xl font-bold mb-1', getReturnColor(performance.totalReturn))}>
              {performance.totalReturn >= 0 ? '+' : ''}${formatNumber(Math.abs(performance.totalReturn))}
            </div>
            <div className="flex items-center text-sm">
              {performance.totalReturnPercent >= 0 ? (
                <ArrowUpRight className="h-4 w-4 text-green-600 mr-1" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-red-600 mr-1" />
              )}
              <span className={getReturnColor(performance.totalReturnPercent)}>
                {performance.totalReturnPercent >= 0 ? '+' : ''}{performance.totalReturnPercent.toFixed(2)}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Annualized Return</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn('text-3xl font-bold mb-1', getReturnColor(performance.annualizedReturn))}>
              {performance.annualizedReturn >= 0 ? '+' : ''}{performance.annualizedReturn.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Year-over-year</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">IRR</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn('text-3xl font-bold mb-1', getReturnColor(performance.irr))}>
              {performance.irr >= 0 ? '+' : ''}{performance.irr.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Internal Rate of Return</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">MOIC</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-1">{performance.moic.toFixed(2)}x</div>
            <p className="text-xs text-muted-foreground">Multiple on Invested Capital</p>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Risk Metrics</CardTitle>
            <CardDescription>Portfolio volatility and risk-adjusted returns</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Volatility</span>
                  <span className="font-bold">{performance.volatility.toFixed(2)}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500"
                    style={{ width: `${Math.min(performance.volatility, 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Sharpe Ratio</span>
                  <span className="font-bold">{performance.sharpeRatio.toFixed(2)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {performance.sharpeRatio > 1 ? 'Excellent' : performance.sharpeRatio > 0.5 ? 'Good' : 'Fair'} risk-adjusted return
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Best Performer</CardTitle>
            <CardDescription>Top performing investment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="font-bold truncate">{performance.bestPerformer.name}</p>
                <p className="text-2xl font-bold text-green-600">
                  +{performance.bestPerformer.return.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Worst Performer</CardTitle>
            <CardDescription>Underperforming investment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <TrendingDown className="h-6 w-6 text-red-600" />
              </div>
              <div className="flex-1">
                <p className="font-bold truncate">{performance.worstPerformer.name}</p>
                <p className="text-2xl font-bold text-red-600">
                  {performance.worstPerformer.return.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Time Series Chart */}
      {timeSeries.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Portfolio Value Over Time</CardTitle>
            <CardDescription>Historical performance for {timeRange}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80 flex items-center justify-center border-2 border-dashed rounded-lg">
              <div className="text-center">
                <BarChart3 className="h-16 w-16 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-sm text-muted-foreground mb-2">
                  Time series chart visualization
                </p>
                <p className="text-xs text-muted-foreground">
                  {timeSeries.length} data points for {timeRange} period
                </p>
                <div className="mt-4 flex items-center justify-center space-x-6 text-xs">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-2" />
                    <span>Portfolio Value</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2" />
                    <span>Amount Invested</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Sector Allocation */}
        {sectorAllocation.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Sector Allocation</CardTitle>
              <CardDescription>Diversification across industries</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sectorAllocation.map((sector) => (
                  <div key={sector.sector}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className={cn('w-3 h-3 rounded-full', getColorBySector(sector.sector))} />
                        <span className="text-sm font-semibold">{sector.sector}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">{sector.percentage.toFixed(1)}%</p>
                        <p className="text-xs text-muted-foreground">${formatNumber(sector.value)}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="h-2 flex-1 bg-gray-200 rounded-full overflow-hidden mr-3">
                        <div
                          className={cn('h-full', getColorBySector(sector.sector))}
                          style={{ width: `${sector.percentage}%` }}
                        />
                      </div>
                      <span className={cn('text-xs font-semibold', getReturnColor(sector.avgReturn))}>
                        {sector.avgReturn >= 0 ? '+' : ''}{sector.avgReturn.toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{sector.count} {sector.count === 1 ? 'investment' : 'investments'}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Benchmark Comparison */}
        {benchmarks.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Benchmark Comparison</CardTitle>
              <CardDescription>Performance vs. market indices</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">Your Portfolio</span>
                    <Award className="h-5 w-5 text-blue-600" />
                  </div>
                  <p className={cn('text-2xl font-bold', getReturnColor(performance.totalReturnPercent))}>
                    {performance.totalReturnPercent >= 0 ? '+' : ''}{performance.totalReturnPercent.toFixed(2)}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Volatility: {performance.volatility.toFixed(2)}%
                  </p>
                </div>

                {benchmarks.map((benchmark) => {
                  const outperforming = performance.totalReturnPercent > benchmark.return;
                  return (
                    <div key={benchmark.name} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">{benchmark.name}</span>
                        {outperforming ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <p className={cn('text-xl font-bold', getReturnColor(benchmark.return))}>
                        {benchmark.return >= 0 ? '+' : ''}{benchmark.return.toFixed(2)}%
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Volatility: {benchmark.volatility.toFixed(2)}%
                      </p>
                      <p className={cn('text-xs font-semibold mt-2', outperforming ? 'text-green-600' : 'text-red-600')}>
                        {outperforming ? 'Outperforming' : 'Underperforming'} by{' '}
                        {Math.abs(performance.totalReturnPercent - benchmark.return).toFixed(2)}%
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Performance Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {performance.totalReturnPercent > 20 && (
              <Alert className="border-green-600 bg-green-50">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>Strong Performance!</strong> Your portfolio is generating exceptional returns above 20%.
                </AlertDescription>
              </Alert>
            )}

            {performance.sharpeRatio > 1 && (
              <Alert className="border-blue-600 bg-blue-50">
                <Award className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <strong>Excellent Risk-Return Profile!</strong> Your Sharpe ratio indicates superior risk-adjusted returns.
                </AlertDescription>
              </Alert>
            )}

            {sectorAllocation.length >= 5 && (
              <Alert className="border-purple-600 bg-purple-50">
                <PieChart className="h-4 w-4 text-purple-600" />
                <AlertDescription className="text-purple-800">
                  <strong>Well Diversified!</strong> Your portfolio is spread across {sectorAllocation.length} sectors.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
