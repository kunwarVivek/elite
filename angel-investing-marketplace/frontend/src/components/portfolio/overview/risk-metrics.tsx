import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Shield,
  TrendingDown,
  Activity,
  Target,
  AlertTriangle,
  CheckCircle,
  Info,
  Zap
} from 'lucide-react'
import { useRiskMetrics } from '@/hooks/use-portfolio'
import { RiskMetrics as RiskData } from '@/types/portfolio'
import { formatPercentage, formatCurrency, getRiskColor } from '@/lib/portfolio-utils'

interface RiskMetricsProps {
  portfolioId: string
}

interface RiskMetricCardProps {
  title: string
  value: number
  format: 'percentage' | 'currency' | 'number'
  description: string
  icon: React.ReactNode
  riskLevel?: 'low' | 'medium' | 'high'
  trend?: 'up' | 'down' | 'neutral'
}

function RiskMetricCard({ title, value, format, description, icon, riskLevel, trend }: RiskMetricCardProps) {
  const formatValue = (val: number) => {
    switch (format) {
      case 'percentage':
        return formatPercentage(val)
      case 'currency':
        return formatCurrency(val)
      case 'number':
        return val.toFixed(1)
      default:
        return val.toString()
    }
  }

  const getRiskBadgeColor = (level?: string) => {
    switch (level) {
      case 'low':
        return 'bg-green-100 text-green-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'high':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="text-muted-foreground">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold mb-2">
          {formatValue(value)}
        </div>

        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-muted-foreground">
            {description}
          </p>
          {riskLevel && (
            <Badge className={`text-xs ${getRiskBadgeColor(riskLevel)}`}>
              {riskLevel.toUpperCase()}
            </Badge>
          )}
        </div>

        {title === 'Portfolio Risk Score' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span>Conservative</span>
              <span>Aggressive</span>
            </div>
            <Progress
              value={(value / 10) * 100}
              className="h-2"
            />
          </div>
        )}

        {title === 'Volatility' && (
          <div className="flex items-center space-x-2 mt-2">
            <Activity className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              Standard deviation of returns
            </span>
          </div>
        )}

        {title === 'Max Drawdown' && (
          <div className="flex items-center space-x-2 mt-2">
            <TrendingDown className="h-3 w-3 text-red-500" />
            <span className="text-xs text-muted-foreground">
              Largest peak-to-trough decline
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function RiskMetricsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-20 mb-2" />
            <Skeleton className="h-3 w-full mb-2" />
            <Skeleton className="h-5 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function RiskGauge({ score, title }: { score: number; title: string }) {
  const percentage = (score / 10) * 100
  const circumference = 2 * Math.PI * 45 // radius = 45
  const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`

  const getColor = (score: number) => {
    if (score <= 3) return '#22c55e' // green
    if (score <= 6) return '#eab308' // yellow
    return '#ef4444' // red
  }

  return (
    <div className="relative">
      <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-muted-foreground/20"
        />
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke={getColor(score)}
          strokeWidth="8"
          strokeDasharray={strokeDasharray}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold" style={{ color: getColor(score) }}>
            {score.toFixed(1)}
          </div>
          <div className="text-xs text-muted-foreground">/10</div>
        </div>
      </div>
    </div>
  )
}

export function RiskMetrics({ portfolioId }: RiskMetricsProps) {
  const { data: riskData, isLoading, error } = useRiskMetrics(portfolioId)

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <RiskMetricsSkeleton />
        </CardContent>
      </Card>
    )
  }

  if (error || !riskData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Risk Analysis
          </CardTitle>
          <CardDescription>
            Portfolio risk assessment and metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            <div className="text-center">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Unable to load risk metrics</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Determine risk levels
  const getRiskLevel = (score: number): 'low' | 'medium' | 'high' => {
    if (score <= 3) return 'low'
    if (score <= 6) return 'medium'
    return 'high'
  }

  const riskLevel = getRiskLevel(riskData.portfolio_risk_score)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Risk Analysis
            </CardTitle>
            <CardDescription>
              Portfolio risk assessment and metrics
            </CardDescription>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-sm text-muted-foreground mb-1">Risk Score</div>
              <RiskGauge score={riskData.portfolio_risk_score} title="Risk Score" />
            </div>
            <Badge className={`text-sm ${getRiskBadgeColor(riskLevel)}`}>
              {riskLevel.toUpperCase()} RISK
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <RiskMetricCard
            title="Portfolio Risk Score"
            value={riskData.portfolio_risk_score}
            format="number"
            description="Overall risk assessment (1-10 scale)"
            icon={<Shield className="h-4 w-4" />}
            riskLevel={riskLevel}
          />

          <RiskMetricCard
            title="Volatility"
            value={riskData.volatility}
            format="percentage"
            description="Standard deviation of returns"
            icon={<Activity className="h-4 w-4" />}
            riskLevel={riskData.volatility > 0.3 ? 'high' : riskData.volatility > 0.15 ? 'medium' : 'low'}
          />

          <RiskMetricCard
            title="Sharpe Ratio"
            value={riskData.sharpe_ratio}
            format="number"
            description="Risk-adjusted return measure"
            icon={<TrendingUp className="h-4 w-4" />}
          />

          <RiskMetricCard
            title="Max Drawdown"
            value={riskData.max_drawdown}
            format="percentage"
            description="Largest peak-to-trough decline"
            icon={<TrendingDown className="h-4 w-4" />}
            riskLevel={Math.abs(riskData.max_drawdown) > 0.5 ? 'high' : Math.abs(riskData.max_drawdown) > 0.25 ? 'medium' : 'low'}
          />

          <RiskMetricCard
            title="Beta"
            value={riskData.beta}
            format="number"
            description="Market correlation measure"
            icon={<Target className="h-4 w-4" />}
          />

          <RiskMetricCard
            title="VaR (95%)"
            value={riskData.var_95}
            format="currency"
            description="Value at Risk at 95% confidence"
            icon={<AlertTriangle className="h-4 w-4" />}
          />

          <RiskMetricCard
            title="Diversification Ratio"
            value={riskData.diversification_ratio}
            format="number"
            description="Portfolio diversification effectiveness"
            icon={<Zap className="h-4 w-4" />}
          />

          <RiskMetricCard
            title="Concentration Risk"
            value={riskData.concentration_risk}
            format="percentage"
            description="Risk from concentrated positions"
            icon={<AlertTriangle className="h-4 w-4" />}
            riskLevel={riskData.concentration_risk > 0.3 ? 'high' : riskData.concentration_risk > 0.15 ? 'medium' : 'low'}
          />
        </div>

        {/* Risk Insights */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <Info className="h-4 w-4" />
            Risk Insights
          </h4>
          <div className="space-y-2 text-sm text-muted-foreground">
            {riskData.portfolio_risk_score <= 3 && (
              <p className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-500" />
                Your portfolio has low risk with good diversification
              </p>
            )}
            {riskData.portfolio_risk_score > 6 && (
              <p className="flex items-center gap-2">
                <AlertTriangle className="h-3 w-3 text-yellow-500" />
                Consider diversifying to reduce concentration risk
              </p>
            )}
            {riskData.volatility > 0.3 && (
              <p className="flex items-center gap-2">
                <Activity className="h-3 w-3 text-red-500" />
                High volatility detected - monitor closely
              </p>
            )}
            {riskData.sharpe_ratio > 1 && (
              <p className="flex items-center gap-2">
                <TrendingUp className="h-3 w-3 text-green-500" />
                Good risk-adjusted returns
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}