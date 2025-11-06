import React, { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Alert, AlertDescription } from '../../components/ui/alert';
import {
  Search,
  Filter,
  Clock,
  AlertTriangle,
  Users,
  Shield,
  DollarSign,
  FileText,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  User,
  Calendar,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { cn, formatNumber, formatDate, formatTimeAgo } from '@/lib/utils';

/**
 * Approval Queue Page
 * Unified view of all approval requests across different types
 * Supports filtering, sorting, and bulk assignment
 */

interface ApprovalItem {
  id: string;
  type: 'ACCREDITATION' | 'KYC' | 'TRANSACTION';
  userId: string;
  userName: string;
  userEmail: string;
  status: 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'INFO_REQUESTED';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  submittedAt: string;
  assignedTo?: string;
  assignedToName?: string;
  slaDeadline: string;
  hoursRemaining: number;
  details: {
    method?: string;
    amount?: number;
    investmentId?: string;
    riskScore?: number;
  };
}

interface QueueFilters {
  type: string;
  status: string;
  priority: string;
  assignedTo: string;
  search: string;
  slaOnly: boolean;
}

const TYPE_CONFIG = {
  ACCREDITATION: {
    name: 'Accreditation',
    icon: Shield,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  KYC: {
    name: 'KYC/AML',
    icon: Users,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
  },
  TRANSACTION: {
    name: 'Transaction',
    icon: DollarSign,
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200',
  },
};

const STATUS_CONFIG = {
  PENDING: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Pending' },
  IN_REVIEW: { icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50', label: 'In Review' },
  APPROVED: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', label: 'Approved' },
  REJECTED: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', label: 'Rejected' },
  INFO_REQUESTED: { icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50', label: 'Info Requested' },
};

const PRIORITY_CONFIG = {
  HIGH: { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: 'High' },
  MEDIUM: { color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', label: 'Medium' },
  LOW: { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', label: 'Low' },
};

export function ApprovalQueuePage() {
  const navigate = useNavigate();
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [filteredApprovals, setFilteredApprovals] = useState<ApprovalItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'sla' | 'priority' | 'date'>('sla');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [filters, setFilters] = useState<QueueFilters>({
    type: 'ALL',
    status: 'PENDING',
    priority: 'ALL',
    assignedTo: 'ALL',
    search: '',
    slaOnly: false,
  });

  useEffect(() => {
    fetchApprovals();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [approvals, filters, sortBy, sortOrder]);

  const fetchApprovals = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:3001/api/admin/approvals', {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch approvals');
      }

      const result = await response.json();
      setApprovals(result.data.approvals || []);
    } catch (err: any) {
      console.error('Error fetching approvals:', err);
      setError(err.message || 'Failed to load approvals');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...approvals];

    // Apply type filter
    if (filters.type !== 'ALL') {
      filtered = filtered.filter((item) => item.type === filters.type);
    }

    // Apply status filter
    if (filters.status !== 'ALL') {
      filtered = filtered.filter((item) => item.status === filters.status);
    }

    // Apply priority filter
    if (filters.priority !== 'ALL') {
      filtered = filtered.filter((item) => item.priority === filters.priority);
    }

    // Apply assignment filter
    if (filters.assignedTo !== 'ALL') {
      if (filters.assignedTo === 'UNASSIGNED') {
        filtered = filtered.filter((item) => !item.assignedTo);
      } else if (filters.assignedTo === 'ME') {
        const currentUserId = localStorage.getItem('user_id');
        filtered = filtered.filter((item) => item.assignedTo === currentUserId);
      }
    }

    // Apply SLA filter
    if (filters.slaOnly) {
      filtered = filtered.filter((item) => item.hoursRemaining < 0);
    }

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.userName.toLowerCase().includes(searchLower) ||
          item.userEmail.toLowerCase().includes(searchLower) ||
          item.id.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'sla':
          comparison = a.hoursRemaining - b.hoursRemaining;
          break;
        case 'priority':
          const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
          comparison = priorityOrder[b.priority] - priorityOrder[a.priority];
          break;
        case 'date':
          comparison = new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredApprovals(filtered);
  };

  const handleAssignToMe = async (approvalId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:3001/api/admin/approvals/${approvalId}/assign`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ assignToMe: true }),
      });

      if (!response.ok) {
        throw new Error('Failed to assign approval');
      }

      await fetchApprovals();
    } catch (err: any) {
      console.error('Error assigning approval:', err);
      alert(err.message || 'Failed to assign approval');
    }
  };

  const handleViewDetails = (approval: ApprovalItem) => {
    const routes = {
      ACCREDITATION: '/admin/accreditation-review',
      KYC: '/admin/kyc-review',
      TRANSACTION: '/admin/transaction-review',
    };

    navigate({ to: `${routes[approval.type]}?id=${approval.id}` });
  };

  const toggleSort = (newSortBy: 'sla' | 'priority' | 'date') => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  };

  if (isLoading) {
    return (
      <div className="container max-w-7xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading approval queue...</span>
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
        <Button onClick={fetchApprovals} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  const slaBreachCount = filteredApprovals.filter((item) => item.hoursRemaining < 0).length;

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Approval Queue</h1>
            <p className="text-muted-foreground">
              {filteredApprovals.length} {filteredApprovals.length === 1 ? 'item' : 'items'}
              {slaBreachCount > 0 && (
                <span className="text-red-600 font-semibold ml-2">
                  • {slaBreachCount} SLA {slaBreachCount === 1 ? 'breach' : 'breaches'}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button onClick={() => setShowFilters(!showFilters)} variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {showFilters ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
            </Button>
            <Button onClick={fetchApprovals} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div>
                <Label>Type</Label>
                <select
                  value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg"
                >
                  <option value="ALL">All Types</option>
                  <option value="ACCREDITATION">Accreditation</option>
                  <option value="KYC">KYC/AML</option>
                  <option value="TRANSACTION">Transaction</option>
                </select>
              </div>

              <div>
                <Label>Status</Label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="IN_REVIEW">In Review</option>
                  <option value="INFO_REQUESTED">Info Requested</option>
                </select>
              </div>

              <div>
                <Label>Priority</Label>
                <select
                  value={filters.priority}
                  onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg"
                >
                  <option value="ALL">All Priorities</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
              </div>

              <div>
                <Label>Assignment</Label>
                <select
                  value={filters.assignedTo}
                  onChange={(e) => setFilters({ ...filters, assignedTo: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg"
                >
                  <option value="ALL">All Items</option>
                  <option value="ME">Assigned to Me</option>
                  <option value="UNASSIGNED">Unassigned</option>
                </select>
              </div>

              <div>
                <Label>SLA Status</Label>
                <label className="flex items-center mt-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.slaOnly}
                    onChange={(e) => setFilters({ ...filters, slaOnly: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm">Breaches Only</span>
                </label>
              </div>

              <div>
                <Label>Search</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Name, email, ID..."
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() =>
                  setFilters({
                    type: 'ALL',
                    status: 'PENDING',
                    priority: 'ALL',
                    assignedTo: 'ALL',
                    search: '',
                    slaOnly: false,
                  })
                }
              >
                Reset Filters
              </Button>
              <div className="text-sm text-muted-foreground">
                Showing {filteredApprovals.length} of {approvals.length} items
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sort Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-muted-foreground">Sort by:</span>
          <Button
            variant={sortBy === 'sla' ? 'default' : 'outline'}
            size="sm"
            onClick={() => toggleSort('sla')}
          >
            SLA Deadline
            {sortBy === 'sla' && (sortOrder === 'asc' ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />)}
          </Button>
          <Button
            variant={sortBy === 'priority' ? 'default' : 'outline'}
            size="sm"
            onClick={() => toggleSort('priority')}
          >
            Priority
            {sortBy === 'priority' && (sortOrder === 'asc' ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />)}
          </Button>
          <Button
            variant={sortBy === 'date' ? 'default' : 'outline'}
            size="sm"
            onClick={() => toggleSort('date')}
          >
            Date Submitted
            {sortBy === 'date' && (sortOrder === 'asc' ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />)}
          </Button>
        </div>
      </div>

      {/* Approvals List */}
      {filteredApprovals.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No approvals found</h3>
            <p className="text-muted-foreground mb-4">
              {filters.search || filters.type !== 'ALL' || filters.status !== 'PENDING'
                ? 'Try adjusting your filters'
                : 'The approval queue is empty'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredApprovals.map((approval) => {
            const typeConfig = TYPE_CONFIG[approval.type];
            const statusConfig = STATUS_CONFIG[approval.status];
            const priorityConfig = PRIORITY_CONFIG[approval.priority];
            const TypeIcon = typeConfig.icon;
            const StatusIcon = statusConfig.icon;
            const isSLABreach = approval.hoursRemaining < 0;

            return (
              <Card
                key={approval.id}
                className={cn(
                  'hover:shadow-md transition-shadow cursor-pointer',
                  isSLABreach && 'border-l-4 border-red-600'
                )}
                onClick={() => handleViewDetails(approval)}
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
                          <h3 className="font-semibold">{approval.userName}</h3>
                          <span className={cn('px-2 py-0.5 rounded text-xs font-medium', priorityConfig.bg, priorityConfig.color, 'border', priorityConfig.border)}>
                            {priorityConfig.label}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{approval.userEmail}</p>

                        <div className="flex flex-wrap items-center gap-3 text-sm">
                          <div className="flex items-center space-x-1">
                            <TypeIcon className={cn('h-3 w-3', typeConfig.color)} />
                            <span className="text-muted-foreground">{typeConfig.name}</span>
                            {approval.details.method && (
                              <span className="text-muted-foreground">• {approval.details.method}</span>
                            )}
                          </div>

                          <div className="flex items-center space-x-1">
                            <StatusIcon className={cn('h-3 w-3', statusConfig.color)} />
                            <span className={statusConfig.color}>{statusConfig.label}</span>
                          </div>

                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              Submitted {formatTimeAgo(approval.submittedAt)}
                            </span>
                          </div>

                          {approval.assignedToName && (
                            <div className="flex items-center space-x-1">
                              <User className="h-3 w-3 text-muted-foreground" />
                              <span className="text-muted-foreground">Assigned to {approval.assignedToName}</span>
                            </div>
                          )}
                        </div>

                        {/* Additional Details */}
                        {(approval.details.amount || approval.details.riskScore !== undefined) && (
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            {approval.details.amount && (
                              <span className="font-semibold text-green-600">
                                ${formatNumber(approval.details.amount)}
                              </span>
                            )}
                            {approval.details.riskScore !== undefined && (
                              <span className="text-muted-foreground">
                                Risk: {approval.details.riskScore}/100
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Side - SLA & Actions */}
                    <div className="flex flex-col items-end space-y-2">
                      <div className={cn('text-right', isSLABreach ? 'text-red-600' : 'text-muted-foreground')}>
                        <div className="flex items-center space-x-1">
                          {isSLABreach ? (
                            <AlertTriangle className="h-4 w-4" />
                          ) : (
                            <Clock className="h-4 w-4" />
                          )}
                          <span className="text-sm font-semibold">
                            {isSLABreach
                              ? `${Math.abs(approval.hoursRemaining)}h overdue`
                              : `${approval.hoursRemaining}h remaining`}
                          </span>
                        </div>
                        <p className="text-xs mt-1">
                          SLA: {formatDate(approval.slaDeadline)}
                        </p>
                      </div>

                      {!approval.assignedTo && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAssignToMe(approval.id);
                          }}
                        >
                          Assign to Me
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
