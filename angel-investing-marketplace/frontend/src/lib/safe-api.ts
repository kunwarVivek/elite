import { apiClient } from './api-client'

export interface SafeAgreement {
  id: string
  investmentId: string
  type: 'POST_MONEY' | 'PRE_MONEY'
  investmentAmount: number
  valuationCap?: number
  discountRate?: number
  proRataRight: boolean
  mfnProvision: boolean
  qualifiedFinancingThreshold?: number
  autoConversion: boolean
  conversionPrice?: number
  status: 'ACTIVE' | 'CONVERTED' | 'DISSOLVED'
  documentUrl?: string
  createdAt: string
  updatedAt: string
  investment?: any
}

export interface CreateSafeData {
  investmentId: string
  type: 'POST_MONEY' | 'PRE_MONEY'
  investmentAmount: number
  valuationCap?: number
  discountRate?: number
  proRataRight?: boolean
  mfnProvision?: boolean
  qualifiedFinancingThreshold?: number
  documentUrl?: string
}

export interface ConversionCalculation {
  conversionPrice: number
  shares: number
  investmentAmount: number
  valuationCap?: number
  discountRate?: number
}

export interface ConversionTrigger {
  safeId: string
  roundId: string
  roundAmount: number
  shouldConvert: boolean
  reason: string
}

export const safeApi = {
  /**
   * Create a new SAFE agreement
   */
  create: async (data: CreateSafeData) => {
    return apiClient.post<SafeAgreement>('/safes', data)
  },

  /**
   * Get SAFE by ID
   */
  getById: async (id: string) => {
    return apiClient.get<SafeAgreement>(`/safes/${id}`)
  },

  /**
   * Get SAFEs by startup
   */
  getByStartup: async (startupId: string) => {
    return apiClient.get<SafeAgreement[]>(`/safes/startup/${startupId}`)
  },

  /**
   * Get SAFEs by investor
   */
  getByInvestor: async (investorId: string) => {
    return apiClient.get<SafeAgreement[]>(`/safes/investor/${investorId}`)
  },

  /**
   * Update SAFE agreement
   */
  update: async (id: string, data: Partial<CreateSafeData>) => {
    return apiClient.put<SafeAgreement>(`/safes/${id}`, data)
  },

  /**
   * Convert SAFE to equity
   */
  convert: async (id: string, data: {
    roundId: string
    pricePerShare: number
    roundValuation: number
  }) => {
    return apiClient.post<{
      safe: SafeAgreement
      shares: number
      conversionPrice: number
    }>(`/safes/${id}/convert`, data)
  },

  /**
   * Calculate conversion without executing
   */
  calculateConversion: async (id: string, data: {
    roundValuation: number
    pricePerShare: number
  }) => {
    return apiClient.post<ConversionCalculation>(`/safes/${id}/calculate-conversion`, data)
  },

  /**
   * Dissolve SAFE agreement
   */
  dissolve: async (id: string, reason: string) => {
    return apiClient.post<SafeAgreement>(`/safes/${id}/dissolve`, { reason })
  },

  /**
   * Check conversion triggers for a startup
   */
  checkConversionTriggers: async (startupId: string, roundAmount?: number) => {
    const params = roundAmount ? { roundAmount: roundAmount.toString() } : undefined
    return apiClient.get<ConversionTrigger[]>(`/safes/startup/${startupId}/triggers`, params)
  },
}
