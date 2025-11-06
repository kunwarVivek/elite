import React, { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Alert, AlertDescription } from '../../components/ui/alert';
import {
  Building2,
  TrendingUp,
  Award,
  Users,
  Package,
  DollarSign,
  Search,
  RefreshCw,
  AlertCircle,
  Heart,
  MessageSquare,
  Eye,
  Pin,
  Sparkles,
} from 'lucide-react';
import { cn, formatTimeAgo } from '@/lib/utils';

/**
 * News Feed Page
 * Personalized feed of company updates and investment opportunities
 */

interface FeedItem {
  id: string;
  title: string;
  excerpt: string;
  updateType: string;
  publishedAt: string;
  viewCount: number;
  isPinned: boolean;
  isHighlighted: boolean;
  tags: string[];
  startup: {
    id: string;
    name: string;
    industry: string;
    logoUrl?: string;
  };
  author: {
    id: string;
    name: string;
  };
  _count: {
    reactions: number;
    comments: number;
  };
}

const UPDATE_TYPE_CONFIG: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  MILESTONE: { icon: Award, color: 'text-green-600', bg: 'bg-green-50', label: 'Milestone' },
  FINANCIAL: { icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Financial' },
  PRODUCT: { icon: Package, color: 'text-purple-600', bg: 'bg-purple-50', label: 'Product' },
  TEAM: { icon: Users, color: 'text-orange-600', bg: 'bg-orange-50', label: 'Team' },
  FUNDRAISING: { icon: TrendingUp, color: 'text-pink-600', bg: 'bg-pink-50', label: 'Fundraising' },
  MARKET: { icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50', label: 'Market' },
  GENERAL: { icon: Building2, color: 'text-gray-600', bg: 'bg-gray-50', label: 'General' },
};

export function NewsFeedPage() {
  const navigate = useNavigate();
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchFeed();
  }, []);

  const fetchFeed = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:3001/api/social/feed', {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch news feed');
      }

      const result = await response.json();
      setFeed(result.data.feed || []);
    } catch (err: any) {
      console.error('Error fetching feed:', err);
      setError(err.message || 'Failed to load news feed');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredFeed = feed.filter((item) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      item.title.toLowerCase().includes(searchLower) ||
      item.startup.name.toLowerCase().includes(searchLower) ||
      item.tags.some((tag) => tag.toLowerCase().includes(searchLower))
    );
  });

  if (isLoading) {
    return (
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading your feed...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">News Feed</h1>
        <p className="text-lg text-muted-foreground">
          Stay updated with your portfolio companies and trending opportunities
        </p>
      </div>

      {/* Search and Actions */}
      <div className="flex items-center space-x-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search updates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" onClick={fetchFeed}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
        <Button onClick={() => navigate({ to: '/social/trending' })}>
          <Sparkles className="h-4 w-4 mr-2" />
          Trending
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Feed Items */}
      {filteredFeed.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Updates</h3>
            <p className="text-muted-foreground mb-6">
              {search
                ? 'No updates match your search. Try different keywords.'
                : 'Your feed is empty. Start investing to see updates from your portfolio companies!'}
            </p>
            <Button onClick={() => navigate({ to: '/investments/marketplace' })}>
              Explore Investments
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredFeed.map((item) => {
            const typeConfig = UPDATE_TYPE_CONFIG[item.updateType] || UPDATE_TYPE_CONFIG.GENERAL;
            const TypeIcon = typeConfig.icon;

            return (
              <Card
                key={item.id}
                className={cn(
                  'hover:shadow-md transition-shadow cursor-pointer',
                  item.isPinned && 'border-blue-300 bg-blue-50/30'
                )}
                onClick={() => navigate({ to: `/updates/${item.id}` })}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      {/* Company Logo */}
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        {item.startup.logoUrl ? (
                          <img
                            src={item.startup.logoUrl}
                            alt={item.startup.name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <Building2 className="h-6 w-6 text-white" />
                        )}
                      </div>

                      {/* Company Info */}
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-bold">{item.startup.name}</h3>
                          {item.isPinned && (
                            <Pin className="h-4 w-4 text-blue-600" />
                          )}
                          {item.isHighlighted && (
                            <Sparkles className="h-4 w-4 text-yellow-600" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{item.startup.industry}</p>
                      </div>
                    </div>

                    {/* Update Type Badge */}
                    <span
                      className={cn(
                        'px-3 py-1 rounded-full text-xs font-semibold flex items-center space-x-1',
                        typeConfig.bg,
                        typeConfig.color
                      )}
                    >
                      <TypeIcon className="h-3 w-3" />
                      <span>{typeConfig.label}</span>
                    </span>
                  </div>

                  <CardTitle className="mt-3">{item.title}</CardTitle>
                  <CardDescription>{item.excerpt}</CardDescription>
                </CardHeader>

                <CardContent>
                  {/* Tags */}
                  {item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Engagement Metrics */}
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <Eye className="h-4 w-4" />
                        <span>{item.viewCount}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Heart className="h-4 w-4" />
                        <span>{item._count.reactions}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MessageSquare className="h-4 w-4" />
                        <span>{item._count.comments}</span>
                      </div>
                    </div>
                    <span>{formatTimeAgo(item.publishedAt)}</span>
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
