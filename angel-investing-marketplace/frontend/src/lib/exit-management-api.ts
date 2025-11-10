import { apiClient } from './api-client'

export interface ExitEvent {
  id: string
  startupId: string
  exitType: 'ACQUISITION' | 'IPO' | 'MERGER' | 'LIQUIDATION' | 'SECONDARY_SALE' | 'BUYBACK'
  exitDate: string
  exitAmount: number
  acquirerName?: string
  acquirerType?: string
  stockSymbol?: string
  stockExchange?: string
  sharePrice?: number
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  terms: Record<string, any>
  documentUrls: string[]
  createdAt: string
  updatedAt: string
  startup?: any
  distributions?: ExitDistribution[]
}

export interface ExitDistribution {
  id: string
  exitEventId: string
  investorId: string
  distributionAmount: number
  distributionDate: string
  distributionMethod: 'WIRE' | 'CHECK' | 'STOCK' | 'CRYPTO'
  taxWithheld?: number
  netAmount: number
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  paidDate?: string
  notes?: string
  investor?: any
  exitEvent?: any
}

export interface CreateExitEventData {
  startupId: string
  exitType: 'ACQUISITION' | 'IPO' | 'MERGER' | 'LIQUIDATION' | 'SECONDARY_SALE' | 'BUYBACK'
  exitDate: string
  exitAmount: number
  acquirerName?: string
  acquirerType?: string
  stockSymbol?: string
  stockExchange?: string
  sharePrice?: number
  terms?: Record<string, any>
  documentUrls?: string[]
}

export interface CreateDistributionData {
  investorId: string
  distributionAmount: number
  distributionDate: string
  distributionMethod?: 'WIRE' | 'CHECK' | 'STOCK' | 'CRYPTO'
  taxWithheld?: number
  notes?: string
}

export interface ExitMetrics {
  totalExits: number
  completedExits: number
  totalExitValue: number
  exitsByType: {
    acquisition: number
    ipo: number
    merger: number
    liquidation: number
    secondarySale: number
    buyback: number
  }
  latestExit?: ExitEvent
}

export const exitManagementApi = {
  /**
   * Create exit event
   */
  createEvent: async (data: CreateExitEventData) => {
    return apiClient.post<ExitEvent>('/exit-events', data)
  },

  /**
   * Get exit event by ID
   */
  getEventById: async (id: string) => {
    return apiClient.get<ExitEvent>(`/exit-events/${id}`)
  },

  /**
   * Get exit events by startup
   */
  getEventsByStartup: async (startupId: string) => {
    return apiClient.get<ExitEvent[]>(`/exit-events/startup/${startupId}`)
  },

  /**
   * Get all exit events
   */
  getAllEvents: async (status?: string) => {
    const params = status ? { status } : undefined
    return apiClient.get<ExitEvent[]>('/exit-events', params)
  },

  /**
   * Get exit metrics
   */
  getMetrics: async (startupId: string) => {
    return apiClient.get<ExitMetrics>(`/exit-events/startup/${startupId}/metrics`)
  },

  /**
   * Update exit event
   */
  updateEvent: async (id: string, data: Partial<CreateExitEventData>) => {
    return apiClient.put<ExitEvent>(`/exit-events/${id}`, data)
  },

  /**
   * Calculate distributions
   */
  calculateDistributions: async (id: string) => {
    return apiClient.get<any>(`/exit-events/${id}/calculate-distributions`)
  },

  /**
   * Create distribution
   */
  createDistribution: async (exitEventId: string, data: CreateDistributionData) => {
    return apiClient.post<ExitDistribution>(`/exit-events/${exitEventId}/distributions`, data)
  },

  /**
   * Get distributions by exit event
   */
  getDistributionsByEvent: async (exitEventId: string) => {
    return apiClient.get<ExitDistribution[]>(`/exit-events/${exitEventId}/distributions`)
  },

  /**
   * Get distributions by investor
   */
  getDistributionsByInvestor: async (investorId: string) => {
    return apiClient.get<ExitDistribution[]>(`/exit-events/investor/${investorId}/distributions`)
  },

  /**
   * Process distribution
   */
  processDistribution: async (distributionId: string) => {
    return apiClient.post<ExitDistribution>(`/exit-events/distributions/${distributionId}/process`)
  },

  /**
   * Complete distribution
   */
  completeDistribution: async (distributionId: string, transactionRef?: string) => {
    return apiClient.post<ExitDistribution>(`/exit-events/distributions/${distributionId}/complete`, { transactionRef })
  },
}
