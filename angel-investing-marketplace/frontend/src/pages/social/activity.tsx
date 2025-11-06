import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Alert, AlertDescription } from '../../components/ui/alert';
import {
  Activity,
  TrendingUp,
  MessageSquare,
  Heart,
  Building2,
  DollarSign,
  RefreshCw,
  AlertCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { cn, formatCurrency, formatTimeAgo } from '@/lib/utils';

/**
 * Activity Feed Page
 * View user's recent activity including investments, comments, and reactions
 */

interface ActivityItem {
  type: 'investment' | 'comment' | 'reaction';
  data: any;
  timestamp: string;
}

export function ActivityPage() {
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const userId = params.userId as string;

  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {
    if (userId) {
      fetchActivity();
    }
  }, [userId]);

  const fetchActivity = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`http://localhost:3001/api/social/activity/${userId}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch activity');
      }

      const result = await response.json();
      setActivity(result.data.activity || []);

      // Get user name from first activity item if available
      if (result.data.activity && result.data.activity.length > 0) {
        const firstItem = result.data.activity[0];
        if (firstItem.type === 'investment') {
          // Could fetch user details separately if needed
          setUserName('User');
        }
      }
    } catch (err: any) {
      console.error('Error fetching activity:', err);
      setError(err.message || 'Failed to load activity');
    } finally {
      setIsLoading(false);
    }
  };

  const renderActivityItem = (item: ActivityItem) => {
    switch (item.type) {
      case 'investment':
        return (
          <Card
            key={`inv-${item.data.id}`}
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => navigate({ to: `/pitches/${item.data.pitch.startup.id}` })}
          >
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  {/* Icon */}
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-semibold">Invested in</span>
                      <span className="text-lg font-bold">{item.data.pitch.startup.name}</span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-2">
                      <div className="flex items-center space-x-1">
                        <DollarSign className="h-4 w-4" />
                        <span className="font-medium text-green-600">
                          {formatCurrency(Number(item.data.amount))}
                        </span>
                      </div>
                      <Badge variant="outline">{item.data.pitch.startup.industry}</Badge>
                      <Badge variant="secondary">{item.data.pitch.startup.stage}</Badge>
                    </div>
                    <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{formatTimeAgo(item.timestamp)}</span>
                    </div>
                  </div>

                  {/* Arrow */}
                  <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'comment':
        return (
          <Card
            key={`comment-${item.data.id}`}
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => navigate({ to: `/updates/${item.data.update.id}` })}
          >
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  {/* Icon */}
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="h-6 w-6 text-blue-600" />
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-semibold">Commented on</span>
                      <span className="font-medium">{item.data.update.startup.name}</span>
                      <span className="text-muted-foreground">update</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                      "{item.data.content}"
                    </p>
                    <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{formatTimeAgo(item.timestamp)}</span>
                    </div>
                  </div>

                  {/* Arrow */}
                  <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case 'reaction':
        return (
          <Card
            key={`reaction-${item.data.id}`}
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => navigate({ to: `/updates/${item.data.update.id}` })}
          >
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  {/* Icon */}
                  <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Heart className="h-6 w-6 text-pink-600" />
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-semibold">Reacted {item.data.reaction} to</span>
                      <span className="font-medium">{item.data.update.startup.name}</span>
                      <span className="text-muted-foreground">update</span>
                    </div>
                    <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{formatTimeAgo(item.timestamp)}</span>
                    </div>
                  </div>

                  {/* Arrow */}
                  <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                </div>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading activity...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <Activity className="h-10 w-10 text-purple-500" />
              <h1 className="text-4xl font-bold">Recent Activity</h1>
            </div>
            <p className="text-lg text-muted-foreground">
              Track investments, comments, and engagement
            </p>
          </div>
          <Button variant="outline" onClick={fetchActivity}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
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

      {/* Activity Feed */}
      {activity.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Activity Yet</h3>
            <p className="text-muted-foreground mb-6">
              Start investing and engaging with updates to see your activity here
            </p>
            <div className="flex justify-center space-x-3">
              <Button onClick={() => navigate({ to: '/investments/marketplace' })}>
                <TrendingUp className="h-4 w-4 mr-2" />
                Explore Investments
              </Button>
              <Button variant="outline" onClick={() => navigate({ to: '/social/feed' })}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Browse Updates
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {activity.map((item) => renderActivityItem(item))}
        </div>
      )}

      {/* Stats Footer */}
      {activity.length > 0 && (
        <Card className="mt-8 bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
          <CardContent className="py-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {activity.filter((a) => a.type === 'investment').length}
                </div>
                <div className="text-sm text-muted-foreground">Investments</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {activity.filter((a) => a.type === 'comment').length}
                </div>
                <div className="text-sm text-muted-foreground">Comments</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-pink-600">
                  {activity.filter((a) => a.type === 'reaction').length}
                </div>
                <div className="text-sm text-muted-foreground">Reactions</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
