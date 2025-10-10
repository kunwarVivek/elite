import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import {
  Shield,
  AlertTriangle,
  TrendingDown,
  Activity,
  Target,
  Zap,
  Info,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react'
import { useRiskMetrics } from '@/hooks/use-portfolio'
import { RiskMetrics } from '@/types/portfolio'
import { formatPercentage, formatCurrency, getRiskColor } from '@/lib/portfolio-utils'

interface RiskAnalysisProps {
  portfolioId: string
}

interface RiskFactor {
  name: string
  value: number
  description: string
  impact: 'low' | 'medium' | 'high'
}

function RiskRadarChart({ data }: { data: RiskFactor[] }) {
  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="name" tick={{ fontSize: 12 }} />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fontSize: 10 }}
            tickFormatter={(value) => `${value}%`}
          />
          <Radar
            name="Risk Level"
            dataKey="value"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.3}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}

function RiskBreakdownChart({ data }: { data: any[] }) {
  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))']

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="horizontal">
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis type="number" tickFormatter={(value) => formatPercentage(value)} />
          <YAxis dataKey="factor" type="category" width={80} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(value: number) => formatPercentage(value)} />
          <Bar dataKey="contribution" fill="hsl(var(--primary))" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function RiskRecommendations({ riskData }: { riskData: RiskMetrics }) {
  const recommendations = []

  if (riskData.portfolio_risk_score > 7) {
    recommendations.push({
      type: 'high',
      title: 'High Risk Portfolio',
      description: 'Consider diversifying into lower-risk investments to reduce overall portfolio volatility.',
      action: 'Review asset allocation and consider adding defensive positions.'
    })
  }

  if (riskData.concentration_risk > 0.3) {
    recommendations.push({
      type: 'warning',
      title: 'Concentration Risk',
      description: 'Your portfolio has high concentration in a few investments.',
      action: 'Consider rebalancing to reduce exposure to individual companies.'
    })
  }

  if (riskData.volatility > 0.25) {
    recommendations.push({
      type: 'medium',
      title: 'High Volatility',
      description: 'Portfolio shows higher than average price fluctuations.',
      action: 'Monitor investments closely and consider hedging strategies.'
    })
  }

  if (riskData.sharpe_ratio < 0.5) {
    recommendations.push({
      type: 'info',
      title: 'Low Risk-Adjusted Returns',
      description: 'Returns may not be compensating adequately for the risk taken.',
      action: 'Evaluate whether the risk level matches your investment objectives.'
    })
  }

  if (recommendations.length === 0) {
    recommendations.push({
      type: 'success',
      title: 'Good Risk Profile',
      description: 'Your portfolio risk metrics are within acceptable ranges.',
      action: 'Continue monitoring and maintain current diversification strategy.'
    })
  }

  const getAlertVariant = (type: string) => {
    switch (type) {
      case 'high': return 'destructive'
      case 'warning': return 'default'
      case 'medium': return 'default'
      case 'info': return 'default'
      case 'success': return 'default'
      default: return 'default'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Risk Recommendations
        </CardTitle>
        <CardDescription>
          Actionable insights to improve your portfolio's risk profile
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {recommendations.map((rec, index) => (
          <Alert key={index} variant={getAlertVariant(rec.type)}>
            <div className="flex items-start gap-3">
              {rec.type === 'success' && <CheckCircle className="h-4 w-4 mt-0.5" />}
              {rec.type === 'high' && <XCircle className="h-4 w-4 mt-0.5" />}
              {(rec.type === 'warning' || rec.type === 'medium' || rec.type === 'info') && (
                <AlertTriangle className="h-4 w-4 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="font-medium">{rec.title}</div>
                <div className="text-sm mt-1">{rec.description}</div>
                <div className="text-sm font-medium mt-2 text-primary">
                  💡 {rec.action}
                </div>
              </div>
            </div>
          </Alert>
        ))}
      </CardContent>
    </Card>
  )
}

function RiskAttribution({ riskData }: { riskData: RiskMetrics }) {
  // Mock data for risk attribution
  const riskAttribution = [
    { factor: 'Market Risk', contribution: 0.45, description: 'General market volatility' },
    { factor: 'Sector Risk', contribution: 0.25, description: 'Industry-specific risks' },
    { factor: 'Company Risk', contribution: 0.20, description: 'Individual company performance' },
    { factor: 'Liquidity Risk', contribution: 0.10, description: 'Difficulty in exiting positions' }
  ]

  const radarData: RiskFactor[] = [
    { name: 'Volatility', value: riskData.volatility * 100, description: 'Price fluctuation risk', impact: riskData.volatility > 0.3 ? 'high' : 'medium' },
    { name: 'Drawdown', value: Math.abs(riskData.max_drawdown) * 100, description: 'Maximum loss from peak', impact: Math.abs(riskData.max_drawdown) > 0.5 ? 'high' : 'medium' },
    { name: 'Concentration', value: riskData.concentration_risk * 100, description: 'Overexposure to few assets', impact: riskData.concentration_risk > 0.3 ? 'high' : 'low' },
    { name: 'Beta', value: Math.abs(riskData.beta) * 50, description: 'Market sensitivity', impact: Math.abs(riskData.beta) > 1.5 ? 'high' : 'medium' },
    { name: 'Liquidity', value: 30, description: 'Ease of exit', impact: 'medium' }
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Risk Attribution</CardTitle>
          <CardDescription>
            Breakdown of risk sources in your portfolio
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RiskBreakdownChart data={riskAttribution} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Risk Profile</CardTitle>
          <CardDescription>
            Multi-dimensional view of portfolio risk factors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RiskRadarChart data={radarData} />
          <div className="mt-4 space-y-2">
            {radarData.map((factor, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <span className="font-medium">{factor.name}</span>
                <div className="flex items-center gap-2">
                  <Progress value={factor.value} className="w-16 h-2" />
                  <Badge className={`text-xs ${getRiskColor(factor.value / 100)}`}>
                    {factor.impact.toUpperCase()}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StressTest({ riskData }: { riskData: RiskMetrics }) {
  const stressScenarios = [
    { name: 'Market Crash', impact: -0.35, probability: 0.05, description: 'Major market downturn' },
    { name: 'Sector Rotation', impact: -0.15, probability: 0.25, description: 'Industry trend changes' },
    { name: 'Interest Rate Hike', impact: -0.10, probability: 0.40, description: 'Rising interest rates' },
    { name: 'Geopolitical Event', impact: -0.20, probability: 0.15, description: 'Global uncertainty' }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Stress Testing
        </CardTitle>
        <CardDescription>
          Portfolio performance under adverse market conditions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stressScenarios.map((scenario, index) => {
            const expectedLoss = Math.abs(scenario.impact) * 100
            const riskLevel = expectedLoss > 25 ? 'high' : expectedLoss > 15 ? 'medium' : 'low'

            return (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{scenario.name}</h4>
                  <Badge className={getRiskColor(expectedLoss / 100)}>
                    {riskLevel.toUpperCase()}
                  </Badge>
                </div>

                <p className="text-sm text-muted-foreground mb-3">{scenario.description}</p>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-muted-foreground">Expected Impact</div>
                    <div className={`font-medium ${scenario.impact < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {formatPercentage(scenario.impact)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-muted-foreground">Probability</div>
                    <div className="font-medium">{formatPercentage(scenario.probability)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-muted-foreground">Expected Loss</div>
                    <div className="font-medium text-red-600">
                      {formatCurrency(expectedLoss * 1000)}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

export function RiskAnalysis({ portfolioId }: RiskAnalysisProps) {
  const { data: riskData, isLoading, error, refetch } = useRiskMetrics(portfolioId)

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 w-32 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full bg-muted animate-pulse rounded" />
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
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 text-muted-foreground">
            <div className="text-center">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Unable to load risk analysis</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Portfolio Risk Analysis
          </CardTitle>
          <CardDescription>
            Comprehensive risk assessment and mitigation strategies
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="attribution">Risk Attribution</TabsTrigger>
          <TabsTrigger value="stress">Stress Testing</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-sm text-muted-foreground mb-1">Risk Score</div>
                  <div className={`text-3xl font-bold ${getRiskColor(riskData.portfolio_risk_score)}`}>
                    {riskData.portfolio_risk_score.toFixed(1)}
                  </div>
                  <div className="text-xs text-muted-foreground">/10</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-sm text-muted-foreground mb-1">Volatility</div>
                  <div className={`text-3xl font-bold ${getRiskColor(riskData.volatility)}`}>
                    {formatPercentage(riskData.volatility)}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-sm text-muted-foreground mb-1">Max Drawdown</div>
                  <div className={`text-3xl font-bold ${getRiskColor(Math.abs(riskData.max_drawdown))}`}>
                    {formatPercentage(riskData.max_drawdown)}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-sm text-muted-foreground mb-1">Sharpe Ratio</div>
                  <div className={`text-3xl font-bold ${riskData.sharpe_ratio > 1 ? 'text-green-600' : 'text-red-600'}`}>
                    {riskData.sharpe_ratio.toFixed(2)}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="attribution" className="space-y-6">
          <RiskAttribution riskData={riskData} />
        </TabsContent>

        <TabsContent value="stress" className="space-y-6">
          <StressTest riskData={riskData} />
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-6">
          <RiskRecommendations riskData={riskData} />
        </TabsContent>
      </Tabs>
    </div>
  )
}