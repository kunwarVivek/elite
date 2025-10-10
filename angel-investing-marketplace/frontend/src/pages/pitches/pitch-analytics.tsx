import { useEffect } from 'react'
import { useParams, Link } from '@tanstack/react-router'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Eye,
  Users,
  MessageCircle,
  Download,
  Target,
  Calendar,
  Activity,
  BarChart3,
  Share2,
  RefreshCw,
} from 'lucide-react'
import { usePitch, usePitchAnalytics } from '@/hooks/use-pitch'
import { PitchAnalytics as PitchAnalyticsComponent } from '@/components/pitches/pitch-analytics'
import { PitchStatusBadge } from '@/components/pitches/pitch-status-badge'
import { formatCurrency, formatPercentage, formatRelativeTime } from '@/lib/pitch-utils'

export function PitchAnalyticsPage() {
  const { id } = useParams({ from: '/pitches/$id/analytics' })
  const { data: pitch, isLoading: pitchLoading, error: pitchError, fetchPitch } = usePitch(id)
  const { data: analytics, isLoading: analyticsLoading, error: analyticsError, refetch } = usePitchAnalytics(id)

  useEffect(() => {
    if (id) {
      fetchPitch()
    }
  }, [id, fetchPitch])

  const handleRefresh = () => {
    refetch()
  }

  if (pitchLoading || analyticsLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="h-6 bg-muted rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-3/4"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (pitchError || !pitch) {
    return (
      <div className="container mx-auto py-8">
        <Card className="border-destructive">
          <CardContent className="p-6 text-center">
            <p className="text-destructive mb-4">Failed to load pitch analytics</p>
            <Button onClick={() => fetchPitch()}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={`/pitches/${id}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Pitch
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Pitch Analytics</h1>
            <p className="text-muted-foreground mt-1">
              Performance insights for "{pitch.title}"
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <PitchStatusBadge status={pitch.status} />
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.total_views.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics?.unique_views.toLocaleString() || '0'} unique visitors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics ?
                formatPercentage(((analytics.investor_interactions + analytics.comments_count) / analytics.total_views) * 100)
                : '0%'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics?.investor_interactions || 0} interactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics ? formatPercentage(analytics.conversion_rate) : '0%'}
            </div>
            <p className="text-xs text-muted-foreground">
              View to interaction conversion
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Time on Page</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics ?
                `${analytics.average_time_on_page.toFixed(1)}m`
                : '0m'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics ? `${analytics.bounce_rate.toFixed(1)}%` : '0%'} bounce rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Detailed Analytics
          </CardTitle>
          <CardDescription>
            Comprehensive performance data and insights for your pitch
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PitchAnalyticsComponent pitch={pitch} analytics={analytics} />
        </CardContent>
      </Card>

      {/* Performance Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Performance Summary</CardTitle>
            <CardDescription>
              How your pitch is performing compared to platform averages
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">View Count</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm">{analytics?.total_views || 0}</span>
                  <Badge variant={analytics && analytics.total_views > 100 ? "default" : "secondary"}>
                    {analytics && analytics.total_views > 100 ? "Above Average" : "Below Average"}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Engagement Rate</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm">
                    {analytics ?
                      formatPercentage(((analytics.investor_interactions + analytics.comments_count) / analytics.total_views) * 100)
                      : '0%'
                    }
                  </span>
                  <Badge variant={analytics && ((analytics.investor_interactions + analytics.comments_count) / analytics.total_views) > 0.05 ? "default" : "secondary"}>
                    {analytics && ((analytics.investor_interactions + analytics.comments_count) / analytics.total_views) > 0.05 ? "Good" : "Needs Improvement"}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Document Downloads</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm">{analytics?.documents_downloaded || 0}</span>
                  <Badge variant={analytics && analytics.documents_downloaded > 20 ? "default" : "secondary"}>
                    {analytics && analytics.documents_downloaded > 20 ? "High Interest" : "Low Interest"}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
            <CardDescription>
              Suggestions to improve your pitch performance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {analytics && analytics.total_views < 50 && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Low Visibility:</strong> Consider promoting your pitch through your network or upgrading to featured status.
                </p>
              </div>
            )}

            {analytics && ((analytics.investor_interactions + analytics.comments_count) / analytics.total_views) < 0.03 && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Low Engagement:</strong> Review your pitch content and consider making the problem statement more compelling.
                </p>
              </div>
            )}

            {analytics && analytics.documents_downloaded < 10 && (
              <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                <p className="text-sm text-purple-800 dark:text-purple-200">
                  <strong>Document Interest:</strong> Ensure your pitch deck and financial documents are easily accessible and well-designed.
                </p>
              </div>
            )}

            {analytics && analytics.conversion_rate > 0.05 && (
              <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <p className="text-sm text-green-800 dark:text-green-200">
                  <strong>Great Performance!</strong> Your pitch is performing well. Keep monitoring and engage with interested investors.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle>Export Analytics</CardTitle>
          <CardDescription>
            Download detailed analytics reports for your records
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export PDF Report
            </Button>
            <Button variant="outline">
              <BarChart3 className="h-4 w-4 mr-2" />
              Export CSV Data
            </Button>
            <Button variant="outline">
              <Share2 className="h-4 w-4 mr-2" />
              Share Analytics
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}