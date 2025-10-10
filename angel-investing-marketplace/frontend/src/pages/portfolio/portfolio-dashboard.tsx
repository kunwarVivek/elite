import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  TrendingUp,
  PieChart,
  Target,
  Settings,
  Plus,
  Bell,
  RefreshCw,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { PortfolioOverviewCards } from '@/components/portfolio/overview/portfolio-overview-cards'
import { PerformanceChart } from '@/components/portfolio/overview/performance-chart'
import { RecentActivity } from '@/components/portfolio/overview/recent-activity'
import { AssetAllocation } from '@/components/portfolio/overview/asset-allocation'
import { RiskMetrics } from '@/components/portfolio/overview/risk-metrics'
import { InvestmentList } from '@/components/portfolio/investments/investment-list'
import { InvestmentDetail } from '@/components/portfolio/investments/investment-detail'
import { PortfolioAnalytics } from '@/components/portfolio/analytics/portfolio-analytics'
import { BenchmarkComparisonTools } from '@/components/portfolio/analytics/benchmark-comparison'
import { RiskAnalysis } from '@/components/portfolio/analytics/risk-analysis'
import { TaxReporting } from '@/components/portfolio/tax-reporting'
import { ExportReports } from '@/components/portfolio/export-reports'
import { PortfolioOptimization } from '@/components/portfolio/portfolio-optimization'
import { DiversificationAnalysis } from '@/components/portfolio/diversification-analysis'
import { RiskManagement } from '@/components/portfolio/risk-management'
import { GoalTracking } from '@/components/portfolio/goal-tracking'
import { AlertSystem } from '@/components/portfolio/alert-system'
import { PortfolioSettings } from '@/components/portfolio/portfolio-settings'
import { usePortfolioSummary } from '@/hooks/use-portfolio'
import { usePortfolioAlertsRealtime } from '@/hooks/use-portfolio-realtime'

export function PortfolioDashboard() {
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedInvestmentId, setSelectedInvestmentId] = useState<string | null>(null)
  const { data: summary } = usePortfolioSummary()
  const { alerts } = usePortfolioAlertsRealtime()

  const unreadAlerts = alerts.filter(alert => !alert.read).length

  if (selectedInvestmentId) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <InvestmentDetail
          investmentId={selectedInvestmentId}
          onClose={() => setSelectedInvestmentId(null)}
        />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Investment Portfolio</h1>
          <p className="text-muted-foreground">
            Track and manage your startup investments
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadAlerts > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <Bell className="h-3 w-3" />
              {unreadAlerts} alert{unreadAlerts !== 1 ? 's' : ''}
            </Badge>
          )}

          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>

          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Investment
          </Button>
        </div>
      </div>

      {/* Portfolio Overview Cards */}
      <PortfolioOverviewCards />

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="investments">Investments</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="risk">Risk</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PerformanceChart portfolioId="current" height={400} />
            <div className="space-y-6">
              <AssetAllocation portfolioId="current" />
              <RecentActivity portfolioId="current" maxHeight="300px" />
            </div>
          </div>

          <RiskMetrics portfolioId="current" />
        </TabsContent>

        <TabsContent value="investments" className="space-y-6">
          <InvestmentList
            onInvestmentSelect={(investment) => setSelectedInvestmentId(investment.id)}
            showFilters={true}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PortfolioAnalytics portfolioId="current" />
            <BenchmarkComparisonTools portfolioId="current" />
          </div>
        </TabsContent>

        <TabsContent value="risk" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RiskAnalysis portfolioId="current" />
            <RiskManagement portfolioId="current" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DiversificationAnalysis portfolioId="current" />
            <AlertSystem portfolioId="current" />
          </div>
        </TabsContent>

        <TabsContent value="goals" className="space-y-6">
          <GoalTracking portfolioId="current" />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <PortfolioSettings portfolioId="current" />
        </TabsContent>
      </Tabs>

      {/* Additional Features Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Portfolio Optimization
            </CardTitle>
            <CardDescription>
              Get AI-powered recommendations to improve your portfolio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">
              View Recommendations
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Tax Reporting
            </CardTitle>
            <CardDescription>
              Generate tax documents and track capital gains
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">
              Generate Reports
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Export Data
            </CardTitle>
            <CardDescription>
              Export portfolio data in various formats
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">
              Export Reports
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}