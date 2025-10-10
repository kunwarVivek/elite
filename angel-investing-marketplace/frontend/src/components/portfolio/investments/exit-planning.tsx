import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Target,
  TrendingUp,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Save,
  RefreshCw,
  Info
} from 'lucide-react'
import { useRequestExit } from '@/hooks/use-portfolio'
import { ExitStrategy, ExitType, Investment } from '@/types/portfolio'
import { formatCurrency, formatPercentage } from '@/lib/portfolio-utils'

interface ExitPlanningProps {
  investment: Investment
  onStrategyUpdate?: (strategy: ExitStrategy) => void
}

interface ExitScenario {
  type: ExitType
  timeline: number // months
  probability: number
  expected_multiple: number
  expected_irr: number
  risk_level: 'low' | 'medium' | 'high'
}

function ExitScenarioCard({
  scenario,
  investment,
  onSelect
}: {
  scenario: ExitScenario
  investment: Investment
  onSelect: () => void
}) {
  const expectedValue = investment.amount * scenario.expected_multiple
  const expectedReturn = expectedValue - investment.amount
  const expectedReturnPercentage = (expectedReturn / investment.amount) * 100

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-50'
      case 'medium': return 'text-yellow-600 bg-yellow-50'
      case 'high': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onSelect}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{scenario.type.replace(/_/g, ' ')}</CardTitle>
          <Badge className={getRiskColor(scenario.risk_level)}>
            {scenario.risk_level.toUpperCase()} RISK
          </Badge>
        </div>
        <CardDescription>
          {scenario.timeline} month timeline • {formatPercentage(scenario.probability)} probability
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Expected Multiple</div>
            <div className="font-medium">{scenario.expected_multiple.toFixed(1)}x</div>
          </div>
          <div>
            <div className="text-muted-foreground">Expected IRR</div>
            <div className="font-medium">{formatPercentage(scenario.expected_irr)}</div>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Expected Value</span>
            <span className="font-medium">{formatCurrency(expectedValue)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Expected Return</span>
            <span className="font-medium text-green-600">
              {formatCurrency(expectedReturn)} ({formatPercentage(expectedReturnPercentage)})
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ExitStrategyForm({
  investment,
  onSubmit,
  onCancel
}: {
  investment: Investment
  onSubmit: (strategy: Partial<ExitStrategy>) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    preferred_exit_type: ExitType.ACQUISITION,
    target_timeline: 24,
    target_multiple: 3.0,
    target_irr: 0.25,
    minimum_acceptable_return: investment.amount * 1.5,
    notes: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Plan Exit Strategy
        </CardTitle>
        <CardDescription>
          Define your preferred exit strategy and timeline for this investment
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="exit_type">Preferred Exit Type</Label>
              <Select
                value={formData.preferred_exit_type}
                onValueChange={(value: ExitType) =>
                  setFormData(prev => ({ ...prev, preferred_exit_type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ExitType.IPO}>IPO</SelectItem>
                  <SelectItem value={ExitType.ACQUISITION}>Acquisition</SelectItem>
                  <SelectItem value={ExitType.SECONDARY_SALE}>Secondary Sale</SelectItem>
                  <SelectItem value={ExitType.BUYBACK}>Company Buyback</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeline">Target Timeline (months)</Label>
              <Input
                id="timeline"
                type="number"
                value={formData.target_timeline}
                onChange={(e) => setFormData(prev => ({ ...prev, target_timeline: parseInt(e.target.value) }))}
                min={6}
                max={120}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="multiple">Target Multiple</Label>
              <Input
                id="multiple"
                type="number"
                step="0.1"
                value={formData.target_multiple}
                onChange={(e) => setFormData(prev => ({ ...prev, target_multiple: parseFloat(e.target.value) }))}
                min={1}
                max={20}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="irr">Target IRR</Label>
              <Input
                id="irr"
                type="number"
                step="0.01"
                value={formData.target_irr}
                onChange={(e) => setFormData(prev => ({ ...prev, target_irr: parseFloat(e.target.value) }))}
                min={0}
                max={2}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="minimum_return">Minimum Acceptable Return</Label>
            <Input
              id="minimum_return"
              type="number"
              value={formData.minimum_acceptable_return}
              onChange={(e) => setFormData(prev => ({ ...prev, minimum_acceptable_return: parseFloat(e.target.value) }))}
              min={investment.amount}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Strategy Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add any specific considerations or milestones for this exit strategy..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="flex items-center gap-2 pt-4">
            <Button type="submit">
              <Save className="h-4 w-4 mr-2" />
              Save Exit Strategy
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export function ExitPlanning({ investment, onStrategyUpdate }: ExitPlanningProps) {
  const [showForm, setShowForm] = useState(false)
  const [selectedStrategy, setSelectedStrategy] = useState<ExitStrategy | null>(null)

  const requestExitMutation = useRequestExit()

  // Predefined exit scenarios based on industry and stage
  const exitScenarios: ExitScenario[] = [
    {
      type: ExitType.ACQUISITION,
      timeline: 18,
      probability: 0.65,
      expected_multiple: 2.5,
      expected_irr: 0.35,
      risk_level: 'medium'
    },
    {
      type: ExitType.IPO,
      timeline: 36,
      probability: 0.25,
      expected_multiple: 5.0,
      expected_irr: 0.45,
      risk_level: 'high'
    },
    {
      type: ExitType.SECONDARY_SALE,
      timeline: 12,
      probability: 0.80,
      expected_multiple: 1.8,
      expected_irr: 0.25,
      risk_level: 'low'
    }
  ]

  const handleStrategySubmit = async (strategyData: Partial<ExitStrategy>) => {
    try {
      await requestExitMutation.mutateAsync({
        investmentId: investment.id,
        exitData: strategyData
      })

      setShowForm(false)
      onStrategyUpdate?.(strategyData as ExitStrategy)
    } catch (error) {
      console.error('Failed to save exit strategy:', error)
    }
  }

  const handleScenarioSelect = (scenario: ExitScenario) => {
    const strategyData: Partial<ExitStrategy> = {
      preferred_exit_type: scenario.type,
      target_timeline: scenario.timeline,
      target_multiple: scenario.expected_multiple,
      target_irr: scenario.expected_irr,
      minimum_acceptable_return: investment.amount * 1.5,
      notes: `Selected ${scenario.type.replace(/_/g, ' ')} scenario with ${formatPercentage(scenario.probability)} probability`
    }

    handleStrategySubmit(strategyData)
  }

  if (showForm) {
    return (
      <ExitStrategyForm
        investment={investment}
        onSubmit={handleStrategySubmit}
        onCancel={() => setShowForm(false)}
      />
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Exit Strategy Planning
              </CardTitle>
              <CardDescription>
                Plan your exit strategy for {investment.pitch?.startup?.name}
              </CardDescription>
            </div>
            <Button onClick={() => setShowForm(true)}>
              <Target className="h-4 w-4 mr-2" />
              Plan Strategy
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <Alert className="mb-6">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Exit strategies help you set expectations and track progress toward liquidity events.
              Consider market conditions, company performance, and your investment timeline when planning.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <h4 className="font-medium">Recommended Exit Scenarios</h4>
            <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-3">
              {exitScenarios.map((scenario, index) => (
                <ExitScenarioCard
                  key={index}
                  scenario={scenario}
                  investment={investment}
                  onSelect={() => handleScenarioSelect(scenario)}
                />
              ))}
            </div>
          </div>

          {selectedStrategy && (
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Active Exit Strategy
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Exit Type:</span>
                  <div className="font-medium">{selectedStrategy.preferred_exit_type.replace(/_/g, ' ')}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Target Timeline:</span>
                  <div className="font-medium">{selectedStrategy.target_timeline} months</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Target Multiple:</span>
                  <div className="font-medium">{selectedStrategy.target_multiple}x</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}