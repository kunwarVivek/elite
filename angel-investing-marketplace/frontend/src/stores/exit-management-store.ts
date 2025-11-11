import { create } from 'zustand'
import { exitManagementApi, ExitEvent, ExitDistribution, ExitMetrics } from '@/lib/exit-management-api'

interface ExitManagementStore {
  exitEvents: ExitEvent[]
  currentExitEvent: ExitEvent | null
  distributions: ExitDistribution[]
  exitMetrics: ExitMetrics | null
  calculatedDistributions: any | null
  isLoading: boolean
  error: string | null

  fetchAllEvents: (status?: string) => Promise<void>
  fetchEventById: (id: string) => Promise<void>
  fetchEventsByStartup: (startupId: string) => Promise<void>
  fetchMetrics: (startupId: string) => Promise<void>
  createEvent: (data: any) => Promise<ExitEvent | null>
  updateEvent: (id: string, data: any) => Promise<void>
  calculateDistributions: (id: string) => Promise<void>
  createDistribution: (exitEventId: string, data: any) => Promise<void>
  fetchDistributionsByEvent: (exitEventId: string) => Promise<void>
  fetchDistributionsByInvestor: (investorId: string) => Promise<void>
  processDistribution: (distributionId: string) => Promise<void>
  completeDistribution: (distributionId: string, transactionRef?: string) => Promise<void>
  clearError: () => void
  reset: () => void
}

export const useExitManagementStore = create<ExitManagementStore>((set) => ({
  exitEvents: [],
  currentExitEvent: null,
  distributions: [],
  exitMetrics: null,
  calculatedDistributions: null,
  isLoading: false,
  error: null,

  fetchAllEvents: async (status?: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await exitManagementApi.getAllEvents(status)
      set({ exitEvents: response.data, isLoading: false })
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },

  fetchEventById: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await exitManagementApi.getEventById(id)
      set({ currentExitEvent: response.data, isLoading: false })
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },

  fetchEventsByStartup: async (startupId: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await exitManagementApi.getEventsByStartup(startupId)
      set({ exitEvents: response.data, isLoading: false })
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },

  fetchMetrics: async (startupId: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await exitManagementApi.getMetrics(startupId)
      set({ exitMetrics: response.data, isLoading: false })
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },

  createEvent: async (data: any) => {
    set({ isLoading: true, error: null })
    try {
      const response = await exitManagementApi.createEvent(data)
      set((state) => ({
        exitEvents: [...state.exitEvents, response.data],
        currentExitEvent: response.data,
        isLoading: false,
      }))
      return response.data
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
      return null
    }
  },

  updateEvent: async (id: string, data: any) => {
    set({ isLoading: true, error: null })
    try {
      const response = await exitManagementApi.updateEvent(id, data)
      set((state) => ({
        exitEvents: state.exitEvents.map((e) => (e.id === id ? response.data : e)),
        currentExitEvent: state.currentExitEvent?.id === id ? response.data : state.currentExitEvent,
        isLoading: false,
      }))
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },

  calculateDistributions: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await exitManagementApi.calculateDistributions(id)
      set({ calculatedDistributions: response.data, isLoading: false })
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },

  createDistribution: async (exitEventId: string, data: any) => {
    set({ isLoading: true, error: null })
    try {
      const response = await exitManagementApi.createDistribution(exitEventId, data)
      set((state) => ({
        distributions: [...state.distributions, response.data],
        isLoading: false,
      }))
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },

  fetchDistributionsByEvent: async (exitEventId: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await exitManagementApi.getDistributionsByEvent(exitEventId)
      set({ distributions: response.data, isLoading: false })
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },

  fetchDistributionsByInvestor: async (investorId: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await exitManagementApi.getDistributionsByInvestor(investorId)
      set({ distributions: response.data, isLoading: false })
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },

  processDistribution: async (distributionId: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await exitManagementApi.processDistribution(distributionId)
      set((state) => ({
        distributions: state.distributions.map((d) =>
          d.id === distributionId ? response.data : d
        ),
        isLoading: false,
      }))
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },

  completeDistribution: async (distributionId: string, transactionRef?: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await exitManagementApi.completeDistribution(distributionId, transactionRef)
      set((state) => ({
        distributions: state.distributions.map((d) =>
          d.id === distributionId ? response.data : d
        ),
        isLoading: false,
      }))
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },

  clearError: () => set({ error: null }),

  reset: () => set({
    exitEvents: [],
    currentExitEvent: null,
    distributions: [],
    exitMetrics: null,
    calculatedDistributions: null,
    isLoading: false,
    error: null,
  }),
}))
