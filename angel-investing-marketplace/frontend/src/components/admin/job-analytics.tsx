import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Filter,
  Download,
  Calendar,
  Activity,
  Zap,
  Target
} from 'lucide-react';
import { formatNumber, formatDuration, formatTimeAgo, formatDate } from '@/lib/utils';

interface JobMetrics {
  jobId: string;
  jobName: string;
  queueName: string;
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'paused';
  progress: number;
  attempts: number;
  maxAttempts: number;
  processingTime?: number;
  queuedAt: string;
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
  error?: string;
  workerId?: string;
  metadata?: Record<string, any>;
}

interface QueueMetrics {
  queueName: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
  processingTime: {
    average: number;
    min: number;
    max: number;
    p95: number;
  };
  throughput: {
    jobsPerSecond: number;
    jobsPerMinute: number;
    jobsPerHour: number;
  };
  errorRate: number;
  successRate: number;
  lastUpdated: string;
}

export const JobAnalytics: React.FC = () => {
  const [jobMetrics, setJobMetrics] = useState<JobMetrics[]>([]);
  const [queueMetrics, setQueueMetrics] = useState<Record<string, QueueMetrics>>({});
  const [selectedTimeRange, setSelectedTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [selectedQueue, setSelectedQueue] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Fetch analytics data
  const fetchAnalyticsData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [activeJobsResponse, queueMetricsResponse] = await Promise.all([
        fetch('/api/admin/monitoring/active-jobs'),
        fetch(`/api/admin/monitoring/queues?hours=${selectedTimeRange === '1h' ? 1 : selectedTimeRange === '24h' ? 24 : selectedTimeRange === '7d' ? 168 : 720}`)
      ]);

      if (!activeJobsResponse.ok || !queueMetricsResponse.ok) {
        throw new Error('Failed to fetch analytics data');
      }

      const [activeJobsData, queueMetricsData] = await Promise.all([
        activeJobsResponse.json(),
        queueMetricsResponse.json()
      ]);

      if (activeJobsData.success) {
        setJobMetrics(activeJobsData.data);
      }

      if (queueMetricsData.success) {
        setQueueMetrics(queueMetricsData.data.queues || {});
      }

      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();

    const interval = setInterval(fetchAnalyticsData, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, [selectedTimeRange]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'active': return 'text-blue-600 bg-blue-100';
      case 'waiting': return 'text-yellow-600 bg-yellow-100';
      case 'failed': return 'text-red-600 bg-red-100';
      case 'delayed': return 'text-purple-600 bg-purple-100';
      case 'paused': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'active': return <Activity className="h-4 w-4" />;
      case 'waiting': return <Clock className="h-4 w-4" />;
      case 'failed': return <XCircle className="h-4 w-4" />;
      case 'delayed': return <AlertTriangle className="h-4 w-4" />;
      case 'paused': return <Activity className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const calculateJobStats = () => {
    const total = jobMetrics.length;
    const completed = jobMetrics.filter(job => job.status === 'completed').length;
    const failed = jobMetrics.filter(job => job.status === 'failed').length;
    const active = jobMetrics.filter(job => job.status === 'active').length;
    const waiting = jobMetrics.filter(job => job.status === 'waiting').length;

    const avgProcessingTime = jobMetrics
      .filter(job => job.processingTime)
      .reduce((sum, job) => sum + (job.processingTime || 0), 0) /
      Math.max(jobMetrics.filter(job => job.processingTime).length, 1);

    const successRate = total > 0 ? (completed / total) * 100 : 0;

    return {
      total,
      completed,
      failed,
      active,
      waiting,
      avgProcessingTime,
      successRate
    };
  };

  const stats = calculateJobStats();

  const filteredJobs = selectedQueue
    ? jobMetrics.filter(job => job.queueName === selectedQueue)
    : jobMetrics;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Job Analytics Dashboard
              </CardTitle>
              <CardDescription>
                Detailed analytics and performance metrics for job processing
                {lastRefresh && (
                  <span className="ml-2 text-xs">
                    • Last updated {formatTimeAgo(lastRefresh)}
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedTimeRange}
                onChange={(e) => setSelectedTimeRange(e.target.value as any)}
                className="px-3 py-1 border rounded-md text-sm"
              >
                <option value="1h">Last Hour</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchAnalyticsData}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Total Jobs</span>
            </div>
            <div className="text-2xl font-bold">{formatNumber(stats.total)}</div>
            <div className="text-sm text-muted-foreground">
              Across all queues
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Success Rate</span>
            </div>
            <div className="text-2xl font-bold text-green-600">
              {stats.successRate.toFixed(1)}%
            </div>
            <div className="text-sm text-muted-foreground">
              {formatNumber(stats.completed)} completed
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Avg Processing</span>
            </div>
            <div className="text-2xl font-bold">
              {formatDuration(stats.avgProcessingTime)}
            </div>
            <div className="text-sm text-muted-foreground">
              Per job completion
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium">Active Now</span>
            </div>
            <div className="text-2xl font-bold text-purple-600">
              {formatNumber(stats.active)}
            </div>
            <div className="text-sm text-muted-foreground">
              Currently processing
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="jobs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="jobs">Active Jobs</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
        </TabsList>

        <TabsContent value="jobs" className="space-y-4">
          {/* Queue Filter */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Queue Filter</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={!selectedQueue ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedQueue(null)}
                >
                  All Queues
                </Button>
                {Object.keys(queueMetrics).map(queueName => (
                  <Button
                    key={queueName}
                    variant={selectedQueue === queueName ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedQueue(queueName)}
                  >
                    {queueName}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Jobs List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Active Jobs ({filteredJobs.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredJobs.length > 0 ? (
                <div className="space-y-3">
                  {filteredJobs.map((job) => (
                    <div key={job.jobId} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${getStatusColor(job.status)}`}>
                          {getStatusIcon(job.status)}
                        </div>
                        <div>
                          <div className="font-medium">{job.jobName}</div>
                          <div className="text-sm text-muted-foreground">
                            Queue: {job.queueName} • ID: {job.jobId.slice(-8)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Queued: {formatTimeAgo(new Date(job.queuedAt))}
                            {job.processingTime && (
                              <> • Processed: {formatDuration(job.processingTime)}</>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {job.progress > 0 && (
                          <div className="w-24">
                            <div className="flex justify-between text-xs mb-1">
                              <span>Progress</span>
                              <span>{job.progress}%</span>
                            </div>
                            <Progress value={job.progress} />
                          </div>
                        )}
                        <Badge variant="outline">
                          {job.attempts}/{job.maxAttempts}
                        </Badge>
                        {job.error && (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium mb-2">No Active Jobs</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedQueue ? `No jobs in ${selectedQueue} queue.` : 'No active jobs across all queues.'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Processing Times */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Processing Times
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(queueMetrics).map(([queueName, metrics]) => (
                    <div key={queueName} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{queueName}</span>
                        <span className="font-mono">
                          Avg: {formatDuration(metrics.processingTime.average)}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="text-center p-2 bg-muted rounded">
                          <div className="font-medium">Min</div>
                          <div>{formatDuration(metrics.processingTime.min)}</div>
                        </div>
                        <div className="text-center p-2 bg-muted rounded">
                          <div className="font-medium">Max</div>
                          <div>{formatDuration(metrics.processingTime.max)}</div>
                        </div>
                        <div className="text-center p-2 bg-muted rounded">
                          <div className="font-medium">95th</div>
                          <div>{formatDuration(metrics.processingTime.p95)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Throughput */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Throughput
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(queueMetrics).map(([queueName, metrics]) => (
                    <div key={queueName} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{queueName}</span>
                        <span className="font-mono">
                          {formatNumber(metrics.throughput.jobsPerHour)}/hour
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="text-center p-2 bg-muted rounded">
                          <div className="font-medium">Per Second</div>
                          <div>{metrics.throughput.jobsPerSecond.toFixed(2)}</div>
                        </div>
                        <div className="text-center p-2 bg-muted rounded">
                          <div className="font-medium">Per Minute</div>
                          <div>{formatNumber(metrics.throughput.jobsPerMinute)}</div>
                        </div>
                        <div className="text-center p-2 bg-muted rounded">
                          <div className="font-medium">Per Hour</div>
                          <div>{formatNumber(metrics.throughput.jobsPerHour)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Queue Trends ({selectedTimeRange})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.entries(queueMetrics).map(([queueName, metrics]) => (
                  <div key={queueName} className="space-y-3">
                    <h4 className="font-medium">{queueName}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Success Rate</span>
                          <span className="font-mono text-green-600">
                            {metrics.successRate.toFixed(1)}%
                          </span>
                        </div>
                        <Progress value={metrics.successRate} className="[&>div]:bg-green-500" />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Error Rate</span>
                          <span className="font-mono text-red-600">
                            {metrics.errorRate.toFixed(1)}%
                          </span>
                        </div>
                        <Progress value={metrics.errorRate} className="[&>div]:bg-red-500" />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Queue Load</span>
                          <span className="font-mono">
                            {((metrics.active + metrics.waiting) / Math.max(metrics.completed + metrics.failed, 1) * 100).toFixed(1)}%
                          </span>
                        </div>
                        <Progress
                          value={Math.min(((metrics.active + metrics.waiting) / Math.max(metrics.completed + metrics.failed, 1) * 100), 100)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <XCircle className="h-5 w-5" />
                Failed Jobs
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredJobs.filter(job => job.status === 'failed').length > 0 ? (
                <div className="space-y-3">
                  {filteredJobs.filter(job => job.status === 'failed').map((job) => (
                    <div key={job.jobId} className="p-4 border border-red-200 rounded-lg bg-red-50/50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium text-red-900">{job.jobName}</div>
                        <Badge variant="destructive">
                          Failed ({job.attempts}/{job.maxAttempts})
                        </Badge>
                      </div>
                      <div className="text-sm text-red-700 mb-2">
                        Queue: {job.queueName} • ID: {job.jobId.slice(-8)}
                      </div>
                      {job.error && (
                        <div className="text-sm text-red-600 bg-red-100 p-2 rounded">
                          <strong>Error:</strong> {job.error}
                        </div>
                      )}
                      <div className="text-xs text-red-600 mt-2">
                        Failed: {job.failedAt ? formatTimeAgo(new Date(job.failedAt)) : 'Unknown'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="font-medium mb-2 text-green-900">No Failed Jobs</h3>
                  <p className="text-sm text-muted-foreground">
                    All jobs are processing successfully.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default JobAnalytics;