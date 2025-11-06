import React, { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Alert, AlertDescription } from '../../components/ui/alert';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  BarChart3,
  RefreshCw,
  AlertCircle,
  Building2,
  Calendar,
  Target,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Download,
  Plus,
} from 'lucide-react';
import { cn, formatNumber, formatDate } from '@/lib/utils';

/**
 * Portfolio Dashboard
 * Main overview of investor's portfolio
 * Shows aggregate metrics, recent investments, and performance highlights
 */

interface PortfolioSummary {
  totalInvested: number;
  totalValue: number;
  totalReturn: number;
  returnPercentage: number;
  activeInvestments: number;
  companiesCount: number;
  avgInvestmentSize: number;
  performanceChange: number;
}

interface Investment {
  id: string;
  amount: number;
  equity: number;
  currentValue: number;
  unrealizedGain: number;
  status: string;
  investedAt: string;
  pitch: {
    id: string;
    startup: {
      id: string;
      name: string;
      logo?: string;
      industry: string;
      stage: string;
    };
  };
}

interface PerformanceMetric {
  period: string;
  value: number;
  change: number;
}

const STATUS_CONFIG = {
  PENDING: { color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Pending' },
  APPROVED: { color: 'text-blue-600', bg: 'bg-blue-50', label: 'Approved' },
  COMPLETED: { color: 'text-green-600', bg: 'bg-green-50', label: 'Active' },
  CANCELLED: { color: 'text-red-600', bg: 'bg-red-50', label: 'Cancelled' },
};

export function PortfolioDashboardPage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [recentInvestments, setRecentInvestments] = useState<Investment[]>([]);
  const [performance, setPerformance] = useState<PerformanceMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPortfolioData();
  }, []);

  const fetchPortfolioData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');

      // Fetch portfolio summary
      const summaryResponse = await fetch('http://localhost:3001/api/portfolio/summary', {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!summaryResponse.ok) {
        throw new Error('Failed to fetch portfolio summary');
      }

      const summaryResult = await summaryResponse.json();
      setSummary(summaryResult.data.summary);

      // Fetch recent investments
      const investmentsResponse = await fetch('http://localhost:3001/api/investments?limit=5&sort=recent', {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (investmentsResponse.ok) {
        const investmentsResult = await investmentsResponse.json();
        setRecentInvestments(investmentsResult.data.investments || []);
      }

      // Fetch performance data
      const performanceResponse = await fetch('http://localhost:3001/api/portfolio/performance?period=6m', {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (performanceResponse.ok) {
        const performanceResult = await performanceResponse.json();
        setPerformance(performanceResult.data.metrics || []);
      }
    } catch (err: any) {
      console.error('Error fetching portfolio:', err);
      setError(err.message || 'Failed to load portfolio data');
    } finally {
      setIsLoading(false);
    }
  };

  const getReturnColor = (value: number): string => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  if (isLoading) {
    return (
      <div className="container max-w-7xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading portfolio...</span>
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
        <Button onClick={fetchPortfolioData} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  const hasInvestments = summary && summary.activeInvestments > 0;

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Portfolio Dashboard</h1>
          <p className="text-muted-foreground">Track your investments and performance</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={fetchPortfolioData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => navigate({ to: '/investments' })}>
            <Plus className="h-4 w-4 mr-2" />
            New Investment
          </Button>
        </div>
      </div>

      {!hasInvestments ? (
        /* Empty State */
        <Card>
          <CardContent className="text-center py-12">
            <PieChart className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-2xl font-bold mb-2">Start Your Investment Journey</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              You haven't made any investments yet. Browse our marketplace to discover exciting startup opportunities.
            </p>
            <Button size="lg" onClick={() => navigate({ to: '/investments' })}>
              <Target className="h-5 w-5 mr-2" />
              Explore Investments
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                  Total Invested
                  <DollarSign className="h-4 w-4" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-1">
                  ${formatNumber(summary?.totalInvested || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {summary?.activeInvestments || 0} active {summary?.activeInvestments === 1 ? 'investment' : 'investments'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                  Current Value
                  <TrendingUp className="h-4 w-4" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-1">
                  ${formatNumber(summary?.totalValue || 0)}
                </div>
                <div className="flex items-center text-xs">
                  {summary && summary.performanceChange >= 0 ? (
                    <ArrowUpRight className="h-3 w-3 text-green-600 mr-1" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 text-red-600 mr-1" />
                  )}
                  <span className={cn(getReturnColor(summary?.performanceChange || 0))}>
                    {summary && summary.performanceChange >= 0 ? '+' : ''}
                    {summary?.performanceChange.toFixed(2)}% this month
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                  Total Return
                  <BarChart3 className="h-4 w-4" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={cn('text-3xl font-bold mb-1', getReturnColor(summary?.totalReturn || 0))}>
                  {summary && summary.totalReturn >= 0 ? '+' : ''}${formatNumber(Math.abs(summary?.totalReturn || 0))}
                </div>
                <div className="flex items-center text-xs">
                  <span className={cn(getReturnColor(summary?.returnPercentage || 0))}>
                    {summary && summary.returnPercentage >= 0 ? '+' : ''}
                    {summary?.returnPercentage.toFixed(2)}% ROI
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                  Portfolio
                  <Building2 className="h-4 w-4" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-1">
                  {summary?.companiesCount || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {summary?.companiesCount === 1 ? 'Company' : 'Companies'}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Recent Investments */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Recent Investments</CardTitle>
                    <CardDescription>Your latest investment activity</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate({ to: '/portfolio/holdings' })}
                  >
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {recentInvestments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No recent investments</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentInvestments.map((investment) => {
                      const statusConfig = STATUS_CONFIG[investment.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.PENDING;
                      const gainPercent = investment.amount > 0
                        ? ((investment.unrealizedGain / investment.amount) * 100)
                        : 0;

                      return (
                        <div
                          key={investment.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                          onClick={() => navigate({ to: `/portfolio/investment/${investment.id}` })}
                        >
                          <div className="flex items-center space-x-3 flex-1">
                            <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                              {investment.pitch.startup.logo ? (
                                <img
                                  src={investment.pitch.startup.logo}
                                  alt={investment.pitch.startup.name}
                                  className="w-full h-full object-cover rounded-lg"
                                />
                              ) : (
                                <Building2 className="h-6 w-6 text-white" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-1">
                                <h4 className="font-bold truncate">{investment.pitch.startup.name}</h4>
                                <span className={cn('text-xs px-2 py-0.5 rounded', statusConfig.bg, statusConfig.color)}>
                                  {statusConfig.label}
                                </span>
                              </div>
                              <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                                <span>{investment.pitch.startup.industry}</span>
                                <span>•</span>
                                <span>{investment.pitch.startup.stage}</span>
                                <span>•</span>
                                <span>{formatDate(investment.investedAt)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold">${formatNumber(investment.amount)}</p>
                            <p className="text-xs text-muted-foreground">{investment.equity}% equity</p>
                            {investment.status === 'COMPLETED' && (
                              <div className="flex items-center justify-end mt-1">
                                <span className={cn('text-xs font-semibold', getReturnColor(gainPercent))}>
                                  {gainPercent >= 0 ? '+' : ''}{gainPercent.toFixed(1)}%
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions & Insights */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => navigate({ to: '/portfolio/holdings' })}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View All Holdings
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => navigate({ to: '/portfolio/performance' })}
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Performance Analytics
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => navigate({ to: '/tax' })}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Tax Documents
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Portfolio Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold">Avg Investment</span>
                        <Award className="h-4 w-4 text-blue-600" />
                      </div>
                      <p className="text-2xl font-bold text-blue-600">
                        ${formatNumber(summary?.avgInvestmentSize || 0)}
                      </p>
                    </div>

                    <div className="p-3 bg-purple-50 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold">Diversification</span>
                        <PieChart className="h-4 w-4 text-purple-600" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {summary?.companiesCount || 0} companies across multiple sectors
                      </p>
                    </div>

                    {summary && summary.returnPercentage > 0 && (
                      <div className="p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold">Performance</span>
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        </div>
                        <p className="text-sm text-green-700">
                          Outperforming benchmark by {summary.returnPercentage.toFixed(1)}%
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Performance Chart Placeholder */}
          {performance.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Portfolio Performance</CardTitle>
                    <CardDescription>Last 6 months</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate({ to: '/portfolio/performance' })}
                  >
                    View Details
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center border-2 border-dashed rounded-lg">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 mx-auto mb-2 text-muted-foreground opacity-50" />
                    <p className="text-sm text-muted-foreground">
                      Performance chart visualization
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {performance.length} data points available
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
