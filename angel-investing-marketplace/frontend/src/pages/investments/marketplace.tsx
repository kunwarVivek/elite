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
  Building2,
  Target,
  Users,
  DollarSign,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  Grid3x3,
  List,
  ArrowUpDown,
  MapPin,
  Calendar,
  Rocket,
  Star,
} from 'lucide-react';
import { cn, formatNumber, formatDate } from '@/lib/utils';

/**
 * Investment Marketplace
 * Browse and discover investment opportunities (pitches)
 * Comprehensive filtering, searching, and sorting
 */

interface Pitch {
  id: string;
  startupId: string;
  startup: {
    id: string;
    name: string;
    industry: string;
    stage: string;
    location: string;
    logo?: string;
    description: string;
    teamSize: number;
    foundedYear: number;
  };
  title: string;
  description: string;
  fundingGoal: number;
  minInvestment: number;
  maxInvestment?: number;
  currentFunding: number;
  investorCount: number;
  equityOffered: number;
  valuation: number;
  status: string;
  deadline?: string;
  createdAt: string;
  highlights: string[];
  metrics?: {
    revenue?: number;
    growth?: number;
    customers?: number;
  };
}

interface Filters {
  industry: string;
  stage: string;
  minFunding: number;
  maxFunding: number;
  minEquity: number;
  maxEquity: number;
  location: string;
  search: string;
}

const INDUSTRIES = [
  'All Industries',
  'SaaS',
  'Fintech',
  'Healthcare',
  'E-commerce',
  'AI/ML',
  'EdTech',
  'CleanTech',
  'Biotech',
  'Consumer',
  'Enterprise',
  'Other',
];

const STAGES = [
  'All Stages',
  'Pre-Seed',
  'Seed',
  'Series A',
  'Series B',
  'Series C+',
  'Growth',
];

const SORT_OPTIONS = [
  { value: 'trending', label: 'Trending' },
  { value: 'newest', label: 'Newest First' },
  { value: 'funding_high', label: 'Highest Funding Goal' },
  { value: 'funding_low', label: 'Lowest Funding Goal' },
  { value: 'equity_high', label: 'Highest Equity' },
  { value: 'equity_low', label: 'Lowest Equity' },
  { value: 'deadline', label: 'Ending Soon' },
];

export function InvestmentMarketplacePage() {
  const navigate = useNavigate();
  const [pitches, setPitches] = useState<Pitch[]>([]);
  const [filteredPitches, setFilteredPitches] = useState<Pitch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('trending');

  const [filters, setFilters] = useState<Filters>({
    industry: 'All Industries',
    stage: 'All Stages',
    minFunding: 0,
    maxFunding: 10000000,
    minEquity: 0,
    maxEquity: 100,
    location: '',
    search: '',
  });

  useEffect(() => {
    fetchPitches();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [pitches, filters, sortBy]);

  const fetchPitches = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:3001/api/pitches?status=ACTIVE', {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch investment opportunities');
      }

      const result = await response.json();
      setPitches(result.data.pitches || []);
    } catch (err: any) {
      console.error('Error fetching pitches:', err);
      setError(err.message || 'Failed to load investment opportunities');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...pitches];

    // Apply industry filter
    if (filters.industry !== 'All Industries') {
      filtered = filtered.filter((pitch) => pitch.startup.industry === filters.industry);
    }

    // Apply stage filter
    if (filters.stage !== 'All Stages') {
      filtered = filtered.filter((pitch) => pitch.startup.stage === filters.stage);
    }

    // Apply funding range filter
    filtered = filtered.filter(
      (pitch) =>
        pitch.fundingGoal >= filters.minFunding && pitch.fundingGoal <= filters.maxFunding
    );

    // Apply equity range filter
    filtered = filtered.filter(
      (pitch) => pitch.equityOffered >= filters.minEquity && pitch.equityOffered <= filters.maxEquity
    );

    // Apply location filter
    if (filters.location) {
      const locationLower = filters.location.toLowerCase();
      filtered = filtered.filter((pitch) =>
        pitch.startup.location.toLowerCase().includes(locationLower)
      );
    }

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (pitch) =>
          pitch.startup.name.toLowerCase().includes(searchLower) ||
          pitch.title.toLowerCase().includes(searchLower) ||
          pitch.description.toLowerCase().includes(searchLower) ||
          pitch.startup.industry.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'trending':
          // Sort by funding progress and investor count
          const progressA = (a.currentFunding / a.fundingGoal) * a.investorCount;
          const progressB = (b.currentFunding / b.fundingGoal) * b.investorCount;
          return progressB - progressA;
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'funding_high':
          return b.fundingGoal - a.fundingGoal;
        case 'funding_low':
          return a.fundingGoal - b.fundingGoal;
        case 'equity_high':
          return b.equityOffered - a.equityOffered;
        case 'equity_low':
          return a.equityOffered - b.equityOffered;
        case 'deadline':
          if (!a.deadline) return 1;
          if (!b.deadline) return -1;
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        default:
          return 0;
      }
    });

    setFilteredPitches(filtered);
  };

  const resetFilters = () => {
    setFilters({
      industry: 'All Industries',
      stage: 'All Stages',
      minFunding: 0,
      maxFunding: 10000000,
      minEquity: 0,
      maxEquity: 100,
      location: '',
      search: '',
    });
  };

  const getFundingProgress = (pitch: Pitch): number => {
    return (pitch.currentFunding / pitch.fundingGoal) * 100;
  };

  const getDaysRemaining = (deadline?: string): number | null => {
    if (!deadline) return null;
    const now = new Date();
    const end = new Date(deadline);
    const diffTime = end.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const renderPitchCard = (pitch: Pitch) => {
    const progress = getFundingProgress(pitch);
    const daysRemaining = getDaysRemaining(pitch.deadline);

    return (
      <Card
        key={pitch.id}
        className="hover:shadow-lg transition-shadow cursor-pointer"
        onClick={() => navigate({ to: `/investments/${pitch.id}` })}
      >
        {/* Pitch Image/Logo */}
        <div className="h-48 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center relative">
          {pitch.startup.logo ? (
            <img src={pitch.startup.logo} alt={pitch.startup.name} className="h-full w-full object-cover" />
          ) : (
            <Building2 className="h-16 w-16 text-white opacity-80" />
          )}
          {daysRemaining !== null && daysRemaining <= 7 && (
            <div className="absolute top-3 right-3 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
              {daysRemaining}d left
            </div>
          )}
        </div>

        <CardHeader>
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <CardTitle className="text-xl mb-1">{pitch.startup.name}</CardTitle>
              <CardDescription className="text-sm">{pitch.title}</CardDescription>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">{pitch.startup.industry}</span>
            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">{pitch.startup.stage}</span>
          </div>
        </CardHeader>

        <CardContent>
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{pitch.description}</p>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <p className="text-xs text-muted-foreground">Funding Goal</p>
              <p className="text-lg font-bold text-green-600">${formatNumber(pitch.fundingGoal)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Valuation</p>
              <p className="text-lg font-bold">${formatNumber(pitch.valuation)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Min Investment</p>
              <p className="text-sm font-semibold">${formatNumber(pitch.minInvestment)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Equity Offered</p>
              <p className="text-sm font-semibold">{pitch.equityOffered}%</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Funding Progress</span>
              <span className="font-semibold">{progress.toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={cn('h-full', progress >= 100 ? 'bg-green-600' : 'bg-blue-600')}
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs mt-1">
              <span className="text-muted-foreground">
                ${formatNumber(pitch.currentFunding)} raised
              </span>
              <span className="text-muted-foreground">
                {pitch.investorCount} {pitch.investorCount === 1 ? 'investor' : 'investors'}
              </span>
            </div>
          </div>

          {/* Additional Metrics */}
          {pitch.metrics && (
            <div className="flex items-center space-x-4 text-xs border-t pt-3">
              {pitch.metrics.revenue && (
                <div>
                  <p className="text-muted-foreground">Revenue</p>
                  <p className="font-semibold">${formatNumber(pitch.metrics.revenue)}</p>
                </div>
              )}
              {pitch.metrics.growth && (
                <div>
                  <p className="text-muted-foreground">Growth</p>
                  <p className="font-semibold text-green-600">+{pitch.metrics.growth}%</p>
                </div>
              )}
              {pitch.metrics.customers && (
                <div>
                  <p className="text-muted-foreground">Customers</p>
                  <p className="font-semibold">{formatNumber(pitch.metrics.customers)}</p>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center space-x-2 mt-4">
            <MapPin className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{pitch.startup.location}</span>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderPitchListItem = (pitch: Pitch) => {
    const progress = getFundingProgress(pitch);
    const daysRemaining = getDaysRemaining(pitch.deadline);

    return (
      <Card
        key={pitch.id}
        className="hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => navigate({ to: `/investments/${pitch.id}` })}
      >
        <CardContent className="p-4">
          <div className="flex items-start space-x-4">
            {/* Logo */}
            <div className="flex-shrink-0 w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              {pitch.startup.logo ? (
                <img src={pitch.startup.logo} alt={pitch.startup.name} className="w-full h-full object-cover rounded-lg" />
              ) : (
                <Building2 className="h-8 w-8 text-white" />
              )}
            </div>

            {/* Main Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-lg font-bold mb-1">{pitch.startup.name}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{pitch.title}</p>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">{pitch.startup.industry}</span>
                    <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">{pitch.startup.stage}</span>
                    <span className="text-xs text-muted-foreground flex items-center">
                      <MapPin className="h-3 w-3 mr-1" />
                      {pitch.startup.location}
                    </span>
                  </div>
                </div>
                {daysRemaining !== null && daysRemaining <= 7 && (
                  <div className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap">
                    {daysRemaining}d left
                  </div>
                )}
              </div>

              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{pitch.description}</p>

              <div className="flex items-center space-x-6 mb-3">
                <div>
                  <p className="text-xs text-muted-foreground">Funding Goal</p>
                  <p className="text-lg font-bold text-green-600">${formatNumber(pitch.fundingGoal)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valuation</p>
                  <p className="text-lg font-bold">${formatNumber(pitch.valuation)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Min Investment</p>
                  <p className="text-sm font-semibold">${formatNumber(pitch.minInvestment)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Equity</p>
                  <p className="text-sm font-semibold">{pitch.equityOffered}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Investors</p>
                  <p className="text-sm font-semibold">{pitch.investorCount}</p>
                </div>
              </div>

              {/* Progress */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Progress: {progress.toFixed(0)}%</span>
                  <span className="text-muted-foreground">${formatNumber(pitch.currentFunding)} raised</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={cn('h-full', progress >= 100 ? 'bg-green-600' : 'bg-blue-600')}
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="container max-w-7xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading investment opportunities...</span>
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
        <Button onClick={fetchPitches} className="mt-4">
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
            <h1 className="text-4xl font-bold mb-2">Investment Marketplace</h1>
            <p className="text-muted-foreground">
              Discover and invest in promising startups
            </p>
          </div>
          <Button onClick={fetchPitches} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search by company name, industry, or keywords..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="pl-10 h-12 text-base"
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              <ChevronDown className={cn('h-4 w-4 ml-2 transition-transform', showFilters && 'rotate-180')} />
            </Button>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <span className="text-sm text-muted-foreground">
              {filteredPitches.length} {filteredPitches.length === 1 ? 'opportunity' : 'opportunities'}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filter Opportunities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
                <Label>Min Funding Goal</Label>
                <Input
                  type="number"
                  value={filters.minFunding}
                  onChange={(e) => setFilters({ ...filters, minFunding: Number(e.target.value) })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Max Funding Goal</Label>
                <Input
                  type="number"
                  value={filters.maxFunding}
                  onChange={(e) => setFilters({ ...filters, maxFunding: Number(e.target.value) })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Min Equity %</Label>
                <Input
                  type="number"
                  value={filters.minEquity}
                  onChange={(e) => setFilters({ ...filters, minEquity: Number(e.target.value) })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Location</Label>
                <Input
                  placeholder="City or state"
                  value={filters.location}
                  onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <Button onClick={resetFilters} variant="outline">
                Reset Filters
              </Button>
              <span className="text-sm text-muted-foreground">
                Showing {filteredPitches.length} of {pitches.length} opportunities
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pitches Grid/List */}
      {filteredPitches.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Rocket className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No investments found</h3>
            <p className="text-muted-foreground mb-4">
              {filters.search || filters.industry !== 'All Industries'
                ? 'Try adjusting your filters or search terms'
                : 'Check back soon for new investment opportunities'}
            </p>
            {(filters.search || filters.industry !== 'All Industries') && (
              <Button onClick={resetFilters} variant="outline">
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className={cn(
          viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
            : 'space-y-4'
        )}>
          {filteredPitches.map((pitch) =>
            viewMode === 'grid' ? renderPitchCard(pitch) : renderPitchListItem(pitch)
          )}
        </div>
      )}
    </div>
  );
}
