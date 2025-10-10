import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from 'recharts'
import {
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
  PieChart as PieChartIcon,
  Clock,
} from 'lucide-react'
import { formatCurrency, formatPercentage } from '@/lib/pitch-utils'
import type { PitchAnalytics as PitchAnalyticsType, Pitch } from '@/types/pitch'

interface PitchAnalyticsProps {
  pitch: Pitch
  analytics?: PitchAnalyticsType
  className?: string
}

export function PitchAnalytics({ pitch, analytics, className }: PitchAnalyticsProps) {
  // Mock data for demonstration - in real app, this would come from the analytics prop
  const mockAnalytics: PitchAnalyticsType = {
    pitch_id: pitch.id,
    total_views: 1247,
    unique_views: 892,
    average_time_on_page: 4.2,
    bounce_rate: 23.5,
    investor_interactions: 45,
    comments_count: 12,
    documents_downloaded: 67,
    conversion_rate: 3.6,
    top_referrers: ['Google', 'LinkedIn', 'AngelList', 'Direct'],
    views_over_time: [
      { date: '2024-01-01', views: 45, unique_views: 38 },
      { date: '2024-01-02', views: 52, unique_views: 44 },
      { date: '2024-01-03', views: 38, unique_views: 32 },
      { date: '2024-01-04', views: 61, unique_views: 51 },
      { date: '2024-01-05', views: 73, unique_views: 62 },
      { date: '2024-01-06', views: 89, unique_views: 75 },
      { date: '2024-01-07', views: 95, unique_views: 81 },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const currentAnalytics = analytics || mockAnalytics

  const formatDuration = (minutes: number) => {
    if (minutes < 1) {
      return `${Math.round(minutes * 60)}s`
    }
    return `${minutes.toFixed(1)}m`
  }

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) {
      return <TrendingUp className="h-4 w-4 text-green-600" />
    }
    if (current < previous) {
      return <TrendingDown className="h-4 w-4 text-red-600" />
    }
    return <Activity className="h-4 w-4 text-muted-foreground" />
  }

  const getTrendColor = (current: number, previous: number) => {
    if (current > previous) return 'text-green-600'
    if (current < previous) return 'text-red-600'
    return 'text-muted-foreground'
  }

  // Traffic sources data for pie chart
  const trafficSources = [
    { name: 'Direct', value: 35, color: '#8884d8' },
    { name: 'Google', value: 28, color: '#82ca9d' },
    { name: 'LinkedIn', value: 20, color: '#ffc658' },
    { name: 'AngelList', value: 12, color: '#ff7c7c' },
    { name: 'Other', value: 5, color: '#8dd1e1' },
  ]

  return (
    <div className={className}>
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="traffic">Traffic</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="conversion">Conversion</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Views</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{currentAnalytics.total_views.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {currentAnalytics.unique_views.toLocaleString()} unique
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg. Time</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatDuration(currentAnalytics.average_time_on_page)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {currentAnalytics.bounce_rate.toFixed(1)}% bounce rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Interactions</CardTitle>
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{currentAnalytics.investor_interactions}</div>
                <p className="text-xs text-muted-foreground">
                  {currentAnalytics.comments_count} comments
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversion</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatPercentage(currentAnalytics.conversion_rate)}</div>
                <p className="text-xs text-muted-foreground">
                  View to interaction rate
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Views Over Time Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Views Over Time
              </CardTitle>
              <CardDescription>
                Daily views and unique visitors for the past week
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={currentAnalytics.views_over_time}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    formatter={(value, name) => [value, name === 'views' ? 'Total Views' : 'Unique Views']}
                  />
                  <Area
                    type="monotone"
                    dataKey="views"
                    stackId="1"
                    stroke="#8884d8"
                    fill="#8884d8"
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="unique_views"
                    stackId="2"
                    stroke="#82ca9d"
                    fill="#82ca9d"
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="traffic" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Traffic Sources */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5" />
                  Traffic Sources
                </CardTitle>
                <CardDescription>
                  Where your pitch viewers are coming from
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={trafficSources}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {trafficSources.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top Referrers */}
            <Card>
              <CardHeader>
                <CardTitle>Top Referrers</CardTitle>
                <CardDescription>
                  Most common sources driving traffic to your pitch
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {currentAnalytics.top_referrers.map((referrer, index) => (
                    <div key={referrer} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <span className="font-medium">{referrer}</span>
                      </div>
                      <Badge variant="outline">
                        {trafficSources[index]?.value || 0}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Engagement Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Engagement Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Comments</span>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">{currentAnalytics.comments_count}</span>
                      {getTrendIcon(currentAnalytics.comments_count, 8)}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Document Downloads</span>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">{currentAnalytics.documents_downloaded}</span>
                      {getTrendIcon(currentAnalytics.documents_downloaded, 45)}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Investor Interactions</span>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">{currentAnalytics.investor_interactions}</span>
                      {getTrendIcon(currentAnalytics.investor_interactions, 32)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Engagement Rate */}
            <Card>
              <CardHeader>
                <CardTitle>Engagement Rate</CardTitle>
                <CardDescription>
                  How viewers are interacting with your pitch
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Overall Engagement</span>
                      <span className="text-sm text-muted-foreground">
                        {((currentAnalytics.investor_interactions + currentAnalytics.comments_count) / currentAnalytics.total_views * 100).toFixed(1)}%
                      </span>
                    </div>
                    <Progress
                      value={(currentAnalytics.investor_interactions + currentAnalytics.comments_count) / currentAnalytics.total_views * 100}
                      className="h-2"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Document Interest</span>
                      <span className="text-sm text-muted-foreground">
                        {(currentAnalytics.documents_downloaded / currentAnalytics.total_views * 100).toFixed(1)}%
                      </span>
                    </div>
                    <Progress
                      value={currentAnalytics.documents_downloaded / currentAnalytics.total_views * 100}
                      className="h-2"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="conversion" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Conversion Funnel
              </CardTitle>
              <CardDescription>
                Track how viewers move through your pitch engagement funnel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Views to Interactions */}
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Views → Interactions</span>
                      <span className="text-sm text-muted-foreground">
                        {currentAnalytics.investor_interactions} / {currentAnalytics.total_views}
                      </span>
                    </div>
                    <Progress
                      value={(currentAnalytics.investor_interactions / currentAnalytics.total_views) * 100}
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatPercentage(currentAnalytics.investor_interactions / currentAnalytics.total_views * 100)} conversion rate
                    </p>
                  </div>
                </div>

                {/* Interactions to Comments */}
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Interactions → Comments</span>
                      <span className="text-sm text-muted-foreground">
                        {currentAnalytics.comments_count} / {currentAnalytics.investor_interactions}
                      </span>
                    </div>
                    <Progress
                      value={(currentAnalytics.comments_count / currentAnalytics.investor_interactions) * 100}
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatPercentage(currentAnalytics.comments_count / currentAnalytics.investor_interactions * 100)} conversion rate
                    </p>
                  </div>
                </div>

                {/* Overall Conversion Summary */}
                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">Conversion Summary</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">View Rate</p>
                      <p className="text-lg font-semibold">100%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Interaction Rate</p>
                      <p className="text-lg font-semibold text-blue-600">
                        {formatPercentage(currentAnalytics.investor_interactions / currentAnalytics.total_views * 100)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Comment Rate</p>
                      <p className="text-lg font-semibold text-green-600">
                        {formatPercentage(currentAnalytics.comments_count / currentAnalytics.total_views * 100)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Overall Conversion</p>
                      <p className="text-lg font-semibold text-purple-600">
                        {formatPercentage(currentAnalytics.conversion_rate)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}