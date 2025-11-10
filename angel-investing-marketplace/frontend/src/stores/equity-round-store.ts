import { create } from 'zustand'
import { equityRoundApi, EquityRound, RoundMetrics } from '@/lib/equity-round-api'

interface EquityRoundStore {
  rounds: EquityRound[]
  currentRound: EquityRound | null
  activeRounds: EquityRound[]
  roundMetrics: RoundMetrics | null
  isLoading: boolean
  error: string | null

  fetchByStartup: (startupId: string) => Promise<void>
  fetchById: (id: string) => Promise<void>
  fetchActive: () => Promise<void>
  fetchMetrics: (id: string) => Promise<void>
  create: (data: any) => Promise<EquityRound | null>
  update: (id: string, data: any) => Promise<void>
  close: (id: string, finalTerms?: any) => Promise<void>
  recordInvestment: (id: string, data: any) => Promise<void>
  clearError: () => void
  reset: () => void
}

export const useEquityRoundStore = create<EquityRoundStore>((set) => ({
  rounds: [],
  currentRound: null,
  activeRounds: [],
  roundMetrics: null,
  isLoading: false,
  error: null,

  fetchByStartup: async (startupId: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await equityRoundApi.getByStartup(startupId)
      set({ rounds: response.data, isLoading: false })
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },

  fetchById: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await equityRoundApi.getById(id)
      set({ currentRound: response.data, isLoading: false })
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },

  fetchActive: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await equityRoundApi.getActive()
      set({ activeRounds: response.data, isLoading: false })
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },

  fetchMetrics: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await equityRoundApi.getMetrics(id)
      set({ roundMetrics: response.data, isLoading: false })
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },

  create: async (data: any) => {
    set({ isLoading: true, error: null })
    try {
      const response = await equityRoundApi.create(data)
      set((state) => ({
        rounds: [...state.rounds, response.data],
        currentRound: response.data,
        isLoading: false,
      }))
      return response.data
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
      return null
    }
  },

  update: async (id: string, data: any) => {
    set({ isLoading: true, error: null })
    try {
      const response = await equityRoundApi.update(id, data)
      set((state) => ({
        rounds: state.rounds.map((r) => (r.id === id ? response.data : r)),
        currentRound: state.currentRound?.id === id ? response.data : state.currentRound,
        isLoading: false,
      }))
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },

  close: async (id: string, finalTerms?: any) => {
    set({ isLoading: true, error: null })
    try {
      const response = await equityRoundApi.close(id, finalTerms)
      set((state) => ({
        rounds: state.rounds.map((r) => (r.id === id ? response.data : r)),
        currentRound: state.currentRound?.id === id ? response.data : state.currentRound,
        isLoading: false,
      }))
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },

  recordInvestment: async (id: string, data: any) => {
    set({ isLoading: true, error: null })
    try {
      await equityRoundApi.recordInvestment(id, data)
      // Refetch round to get updated totalRaised
      const response = await equityRoundApi.getById(id)
      set((state) => ({
        rounds: state.rounds.map((r) => (r.id === id ? response.data : r)),
        currentRound: state.currentRound?.id === id ? response.data : state.currentRound,
        isLoading: false,
      }))
    } catch (error: any) {
      set({ error: error.message, isLoading: false })
    }
  },

  clearError: () => set({ error: null }),

  reset: () => set({
    rounds: [],
    currentRound: null,
    activeRounds: [],
    roundMetrics: null,
    isLoading: false,
    error: null,
  }),
}))
