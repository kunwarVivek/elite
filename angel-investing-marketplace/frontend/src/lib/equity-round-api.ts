import { apiClient } from './api-client'

export interface EquityRound {
  id: string
  startupId: string
  roundType: 'PRE_SEED' | 'SEED' | 'SERIES_A' | 'SERIES_B' | 'SERIES_C' | 'SERIES_D' | 'BRIDGE'
  leadInvestorId?: string
  targetAmount: number
  totalRaised: number
  minimumInvestment?: number
  maximumInvestment?: number
  pricePerShare?: number
  preMoneyValuation?: number
  postMoneyValuation?: number
  status: 'PLANNING' | 'OPEN' | 'ACTIVE' | 'CLOSED' | 'CANCELLED'
  closingDate?: string
  terms: Record<string, any>
  documents: string[]
  createdAt: string
  updatedAt: string
  startup?: any
  leadInvestor?: any
  shareClass?: any
  investments?: any[]
}

export interface CreateRoundData {
  startupId: string
  roundType: 'PRE_SEED' | 'SEED' | 'SERIES_A' | 'SERIES_B' | 'SERIES_C' | 'SERIES_D' | 'BRIDGE'
  leadInvestorId?: string
  targetAmount: number
  minimumInvestment?: number
  maximumInvestment?: number
  pricePerShare?: number
  preMoneyValuation?: number
  postMoneyValuation?: number
  shareClassId?: string
  closingDate?: string
  terms?: Record<string, any>
  documents?: string[]
}

export interface RoundMetrics {
  totalRaised: number
  targetAmount: number
  percentageRaised: number
  remainingAmount: number
  investorCount: number
  averageInvestment: number
  status: string
  pricePerShare?: number
  preMoneyValuation?: number
  postMoneyValuation?: number
}

export const equityRoundApi = {
  /**
   * Create equity round
   */
  create: async (data: CreateRoundData) => {
    return apiClient.post<EquityRound>('/equity-rounds', data)
  },

  /**
   * Get round by ID
   */
  getById: async (id: string) => {
    return apiClient.get<EquityRound>(`/equity-rounds/${id}`)
  },

  /**
   * Get rounds by startup
   */
  getByStartup: async (startupId: string) => {
    return apiClient.get<EquityRound[]>(`/equity-rounds/startup/${startupId}`)
  },

  /**
   * Get active rounds
   */
  getActive: async () => {
    return apiClient.get<EquityRound[]>('/equity-rounds/active')
  },

  /**
   * Update equity round
   */
  update: async (id: string, data: Partial<CreateRoundData>) => {
    return apiClient.put<EquityRound>(`/equity-rounds/${id}`, data)
  },

  /**
   * Close equity round
   */
  close: async (id: string, finalTerms?: Record<string, any>) => {
    return apiClient.post<EquityRound>(`/equity-rounds/${id}/close`, { finalTerms })
  },

  /**
   * Get round metrics
   */
  getMetrics: async (id: string) => {
    return apiClient.get<RoundMetrics>(`/equity-rounds/${id}/metrics`)
  },

  /**
   * Record investment in round
   */
  recordInvestment: async (id: string, data: {
    investmentId: string
    amount: number
  }) => {
    return apiClient.post<{ totalRaised: number }>(`/equity-rounds/${id}/investments`, data)
  },
}
