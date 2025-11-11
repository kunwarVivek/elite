import { apiClient } from './api-client'

export interface ConvertibleNote {
  id: string
  investmentId: string
  principalAmount: number
  interestRate: number
  maturityDate: string
  discountRate?: number
  valuationCap?: number
  autoConversion: boolean
  qualifiedFinancingThreshold?: number
  securityType: string
  compounding: 'SIMPLE' | 'COMPOUND'
  accruedInterest: number
  lastAccrualDate: string
  status: 'ACTIVE' | 'CONVERTED' | 'REPAID' | 'DEFAULTED'
  conversionPrice?: number
  documentUrl?: string
  createdAt: string
  updatedAt: string
  investment?: any
}

export interface CreateNoteData {
  investmentId: string
  principalAmount: number
  interestRate: number
  maturityDate: string
  discountRate?: number
  valuationCap?: number
  autoConversion?: boolean
  qualifiedFinancingThreshold?: number
  securityType?: string
  compounding?: 'SIMPLE' | 'COMPOUND'
  documentUrl?: string
}

export interface ConversionResult {
  note: ConvertibleNote
  shares: number
  conversionPrice: number
  totalAmount: number
}

export const convertibleNoteApi = {
  /**
   * Create a new convertible note
   */
  create: async (data: CreateNoteData) => {
    return apiClient.post<ConvertibleNote>('/notes', data)
  },

  /**
   * Get note by ID
   */
  getById: async (id: string) => {
    return apiClient.get<ConvertibleNote>(`/notes/${id}`)
  },

  /**
   * Get notes by startup
   */
  getByStartup: async (startupId: string) => {
    return apiClient.get<ConvertibleNote[]>(`/notes/startup/${startupId}`)
  },

  /**
   * Get notes by investor
   */
  getByInvestor: async (investorId: string) => {
    return apiClient.get<ConvertibleNote[]>(`/notes/investor/${investorId}`)
  },

  /**
   * Get maturing notes
   */
  getMaturingNotes: async (days: number = 30) => {
    return apiClient.get<ConvertibleNote[]>('/notes/maturing', { days: days.toString() })
  },

  /**
   * Accrue interest on note
   */
  accrueInterest: async (id: string) => {
    return apiClient.post<ConvertibleNote>(`/notes/${id}/accrue`)
  },

  /**
   * Calculate current interest
   */
  calculateInterest: async (id: string) => {
    return apiClient.get<{ accruedInterest: number }>(`/notes/${id}/interest`)
  },

  /**
   * Convert note to equity
   */
  convert: async (id: string, data: {
    pricePerShare: number
    roundValuation?: number
  }) => {
    return apiClient.post<ConversionResult>(`/notes/${id}/convert`, data)
  },

  /**
   * Repay note at maturity
   */
  repay: async (id: string, repaymentAmount: number) => {
    return apiClient.post<ConvertibleNote>(`/notes/${id}/repay`, { repaymentAmount })
  },

  /**
   * Calculate conversion details
   */
  calculateConversion: async (id: string, pricePerShare: number) => {
    return apiClient.post<{
      conversionPrice: number
      shares: number
      totalAmount: number
    }>(`/notes/${id}/calculate-conversion`, { pricePerShare })
  },

  /**
   * Check if round qualifies for conversion
   */
  checkQualifiedFinancing: async (id: string, roundAmount: number) => {
    return apiClient.post<{
      isQualified: boolean
      roundAmount: number
    }>(`/notes/${id}/check-qualified-financing`, { roundAmount })
  },
}
