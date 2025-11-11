import { apiClient } from './api-client'

export interface InvestorRights {
  id: string
  investmentId: string
  proRataRights: boolean
  proRataPercentage?: number
  rightOfFirstRefusal: boolean
  rofrDuration?: number
  coSaleRights: boolean
  dragAlongRights: boolean
  tagAlongRights: boolean
  informationRights: boolean
  informationFrequency?: 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY'
  boardObserverRights: boolean
  boardSeatRights: boolean
  antiDilutionRights: boolean
  antiDilutionType?: 'FULL_RATCHET' | 'WEIGHTED_AVERAGE' | 'NARROW_BASED' | 'BROAD_BASED'
  redemptionRights: boolean
  redemptionPeriod?: number
  conversionRights: boolean
  votingRights: Record<string, any>
  participationRights: boolean
  preemptiveRights: boolean
  registrationRights: Record<string, any>
  customRights: Record<string, any>
  status: 'ACTIVE' | 'EXERCISED' | 'WAIVED' | 'EXPIRED'
  expiryDate?: string
  createdAt: string
  updatedAt: string
  investment?: any
  exerciseHistory?: any[]
}

export interface CreateRightsData {
  investmentId: string
  proRataRights?: boolean
  proRataPercentage?: number
  rightOfFirstRefusal?: boolean
  rofrDuration?: number
  coSaleRights?: boolean
  dragAlongRights?: boolean
  tagAlongRights?: boolean
  informationRights?: boolean
  informationFrequency?: 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY'
  boardObserverRights?: boolean
  boardSeatRights?: boolean
  antiDilutionRights?: boolean
  antiDilutionType?: 'FULL_RATCHET' | 'WEIGHTED_AVERAGE' | 'NARROW_BASED' | 'BROAD_BASED'
  redemptionRights?: boolean
  redemptionPeriod?: number
  conversionRights?: boolean
  votingRights?: Record<string, any>
  participationRights?: boolean
  preemptiveRights?: boolean
  registrationRights?: Record<string, any>
  customRights?: Record<string, any>
  expiryDate?: string
}

export interface RightsSummary {
  totalInvestments: number
  activeRights: number
  byRightType: {
    proRata: number
    rofr: number
    coSale: number
    dragAlong: number
    tagAlong: number
    information: number
    boardObserver: number
    boardSeat: number
  }
  investments: Array<{
    investmentId: string
    startup: string
    rights: Record<string, boolean>
    status: string
  }>
}

export const investorRightsApi = {
  /**
   * Create investor rights
   */
  create: async (data: CreateRightsData) => {
    return apiClient.post<InvestorRights>('/investor-rights', data)
  },

  /**
   * Get rights by ID
   */
  getById: async (id: string) => {
    return apiClient.get<InvestorRights>(`/investor-rights/${id}`)
  },

  /**
   * Get rights by investment
   */
  getByInvestment: async (investmentId: string) => {
    return apiClient.get<InvestorRights>(`/investor-rights/investment/${investmentId}`)
  },

  /**
   * Get rights by investor
   */
  getByInvestor: async (investorId: string) => {
    return apiClient.get<InvestorRights[]>(`/investor-rights/investor/${investorId}`)
  },

  /**
   * Get rights by startup
   */
  getByStartup: async (startupId: string) => {
    return apiClient.get<InvestorRights[]>(`/investor-rights/startup/${startupId}`)
  },

  /**
   * Get rights summary
   */
  getSummary: async (investorId: string) => {
    return apiClient.get<RightsSummary>(`/investor-rights/investor/${investorId}/summary`)
  },

  /**
   * Update investor rights
   */
  update: async (id: string, data: Partial<CreateRightsData>) => {
    return apiClient.put<InvestorRights>(`/investor-rights/${id}`, data)
  },

  /**
   * Exercise pro-rata right
   */
  exerciseProRata: async (id: string, data: {
    roundId: string
    investmentAmount: number
  }) => {
    return apiClient.post<any>(`/investor-rights/${id}/exercise-pro-rata`, data)
  },

  /**
   * Waive right
   */
  waiveRight: async (id: string, data: {
    rightType: string
    reason?: string
  }) => {
    return apiClient.post<any>(`/investor-rights/${id}/waive`, data)
  },

  /**
   * Check if investor has specific right
   */
  checkRight: async (id: string, rightType: string) => {
    return apiClient.get<{
      hasRight: boolean
      rightType: string
    }>(`/investor-rights/${id}/check/${rightType}`)
  },
}
