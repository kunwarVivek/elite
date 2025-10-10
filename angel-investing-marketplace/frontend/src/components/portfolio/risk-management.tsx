import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Slider } from '@/components/ui/slider'
import {
  Shield,
  AlertTriangle,
  TrendingDown,
  Activity,
  Target,
  Zap,
  Bell,
  Settings,
  CheckCircle,
  XCircle,
  Info,
  RefreshCw
} from 'lucide-react'
import { formatPercentage, formatCurrency, getRiskColor } from '@/lib/portfolio-utils'

interface RiskManagementProps {
  portfolioId: string
}

interface RiskAlert {
  id: string
  type: 'concentration' | 'volatility' | 'drawdown' | 'correlation'
  severity: 'low' | 'medium' | 'high'
  title: string
  description: string
  threshold: number
  current_value: number
  is_enabled: boolean
}

function RiskAlerts() {
  const [alerts, setAlerts] = useState<RiskAlert[]>([
    {
      id: '1',
      type: 'concentration',
      severity: 'medium',
      title: 'Sector Concentration Alert',
      description: 'SaaS sector exceeds 40% of portfolio',
      threshold: 0.4,
      current_value: 0.45,
      is_enabled: true
    },
    {
      id: '2',
      type: 'volatility',
      severity: 'high',
      title: 'High Volatility Alert',
      description: 'Portfolio volatility above risk tolerance',
      threshold: 0.25,
      current_value: 0.32,
      is_enabled: true
    },
    {
      id: '3',
      type: 'drawdown',
      severity: 'low',
      title: 'Drawdown Warning',
      description: 'Portfolio value dropped 15% from peak',
      threshold: -0.15,
      current_value: -0.08,
      is_enabled: false
    }
  ])

  const toggleAlert = (alertId: string) => {
    setAlerts(alerts.map(alert =>
      alert.id === alertId
        ? { ...alert, is_enabled: !alert.is_enabled }
        : alert
    ))
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'text-green-600 bg-green-50'
      case 'medium': return 'text-yellow-600 bg-yellow-50'
      case 'high': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Risk Alerts
        </CardTitle>
        <CardDescription>
          Monitor and manage portfolio risk thresholds
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {alerts.map((alert) => (
          <div key={alert.id} className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <Badge className={getSeverityColor(alert.severity)}>
                  {alert.severity.toUpperCase()}
                </Badge>
                <div>
                  <h4 className="font-medium">{alert.title}</h4>
                  <p className="text-sm text-muted-foreground">{alert.description}</p>
                </div>
              </div>

              <Switch
                checked={alert.is_enabled}
                onCheckedChange={() => toggleAlert(alert.id)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="text-center">
                <div className="text-muted-foreground">Threshold</div>
                <div className="font-medium">
                  {alert.type === 'drawdown' ? formatPercentage(alert.threshold) : formatPercentage(alert.threshold)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-muted-foreground">Current</div>
                <div className={`font-medium ${alert.current_value > alert.threshold ? 'text-red-600' : 'text-green-600'}`}>
                  {alert.type === 'drawdown' ? formatPercentage(alert.current_value) : formatPercentage(alert.current_value)}
                </div>
              </div>
            </div>
          </div>
        ))}

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Risk alerts help you stay informed about potential issues in your portfolio.
            Enable alerts for risks that concern you most.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}

function RiskMitigationStrategies() {
  const strategies = [
    {
      name: 'Stop-Loss Orders',
      description: 'Automatically sell if investment drops below threshold',
      effectiveness: 0.85,
      implementation_effort: 'low',
      cost: 'low',
      is_active: false
    },
    {
      name: 'Portfolio Hedging',
      description: 'Use derivatives to offset potential losses',
      effectiveness: 0.70,
      implementation_effort: 'high',
      cost: 'medium',
      is_active: false
    },
    {
      name: 'Sector Rotation',
      description: 'Move capital from overvalued to undervalued sectors',
      effectiveness: 0.60,
      implementation_effort: 'medium',
      cost: 'low',
      is_active: true
    },
    {
      name: 'Position Sizing',
      description: 'Limit exposure to any single investment',
      effectiveness: 0.90,
      implementation_effort: 'low',
      cost: 'low',
      is_active: true
    }
  ]

  const getEffortColor = (effort: string) => {
    switch (effort) {
      case 'low': return 'text-green-600'
      case 'medium': return 'text-yellow-600'
      case 'high': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Risk Mitigation Strategies
        </CardTitle>
        <CardDescription>
          Active strategies to manage and reduce portfolio risk
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {strategies.map((strategy, index) => (
          <div key={index} className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">{strategy.name}</h4>
              <div className="flex items-center gap-2">
                {strategy.is_active ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-gray-400" />
                )}
                <Badge variant={strategy.is_active ? 'default' : 'secondary'}>
                  {strategy.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-3">
              {strategy.description}
            </p>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="text-muted-foreground">Effectiveness</div>
                <div className="font-medium">{formatPercentage(strategy.effectiveness)}</div>
              </div>
              <div className="text-center">
                <div className="text-muted-foreground">Effort</div>
                <div className={`font-medium ${getEffortColor(strategy.implementation_effort)}`}>
                  {strategy.implementation_effort}
                </div>
              </div>
              <div className="text-center">
                <div className="text-muted-foreground">Cost</div>
                <div className="font-medium capitalize">{strategy.cost}</div>
              </div>
            </div>
          </div>
        ))}

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Risk mitigation strategies should be selected based on your risk tolerance,
            investment horizon, and market conditions.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  )
}

function RiskBudgeting() {
  const [riskBudget, setRiskBudget] = useState([0.25])
  const [autoAdjust, setAutoAdjust] = useState(true)

  const currentRisk = 0.32
  const riskUtilization = (currentRisk / riskBudget[0]) * 100

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Risk Budgeting
        </CardTitle>
        <CardDescription>
          Set and monitor your portfolio risk budget
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label>Risk Budget: {formatPercentage(riskBudget[0])}</Label>
            <Slider
              value={riskBudget}
              onValueChange={setRiskBudget}
              max={0.5}
              min={0.1}
              step={0.05}
              className="mt-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Conservative (10%)</span>
              <span>Aggressive (50%)</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="auto-adjust">Auto-adjust positions</Label>
            <Switch
              id="auto-adjust"
              checked={autoAdjust}
              onCheckedChange={setAutoAdjust}
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Current Risk Level</span>
            <span className="text-sm">{formatPercentage(currentRisk)}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Risk Utilization</span>
            <span className={`text-sm font-medium ${riskUtilization > 100 ? 'text-red-600' : 'text-green-600'}`}>
              {riskUtilization.toFixed(1)}%
            </span>
          </div>

          <Progress
            value={Math.min(riskUtilization, 100)}
            className={`h-3 ${riskUtilization > 100 ? '[&>div]:bg-red-500' : '[&>div]:bg-green-500'}`}
          />

          {riskUtilization > 100 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Portfolio risk exceeds your budget. Consider reducing exposure to high-risk investments.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="text-center p-3 bg-muted/50 rounded">
            <div className="font-medium">Risk Budget</div>
            <div className="text-lg">{formatPercentage(riskBudget[0])}</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded">
            <div className="font-medium">Current Risk</div>
            <div className="text-lg">{formatPercentage(currentRisk)}</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded">
            <div className="font-medium">Remaining Budget</div>
            <div className={`text-lg ${riskBudget[0] - currentRisk > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPercentage(Math.max(0, riskBudget[0] - currentRisk))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function RiskMonitoring() {
  const riskMetrics = [
    { metric: 'Portfolio Volatility', current: 0.25, threshold: 0.30, status: 'good' },
    { metric: 'Max Drawdown', current: -0.15, threshold: -0.25, status: 'good' },
    { metric: 'Sector Concentration', current: 0.45, threshold: 0.50, status: 'warning' },
    { metric: 'Beta', current: 1.2, threshold: 1.5, status: 'good' }
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'critical': return <XCircle className="h-4 w-4 text-red-500" />
      default: return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600'
      case 'warning': return 'text-yellow-600'
      case 'critical': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Risk Monitoring
        </CardTitle>
        <CardDescription>
          Real-time monitoring of key risk metrics
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {riskMetrics.map((metric, index) => (
          <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              {getStatusIcon(metric.status)}
              <div>
                <div className="font-medium">{metric.metric}</div>
                <div className="text-sm text-muted-foreground">
                  Current: {typeof metric.current === 'number' && metric.current < 0 ? formatPercentage(metric.current) : formatPercentage(metric.current)}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className={`font-medium ${getStatusColor(metric.status)}`}>
                {metric.status.toUpperCase()}
              </div>
              <div className="text-sm text-muted-foreground">
                Threshold: {typeof metric.threshold === 'number' && metric.threshold < 0 ? formatPercentage(metric.threshold) : formatPercentage(metric.threshold)}
              </div>
            </div>
          </div>
        ))}

        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overall Risk Status</span>
            <Badge className="text-green-600 bg-green-50">
              <CheckCircle className="h-3 w-3 mr-1" />
              HEALTHY
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function RiskManagement({ portfolioId }: RiskManagementProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Portfolio Risk Management
          </CardTitle>
          <CardDescription>
            Monitor, mitigate, and control portfolio risk exposure
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RiskMonitoring />
        <RiskBudgeting />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RiskAlerts />
        <RiskMitigationStrategies />
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Risk Management Philosophy:</strong> Effective risk management involves identifying,
          assessing, and prioritizing risks followed by coordinated application of resources to minimize,
          monitor, and control the probability and/or impact of unfortunate events.
        </AlertDescription>
      </Alert>
    </div>
  )
}