import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Alert, AlertDescription } from '../../components/ui/alert';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Users,
  Shield,
  DollarSign,
  Calendar,
  RefreshCw,
  AlertCircle,
  Activity,
  BarChart3,
  Award,
  Target,
} from 'lucide-react';
import { cn, formatNumber } from '@/lib/utils';

/**
 * Approval Statistics Page
 * Comprehensive analytics for approval workflows
 * Shows performance metrics, trends, and SLA compliance
 */

interface OverallStats {
  totalProcessed: number;
  approvalRate: number;
  rejectionRate: number;
  avgReviewTime: number;
  slaCompliance: number;
  pendingCount: number;
}

interface TypeBreakdown {
  type: 'ACCREDITATION' | 'KYC' | 'TRANSACTION';
  total: number;
  approved: number;
  rejected: number;
  pending: number;
  avgReviewTime: number;
  slaCompliance: number;
}

interface ReviewerStats {
  reviewerId: string;
  reviewerName: string;
  totalReviews: number;
  avgReviewTime: number;
  approvalRate: number;
  slaCompliance: number;
}

interface TrendData {
  period: string;
  submitted: number;
  approved: number;
  rejected: number;
}

interface Statistics {
  overall: OverallStats;
  byType: TypeBreakdown[];
  topReviewers: ReviewerStats[];
  trends: TrendData[];
  slaBreaches: number;
}

const TYPE_CONFIG = {
  ACCREDITATION: {
    name: 'Accreditation',
    icon: Shield,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  KYC: {
    name: 'KYC/AML',
    icon: Users,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
  },
  TRANSACTION: {
    name: 'Transaction',
    icon: DollarSign,
    color: 'text-green-600',
    bg: 'bg-green-50',
  },
};

export function ApprovalStatisticsPage() {
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    fetchStatistics();
  }, [timeRange]);

  const fetchStatistics = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(
        `http://localhost:3001/api/admin/statistics?range=${timeRange}`,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch statistics');
      }

      const result = await response.json();
      setStatistics(result.data);
    } catch (err: any) {
      console.error('Error fetching statistics:', err);
      setError(err.message || 'Failed to load statistics');
    } finally {
      setIsLoading(false);
    }
  };

  const getPercentageColor = (value: number, inverse = false): string => {
    if (inverse) {
      if (value < 10) return 'text-green-600';
      if (value < 25) return 'text-yellow-600';
      return 'text-red-600';
    }
    if (value >= 90) return 'text-green-600';
    if (value >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <div className="container max-w-7xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading statistics...</span>
        </div>
      </div>
    );
  }

  if (error || !statistics) {
    return (
      <div className="container max-w-7xl mx-auto py-8 px-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || 'No statistics available'}</AlertDescription>
        </Alert>
        <Button onClick={fetchStatistics} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  const { overall, byType, topReviewers, trends, slaBreaches } = statistics;

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Approval Statistics</h1>
            <p className="text-muted-foreground">Performance metrics and analytics</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Button
                variant={timeRange === '7d' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange('7d')}
              >
                7 Days
              </Button>
              <Button
                variant={timeRange === '30d' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange('30d')}
              >
                30 Days
              </Button>
              <Button
                variant={timeRange === '90d' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange('90d')}
              >
                90 Days
              </Button>
            </div>
            <Button onClick={fetchStatistics} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* SLA Breach Alert */}
      {slaBreaches > 0 && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>SLA Alert:</strong> {slaBreaches} active SLA {slaBreaches === 1 ? 'breach' : 'breaches'} requiring immediate attention
          </AlertDescription>
        </Alert>
      )}

      {/* Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Processed
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-1">{formatNumber(overall.totalProcessed)}</div>
            <p className="text-xs text-muted-foreground">
              {overall.pendingCount} pending review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Approval Rate
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={cn('text-3xl font-bold mb-1', getPercentageColor(overall.approvalRate))}>
              {overall.approvalRate.toFixed(1)}%
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 mr-1" />
              {formatNumber(Math.round((overall.approvalRate / 100) * overall.totalProcessed))} approved
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Rejection Rate
              </CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={cn('text-3xl font-bold mb-1', getPercentageColor(overall.rejectionRate, true))}>
              {overall.rejectionRate.toFixed(1)}%
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingDown className="h-3 w-3 mr-1" />
              {formatNumber(Math.round((overall.rejectionRate / 100) * overall.totalProcessed))} rejected
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Avg Review Time
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold mb-1">{overall.avgReviewTime}m</div>
            <p className="text-xs text-muted-foreground">Per approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                SLA Compliance
              </CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={cn('text-3xl font-bold mb-1', getPercentageColor(overall.slaCompliance))}>
              {overall.slaCompliance.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Within SLA deadline</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Breaches
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={cn('text-3xl font-bold mb-1', slaBreaches > 0 ? 'text-red-600' : 'text-green-600')}>
              {slaBreaches}
            </div>
            <p className="text-xs text-muted-foreground">
              {slaBreaches === 0 ? 'All within SLA' : 'Require attention'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown by Type */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Breakdown by Type</CardTitle>
          <CardDescription>Performance metrics for each approval type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {byType.map((typeStats) => {
              const config = TYPE_CONFIG[typeStats.type];
              const Icon = config.icon;
              const totalDecided = typeStats.approved + typeStats.rejected;
              const approvalRate = totalDecided > 0 ? (typeStats.approved / totalDecided) * 100 : 0;

              return (
                <div key={typeStats.type} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={cn('p-2 rounded-lg', config.bg)}>
                        <Icon className={cn('h-5 w-5', config.color)} />
                      </div>
                      <div>
                        <h3 className="font-semibold">{config.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {formatNumber(typeStats.total)} total
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Approved</p>
                      <p className="text-lg font-bold text-green-600">
                        {formatNumber(typeStats.approved)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Rejected</p>
                      <p className="text-lg font-bold text-red-600">
                        {formatNumber(typeStats.rejected)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Pending</p>
                      <p className="text-lg font-bold text-yellow-600">
                        {formatNumber(typeStats.pending)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Avg Review</p>
                      <p className="text-lg font-bold">{typeStats.avgReviewTime}m</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">SLA Compliance</p>
                      <p className={cn('text-lg font-bold', getPercentageColor(typeStats.slaCompliance))}>
                        {typeStats.slaCompliance.toFixed(0)}%
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Approval Rate</span>
                      <span className={cn('font-semibold', getPercentageColor(approvalRate))}>
                        {approvalRate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-600"
                        style={{ width: `${approvalRate}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Top Reviewers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Award className="h-5 w-5 mr-2" />
              Top Reviewers
            </CardTitle>
            <CardDescription>Performance leaderboard</CardDescription>
          </CardHeader>
          <CardContent>
            {topReviewers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No reviewer data available</p>
              </div>
            ) : (
              <div className="space-y-4">
                {topReviewers.map((reviewer, index) => (
                  <div key={reviewer.reviewerId} className="flex items-center space-x-4">
                    <div className={cn(
                      'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm',
                      index === 0 ? 'bg-yellow-100 text-yellow-700' :
                      index === 1 ? 'bg-gray-100 text-gray-700' :
                      index === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-blue-50 text-blue-700'
                    )}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{reviewer.reviewerName}</p>
                      <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                        <span>{formatNumber(reviewer.totalReviews)} reviews</span>
                        <span>•</span>
                        <span>{reviewer.avgReviewTime}m avg</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn('text-sm font-semibold', getPercentageColor(reviewer.approvalRate))}>
                        {reviewer.approvalRate.toFixed(0)}% approval
                      </p>
                      <p className={cn('text-xs', getPercentageColor(reviewer.slaCompliance))}>
                        {reviewer.slaCompliance.toFixed(0)}% SLA
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Submission Trends
            </CardTitle>
            <CardDescription>Weekly activity overview</CardDescription>
          </CardHeader>
          <CardContent>
            {trends.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No trend data available</p>
              </div>
            ) : (
              <div className="space-y-4">
                {trends.map((trend) => {
                  const total = trend.submitted;
                  const approvedPercent = total > 0 ? (trend.approved / total) * 100 : 0;
                  const rejectedPercent = total > 0 ? (trend.rejected / total) * 100 : 0;
                  const pendingPercent = 100 - approvedPercent - rejectedPercent;

                  return (
                    <div key={trend.period}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold">{trend.period}</span>
                        <span className="text-sm text-muted-foreground">
                          {formatNumber(total)} submissions
                        </span>
                      </div>
                      <div className="h-8 bg-gray-100 rounded-lg overflow-hidden flex">
                        {approvedPercent > 0 && (
                          <div
                            className="bg-green-500 flex items-center justify-center text-white text-xs font-semibold"
                            style={{ width: `${approvedPercent}%` }}
                          >
                            {approvedPercent > 10 && `${trend.approved}`}
                          </div>
                        )}
                        {rejectedPercent > 0 && (
                          <div
                            className="bg-red-500 flex items-center justify-center text-white text-xs font-semibold"
                            style={{ width: `${rejectedPercent}%` }}
                          >
                            {rejectedPercent > 10 && `${trend.rejected}`}
                          </div>
                        )}
                        {pendingPercent > 0 && (
                          <div
                            className="bg-yellow-500 flex items-center justify-center text-white text-xs font-semibold"
                            style={{ width: `${pendingPercent}%` }}
                          >
                            {pendingPercent > 10 && `${total - trend.approved - trend.rejected}`}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-1 text-xs">
                        <span className="text-green-600">{trend.approved} approved</span>
                        <span className="text-red-600">{trend.rejected} rejected</span>
                        <span className="text-yellow-600">{total - trend.approved - trend.rejected} pending</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {overall.slaCompliance >= 95 && (
              <Alert className="border-green-600 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>Excellent SLA compliance!</strong> Your team is consistently meeting review deadlines.
                </AlertDescription>
              </Alert>
            )}
            {overall.slaCompliance < 80 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>SLA compliance below target.</strong> Consider reviewing workload distribution and resource allocation.
                </AlertDescription>
              </Alert>
            )}
            {overall.avgReviewTime > 60 && (
              <Alert className="border-yellow-600 bg-yellow-50">
                <Clock className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  <strong>Review times are high.</strong> Average review time is {overall.avgReviewTime} minutes. Consider streamlining the review process.
                </AlertDescription>
              </Alert>
            )}
            {overall.approvalRate < 50 && (
              <Alert className="border-orange-600 bg-orange-50">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  <strong>Low approval rate.</strong> {overall.approvalRate.toFixed(1)}% of applications are approved. Review requirements may need adjustment.
                </AlertDescription>
              </Alert>
            )}
            {overall.approvalRate >= 90 && overall.rejectionRate <= 10 && overall.slaCompliance >= 90 && (
              <Alert className="border-blue-600 bg-blue-50">
                <Award className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <strong>Outstanding performance!</strong> High approval rate, low rejections, and excellent SLA compliance.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
