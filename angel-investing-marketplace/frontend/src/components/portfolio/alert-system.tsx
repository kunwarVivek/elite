import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Bell,
  BellRing,
  Settings,
  Plus,
  Trash2,
  Edit,
  CheckCircle,
  AlertTriangle,
  Info,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Activity,
  ExternalLink
} from 'lucide-react'
import { usePortfolioAlerts, useCreatePortfolioAlert, useUpdateAlert, useDeleteAlert } from '@/hooks/use-portfolio'
import { usePortfolioAlertsRealtime } from '@/hooks/use-portfolio-realtime'
import { AlertType, AlertPriority } from '@/types/portfolio'
import { formatCurrency, formatPercentage } from '@/lib/portfolio-utils'

interface AlertSystemProps {
  portfolioId: string
}

interface AlertRule {
  id: string
  type: AlertType
  name: string
  description: string
  threshold: number
  is_enabled: boolean
  priority: AlertPriority
  notification_channels: string[]
}

function AlertRuleCard({
  rule,
  onToggle,
  onEdit,
  onDelete
}: {
  rule: AlertRule
  onToggle: (id: string, enabled: boolean) => void
  onEdit: (rule: AlertRule) => void
  onDelete: (id: string) => void
}) {
  const getTypeIcon = (type: AlertType) => {
    switch (type) {
      case AlertType.PRICE_CHANGE: return <TrendingUp className="h-4 w-4" />
      case AlertType.VALUATION_UPDATE: return <DollarSign className="h-4 w-4" />
      case AlertType.COMPANY_NEWS: return <Info className="h-4 w-4" />
      case AlertType.EXIT_OPPORTUNITY: return <Target className="h-4 w-4" />
      case AlertType.PORTFOLIO_MILESTONE: return <CheckCircle className="h-4 w-4" />
      default: return <Bell className="h-4 w-4" />
    }
  }

  const getPriorityColor = (priority: AlertPriority) => {
    switch (priority) {
      case AlertPriority.HIGH: return 'text-red-600 bg-red-50'
      case AlertPriority.MEDIUM: return 'text-yellow-600 bg-yellow-50'
      case AlertPriority.LOW: return 'text-green-600 bg-green-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {getTypeIcon(rule.type)}
            <div>
              <h4 className="font-medium">{rule.name}</h4>
              <p className="text-sm text-muted-foreground">{rule.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge className={getPriorityColor(rule.priority)}>
              {rule.priority}
            </Badge>
            <Switch
              checked={rule.is_enabled}
              onCheckedChange={(checked) => onToggle(rule.id, checked)}
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Threshold: {formatPercentage(rule.threshold)}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => onEdit(rule)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDelete(rule.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function CreateAlertDialog({
  isOpen,
  onClose,
  onSubmit,
  portfolioId
}: {
  isOpen: boolean
  onClose: () => void
  onSubmit: (alertData: Partial<AlertRule>) => void
  portfolioId: string
}) {
  const [formData, setFormData] = useState({
    type: AlertType.PRICE_CHANGE,
    name: '',
    description: '',
    threshold: 0.05,
    priority: AlertPriority.MEDIUM,
    notification_channels: ['in_app']
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
    setFormData({
      type: AlertType.PRICE_CHANGE,
      name: '',
      description: '',
      threshold: 0.05,
      priority: AlertPriority.MEDIUM,
      notification_channels: ['in_app']
    })
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Alert Rule</DialogTitle>
          <DialogDescription>
            Set up notifications for important portfolio events
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Alert Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value: AlertType) => setFormData(prev => ({ ...prev, type: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={AlertType.PRICE_CHANGE}>Price Change</SelectItem>
                <SelectItem value={AlertType.VALUATION_UPDATE}>Valuation Update</SelectItem>
                <SelectItem value={AlertType.COMPANY_NEWS}>Company News</SelectItem>
                <SelectItem value={AlertType.EXIT_OPPORTUNITY}>Exit Opportunity</SelectItem>
                <SelectItem value={AlertType.PORTFOLIO_MILESTONE}>Portfolio Milestone</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Alert Name</Label>
            <Input
              placeholder="e.g., Large Price Movements"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              placeholder="Brief description of when this alert triggers"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Threshold</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.05"
                value={formData.threshold}
                onChange={(e) => setFormData(prev => ({ ...prev, threshold: parseFloat(e.target.value) || 0 }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: AlertPriority) => setFormData(prev => ({ ...prev, priority: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={AlertPriority.LOW}>Low</SelectItem>
                  <SelectItem value={AlertPriority.MEDIUM}>Medium</SelectItem>
                  <SelectItem value={AlertPriority.HIGH}>High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              Create Alert
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function LiveAlertsPanel() {
  const { alerts, isConnected } = usePortfolioAlertsRealtime()

  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellRing className="h-5 w-5" />
            Live Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            <div className="text-center">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No recent alerts</p>
              <p className="text-sm">Alerts will appear here when triggered</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BellRing className="h-5 w-5" />
          Live Alerts
          {!isConnected && (
            <Badge variant="outline" className="text-yellow-600">
              Disconnected
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64">
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-3 rounded-lg border-l-4 ${
                  alert.severity === 'high' ? 'border-l-red-500 bg-red-50' :
                  alert.severity === 'medium' ? 'border-l-yellow-500 bg-yellow-50' :
                  'border-l-green-500 bg-green-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {alert.severity === 'high' && <AlertTriangle className="h-4 w-4 text-red-600" />}
                    {alert.severity === 'medium' && <Info className="h-4 w-4 text-yellow-600" />}
                    {alert.severity === 'low' && <CheckCircle className="h-4 w-4 text-green-600" />}
                    <span className="font-medium text-sm">{alert.type.replace(/_/g, ' ')}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {alert.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-sm mt-1">{alert.message}</p>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

export function AlertSystem({ portfolioId }: AlertSystemProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [alertRules, setAlertRules] = useState<AlertRule[]>([
    {
      id: '1',
      type: AlertType.PRICE_CHANGE,
      name: 'Large Price Movements',
      description: 'Alert when any investment changes by more than 10%',
      threshold: 0.10,
      is_enabled: true,
      priority: AlertPriority.HIGH,
      notification_channels: ['in_app', 'email']
    },
    {
      id: '2',
      type: AlertType.PORTFOLIO_MILESTONE,
      name: 'Portfolio Milestones',
      description: 'Notify when portfolio reaches significant value thresholds',
      threshold: 100000,
      is_enabled: true,
      priority: AlertPriority.MEDIUM,
      notification_channels: ['in_app']
    },
    {
      id: '3',
      type: AlertType.EXIT_OPPORTUNITY,
      name: 'Exit Opportunities',
      description: 'Alert when investments reach target exit valuations',
      threshold: 3.0,
      is_enabled: false,
      priority: AlertPriority.MEDIUM,
      notification_channels: ['in_app']
    }
  ])

  const createAlertMutation = useCreatePortfolioAlert()
  const updateAlertMutation = useUpdateAlert()
  const deleteAlertMutation = useDeleteAlert()

  const handleCreateAlert = async (alertData: Partial<AlertRule>) => {
    try {
      await createAlertMutation.mutateAsync({
        portfolioId,
        alert: alertData
      })
      // Add to local state for immediate UI update
      const newRule: AlertRule = {
        id: Date.now().toString(),
        ...alertData as AlertRule
      }
      setAlertRules(prev => [...prev, newRule])
    } catch (error) {
      console.error('Failed to create alert:', error)
    }
  }

  const handleToggleAlert = async (alertId: string, enabled: boolean) => {
    try {
      await updateAlertMutation.mutateAsync({ alertId, isRead: enabled })
      setAlertRules(prev => prev.map(rule =>
        rule.id === alertId ? { ...rule, is_enabled: enabled } : rule
      ))
    } catch (error) {
      console.error('Failed to update alert:', error)
    }
  }

  const handleDeleteAlert = async (alertId: string) => {
    try {
      await deleteAlertMutation.mutateAsync(alertId)
      setAlertRules(prev => prev.filter(rule => rule.id !== alertId))
    } catch (error) {
      console.error('Failed to delete alert:', error)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Portfolio Alert System
              </CardTitle>
              <CardDescription>
                Set up notifications for important portfolio events and changes
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Alert
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="font-medium">Alert Rules</h3>
          {alertRules.map((rule) => (
            <AlertRuleCard
              key={rule.id}
              rule={rule}
              onToggle={handleToggleAlert}
              onEdit={() => {}} // Could implement edit dialog
              onDelete={handleDeleteAlert}
            />
          ))}
        </div>

        <LiveAlertsPanel />
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Alert Best Practices:</strong> Set meaningful thresholds to avoid alert fatigue.
          High-priority alerts should be reserved for truly important events that require immediate attention.
        </AlertDescription>
      </Alert>

      <CreateAlertDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSubmit={handleCreateAlert}
        portfolioId={portfolioId}
      />
    </div>
  )
}