import React, { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Alert, AlertDescription } from '../../components/ui/alert';
import {
  Building2,
  TrendingUp,
  DollarSign,
  Calendar,
  Users,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  ArrowUpDown,
  ShoppingCart,
  Award,
  Clock,
} from 'lucide-react';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

/**
 * Secondary Marketplace - Browse Shares
 * Discover available shares for purchase
 */

interface ShareOrder {
  id: string;
  quantity: number;
  pricePerShare: number;
  totalAmount: number;
  status: string;
  createdAt: string;
  expiresAt?: string;
  shareCertificate: {
    id: string;
    totalShares: number;
    certificateNumber: string;
    investment: {
      amount: number;
      pitch: {
        title: string;
        startup: {
          id: string;
          name: string;
          industry: string;
          logoUrl?: string;
          stage: string;
        };
      };
    };
  };
  seller: {
    id: string;
    name: string;
  };
}

interface Filters {
  search: string;
  minPrice: string;
  maxPrice: string;
  minShares: string;
  maxShares: string;
  industry: string;
  stage: string;
  sortBy: 'pricePerShare' | 'quantity' | 'createdAt';
  sortOrder: 'asc' | 'desc';
}

const STAGE_OPTIONS = ['All Stages', 'IDEA', 'PROTOTYPE', 'MVP', 'GROWTH', 'SCALE'];
const INDUSTRY_OPTIONS = [
  'All Industries',
  'Technology',
  'Healthcare',
  'Finance',
  'E-commerce',
  'SaaS',
  'AI/ML',
  'Blockchain',
  'Other',
];

export function BrowseSharesPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<ShareOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<ShareOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    minPrice: '',
    maxPrice: '',
    minShares: '',
    maxShares: '',
    industry: 'All Industries',
    stage: 'All Stages',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [orders, filters]);

  const fetchOrders = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:3001/api/marketplace/shares', {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch marketplace shares');
      }

      const result = await response.json();
      setOrders(result.data.orders || []);
    } catch (err: any) {
      console.error('Error fetching orders:', err);
      setError(err.message || 'Failed to load marketplace');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...orders];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (order) =>
          order.shareCertificate.investment.pitch.startup.name.toLowerCase().includes(searchLower) ||
          order.shareCertificate.investment.pitch.title.toLowerCase().includes(searchLower) ||
          order.shareCertificate.investment.pitch.startup.industry.toLowerCase().includes(searchLower)
      );
    }

    // Price filter
    if (filters.minPrice) {
      filtered = filtered.filter(
        (order) => parseFloat(order.pricePerShare.toString()) >= parseFloat(filters.minPrice)
      );
    }

    if (filters.maxPrice) {
      filtered = filtered.filter(
        (order) => parseFloat(order.pricePerShare.toString()) <= parseFloat(filters.maxPrice)
      );
    }

    // Shares filter
    if (filters.minShares) {
      filtered = filtered.filter((order) => order.quantity >= parseInt(filters.minShares));
    }

    if (filters.maxShares) {
      filtered = filtered.filter((order) => order.quantity <= parseInt(filters.maxShares));
    }

    // Industry filter
    if (filters.industry !== 'All Industries') {
      filtered = filtered.filter(
        (order) => order.shareCertificate.investment.pitch.startup.industry === filters.industry
      );
    }

    // Stage filter
    if (filters.stage !== 'All Stages') {
      filtered = filtered.filter(
        (order) => order.shareCertificate.investment.pitch.startup.stage === filters.stage
      );
    }

    // Sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (filters.sortBy) {
        case 'pricePerShare':
          aValue = parseFloat(a.pricePerShare.toString());
          bValue = parseFloat(b.pricePerShare.toString());
          break;
        case 'quantity':
          aValue = a.quantity;
          bValue = b.quantity;
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        default:
          return 0;
      }

      return filters.sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

    setFilteredOrders(filtered);
  };

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      minPrice: '',
      maxPrice: '',
      minShares: '',
      maxShares: '',
      industry: 'All Industries',
      stage: 'All Stages',
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  };

  const toggleSort = (field: 'pricePerShare' | 'quantity' | 'createdAt') => {
    setFilters((prev) => ({
      ...prev,
      sortBy: field,
      sortOrder: prev.sortBy === field && prev.sortOrder === 'asc' ? 'desc' : 'asc',
    }));
  };

  const getDaysUntilExpiry = (expiresAt?: string): number | null => {
    if (!expiresAt) return null;
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (isLoading) {
    return (
      <div className="container max-w-7xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading marketplace...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Secondary Marketplace</h1>
        <p className="text-lg text-muted-foreground">
          Buy shares from existing investors in private companies
        </p>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by company, industry..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Sort */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="whitespace-nowrap"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                <ChevronDown
                  className={cn('h-4 w-4 ml-2 transition-transform', showFilters && 'rotate-180')}
                />
              </Button>
              <Button variant="outline" onClick={fetchOrders}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Price Range</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={filters.minPrice}
                    onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                    className="flex-1"
                  />
                  <span className="text-muted-foreground">-</span>
                  <Input
                    type="number"
                    placeholder="Max"
                    value={filters.maxPrice}
                    onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Share Quantity</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={filters.minShares}
                    onChange={(e) => handleFilterChange('minShares', e.target.value)}
                    className="flex-1"
                  />
                  <span className="text-muted-foreground">-</span>
                  <Input
                    type="number"
                    placeholder="Max"
                    value={filters.maxShares}
                    onChange={(e) => handleFilterChange('maxShares', e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Industry</label>
                <select
                  value={filters.industry}
                  onChange={(e) => handleFilterChange('industry', e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  {INDUSTRY_OPTIONS.map((ind) => (
                    <option key={ind} value={ind}>
                      {ind}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Stage</label>
                <select
                  value={filters.stage}
                  onChange={(e) => handleFilterChange('stage', e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  {STAGE_OPTIONS.map((stage) => (
                    <option key={stage} value={stage}>
                      {stage}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2 flex items-end">
                <Button variant="ghost" onClick={clearFilters} className="w-full md:w-auto">
                  Clear Filters
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          {filteredOrders.length} {filteredOrders.length === 1 ? 'listing' : 'listings'} available
        </p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Sort by:</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleSort('pricePerShare')}
            className={cn(filters.sortBy === 'pricePerShare' && 'text-primary')}
          >
            Price
            {filters.sortBy === 'pricePerShare' && (
              <ArrowUpDown className="h-3 w-3 ml-1" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleSort('quantity')}
            className={cn(filters.sortBy === 'quantity' && 'text-primary')}
          >
            Shares
            {filters.sortBy === 'quantity' && <ArrowUpDown className="h-3 w-3 ml-1" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleSort('createdAt')}
            className={cn(filters.sortBy === 'createdAt' && 'text-primary')}
          >
            Date
            {filters.sortBy === 'createdAt' && <ArrowUpDown className="h-3 w-3 ml-1" />}
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Listings Grid */}
      {filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No shares available</h3>
            <p className="text-muted-foreground mb-6">
              There are currently no shares listed for sale matching your criteria.
            </p>
            <Button onClick={clearFilters} variant="outline">
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrders.map((order) => {
            const startup = order.shareCertificate.investment.pitch.startup;
            const daysUntilExpiry = getDaysUntilExpiry(order.expiresAt);

            return (
              <Card
                key={order.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate({ to: `/marketplace/orders/${order.id}` })}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                        {startup.logoUrl ? (
                          <img
                            src={startup.logoUrl}
                            alt={startup.name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <Building2 className="h-6 w-6 text-white" />
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{startup.name}</CardTitle>
                        <CardDescription>{startup.industry}</CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Price and Quantity */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Price/Share</p>
                        <p className="text-lg font-bold text-green-600">
                          {formatCurrency(parseFloat(order.pricePerShare.toString()))}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Available</p>
                        <p className="text-lg font-bold">{order.quantity.toLocaleString()}</p>
                      </div>
                    </div>

                    {/* Total Amount */}
                    <div className="pt-3 border-t">
                      <p className="text-xs text-muted-foreground mb-1">Total Value</p>
                      <p className="text-xl font-bold">
                        {formatCurrency(parseFloat(order.totalAmount.toString()))}
                      </p>
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
                      <div className="flex items-center space-x-1">
                        <Award className="h-3 w-3" />
                        <span>{startup.stage}</span>
                      </div>
                      {daysUntilExpiry !== null && (
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{daysUntilExpiry}d left</span>
                        </div>
                      )}
                    </div>

                    {/* View Details Button */}
                    <Button className="w-full mt-4" variant="default">
                      <ShoppingCart className="h-4 w-4 mr-2" />
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
