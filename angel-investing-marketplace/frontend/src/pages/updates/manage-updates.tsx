import React, { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  FileText,
  Plus,
  Search,
  RefreshCw,
  AlertCircle,
  Edit,
  Eye,
  Heart,
  MessageSquare,
  Send,
  Pin,
  MoreVertical,
  Trash2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { cn, formatTimeAgo } from '@/lib/utils';

/**
 * Manage Updates Page
 * Dashboard for founders to manage their company updates
 */

interface Update {
  id: string;
  title: string;
  excerpt: string;
  updateType: string;
  status: string;
  viewCount: number;
  reactionCount: number;
  isPinned: boolean;
  publishedAt?: string;
  createdAt: string;
  _count?: {
    reactions: number;
    comments: number;
  };
}

const UPDATE_TYPE_CONFIG: Record<string, { color: string; bg: string }> = {
  MILESTONE: { color: 'text-green-600', bg: 'bg-green-50' },
  FINANCIAL: { color: 'text-blue-600', bg: 'bg-blue-50' },
  PRODUCT: { color: 'text-purple-600', bg: 'bg-purple-50' },
  TEAM: { color: 'text-orange-600', bg: 'bg-orange-50' },
  FUNDRAISING: { color: 'text-pink-600', bg: 'bg-pink-50' },
  MARKET: { color: 'text-indigo-600', bg: 'bg-indigo-50' },
  GENERAL: { color: 'text-gray-600', bg: 'bg-gray-50' },
};

export function ManageUpdatesPage() {
  const navigate = useNavigate();
  const [updates, setUpdates] = useState<Update[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<string>('all');

  useEffect(() => {
    fetchUpdates();
  }, []);

  const fetchUpdates = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('http://localhost:3001/api/company-updates', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
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

  const handleTogglePin = async (updateId: string, currentPinned: boolean) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`http://localhost:3001/api/company-updates/${updateId}/pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to toggle pin');
      }

      // Refresh updates
      fetchUpdates();
    } catch (err: any) {
      console.error('Error toggling pin:', err);
      setError(err.message || 'Failed to toggle pin');
    }
  };

  const handleDelete = async (updateId: string) => {
    if (!confirm('Are you sure you want to delete this update? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`http://localhost:3001/api/company-updates/${updateId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete update');
      }

      // Refresh updates
      fetchUpdates();
    } catch (err: any) {
      console.error('Error deleting update:', err);
      setError(err.message || 'Failed to delete update');
    }
  };

  const handlePublish = async (updateId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`http://localhost:3001/api/company-updates/${updateId}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to publish update');
      }

      // Refresh updates
      fetchUpdates();
    } catch (err: any) {
      console.error('Error publishing update:', err);
      setError(err.message || 'Failed to publish update');
    }
  };

  const filteredUpdates = updates.filter((update) => {
    // Filter by tab
    if (activeTab === 'published' && update.status !== 'PUBLISHED') return false;
    if (activeTab === 'draft' && update.status !== 'DRAFT') return false;

    // Filter by search
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      update.title.toLowerCase().includes(query) ||
      update.excerpt.toLowerCase().includes(query)
    );
  });

  const draftCount = updates.filter((u) => u.status === 'DRAFT').length;
  const publishedCount = updates.filter((u) => u.status === 'PUBLISHED').length;

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

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <FileText className="h-10 w-10 text-blue-500" />
              <h1 className="text-4xl font-bold">Manage Updates</h1>
            </div>
            <p className="text-lg text-muted-foreground">
              Create and manage updates for your investors
            </p>
          </div>
          <Button onClick={() => navigate({ to: '/updates/create' })}>
            <Plus className="h-4 w-4 mr-2" />
            Create Update
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{updates.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Published</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{publishedCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Drafts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{draftCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Views</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {updates.reduce((sum, u) => sum + u.viewCount, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search updates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" onClick={fetchUpdates}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All ({updates.length})</TabsTrigger>
          <TabsTrigger value="published">Published ({publishedCount})</TabsTrigger>
          <TabsTrigger value="draft">Drafts ({draftCount})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredUpdates.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Updates</h3>
                <p className="text-muted-foreground mb-6">
                  {searchQuery
                    ? 'No updates match your search. Try different keywords.'
                    : activeTab === 'draft'
                    ? 'You have no draft updates.'
                    : activeTab === 'published'
                    ? 'You have no published updates yet.'
                    : 'Create your first update to engage with your investors!'}
                </p>
                <Button onClick={() => navigate({ to: '/updates/create' })}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Update
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredUpdates.map((update) => {
                const typeConfig = UPDATE_TYPE_CONFIG[update.updateType] || UPDATE_TYPE_CONFIG.GENERAL;

                return (
                  <Card key={update.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-3">
                          {/* Header */}
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-3">
                              <h3 className="text-xl font-bold">{update.title}</h3>
                              {update.isPinned && (
                                <Pin className="h-4 w-4 text-blue-600" />
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge
                                variant={update.status === 'PUBLISHED' ? 'default' : 'secondary'}
                              >
                                {update.status}
                              </Badge>
                              <span className={cn('px-3 py-1 rounded-full text-xs font-semibold', typeConfig.bg, typeConfig.color)}>
                                {update.updateType}
                              </span>
                            </div>
                          </div>

                          {/* Excerpt */}
                          <p className="text-muted-foreground">{update.excerpt}</p>

                          {/* Metrics */}
                          <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <Eye className="h-4 w-4" />
                              <span>{update.viewCount}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Heart className="h-4 w-4" />
                              <span>{update._count?.reactions || update.reactionCount || 0}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <MessageSquare className="h-4 w-4" />
                              <span>{update._count?.comments || 0}</span>
                            </div>
                            <span>
                              {update.publishedAt
                                ? `Published ${formatTimeAgo(update.publishedAt)}`
                                : `Created ${formatTimeAgo(update.createdAt)}`}
                            </span>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate({ to: `/updates/${update.id}` })}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate({ to: `/updates/edit/${update.id}` })}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                            {update.status === 'DRAFT' && (
                              <Button
                                size="sm"
                                onClick={() => handlePublish(update.id)}
                              >
                                <Send className="h-4 w-4 mr-2" />
                                Publish
                              </Button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="ghost">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleTogglePin(update.id, update.isPinned)}
                                >
                                  <Pin className="h-4 w-4 mr-2" />
                                  {update.isPinned ? 'Unpin' : 'Pin'} Update
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDelete(update.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
