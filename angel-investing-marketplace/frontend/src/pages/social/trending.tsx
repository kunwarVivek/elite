import React, { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Alert, AlertDescription } from '../../components/ui/alert';
import {
  Building2,
  TrendingUp,
  Award,
  Users,
  Package,
  DollarSign,
  Flame,
  Hash,
  RefreshCw,
  AlertCircle,
  Heart,
  MessageSquare,
  Eye,
  ArrowUpRight,
  Sparkles,
  TrendingDown,
} from 'lucide-react';
import { cn, formatTimeAgo } from '@/lib/utils';

/**
 * Trending Page
 * Discover trending content, hot topics, and popular updates
 */

interface TrendingUpdate {
  id: string;
  title: string;
  excerpt: string;
  updateType: string;
  publishedAt: string;
  viewCount: number;
  reactionCount: number;
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
}

interface TrendingTag {
  tag: string;
  count: number;
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

export function TrendingPage() {
  const navigate = useNavigate();
  const [trendingUpdates, setTrendingUpdates] = useState<TrendingUpdate[]>([]);
  const [trendingTags, setTrendingTags] = useState<TrendingTag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  useEffect(() => {
    fetchTrending();
  }, []);

  const fetchTrending = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:3001/api/social/trending', {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch trending content');
      }

      const result = await response.json();
      setTrendingUpdates(result.data.trendingUpdates || []);
      setTrendingTags(result.data.trendingTags || []);
    } catch (err: any) {
      console.error('Error fetching trending:', err);
      setError(err.message || 'Failed to load trending content');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUpdates = selectedTag
    ? trendingUpdates.filter((update) => update.tags.includes(selectedTag))
    : trendingUpdates;

  if (isLoading) {
    return (
      <div className="container max-w-7xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading trending content...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <Flame className="h-10 w-10 text-orange-500" />
          <h1 className="text-4xl font-bold">Trending</h1>
        </div>
        <p className="text-lg text-muted-foreground">
          Discover what's hot in the angel investing community
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mb-6">
        <div className="text-sm text-muted-foreground">
          <Sparkles className="inline h-4 w-4 mr-1" />
          Updated from the last 7 days
        </div>
        <Button variant="outline" onClick={fetchTrending}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trending Tags - Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Hash className="h-5 w-5" />
                <span>Trending Topics</span>
              </CardTitle>
              <CardDescription>Most popular tags this week</CardDescription>
            </CardHeader>
            <CardContent>
              {trendingTags.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingDown className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">No trending tags yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Button
                    variant={selectedTag === null ? 'default' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => setSelectedTag(null)}
                  >
                    <span className="flex-1 text-left">All Topics</span>
                    {selectedTag === null && (
                      <Badge variant="secondary">{trendingUpdates.length}</Badge>
                    )}
                  </Button>
                  {trendingTags.map((tag, index) => (
                    <Button
                      key={tag.tag}
                      variant={selectedTag === tag.tag ? 'default' : 'ghost'}
                      className="w-full justify-start"
                      onClick={() => setSelectedTag(tag.tag)}
                    >
                      <div className="flex items-center space-x-2 flex-1">
                        <span className="text-sm font-semibold text-orange-600">
                          #{index + 1}
                        </span>
                        <span className="flex-1 text-left">#{tag.tag}</span>
                        <Badge variant="secondary">{tag.count}</Badge>
                      </div>
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Trending Updates - Main Content */}
        <div className="lg:col-span-2">
          {filteredUpdates.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Flame className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Trending Updates</h3>
                <p className="text-muted-foreground mb-6">
                  {selectedTag
                    ? `No trending updates with #${selectedTag}. Try another topic.`
                    : 'Check back soon for trending content!'}
                </p>
                {selectedTag && (
                  <Button variant="outline" onClick={() => setSelectedTag(null)}>
                    Clear Filter
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Filter indicator */}
              {selectedTag && (
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center space-x-2">
                    <Hash className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">
                      Filtered by: <span className="text-blue-600">#{selectedTag}</span>
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedTag(null)}>
                    Clear
                  </Button>
                </div>
              )}

              {/* Update Cards */}
              {filteredUpdates.map((update, index) => {
                const typeConfig = UPDATE_TYPE_CONFIG[update.updateType] || UPDATE_TYPE_CONFIG.GENERAL;
                const TypeIcon = typeConfig.icon;

                return (
                  <Card
                    key={update.id}
                    className="hover:shadow-md transition-shadow cursor-pointer relative overflow-hidden"
                    onClick={() => navigate({ to: `/updates/${update.id}` })}
                  >
                    {/* Trending Rank Badge */}
                    <div className="absolute top-4 left-4 z-10">
                      <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-orange-500 to-pink-600 rounded-full text-white font-bold shadow-lg">
                        #{index + 1}
                      </div>
                    </div>

                    <CardHeader className="pl-20">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3 flex-1">
                          {/* Company Logo */}
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                            {update.startup.logoUrl ? (
                              <img
                                src={update.startup.logoUrl}
                                alt={update.startup.name}
                                className="w-full h-full object-cover rounded-lg"
                              />
                            ) : (
                              <Building2 className="h-6 w-6 text-white" />
                            )}
                          </div>

                          {/* Company Info */}
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h3 className="font-bold">{update.startup.name}</h3>
                              <Flame className="h-4 w-4 text-orange-500" />
                            </div>
                            <p className="text-sm text-muted-foreground">{update.startup.industry}</p>
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

                      <CardTitle className="mt-3">{update.title}</CardTitle>
                      <CardDescription>{update.excerpt}</CardDescription>
                    </CardHeader>

                    <CardContent>
                      {/* Tags */}
                      {update.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {update.tags.map((tag) => (
                            <span
                              key={tag}
                              className={cn(
                                'text-xs px-2 py-1 rounded cursor-pointer transition-colors',
                                selectedTag === tag
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              )}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTag(tag);
                              }}
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Engagement Metrics */}
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-4 text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Eye className="h-4 w-4" />
                            <span>{update.viewCount.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center space-x-1 text-pink-600 font-semibold">
                            <Heart className="h-4 w-4" />
                            <span>{update.reactionCount.toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-muted-foreground">{formatTimeAgo(update.publishedAt)}</span>
                          <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* CTA Section */}
      <Card className="mt-8 bg-gradient-to-br from-orange-50 to-pink-50 border-orange-200">
        <CardContent className="py-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold mb-2">Stay in the Loop</h3>
              <p className="text-muted-foreground">
                Follow companies and investors to get trending content in your feed
              </p>
            </div>
            <div className="flex space-x-3">
              <Button variant="outline" onClick={() => navigate({ to: '/social/network' })}>
                <Users className="h-4 w-4 mr-2" />
                Discover Network
              </Button>
              <Button onClick={() => navigate({ to: '/investments/marketplace' })}>
                <TrendingUp className="h-4 w-4 mr-2" />
                Explore Investments
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
