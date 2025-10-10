import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Target,
  TrendingUp,
  PieChart,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Info,
  Zap,
  DollarSign,
  Calendar,
  BarChart3
} from 'lucide-react'
import { formatCurrency, formatPercentage } from '@/lib/portfolio-utils'

interface PortfolioOptimizationProps {
  portfolioId: string
}

interface OptimizationSuggestion {
  id: string
  type: 'rebalance' | 'diversify' | 'risk_reduce' | 'performance_boost'
  title: string
  description: string
  potential_impact: number
  effort_level: 'low' | 'medium' | 'high'
  timeframe: string
  actions: string[]
}

interface RebalancingRecommendation {
  current_allocation: number
  target_allocation: number
  difference: number
  suggested_action: string
  expected_impact: number
}

function OptimizationOverview() {
  const currentMetrics = {
    diversification_score: 0.65,
    risk_score: 6.2,
    expected_return: 0.18,
    sharpe_ratio: 1.2
  }

  const targetMetrics = {
    diversification_score: 0.85,
    risk_score: 5.0,
    expected_return: 0.22,
    sharpe_ratio: 1.8
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="text-sm text-muted-foreground mb-1">Diversification</div>
            <div className="text-2xl font-bold">{formatPercentage(currentMetrics.diversification_score)}</div>
            <Progress value={currentMetrics.diversification_score * 100} className="mt-2" />
            <div className="text-xs text-muted-foreground mt-1">
              Target: {formatPercentage(targetMetrics.diversification_score)}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="text-sm text-muted-foreground mb-1">Risk Score</div>
            <div className="text-2xl font-bold">{currentMetrics.risk_score.toFixed(1)}</div>
            <Progress value={(10 - currentMetrics.risk_score) * 10} className="mt-2" />
            <div className="text-xs text-muted-foreground mt-1">
              Target: {targetMetrics.risk_score.toFixed(1)}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="text-sm text-muted-foreground mb-1">Expected Return</div>
            <div className="text-2xl font-bold text-green-600">
              {formatPercentage(currentMetrics.expected_return)}
            </div>
            <div className="text-xs text-muted-foreground">
              Target: {formatPercentage(targetMetrics.expected_return)}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="text-sm text-muted-foreground mb-1">Sharpe Ratio</div>
            <div className="text-2xl font-bold">{currentMetrics.sharpe_ratio.toFixed(1)}</div>
            <div className="text-xs text-muted-foreground">
              Target: {targetMetrics.sharpe_ratio.toFixed(1)}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function RebalancingTool() {
  const [riskTolerance, setRiskTolerance] = useState([0.7])
  const [autoRebalance, setAutoRebalance] = useState(false)

  // Mock current allocation
  const currentAllocation = [
    { sector: 'SaaS', current: 45, target: 35, difference: 10 },
    { sector: 'Healthcare', current: 25, target: 30, difference: -5 },
    { sector: 'Fintech', current: 20, target: 25, difference: -5 },
    { sector: 'CleanTech', current: 10, target: 10, difference: 0 }
  ]

  const recommendations: RebalancingRecommendation[] = currentAllocation
    .filter(sector => Math.abs(sector.difference) > 2)
    .map(sector => ({
      current_allocation: sector.current,
      target_allocation: sector.target,
      difference: sector.difference,
      suggested_action: sector.difference > 0 ? 'Reduce exposure' : 'Increase exposure',
      expected_impact: Math.abs(sector.difference) * 0.02 // 2% impact per 10% difference
    }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChart className="h-5 w-5" />
          Portfolio Rebalancing
        </CardTitle>
        <CardDescription>
          Optimize your asset allocation for better risk-adjusted returns
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label>Risk Tolerance: {formatPercentage(riskTolerance[0])}</Label>
            <Slider
              value={riskTolerance}
              onValueChange={setRiskTolerance}
              max={1}
              min={0}
              step={0.1}
              className="mt-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Conservative</span>
              <span>Aggressive</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="auto-rebalance">Auto-rebalance portfolio</Label>
            <Switch
              id="auto-rebalance"
              checked={autoRebalance}
              onCheckedChange={setAutoRebalance}
            />
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-medium">Rebalancing Recommendations</h4>

          {recommendations.map((rec, index) => (
            <div key={index} className="p-3 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Sector Allocation</span>
                <Badge variant={rec.difference > 0 ? 'destructive' : 'default'}>
                  {rec.suggested_action}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-muted-foreground">Current</div>
                  <div className="font-medium">{formatPercentage(rec.current_allocation / 100)}</div>
                </div>
                <div className="text-center">
                  <div className="text-muted-foreground">Target</div>
                  <div className="font-medium">{formatPercentage(rec.target_allocation / 100)}</div>
                </div>
                <div className="text-center">
                  <div className="text-muted-foreground">Impact</div>
                  <div className={`font-medium ${rec.expected_impact > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercentage(rec.expected_impact)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Rebalancing involves selling over-allocated assets and buying under-allocated ones.
            Consider transaction costs and tax implications before proceeding.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}

function DiversificationAnalysis() {
  const diversificationMetrics = {
    sector_diversity: 0.75,
    stage_diversity: 0.60,
    geographic_diversity: 0.45,
    company_size_diversity: 0.55
  }

  const suggestions: OptimizationSuggestion[] = [
    {
      id: '1',
      type: 'diversify',
      title: 'Improve Geographic Diversification',
      description: 'Add international exposure to reduce domestic market risk',
      potential_impact: 0.08,
      effort_level: 'medium',
      timeframe: '3-6 months',
      actions: [
        'Research international startups',
        'Consider currency hedging',
        'Review regulatory requirements'
      ]
    },
    {
      id: '2',
      type: 'performance_boost',
      title: 'Increase Early-Stage Allocation',
      description: 'Higher risk-adjusted returns available in early-stage investments',
      potential_impact: 0.12,
      effort_level: 'high',
      timeframe: '6-12 months',
      actions: [
        'Build network in startup ecosystem',
        'Attend startup pitch events',
        'Partner with experienced angel investors'
      ]
    }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Diversification Analysis
        </CardTitle>
        <CardDescription>
          Improve portfolio diversification across multiple dimensions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Sector Diversity</span>
              <span className="text-sm text-muted-foreground">
                {formatPercentage(diversificationMetrics.sector_diversity)}
              </span>
            </div>
            <Progress value={diversificationMetrics.sector_diversity * 100} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Stage Diversity</span>
              <span className="text-sm text-muted-foreground">
                {formatPercentage(diversificationMetrics.stage_diversity)}
              </span>
            </div>
            <Progress value={diversificationMetrics.stage_diversity * 100} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Geographic Diversity</span>
              <span className="text-sm text-muted-foreground">
                {formatPercentage(diversificationMetrics.geographic_diversity)}
              </span>
            </div>
            <Progress value={diversificationMetrics.geographic_diversity * 100} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Company Size Diversity</span>
              <span className="text-sm text-muted-foreground">
                {formatPercentage(diversificationMetrics.company_size_diversity)}
              </span>
            </div>
            <Progress value={diversificationMetrics.company_size_diversity * 100} />
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-medium">Diversification Opportunities</h4>

          {suggestions.map((suggestion) => (
            <div key={suggestion.id} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h5 className="font-medium">{suggestion.title}</h5>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {suggestion.effort_level} effort
                  </Badge>
                  <span className="text-sm text-green-600 font-medium">
                    +{formatPercentage(suggestion.potential_impact)} impact
                  </span>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-3">
                {suggestion.description}
              </p>

              <div className="space-y-1">
                <div className="text-sm font-medium">Recommended Actions:</div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {suggestion.actions.map((action, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function RiskOptimizer() {
  const [targetRisk, setTargetRisk] = useState([0.5])

  const riskAdjustments = [
    {
      strategy: 'Reduce Volatility',
      current_risk: 0.25,
      adjusted_risk: 0.18,
      expected_return_impact: -0.03,
      description: 'Shift to more stable, established companies'
    },
    {
      strategy: 'Maintain Current',
      current_risk: 0.25,
      adjusted_risk: 0.25,
      expected_return_impact: 0,
      description: 'Keep current risk profile'
    },
    {
      strategy: 'Increase Growth Focus',
      current_risk: 0.25,
      adjusted_risk: 0.32,
      expected_return_impact: 0.05,
      description: 'Allocate more to high-growth opportunities'
    }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Risk Optimization
        </CardTitle>
        <CardDescription>
          Adjust your portfolio risk level to match your investment goals
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label>Target Risk Level: {formatPercentage(targetRisk[0])}</Label>
            <Slider
              value={targetRisk}
              onValueChange={setTargetRisk}
              max={1}
              min={0}
              step={0.05}
              className="mt-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Conservative</span>
              <span>Aggressive</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-medium">Risk Adjustment Strategies</h4>

          {riskAdjustments.map((adjustment, index) => (
            <div key={index} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h5 className="font-medium">{adjustment.strategy}</h5>
                <Badge variant={
                  adjustment.expected_return_impact > 0 ? 'default' :
                  adjustment.expected_return_impact < 0 ? 'destructive' : 'secondary'
                }>
                  {formatPercentage(adjustment.expected_return_impact)} return impact
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground mb-3">
                {adjustment.description}
              </p>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-muted-foreground">Current Risk</div>
                  <div className="font-medium">{formatPercentage(adjustment.current_risk)}</div>
                </div>
                <div className="text-center">
                  <div className="text-muted-foreground">Adjusted Risk</div>
                  <div className="font-medium">{formatPercentage(adjustment.adjusted_risk)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function PortfolioOptimization({ portfolioId }: PortfolioOptimizationProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Portfolio Optimization
          </CardTitle>
          <CardDescription>
            Optimize your portfolio for better performance and risk management
          </CardDescription>
        </CardHeader>
      </Card>

      <OptimizationOverview />

      <Tabs defaultValue="rebalancing" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="rebalancing">Rebalancing</TabsTrigger>
          <TabsTrigger value="diversification">Diversification</TabsTrigger>
          <TabsTrigger value="risk">Risk Management</TabsTrigger>
        </TabsList>

        <TabsContent value="rebalancing" className="space-y-6">
          <RebalancingTool />
        </TabsContent>

        <TabsContent value="diversification" className="space-y-6">
          <DiversificationAnalysis />
        </TabsContent>

        <TabsContent value="risk" className="space-y-6">
          <RiskOptimizer />
        </TabsContent>
      </Tabs>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Important:</strong> Portfolio optimization involves trade-offs between risk and return.
          Consider your investment timeline, liquidity needs, and risk tolerance before making changes.
          Past performance does not guarantee future results.
        </AlertDescription>
      </Alert>
    </div>
  )
}