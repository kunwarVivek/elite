import { useState, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  ChevronLeft,
  ChevronRight,
  Save,
  Send,
  Eye,
  CheckCircle,
  Circle,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { usePitchForm, FORM_STEPS } from '@/hooks/use-pitch-form'
import { useCreatePitch } from '@/hooks/use-pitch'
import { BasicInfoStep } from './steps/basic-info'
import { PitchContentStep } from './steps/pitch-content'
import { FinancialsStep } from './steps/financials'
import { TeamStep } from './steps/team'
import { DocumentsStep } from './steps/documents'
import { ReviewStep } from './steps/review'
import type { CreatePitchRequest } from '@/types/pitch'

interface PitchFormProps {
  startupId?: string
  onSuccess?: (pitchId: string) => void
  onCancel?: () => void
}

export function PitchForm({ startupId, onSuccess, onCancel }: PitchFormProps) {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const createPitchMutation = useCreatePitch()

  const {
    form,
    currentStep,
    completedSteps,
    nextStep,
    previousStep,
    goToStep,
    isStepCompleted,
    isStepAccessible,
    progress,
    autoSave,
    submitForm,
    FORM_STEPS,
  } = usePitchForm()

  // Auto-save form data periodically
  useEffect(() => {
    const interval = setInterval(() => {
      autoSave()
    }, 30000) // Auto-save every 30 seconds

    return () => clearInterval(interval)
  }, [autoSave])

  // Handle form submission
  const handleSubmit = async () => {
    setIsSubmitting(true)

    try {
      const formData = await submitForm()

      // Prepare pitch data for API
      const pitchData: CreatePitchRequest = {
        startup_id: startupId || '',
        title: formData.title,
        summary: formData.summary,
        problem_statement: formData.problem_statement,
        solution: formData.solution,
        market_opportunity: formData.market_opportunity,
        competitive_analysis: formData.competitive_analysis,
        financial_projections: {
          year1_revenue: formData.year1_revenue,
          year2_revenue: formData.year2_revenue,
          year3_revenue: formData.year3_revenue,
          year1_profit: formData.year1_profit,
          year2_profit: formData.year2_profit,
          year3_profit: formData.year3_profit,
          break_even_months: formData.break_even_months,
          monthly_burn_rate: formData.monthly_burn_rate,
          runway_months: formData.runway_months,
        },
        funding_amount: formData.funding_amount,
        equity_offered: formData.equity_offered,
        minimum_investment: formData.minimum_investment,
      }

      const newPitch = await createPitchMutation.mutateAsync(pitchData)

      if (onSuccess) {
        onSuccess(newPitch.id)
      } else {
        navigate({ to: '/pitches/$id', params: { id: newPitch.id } })
      }
    } catch (error) {
      console.error('Failed to create pitch:', error)
      // Error handling is done in the mutation
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle step navigation
  const handleNext = async () => {
    const success = await nextStep()
    if (success) {
      autoSave()
    }
  }

  const handlePrevious = () => {
    previousStep()
  }

  // Render current step component
  const renderCurrentStep = () => {
    switch (currentStep) {
      case FORM_STEPS.BASIC_INFO:
        return <BasicInfoStep form={form} />
      case FORM_STEPS.PITCH_CONTENT:
        return <PitchContentStep form={form} />
      case FORM_STEPS.FINANCIALS:
        return <FinancialsStep form={form} />
      case FORM_STEPS.TEAM:
        return <TeamStep form={form} />
      case FORM_STEPS.DOCUMENTS:
        return <DocumentsStep form={form} />
      case FORM_STEPS.REVIEW:
        return <ReviewStep form={form} />
      default:
        return <BasicInfoStep form={form} />
    }
  }

  // Get step title and description
  const getStepInfo = (step: string) => {
    switch (step) {
      case FORM_STEPS.BASIC_INFO:
        return { title: 'Basic Information', description: 'Company details and funding requirements' }
      case FORM_STEPS.PITCH_CONTENT:
        return { title: 'Pitch Content', description: 'Problem, solution, and market opportunity' }
      case FORM_STEPS.FINANCIALS:
        return { title: 'Financial Projections', description: 'Revenue forecasts and cost structure' }
      case FORM_STEPS.TEAM:
        return { title: 'Team Information', description: 'Founder and team member details' }
      case FORM_STEPS.DOCUMENTS:
        return { title: 'Supporting Documents', description: 'Pitch deck and additional files' }
      case FORM_STEPS.REVIEW:
        return { title: 'Review & Submit', description: 'Final review before submission' }
      default:
        return { title: 'Step', description: 'Current step' }
    }
  }

  const currentStepInfo = getStepInfo(currentStep)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{currentStepInfo.title}</CardTitle>
              <p className="text-muted-foreground mt-1">{currentStepInfo.description}</p>
            </div>
            <Badge variant="outline" className="text-sm">
              Step {progress.current} of {progress.total}
            </Badge>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress value={progress.percentage} className="h-2" />
            <p className="text-sm text-muted-foreground">
              {progress.completed} of {progress.total} sections completed
            </p>
          </div>
        </CardHeader>
      </Card>

      {/* Step Navigation Sidebar */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-2">
            {Object.values(FORM_STEPS).map((step, index) => {
              const stepInfo = getStepInfo(step)
              const isCompleted = isStepCompleted(step)
              const isCurrent = currentStep === step
              const isAccessible = isStepAccessible(step)

              return (
                <Button
                  key={step}
                  variant={isCurrent ? "default" : isCompleted ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => isAccessible && goToStep(step)}
                  disabled={!isAccessible}
                  className="flex items-center gap-2"
                >
                  {isCompleted ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : isCurrent ? (
                    <Circle className="h-4 w-4 fill-current" />
                  ) : (
                    <Circle className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">{stepInfo.title}</span>
                  <span className="sm:hidden">{index + 1}</span>
                </Button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Current Step Content */}
      <div className="min-h-[600px]">
        {renderCurrentStep()}
      </div>

      {/* Navigation Footer */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === FORM_STEPS.BASIC_INFO}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>

              {currentStep !== FORM_STEPS.BASIC_INFO && (
                <Button
                  variant="ghost"
                  onClick={autoSave}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Draft
                </Button>
              )}
            </div>

            <div className="flex items-center gap-4">
              {currentStep !== FORM_STEPS.REVIEW && (
                <Button
                  variant="outline"
                  onClick={() => goToStep(FORM_STEPS.REVIEW)}
                  disabled={!completedSteps.includes(FORM_STEPS.BASIC_INFO)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
              )}

              {currentStep === FORM_STEPS.REVIEW ? (
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || createPitchMutation.isPending}
                  className="min-w-[120px]"
                >
                  {isSubmitting || createPitchMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Submit Pitch
                    </>
                  )}
                </Button>
              ) : (
                <Button onClick={handleNext}>
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>

          {/* Warning for incomplete steps */}
          {currentStep !== FORM_STEPS.REVIEW && (
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">
                  Complete all required fields before proceeding to the next step
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Keyboard Navigation Hint */}
      <div className="text-center text-sm text-muted-foreground">
        💡 Tip: Use the step navigation above to jump between sections, or use the Previous/Next buttons below
      </div>
    </div>
  )
}