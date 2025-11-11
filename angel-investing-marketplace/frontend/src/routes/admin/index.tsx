import { createFileRoute, Link } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Users,
  DollarSign,
  TrendingUp,
  Activity,
  UserCheck,
  AlertCircle,
  FileText,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import { useAuth } from '@/providers/AuthProvider'
import { useEffect } from 'react'
import { redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/')({
  beforeLoad: ({ context }) => {
    // Check if user is admin
    const user = localStorage.getItem('user')
    if (user) {
      const userData = JSON.parse(user)
      if (userData.role !== 'ADMIN') {
        throw redirect({ to: '/dashboard' })
      }
    } else {
      throw redirect({ to: '/auth/login' })
    }
  },
  component: AdminDashboard,
})

function AdminDashboard() {
  // Mock data - replace with actual API calls
  const stats = {
    totalUsers: 1247,
    userGrowth: 12.5,
    activeSubscriptions: 342,
    subscriptionGrowth: 8.3,
    mrr: 24580,
    mrrGrowth: 15.2,
    churnRate: 3.1,
    churnChange: -0.8,
  }

  const recentActivity = [
    { id: 1, user: 'John Doe', action: 'Upgraded to Pro', time: '2 hours ago' },
    { id: 2, user: 'Jane Smith', action: 'Created SAFE agreement', time: '3 hours ago' },
    { id: 3, user: 'Mike Johnson', action: 'Signed up (Free)', time: '4 hours ago' },
    { id: 4, user: 'Sarah Williams', action: 'Canceled subscription', time: '5 hours ago' },
    { id: 5, user: 'David Brown', action: 'Submitted startup for review', time: '6 hours ago' },
  ]

  const pendingApprovals = [
    { id: 1, type: 'KYC Verification', user: 'Emily Davis', priority: 'high' },
    { id: 2, type: 'Startup Review', company: 'TechCo Inc.', priority: 'medium' },
    { id: 3, type: 'Accreditation', user: 'Robert Wilson', priority: 'high' },
    { id: 4, type: 'Document Review', user: 'Lisa Anderson', priority: 'low' },
  ]

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Platform overview and management
          </p>
        </div>

        {/* Stats Grid */}
        <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
              <div className="flex items-center text-xs text-green-600">
                <ArrowUpRight className="mr-1 h-3 w-3" />
                {stats.userGrowth}% from last month
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeSubscriptions}</div>
              <div className="flex items-center text-xs text-green-600">
                <ArrowUpRight className="mr-1 h-3 w-3" />
                {stats.subscriptionGrowth}% from last month
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">MRR</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.mrr.toLocaleString()}</div>
              <div className="flex items-center text-xs text-green-600">
                <ArrowUpRight className="mr-1 h-3 w-3" />
                {stats.mrrGrowth}% from last month
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.churnRate}%</div>
              <div className="flex items-center text-xs text-green-600">
                <ArrowDownRight className="mr-1 h-3 w-3" />
                {Math.abs(stats.churnChange)}% from last month
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Recent Activity */}
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Activity</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin/activity">View All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                        <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <div className="font-medium">{activity.user}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {activity.action}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {activity.time}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Pending Approvals */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Pending Approvals</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin/approvals">View All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingApprovals.map((approval) => (
                  <div
                    key={approval.id}
                    className="flex items-start justify-between border-b pb-4 last:border-0 last:pb-0"
                  >
                    <div className="flex items-start gap-3">
                      <AlertCircle
                        className={`mt-0.5 h-5 w-5 ${
                          approval.priority === 'high'
                            ? 'text-red-600'
                            : approval.priority === 'medium'
                            ? 'text-yellow-600'
                            : 'text-gray-600'
                        }`}
                      />
                      <div>
                        <div className="font-medium">{approval.type}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {approval.user || approval.company}
                        </div>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      Review
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Link to="/admin/users">
            <Card className="cursor-pointer transition-all hover:border-blue-500 hover:shadow-md">
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                  <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="font-semibold">User Management</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Manage all users
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin/subscriptions">
            <Card className="cursor-pointer transition-all hover:border-blue-500 hover:shadow-md">
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900">
                  <CreditCard className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <div className="font-semibold">Subscriptions</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Manage billing
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin/analytics">
            <Card className="cursor-pointer transition-all hover:border-blue-500 hover:shadow-md">
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900">
                  <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <div className="font-semibold">Analytics</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Platform insights
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin/startups">
            <Card className="cursor-pointer transition-all hover:border-blue-500 hover:shadow-md">
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900">
                  <FileText className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <div className="font-semibold">Startups</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Review startups
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  )
}
