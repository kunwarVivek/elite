import { useState, useCallback } from 'react'
import { useForm, UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import type { CreatePitchRequest, PitchFormData } from '@/types/pitch'

// Form step definitions
export const FORM_STEPS = {
  BASIC_INFO: 'basic-info',
  PITCH_CONTENT: 'pitch-content',
  FINANCIALS: 'financials',
  TEAM: 'team',
  DOCUMENTS: 'documents',
  REVIEW: 'review',
} as const

export type FormStep = typeof FORM_STEPS[keyof typeof FORM_STEPS]

// Form schemas for each step
const basicInfoSchema = z.object({
  title: z.string().min(10, 'Title must be at least 10 characters').max(200, 'Title cannot exceed 200 characters'),
  summary: z.string().min(50, 'Summary must be at least 50 characters').max(1000, 'Summary cannot exceed 1000 characters'),
  funding_amount: z.number().min(1000, 'Funding amount must be at least $1,000').max(100000000, 'Funding amount cannot exceed $100,000,000'),
  equity_offered: z.number().min(0.1, 'Equity offered must be at least 0.1%').max(50, 'Equity offered cannot exceed 50%'),
  minimum_investment: z.number().min(100, 'Minimum investment must be at least $100'),
})

const pitchContentSchema = z.object({
  problem_statement: z.string().min(100, 'Problem statement must be at least 100 characters').max(2000, 'Problem statement cannot exceed 2000 characters'),
  solution: z.string().min(100, 'Solution must be at least 100 characters').max(2000, 'Solution cannot exceed 2000 characters'),
  market_opportunity: z.string().min(100, 'Market opportunity must be at least 100 characters').max(2000, 'Market opportunity cannot exceed 2000 characters'),
  competitive_analysis: z.string().max(2000, 'Competitive analysis cannot exceed 2000 characters').optional(),
})

const financialsSchema = z.object({
  year1_revenue: z.number().min(0, 'Year 1 revenue must be positive').optional(),
  year2_revenue: z.number().min(0, 'Year 2 revenue must be positive').optional(),
  year3_revenue: z.number().min(0, 'Year 3 revenue must be positive').optional(),
  year1_profit: z.number().optional(),
  year2_profit: z.number().optional(),
  year3_profit: z.number().optional(),
  break_even_months: z.number().min(1, 'Break-even months must be at least 1').max(60, 'Break-even months cannot exceed 60').optional(),
  monthly_burn_rate: z.number().min(0, 'Monthly burn rate must be positive').optional(),
  runway_months: z.number().min(0, 'Runway months must be positive').optional(),
})

// Complete form schema
const completeFormSchema = basicInfoSchema.merge(pitchContentSchema).merge(financialsSchema)

export type PitchFormData = z.infer<typeof completeFormSchema>

// Hook for managing pitch form state
export function usePitchForm() {
  const [currentStep, setCurrentStep] = useState<FormStep>(FORM_STEPS.BASIC_INFO)
  const [completedSteps, setCompletedSteps] = useState<Set<FormStep>>(new Set())
  const [formData, setFormData] = useState<Partial<PitchFormData>>({})

  // Form instance for current step
  const form = useForm<PitchFormData>({
    resolver: zodResolver(completeFormSchema),
    defaultValues: formData,
    mode: 'onChange',
  })

  // Get current step schema for validation
  const getCurrentStepSchema = useCallback((step: FormStep) => {
    switch (step) {
      case FORM_STEPS.BASIC_INFO:
        return basicInfoSchema
      case FORM_STEPS.PITCH_CONTENT:
        return pitchContentSchema
      case FORM_STEPS.FINANCIALS:
        return financialsSchema
      default:
        return completeFormSchema
    }
  }, [])

  // Navigate to next step
  const nextStep = useCallback(async () => {
    const currentStepSchema = getCurrentStepSchema(currentStep)

    // Validate current step data
    const currentStepData = form.getValues()
    const validationResult = currentStepSchema.safeParse(currentStepData)

    if (!validationResult.success) {
      // Set form errors
      validationResult.error.errors.forEach((error) => {
        form.setError(error.path[0] as keyof PitchFormData, {
          type: 'manual',
          message: error.message,
        })
      })
      toast.error('Please fix the errors before proceeding')
      return false
    }

    // Mark current step as completed
    setCompletedSteps(prev => new Set([...prev, currentStep]))

    // Update form data
    setFormData(currentStepData)

    // Move to next step
    const stepOrder = Object.values(FORM_STEPS)
    const currentIndex = stepOrder.indexOf(currentStep)
    if (currentIndex < stepOrder.length - 1) {
      setCurrentStep(stepOrder[currentIndex + 1] as FormStep)
      return true
    }

    return true
  }, [currentStep, form, getCurrentStepSchema])

  // Navigate to previous step
  const previousStep = useCallback(() => {
    const stepOrder = Object.values(FORM_STEPS)
    const currentIndex = stepOrder.indexOf(currentStep)
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1] as FormStep)
    }
  }, [currentStep])

  // Jump to specific step
  const goToStep = useCallback((step: FormStep) => {
    setCurrentStep(step)
  }, [])

  // Check if step is completed
  const isStepCompleted = useCallback((step: FormStep) => {
    return completedSteps.has(step)
  }, [completedSteps])

  // Check if step is accessible (previous steps completed or current step)
  const isStepAccessible = useCallback((step: FormStep) => {
    const stepOrder = Object.values(FORM_STEPS)
    const stepIndex = stepOrder.indexOf(step)
    const currentIndex = stepOrder.indexOf(currentStep)

    // Can access current step and previous completed steps
    return stepIndex <= currentIndex || isStepCompleted(step)
  }, [currentStep, isStepCompleted])

  // Get step progress
  const getStepProgress = useCallback(() => {
    const totalSteps = Object.values(FORM_STEPS).length
    const completedCount = completedSteps.size
    return {
      current: currentIndex + 1,
      total: totalSteps,
      completed: completedCount,
      percentage: Math.round((completedCount / totalSteps) * 100),
    }
  }, [completedSteps])

  // Auto-save form data
  const autoSave = useCallback(() => {
    const currentData = form.getValues()
    setFormData(currentData)

    // In a real app, you might want to save to localStorage or server
    localStorage.setItem('pitch-form-draft', JSON.stringify(currentData))
  }, [form])

  // Load saved form data
  const loadSavedData = useCallback(() => {
    try {
      const savedData = localStorage.getItem('pitch-form-draft')
      if (savedData) {
        const parsedData = JSON.parse(savedData)
        setFormData(parsedData)
        form.reset(parsedData)
        toast.success('Draft data loaded')
      }
    } catch (error) {
      console.error('Failed to load saved form data:', error)
    }
  }, [form])

  // Clear saved data
  const clearSavedData = useCallback(() => {
    localStorage.removeItem('pitch-form-draft')
    setFormData({})
    form.reset({})
    setCompletedSteps(new Set())
    setCurrentStep(FORM_STEPS.BASIC_INFO)
    toast.success('Form data cleared')
  }, [form])

  // Submit complete form
  const submitForm = useCallback(async (): Promise<CreatePitchRequest> => {
    const formValues = form.getValues()

    // Final validation
    const validationResult = completeFormSchema.safeParse(formValues)
    if (!validationResult.success) {
      validationResult.error.errors.forEach((error) => {
        form.setError(error.path[0] as keyof PitchFormData, {
          type: 'manual',
          message: error.message,
        })
      })
      throw new Error('Please fix all form errors before submitting')
    }

    // Clear saved draft data
    clearSavedData()

    return validationResult.data as CreatePitchRequest
  }, [form, clearSavedData])

  return {
    // Form instance
    form,

    // Step management
    currentStep,
    completedSteps: Array.from(completedSteps),
    setCurrentStep,
    nextStep,
    previousStep,
    goToStep,
    isStepCompleted,
    isStepAccessible,

    // Progress
    progress: getStepProgress(),

    // Data management
    formData,
    autoSave,
    loadSavedData,
    clearSavedData,

    // Submission
    submitForm,

    // Constants
    FORM_STEPS,
  }
}

// Hook for managing file uploads in forms
export function useFileUpload() {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const addFiles = useCallback((files: File[]) => {
    setUploadedFiles(prev => [...prev, ...files])
  }, [])

  const removeFile = useCallback((index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
  }, [])

  const clearFiles = useCallback(() => {
    setUploadedFiles([])
  }, [])

  return {
    uploadedFiles,
    isUploading,
    setIsUploading,
    addFiles,
    removeFile,
    clearFiles,
    fileCount: uploadedFiles.length,
  }
}