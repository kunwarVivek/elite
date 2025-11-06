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
  TrendingUp,
  TrendingDown,
  Building2,
  DollarSign,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  ArrowUpDown,
  Download,
  Eye,
  Calendar,
  PieChart,
  BarChart3,
} from 'lucide-react';
import { cn, formatNumber, formatDate } from '@/lib/utils';

/**
 * Portfolio Holdings Page
 * Comprehensive view of all investments with filtering and sorting
 * Shows detailed performance metrics for each holding
 */

interface Holding {
  id: string;
  amount: number;
  equity: number;
  shares: number;
  currentValue: number;
  costBasis: number;
  unrealizedGain: number;
  unrealizedGainPercent: number;
  status: string;
  investedAt: string;
  lastValuationDate?: string;
  pitch: {
    id: string;
    startup: {
      id: string;
      name: string;
      logo?: string;
      industry: string;
      stage: string;
      location: string;
    };
    valuation: number;
  };
}

interface HoldingsFilters {
  status: string;
  industry: string;
  stage: string;
  search: string;
  minInvestment: number;
  maxInvestment: number;
}

const STATUS_CONFIG = {
  PENDING: { color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', label: 'Pending' },
  APPROVED: { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', label: 'Approved' },
  ESCROW: { color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', label: 'In Escrow' },
  COMPLETED: { color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', label: 'Active' },
  CANCELLED: { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: 'Cancelled' },
};

const INDUSTRIES = ['All Industries', 'SaaS', 'Fintech', 'Healthcare', 'E-commerce', 'AI/ML', 'EdTech', 'CleanTech', 'Biotech', 'Consumer', 'Enterprise'];
const STAGES = ['All Stages', 'Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C+', 'Growth'];

export function PortfolioHoldingsPage() {
  const navigate = useNavigate();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [filteredHoldings, setFilteredHoldings] = useState<Holding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'value' | 'gain' | 'date' | 'name'>('value');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [filters, setFilters] = useState<HoldingsFilters>({
    status: 'COMPLETED',
    industry: 'All Industries',
    stage: 'All Stages',
    search: '',
    minInvestment: 0,
    maxInvestment: 10000000,
  });

  useEffect(() => {
    fetchHoldings();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [holdings, filters, sortBy, sortOrder]);

  const fetchHoldings = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:3001/api/investments', {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch holdings');
      }

      const result = await response.json();
      setHoldings(result.data.investments || []);
    } catch (err: any) {
      console.error('Error fetching holdings:', err);
      setError(err.message || 'Failed to load holdings');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...holdings];

    // Apply status filter
    if (filters.status !== 'ALL') {
      filtered = filtered.filter((h) => h.status === filters.status);
    }

    // Apply industry filter
    if (filters.industry !== 'All Industries') {
      filtered = filtered.filter((h) => h.pitch.startup.industry === filters.industry);
    }

    // Apply stage filter
    if (filters.stage !== 'All Stages') {
      filtered = filtered.filter((h) => h.pitch.startup.stage === filters.stage);
    }

    // Apply investment range filter
    filtered = filtered.filter(
      (h) => h.amount >= filters.minInvestment && h.amount <= filters.maxInvestment
    );

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (h) =>
          h.pitch.startup.name.toLowerCase().includes(searchLower) ||
          h.pitch.startup.industry.toLowerCase().includes(searchLower) ||
          h.pitch.startup.location.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'value':
          comparison = (a.currentValue || a.amount) - (b.currentValue || b.amount);
          break;
        case 'gain':
          comparison = (a.unrealizedGainPercent || 0) - (b.unrealizedGainPercent || 0);
          break;
        case 'date':
          comparison = new Date(a.investedAt).getTime() - new Date(b.investedAt).getTime();
          break;
        case 'name':
          comparison = a.pitch.startup.name.localeCompare(b.pitch.startup.name);
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredHoldings(filtered);
  };

  const toggleSort = (newSortBy: typeof sortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
  };

  const getTotalValue = (): number => {
    return filteredHoldings.reduce((sum, h) => sum + (h.currentValue || h.amount), 0);
  };

  const getTotalGain = (): number => {
    return filteredHoldings.reduce((sum, h) => sum + (h.unrealizedGain || 0), 0);
  };

  const getTotalGainPercent = (): number => {
    const totalInvested = filteredHoldings.reduce((sum, h) => sum + h.amount, 0);
    const totalGain = getTotalGain();
    return totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;
  };

  const getReturnColor = (value: number): string => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const exportHoldings = () => {
    // TODO: Implement CSV export
    alert('Export functionality coming soon');
  };

  if (isLoading) {
    return (
      <div className="container max-w-7xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading holdings...</span>
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
        <Button onClick={fetchHoldings} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Portfolio Holdings</h1>
            <p className="text-muted-foreground">
              {filteredHoldings.length} {filteredHoldings.length === 1 ? 'investment' : 'investments'}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={exportHoldings}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" onClick={fetchHoldings}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search by company name, industry, or location..."
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

            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">Sort:</span>
              <Button
                variant={sortBy === 'value' ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleSort('value')}
              >
                Value
                {sortBy === 'value' && <ArrowUpDown className="h-3 w-3 ml-1" />}
              </Button>
              <Button
                variant={sortBy === 'gain' ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleSort('gain')}
              >
                Gain
                {sortBy === 'gain' && <ArrowUpDown className="h-3 w-3 ml-1" />}
              </Button>
              <Button
                variant={sortBy === 'date' ? 'default' : 'outline'}
                size="sm"
                onClick={() => toggleSort('date')}
              >
                Date
                {sortBy === 'date' && <ArrowUpDown className="h-3 w-3 ml-1" />}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filter Holdings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <Label>Status</Label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="COMPLETED">Active Only</option>
                  <option value="PENDING">Pending</option>
                  <option value="ESCROW">In Escrow</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div>
                <Label>Industry</Label>
                <select
                  value={filters.industry}
                  onChange={(e) => setFilters({ ...filters, industry: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg"
                >
                  {INDUSTRIES.map((industry) => (
                    <option key={industry} value={industry}>
                      {industry}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Stage</Label>
                <select
                  value={filters.stage}
                  onChange={(e) => setFilters({ ...filters, stage: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border rounded-lg"
                >
                  {STAGES.map((stage) => (
                    <option key={stage} value={stage}>
                      {stage}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label>Min Investment</Label>
                <Input
                  type="number"
                  value={filters.minInvestment}
                  onChange={(e) => setFilters({ ...filters, minInvestment: Number(e.target.value) })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Max Investment</Label>
                <Input
                  type="number"
                  value={filters.maxInvestment}
                  onChange={(e) => setFilters({ ...filters, maxInvestment: Number(e.target.value) })}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <Button
                onClick={() =>
                  setFilters({
                    status: 'COMPLETED',
                    industry: 'All Industries',
                    stage: 'All Stages',
                    search: '',
                    minInvestment: 0,
                    maxInvestment: 10000000,
                  })
                }
                variant="outline"
              >
                Reset Filters
              </Button>
              <span className="text-sm text-muted-foreground">
                Showing {filteredHoldings.length} of {holdings.length} holdings
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">${formatNumber(getTotalValue())}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Gain/Loss</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={cn('text-3xl font-bold', getReturnColor(getTotalGain()))}>
              {getTotalGain() >= 0 ? '+' : ''}${formatNumber(Math.abs(getTotalGain()))}
            </p>
            <p className={cn('text-sm mt-1', getReturnColor(getTotalGainPercent()))}>
              {getTotalGainPercent() >= 0 ? '+' : ''}{getTotalGainPercent().toFixed(2)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Holdings Count</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{filteredHoldings.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Holdings List */}
      {filteredHoldings.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No holdings found</h3>
            <p className="text-muted-foreground mb-4">
              {filters.search || filters.status !== 'COMPLETED'
                ? 'Try adjusting your filters'
                : 'Start investing to build your portfolio'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredHoldings.map((holding) => {
            const statusConfig = STATUS_CONFIG[holding.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.PENDING;
            const gainPercent = holding.unrealizedGainPercent || 0;
            const isActive = holding.status === 'COMPLETED';

            return (
              <Card
                key={holding.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate({ to: `/portfolio/investment/${holding.id}` })}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      {/* Logo */}
                      <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                        {holding.pitch.startup.logo ? (
                          <img
                            src={holding.pitch.startup.logo}
                            alt={holding.pitch.startup.name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <Building2 className="h-8 w-8 text-white" />
                        )}
                      </div>

                      {/* Company Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-xl font-bold">{holding.pitch.startup.name}</h3>
                          <span className={cn('text-xs px-2 py-1 rounded border', statusConfig.bg, statusConfig.color, statusConfig.border)}>
                            {statusConfig.label}
                          </span>
                        </div>

                        <div className="flex items-center space-x-3 text-sm text-muted-foreground mb-3">
                          <span>{holding.pitch.startup.industry}</span>
                          <span>•</span>
                          <span>{holding.pitch.startup.stage}</span>
                          <span>•</span>
                          <span>{holding.pitch.startup.location}</span>
                        </div>

                        <div className="grid grid-cols-4 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Investment</p>
                            <p className="text-lg font-bold">${formatNumber(holding.amount)}</p>
                          </div>
                          {isActive && (
                            <>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Current Value</p>
                                <p className="text-lg font-bold">${formatNumber(holding.currentValue || holding.amount)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Gain/Loss</p>
                                <p className={cn('text-lg font-bold', getReturnColor(gainPercent))}>
                                  {gainPercent >= 0 ? '+' : ''}${formatNumber(Math.abs(holding.unrealizedGain || 0))}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Return</p>
                                <div className="flex items-center">
                                  {gainPercent >= 0 ? (
                                    <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
                                  ) : (
                                    <TrendingDown className="h-4 w-4 text-red-600 mr-1" />
                                  )}
                                  <p className={cn('text-lg font-bold', getReturnColor(gainPercent))}>
                                    {gainPercent >= 0 ? '+' : ''}{gainPercent.toFixed(1)}%
                                  </p>
                                </div>
                              </div>
                            </>
                          )}
                          {!isActive && (
                            <div className="col-span-3">
                              <p className="text-xs text-muted-foreground mb-1">Equity</p>
                              <p className="text-lg font-bold">{holding.equity}%</p>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center space-x-4 mt-3 text-xs text-muted-foreground">
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            <span>Invested {formatDate(holding.investedAt)}</span>
                          </div>
                          {holding.lastValuationDate && (
                            <>
                              <span>•</span>
                              <span>Last valued {formatDate(holding.lastValuationDate)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate({ to: `/portfolio/investment/${holding.id}` });
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
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
