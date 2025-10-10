
import { format, formatDistanceToNow } from 'date-fns'
import type { Pitch, PitchStatus, StartupStage, DocumentType } from '@/types/pitch'

// Format currency values
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Format percentage values
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`
}

// Format pitch status for display
export function formatPitchStatus(status: PitchStatus): string {
  const statusMap: Record<PitchStatus, string> = {
    DRAFT: 'Draft',
    UNDER_REVIEW: 'Under Review',
    ACTIVE: 'Active',
    FUNDED: 'Funded',
    CLOSED: 'Closed',
    WITHDRAWN: 'Withdrawn',
  }
  return statusMap[status]
}

// Get status badge color
export function getStatusBadgeVariant(status: PitchStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  const variantMap: Record<PitchStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    DRAFT: 'secondary',
    UNDER_REVIEW: 'outline',
    ACTIVE: 'default',
    FUNDED: 'default',
    CLOSED: 'outline',
    WITHDRAWN: 'destructive',
  }
  return variantMap[status]
}

// Format startup stage for display
export function formatStartupStage(stage: StartupStage): string {
  const stageMap: Record<StartupStage, string> = {
    IDEA: 'Idea',
    PROTOTYPE: 'Prototype',
    MVP: 'MVP',
    GROWTH: 'Growth',
    SCALE: 'Scale',
  }
  return stageMap[stage]
}

// Format document type for display
export function formatDocumentType(type: DocumentType): string {
  const typeMap: Record<DocumentType, string> = {
    PITCH_DECK: 'Pitch Deck',
    BUSINESS_PLAN: 'Business Plan',
    FINANCIAL_STATEMENT: 'Financial Statement',
    LEGAL_DOCUMENT: 'Legal Document',
    OTHER: 'Other',
  }
  return typeMap[type]
}

// Format file size for display
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Format date for display
export function formatDate(date: string | Date): string {
  return format(new Date(date), 'MMM dd, yyyy')
}

// Format relative time
export function formatRelativeTime(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

// Calculate funding progress percentage
export function calculateFundingProgress(current: number, goal: number): number {
  if (goal === 0) return 0
  return Math.min((current / goal) * 100, 100)
}

// Format funding progress text
export function formatFundingProgress(current: number, goal: number): string {
  const percentage = calculateFundingProgress(current, goal)
  return `${formatCurrency(current)} of ${formatCurrency(goal)} (${percentage.toFixed(0)}%)`
}

// Generate pitch slug from title
export function generatePitchSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
}

// Truncate text with ellipsis
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trim() + '...'
}

// Get pitch engagement level based on views and comments
export function getEngagementLevel(pitch: Pitch): 'low' | 'medium' | 'high' {
  const { view_count, comments } = pitch
  const commentCount = comments?.length || 0

  if (view_count > 100 || commentCount > 10) return 'high'
  if (view_count > 20 || commentCount > 2) return 'medium'
  return 'low'
}

// Calculate days until pitch expires
export function getDaysUntilExpiry(expiresAt?: string): number | null {
  if (!expiresAt) return null

  const expiryDate = new Date(expiresAt)
  const now = new Date()
  const diffTime = expiryDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return diffDays
}

// Check if pitch is expiring soon (within 7 days)
export function isExpiringSoon(expiresAt?: string): boolean {
  const daysUntilExpiry = getDaysUntilExpiry(expiresAt)
  return daysUntilExpiry !== null && daysUntilExpiry <= 7 && daysUntilExpiry > 0
}

// Get pitch status color for charts/analytics
export function getPitchStatusColor(status: PitchStatus): string {
  const colorMap: Record<PitchStatus, string> = {
    DRAFT: '#6B7280', // Gray
    UNDER_REVIEW: '#F59E0B', // Amber
    ACTIVE: '#10B981', // Green
    FUNDED: '#059669', // Emerald
    CLOSED: '#6B7280', // Gray
    WITHDRAWN: '#EF4444', // Red
  }
  return colorMap[status]
}

// Get startup stage color
export function getStartupStageColor(stage: StartupStage): string {
  const colorMap: Record<StartupStage, string> = {
    IDEA: '#8B5CF6', // Purple
    PROTOTYPE: '#3B82F6', // Blue
    MVP: '#10B981', // Green
    GROWTH: '#F59E0B', // Amber
    SCALE: '#EF4444', // Red
  }
  return colorMap[stage]
}

// Validate pitch data before submission
export function validatePitchData(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!data.title?.trim()) {
    errors.push('Pitch title is required')
  }

  if (!data.summary?.trim()) {
    errors.push('Pitch summary is required')
  }

  if (!data.problem_statement?.trim()) {
    errors.push('Problem statement is required')
  }

  if (!data.solution?.trim()) {
    errors.push('Solution is required')
  }

  if (!data.market_opportunity?.trim()) {
    errors.push('Market opportunity is required')
  }

  if (!data.funding_amount || data.funding_amount < 1000) {
    errors.push('Funding amount must be at least $1,000')
  }

  if (!data.equity_offered || data.equity_offered <= 0 || data.equity_offered > 50) {
    errors.push('Equity offered must be between 0.1% and 50%')
  }

  if (!data.minimum_investment || data.minimum_investment < 100) {
    errors.push('Minimum investment must be at least $100')
  }

  if (data.minimum_investment && data.funding_amount && data.minimum_investment > data.funding_amount) {
    errors.push('Minimum investment cannot exceed funding amount')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

// Get pitch performance metrics
export function getPitchMetrics(pitch: Pitch) {
  const { view_count, comments, investment_summary } = pitch
  const commentCount = comments?.length || 0
  const investorCount = investment_summary?.investor_count || 0
  const totalInvested = investment_summary?.total_invested || 0

  return {
    views: view_count,
    comments: commentCount,
    investors: investorCount,
    totalInvested,
    engagementRate: view_count > 0 ? ((commentCount + investorCount) / view_count) * 100 : 0,
    conversionRate: view_count > 0 ? (investorCount / view_count) * 100 : 0,
  }
}

// Sort pitches by different criteria
export function sortPitches(pitches: Pitch[], sortBy: 'created_at' | 'funding_amount' | 'view_count' | 'updated_at', sortOrder: 'asc' | 'desc' = 'desc'): Pitch[] {
  return [...pitches].sort((a, b) => {
    let aValue: any
    let bValue: any

    switch (sortBy) {
      case 'created_at':
        aValue = new Date(a.created_at).getTime()
        bValue = new Date(b.created_at).getTime()
        break
      case 'updated_at':
        aValue = new Date(a.updated_at).getTime()
        bValue = new Date(b.updated_at).getTime()
        break
      case 'funding_amount':
        aValue = a.funding_amount
        bValue = b.funding_amount
        break
      case 'view_count':
        aValue = a.view_count
        bValue = b.view_count
        break
      default:
        return 0
    }

    if (sortOrder === 'asc') {
      return aValue - bValue
    } else {
      return bValue - aValue
    }
  })
}

// Filter pitches by status
export function filterPitchesByStatus(pitches: Pitch[], statuses: PitchStatus[]): Pitch[] {
  if (statuses.length === 0) return pitches
  return pitches.filter(pitch => statuses.includes(pitch.status))
}

// Filter pitches by funding range
export function filterPitchesByFundingRange(pitches: Pitch[], minAmount?: number, maxAmount?: number): Pitch[] {
  return pitches.filter(pitch => {
    if (minAmount !== undefined && pitch.funding_amount < minAmount) return false
    if (maxAmount !== undefined && pitch.funding_amount > maxAmount) return false
    return true
  })
}

// Search pitches by text
export function searchPitches(pitches: Pitch[], searchTerm: string): Pitch[] {
  if (!searchTerm.trim()) return pitches

  const term = searchTerm.toLowerCase()
  return pitches.filter(pitch =>
    pitch.title.toLowerCase().includes(term) ||
    pitch.summary.toLowerCase().includes(term) ||
    pitch.startup?.name.toLowerCase().includes(term) ||
    pitch.startup?.industry.toLowerCase().includes(term) ||
    pitch.tags?.some(tag => tag.toLowerCase().includes(term))
  )
}

// Get pitches statistics
export function getPitchesStatistics(pitches: Pitch[]) {
  const total = pitches.length
  const byStatus = pitches.reduce((acc, pitch) => {
    acc[pitch.status] = (acc[pitch.status] || 0) + 1
    return acc
  }, {} as Record<PitchStatus, number>)

  const totalFunding = pitches.reduce((sum, pitch) => sum + pitch.funding_amount, 0)
  const averageFunding = total > 0 ? totalFunding / total : 0

  const totalViews = pitches.reduce((sum, pitch) => sum + pitch.view_count, 0)
  const averageViews = total > 0 ? totalViews / total : 0

  return {
    total,
    byStatus,
    totalFunding,
    averageFunding,
    totalViews,
    averageViews,
  }
}

// Check if pitch can be edited by user
export function canEditPitch(pitch: Pitch, userId: string, userRole?: string): boolean {
  // Admin can edit any pitch
  if (userRole === 'ADMIN') return true

  // Founder can edit their own startup's pitches
  if (pitch.startup?.founder_id === userId) return true

  // Check if pitch is in editable status
  const editableStatuses: PitchStatus[] = ['DRAFT', 'UNDER_REVIEW']
  if (!editableStatuses.includes(pitch.status)) return false

  return false
}

// Check if pitch can be published by user
export function canPublishPitch(pitch: Pitch, userId: string, userRole?: string): boolean {
  // Admin can publish any pitch
  if (userRole === 'ADMIN') return true

  // Founder can publish their own startup's pitches
  if (pitch.startup?.founder_id === userId) return true

  return false
}

// Get pitch action permissions for user
export function getPitchPermissions(pitch: Pitch, userId: string, userRole?: string) {
  const isOwner = pitch.startup?.founder_id === userId
  const isAdmin = userRole === 'ADMIN'

  return {
    canEdit: isAdmin || (isOwner && ['DRAFT', 'UNDER_REVIEW'].includes(pitch.status)),
    canDelete: isAdmin || isOwner,
    canPublish: isAdmin || (isOwner && pitch.status === 'DRAFT'),
    canPause: isAdmin || (isOwner && pitch.status === 'ACTIVE'),
    canAddComment: true, // Anyone can comment
    canViewAnalytics: isAdmin || isOwner,
    canUploadDocuments: isAdmin || isOwner,
  }
}

// Generate pitch preview text
export function generatePitchPreview(pitch: Pitch, maxLength: number = 200): string {
  const { summary, problem_statement } = pitch

  // Use summary if available, otherwise use problem statement
  const text = summary || problem_statement || ''

  return truncateText(text, maxLength)
}

// Get pitch tags for display
export function getPitchTags(pitch: Pitch): string[] {
  const tags: string[] = []

  // Add startup stage as tag
  if (pitch.startup?.stage) {
    tags.push(formatStartupStage(pitch.startup.stage))
  }

  // Add industry as tag
  if (pitch.startup?.industry) {
    tags.push(pitch.startup.industry)
  }

  // Add custom tags
  if (pitch.tags) {
    tags.push(...pitch.tags)
  }

  return tags.slice(0, 5) // Limit to 5 tags
}

// Calculate investment progress
export function calculateInvestmentProgress(pitch: Pitch): {
  percentage: number
  amount: number
  remaining: number
  investors: number
} {
  const { funding_amount, investment_summary } = pitch
  const currentAmount = investment_summary?.total_invested || 0
  const investorCount = investment_summary?.investor_count || 0

  const percentage = calculateFundingProgress(currentAmount, funding_amount)
  const remaining = Math.max(0, funding_amount - currentAmount)

  return {
    percentage,
    amount: currentAmount,
    remaining,
    investors: investorCount,
  }
}

// Format investment progress for display
export function formatInvestmentProgress(pitch: Pitch): string {
  const progress = calculateInvestmentProgress(pitch)
  return `${formatCurrency(progress.amount)} raised from ${progress.investors} investor${progress.investors !== 1 ? 's' : ''}`
}