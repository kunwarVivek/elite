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
  Users,
  Target,
  TrendingUp,
  Building2,
  DollarSign,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  Award,
  Clock,
  CheckCircle,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { cn, formatNumber, formatDate } from '@/lib/utils';

/**
 * Browse Syndicates Page
 * Discover and join investment syndicates led by experienced investors
 * Filter by status, target amount, and investment focus
 */

interface Syndicate {
  id: string;
  name: string;
  description: string;
  leadInvestor: {
    id: string;
    name: string;
    avatar?: string;
    credentials?: string;
  };
  targetAmount: number;
  currentAmount: number;
  memberCount: number;
  maxMembers?: number;
  carryPercentage: number;
  managementFee: number;
  minimumInvestment: number;
  status: 'FORMING' | 'ACTIVE' | 'CLOSED' | 'LIQUIDATED';
  focus: string[];
  createdAt: string;
  deals: number;
  avgReturn?: number;
}

interface SyndicateFilters {
  status: string;
  focus: string;
  minTarget: number;
  maxTarget: number;
  search: string;
}

const STATUS_CONFIG = {
  FORMING: {
    color: 'text-yellow-600',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    label: 'Forming',
    description: 'Accepting new members',
  },
  ACTIVE: {
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200',
    label: 'Active',
    description: 'Actively investing',
  },
  CLOSED: {
    color: 'text-gray-600',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    label: 'Closed',
    description: 'Not accepting members',
  },
  LIQUIDATED: {
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    label: 'Liquidated',
    description: 'Completed',
  },
};

const FOCUS_AREAS = [
  'All Focus Areas',
  'SaaS',
  'Fintech',
  'Healthcare',
  'AI/ML',
  'Enterprise',
  'Consumer',
  'CleanTech',
  'EdTech',
  'Deep Tech',
];

export function BrowseSyndicatesPage() {
  const navigate = useNavigate();
  const [syndicates, setSyndicates] = useState<Syndicate[]>([]);
  const [filteredSyndicates, setFilteredSyndicates] = useState<Syndicate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState<SyndicateFilters>({
    status: 'ALL',
    focus: 'All Focus Areas',
    minTarget: 0,
    maxTarget: 10000000,
    search: '',
  });

  useEffect(() => {
    fetchSyndicates();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [syndicates, filters]);

  const fetchSyndicates = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:3001/api/syndicates', {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch syndicates');
      }

      const result = await response.json();
      setSyndicates(result.data.syndicates || []);
    } catch (err: any) {
      console.error('Error fetching syndicates:', err);
      setError(err.message || 'Failed to load syndicates');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...syndicates];

    // Apply status filter
    if (filters.status !== 'ALL') {
      filtered = filtered.filter((s) => s.status === filters.status);
    }

    // Apply focus filter
    if (filters.focus !== 'All Focus Areas') {
      filtered = filtered.filter((s) => s.focus.includes(filters.focus));
    }

    // Apply target amount filter
    filtered = filtered.filter(
      (s) => s.targetAmount >= filters.minTarget && s.targetAmount <= filters.maxTarget
    );

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(searchLower) ||
          s.description.toLowerCase().includes(searchLower) ||
          s.leadInvestor.name.toLowerCase().includes(searchLower) ||
          s.focus.some((f) => f.toLowerCase().includes(searchLower))
      );
    }

    setFilteredSyndicates(filtered);
  };

  const getFundingProgress = (syndicate: Syndicate): number => {
    return (syndicate.currentAmount / syndicate.targetAmount) * 100;
  };

  const canJoin = (syndicate: Syndicate): boolean => {
    if (syndicate.status !== 'FORMING' && syndicate.status !== 'ACTIVE') return false;
    if (syndicate.maxMembers && syndicate.memberCount >= syndicate.maxMembers) return false;
    return true;
  };

  if (isLoading) {
    return (
      <div className="container max-w-7xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading syndicates...</span>
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
        <Button onClick={fetchSyndicates} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">Investment Syndicates</h1>
            <p className="text-muted-foreground">
              Join syndicates led by experienced investors
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={fetchSyndicates}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => navigate({ to: '/syndicates/create' })}>
              <Plus className="h-4 w-4 mr-2" />
              Create Syndicate
            </Button>
          </div>
        </div>

        {/* Info Alert */}
        <Alert className="border-blue-600 bg-blue-50 mb-6">
          <Users className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>What are Syndicates?</strong> Investment syndicates allow you to invest alongside
            experienced lead investors who negotiate terms, conduct due diligence, and manage the deal.
          </AlertDescription>
        </Alert>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search syndicates by name, lead investor, or focus area..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="pl-10"
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              size="sm"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              <ChevronDown className={cn('h-4 w-4 ml-2 transition-transform', showFilters && 'rotate-180')} />
            </Button>

            <span className="text-sm text-muted-foreground">
              {filteredSyndicates.length} {filteredSyndicates.length === 1 ? 'syndicate' : 'syndicates'}
            </span>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filter Syndicates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Status</Label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="FORMING">Forming</option>
                  <option value="ACTIVE">Active</option>
                  <option value="CLOSED">Closed</option>
                  <option value="LIQUIDATED">Liquidated</option>
                </select>
              </div>

              <div>
                <Label>Focus Area</Label>
                <select
                  value={filters.focus}
                  onChange={(e) => setFilters({ ...filters, focus: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg"
                >
                  {FOCUS_AREAS.map((focus) => (
                    <option key={focus} value={focus}>
                      {focus}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Min Target</Label>
                <Input
                  type="number"
                  value={filters.minTarget}
                  onChange={(e) => setFilters({ ...filters, minTarget: Number(e.target.value) })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Max Target</Label>
                <Input
                  type="number"
                  value={filters.maxTarget}
                  onChange={(e) => setFilters({ ...filters, maxTarget: Number(e.target.value) })}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <Button
                onClick={() =>
                  setFilters({
                    status: 'ALL',
                    focus: 'All Focus Areas',
                    minTarget: 0,
                    maxTarget: 10000000,
                    search: '',
                  })
                }
                variant="outline"
              >
                Reset Filters
              </Button>
              <span className="text-sm text-muted-foreground">
                Showing {filteredSyndicates.length} of {syndicates.length} syndicates
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Syndicates Grid */}
      {filteredSyndicates.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No syndicates found</h3>
            <p className="text-muted-foreground mb-4">
              {filters.search || filters.status !== 'ALL'
                ? 'Try adjusting your filters'
                : 'Be the first to create a syndicate'}
            </p>
            <Button onClick={() => navigate({ to: '/syndicates/create' })}>
              <Plus className="h-4 w-4 mr-2" />
              Create Syndicate
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSyndicates.map((syndicate) => {
            const statusConfig = STATUS_CONFIG[syndicate.status];
            const progress = getFundingProgress(syndicate);
            const joinable = canJoin(syndicate);

            return (
              <Card
                key={syndicate.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate({ to: `/syndicates/${syndicate.id}` })}
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">{syndicate.name}</CardTitle>
                      <div className="flex items-center space-x-2">
                        <span className={cn('text-xs px-2 py-1 rounded border', statusConfig.bg, statusConfig.color, statusConfig.border)}>
                          {statusConfig.label}
                        </span>
                        {joinable && (
                          <span className="text-xs px-2 py-1 rounded bg-green-50 text-green-700 border border-green-200">
                            Open to Join
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Lead Investor */}
                  <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      {syndicate.leadInvestor.avatar ? (
                        <img
                          src={syndicate.leadInvestor.avatar}
                          alt={syndicate.leadInvestor.name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <Award className="h-5 w-5 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{syndicate.leadInvestor.name}</p>
                      <p className="text-xs text-muted-foreground">Lead Investor</p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {syndicate.description}
                  </p>

                  {/* Focus Areas */}
                  <div className="flex flex-wrap gap-1 mb-4">
                    {syndicate.focus.slice(0, 3).map((focus) => (
                      <span
                        key={focus}
                        className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded"
                      >
                        {focus}
                      </span>
                    ))}
                    {syndicate.focus.length > 3 && (
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                        +{syndicate.focus.length - 3} more
                      </span>
                    )}
                  </div>

                  {/* Metrics */}
                  <div className="space-y-3 mb-4">
                    <div>
                      <div className="flex items-center justify-between mb-1 text-sm">
                        <span className="text-muted-foreground">Target</span>
                        <span className="font-semibold">${formatNumber(syndicate.targetAmount)}</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full', progress >= 100 ? 'bg-green-600' : 'bg-blue-600')}
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                        <span>${formatNumber(syndicate.currentAmount)} raised</span>
                        <span>{progress.toFixed(0)}%</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground mb-1">Members</p>
                        <p className="font-semibold">
                          {syndicate.memberCount}
                          {syndicate.maxMembers && `/${syndicate.maxMembers}`}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Min Investment</p>
                        <p className="font-semibold">${formatNumber(syndicate.minimumInvestment)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Carry</p>
                        <p className="font-semibold">{syndicate.carryPercentage}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Deals</p>
                        <p className="font-semibold">{syndicate.deals}</p>
                      </div>
                    </div>

                    {syndicate.avgReturn !== undefined && (
                      <div className="p-2 bg-green-50 rounded text-center">
                        <p className="text-xs text-muted-foreground mb-1">Avg Return</p>
                        <p className="text-lg font-bold text-green-600">
                          +{syndicate.avgReturn.toFixed(1)}%
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <Button
                    className="w-full"
                    variant={joinable ? 'default' : 'outline'}
                    disabled={!joinable}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate({ to: `/syndicates/${syndicate.id}` });
                    }}
                  >
                    {joinable ? (
                      <>
                        Join Syndicate
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    ) : (
                      'View Details'
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
