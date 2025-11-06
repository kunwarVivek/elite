import React, { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Alert, AlertDescription } from '../../components/ui/alert';
import {
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Users,
  Shield,
  DollarSign,
  FileText,
  RefreshCw,
  AlertCircle,
  Calendar,
  TrendingUp,
  Activity,
} from 'lucide-react';
import { cn, formatNumber, formatTimeAgo } from '@/lib/utils';

/**
 * My Queue Page
 * Personalized view of approval items assigned to the current administrator
 * Organized by priority and SLA deadlines
 */

interface MyQueueItem {
  id: string;
  type: 'ACCREDITATION' | 'KYC' | 'TRANSACTION';
  userId: string;
  userName: string;
  userEmail: string;
  status: 'PENDING' | 'IN_REVIEW' | 'INFO_REQUESTED';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  submittedAt: string;
  assignedAt: string;
  slaDeadline: string;
  hoursRemaining: number;
  details: {
    method?: string;
    amount?: number;
    riskScore?: number;
  };
}

interface QueueStats {
  total: number;
  urgent: number;
  slaBreaches: number;
  completedToday: number;
  avgReviewTime: number;
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

const STATUS_CONFIG = {
  PENDING: { icon: Clock, color: 'text-yellow-600', label: 'Pending' },
  IN_REVIEW: { icon: FileText, color: 'text-blue-600', label: 'In Review' },
  INFO_REQUESTED: { icon: AlertCircle, color: 'text-orange-600', label: 'Info Requested' },
};

const PRIORITY_CONFIG = {
  HIGH: { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: 'High Priority' },
  MEDIUM: { color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', label: 'Medium Priority' },
  LOW: { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', label: 'Low Priority' },
};

export function MyQueuePage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<MyQueueItem[]>([]);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'all' | 'urgent' | 'sla'>('all');

  useEffect(() => {
    fetchMyQueue();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchMyQueue, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchMyQueue = async () => {
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:3001/api/admin/my-queue', {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch queue');
      }

      const result = await response.json();
      setItems(result.data.items || []);
      setStats(result.data.stats || null);
    } catch (err: any) {
      console.error('Error fetching queue:', err);
      setError(err.message || 'Failed to load queue');
    } finally {
      setIsLoading(false);
    }
  };

  const getFilteredItems = (): MyQueueItem[] => {
    switch (selectedTab) {
      case 'urgent':
        return items.filter((item) => item.priority === 'HIGH' || item.hoursRemaining <= 24);
      case 'sla':
        return items.filter((item) => item.hoursRemaining < 0);
      case 'all':
      default:
        return items;
    }
  };

  const handleViewItem = (item: MyQueueItem) => {
    const routes = {
      ACCREDITATION: '/admin/accreditation-review',
      KYC: '/admin/kyc-review',
      TRANSACTION: '/admin/transaction-review',
    };

    navigate({ to: `${routes[item.type]}?id=${item.id}` });
  };

  if (isLoading) {
    return (
      <div className="container max-w-7xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading your queue...</span>
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
        <Button onClick={fetchMyQueue} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  const filteredItems = getFilteredItems();

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Queue</h1>
            <p className="text-muted-foreground">
              Items assigned to you • Last updated {formatTimeAgo(new Date().toISOString())}
            </p>
          </div>
          <Button onClick={fetchMyQueue} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground mt-1">In your queue</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Urgent</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn('text-3xl font-bold', stats.urgent > 0 ? 'text-orange-600' : 'text-gray-600')}>
                {stats.urgent}
              </div>
              <p className="text-xs text-muted-foreground mt-1">High priority / &lt;24h</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">SLA Breaches</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn('text-3xl font-bold', stats.slaBreaches > 0 ? 'text-red-600' : 'text-gray-600')}>
                {stats.slaBreaches}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Past deadline</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completed Today</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.completedToday}</div>
              <p className="text-xs text-muted-foreground mt-1">Reviews finished</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg Review Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.avgReviewTime}m</div>
              <p className="text-xs text-muted-foreground mt-1">Per item</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* SLA Breach Alert */}
      {stats && stats.slaBreaches > 0 && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Action Required:</strong> You have {stats.slaBreaches} {stats.slaBreaches === 1 ? 'item' : 'items'} past SLA deadline. Please review immediately.
          </AlertDescription>
        </Alert>
      )}

      {/* Tab Navigation */}
      <div className="flex items-center space-x-2 mb-6">
        <Button
          variant={selectedTab === 'all' ? 'default' : 'outline'}
          onClick={() => setSelectedTab('all')}
        >
          <Activity className="h-4 w-4 mr-2" />
          All Items ({items.length})
        </Button>
        <Button
          variant={selectedTab === 'urgent' ? 'default' : 'outline'}
          onClick={() => setSelectedTab('urgent')}
        >
          <TrendingUp className="h-4 w-4 mr-2" />
          Urgent ({stats?.urgent || 0})
        </Button>
        <Button
          variant={selectedTab === 'sla' ? 'default' : 'outline'}
          onClick={() => setSelectedTab('sla')}
          className={stats && stats.slaBreaches > 0 ? 'border-red-600' : ''}
        >
          <AlertTriangle className="h-4 w-4 mr-2" />
          SLA Breaches ({stats?.slaBreaches || 0})
        </Button>
      </div>

      {/* Queue Items */}
      {filteredItems.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            {selectedTab === 'all' ? (
              <>
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Your queue is empty!</h3>
                <p className="text-muted-foreground mb-4">
                  Great job! You've completed all your assigned items.
                </p>
                <Button onClick={() => navigate({ to: '/admin/approval-queue' })} variant="outline">
                  View Unassigned Items
                </Button>
              </>
            ) : (
              <>
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No items in this category</h3>
                <p className="text-muted-foreground">Try switching to a different tab</p>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const typeConfig = TYPE_CONFIG[item.type];
            const statusConfig = STATUS_CONFIG[item.status];
            const priorityConfig = PRIORITY_CONFIG[item.priority];
            const TypeIcon = typeConfig.icon;
            const StatusIcon = statusConfig.icon;
            const isSLABreach = item.hoursRemaining < 0;
            const isUrgent = item.priority === 'HIGH' || item.hoursRemaining <= 24;

            return (
              <Card
                key={item.id}
                className={cn(
                  'hover:shadow-md transition-shadow cursor-pointer',
                  isSLABreach && 'border-l-4 border-red-600',
                  isUrgent && !isSLABreach && 'border-l-4 border-orange-500'
                )}
                onClick={() => handleViewItem(item)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      {/* Type Icon */}
                      <div className={cn('p-3 rounded-lg', typeConfig.bg)}>
                        <TypeIcon className={cn('h-6 w-6', typeConfig.color)} />
                      </div>

                      {/* Main Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-semibold">{item.userName}</h3>
                          {item.priority === 'HIGH' && (
                            <span className={cn('px-2 py-0.5 rounded text-xs font-medium', priorityConfig.bg, priorityConfig.color, 'border', priorityConfig.border)}>
                              {priorityConfig.label}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{item.userEmail}</p>

                        <div className="flex flex-wrap items-center gap-3 text-sm">
                          <div className="flex items-center space-x-1">
                            <TypeIcon className={cn('h-3 w-3', typeConfig.color)} />
                            <span className="text-muted-foreground">{typeConfig.name}</span>
                            {item.details.method && (
                              <span className="text-muted-foreground">• {item.details.method}</span>
                            )}
                          </div>

                          <div className="flex items-center space-x-1">
                            <StatusIcon className={cn('h-3 w-3', statusConfig.color)} />
                            <span className={statusConfig.color}>{statusConfig.label}</span>
                          </div>

                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              Assigned {formatTimeAgo(item.assignedAt)}
                            </span>
                          </div>
                        </div>

                        {/* Additional Details */}
                        {(item.details.amount || item.details.riskScore !== undefined) && (
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            {item.details.amount && (
                              <span className="font-semibold text-green-600">
                                ${formatNumber(item.details.amount)}
                              </span>
                            )}
                            {item.details.riskScore !== undefined && (
                              <span className={cn(
                                'font-semibold',
                                item.details.riskScore < 30 ? 'text-green-600' :
                                item.details.riskScore < 60 ? 'text-yellow-600' :
                                item.details.riskScore < 80 ? 'text-orange-600' :
                                'text-red-600'
                              )}>
                                Risk: {item.details.riskScore}/100
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Side - SLA & Actions */}
                    <div className="flex flex-col items-end space-y-2">
                      <div className={cn(
                        'text-right px-3 py-2 rounded-lg',
                        isSLABreach ? 'bg-red-50 text-red-600' :
                        item.hoursRemaining <= 24 ? 'bg-orange-50 text-orange-600' :
                        'bg-gray-50 text-muted-foreground'
                      )}>
                        <div className="flex items-center space-x-1">
                          {isSLABreach ? (
                            <AlertTriangle className="h-4 w-4" />
                          ) : (
                            <Clock className="h-4 w-4" />
                          )}
                          <span className="text-sm font-semibold">
                            {isSLABreach
                              ? `${Math.abs(item.hoursRemaining)}h overdue`
                              : item.hoursRemaining <= 24
                              ? `${item.hoursRemaining}h left`
                              : `${Math.floor(item.hoursRemaining / 24)}d ${item.hoursRemaining % 24}h`}
                          </span>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant={isSLABreach ? 'destructive' : isUrgent ? 'default' : 'outline'}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewItem(item);
                        }}
                      >
                        Review Now
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Quick Actions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-start"
              onClick={() => navigate({ to: '/admin/approval-queue' })}
            >
              <FileText className="h-6 w-6 mb-2" />
              <span className="font-semibold">Browse All Approvals</span>
              <span className="text-xs text-muted-foreground mt-1">
                View and assign unassigned items
              </span>
            </Button>

            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-start"
              onClick={() => navigate({ to: '/admin/approval-statistics' })}
            >
              <Activity className="h-6 w-6 mb-2" />
              <span className="font-semibold">View Performance</span>
              <span className="text-xs text-muted-foreground mt-1">
                Track your review metrics
              </span>
            </Button>

            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-start"
              onClick={() => navigate({ to: '/admin/admin-dashboard' })}
            >
              <TrendingUp className="h-6 w-6 mb-2" />
              <span className="font-semibold">Admin Dashboard</span>
              <span className="text-xs text-muted-foreground mt-1">
                Overview of all approval workflows
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
