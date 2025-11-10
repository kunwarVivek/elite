import { apiClient } from './api-client'

export interface CapTable {
  id: string
  startupId: string
  asOfDate: string
  version: number
  fullyDilutedShares: number
  totalCommon: number
  totalPreferred: number
  totalOptions: number
  optionPool: number
  createdAt: string
  shareClasses?: ShareClass[]
  stakeholders?: CapTableStakeholder[]
  events?: CapTableEvent[]
}

export interface ShareClass {
  id: string
  name: string
  type: 'COMMON' | 'PREFERRED' | 'OPTION' | 'WARRANT'
  sharesAuthorized: number
  sharesIssued: number
  sharesOutstanding: number
  pricePerShare?: number
  liquidationPreference: number
  liquidationMultiple: number
  participating: boolean
  seniorityRank: number
  votesPerShare: number
}

export interface CapTableStakeholder {
  id: string
  stakeholderType: 'FOUNDER' | 'EMPLOYEE' | 'INVESTOR' | 'ADVISOR' | 'CONSULTANT'
  userId?: string
  entityName: string
  commonShares: number
  preferredShares: Record<string, number>
  options: number
  warrants: number
  totalShares: number
  fullyDilutedOwnership: number
  currentOwnership: number
  boardSeat: boolean
  observer: boolean
  proRataRights: boolean
}

export interface CapTableEvent {
  id: string
  eventType: 'FUNDING' | 'CONVERSION' | 'OPTION_GRANT' | 'OPTION_EXERCISE' | 'TRANSFER' | 'REPURCHASE' | 'CANCELLATION'
  description: string
  eventDate: string
  sharesBefore: any
  sharesAfter: any
}

export interface DilutionAnalysis {
  preMoneyValuation: number
  newInvestmentAmount: number
  postMoneyValuation: number
  currentShares: number
  newShares: number
  totalSharesAfter: number
  pricePerShare: number
  dilutionImpact: Array<{
    stakeholderId: string
    entityName: string
    currentOwnership: number
    newOwnership: number
    dilution: number
    dilutionPercentage: number
  }>
}

export interface WaterfallAnalysis {
  exitProceeds: number
  totalDistributed: number
  distributions: Array<{
    stakeholderId: string
    entityName: string
    stakeholderType: string
    investment: number
    distribution: number
    returnMultiple: number
    ownership: number
  }>
}

export const capTableApi = {
  /**
   * Create cap table snapshot
   */
  create: async (data: {
    startupId: string
    asOfDate?: string
  }) => {
    return apiClient.post<CapTable>('/cap-tables', data)
  },

  /**
   * Get cap table by ID
   */
  getById: async (id: string) => {
    return apiClient.get<CapTable>(`/cap-tables/${id}`)
  },

  /**
   * Get latest cap table for startup
   */
  getLatest: async (startupId: string) => {
    return apiClient.get<CapTable>(`/cap-tables/startup/${startupId}/latest`)
  },

  /**
   * Get cap table history
   */
  getHistory: async (startupId: string, limit?: number, offset?: number) => {
    const params: any = {}
    if (limit) params.limit = limit.toString()
    if (offset) params.offset = offset.toString()
    return apiClient.get<CapTable[]>(`/cap-tables/startup/${startupId}/history`, params)
  },

  /**
   * Add stakeholder to cap table
   */
  addStakeholder: async (id: string, data: {
    stakeholderType: 'FOUNDER' | 'EMPLOYEE' | 'INVESTOR' | 'ADVISOR' | 'CONSULTANT'
    userId?: string
    entityName: string
    commonShares?: number
    preferredShares?: Record<string, number>
    options?: number
    warrants?: number
    boardSeat?: boolean
    observer?: boolean
    proRataRights?: boolean
  }) => {
    return apiClient.post<CapTableStakeholder>(`/cap-tables/${id}/stakeholders`, data)
  },

  /**
   * Calculate dilution from new round
   */
  calculateDilution: async (startupId: string, data: {
    newInvestmentAmount: number
    preMoneyValuation: number
  }) => {
    return apiClient.post<DilutionAnalysis>(`/cap-tables/startup/${startupId}/dilution`, data)
  },

  /**
   * Calculate exit waterfall
   */
  calculateWaterfall: async (startupId: string, data: {
    exitProceeds: number
    exitType?: 'ACQUISITION' | 'IPO' | 'MERGER' | 'LIQUIDATION'
  }) => {
    return apiClient.post<WaterfallAnalysis>(`/cap-tables/startup/${startupId}/waterfall`, data)
  },

  /**
   * Export to Carta format
   */
  exportToCarta: async (id: string, format: 'json' | 'csv' = 'json') => {
    return apiClient.get<any>(`/cap-tables/${id}/export`, { format })
  },

  /**
   * Record cap table event
   */
  recordEvent: async (id: string, data: {
    eventType: string
    description: string
    sharesBefore: any
    sharesAfter: any
    roundId?: string
    transactionId?: string
  }) => {
    return apiClient.post<CapTableEvent>(`/cap-tables/${id}/events`, data)
  },
}
