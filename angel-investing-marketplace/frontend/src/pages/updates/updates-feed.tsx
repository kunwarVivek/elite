import React, { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Alert, AlertDescription } from '../../components/ui/alert';
import {
  Search,
  Filter,
  Building2,
  Calendar,
  TrendingUp,
  Award,
  Users,
  Package,
  DollarSign,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  Heart,
  MessageSquare,
  ThumbsUp,
  Eye,
} from 'lucide-react';
import { cn, formatDate, formatTimeAgo } from '@/lib/utils';

/**
 * Company Updates Feed
 * Browse all updates from portfolio companies
 * Filter by type, company, and engagement
 */

interface CompanyUpdate {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  updateType: 'MILESTONE' | 'FINANCIAL' | 'PRODUCT' | 'TEAM' | 'FUNDRAISING' | 'OTHER';
  category: string;
  publishedAt: string;
  company: {
    id: string;
    name: string;
    logo?: string;
    industry: string;
  };
  author: {
    name: string;
    role: string;
  };
  engagement: {
    views: number;
    reactions: number;
    comments: number;
  };
  tags: string[];
}

const UPDATE_TYPE_CONFIG = {
  MILESTONE: { icon: Award, color: 'text-green-600', bg: 'bg-green-50', label: 'Milestone' },
  FINANCIAL: { icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Financial' },
  PRODUCT: { icon: Package, color: 'text-purple-600', bg: 'bg-purple-50', label: 'Product' },
  TEAM: { icon: Users, color: 'text-orange-600', bg: 'bg-orange-50', label: 'Team' },
  FUNDRAISING: { icon: TrendingUp, color: 'text-pink-600', bg: 'bg-pink-50', label: 'Fundraising' },
  OTHER: { icon: Building2, color: 'text-gray-600', bg: 'bg-gray-50', label: 'Other' },
};

export function UpdatesFeedPage() {
  const navigate = useNavigate();
  const [updates, setUpdates] = useState<CompanyUpdate[]>([]);
  const [filteredUpdates, setFilteredUpdates] = useState<CompanyUpdate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');

  useEffect(() => {
    fetchUpdates();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [updates, search, filterType]);

  const fetchUpdates = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:3001/api/updates', {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch updates');
      }

      const result = await response.json();
      setUpdates(result.data.updates || []);
    } catch (err: any) {
      console.error('Error fetching updates:', err);
      setError(err.message || 'Failed to load updates');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...updates];

    // Apply type filter
    if (filterType !== 'ALL') {
      filtered = filtered.filter((u) => u.updateType === filterType);
    }

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.title.toLowerCase().includes(searchLower) ||
          u.excerpt.toLowerCase().includes(searchLower) ||
          u.company.name.toLowerCase().includes(searchLower) ||
          u.tags.some((t) => t.toLowerCase().includes(searchLower))
      );
    }

    setFilteredUpdates(filtered);
  };

  if (isLoading) {
    return (
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading updates...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={fetchUpdates} className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">Company Updates</h1>
            <p className="text-muted-foreground">
              Stay informed about your portfolio companies
            </p>
          </div>
          <Button variant="outline" onClick={fetchUpdates}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Search & Filter */}
        <div className="flex items-center space-x-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search updates by title, company, or tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant="outline"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filter
            <ChevronDown className={cn('h-4 w-4 ml-2 transition-transform', showFilters && 'rotate-180')} />
          </Button>
        </div>

        {/* Filter Bar */}
        {showFilters && (
          <Card className="mt-4">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <Button
                  variant={filterType === 'ALL' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType('ALL')}
                >
                  All Types
                </Button>
                {Object.entries(UPDATE_TYPE_CONFIG).map(([type, config]) => {
                  const Icon = config.icon;
                  return (
                    <Button
                      key={type}
                      variant={filterType === type ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFilterType(type)}
                    >
                      <Icon className="h-4 w-4 mr-1" />
                      {config.label}
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <p className="text-sm text-muted-foreground mt-4">
          {filteredUpdates.length} {filteredUpdates.length === 1 ? 'update' : 'updates'}
        </p>
      </div>

      {/* Updates List */}
      {filteredUpdates.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No updates found</h3>
            <p className="text-muted-foreground">
              {search || filterType !== 'ALL'
                ? 'Try adjusting your filters'
                : 'Check back soon for company updates'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredUpdates.map((update) => {
            const typeConfig = UPDATE_TYPE_CONFIG[update.updateType];
            const TypeIcon = typeConfig.icon;

            return (
              <Card
                key={update.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate({ to: `/updates/${update.id}` })}
              >
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    {/* Company Logo */}
                    <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                      {update.company.logo ? (
                        <img
                          src={update.company.logo}
                          alt={update.company.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <Building2 className="h-6 w-6 text-white" />
                      )}
                    </div>

                    {/* Update Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="text-lg font-bold">{update.title}</h3>
                            <span className={cn('px-2 py-0.5 rounded text-xs font-semibold', typeConfig.bg, typeConfig.color)}>
                              <TypeIcon className="h-3 w-3 inline mr-1" />
                              {typeConfig.label}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-2">
                            <span className="font-semibold">{update.company.name}</span>
                            <span>•</span>
                            <span>{update.company.industry}</span>
                            <span>•</span>
                            <span>{formatTimeAgo(update.publishedAt)}</span>
                          </div>
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {update.excerpt}
                      </p>

                      {/* Tags */}
                      {update.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {update.tags.slice(0, 4).map((tag) => (
                            <span
                              key={tag}
                              className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                          {update.tags.length > 4 && (
                            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
                              +{update.tags.length - 4} more
                            </span>
                          )}
                        </div>
                      )}

                      {/* Engagement */}
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <Eye className="h-4 w-4" />
                          <span>{update.engagement.views}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <ThumbsUp className="h-4 w-4" />
                          <span>{update.engagement.reactions}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <MessageSquare className="h-4 w-4" />
                          <span>{update.engagement.comments}</span>
                        </div>
                        <span>•</span>
                        <span>by {update.author.name}, {update.author.role}</span>
                      </div>
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
