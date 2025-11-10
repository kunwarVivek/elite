import { apiClient } from './api-client'

export interface TermSheet {
  id: string
  equityRoundId: string
  investorId: string
  version: number
  investmentAmount: number
  valuation: number
  pricePerShare: number
  boardSeats: number
  proRataRights: boolean
  liquidationPreference: number
  dividendRate?: number
  antidilutionProvision: 'FULL_RATCHET' | 'WEIGHTED_AVERAGE' | 'NONE'
  votingRights: Record<string, any>
  dragAlongRights: boolean
  tagAlongRights: boolean
  redemptionRights: boolean
  conversionRights: Record<string, any>
  informationRights: Record<string, any>
  preemptiveRights: boolean
  coSaleRights: boolean
  noShopClause: boolean
  exclusivityPeriod: number
  closingConditions: string[]
  otherTerms: Record<string, any>
  status: 'DRAFT' | 'PROPOSED' | 'UNDER_NEGOTIATION' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED'
  expiryDate?: string
  acceptedAt?: string
  rejectionReason?: string
  createdAt: string
  updatedAt: string
  equityRound?: any
  investor?: any
  negotiations?: any[]
}

export interface CreateTermSheetData {
  equityRoundId: string
  investorId: string
  version?: number
  investmentAmount: number
  valuation: number
  pricePerShare: number
  boardSeats?: number
  proRataRights?: boolean
  liquidationPreference?: number
  dividendRate?: number
  antidilutionProvision?: 'FULL_RATCHET' | 'WEIGHTED_AVERAGE' | 'NONE'
  votingRights?: Record<string, any>
  dragAlongRights?: boolean
  tagAlongRights?: boolean
  redemptionRights?: boolean
  conversionRights?: Record<string, any>
  informationRights?: Record<string, any>
  preemptiveRights?: boolean
  coSaleRights?: boolean
  noShopClause?: boolean
  exclusivityPeriod?: number
  closingConditions?: string[]
  otherTerms?: Record<string, any>
  expiryDate?: string
}

export const termSheetApi = {
  /**
   * Create term sheet
   */
  create: async (data: CreateTermSheetData) => {
    return apiClient.post<TermSheet>('/term-sheets', data)
  },

  /**
   * Get term sheet by ID
   */
  getById: async (id: string) => {
    return apiClient.get<TermSheet>(`/term-sheets/${id}`)
  },

  /**
   * Get term sheets by round
   */
  getByRound: async (roundId: string) => {
    return apiClient.get<TermSheet[]>(`/term-sheets/round/${roundId}`)
  },

  /**
   * Get term sheets by investor
   */
  getByInvestor: async (investorId: string) => {
    return apiClient.get<TermSheet[]>(`/term-sheets/investor/${investorId}`)
  },

  /**
   * Update term sheet
   */
  update: async (id: string, data: Partial<CreateTermSheetData>) => {
    return apiClient.put<TermSheet>(`/term-sheets/${id}`, data)
  },

  /**
   * Propose term sheet
   */
  propose: async (id: string) => {
    return apiClient.post<TermSheet>(`/term-sheets/${id}/propose`)
  },

  /**
   * Accept term sheet
   */
  accept: async (id: string) => {
    return apiClient.post<TermSheet>(`/term-sheets/${id}/accept`)
  },

  /**
   * Reject term sheet
   */
  reject: async (id: string, reason?: string) => {
    return apiClient.post<TermSheet>(`/term-sheets/${id}/reject`, { reason })
  },

  /**
   * Create new version
   */
  createNewVersion: async (id: string, changes: Partial<CreateTermSheetData>) => {
    return apiClient.post<TermSheet>(`/term-sheets/${id}/version`, changes)
  },
}
