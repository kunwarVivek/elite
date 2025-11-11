import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  UserPlus,
  Percent,
  BarChart3,
  PieChart,
} from 'lucide-react'

export const Route = createFileRoute('/admin/analytics')({
  component: AdminAnalyticsPage,
})

function AdminAnalyticsPage() {
  const [timeRange, setTimeRange] = useState('30d')

  // Mock data - replace with actual API call
  const revenueData = {
    currentMRR: 11950,
    previousMRR: 10650,
    mrrGrowth: 12.2,
    currentARR: 143400,
    previousARR: 127800,
    arrGrowth: 12.2,
    averageRevenuePerUser: 78.6,
    lifetimeValue: 1850,
    churnRate: 3.2,
    netRevenueRetention: 115,
  }

  const userGrowthData = {
    totalUsers: 1523,
    previousTotalUsers: 1405,
    userGrowth: 8.4,
    newUsersThisMonth: 118,
    activeUsers: 1342,
    activeUserRate: 88.1,
    investorCount: 892,
    founderCount: 631,
  }

  const conversionMetrics = {
    visitorToSignup: 6.8,
    signupToActive: 72.5,
    freeToTrial: 18.3,
    trialToPaid: 12.5,
    overallConversion: 1.5,
  }

  // Monthly revenue by plan (mock data for chart)
  const monthlyRevenue = [
    { month: 'Jul', Free: 0, Pro: 2800, Growth: 3200, Enterprise: 1500 },
    { month: 'Aug', Free: 0, Pro: 3100, Growth: 3600, Enterprise: 1800 },
    { month: 'Sep', Free: 0, Pro: 3500, Growth: 4100, Enterprise: 2100 },
    { month: 'Oct', Free: 0, Pro: 3900, Growth: 4600, Enterprise: 2400 },
    { month: 'Nov', Free: 0, Pro: 4200, Growth: 5100, Enterprise: 2700 },
    { month: 'Dec', Free: 0, Pro: 4600, Growth: 5600, Enterprise: 3100 },
    { month: 'Jan', Free: 0, Pro: 5100, Growth: 6200, Enterprise: 3500 },
  ]

  // User growth over time
  const userGrowthOverTime = [
    { month: 'Jul', total: 987, investors: 578, founders: 409 },
    { month: 'Aug', total: 1068, investors: 625, founders: 443 },
    { month: 'Sep', total: 1156, investors: 676, founders: 480 },
    { month: 'Oct', total: 1249, investors: 730, founders: 519 },
    { month: 'Nov', total: 1345, investors: 787, founders: 558 },
    { month: 'Dec', total: 1405, investors: 822, founders: 583 },
    { month: 'Jan', total: 1523, investors: 892, founders: 631 },
  ]

  // Plan distribution
  const planDistribution = [
    { plan: 'Free', count: 672, percentage: 44.1, revenue: 0 },
    { plan: 'Investor Pro', count: 584, percentage: 38.3, revenue: 28616 },
    { plan: 'Founder Growth', count: 245, percentage: 16.1, revenue: 48755 },
    { plan: 'Enterprise', count: 22, percentage: 1.4, revenue: 66000 },
  ]

  // Cohort analysis (simplified)
  const cohortData = [
    { cohort: 'Jan 2024', month0: 100, month1: 95, month2: 92, month3: 88, month6: 82, month12: 75 },
    { cohort: 'Feb 2024', month0: 100, month1: 96, month2: 93, month3: 90, month6: 85, month12: null },
    { cohort: 'Mar 2024', month0: 100, month1: 94, month2: 91, month3: 87, month6: 83, month12: null },
    { cohort: 'Jun 2024', month0: 100, month1: 97, month2: 94, month3: 91, month6: null, month12: null },
    { cohort: 'Sep 2024', month0: 100, month1: 96, month2: 93, month3: null, month6: null, month12: null },
    { cohort: 'Dec 2024', month0: 100, month1: 97, month2: null, month3: null, month6: null, month12: null },
  ]

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/admin">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Platform Analytics</h1>
              <p className="mt-1 text-gray-600 dark:text-gray-400">
                Revenue metrics, user growth, and conversion analytics
              </p>
            </div>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="12m">Last 12 months</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="revenue" className="space-y-6">
          <TabsList>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="users">User Growth</TabsTrigger>
            <TabsTrigger value="conversion">Conversion</TabsTrigger>
            <TabsTrigger value="cohorts">Cohorts</TabsTrigger>
          </TabsList>

          {/* Revenue Tab */}
          <TabsContent value="revenue" className="space-y-6">
            {/* Key Revenue Metrics */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Monthly Recurring Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(revenueData.currentMRR)}</div>
                  <div className="mt-1 flex items-center text-xs">
                    <TrendingUp className="mr-1 h-3 w-3 text-green-600" />
                    <span className="text-green-600">{formatPercent(revenueData.mrrGrowth)}</span>
                    <span className="ml-1 text-muted-foreground">from last month</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Annual Recurring Revenue</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(revenueData.currentARR)}</div>
                  <div className="mt-1 flex items-center text-xs">
                    <TrendingUp className="mr-1 h-3 w-3 text-green-600" />
                    <span className="text-green-600">{formatPercent(revenueData.arrGrowth)}</span>
                    <span className="ml-1 text-muted-foreground">from last year</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Revenue Per User</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(revenueData.averageRevenuePerUser)}</div>
                  <p className="text-xs text-muted-foreground">per month</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Lifetime Value</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(revenueData.lifetimeValue)}</div>
                  <p className="text-xs text-muted-foreground">average LTV</p>
                </CardContent>
              </Card>
            </div>

            {/* Revenue Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Plan (Last 7 Months)</CardTitle>
                <CardDescription>Monthly recurring revenue breakdown by subscription tier</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {monthlyRevenue.map((month) => (
                    <div key={month.month}>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="font-medium">{month.month}</span>
                        <span className="text-muted-foreground">
                          {formatCurrency(month.Pro + month.Growth + month.Enterprise)}
                        </span>
                      </div>
                      <div className="flex h-8 overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-800">
                        <div
                          className="bg-blue-500"
                          style={{ width: `${(month.Pro / 15000) * 100}%` }}
                          title={`Pro: ${formatCurrency(month.Pro)}`}
                        />
                        <div
                          className="bg-green-500"
                          style={{ width: `${(month.Growth / 15000) * 100}%` }}
                          title={`Growth: ${formatCurrency(month.Growth)}`}
                        />
                        <div
                          className="bg-purple-500"
                          style={{ width: `${(month.Enterprise / 15000) * 100}%` }}
                          title={`Enterprise: ${formatCurrency(month.Enterprise)}`}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="mt-4 flex gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded bg-blue-500" />
                      <span>Investor Pro</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded bg-green-500" />
                      <span>Founder Growth</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded bg-purple-500" />
                      <span>Enterprise</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Plan Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Subscription Plan Distribution
                </CardTitle>
                <CardDescription>Current user distribution across pricing tiers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {planDistribution.map((plan) => (
                    <div key={plan.plan} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{plan.plan}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-muted-foreground">
                            {plan.count} users ({plan.percentage}%)
                          </span>
                          <span className="font-medium">{formatCurrency(plan.revenue)}/mo</span>
                        </div>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                        <div
                          className={`h-full ${
                            plan.plan === 'Free'
                              ? 'bg-gray-400'
                              : plan.plan === 'Investor Pro'
                              ? 'bg-blue-500'
                              : plan.plan === 'Founder Growth'
                              ? 'bg-green-500'
                              : 'bg-purple-500'
                          }`}
                          style={{ width: `${plan.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Additional Metrics */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Churn Rate</CardTitle>
                  <CardDescription>Monthly subscription cancellation rate</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    <div className="text-3xl font-bold">{revenueData.churnRate}%</div>
                    <div className="flex items-center text-sm text-green-600">
                      <TrendingDown className="mr-1 h-4 w-4" />
                      0.3% improvement
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Industry benchmark: 5-7% for B2B SaaS
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Net Revenue Retention</CardTitle>
                  <CardDescription>Revenue retention from existing customers</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    <div className="text-3xl font-bold">{revenueData.netRevenueRetention}%</div>
                    <div className="flex items-center text-sm text-green-600">
                      <TrendingUp className="mr-1 h-4 w-4" />
                      +5% from last quarter
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Above 100% indicates expansion revenue
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* User Growth Tab */}
          <TabsContent value="users" className="space-y-6">
            {/* Key User Metrics */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{userGrowthData.totalUsers.toLocaleString()}</div>
                  <div className="mt-1 flex items-center text-xs">
                    <TrendingUp className="mr-1 h-3 w-3 text-green-600" />
                    <span className="text-green-600">{formatPercent(userGrowthData.userGrowth)}</span>
                    <span className="ml-1 text-muted-foreground">from last month</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">New Users This Month</CardTitle>
                  <UserPlus className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{userGrowthData.newUsersThisMonth}</div>
                  <p className="text-xs text-muted-foreground">~4 per day</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{userGrowthData.activeUsers.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    {userGrowthData.activeUserRate}% activity rate
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Investor/Founder Split</CardTitle>
                  <Percent className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {((userGrowthData.investorCount / userGrowthData.totalUsers) * 100).toFixed(0)}% /{' '}
                    {((userGrowthData.founderCount / userGrowthData.totalUsers) * 100).toFixed(0)}%
                  </div>
                  <p className="text-xs text-muted-foreground">Investors / Founders</p>
                </CardContent>
              </Card>
            </div>

            {/* User Growth Chart */}
            <Card>
              <CardHeader>
                <CardTitle>User Growth Over Time</CardTitle>
                <CardDescription>Total users, investors, and founders (Last 7 months)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {userGrowthOverTime.map((month) => (
                    <div key={month.month}>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="font-medium">{month.month}</span>
                        <span className="text-muted-foreground">{month.total} users</span>
                      </div>
                      <div className="flex h-8 overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-800">
                        <div
                          className="bg-blue-500"
                          style={{ width: `${(month.investors / month.total) * 100}%` }}
                          title={`Investors: ${month.investors}`}
                        />
                        <div
                          className="bg-green-500"
                          style={{ width: `${(month.founders / month.total) * 100}%` }}
                          title={`Founders: ${month.founders}`}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="mt-4 flex gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded bg-blue-500" />
                      <span>Investors ({userGrowthData.investorCount})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded bg-green-500" />
                      <span>Founders ({userGrowthData.founderCount})</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Conversion Tab */}
          <TabsContent value="conversion" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Conversion Funnel</CardTitle>
                <CardDescription>User journey from visitor to paying customer</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Visitor to Signup */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium">Visitor → Signup</span>
                    <span className="text-2xl font-bold text-blue-600">{conversionMetrics.visitorToSignup}%</span>
                  </div>
                  <div className="h-12 overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-800">
                    <div
                      className="h-full bg-blue-500"
                      style={{ width: `${conversionMetrics.visitorToSignup * 10}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Industry avg: 2-5%</p>
                </div>

                {/* Signup to Active */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium">Signup → Active User</span>
                    <span className="text-2xl font-bold text-green-600">{conversionMetrics.signupToActive}%</span>
                  </div>
                  <div className="h-12 overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-800">
                    <div
                      className="h-full bg-green-500"
                      style={{ width: `${conversionMetrics.signupToActive}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Completed onboarding and profile</p>
                </div>

                {/* Free to Trial */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium">Free → Trial</span>
                    <span className="text-2xl font-bold text-yellow-600">{conversionMetrics.freeToTrial}%</span>
                  </div>
                  <div className="h-12 overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-800">
                    <div
                      className="h-full bg-yellow-500"
                      style={{ width: `${conversionMetrics.freeToTrial}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Started 14-day trial</p>
                </div>

                {/* Trial to Paid */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium">Trial → Paid</span>
                    <span className="text-2xl font-bold text-purple-600">{conversionMetrics.trialToPaid}%</span>
                  </div>
                  <div className="h-12 overflow-hidden rounded-lg bg-gray-200 dark:bg-gray-800">
                    <div
                      className="h-full bg-purple-500"
                      style={{ width: `${conversionMetrics.trialToPaid}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Industry avg: 10-15%</p>
                </div>

                {/* Overall Conversion */}
                <div className="mt-8 rounded-lg border bg-slate-100 p-4 dark:bg-slate-800">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-semibold">Overall Conversion (Visitor → Paid)</span>
                    <span className="text-3xl font-bold text-blue-600">{conversionMetrics.overallConversion}%</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Out of 10,000 visitors, approximately {Math.round(10000 * (conversionMetrics.overallConversion / 100))} become paying customers
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Optimization Opportunities */}
            <Card>
              <CardHeader>
                <CardTitle>Optimization Opportunities</CardTitle>
                <CardDescription>Areas to improve conversion rates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3 rounded-lg border p-4">
                    <TrendingUp className="mt-1 h-5 w-5 text-green-600" />
                    <div>
                      <div className="font-medium">High Visitor → Signup Rate</div>
                      <div className="text-sm text-muted-foreground">
                        Your {conversionMetrics.visitorToSignup}% conversion is above industry average. Landing page is performing well.
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-lg border p-4">
                    <TrendingDown className="mt-1 h-5 w-5 text-yellow-600" />
                    <div>
                      <div className="font-medium">Improve Trial Conversion</div>
                      <div className="text-sm text-muted-foreground">
                        {conversionMetrics.trialToPaid}% trial-to-paid is slightly below target. Consider improving onboarding and feature discovery.
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-lg border p-4">
                    <TrendingUp className="mt-1 h-5 w-5 text-blue-600" />
                    <div>
                      <div className="font-medium">Focus on Free-to-Trial</div>
                      <div className="text-sm text-muted-foreground">
                        Only {conversionMetrics.freeToTrial}% of free users start trials. Test upgrade prompts and feature gating.
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cohorts Tab */}
          <TabsContent value="cohorts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Cohort Retention Analysis</CardTitle>
                <CardDescription>
                  Percentage of users retained over time by signup cohort
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-sm">
                        <th className="pb-3 pr-4 text-left font-medium">Cohort</th>
                        <th className="px-4 pb-3 text-center font-medium">Month 0</th>
                        <th className="px-4 pb-3 text-center font-medium">Month 1</th>
                        <th className="px-4 pb-3 text-center font-medium">Month 2</th>
                        <th className="px-4 pb-3 text-center font-medium">Month 3</th>
                        <th className="px-4 pb-3 text-center font-medium">Month 6</th>
                        <th className="px-4 pb-3 text-center font-medium">Month 12</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cohortData.map((cohort) => (
                        <tr key={cohort.cohort} className="border-b text-sm">
                          <td className="py-3 pr-4 font-medium">{cohort.cohort}</td>
                          <td className="bg-green-100 px-4 py-3 text-center dark:bg-green-900">
                            {cohort.month0}%
                          </td>
                          <td
                            className={`px-4 py-3 text-center ${
                              cohort.month1 >= 95
                                ? 'bg-green-100 dark:bg-green-900'
                                : cohort.month1 >= 90
                                ? 'bg-yellow-100 dark:bg-yellow-900'
                                : 'bg-red-100 dark:bg-red-900'
                            }`}
                          >
                            {cohort.month1}%
                          </td>
                          <td
                            className={`px-4 py-3 text-center ${
                              cohort.month2
                                ? cohort.month2 >= 90
                                  ? 'bg-green-100 dark:bg-green-900'
                                  : cohort.month2 >= 85
                                  ? 'bg-yellow-100 dark:bg-yellow-900'
                                  : 'bg-red-100 dark:bg-red-900'
                                : 'bg-gray-100 dark:bg-gray-800'
                            }`}
                          >
                            {cohort.month2 ? `${cohort.month2}%` : '-'}
                          </td>
                          <td
                            className={`px-4 py-3 text-center ${
                              cohort.month3
                                ? cohort.month3 >= 85
                                  ? 'bg-green-100 dark:bg-green-900'
                                  : cohort.month3 >= 80
                                  ? 'bg-yellow-100 dark:bg-yellow-900'
                                  : 'bg-red-100 dark:bg-red-900'
                                : 'bg-gray-100 dark:bg-gray-800'
                            }`}
                          >
                            {cohort.month3 ? `${cohort.month3}%` : '-'}
                          </td>
                          <td
                            className={`px-4 py-3 text-center ${
                              cohort.month6
                                ? cohort.month6 >= 80
                                  ? 'bg-green-100 dark:bg-green-900'
                                  : cohort.month6 >= 75
                                  ? 'bg-yellow-100 dark:bg-yellow-900'
                                  : 'bg-red-100 dark:bg-red-900'
                                : 'bg-gray-100 dark:bg-gray-800'
                            }`}
                          >
                            {cohort.month6 ? `${cohort.month6}%` : '-'}
                          </td>
                          <td
                            className={`px-4 py-3 text-center ${
                              cohort.month12
                                ? cohort.month12 >= 75
                                  ? 'bg-green-100 dark:bg-green-900'
                                  : cohort.month12 >= 70
                                  ? 'bg-yellow-100 dark:bg-yellow-900'
                                  : 'bg-red-100 dark:bg-red-900'
                                : 'bg-gray-100 dark:bg-gray-800'
                            }`}
                          >
                            {cohort.month12 ? `${cohort.month12}%` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-6 space-y-2 text-sm text-muted-foreground">
                  <p>
                    <strong>Interpretation:</strong> Green indicates strong retention (≥85%), yellow indicates
                    moderate retention, and red indicates concerning retention.
                  </p>
                  <p>
                    Recent cohorts (Dec 2024) show 97% 1-month retention, indicating strong product-market fit and
                    improved onboarding.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
