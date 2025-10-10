import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  Pause,
  Play,
  RefreshCw,
  Server,
  TrendingUp,
  Users,
  Zap,
  BarChart3,
  Settings,
  Eye,
  Filter
} from 'lucide-react';
import { formatNumber, formatDuration, formatTimeAgo } from '@/lib/utils';

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

interface SystemMetrics {
  timestamp: string;
  uptime: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  queues: {
    total: number;
    active: number;
    idle: number;
  };
  workers: {
    total: number;
    active: number;
    idle: number;
  };
  database: {
    connections: number;
    queriesPerSecond: number;
    averageQueryTime: number;
  };
  websocket: {
    connections: number;
    rooms: number;
    messagesPerSecond: number;
  };
}

export const QueueMonitor: React.FC = () => {
  const [queueMetrics, setQueueMetrics] = useState<Record<string, QueueMetrics>>({});
  const [activeJobs, setActiveJobs] = useState<JobMetrics[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [selectedQueue, setSelectedQueue] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch monitoring data
  const fetchMonitoringData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [dashboardResponse, activeJobsResponse] = await Promise.all([
        fetch('/api/admin/monitoring/dashboard'),
        fetch('/api/admin/monitoring/active-jobs')
      ]);

      if (!dashboardResponse.ok || !activeJobsResponse.ok) {
        throw new Error('Failed to fetch monitoring data');
      }

      const [dashboardData, activeJobsData] = await Promise.all([
        dashboardResponse.json(),
        activeJobsResponse.json()
      ]);

      if (dashboardData.success) {
        setQueueMetrics(dashboardData.data.queues);
        setSystemMetrics(dashboardData.data.system);
      }

      if (activeJobsData.success) {
        setActiveJobs(activeJobsData.data);
      }

      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch monitoring data');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    fetchMonitoringData();

    if (!autoRefresh) return;

    const interval = setInterval(fetchMonitoringData, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleQueueAction = async (queueName: string, action: 'pause' | 'resume') => {
    try {
      const response = await fetch(`/api/admin/queues/${queueName}/${action}`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} queue`);
      }

      // Refresh data after action
      await fetchMonitoringData();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} queue`);
    }
  };

  const getQueueStatusColor = (metrics: QueueMetrics) => {
    if (metrics.errorRate > 10) return 'destructive';
    if (metrics.waiting > 100) return 'secondary';
    return 'default';
  };

  const getQueueStatusIcon = (metrics: QueueMetrics) => {
    if (metrics.errorRate > 10) return <AlertTriangle className="h-4 w-4" />;
    if (metrics.waiting > 100) return <Clock className="h-4 w-4" />;
    return <CheckCircle className="h-4 w-4" />;
  };

  const getJobStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'active': return 'bg-blue-500';
      case 'waiting': return 'bg-yellow-500';
      case 'failed': return 'bg-red-500';
      case 'delayed': return 'bg-purple-500';
      case 'paused': return 'bg-gray-500';
      default: return 'bg-gray-400';
    }
  };

  const getJobStatusVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'active': return 'secondary';
      case 'waiting': return 'outline';
      case 'failed': return 'destructive';
      case 'delayed': return 'secondary';
      case 'paused': return 'outline';
      default: return 'outline';
    }
  };

  const selectedQueueMetrics = selectedQueue ? queueMetrics[selectedQueue] : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Queue Monitor Dashboard
              </CardTitle>
              <CardDescription>
                Real-time monitoring of BullMQ queues and job processing
                {lastRefresh && (
                  <span className="ml-2 text-xs">
                    • Last updated {formatTimeAgo(lastRefresh)}
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                {autoRefresh ? 'Auto ON' : 'Auto OFF'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchMonitoringData}
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

      {/* System Overview */}
      {systemMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Queues</span>
              </div>
              <div className="text-2xl font-bold">{systemMetrics.queues.total}</div>
              <div className="text-sm text-muted-foreground">
                {systemMetrics.queues.active} active, {systemMetrics.queues.idle} idle
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Workers</span>
              </div>
              <div className="text-2xl font-bold">{systemMetrics.workers.total}</div>
              <div className="text-sm text-muted-foreground">
                {systemMetrics.workers.active} active, {systemMetrics.workers.idle} idle
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">CPU Usage</span>
              </div>
              <div className="text-2xl font-bold">{systemMetrics.cpu.usage.toFixed(1)}%</div>
              <Progress value={systemMetrics.cpu.usage} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Memory</span>
              </div>
              <div className="text-2xl font-bold">{systemMetrics.memory.percentage.toFixed(1)}%</div>
              <Progress value={systemMetrics.memory.percentage} className="mt-2" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Queue Metrics Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="queues">Queues</TabsTrigger>
          <TabsTrigger value="jobs">Active Jobs</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Queue Status Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Queue Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(queueMetrics).map(([queueName, metrics]) => (
                    <div key={queueName} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getQueueStatusIcon(metrics)}
                        <div>
                          <div className="font-medium">{queueName}</div>
                          <div className="text-sm text-muted-foreground">
                            {metrics.waiting} waiting, {metrics.active} active
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getQueueStatusColor(metrics)}>
                          {metrics.errorRate > 10 ? 'High Error' : metrics.waiting > 100 ? 'Backlog' : 'Healthy'}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedQueue(queueName)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* System Health */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">System Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Database</span>
                    <Badge variant={systemMetrics?.database.connections ? 'default' : 'destructive'}>
                      {systemMetrics?.database.connections || 0} connections
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">WebSocket</span>
                    <Badge variant={systemMetrics?.websocket.connections ? 'default' : 'destructive'}>
                      {systemMetrics?.websocket.connections || 0} connections
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">Uptime</span>
                    <span className="text-sm font-mono">
                      {systemMetrics ? formatDuration(systemMetrics.uptime) : 'N/A'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm">Last Update</span>
                    <span className="text-sm">
                      {lastRefresh ? formatTimeAgo(lastRefresh) : 'Never'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="queues" className="space-y-4">
          {selectedQueueMetrics ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    {getQueueStatusIcon(selectedQueueMetrics)}
                    {selectedQueueMetrics.queueName} Details
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {selectedQueueMetrics.paused ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQueueAction(selectedQueueMetrics.queueName, 'resume')}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Resume
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleQueueAction(selectedQueueMetrics.queueName, 'pause')}
                      >
                        <Pause className="h-4 w-4 mr-1" />
                        Pause
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{selectedQueueMetrics.waiting}</div>
                    <div className="text-sm text-muted-foreground">Waiting</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{selectedQueueMetrics.active}</div>
                    <div className="text-sm text-muted-foreground">Active</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{selectedQueueMetrics.completed}</div>
                    <div className="text-sm text-muted-foreground">Completed</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{selectedQueueMetrics.failed}</div>
                    <div className="text-sm text-muted-foreground">Failed</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3">Performance Metrics</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm">Avg Processing Time</span>
                        <span className="text-sm font-mono">
                          {formatDuration(selectedQueueMetrics.processingTime.average)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Success Rate</span>
                        <span className="text-sm font-mono">
                          {selectedQueueMetrics.successRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Error Rate</span>
                        <span className="text-sm font-mono text-red-600">
                          {selectedQueueMetrics.errorRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Throughput</span>
                        <span className="text-sm font-mono">
                          {selectedQueueMetrics.throughput.jobsPerHour.toFixed(1)}/hr
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3">Processing Times</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm">Min</span>
                        <span className="text-sm font-mono">
                          {formatDuration(selectedQueueMetrics.processingTime.min)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Max</span>
                        <span className="text-sm font-mono">
                          {formatDuration(selectedQueueMetrics.processingTime.max)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">95th Percentile</span>
                        <span className="text-sm font-mono">
                          {formatDuration(selectedQueueMetrics.processingTime.p95)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <Server className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium mb-2">Select a Queue</h3>
                  <p className="text-sm text-muted-foreground">
                    Click on a queue in the overview to see detailed metrics.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="jobs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Active Jobs ({activeJobs.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeJobs.length > 0 ? (
                <div className="space-y-3">
                  {activeJobs.slice(0, 20).map((job) => (
                    <div key={job.jobId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${getJobStatusColor(job.status)}`} />
                        <div>
                          <div className="font-medium">{job.jobName}</div>
                          <div className="text-sm text-muted-foreground">
                            Queue: {job.queueName} • ID: {job.jobId.slice(-8)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={getJobStatusVariant(job.status)}>
                          {job.status}
                        </Badge>
                        {job.progress > 0 && (
                          <div className="w-20">
                            <Progress value={job.progress} />
                          </div>
                        )}
                        <span className="text-sm text-muted-foreground">
                          {job.attempts}/{job.maxAttempts}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium mb-2">No Active Jobs</h3>
                  <p className="text-sm text-muted-foreground">
                    All queues are currently idle.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Charts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Queue Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(queueMetrics).map(([queueName, metrics]) => (
                    <div key={queueName} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{queueName}</span>
                        <span>{metrics.throughput.jobsPerHour.toFixed(1)} jobs/hour</span>
                      </div>
                      <Progress
                        value={Math.min((metrics.throughput.jobsPerHour / 100) * 100, 100)}
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Error Rates */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Error Rates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(queueMetrics).map(([queueName, metrics]) => (
                    <div key={queueName} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{queueName}</span>
                        <span className={metrics.errorRate > 5 ? 'text-red-600' : 'text-green-600'}>
                          {metrics.errorRate.toFixed(1)}%
                        </span>
                      </div>
                      <Progress
                        value={metrics.errorRate}
                        className={`h-2 ${metrics.errorRate > 5 ? '[&>div]:bg-red-500' : '[&>div]:bg-green-500'}`}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default QueueMonitor;