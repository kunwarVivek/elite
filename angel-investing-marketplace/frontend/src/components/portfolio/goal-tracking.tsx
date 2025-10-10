import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Target,
  Plus,
  Calendar,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertCircle,
  Edit,
  Trash2,
  Award,
  DollarSign,
  Percent
} from 'lucide-react'
import { usePortfolioGoals, useCreatePortfolioGoal, useUpdatePortfolioGoal, useDeletePortfolioGoal } from '@/hooks/use-portfolio'
import { PortfolioGoal } from '@/types/portfolio'
import { formatCurrency, formatPercentage, formatDate } from '@/lib/portfolio-utils'

interface GoalTrackingProps {
  portfolioId: string
}

interface CreateGoalForm {
  name: string
  description: string
  target_amount: number
  target_date: string
  goal_type: 'total_return' | 'portfolio_value' | 'annual_return' | 'investment_count'
}

function GoalCard({
  goal,
  onEdit,
  onDelete
}: {
  goal: PortfolioGoal
  onEdit: (goal: PortfolioGoal) => void
  onDelete: (goalId: string) => void
}) {
  const progressPercentage = goal.progress_percentage
  const isAchieved = goal.is_achieved
  const isOverdue = new Date(goal.target_date) < new Date() && !isAchieved

  const getStatusColor = () => {
    if (isAchieved) return 'text-green-600 bg-green-50'
    if (isOverdue) return 'text-red-600 bg-red-50'
    return 'text-blue-600 bg-blue-50'
  }

  const getStatusIcon = () => {
    if (isAchieved) return <CheckCircle className="h-4 w-4" />
    if (isOverdue) return <AlertCircle className="h-4 w-4" />
    return <Clock className="h-4 w-4" />
  }

  const getStatusText = () => {
    if (isAchieved) return 'Achieved'
    if (isOverdue) return 'Overdue'
    return 'In Progress'
  }

  const daysRemaining = Math.ceil((new Date(goal.target_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))

  return (
    <Card className={isAchieved ? 'border-green-200 bg-green-50/50' : isOverdue ? 'border-red-200 bg-red-50/50' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{goal.name}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor()}>
              {getStatusIcon()}
              <span className="ml-1">{getStatusText()}</span>
            </Badge>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => onEdit(goal)}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onDelete(goal.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {goal.description && (
          <CardDescription>{goal.description}</CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Progress</span>
          <span className="font-medium">{formatPercentage(progressPercentage)}</span>
        </div>

        <Progress value={progressPercentage} className="h-3" />

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Target Amount</div>
            <div className="font-medium">{formatCurrency(goal.target_amount)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Current Amount</div>
            <div className="font-medium">{formatCurrency(goal.current_amount)}</div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            Target: {formatDate(goal.target_date)}
          </div>

          {!isAchieved && (
            <div className="text-sm">
              {isOverdue ? (
                <span className="text-red-600 font-medium">
                  {Math.abs(daysRemaining)} days overdue
                </span>
              ) : (
                <span className="text-muted-foreground">
                  {daysRemaining} days remaining
                </span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function CreateGoalDialog({
  isOpen,
  onClose,
  onSubmit,
  portfolioId
}: {
  isOpen: boolean
  onClose: () => void
  onSubmit: (goal: CreateGoalForm) => void
  portfolioId: string
}) {
  const [formData, setFormData] = useState<CreateGoalForm>({
    name: '',
    description: '',
    target_amount: 0,
    target_date: '',
    goal_type: 'portfolio_value'
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
    setFormData({
      name: '',
      description: '',
      target_amount: 0,
      target_date: '',
      goal_type: 'portfolio_value'
    })
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Investment Goal</DialogTitle>
          <DialogDescription>
            Set a new financial goal for your portfolio
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="goal_name">Goal Name</Label>
            <Input
              id="goal_name"
              placeholder="e.g., Retirement Fund, House Down Payment"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal_description">Description</Label>
            <Textarea
              id="goal_description"
              placeholder="Describe your goal and motivation..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="goal_type">Goal Type</Label>
              <Select
                value={formData.goal_type}
                onValueChange={(value: any) => setFormData(prev => ({ ...prev, goal_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="portfolio_value">Portfolio Value</SelectItem>
                  <SelectItem value="total_return">Total Return</SelectItem>
                  <SelectItem value="annual_return">Annual Return</SelectItem>
                  <SelectItem value="investment_count">Investment Count</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="target_amount">Target Amount</Label>
              <Input
                id="target_amount"
                type="number"
                placeholder="100000"
                value={formData.target_amount || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, target_amount: parseFloat(e.target.value) || 0 }))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="target_date">Target Date</Label>
            <Input
              id="target_date"
              type="date"
              value={formData.target_date}
              onChange={(e) => setFormData(prev => ({ ...prev, target_date: e.target.value }))}
              required
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              Create Goal
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function GoalSummary({ goals }: { goals: PortfolioGoal[] }) {
  const achievedGoals = goals.filter(goal => goal.is_achieved).length
  const totalGoals = goals.length
  const avgProgress = goals.length > 0 ? goals.reduce((sum, goal) => sum + goal.progress_percentage, 0) / goals.length : 0

  const upcomingDeadlines = goals
    .filter(goal => !goal.is_achieved && new Date(goal.target_date) > new Date())
    .sort((a, b) => new Date(a.target_date).getTime() - new Date(b.target_date).getTime())
    .slice(0, 3)

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="text-sm text-muted-foreground mb-1">Goals Achieved</div>
            <div className="text-2xl font-bold text-green-600">
              {achievedGoals}/{totalGoals}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="text-sm text-muted-foreground mb-1">Average Progress</div>
            <div className="text-2xl font-bold">{formatPercentage(avgProgress)}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="text-sm text-muted-foreground mb-1">Active Goals</div>
            <div className="text-2xl font-bold">{totalGoals - achievedGoals}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function GoalTracking({ portfolioId }: GoalTrackingProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingGoal, setEditingGoal] = useState<PortfolioGoal | null>(null)

  const { data: goalsResponse, isLoading, error, refetch } = usePortfolioGoals(portfolioId)
  const createGoalMutation = useCreatePortfolioGoal()
  const updateGoalMutation = useUpdatePortfolioGoal()
  const deleteGoalMutation = useDeletePortfolioGoal()

  const goals = goalsResponse?.data || []

  const handleCreateGoal = async (goalData: CreateGoalForm) => {
    try {
      await createGoalMutation.mutateAsync({
        portfolioId,
        goal: goalData
      })
    } catch (error) {
      console.error('Failed to create goal:', error)
    }
  }

  const handleUpdateGoal = async (goalData: Partial<PortfolioGoal>) => {
    if (!editingGoal) return

    try {
      await updateGoalMutation.mutateAsync({
        portfolioId,
        goalId: editingGoal.id,
        goal: goalData
      })
      setEditingGoal(null)
    } catch (error) {
      console.error('Failed to update goal:', error)
    }
  }

  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm('Are you sure you want to delete this goal?')) return

    try {
      await deleteGoalMutation.mutateAsync({ portfolioId, goalId })
    } catch (error) {
      console.error('Failed to delete goal:', error)
    }
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Goal Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            <div className="text-center">
              <AlertCircle className="h-6 w-6 mx-auto mb-2" />
              <p>Unable to load goals</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Try Again
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Investment Goal Tracking
              </CardTitle>
              <CardDescription>
                Set and monitor your investment goals and milestones
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Goal
            </Button>
          </div>
        </CardHeader>
      </Card>

      {goals.length > 0 && <GoalSummary goals={goals} />}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-6 w-32 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-4 w-full bg-muted animate-pulse rounded" />
                  <div className="h-3 w-3/4 bg-muted animate-pulse rounded" />
                  <div className="h-2 w-full bg-muted animate-pulse rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : goals.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center h-48">
            <div className="text-center text-muted-foreground">
              <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No investment goals set yet</p>
              <p className="text-sm">Create your first goal to start tracking progress</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEdit={setEditingGoal}
              onDelete={handleDeleteGoal}
            />
          ))}
        </div>
      )}

      <CreateGoalDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSubmit={handleCreateGoal}
        portfolioId={portfolioId}
      />

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Goal Setting Tips:</strong> Set specific, measurable, achievable, relevant, and time-bound (SMART) goals.
          Regular monitoring and adjustment of goals based on market conditions and personal circumstances is recommended.
        </AlertDescription>
      </Alert>
    </div>
  )
}