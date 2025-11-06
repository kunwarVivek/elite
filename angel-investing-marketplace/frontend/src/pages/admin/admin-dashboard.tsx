import React, { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Alert, AlertDescription } from '../../components/ui/alert';
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Users,
  FileText,
  TrendingUp,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  Activity,
  BarChart3,
  Shield,
  DollarSign,
} from 'lucide-react';
import { cn, formatNumber, formatTimeAgo } from '@/lib/utils';

/**
 * Admin Dashboard
 * Central hub for all administrative approval workflows
 * Provides overview of accreditation, KYC, and transaction approvals
 */

interface ApprovalStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  slaBreaches: number;
}

interface QueueStats {
  accreditation: ApprovalStats;
  kyc: ApprovalStats;
  transactions: ApprovalStats;
}

interface RecentActivity {
  id: string;
  type: 'ACCREDITATION' | 'KYC' | 'TRANSACTION';
  action: 'APPROVED' | 'REJECTED' | 'SUBMITTED' | 'REQUESTED_INFO';
  userId: string;
  userName: string;
  reviewerName?: string;
  timestamp: string;
  description: string;
}

interface SLAAlert {
  id: string;
  type: 'ACCREDITATION' | 'KYC' | 'TRANSACTION';
  userId: string;
  userName: string;
  submittedAt: string;
  hoursOverdue: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

const QUEUE_CONFIG = {
  ACCREDITATION: {
    name: 'Accreditation',
    icon: Shield,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    route: '/admin/accreditation-review',
  },
  KYC: {
    name: 'KYC/AML',
    icon: Users,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    route: '/admin/kyc-review',
  },
  TRANSACTION: {
    name: 'Transactions',
    icon: DollarSign,
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200',
    route: '/admin/transaction-review',
  },
};

const ACTION_CONFIG = {
  APPROVED: { icon: CheckCircle, color: 'text-green-600', label: 'Approved' },
  REJECTED: { icon: XCircle, color: 'text-red-600', label: 'Rejected' },
  SUBMITTED: { icon: FileText, color: 'text-blue-600', label: 'Submitted' },
  REQUESTED_INFO: { icon: AlertCircle, color: 'text-yellow-600', label: 'Info Requested' },
};

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [slaAlerts, setSlaAlerts] = useState<SLAAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();

    // Refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:3001/api/admin/dashboard/stats', {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const result = await response.json();

      setQueueStats(result.data.queueStats);
      setRecentActivity(result.data.recentActivity || []);
      setSlaAlerts(result.data.slaAlerts || []);
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const getTotalPending = (): number => {
    if (!queueStats) return 0;
    return (
      queueStats.accreditation.pending +
      queueStats.kyc.pending +
      queueStats.transactions.pending
    );
  };

  const getTotalSLABreaches = (): number => {
    if (!queueStats) return 0;
    return (
      queueStats.accreditation.slaBreaches +
      queueStats.kyc.slaBreaches +
      queueStats.transactions.slaBreaches
    );
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'HIGH':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'MEDIUM':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'LOW':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="container max-w-7xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading dashboard...</span>
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
        <Button onClick={fetchDashboardData} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (!queueStats) {
    return (
      <div className="container max-w-7xl mx-auto py-8 px-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>No dashboard data available</AlertDescription>
        </Alert>
      </div>
    );
  }

  const totalPending = getTotalPending();
  const totalSLABreaches = getTotalSLABreaches();

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Monitor and manage all approval workflows
            </p>
          </div>
          <Button onClick={fetchDashboardData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* SLA Alerts */}
      {totalSLABreaches > 0 && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>SLA Alert:</strong> {totalSLABreaches} {totalSLABreaches === 1 ? 'item requires' : 'items require'} immediate attention due to SLA breaches
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{totalPending}</div>
                <p className="text-xs text-muted-foreground mt-1">Awaiting review</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Approved Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-green-600">
                  {queueStats.accreditation.approved + queueStats.kyc.approved + queueStats.transactions.approved}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Completed</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              SLA Breaches
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className={cn('text-3xl font-bold', totalSLABreaches > 0 ? 'text-red-600' : 'text-gray-600')}>
                  {totalSLABreaches}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Overdue items</p>
              </div>
              <AlertTriangle className={cn('h-8 w-8', totalSLABreaches > 0 ? 'text-red-600' : 'text-gray-400')} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Queues
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">3</div>
                <p className="text-xs text-muted-foreground mt-1">Approval types</p>
              </div>
              <Activity className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Queue Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {Object.entries(QUEUE_CONFIG).map(([key, config]) => {
          const stats = queueStats[key.toLowerCase() as keyof QueueStats];
          const Icon = config.icon;

          return (
            <Card key={key} className="hover:shadow-md transition-shadow">
              <CardHeader className={cn(config.bg, 'border-b', config.border)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={cn('p-2 rounded-lg', config.bg, 'border-2 border-white')}>
                      <Icon className={cn('h-6 w-6', config.color)} />
                    </div>
                    <CardTitle>{config.name}</CardTitle>
                  </div>
                  {stats.slaBreaches > 0 && (
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Pending</span>
                    <span className="text-2xl font-bold text-yellow-600">{stats.pending}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Approved</span>
                    <span className="font-semibold text-green-600">{stats.approved}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Rejected</span>
                    <span className="font-semibold text-red-600">{stats.rejected}</span>
                  </div>
                  {stats.slaBreaches > 0 && (
                    <div className="flex items-center justify-between text-sm pt-2 border-t">
                      <span className="text-red-600 font-medium">SLA Breaches</span>
                      <span className="font-bold text-red-600">{stats.slaBreaches}</span>
                    </div>
                  )}
                  <Button
                    onClick={() => navigate({ to: config.route })}
                    className="w-full mt-4"
                    variant={stats.pending > 0 ? 'default' : 'outline'}
                  >
                    View Queue
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SLA Alerts */}
        {slaAlerts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
                SLA Alerts
              </CardTitle>
              <CardDescription>Items requiring immediate attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {slaAlerts.slice(0, 5).map((alert) => {
                  const config = QUEUE_CONFIG[alert.type];
                  const Icon = config.icon;

                  return (
                    <div
                      key={alert.id}
                      className={cn(
                        'p-4 rounded-lg border-l-4',
                        getPriorityColor(alert.priority)
                      )}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Icon className={cn('h-4 w-4', config.color)} />
                          <span className="font-semibold text-sm">{config.name}</span>
                        </div>
                        <span className="text-xs font-medium px-2 py-1 rounded bg-white border">
                          {alert.priority}
                        </span>
                      </div>
                      <p className="text-sm font-medium mb-1">{alert.userName}</p>
                      <p className="text-xs text-muted-foreground">
                        Submitted {formatTimeAgo(alert.submittedAt)} • {alert.hoursOverdue}h overdue
                      </p>
                    </div>
                  );
                })}
                {slaAlerts.length > 5 && (
                  <Button variant="outline" className="w-full" onClick={() => navigate({ to: '/admin/approval-queue' })}>
                    View All {slaAlerts.length} Alerts
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest approval actions</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.slice(0, 10).map((activity) => {
                  const actionConfig = ACTION_CONFIG[activity.action];
                  const queueConfig = QUEUE_CONFIG[activity.type];
                  const ActionIcon = actionConfig.icon;
                  const QueueIcon = queueConfig.icon;

                  return (
                    <div key={activity.id} className="flex items-start space-x-3 pb-3 border-b last:border-0">
                      <div className={cn('p-2 rounded-lg', queueConfig.bg)}>
                        <QueueIcon className={cn('h-4 w-4', queueConfig.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <ActionIcon className={cn('h-3 w-3', actionConfig.color)} />
                          <span className={cn('text-sm font-semibold', actionConfig.color)}>
                            {actionConfig.label}
                          </span>
                        </div>
                        <p className="text-sm font-medium truncate">{activity.userName}</p>
                        <p className="text-xs text-muted-foreground">{activity.description}</p>
                        {activity.reviewerName && (
                          <p className="text-xs text-muted-foreground mt-1">
                            by {activity.reviewerName}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatTimeAgo(activity.timestamp)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-start"
              onClick={() => navigate({ to: '/admin/approval-queue' })}
            >
              <Clock className="h-6 w-6 mb-2" />
              <span className="font-semibold">My Queue</span>
              <span className="text-xs text-muted-foreground mt-1">
                View items assigned to you
              </span>
            </Button>

            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-start"
              onClick={() => navigate({ to: '/admin/approval-statistics' })}
            >
              <BarChart3 className="h-6 w-6 mb-2" />
              <span className="font-semibold">Statistics</span>
              <span className="text-xs text-muted-foreground mt-1">
                View detailed analytics and metrics
              </span>
            </Button>

            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-start"
              onClick={() => navigate({ to: '/admin/audit-log' })}
            >
              <FileText className="h-6 w-6 mb-2" />
              <span className="font-semibold">Audit Log</span>
              <span className="text-xs text-muted-foreground mt-1">
                Review all approval actions
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
